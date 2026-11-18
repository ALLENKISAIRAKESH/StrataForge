from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class TerraformBundleResponse(BaseModel):
    project_id: str
    region: str
    files: Dict[str, str]
    is_valid: bool
    validation_errors: List[str] = []


class TerraformValidateRequest(BaseModel):
    terraform_code: str = Field(..., description="HCL Terraform code to validate")


class TerraformValidateResponse(BaseModel):
    is_valid: bool
    errors: List[str] = []
    checks_passed: int
    checks_failed: int
