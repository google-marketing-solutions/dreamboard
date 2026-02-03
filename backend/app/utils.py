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

"""Module for generic functions."""

import os
from concurrent import futures
import shutil
import uuid
import logging
import google.cloud.logging as gcp_logging
from services import storage_service
from typing import Dict
from models.video.video_gen_models import Video
from moviepy.editor import VideoFileClip

# Attach the Cloud Logging handler to the Python root logger
logging_client = gcp_logging.Client()
logging_client.setup_logging()

# Videos


def get_videos_bucket_base_path(story_id: str):
  """
  Constructs the base GCS bucket path for storing videos.

  This path includes a unique story ID to organize video segments for
  each specific project or execution.

  Args:
      story_id: The unique identifier for the story.

  Returns:
      A string representing the base GCS URI for video storage.
      Example: "gs://your-bucket-name/dreamboard/story_id_123/videos"
  """
  return f"gs://{os.getenv("GCS_BUCKET")}/dreamboard/{story_id}/videos"


def get_videos_bucket_folder_path(story_id: str):
  """
  Gets the folder path for videos within the bucket.

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The folder path within the GCS bucket (e.g., "dreamboard/story_id/videos").
  """
  return f"dreamboard/{story_id}/videos"


def get_videos_local_base_path(story_id: str):
  """
  Gets the local base path where videos are stored in GCS.
  # Code is in code/app in PROD

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The local file system path for videos.
  """
  return f"{get_downloaded_videos_folder_path()}/{story_id}/videos"


def get_videos_server_base_path(story_id: str):
  """
  Gets the local path where videos are stored on the server.
  code/app = f"{os.getcwd()}/app/..."

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The server's file system path for videos.
  """
  return f"{get_downloaded_videos_folder_path()}/{story_id}/videos"


def get_downloaded_videos_folder_path():
  """Gets a folder path to download the videos."""
  if os.getenv("ENV") == "dev":
    return f"{os.getcwd()}/dreamboard_videos"
  else:
    return f"{os.getcwd()}/app/dreamboard_videos"


def get_videos_gcs_fuse_path(story_id: str):
  """
  Gets the appropriate video output file path, local for dev or server for prod.

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The GCS FUSE compatible path for video output, adapting for dev/prod.
  """
  # Download videos locally for dev
  if os.getenv("ENV") == "dev":
    return get_videos_local_base_path(story_id)
  else:
    return get_videos_server_base_path(story_id)


def delete_downloaded_video_folder_by_story_id(story_id: str):
  """Delete folder for downloaded videos after they have been merged"""
  parent_folder = get_downloaded_videos_folder_path()
  subfolder_to_delete = os.path.join(parent_folder, f"{story_id}")

  # Check if the subfolder exists before attempting to delete it
  if os.path.exists(subfolder_to_delete) and os.path.isdir(subfolder_to_delete):
    try:
      shutil.rmtree(subfolder_to_delete)
      print(
          f"Subfolder '{subfolder_to_delete}' and its contents deleted"
          " successfully."
      )
    except OSError as e:
      print(f"Error: {subfolder_to_delete} : {e.strerror}")
  else:
    print(
        f"Subfolder '{subfolder_to_delete}' does not exist or is not a"
        " directory."
    )


def get_videos_public_bucket_path(story_id: str):
  """
  Gets the public URL for the videos bucket (for local testing).

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The public HTTP URL to access videos in the GCS bucket.
  """
  return f"https://storage.googleapis.com/{os.getenv("GCS_BUCKET")}/dreamboard/{story_id}/videos"


def get_scene_folder_path_from_uri(uri: str):
  """
  Extracts the scene folder path from a given URI.

  Example URI: bucket/dreamboard/story_id/scene_number/veo_gen_folder/sample_0.mp4
  Returns: scene_number (in dev) or scene_number/veo_gen_folder (in prod)

  Args:
      uri: The URI of the file.

  Returns:
      The extracted scene folder path.
  """
  uri_paths = uri.split("/")
  scene_folder_path_id = uri_paths[len(uri_paths) - 2]
  scene_folder_path_number = uri_paths[len(uri_paths) - 3]
  scene_folder_path = f"{scene_folder_path_number}/{scene_folder_path_id}"

  return scene_folder_path


