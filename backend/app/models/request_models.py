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
Module for the Data models used by the APIRouter to define the request
parameters.

This file defines Pydantic models that validate and structure incoming request
data for the API, particularly for image generation and video scene management.
"""

from typing import List, Optional
from dataclasses import dataclass
from google.genai import types
from pydantic import BaseModel
from models.image import image_gen_models


class CreativeDirection(BaseModel):
  """
  Sets the creative direction parameters for image generation in a scene.

  These parameters influence how the Imagen model generates or edits images.

  Attributes:
      aspect_ratio: The desired aspect ratio of the output image (e.g., "1:1",
                    "16:9"). Defaults to "1:1".
      model: The specific Imagen model to use for generation
             (e.g., "imagen-3.0-generate-002").
      number_of_images: The number of images to generate for this scene.
                        Defaults to 1.
      output_mime_type: The desired MIME type for the output images
                        (e.g., "image/png", "image/jpeg"). Defaults to
                        "image/png".
      person_generation: Controls the generation of human figures
                         (e.g., "allow_adult", "block_all").
      safety_filter_level: The strictness of the safety filter applied
                           to generated content. Defaults to
                           `types.SafetyFilterLevel.BLOCK_ONLY_HIGH`.
      output_gcs_uri: The Google Cloud Storage (GCS) URI where output
                      images should be stored.
      language: The language of the image prompt. Defaults to
                `types.ImagePromptLanguage.en`.
      output_compression_quality: The compression quality for output images,
                                  relevant for formats like JPEG (0-100).
                                  Defaults to 75.
      negative_prompt: An optional prompt specifying elements to avoid in
                       the generated image.
      enhance_prompt: A boolean indicating whether to automatically enhance
                      the input prompt for better results. Defaults to `True`.
      seed: An optional integer seed for reproducible image generation.
      # add_watermark: bool | None = False # Currently not used
  """

  aspect_ratio: str | None = "1:1"
  model: str = "imagen-4.0-generate-001"
  number_of_images: int | None = 1
  output_mime_type: Optional[str] | None = "image/png"
  person_generation: str | None = "allow_adult"
  safety_filter_level: types.SafetyFilterLevel | None = (
      types.SafetyFilterLevel.BLOCK_ONLY_HIGH
  )
  output_gcs_uri: Optional[str] = None
  language: types.ImagePromptLanguage | None = types.ImagePromptLanguage.en
  output_compression_quality: int | None = 75
  negative_prompt: str | None = None
  enhance_prompt: bool | None = True
  seed: int | None = None
  # TODO: Add watermark feature in the future.
  # add_watermark: bool | None = False


class Scene(BaseModel):
  """
  Represents a single scene within a larger content generation process,
  encompassing details for image generation, video prompting, and related
  metadata.

  Attributes:
      scene_num: The sequential number of the scene.
      img_prompt: The text prompt for image generation.
      image_uri: A list of URIs for generated images associated with this
                 scene. Defaults to an empty list.
      image_content_type: The MIME type of the image content. Defaults to
                          "image/png".
      scene_id: A list of unique identifiers for generated images within
                this scene. Defaults to an empty list.
      creative_dir: An optional `CreativeDirection` object specifying image
                    generation parameters.
      video_prompt: An optional text prompt for video generation (if
                    applicable to the scene type).
      reference_images: An optional list of `ImageReference` objects used
                        for image editing operations.
      use_reference_image_for_image: A flag indicating if reference images
                                     should be used for image operations.
                                     Defaults to `False`.
      edit_mode: The editing mode to use when `use_reference_image_for_image`
                 is true (e.g., "EDIT_MODE_DEFAULT").
      scene_type: An integer indicating the type of scene (1 for IMAGE,
                  2 for VIDEO). Defaults to 1.
  """

  scene_num: int
  img_prompt: str
  image_uri: Optional[List[str]] = []
  image_content_type: Optional[str] | None = "image/png"
  # TODO: add reference image when genai code is available.
  # reference_image_uri: Optional[str] = ""
  scene_id: Optional[List[str]] = []
  creative_dir: Optional[CreativeDirection] = None
  video_prompt: Optional[str] = ""
  reference_images: Optional[List[image_gen_models.ImageReference]] = None
  use_reference_image_for_image: Optional[bool] | None = False
  edit_mode: Optional[str] | None = "EDIT_MODE_DEFAULT"

  # TODO: Create ENUM for this
  scene_type: Optional[int] = 1  # IMAGE - 1, VIDEO - 2


class SceneSegments:
  """
  A collection manager for multiple `Scene` objects, allowing for
  addition, removal, and renumbering of scenes.
  """

  scenes: List[Scene]

  def __init__(self):
    """
    Initializes a new `SceneSegments` instance with an empty list of
    scenes.
    """
    self.scenes = []

  def add_image_segment(
      self,
      scene_num: int,
      img_prompt: str,
      scene_type: int,
      creative_dir: CreativeDirection = None,
      reference_images: List[image_gen_models.ImageReference] = None,
      use_reference_image_for_image: bool = False,
      edit_mode: str = None,
  ):
    """
    Adds an image scene to the collection.

    Args:
        scene_num: The scene number for the new scene.
        img_prompt: The image prompt for the new scene.
        scene_type: The type of the scene (e.g., IMAGE, VIDEO).
        creative_dir: Optional creative direction for image generation.
        reference_images: Optional list of reference images for editing.
        use_reference_image_for_image: Flag to use reference images.
        edit_mode: The edit mode for image operations.
    """
    self.scenes.append(
        Scene(
            scene_num=scene_num,
            img_prompt=img_prompt,
            creative_dir=creative_dir,
            scene_type=scene_type,
            reference_images=reference_images,
            use_reference_image_for_image=use_reference_image_for_image,
            edit_mode=edit_mode,
        )
    )

  def remove_image_segment(self, scene_num: int):
    """
    Removes a scene by its scene number and renumbers the remaining scenes.

    Args:
        scene_num: The number of the scene to remove.
    """
    if 0 <= scene_num < len(self.scenes):
      del self.scenes[scene_num]

    self.renumber_scenes()

  def renumber_scenes(self):
    """
    Updates the `scene_num` attribute for each scene in the list to
    maintain sequential order after additions or removals.
    """
    for i, scene in enumerate(self.scenes):
      scene.scene_num = i

  def get_scenes(self) -> List[Scene]:
    """
    Returns the complete list of `Scene` objects managed by this instance.
    """
    return self.scenes

  def get_scene(self, scene_id: str):
    """
    Returns a single scene given its identifier (index).

    Note: The parameter name `scene_id` suggests an ID, but it's used
    as an index in the current implementation. Consider clarifying or
    adjusting.

    Args:
        scene_id: The index of the scene to retrieve.
    """
    return self.scenes[scene_id]


class SceneSegmentRequest(BaseModel):
  """
  Represents a request for a specific scene segment, typically used for
  requesting information or actions related to a part of a larger scene.

  Attributes:
      scene_segment_num: The number identifying the specific scene segment.
      scene_description: A description of the content or purpose of the
                         scene segment.
      image_prompt: The image generation prompt associated with this segment.
      image_uri: The URI of an image relevant to this segment.
      creative_dir: An optional dictionary containing creative direction
                    parameters for this segment.
  """

  scene_segment_num: int
  scene_description: str
  image_prompt: str
  image_uri: str
  creative_dir: dict | None  # for now an optional dict


class StorageRequest(BaseModel):
  """
  Represents a request for the Storage Service to handle file operations.

  Attributes:
      bucket: The name of the Google Cloud Storage bucket.
      folderPath: The path to the folder within the bucket.
      output_file_name: The desired name for the output file.
  """

  bucket: str
  folderPath: str
  output_file_name: str


@dataclass
class UploadedFile:
  """
  Represents a file that has been uploaded to Google Cloud Storage.

  Attributes:
      name: The name of the uploaded file.
      gcs_uri: The Google Cloud Storage (GCS) URI of the uploaded file.
      signed_uri: A pre-signed URL for temporary public access to the file.
      gcs_fuse_path: The FUSE path if the GCS bucket is mounted locally.
      mime_type: The MIME type of the uploaded file (e.g., 'application/pdf').
  """

  name: str
  gcs_uri: str
  signed_uri: str
  gcs_fuse_path: str
  mime_type: str
