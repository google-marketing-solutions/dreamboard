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

import { Image, ImageItem, SeedImagesInfo } from './image-gen-models';

export interface VideosSelectionForVideoInfo {
  selectedVideoModelName: string; // Video model name dropdown selection to keep params separate from Images Selection UI
  selectedVideosForVideo: Video[]; // Video(s) used to extend another video
}

export interface VideoGenerationSettings {
  videoModelName: string;
  prompt: string;
  durationInSecs: number;
  aspectRatio?: string;
  framesPerSec?: number;
  personGeneration?: string;
  outputResolution?: string;
  sampleCount?: number;
  seed?: number;
  negativePrompt?: string;
  transition?: Transition;
  enhancePrompt: boolean;
  generateAudio: boolean;
  includeVideoSegment: boolean;
  regenerateVideo: boolean;
  cutVideo: boolean;
  startSeconds?: number;
  startFrame?: number;
  endSeconds?: number;
  endFrame?: number;
  generatedVideos: Video[];
  videosSelectionForVideoInfo: VideosSelectionForVideoInfo
  selectedVideoForMerge?: Video; // Video used for merge operation only
}

export interface Video {
  id: string;
  name: string;
  gcsUri: string;
  signedUri: string;
  gcsFusePath: string;
  mimeType: string;
  duration: number;
  frameUris?: Image[];
}

/* Models for backend interactions */

export interface VideoItem {
  id: string;
  name: string;
  gcs_uri: string;
  signed_uri: string;
  gcs_fuse_path: string;
  mime_type: string;
  duration: number;
  frames_uris: ImageItem[];
}

export enum Transition {
  X_FADE = 'X_FADE',
  WIPE = 'WIPE',
  ZOOM = 'ZOOM',
  ZOOM_WARP = 'ZOOM_WARP',
  DIP_TO_BLACK = 'DIP_TO_BLACK',
  CONCATENATE = 'CONCATENATE',
  BLUR = 'BLUR',
  SLIDE = 'SLIDE',
  SLIDE_WARP = 'SLIDE_WARP',
}

export interface VideoCreativeDirection {}

export interface SeedVideosInfo {
  seed_videos: VideoItem[];
}

export interface VideoSegmentRequest {
  scene_id: string;
  segment_number: number;
  video_model_name: string;
  prompt: string;
  seed_images_info?: SeedImagesInfo;
  duration_in_secs?: number;
  aspect_ratio?: string;
  frames_per_sec?: number;
  person_generation?: string;
  output_resolution?: string;
  sample_count?: number;
  seed?: number;
  negative_prompt?: string;
  transition?: Transition;
  generate_audio: boolean;
  enhance_prompt: boolean;
  use_last_frame: boolean;
  include_video_segment: boolean;
  generate_video_frames: boolean;
  regenerate_video_segment: boolean;
  cut_video: boolean;
  start_seconds?: number;
  start_frame?: number;
  end_seconds?: number;
  end_frame?: number;
  selected_video_for_merge?: VideoItem; // Video that will be used for the merge operation
  seed_videos_info?: SeedVideosInfo;
}

export interface VideoGenerationRequest {
  video_segments: VideoSegmentRequest[];
  creative_direction?: VideoCreativeDirection;
}

export interface VideoGenerationResponse {
  done: boolean;
  operation_name: string;
  execution_message: string;
  videos: VideoItem[];
  video_segment: VideoSegmentRequest;
}
