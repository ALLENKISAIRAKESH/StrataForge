# Google Cloud Production Infrastructure as Code (Terraform)

Production Terraform specification for the Enterprise AI Deployment Platform, adhering to Google Cloud Consulting (GCC) Forward Deployed Engineering deployment standards.

## Architecture Highlights
* **Google Cloud Run v2**: Serverless container execution with automated scaling, readiness and liveness probes on `/health`.
* **VPC Access Connector**: High-throughput serverless VPC connector (`asia-south1`) routing egress traffic to internal Google APIs and private databases.
* **Cloud SQL (PostgreSQL 16)**: High-availability regional database with automatic SSD expansion, point-in-time recovery (PITR), and Cloud SQL IAM authentication.
* **Secret Manager Integration**: Zero plaintext secrets. Database credentials and JWT signing keys are injected dynamically at runtime via Secret Manager secret references.
* **Least-Privilege Service Account**: Dedicated Cloud Run service account bound strictly to `roles/secretmanager.secretAccessor` and `roles/cloudsql.client`.

## Quick Start
```bash
# 1. Initialize Terraform
terraform init

# 2. Preview execution plan
terraform plan -var-file="terraform.tfvars"

# 3. Apply infrastructure
terraform apply -var-file="terraform.tfvars"
```
