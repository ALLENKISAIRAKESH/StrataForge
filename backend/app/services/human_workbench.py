import os
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.models.entities import (
    Project,
    Artifact,
    ProjectFile,
    Finding,
    AgentFeedback,
    User,
    generate_uuid,
)
from backend.app.schemas.workbench import (
    AgentFeedbackCreate,
    AgentFeedbackResponse,
    ApplyPatchRequest,
    ApplyPatchResponse,
)
from backend.app.services.memory_bus import publish_memory


def parse_patch_target_path(patch_str: str) -> Optional[str]:
    """Extracts the relative file path from a unified diff header."""
    for line in patch_str.splitlines():
        if line.startswith("+++ b/"):
            return line[6:].strip()
        elif line.startswith("--- a/"):
            path = line[6:].strip()
            if path and path != "/dev/null":
                return path
        elif line.startswith("+++ "):
            return line[4:].strip().lstrip("b/").lstrip("a/")
    return None


def apply_patch_in_memory(original_text: str, patch_str: str) -> Tuple[bool, str]:
    """
    Applies unified diff hunks or direct block replacements to original_text.
    Returns (success, new_text).
    """
    lines = original_text.splitlines(keepends=True)
    patch_lines = patch_str.splitlines()

    # Strategy 1: Parse and apply hunks
    hunks: List[Dict[str, Any]] = []
    current_hunk: Optional[Dict[str, Any]] = None

    for pline in patch_lines:
        if pline.startswith("@@"):
            match = re.match(r"@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@", pline)
            if match:
                current_hunk = {
                    "old_start": int(match.group(1)),
                    "old_count": int(match.group(2) or 1),
                    "new_start": int(match.group(3)),
                    "new_count": int(match.group(4) or 1),
                    "lines": [],
                }
                hunks.append(current_hunk)
                continue
        if current_hunk is not None:
            if not pline.startswith("---") and not pline.startswith("+++"):
                current_hunk["lines"].append(pline)

    if hunks:
        # Check if hunks can be applied sequentially
        new_lines = list(lines)
        offset = 0
        success_all_hunks = True

        for hunk in hunks:
            old_start = hunk["old_start"] - 1 + offset
            hunk_old_lines = [l[1:] for l in hunk["lines"] if l.startswith("-") or l.startswith(" ")]
            hunk_new_lines = [l[1:] for l in hunk["lines"] if l.startswith("+") or l.startswith(" ")]

            # Check if hunk matches at old_start
            match_found = False
            best_idx = old_start
            
            # Try exact index first
            if 0 <= old_start <= len(new_lines):
                candidate = [l.rstrip("\r\n") for l in new_lines[old_start : old_start + len(hunk_old_lines)]]
                if candidate == hunk_old_lines:
                    match_found = True
                    best_idx = old_start

            # Fallback search within +/- 10 lines
            if not match_found:
                for delta in range(-15, 16):
                    try_idx = old_start + delta
                    if 0 <= try_idx <= len(new_lines) - len(hunk_old_lines):
                        candidate = [l.rstrip("\r\n") for l in new_lines[try_idx : try_idx + len(hunk_old_lines)]]
                        if candidate == hunk_old_lines:
                            match_found = True
                            best_idx = try_idx
                            break

            if match_found:
                # Replace lines
                replacement = [l + "\n" for l in hunk_new_lines]
                new_lines[best_idx : best_idx + len(hunk_old_lines)] = replacement
                offset += len(hunk_new_lines) - len(hunk_old_lines)
            else:
                success_all_hunks = False
                break

        if success_all_hunks:
            return True, "".join(new_lines)

    # Strategy 2: Direct pattern / replacement matching
    removals = [l[1:].strip() for l in patch_lines if l.startswith("-") and not l.startswith("---")]
    additions = [l[1:] for l in patch_lines if l.startswith("+") and not l.startswith("+++")]

    if removals:
        # Single or multiline replacement
        target_snippet = "\n".join(removals)
        replace_snippet = "\n".join(additions)
        
        # Normalize line breaks for search
        normalized_orig = original_text.replace("\r\n", "\n")
        if target_snippet in normalized_orig:
            updated = normalized_orig.replace(target_snippet, replace_snippet, 1)
            return True, updated

    # Strategy 3: Insertion if no removals
    if not removals and additions:
        insert_text = "\n".join(additions) + "\n"
        # If there's a context line, insert after or before
        context_lines = [l[1:].strip() for l in patch_lines if l.startswith(" ") and l.strip()]
        if context_lines:
            anchor = context_lines[-1]
            if anchor in original_text:
                parts = original_text.split(anchor, 1)
                return True, parts[0] + insert_text + anchor + parts[1]
        return True, original_text + "\n" + insert_text

    return False, original_text


