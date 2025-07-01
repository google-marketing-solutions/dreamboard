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

enable_services() {
    echo "Enabling required API services..."
    echo
    gcloud services enable run.googleapis.com
    gcloud services enable artifactregistry.googleapis.com
    gcloud services enable cloudbuild.googleapis.com
    gcloud services enable aiplatform.googleapis.com
    gcloud services enable servicemanagement.googleapis.com
    gcloud services enable servicecontrol.googleapis.com
    gcloud services enable iap.googleapis.com
    echo
}

create_service_account() {
    echo
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME --display-name "DreamBoard Service Account"

    # Service Account roles
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
        --member serviceAccount:$SERVICE_ACCOUNT \
        --role roles/storage.admin
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
        --member serviceAccount:$SERVICE_ACCOUNT \
        --role roles/aiplatform.user
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
        --member serviceAccount:$SERVICE_ACCOUNT \
        --role roles/run.invoker
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
        --member serviceAccount:$SERVICE_ACCOUNT \
        --role roles/logging.logWriter
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
        --member serviceAccount:$SERVICE_ACCOUNT \
        --role roles/iam.serviceAccountTokenCreator
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
       --member "serviceAccount:$SERVICE_ACCOUNT" \
       --role roles/servicemanagement.serviceController
    # Compute service account permissions
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
        --member "serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
        --role roles/storage.objectViewer
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
        --member "serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
        --role roles/logging.logWriter
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
        --member "serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
        --role roles/artifactregistry.writer
    gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
        --member "serviceAccount:service-$PROJECT_NUMBER@gcp-sa-aiplatform.iam.gserviceaccount.com" \
        --role roles/storage.admin
    echo
}

deploy_cloud_run_service() {
    echo "Deploying Cloud Run Service..."
    gcloud run deploy $CLOUD_RUN_SERVICE_NAME --region=$LOCATION --source="." \
    --service-account $SERVICE_ACCOUNT \
    --timeout 3600 \
    --add-volume name=$VOLUME_NAME,type=cloud-storage,bucket=$BUCKET_NAME \
    --add-volume-mount volume=$VOLUME_NAME,mount-path=$MOUNT_PATH \
    --memory 16Gi \
    --cpu=4 \
    --set-env-vars PROJECT_ID=$GOOGLE_CLOUD_PROJECT,LOCATION=$LOCATION,GCS_BUCKET=$BUCKET_NAME \
    --allow-unauthenticated # REMOVE
    sleep 180
    echo
}

redeploy_cloud_run_service_with_espv2() {
    echo "Deploying the ESPv2 container in the Cloud Run Service $CLOUD_RUN_SERVICE_NAME..."
    gcloud run deploy $CLOUD_RUN_SERVICE_NAME \
    --region=$LOCATION \
    --image="gcr.io/$GOOGLE_CLOUD_PROJECT/endpoints-runtime-serverless:$ESP_VERSION-$CLOUD_RUN_HOST_NAME-$CONFIG_ID" \
    --service-account $SERVICE_ACCOUNT \
    --timeout 3600 \
    --add-volume name=$VOLUME_NAME,type=cloud-storage,bucket=$BUCKET_NAME \
    --add-volume-mount volume=$VOLUME_NAME,mount-path=$MOUNT_PATH \
    --memory 4Gi \
    --set-env-vars PROJECT_ID=$GOOGLE_CLOUD_PROJECT,LOCATION=$LOCATION,ESPv2_ARGS=--cors_preset=basic \
    #--allow-unauthenticated # REMOVE
    echo
}

function deploy_endpoint() {
    echo "Deploying Endpoints Configuration..."
    gcloud endpoints services deploy openapi-run.yaml \
    --project $GOOGLE_CLOUD_PROJECT
    echo
}

