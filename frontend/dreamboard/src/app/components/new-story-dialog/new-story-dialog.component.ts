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
import { StoriesStorageService } from '../../services/stories-storage.service';
import { getNewVideoStory } from '../../story-utils';
import { VideoStory } from '../../models/story-models';
import { openSnackBar } from '../../utils';
import { ComponentsCommunicationService } from '../../services/components-communication.service';

@Component({
  selector: 'app-new-story-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './new-story-dialog.component.html',
  styleUrl: './new-story-dialog.component.css',
})
export class NewStoryDialogComponent {
  title = 'New Story';
  story: VideoStory = inject(MAT_DIALOG_DATA);
  isEdit: boolean = false;
  @Output() storySavedEvent = new EventEmitter<VideoStory>();
  private _snackBar = inject(MatSnackBar);
  confirmDialog = inject(MatDialog);

  newStorySettingsForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl('', []),
  });

  constructor(
    private storiesStorageService: StoriesStorageService,
    public dialogRef: MatDialogRef<NewStoryDialogComponent>,
    private componentsCommunicationService: ComponentsCommunicationService
  ) {}

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   * It initializes the 'sceneDescription' form control with the description
   * from the `scene` data provided to the dialog.
   * @returns {void}
   */
  ngAfterViewInit(): void {
    // Populate story details on Edit
    if (this.story) {
      this.isEdit = true;
      this.newStorySettingsForm.controls['title'].setValue(this.story.title);
      this.newStorySettingsForm.controls['description'].setValue(
        this.story.description
      );
    } else {
      this.isEdit = false;
    }
  }

  save() {
    openSnackBar(this._snackBar, `Saving story...`);

    let story;
    // On New Story generate a new object
    if (!this.isEdit) {
      story = getNewVideoStory();
    } else {
      story = this.story;
    }
    story.title = this.newStorySettingsForm.get('title')?.value!;
    story.description = this.newStorySettingsForm.get('description')?.value!;

    const user = localStorage.getItem('user')!;
    this.storiesStorageService.addNewStory(user, story).subscribe(
      (response: string) => {
        console.log(response);
        openSnackBar(this._snackBar, `Story saved succesfully!`, 15);
        this.dialogRef.close(story);
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
