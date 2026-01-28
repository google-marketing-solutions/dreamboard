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
Image Generation data classes.

This file contains data models (dataclasses) used across the application
to represent various entities related to image generation and file handling,
particularly in the context of the Imagen API.
"""

import enum
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class Image:
  """
  Represents a single image, typically as a response from an Imagen API
  generation or as an input reference.

  Attributes:
      id: A unique identifier for the image.
      name: An optional name for the image.
      gcs_uri: The Google Cloud Storage (GCS) URI where the image is stored.
      mime_type: The MIME type of the image (e.g., 'image/jpeg', 'image/png').
      signed_uri: A pre-signed URL for temporary public access to the GCS URI.
      gcs_fuse_path: The FUSE path if the GCS bucket is mounted locally.
      image_bytes: The raw bytes of the image, if available in memory.
  """

  id: str
  name: str
  gcs_uri: str
  mime_type: str
  signed_uri: str
  gcs_fuse_path: str
  image_bytes: Optional[bytes] | None = None


class IMAGE_REFERENCE_TYPES(enum.Enum):
  """
  Defines the different types of reference images supported by the Imagen API
  for image editing operations.
  """

  RAW = "raw"
  MASK = "mask"
  SUBJECT = "subject"
  STYLE = "style"
  CONTROLLED = "controlled"


@dataclass
class ImageReference(Image):
  """
  Extends the `Image` class to include attributes specific to reference images
  used in Imagen API's image editing capabilities.

  Attributes:
      reference_id: A unique identifier for this specific reference.
      reference_type: The broad category of the reference (e.g., "raw",
                      "mask"). Uses `IMAGE_REFERENCE_TYPES` values.
      reference_subtype: A more specific classification within the type
                         (e.g., "Person", "Animal" for 'subject' type).
      description: A text description providing more context for the reference
                   (e.g., for 'style' or 'subject' references).
      mask_mode: For 'mask' references, specifies how the mask should be
                 interpreted (e.g., "apply", "ignore").
      mask_dilation: For 'mask' references, an optional value to expand or
                     contract the mask area.
      segmentation_classes: For 'mask' references, a list of integer IDs
                            representing object classes to be masked.
      enable_control_image_computation: For 'controlled' references, a flag
                                        to enable specific control image
                                        processing.
  """

  # Shared attributes.
  reference_id: Optional[int] = None
  reference_type: Optional[str] | None = None

  # Partially shared attributes.
  # Secondary flag (e.g. Subject Person, Subject animal).
  reference_subtype: Optional[str] | None = None
  description: Optional[str] | None = None

  # Mask Reference specific attributes.
  mask_mode: Optional[str] | None = None
  mask_dilation: Optional[float] | None = None
  segmentation_classes: Optional[List[int]] = None

  # Control Reference specific attributes.
  enable_control_image_computation: bool = False


@dataclass
class ImageGenerationResponse:
  """
  Represents the structured response received after an image generation or
  editing request to the Imagen API.

  Attributes:
      scene_id: The ID of the scene.
      done: A boolean flag indicating if the operation is complete.
      operation_name: The name of the asynchronous operation (e.g., for
                      polling its status).
      execution_message: Any message or status detail about the execution.
      images: A list of `Image` objects representing the generated images.
  """

  scene_id: str
  done: bool
  operation_name: str
  execution_message: str
  images: list[Image]
