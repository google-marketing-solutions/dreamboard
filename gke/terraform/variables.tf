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

variable "project_id" {
  description = "GCP Project ID."
  type        = string
}

variable "region" {
  description = "GCP location for the regional deployment."
  type        = string
}

variable "cloudrun_image_backend" {
  description = "Artifact Registry URL for backend image"
  type        = string
}

variable "cloudrun_image_frontend" {
  description = "Artifact Registry URL for frontend image"
  type        = string
}

variable "oauth_client_id" {
  description = "Google OAuth Client ID for authentication"
  type        = string
  sensitive   = true
}

variable "backend_url" {
  description = "URL of the backend service (optional, will be computed if not provided)"
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email address for receiving monitoring alerts"
  type        = string
  sensitive   = true
}
