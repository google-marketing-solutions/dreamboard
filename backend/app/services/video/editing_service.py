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
Service for general video editing tasks, including transitions.

This module provides an `EditingService` class that acts as a facade
for more specific video editing functionalities, such as applying
transitions between video clips.
"""

import logging
from moviepy import editor
from services.video.text_service import TextService
from services.video.transitions_service import TransitionsService
from models.video import video_request_models


class EditingService:
    """
    Facade service for video editing operations.

    This class provides a simplified interface for common video editing tasks,
    currently focusing on applying various transitions between video clips.
    """

    def __init__(self):
        """
        Initializes the EditingService.
        """
        self._transitions_service = TransitionsService()
        self._text_service = TextService()

    def apply_transition(
        self,
        clip1: editor.VideoFileClip,
        clip2: editor.VideoFileClip,
        transition_type: video_request_models.VideoTransition,
        **kwargs
    ) -> editor.VideoFileClip:
        """
        Applies a specified transition between two video clips.

        Args:
            clip1: The first video clip.
            clip2: The second video clip.
            transition_type: The type of transition to apply (e.g.,
                             VideoTransition.X_FADE).
            **kwargs: Additional keyword arguments specific to the transition
                      type (e.g., transition_duration, speed_curve).

        Returns:
            A new VideoFileClip with the transition applied.

        Raises:
            ValueError: If an unsupported transition_type is provided.
        """
        transition_map = {
            video_request_models.VideoTransition.X_FADE: self._transitions_service.crossfade,
            video_request_models.VideoTransition.WIPE: self._transitions_service.wipe,
            video_request_models.VideoTransition.ZOOM: self._transitions_service.zoom,
            video_request_models.VideoTransition.ZOOM_WARP: self._transitions_service.zoom_warp,
            video_request_models.VideoTransition.DIP_TO_BLACK: self._transitions_service.dip_to_black,
            video_request_models.VideoTransition.CONCATENATE: self._transitions_service.concatenate,
            video_request_models.VideoTransition.BLUR: self._transitions_service.blur,
            video_request_models.VideoTransition.FLICKER: self._transitions_service.flicker,
            video_request_models.VideoTransition.SLIDE: self._transitions_service.slide,
            video_request_models.VideoTransition.SLIDE_WARP: self._transitions_service.slide_warp,
        }

        transition_func = transition_map.get(transition_type)

        if not transition_func:
            raise ValueError(f"Unsupported transition type: {transition_type}")

        # Handle transitions with specific argument needs or no kwargs
        if transition_type == video_request_models.VideoTransition.FLICKER:
            # Flicker takes no additional arguments beyond the two clips
            if kwargs:
                # Optionally, log a warning if unexpected kwargs are passed for flicker
                logging.warning(f"Ignoring unexpected kwargs for FLICKER transition: {kwargs}")
                pass
            return transition_func(clip1, clip2)
        elif transition_type == video_request_models.VideoTransition.CONCATENATE:
            # Concatenate only accepts 'trim_end_clip1' and 'trim_start_clip2'
            valid_concat_kwargs = {
                k: v for k, v in kwargs.items()
                if k in ['trim_end_clip1', 'trim_start_clip2']
            }
            return transition_func(clip1, clip2, **valid_concat_kwargs)

        # For other transitions, pass all kwargs.
        # The caller is responsible for providing correct kwargs for the specific transition.
        return transition_func(clip1, clip2, **kwargs)

    def add_text_overlay(
        self,
        clip: editor.VideoClip,
        text: str,
        **kwargs
    ) -> editor.CompositeVideoClip:
        """
        Adds a text overlay to a video clip.

        This method acts as a facade for the TextService's add_text_overlay
        method, passing all keyword arguments to it.

        Args:
            clip: The video clip to add text to.
            text: The text content to display.
            **kwargs: Additional keyword arguments for styling and timing,
                      such as fontsize, color, font, position, start_time,
                      duration, fade_duration, etc.

        Returns:
            A new CompositeVideoClip with the text overlay.
        """
        return self._text_service.add_text_overlay(clip, text, **kwargs)


# Create a singleton instance of the EditingService for application-wide use.
editing_service = EditingService()