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
import { MatDividerModule } from '@angular/material/divider';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VideoScene } from '../../models/scene-models';
import {
  VideoGenerationRequest,
  VideoSegmentGenerationOperation,
  VideoGenerationResponse,
  Video,
  VideoItem,
} from '../../models/video-gen-models';
import { Image, ImageItem } from '../../models/image-gen-models';
import {
  getAspectRatios,
  getFramesPerSecondOptions,
  getPersonGenerationOptions,
  getOutputResolutionOptions,
  getDurationInSecsOptionsByModelNameAndVideoGenTask,
  updateScenesWithGeneratedVideos,
  getVideoModels,
  getVideoGenTasksByModelName,
  VEO_3_1_MODEL_NAME,
  VEO_3_1_FAST_MODEL_NAME,
  VEO_3_MODEL_NAME,
  VEO_3_FAST_MODEL_NAME,
} from '../../video-utils';
import { getOutputMimeTypes } from '../../image-utils';
import {
  SelectItem,
  UploadedFile,
  UploadedFileType,
} from '../../models/settings-models';
import { VideoGenerationService } from '../../services/video-generation.service';
import {
  openSnackBar,
  closeSnackBar,
  deleteElementFromArray,
} from '../../utils';
import { TextGenerationService } from '../../services/text-generation.service';
import { FileUploaderNewComponent } from '../file-uploader-new/file-uploader-new.component';
import { AssetsSelectionDialogComponent } from '../assets-selection-dialog/assets-selection-dialog.component';

@Component({
  selector: 'app-video-scene-settings',
  imports: [
    MatButtonModule,
    MatInputModule,
    MatDividerModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    FileUploaderNewComponent,
  ],
  templateUrl: './video-scene-settings.component.html',
  styleUrl: './video-scene-settings.component.css',
})
export class VideoSceneSettingsComponent implements AfterViewInit {
  @Input() scene!: VideoScene;
  @Input() storyId!: string;
  VEO_3_1_MODEL_NAME: string = VEO_3_1_MODEL_NAME;
  VEO_3_MODEL_NAME: string = VEO_3_MODEL_NAME;
  VEO_3_1_FAST_MODEL_NAME: string = VEO_3_1_FAST_MODEL_NAME;
  VEO_3_FAST_MODEL_NAME: string = VEO_3_FAST_MODEL_NAME;
  aspectRatioOptions: SelectItem[] = getAspectRatios();
  framesPerSecOptions: SelectItem[] = getFramesPerSecondOptions();
  imageMimeTypes: SelectItem[] = getOutputMimeTypes();
  personGenerationOptions: SelectItem[] = getPersonGenerationOptions();
  outputResolutionOptions: SelectItem[] = getOutputResolutionOptions();
  durationInSecsOptions: SelectItem[] =
    getDurationInSecsOptionsByModelNameAndVideoGenTask(
      VEO_3_1_MODEL_NAME,
      'text-to-video',
    );
  videoModelsOptions: SelectItem[] = getVideoModels();
  videoGenTasksOptions: SelectItem[] =
    getVideoGenTasksByModelName(VEO_3_1_MODEL_NAME);
  currentGeneratedVideoIndex: number = 0;
  private _snackBar = inject(MatSnackBar);
  assetsSelectionDialog = inject(MatDialog);
  uploadedAssets: any = []; // TODO (ae) this should video Image[] | Video[]
  assetsFromLibrary: any = []; // TODO (ae) this should video Image[] | Video[]

