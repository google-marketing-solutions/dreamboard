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
 * @fileoverview This component orchestrates the creation and management of video scenes for a story.
 * It provides functionality to add, edit, and remove scenes, trigger bulk image and video generation,
 * and manage transitions between scenes. It interacts with various services and dialogs to configure
 * scene-specific settings and handle API responses.
 */

import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VideoScene } from '../../models/scene-models';
import {
  VideoGenerationRequest,
  VideoSegmentRequest,
  VideoGenerationResponse,
  VideoItem,
  Video,
  Transition,
} from '../../models/video-gen-models';
import { ExportStory } from '../../models/story-models';
import {
  ImageItem,
  ImageSceneRequest,
  ImageGenerationRequest,
  ImageCreativeDirection,
  ImageGenerationResponse,
} from '../../models/image-gen-models';
import { openSnackBar } from '../../utils';
import { SceneValidations } from '../../models/scene-models';
import { VideoStory } from '../../models/story-models';
import { VideoGenerationService } from '../../services/video-generation.service';
import { ImageGenerationService } from '../../services/image-generation.service';
import {
  updateScenesWithGeneratedVideos,
  getNewVideoScene,
} from '../../video-utils';
import { getNewVideoStory } from '../../story-utils';
import { updateScenesWithGeneratedImages } from '../../image-utils';
import { v4 as uuidv4 } from 'uuid';
import { HttpResponse } from '@angular/common/http';
import { SceneSettingsDialogComponent } from '../scene-settings-dialog/scene-settings-dialog.component';
import { TransitionsSettingsDialogComponent } from '../transitions-settings-dialog/transitions-settings-dialog.component';
import { ComponentsCommunicationService } from '../../services/components-communication.service';

@Component({
  selector: 'app-scene-builder',
  imports: [MatButtonModule, MatIconModule, MatCardModule, MatTabsModule],
  templateUrl: './scene-builder.component.html',
  styleUrl: './scene-builder.component.css',
})
export class SceneBuilderComponent {
  story: VideoStory = getNewVideoStory();
  sceneSettingsDialog = inject(MatDialog);
  creativeDirectionSettingsDialog = inject(MatDialog);
  //scenes: VideoScene[] = [];
  exportingScenes: boolean = false;
  private _snackBar = inject(MatSnackBar);

  constructor(
    private videoGenerationService: VideoGenerationService,
    private imageGenerationService: ImageGenerationService,
    private componentsCommunicationService: ComponentsCommunicationService
  ) {
    componentsCommunicationService.storyExportedSource$.subscribe(
      (exportStory: ExportStory) => {
        this.story = exportStory.story;
        this.exportingScenes = true;
        if (exportStory.replaceExistingStoryOnExport) {
          if (exportStory.generateInitialImageForScenes) {
            this.generateImagesFromScenes(true, exportStory.story.scenes);
          } else {
            openSnackBar(this._snackBar, 'Scenes exported successfully!', 5);
            this.exportingScenes = false;
          }
        } else {
          // TODO (ae) remove?
        }
      }
    );
  }

