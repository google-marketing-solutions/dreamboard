# Phase 2: CI/CD Pipeline with GitHub Actions

This guide walks you through setting up CI/CD for automatic building, testing, and deployment of Dreamboard to Google Cloud Run.

## Overview

The CI/CD pipeline consists of three main workflows:

1. **build-images.yml** - Build Docker images and push to Artifact Registry
2. **validate-pr.yml** - Validate pull requests (linting, testing, build verification)
3. **deploy.yml** - Deploy to Cloud Run using Terraform

## Prerequisites

- ✅ Terraform infrastructure from Phase 1 deployed
- ✅ Google Cloud project configured
- ✅ GitHub repository forked and configured
- ✅ Service account with necessary permissions

## Step 1: Setup Workload Identity Federation (WIF)

Workload Identity Federation allows GitHub Actions to authenticate to Google Cloud without storing secrets.

### Create a Service Account

```bash
export PROJECT_ID="radiant-tide-401723"
export SERVICE_ACCOUNT="dreamboard-github-actions"

gcloud iam service-accounts create ${SERVICE_ACCOUNT} \
  --project=${PROJECT_ID} \
  --display-name="Service account for GitHub Actions CI/CD"
```

### Grant Necessary Permissions

```bash
# Cloud Run permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Artifact Registry permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

# Cloud Build permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

# Terraform state bucket permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### Create Workload Identity Pool

```bash
export POOL_NAME="github-actions-pool"
export POOL_ID="github-actions-pool"
export PROVIDER_ID="github-provider"
export GITHUB_REPO="hervasgc/dreamboard"

# Create Workload Identity Pool
gcloud iam workload-identity-pools create ${POOL_ID} \
  --project=${PROJECT_ID} \
  --location=global \
  --display-name="GitHub Actions"

# Create Workload Identity Pool Provider
gcloud iam workload-identity-pools providers create-oidc ${PROVIDER_ID} \
  --project=${PROJECT_ID} \
  --location=global \
  --workload-identity-pool=${POOL_ID} \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,assertion.aud=assertion.aud,assertion.repository=assertion.repository" \
  --issuer-uri=https://token.actions.githubusercontent.com

# Get the Provider Resource Name
export PROVIDER_RESOURCE_NAME=$(gcloud iam workload-identity-pools providers describe ${PROVIDER_ID} \
  --project=${PROJECT_ID} \
  --location=global \
  --workload-identity-pool=${POOL_ID} \
  --format='value(name)')

echo "Provider Resource Name: $PROVIDER_RESOURCE_NAME"
```

### Create Service Account Impersonation Binding

```bash
# Allow GitHub Actions to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com \
  --project=${PROJECT_ID} \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_ID}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"
```

## Step 2: Configure GitHub Secrets

Go to your repository settings and add these secrets:

### Secrets to Add

1. **`GCP_PROJECT_ID`** - Your Google Cloud project ID
   ```
   radiant-tide-401723
   ```

2. **`WIF_PROVIDER`** - The Workload Identity Provider resource name
   ```
   projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
   ```
   
   Get your project number:
   ```bash
   gcloud projects describe radiant-tide-401723 --format='value(projectNumber)'
   ```

3. **`GCP_SERVICE_ACCOUNT`** - Service account email
   ```
   dreamboard-github-actions@radiant-tide-401723.iam.gserviceaccount.com
   ```

4. **`REGISTRY`** - Artifact Registry URL
   ```
   southamerica-east1-docker.pkg.dev/radiant-tide-401723/dreamboard-docker-repo
   ```

5. **`TF_STATE_BUCKET`** - Terraform state bucket name
   ```
   radiant-tide-401723-tf-state
   ```

6. **`OAUTH_CLIENT_ID`** - Your OAuth Client ID
   ```
   654852193118-80b6klec3rsmingglbvie47re4d15sad.apps.googleusercontent.com
   ```

## Step 3: Configure GitHub Actions Environment Variables

Create a `.github/workflows/config.env` file with non-sensitive configuration:

```bash
# Not needed - all env vars are in workflow files
```

## Step 4: Test the CI/CD Pipeline

### Test Build Workflow

Push a change to the backend or frontend:

```bash
git checkout phase-2-cicd-pipeline
# Make a small change to backend
touch backend/.github-test
git add backend/.github-test
git commit -m "test: trigger build workflow"
git push origin phase-2-cicd-pipeline
```

Check the GitHub Actions tab to see the workflow running.

### Test Deployment Workflow

Once builds are working, deploy:

```bash
# Manually trigger deployment from GitHub Actions UI
# Or push to main (requires PR approval)
```

## Step 5: Verify Deployments

After deployment completes:

```bash
# Check Cloud Run services
gcloud run services list --region=southamerica-east1 --project=radiant-tide-401723

# Get backend URL
gcloud run services describe dreamboard-backend \
  --region=southamerica-east1 \
  --project=radiant-tide-401723 \
  --format='value(status.url)'

# Get frontend URL
gcloud run services describe dreamboard-frontend \
  --region=southamerica-east1 \
  --project=radiant-tide-401723 \
  --format='value(status.url)'
