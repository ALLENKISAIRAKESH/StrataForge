from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.entities import User, Project
from backend.app.api.deps import get_current_user
from backend.app.api.v1.endpoints.projects import check_user_workspace_access
from backend.app.services.report_generator import generate_project_report_json, generate_project_report_markdown

router = APIRouter()


@router.get("/projects/{project_id}/report", status_code=status.HTTP_200_OK)
def get_project_audit_report(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    try:
        report_data = generate_project_report_json(project_id, db)
        return report_data
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/projects/{project_id}/report/download", status_code=status.HTTP_200_OK)
def download_project_audit_report(
    project_id: str,
    format: str = "markdown",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    report_data = generate_project_report_json(project_id, db)

    if format.lower() == "json":
        import json
        content = json.dumps(report_data, indent=2)
        filename = f"{project.name.lower().replace(' ', '_')}_audit_report.json"
        media_type = "application/json"
    else:
        content = generate_project_report_markdown(report_data)
        filename = f"{project.name.lower().replace(' ', '_')}_audit_report.md"
        media_type = "text/markdown; charset=utf-8"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
