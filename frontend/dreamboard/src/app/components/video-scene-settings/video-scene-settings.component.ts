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
 * @fileoverview This component manages the video generation settings for a single video scene.
 * It allows users to configure various parameters for video creation, trigger video generation,
 * and navigate through generated video samples.
 */

import { Component, Input, AfterViewInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VideoScene } from '../../models/scene-models';
import { Transition, VideoSegmentRequest } from '../../models/video-gen-models';
import {
  VideoGenerationRequest,
  VideoGenerationResponse,
  Video,
} from '../../models/video-gen-models';
import { ImageItem } from '../../models/image-gen-models';
import {
  getAspectRatios,
  getFramesPerSecondOptions,
  getPersonGenerationOptions,
  updateScenesWithGeneratedVideos,
} from '../../video-utils';
import { getOutputMimeTypes } from '../../image-utils';
import { SelectItem } from '../../models/settings-models';
import { VideoGenerationService } from '../../services/video-generation.service';
import { openSnackBar, closeSnackBar } from '../../utils';
import { TextGenerationService } from '../../services/text-generation.service';

@Component({
  selector: 'app-video-scene-settings',
  imports: [
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    ReactiveFormsModule,
  ],
  templateUrl: './video-scene-settings.component.html',
  styleUrl: './video-scene-settings.component.css',
})
export class VideoSceneSettingsComponent implements AfterViewInit {
  private _scene!: VideoScene;
  @Input()
  set scene(value: VideoScene) {
    this._scene = value;
    // When the scene is set or changed, sync the display video
    if (this._scene.imageGenerationSettings.selectedImageForVideo) {
      this.selectedVideoForDisplay = this._scene.imageGenerationSettings.selectedImageForVideo as unknown as Video;
    } else {
      this.selectedVideoForDisplay = this._scene.videoGenerationSettings.selectedVideo;
    }
  }
  get scene(): VideoScene {
    return this._scene;
  }

  @Input() storyId!: string;
  aspectRatios: SelectItem[] = getAspectRatios();
  framesPerSecOptions: SelectItem[] = getFramesPerSecondOptions();
  imageMimeTypes: SelectItem[] = getOutputMimeTypes();
  personGenerationOptions: SelectItem[] = getPersonGenerationOptions();
  currentGeneratedVideoIndex: number = 0;
  selectedVideoForDisplay: Video | undefined;
  private _snackBar = inject(MatSnackBar);

  videoSettingsForm = new FormGroup({
    prompt: new FormControl('', []),
    sampleCount: new FormControl(2, []),
    durationInSecs: new FormControl(8, [Validators.required]),
    aspectRatio: new FormControl('16:9', []),
    framesPerSec: new FormControl('24', []),
    personGeneration: new FormControl('allow_adult', []),
    negativePrompt: new FormControl('', []),
    enhancePrompt: new FormControl(true, []),
    generateAudio: new FormControl(true, []),
    includeVideoSegment: new FormControl(true, []),
    regenerateVideo: new FormControl(true, []),
    selectedVideoUri: new FormControl(''),
    withSceneDescription: new FormControl(true, []),
  });

  constructor(
    private videoGenerationService: VideoGenerationService,
    private textGenerationService: TextGenerationService
  ) {}

  ngAfterViewInit(): void {
    this.initVideoSettingsForm();
  }

  initVideoSettingsForm(): void {
    this.videoSettingsForm.controls['prompt'].setValue(
      this.scene.videoGenerationSettings.prompt
    );
    this.videoSettingsForm.controls['aspectRatio'].setValue(
      this.scene.videoGenerationSettings.aspectRatio!
    );
    this.videoSettingsForm.controls['durationInSecs'].setValue(
      this.scene.videoGenerationSettings.durationInSecs
    );
    this.videoSettingsForm.controls['framesPerSec'].setValue(
      this.scene.videoGenerationSettings.framesPerSec?.toString()!
    );
    this.videoSettingsForm.controls['personGeneration'].setValue(
      this.scene.videoGenerationSettings.personGeneration!
    );
    this.videoSettingsForm.controls['sampleCount'].setValue(
      this.scene.videoGenerationSettings.sampleCount!
    );
    this.videoSettingsForm.controls['negativePrompt'].setValue(
      this.scene.videoGenerationSettings.negativePrompt!
    );
    this.videoSettingsForm.controls['enhancePrompt'].setValue(
      this.scene.videoGenerationSettings.enhancePrompt!
    );
    this.videoSettingsForm.controls['generateAudio'].setValue(
      this.scene.videoGenerationSettings.generateAudio!
    );
    this.videoSettingsForm.controls['includeVideoSegment'].setValue(
      this.scene.videoGenerationSettings.includeVideoSegment!
    );
    this.videoSettingsForm.controls['regenerateVideo'].setValue(
      this.scene.videoGenerationSettings.regenerateVideo!
    );
    if (this.scene.videoGenerationSettings.selectedVideo) {
      // Update selected video index in carrousel
      const updateForm = true;
      this.updateSelectedVideo(
        this.scene.videoGenerationSettings.selectedVideo.gcsUri,
        updateForm
      );
    }
  }

