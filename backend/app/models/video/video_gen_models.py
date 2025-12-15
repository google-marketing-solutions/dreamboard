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
Modules to define business logic modules.

This file contains data models (dataclasses) used across the application
to represent entities related to video generation, including individual
video assets and structured responses from video generation APIs.
"""

from dataclasses import dataclass, field


@dataclass
class Video:
  """
  Represents a single video asset within a generation response.

  Attributes:
      name: The name of the video file.
      gcs_uri: The Google Cloud Storage (GCS) URI where the video is stored.
      signed_uri: A pre-signed URL for temporary public access to the video.
      gcs_fuse_path: The FUSE path if the GCS bucket is mounted locally.
      mime_type: The MIME type of the video (e.g., 'video/mp4').
      frames_uris: An optional list of GCS URIs for individual frames
                   that comprise the video. Defaults to an empty list.
  """

  id: str
  name: str
  gcs_uri: str
  signed_uri: str
  gcs_fuse_path: str
  mime_type: str
  duration: float
  frames_uris: list[str] | None = field(default_factory=list)
