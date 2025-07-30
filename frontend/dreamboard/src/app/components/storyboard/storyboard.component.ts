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
 * @fileoverview This component serves as the main container for the video storyboard application.
 * It manages the different stages of video creation, such as brainstorming, scene building,
 * and post-production, using Angular Material tabs. It also handles inter-component communication
 * to switch between these tabs.
 */

import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { StoriesListComponent } from '../stories-list/stories-list.component';
import { BrainstormComponent } from '../brainstorm/brainstorm.component';
import { SceneBuilderComponent } from '../scene-builder/scene-builder.component';
import { PostVideoProductionComponent } from '../post-video-production/post-video-production.component';
import { ComponentsCommunicationService } from '../../services/components-communication.service';

@Component({
  selector: 'app-storyboard',
  imports: [
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    StoriesListComponent,
    BrainstormComponent,
    SceneBuilderComponent,
    PostVideoProductionComponent,
  ],
  templateUrl: './storyboard.component.html',
  styleUrl: './storyboard.component.css',
})
export class StoryboardComponent {
  selectedTab: number = 0;

  constructor(
    private componentsCommunicationService: ComponentsCommunicationService
  ) {
    componentsCommunicationService.tabChangedSource$.subscribe(
      (tabNumber: number) => {
        this.selectedTab = tabNumber;
      }
    );
  }
}