# Images

def get_images_bucket():
  """
  Docstring for get_images_bucket
  """
  return f"gs://{os.getenv("GCS_BUCKET")}"


def get_images_local_base_path(story_id: str):
  """
  Gets the local base path where images are stored.

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The local file system path for images.
  """
  return f"{os.getcwd()}/dreamboard/{story_id}/images"


def get_images_server_base_path(story_id: str):
  """
  Gets the server base path where images are stored.

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The server's file system path for images.
  """
  return f"{os.getcwd()}/app/dreamboard/{story_id}/images"


def get_images_gcs_fuse_path(story_id: str):
  """
  Gets the appropriate image output file path, local for dev or server for prod.

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The GCS FUSE compatible path for image output, adapting for dev/prod.
  """
  # Download images locally for dev
  if os.getenv("ENV") == "dev":
    return get_images_local_base_path(story_id)
  else:
    return get_images_server_base_path(story_id)


def get_images_bucket_base_path(story_id: str):
  """
  Gets the base GCS bucket path for images.
  Includes a unique generation ID to identify images for each execution.
  """
  return f"gs://{os.getenv("GCS_BUCKET")}/dreamboard/{story_id}/images"


def get_images_bucket_folder_path(story_id: str):
  """
  Gets the folder path for images within the bucket.

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The folder path within the GCS bucket (e.g., "dreamboard/story_id/images").
  """
  return f"dreamboard/{story_id}/images"


def get_images_public_bucket_path(story_id: str):
  """
  Gets the public URL for the images bucket (for local testing).

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The public HTTP URL to access images in the GCS bucket.
  """
  return f"https://storage.googleapis.com/{os.getenv("GCS_BUCKET")}/dreamboard/{story_id}/images"


def get_images_bucket_folder(story_id: str):
  """
  Gets the parent folder name for images within the bucket.

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The parent folder name (e.g., "dreamboard/story_id/images").
  """
  return f"dreamboard/{story_id}/images"


def get_images_bucket_path(story_id: str):
  """
  Gets the full GCS bucket path for images.
  Includes a unique generation ID to identify images for each execution.
  """
  return f"gs://{os.getenv("GCS_BUCKET")}/dreamboard/{story_id}/images"


def get_images_local_path(story_id: str):
  """
  Gets the local path where images are stored.

  Args:
      story_id: The unique identifier for the story.

  Returns:
      The local file system path for images, relative to the current working
      directory.
  """
  return f"dreamboard/{story_id}/images"


# Generic


def get_public_url_from_uri(auth_uri: str):
  """
  Gets the public URL from a GCS URI.

  Args:
      auth_uri: The GCS URI (e.g., "gs://my-bucket/path/to/file").

  Returns:
      The public HTTP URL to access the resource.
  """
  file_path = auth_uri.replace("gs://", "")
  return f"https://storage.googleapis.com/{file_path}"


def get_uri_from_public_url(public_uri: str):
  """
  Gets the GCS URI from a public URL.

  Args:
      public_uri: The public HTTP URL (e.g.,
                  "https://storage.googleapis.com/my-bucket/path/to/file").

  Returns:
      The GCS URI (e.g., "gs://my-bucket/path/to/file").
  """
  file_path = public_uri.replace("https://storage.googleapis.com/", "")
  return f"gs://{file_path}"


def get_file_name_from_uri(uri: str):
  """
  Gets the file name from a URI.

  Args:
      uri: The URI of the file.

  Returns:
      The extracted file name, or an empty string if not found.
  """
  uri_parts = uri.split("/")
  if len(uri_parts) > 1:
    # File name is the last element in the URI parts
    return f"{uri_parts[-1]}"
  return ""


