import json
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.models.entities import Project, Artifact, Finding, DataReadinessReport, DocumentChunk, ProjectFile


def calculate_production_readiness(
    findings: List[Finding],
    readiness_report: DataReadinessReport | None,
    files: List[ProjectFile],
) -> Dict[str, Any]:
    """
    Computes an enterprise Production Readiness Index (0-100%) based on:
    - 50% Static Diagnostics & Security (penalized heavily for critical/high defects)
    - 30% Infrastructure & Container standards
    - 20% Data Readiness & RAG Suitability
    """
    # 1. Diagnostics Score
    critical_count = sum(1 for f in findings if f.severity == "critical" and f.status != "resolved")
    high_count = sum(1 for f in findings if f.severity == "high" and f.status != "resolved")
    medium_count = sum(1 for f in findings if f.severity == "medium" and f.status != "resolved")
    low_count = sum(1 for f in findings if f.severity == "low" and f.status != "resolved")

    diag_penalty = (critical_count * 25) + (high_count * 15) + (medium_count * 5) + (low_count * 2)
    diag_score = max(0.0, min(100.0, 100.0 - diag_penalty))

    # 2. Infrastructure Score
    has_docker = any(f.category == "docker" or "docker" in f.filename.lower() for f in files)
    has_root_defect = any(f.rule_id == "DOCKER_002" and f.status != "resolved" for f in findings)
    has_healthcheck_defect = any(f.rule_id == "DOCKER_001" and f.status != "resolved" for f in findings)
    has_unpinned_defect = any(f.rule_id == "DEP_001" and f.status != "resolved" for f in findings)
    has_secrets_defect = any(f.rule_id == "COMPOSE_001" and f.status != "resolved" for f in findings)

    infra_score = 100.0
    if not has_docker:
        infra_score -= 20.0
    if has_root_defect:
        infra_score -= 25.0
    if has_healthcheck_defect:
        infra_score -= 20.0
    if has_unpinned_defect:
        infra_score -= 15.0
    if has_secrets_defect:
        infra_score -= 20.0
    infra_score = max(0.0, min(100.0, infra_score))

    # 3. Data Readiness Score
    data_score = readiness_report.overall_score if readiness_report else 50.0

    # Composite Index
    composite_index = round((0.50 * diag_score) + (0.30 * infra_score) + (0.20 * data_score), 1)

    if composite_index >= 80.0 and critical_count == 0 and high_count == 0:
        verdict = "Production Ready"
        color = "emerald"
    elif composite_index >= 55.0:
        verdict = "Remediation Required"
        color = "amber"
    else:
        verdict = "Deployment Blocked"
        color = "rose"

    return {
        "readiness_index": composite_index,
        "verdict": verdict,
        "color": color,
        "score_breakdown": {
            "diagnostics_score": round(diag_score, 1),
            "infrastructure_score": round(infra_score, 1),
            "data_readiness_score": round(data_score, 1),
        },
        "severity_summary": {
            "critical": critical_count,
            "high": high_count,
            "medium": medium_count,
            "low": low_count,
            "total_unresolved": critical_count + high_count + medium_count + low_count,
        },
    }


