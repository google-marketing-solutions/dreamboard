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

import { Component, inject, Output, EventEmitter } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialog,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-assets-selection-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './assets-selection-dialog.component.html',
  styleUrl: './assets-selection-dialog.component.css',
})
export class AssetsSelectionDialogComponent {
  data: any = inject(MAT_DIALOG_DATA);
  assetType: string = this.data.assetType;

  title = this.assetType === 'images' ? 'Images Selection' : 'Videos Selection';

  @Output() assetsSelectedEvent = new EventEmitter<string>();
  private _snackBar = inject(MatSnackBar);
  confirmDialog = inject(MatDialog);

  constructor(public dialogRef: MatDialogRef<AssetsSelectionDialogComponent>) {}

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   * It initializes the 'sceneDescription' form control with the description
   * from the `scene` data provided to the dialog.
   * @returns {void}
   */
  ngAfterViewInit(): void {}

  save() {}

  disableSaveButton() {
    return false;
  }
}
