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

const userId = 'user1'; // TODO (ae) change this!

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
  dialogData: any = inject(MAT_DIALOG_DATA);
  @Output() storySavedEvent = new EventEmitter<VideoStory>();
  private _snackBar = inject(MatSnackBar);

  constructor(
    private storiesStorageService: StoriesStorageService,
    public dialogRef: MatDialogRef<NewStoryDialogComponent>
  ) {}

  newStorySettingsForm = new FormGroup({
    title: new FormControl('', [Validators.required]),
    description: new FormControl('', []),
  });

  save() {
    openSnackBar(this._snackBar, `Saving story...`);

    const newStory = getNewVideoStory();
    newStory.title = this.newStorySettingsForm.get('title')?.value!;
    newStory.description = this.newStorySettingsForm.get('description')?.value!;
    this.storiesStorageService.addNewStory(userId, newStory).subscribe(
      (response: string) => {
        console.log(response);
        openSnackBar(
          this._snackBar,
          `Story saved succesfully!`,
          15
        );
        this.dialogRef.close(newStory);
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
