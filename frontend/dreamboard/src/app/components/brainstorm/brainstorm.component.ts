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
 * @fileoverview This component facilitates brainstorming and generating video scenes based on user input.
 * It allows users to define a core idea and brand guidelines, specify the number of scenes,
 * generate scenes using a text generation service, and then select and export these scenes
 * for further video production. It includes a table with pagination and selection for managing scenes.
 */

import { Component, AfterViewInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Scene, SceneItem } from '../../models/scene-models';
import { SelectItem } from '../../models/settings-models';
import {
  getNewVideoScene,
  getVideoFormats,
  VIDEO_MODEL_MAX_LENGTH,
} from '../../video-utils';
import { ComponentsCommunicationService } from '../../services/components-communication.service';
import { openSnackBar } from '../../utils';
import { TextGenerationService } from '../../services/text-generation.service';
import { StoriesComponent } from '../stories/stories.component';
import {
  Story,
  VideoStory,
  StoryItem,
  StoriesGenerationRequest,
  ExportStory,
  ExtractTextItem,
} from '../../models/story-models';
import { UploadedFile, UploadedFileType } from '../../models/settings-models';
import { VideoScene } from '../../models/scene-models';
import { v4 as uuidv4 } from 'uuid';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';

@Component({
  selector: 'app-brainstorm',
  imports: [
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    ReactiveFormsModule,
    StoriesComponent,
    FileUploaderComponent,
  ],
  templateUrl: './brainstorm.component.html',
  styleUrl: './brainstorm.component.css',
})
export class BrainstormComponent implements AfterViewInit {
  stories: Story[] = [];
  selectedStory!: Story;
  videoFormats: SelectItem[] = getVideoFormats();
  private _snackBar = inject(MatSnackBar);

  storiesSettingsForm = new FormGroup({
    creativeBriefIdea: new FormControl('', [Validators.required]),
    targetAudience: new FormControl('', [Validators.required]),
    brandGuidelines: new FormControl('', []),
    videoFormat: new FormControl('', [Validators.required]),
    generateInitialImageForScenes: new FormControl(false, []),
  });

  constructor(
    private componentsCommunicationService: ComponentsCommunicationService,
    private textGenerationService: TextGenerationService
  ) {}

  /**
   * Checks whether the number of selected scenes matches the total number of rows in the table.
   * This is used to determine the state of the "select all" checkbox.
   * @returns {boolean} `true` if all rows are selected, `false` otherwise.
   */
  ngAfterViewInit() {}

  onSelectStoryEvent(story: Story): void {
    this.selectedStory = story;
    this.exportStory();
  }

  /**
   * Determines the `UploadedFileType` based on a given string identifier.
   * @param {string} type - A string representing the file type ('document', 'video', etc).
   * @returns {UploadedFileType} The corresponding `UploadedFileType` enum value, or `UploadedFileType.None` if no match.
   */
  getFileType(type: string): UploadedFileType {
    if (type == 'CreativeBrief') {
      return UploadedFileType.CreativeBrief;
    }
    if (type == 'BrandGuidelines') {
      return UploadedFileType.BrandGuidelines;
    }

    return UploadedFileType.None;
  }