def get_folder_path_from_uri(uri: str):
  """
  Gets the folder path from a URI.

  Args:
      uri: The URI of the file.

  Returns:
      The extracted folder path as a list of directory names.
  """
  folder_path = uri.replace("gs://", "")  # Remove GCS prefix
  uri_parts = folder_path.split("/")
  folder_path = uri_parts[0 : (len(uri_parts) - 2)]

  return folder_path


def get_full_path_from_uri(uri: str):
  """
  Gets the full path from a URI without the GCS prefix.

  Args:
      uri: The GCS URI of the file.

  Returns:
      The full path of the file within the bucket.
  """
  full_path = uri.replace("gs://", "")  # Remove GCS prefix

  return full_path


def get_signed_uri_from_gcs_uri(uri: str):
  """Converts a full GCS URI into a temporary signed URL.

  This is a convenience function that takes a GCS URI (e.g., 'gs://...'),
  extracts the blob name, and then generates a v4 signed URL for it.

  Args:
      uri (str): The complete GCS URI for the desired object.

  Returns:
      str: A temporary, publicly accessible signed URL to download the object.
  """
  if os.getenv("ENV") == "dev":
    url = get_mtls_uri_from_gcs_uri(uri)
  else:
    blob_name = get_blob_name_from_gcs_uri(uri)
    url = storage_service.storage_service.generate_signed_url(blob_name)
  return url


def get_mtls_uri_from_gcs_uri(uri: str):
  """
  Converts a GCS URI back to a sign mtls URI.

  Args:
      uri: The GCS URI (e.g., "gs://my-bucket/path/to/file").

  Returns:
      The signed mtls URI (e.g.,
           "https://storage.mtls.cloud.google.com/my-bucket/path/to/file").
  """
  return uri.replace("gs://", "https://storage.mtls.cloud.google.com/")


def get_gcs_uri_from_signed_uri(uri: str):
  """
  Converts a signed URI back to a GCS URI.

  Args:
      uri: The signed URI (e.g.,
           "https://storage.mtls.cloud.google.com/my-bucket/path/to/file").

  Returns:
      The GCS URI (e.g., "gs://my-bucket/path/to/file").
  """
  return uri.replace("https://storage.mtls.cloud.google.com/", "gs://")


def get_blob_name_from_gcs_uri(gcs_uri: str) -> str:
  """Extracts the blob name from a GCS URI.

  Strips the bucket prefix from the given URI string, returning only the
  object's path. Relies on the 'GCS_BUCKET' environment variable.

  Args:
      gcs_uri (str): The full GCS URI (e.g., 'gs://bucket/object/name.txt').

  Returns:
      str: The name of the blob (e.g., 'object/name.txt').
  """
  return gcs_uri.replace(f"gs://{os.getenv("GCS_BUCKET")}/", "")


def execute_tasks_in_parallel(tasks: list[any]) -> None:
  """
  Executes a list of tasks in parallel using a thread pool.

  Args:
      tasks: A list of callable tasks to be executed.

  Returns:
      A list of results from the executed tasks.
  """
  results = []
  with futures.ThreadPoolExecutor() as executor:
    running_tasks = [executor.submit(task) for task in tasks]
    for running_task in running_tasks:
      results.append(running_task.result())
  return results


def update_signed_uris_in_story(story_data: Dict) -> Dict:
  """
  Generates new signed URIs for all videos and images in a story.
  """

  def _update_list(media_list: list):
    """Helper to update signed URIs in a list of media items."""
    for media_item in media_list:
      gcs_uri = media_item.get("gcsUri")
      if gcs_uri:
        media_item["signedUri"] = get_signed_uri_from_gcs_uri(gcs_uri)

  # Update generated video URIs
  _update_list(story_data.get("generatedVideos", []))

  scenes = story_data.get("scenes", [])
  for scene in scenes:
    # Update image URIs
    image_generation_settings = scene.get("imageGenerationSettings", {})
    _update_list(image_generation_settings.get("generatedImages", []))
    selected_image = image_generation_settings.get("selectedImageForVideo", {})
    if selected_image.get("gcsUri"):
      selected_image["signedUri"] = get_signed_uri_from_gcs_uri(
          selected_image.get("gcsUri")
      )
    _update_list(image_generation_settings.get("referenceImages", []))

    # Update video URIs
    video_generation_settings = scene.get("videoGenerationSettings", {})
    _update_list(video_generation_settings.get("generatedVideos", []))
    selected_video = video_generation_settings.get("selectedVideo", {})
    if selected_video.get("gcsUri"):
      selected_video["signedUri"] = get_signed_uri_from_gcs_uri(
          selected_video.get("gcsUri")
      )

  return story_data


