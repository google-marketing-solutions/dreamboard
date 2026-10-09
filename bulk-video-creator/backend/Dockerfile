# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Bulk Video Creator backend image.
# Build from the repository root (the image needs backend/app and this folder):
#   bulk-video-creator/backend/deploy_backend.sh

FROM python:3.13-slim

ENV PYTHONUNBUFFERED=True

WORKDIR /code

# ffmpeg is required by the core (moviepy is imported by backend/app/utils.py).
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Same relative layout as the repo so `-r ../../backend/requirements.txt` works.
COPY backend/requirements.txt /code/backend/requirements.txt
COPY bulk-video-creator/backend/requirements.txt /code/bulk-video-creator/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /code/bulk-video-creator/backend/requirements.txt

COPY backend/app /code/app
COPY bulk-video-creator/backend/bulk_app /code/bulk-video-creator/backend/bulk_app

# Do not ship local env files; configuration comes from Cloud Run env vars.
RUN rm -f /code/app/.env

ENV DREAMBOARD_CORE_PATH=/code/app
ENV PYTHONPATH=/code/bulk-video-creator/backend

RUN useradd --create-home --uid 10001 appuser
USER appuser

# 0.0.0.0 is required inside the container so Cloud Run can reach it.
CMD ["sh", "-c", "uvicorn bulk_app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
