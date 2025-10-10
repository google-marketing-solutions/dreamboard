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

import {
  VideoGenerationResponse,
  VideoGenerationSettings,
  VideoItem,
} from './models/video-gen-models';
import { SelectItem } from './models/settings-models';
import { Video } from './models/video-gen-models';
import { VideoScene } from './models/scene-models';
import { getNewImageSettings } from './image-utils';
import { v4 as uuidv4 } from 'uuid';

export const VIDEO_MODEL_NAME = 'veo-2.0-generate-001';
export const VIDEO_MODEL_MAX_LENGTH = 8;

export function getNewVideoScene(existingScenesLen: number) {
  return {
    id: uuidv4(),
    number: existingScenesLen + 1,
    description: `Your scene description goes here.`,
    imageGenerationSettings: getNewImageSettings(),
    videoGenerationSettings: getNewVideoSettings(),
    transition: undefined,
  } as VideoScene;
}

export function getNewVideoSettings(): VideoGenerationSettings {
  const newVideoGenSettings: VideoGenerationSettings = {
    prompt: '',
    durationInSecs: 4,
    aspectRatio: '16:9',
    framesPerSec: 24,
    personGeneration: 'allow_adult',
    outputResolution: '1080p',
    sampleCount: 2,
    seed: 0,
    negativePrompt: '',
    transition: undefined,
    enhancePrompt: true,
    generateAudio: true,
    includeVideoSegment: true,
    regenerateVideo: true,
    cutVideo: false,
    startSeconds: 0,
    startFrame: 0,
    endSeconds: 7,
    endFrame: 23,
    generatedVideos: [], // empty for new scene
    selectedVideo: undefined,
  };

  return newVideoGenSettings;
}

export function getAspectRatios() {
  return [
    {
      displayName: '16:9',
      value: '16:9',
    },
    {
      displayName: '9:16',
      value: '9:16',
    },
  ] as SelectItem[];
}

export function getPersonGenerationOptions() {
  return [
    {
      displayName: 'Disallow',
      value: 'disallow',
    },
    {
      displayName: 'Allow Adult',
      value: 'allow_adult',
    },
  ] as SelectItem[];
}

export function getFramesPerSecondOptions() {
  return [
    {
      displayName: '24',
      value: '24',
    },
  ] as SelectItem[];
}

export function getOutputResolutionOptions() {
  return [
    {
      displayName: '720p',
      value: '720p',
    },
    {
      displayName: '1080p',
      value: '1080p',
    },
  ] as SelectItem[];
}

export function findSceneResponse(
  resps: VideoGenerationResponse[],
  scene: VideoScene
) {
  return resps.filter((resp: VideoGenerationResponse) => {
    return (
      resp.video_segment.scene_id === scene.id &&
      resp.video_segment.segment_number === scene.number
    );
  });
}

export function updateScenesWithGeneratedVideos(
  resps: VideoGenerationResponse[],
  scenes: VideoScene[]
) {
  let executionStatus = {
    succeded: false,
    execution_message: '',
  };
  scenes.forEach((scene: VideoScene) => {
    const respsFound = findSceneResponse(resps, scene);
    // Update scenes with generated videos
    if (respsFound.length) {
      const response = respsFound[0];
      // Reload video in the Scene Builder HTML element to update it
      // since reload does not happen when the object is updated
      const videoHTML: any = document.getElementById(`video@${scene.id}`);
      if (videoHTML) {
        videoHTML.load();
      }
      if (response.done) {
        // For only 1 video per request is generated
        const genVideos: Video[] = response.videos.map((video: VideoItem) => {
          const vid: Video = {
            id: video.id,
            name: video.name,
            gcsUri: video.gcs_uri,
            signedUri: video.signed_uri,
            gcsFusePath: video.gcs_fuse_path,
            mimeType: video.mime_type,
            duration: video.duration
          };
          return vid;
        });
        // Add new videos
        scene.videoGenerationSettings.generatedVideos.push.apply(
          scene.videoGenerationSettings.generatedVideos,
          genVideos
        );
        // Select first generated video as selected image for video
        if (genVideos.length > 0) {
          scene.videoGenerationSettings.selectedVideo = genVideos[0];
        }
        executionStatus['succeded'] = true;
        executionStatus[
          'execution_message'
        ] += `Videos for scene ${scene.number} generated successfully! \n`;
      } else {
        executionStatus[
          'execution_message'
        ] += `Video for scene: ${scene.number} was not generated. ${response.execution_message} \n`;
      }
    } else {
      executionStatus[
        'execution_message'
      ] += `Video for scene ${scene.number} not processed. 'The 'Regenerate video in bulk generation' option might be disabled. \n`;
    }
  });

  return executionStatus;
}

export function getVideoTransitions() {
  return [
    {
      displayName: 'Fade',
      value: 'X_FADE',
    },
    {
      displayName: 'Wipe',
      value: 'WIPE',
    },
    /* COMMENTED OUT FOR NOW {
      displayName: 'Zoom',
      value: 'ZOOM',
    },
    {
      displayName: 'Zoom Warp',
      value: 'ZOOM_WARP',
    },*/
    {
      displayName: 'Dip To Black',
      value: 'DIP_TO_BLACK',
    },
    {
      displayName: 'Concatenate',
      value: 'CONCATENATE',
    },
    {
      displayName: 'Blur',
      value: 'BLUR',
    },
    {
      displayName: 'Slide',
      value: 'SLIDE',
    },
    {
      displayName: 'Slide Warp',
      value: 'SLIDE_WARP',
    },
  ];
}

export function parseVideoGenerationErrors(error: any) {
  let errorMsg = '';
  if (error.hasOwnProperty('error') && error.error.hasOwnProperty('detail')) {
    error.error.detail.forEach((d: any) => {
      errorMsg += `${d.msg} \n`;
    });
  } else {
    errorMsg = `There was an error. ${error}`;
  }

  return errorMsg;
}

export function getVideoFormats() {
  return [
    {
      displayName: 'Shorts',
      value: 'shorts',
      field1: 60, // length of the format
    },
    {
      displayName: 'Skippable In-Stream',
      value: 'skippable_in_stream',
      field1: 20, // length of the format
    },
    {
      displayName: 'Non Skippable In-Stream',
      value: 'non_skippable_in_stream',
      field1: 20, // length of the format
    },
    {
      displayName: 'Bumper',
      value: 'bumper',
      field1: 6, // length of the format
    },
    {
      displayName: 'Other',
      value: 'other',
      field1: 6, // length of the format
    },
  ];
}