  loadStory() {
    this.story = {
      "id": "6bc870a2-aaf3-4d36-96e5-06841701a0c2",
      "title": "New Story",
      "description": "This is a new story",
      "abcdAdherence": "",
      "scenes": [
        {
          "id": "4970477e-7588-4da2-91fe-848aa6522397",
          "number": 1,
          "description": "A young man with neatly braided hair, wearing a casual, light pink button-up shirt with rolled-up sleeves, is seated at a desk in a modern, open-plan office. He's actively typing on a black computer keyboard, looking at a monitor displaying charts and graphs. His expression is subtly bored or perhaps a bit weary. The office background is bustling with other busy employees, warm lighting, and contemporary decor. The camera then slightly shifts or cuts to a close-up of a wooden-framed picture on his desk, revealing an endearing photo of a sad-looking basset hound. A subtle \\'boing\\' sound accompanies the shift, perhaps signifying an idea dawning.",
          "imageGenerationSettings": {
            "prompt": "A young man with neatly braided hair, wearing a casual, light pink button-up shirt with rolled-up sleeves, is seated at a desk in a modern, open-plan office. He's actively typing on a black computer keyboard, looking at a monitor displaying charts and graphs. His expression is subtly bored or perhaps a bit weary. The office background is bustling with other busy employees, warm lighting, and contemporary decor.",
            "numImages": 4,
            "aspectRatio": "1:1",
            "outputMimeType": "image/png",
            "compressionQuality": 75,
            "language": "en",
            "safetyFilterLevel": "block_only_high",
            "personGeneration": "allow_all",
            "seed": -1,
            "negativePrompt": "",
            "selectedImageForVideo": {
              "id": "1",
              "name": "1750805584177/sample_1.png",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_1.png",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_1.png",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750805584177/sample_1.png",
              "mimeType": "image/png"
            },
            "referenceImages": [],
            "generatedImages": [
              {
                "id": "1",
                "name": "1750805418304/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805418304/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805418304/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750805418304/sample_0.png",
                "mimeType": "image/png"
              },
              {
                "id": "2",
                "name": "1750805418304/sample_1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805418304/sample_1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805418304/sample_1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750805418304/sample_1.png",
                "mimeType": "image/png"
              },
              {
                "id": "3",
                "name": "1750805418304/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805418304/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805418304/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750805418304/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "4",
                "name": "1750805418304/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805418304/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805418304/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750805418304/sample_3.png",
                "mimeType": "image/png"
              },
              {
                "id": "5",
                "name": "1750805584177/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750805584177/sample_0.png",
                "mimeType": "image/png"
              },
              {
                "id": "6",
                "name": "1750805584177/sample_1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750805584177/sample_1.png",
                "mimeType": "image/png"
              },
              {
                "id": "7",
                "name": "1750805584177/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750805584177/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "8",
                "name": "1750805584177/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1/1750805584177/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750805584177/sample_3.png",
                "mimeType": "image/png"
              }
            ]
          },
          "videoGenerationSettings": {
            "prompt": "A continuous shot starting with a focus on a young man with braided hair typing wearily at his desk in an open-plan office. He slowly lifts his head from the screen, his expression shifting from boredom to a subtle thought. The camera then smoothly pans or cuts to a close-up of a framed photo on his desk showing a clearly saddened basset hound dog. The overall lighting is bright and suggestive of a busy workday.",
            "durationInSecs": 8,
            "aspectRatio": "16:9",
            "framesPerSec": 24,
            "personGeneration": "allow_adult",
            "sampleCount": 2,
            "seed": 0,
            "negativePrompt": "",
            "transition": Transition.CONCATENATE,
            "enhancePrompt": true,
            "generateAudio": true,
            "includeVideoSegment": true,
            "regenerateVideo": true,
            "generatedVideos": [
              {
                "name": "4596609569357781547/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/1/4596609569357781547/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/1/4596609569357781547/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4596609569357781547/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "4596609569357781547/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/1/4596609569357781547/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/1/4596609569357781547/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4596609569357781547/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              }
            ],
            "selectedVideo": {
              "name": "4596609569357781547/sample_1.mp4",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/1/4596609569357781547/sample_1.mp4",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/1/4596609569357781547/sample_1.mp4",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4596609569357781547/sample_1.mp4",
              "mimeType": "video/mp4",
              "frameUris": []
            }
          }
        },
        {
          "id": "f4bd4bc1-3418-4d63-bf09-62bb0603cccb",
          "number": 2,
          "description": "The scene cuts to a close-up of a person's hand, likely the same man, navigating the \\'DashPass\\' app on a smartphone. The screen clearly shows an item labeled \\'Dog Toy\\' priced at \\'$16.99\\'' with \\'$0.00 delivery fee.\\' The hand taps \\'Add to Cart.\\' And the man keeps searching for other Pet toy items. ",
          "imageGenerationSettings": {
            "prompt": "Extreme close-up, high-angle shot of man [1] wearing a casual, light pink button-up shirt with rolled-up sleeves with his hand clearly visible holding a modern smartphone [2]. The man's [1] fingers are poised over the screen, specifically tapping the \\'Add to Cart\\' button within the \\'DashPass\\' app interface in [2]. The smartphone [2] screen is clearly visible and in sharp focus, displaying a \\'Dog Toy\\' item at \\'$16.99\\' with \\'$0.00 delivery fee.\\' and the DoorDash logo. The app's UI elements are crisp and legible. Soft, diffused overhead lighting, shallow depth of field, photo-realistic, 8K, professional product photography style. It is only 1 man, the same man and only the man's back and his hands are visible. Phone has to be strictly [2]",
            "numImages": 4,
            "aspectRatio": "1:1",
            "outputMimeType": "image/png",
            "compressionQuality": 75,
            "language": "en",
            "safetyFilterLevel": "block_only_high",
            "personGeneration": "allow_all",
            "seed": -1,
            "negativePrompt": "",
            "selectedImageForVideo": {
              "id": "cf94fd89-8386-4c8c-84e3-a900b3e98c80",
              "name": "scene2.png",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene2.png",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene2.png",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images",
              "mimeType": "image/png"
            },
            "referenceImages": [
              {
                "id": "6352bc81-1bd6-4c4b-a7e3-d1a5ff7dfd68",
                "name": "scene1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images",
                "mimeType": "image/png",
                referenceType: '',
                referenceSubType: ''
              },
              {
                "id": "a1b031a7-8504-4eec-b06b-497fe1a7555e",
                "name": "scene2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images",
                "mimeType": "image/png",
                referenceType: '',
                referenceSubType: ''
              }
            ],
            "generatedImages": [
              {
                "id": "f7cb704b-7a6f-43d4-ac28-4829c3aa5437",
                "name": "scene1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images",
                "mimeType": "image/png"
              },
              {
                "id": "17",
                "name": "1750806677037/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806677037/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806677037/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806677037/sample_0.png",
                "mimeType": "image/png"
              },
             
              {
                "id": "20",
                "name": "1750806677037/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806677037/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806677037/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806677037/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "21",
                "name": "1750806677037/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806677037/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806677037/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806677037/sample_3.png",
                "mimeType": "image/png"
              },
              {
                "id": "22",
                "name": "1750806795544/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806795544/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806795544/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806795544/sample_0.png",
                "mimeType": "image/png"
              },
              {
                "id": "23",
                "name": "1750806795544/sample_1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806795544/sample_1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806795544/sample_1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806795544/sample_1.png",
                "mimeType": "image/png"
              },
              {
                "id": "24",
                "name": "1750806795544/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806795544/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806795544/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806795544/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "25",
                "name": "1750806795544/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806795544/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806795544/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806795544/sample_3.png",
                "mimeType": "image/png"
              },
              {
                "id": "26",
                "name": "1750806910524/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806910524/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806910524/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806910524/sample_0.png",
                "mimeType": "image/png"
              },
              {
                "id": "27",
                "name": "1750806910524/sample_1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806910524/sample_1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806910524/sample_1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806910524/sample_1.png",
                "mimeType": "image/png"
              },
              {

                "id": "28",
                "name": "1750806910524/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806910524/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806910524/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806910524/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "29",
                "name": "1750806910524/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806910524/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750806910524/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750806910524/sample_3.png",
                "mimeType": "image/png"
              },
              {
                "id": "30",
                "name": "1750807036090/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750807036090/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750807036090/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750807036090/sample_0.png",
                "mimeType": "image/png"
              },
              {
                "id": "31",
                "name": "1750807036090/sample_1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750807036090/sample_1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750807036090/sample_1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750807036090/sample_1.png",
                "mimeType": "image/png"
              },
              {
                "id": "32",
                "name": "1750807036090/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750807036090/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750807036090/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750807036090/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "33",
                "name": "1750807036090/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750807036090/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/2/1750807036090/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750807036090/sample_3.png",
                "mimeType": "image/png"
              },
              {
                "id": "cf94fd89-8386-4c8c-84e3-a900b3e98c80",
                "name": "scene2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images",
                "mimeType": "image/png"
              }
            ]
          },
          "videoGenerationSettings": {
            "prompt": "A meticulously framed close-up shot captures an adult male hand, with neat fingernails, expertly navigating the bright, high-resolution screen of a sleek smartphone. The screen prominently displays the distinctive orange and white interface of the \\'DashPass\\' application. A crisp digital label reads \\'Dog Toy,\\' positioned above a clear price tag of \\'$16.99\\' and a striking green note indicating \\'$0.00 delivery fee.\\' The index finger, poised and precise, extends and taps the illuminated \\'Add to Cart\\' button with a decisive motion and clicks on the button, only once as the screen changes to a different screen and the man's hand fluidly scrolls and swipes through the digital catalog, the screen seamlessly transitioning to display a dynamic array of other vibrant pet toy items, as the man continues his focused search. The \\'Add to cart\\' button only appears once and it's clicked once by the man. The scene is well-lit, with a soft, uniform glow emanating from the smartphone screen, casting subtle reflections on the skin of the hand, emphasizing the detailed interaction.",
            "durationInSecs": 8,
            "aspectRatio": "16:9",
            "framesPerSec": 24,
            "personGeneration": "allow_adult",
            "sampleCount": 2,
            "seed": 0,
            "negativePrompt": "",
            "transition": Transition.X_FADE,
            "enhancePrompt": true,
            "generateAudio": true,
            "includeVideoSegment": true,
            "regenerateVideo": true,
            "generatedVideos": [
              {
                "name": "11116516916668678980/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11116516916668678980/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11116516916668678980/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11116516916668678980/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "11116516916668678980/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11116516916668678980/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11116516916668678980/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11116516916668678980/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "7365711997363358195/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/7365711997363358195/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/7365711997363358195/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/7365711997363358195/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "7365711997363358195/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/7365711997363358195/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/7365711997363358195/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/7365711997363358195/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "10904267958968314709/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/10904267958968314709/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/10904267958968314709/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/10904267958968314709/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "10904267958968314709/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/10904267958968314709/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/10904267958968314709/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/10904267958968314709/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "17623446457707362939/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/17623446457707362939/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/17623446457707362939/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/17623446457707362939/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "17623446457707362939/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/17623446457707362939/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/17623446457707362939/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/17623446457707362939/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "16821739452906541631/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/16821739452906541631/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/16821739452906541631/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/16821739452906541631/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "16821739452906541631/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/16821739452906541631/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/16821739452906541631/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/16821739452906541631/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "11032383911623692099/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11032383911623692099/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11032383911623692099/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11032383911623692099/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "11032383911623692099/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11032383911623692099/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11032383911623692099/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11032383911623692099/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "11482947830089689658/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11482947830089689658/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11482947830089689658/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11482947830089689658/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "11482947830089689658/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11482947830089689658/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11482947830089689658/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11482947830089689658/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              }
            ],
            "selectedVideo": {
              "name": "11482947830089689658/sample_1.mp4",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11482947830089689658/sample_1.mp4",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2/11482947830089689658/sample_1.mp4",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11482947830089689658/sample_1.mp4",
              "mimeType": "video/mp4",
              "frameUris": []
            }
          }
        },
        {
          "id": "112098be-3592-4960-9e87-ace805a6e29d",
          "number": 3,
          "description": "The perspective then shifts to a low-angle shot of the basset hound lying somewhat sadly in its striped dog bed in a cozy home environment. Its ears perk up subtly, and it slowly gets up, padding towards a dog door. The next shot is from outside the dog door, where the dog's head, with its long ears, pokes through. On the doormat outside are three plush toys: a detailed hamburger, a cup of soda, and a container of French fries, all mimicking fast food. Promptly, a DoorDash delivery person on a bicycle, identifiable by the large red delivery bag on their back, speeds past the gate of the house. The dog then pulls the plush toys through the dog door and into the house.",
          "imageGenerationSettings": {
            "prompt": "A melancholic, elderly basset hound with soulful, droopy eyes and long, velvety ears, lying forlornly in its well-worn, plush, pastel-striped dog bed. Captured from a dramatic low-angle perspective, emphasizing its expressive, wrinkled face and large paws. The cozy home environment features soft, warm, diffused natural light filtering through sheer curtains, casting gentle shadows and highlighting dust motes in the air. Photorealistic, ultra detailed, 8K, cinematic film still, sharp focus on the dog's eyes, shallow depth of field, evocative lighting, award-winning animal photography, professional DSLR.",
            "numImages": 4,
            "aspectRatio": "1:1",
            "outputMimeType": "image/png",
            "compressionQuality": 75,
            "language": "en",
            "safetyFilterLevel": "block_only_high",
            "personGeneration": "allow_all",
            "seed": -1,
            "negativePrompt": "",
            "selectedImageForVideo": {
              "id": "1",
              "name": "1750809800654/sample_0.png",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_0.png",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_0.png",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750809800654/sample_0.png",
              "mimeType": "image/png"
            },
            "referenceImages": [],
            "generatedImages": [
              {
                "id": "1",
                "name": "1750809800654/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750809800654/sample_0.png",
                "mimeType": "image/png"
              },
              {
                "id": "2",
                "name": "1750809800654/sample_1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750809800654/sample_1.png",
                "mimeType": "image/png"
              },
              {
                "id": "3",
                "name": "1750809800654/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750809800654/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "4",
                "name": "1750809800654/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/3/1750809800654/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750809800654/sample_3.png",
                "mimeType": "image/png"
              }
            ]
          },
          "videoGenerationSettings": {
            "prompt": "The perspective then shifts to a low-angle shot of the basset hound lying somewhat sadly in its striped dog bed in a cozy home environment. Its ears perk up subtly, and he hears the loud doorbell ring and he quickly and excitedly gets up, running in a long corridor towards a closed door that has a an open dog door.  The shot changes to show the outside of the house and the door, with the dog's face through the dog's door. You can see a doormat with three plush toys: a detailed hamburger, a cup of soda, and a container of French fries, all mimicking fast food. The toys are static and don't change. ",
            "durationInSecs": 8,
            "aspectRatio": "16:9",
            "framesPerSec": 24,
            "personGeneration": "allow_adult",
            "sampleCount": 2,
            "seed": 0,
            "negativePrompt": "",
            "transition": Transition.X_FADE,
            "enhancePrompt": true,
            "generateAudio": true,
            "includeVideoSegment": true,
            "regenerateVideo": true,
            "generatedVideos": [
              {
                "name": "5113653389426874732/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/5113653389426874732/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/5113653389426874732/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5113653389426874732/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "5113653389426874732/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/5113653389426874732/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/5113653389426874732/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5113653389426874732/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "3997292737369157041/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/3997292737369157041/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/3997292737369157041/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3997292737369157041/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "3997292737369157041/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/3997292737369157041/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/3997292737369157041/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3997292737369157041/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "10877288774248388750/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/10877288774248388750/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/10877288774248388750/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/10877288774248388750/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "10877288774248388750/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/10877288774248388750/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/10877288774248388750/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/10877288774248388750/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "7036623141057415862/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/7036623141057415862/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/7036623141057415862/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/7036623141057415862/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "7036623141057415862/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/7036623141057415862/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/7036623141057415862/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/7036623141057415862/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "4588609053885241075/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4588609053885241075/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4588609053885241075/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4588609053885241075/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "4588609053885241075/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4588609053885241075/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4588609053885241075/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4588609053885241075/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "11381787064605110486/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/11381787064605110486/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/11381787064605110486/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11381787064605110486/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "11381787064605110486/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/11381787064605110486/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/11381787064605110486/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11381787064605110486/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "14659930550425986690/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/14659930550425986690/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/14659930550425986690/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/14659930550425986690/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "14659930550425986690/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/14659930550425986690/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/14659930550425986690/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/14659930550425986690/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "4837741960203481700/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4837741960203481700/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4837741960203481700/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4837741960203481700/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "4837741960203481700/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4837741960203481700/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4837741960203481700/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4837741960203481700/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "2775677776404710206/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/2775677776404710206/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/2775677776404710206/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2775677776404710206/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "2775677776404710206/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/2775677776404710206/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/2775677776404710206/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/2775677776404710206/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "4895204334158200116/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4895204334158200116/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4895204334158200116/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4895204334158200116/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "4895204334158200116/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4895204334158200116/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4895204334158200116/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4895204334158200116/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "4999511180693642944/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4999511180693642944/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4999511180693642944/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4999511180693642944/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "4999511180693642944/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4999511180693642944/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/4999511180693642944/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4999511180693642944/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "14487572641485217814/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/14487572641485217814/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/14487572641485217814/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/14487572641485217814/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "14487572641485217814/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/14487572641485217814/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/14487572641485217814/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/14487572641485217814/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "12073130247849827080/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/12073130247849827080/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/12073130247849827080/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/12073130247849827080/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "12073130247849827080/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/12073130247849827080/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/12073130247849827080/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/12073130247849827080/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "9316035416845549958/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/9316035416845549958/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/9316035416845549958/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/9316035416845549958/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "9316035416845549958/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/9316035416845549958/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/9316035416845549958/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/9316035416845549958/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              }
            ],
            "selectedVideo": {
              "name": "9316035416845549958/sample_0.mp4",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/9316035416845549958/sample_0.mp4",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/3/9316035416845549958/sample_0.mp4",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/9316035416845549958/sample_0.mp4",
              "mimeType": "video/mp4",
              "frameUris": []
            }
          }
        },
        {
          "id": "d6cd0e99-e57b-4c05-8aa2-8eeaa6c3cba9",
          "number": 4,
          "description": "A quick cut shows a DoorDash cyclist with a red delivery bag speeding past the house gate as they leave the house after delivering a package",
          "imageGenerationSettings": {
            "prompt": "A dynamic, high-action cinematic shot captures a DoorDash cyclist in full motion, a shot seen from the inside of house to outside as he leaves the house. Their vibrant, reflective red delivery bag with the Doordash logo, as they speed past an ornate, wrought-iron house gate. The cyclist is clearly depicted leaving the premises, having just completed a package delivery. The street is rendered with subtle motion blur, under the warm, late afternoon sun. This fleeting moment is captured with ultra-detailed, lifelike fidelity, resembling high-definition, bathed in natural light, rendered in stunning 8K resolution with volumetric lighting.",
            "numImages": 4,
            "aspectRatio": "1:1",
            "outputMimeType": "image/png",
            "compressionQuality": 75,
            "language": "en",
            "safetyFilterLevel": "block_only_high",
            "personGeneration": "allow_all",
            "seed": -1,
            "negativePrompt": "",
            "selectedImageForVideo": {
              "id": "23423",
              "name": "1750813746879/sample_0.png",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_0.png",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_0.png",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813746879/sample_0.png",
              "mimeType": "image/png"
            },
            "referenceImages": [],
            "generatedImages": [
              {
                "id": "1",
                "name": "1750813610556/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813610556/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813610556/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813610556/sample_0.png",
                "mimeType": "image/png"
              },
              {
                "id": "2",
                "name": "1750813610556/sample_1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813610556/sample_1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813610556/sample_1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813610556/sample_1.png",
                "mimeType": "image/png"
              },
              {
                "id": "3",
                "name": "1750813610556/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813610556/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813610556/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813610556/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "4",
                "name": "1750813610556/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813610556/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813610556/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813610556/sample_3.png",
                "mimeType": "image/png"
              },
              {
                "id": "5",
                "name": "1750813691114/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813691114/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813691114/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813691114/sample_0.png",
                "mimeType": "image/png"
              },
              {
                "id": "6",
                "name": "1750813691114/sample_1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813691114/sample_1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813691114/sample_1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813691114/sample_1.png",
                "mimeType": "image/png"
              },
              {
                "id": "7",
                "name": "1750813691114/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813691114/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813691114/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813691114/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "8",
                "name": "1750813691114/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813691114/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813691114/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813691114/sample_3.png",
                "mimeType": "image/png"
              },
              {
                "id": "9",
                "name": "1750813746879/sample_0.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_0.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_0.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813746879/sample_0.png",
                "mimeType": "image/png"
              },
              {
                "id": "10",
                "name": "1750813746879/sample_1.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_1.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_1.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813746879/sample_1.png",
                "mimeType": "image/png"
              },
              {
                "id": "11",
                "name": "1750813746879/sample_2.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_2.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_2.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813746879/sample_2.png",
                "mimeType": "image/png"
              },
              {
                "id": "12",
                "name": "1750813746879/sample_3.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_3.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/4/1750813746879/sample_3.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/1750813746879/sample_3.png",
                "mimeType": "image/png"
              }
            ]
          },
          "videoGenerationSettings": {
            "prompt": "A quick, dynamic cut introduces a low-angle tracking shot, following a DoorDash cyclist in full motion and speed. The cyclist is captured in sharp focus as they rapidly accelerate past an ornate, wrought-iron house gate, its dark silhouette briefly framing the vibrant scene. The iconic bright red DoorDash delivery bag, slung securely over their shoulder, gleams under the ambient light, a stark contrast to the surrounding urban textures. A subtle motion blur emphasizes the exhilarating speed as the cyclist swiftly departs from the scene, having just completed a package delivery, their energy palpable and efficient.",
            "durationInSecs": 8,
            "aspectRatio": "16:9",
            "framesPerSec": 24,
            "personGeneration": "allow_adult",
            "sampleCount": 2,
            "seed": 0,
            "negativePrompt": "",
            "transition": Transition.X_FADE,
            "enhancePrompt": true,
            "generateAudio": true,
            "includeVideoSegment": true,
            "regenerateVideo": true,
            "generatedVideos": [
              {
                "name": "17519970468752576573/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/17519970468752576573/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/17519970468752576573/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/17519970468752576573/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "17519970468752576573/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/17519970468752576573/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/17519970468752576573/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/17519970468752576573/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "11607929443229311465/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/11607929443229311465/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/11607929443229311465/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11607929443229311465/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "11607929443229311465/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/11607929443229311465/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/11607929443229311465/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11607929443229311465/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              }
            ],
            "selectedVideo": {
              "name": "11607929443229311465/sample_0.mp4",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/11607929443229311465/sample_0.mp4",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/4/11607929443229311465/sample_0.mp4",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/11607929443229311465/sample_0.mp4",
              "mimeType": "video/mp4",
              "frameUris": []
            }
          }
        },
        {
          "id": "7e9ee783-7f9b-4a19-ba96-8a6a592a63a2",
          "number": 5,
          "description": "The scene concludes with the dog going outside the house and and taking some of the the plush toys: a detailed hamburger, a cup of soda, and a container of French fries, all mimicking fast food",
          "imageGenerationSettings": {
            "prompt": "",
            "numImages": 4,
            "aspectRatio": "1:1",
            "outputMimeType": "image/png",
            "compressionQuality": 75,
            "language": "en",
            "safetyFilterLevel": "block_only_high",
            "personGeneration": "allow_all",
            "seed": -1,
            "negativePrompt": "",
            "selectedImageForVideo": {
              "id": "5ebba248-4169-4506-9363-709de45e1850",
              "name": "scene6.png",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene6.png",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene6.png",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images",
              "mimeType": "image/png"
            },
            "referenceImages": [],
            "generatedImages": [
              {
                "id": "5ebba248-4169-4506-9363-709de45e1850",
                "name": "scene6.png",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene6.png",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images/scene6.png",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/images",
                "mimeType": "image/png"
              }
            ]
          },
          "videoGenerationSettings": {
            "prompt": "The dog captured in a dynamic low-angle tracking shot, triumphantly takes a collection of his  toys – a meticulously detailed hamburger, a soft-sculpture cup of soda complete with a plush straw, and a squishy, realistic container of French fries – all perfectly mimicking fast food items as the scene closes. Only show 1 dog.",
            "durationInSecs": 8,
            "aspectRatio": "16:9",
            "framesPerSec": 24,
            "personGeneration": "allow_adult",
            "sampleCount": 2,
            "seed": 0,
            "negativePrompt": "",
            "enhancePrompt": true,
            "generateAudio": true,
            "includeVideoSegment": true,
            "regenerateVideo": true,
            "generatedVideos": [
              {
                "name": "1875235939650248260/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/1875235939650248260/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/1875235939650248260/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/1875235939650248260/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "1875235939650248260/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/1875235939650248260/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/1875235939650248260/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/1875235939650248260/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "13350594402985242328/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/13350594402985242328/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/13350594402985242328/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/13350594402985242328/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "13350594402985242328/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/13350594402985242328/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/13350594402985242328/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/13350594402985242328/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "8077873793154019785/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/8077873793154019785/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/8077873793154019785/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/8077873793154019785/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "8077873793154019785/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/8077873793154019785/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/8077873793154019785/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/8077873793154019785/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "16078378850460951160/sample_0.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/16078378850460951160/sample_0.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/16078378850460951160/sample_0.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/16078378850460951160/sample_0.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              },
              {
                "name": "16078378850460951160/sample_1.mp4",
                "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/16078378850460951160/sample_1.mp4",
                "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/16078378850460951160/sample_1.mp4",
                "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/16078378850460951160/sample_1.mp4",
                "mimeType": "video/mp4",
                "frameUris": []
              }
            ],
            "selectedVideo": {
              "name": "16078378850460951160/sample_0.mp4",
              "gcsUri": "gs://tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/16078378850460951160/sample_0.mp4",
              "signedUri": "https://storage.mtls.cloud.google.com/tightlock-test-dreamboard/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/5/16078378850460951160/sample_0.mp4",
              "gcsFusePath": "/usr/local/google/home/anaesqueda/Documents/solutions/dreamboard/dreamboard/backend/app/dreamboard/6bc870a2-aaf3-4d36-96e5-06841701a0c2/videos/16078378850460951160/sample_0.mp4",
              "mimeType": "video/mp4",
              "frameUris": []
            }
          }
        }
      ]
    }
  }

  /**
   * Opens a dialog for editing the settings of a specific video scene.
   * This dialog allows users to configure image and video generation parameters for the scene.
   * @param {VideoScene} scene - The video scene object to be edited.
   * @returns {void}
   */
  openSceneSettingsDialog(scene: VideoScene, sceneId: string) {
    const dialogRef = this.sceneSettingsDialog.open(
      SceneSettingsDialogComponent,
      {
        minWidth: '1200px',
        data: {
          storyId: this.story.id,
          sceneId: sceneId,
          scene: scene,
        },
      }
    );
  }

  /**
   * Opens a dialog for configuring transition settings between video scenes.
   * This dialog allows selecting a transition type for the scene at the given index.
   * @param {number} transitionIndex - The index of the scene (within the `scenes` array)
   * for which to open the transition settings.
   * @returns {void}
   */
  openTransitionsSettingsDialog(transitionIndex: number) {
    this.creativeDirectionSettingsDialog.open(
      TransitionsSettingsDialogComponent,
      {
        minWidth: '300px',
        minHeight: '250px',
        data: {
          storyId: this.story.id,
          scene: this.story.scenes[transitionIndex],
        },
      }
    );
  }

  /**
   * Adds a new video scene to the current list of scenes.
   * If this is the first scene being added, a new `storyId` is generated.
   * The new scene is assigned a sequential scene number.
   * @returns {void}
   */
  addScene() {
    if (!this.story) {
      this.story = getNewVideoStory();
    }
    const newScene = getNewVideoScene(this.story.scenes.length);
    this.story.scenes.push(newScene);
  }

  /**
   * Handles the event for editing an existing scene.
   * It extracts the `sceneId` from the event target, finds the corresponding scene,
   * and then opens the `SceneSettingsDialogComponent` for that scene.
   * @param {any} event - The DOM event object from the edit action (e.g., click event).
   * @returns {void}
   */
  editScene(event: any) {
    const sceneId = event.target.parentElement.parentElement.parentElement.id;
    const scene = this.getSceneById(sceneId);
    if (scene) {
      this.openSceneSettingsDialog(scene, sceneId);
    } else {
      console.log('Video Scene not found. No scene to edit.');
    }
  }

  /**
   * Handles the event for removing a scene from the list.
   * It extracts the `sceneId` from the event target, finds the corresponding scene,
   * removes it from the `scenes` array, and re-numbers the remaining scenes to maintain sequence.
   * @param {any} event - The DOM event object from the remove action (e.g., click event).
   * @returns {void}
   */
  removeScene(event: any) {
    const sceneId = event.target.parentElement.parentElement.id;
    const scene = this.getSceneById(sceneId);
    if (scene) {
      this.story.scenes.splice(scene.number - 1, 1);
      // Update scene numbers with new position in scenes array
      this.story.scenes.forEach((scene: VideoScene, index: number) => {
        scene.number = index + 1;
      });
    } else {
      console.log('Video Scene not found. No scene to remove.');
    }
    if (this.story.scenes.length === 0) {
      // If all scenes removed, create new story
      this.story = getNewVideoStory();
    }
  }

  /**
   * Retrieves a video scene object from the `scenes` array by its unique ID.
   * @param {string} sceneId - The unique identifier of the scene to find.
   * @returns {VideoScene | null} The found `VideoScene` object, or `null` if no scene with the given ID is found.
   */
  getSceneById(sceneId: string): VideoScene | null {
    const foundScenes: VideoScene[] = this.story.scenes.filter(
      (scene: VideoScene) => {
        return scene.id === sceneId;
      }
    );
    if (foundScenes.length > 0) {
      const scene = foundScenes[0];
      return scene;
    }

    return null;
  }

  /**
   * Initiates the bulk video generation process for all scenes.
   * It first validates the scenes to ensure all required prompts are present and that
   * at least one video is marked for regeneration.
   * Displays snackbar messages for validation errors and the generation status.
   * @returns {void}
   */
  generateVideosFromScenes(): void {
    // Validate required prompts when needed
    const validations = this.validateScenes();
    if (validations['invalidTextToVideoScenes'].length > 0) {
      openSnackBar(
        this._snackBar,
        `A video prompt is required for the following scenes since a reference image was not selected. Scenes: ${validations[
          'invalidTextToVideoScenes'
        ].join(', ')}. Please add a prompt or select an image and try again.`
      );
      return;
    }
    // Validate that regenerate video option is enabled for at least 1 video
    if (validations['sceneVideosToGenerate'].length == 0) {
      openSnackBar(
        this._snackBar,
        `There are not videos to generate since the 'Regenerate video in bulk generation' option was disabled for all videos.
        Please enable the option and try again.`
      );
      return;
    }

    openSnackBar(
      this._snackBar,
      `Generating videos for the following scenes: ${validations[
        'sceneVideosToGenerate'
      ].join(', ')}. This might take some time...`
    );

    const videoGeneration = this.buildVideoGenerationParams(
      'GENERATE',
      this.story.scenes
    );
    this.videoGenerationService
      .generateVideosFromScenes(this.story.id, videoGeneration)
      .subscribe(
        (resps: VideoGenerationResponse[]) => {
          openSnackBar(
            this._snackBar,
            'Videos for scenes created successfully! Please check each scene individually.',
            10
          );
          // Find scenes in responses to update generated videos
          const executionStatus = updateScenesWithGeneratedVideos(
            resps,
            this.story.scenes
          );
        },
        (error: any) => {
          let errorMessage;
          if (error.error.hasOwnProperty('detail')) {
            errorMessage = error.error.detail;
          } else {
            errorMessage = error.error.message;
          }
          console.error(errorMessage);
          openSnackBar(
            this._snackBar,
            `ERROR: ${errorMessage}. Please try again.`
          );
        }
      );
  }

  /**
   * Initiates the process of merging generated videos from all scenes into a single final video.
   * It first validates that all scenes have a selected video for merging and that at least one
   * video segment is included in the final video.
   * Displays snackbar messages for validation errors and the merge status.
   * On successful merge, it communicates the final video to other components and switches tabs.
   * @returns {void}
   */
  mergeVideos(): void {
    // Validate if videos for all scenes have been generated
    const validations = this.validateScenes();
    if (validations['scenesWithNoGeneratedVideo'].length > 0) {
      openSnackBar(
        this._snackBar,
        `The following scenes do not have a selected video to merge: ${validations[
          'scenesWithNoGeneratedVideo'
        ].join(
          ', '
        )}. Please generate and select a video for all scenes and try again.`
      );
      return;
    }

    if (validations['sceneVideosToMerge'].length == 0) {
      openSnackBar(
        this._snackBar,
        `There are not videos to merge since the 'Include video segment in final video' option was disabled for all videos.
        Please enable the option and try again.`
      );
      return;
    }

    openSnackBar(
      this._snackBar,
      `Merging videos for Scenes: ${validations['sceneVideosToMerge'].join(
        ', '
      )}. This might take some time...`
    );

    const videoGeneration = this.buildVideoGenerationParams(
      'MERGE',
      this.story.scenes
    );

    this.videoGenerationService
      .mergeVideos(this.story.id, videoGeneration)
      .subscribe(
        (response: VideoGenerationResponse) => {
          if (response && response.videos.length > 0) {
            openSnackBar(
              this._snackBar,
              `Videos for Story ${this.story.id} were merged successfully!`,
              10
            );
            const finalVideoReponse = response.videos[0];
            const video = {
              name: finalVideoReponse.name,
              signedUri: finalVideoReponse.signed_uri,
              gcsUri: finalVideoReponse.gcs_uri,
              gcsFusePath: finalVideoReponse.gcs_fuse_path,
              mimeType: finalVideoReponse.mime_type,
              frameUris: [], // TODO (ae) include later
            } as Video;
            // Trigger component communication to share generated video with FinalVideoComponent
            this.componentsCommunicationService.videoGenerated(video);
            this.componentsCommunicationService.tabChanged(2);
          }
        },
        (error: any) => {
          let errorMessage;
          if (error.error.hasOwnProperty('detail')) {
            errorMessage = error.error.detail;
          } else {
            errorMessage = error.error.message;
          }
          console.error(errorMessage);
          openSnackBar(
            this._snackBar,
            `ERROR: ${errorMessage}. Please try again.`
          );
        }
      );
  }

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
  validateScenes(): SceneValidations {
    let validations: SceneValidations = {
      scenesWithNoGeneratedVideo: [],
      invalidTextToVideoScenes: [],
      sceneVideosToGenerate: [],
      sceneVideosToMerge: [],
    };
    this.story.scenes.forEach((scene: VideoScene) => {
      // Check if videos are generated and one is selected for merge
      if (
        !this.isVideoGenerated(scene) &&
        scene.videoGenerationSettings.includeVideoSegment
      ) {
        validations['scenesWithNoGeneratedVideo'].push(scene.number);
      }
      // Check prompt required
      if (
        !scene.imageGenerationSettings.selectedImageForVideo &&
        !scene.videoGenerationSettings.prompt
      ) {
        // Prompt is required for Text to Video
        validations['invalidTextToVideoScenes'].push(scene.number);
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

  /**
   * Initiates the bulk image generation process for the provided video scenes.
   * It constructs an `ImageGenerationRequest` and sends it to the `ImageGenerationService`.
   * Updates the scenes with generated images upon successful response.
   * @param {boolean} isExport - True if this generation is part of an export process,
   * which affects snackbar messages and scene replacement.
   * @param {VideoScene[]} videoScenes - The array of video scenes for which to generate images.
   * @returns {void}
   */
  generateImagesFromScenes(isExport: boolean, videoScenes: VideoScene[]): void {
    const imageGeneration = this.buildImageGenerationParams(videoScenes);

    this.imageGenerationService
      .generateImage(this.story.id, imageGeneration)
      .subscribe(
        (resps: HttpResponse<ImageGenerationResponse[]>) => {
          // Find scene in responses to update generated images
          if (resps.body) {
            if (isExport) {
              openSnackBar(this._snackBar, `Scenes exported successfully!`, 15);
              this.story.scenes = videoScenes;
              this.exportingScenes = false;
            }
            const executionStatus = updateScenesWithGeneratedImages(
              resps.body,
              this.story.scenes
            );
            console.log(executionStatus['succeded']);
          }
        },
        (error: any) => {
          let errorMessage;
          if (error.error.hasOwnProperty('detail')) {
            errorMessage = error.error.detail;
          } else {
            errorMessage = error.error.message;
          }
          console.error(errorMessage);
          openSnackBar(
            this._snackBar,
            `ERROR: ${errorMessage}. Please try again.`
          );
        }
      );
  }

  /**
   * Constructs a `VideoGenerationRequest` object based on the provided action
   * and a list of video scenes. This method filters scenes based on the action
   * ('GENERATE' or 'MERGE') and populates the request with relevant video segment data,
   * including selected images and videos.
   * @param {string} action - The action to perform ('GENERATE' for new videos, 'MERGE' for combining existing ones).
   * @param {VideoScene[]} scenes - The array of `VideoScene` objects to build the request from.
   * @returns {VideoGenerationRequest} The constructed video generation request.
   */
  buildVideoGenerationParams(
    action: string,
    scenes: VideoScene[]
  ): VideoGenerationRequest {
    const videoSegments: VideoSegmentRequest[] = [];
    scenes.forEach((scene: VideoScene) => {
      // Do not include video segments that meet these conditions
      if (action === 'GENERATE') {
        if (!scene.videoGenerationSettings.regenerateVideo) {
          return false;
        }
      } else if (action === 'MERGE') {
        if (!scene.videoGenerationSettings.includeVideoSegment) {
          return false;
        }
      }
      // Add selected image
      let seedImage: ImageItem | undefined = undefined;
      if (scene.imageGenerationSettings.selectedImageForVideo) {
        seedImage = {
          name: scene.imageGenerationSettings.selectedImageForVideo.name,
          gcs_uri: scene.imageGenerationSettings.selectedImageForVideo.gcsUri,
          signed_uri:
            scene.imageGenerationSettings.selectedImageForVideo.signedUri,
          gcs_fuse_path:
            scene.imageGenerationSettings.selectedImageForVideo.gcsFusePath,
          mime_type:
            scene.imageGenerationSettings.selectedImageForVideo.mimeType,
        };
      }
      // Add selected video
      let selectedVideo: VideoItem | undefined = undefined;
      if (scene.videoGenerationSettings.selectedVideo) {
        selectedVideo = {
          name: scene.videoGenerationSettings.selectedVideo?.name!,
          gcs_uri: scene.videoGenerationSettings.selectedVideo?.gcsUri!,
          signed_uri: scene.videoGenerationSettings.selectedVideo?.signedUri!,
          gcs_fuse_path:
            scene.videoGenerationSettings.selectedVideo?.gcsFusePath!,
          mime_type: scene.videoGenerationSettings.selectedVideo.mimeType,
          frames_uris: [],
        };
      }

      const videoSegment: VideoSegmentRequest = {
        scene_id: scene.id,
        segment_number: scene.number,
        prompt: scene.videoGenerationSettings.prompt,
        seed_image: seedImage, // Can be null for text to video generation
        duration_in_secs: scene.videoGenerationSettings.durationInSecs,
        aspect_ratio: scene.videoGenerationSettings.aspectRatio,
        frames_per_sec: scene.videoGenerationSettings.framesPerSec!,
        person_generation: scene.videoGenerationSettings.personGeneration,
        sample_count: scene.videoGenerationSettings.sampleCount,
        /*seed: scene.videoSettings.seed,*/
        negative_prompt: scene.videoGenerationSettings.negativePrompt,
        transition: scene.videoGenerationSettings.transition,
        generate_audio: scene.videoGenerationSettings.generateAudio,
        enhance_prompt: scene.videoGenerationSettings.enhancePrompt,
        use_last_frame: false, // TODO (ae) implement this later
        include_video_segment:
          scene.videoGenerationSettings.includeVideoSegment,
        generate_video_frames: false,
        regenerate_video_segment: scene.videoGenerationSettings.regenerateVideo,
        selected_video: selectedVideo,
      };
      videoSegments.push(videoSegment);

      return true;
    });

    const videoGeneration: VideoGenerationRequest = {
      video_segments: videoSegments,
      creative_direction: undefined, // for now
    };

    return videoGeneration;
  }

  /**
   * Constructs an `ImageGenerationRequest` object based on a provided list of video scenes.
   * This request is used to send to the image generation API, containing the image prompt
   * and creative direction settings for each scene.
   * @param {VideoScene[]} scenes - The array of `VideoScene` objects to build the request from.
   * @returns {ImageGenerationRequest} The constructed image generation request.
   */
  buildImageGenerationParams(scenes: VideoScene[]): ImageGenerationRequest {
    const imageScenes = scenes.map((scene: VideoScene) => {
      return {
        scene_num: scene.number,
        img_prompt: scene.imageGenerationSettings.prompt,
        creative_dir: {
          number_of_images: scene.imageGenerationSettings.numImages,
          aspect_ratio: scene.imageGenerationSettings.aspectRatio,
          person_generation: scene.imageGenerationSettings.personGeneration,
          output_mime_type: scene.imageGenerationSettings.outputMimeType,
          /*seed?: this.imageSettingsForm.get('prompt')?.value;*/
          negative_prompt: scene.imageGenerationSettings.negativePrompt,
          enhance_prompt: true, // Default for initial image
          safety_filter_level: scene.imageGenerationSettings.safetyFilterLevel,
          language: scene.imageGenerationSettings.language,
          output_compression_quality:
            scene.imageGenerationSettings.compressionQuality,
        } as ImageCreativeDirection,
      } as ImageSceneRequest;
    });

    const imageGeneration: ImageGenerationRequest = {
      scenes: imageScenes,
    };

    return imageGeneration;
  }

  /**
   * Checks if a video has been successfully generated and selected for a given scene.
   * This is crucial for determining if a scene is ready for video merging.
   * @param {VideoScene} scene - The video scene to check.
   * @returns {boolean} `true` if generated videos exist and one is selected; `false` otherwise.
   */
  isVideoGenerated(scene: VideoScene): boolean {
    return (
      scene.videoGenerationSettings.generatedVideos.length > 0 &&
      scene.videoGenerationSettings.selectedVideo !== undefined
    );
  }
}
