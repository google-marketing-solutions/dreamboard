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

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  project_number = data.google_project.project.number
  services = toset([
    "cloudresourcemanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "aiplatform.googleapis.com",
    "servicemanagement.googleapis.com",
    "servicecontrol.googleapis.com",
    "iap.googleapis.com",
    "container.googleapis.com",
  ])
}

resource "google_project_service" "apis" {
  for_each           = local.services
  service            = each.key
  disable_on_destroy = false
}

data "google_project" "project" {
  project_id = var.project_id
  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket" "bucket" {
  name          = "${var.project_id}-dreamboard-bucket"
  location      = var.region
  force_destroy = true

  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true
}

resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "dreamboard-docker-repo"
  format        = "DOCKER"
}