def submit_agent_feedback(
    db: Session,
    project_id: str,
    user_id: str,
    feedback_in: AgentFeedbackCreate,
) -> AgentFeedbackResponse:
    """Records human review, approval, modification, or rejection of agent output."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    user = db.query(User).filter(User.id == user_id).first()
    reviewer_name = user.full_name or user.email if user else "human_reviewer"
    feedback_id = generate_uuid()

    feedback = AgentFeedback(
        id=feedback_id,
        project_id=project_id,
        user_id=user_id,
        finding_id=feedback_in.finding_id,
        execution_id=feedback_in.execution_id,
        target_type=feedback_in.target_type,
        action=feedback_in.action,
        status="reviewed" if feedback_in.action != "reject" else "rejected",
        original_content=feedback_in.original_content,
        modified_content=feedback_in.modified_content,
        reviewer_comments=feedback_in.reviewer_comments,
    )
    db.add(feedback)

    # If action is 'reject', publish constraint to blackboard
    if feedback_in.action == "reject":
        publish_memory(
            db=db,
            project_id=project_id,
            key=f"rejected_recommendation_{feedback_id[:8]}",
            value={
                "target_type": feedback_in.target_type,
                "reason": feedback_in.reviewer_comments or "Human reviewer rejected recommendation",
                "finding_id": feedback_in.finding_id,
            },
            source_agent=reviewer_name,
            confidence=1.0,
        )

    db.commit()
    db.refresh(feedback)
    return AgentFeedbackResponse(
        id=feedback.id,
        project_id=feedback.project_id,
        user_id=feedback.user_id,
        finding_id=feedback.finding_id,
        execution_id=feedback.execution_id,
        target_type=feedback.target_type,
        action=feedback.action,
        status=feedback.status,
        original_content=feedback.original_content,
        modified_content=feedback.modified_content,
        reviewer_comments=feedback.reviewer_comments,
        applied_patch_summary=feedback.applied_patch_summary,
        applied_at=feedback.applied_at,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
        reviewer_name=reviewer_name,
    )


def apply_remediation_patch(
    db: Session,
    project_id: str,
    user_id: str,
    request: ApplyPatchRequest,
) -> ApplyPatchResponse:
    """Safely applies a verified git unified diff patch to project files."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Find the active artifact with extracted files
    artifact = (
        db.query(Artifact)
        .filter(Artifact.project_id == project_id, Artifact.status == "extracted")
        .order_by(Artifact.created_at.desc())
        .first()
    )
    if not artifact or not artifact.extracted_path or not os.path.exists(artifact.extracted_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No extracted project files found to apply patch onto",
        )

    # Extract target relative path
    rel_path = parse_patch_target_path(request.patch_content)
    if not rel_path:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not detect target file from unified diff header",
        )

    # Verify path traversal security
    safe_root = os.path.abspath(artifact.extracted_path)
    target_full_path = os.path.abspath(os.path.join(safe_root, rel_path))
    if not target_full_path.startswith(safe_root):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path traversal attempt blocked",
        )

    if not os.path.exists(target_full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target file {rel_path} does not exist in project archive",
        )

    # Read original content
    with open(target_full_path, "r", encoding="utf-8", errors="replace") as f:
        orig_content = f.read()

    # Apply diff
    success, updated_content = apply_patch_in_memory(orig_content, request.patch_content)
    if not success:
        # Fallback: if patch is simple addition or replacement, do clean substitution
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patch hunk failed to match context lines in target file",
        )

    # Write updated file back
    with open(target_full_path, "w", encoding="utf-8") as f:
        f.write(updated_content)

    # Update ProjectFile line count and size
    proj_file = (
        db.query(ProjectFile)
        .filter(ProjectFile.artifact_id == artifact.id, ProjectFile.relative_path == rel_path)
        .first()
    )
    if proj_file:
        proj_file.line_count = len(updated_content.splitlines())
        proj_file.size_bytes = os.path.getsize(target_full_path)

    # Update Finding status to resolved if finding_id provided
    finding_status = None
    if request.finding_id:
        finding = (
            db.query(Finding)
            .filter(Finding.id == request.finding_id, Finding.project_id == project_id)
            .first()
        )
        if finding:
            finding.status = "resolved"
            finding_status = "resolved"

    # Create feedback approval record
    user = db.query(User).filter(User.id == user_id).first()
    reviewer_label = user.email if user else "human_engineer"
    now_utc = datetime.now(timezone.utc)

    feedback = AgentFeedback(
        project_id=project_id,
        user_id=user_id,
        finding_id=request.finding_id,
        target_type="patch",
        action="approve",
        status="applied",
        original_content=request.patch_content,
        reviewer_comments=request.reviewer_comments,
        applied_patch_summary=f"Applied patch to {rel_path} (lines: {len(updated_content.splitlines())})",
        applied_at=now_utc,
    )
    db.add(feedback)

    # Publish remediation fact to memory bus
    publish_memory(
        db=db,
        project_id=project_id,
        key=f"patch_applied_{os.path.basename(rel_path)}",
        value={
            "file": rel_path,
            "finding_id": request.finding_id,
            "status": "applied",
            "applied_by": reviewer_label,
            "timestamp": now_utc.isoformat(),
        },
        source_agent=reviewer_label,
        confidence=1.0,
    )

    db.commit()
    db.refresh(feedback)

    return ApplyPatchResponse(
        success=True,
        message=f"Successfully applied remediation patch to {rel_path}",
        file_path=rel_path,
        finding_id=request.finding_id,
        finding_status=finding_status,
        feedback_id=feedback.id,
        applied_at=now_utc,
    )


def list_project_feedback(db: Session, project_id: str) -> List[AgentFeedbackResponse]:
    """Retrieves all feedback, reviews, and applied patches for a project."""
    feedbacks = (
        db.query(AgentFeedback)
        .filter(AgentFeedback.project_id == project_id)
        .order_by(AgentFeedback.created_at.desc())
        .all()
    )
    results = []
    for fb in feedbacks:
        user_name = fb.user.full_name or fb.user.email if fb.user else "System"
        res = AgentFeedbackResponse(
            id=fb.id,
            project_id=fb.project_id,
            user_id=fb.user_id,
            finding_id=fb.finding_id,
            execution_id=fb.execution_id,
            target_type=fb.target_type,
            action=fb.action,
            status=fb.status,
            original_content=fb.original_content,
            modified_content=fb.modified_content,
            reviewer_comments=fb.reviewer_comments,
            applied_patch_summary=fb.applied_patch_summary,
            applied_at=fb.applied_at,
            created_at=fb.created_at,
            updated_at=fb.updated_at,
            reviewer_name=user_name,
        )
        results.append(res)
    return results