  addUploadedFile(file: UploadedFile) {
    openSnackBar(this._snackBar, `Extracting file information...`);

    const extractTextRequest: ExtractTextItem = {
      file_gcs_uri: file.gcsUri,
      file_type: file.type,
    };

    this.textGenerationService
      .extract_text_from_file(extractTextRequest)
      .subscribe(
        (extractedText: any) => {
          if (extractedText && extractedText.data) {
            openSnackBar(
              this._snackBar,
              `File information extracted successfully!`,
              10
            );
            if (file.type === UploadedFileType.CreativeBrief) {
              this.storiesSettingsForm.controls['creativeBriefIdea'].setValue(
                extractedText.data
              );
            }
            if (file.type === UploadedFileType.BrandGuidelines) {
              this.storiesSettingsForm.controls['brandGuidelines'].setValue(
                extractedText.data
              );
            }
          }
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

  /**
   * Exports the currently selected scenes to the `SceneBuilderComponent` for further processing.
   * Validates that at least one scene is selected before proceeding.
   * Displays snackbar messages indicating the export status and whether initial images will be generated.
   * Updates the `ComponentsCommunicationService` to notify other components of the exported scenes and
   * to switch to the Scene Builder tab.
   * @returns {void}
   */
  exportStory(): void {
    const generateImages = this.storiesSettingsForm.get(
      'generateInitialImageForScenes'
    )?.value!;

    if (generateImages) {
      openSnackBar(
        this._snackBar,
        'Exporting story and generating initial images for scenes... Please wait.'
      );
    } else {
      openSnackBar(this._snackBar, 'Exporting story... Please wait.');
    }

    // Convert suggested scenes to video scenes for Scene Builder
    const videoScenes: VideoScene[] = this.selectedStory.scenes.map(
      (scene: Scene, index: number) => {
        const videoScene: VideoScene = getNewVideoScene(index);
        // Replace new video scene generated id with scene id
        videoScene.id = scene.id;
        videoScene.description = scene.description;
        videoScene.imageGenerationSettings.prompt = scene.imagePrompt;
        return videoScene;
      }
    );

    const exportedStory: VideoStory = {
      id: this.selectedStory.id,
      title: this.selectedStory.title,
      description: this.selectedStory.description,
      brandGuidelinesAdherence: this.selectedStory.brandGuidelinesAdherence,
      abcdAdherence: this.selectedStory.abcdAdherence,
      scenes: videoScenes,
      generatedVideos: [],
      owner: localStorage.getItem('user')!,
      shareWith: [],
    };

    const exportStory: ExportStory = {
      story: exportedStory,
      replaceExistingStoryOnExport: true,
      generateInitialImageForScenes: generateImages,
    };

    this.componentsCommunicationService.storyExported(exportStory);
    this.componentsCommunicationService.tabChanged(2);
  }

  generateStories(): void {
    openSnackBar(this._snackBar, 'Generating stories... Please wait.');

    const storiesGeneration = this.getStoriesGenerationParams();
    this.textGenerationService.generateStories(storiesGeneration).subscribe(
      (generatedStories: StoryItem[]) => {
        openSnackBar(
          this._snackBar,
          `Recommended stories generated successfully!`,
          15
        );
        this.stories = generatedStories.map((genStory: StoryItem) => {
          const story: Story = {
            id: uuidv4(),
            title: genStory.title,
            description: genStory.description,
            brandGuidelinesAdherence: genStory.brand_guidelines_adherence,
            abcdAdherence: genStory.abcd_adherence,
            scenes: [],
          };
          story.scenes = genStory.scenes.map((genScene: SceneItem) => {
            const scene: Scene = {
              id: uuidv4(),
              number: genScene.number,
              description: genScene.description,
              imagePrompt: genScene.image_prompt,
            };
            return scene;
          });
          return story;
        });
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

  getStoriesGenerationParams(): StoriesGenerationRequest {
    const videoFormat = this.storiesSettingsForm.get('videoFormat')?.value!;
    const storiesGenerationRequest: StoriesGenerationRequest = {
      num_stories: 3, // Default to 3 for now
      creative_brief_idea:
        this.storiesSettingsForm.get('creativeBriefIdea')?.value!,
      target_audience: this.storiesSettingsForm.get('targetAudience')?.value!,
      brand_guidelines: this.storiesSettingsForm.get('brandGuidelines')?.value!,
      video_format: videoFormat,
      num_scenes: this.calculateNumScenesByVideoFormatType(videoFormat),
    };

    return storiesGenerationRequest;
  }

  calculateNumScenesByVideoFormatType(formatType: string): number {
    const videoFormat = this.videoFormats.filter((format: SelectItem) => {
      return format.value === formatType;
    });
    // Calculate num of scenes based on video format length
    if (videoFormat.length > 0) {
      const numScenes = Math.round(
        videoFormat[0].field1 / VIDEO_MODEL_MAX_LENGTH
      );
      return numScenes;
    }

    return 0;
  }

  /**
   * Determines whether the "Generate Stories" button should be disabled.
   * The button is enabled only if the `scenesSettingsForm` is valid (e.g., idea and number of scenes are filled).
   * @returns {boolean} `true` if the button should be disabled, `false` otherwise.
   */
  disableGenerateStoriesButton() {
    return !this.storiesSettingsForm.valid;
  }
}
