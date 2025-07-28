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
Service for adding and styling logos on video clips.
This module provides a `LogoService` class with methods for overlaying
a logo on video clips using ffmpeg, allowing users to specify position,
size, and duration of an overlay.
"""

import subprocess
from imageio_ffmpeg import get_ffmpeg_exe

class LogoService:
    """
    Service that handles adding a logo overlay to a video clip.
    This class uses ffmpeg to resize logos and overlay them for a specified
    duration onto an existing video clip.
    """

    def __init__(self):
        """
        Initializes the LogoService.
        """
        pass

    def add_logo_overlay(
        self,
        input_video_path: str,
        input_logo_path: str,
        output_path: str,
        start_time: int,
        duration: int,
        width: int,
        height: int,
        x_position: int,
        y_position: int,
    ):
        """
        Adds a logo overlay to a video clip.
        Args:
            input_video_path: The path to the input video file.
            input_logo_path: The path to the logo image file.
            output_path: The path where the output video will be saved.
            start_time: The time (in seconds) when the logo should appear.
            duration: The duration (in seconds) the logo should be visible.
            width: The width of the logo in pixels.
            height: The height of the logo in pixels.
            x_position: The x position (top left corner) of the logo on the clip in pixels.
            y_position: The y position (top left corner) of the logo on the clip in pixels.
        Raises:
            RuntimeError: If ffmpeg fails to run.
        """
        filters = []
        # Scale the logo to the specified width and height.
        filters.append(f"[1:v]scale={width}:{height}[logo];")
        # Overlay at (x, y) position for the specified time range.
        filters.append(
            f"[0:v][logo]overlay={x_position}:{y_position}:enable='between(t,{start_time},{(start_time + duration)})'"
        )
        # Combine the filters into a single filter string.
        filter_complex = "".join(filters)

        # Run FFmpeg
        cmd = [
            get_ffmpeg_exe(), "-y",
            "-i", input_video_path,
            "-i", input_logo_path,
            "-filter_complex", filter_complex,
            "-c:a", "copy",
            output_path,
            "-hide_banner", "-loglevel", "error",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg failed with error: {result.stderr}")

