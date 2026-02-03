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
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VideoScene } from '../../models/scene-models';
import { FrameExtractionService } from '../../services/frame-extraction.service';
import { openSnackBar, closeSnackBar } from '../../utils';
import { Image } from '../../models/image-gen-models';

@Component({
  selector: 'app-frame-extraction',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
  ],
  templateUrl: './frame-extraction.component.html',
  styleUrls: ['./frame-extraction.component.css'],
})
export class FrameExtractionComponent {
  @Input() scenes!: VideoScene[];
  @Input() storyId!: string;
  @Output() framesExtracted = new EventEmitter<Image[]>();
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  selectedVideoUrl = '';
  extractionTime = 0;
  numFrames = 1;
  private _snackBar = inject(MatSnackBar);

  constructor(private frameExtractionService: FrameExtractionService) {}

  onVideoSelected(event: MatSelectChange): void {
    this.selectedVideoUrl = event.value;

    // Force the video player to load the new source
    if (this.videoPlayer && this.videoPlayer.nativeElement) {
      const videoPlayer = this.videoPlayer.nativeElement;
      videoPlayer.src = '';
      setTimeout(() => {
        videoPlayer.src = this.selectedVideoUrl;
        videoPlayer.load();
      }, 0);
    }
  }

  onTimeUpdate(): void {
    if (this.videoPlayer) {
      this.extractionTime = this.videoPlayer.nativeElement.currentTime;
    }
  }

  onTimeInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const time = parseFloat(inputElement.value);
    if (!isNaN(time) && this.videoPlayer) {
      this.videoPlayer.nativeElement.currentTime = time;
    }
  }

  extractFrames(): void {
    const scene = this.scenes.find(
      (s) =>
        s.videoGenerationSettings.selectedVideoForMerge?.signedUri ===
        this.selectedVideoUrl,
    );
    if (!scene || !scene.videoGenerationSettings.selectedVideoForMerge) {
      return;
    }

    const gcsUri = scene.videoGenerationSettings.selectedVideoForMerge.gcsUri;
    const sceneNum = scene.number.toString();

    openSnackBar(this._snackBar, 'Extracting frames...');
    this.frameExtractionService
      .extractFrames(
        gcsUri,
        this.storyId,
        sceneNum,
        this.extractionTime,
        this.numFrames,
      )
      .subscribe({
        next: (response: any) => {
          closeSnackBar(this._snackBar);
          openSnackBar(this._snackBar, 'Frames extracted successfully!', 5);
          this.framesExtracted.emit(response.data);
        },
        error: (error: any) => {
          console.error(error);
          closeSnackBar(this._snackBar);
          let errorMessage = 'An unknown error occurred.';
          if (error.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else {
              errorMessage =
                error.error.detail ||
                error.error.error_message ||
                JSON.stringify(error.error);
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          openSnackBar(
            this._snackBar,
            `Error extracting frames: ${errorMessage}`,
            5,
          );
        },
      });
  }
}
