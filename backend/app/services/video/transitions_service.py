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
Service that generates transitions for videos.

This module provides a `TransitionsService` class with methods for creating
various video transitions using MoviePy, including crossfade, wipe, zoom,
blur, and warp effects.
"""

import cv2
import numpy as np
import subprocess
import tempfile
import os
from imageio_ffmpeg import get_ffmpeg_exe
from moviepy import editor
from scipy import ndimage

# for warping images:
from skimage.transform import resize


class TransitionsService:
  """
  Service that generates various video transitions between clips.

  This class leverages MoviePy and SciPy to create dynamic visual effects
  like crossfades, wipes, zooms, blurs, and warps.
  """

  def __init__(self):
    """
    Initializes the TransitionsService.

    Currently, this constructor does not require any specific
    initialization arguments.
    """
    pass

  def concatenate_audioclips(self, audioclip1_filename, audioclip2_filename, audioclip1_duration=None):
      """
      Trims the end of clip1, then concatenates clip1 and clip2 audio using ffmpeg's concat demuxer.

      Args:
          file1 (str): Path to first audio file.
          file2 (str): Path to second audio file.
          audioclip1_duration (float): If the first audioclip should be trimmed, the duration of that clip.

      Returns:
          str: Path to output audio file.
      """
      with tempfile.TemporaryDirectory() as tmpdir:
          audioclip1_to_use = audioclip1_filename

          # If audioclip1_duration is not provided, use the full length of the first audio file.
          if audioclip1_duration is not None:
            trimmed_audioclip1 = os.path.join(tmpdir, "trimmed_audioclip.mp4")
            subprocess.run([
                get_ffmpeg_exe(), "-y",
                "-i", audioclip1_filename,
                "-t", str(audioclip1_duration),  # Trim to this duration.
                "-c", "copy", # Copy the audio codec without re-encoding.
                trimmed_audioclip1
            ], check=True)
            audioclip1_to_use = trimmed_audioclip1

          # Create a file list for the concat demuxer.
          file_list_path = os.path.join(tmpdir, "concat_list.txt")
          with open(file_list_path, "w") as f:
              f.write(f"file '{os.path.abspath(audioclip1_to_use)}'\n")
              f.write(f"file '{os.path.abspath(audioclip2_filename)}'\n")

          # Run ffmpeg concat.
          output_audioclip = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
          output_audioclip.close()

          subprocess.run([
              get_ffmpeg_exe(), "-y",
              "-f", "concat",
              "-safe", "0", # Allow "unsafe" file paths (absolute paths).
              "-i", file_list_path,
              "-c", "copy", # Copy the audio codec without re-encoding.
              output_audioclip.name
          ], check=True)

          return output_audioclip.name

  def crossfade(self, clip1, clip2, transition_duration, speed_curve="sigmoid"):
    """
    Create a crossfade transition between two video clips.

    The first clip fades out while the second clip fades in, with
    adjustable speed curves.

    Args:
        clip1 : VideoFileClip
            The first video clip that will fade out.
        clip2 : VideoFileClip
            The second video clip that will fade in.
        transition_duration : float
            Duration of the transition in seconds.
        speed_curve : str, optional
            The speed curve to use for the transition. Options: 'sigmoid',
            'linear', 'quadratic', 'cubic'. Default is 'sigmoid'.

    Returns:
        CompositeVideoClip
            A new clip with the crossfade transition between the two input
            clips.

    Raises:
        ValueError: If an invalid `speed_curve` is provided.
    """
    # Validate the speed curve.
    valid_curves = ["sigmoid", "linear", "quadratic", "cubic"]
    if speed_curve not in valid_curves:
      raise ValueError(f"Speed curve must be one of {valid_curves}")

    # Calculate the transition start time and total duration.
    transition_start = clip1.duration - transition_duration
    total_duration = clip1.duration + clip2.duration - transition_duration

    # Create a copy of the clips to avoid modifying the originals.
    clip1 = clip1.copy()
    clip2 = clip2.copy()

    # Define the speed curve functions for alpha blending.
    def sigmoid_curve(t):
      return 1 / (1 + np.exp(-10 * (t - 0.5)))

    def linear_curve(t):
      return t

    def quadratic_curve(t):
      return t**2

    def cubic_curve(t):
      return t**3

    curve_functions = {
        "sigmoid": sigmoid_curve,
        "linear": linear_curve,
        "quadratic": quadratic_curve,
        "cubic": cubic_curve,
    }

    curve_func = curve_functions[speed_curve]

    # Set the start time for the second clip to align with the transition.
    clip2 = clip2.set_start(transition_start)

    # Create a custom clip that blends the two input clips frame by frame.
    def make_frame(t):
      if t < transition_start:
        # Before transition, only first clip is visible.
        return clip1.get_frame(t)
      elif t >= clip1.duration:
        # After transition, only second clip is visible.
        return clip2.get_frame(t - transition_start)
      else:
        # During transition, blend frames based on progress and curve.
        frame1 = clip1.get_frame(t)
        frame2 = clip2.get_frame(t - transition_start)
        progress = (t - transition_start) / transition_duration
        # Weight for clip1 (fading out)
        weight = 1.0 - curve_func(progress)
        return weight * frame1 + (1 - weight) * frame2

    # Create the final composite clip with the custom make_frame function.
    final_clip = editor.CompositeVideoClip([clip1, clip2], use_bgclip=True)
    final_clip = final_clip.set_make_frame(make_frame)
    final_clip = final_clip.set_duration(total_duration)
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename, transition_start)))

    return final_clip

  def wipe(self, clip1, clip2, transition_duration, direction="left-to-right"):
    """
    Creates a wipe transition between two video clips.

    The first clip wipes away, revealing the second clip underneath,
    in a specified direction.

    Args:
    -----------
    clip1 : VideoFileClip
        The first video clip that will wipe away.
    clip2 : VideoFileClip
        The second video clip that will be revealed underneath.
    transition_duration : float
        Duration of the transition in seconds.
    direction : str, optional
        The direction of the wipe. Options: 'left-to-right',
        'right-to-left', 'top-to-bottom', 'bottom-to-top'.
        Default is 'left-to-right'.

    Returns:
    --------
    CompositeVideoClip
        A new clip with the wipe transition applied.

    Raises:
        ValueError: If an invalid `direction` is provided.
    """
    # Validate direction parameter.
    valid_directions = [
        "left-to-right",
        "right-to-left",
        "top-to-bottom",
        "bottom-to-top",
    ]
    if direction not in valid_directions:
      raise ValueError(f"Direction must be one of {valid_directions}")

    # Ensure both clips have the same size for seamless transition.
    width, height = clip1.size
    clip2 = clip2.resize(clip1.size)

    # Calculate durations and transition start time.
    clip1_duration = clip1.duration
    clip2_duration = clip2.duration
    transition_start = clip1_duration - transition_duration

    # Set up the second clip to start at the transition point.
    clip2 = clip2.set_start(transition_start)

    # Calculate total duration (clip1 + clip2 - transition overlap).
    total_duration = clip1_duration + clip2_duration - transition_duration

    # Create a custom mask for the first clip's wipe effect.
    def make_mask_frame(t):
      """Create a mask frame at time t (t is in seconds)."""
      if t < transition_start:
        # Before transition, first clip is fully visible (white mask).
        return np.ones((height, width), dtype=np.float32)
      elif t < clip1_duration:
        # During transition, gradually wipe first clip.
        progress = (t - transition_start) / transition_duration
        mask = np.ones((height, width), dtype=np.float32)

        # Adjust mask based on wipe direction.
        if direction == "left-to-right":
          edge_position = int(width * progress)
          if edge_position > 0:
            mask[:, :edge_position] = 0.0  # Hide left part.
        elif direction == "right-to-left":
          edge_position = int(width * (1 - progress))
          if edge_position < width:
            mask[:, edge_position:] = 0.0  # Hide right part.
        elif direction == "top-to-bottom":
          edge_position = int(height * progress)
          if edge_position > 0:
            mask[:edge_position, :] = 0.0  # Hide top part.
        elif direction == "bottom-to-top":
          edge_position = int(height * (1 - progress))
          if edge_position < height:
            mask[edge_position:, :] = 0.0  # Hide bottom part.
        return mask
      else:
        # After first clip ends, mask is fully transparent (black mask).
        return np.zeros((height, width), dtype=np.float32)

    # Create a mask clip using the custom `make_mask_frame` function.
    mask_clip = editor.VideoClip(
        make_frame=make_mask_frame, duration=total_duration
    )
    mask_clip.ismask = True  # Mark it as a mask for MoviePy.

    # Apply the mask to the first clip and extend its duration.
    clip1_extended = clip1.set_duration(total_duration)
    clip1_masked = clip1_extended.set_mask(mask_clip)

    # Create the final composite with the second clip as background
    # and the masked first clip on top.
    final_clip = editor.CompositeVideoClip(
        [clip2, clip1_masked], size=clip1.size
    )
    final_clip = final_clip.set_duration(total_duration)
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename, transition_start)))

    return final_clip

  def zoom(
      self,
      clip1,
      clip2,
      transition_duration=1.0,
      motion_blur=0,
      speed_curve="sigmoid",
  ):
    """
    Create a zoom transition between two video clips.

    The first clip zooms in and fades out, while the second clip zooms
    out and fades in. Optional motion blur can be applied.

    Args:
    -----------
    clip1 : VideoFileClip
        The first video clip (will zoom in and fade out).
    clip2 : VideoFileClip
        The second video clip (will zoom out and fade in).
    transition_duration : float, optional
        Duration of the transition in seconds. Defaults to 1.0.
    motion_blur : int, optional
        Strength of motion blur effect (0 = no blur, higher values =
        more blur). Defaults to 0.
    speed_curve : str, optional
        Type of speed curve to use for the transition. Options: 'sigmoid',
        'linear', 'quadratic', 'cubic'. Defaults to 'sigmoid'.

    Returns:
    --------
    CompositeVideoClip
        The final video with the transition effect.

    Raises:
        ValueError: If an invalid `speed_curve` or `motion_blur` is
                    provided.
    """
    # Validate inputs.
    if speed_curve not in ["sigmoid", "linear", "quadratic", "cubic"]:
      raise ValueError(
          "speed_curve must be one of: 'sigmoid', 'linear', "
          "'quadratic', 'cubic'"
      )
    if motion_blur < 0:
      raise ValueError("motion_blur must be a non-negative value")

    # Define speed curve functions.
    def get_curve_function(curve_type):
      if curve_type == "sigmoid":
        return lambda t: 1 / (1 + np.exp(-10 * (t - 0.5)))
      elif curve_type == "linear":
        return lambda t: t
      elif curve_type == "quadratic":
        return lambda t: t**2
      elif curve_type == "cubic":
        return lambda t: t**3

    curve_func = get_curve_function(speed_curve)

    # Calculate total duration and transition start time.
    total_duration = clip1.duration + clip2.duration - transition_duration
    transition_start = clip1.duration - transition_duration

    # Define the zoom-in effect for the first clip.
    def zoom_in_effect(get_frame, t):
      # Only apply zoom during the transition period.
      if t < transition_start:
        return get_frame(t)

      # Calculate relative position in the transition (0 to 1).
      rel_pos = (t - transition_start) / transition_duration
      zoom_factor = 1 + curve_func(rel_pos)

      frame = get_frame(t)

      # Apply motion blur if needed by blending with previous frames.
      if motion_blur > 0:
        for i in range(1, motion_blur + 1):
          blur_weight = (motion_blur + 1 - i) / (motion_blur * 10)
          prev_t = max(0, t - i * 0.01)  # Sample slightly before.
          prev_frame = get_frame(prev_t)
          frame = frame * (1 - blur_weight) + prev_frame * blur_weight

      h, w = frame.shape[:2]
      center_x, center_y = w // 2, h // 2

      # Calculate crop dimensions based on zoom factor.
      new_w = int(w / zoom_factor)
      new_h = int(h / zoom_factor)
      new_w = max(new_w, 20)  # Ensure dimensions don't get too small.
      new_h = max(new_h, 20)

      # Crop from center and resize back to original dimensions.
      x1 = center_x - new_w // 2
      y1 = center_y - new_h // 2
      cropped = frame[y1 : y1 + new_h, x1 : x1 + new_w]
      result = resize(cropped, (h, w), preserve_range=True).astype(frame.dtype)

      return result

    # Apply zoom-in effect to clip1.
    clip1_zoomed = clip1.fl(zoom_in_effect)

    # Create fading for clip1 (fade out during transition).
    def fade_out(t):
      if t < transition_start:
        return 1.0
      rel_pos = (t - transition_start) / transition_duration
      return 1.0 - curve_func(rel_pos)

    # Create the zoom effect for clip2 (zoom out and fade in).
    def zoom_out_effect(get_frame, t):
      # Calculate relative position in the transition (0 to 1).
      if t < transition_duration:
        rel_pos = t / transition_duration
        # Invert curve for zoom out.
        zoom_factor = 1 + curve_func(1 - rel_pos)

        frame = get_frame(t)

        # Apply motion blur if needed by blending with next frames.
        if motion_blur > 0:
          for i in range(1, motion_blur + 1):
            blur_weight = (motion_blur + 1 - i) / (motion_blur * 10)
            next_t = min(clip2.duration - 0.001, t + i * 0.01)
            next_frame = get_frame(next_t)
            frame = frame * (1 - blur_weight) + next_frame * blur_weight

        h, w = frame.shape[:2]
        center_x, center_y = w // 2, h // 2

        # Calculate crop dimensions based on zoom factor.
        new_w = int(w / zoom_factor)
        new_h = int(h / zoom_factor)
        new_w = max(new_w, 20)
        new_h = max(new_h, 20)

        # Crop from center and resize back to original dimensions.
        x1 = center_x - new_w // 2
        y1 = center_y - new_h // 2
        cropped = frame[y1 : y1 + new_h, x1 : x1 + new_w]
        result = resize(cropped, (h, w), preserve_range=True).astype(
            frame.dtype
        )
        return result
      return get_frame(t)

    # Adjust second clip's start time and apply zoom-out effect.
    clip2_adjusted = clip2.set_start(transition_start)
    clip2_zoomed = clip2_adjusted.fl(zoom_out_effect)

    # Create fading for clip2 (fade in during transition).
    def fade_in(t):
      global_t = t + transition_start  # Convert to global time.
      if global_t < transition_start:
        return 0.0
      if global_t > transition_start + transition_duration:
        return 1.0
      rel_pos = (global_t - transition_start) / transition_duration
      return curve_func(rel_pos)

    # Create the final composition by crossfading the zoomed clips.
    final_clip = editor.CompositeVideoClip(
        [
            clip1_zoomed.crossfadein(0).crossfadeout(transition_duration),
            clip2_zoomed.crossfadein(transition_duration),
        ],
        size=clip1.size,
    )
    final_clip = final_clip.set_duration(total_duration)
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename, transition_start)))

    return final_clip

  def zoom_warp(
      self,
      clip1,
      clip2,
      transition_duration=1.0,
      motion_blur=0,
      speed_curve="sigmoid",
      distortion_factor=0.0,
      distortion_type=["pinch", "bulge"],
  ):
    """
    Create a zoom transition between two video clips with optional
    radial distortion.

    Args:
    -----------
    clip1 : VideoFileClip
        The first video clip (will zoom in and fade out).
    clip2 : VideoFileClip
        The second video clip (will zoom out and fade in).
    transition_duration : float, optional
        Duration of the transition in seconds. Defaults to 1.0.
    motion_blur : int, optional
        Strength of motion blur effect (0 = no blur, higher values =
        more blur). Defaults to 0.
    speed_curve : str, optional
        Type of speed curve to use for the transition. Options: 'sigmoid',
        'linear', 'quadratic', 'cubic'. Defaults to 'sigmoid'.
    distortion_factor : float, optional
        Amount of radial distortion to apply during transition (0.0 to 1.0).
        Defaults to 0.0.
    distortion_type : list[str], optional
        A list of two strings specifying distortion types for clip1 and
        clip2 respectively ('pinch' or 'bulge'). Defaults to
        `['pinch', 'bulge']`.

    Returns:
    --------
    CompositeVideoClip
        The final video with the transition effect.

    Raises:
        ValueError: If invalid arguments are provided.
    """
    # Validate inputs.
    if speed_curve not in ["sigmoid", "linear", "quadratic", "cubic"]:
      raise ValueError(
          "speed_curve must be one of: 'sigmoid', 'linear', "
          "'quadratic', 'cubic'"
      )
    if motion_blur < 0:
      raise ValueError("motion_blur must be a non-negative value")
    if not 0.0 <= distortion_factor <= 1.0:
      raise ValueError("distortion_factor must be between 0.0 and 1.0")
    if len(distortion_type) != 2:
      raise ValueError(
          "distortion_type must be a list with exactly two elements"
      )
    for dt in distortion_type:
      if dt not in ["bulge", "pinch"]:
        raise ValueError(
            "distortion_type elements must be either 'bulge' or 'pinch'"
        )

    # Define speed curve functions.
    def get_curve_function(curve_type):
      if curve_type == "sigmoid":
        return lambda t: 1 / (1 + np.exp(-10 * (t - 0.5)))
      elif curve_type == "linear":
        return lambda t: t
      elif curve_type == "quadratic":
        return lambda t: t**2
      elif curve_type == "cubic":
        return lambda t: t**3

    curve_func = get_curve_function(speed_curve)

    # Calculate total duration and transition start time.
    total_duration = clip1.duration + clip2.duration - transition_duration
    transition_start = clip1.duration - transition_duration

    # Define the radial distortion function.
    def apply_distortion(image, distortion_strength, distortion_type):
      """Apply radial distortion to an image."""
      if distortion_strength == 0:
        return image

      height, width = image.shape[:2]
      y_coords, x_coords = np.meshgrid(
          np.arange(height), np.arange(width), indexing="ij"
      )
      center_y, center_x = height / 2, width / 2
      y_centered = y_coords - center_y
      x_centered = x_coords - center_x

      # Calculate normalized distance from center.
      r = np.sqrt(y_centered**2 + x_centered**2)
      max_r = np.sqrt((height / 2) ** 2 + (width / 2) ** 2)
      r_normalized = r / max_r

      # Apply distortion based on type (bulge or pinch).
      if distortion_type == "bulge":
        distortion = 1 + distortion_strength * r_normalized**2
      else:  # 'pinch'
        distortion = 1 - distortion_strength * r_normalized**2
        # Ensure non-negative/zero scaling.
        distortion = np.maximum(distortion, 0.1)

      y_new = y_centered * distortion + center_y
      x_new = x_centered * distortion + center_x

      # Clip to valid coordinates.
      y_new = np.clip(y_new, 0, height - 1)
      x_new = np.clip(x_new, 0, width - 1)

      indices = np.indices((height, width))
      indices[0] = y_new
      indices[1] = x_new

      # Process each channel separately for color images.
      if len(image.shape) == 3:
        result = np.zeros_like(image)
        for i in range(image.shape[2]):
          result[:, :, i] = ndimage.map_coordinates(
              image[:, :, i], indices, order=1, mode="nearest"
          )
      else:
        result = ndimage.map_coordinates(
            image, indices, order=1, mode="nearest"
        )
      return result

    # Define the zoom-in effect for clip1 with distortion.
    def zoom_in_effect(get_frame, t):
      if t < transition_start:
        return get_frame(t)

      rel_pos = (t - transition_start) / transition_duration
      zoom_factor = 1 + curve_func(rel_pos)
      current_distortion = distortion_factor * curve_func(rel_pos)

      frame = get_frame(t)
      if motion_blur > 0:
        for i in range(1, motion_blur + 1):
          blur_weight = (motion_blur + 1 - i) / (motion_blur * 10)
          prev_t = max(0, t - i * 0.01)
          prev_frame = get_frame(prev_t)
          frame = frame * (1 - blur_weight) + prev_frame * blur_weight

      h, w = frame.shape[:2]
      center_x, center_y = w // 2, h // 2
      new_w = int(w / zoom_factor)
      new_h = int(h / zoom_factor)
      new_w = max(new_w, 20)
      new_h = max(new_h, 20)
      x1 = center_x - new_w // 2
      y1 = center_y - new_h // 2
      cropped = frame[y1 : y1 + new_h, x1 : x1 + new_w]
      resized = resize(cropped, (h, w), preserve_range=True).astype(frame.dtype)

      if distortion_factor > 0:
        result = apply_distortion(
            resized, current_distortion, distortion_type[0]
        )
        return result
      return resized

    # Apply zoom-in effect to clip1.
    clip1_zoomed = clip1.fl(zoom_in_effect)

    # Create the zoom effect for clip2 (zoom out and fade in).
    def zoom_out_effect(get_frame, t):
      if t < transition_duration:
        rel_pos = t / transition_duration
        zoom_factor = 1 + curve_func(1 - rel_pos)
        current_distortion = distortion_factor * curve_func(1 - rel_pos)

        frame = get_frame(t)
        if motion_blur > 0:
          for i in range(1, motion_blur + 1):
            blur_weight = (motion_blur + 1 - i) / (motion_blur * 10)
            next_t = min(clip2.duration - 0.001, t + i * 0.01)
            next_frame = get_frame(next_t)
            frame = frame * (1 - blur_weight) + next_frame * blur_weight

        h, w = frame.shape[:2]
        center_x, center_y = w // 2, h // 2
        new_w = int(w / zoom_factor)
        new_h = int(h / zoom_factor)
        new_w = max(new_w, 20)
        new_h = max(new_h, 20)
        x1 = center_x - new_w // 2
        y1 = center_y - new_h // 2
        cropped = frame[y1 : y1 + new_h, x1 : x1 + new_w]
        resized = resize(cropped, (h, w), preserve_range=True).astype(
            frame.dtype
        )

        if distortion_factor > 0:
          result = apply_distortion(
              resized, current_distortion, distortion_type[1]
          )
          return result
        return resized
      return get_frame(t)

    # Adjust second clip's start time.
    clip2_adjusted = clip2.set_start(transition_start)

    # Apply zoom out effect to clip2.
    clip2_zoomed = clip2_adjusted.fl(zoom_out_effect)

    # Create the final composition by crossfading the zoomed clips.
    final_clip = editor.CompositeVideoClip(
        [
            clip1_zoomed.crossfadein(0).crossfadeout(transition_duration),
            clip2_zoomed.crossfadein(transition_duration),
        ],
        size=clip1.size,
    )
    final_clip = final_clip.set_duration(total_duration)
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename, transition_start)))

    return final_clip

  def dip_to_black(
      self, clip1, clip2, transition_duration, speed_curve="sigmoid"
  ):
    """
    Creates a dip-to-color (black) transition between two video clips.

    The first clip fades out to black, and then the second clip fades in
    from black.

    Args:
    -----------
    clip1 : VideoClip
        First video clip.
    clip2 : VideoClip
        Second video clip.
    transition_duration : float
        Duration of the transition in seconds.
    speed_curve : str, optional
        Type of speed curve for the transition. Options: "sigmoid",
        "linear", "quadratic", "cubic". Defaults to "sigmoid".

    Returns:
    --------
    VideoClip
        A new video clip with the transition applied.
    """

    # Define the speed curve functions.
    def get_curve_function(curve_type):
      if curve_type == "linear":
        return lambda t: t
      elif curve_type == "quadratic":
        return lambda t: t**2
      elif curve_type == "cubic":
        return lambda t: t**3
      else:  # Default to sigmoid.
        return lambda t: 1 / (1 + np.exp(-10 * (t - 0.5)))

    curve_func = get_curve_function(speed_curve)

    # Half duration for each fade (fade out and fade in).
    fade_duration = transition_duration / 2

    # Create a fade-out effect for the first clip.
    clip1_fadeout = clip1.copy()
    clip1_duration = clip1.duration

    # Create a mask for the fade out.
    def fade_out_mask(gf, t):
      # Only apply fade in last part of clip.
      if t < (clip1_duration - fade_duration):
        return 1.0  # Fully visible.
      else:
        # Map time to [0-1] for the fade portion.
        relative_t = (t - (clip1_duration - fade_duration)) / fade_duration
        return 1.0 - curve_func(relative_t)  # Fade to black.

    # Set the fade out mask.
    clip1_fadeout = clip1_fadeout.set_make_frame(
        lambda t: clip1.get_frame(t) * fade_out_mask(None, t)
    )

    # Create a fade-in effect for the second clip.
    clip2_fadein = clip2.copy()

    # Create a mask for the fade in.
    def fade_in_mask(gf, t):
      if t < fade_duration:
        # Map time to [0-1] for the fade portion.
        relative_t = t / fade_duration
        return curve_func(relative_t)  # Fade from black.
      else:
        return 1.0  # Fully visible.

    # Set the fade in mask.
    clip2_fadein = clip2_fadein.set_make_frame(
        lambda t: clip2.get_frame(t) * fade_in_mask(None, t)
    )

    # Create a black clip for the background to dip to.
    black_clip = editor.ColorClip(
        size=clip1.size,
        color=(0, 0, 0),
        duration=(clip1_duration + clip2.duration),
    )

    # Position clip2 to start right after clip1.
    clip2_fadein = clip2_fadein.set_start(clip1_duration)

    # Composite the clips: black background, then fading clip1, then
    # fading clip2.
    final_clip = editor.CompositeVideoClip(
        [black_clip, clip1_fadeout, clip2_fadein]
    )
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename)))

    return final_clip

  def concatenate(
      self, clip1, clip2, trim_end_clip1=None, trim_start_clip2=None
  ):
    """
    Concatenate two video clips with optional trimming.

    This method joins two video clips sequentially, allowing for precise
    trimming of the end of the first clip and the start of the second.

    Args:
    -----------
    clip1 : VideoFileClip
        The first video clip.
    clip2 : VideoFileClip
        The second video clip.
    trim_end_clip1 : str, optional
        Timestamp (HH:MM:SS:MS) to trim from the end of the first clip.
    trim_start_clip2 : str, optional
        Timestamp (HH:MM:SS:MS) to trim from the beginning of the second
        clip.

    Returns:
    --------
    VideoFileClip
        A new clip with the two input clips concatenated.

    Raises:
        ValueError: If timestamp format is incorrect or trim time exceeds
                    clip duration.
    """

    # Helper function to convert timestamp string to seconds.
    def timestamp_to_seconds(timestamp):
      if not timestamp:
        return 0

      # Parse timestamp format HH:MM:SS:MS.
      parts = timestamp.split(":")
      if len(parts) != 4:
        raise ValueError("Timestamp must be in format HH:MM:SS:MS")

      hours = int(parts[0])
      minutes = int(parts[1])
      seconds = int(parts[2])
      milliseconds = int(parts[3])

      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000

    # Trim the first clip if `trim_end_clip1` is provided.
    if trim_end_clip1:
      end_time_seconds = timestamp_to_seconds(trim_end_clip1)
      if end_time_seconds >= clip1.duration:
        raise ValueError("Trim end time for clip1 exceeds clip duration")
      clip1 = clip1.subclip(0, clip1.duration - end_time_seconds)

    # Trim the second clip if `trim_start_clip2` is provided.
    if trim_start_clip2:
      start_time_seconds = timestamp_to_seconds(trim_start_clip2)
      if start_time_seconds >= clip2.duration:
        raise ValueError("Trim start time for clip2 exceeds clip duration")
      clip2 = clip2.subclip(start_time_seconds, clip2.duration)

    # Concatenate the (potentially trimmed) clips.
    final_clip = editor.concatenate_videoclips([clip1, clip2])
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename)))

    return final_clip

  def add_blur_transition(
      self,
      clip,
      blur_duration,
      max_blur_strength=1.0,
      reverse=False,
      position="end",
  ):
    """
    Add a gradual blur effect to the start or end of a video clip.

    The blur can either increase (clear to blurry) or decrease (blurry
    to clear) over a specified duration.

    Args:
    -----------
    clip : VideoFileClip
        The input video clip to apply the blur effect to.
    blur_duration : float
        Duration (in seconds) of the blur effect.
    max_blur_strength : float, optional
        Maximum blur strength on a scale of 0 to 1. Defaults to 1.0.
    reverse : bool, optional
        If `False` (default), blur goes from clear to blurry. If `True`,
        blur goes from blurry to clear (coming into focus).
    position : str, optional
        Where to apply the effect: 'start' or 'end' (default) of the clip.

    Returns:
    --------
    VideoFileClip
        A new video clip with the gradual blur effect applied.
    """
    # Ensure blur duration doesn't exceed clip duration.
    if blur_duration > clip.duration:
      blur_duration = clip.duration
      print(
          "Warning: Blur duration exceeds clip duration. Setting blur "
          f"duration to {blur_duration} seconds."
      )

    # Determine the time range for the blur effect based on position.
    if position.lower() == "start":
      effect_start_time = 0
      effect_end_time = blur_duration
    else:  # 'end' (default)
      effect_start_time = clip.duration - blur_duration
      effect_end_time = clip.duration

    # Create a function that returns the blur radius at each time point.
    def get_blur_radius(t):
      # Only apply blur within the effect time range.
      if t < effect_start_time or t > effect_end_time:
        return 0

      # Calculate progress through the effect (0 to 1).
      effect_progress = (t - effect_start_time) / blur_duration
      max_radius = 15 * max_blur_strength  # Max blur radius.

      # Apply the effect based on direction (reverse) and position.
      if (position.lower() == "start" and not reverse) or (
          position.lower() == "end" and reverse
      ):
        # Start: clear to blurry OR End: blurry to clear.
        return max_radius * (1 - effect_progress)
      else:
        # Start: blurry to clear OR End: clear to blurry.
        return max_radius * effect_progress

    # Create a blurred clip with varying blur radius using `gaussian_filter`.
    def blur_frame(get_frame, t):
      frame = get_frame(t)
      radius = get_blur_radius(t)

      if radius > 0:
        # Apply gaussian blur to each color channel separately.
        blurred = np.zeros_like(frame)
        for i in range(3):  # RGB channels.
          blurred[:, :, i] = ndimage.gaussian_filter(
              frame[:, :, i], sigma=radius
          )
        return blurred
      return frame

    # Apply the blur effect using `fl` (frame transform).
    blurred_clip = clip.fl(blur_frame)

    return blurred_clip

  def blur(self, clip1, clip2, transition_duration=1.0, max_blur=1.0):
    """
    Creates a blur transition between two video clips.

    The first clip blurs out at its end, and the second clip blurs in
    at its start, then the two clips are concatenated.

    Args:
    -----------
    clip1 : VideoFileClip
        The first video clip.
    clip2 : VideoFileClip
        The second video clip.
    transition_duration : float, optional
        Duration of the transition in seconds. Defaults to 1.0.
    max_blur : float, optional
        Maximum blur strength. Defaults to 1.0.

    Returns:
    --------
    VideoFileClip
        A new video clip with the blur transition applied.
    """
    blur_duration_per_clip = transition_duration / 2

    # **Notes**
    # If position = 'end' and reverse=False, the clip goes from clear
    # to blurry at the end of the clip.
    # If position = 'start' and reverse=False, the clip goes from blurry
    # to clear at the start of the clip.
    # If position = 'end' and reverse=True, the clip goes from blurry
    # to clear at the end of the clip.
    # If position = 'start' and reverse=True, the clip goes from clear
    # to blurry at the start of the clip.

    # Apply blur to the end of the first clip (clear to blurry).
    clip1_blurred = self.add_blur_transition(
        clip1,
        blur_duration=blur_duration_per_clip,
        max_blur_strength=max_blur,
        reverse=False,
        position="end",
    )

    # Apply blur to the start of the second clip (blurry to clear).
    clip2_blurred = self.add_blur_transition(
        clip2,
        blur_duration=blur_duration_per_clip,
        max_blur_strength=max_blur,
        reverse=False,
        position="start",
    )

    # Concatenate the blurred clips.
    final_clip = editor.concatenate_videoclips([clip1_blurred, clip2_blurred])
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename)))

    return final_clip

  def flicker(self, clip1, clip2):
    """
    Creates a flicker effect between two video clips.

    The flicker is created by zooming in and blurring the last two frames
    of clip1 before cutting to clip2.

    Args:
        clip1 : VideoFileClip
            The first video clip.
        clip2 : VideoFileClip
            The second video clip.

    Returns:
        VideoFileClip: A new video clip with the flicker transition.
    """
    # Make copies to avoid modifying the original clips.
    clip1 = clip1.copy()
    clip2 = clip2.copy()

    # Get the duration and frames per second of clip1.
    clip1_duration = clip1.duration
    fps = clip1.fps

    # Calculate the time for the last two frames.
    frame_duration = 1.0 / fps
    last_two_frames_start = clip1_duration - (2 * frame_duration)

    # Extract the main part of clip1 (excluding the last two frames).
    clip1_main = clip1.subclip(0, last_two_frames_start)

    # Extract the last two frames as separate subclips.
    last_frame1 = clip1.subclip(
        last_two_frames_start, last_two_frames_start + frame_duration
    )
    last_frame2 = clip1.subclip(
        last_two_frames_start + frame_duration, clip1_duration
    )

    # Apply zoom effect (5x) to both frames.
    zoom_factor = 5.0
    zoomed_frame1 = last_frame1.resize(
        width=last_frame1.w * zoom_factor, height=last_frame1.h * zoom_factor
    )
    zoomed_frame2 = last_frame2.resize(
        width=last_frame2.w * zoom_factor, height=last_frame2.h * zoom_factor
    )

    # Helper function to center crop a clip to target dimensions.
    def center_crop(clip, target_width, target_height):
      w, h = clip.size
      x_center = w // 2
      y_center = h // 2
      x1 = max(0, x_center - target_width // 2)
      y1 = max(0, y_center - target_height // 2)
      return clip.crop(x1=x1, y1=y1, width=target_width, height=target_height)

    # Center and crop the zoomed frames to match original dimensions.
    zoomed_frame1 = center_crop(zoomed_frame1, clip1.w, clip1.h)
    zoomed_frame2 = center_crop(zoomed_frame2, clip1.w, clip1.h)

    # Create a custom blur function using `scipy.ndimage.gaussian_filter`.
    def custom_blur(clip, sigma):
      """Apply gaussian blur to each frame of the clip using scipy."""

      def blur_frame(get_frame, t):
        frame = get_frame(t)
        blurred = np.zeros_like(frame)
        for i in range(3):  # RGB channels.
          blurred[:, :, i] = ndimage.gaussian_filter(
              frame[:, :, i], sigma=sigma
          )
        return blurred

      return clip.fl(blur_frame)

    # Apply Gaussian blur to the zoomed frames.
    blurred_frame1 = custom_blur(zoomed_frame1, sigma=10.0)
    blurred_frame2 = custom_blur(zoomed_frame2, sigma=2.5)

    # Concatenate all clips to form the final flicker transition.
    final_clip = editor.concatenate_videoclips([
        clip1_main,  # clip1 without last two frames.
        blurred_frame1,  # first frame with zoom and 100% blur.
        blurred_frame2,  # second frame with zoom and 50% blur.
        clip2,  # clip2 unchanged.
    ])
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename)))

    return final_clip

  def slide(self, clip1, clip2, duration=1.0, speed_curve="sigmoid"):
    """
    Creates a smooth slide transition between two video clips.

    The first clip slides out of view while the second clip slides in,
    with optional blur and a customizable speed curve.

    Args:
    -----------
    clip1 : VideoClip
        The first clip.
    clip2 : VideoClip
        The second clip.
    duration : float, optional
        Duration of the transition in seconds. Defaults to 1.0.
    speed_curve : str, optional
        The speed curve for the transition. Options: "sigmoid", "linear",
        "quadratic", "cubic". Defaults to "sigmoid".

    Returns:
    --------
    VideoClip
        A composite video clip with the slide transition.
    """

    # Define speed curves for position calculation.
    def get_position_function(curve_type):
      if curve_type == "linear":
        return lambda t: t
      elif curve_type == "quadratic":
        return lambda t: t**2
      elif curve_type == "cubic":
        return lambda t: t**3
      else:  # Default to sigmoid.
        return lambda t: 1 / (1 + np.exp(-12 * (t - 0.5)))

    position_func = get_position_function(speed_curve)

    # Calculate the total duration of the combined clip.
    total_duration = clip1.duration + clip2.duration - duration

    # Define a function to calculate blur amount based on transition
    # progress.
    def get_blur_amount(progress):
      # Blur is maximum in the middle of the transition, using a
      # modified sigmoid to peak.
      if progress < 0.5:
        return 10 * (1 / (1 + np.exp(-15 * (progress - 0.25))))
      else:
        return 10 * (1 / (1 + np.exp(15 * (progress - 0.75))))

    # Create a function to make a frame at time t.
    def make_frame(t):
      # Determine which part of the video we're in.
      if t < clip1.duration - duration:
        return clip1.get_frame(t)  # Before transition.
      elif t >= clip1.duration:
        return clip2.get_frame(t - clip1.duration + duration)  # After.
      else:
        # During transition: calculate position, apply blur, blend.
        transition_progress = (t - (clip1.duration - duration)) / duration
        position = position_func(transition_progress)

        # Calculate offsets for the clips.
        offset1 = int(position * clip1.w)
        offset2 = int((1 - position) * clip1.w * -1)

        frame1 = clip1.get_frame(t)
        frame2 = clip2.get_frame(t - clip1.duration + duration)

        canvas = np.zeros_like(frame1)  # Create a blank canvas.

        # Calculate the blur amount based on transition progress.
        blur_amount = get_blur_amount(transition_progress)

        # Apply blur to both frames if significant.
        if blur_amount > 0.5:
          frame1 = ndimage.gaussian_filter(
              frame1, sigma=[blur_amount, blur_amount, 0]
          )
          frame2 = ndimage.gaussian_filter(
              frame2, sigma=[blur_amount, blur_amount, 0]
          )

        # Place the frames on the canvas with offsets.
        # Handle the first clip sliding out.
        if offset1 < clip1.w:
          visible_width1 = clip1.w - offset1
          canvas[:, :visible_width1] = frame1[:, offset1:]

        # Handle the second clip sliding in.
        if offset2 < 0:
          visible_width2 = clip1.w + offset2
          if visible_width2 > 0:
            canvas[:, clip1.w - visible_width2 :] = frame2[:, :visible_width2]
        return canvas

    # Create a new clip with the custom frame-making function.
    final_clip = editor.VideoClip(make_frame, duration=total_duration)
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename, clip1.duration - duration)))

    return final_clip

  def slide_warp(
      self,
      clip1,
      clip2,
      duration=1.0,
      speed_curve="sigmoid",
      stretch_intensity=0.3,
  ):
    """
    Creates a slide transition between two video clips with a warping
    (stretching) distortion effect.

    The first clip slides out with a stretch, and the second slides in
    with a corresponding stretch.

    Args:
    -----------
    clip1 : VideoClip
        The first clip.
    clip2 : VideoClip
        The second clip.
    duration : float, optional
        Duration of the transition in seconds. Defaults to 1.0.
    speed_curve : str, optional
        The speed curve for the transition. Options: "sigmoid", "linear",
        "quadratic", "cubic". Defaults to "sigmoid".
    stretch_intensity : float, optional
        Controls the amount of stretching distortion (0.0 to 1.0). Defaults
        to 0.3.

    Returns:
    --------
    VideoClip
        A composite video clip with the slide and warp transition.
    """

    # Define speed curves for position calculation.
    def get_position_function(curve_type):
      if curve_type == "linear":
        return lambda t: t
      elif curve_type == "quadratic":
        return lambda t: t**2
      elif curve_type == "cubic":
        return lambda t: t**3
      else:  # Default to sigmoid.
        return lambda t: 1 / (1 + np.exp(-12 * (t - 0.5)))

    position_func = get_position_function(speed_curve)

    # Calculate the total duration of the combined clip.
    total_duration = clip1.duration + clip2.duration - duration

    # Define a function to calculate blur amount based on transition
    # progress.
    def get_blur_amount(progress):
      # Blur is maximum in the middle of the transition.
      if progress < 0.5:
        return 10 * (1 / (1 + np.exp(-15 * (progress - 0.25))))
      else:
        return 10 * (1 / (1 + np.exp(15 * (progress - 0.75))))

    # Create a function to make a frame at time t.
    def make_frame(t):
      # Determine which part of the video we're in.
      if t < clip1.duration - duration:
        return clip1.get_frame(t)
      elif t >= clip1.duration:
        return clip2.get_frame(t - clip1.duration + duration)
      else:
        # During transition: calculate position, apply distortion/blur.
        transition_progress = (t - (clip1.duration - duration)) / duration
        position = position_func(transition_progress)

        # Calculate offsets for the clips.
        offset1 = int(position * clip1.w)
        offset2 = int((1 - position) * clip1.w * -1)

        frame1 = clip1.get_frame(t)
        frame2 = clip2.get_frame(t - clip1.duration + duration)

        canvas = np.zeros_like(frame1)

        # Calculate blur and distortion intensity.
        blur_amount = get_blur_amount(transition_progress)
        distortion_intensity = (
            get_blur_amount(transition_progress) / 10 * stretch_intensity
        )

        height, width = frame1.shape[:2]

        # Create distortion maps for both clips (stretching).
        # For clip1 (sliding out to right).
        src_points1 = np.float32(
            [[0, 0], [width, 0], [width, height], [0, height]]
        )
        dst_points1 = np.float32([
            [0, 0],
            [width - width * distortion_intensity, 0],
            [width - width * distortion_intensity, height],
            [0, height],
        ])

        # For clip2 (sliding in from left).
        src_points2 = np.float32(
            [[0, 0], [width, 0], [width, height], [0, height]]
        )
        dst_points2 = np.float32([
            [width * distortion_intensity, 0],
            [width, 0],
            [width, height],
            [width * distortion_intensity, height],
        ])

        # Apply the perspective transformations using OpenCV.
        transform_matrix1 = cv2.getPerspectiveTransform(
            src_points1, dst_points1
        )
        transform_matrix2 = cv2.getPerspectiveTransform(
            src_points2, dst_points2
        )

        frame1 = cv2.warpPerspective(frame1, transform_matrix1, (width, height))
        frame2 = cv2.warpPerspective(frame2, transform_matrix2, (width, height))

        # Apply blur to both frames if significant.
        if blur_amount > 0.5:
          frame1 = ndimage.gaussian_filter(
              frame1, sigma=[blur_amount, blur_amount, 0]
          )
          frame2 = ndimage.gaussian_filter(
              frame2, sigma=[blur_amount, blur_amount, 0]
          )

        # Place the frames on the canvas with offsets.
        if offset1 < clip1.w:
          visible_width1 = clip1.w - offset1
          canvas[:, :visible_width1] = frame1[:, offset1:]

        if offset2 < 0:
          visible_width2 = clip1.w + offset2
          if visible_width2 > 0:
            canvas[:, clip1.w - visible_width2 :] = frame2[:, :visible_width2]
        return canvas

    # Create a new clip with the custom frame-making function.
    final_clip = editor.VideoClip(make_frame, duration=total_duration)
    final_clip = final_clip.set_audio(editor.AudioFileClip(self.concatenate_audioclips(clip1.filename, clip2.filename, clip1.duration - duration)))

    return final_clip

