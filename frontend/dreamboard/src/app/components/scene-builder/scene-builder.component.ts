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
import { HttpResponse } from '@angular/common/http';
import { SceneSettingsDialogComponent } from '../scene-settings-dialog/scene-settings-dialog.component';
import { TransitionsSettingsDialogComponent } from '../transitions-settings-dialog/transitions-settings-dialog.component';
import { ComponentsCommunicationService } from '../../services/components-communication.service';
import { StoriesStorageService } from '../../services/stories-storage.service';

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
    private componentsCommunicationService: ComponentsCommunicationService,
    private storiesStorageService: StoriesStorageService
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

  createStory() {
    // On Create Story send them to the Stories tab
    this.componentsCommunicationService.tabChanged(0);
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
          // Find scenes in responses to update generated videos
          const executionStatus = updateScenesWithGeneratedVideos(
            resps,
            this.story.scenes
          );
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

  saveStory() {
    openSnackBar(this._snackBar, `Saving story...`);

    const user = localStorage.getItem('user')!;

    this.storiesStorageService.addNewStory(user, this.story).subscribe(
      (response: any) => {
        openSnackBar(this._snackBar, `Story saved succesfully!`, 15);
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
            const video: Video = {
              name: finalVideoReponse.name,
              signedUri: finalVideoReponse.signed_uri,
              gcsUri: finalVideoReponse.gcs_uri,
              gcsFusePath: finalVideoReponse.gcs_fuse_path,
              mimeType: finalVideoReponse.mime_type,
              frameUris: [], // TODO (ae) include later
            };
            this.story.generatedVideos = [video];
            // Trigger component communication to share story with generated video on Post Video Production
            this.componentsCommunicationService.videoGenerated(this.story);
            this.componentsCommunicationService.tabChanged(3);
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
        (images: ImageGenerationResponse[]) => {
          if (isExport) {
            openSnackBar(this._snackBar, `Scenes exported successfully!`, 15);
            this.story.scenes = videoScenes;
            this.exportingScenes = false;
          }
          // Find scene in responses to update generated images
          const executionStatus = updateScenesWithGeneratedImages(
            images,
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
