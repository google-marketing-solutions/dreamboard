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

# First build the bundles in the dist directory
# The bundles will be used to deploy the app to App Engine

reset="$(tput sgr 0)"
bold="$(tput bold)"
text_red="$(tput setaf 1)"
text_yellow="$(tput setaf 3)"
text_green="$(tput setaf 2)"

confirm() {
  while true; do
    read -r -p "${BOLD}${1:-Continue?} : ${NOFORMAT}"
    case ${REPLY:0:1} in
      [yY]) return 0 ;;
      [nN]) return 1 ;;
      *) echo "Please answer yes or no."
    esac
  done
}

deploy_frontend_cloud_run_service() {
    echo "Deploying Frontend Cloud Run Service..."
    gcloud run deploy $FRONTEND_CLOUD_RUN_SERVICE_NAME --region=$LOCATION --source="." \
    --timeout 3600 \
    --memory 4Gi
    echo
}

GOOGLE_CLOUD_PROJECT=$1
BUCKET_NAME=$2
LOCATION=$3
BACKEND_CLOUD_RUN_SERVICE_URL=$4
CLIENT_ID=$5

echo "${bold}DreamBoard Frontend will be deployed in the Google Cloud project: ${text_green}${GOOGLE_CLOUD_PROJECT}${bold}${reset}"
echo

if confirm "Do you wish to proceed?"; then

    PROJECT_NUMBER=$(gcloud projects describe $GOOGLE_CLOUD_PROJECT --format="value(projectNumber)")
    FRONTEND_CLOUD_RUN_SERVICE_NAME="dreamboard-frontend"
    BUCKET="gs://$BUCKET_NAME"

    # Confirm deployment details
    echo
    echo "${bold}${text_green}Settings${reset}"
    echo "${bold}${text_green}──────────────────────────────────────────${reset}"
    echo "${bold}${text_green}Project ID: ${GOOGLE_CLOUD_PROJECT}${reset}"
    echo "${bold}${text_green}Frontend Cloud Run Service: ${FRONTEND_CLOUD_RUN_SERVICE_NAME}${reset}"
    echo "${bold}${text_green}Backend Cloud Run Service URL: ${BACKEND_CLOUD_RUN_SERVICE_URL}${reset}"
    echo "${bold}${text_green}Cloud Storage Bucket: ${BUCKET_NAME}${reset}"
    echo "${bold}${text_green}Location: ${LOCATION}${reset}"
    echo
    if confirm "Continue?"; then
        # Replace Backend Cloud Run URL for frontend deployment in PROD
        echo "Backend Cloud Run Service Url ->" $BACKEND_CLOUD_RUN_SERVICE_URL
        BACKEND_CLOUD_RUN_HOST_NAME=$(echo $BACKEND_CLOUD_RUN_SERVICE_URL | sed 's/https:\/\///g')
        echo "Cloud Run Host Name -> "$BACKEND_CLOUD_RUN_HOST_NAME

        cd src/environments/
        sed "s@{BACKEND_CLOUD_RUN_SERVICE_URL}@$BACKEND_CLOUD_RUN_SERVICE_URL@g; s@{CLIENT_ID}@$CLIENT_ID@g;" environment-template.ts > environment.ts
        sed "s@{BACKEND_CLOUD_RUN_SERVICE_URL}@$BACKEND_CLOUD_RUN_SERVICE_URL@g; s@{CLIENT_ID}@$CLIENT_ID@g;" environment-template.ts > environment.development.ts

        cd ..
        cd ..

        # Deploy Frontend Cloud Run Service
        deploy_frontend_cloud_run_service

        echo "✅ ${bold}${text_green} Done!${reset}"
    fi
fi