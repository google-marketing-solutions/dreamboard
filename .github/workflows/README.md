# GitHub Actions Workflows

This directory contains all CI/CD workflows for Dreamboard.

## Workflows

### build-images.yml
**Purpose:** Build Docker images and push to Artifact Registry  
**Trigger:** Push to main (backend/** or frontend/** changes), manual dispatch  
**Duration:** ~10-15 minutes

Steps:
- Build backend image using Cloud Build
- Build frontend image using Cloud Build
- Push to Artifact Registry with both `latest` and commit SHA tags
- Trigger deployment workflow

### validate-pr.yml
**Purpose:** Validate pull requests  
**Trigger:** Pull request to main  
**Duration:** ~15-20 minutes

Checks:
- **Terraform**
  - Format check (`terraform fmt`)
  - Validation (`terraform validate`)
  - Linting (`tflint`)
  
- **Backend** (Python/FastAPI)
  - Code formatting (`black`)
  - Import sorting (`isort`)
  - Linting (`pylint`)
  - Type checking (`mypy`)
  
- **Frontend** (Angular/TypeScript)
  - Linting (`npm lint`)
  - Build verification (`npm build`)
  
- **Docker**
  - Test build (no push) for both backend and frontend
  
- **Terraform Plan**
  - Preview infrastructure changes (only on PR)
  - Post plan output as PR comment

### deploy.yml
**Purpose:** Deploy to Cloud Run using Terraform  
**Trigger:** Push to main (gke/terraform/** changes), manual dispatch, workflow_call  
**Duration:** ~5-10 minutes

Phases:
1. **Plan**
   - Terraform init
   - Terraform plan (preview changes)
   - Save plan as artifact

2. **Apply** (only on main branch)
   - Download plan artifact
   - Terraform apply
   - Get service URLs

3. **Verify**
   - Describe Cloud Run services
   - Test backend health endpoint

4. **Notify**
   - Post deployment summary to GitHub Step Summary

## Secrets Required

Configure these in GitHub Repository Settings → Secrets:

| Secret | Value | Notes |
|--------|-------|-------|
| `GCP_PROJECT_ID` | `radiant-tide-401723` | Google Cloud project ID |
| `WIF_PROVIDER` | `projects/{project_number}/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider` | Workload Identity Federation provider |
| `GCP_SERVICE_ACCOUNT` | `dreamboard-github-actions@radiant-tide-401723.iam.gserviceaccount.com` | Service account email |
| `REGISTRY` | `southamerica-east1-docker.pkg.dev/radiant-tide-401723/dreamboard-docker-repo` | Artifact Registry URL |
| `TF_STATE_BUCKET` | `radiant-tide-401723-tf-state` | Terraform state bucket |
| `OAUTH_CLIENT_ID` | `654852193118-80b6klec3rsmingglbvie47re4d15sad.apps.googleusercontent.com` | Google OAuth Client ID |

## Workflow Triggers

### Manual Trigger

Trigger any workflow manually from GitHub Actions UI:

```
Actions → Select workflow → Run workflow → Run
```

Or via CLI:

```bash
# Trigger deploy workflow
gh workflow run deploy.yml --ref main

# Trigger build workflow
gh workflow run build-images.yml --ref main
```

### Automatic Trigger

| Workflow | Trigger |
|----------|---------|
| build-images | Push to main with backend/** or frontend/** changes |
| validate-pr | Pull request to main |
| deploy | Push to main with gke/terraform/** changes |

## Status Checks

All workflows must pass before merging to main:

- ✅ Terraform validation
- ✅ Backend checks (linting, types, formatting)
- ✅ Frontend checks (linting, build)
- ✅ Docker build tests

## Environment Variables

These are defined in each workflow file (not in .env):

- `PROJECT_ID`: GCP project ID
- `REGION`: Deployment region (southamerica-east1)
- `REGISTRY`: Artifact Registry URL
- `TF_VERSION`: Terraform version (1.9)

## Debugging

### View Workflow Logs

1. Go to Actions tab
2. Click workflow run
3. Click failed job
4. Expand step for details

### Run Workflow Locally (act)

```bash
# Install act
brew install act

# Run workflow locally
act -j validate-pr
```

### Common Errors

**"Error: No such object: GCS bucket"**
- Check TF_STATE_BUCKET secret is correct
- Verify bucket exists: `gsutil ls -b gs://radiant-tide-401723-tf-state`

**"Error: Access Denied" in Cloud Build**
- Check service account has roles/artifactregistry.admin

**"Unable to create directory" in Terraform**
- Usually a permissions issue
- Verify Workload Identity Federation configuration

## Cost Considerations

- **Cloud Build**: ~$0.003 per build minute
- **Artifact Registry**: Storage + egress charges
- **Cloud Run**: Only charged when running
- **GitHub Actions**: 2000 free minutes/month

Estimate: ~$5-20/month for moderate CI/CD usage

## Security

### Secrets

- Secrets are masked in workflow logs
- OAuth Client ID never stored as plain text
- Service account uses Workload Identity Federation (no keys stored)

### Branch Protection

Configure in Settings → Branches → main:

- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- [x] Require approval reviews before merging
- [x] Dismiss stale pull request approvals when new commits pushed

## Maintenance

### Update Workflow Versions

Periodically update GitHub Actions versions:

```bash
# Check for updates
gh workflow view build-images.yml

# Update actions
# actions/checkout@v4 → @v5
# google-github-actions/auth@v2 → @v3
```

### Rotate Secrets

- OAuth Client ID: Rotate quarterly
- Service Account: Rotate every 6 months
- Terraform State: Enable versioning on bucket

## Additional Resources

- [Dreamboard Deployment Guide](../PHASE-2-SETUP.md)
- [Terraform Cloud Run](../terraform/cloud-run.tf)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/guides)
