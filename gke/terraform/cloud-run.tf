# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Cloud Run services for Dreamboard
# Frontend: serves Angular UI
# Backend: FastAPI server for AI services

variable "cloudrun_region" {
  description = "Region where Cloud Run services are deployed"
  type        = string
  default     = "southamerica-east1" # São Paulo region
}

variable "cloudrun_image_backend" {
  description = "Artifact Registry URL for backend image"
  type        = string
  # Example: southamerica-east1-docker.pkg.dev/PROJECT_ID/dreamboard-docker-repo/dreamboard-backend:latest
}

variable "cloudrun_image_frontend" {
  description = "Artifact Registry URL for frontend image"
  type        = string
  # Example: southamerica-east1-docker.pkg.dev/PROJECT_ID/dreamboard-docker-repo/dreamboard-frontend:latest
}

variable "oauth_client_id" {
  description = "Google OAuth Client ID for authentication"
  type        = string
  sensitive   = true
}

variable "backend_url" {
  description = "URL of the backend service"
  type        = string
  # Will be output by this module, but can be pre-set for frontend build
  default     = ""
}

# Backend Cloud Run Service
resource "google_cloud_run_service" "backend" {
  name     = "dreamboard-backend"
  location = var.cloudrun_region
  project  = var.project_id

  template {
    spec {
      service_account_name = google_service_account.dreamboard-sa.email

      containers {
        image = var.cloudrun_image_backend

        ports {
          container_port = 8000
        }

        resources {
          limits = {
            cpu    = "4"
            memory = "16Gi"
          }
        }

        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "LOCATION"
          value = "us-central1" # Vertex AI location (different from deployment region)
        }

        env {
          name  = "GCS_BUCKET"
          value = google_storage_bucket.bucket.name
        }

        env {
          name  = "FIRESTORE_DB"
          value = "dreamboard-db"
        }

        env {
          name  = "USE_AUTH_MIDDLEWARE"
          value = "True"
        }

        env {
          name  = "USE_PREVIEW_VIDEO_MODEL"
          value = "False"
        }

        env {
          name  = "USE_PREVIEW_GEMINI_IMAGE_MODEL"
          value = "False" # Set to False to use GA model (not preview)
        }

        env {
          name  = "GEMINI_IMAGE_MODEL_LOCATION"
          value = "global"
        }

        env {
          name  = "USE_PREVIEW_GEMINI_MODEL"
          value = "False"
        }

        env {
          name  = "GEMINI_MODEL_LOCATION"
          value = "global"
        }
      }

      timeout_seconds = 3600
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "100"
        "autoscaling.knative.dev/minScale" = "1"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.apis,
    google_service_account_iam_member.gke-sa-iam,
  ]
}

# Frontend Cloud Run Service
resource "google_cloud_run_service" "frontend" {
  name     = "dreamboard-frontend"
  location = var.cloudrun_region
  project  = var.project_id

  template {
    spec {
      service_account_name = google_service_account.dreamboard-sa.email

      containers {
        image = var.cloudrun_image_frontend

        ports {
          container_port = 8080
        }

        resources {
          limits = {
            cpu    = "2"
            memory = "4Gi"
          }
        }

        env {
          name  = "BACKEND_URL"
          value = var.backend_url != "" ? var.backend_url : google_cloud_run_service.backend.status[0].url
        }

        env {
          name  = "OAUTH_CLIENT_ID"
          value = var.oauth_client_id
        }
      }

      timeout_seconds = 3600
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "50"
        "autoscaling.knative.dev/minScale" = "1"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.apis,
    google_service_account_iam_member.gke-sa-iam,
  ]
}

# Remove authentication requirement for frontend (public access)
resource "google_cloud_run_service_iam_member" "frontend_public" {
  service      = google_cloud_run_service.frontend.name
  location     = google_cloud_run_service.frontend.location
  role         = "roles/run.invoker"
  member       = "allUsers"
  project      = var.project_id
}

# Backend requires authentication
resource "google_cloud_run_service_iam_member" "backend_authenticated" {
  service = google_cloud_run_service.backend.name
  location = google_cloud_run_service.backend.location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.dreamboard-sa.email}"
  project  = var.project_id
}

# Outputs
output "backend_url" {
  description = "Backend Cloud Run service URL"
  value       = google_cloud_run_service.backend.status[0].url
}

output "frontend_url" {
  description = "Frontend Cloud Run service URL"
  value       = google_cloud_run_service.frontend.status[0].url
}

output "backend_service_account" {
  description = "Service Account email for backend"
  value       = google_service_account.dreamboard-sa.email
}
