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
 * @fileoverview This component handles the display and management of the final generated video.
 * It subscribes to updates from other components to receive the generated video data and
 * dynamically updates the video player in the template.
 */

import { Component, ViewChild, ElementRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ComponentsCommunicationService } from '../../services/components-communication.service';
import { VideoStory } from '../../models/story-models';

@Component({
  selector: 'app-post-video-production',
  imports: [MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './post-video-production.component.html',
  styleUrl: './post-video-production.component.css',
})
export class PostVideoProductionComponent {
  story!: VideoStory;
  @ViewChild('finalVideo', { static: false }) videoElementRef!: ElementRef;

  constructor(
    private componentsCommunicationService: ComponentsCommunicationService
  ) {
    componentsCommunicationService.videoGenerated$.subscribe(
      (story: VideoStory) => {
        this.story = story;
      }
    );
  }
}
