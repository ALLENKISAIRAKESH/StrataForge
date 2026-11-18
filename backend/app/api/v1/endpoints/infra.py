import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.entities import User, Project
from backend.app.api.deps import get_current_user
from backend.app.api.v1.endpoints.projects import check_user_workspace_access
from backend.app.schemas.infra import (
    TerraformBundleResponse,
    TerraformValidateRequest,
    TerraformValidateResponse,
)
from backend.app.services.terraform_generator import (
    generate_project_terraform,
    validate_terraform_syntax,
    build_terraform_bundle_zip,
)

router = APIRouter()


@router.get(
    "/projects/{project_id}/infra/terraform",
    response_model=TerraformBundleResponse,
    status_code=status.HTTP_200_OK,
)
def get_project_terraform_bundle(
    project_id: str,
    region: Optional[str] = Query(None, description="Optional target region override (default asia-south1)"),
    image: Optional[str] = Query(None, description="Optional container image override"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Synthesizes complete, validated production Terraform IaC for Google Cloud Run deployment."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    resolved_region, tf_files = generate_project_terraform(
        db=db,
        project_id=project_id,
        custom_region=region,
        custom_image=image,
    )
    is_valid, errors = validate_terraform_syntax(tf_files["main.tf"])

    return TerraformBundleResponse(
        project_id=project_id,
        region=resolved_region,
        files=tf_files,
        is_valid=is_valid,
        validation_errors=errors,
    )


@router.post(
    "/projects/{project_id}/infra/terraform/validate",
    response_model=TerraformValidateResponse,
    status_code=status.HTTP_200_OK,
)
def validate_terraform_code(
    project_id: str,
    payload: TerraformValidateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Validates arbitrary HCL Terraform code against Google Cloud Run enterprise requirements."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    is_valid, errors = validate_terraform_syntax(payload.terraform_code)
    total_checks = 5
    failed_checks = len(errors)
    passed_checks = max(0, total_checks - failed_checks)

    return TerraformValidateResponse(
        is_valid=is_valid,
        errors=errors,
        checks_passed=passed_checks,
        checks_failed=failed_checks,
    )


@router.get(
    "/projects/{project_id}/infra/terraform/download",
    status_code=status.HTTP_200_OK,
)
def download_terraform_zip(
    project_id: str,
    region: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Downloads an executable Terraform directory (.zip) containing main.tf, variables.tf, and outputs.tf."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    check_user_workspace_access(project.workspace_id, current_user.id, db)

    _, tf_files = generate_project_terraform(db=db, project_id=project_id, custom_region=region)
    zip_buffer = build_terraform_bundle_zip(tf_files)

    filename = f"{project.name.lower().replace(' ', '-')}-terraform.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
