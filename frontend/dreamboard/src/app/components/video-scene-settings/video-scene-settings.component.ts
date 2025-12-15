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
 */

import {
  Component,
  Input,
  Output,
  AfterViewInit,
  inject,
  ViewChild,
  EventEmitter
} from '@angular/core';
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
import {
  SeedVideosInfo,
  Transition,
  VideoSegmentRequest,
} from '../../models/video-gen-models';
import {
  VideoGenerationRequest,
  VideoGenerationResponse,
  Video,
  VideoItem,
} from '../../models/video-gen-models';
import { SeedImagesInfo } from '../../models/image-gen-models';
import { getSeedImagesInfo } from '../../image-utils';
import {
  getAspectRatios,
  getFramesPerSecondOptions,
  getPersonGenerationOptions,
  getOutputResolutionOptions,
  updateScenesWithGeneratedVideos,
  getVideoModelNameOptions,
  getSeedVideosInfo,
} from '../../video-utils';
import { getOutputMimeTypes } from '../../image-utils';
import {
  IMAGES_SELECTION_FOR_VIDEO_TAB_INDEX,
  SelectItem,
  VIDEOS_SELECTION_FOR_VIDEO_TAB_INDEX,
} from '../../models/settings-models';
import { VideoGenerationService } from '../../services/video-generation.service';
import { openSnackBar, closeSnackBar } from '../../utils';
import { TextGenerationService } from '../../services/text-generation.service';
import { GeneratedVideosTableComponent } from '../generated-videos-table/generated-videos-table.component';

