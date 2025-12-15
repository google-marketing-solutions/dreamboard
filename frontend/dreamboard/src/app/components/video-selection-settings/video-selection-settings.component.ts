import { Component, Input, ViewChild, AfterViewInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { VideoScene } from '../../models/scene-models';
import { Video } from '../../models/video-gen-models';
import { GeneratedVideosTableComponent } from '../generated-videos-table/generated-videos-table.component';
import { SelectItem } from '../../models/settings-models';
import { getVideoModelNameOptions } from '../../video-utils';

@Component({
  selector: 'app-video-selection-settings',
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    GeneratedVideosTableComponent,
  ],
  templateUrl: './video-selection-settings.component.html',
  styleUrl: './video-selection-settings.component.css',
})
export class VideoSelectionSettingsComponent {
  @Input() storyId!: string;
  @Input() scene!: VideoScene;
  @ViewChild(GeneratedVideosTableComponent)
  generatedVideosTableComponent!: GeneratedVideosTableComponent;
  videoModelNameOptions: SelectItem[] =
    getVideoModelNameOptions('video-selection');
  videoModelNameLabel: string = this.videoModelNameOptions[0].displayName;

  videoSelectionSettingsForm = new FormGroup({
    videoModelName: new FormControl('veo-3.1-generate-001', [
      Validators.required,
    ]),
  });

  ngAfterViewInit(): void {
    this.initVideoSelectionSettingsForm();
  }

  /**
   * Initializes the image selection settings form.
   */
  initVideoSelectionSettingsForm() {
    // 1. Populate the options in the Video Name dropdown
    // based on saved or default selectedVideoModelName in this UI
    const selectedVideoModelName =
      this.scene.videoGenerationSettings.videosSelectionForVideoInfo
        .selectedVideoModelName;
    this.videoSelectionSettingsForm.controls['videoModelName'].setValue(
      selectedVideoModelName
    );
    this.setVideoNameLabel(selectedVideoModelName);
    this.updateMaxAllowedSelectedVideosAccordingToSelections();
  }

  /**
   * Refreshes the generated videos table component.
   */
  refreshGeneratedImagesTableComponent(): void {
    this.generatedVideosTableComponent.refreshTable(false);
  }

  setGeneratedVideosTableSelection() {
    this.generatedVideosTableComponent.setSelection();
  }

  getVideoModelName(): string {
    return this.videoSelectionSettingsForm.get('videoModelName')?.value!;
  }

  /**
   * @returns The list of selected videos for extension.
   */
  getSelectedVideosForVideo(): Video[] {
    return this.generatedVideosTableComponent.selection.selected;
  }

  /**
   * Handles the logic when the model name is changed.
   */
  onVideoModelNameChange(event: MatSelectChange) {
    this.setVideoNameLabel(event.value);
    // Clear selection every time image selection type is changed
    this.generatedVideosTableComponent.clearAllSelections();
    this.updateMaxAllowedSelectedVideosAccordingToSelections();
  }

  setVideoNameLabel(modelName: string): void {
    const modelOption = this.videoModelNameOptions.find(
      (option) => option.value === modelName
    );
    if (modelOption) {
      this.videoModelNameLabel = modelOption!.displayName;
    }
  }

  updateMaxAllowedSelectedVideosAccordingToSelections() {
    // Check if Video model is Veo 3.1 or Veo 3.1 Fast
    if (
      this.videoModelNameLabel === this.videoModelNameOptions[0].displayName ||
      this.videoModelNameLabel === this.videoModelNameOptions[1].displayName
    ) {
      this.generatedVideosTableComponent.setMaxAllowedSelectedVideos(1);
    }
  }
}
