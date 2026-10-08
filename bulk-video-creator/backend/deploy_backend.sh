#!/bin/bash

# Copyright 2025 Google LLC

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#    https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Deploys the Bulk Video Creator backend to Cloud Run.
#
# Unlike backend/deploy_backend.sh (which uses `gcloud run deploy --source .`),
# the image needs files from two folders (backend/app and this one), so it is
# built from the repository root with Cloud Build and then deployed by image.
# No local Docker is required.

set -o pipefail

reset="$(tput sgr 0)"
bold="$(tput bold)"
text_red="$(tput setaf 1)"
text_yellow="$(tput setaf 3)"
text_green="$(tput setaf 2)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

confirm() {
  while true; do
    read -r -p "${bold}${1:-Continue?} : ${reset}"
    case ${REPLY:0:1} in
      [yY]) return 0 ;;
      [nN]) return 1 ;;
      *) echo "Please answer yes or no."
    esac
  done
}

fail() {
  echo "${text_red}ERROR: $1${reset}"
  exit 1
}

enable_services() {
  echo "Enabling required API services..."
  gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    aiplatform.googleapis.com \
    sheets.googleapis.com \
    iamcredentials.googleapis.com \
    --project="$GOOGLE_CLOUD_PROJECT" || fail "Could not enable services"
  echo
}

create_service_account() {
  if [ -z "$(gcloud iam service-accounts list --project="$GOOGLE_CLOUD_PROJECT" \
      --filter="email:${SERVICE_ACCOUNT}" --format="value(email)")" ]; then
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
      --project="$GOOGLE_CLOUD_PROJECT" \
      --display-name="Bulk Video Creator Service Account" \
      || fail "Could not create the service account"
  else
    echo "${text_yellow}INFO: Service account ${SERVICE_ACCOUNT} already exists.${reset}"
  fi
  echo
}

create_bucket() {
  if gcloud storage ls "gs://${BUCKET_NAME}" --project="$GOOGLE_CLOUD_PROJECT" > /dev/null 2>&1; then
    echo "${text_yellow}INFO: Bucket ${BUCKET_NAME} already exists.${reset}"
  else
    gcloud storage buckets create "gs://${BUCKET_NAME}" \
      --project="$GOOGLE_CLOUD_PROJECT" \
      --location="$LOCATION" \
      --uniform-bucket-level-access \
      || fail "Could not create the bucket"
  fi
  echo
}

create_artifact_repository() {
  if gcloud artifacts repositories describe "$ARTIFACT_REPOSITORY" \
      --project="$GOOGLE_CLOUD_PROJECT" --location="$LOCATION" > /dev/null 2>&1; then
    echo "${text_yellow}INFO: Artifact Registry repository ${ARTIFACT_REPOSITORY} already exists.${reset}"
  else
    gcloud artifacts repositories create "$ARTIFACT_REPOSITORY" \
      --project="$GOOGLE_CLOUD_PROJECT" \
      --location="$LOCATION" \
      --repository-format=docker \
      || fail "Could not create the Artifact Registry repository"
  fi
  echo
}

grant_roles() {
  echo "Granting roles..."
  # Least privilege: object access only on the bulk bucket, not project-wide.
  gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/storage.objectAdmin" > /dev/null
  # Vertex AI service agent reads seed images and writes Veo outputs.
  gcloud beta services identity create --service=aiplatform.googleapis.com \
    --project="$GOOGLE_CLOUD_PROJECT" > /dev/null 2>&1
  gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" \
    --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-aiplatform.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin" > /dev/null

  for role in roles/aiplatform.user roles/logging.logWriter; do
    gcloud projects add-iam-policy-binding "$GOOGLE_CLOUD_PROJECT" \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="$role" --condition=None > /dev/null
  done
  # Signed URLs: the service account signs blobs with its own identity.
  gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
    --project="$GOOGLE_CLOUD_PROJECT" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/iam.serviceAccountTokenCreator" > /dev/null

  # Cloud Build (default compute service account) pushes the image.
  for role in roles/artifactregistry.writer roles/logging.logWriter roles/storage.objectViewer; do
    gcloud projects add-iam-policy-binding "$GOOGLE_CLOUD_PROJECT" \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="$role" --condition=None > /dev/null
  done
  echo "Waiting for the IAM roles to be applied..."
  sleep 30
  echo
}

build_image() {
  echo "Building the image with Cloud Build (from ${REPO_ROOT})..."
  gcloud builds submit "$REPO_ROOT" \
    --project="$GOOGLE_CLOUD_PROJECT" \
    --config="${SCRIPT_DIR}/cloudbuild.yaml" \
    --ignore-file="bulk-video-creator/backend/build.gcloudignore" \
    --substitutions="_REGION=${LOCATION},_REPOSITORY=${ARTIFACT_REPOSITORY}" \
    || fail "Image build failed"
  echo
}

