import hashlib
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.entities import User, Project, Artifact, ProjectFile
from backend.app.schemas.artifact import (
    ArtifactResponse,
    ProjectFileResponse,
    EnvironmentInventory,
)
from backend.app.api.deps import get_current_user
from backend.app.api.v1.endpoints.projects import check_user_workspace_access
from backend.app.services.extractor import safe_extract_zip, SafeExtractionError
from backend.app.services.classifier import scan_and_classify_project

router = APIRouter()


@router.post("/projects/{project_id}/upload", response_model=EnvironmentInventory, status_code=status.HTTP_201_CREATED)
async def upload_project_archive(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Verify project exists and user has access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    # 2. Prepare storage directories
    upload_id = str(uuid.uuid4())
    storage_root = Path(settings.STORAGE_DIR)
    uploads_dir = storage_root / "uploads"
    extracted_dir = storage_root / "extracted" / upload_id
    uploads_dir.mkdir(parents=True, exist_ok=True)
    extracted_dir.mkdir(parents=True, exist_ok=True)

    dest_zip_path = uploads_dir / f"{upload_id}.zip"

    # 3. Stream and validate file size & hash
    hasher = hashlib.sha256()
    total_bytes = 0

    try:
        with open(dest_zip_path, "wb") as f:
            while True:
                chunk = await file.read(65536)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Archive file size exceeds limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB",
                    )
                hasher.update(chunk)
                f.write(chunk)
    except Exception as e:
        if dest_zip_path.exists():
            dest_zip_path.unlink()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save upload: {str(e)}")

    file_hash = hasher.hexdigest()

    # 4. Perform Safe ZIP Extraction
    try:
        safe_extract_zip(str(dest_zip_path), str(extracted_dir))
    except SafeExtractionError as e:
        shutil.rmtree(extracted_dir, ignore_errors=True)
        if dest_zip_path.exists():
            dest_zip_path.unlink()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 5. Classify files & generate technology inventory
    classified_files, summary = scan_and_classify_project(str(extracted_dir))

    # 6. Save Artifact and ProjectFiles in Database
    artifact = Artifact(
        id=upload_id,
        project_id=project.id,
        filename=file.filename or "project.zip",
        storage_path=str(dest_zip_path),
        extracted_path=str(extracted_dir),
        file_size=total_bytes,
        file_hash=file_hash,
        status="extracted",
    )
    db.add(artifact)
    db.flush()

    db_files = []
    for cf in classified_files:
        pf = ProjectFile(
            project_id=project.id,
            artifact_id=artifact.id,
            relative_path=cf["relative_path"],
            filename=cf["filename"],
            category=cf["category"],
            file_type=cf["file_type"],
            size_bytes=cf["size_bytes"],
            line_count=cf["line_count"],
        )
        db_files.append(pf)

    db.bulk_save_objects(db_files)
    project.status = "uploaded"
    db.commit()

    # Fetch newly created files for response
    persisted_files = (
        db.query(ProjectFile)
        .filter(ProjectFile.artifact_id == artifact.id)
        .order_by(ProjectFile.category, ProjectFile.relative_path)
        .all()
    )

    return EnvironmentInventory(
        project_id=project.id,
        artifact_id=artifact.id,
        total_files=summary["total_files"],
        total_lines=summary["total_lines"],
        category_counts=summary["category_counts"],
        file_type_counts=summary["file_type_counts"],
        detected_languages=summary["detected_languages"],
        detected_frameworks=summary["detected_frameworks"],
        detected_containers=summary["detected_containers"],
        detected_infrastructure=summary["detected_infrastructure"],
        files=[ProjectFileResponse.model_validate(f) for f in persisted_files],
    )


@router.get("/projects/{project_id}/inventory", response_model=EnvironmentInventory)
def get_project_inventory(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    latest_artifact = (
        db.query(Artifact)
        .filter(Artifact.project_id == project_id, Artifact.status == "extracted")
        .order_by(Artifact.created_at.desc())
        .first()
    )
    if not latest_artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No extracted project artifacts found. Upload a ZIP archive first.",
        )

    files = (
        db.query(ProjectFile)
        .filter(ProjectFile.artifact_id == latest_artifact.id)
        .order_by(ProjectFile.category, ProjectFile.relative_path)
        .all()
    )

    category_counts = {}
    file_type_counts = {}
    total_lines = 0
    languages = set()
    containers = set()
    infra = set()

    for f in files:
        category_counts[f.category] = category_counts.get(f.category, 0) + 1
        file_type_counts[f.file_type] = file_type_counts.get(f.file_type, 0) + 1
        total_lines += f.line_count
        if f.file_type == "python":
            languages.add("Python")
        elif f.file_type in ["typescript", "javascript"]:
            languages.add("TypeScript" if f.file_type == "typescript" else "JavaScript")
        elif f.file_type == "sql":
            languages.add("SQL")
        elif f.file_type == "dockerfile":
            containers.add("Docker")
        elif f.file_type == "compose":
            containers.add("Docker Compose")
        elif f.file_type == "terraform":
            infra.add("Terraform")

    return EnvironmentInventory(
        project_id=project.id,
        artifact_id=latest_artifact.id,
        total_files=len(files),
        total_lines=total_lines,
        category_counts=category_counts,
        file_type_counts=file_type_counts,
        detected_languages=sorted(list(languages)),
        detected_frameworks=[],
        detected_containers=sorted(list(containers)),
        detected_infrastructure=sorted(list(infra)),
        files=[ProjectFileResponse.model_validate(f) for f in files],
    )


@router.get("/projects/{project_id}/artifacts", response_model=List[ArtifactResponse])
def list_project_artifacts(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    artifacts = (
        db.query(Artifact)
        .filter(Artifact.project_id == project_id)
        .order_by(Artifact.created_at.desc())
        .all()
    )
    return artifacts


@router.get("/artifacts/{artifact_id}", response_model=ArtifactResponse)
def get_artifact(
    artifact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    if not artifact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found")

    project = db.query(Project).filter(Project.id == artifact.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    return artifact