```

## Workflows Explained

### build-images.yml

Triggered on:
- Push to main (backend/** or frontend/** changes)
- Manual trigger (`workflow_dispatch`)

Steps:
1. Checkout code
2. Authenticate to Google Cloud (WIF)
3. Build backend Docker image → Artifact Registry
4. Build frontend Docker image → Artifact Registry
5. Notify deployment workflow

### validate-pr.yml

Triggered on:
- Pull request to main

Checks:
- **Terraform**: fmt, validate, tflint
- **Backend**: black (formatting), isort (imports), pylint (linting), mypy (types)
- **Frontend**: npm lint, npm build
- **Docker**: Build test for both images
- **Terraform Plan**: Preview infrastructure changes

### deploy.yml

Triggered on:
- Manual trigger (`workflow_dispatch`)
- Push to main (gke/terraform/** changes)

Steps:
1. **Plan Phase**: terraform plan (preview changes)
2. **Apply Phase**: terraform apply (only on main branch)
3. **Verify Phase**: Check services are running
4. **Notify Phase**: Post results

## Branching Strategy

### Main Branch
- Protected branch - requires PR approval
- All changes go through validation workflow
- Deployment happens automatically after merge

### Feature Branches
- Create from main: `git checkout -b feature/my-feature`
- Make changes and commit
- Push: `git push origin feature/my-feature`
- Create PR and request review
- CI runs validation workflow
- Once approved and passing, merge to main
- Deployment workflow runs automatically

Example:

```bash
# Create feature branch
git checkout -b feature/add-redis-cache

# Make changes
# ... edit files ...

# Commit and push
git add -A
git commit -m "feat: add Redis caching layer"
git push origin feature/add-redis-cache

# Create PR (from GitHub UI or gh CLI)
gh pr create --title "Add Redis caching" --body "Improves performance..."

# After approval and checks pass, merge
# Deployment happens automatically
```

## Secrets Rotation

### Rotate OAuth Client ID

```bash
# 1. Create new OAuth Client ID in Google Cloud Console
# 2. Update GitHub secret: GCP_OAUTH_CLIENT_ID
# 3. Deploy:
gh workflow run deploy.yml --ref main
# 4. Update frontend environment file if needed
# 5. Delete old OAuth Client ID
```

### Rotate Service Account Key

If using key-based auth (not recommended, WIF is better):

```bash
# Delete old key
gcloud iam service-accounts keys list \
  --iam-account=dreamboard-github-actions@radiant-tide-401723.iam.gserviceaccount.com

# Create new key
gcloud iam service-accounts keys create ~/key.json \
  --iam-account=dreamboard-github-actions@radiant-tide-401723.iam.gserviceaccount.com

# Update GitHub secret with new key (base64 encoded)
base64 -i ~/key.json | pbcopy
```

## Rollback Procedures

### Rollback to Previous Cloud Run Revision

```bash
# List revisions
gcloud run revisions list \
  --service=dreamboard-backend \
  --region=southamerica-east1 \
  --project=radiant-tide-401723

# Route traffic to previous revision
gcloud run services update-traffic dreamboard-backend \
  --to-revisions=REVISION_NAME=100 \
  --region=southamerica-east1 \
  --project=radiant-tide-401723
```

### Rollback Terraform Changes

```bash
# If last deployment broke something:
cd gke/terraform/

# Destroy and re-apply
terraform destroy -auto-approve
terraform apply -auto-approve

# Or revert to previous state
gsutil cp gs://radiant-tide-401723-tf-state/terraform-state.backup ./
terraform apply
```

## Monitoring Deployments

### GitHub Actions Dashboard

- https://github.com/hervasgc/dreamboard/actions

### Cloud Run Logs

```bash
# View logs for backend
gcloud run services describe dreamboard-backend \
  --region=southamerica-east1 \
  --project=radiant-tide-401723

# Stream logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=dreamboard-backend" \
  --limit 50 \
  --format=json
```

### Cloud Build Logs

```bash
gcloud builds list --project=radiant-tide-401723 --limit=10
gcloud builds log BUILD_ID --project=radiant-tide-401723
```

## Troubleshooting

### Workflow Fails - "No such object: GCS bucket"

Make sure TF_STATE_BUCKET secret is set correctly:

```bash
echo $TF_STATE_BUCKET  # Should be: radiant-tide-401723-tf-state
```

### Terraform Apply Fails - "No changes to apply"

This is normal if infrastructure is already up-to-date. Not an error.

### Docker Build Fails - "Access Denied"

Verify Artifact Registry permissions:

```bash
gcloud projects get-iam-policy radiant-tide-401723 \
  --flatten="bindings[].members" \
  --filter="bindings.members:dreamboard-github-actions@*"
```

Should show `roles/artifactregistry.admin`.

### WIF Authentication Fails

Verify the provider configuration:

```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --location=global \
  --workload-identity-pool=github-actions-pool \
  --project=radiant-tide-401723
```

Check that the GitHub repo matches: `hervasgc/dreamboard`

## Next Steps (Phase 3)

- [ ] Setup Secret Manager for OAuth Client ID
- [ ] Configure Cloud Monitoring and Alerting
- [ ] Setup automatic rollback on failed health checks
- [ ] Add cost monitoring and budgets

## Files Modified

- `.github/workflows/build-images.yml` - New
- `.github/workflows/deploy.yml` - New
- `.github/workflows/validate-pr.yml` - New
- `gke/PHASE-2-SETUP.md` - New

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Workload Identity Federation](https://cloud.google.com/docs/authentication/federation/workload-identity-federation)
- [Cloud Run Deployment](https://cloud.google.com/run/docs/deploying)
- [Terraform GitHub Actions](https://learn.hashicorp.com/tutorials/terraform/github-actions)
