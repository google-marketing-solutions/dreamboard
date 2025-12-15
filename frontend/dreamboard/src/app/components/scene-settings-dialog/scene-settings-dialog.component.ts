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
 * @fileoverview This component provides a dialog interface for managing the settings
 * of a single video scene. It integrates sub-components for image and video generation settings
 * and allows for updating the scene's description and saving changes.
 */

import { Component, inject, ViewChild, AfterViewInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { VideoScene } from '../../models/scene-models';
import { ImageSceneSettingsComponent } from '../image-scene-settings/image-scene-settings.component';
import { ImageSelectionSettingsComponent } from '../image-selection-settings/image-selection-settings.component';
import { VideoSelectionSettingsComponent } from '../video-selection-settings/video-selection-settings.component';
import { VideoSceneSettingsComponent } from '../video-scene-settings/video-scene-settings.component';
import { IMAGE_GENERATION_SETTINGS_TAB_INDEX, IMAGES_SELECTION_FOR_VIDEO_TAB_INDEX, VIDEO_GENERATION_SETTINGS_TAB_INDEX, VIDEOS_SELECTION_FOR_VIDEO_TAB_INDEX } from '../../models/settings-models';

@Component({
  selector: 'app-scene-settings-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogModule,
    MatInputModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    ImageSceneSettingsComponent,
    ImageSelectionSettingsComponent,
    VideoSelectionSettingsComponent,
    VideoSceneSettingsComponent,
  ],
  templateUrl: './scene-settings-dialog.component.html',
  styleUrl: './scene-settings-dialog.component.css',
})
export class SceneSettingsDialogComponent implements AfterViewInit {
  title = 'Settings';
  dialogData: any = inject(MAT_DIALOG_DATA);
  storyId = this.dialogData.storyId;
  scene: VideoScene = this.dialogData.scene;
  scenes: VideoScene[] = this.dialogData.scenes;
  @ViewChild('stepper') private myStepper!: MatStepper;
  @ViewChild(ImageSceneSettingsComponent)
  imageSceneSettingsComponent!: ImageSceneSettingsComponent;
  @ViewChild(ImageSelectionSettingsComponent)
  imageSelectionSettingsComponent!: ImageSelectionSettingsComponent;
  @ViewChild(VideoSelectionSettingsComponent)
  videoSelectionSettingsComponent!: VideoSelectionSettingsComponent;
  @ViewChild(VideoSceneSettingsComponent)
  videoSceneSettingsComponent!: VideoSceneSettingsComponent;
  selectedTabIndex: number = 0;

  sceneSettingsForm = new FormGroup({
    sceneDescription: new FormControl('', []),
  });

  constructor(public dialogRef: MatDialogRef<SceneSettingsDialogComponent>) {}

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   * It initializes the 'sceneDescription' form control with the description
   * from the `scene` data provided to the dialog.
   * @returns {void}
   */
  ngAfterViewInit(): void {
    this.sceneSettingsForm.controls['sceneDescription'].setValue(
      this.scene.description
    );
    this.imageSceneSettingsComponent.setCurrentlyDisplayedImageIndex(
      this.dialogData.currentlyDisplayedImageIndex
    );
  }

  onStepChange(event: StepperSelectionEvent): void {
    this.selectedTabIndex = event.selectedIndex;
    // If moving to Image Generation Settings index === 0, save video settings
    if (event.selectedIndex === IMAGE_GENERATION_SETTINGS_TAB_INDEX) {
      /* COMMENT THIS OUT FOR NOW to not replace values on tab changes
      this.updateSceneVideoSettings(true);*/
    }
    // If moving to Images Selection For Video index === 1, update generated images table
    /*if (event.selectedIndex === IMAGES_SELECTION_FOR_VIDEO_TAB_INDEX) {
      this.updateImagesSelectionSettings();
    }
    // If moving to Video Selection for Extension index === 2, update generated videos table
    if (event.selectedIndex === VIDEOS_SELECTION_FOR_VIDEO_TAB_INDEX) {
      this.updateVideoSelectionForExtensionSettings();
    }*/
   this.updateImagesSelectionSettings();
   this.updateVideoSelectionForExtensionSettings();
    // If moving to Video Generation Settings index === 3, save image settings
    // and update any selected reference image from Image Selection Settings tab
    if (event.selectedIndex === VIDEO_GENERATION_SETTINGS_TAB_INDEX) {
      /* COMMENT THIS OUT FOR NOW to not replace values on tab changes
      this.updateSceneImageSettings(true);*/
      this.updateImagesSelectionForVideoGenerationSettings();
      this.updateVideoSelectionForVideoGenerationSettings();
    }
  }

  goToVideoGenerationSettings() {
    if (this.myStepper) {
      this.myStepper.selectedIndex = VIDEO_GENERATION_SETTINGS_TAB_INDEX;
    }
  }

  goToTab(tab: number) {
    this.myStepper.selectedIndex = tab;
  }

  /**
   * Handles changes in the image settings view.
   * This method is typically called when the user navigates between stepper steps
   * or explicitly triggers an update related to image settings.
   * It ensures that the image settings for the scene are updated and
   * that the video settings form is re-initialized for display.
   * @returns {void}
   */
  onImageSettingsViewChange(): void {
    this.updateSceneImageSettings(true);
  }

  /**
   * Handles changes in the video settings view.
   * This method is typically called when the user navigates between stepper steps
   * or explicitly triggers an update related to video settings.
   * It ensures that the video settings for the scene are updated and
   * that the image settings form is re-initialized for display.
   * @returns {void}
   */
  onVideoSettingsViewChange(): void {
    this.updateSceneVideoSettings(true);
  }