deploy_cloud_run_service() {
  echo "Deploying Cloud Run service..."
  # Security: the service has no authentication of its own; it relies
  # on Cloud Run IAM (--no-allow-unauthenticated). Keep it that way.
  gcloud run deploy "$CLOUD_RUN_SERVICE_NAME" \
    --project="$GOOGLE_CLOUD_PROJECT" \
    --region="$LOCATION" \
    --image="$IMAGE" \
    --service-account="$SERVICE_ACCOUNT" \
    --timeout=3600 \
    --memory=2Gi \
    --cpu=2 \
    --no-allow-unauthenticated \
    --set-env-vars="PROJECT_ID=${GOOGLE_CLOUD_PROJECT},LOCATION=${LOCATION},GCS_BUCKET=${BUCKET_NAME},BULK_GCS_PREFIX=bulk-video-creator,BULK_VIDEO_MODEL=${BULK_VIDEO_MODEL},BULK_VIDEO_DURATION_SECS=${BULK_VIDEO_DURATION_SECS}" \
    || fail "Cloud Run deployment failed"
  echo
}

function init() {
  echo
  echo "${bold}┌──────────────────────────────────┐${reset}"
  echo "${bold}│   Bulk Video Creator Backend     │${reset}"
  echo "${bold}└──────────────────────────────────┘${reset}"
  echo
  echo "${bold}${text_red}This is not an officially supported Google product.${reset}"

  if [ -z "${GOOGLE_CLOUD_PROJECT}" ]; then
    GOOGLE_CLOUD_PROJECT="$(gcloud config get-value project 2> /dev/null)"
  fi
  [ -n "$GOOGLE_CLOUD_PROJECT" ] || fail "Set a project: gcloud config set project PROJECT_ID"
  echo "${bold}It will be deployed in the Google Cloud project: ${text_green}${GOOGLE_CLOUD_PROJECT}${reset}"
  echo

  confirm "Do you wish to proceed?" || exit 0
  echo

  PROJECT_NUMBER=$(gcloud projects describe "$GOOGLE_CLOUD_PROJECT" --format="value(projectNumber)") \
    || fail "Could not read the project number"
  CLOUD_RUN_SERVICE_NAME="bulk-video-creator-backend"
  SERVICE_ACCOUNT_NAME="bulk-video-creator-sa"
  SERVICE_ACCOUNT="${SERVICE_ACCOUNT_NAME}@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com"
  ARTIFACT_REPOSITORY="bulk-video-creator"

  read -r -p "Location (press enter for us-central1) : " LOCATION
  LOCATION="${LOCATION:-us-central1}"
  read -r -p "Bucket name (press enter for ${GOOGLE_CLOUD_PROJECT}-bulk-video-creator) : " BUCKET_NAME
  BUCKET_NAME="${BUCKET_NAME:-${GOOGLE_CLOUD_PROJECT}-bulk-video-creator}"
  read -r -p "Veo model (press enter for veo-3.1-generate-001) : " BULK_VIDEO_MODEL
  BULK_VIDEO_MODEL="${BULK_VIDEO_MODEL:-veo-3.1-generate-001}"
  read -r -p "Video duration in seconds, 4/6/8 (press enter for 4) : " BULK_VIDEO_DURATION_SECS
  BULK_VIDEO_DURATION_SECS="${BULK_VIDEO_DURATION_SECS:-4}"
  IMAGE="${LOCATION}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${ARTIFACT_REPOSITORY}/bulk-video-creator-backend:latest"

  echo
  echo "${bold}${text_green}Settings${reset}"
  echo "${bold}${text_green}──────────────────────────────────────────${reset}"
  echo "${bold}${text_green}Project ID: ${GOOGLE_CLOUD_PROJECT}${reset}"
  echo "${bold}${text_green}Cloud Run service: ${CLOUD_RUN_SERVICE_NAME}${reset}"
  echo "${bold}${text_green}Service account: ${SERVICE_ACCOUNT}${reset}"
  echo "${bold}${text_green}Bucket: ${BUCKET_NAME}${reset}"
  echo "${bold}${text_green}Location: ${LOCATION}${reset}"
  echo "${bold}${text_green}Veo model / duration: ${BULK_VIDEO_MODEL} / ${BULK_VIDEO_DURATION_SECS}s${reset}"
  echo
  confirm "Continue?" || exit 0
  echo

  enable_services
  create_service_account
  create_bucket
  create_artifact_repository
  grant_roles
  build_image
  deploy_cloud_run_service

  echo "✅ ${bold}${text_green}Done!${reset}"
  echo
  echo "${text_yellow}Next step: share each Google Sheet (as Editor) with ${bold}${SERVICE_ACCOUNT}${reset}"
  echo
}

init
