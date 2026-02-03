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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import {
  ReactiveFormsModule,
  FormsModule,
  FormControl,
  FormRecord,
  FormGroup,
} from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
import { Scene } from '../../models/scene-models';
import { ExportRecommendedStory, Story } from '../../models/story-models';
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
    MatCheckboxModule,
    MatDividerModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './recommended-stories.component.html',
  styleUrl: './recommended-stories.component.css',
})
export class RecommendedStoriesComponent {
  @Input() stories: Story[] = [];
  @Output() onSelectStoryEvent = new EventEmitter<ExportRecommendedStory>();

  constructor(
    private componentsCommunicationService: ComponentsCommunicationService,
  ) {}

  storiesForm = new FormRecord({});
  storiesSettingsForm = new FormGroup({
    generateInitialImageForScenes: new FormControl(false, []),
  });
  scenesFormControls: Scene[] = [];
  selectedTabIndex: number = 0;
  selectedStory!: Story;
  videoFormats: SelectItem[] = getVideoFormats();

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   * @returns {void}
   */
  ngAfterViewInit(): void {}

  /**
   * Lifecycle hook called when any data-bound property of a directive changes.
   * It re-initializes the scenes form controls if the 'stories' input changes.
   * @param {SimpleChanges} changes - The changes object containing current and previous values.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stories']) {
      this.initScenesFormControls();
    }
  }

  /**
   * Generates a unique identifier using UUID v4.
   * Used for tracking items in loops (e.g., trackBy).
   * @returns {string} A unique UUID string.
   */
  getUniqueID() {
    return uuidv4();
  }

  /**
   * Handles the tab change event.
   * Updates the selected tab index and the currently selected story based on the new index.
   * @param {MatTabChangeEvent} event - The tab change event containing the new index.
   */
  onTabChanged(event: MatTabChangeEvent) {
    this.selectedTabIndex = event.index;
    this.selectedStory = this.stories[this.selectedTabIndex];
  }

  /**
   * Initializes the dynamic form controls for the scenes of all stories.
   * It iterates through each story and its scenes, creating FormControls for
   * description, image prompt, and video prompt, and adds them to the `storiesForm`.
   */
  initScenesFormControls() {
    // Build dynamic form controls based on generated stories and scenes
    this.stories.forEach((story: Story) => {
      story.scenes.forEach((scene: Scene) => {
        // Add Scene Description form control
        this.storiesForm.addControl(
          `description@${scene.id}`,
          new FormControl(scene.description),
        );
        // Add Image Prompt form control
        this.storiesForm.addControl(
          `imagePrompt@${scene.id}`,
          new FormControl(scene.imagePrompt),
        );
        // Add Video Prompt form control
        this.storiesForm.addControl(
          `videoPrompt@${scene.id}`,
          new FormControl(scene.videoPrompt),
        );
      });
    });
    this.selectedStory = this.stories[this.selectedTabIndex];
  }

  /**
   * Removes a scene from the currently selected story and the form.
   * It identifies the scene by ID from the event target, removes it from the story's
   * scenes array, and removes the corresponding control from the form.
   * @param {any} event - The DOM event triggered by the remove action.
   */
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

  /**
   * Finds a scene within the currently selected story by its ID.
   * @param {string} sceneId - The unique identifier of the scene.
   * @returns {{ index: number | undefined, scene: Scene[] } | null} An object containing the index and the scene array, or null if not found.
   */
  getSceneById(sceneId: string) {
    let foundIndex;
    const foundScene = this.selectedStory.scenes.filter(
      (scene: Scene, index: number) => {
        if (scene.id === sceneId) {
          // break loop
          foundIndex = index;
          return true;
        }
        return false;
      },
    );

    if (foundScene) {
      return { index: foundIndex, scene: foundScene };
    }

    return null;
  }

  /**
   * Retrieves the names of all controls in the `storiesForm`.
   * @returns {string[]} An array of control names.
   */
  getStoriesControlNames(): string[] {
    return Object.keys(this.storiesForm.controls);
  }

  /**
   * Handles the selection of the current story.
   * It updates the scene properties (description, prompts) with the values from the form,
   * constructs an `ExportRecommendedStory` object, and emits the selection event.
   */
  onSelectStory() {
    this.selectedStory.scenes.forEach((scene: Scene) => {
      // Form control name is the same as scene id storyId@sceneId
      scene.description = this.storiesForm.get(
        `description@${scene.id}`,
      )?.value;
      scene.imagePrompt = this.storiesForm.get(
        `imagePrompt@${scene.id}`,
      )?.value;
      scene.videoPrompt = this.storiesForm.get(
        `videoPrompt@${scene.id}`,
      )?.value;
    });
    const exportRecommendedStory: ExportRecommendedStory = {
      story: this.selectedStory,
      generateInitialImageForScenes: this.storiesSettingsForm.get(
        'generateInitialImageForScenes',
      )?.value!,
    };
    this.onSelectStoryEvent.emit(exportRecommendedStory);
  }

  /**
   * Navigates the user to the "Create Story" tab (index 0).
   * Used when the user wants to manually create a story instead of selecting a recommended one.
   */
  onCreateYourOwnStory() {
    this.componentsCommunicationService.tabChanged(0);
  }
}