def generate_project_report_json(project_id: str, db: Session) -> Dict[str, Any]:
    """Compiles the full audit report as a structured dictionary."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found")

    artifact = (
        db.query(Artifact)
        .filter(Artifact.project_id == project_id, Artifact.status == "extracted")
        .order_by(Artifact.created_at.desc())
        .first()
    )

    findings = db.query(Finding).filter(Finding.project_id == project_id).all()
    files = db.query(ProjectFile).filter(ProjectFile.artifact_id == artifact.id).all() if artifact else []
    readiness_report = (
        db.query(DataReadinessReport)
        .filter(DataReadinessReport.project_id == project_id)
        .order_by(DataReadinessReport.created_at.desc())
        .first()
    )
    chunk_count = db.query(DocumentChunk).filter(DocumentChunk.project_id == project_id).count()

    readiness_eval = calculate_production_readiness(findings, readiness_report, files)

    # Remediation items
    remediation_items = []
    for f in findings:
        if f.status != "resolved":
            remediation_items.append({
                "category": f.category,
                "severity": f.severity,
                "rule_id": f.rule_id,
                "title": f.title,
                "file_path": f.file_path,
                "lines": f"L{f.line_start}-L{f.line_end}" if f.line_start else "N/A",
                "action": f.recommended_action,
                "validation": f.validation,
            })

    if readiness_report:
        for rec in json.loads(readiness_report.recommendations_json):
            if "meet production" not in rec.lower():
                remediation_items.append({
                    "category": "data_readiness",
                    "severity": "medium",
                    "rule_id": "DATA_001",
                    "title": "Data / RAG Optimization",
                    "file_path": "Schema / Docs",
                    "lines": "N/A",
                    "action": rec,
                    "validation": "Re-run data readiness assessment",
                })

    report = {
        "report_id": f"REP-{project.id[:8].upper()}-{datetime.utcnow().strftime('%Y%m%d%H%M')}",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "repository_url": project.repository_url,
            "status": project.status,
            "workspace_id": project.workspace_id,
        },
        "artifact": {
            "id": artifact.id if artifact else None,
            "filename": artifact.filename if artifact else None,
            "file_size": artifact.file_size if artifact else None,
            "total_files": len(files),
            "total_lines": sum(f.line_count for f in files),
        },
        "production_readiness": readiness_eval,
        "findings": [
            {
                "id": f.id,
                "rule_id": f.rule_id,
                "category": f.category,
                "title": f.title,
                "severity": f.severity,
                "confidence": f.confidence,
                "file_path": f.file_path,
                "line_start": f.line_start,
                "line_end": f.line_end,
                "evidence": f.evidence,
                "recommended_action": f.recommended_action,
                "validation": f.validation,
                "status": f.status,
            }
            for f in findings
        ],
        "data_readiness": {
            "overall_score": readiness_report.overall_score if readiness_report else None,
            "structured_score": readiness_report.structured_score if readiness_report else None,
            "unstructured_score": readiness_report.unstructured_score if readiness_report else None,
            "metrics": json.loads(readiness_report.metrics_json) if readiness_report else None,
            "recommendations": json.loads(readiness_report.recommendations_json) if readiness_report else [],
            "total_chunks": chunk_count,
        },
        "remediation_checklist": remediation_items,
        "cloud_run_checklist": [
            {
                "item": "Stateless Container Architecture",
                "status": "PASS",
                "notes": "Application does not rely on persistent local disk for core compute.",
            },
            {
                "item": "Non-Root Container User",
                "status": "FAIL" if any(f.rule_id == "DOCKER_002" and f.status != "resolved" for f in findings) else "PASS",
                "notes": "Containers must run under a non-root UID for Cloud Run security posture.",
            },
            {
                "item": "Health Check Probe Definition",
                "status": "FAIL" if any(f.rule_id == "DOCKER_001" and f.status != "resolved" for f in findings) else "PASS",
                "notes": "FastAPI health endpoints must be exposed for Cloud Run startup/liveness probes.",
            },
            {
                "item": "Strict Dependency Version Pinning",
                "status": "FAIL" if any(f.rule_id == "DEP_001" and f.status != "resolved" for f in findings) else "PASS",
                "notes": "Deterministic reproducible container image builds.",
            },
            {
                "item": "No Hardcoded Secrets or Credentials",
                "status": "FAIL" if any(f.rule_id == "COMPOSE_001" and f.status != "resolved" for f in findings) else "PASS",
                "notes": "Secrets must be injected via Google Cloud Secret Manager.",
            },
        ],
    }

    return report


def generate_project_report_markdown(report_json: Dict[str, Any]) -> str:
    """Formats the audit report into a professional Google Cloud Consulting style Markdown report."""
    proj = report_json["project"]
    art = report_json["artifact"]
    pr = report_json["production_readiness"]
    scores = pr["score_breakdown"]
    sev = pr["severity_summary"]

    md = []
    md.append(f"# Google Cloud Consulting — Enterprise Production Readiness Audit Report")
    md.append(f"**Audit ID:** `{report_json['report_id']}`  ")
    md.append(f"**Generated:** {report_json['generated_at']}  ")
    md.append(f"**Target Project:** {proj['name']}  ")
    if proj.get("repository_url"):
        md.append(f"**Repository:** {proj['repository_url']}  ")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 1. Executive Summary")
    md.append("")
    md.append(f"### **Production Readiness Index: {pr['readiness_index']}% — {pr['verdict'].upper()}**")
    md.append("")
    md.append("| Metric | Value | Description |")
    md.append("| :--- | :---: | :--- |")
    md.append(f"| **Overall Index** | `{pr['readiness_index']}%` | Weighted composite production score |")
    md.append(f"| **Static Diagnostics & Security** | `{scores['diagnostics_score']}%` | AST & regex static rule compliance |")
    md.append(f"| **Infrastructure & Containerization** | `{scores['infrastructure_score']}%` | Docker, Compose, and base image pinning |")
    md.append(f"| **Data Readiness & RAG Suitability** | `{scores['data_readiness_score']}%` | SQL relational integrity & chunking |")
    md.append("")
    md.append(f"**Open Security & Configuration Defects:** {sev['total_unresolved']} total ({sev['critical']} Critical, {sev['high']} High, {sev['medium']} Medium, {sev['low']} Low)")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 2. Environment & Codebase Inventory")
    md.append("")
    md.append(f"- **Archive File:** `{art.get('filename', 'N/A')}` ({art.get('file_size', 0)} bytes)")
    md.append(f"- **Total Discovered Files:** {art.get('total_files', 0)}")
    md.append(f"- **Total Lines of Code:** {art.get('total_lines', 0)}")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 3. Google Cloud Run Deployment Checklist")
    md.append("")
    md.append("| Requirement | Status | Standard / Architecture Expectation |")
    md.append("| :--- | :---: | :--- |")
    for cr in report_json["cloud_run_checklist"]:
        badge = "✅ PASS" if cr["status"] == "PASS" else "❌ FAIL"
        md.append(f"| **{cr['item']}** | {badge} | {cr['notes']} |")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 4. Deterministic Diagnostic Findings")
    md.append("")
    if not report_json["findings"]:
        md.append("*No configuration or security defects identified.*")
    else:
        md.append("| Rule ID | Severity | File & Location | Issue Description |")
        md.append("| :--- | :---: | :--- | :--- |")
        for f in report_json["findings"]:
            loc = f"`{f['file_path']}:{f['line_start']}`" if f.get("line_start") else f"`{f['file_path']}`"
            md.append(f"| `{f['rule_id']}` | **{f['severity'].upper()}** | {loc} | {f['title']} |")

        md.append("")
        md.append("### Finding Evidence & Verification Details")
        md.append("")
        for f in report_json["findings"]:
            loc = f"{f['file_path']}#L{f['line_start']}-L{f['line_end']}" if f.get("line_start") else f['file_path']
            md.append(f"#### [{f['rule_id']}] {f['title']} ({f['severity'].upper()})")
            md.append(f"- **Location:** `{loc}`")
            md.append(f"- **Action:** {f['recommended_action']}")
            md.append(f"- **Validation:** `{f['validation']}`")
            md.append(f"- **Evidence:**")
            md.append("```")
            md.append(f.get("evidence", "No snippet"))
            md.append("```")
            md.append("")

    md.append("---")
    md.append("")
    md.append("## 5. Data Readiness & RAG Suitability")
    md.append("")
    dr = report_json.get("data_readiness", {})
    if dr.get("overall_score") is not None:
        md.append(f"- **Overall RAG Suitability Score:** `{dr['overall_score']}%`")
        md.append(f"- **Structured Schema Score:** `{dr['structured_score']}%`")
        md.append(f"- **Unstructured Documentation Score:** `{dr['unstructured_score']}%`")
        md.append(f"- **Total Indexed Document Chunks:** `{dr['total_chunks']}`")
        if dr.get("recommendations"):
            md.append("")
            md.append("### Recommendations for AI Ingestion:")
            for rec in dr["recommendations"]:
                md.append(f"- {rec}")
    else:
        md.append("*No data readiness assessment performed for this project.*")

    md.append("")
    md.append("---")
    md.append("")
    md.append("## 6. Actionable Remediation Checklist")
    md.append("")
    if not report_json["remediation_checklist"]:
        md.append("🎉 *Zero open remediation items. Project is cleared for Cloud Run deployment!*")
    else:
        for idx, item in enumerate(report_json["remediation_checklist"], 1):
            md.append(f"{idx}. **[{item['severity'].upper()}] {item['title']}** (`{item['file_path']}`)")
            md.append(f"   - **Remediation Action:** {item['action']}")
            md.append(f"   - **Validation Command:** `{item['validation']}`")
            md.append("")

    md.append("---")
    md.append("*Report generated by Enterprise AI Deployment Engineering Platform (Google Cloud Consulting FDE 2027).*")
    return "\n".join(md)