def get_dev_paths(story_id: str, gcs_fuse_path: str):
  """
  Gets local file paths in the development environment.

  Args:
      story_id: The unique identifier for the story.
      gcs_fuse_path: The GCS FUSE path of the file.

  Returns:
      A tuple containing the scene folder, file folder, and full
      file path.
  """
  # Get URI; public URI is used for testing in dev
  base_path = get_videos_gcs_fuse_path(story_id)
  scene_folder = get_scene_folder_path_from_uri(uri=gcs_fuse_path)
  file_folder = f"{base_path}/{scene_folder}"
  file_name = get_file_name_from_uri(gcs_fuse_path)
  file_full_path = f"{file_folder}/{file_name}"

  return scene_folder, file_folder, file_full_path


def download_videos(story_id: str, videos: list[Video]):
  """
  Downloads videos from GCS to a local folder (for dev environment).

  Args:
      story_id: The unique identifier for the story.
      videos: A list of `Video` objects, each representing a video
              to be downloaded.
  """
  for video in videos:
    _, output_folder, output_full_path = get_dev_paths(
        story_id, video.gcs_fuse_path
    )
    # Download only for local testing if folder doesn't exist
    if not os.path.exists(output_folder):
      os.makedirs(output_folder)
    blob_name = storage_service.storage_service.download_file_to_server(
        output_full_path, video.gcs_uri
    )
    if not blob_name:
      logging.warning(f"{video.gcs_fuse_path} does not exist in GCS.")
    video.gcs_fuse_path = output_full_path


def backfill_missing_fields(stories: dict) -> None:
  """Backfills story fields for videos and images for backwards compatibility.

  This function iterates through a dictionary of stories and their scenes.
  For each scene, it checks for any missing fields in generated videos / images
  as well a selected video / image.

  Args:
    stories: A dictionary containing the story data to be processed.

  Returns:
    None. The dictionary is modified in place.
  """

  def _backfill_fields_list(story_id: str, type: str, media_list: list[any]):
    """Helper to add any missing field in a story."""
    for media_item in media_list:
      # Check for missing id
      if not hasattr(media_item, "id"):
        media_item["id"] = uuid.uuid4()
      # Check for missing duration
      if type == "video":
        if not hasattr(media_item, "duration"):
          # for videos saved before this change set duration to 0
          media_item["duration"] = 0

  for story in stories:
    scenes = story.get("scenes", [])
    for scene in scenes:
      # Backfill missing fields for videos
      video_generation_settings = scene.get("videoGenerationSettings", {})
      _backfill_fields_list(
          story["id"],
          "video",
          video_generation_settings.get("generatedVideos", []),
      )
      selected_video = video_generation_settings.get("selectedVideo", {})
      if selected_video and not hasattr(selected_video, "id"):
        selected_video["id"] = uuid.uuid4()

      # Backfill missing fields for images
      image_generation_settings = scene.get("imageGenerationSettings", {})
      _backfill_fields_list(
          story["id"],
          "image",
          image_generation_settings.get("generatedImages", []),
      )
      selected_image = image_generation_settings.get(
          "selectedImageForVideo", {}
      )
      if selected_image and not hasattr(selected_image, "id"):
        selected_image["id"] = uuid.uuid4()
      _backfill_fields_list(
          story["id"],
          "image",
          image_generation_settings.get("referenceImages", []),
      )

def find_element_by_id(id: str, elements: list[any]):
    """"""
    for element in elements:
      if str(element.id) == id:
        return element

    return None

def find_element_by_name(name: str, elements: list[any]):
    """"""
    for element in elements:
      if element.name == name:
        return element

    return None