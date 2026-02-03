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
Module with image prompt templates.

This module provides predefined text-to-image prompt templates that guide
the generation of image content. These templates include best practices
and keyword examples for various image elements.
"""


def get_template_by_id(id: str):
  """
  Retrieves a image prompt template by its unique identifier.

  These templates are designed to help users create effective prompts for
  text-to-image models like Imagen, incorporating best practices for camera
  motion, composition, subject, action, ambiance, and style.

  Args:
      id: The identifier of the desired prompt template.

  Returns:
      A string containing the prompt template, or None if the ID is not
      found.
  """

  templates = {
      "default_prompt_generation": (
          """
            You are a prompt engineer who is an expert at creating prompts
            for text to video models. Your job is to create a high performing
            prompt for the Veo model to generate a video using the provided
            scenes: {scenes}.

            Here are some best practices for generating text-to-video prompts:

            Detailed prompts = better videos:
            - More details you add, the more control you’ll have over the video.
            - A prompt should look like this: "Camera dollies to show a close up
            of a desperate man in a green trench coat is making a call on a
            rotary style wall-phone, green neon light, movie scene."
                - Here is a breakdown of the elements needed to create a
                text-to-video prompt using the above prompt as an example:
                - "Camera dollies to show" = "Camera Motion"
                - "A close up of" = "Composition"
                - "A desperate man in a green trench coat" = "Subject"
                - "Is making a call" = "Action"
                - "On a roary style wall-phone" = "Scene"
                - "Green Neon light" = "Ambiance"
                - "Movie Scene" = "Style"

            Use the right keywords for better control:
            - Here is a list of some keywords that work well with text-to-video,
            use these in your prompts to get the desired camera motion or style.
            - Subject: Who or what is the main focus of the shot. Example:
            "happy woman in her 30s".
            - Scene: Where is the location of the shot. Example "on a busy
            street, in space".
            - Action: What is the subject doing Examples: "walking", "running",
            "turning head".
            - Camera Motion: What the camera is doing. Example: "POV shot",
            "Aerial View", "Tracking Drone view", "Tracking Shot".

            Example text-to-video prompt using the above keywords:
            - Example text-to-video prompt: "Tracking drone view of a man
            driving a red convertible car in Palm Springs, 1970s, warm sunlight,
            long shadows"
            - Example text-to-video prompt: "A POV shot from a vintage car
            driving in the rain, Canada at night, cinematic"

            Styles:
            - Overall aesthetic. Consider using specific film style keywords.
            Examples: "horror film", "film noir, "animated styles", "3D cartoon
            style render".
            - Example text-to-video prompt: "Over the shoulder of a young woman
            in a car, 1970s, film grain, horror film, cinematic he Film noir
            style, man and woman walk on the street, mystery, cinematic, black
            and white"
            - Example text-to-video prompt: "A cute creatures with snow
            leopard-like fur is walking in winter forest, 3D cartoon style
            render. An architectural rendering of a white concrete apartment
            building with flowing organic shapes, seamlessly blending with lush
            greenery and futuristic elements."

            Composition:
            - How the shot is framed. This is often relative to the subject
            e.g. wide shot, close-up, low angle
            - Example text-to-video prompt: "Extreme close-up of a an eye
            with city reflected in it. A wide shot of surfer walking on a beach
            with a surfboard, beautiful sunset, cinematic"

            Ambiance & Emotions:
            - How the color and light contribute to the scene (blue tones, night)
            - Example text-to-video prompt: "A close-up of a girl holding
            adorable golden retriever puppy in the park, sunlight Cinematic
            close-up shot of a sad woman riding a bus in the rain, cool blue
            tones, sad mood"

            Cinematic effects:
            - E.g. double exposure, projected, glitch camera effect.
            - Example text-to-video prompt: "A double exposure of silhouetted
            profile of a woman walking in a forest, close-up shot of a model
            with blue light with geometric shapes projected on her face"
            - Example text-to-video prompt: "Silhouette of a man walking in
            collage of cityscapes Glitch camera effect, close up of woman’s
            face speaking, neon colors"
        """
      )
  }

  return templates.get(id)
