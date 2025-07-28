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

output "cluster_name" {
  value       = google_container_cluster.dreamboard-cluster.name
  description = "GKE Cluster"
}

output "ip_address" {
  value       = google_compute_address.static_address.address
  description = "Static IP Address"
}

output "bucket_name" {
  value       = google_storage_bucket.bucket.name
  description = "GCS Bucket"
}

output "repo_address" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
  description = "Artifact Registry repository address"
}

output "service_account" {
  value       = google_service_account.dreamboard-sa.email
  description = "Dreamboard GCP Service Account"
}
