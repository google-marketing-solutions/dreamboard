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
Service that extracts frames from a video file.

This module provides a `FrameExtractorService` class with methods for extracting
frames from a video file using ffmpeg and saving the results in GCS.
"""

import os
import tempfile
import subprocess
import utils
from services import storage_service

class FrameExtractorService:
    """Service for extracting frames from a video file."""

    def __init__(self):
        """
        Initializes the FrameExtractorService.

        Currently, this constructor does not require any specific
        initialization arguments.
        """
    pass

    @staticmethod
    def extract_frames(gcs_uri: str, story_id: str, scene_num: str, time_sec: int, frame_count: int) -> list[str]:
        """
        Extracts a number of frames from a video at a specific timestamp and uploads them to GCS.

        Args:
            gcs_uri (str): The GCS URI of the video file to extract frames from.
            story_id (str): The unique identifier for the story.
            scene_num (str): The number of the scene (used to locate the video).
            time_sec (int): The timestamp in seconds from which to extract frames.
            frame_count (int): The number of frames to extract from the given timestamp.

        Returns:
            list[str]: A list of GCS URIs for the extracted frame images.
        """

        # Create temp working directory
        with tempfile.TemporaryDirectory() as tmp_dir:
            local_video_path = os.path.join(tmp_dir, f"{scene_num}.mp4")

            # Download video locally from GCS
            storage_service.storage_service.download_file_to_server(local_video_path, gcs_uri)

            # Output image pattern (ffmpeg will generate sequential names)
            output_pattern = os.path.join(tmp_dir, "frame_%03d.png")

            # Build ffmpeg command
            cmd = [
                "ffmpeg",
                "-ss", str(time_sec),
                "-i", local_video_path,
                "-vf", "fps=24",
                "-vframes", str(frame_count),
                output_pattern,
                "-hide_banner",
                "-loglevel", "error"
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise RuntimeError(f"ffmpeg failed with return code {result.returncode}")

            # Upload extracted frames to GCS and collect URLs
            frame_urls = []
            for i in range(1, frame_count + 1):
                frame_file = os.path.join(tmp_dir, f"frame_{i:03d}.png")
                blob_name = f"{utils.get_images_bucket_folder_path(story_id)}/{scene_num}/frames/{time_sec}s_frame_{i}.png"
                storage_service.storage_service.upload_from_filename(frame_file, blob_name)
                frame_urls.append(blob_name)

            return frame_urls
