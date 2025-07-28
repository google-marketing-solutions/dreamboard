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
Service for adding and styling text on video clips.

This module provides a `TextService` class with methods for creating
and overlaying text on video clips using MoviePy, with options for
font, color, size, position, and animation.
"""

from typing import Callable, Tuple, Union

from moviepy import editor


class TextService:
  """
  Service that handles adding text overlays to video clips.

  This class uses MoviePy to generate text clips and composite them
  onto existing video clips, providing a range of customization options.
  """

  def __init__(self):
    """
    Initializes the TextService.
    """
    pass

  def add_text_overlay(
      self,
      clip: editor.VideoClip,
      text: str,
      fontsize: int = 50,
      color: str = "white",
      font: str = "Arial",
      position: Union[
          str,
          Tuple[Union[int, float, str], Union[int, float, str]],
          Callable[[float], Tuple[float, float]],
      ] = "center",
      start_time: float = 0,
      duration: float = None,
      fade_duration: float = 0,
      bg_color: str = "transparent",
      stroke_color: str = None,
      stroke_width: float = 1,
  ) -> editor.CompositeVideoClip:
    """
    Adds a text overlay to a video clip.

    Args:
        clip: The video clip to add text to.
        text: The text content to display.
        fontsize: The font size of the text.
        color: The color of the text (e.g., 'white', '#FF0000').
        font: The font to use (e.g., 'Arial', 'Courier').
              Use `moviepy.editor.TextClip.list('font')` to see available fonts.
        position: The position of the text on the clip. Can be a string
                  ('center', 'left', 'top', etc.), a tuple (x, y) in
                  pixels, or a function t -> (x, y).
        start_time: The time (in seconds) when the text should appear.
        duration: The duration (in seconds) the text should be visible.
                  If None, it will last for the remainder of the clip.
        fade_duration: The duration (in seconds) for fade-in and fade-out
                       effects. If 0, no fade is applied.
        bg_color: The background color of the text box.
        stroke_color: The color of the text's stroke (outline).
        stroke_width: The width of the text's stroke.

    Returns:
        A new CompositeVideoClip with the text overlay.

    Raises:
        ValueError: If start_time, duration, or fade_duration values are invalid.
    """
    if start_time < 0 or start_time > clip.duration:
      raise ValueError("start_time must be within the clip's duration.")

    text_duration = (
        duration if duration is not None else clip.duration - start_time
    )

    if start_time + text_duration > clip.duration:
      raise ValueError("The text overlay exceeds the clip's duration.")

    text_clip = (
        editor.TextClip(
            txt=text,
            fontsize=fontsize,
            color=color,
            font=font,
            bg_color=bg_color,
            stroke_color=stroke_color,
            stroke_width=stroke_width,
            size=clip.size,
            method="caption",
        )
        .set_duration(text_duration)
        .set_start(start_time)
        .set_position(position)
    )

    if fade_duration > 0:
      if fade_duration * 2 > text_duration:
        raise ValueError("Total fade duration cannot exceed text duration.")
      text_clip = text_clip.fadein(fade_duration).fadeout(fade_duration)

    if isinstance(clip, editor.CompositeVideoClip):
      # If the base clip is already a composite, add the new text clip to its
      # list of clips to avoid inefficient nesting.
      clips_to_compose = clip.clips + [text_clip]
    else:
      # Otherwise, create a new list with the base clip and the text overlay.
      clips_to_compose = [clip, text_clip]

    composite_clip = editor.CompositeVideoClip(clips_to_compose, size=clip.size)

    # Explicitly set the audio from the original clip to the new composite clip
    # to ensure it's always preserved.
    if clip.audio:
      composite_clip.audio = clip.audio

    return composite_clip
