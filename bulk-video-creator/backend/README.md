# Bulk Video Creator — backend

Generates **one Veo video per row** of a Google Sheet. Each row's image is
used as the seed for the video.

This is the backend of Bulk Video Creator (the frontend will live in
`bulk-video-creator/frontend/`). It runs on top of the DreamBoard backend
core of this repository (`backend/app`), which it uses only through
[`core_adapter.py`](bulk_app/core_adapter.py). It does not change
any core file.

## How it works

1. `POST /api/bulk_video_generation/bulk_upload_sheet` with `{"sheet_url": ...}`.
   This reads the first tab of the sheet. For each row it downloads
   `image_url` and copies it to GCS, then appends `status` and `logs` to
   the sheet. It returns a `bulk_id`.
2. `POST /api/bulk_video_generation/generate_videos_from_bulk/{bulk_id}`.
   This generates one video per row that has an image. It writes `status`,
   `logs` and `video_output` back to the sheet.

GCS layout:

```
gs://{GCS_BUCKET}/{BULK_GCS_PREFIX}/{bulk_id}/row_N/
  metadata.json
  images_seeds/{image}, image_metadata.json
  video_output/
```

### Sheet format

The first row holds the headers. These columns are required:

| Column | Content |
|---|---|
| `image_url` | Public **https** URL of a JPEG, PNG, WEBP or GIF image |
| `image_metadata` | Free text or JSON, stored next to the image |
| `video_output` | Filled in by the bulk with the video URL |
| `status` | Filled in by the bulk: `READY_TO_GENERATE`, `SKIPPED`, `ERROR`, `VIDEO_GENERATED` |
| `logs` | Filled in by the bulk |

Columns beyond `Z` are ignored. Every row uses the same fixed prompt, defined
in [`video_generator.py`](bulk_app/services/video_generator.py).

## Configuration

Copy [`.env-template`](.env-template) to `bulk-video-creator/backend/.env` and fill it in. Do not
commit `.env`.

| Variable | Default | Description |
|---|---|---|
| `PROJECT_ID`, `GCS_BUCKET`, `LOCATION` | — | Same as the core |
| `BULK_VIDEO_MODEL` | `veo-3.1-generate-001` | Veo model |
| `BULK_VIDEO_DURATION_SECS` | `4` | 4, 6 or 8 seconds |
| `BULK_MAX_ROWS` | `100` | Max rows per sheet |
| `BULK_GCS_PREFIX` | `bulk-video-creator` | Root folder of the bulks in the bucket |
| `BULK_MAX_IMAGE_BYTES` | `20971520` | Max size of each image |
| `BULK_CORS_ORIGINS` | empty | Origins allowed for browser calls |

### Sheets API permissions

You need to:

- enable the **Google Sheets API** in the project;
- give the identity that runs the service **edit access** to the sheet.

**Locally**, use Application Default Credentials with the Sheets scope:

```sh
gcloud auth application-default login \
  --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets
```

> gcloud warns that the `spreadsheets` scope "will be blocked soon for the
> default client ID". The more robust alternative is to impersonate a
> service account that has access to the sheet:
>
> ```sh
> gcloud auth application-default login \
>   --impersonate-service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com \
>   --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets
> ```
>
> Your user needs `roles/iam.serviceAccountTokenCreator` on that account.

**In Cloud Run**, share the sheet (as Editor) with the service account email.

## Running locally

From the `bulk-video-creator/backend/` folder:

```sh
python3.13 -m venv .venv          # or: uv venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m bulk_app.main
```

Swagger is at http://127.0.0.1:8000/docs.

Tests (no credentials needed):

```sh
.venv/bin/python -m pytest
```

## Notebook

[`notebooks/Bulk_Video_Creator.ipynb`](notebooks/Bulk_Video_Creator.ipynb) runs
the same two phases step by step (Jupyter or Colab), without the API. It reads
`PROJECT_ID`, `GCS_BUCKET`, `LOCATION`, `BULK_GCS_PREFIX`, `BULK_VIDEO_MODEL`,
`BULK_VIDEO_DURATION_SECS`, `BULK_VIDEO_PROMPT` and `SHEET_URL` from the
environment. Clear all outputs before committing it.

## Deployment

Run [`deploy_backend.sh`](deploy_backend.sh) (from any folder, with `gcloud`
logged in and the project selected):

```sh
bulk-video-creator/backend/deploy_backend.sh
```

It enables the APIs (Cloud Run, Artifact Registry, Cloud Build, Vertex AI,
Sheets), creates the `bulk-video-creator-sa` service account, the bucket and
the Artifact Registry repository, grants the roles, builds the image with
Cloud Build and deploys `bulk-video-creator-backend` to Cloud Run with
`--no-allow-unauthenticated`. No local Docker is needed.

The image is built from the **repository root**, because it needs
`backend/app` and `bulk-video-creator/backend/`. The upload excludes `.env`
files and virtualenvs ([`build.gcloudignore`](build.gcloudignore)).

After deploying, share each Google Sheet (as Editor) with the service
account email printed at the end.

## Security

- Sheet URL: only `https://docs.google.com/spreadsheets/d/...` (exact host match).
- `image_url` is downloaded with SSRF protections:
  - https only;
  - public IPs only (blocks localhost, private networks and the metadata server);
  - redirects are re-validated;
  - size limit;
  - content type is checked by magic bytes;
  - object names are sanitized.
- Values are written to the sheet as `RAW`, never as formulas.
- Errors return a generic message with an `error_id`; the detail is only in the logs.
- **No authentication or rate limiting of its own**, same as the rest of
  the backend. It must run behind the NodeJS BFF or Cloud Run IAM. Each
  call can trigger paid Veo generations.
- `.env` files and virtualenvs are excluded from the Cloud Build upload
  (`build.gcloudignore`) and the core `.env` is removed from the image.
