output "cloud_run_url" {
  description = "The public endpoint URL of the deployed Google Cloud Run v2 service"
  value       = google_cloud_run_v2_service.app_service.uri
}

output "cloud_run_service_name" {
  description = "The name of the Cloud Run v2 service"
  value       = google_cloud_run_v2_service.app_service.name
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection name (PROJECT_ID:REGION:INSTANCE_NAME)"
  value       = google_sql_database_instance.postgres_instance.connection_name
}

output "cloud_sql_ip" {
  description = "Public IPv4 address of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres_instance.public_ip_address
}

output "vpc_connector_id" {
  description = "Serverless VPC Access Connector ID"
  value       = google_vpc_access_connector.connector.id
}

output "service_account_email" {
  description = "Service account running the Cloud Run container"
  value       = google_service_account.cloud_run_sa.email
}
