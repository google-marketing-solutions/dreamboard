# Phase 3: Secret Manager & Cloud Monitoring

This guide covers setting up Google Secret Manager for secure credential storage and Cloud Monitoring for observability.

## Overview

Phase 3 implements:
1. **Secret Manager** - Secure storage for OAuth Client ID and other secrets
2. **Cloud Monitoring** - Dashboard and alerts for service health
3. **Alert Policies** - Automated notifications for critical issues

## Prerequisites

- ✅ Phase 1 (Terraform Cloud Run) deployed
- ✅ Phase 2 (CI/CD) configured
- ✅ Google Cloud project with billing enabled

## Part 1: Google Secret Manager

### What is Secret Manager?

Secret Manager is a GCP service that securely stores and manages sensitive data like:
- API keys
- OAuth Client IDs
- Database passwords
- Encryption keys

Benefits:
- ✅ Encrypted at rest and in transit
- ✅ Access controlled via IAM
- ✅ Audit logs for all access
- ✅ Secret rotation support
- ✅ No secrets in code or git

### Step 1: Create Secrets in Terraform

The `secrets.tf` file creates:
- `dreamboard-oauth-client-id` - Your OAuth Client ID
- `dreamboard-firebase-api-key` - Optional Firebase API key

Update `terraform.tfvars`:

```hcl
alert_email = "your-email@example.com"
```

### Step 2: Deploy Secrets

```bash
cd gke/terraform/

# Plan changes (review)
terraform plan -out=tfplan

# Apply (create secrets)
terraform apply tfplan
```

### Step 3: Verify Secrets Created

```bash
gcloud secrets list --project=radiant-tide-401723

# Should show:
# dreamboard-firebase-api-key
# dreamboard-oauth-client-id
```

### Step 4: Populate Secrets

```bash
# Set OAuth Client ID
gcloud secrets versions add dreamboard-oauth-client-id \
  --data-file=- \
  --project=radiant-tide-401723 <<< "654852193118-80b6klec3rsmingglbvie47re4d15sad.apps.googleusercontent.com"

# Verify
gcloud secrets versions access latest \
  --secret=dreamboard-oauth-client-id \
  --project=radiant-tide-401723
```

### Step 5: Update Cloud Run to Use Secrets

Cloud Run can access Secret Manager via environment variables. Update `cloud-run.tf`:

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

Then redeploy:

```bash
terraform apply -auto-approve
```

### Step 6: Verify Cloud Run Can Access Secrets

```bash
# Get backend service URL
BACKEND_URL=$(gcloud run services describe dreamboard-backend \
  --region=southamerica-east1 \
  --project=radiant-tide-401723 \
  --format='value(status.url)')

# Test endpoint that uses OAuth
curl $BACKEND_URL/auth/callback
```

## Part 2: Cloud Monitoring

### What is Cloud Monitoring?

Cloud Monitoring provides:
- Real-time dashboards
- Metrics collection
- Alert policies
- Logs analysis

### Monitoring Architecture

```
Cloud Run
    ↓
Cloud Logging (auto)
    ↓
Cloud Monitoring
    ↓
Dashboards + Alerts
```

### Step 1: Monitoring Dashboard

The `monitoring.tf` creates a dashboard showing:
- Backend request rate (req/s)
- Backend error rate (5xx errors)
- Backend latency (p50, p95, p99)
- Frontend request rate
- Frontend error rate
- Frontend latency
- GCS operations
- Firestore operations

Deploy via Terraform:

```bash
terraform apply -auto-approve
```

### Step 2: Access Dashboard

Open in Google Cloud Console:

```
https://console.cloud.google.com/monitoring/dashboards?project=radiant-tide-401723
```

Or use gcloud:

```bash
gcloud monitoring dashboards list --project=radiant-tide-401723
```

### Step 3: Alert Policies

Terraform creates 4 alert policies:

#### Alert 1: High Error Rate
- **Condition:** 5xx errors > 1% of requests
- **Duration:** 5 minutes
- **Action:** Email notification
- **Throttle:** Once per hour

#### Alert 2: High Latency
- **Condition:** p95 latency > 3 seconds
- **Duration:** 5 minutes
- **Action:** Email notification
- **Throttle:** Once per hour

#### Alert 3: Service Down
- **Condition:** < 1 request per minute
- **Duration:** 3 minutes
- **Action:** Email notification
- **Throttle:** Once every 10 minutes

#### Alert 4: High Memory Usage
- **Condition:** Memory > 80%
- **Duration:** 5 minutes
- **Action:** Email notification
- **Throttle:** Once per hour

### Step 4: Verify Alerts

```bash
gcloud alpha monitoring policies list --project=radiant-tide-401723

# Or in Console:
# Cloud Monitoring → Alerting → Policies
```

### Step 5: Test Alert System

Trigger a test error:

```bash
# Generate some errors
for i in {1..100}; do
  curl -s "$BACKEND_URL/invalid-endpoint" &
done
```

Check if alert fires (may take 5 minutes).

### Step 6: Customize Alert Thresholds

Edit `monitoring.tf` to adjust thresholds:

