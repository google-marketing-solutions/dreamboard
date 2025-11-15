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

export function getNewImageSettings() {
  const imageGenerationSettings: ImageGenerationSettings = {
    prompt: '',
    numImages: 2,
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

  return imageGenerationSettings;
}

export function initRefImage() {
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

export function getAspectRatiosByModelName(modelName: string) {
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

export function getOutputMimeTypes() {
  return [
    { displayName: 'PNG', value: 'image/png' },
    { displayName: 'JPG', value: 'image/jpeg' },
  ] as SelectItem[];
}

export function imageLanguages() {
  return [
    { displayName: 'English', value: 'en' },
    { displayName: 'Hindi', value: 'hi' },
    { displayName: 'Japanese', value: 'ja' },
    { displayName: 'Korean', value: 'ko' },
    { displayName: 'Automatic', value: 'auto' },
  ] as SelectItem[];
}

export function getSafetyFilterLevels() {
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

export function getPersonGenerationOptionsByModelName(modelName: string) {
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

export function getImageReferenceTypes() {
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

export function getImageSelectionTypeOptions(modelName: string): SelectItem[] {
  const imageSelectionTypeOtions: { [key: string]: SelectItem[] } = {
    'veo-3.0-generate-001': [
      {
        displayName: 'Reference Image',
        value: 'reference-image',
      },
    ],
    'veo-3.0-fast-generate-001': [
      {
        displayName: 'Reference Image',
        value: 'reference-image',
      },
    ],
    'veo-3.1-generate-preview': [
      {
        displayName: 'Reference Image',
        value: 'reference-image',
      },
      {
        displayName: 'First/Last Frame',
        value: 'first-last-frame',
      },
    ],
    'veo-3.1-fast-generate-preview': [
      {
        displayName: 'Reference Image',
        value: 'reference-image',
      },
      {
        displayName: 'First/Last Frame',
        value: 'first-last-frame',
      },
    ],
  };
  return imageSelectionTypeOtions[modelName];
}

export function getVideoModelNameOptions() {
  // TODO (ae) make this an API call later
  const modelNameOptions: SelectItem[] = [
    {
      displayName: 'Veo 3',
      value: 'veo-3.0-generate-001',
    },
    {
      displayName: 'Veo 3 Flash',
      value: 'veo-3.0-fast-generate-001',
    },
    {
      displayName: 'Veo 3.1',
      value: 'veo-3.1-generate-preview',
    },
    {
      displayName: 'Veo 3.1 Flash',
      value: 'veo-3.1-fast-generate-preview',
    },
  ];
  return modelNameOptions;
}

export function findSceneResponse(
  resps: ImageGenerationResponse[],
  scene: VideoScene
) {
  return resps.filter((resp: ImageGenerationResponse) => {
    console.log(
      'scene ids: ' +
        resp.scene_ids +
        ', segment Num: ' +
        resp.segment_number +
        ', scene num: ' +
        scene.number
    );
    // return resp.scene_ids === scene.id && resp.segment_number === scene.number;
    return resp.segment_number === scene.number;
  });
}

export function updateScenesWithGeneratedImages(
  resps: ImageGenerationResponse[],
  scenes: VideoScene[]
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
        const genImages: Image[] = response.images.map((image: ImageItem) => {
          const genImage: Image = {
            id: image.id,
            name: image.name,
            gcsUri: image.gcs_uri,
            signedUri: image.signed_uri,
            gcsFusePath: image.gcs_fuse_path,
            mimeType: image.mime_type,
          };
          return genImage;
        });
        // Append images to carrousel
        scene.imageGenerationSettings.generatedImages.push.apply(
          scene.imageGenerationSettings.generatedImages,
          genImages
        );
        // Select first generated image as selected image for video
        /*if (genImages.length > 0) {
          scene.imageGenerationSettings.selectedImageForVideo = genImages[0];
        }*/ // TODO (ae) Remove this!
        executionStatus['succeded'] = true;
        executionStatus[
          'execution_message'
        ] += `Images generated successfully! \n`;
      } else {
        executionStatus[
          'execution_message'
        ] += `ERROR: Image for scene: ${scene.number} was not generated. ${response.execution_message} \n`;
      }
    } else {
      executionStatus[
        'execution_message'
      ] += `ERROR: Scene ID ${scene.number} not found in backend responses. \n`;
    }
  });

  return executionStatus;
}
