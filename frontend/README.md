# DreamBoard Frontend Code

This directory contains the NodeJS web server responsible for serving the DreamBoard Angular UI and a generic authentication proxy. The code is to be hosted on a Google Cloud Platform (GCP) Cloud Run Service. It can also be run locally. On GCP, The frontend deployment is meant to be run after the backend server code is deployed as it needs to refer to the backend service locations.

### Why is a NodeJS web server needed?

The NodeJS server acts as a secure proxy, generating authentication tokens for frontend requests made to the secured DreamBoard backend. It implements a generic `handleRequest` function that intercepts requests from the frontend, adds the necessary tokens, and forwards them to the backend. The server also includes a `handleFileUploadRequest` function to handle file uploads (such as images, files, and videos) from the frontend.


# Structure

The frontend code is built in Angular. Outside of the configuration and supporting utility files, the source code folder structure in src/app is separated into the following:

- components: Contains the various UI components on the DreamBoard app.
- models: Contains files representing image, video, scene, and other objects used in the UI or for requesting from the backend API.
- services: Contains all services used to communicate with the backend API and supporting services.

# Requirements

- A Google Cloud Platform project to host the Cloud Run Service.
- Backend API code deployed before the frontend. See requirements of the backend server from the backend README for details.
- A service account to invoke Cloud Run Service, start AI generation, and other associated compute access. Please see the deploy_backend.sh script for specific service account permissions
- Deployment individual to have permission to the following:
  - Build Cloud Run Service
  - Create Cloud Storage Buckets
  - Enable APIs
  - Create service account and apply IAM permissions (if creating at deployment time)

# Installation

The DreamBoard frontend can be installed locally or on GCP.

## Installing on GCP

To install it on GCP:

1. Deploy the backend code and make note of the following when creating :
   - GCP Project Id
   - Service Account
   - Location the service is deployed
   - Cloud Run Service URL
2. Configure the OAuth Consent Screen if not configured yet.
   - Go to the [OAuth Consent Screen](http://console.cloud.google.com/auth/overview/create)
   - In the 'App Information' section, add the name of the app and the support email. The email can be the user's email deploying the application.
   - In the 'Audience' section, select 'Internal'.
   - In the 'Contact Information' include a list of email address for Google to notify about any changes to your project.
   - Agree to the Google API Services User Data Policy.
   - Click on the 'Create' button.
3. Create a Client ID to log in to the DreamBoard UI using a Google Account that is part of your Google Cloud organization.
   - Go to the [Credentials page](http://console.cloud.google.com/apis/credentials) in the Google Cloud console.
   - Click on the 'Create Credentials' button and select 'OAuth Client ID'
   - Select the 'Web application' option and add a name, for example: DreamBoard Client ID.
   - On the 'Authorized JavaScript origins' section, include the following URLs if you are testing the solution on your local machine:
      - http://localhost
      - http://localhost:4200
  
4. Click `Sumbit`, note down the Client ID
   
   Note: You will add the production URL in the next step once the frontend is deployed.
5. Navigate to the frontend folder and run `deploy_frontend.sh` with the following arguments noted from the previous step in the following order:

   - **GCP Project ID**
   - **Cloud Storage Bucket Name**
   - **Service Account Email** (the SA created during the backend deployment)
   - **Location to deploy**
   - **Cloud Run Service URL**
   - **Client ID**
  
   
   Example:
    ```bash
    ./deploy_frontend.sh \
    your-project-id \
    your-dreamboard-gcs-bucket-name \
    dreamboard-service-account@example.iam.gserviceaccount.com \
    us-central1 \
    https://dreamboard-backend-12345.us-central1.run.app \
    oauth-client-id.apps.googleusercontent.com
  
    ```
6. Add the deployed frontend URL to the 'Authorized JavaScript origins' in your Client ID.
   - The frontend URL should look something like: https://dreamboard-frontend-{PROJECT_NUMBER}.{LOCATION}.run.app
   - Go to the [Credentials page](http://console.cloud.google.com/apis/credentials) in the Google Cloud console.
   - Edit the Client ID created on step 2 and include the deployed frontend URL.
   - Save the changes.

   WARNING: If you don't include the deployed frontend URL you will get the following error when trying to log in with a Google account: 'Access blocked: Authorization Error ... Error 400: origin_mismatch
7. Secure the application using Identity Aware Proxy (IAP). In order to grant access to specific users, you can use IAP to close the application.
   - Go to the [Cloud Run page](http://console.cloud.google.com/run) and click on the the deployed frontend service.
   - Go to the 'Security' tab and in the 'Authentication' section enable the 'Identity Aware Proxy (IAP)' option.
   - Click on the 'Edit policy' button and add the users that should have access to the application.
   - Permission propagation may take up to 5 minutes to complete.
   - Access the URL at: https://dreamboard-frontend-{PROJECT_ NUMBER}.{LOCATION}.run.app

## Installing Locally

To install locally on a Linux-based computer, run the following commands in the command line:

Frontend

1. `cd frontend/dreamboard`
2. `npm install`
3. `ng build`
4. `ng serve`

The web application will be available on `http://localhost:4200`.

NodeJS Web Server:

1. `cd frontend/dreamboard/server`
2. `npm install`
3. `node server.js`

The NodeJS web server will be available on `http://127.0.0.1:3000`.

**Important Notes:**

1. To test the solution locally, the web application, NodeJS web server, and FastAPI backend must all be running simultaneously. An easy way to manage this is to open three separate instances of your IDE (like VSCode), one for each component.
In this setup, the NodeJS server acts as a proxy. When the frontend sends a request, the server will intercept it, add the required authentication token, and then redirect the request to the FastAPI backend.
2. After deployment, remember to revert the changes in `dreamboard/src/environments/environment.development.ts` This file was temporarily modified with the production backend URL for the deployment process and must be restored for local development: `git restore dreamboard/src/environments/environment.development.ts`.
