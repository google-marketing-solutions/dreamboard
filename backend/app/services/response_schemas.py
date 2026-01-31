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

"""Module to define JSON response schemas for Gemini requests."""

RESPONSE_SCHEMAS = {
    "CREATE_STORIES": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                },
                "description": {
                    "type": "string",
                },
                "abcd_adherence": {
                    "type": "string",
                },
                "scenes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "number": {
                                "type": "integer",  # Scene number
                            },
                            "description": {
                                "type": ("string"),  # Textual description of the scene
                            },
                            "image_prompt": {
                                "type": ("string"),  # Prompt for generating an image
                            },
                            "video_prompt": {
                                "type": ("string"),  # Prompt for generating a video
                            },
                            "characters": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string",
                                        },
                                        "description": {
                                            "type": "string",
                                        },
                                    },
                                    "required": [
                                        "name",
                                        "description",
                                    ],
                                },
                            },
                        },
                        # Required fields for each scene object
                        "required": [
                            "description",
                            "image_prompt",
                            "video_prompt",
                            "characters",
                        ],
                    },
                },
            },
            "required": [
                "title",
                "description",
                "abcd_adherence",
                "scenes",
            ],
        },
    },
    "CREATE_STORIES_WITH_BRAND_GUIDELINES": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                },
                "description": {
                    "type": "string",
                },
                "brand_guidelines_adherence": {
                    "type": "string",
                },
                "abcd_adherence": {
                    "type": "string",
                },
                "scenes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "number": {
                                "type": "integer",  # Scene number
                            },
                            "description": {
                                "type": ("string"),  # Textual description of the scene
                            },
                            "image_prompt": {
                                "type": ("string"),  # Prompt for generating an image
                            },
                            "video_prompt": {
                                "type": ("string"),  # Prompt for generating a video
                            },
                            "characters": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string",
                                        },
                                        "description": {
                                            "type": "string",
                                        },
                                    },
                                    "required": [
                                        "name",
                                        "description",
                                    ],
                                },
                            },
                        },
                        # Required fields for each scene object
                        "required": [
                            "number",
                            "description",
                            "image_prompt",
                            "video_prompt",
                            "characters",
                        ],
                    },
                },
            },
            "required": [
                "title",
                "description",
                "brand_guidelines_adherence",
                "abcd_adherence",
                "scenes",
            ],
        },
    },
    # Schema for creating new scenes
    "CREATE_SCENES": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "number": {
                    "type": "integer",  # Scene number
                },
                "description": {
                    "type": "string",  # Textual description of the scene
                },
                "image_prompt": {
                    "type": "string",  # Prompt for generating an image
                },
                "video_prompt": {
                    "type": "string",  # Prompt for generating a video
                },
                "characters": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                            },
                            "description": {
                                "type": "string",
                            },
                        },
                        "required": [
                            "name",
                            "description",
                        ],
                    },
                },
            },
            # Required fields for each scene object
            "required": [
                "number",
                "description",
                "image_prompt",
                "video_prompt",
                "characters",
            ],
        },
    },
    # Schema for creating scenes with brand guideline alignment
    "CREATE_SCENES_WITH_BRAND_GUIDELINES": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "number": {
                    "type": "integer",  # Scene number
                },
                "description": {
                    "type": "string",  # Textual description of the scene
                },
                "image_prompt": {
                    "type": "string",  # Prompt for generating an image
                },
                "video_prompt": {
                    "type": "string",  # Prompt for generating a video
                },
                "characters": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                            },
                            "description": {
                                "type": "string",
                            },
                        },
                        "required": [
                            "name",
                            "description",
                        ],
                    },
                },
            },
            # Required fields for each scene object with brand guidelines
            "required": [
                "number",
                "description",
                "image_prompt",
                "video_prompt",
                "characters",
            ],
        },
    },
    # Schema for a simple text response
    "JUST_TEXT": {"type": "string"},
    # Schema to extract characters from stories
    "CHARACTERS_IN_STORY": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "scene_ids": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "scene_id": {
                                "type": "string",
                            },
                        },
                        "required": ["scene_id"],
                    },
                },
                "character_name": {
                    "type": "string",
                },
                "character_description": {
                    "type": "string",
                },
            },
        },
        # Required fields for each scene object with brand guidelines
        "required": [
            "scene_ids",
            "character_name",
            "character_description",
        ],
    },
}
