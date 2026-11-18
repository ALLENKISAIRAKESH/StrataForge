terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.30.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. VPC Network & Subnets for Secure Private Egress
resource "google_compute_network" "vpc_network" {
  name                    = "${var.app_name}-${var.environment}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.app_name}-${var.environment}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id
}

# 2. Serverless VPC Access Connector for Cloud Run -> Cloud SQL
resource "google_vpc_access_connector" "connector" {
  name          = "${substr(var.app_name, 0, 10)}-${var.environment}-conn"
  region        = var.region
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.vpc_network.name
  min_instances = 2
  max_instances = 3
}

# 3. Secret Manager: Database Password & App Secrets
resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "google_secret_manager_secret" "db_password_secret" {
  secret_id = "${var.app_name}-${var.environment}-db-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password_secret.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${var.app_name}-${var.environment}-jwt-secret"

  replication {
    auto {}
  }
}

resource "random_password" "jwt_secret_value" {
  length  = 32
  special = false
}

resource "google_secret_manager_secret_version" "jwt_secret_version" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret_value.result
}

# 4. Cloud SQL PostgreSQL 16 Instance with Private Networking
resource "google_sql_database_instance" "postgres_instance" {
  name             = "${var.app_name}-${var.environment}-pg16"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_size         = 20
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    ip_configuration {
      ipv4_enabled    = true
      private_network = null
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }

  deletion_protection = var.environment == "prod" ? true : false
}

resource "google_sql_database" "database" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres_instance.name
}

resource "google_sql_user" "db_user" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres_instance.name
  password = random_password.db_password.result
}

# 5. Zero-Privilege Dedicated Service Account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = "${substr(var.app_name, 0, 20)}-sa"
  display_name = "Cloud Run Service Account for ${var.app_name}"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# 6. Google Cloud Run v2 Service Definition
resource "google_cloud_run_v2_service" "app_service" {
  name     = "${var.app_name}-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = "2000m"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 8000
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 2
        period_seconds        = 5
        failure_threshold     = 3
        timeout_seconds       = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        period_seconds    = 10
        timeout_seconds   = 3
        failure_threshold = 3
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "PROJECT_NAME"
        value = var.app_name
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_secret_manager_secret_version.db_password_version,
    google_secret_manager_secret_version.jwt_secret_version,
  ]
}

# 7. Public Ingress Access IAM Policy (Optional for public APIs)
resource "google_cloud_run_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.app_service.location
  service  = google_cloud_run_v2_service.app_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
