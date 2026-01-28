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
  Image,
  ImageItem,
  ImageGenerationResponse,
  ImageGenerationSettings,
} from './models/image-gen-models';
import { SelectItem } from './models/settings-models';
import { VideoScene } from './models/scene-models';

export const IMAGE_MODEL_NAME = 'imagen-3.0-generate-001';

export function getNewImageSettings(): ImageGenerationSettings {
  const imageGenSettings = {
    prompt: '',
    numImages: 4,
    aspectRatio: '16:9',
    outputMimeType: 'image/png',
    compressionQuality: 75,
    language: 'en',
    safetyFilterLevel: 'block_only_high',
    personGeneration: 'allow_all',
    seed: -1,
    negativePrompt: '',
    selectedImagesForVideo: [],
    referenceImages: [],
    generatedImages: [],
  };
  return imageGenSettings;
}

export function initRefImage(): Image {
  const img: Image = {
    id: '',
    name: '',
    gcsUri: '',
    signedUri: '',
    gcsFusePath: '',
    mimeType: '',
  };
  return img;
}

export function getAspectRatiosByModelName(modelName: string): SelectItem[] {
  const imageAspectRatios: { [key: string]: SelectItem[] } = {
    'imagen-3.0-generate-001': [
      {
        displayName: '16:9',
        value: '16:9',
      },
      {
        displayName: '9:16',
        value: '9:16',
      },
      {
        displayName: '1:1',
        value: '1:1',
      },
      {
        displayName: '3:4',
        value: '3:4',
      },
    ],
  };

  return imageAspectRatios[modelName];
}

export function getOutputMimeTypes(): SelectItem[] {
  return [
    { displayName: 'PNG', value: 'image/png' },
    { displayName: 'JPG', value: 'image/jpeg' },
  ] as SelectItem[];
}

export function imageLanguages(): SelectItem[] {
  return [
    { displayName: 'English', value: 'en' },
    { displayName: 'Hindi', value: 'hi' },
    { displayName: 'Japanese', value: 'ja' },
    { displayName: 'Korean', value: 'ko' },
    { displayName: 'Automatic', value: 'auto' },
  ] as SelectItem[];
}

export function getSafetyFilterLevels(): SelectItem[] {
  const safetyFilters: SelectItem[] = [
    {
      displayName: 'Block Low and Above',
      value: 'block_low_and_above',
    },
    {
      displayName: 'Block Medium and Above',
      value: 'block_medium_and_above',
    },
    {
      displayName: 'Block Only High',
      value: 'block_only_high',
    },
    {
      displayName: 'Block None',
      value: 'block_none',
    },
  ];

  return safetyFilters;
}

export function getPersonGenerationOptionsByModelName(
  modelName: string,
): SelectItem[] {
  const personGenerationOptions: { [key: string]: SelectItem[] } = {
    'imagen-3.0-generate-001': [
      {
        displayName: 'Do Not Allow',
        value: 'dont_allow',
      },
      {
        displayName: 'Allow Adult',
        value: 'allow_adult',
      },
      {
        displayName: 'Allow All',
        value: 'allow_all',
      },
    ],
  };

  return personGenerationOptions[modelName];
}

export function getImageReferenceTypes(): SelectItem[] {
  const imageReferenceTypes: SelectItem[] = [
    {
      displayName: 'Subject - Default',
      value: 'subject-SUBJECT_TYPE_DEFAULT',
    },
    {
      displayName: 'Subject - Person',
      value: 'subject-SUBJECT_TYPE_PERSON',
    },
    {
      displayName: 'Subject - Product',
      value: 'subject-SUBJECT_TYPE_PRODUCT',
    },
    {
      displayName: 'Subject - Animal',
      value: 'subject-SUBJECT_TYPE_ANIMAL',
    },
    {
      displayName: 'Style',
      value: 'style',
    },
  ];

  return imageReferenceTypes;
}

export function findSceneResponse(
  resps: ImageGenerationResponse[],
  scene: VideoScene,
) {
  return resps.filter((resp: ImageGenerationResponse) => {
    return resp.scene_id === scene.id;
  });
}

export function updateScenesWithGeneratedImages(
  resps: ImageGenerationResponse[],
  scenes: VideoScene[],
) {
  let executionStatus = {
    succeded: false,
    execution_message: '',
  };
  scenes.forEach((scene: VideoScene) => {
    const respsFound = findSceneResponse(resps, scene);
    // Update scenes with generated images.
    if (respsFound.length) {
      const response = respsFound[0];
      if (response.done) {
        // Setup the images used.
        const genImages: Image[] = response.images.map(
          (imageItem: ImageItem) => {
            const image: Image = {
              id: imageItem.id,
              name: imageItem.name,
              gcsUri: imageItem.gcs_uri,
              signedUri: imageItem.signed_uri,
              gcsFusePath: imageItem.gcs_fuse_path,
              mimeType: imageItem.mime_type,
            };
            return image;
          },
        );
        // Append images to carrousel
        scene.imageGenerationSettings.generatedImages.push.apply(
          scene.imageGenerationSettings.generatedImages,
          genImages,
        );
        executionStatus['succeded'] = true;
        executionStatus['execution_message'] +=
          `Images generated successfully! \n`;
      } else {
        executionStatus['execution_message'] +=
          `ERROR: Image for scene: ${scene.number} was not generated. ${response.execution_message} \n`;
      }
    } else {
      executionStatus['execution_message'] +=
        `ERROR: Scene ID ${scene.number} not found in backend responses. \n`;
    }
  });

  return executionStatus;
}
