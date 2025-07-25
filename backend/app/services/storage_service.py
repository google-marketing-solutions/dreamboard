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

"""Service that interacts with the Google Cloud Storage API."""

import base64
import datetime
import logging
import os

import google.auth
from core.config import settings
from google.api_core.client_info import ClientInfo
from google.cloud import storage


class StorageService:
  """Service that interacts with the Google Cloud Storage API."""

  # Cloud Storage Configuration
  storage_client: storage.client.Client
  bucket: storage.bucket.Bucket
  storage_folder_name: str | None = (
      "image_folder/"  # Optional folder within the bucket
  )
  image_mime_type: str = "image/png"

  def __init__(self, storage_folder_name: str | None = None):
    """
    Initializes the StorageService.

    Args:
        storage_folder_name: An optional folder name within the GCS bucket.
    """
    self.storage_project = os.getenv("PROJECT_ID")
    self.bucket_name = os.getenv("GCS_BUCKET")
    self.storage_folder_name = storage_folder_name

    # Create Storage client
    self.storage_client = storage.Client(
        project=self.storage_project, client_info=ClientInfo(user_agent=settings.USER_AGENT)
    )
    self.bucket = self.storage_client.bucket(self.bucket_name)

  def save_image_to_folder(
      self, blob_name: str, image_data: str, mime_type: str
  ):
    """
    Saves an image to a specified folder in a GCS bucket.

    Args:
        blob_name: The name of the blob (file) in the bucket.
        image_data: The image data to upload.
        mime_type: The MIME type of the image (e.g., "image/png").

    Returns:
        The public URL of the uploaded image.
    """
    blob = self.bucket.blob(f"{self.storage_folder_name}/{blob_name}")

    # Upload image.
    blob.upload_from_file(image_data, content_type=mime_type)

    return blob.public_url

  def get_blob(self, uri: str) -> any:
    """
    Returns a GCS blob object from its full URI.

    Args:
        uri: The full URI of the GCS blob
        (e.g., "gs://my-bucket/path/to/file").

    Returns:
        The GCS blob object.
    """
    bucket, path = uri.replace("gs://", "").split("/", 1)
    return self.storage_client.get_bucket(bucket).get_blob(path)

  def download_file(self, uri: str) -> str:
    """
    Downloads a file from GCS and returns its content as a base64 string.

    Args:
        uri: The URI of the file to download.

    Returns:
        A dictionary containing the image name, base64 encoded image data,
        and content type, or an empty string if the URI is not found.
    """
    blob = self.get_blob(uri)
    if blob:
      image_name = uri.split("/")[-1]
      content_type = (
          blob.content_type if blob.content_type else "application/octet-stream"
      )
      image_data = blob.download_as_bytes()

      image_base64 = base64.b64encode(image_data).decode("utf-8")

      return {
          "image_name": f"{image_name}",
          "image_data": f"{image_base64}",
          "content_type": f"{content_type}",
      }
    else:
      logging.error("download_file - URI %s not found", uri)
      return ""

  # TODO: remove if not needed - downloads directly to server
  def download_file_to_server(self, output_path: str, uri: str) -> str:
    """
    Writes a file from GCS to a specified local path on the server.

    Args:
        output_path: The local path where the file will be saved.
        uri: The URI of the file to download from GCS.

    Returns:
        The name of the downloaded blob, or an empty string if not found.
    """
    with open(output_path, "wb") as f:
      blob = self.get_blob(uri)
      if blob:
        f.write(blob.download_as_string(client=None))
        print(f"File {uri} downloaded to path {output_path}")
        return blob.name
      else:
        logging.error("download_file - URI %s not found", uri)
        return ""

  def upload_from_filename(self, source_file_name, destination_blob_name):
    """
    Uploads a file from a local path to GCS.

    Args:
        source_file_name: The path to the local file to upload.
        destination_blob_name: The desired name of the blob in GCS.
    """
    blob = self.bucket.blob(destination_blob_name)

    # Optional: set a generation-match precondition to avoid potential race
    # conditions and data corruptions. The request to upload is aborted if
    # the object's generation number does not match your precondition. For a
    # destination object that does not yet exist, set the
    # if_generation_match precondition to 0. If the destination object
    # already exists in your bucket, set instead a generation-match
    # precondition using its generation number.
    # generation_match_precondition = 0
    blob.upload_from_filename(source_file_name)

    logging.info(
        "File %s uploaded to %s.", source_file_name, destination_blob_name
    )

  def upload_from_frontend(
      self, blob_name: str, file_data: str, mime_type: str
  ):
    """
    Uploads a file received from the frontend.

    Args:
        blob_name: The name of the blob (file) in the bucket.
        file_data: The file data to upload.
        mime_type: The MIME type of the file.

    Returns:
        The GCS blob object.
    """
    blob = self.bucket.blob(blob_name)
    blob.upload_from_file(file_data, content_type=mime_type)  # Upload file.
    return blob

  def generate_signed_url(self, blob_name: str) -> str:
    """Generates a v4 signed URL for a GCS blob.

    This creates a temporary URL to grant GET access to an object for a
    limited time. The service account running this code needs permissions
    to sign URLs and read the object.

    Args:
        blob_name (str): The name of the object to be accessed.

    Returns:
        str: A signed URL valid for 48 hours (2880 minutes).
    """
    credentials, _ = google.auth.default()
    credentials.refresh(google.auth.transport.requests.Request())
    blob = self.bucket.blob(blob_name)
    # Sign URL
    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=2880),
        service_account_email=credentials.service_account_email,
        access_token=credentials.token,
        method="GET",
    )
    logging.info("Signed URI: %s", url)
    return url


storage_service = StorageService()
