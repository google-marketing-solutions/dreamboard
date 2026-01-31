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
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import {
  ReactiveFormsModule,
  FormsModule,
  FormControl,
  FormRecord,
} from '@angular/forms';
import { Scene } from '../../models/scene-models';
import { Story } from '../../models/story-models';
import { getVideoFormats } from '../../video-utils';
import { SelectItem } from '../../models/settings-models';
import { ComponentsCommunicationService } from '../../services/components-communication.service';

@Component({
  selector: 'app-recommended-stories',
  imports: [
    MatTabsModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './recommended-stories.component.html',
  styleUrl: './recommended-stories.component.css',
})
export class RecommendedStoriesComponent {
  @Input() stories: Story[] = [];
  @Output() onSelectStoryEvent = new EventEmitter<Story>();

  constructor(
    private componentsCommunicationService: ComponentsCommunicationService
  ) {}

  storiesForm = new FormRecord({});
  scenesFormControls: Scene[] = [];
  selectedTabIndex: number = 0;
  selectedStory!: Story;
  videoFormats: SelectItem[] = getVideoFormats();

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   * @returns {void}
   */
  ngAfterViewInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stories']) {
      this.initScenesFormControls();
    }
  }

  onTabChanged(event: MatTabChangeEvent) {
    this.selectedTabIndex = event.index;
    this.selectedStory = this.stories[this.selectedTabIndex];
  }

  initScenesFormControls() {
    // Build dynamic form controls based on generated stories and scenes
    this.stories.forEach((story: Story) => {
      story.scenes.forEach((scene: Scene) => {
        // Add Scene Description form control
        this.storiesForm.addControl(
          `description@${scene.id}`,
          new FormControl(scene.description)
        );
        // Add Image Prompt form control
        this.storiesForm.addControl(
          `imagePrompt@${scene.id}`,
          new FormControl(scene.imagePrompt)
        );
        // Add Video Prompt form control
        this.storiesForm.addControl(
          `videoPrompt@${scene.id}`,
          new FormControl(scene.videoPrompt)
        );
      });
    });
    this.selectedStory = this.stories[this.selectedTabIndex];
  }

  removeSceneById(event: any) {
    const sceneId = event.target.parentElement.parentElement.id;
    const scene = this.getSceneById(sceneId);
    if (scene && scene.index !== undefined) {
      // Remove scene from story object
      this.selectedStory.scenes.splice(scene.index, 1);
      // Remove scene from form controls
      this.storiesForm.removeControl(sceneId);
    }
  }

  getSceneById(sceneId: string) {
    let foundIndex;
    const foundScene = this.selectedStory.scenes.filter(
      (scene: Scene, index: number) => {
        if (scene.id === sceneId) {
          // break loop
          foundIndex = index;
          return false;
        }
        return true;
      }
    );

    if (foundScene) {
      return { index: foundIndex, scene: foundScene };
    }

    return null;
  }

  getStoriesControlNames(): string[] {
    return Object.keys(this.storiesForm.controls);
  }

  onSelectStory() {
    this.selectedStory.scenes.forEach((scene: Scene) => {
      // Form control name is the same as scene id storyId@sceneId
      scene.description = this.storiesForm.get(
        `description@${scene.id}`
      )?.value;
      scene.imagePrompt = this.storiesForm.get(
        `imagePrompt@${scene.id}`
      )?.value;
      scene.videoPrompt = this.storiesForm.get(
        `videoPrompt@${scene.id}`
      )?.value;
    });
    this.onSelectStoryEvent.emit(this.selectedStory);
  }

  onCreateYourOwnStory() {
    this.componentsCommunicationService.tabChanged(0);
  }
}
