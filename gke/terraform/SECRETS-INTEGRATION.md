# Integrating Secret Manager with Cloud Run

This document explains how to use Secret Manager secrets in Cloud Run containers.

## Overview

By default, Cloud Run uses environment variables passed directly in the container spec. With Secret Manager integration, sensitive values are stored securely and only accessible at runtime.

### Before (Insecure)
```hcl
env {
  name  = "OAUTH_CLIENT_ID"
  value = "654852193118-80b6klec3rsmingglbvie47re4d15sad.apps.googleusercontent.com"
}
```

❌ Problem: Secret stored in Terraform state file

### After (Secure)
```hcl
env {
  name = "OAUTH_CLIENT_ID"
  value_source {
    secret_key_ref {
      secret  = "dreamboard-oauth-client-id"
      version = "latest"
    }
  }
}
```

✅ Secure: Secret stored only in Secret Manager

## Implementation

### Step 1: Update cloud-run.tf

Modify the backend container spec in `cloud-run.tf`:

**Replace this:**
```hcl
env {
  name  = "OAUTH_CLIENT_ID"
  value = var.oauth_client_id
}
```

**With this:**
```hcl
env {
  name = "OAUTH_CLIENT_ID"
  value_source {
    secret_key_ref {
      secret  = "dreamboard-oauth-client-id"
      version = "latest"
    }
  }
}
```

### Step 2: Do the Same for Frontend

If frontend needs OAuth Client ID:

```hcl
env {
  name = "OAUTH_CLIENT_ID"
  value_source {
    secret_key_ref {
      secret  = "dreamboard-oauth-client-id"
      version = "latest"
    }
  }
}
```

### Step 3: Create Secrets (Phase 3)

Run Phase 3 setup:

```bash
cd gke/terraform/
terraform apply -auto-approve
```

This creates the secrets in Secret Manager.

### Step 4: Populate Secrets

```bash
# Set the actual value
gcloud secrets versions add dreamboard-oauth-client-id \
  --data-file=- \
  --project=radiant-tide-401723 <<< "YOUR_OAUTH_CLIENT_ID"
```

### Step 5: Deploy Updated Cloud Run

```bash
terraform apply -auto-approve
```

Cloud Run services will now pull the secret from Secret Manager.

## Verification

### Test Secret Access

1. Deploy updated Cloud Run service
2. Check service logs:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=dreamboard-backend" \
  --limit=20 \
  --format=json | grep -i oauth
```

If you see log messages using the OAuth Client ID, the secret was successfully retrieved.

### Verify in Cloud Console

1. Go to Cloud Run → dreamboard-backend → Revisions
2. Click latest revision
3. Check "Executed by" shows service account
4. Confirm no secrets in environment variables section

## Security Considerations

### IAM Permissions

The service account needs `roles/secretmanager.secretAccessor`:

```bash
# Already configured by secrets.tf, but verify with:
gcloud secrets get-iam-policy dreamboard-oauth-client-id \
  --project=radiant-tide-401723
```

Should show:
```
role: roles/secretmanager.secretAccessor
members:
  - serviceAccount:dreamboard-account@radiant-tide-401723.iam.gserviceaccount.com
```

### Audit Logs

All secret access is logged. View logs:

```bash
gcloud logging read "protoPayload.serviceName=secretmanager.googleapis.com" \
  --project=radiant-tide-401723 \
  --limit=20
```

### Secret Rotation

When you add a new version to a secret:

```bash
gcloud secrets versions add dreamboard-oauth-client-id \
  --data-file=- \
  --project=radiant-tide-401723 <<< "NEW_VALUE"
```

Cloud Run automatically picks up the new version when configured with `version = "latest"`.

For zero-downtime rotation:
1. Add new secret version
2. Give Cloud Run time to restart with new value (auto on traffic)
3. Or manually restart: `gcloud run deploy dreamboard-backend ...`

## Multiple Secrets

If you have multiple secrets:

```hcl
# OAuth
env {
  name = "OAUTH_CLIENT_ID"
  value_source {
    secret_key_ref {
      secret  = "dreamboard-oauth-client-id"
      version = "latest"
    }
  }
}

# Firebase API Key
env {
  name = "FIREBASE_API_KEY"
  value_source {
    secret_key_ref {
      secret  = "dreamboard-firebase-api-key"
      version = "latest"
    }
  }
}

# Database password
env {
  name = "DATABASE_PASSWORD"
  value_source {
    secret_key_ref {
      secret  = "dreamboard-database-password"
      version = "latest"
    }
  }
}
```

## Troubleshooting

### "Secret access denied" Error

**Symptom:** Cloud Run fails with permission error

**Fix:**
```bash
# Verify service account has permission
gcloud secrets get-iam-policy dreamboard-oauth-client-id \
  --project=radiant-tide-401723

# If missing, add role (normally done by Terraform)
gcloud secrets add-iam-policy-binding dreamboard-oauth-client-id \
  --member="serviceAccount:dreamboard-account@radiant-tide-401723.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=radiant-tide-401723
```

### "Secret version not found"

**Symptom:** Cloud Run can't find secret version

**Fix:**
```bash
# List available versions
gcloud secrets versions list dreamboard-oauth-client-id \
  --project=radiant-tide-401723

# Use specific version instead of "latest"
version = "1"
```

### Secret Not Updating

**Symptom:** Added new secret version, Cloud Run still uses old value

**Fix:**
```bash
# Force Cloud Run restart
gcloud run deploy dreamboard-backend \
  --region=southamerica-east1 \
  --image=SAME_IMAGE_URL \
  --project=radiant-tide-401723

# Or redeploy with Terraform
terraform apply -auto-approve
```

## GitHub Actions Integration

When deploying from GitHub Actions, secrets should already be in Secret Manager. No need to pass them in GitHub secrets for this purpose.

However, still use GitHub secrets for:
- **WIF_PROVIDER**: Workload Identity Federation
- **GCP_SERVICE_ACCOUNT**: Service account email
- Anything else needed by GitHub Actions itself

Example workflow:
```yaml
- name: Deploy to Cloud Run
  run: |
    # Secrets are already in Secret Manager
    terraform apply -auto-approve
```

## Comparing Approaches

| Approach | Security | Auditability | Rotation | Complexity |
|----------|----------|--------------|----------|------------|
| Hardcoded in cloud-run.tf | ❌ Poor | ❌ None | ❌ Manual | Low |
| GitHub Actions secrets | ⚠️ Ok | ⚠️ Limited | ⚠️ Manual | Medium |
| Google Secret Manager | ✅ Excellent | ✅ Full | ✅ Automatic | Medium |

## References

- [Secret Manager in Cloud Run](https://cloud.google.com/run/docs/configuring/secrets)
- [Terraform Cloud Run Secret Reference](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_service)
- [Secret Rotation Best Practices](https://cloud.google.com/secret-manager/docs/managing-secrets)