@Component({
  selector: 'app-video-scene-settings',
  imports: [
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    GeneratedVideosTableComponent,
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
  videoModelNameOptions: SelectItem[] = getVideoModelNameOptions('all');
  currentlyDisplayedVideoIndex: number = 0;
  private _snackBar = inject(MatSnackBar);
  @ViewChild(GeneratedVideosTableComponent)
  generatedVideosTableComponent!: GeneratedVideosTableComponent;
  @Output() goToTabEvent = new EventEmitter<number>();

  videoSettingsForm = new FormGroup({
    videoModelName: new FormControl('veo-3.0-generate-001', [
      Validators.required,
    ]),
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
    selectedVideoForMergeUri: new FormControl(''),
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
    this.videoSettingsForm.controls['videoModelName'].setValue(
      this.scene.videoGenerationSettings.videoModelName
    );
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
    if (this.scene.videoGenerationSettings.selectedVideoForMerge) {
      // Update selected video index in carrousel
      const updateForm = true;
      this.updateSelectedVideo(
        this.scene.videoGenerationSettings.selectedVideoForMerge.gcsUri,
        updateForm
      );
    }
    // Disable/enable video model name dropdown on Image to Video and Video to Video
    // according to selections in those UIs
    this.disableVideoModelNameDropdown();

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
   * It also sets the `selectedVideoForMerge` based on the `currentlyDisplayedVideoIndex`.
   * @returns {void}
   */
  setVideoSettings(updateVideoModelNameInVideoGenSettings: boolean): void {
    // To avoid overriding when saving the scene from the Images Selection For Videos tab
    if (updateVideoModelNameInVideoGenSettings) {
      this.scene.videoGenerationSettings.videoModelName =
        this.videoSettingsForm.get('videoModelName')?.value!;
    }
    this.scene.videoGenerationSettings.prompt =
      this.videoSettingsForm.get('prompt')?.value!;
    this.scene.videoGenerationSettings.durationInSecs =
      this.videoSettingsForm.get('durationInSecs')?.value!;
    this.scene.videoGenerationSettings.framesPerSec = parseInt(
      this.videoSettingsForm.get('framesPerSec')?.value!
    );
    this.scene.videoGenerationSettings.aspectRatio =
      this.videoSettingsForm.get('aspectRatio')?.value!;
    this.scene.videoGenerationSettings.personGeneration =
      this.videoSettingsForm.get('personGeneration')?.value!;
    this.scene.videoGenerationSettings.outputResolution =
      this.videoSettingsForm.get('outputResolution')?.value!;
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

    // Set up selected video for merge
    const selectedVideoForMerge: Video =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentlyDisplayedVideoIndex
      ];
    this.scene.videoGenerationSettings.selectedVideoForMerge =
      selectedVideoForMerge;
  }

  setVideoModelName(videoModelName: string): void {
    this.scene.videoGenerationSettings.videoModelName = videoModelName;
    this.videoSettingsForm.controls['videoModelName'].setValue(
      this.scene.videoGenerationSettings.videoModelName
    );
  }

  setSelectedVideosForVideo(selectedVideosForExtension: Video[]): void {
    this.scene.videoGenerationSettings.videosSelectionForVideoInfo.selectedVideosForVideo =
      selectedVideosForExtension;
  }

  disableVideoModelNameDropdown(): void {
    if (
      this.scene.imageGenerationSettings.imagesSelectionForVideoInfo
        .selectedImagesForVideo.length > 0 ||
      this.scene.videoGenerationSettings.videosSelectionForVideoInfo
        .selectedVideosForVideo.length > 0
    ) {
      this.videoSettingsForm.get('videoModelName')?.disable();
    } else {
      // Enable otherwise
      this.videoSettingsForm.get('videoModelName')?.enable();
    }
  }

  setVideoModelNameAccordingToSelectionType() {
    // Images Selection is P0
    if (
      this.scene.imageGenerationSettings.imagesSelectionForVideoInfo
        .selectedImagesForVideo.length > 0
    ) {
      this.setVideoModelName(
        this.scene.imageGenerationSettings.imagesSelectionForVideoInfo
          .selectedVideoModelName
      );
    } else if (
      this.scene.videoGenerationSettings.videosSelectionForVideoInfo
        .selectedVideosForVideo.length > 0
    ) {
      // Videos Selection for Extension is P1
      this.setVideoModelName(
        this.scene.videoGenerationSettings.videosSelectionForVideoInfo
          .selectedVideoModelName
      );
    } else {
      // Default to veo-3.0-generate-001 for Text to Video
      this.setVideoModelName('veo-3.0-generate-001');
      this.disableVideoModelNameDropdown();
    }
  }

  goToImagesSelectionForVideoTab() {
    this.goToTabEvent.emit(IMAGES_SELECTION_FOR_VIDEO_TAB_INDEX);
  }

  goToVideosSelectionForVideoTab() {
    this.goToTabEvent.emit(VIDEOS_SELECTION_FOR_VIDEO_TAB_INDEX);
  }

  onGeneratedVideoDeleted(deletedVideo: Video) {
    // 1. Need to store get current displayed video
    // BEFORE splice modifies the indexes
    const currentDisplayedVideo =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentlyDisplayedVideoIndex
      ];
    // 2. Delete deletedVideo from generatedVideos array
    // indexes will change now
    const delGenVideoIndex =
      this.scene.videoGenerationSettings.generatedVideos.findIndex(
        (genVideo: Video) => genVideo.id === deletedVideo.id
      );
    if (delGenVideoIndex > -1) {
      this.scene.videoGenerationSettings.generatedVideos.splice(
        delGenVideoIndex,
        1
      );
    }
    // 2. Update the carousel in case the deleted image was the one displayed
    this.updateVideosCarousel(deletedVideo, currentDisplayedVideo);
  }

  updateVideosCarousel(deletedVideo: Video, currentDisplayedVideo: Video) {
    // Video displayed in Carousel was deleted, needs to update it,
    // use latest generated video by default
    if (deletedVideo.id === currentDisplayedVideo.id) {
      if (this.scene.videoGenerationSettings.generatedVideos.length > 0) {
        // Since this is removing from array, check array length
        const latestGenVideo =
          this.scene.videoGenerationSettings.generatedVideos[
            this.scene.videoGenerationSettings.generatedVideos.length - 1
          ];
        this.setCurrentlyDisplayedVideoIndex(latestGenVideo.gcsUri);
      } else {
        // When array empty, set to default 0
        this.currentlyDisplayedVideoIndex = 0;
      }
    } else {
      // Since current was not deleted, update this.currentlyDisplayedVideoIndex
      // now that deletedVideo has been deleted and indexes
      // have updated in the array (length - 1)
      this.setCurrentlyDisplayedVideoIndex(currentDisplayedVideo.gcsUri);
    }
  }

  /**
   * Navigates to the previous generated video in the `generatedVideos` array.
   * It updates `currentlyDisplayedVideoIndex` and sets the `selectedVideoForMergeUri` in the form
   * and `selectedVideoForMerge` in the scene to the previous video.
   * It loops back to the last video if currently at the first video.
   * @returns {void}
   */
  onPrev(): void {
    const previousVideoIndex = this.currentlyDisplayedVideoIndex - 1;
    this.currentlyDisplayedVideoIndex =
      previousVideoIndex < 0
        ? this.scene.videoGenerationSettings.generatedVideos.length - 1
        : previousVideoIndex;

    const generatedVideo =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentlyDisplayedVideoIndex
      ];
    // Set selected generated image in form
    this.videoSettingsForm.controls['selectedVideoForMergeUri'].setValue(
      generatedVideo.gcsUri
    );
    // Set selected generated image in scene
    this.scene.videoGenerationSettings.selectedVideoForMerge = generatedVideo;
  }

  /**
   * Navigates to the next generated video in the `generatedVideos` array.
   * It updates `currentlyDisplayedVideoIndex` and sets the `selectedVideoForMergeUri` in the form
   * and `selectedVideoForMerge` in the scene to the next video.
   * It loops back to the first video if currently at the last video.
   * @returns {void}
   */
  onNext(): void {
    const nextVideoIndex = this.currentlyDisplayedVideoIndex + 1;
    this.currentlyDisplayedVideoIndex =
      nextVideoIndex ===
      this.scene.videoGenerationSettings.generatedVideos.length
        ? 0
        : nextVideoIndex;
    const generatedVideo =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentlyDisplayedVideoIndex
      ];
    // Set selected generated image in form
    this.videoSettingsForm.controls['selectedVideoForMergeUri'].setValue(
      generatedVideo.gcsUri
    );
    // Set selected generated image in scene
    this.scene.videoGenerationSettings.selectedVideoForMerge = generatedVideo;
  }

  /**
   * Handles the selection of a video from the dropdown.
   * It updates `currentlyDisplayedVideoIndex` based on the selected video's URI
   * and sets the `selectedVideoForMerge` in the scene.
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
   * Sets the `currentlyDisplayedVideoIndex` to the index of the video with the given URI
   * within the `generatedVideos` array of the current scene.
   * @param {string} gcsUri - The URI of the video to find.
   * @returns {void}
   */
  setCurrentlyDisplayedVideoIndex(gcsUri: string): void {
    const index = this.scene.videoGenerationSettings.generatedVideos.findIndex(
      (video) => video.gcsUri === gcsUri
    );
    this.currentlyDisplayedVideoIndex = index;
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
      this.videoSettingsForm.controls['selectedVideoForMergeUri'].setValue(
        gcsUri
      );
    }
    // Find video index in array
    this.setCurrentlyDisplayedVideoIndex(gcsUri);
    const selectedVideoForMerge =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentlyDisplayedVideoIndex
      ];
    // Set selected video in scene to be used as selectedVideoForMerge segment in final video
    this.scene.videoGenerationSettings.selectedVideoForMerge =
      selectedVideoForMerge;
  }

  removeSelectedImagesForVideo() {
    this.scene.imageGenerationSettings.imagesSelectionForVideoInfo.selectedImagesForVideo =
      [];
    this.setVideoModelNameAccordingToSelectionType();
  }

  removeSelectedVideosForVideo() {
    this.scene.videoGenerationSettings.videosSelectionForVideoInfo.selectedVideosForVideo =
      [];
    this.setVideoModelNameAccordingToSelectionType();
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
            // Refresh child component table with newly generated video
            // since @Input changes are not automatically triggered.
            this.generatedVideosTableComponent.refreshTable(false);
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
    // Add selected images for video as reference
    const seedImagesInfo: SeedImagesInfo | undefined = getSeedImagesInfo(
      this.scene
    );

    // Add selected videos for video for extend functionality
    const seedVideosInfo: SeedVideosInfo | undefined = getSeedVideosInfo(
      this.scene
    );

    const cutVideo = this.videoSettingsForm.get('cutVideo')?.value!;
    const videoSegment: VideoSegmentRequest = {
      scene_id: this.scene.id,
      segment_number: this.scene.number,
      video_model_name: this.videoSettingsForm.get('videoModelName')?.value!,
      prompt: this.videoSettingsForm.get('prompt')?.value!,
      seed_images_info: seedImagesInfo,
      duration_in_secs: this.videoSettingsForm.get('durationInSecs')?.value!,
      aspect_ratio: this.videoSettingsForm.get('aspectRatio')?.value!,
      frames_per_sec: parseInt(
        this.videoSettingsForm.get('framesPerSec')?.value!
      ),
      person_generation: this.videoSettingsForm.get('personGeneration')?.value!,
      output_resolution: this.videoSettingsForm.get('outputResolution')?.value!,
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
      selected_video_for_merge: undefined, // Since not required for the GENERATION operation
      seed_videos_info: seedVideosInfo,
    };

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
      this.scene.imageGenerationSettings.imagesSelectionForVideoInfo
        .selectedImagesForVideo.length > 0 ||
      this.scene.videoGenerationSettings.videosSelectionForVideoInfo
        .selectedVideosForVideo.length > 0 ||
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
