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
 * @fileoverview This component provides a dialog for users to configure video transition settings
 * for a specific scene. It allows selecting from a predefined list of transition types.
 */

import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { VideoScene } from '../../models/scene-models';
import { Transition } from '../../models/video-gen-models';
import { SelectItem } from '../../models/settings-models';
import { getVideoTransitions } from '../../video-utils';

@Component({
  selector: 'app-transitions-settings-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './transitions-settings-dialog.component.html',
  styleUrl: './transitions-settings-dialog.component.css',
})
export class TransitionsSettingsDialogComponent {
  title = 'Transition Settings';
  dialogData: any = inject(MAT_DIALOG_DATA);
  scene: VideoScene = this.dialogData.scene;
  transitions: SelectItem[] = getVideoTransitions();

  transitionsSettingsForm = new FormGroup({
    transition: new FormControl('CONCATENATE', []),
  });

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   * It initializes the 'transition' form control with the current transition setting
   * from the `scene` data provided to the dialog.
   * @returns {void}
   */
  ngAfterViewInit(): void {
    if (this.scene.videoGenerationSettings.transition) {
      this.transitionsSettingsForm.controls['transition'].setValue(
        this.scene.videoGenerationSettings.transition
      );
    } else {
      this.transitionsSettingsForm.controls['transition'].setValue(
        'CONCATENATE'
      );
    }
  }

  /**
   * Saves the selected transition setting to the `scene` object.
   * It retrieves the current value from the 'transition' form control,
   * resolves it to a valid `Transition` enum value, and updates the
   * `scene.videoGenerationSettings.transition` property.
   * @returns {void}
   */
  save(): void {
    const transition = this.getTransition(
      this.transitionsSettingsForm.get('transition')?.value!
    );
    this.scene.videoGenerationSettings.transition = transition;
  }

  /**
   * Resolves a string representation of a transition to its corresponding `Transition` enum member.
   * This function provides a mapping from string values (e.g., from a select dropdown)
   * to the strongly-typed `Transition` enum. If the provided string does not match
   * any known transition, it defaults to `Transition.CONCATENATE`.
   * @param {string} transition - The string value of the transition to resolve.
   * @returns {Transition} The corresponding `Transition` enum member.
   */
  getTransition(transition: string): Transition {
    if (transition === Transition.X_FADE) {
      return Transition.X_FADE;
    }
    if (transition === Transition.WIPE) {
      return Transition.WIPE;
    }
    if (transition === Transition.DIP_TO_BLACK) {
      return Transition.DIP_TO_BLACK;
    }
    if (transition === Transition.ZOOM) {
      return Transition.ZOOM;
    }
    if (transition === Transition.ZOOM_WARP) {
      return Transition.ZOOM_WARP;
    }
    if (transition === Transition.CONCATENATE) {
      return Transition.CONCATENATE;
    }
    if (transition === Transition.BLUR) {
      return Transition.BLUR;
    }
    if (transition === Transition.SLIDE) {
      return Transition.SLIDE;
    }
    if (transition === Transition.SLIDE_WARP) {
      return Transition.SLIDE_WARP;
    }

    return Transition.CONCATENATE;
  }
}
