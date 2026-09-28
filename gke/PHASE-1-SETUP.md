# Phase 1: Cloud Run Deployment with Terraform

This guide walks you through deploying Dreamboard to Google Cloud Run using Terraform (IaC).

## Prerequisites

- ✅ `gcloud` CLI installed and authenticated
- ✅ `terraform` CLI installed (>= 1.0)
- ✅ Docker images built and pushed to Artifact Registry
- ✅ Google OAuth Client ID configured

## Step 1: Setup Terraform State Bucket

```bash
# Create bucket to store Terraform state
export PROJECT_ID="radiant-tide-401723"
export REGION="southamerica-east1"

gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${PROJECT_ID}-tf-state

# Enable versioning (optional but recommended)
gsutil versioning set on gs://${PROJECT_ID}-tf-state
```

## Step 2: Update Terraform Backend

Edit `gke/terraform/backend.tf`:

```hcl
terraform {
  backend "gcs" {
    bucket = "radiant-tide-401723-tf-state"
    prefix = "terraform-state"
  }
}
```

## Step 3: Configure Variables

Copy the example variables file:

```bash
cd gke/terraform/
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
project_id              = "radiant-tide-401723"
region                  = "southamerica-east1"
cloudrun_image_backend  = "southamerica-east1-docker.pkg.dev/radiant-tide-401723/dreamboard-docker-repo/dreamboard-backend:latest"
cloudrun_image_frontend = "southamerica-east1-docker.pkg.dev/radiant-tide-401723/dreamboard-docker-repo/dreamboard-frontend:latest"
oauth_client_id         = "YOUR_OAUTH_CLIENT_ID"
```

## Step 4: Build and Push Docker Images

### Backend

```bash
cd backend/
gcloud builds submit \
  --region=southamerica-east1 \
  --tag southamerica-east1-docker.pkg.dev/radiant-tide-401723/dreamboard-docker-repo/dreamboard-backend:latest .
cd ..
```

### Frontend

```bash
cd frontend/dreamboard/

# Update environment file with backend URL (use placeholder for now)
export BACKEND_URL="https://dreamboard-backend-PLACEHOLDER.southamerica-east1.run.app"

pushd src/environments/
sed "s@{BACKEND_CLOUD_RUN_SERVICE_URL}@$BACKEND_URL@g;" environment-template.ts > environment.ts
sed "s@{BACKEND_CLOUD_RUN_SERVICE_URL}@$BACKEND_URL@g;" environment-template.ts > environment.development.ts
popd

# Build and push
gcloud builds submit \
  --region=southamerica-east1 \
  --tag southamerica-east1-docker.pkg.dev/radiant-tide-401723/dreamboard-docker-repo/dreamboard-frontend:latest .

cd ..
```

## Step 5: Initialize and Apply Terraform

```bash
cd gke/terraform/

# Initialize Terraform (downloads providers and sets up backend)
terraform init

# Validate configuration
terraform validate

# Plan changes (review before applying)
terraform plan -out=tfplan

# Apply the plan
terraform apply tfplan
```

## Step 6: Capture Output Values

After successful apply:

```bash
# Get the backend URL
export BACKEND_URL=$(terraform output -raw backend_url)

# Get the frontend URL
export FRONTEND_URL=$(terraform output -raw frontend_url)

echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
```

## Step 7: Update Frontend Environment (if needed)

If you want to update the frontend with the real backend URL:

```bash
cd ../../../frontend/dreamboard/

pushd src/environments/
sed "s@{BACKEND_CLOUD_RUN_SERVICE_URL}@${BACKEND_URL}@g;" environment-template.ts > environment.ts
sed "s@{BACKEND_CLOUD_RUN_SERVICE_URL}@${BACKEND_URL}@g;" environment-template.ts > environment.development.ts
popd

# Rebuild and push frontend image
gcloud builds submit \
  --region=southamerica-east1 \
  --tag southamerica-east1-docker.pkg.dev/radiant-tide-401723/dreamboard-docker-repo/dreamboard-frontend:latest .

cd ../../..
```

## Verification

### Test the deployment

```bash
# Test backend health
curl -s ${BACKEND_URL}/health | jq .

# Test frontend
open ${FRONTEND_URL}
```

### Check Cloud Run services

```bash
gcloud run services list --region=southamerica-east1 --project=radiant-tide-401723
```

### View logs

```bash
# Backend logs
gcloud run services describe dreamboard-backend \
  --region=southamerica-east1 \
  --project=radiant-tide-401723

# Frontend logs
gcloud run services describe dreamboard-frontend \
  --region=southamerica-east1 \
  --project=radiant-tide-401723
```

## Updating the Deployment

### To update backend image

```bash
cd gke/terraform/

# Rebuild and push image
cd ../../backend/
gcloud builds submit \
  --region=southamerica-east1 \
  --tag southamerica-east1-docker.pkg.dev/radiant-tide-401723/dreamboard-docker-repo/dreamboard-backend:latest .
cd ../gke/terraform/

# Re-apply Terraform (it will update the Cloud Run service)
terraform apply -auto-approve
```

### To update environment variables

Edit `cloud-run.tf` and re-apply:

```bash
terraform apply -auto-approve
```

## Rollback

If something goes wrong:

```bash
# View previous state versions
gsutil ls -r gs://radiant-tide-401723-tf-state/

# Rollback to previous version
# This requires manual state management - see Terraform documentation
```

## Next Steps (Phase 2)

- [ ] Setup CI/CD Pipeline (Cloud Build + GitHub Actions)
- [ ] Setup Secret Manager for OAuth Client ID
- [ ] Configure Cloud Monitoring and Alerting
- [ ] Document deployment procedures

## Troubleshooting

### Image not found

```
Error: Error creating service: googleapi: Error 404: Requested entity was not found., notFound
```

Check that the image is built and pushed:

```bash
gcloud artifacts docker images list \
  --repository=dreamboard-docker-repo \
  --location=southamerica-east1 \
  --project=radiant-tide-401723
```

### Permission denied

Ensure the service account has the necessary IAM roles:

```bash
gcloud projects get-iam-policy radiant-tide-401723 \
  --flatten="bindings[].members" \
  --filter="bindings.members:dreamboard-account@*"
```

### State bucket not found

Initialize backend:

```bash
terraform init -backend-config="bucket=radiant-tide-401723-tf-state"
```

## Files Modified

- `gke/terraform/cloud-run.tf` - New file with Cloud Run resources
- `gke/terraform/variables.tf` - Added Cloud Run variables
- `gke/terraform/backend.tf` - Update bucket name
- `gke/terraform/terraform.tfvars.example` - Example configuration

## References

- [Terraform Google Cloud Run](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Dreamboard Original README](../README.md)
