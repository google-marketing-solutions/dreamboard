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

import {
  Component,
  inject,
  Output,
  ViewChild,
  EventEmitter,
} from '@angular/core';
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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AssetsSelectionTableComponent } from '../assets-selection-table/assets-selection-table.component';
import { VideoScene } from '../../models/scene-models';
import { Image } from '../../models/image-gen-models';
import { Video } from '../../models/video-gen-models';

@Component({
  selector: 'app-assets-selection-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    AssetsSelectionTableComponent,
  ],
  templateUrl: './assets-selection-dialog.component.html',
  styleUrl: './assets-selection-dialog.component.css',
})
export class AssetsSelectionDialogComponent {
  data: any = inject(MAT_DIALOG_DATA);
  storyId: string = this.data.storyId;
  scene: VideoScene = this.data.scene;
  assetType: string = this.data.assetType;
  maxAllowedSelectedAssets: number = this.data.maxAllowedSelectedAssets;
  selectedAssets: Image[] | Video[] = [];

  title = this.assetType === 'images' ? 'Images Selection' : 'Videos Selection';

  @ViewChild(AssetsSelectionTableComponent)
  assetsSelectionTableComponent!: AssetsSelectionTableComponent;

  @Output() assetsSelectedEvent = new EventEmitter<string>();
  private _snackBar = inject(MatSnackBar);
  confirmDialog = inject(MatDialog);

  /**
   * Initializes the component.
   * @param dialogRef - Reference to the dialog opened.
   */
  constructor(public dialogRef: MatDialogRef<AssetsSelectionDialogComponent>) {}

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   */
  ngAfterViewInit(): void {}

  /**
   * Retrieves the assets associated with the current scene based on the configured asset type.
   * @returns An array of `Image` or `Video` objects representing the generated assets.
   */
  getAssetsByType(): Image[] | Video[] {
    if (this.assetType === 'images') {
      return this.scene.imageGenerationSettings.generatedImages;
    }
    if (this.assetType === 'videos') {
      return this.scene.videoGenerationSettings.generatedVideos;
    }

    return [];
  }

  /**
   * Gets the selected assets from the child table component and closes the dialog with the result.
   */
  selectAssets(): void {
    this.selectedAssets =
      this.assetsSelectionTableComponent.getSelectedAssets();
    this.dialogRef.close(this.selectedAssets);
  }

  /**
   * Determines whether the select button should be disabled.
   * @returns `true` if the table component is available and no assets are selected; otherwise `false`.
   */
  disableSelectAssetsButton(): boolean {
    if (this.assetsSelectionTableComponent) {
      this.selectedAssets =
        this.assetsSelectionTableComponent.getSelectedAssets();
      if (this.selectedAssets.length === 0) {
        return true;
      }
    }

    return false;
  }
}
