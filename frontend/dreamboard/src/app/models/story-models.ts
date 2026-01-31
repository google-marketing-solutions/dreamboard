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

import { Scene, SceneItem } from './scene-models';
import { VideoScene } from './scene-models';
import { Video } from './video-gen-models';

export interface Story {
  id: string;
  title: string;
  description: string;
  brandGuidelinesAdherence: string;
  abcdAdherence: string;
  scenes: Scene[];
}

export interface VideoStory {
  id: string;
  title: string;
  description: string;
  brandGuidelinesAdherence: string;
  abcdAdherence: string;
  scenes: VideoScene[];
  generatedVideos: Video[];
  owner: string;
  shareWith: string[];
}

export interface ExportStory {
  story: VideoStory;
  replaceExistingStoryOnExport: boolean;
  generateInitialImageForScenes: boolean;
}

/* Models for backend interactions */

export interface StoriesGenerationRequest {
  num_stories: number;
  creative_brief_idea: string;
  target_audience: string;
  brand_guidelines?: string;
  video_format: string;
  num_scenes: number;
  extract_characters: boolean
}

export interface StoryItem {
  id: string;
  title: string;
  description: string;
  brand_guidelines_adherence: string;
  abcd_adherence: string;
  scenes: SceneItem[];
}

export interface ExtractTextItem {
  file_gcs_uri: string;
  file_type: string;
}
