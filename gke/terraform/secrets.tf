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

# Google Secret Manager for storing sensitive data
# Stores: OAuth Client ID and other secrets

resource "google_secret_manager_secret" "oauth_client_id" {
  secret_id = "dreamboard-oauth-client-id"
  project   = var.project_id

  labels = {
    app         = "dreamboard"
    environment = "production"
    managed-by  = "terraform"
  }

  replication {
    automatic = true
  }
}

# Store the OAuth Client ID secret value
resource "google_secret_manager_secret_version" "oauth_client_id" {
  secret      = google_secret_manager_secret.oauth_client_id.id
  secret_data = var.oauth_client_id

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Grant Cloud Run service account access to read OAuth secret
resource "google_secret_manager_secret_iam_member" "oauth_client_id_accessor" {
  secret_id  = google_secret_manager_secret.oauth_client_id.id
  role       = "roles/secretmanager.secretAccessor"
  member     = "serviceAccount:${google_service_account.dreamboard-sa.email}"
  project    = var.project_id
}

# Optional: Firebase API Key secret
resource "google_secret_manager_secret" "firebase_api_key" {
  secret_id = "dreamboard-firebase-api-key"
  project   = var.project_id

  labels = {
    app         = "dreamboard"
    environment = "production"
    managed-by  = "terraform"
  }

  replication {
    automatic = true
  }
}

# Grant Cloud Run service account access to Firebase secret
resource "google_secret_manager_secret_iam_member" "firebase_api_key_accessor" {
  secret_id  = google_secret_manager_secret.firebase_api_key.id
  role       = "roles/secretmanager.secretAccessor"
  member     = "serviceAccount:${google_service_account.dreamboard-sa.email}"
  project    = var.project_id
}

# Outputs for secret references
output "oauth_secret_id" {
  description = "Secret Manager resource ID for OAuth Client ID"
  value       = google_secret_manager_secret.oauth_client_id.id
}

output "oauth_secret_name" {
  description = "Secret Manager secret name for OAuth Client ID"
  value       = google_secret_manager_secret.oauth_client_id.name
}

output "firebase_secret_id" {
  description = "Secret Manager resource ID for Firebase API Key"
  value       = google_secret_manager_secret.firebase_api_key.id
}

# Reference for Cloud Run to access secrets
# Usage in Cloud Run container:
# env:
# - name: OAUTH_CLIENT_ID
#   valueFrom:
#     secretKeyRef:
#       name: dreamboard-oauth-client-id
#       key: latest