  /**
   * Saves all current scene settings, including the scene description, image settings,
   * and video settings, by calling the respective update methods.
   * This method is typically invoked when the user confirms their changes in the dialog.
   * @returns {void}
   */
  save(): void {
    // Save changes in tab 0
    this.updateSceneImageSettings(false);
    // Save changes in tab 1
    this.updateImagesSelectionForVideoGenerationSettings();
    // Save changes in tab 2
    this.updateVideoSelectionForVideoGenerationSettings();
    // Save changes in tab 3
    this.updateSceneVideoSettings(false);
    this.dialogRef.close({
      currentlyDisplayedImageIndex:
        this.imageSceneSettingsComponent.getCurrentlyDisplayedImageIndex(),
    });
  }

  /**
   * Closes the dialog and saves all the changes.
   * @returns {void}
   */
  close(): void {
    this.save();
    this.dialogRef.close({
      currentlyDisplayedImageIndex:
        this.imageSceneSettingsComponent.getCurrentlyDisplayedImageIndex(),
    });
  }

  cancel(): void {
    this.dialogRef.close({
      currentlyDisplayedImageIndex: -1,
    });
  }

  /**
   * Updates the image generation settings of the current scene based on the form values
   * and the `ImageSceneSettingsComponent`.
   * It also updates the scene's description from the form.
   * Optionally re-initializes the video settings form if `initView` is true,
   * which is useful when navigating between tabs/stepper steps.
   * @param {boolean} initView - If true, re-initializes the video settings form.
   * @returns {void}
   */
  updateSceneImageSettings(initView: boolean): void {
    this.scene.description =
      this.sceneSettingsForm.get('sceneDescription')?.value!;
    this.imageSceneSettingsComponent.setImageSettings();
    if (initView) {
      this.videoSceneSettingsComponent.initVideoSettingsForm();
    }
  }

  updateImagesSelectionSettings(): void {
    // Update table manually since it's not populated automatically on tab change
    // only initial view generation
    this.imageSelectionSettingsComponent.refreshGeneratedImagesTableComponent();
    this.imageSelectionSettingsComponent.setGeneratedImagesTableSelection();
  }

  updateVideoSelectionForExtensionSettings(): void {
    // Update table manually since it's not populated automatically on tab change
    // only initial view generation
    this.videoSelectionSettingsComponent.refreshGeneratedImagesTableComponent();
    this.videoSelectionSettingsComponent.setGeneratedVideosTableSelection();
  }

  updateImagesSelectionForVideoGenerationSettings(): void {
    // Update the selected images for videos in ImageGenerationSettings
    const selectedImagesForVideo =
      this.imageSelectionSettingsComponent.getSelectedImagesForVideo();
    const imagesSelectionType =
      this.imageSelectionSettingsComponent.getImagesSelectionType();
    this.imageSceneSettingsComponent.setSelectedImagesForVideo(
      imagesSelectionType,
      selectedImagesForVideo
    );
    const selectedVideoModelName =
      this.imageSelectionSettingsComponent.getVideoModelName();
    this.scene.imageGenerationSettings.imagesSelectionForVideoInfo.selectedVideoModelName =
      selectedVideoModelName;
    // Update the selected video model name in VideoGenerationSettings
    this.videoSceneSettingsComponent.setVideoModelNameAccordingToSelectionType();
    this.videoSceneSettingsComponent.disableVideoModelNameDropdown();
  }

  updateVideoSelectionForVideoGenerationSettings(): void {
    // Update the selected videos for extension in VideoGenerationSettings
    const selectedVideosForVideo =
      this.videoSelectionSettingsComponent.getSelectedVideosForVideo();
    this.videoSceneSettingsComponent.setSelectedVideosForVideo(
      selectedVideosForVideo
    );
    const selectedVideoModelName =
      this.videoSelectionSettingsComponent.getVideoModelName();
    this.scene.videoGenerationSettings.videosSelectionForVideoInfo.selectedVideoModelName =
      selectedVideoModelName;
    // Update the selected video model name in VideoGenerationSettings
    this.videoSceneSettingsComponent.setVideoModelNameAccordingToSelectionType();
    this.videoSceneSettingsComponent.disableVideoModelNameDropdown();
  }

  /**
   * Updates the video generation settings of the current scene based on the form values
   * and the `VideoSceneSettingsComponent`.
   * It also updates the scene's description from the form.
   * Optionally re-initializes the image settings form if `initView` is true,
   * which is useful when navigating between tabs/stepper steps.
   * @param {boolean} initView - If true, re-initializes the image settings form.
   * @returns {void}
   */
  updateSceneVideoSettings(initView: boolean): void {
    this.scene.description =
      this.sceneSettingsForm.get('sceneDescription')?.value!;
    // To avoid overriding when saving the scene from the Images Selection For Videos tab
    const updateVideoModelNameInVideoGenSettings = this.selectedTabIndex === 2;
    this.videoSceneSettingsComponent.setVideoSettings(
      updateVideoModelNameInVideoGenSettings
    );
    if (initView) {
      this.imageSceneSettingsComponent.initImageSettingsForm();
    }
  }

  /**
   * Handles the update of the scene description field from a UI event.
   * It extracts the new description value from the event and updates the
   * `scene.description` property directly.
   * @param {any} event - The DOM event object from the input field.
   * @returns {void}
   */
  onDescriptionUpdated(event: any): void {
    const description = event.target.value;
    this.scene.description = description;
  }
}
