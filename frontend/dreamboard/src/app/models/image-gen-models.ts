/***************************************************************************
 *
 *  Copyright 2025 Google Inc.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  Note that these code samples being shared are not official Google
 *  products and are not formally supported.
 *
 ***************************************************************************/

export interface Image {
  id: string;
  name: string;
  gcsUri: string;
  signedUri: string;
  gcsFusePath: string;
  mimeType: string;
}

export interface ImageReference extends Image {
  referenceId?: number;
  referenceType: string; // Image reference flag.
  referenceSubType: string; // Secondary flag (e.g. Subject Person, Subject animal).
  description?: string;
  maskMode?: string;
  maskDilation?: number;
  segmentationClasses?: number[];
  enableControlImageComputation?: boolean;
}

export interface ImageGenerationSettings {
  prompt: string;
  numImages: number;
  aspectRatio?: string;
  outputMimeType?: string;
  compressionQuality?: number;
  language?: string;
  safetyFilterLevel?: string;
  personGeneration?: string;
  seed?: number;
  negativePrompt?: string;
  selectedImagesForVideo: Image[]; // Images used to generate the video
  referenceImages?: ImageReference[]; // Image used to generate new images with AI, if selected, can also be used to generate the video
  generatedImages: Image[]; // Contains AI generated images and reference images
  useReferenceImageForImage?: boolean;
  editMode?: string;
}

/* Models for backend interactions */

export interface ImageCreativeDirection {
  aspect_ratio: string;
  model?: string;
  number_of_images: number;
  output_mime_type: string;
  person_generation: string;
  safety_filter_level: string;
  output_gcs_uri?: string[];
  language: string;
  output_compression_quality: number;
  negative_prompt?: string;
  enhance_prompt?: boolean;
  seed?: number;
  // add_watermark: boolean;
}

export interface ReferenceImageCard {
  id: string;
}

/* Models for backend interactions */

export interface ImageItem {
  id: string;
  name: string;
  gcs_uri: string;
  signed_uri: string;
  gcs_fuse_path: string;
  mime_type: string;
}

export interface ImageReferenceItem extends ImageItem {
  reference_id: number;
  reference_type: string; // Image reference flag.
  reference_subtype?: string; // Secondary flag (e.g. Subject Person, Subject animal).
  description?: string;
  mask_mode?: string;
  mask_dilation?: number;
  segmentation_classes?: number[];
  enable_control_image_computation?: boolean;
}

export interface ImageSceneRequest {
  id: string;
  img_prompt: string;
  image_uri?: string[];
  /*scene_id?: string[];*/
  creative_dir?: ImageCreativeDirection;
  image_content_type?: string;
  reference_images?: ImageReferenceItem[];
  use_reference_image_for_image?: boolean;
  edit_mode?: string;
}

export interface ImageSceneCreativeDirection {
  numImages: number;
  resolution: string;
  aspectRatio: string;
}

export interface SceneSegment {
  default_images: string[];
  imageScene: string;
  imagePrompt: string;
  imageSelected: string;
  creativeDirection: ImageSceneCreativeDirection;
}

export interface ImageSceneSegments {
  scenes: ImageSceneRequest[];
}

export interface ImageGenerationRequest {
  scenes: ImageSceneRequest[];
}

export interface ImageGenerationResponse {
  scene_id: string;
  done: boolean;
  operation_name: string;
  execution_message: string;
  images: ImageItem[];
}