```hcl
# Change error rate threshold from 0.01 (1%) to 0.05 (5%)
threshold_value = 0.05

# Change latency threshold from 3000ms to 5000ms
threshold_value = 5000
```

Then redeploy:

```bash
terraform apply -auto-approve
```

## Part 3: Logs and Diagnostics

### View Service Logs

**Backend logs:**
```bash
gcloud run services describe dreamboard-backend \
  --region=southamerica-east1 \
  --project=radiant-tide-401723

# Stream logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=dreamboard-backend" \
  --limit=50 \
  --stream \
  --format=json
```

**Frontend logs:**
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=dreamboard-frontend" \
  --limit=50 \
  --format=json
```

### Filter Logs by Level

**Only errors:**
```bash
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" \
  --project=radiant-tide-401723 \
  --limit=20
```

**Only warnings:**
```bash
gcloud logging read "resource.type=cloud_run_revision AND severity=WARNING" \
  --project=radiant-tide-401723 \
  --limit=20
```

### Custom Metrics

The `monitoring.tf` creates a log-based metric:

- `dreamboard_api_errors` - Counts errors in logs

Access via:
```bash
gcloud logging-sinks list --project=radiant-tide-401723
```

## Part 4: Secret Rotation

### Rotate OAuth Client ID

**Step 1:** Create new OAuth Client ID in Google Cloud Console
- APIs & Services → Credentials → Create OAuth 2.0 Client

**Step 2:** Update Secret Manager

```bash
gcloud secrets versions add dreamboard-oauth-client-id \
  --data-file=- \
  --project=radiant-tide-401723 <<< "NEW_OAUTH_CLIENT_ID"
```

**Step 3:** Update Cloud Run

```bash
# No changes needed if using latest version
# Cloud Run automatically picks up latest secret
```

**Step 4:** Verify new ID works

```bash
BACKEND_URL=$(gcloud run services describe dreamboard-backend \
  --region=southamerica-east1 \
  --project=radiant-tide-401723 \
  --format='value(status.url)')

curl "$BACKEND_URL/auth/callback?code=test"
```

**Step 5:** Delete old OAuth Client ID from Google Cloud Console

### Rotate Firebase API Key

Similar to OAuth Client ID:

```bash
# Add new version
gcloud secrets versions add dreamboard-firebase-api-key \
  --data-file=- \
  --project=radiant-tide-401723 <<< "NEW_FIREBASE_API_KEY"

# View version history
gcloud secrets versions list dreamboard-firebase-api-key \
  --project=radiant-tide-401723

# Destroy old version if needed
gcloud secrets versions destroy VERSION_NUMBER \
  --secret=dreamboard-firebase-api-key \
  --project=radiant-tide-401723
```

## Part 5: Monitoring Best Practices

### Alert Fatigue Prevention

Configure notification throttling to avoid alert spam:

```hcl
alert_strategy {
  notification_rate_limit {
    period = "3600s"  # Max 1 alert per hour
  }
}
```

### Dashboard Best Practices

- ✅ Group related metrics together
- ✅ Use consistent time ranges (1h, 6h, 24h)
- ✅ Add description/documentation
- ✅ Use meaningful titles
- ✅ Set appropriate scale limits

### Monitoring SLOs

Suggested Service Level Objectives:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Availability | 99.9% | < 99.5% (5 min) |
| Latency (p95) | 2s | > 3s (5 min) |
| Error Rate | 0.1% | > 1% (5 min) |
| Memory Usage | < 70% | > 80% (5 min) |

## Part 6: Troubleshooting

### Dashboard Not Showing Data

```bash
# Verify services are running
gcloud run services list --region=southamerica-east1 --project=radiant-tide-401723

# Wait 5 minutes for first metrics to appear
# Metrics start appearing after traffic hits service
```

### Alerts Not Firing

**Check alert policy:**
```bash
gcloud alpha monitoring policies describe POLICY_ID \
  --project=radiant-tide-401723
```

**Check notification channel:**
```bash
gcloud alpha monitoring channels list --project=radiant-tide-401723

# Verify email is confirmed
# Check spam folder for confirmation email
```

**Check logs for errors:**
```bash
gcloud logging read "severity=ERROR" \
  --limit=50 \
  --project=radiant-tide-401723
```

### Secret Access Denied

```bash
# Verify service account has permissions
gcloud secrets get-iam-policy dreamboard-oauth-client-id \
  --project=radiant-tide-401723

# Should show:
# roles/secretmanager.secretAccessor: dreamboard-sa@...
```

## Files Modified

- `gke/terraform/secrets.tf` - New
- `gke/terraform/monitoring.tf` - New
- `gke/terraform/variables.tf` - Added alert_email
- `gke/PHASE-3-SETUP.md` - New (this file)

## Next Steps (Phase 4)

- [ ] Setup automatic secret rotation (GCP Secret Manager rotation)
- [ ] Add budget alerts for cost control
- [ ] Setup Slack/PagerDuty integration for alerts
- [ ] Configure log-based metrics for custom KPIs

## References

- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud Monitoring Documentation](https://cloud.google.com/monitoring/docs)
- [Cloud Run Security Best Practices](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-service)
- [Alert Policy Examples](https://cloud.google.com/monitoring/alerting/managing-policies)
