# Overview

This module deploys **Dreamboard** to a GKE cluster using an opinionated Terraform module and a sample Kubernetes Deployment with an external Load Balancer. 

<!-- BEGIN TOC -->
- [Pre-requisites](#pre-requisites)
- [IAM and environment variables](#iam-and-environment-variables)
- [Deploying GKE Application](#deploy-infrastructure-via-terraform)
- [Next Steps](#next-steps)
- [Requirements](#requirements)
- [Providers](#providers)
- [Modules](#modules)
- [Resources](#resources)
- [Inputs](#inputs)
- [Outputs](#outputs)
<!-- END TOC -->

## Pre-requisites

- Create a bucket that will store the state of the Terraform deployment. This only needs to happen once per project. Once the bucket is created, update the file ```gke/terraform/backend.tf``` with the new bucket name to store TF state.
- Create a Service Account with the following permissions that will perform Terraform actions on the user's behalf.
- Ensure you have logged in to your Google account via CLI and have the project and region configured properly:
  - ```bash
      # Authentication
      gcloud auth login --update-adc
      # Set default GCP project ID
      gcloud config set project <PROJECT_ID>
      # Set default location
      gcloud config set compute/region <REGION>
    ```

## IAM and environment variables
IAM bindings support the usual syntax. They can be combined as long as there is no duplication of keys:
- storage.admin -- For mounting GCS buckets
- aiplatform.user -- Access to Google's AI models (gemini, veo, imagen)
- logging.logWriter -- Write logs to Cloud Logging
- artifactregistry.reader -- Access to pull images from Docker repository
- container.defaultNodeServiceAccount -- Run applications on GKE compute nodes with a custom SA
- iam.serviceAccountTokenCreator -- Create and sign service account tokens/blobs

The Kubernetes deployment takes in a few enviroment variables to be used by Dreamboard:
- PROJECT_ID
- LOCATION
- GCS_BUCKET

## Deploy Infrastructure via Terraform

Configure the arguments for the Terraform module.

Example using a tfvars file:
```bash
export PROJECT=$(gcloud config get project)
export REGION=$(gcloud config get compute/region)

pushd gke/terraform/
cat > terraform.tfvars << EOF
project_id      = "${PROJECT}"
region          = "${REGION}"
EOF
popd
```

Apply the resources to your project:
```bash
pushd gke/terraform/
terraform init
terraform apply # Review plan and approve
```

After provisioning the resources, the script will output the necessary values for the following deployment steps. 
```bash
export REPO=$(terraform output --raw repo_address)
export IP=$(terraform output --raw ip_address)
export CLUSTER=$(terraform output --raw cluster_name)
export BUCKET=$(terraform output --raw bucket_name)
popd
```

## Build Docker Images

**Backend**
```bash
pushd backend/
gcloud builds submit --region=$REGION --tag ${REPO}/dreamboard-backend .
popd
```

**Frontend**

Update the frontend environment files with the cluster's static IP address prior to building the image.

```
pushd frontend/dreamboard/
BACKEND_URL="http://${IP}:8000"

pushd src/environments/
sed "s@{BACKEND_CLOUD_RUN_SERVICE_URL}@$BACKEND_URL@g;" environment-template.ts > environment.ts
sed "s@{BACKEND_CLOUD_RUN_SERVICE_URL}@$BACKEND_URL@g;" environment-template.ts > environment.development.ts
popd

gcloud builds submit --region=$REGION --tag ${REPO}/dreamboard-frontend .
popd
```

## Deploy GKE Application

Before applying the deployment to the cluster, make sure you have updated the following values in ```gke/manifests/dreamboard-app.yaml``` according to the Terraform outputs from the previous section:
* spec.template.spec.containers -> frontend.image (update artifact registry address)
* spec.template.spec.containers -> backend.image (update artifact registry address)
* spec.template.spec.containers -> backend.env (update environment variable values)
* spec.template.spec.volumes -> csi.driver.bucketName (update with your bucket name)
* Under the Service resource, update both IP Address attributes
* Under the ServiceAccount resource, update the annotation to match your GCP Service Account email

```
pushd gke/manifests/
gcloud container clusters get-credentials $CLUSTER --region $REGION --project $PROJECT
kubectl apply -f dreamboard-app.yaml
popd
```

## Next Steps

This reference implementation is an example for getting started with Dreamboard using an alternative deployment method for customers looking to use the solution with additional and more granular control over the infrastructure.

It is recommended to review your organization's security posture & governance policies and adjust the infrastructure and deployment accordingly to ensure it adheres to these standards. 

## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.0 |
| <a name="requirement_google"></a> [google](#requirement\_google) | >= 6.0, < 7.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_google"></a> [google](#provider\_google) | 6.45.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [google_artifact_registry_repository.docker](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository) | resource |
| [google_compute_address.static_address](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_address) | resource |
| [google_compute_network.vpc](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network) | resource |
| [google_compute_subnetwork.subnet](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork) | resource |
| [google_container_cluster.dreamboard-cluster](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster) | resource |
| [google_project_iam_member.bindings](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_iam_member) | resource |
| [google_project_service.apis](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/project_service) | resource |
| [google_service_account.dreamboard-sa](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account) | resource |
| [google_service_account_iam_member.gke-sa-iam](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_account_iam_member) | resource |
| [google_storage_bucket.bucket](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket) | resource |
| [google_project.project](https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/project) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_project_id"></a> [project\_id](#input\_project\_id) | GCP Project ID. | `string` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | GCP location for the regional deployment. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_bucket_name"></a> [bucket\_name](#output\_bucket\_name) | GCS Bucket |
| <a name="output_cluster_name"></a> [cluster\_name](#output\_cluster\_name) | GKE Cluster |
| <a name="output_ip_address"></a> [ip\_address](#output\_ip\_address) | Static IP Address |
| <a name="output_repo_address"></a> [repo\_address](#output\_repo\_address) | n/a |
| <a name="output_service_account"></a> [service\_account](#output\_service\_account) | n/a |
