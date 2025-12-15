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

/**
 * Validates the current state of all video scenes for various conditions
 * necessary for video generation and merging.
 * It checks for:
 * - Scenes without a selected generated video (for merging).
 * - Scenes requiring a text prompt for video generation (text-to-video).
 * - Scenes explicitly marked for video generation in bulk.
 * - Scenes explicitly marked for inclusion in the final merged video.
 * @returns {SceneValidations} An object containing arrays of scene numbers
 * for each validation category.
 */

import { SceneValidations } from './models/scene-models';
import { VideoStory } from './models/story-models';
import { VideoScene } from './models/scene-models';

/**
 * Checks if a video has been successfully generated and selected for a given scene.
 * This is crucial for determining if a scene is ready for video merging.
 * @param {VideoScene} scene - The video scene to check.
 * @returns {boolean} `true` if generated videos exist and one is selected; `false` otherwise.
 */
export function isVideoGenerated(scene: VideoScene): boolean {
  return (
    scene.videoGenerationSettings.generatedVideos.length > 0 &&
    scene.videoGenerationSettings.selectedVideoForMerge !== undefined
  );
}

export function validateScenes(story: VideoStory): SceneValidations {
  let validations: SceneValidations = {
    scenesWithNoGeneratedVideo: [],
    invalidTextToVideoScenes: [],
    invalidScenesCutVideoParams: [],
    sceneVideosToGenerate: [],
    sceneVideosToMerge: [],
  };
  story.scenes.forEach(async (scene: VideoScene) => {
    // Check if videos are generated and one is selected for merge
    if (
      !isVideoGenerated(scene) &&
      scene.videoGenerationSettings.includeVideoSegment
    ) {
      validations['scenesWithNoGeneratedVideo'].push(scene.number);
    }
    // Check prompt required
    if (
      scene.imageGenerationSettings.imagesSelectionForVideoInfo
        .selectedImagesForVideo.length === 0 &&
      !scene.videoGenerationSettings.prompt
    ) {
      // Prompt is required for Text to Video
      validations['invalidTextToVideoScenes'].push(scene.number);
    }
    // Check valid cut params for merge operation (invalidScenesCutVideoParams)
    if (
      scene.videoGenerationSettings.selectedVideoForMerge &&
      scene.videoGenerationSettings.cutVideo
    ) {
      if (scene.videoGenerationSettings.selectedVideoForMerge) {
        const videoDuration =
          scene.videoGenerationSettings.selectedVideoForMerge.duration;
        const cutStartSeconds = scene.videoGenerationSettings.startSeconds;
        const cutEndSeconds = scene.videoGenerationSettings.endSeconds;
        const cutStartFrame = scene.videoGenerationSettings.startFrame;
        const cutEndFrame = scene.videoGenerationSettings.endFrame;
        const DEFAUL_FPS = 24;

        // Validate start/end seconds. Using direct validation instead of cutStartSeconds!
        // since 0 is a valid number
        if (
          cutStartSeconds === null ||
          cutStartSeconds === undefined ||
          cutEndSeconds === null ||
          cutEndSeconds === undefined
        ) {
          validations['invalidScenesCutVideoParams'].push(scene.number);
          return;
        } else {
          // NOTE: For now don't validate videoDuration value since there
          // might be old stories without this field
          if (
            videoDuration !== undefined &&
            videoDuration !== null &&
            (cutStartSeconds > videoDuration || cutStartSeconds < 0)
          ) {
            validations['invalidScenesCutVideoParams'].push(scene.number);
            return;
          }
          // NOTE: For now don't validate videoDuration value since there
          // might be old stories without this field
          if (
            videoDuration !== undefined &&
            videoDuration !== null &&
            (cutEndSeconds > videoDuration || cutEndSeconds < 0)
          ) {
            validations['invalidScenesCutVideoParams'].push(scene.number);
            return;
          }
        }

        // Validate start/end frames, using direct validation instead of cutStartFrame!
        // since 0 is a valid number
        if (
          cutStartFrame === null ||
          cutStartFrame === undefined ||
          cutEndFrame === null ||
          cutEndFrame === undefined
        ) {
          validations['invalidScenesCutVideoParams'].push(scene.number);
          return;
        } else {
          if (cutStartFrame > DEFAUL_FPS || cutStartFrame < 0) {
            validations['invalidScenesCutVideoParams'].push(scene.number);
            return;
          }
          if (cutEndFrame > DEFAUL_FPS || cutEndFrame < 0) {
            validations['invalidScenesCutVideoParams'].push(scene.number);
            return;
          }
        }
      }
    }

    // Check scenes whose video will be generated
    if (scene.videoGenerationSettings.regenerateVideo) {
      validations['sceneVideosToGenerate'].push(scene.number);
    }
    // Check scenes to include in final video
    if (scene.videoGenerationSettings.includeVideoSegment) {
      validations['sceneVideosToMerge'].push(scene.number);
    }
  });

  return validations;
}