  videoSettingsForm = new FormGroup({
    videoModel: new FormControl(VEO_3_1_MODEL_NAME, [Validators.required]),
    videoGenTask: new FormControl('text-to-video', [Validators.required]),
    prompt: new FormControl('', []),
    sampleCount: new FormControl(2, []),
    durationInSecs: new FormControl('4', [Validators.required]),
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

  /**
   * Initializes the component with required services.
   * @param videoGenerationService - Service for generating videos.
   * @param textGenerationService - Service for text generation (e.g., prompt rewriting).
   */
  constructor(
    private videoGenerationService: VideoGenerationService,
    private textGenerationService: TextGenerationService,
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
    const veoModel = this.scene.videoGenerationSettings.videoModel
      ? this.scene.videoGenerationSettings.videoModel
      : VEO_3_1_MODEL_NAME;
    this.videoSettingsForm.controls['videoModel'].setValue(veoModel);
    const videoGenTask = this.scene.videoGenerationSettings.videoGenTask
      ? this.scene.videoGenerationSettings.videoGenTask
      : 'text-to-video';
    // Update task list based on model name
    this.videoGenTasksOptions = getVideoGenTasksByModelName(veoModel);
    this.durationInSecsOptions =
      getDurationInSecsOptionsByModelNameAndVideoGenTask(
        veoModel,
        videoGenTask,
      );
    this.videoSettingsForm.controls['videoGenTask'].setValue(videoGenTask);
    this.videoSettingsForm.controls['prompt'].setValue(
      this.scene.videoGenerationSettings.prompt,
    );
    this.videoSettingsForm.controls['aspectRatio'].setValue(
      this.scene.videoGenerationSettings.aspectRatio!,
    );
    this.videoSettingsForm.controls['durationInSecs'].setValue(
      this.scene.videoGenerationSettings.durationInSecs.toString(),
    );
    this.videoSettingsForm.controls['framesPerSec'].setValue(
      this.scene.videoGenerationSettings.framesPerSec?.toString()!,
    );
    this.videoSettingsForm.controls['personGeneration'].setValue(
      this.scene.videoGenerationSettings.personGeneration!,
    );
    this.videoSettingsForm.controls['outputResolution'].setValue(
      this.scene.videoGenerationSettings.outputResolution!,
    );
    this.videoSettingsForm.controls['sampleCount'].setValue(
      this.scene.videoGenerationSettings.sampleCount!,
    );
    this.videoSettingsForm.controls['negativePrompt'].setValue(
      this.scene.videoGenerationSettings.negativePrompt!,
    );
    this.videoSettingsForm.controls['enhancePrompt'].setValue(
      this.scene.videoGenerationSettings.enhancePrompt!,
    );
    this.videoSettingsForm.controls['generateAudio'].setValue(
      this.scene.videoGenerationSettings.generateAudio!,
    );
    this.videoSettingsForm.controls['includeVideoSegment'].setValue(
      this.scene.videoGenerationSettings.includeVideoSegment!,
    );
    this.videoSettingsForm.controls['regenerateVideo'].setValue(
      this.scene.videoGenerationSettings.regenerateVideo!,
    );
    this.videoSettingsForm.controls['cutVideo'].setValue(
      this.scene.videoGenerationSettings.cutVideo!,
    );
    this.videoCutSettingsForm.controls['startSeconds'].setValue(
      this.scene.videoGenerationSettings.startSeconds!,
    );
    this.videoCutSettingsForm.controls['startFrame'].setValue(
      this.scene.videoGenerationSettings.startFrame!,
    );
    this.videoCutSettingsForm.controls['endSeconds'].setValue(
      this.scene.videoGenerationSettings.endSeconds!,
    );
    this.videoCutSettingsForm.controls['endFrame'].setValue(
      this.scene.videoGenerationSettings.endFrame!,
    );
    // Update selected video if any
    if (this.scene.videoGenerationSettings.selectedVideoForMerge) {
      // Update selected video index in carrousel
      const updateForm = true;
      this.updateSelectedVideo(
        this.scene.videoGenerationSettings.selectedVideoForMerge.gcsUri,
        updateForm,
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
   * It also sets the `selectedVideoForMerge` based on the `currentGeneratedVideoIndex`.
   * @returns {void}
   */
  setVideoSettings(): void {
    this.scene.videoGenerationSettings.videoModel =
      this.videoSettingsForm.get('videoModel')?.value!;
    this.scene.videoGenerationSettings.videoGenTask =
      this.videoSettingsForm.get('videoGenTask')?.value!;
    this.scene.videoGenerationSettings.prompt =
      this.videoSettingsForm.get('prompt')?.value!;
    this.scene.videoGenerationSettings.durationInSecs = parseInt(
      this.videoSettingsForm.get('durationInSecs')?.value!,
    );
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
    const selectedVideoForMerge: Video =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentGeneratedVideoIndex
      ];
    this.scene.videoGenerationSettings.selectedVideoForMerge =
      selectedVideoForMerge;
  }

  /**
   * Handles the selection of a video model.
   * Updates available tasks and resets specific settings based on the selected model.
   * @param event - The change event containing the selected video model.
   */
  onVideoModelSelected(event: MatSelectChange) {
    const videoModel = event.value;
    // Update based on model name
    this.videoGenTasksOptions = getVideoGenTasksByModelName(videoModel);
    // Reset to text to video
    const videoGenTask = 'text-to-video';
    this.videoSettingsForm.controls['videoGenTask'].setValue(videoGenTask);
    this.setVideoDurationInSecs(videoModel, videoGenTask);
    this.scene.videoGenerationSettings.videoModel = videoModel;
    this.clearAssets();
  }

  /**
   * Handles the selection of a video generation task.
   * Updates duration options and clears selected assets.
   * @param event - The change event containing the selected task.
   */
  onVideoGenTaskSelected(event: MatSelectChange) {
    const videoGenTask = event.value;
    this.setVideoDurationInSecs(
      this.videoSettingsForm.get('videoModel')?.value!,
      videoGenTask,
    );
    this.scene.videoGenerationSettings.videoGenTask = videoGenTask;
    this.clearAssets();
  }

  /**
   * Sets the available duration options based on the selected model and task.
   * Defaults to the first available duration option.
   * @param videoModel - The selected video model name.
   * @param videoGenTask - The selected video generation task.
   */
  setVideoDurationInSecs(videoModel: string, videoGenTask: string) {
    // Update based on model name and video gen task
    this.durationInSecsOptions =
      getDurationInSecsOptionsByModelNameAndVideoGenTask(
        videoModel,
        videoGenTask,
      );
    this.videoSettingsForm.controls['durationInSecs'].setValue(
      this.durationInSecsOptions[0].value,
    );
  }

  /**
   * Clears all selected assets (images and videos) from the scene settings and local state.
   */
  clearAssets() {
    // Clear selected images for video and for extension
    this.scene.imageGenerationSettings.selectedImagesForVideo = [];
    this.scene.videoGenerationSettings.selectedVideosForExtension = [];
    this.uploadedAssets = [];
    this.assetsFromLibrary = [];
  }

  /**
   * Adds an uploaded file to the list of assets if it is a reference image.
   * @param file - The uploaded file object.
   */
  addUploadedFile(file: UploadedFile) {
    if (file.type === UploadedFileType.ReferenceImage) {
      const referenceImage: Image = {
        id: file.id,
        name: file.name,
        gcsUri: file.gcsUri,
        signedUri: file.signedUri,
        gcsFusePath: file.gcsFusePath,
        mimeType: file.mimeType,
      };
      this.uploadedAssets.push(referenceImage);
      // Add elements here to use later in validations for bulk generation
      this.scene.imageGenerationSettings.selectedImagesForVideo.push(
        referenceImage,
      );
    }
  }

  /**
   * Opens a dialog for selecting assets (images or videos) from the library.
   * Updates the scene settings with the selected assets upon closure.
   * @param assetType - The type of asset to select ('images' or 'videos').
   */
  openAssetsSelectionDialog(assetType: string) {
    const dialogRef = this.assetsSelectionDialog.open(
      AssetsSelectionDialogComponent,
      {
        minWidth: '800px',
        data: {
          storyId: this.storyId,
          scene: this.scene,
          assetType: assetType,
          maxAllowedSelectedAssets: this.getMaxAllowedSelectedAssets(),
        },
        disableClose: true, // Prevents closing on Escape key and backdrop click
      },
    );
    // Subscribe to the afterClosed() observable to receive data upon closure
    dialogRef.afterClosed().subscribe((selectedAssets: Image[] | Video[]) => {
      if (selectedAssets.length > 0) {
        this.assetsFromLibrary.push(...selectedAssets);
        // Add elements here to use later in validations for bulk generation
        if (assetType === 'images') {
          this.scene.imageGenerationSettings.selectedImagesForVideo.push(
            ...selectedAssets,
          );
        } else if (assetType === 'videos') {
          this.scene.videoGenerationSettings.selectedVideosForExtension.push(
            ...(selectedAssets as Video[]),
          );
        }
      }
    });
  }

  /**
   * Handles the deletion of an asset from the lists.
   * Removes the asset from local arrays and scene settings arrays.
   * @param asset - The asset (Image or Video) to be deleted.
   */
  onAssetDeleted(asset: Image | Video) {
    // Check if asset is in assetsFromLibrary array
    deleteElementFromArray(asset.id, this.assetsFromLibrary);
    // Check if asset is in uploadedAssets array
    deleteElementFromArray(asset.id, this.uploadedAssets);
    // Check if asset is in selectedImagesForVideos array
    if (asset.mimeType.includes('image')) {
      deleteElementFromArray(
        asset.id,
        this.scene.imageGenerationSettings.selectedImagesForVideo,
      );
    }
    // Check if asset is in selectedVideosForExtension array
    if (asset.mimeType.includes('video')) {
      deleteElementFromArray(
        asset.id,
        this.scene.videoGenerationSettings.selectedVideosForExtension,
      );
    }
  }

  /**
   * Determines the maximum number of assets allowed for selection based on the current model and task.
   * @returns The maximum number of allowed assets.
   */
  getMaxAllowedSelectedAssets() {
    const videoModel = this.videoSettingsForm.get('videoModel')?.value!;
    const videoGenTask = this.videoSettingsForm.get('videoGenTask')?.value!;

    if (
      videoModel === VEO_3_1_MODEL_NAME ||
      videoModel === VEO_3_1_FAST_MODEL_NAME
    ) {
      if (videoGenTask === 'image-to-video') {
        return 2;
      }
      if (videoGenTask === 'reference-to-video') {
        return 3;
      }
      if (videoGenTask === 'video-extension') {
        return 1;
      }
    }

    if (
      videoModel === VEO_3_MODEL_NAME ||
      videoModel === VEO_3_FAST_MODEL_NAME
    ) {
      if (videoGenTask === 'image-to-video') {
        return 1;
      }
    }

    return 0;
  }

  /**
   * Determines the `UploadedFileType` based on a given string identifier.
   * @param {string} type - A string representing the file type ('referenceImage' or 'userProvidedImage').
   * @returns {UploadedFileType} The corresponding `UploadedFileType` enum value, or `UploadedFileType.None` if no match.
   */
  getFileType(type: string): UploadedFileType {
    if (type == 'referenceImage') {
      return UploadedFileType.ReferenceImage;
    }
    if (type == 'userProvidedImage') {
      return UploadedFileType.UserProvidedImage;
    }

    return UploadedFileType.None;
  }

  /**
   * Navigates to the previous generated video in the `generatedVideos` array.
   * It updates `currentGeneratedVideoIndex` and sets the `selectedVideoUri` in the form
   * and `selectedVideoForMerge` in the scene to the previous video.
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
      generatedVideo.gcsUri,
    );
    // Set selected generated image in scene
    this.scene.videoGenerationSettings.selectedVideoForMerge = generatedVideo;
  }

  /**
   * Navigates to the next generated video in the `generatedVideos` array.
   * It updates `currentGeneratedVideoIndex` and sets the `selectedVideoUri` in the form
   * and `selectedVideoForMerge` in the scene to the next video.
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
      generatedVideo.gcsUri,
    );
    // Set selected generated image in scene
    this.scene.videoGenerationSettings.selectedVideoForMerge = generatedVideo;
  }

  /**
   * Handles the selection of a video from the dropdown.
   * It updates `currentGeneratedVideoIndex` based on the selected video's URI
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
   * Sets the `currentGeneratedVideoIndex` to the index of the video with the given URI
   * within the `generatedVideos` array of the current scene.
   * @param {string} gcsUri - The URI of the video to find.
   * @returns {void}
   */
  setCurrentGeneratedVideoIndex(gcsUri: string): void {
    const index = this.scene.videoGenerationSettings.generatedVideos.findIndex(
      (video) => video.gcsUri === gcsUri,
    );
    this.currentGeneratedVideoIndex = index;
  }

  /**
   * Updates the selected video for merging/extension and refreshes the UI.
   * @param gcsUri - The GCS URI of the selected video.
   * @param updateForm - Whether to update the form control value.
   */
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
    const selectedVideoForMerge =
      this.scene.videoGenerationSettings.generatedVideos[
        this.currentGeneratedVideoIndex
      ];
    // Set selected video in scene to be used as selectedVideoForMerge segment in final video
    this.scene.videoGenerationSettings.selectedVideoForMerge =
      selectedVideoForMerge;
  }

  /**
   * Initiates the video generation process for the current scene.
   * It displays a loading snackbar, constructs a `VideoGenerationRequest`,
   * sends it to the `VideoGenerationService`, and handles the API response.
   * Upon successful generation, it updates the scene's `generatedVideos` and selects the last one.
   * It also handles error responses by displaying an error snackbar.
   * @returns {void}
   */
  generateVideosFromScene(): void {
    openSnackBar(
      this._snackBar,
      `Generating video for scene ${this.scene.number}. This might take some time...`,
    );

    const videoGenerationRequest = this.buildVideoGenerationRequest();
    this.videoGenerationService
      .generateVideosFromScenes(this.storyId, videoGenerationRequest)
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
          if (executionStatus['execution_message'].includes('successfully')) {
            openSnackBar(
              this._snackBar,
              executionStatus['execution_message'],
              20,
            );
          } else {
            openSnackBar(this._snackBar, executionStatus['execution_message']);
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
            `ERROR: ${errorMessage}. Please try again.`,
          );
        },
      );
  }

  /**
   * Constructs a `VideoGenerationRequest` object based on the current values in the `videoSettingsForm`
   * and the associated `scene` data. This request object is used to send to the video generation API.
   * It includes details like prompt, duration, aspect ratio, and an optional seed image.
   * @returns {VideoGenerationRequest} The constructed video generation request object.
   */
  buildVideoGenerationRequest(): VideoGenerationRequest {
    const seedImages =
      this.scene.imageGenerationSettings.selectedImagesForVideo.map(
        (img: Image) => {
          const seedImage: ImageItem = {
            id: img.id,
            name: img.name,
            signed_uri: img.signedUri,
            gcs_uri: img.gcsUri,
            mime_type: img.mimeType,
            gcs_fuse_path: '', // Empty here, this is generated in the backend
          };
          return seedImage;
        },
      );

    const selectedVideosForExtension =
      this.scene.videoGenerationSettings.selectedVideosForExtension.map(
        (video: Video) => {
          const selectedVideoForExtension: VideoItem = {
            id: video.id,
            name: video.name,
            gcs_uri: video.gcsUri,
            signed_uri: video.signedUri,
            gcs_fuse_path: video.gcsFusePath,
            mime_type: video.mimeType,
            duration: video.duration,
          };
          return selectedVideoForExtension;
        },
      );

    const cutVideo = this.videoSettingsForm.get('cutVideo')?.value!;
    const videoSegment: VideoSegmentGenerationOperation = {
      id: this.scene.id,
      video_model: this.videoSettingsForm.get('videoModel')?.value!,
      video_gen_task: this.videoSettingsForm.get('videoGenTask')?.value!,
      prompt: this.videoSettingsForm.get('prompt')?.value!,
      seed_images: seedImages, // Can be null for text to video generation
      duration_in_secs: parseInt(
        this.videoSettingsForm.get('durationInSecs')?.value!,
      ),
      aspect_ratio: this.videoSettingsForm.get('aspectRatio')?.value!,
      frames_per_sec: parseInt(
        this.videoSettingsForm.get('framesPerSec')?.value!,
      ),
      person_generation: this.videoSettingsForm.get('personGeneration')?.value!,
      output_resolution: this.videoSettingsForm.get('outputResolution')?.value!,
      sample_count: this.videoSettingsForm.get('sampleCount')?.value!,
      /*seed?: this.videoSettingsForm.get('prompt')?.value;*/
      negative_prompt: this.videoSettingsForm.get('negativePrompt')?.value!,
      generate_audio: this.videoSettingsForm.get('generateAudio')?.value!,
      enhance_prompt: true, // Always true for Veo3
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
      selected_videos_for_extension: selectedVideosForExtension,
    };

    const videoGenerationRequest: VideoGenerationRequest = {
      video_segments: [videoSegment],
    };

    return videoGenerationRequest;
  }

  /**
   * Determines whether the "Generate Video" button should be disabled.
   * The button is enabled based on the selected video generation task:
   * - 'image-to-video' or 'reference-to-video': Requires selected images within allowed limits.
   * - 'video-extension': Requires a specific number of selected videos.
   * - 'text-to-video': Requires a valid prompt.
   * @returns {boolean} `true` if the button should be disabled, `false` otherwise.
   */
  disableGenerateVideoButton(): boolean {
    if (
      (this.videoSettingsForm.get('videoGenTask')?.value === 'image-to-video' &&
        this.scene.imageGenerationSettings.selectedImagesForVideo.length ===
          0) ||
      this.scene.imageGenerationSettings.selectedImagesForVideo.length >
        this.getMaxAllowedSelectedAssets()
    ) {
      return true;
    } else if (
      (this.videoSettingsForm.get('videoGenTask')?.value ===
        'reference-to-video' &&
        this.scene.imageGenerationSettings.selectedImagesForVideo.length ===
          0) ||
      this.scene.imageGenerationSettings.selectedImagesForVideo.length >
        this.getMaxAllowedSelectedAssets()
    ) {
      return true;
    } else if (
      this.videoSettingsForm.get('videoGenTask')?.value === 'video-extension' &&
      this.scene.videoGenerationSettings.selectedVideosForExtension.length !==
        this.getMaxAllowedSelectedAssets()
    ) {
      return true;
    } else if (
      this.videoSettingsForm.get('videoGenTask')?.value === 'text-to-video' &&
      !this.videoSettingsForm.get('prompt')?.value
    ) {
      return true;
    }

    return false;
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
      'withSceneDescription',
    )?.value!;

    openSnackBar(
      this._snackBar,
      `Generating enhanced video prompt for scene ${this.scene.number}...`,
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
            `ERROR: ${errorMessage}. Please try again.`,
          );
        },
      );
  }
}
