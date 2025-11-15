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
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { VideoScene } from '../../models/scene-models';
import { ImageSceneSettingsComponent } from '../image-scene-settings/image-scene-settings.component';
import { ImageSelectionSettingsComponent } from '../image-selection-settings/image-selection-settings.component';
import { VideoSceneSettingsComponent } from '../video-scene-settings/video-scene-settings.component';

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
    VideoSceneSettingsComponent,
  ],
  templateUrl: './scene-settings-dialog.component.html',
  styleUrl: './scene-settings-dialog.component.css',
})
export class SceneSettingsDialogComponent implements AfterViewInit {
  title = 'Scene Settings';
  dialogData: any = inject(MAT_DIALOG_DATA);
  storyId = this.dialogData.storyId;
  scene: VideoScene = this.dialogData.scene;
  scenes: VideoScene[] = this.dialogData.scenes;
  @ViewChild(ImageSceneSettingsComponent)
  imageSceneSettingsComponent!: ImageSceneSettingsComponent;
  @ViewChild(ImageSelectionSettingsComponent)
  imageSelectionSettingsComponent!: ImageSelectionSettingsComponent;
  @ViewChild(VideoSceneSettingsComponent)
  videoSceneSettingsComponent!: VideoSceneSettingsComponent;
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
    // If moving to image settings index === 0, save video settings
    if (event.selectedIndex === 0) {
      this.updateSceneVideoSettings(true);
    }
    // If moving to image selection settings index === 1, update generated images table
    if (event.selectedIndex === 1) {
      this.updateImageSelectionSettings();
    }
    // If moving to video settings index === 2, save image settings
    // and update any selected reference image from Image Selection Settings tab
    if (event.selectedIndex === 2) {
      this.updateSceneImageSettings(true);
      this.updateImagesSelectionForVideoDetails();
    }
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
    this.updateSceneImageSettings(false);
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

  updateImageSelectionSettings(): void {
    this.imageSelectionSettingsComponent.refreshGeneratedImagesTableComponent();
  }

  updateImagesSelectionForVideoDetails(): void {
    // Update the selected images for videos
    // in ImageGenerationSettings
    const selectedImagesForVideo =
      this.imageSelectionSettingsComponent.getSelectedImagesForVideo();
    this.imageSceneSettingsComponent.setSelectedImagesForVideo(
      selectedImagesForVideo
    );
    // Update the selected video model name in VideoGenerationSettings
    const videoModelName =
      this.imageSelectionSettingsComponent.getVideoModelName();
    this.videoSceneSettingsComponent.setVideoModelName(videoModelName);
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
    this.videoSceneSettingsComponent.setVideoSettings();
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
