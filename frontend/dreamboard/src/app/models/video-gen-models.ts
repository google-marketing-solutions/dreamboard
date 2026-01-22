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

import { ImageItem } from './image-gen-models';

export interface VideoGenerationSettings {
  videoModel: string;
  videoGenTask: string;
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
  selectedVideoForMerge?: Video;
  selectedVideosForExtension: Video[];
}

export interface Video {
  id: string;
  name: string;
  gcsUri: string;
  signedUri: string;
  gcsFusePath: string;
  mimeType: string;
  duration: number;
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

export interface VideoSegmentGenerationOperation {
  scene_id: string;
  segment_number: number;
  video_model: string;
  video_gen_task: string;
  prompt: string;
  seed_images: ImageItem[];
  duration_in_secs?: number;
  aspect_ratio?: string;
  frames_per_sec?: number;
  person_generation?: string;
  output_resolution?: string;
  sample_count?: number;
  seed?: number;
  negative_prompt?: string;
  generate_audio: boolean;
  enhance_prompt: boolean;
  regenerate_video_segment: boolean;
  cut_video: boolean;
  start_seconds?: number;
  start_frame?: number;
  end_seconds?: number;
  end_frame?: number;
  selected_videos_for_extension: VideoItem[]; // Videos that will be used for the extension operation
}

export interface VideoSegmentMergeOperation {
  scene_id: string;
  segment_number: number;
  transition?: Transition;
  include_video_segment: boolean;
  selected_video_for_merge?: VideoItem; // Video that will be used for the merge operation
}

export interface VideoGenerationRequest {
  video_segments: VideoSegmentGenerationOperation[];
}

export interface VideoMergeRequest {
  video_segments: VideoSegmentMergeOperation[];
}

export interface VideoGenerationResponse {
  done: boolean;
  operation_name: string;
  execution_message: string;
  videos: VideoItem[];
  video_segment: VideoSegmentGenerationOperation;
}

export interface VideoMergeResponse {
  execution_message: string;
  videos: VideoItem[];
}
