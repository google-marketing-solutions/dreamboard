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

locals {
  iam_bindings = {
    0 = {
      member = "serviceAccount:${google_service_account.dreamboard-sa.email}"
      role   = "roles/storage.admin"
    },
    1 = {
      member = "serviceAccount:${google_service_account.dreamboard-sa.email}"
      role   = "roles/aiplatform.user"
    },
    2 = {
      member = "serviceAccount:${google_service_account.dreamboard-sa.email}"
      role   = "roles/logging.logWriter"
    },
    3 = {
      member = "serviceAccount:${google_service_account.dreamboard-sa.email}"
      role   = "roles/servicemanagement.serviceController"
    },
    4 = {
      member = "serviceAccount:${google_service_account.dreamboard-sa.email}"
      role   = "roles/artifactregistry.reader"
    },
    5 = {
      member = "serviceAccount:${google_service_account.dreamboard-sa.email}"
      role   = "roles/container.defaultNodeServiceAccount"
    }
    6 = {
      member = "serviceAccount:${google_service_account.dreamboard-sa.email}"
      role   = "roles/iam.serviceAccountTokenCreator"
    }
  }
}

resource "google_service_account" "dreamboard-sa" {
  project      = var.project_id
  account_id   = "dreamboard-account"
  display_name = "Dreamboard Cloud Run SA."
}

resource "google_project_iam_member" "bindings" {
  for_each = local.iam_bindings
  project  = var.project_id
  role     = each.value.role
  member   = each.value.member

  depends_on = [
    google_project_service.apis,
  ]
}

# Allow GKE account to use the dreamboard SA via WIF
resource "google_service_account_iam_member" "gke-sa-iam" {
  service_account_id = google_service_account.dreamboard-sa.id
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/dreamboard-gke-sa]"
}
