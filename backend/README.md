# DreamBoard Backend Code

This directory contains the backend code to run the AI text/image/video generation services of DreamBoard. The code is to be deployed on GCP as a Cloud Run Service and accessed as an API. The backend is FastAPI-based and can run individually as an API server without the frontend.

# Structure

The general folder structure is as follows under backend/app:

- api: Contains backend API routing code.
  - endpoints: Endpoints for each type of AI generation (text, image, video).
- core: Contains configuration of the backend server.
- dreamboard: (optional) Folder used for local/development environments. Environment variable must be set to "DEV" to use this folder.
- models: Contains API request and response objects for text/image/video.
- prompts: Prompts used to for text/image/video generation.
- services: Actual code that runs the generation.
- tests: Directory for test cases.

## Requirements

- A Google Cloud Platform project with access to the following:
  - Veo3
  - Imagen4
  - Gemini
  - Cloud Storage FUSE
  - Cloud Storage Bucket - to store the image and video results
- A service account to invoke Cloud Run Service, start AI generation, and other associated compute access. Please see the deploy_backend.sh script for specific service account permissions
- Deployment individual to have permission to the following:
  - Build Cloud Run Service
  - Create Cloud Storage Buckets
  - Enable APIs
  - Create service account and apply IAM permissions (if creating at deployment time)

# Installation

DreamBoard can be deployed on a laptop for personal use or on Google Cloud as Cloud Run Service. In Google Cloud, the backend server code can be deployed by running deploy_backend.sh in the backend folder. Please review the file before deploying and update any settings if you wish to change the name of items such as the service account name, service name, or bucket name. Follow the prompts to create the service. Make note of the following items for use in deploying the frontend:

- GCP Project Id
- Cloud Storage Bucket Name
- Location
- Cloud Service Name Deployed

Locally, this code can run with the following commands in a Linux-based CLI (change directory to backend directory first):

- `cd /backend/app`
- `uv add -r requirements.txt`
- `gcloud auth application-default login`

Create a `.env` folder in `/backend/app` (next to `main.py`) with the following fields:

```
PROJECT_ID=<YOUR_PROJECT_ID>
LOCATION=<YOUR_PROJECT_LOCATION>
GCS_BUCKET=<YOUR_GCS_BUCKET>
ENV=dev
FIRESTORE_DB=dreamboard-db

DEFAULTUSERPW=<a default user password>
DEFAULTADMINPW=<a default admin password>
```

- `uv run fastapi dev app/main.py`
