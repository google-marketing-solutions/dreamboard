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

"""
Application Router that registers all the application endpoints.

This module serves as the main entry point for API routing, consolidating
routers from various functional areas (video, image, and text generation)
into a single, unified API.
"""
from dotenv import load_dotenv
from fastapi import routing

from api.endpoints import (
    image_gen_routes,
    text_gen_routes,
    video_gen_routes,
    file_uploader_routes,
)

load_dotenv()

# Create the main API router for the application.
api_router = routing.APIRouter()

# Include specific routers for different functionalities.
# Each router is tagged for better documentation and organization in
# the OpenAPI (Swagger UI) interface.
api_router.include_router(
    video_gen_routes.video_gen_router, tags=["video_gen_routes"]
)
api_router.include_router(
    image_gen_routes.image_gen_router, tags=["image_gen_routes"]
)
api_router.include_router(
    text_gen_routes.text_gen_router, tags=["text_gen_routes"]
)

api_router.include_router(
    file_uploader_routes.file_uploader_router, tags=["file_uploader_routes"]
)