function init() {
    echo
    echo "${bold}┌──────────────────────────────────┐${reset}"
    echo "${bold}│       DreamBoard Backend         │${reset}"
    echo "${bold}└──────────────────────────────────┘${reset}"
    echo
    echo "${bold}${text_red}This is not an officially supported Google product.${reset}"

    if [ -z "${GOOGLE_CLOUD_PROJECT}" ]; then
        GOOGLE_CLOUD_PROJECT="$(gcloud config get-value project)"
    fi
    echo "${bold}DreamBoard Backend will be deployed in the Google Cloud project: ${text_green}${GOOGLE_CLOUD_PROJECT}${bold}${reset}"
    echo

    if confirm "Do you wish to proceed?"; then
        echo
        # Get project parameters - Use default values for the cloud function, the service account and the location.
        PROJECT_NUMBER=$(gcloud projects describe $GOOGLE_CLOUD_PROJECT --format="value(projectNumber)")
        CLOUD_RUN_SERVICE_NAME="dreamboard-backend"
        SERVICE_ACCOUNT_NAME="dreamboard-sa"
        SERVICE_ACCOUNT=$SERVICE_ACCOUNT_NAME@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
        BUCKET_NAME=$GOOGLE_CLOUD_PROJECT"-dreamboard"
        BUCKET="gs://$BUCKET_NAME"
        VOLUME_NAME="dreamboard-volume"
        MOUNT_PATH="/code/app/mounted_files" # Code is in code/app in PROD

        read -p "Please enter a location where you wish to deploy the backend (default is us-central1)" -r LOCATION
        if [ -z "${LOCATION}" ]; then
            LOCATION='us-central1'
        fi

        # Confirm deployment details
        echo
        echo "${bold}${text_green}Settings${reset}"
        echo "${bold}${text_green}──────────────────────────────────────────${reset}"
        echo "${bold}${text_green}Project ID: ${GOOGLE_CLOUD_PROJECT}${reset}"
        echo "${bold}${text_green}Cloud Run Service: ${CLOUD_RUN_SERVICE_NAME}${reset}"
        echo "${bold}${text_green}Service Account: ${SERVICE_ACCOUNT}${reset}"
        echo "${bold}${text_green}Cloud Storage Bucket: ${BUCKET_NAME}${reset}"
        echo "${bold}${text_green}Location: ${LOCATION}${reset}"
        echo
        if confirm "Continue?"; then
            echo
            # Enable services
            enable_services

            # Create service account
            EXISTING_SERVICE_ACCOUNT=$(gcloud iam service-accounts list --filter "email:${SERVICE_ACCOUNT_NAME}" --format="value(email)")
            if [ -z "${EXISTING_SERVICE_ACCOUNT}" ]; then
                create_service_account
            else
                echo
                echo "${text_yellow}INFO: Service account '${SERVICE_ACCOUNT_NAME}' already exists. Skipping creation${reset}"
                echo
            fi

            # Create GCS bucket
            BUCKET_EXISTS=$(gcloud storage ls $BUCKET > /dev/null 2>&1 && echo "true" || echo "false")
            if [ "$BUCKET_EXISTS" == "true" ]; then
                echo
                echo "${text_yellow}Bucket $BUCKET_NAME already exists. Skipping bucket creation.${reset}"
                echo
            else
                echo
                gcloud storage buckets create $BUCKET --project=$GOOGLE_CLOUD_PROJECT --location=$LOCATION --uniform-bucket-level-access
                echo "INFO: Bucket $BUCKET_NAME created successfully!"
                echo
            fi

            echo "Waiting for the IAM roles to be applied..."
            echo

            # Deploy Backend Cloud Run Service
            deploy_cloud_run_service

            sleep 10 # To wait for the service to be ready

            # Compute Service Account roles
            gcloud run services add-iam-policy-binding $CLOUD_RUN_SERVICE_NAME \
            --member "serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
            --role "roles/run.invoker" \
            --platform managed \
            --project $GOOGLE_CLOUD_PROJECT \
            --region $LOCATION

            # Replace Cloud Run host name and URL for endpoint deployment
            CLOUD_RUN_SERVICE_URL="https://"$CLOUD_RUN_SERVICE_NAME"-"$PROJECT_NUMBER"."$LOCATION".run.app"
            echo "Cloud Run Service Url ->" $CLOUD_RUN_SERVICE_URL
            CLOUD_RUN_HOST_NAME=$(echo $CLOUD_RUN_SERVICE_URL | sed 's/https:\/\///g')
            echo "Cloud Run Host Name -> "$CLOUD_RUN_HOST_NAME
            sed "s@{CLOUD_RUN_HOST_NAME}@$CLOUD_RUN_HOST_NAME@g; s@{CLOUD_RUN_SERVICE_URL}@$CLOUD_RUN_SERVICE_URL@g;" openapi-run-template.yaml > openapi-run.yaml

            # Deploy Backend Endpoint
            deploy_endpoint

            echo "✅ ${bold}${text_green} Done!${reset}"
            echo
        fi

    fi

}

init