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

import { ImageGenerationSettings } from './image-gen-models';
import { VideoGenerationSettings } from './video-gen-models';

export interface Scene {
  id: string;
  number: number;
  description: string;
  imagePrompt: string;
}

export interface SceneItem {
  id: string;
  number: number;
  description: string;
  image_prompt: string;
}

export interface VideoScene {
  id: string;
  number: number;
  description: string;
  imageGenerationSettings: ImageGenerationSettings;
  videoGenerationSettings: VideoGenerationSettings;
}

export interface ExportScenes {
  videoScenes: VideoScene[];
  replaceExistingScenesOnExport: boolean;
  generateInitialImageForScenes: boolean;
}

export interface SceneValidations {
  scenesWithNoGeneratedVideo: number[];
  invalidTextToVideoScenes: number[];
  invalidScenesCutVideoParams: number[];
  sceneVideosToGenerate: number[];
  sceneVideosToMerge: number[];
  invalidAssetSelection: number[];
}

/* Models for backend interactions */

export interface ScenesGenerationRequest {
  idea: string;
  brand_guidelines?: string;
  num_scenes: number;
}
