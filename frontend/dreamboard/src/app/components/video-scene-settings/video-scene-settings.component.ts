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
import { Image, ImageItem } from '../../models/image-gen-models';
import {
  getAspectRatios,
  getFramesPerSecondOptions,
  getPersonGenerationOptions,
  getOutputResolutionOptions,
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
  @Input() scene!: VideoScene;
  @Input() storyId!: string;
  aspectRatios: SelectItem[] = getAspectRatios();
  framesPerSecOptions: SelectItem[] = getFramesPerSecondOptions();
  imageMimeTypes: SelectItem[] = getOutputMimeTypes();
  personGenerationOptions: SelectItem[] = getPersonGenerationOptions();
  outputResolutionOptions: SelectItem[] = getOutputResolutionOptions();
  currentGeneratedVideoIndex: number = 0;
  private _snackBar = inject(MatSnackBar);

  videoSettingsForm = new FormGroup({
    prompt: new FormControl('', []),
    sampleCount: new FormControl(2, []),
    durationInSecs: new FormControl(4, [Validators.required]),
    aspectRatio: new FormControl('16:9', []),
    framesPerSec: new FormControl('24', []),
    personGeneration: new FormControl('allow_adult', []),
    outputResolution: new FormControl('1080p', []),
    /*seed: new FormControl(-1, []),*/
    negativePrompt: new FormControl('', []),
    enhancePrompt: new FormControl(true, []),
    generateAudio: new FormControl(true, []),
    includeVideoSegment: new FormControl(true, []),
    regenerateVideo: new FormControl(true, []),
    cutVideo: new FormControl(false, []),
    selectedVideoUri: new FormControl(''),
    withSceneDescription: new FormControl(true, []),
  });

  videoCutSettingsForm = new FormGroup({
    startSeconds: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(7),
    ]),
    startFrame: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(23),
    ]),
    endSeconds: new FormControl(7, [
      Validators.required,
      Validators.min(0),
      Validators.max(7),
    ]),
    endFrame: new FormControl(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(23),
    ]),
  });

  constructor(
    private videoGenerationService: VideoGenerationService,
    private textGenerationService: TextGenerationService
  ) {}

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   * It initializes the video settings form with values from the current scene.
   * @returns {void}
   */
  ngAfterViewInit(): void {
    this.initVideoSettingsForm();
  }

  /**
   * Initializes the `videoSettingsForm` with the current video generation settings
   * from the `scene` input property. This ensures the form reflects the existing state.
   * @returns {void}
   */
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
    this.videoSettingsForm.controls['outputResolution'].setValue(
      this.scene.videoGenerationSettings.outputResolution!
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
    this.videoSettingsForm.controls['cutVideo'].setValue(
      this.scene.videoGenerationSettings.cutVideo!
    );
    this.videoCutSettingsForm.controls['startSeconds'].setValue(
      this.scene.videoGenerationSettings.startSeconds!
    );
    this.videoCutSettingsForm.controls['startFrame'].setValue(
      this.scene.videoGenerationSettings.startFrame!
    );
    this.videoCutSettingsForm.controls['endSeconds'].setValue(
      this.scene.videoGenerationSettings.endSeconds!
    );
    this.videoCutSettingsForm.controls['endFrame'].setValue(
      this.scene.videoGenerationSettings.endFrame!
    );
    // Update selected video if any
    if (this.scene.videoGenerationSettings.selectedVideo) {
      // Update selected video index in carrousel
      const updateForm = true;
      this.updateSelectedVideo(
        this.scene.videoGenerationSettings.selectedVideo.gcsUri,
        updateForm
      );
    }

    // Trigger validation for Video cut settings
    if (this.scene.videoGenerationSettings.cutVideo) {
      this.videoCutSettingsForm.get('startSeconds')?.markAsTouched();
      this.videoCutSettingsForm.get('startFrame')?.markAsTouched();
      this.videoCutSettingsForm.get('endSeconds')?.markAsTouched();
      this.videoCutSettingsForm.get('endFrame')?.markAsTouched();
    }
  }

  /**
   * Updates the `scene.videoGenerationSettings` object with the current values from the `videoSettingsForm`.
   * This method ensures that changes made in the UI form are reflected in the underlying scene data model.
   * It also sets the `selectedVideo` based on the `currentGeneratedVideoIndex`.
   * @returns {void}
   */
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
    /*this.scene.videoGenerationSettings.seed = this.videoSettingsForm.get('seed')?.value!;*/
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
    this.scene.videoGenerationSettings.cutVideo =
      this.videoSettingsForm.get('cutVideo')?.value!;
    this.scene.videoGenerationSettings.startSeconds =
      this.videoCutSettingsForm.get('startSeconds')?.value!;
    this.scene.videoGenerationSettings.startFrame =
      this.videoCutSettingsForm.get('startFrame')?.value!;
    this.scene.videoGenerationSettings.endSeconds =
      this.videoCutSettingsForm.get('endSeconds')?.value!;
    this.scene.videoGenerationSettings.endFrame =
      this.videoCutSettingsForm.get('endFrame')?.value!;
    // Set up selected image. generatedImages array is populated after API call
    const selectedVideo: Video =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentGeneratedVideoIndex
      ];
    this.scene.videoGenerationSettings.selectedVideo = selectedVideo;
  }

  setVideoModelName(videoModelName: string) {
    this.scene.videoGenerationSettings.videoModelName = videoModelName;
  }

  /**
   * Checks if a previous video segment has been generated and selected for the current scene.
   * @returns {boolean} `true` if a video segment is selected, `false` otherwise.
   */
  isPrevVideoSegmentGenerated(): boolean {
    return this.scene.videoGenerationSettings.selectedVideo !== undefined;
  }

  /**
   * Navigates to the previous generated video in the `generatedVideos` array.
   * It updates `currentGeneratedVideoIndex` and sets the `selectedVideoUri` in the form
   * and `selectedVideo` in the scene to the previous video.
   * It loops back to the last video if currently at the first video.
   * @returns {void}
   */
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
    // Set selected generated image in form
    this.videoSettingsForm.controls['selectedVideoUri'].setValue(
      generatedVideo.gcsUri
    );
    // Set selected generated image in scene
    this.scene.videoGenerationSettings.selectedVideo = generatedVideo;
  }

  /**
   * Navigates to the next generated video in the `generatedVideos` array.
   * It updates `currentGeneratedVideoIndex` and sets the `selectedVideoUri` in the form
   * and `selectedVideo` in the scene to the next video.
   * It loops back to the first video if currently at the last video.
   * @returns {void}
   */
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
    // Set selected generated image in form
    this.videoSettingsForm.controls['selectedVideoUri'].setValue(
      generatedVideo.gcsUri
    );
    // Set selected generated image in scene
    this.scene.videoGenerationSettings.selectedVideo = generatedVideo;
  }

  /**
   * Handles the selection of a video from the dropdown.
   * It updates `currentGeneratedVideoIndex` based on the selected video's URI
   * and sets the `selectedVideo` in the scene.
   * @param {MatSelectChange} event - The change event from the MatSelect component,
   * containing the URI of the selected video in `event.value`.
   * @returns {void}
   */
  onVideoSelected(event: MatSelectChange): void {
    const videoUri = event.value;
    const updateForm = false;
    this.updateSelectedVideo(videoUri, updateForm);
  }

  /**
   * Sets the `currentGeneratedVideoIndex` to the index of the video with the given URI
   * within the `generatedVideos` array of the current scene.
   * @param {string} gcsUri - The URI of the video to find.
   * @returns {void}
   */
  setCurrentGeneratedVideoIndex(gcsUri: string): void {
    const index = this.scene.videoGenerationSettings.generatedVideos.findIndex(
      (video) => video.gcsUri === gcsUri
    );
    this.currentGeneratedVideoIndex = index;
  }

  updateSelectedVideo(gcsUri: string, updateForm: boolean) {
    // Reload video in the Scene Builder HTML element to update it
    // since reload does not happen when the object is updated
    const videoHTML: any = document.getElementById(`video@${this.scene.id}`);
    if (videoHTML) {
      videoHTML.load();
    }
    // Update selected video in form
    if (updateForm) {
      this.videoSettingsForm.controls['selectedVideoUri'].setValue(gcsUri);
    }
    // Find video index in array
    this.setCurrentGeneratedVideoIndex(gcsUri);
    const selectedVideo =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentGeneratedVideoIndex
      ];
    // Set selected video in scene to be used as selectedVideo segment in final video
    this.scene.videoGenerationSettings.selectedVideo = selectedVideo;
  }

  removeSelectedImagesForVideo() {
    this.scene.imageGenerationSettings.selectedImagesForVideo = [];
  }

  /**
   * Initiates the video generation process for the current scene.
   * It displays a loading snackbar, constructs a `VideoGenerationRequest`,
   * sends it to the `VideoGenerationService`, and handles the API response.
   * Upon successful generation, it updates the scene's `generatedVideos` and selects the first one.
   * It also handles error responses by displaying an error snackbar.
   * @returns {void}
   */
  generateVideosFromScene(): void {
    openSnackBar(
      this._snackBar,
      `Generating video for scene ${this.scene.number}. This might take some time...`
    );

    const videoGeneration: VideoGenerationRequest = {
      video_segments: [this.buildVideoSegment()],
      creative_direction: undefined, // for now
    };
    this.videoGenerationService
      .generateVideosFromScenes(this.storyId, videoGeneration)
      .subscribe(
        (resps: VideoGenerationResponse[]) => {
          // Find scene in responses to update generated videos
          const executionStatus = updateScenesWithGeneratedVideos(resps, [
            this.scene,
          ]);
          // Set selected video for video segment generation
          if (this.scene.videoGenerationSettings.generatedVideos.length > 0) {
            // Select the last video
            const lastVideo =
              this.scene.videoGenerationSettings.generatedVideos[
                this.scene.videoGenerationSettings.generatedVideos.length - 1
              ];
            const updateForm = true;
            this.updateSelectedVideo(lastVideo.gcsUri, updateForm);
          }
          openSnackBar(
            this._snackBar,
            executionStatus['execution_message'],
            20
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
   * Constructs a `VideoSegmentRequest` object based on the current values in the `videoSettingsForm`
   * and the associated `scene` data. This request object is used to send to the video generation API.
   * It includes details like prompt, duration, aspect ratio, and an optional seed image.
   * @returns {VideoSegmentRequest} The constructed video segment request object.
   */
  buildVideoSegment(): VideoSegmentRequest {
    const imagesForVideo = this.scene.imageGenerationSettings.selectedImagesForVideo.map((img: Image) => {
      const seedImage: ImageItem = {
        id: img.id,
        name: img.name,
        signed_uri:
          img.signedUri,
        gcs_uri:
          img.gcsUri,
        mime_type:
          img.mimeType,
        gcs_fuse_path: '', // Empty here, this is generated in the backend
      };
      return seedImage
    });

    const cutVideo = this.videoSettingsForm.get('cutVideo')?.value!;
    const videoSegment: VideoSegmentRequest = {
      scene_id: this.scene.id,
      segment_number: this.scene.number,
      prompt: this.videoSettingsForm.get('prompt')?.value!,
      seed_images: imagesForVideo,
      duration_in_secs: this.videoSettingsForm.get('durationInSecs')?.value!,
      aspect_ratio: this.videoSettingsForm.get('aspectRatio')?.value!,
      frames_per_sec: parseInt(
        this.videoSettingsForm.get('framesPerSec')?.value!
      ),
      person_generation: this.videoSettingsForm.get('personGeneration')?.value!,
      outputResolution: this.videoSettingsForm.get('outputResolution')?.value!,
      sample_count: this.videoSettingsForm.get('sampleCount')?.value!,
      /*seed?: this.videoSettingsForm.get('prompt')?.value;*/
      negative_prompt: this.videoSettingsForm.get('negativePrompt')?.value!,
      transition: Transition.CONCATENATE, // default since it's not used for single video
      generate_audio: this.videoSettingsForm.get('generateAudio')?.value!,
      enhance_prompt: true, // Always true for Veo3
      use_last_frame: false, // False for now
      include_video_segment: this.videoSettingsForm.get('includeVideoSegment')
        ?.value!,
      generate_video_frames: false, // TODO (ae): include this later
      regenerate_video_segment: true, // true for single video generation
      cut_video: cutVideo,
      // Add cut video options if cutVideo checkbox is true
      start_seconds: cutVideo
        ? this.videoCutSettingsForm.get('startSeconds')?.value!
        : 0,
      start_frame: cutVideo
        ? this.videoCutSettingsForm.get('startFrame')?.value!
        : 0,
      end_seconds: cutVideo
        ? this.videoCutSettingsForm.get('endSeconds')?.value!
        : 7,
      end_frame: cutVideo
        ? this.videoCutSettingsForm.get('endFrame')?.value!
        : parseInt(this.videoSettingsForm.get('framesPerSec')?.value!) - 1,
      selected_video: undefined, // Since not required for the GENERATION operation
    };

    console.log('Video Segment: ' + videoSegment);
    return videoSegment;
  }

  /**
   * Determines whether the "Generate Video" button should be disabled.
   * The button is enabled if a seed image is selected for the scene,
   * or if the video prompt in the form is valid.
   * @returns {boolean} `true` if the button should be disabled, `false` otherwise.
   */
  disableGenerateVideoButton(): boolean {
    if (
      this.scene.imageGenerationSettings.selectedImagesForVideo.length === 0 ||
      this.videoSettingsForm.get('prompt')?.value
    ) {
      // For Image to Video, prompt is not required
      return false;
    }

    return true;
  }

  /**
   * Rewrites the video prompt for the current scene using the `TextGenerationService`.
   * It displays a loading snackbar, sends the current prompt and scene description
   * to the text generation API, and updates the form and scene with the enhanced prompt.
   * It also handles error responses by displaying an error snackbar.
   * @returns {void}
   */
  rewriteVideoPrompt(): void {
    let currentPrompt = this.videoSettingsForm.get('prompt')?.value!;
    let sceneDescription = this.scene.description;
    const withSceneDescription = this.videoSettingsForm.get(
      'withSceneDescription'
    )?.value!;

    openSnackBar(
      this._snackBar,
      `Generating enhanced video prompt for scene ${this.scene.number}...`
    );

    this.textGenerationService
      .rewriteVideoPrompt(currentPrompt, sceneDescription, withSceneDescription)
      .subscribe(
        (enhancedPrompt: any) => {
          // Find scene in responses to update generated videos
          closeSnackBar(this._snackBar);
          if (enhancedPrompt && enhancedPrompt.data) {
            this.scene.imageGenerationSettings.prompt = enhancedPrompt.data;
            this.videoSettingsForm.get('prompt')?.setValue(enhancedPrompt.data);
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
}