  setVideoSettings(): void {
    this.scene.videoGenerationSettings.prompt =
      this.videoSettingsForm.get('prompt')?.value!;
    this.scene.videoGenerationSettings.durationInSecs =
      this.videoSettingsForm.get('durationInSecs')?.value!;
    this.scene.videoGenerationSettings.aspectRatio =
      this.videoSettingsForm.get('aspectRatio')?.value!;
    this.scene.videoGenerationSettings.personGeneration =
      this.videoSettingsForm.get('personGeneration')?.value!;
    this.scene.videoGenerationSettings.sampleCount =
      this.videoSettingsForm.get('sampleCount')?.value!;
    this.scene.videoGenerationSettings.negativePrompt =
      this.videoSettingsForm.get('negativePrompt')?.value!;
    this.scene.videoGenerationSettings.enhancePrompt =
      this.videoSettingsForm.get('enhancePrompt')?.value!;
    this.scene.videoGenerationSettings.generateAudio =
      this.videoSettingsForm.get('generateAudio')?.value!;
    this.scene.videoGenerationSettings.includeVideoSegment =
      this.videoSettingsForm.get('includeVideoSegment')?.value!;
    this.scene.videoGenerationSettings.regenerateVideo =
      this.videoSettingsForm.get('regenerateVideo')?.value!;
    const selectedVideo: Video =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentGeneratedVideoIndex
      ];
    this.scene.videoGenerationSettings.selectedVideo = selectedVideo;
  }

  isPrevVideoSegmentGenerated(): boolean {
    return this.scene.videoGenerationSettings.selectedVideo !== undefined;
  }

  onPrev(): void {
    const previousVideoIndex = this.currentGeneratedVideoIndex - 1;
    this.currentGeneratedVideoIndex =
      previousVideoIndex < 0
        ? this.scene.videoGenerationSettings.generatedVideos.length - 1
        : previousVideoIndex;
    const generatedVideo =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentGeneratedVideoIndex
      ];
    this.updateSelectedVideo(generatedVideo.gcsUri, true);
  }

  onNext(): void {
    const nextVideoIndex = this.currentGeneratedVideoIndex + 1;
    this.currentGeneratedVideoIndex =
      nextVideoIndex ===
      this.scene.videoGenerationSettings.generatedVideos.length
        ? 0
        : nextVideoIndex;
    const generatedVideo =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentGeneratedVideoIndex
      ];
    this.updateSelectedVideo(generatedVideo.gcsUri, true);
  }

  onVideoSelected(event: MatSelectChange): void {
    this.updateSelectedVideo(event.value, true);
  }

  setCurrentGeneratedVideoIndex(gcsUri: string): void {
    const index = this.scene.videoGenerationSettings.generatedVideos.findIndex(
      (video) => video.gcsUri === gcsUri
    );
    this.currentGeneratedVideoIndex = index;
  }

  updateSelectedVideo(gcsUri: string, updateForm: boolean) {
    if (updateForm) {
      this.videoSettingsForm.controls['selectedVideoUri'].setValue(gcsUri);
    }
    this.setCurrentGeneratedVideoIndex(gcsUri);
    const selectedVideo =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentGeneratedVideoIndex
      ];
    this.scene.videoGenerationSettings.selectedVideo = selectedVideo;
  }

  removeSelectedImageForVideo() {
    this.scene.imageGenerationSettings.selectedImageForVideo = undefined;
  }

  generateVideosFromScene(): void {
    openSnackBar(
      this._snackBar,
      `Generating video for scene ${this.scene.number}. This might take some time...`
    );
    const videoGeneration: VideoGenerationRequest = {
      video_segments: [this.buildVideoSegment()],
      creative_direction: undefined,
    };
    this.videoGenerationService
      .generateVideosFromScenes(this.storyId, videoGeneration)
      .subscribe({
        next: (resps: VideoGenerationResponse[]) => {
          const executionStatus = updateScenesWithGeneratedVideos(resps, [
            this.scene,
          ]);
          if (this.scene.videoGenerationSettings.generatedVideos.length > 0) {
            const lastVideo =
              this.scene.videoGenerationSettings.generatedVideos[
                this.scene.videoGenerationSettings.generatedVideos.length - 1
              ];
            this.updateSelectedVideo(lastVideo.gcsUri, true);
          }
          openSnackBar(
            this._snackBar,
            executionStatus['execution_message'],
            20
          );
        },
        error: (error: any) => {
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
        },
      });
  }

  buildVideoSegment(): VideoSegmentRequest {
    let seedImage;
    if (this.scene.imageGenerationSettings.selectedImageForVideo) {
      seedImage = {
        name: this.scene.imageGenerationSettings.selectedImageForVideo.name,
        signed_uri:
          this.scene.imageGenerationSettings.selectedImageForVideo.signedUri,
        gcs_uri:
          this.scene.imageGenerationSettings.selectedImageForVideo.gcsUri,
        mime_type:
          this.scene.imageGenerationSettings.selectedImageForVideo.mimeType,
        gcs_fuse_path: '',
      } as ImageItem;
    }
    const videoSegment: VideoSegmentRequest = {
      scene_id: this.scene.id,
      segment_number: this.scene.number,
      prompt: this.videoSettingsForm.get('prompt')?.value!,
      seed_image: seedImage,
      duration_in_secs: this.videoSettingsForm.get('durationInSecs')?.value!,
      aspect_ratio: this.videoSettingsForm.get('aspectRatio')?.value!,
      frames_per_sec: parseInt(
        this.videoSettingsForm.get('framesPerSec')?.value!
      ),
      person_generation: this.videoSettingsForm.get('personGeneration')?.value!,
      sample_count: this.videoSettingsForm.get('sampleCount')?.value!,
      negative_prompt: this.videoSettingsForm.get('negativePrompt')?.value!,
      transition: Transition.CONCATENATE,
      generate_audio: this.videoSettingsForm.get('generateAudio')?.value!,
      enhance_prompt: true,
      use_last_frame: false,
      include_video_segment: this.videoSettingsForm.get('includeVideoSegment')
        ?.value!,
      generate_video_frames: false,
      regenerate_video_segment: true,
      selected_video: undefined,
    };
    return videoSegment;
  }

  disableGenerateVideoButton(): boolean {
    if (
      this.scene.imageGenerationSettings.selectedImageForVideo ||
      this.videoSettingsForm.get('prompt')?.value
    ) {
      return false;
    }
    return true;
  }

  rewriteVideoPrompt(): void {
    const currentPrompt = this.videoSettingsForm.get('prompt')?.value!;
    const sceneDescription = this.scene.description;
    const withSceneDescription = this.videoSettingsForm.get(
      'withSceneDescription'
    )?.value!;
    openSnackBar(
      this._snackBar,
      `Generating enhanced video prompt for scene ${this.scene.number}...`
    );
    this.textGenerationService
      .rewriteVideoPrompt(currentPrompt, sceneDescription, withSceneDescription)
      .subscribe({
        next: (enhancedPrompt: any) => {
          closeSnackBar(this._snackBar);
          if (enhancedPrompt && enhancedPrompt.data) {
            this.scene.imageGenerationSettings.prompt = enhancedPrompt.data;
            this.videoSettingsForm.get('prompt')?.setValue(enhancedPrompt.data);
          }
        },
        error: (error: any) => {
          let errorMessage;
          if (error.error.hasOwnProperty('detail')) {
            errorMessage = error.error.detail;
          }
          else {
            errorMessage = error.error.message;
          }
          console.error(errorMessage);
          openSnackBar(
            this._snackBar,
            `ERROR: ${errorMessage}. Please try again.`
          );
        },
      });
  }
}
