variable "project_id" {
  description = "The Google Cloud Platform Project ID"
  type        = string
}

variable "region" {
  description = "The Google Cloud region for deployment"
  type        = string
  default     = "asia-south1" # Bengaluru / India GCC region default
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "app_name" {
  description = "Application name slug for resource naming"
  type        = string
  default     = "fde-enterprise-platform"
}

variable "container_image" {
  description = "Artifact Registry or Container Registry image URL"
  type        = string
  default     = "gcr.io/fde-project/fde-enterprise-platform:latest"
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances (prevent cold starts)"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances (autoscaling limit)"
  type        = number
  default     = 10
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-custom-2-7680"
}

variable "db_name" {
  description = "PostgreSQL Database name"
  type        = string
  default     = "fde_production"
}

variable "db_user" {
  description = "Database master username"
  type        = string
  default     = "fde_admin"
}
