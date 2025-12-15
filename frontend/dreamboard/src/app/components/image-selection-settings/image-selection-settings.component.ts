import { Component, Input, ViewChild, AfterViewInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { VideoScene } from '../../models/scene-models';
import { GeneratedImagesTableComponent } from '../generated-images-table/generated-images-table.component';
import { Image } from '../../models/image-gen-models';
import { SelectItem } from '../../models/settings-models';
import { getImageSelectionTypeOptions } from '../../image-utils';
import { getVideoModelNameOptions } from '../../video-utils';

@Component({
  selector: 'app-image-selection-settings',
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    GeneratedImagesTableComponent,
  ],
  templateUrl: './image-selection-settings.component.html',
  styleUrl: './image-selection-settings.component.css',
})
export class ImageSelectionSettingsComponent implements AfterViewInit {
  @Input() storyId!: string;
  @Input() scene!: VideoScene;
  @Input() isSelectionMode!: boolean;
  @ViewChild(GeneratedImagesTableComponent)
  generatedImagesTableComponent!: GeneratedImagesTableComponent;
  videoModelNameOptions: SelectItem[] =
    getVideoModelNameOptions('images-selection');
  imageSelectionTypeOptions: SelectItem[] = getImageSelectionTypeOptions(
    'veo-3.0-generate-001'
  );
  videoModelNameLabel: string = this.videoModelNameOptions[0].displayName;
  imageSelectionTypeLabel: string =
    this.imageSelectionTypeOptions[0].displayName;
  maxAllowedSelectedImages: number = 1; // By default in Veo 3

  imagesSelectionSettingsForm = new FormGroup({
    videoModelName: new FormControl('veo-3.0-generate-001', [
      Validators.required,
    ]),
    imageSelectionType: new FormControl('reference-image', [
      Validators.required,
    ]),
  });

  ngAfterViewInit(): void {
    this.initImageSelectionSettingsForm();
  }

  /**
   * Refreshes the generated images table component.
   */
  refreshGeneratedImagesTableComponent(): void {
    this.generatedImagesTableComponent.refreshTable(false);
  }

  setGeneratedImagesTableSelection() {
    this.generatedImagesTableComponent.setSelection();
  }

  /**
   * Initializes the image selection settings form.
   */
  initImageSelectionSettingsForm() {
    const selectedVideoModelName =
      this.scene.imageGenerationSettings.imagesSelectionForVideoInfo
        .selectedVideoModelName;
    // 1. Populate the options in the Image Selection type dropdown
    // based on saved or default videoModelName in this UI
    this.imageSelectionTypeOptions = getImageSelectionTypeOptions(
      selectedVideoModelName
    );
    // 2. Set all the form items after initial values setup
    this.imagesSelectionSettingsForm.controls['imageSelectionType'].setValue(
      this.scene.imageGenerationSettings.imagesSelectionForVideoInfo
        .imagesSelectionType
    );
    this.imagesSelectionSettingsForm.controls['videoModelName'].setValue(
      selectedVideoModelName
    );
    // This depends on 1.
    this.setImageSelectionTypeLabel(
      this.scene.imageGenerationSettings.imagesSelectionForVideoInfo
        .imagesSelectionType
    );
    this.setVideoNameLabel(selectedVideoModelName);
    this.updateMaxAllowedSelectedImagesAccordingToSelections();
  }

  /**
   * @returns The list of selected images for the video.
   */
  getSelectedImagesForVideo(): Image[] {
    return this.generatedImagesTableComponent.selection.selected;
  }

  getVideoModelName(): string {
    return this.imagesSelectionSettingsForm.get('videoModelName')?.value!;
  }

  getImagesSelectionType(): string {
    return this.imagesSelectionSettingsForm.get('imageSelectionType')?.value!;
  }

  /**
   * Handles the logic when the model name is changed.
   */
  onVideoModelNameChange(event: MatSelectChange) {
    this.setVideoNameLabel(event.value);
    this.imageSelectionTypeOptions = getImageSelectionTypeOptions(event.value);
    // Always select the first element on video model name change
    this.imageSelectionTypeLabel =
      this.imageSelectionTypeOptions[0].displayName;
    this.imagesSelectionSettingsForm.controls['imageSelectionType'].setValue(
      this.imageSelectionTypeOptions[0].value
    );
    // Clear selection every time image selection type is changed
    this.generatedImagesTableComponent.clearAllSelections();
    this.updateMaxAllowedSelectedImagesAccordingToSelections();
  }

  setVideoNameLabel(modelName: string): void {
    const modelOption = this.videoModelNameOptions.find(
      (option) => option.value === modelName
    );
    if (modelOption) {
      this.videoModelNameLabel = modelOption!.displayName;
    }
  }

  /**
   * Handles the logic when the image selection type is changed.
   * @param event The select change event.
   */
  onImageSelectionTypeChanged(event: MatSelectChange) {
    // Clear selection every time image selection type is changed
    this.generatedImagesTableComponent.clearAllSelections();
    this.setImageSelectionTypeLabel(event.value);
    // Clear selection every time image selection type is changed
    this.generatedImagesTableComponent.clearAllSelections();
    this.updateMaxAllowedSelectedImagesAccordingToSelections();
  }

  setImageSelectionTypeLabel(imageSelectionType: string) {
    const imageSelectionTypeOption = this.imageSelectionTypeOptions.find(
      (option) => option.value === imageSelectionType
    );
    if (imageSelectionTypeOption) {
      this.imageSelectionTypeLabel = imageSelectionTypeOption!.displayName;
    }
  }

  updateMaxAllowedSelectedImagesAccordingToSelections() {
    // Check if Video model is Veo 3 or Veo 3 Fast
    if (
      this.videoModelNameLabel === this.videoModelNameOptions[0].displayName ||
      this.videoModelNameLabel === this.videoModelNameOptions[1].displayName
    ) {
      if (this.imageSelectionTypeLabel === 'Reference Image') {
        // Only 1 ref image is supported
        this.maxAllowedSelectedImages = 1;
        // Change to reflect in table component
        this.generatedImagesTableComponent.setMaxAllowedSelectedImages(
          this.maxAllowedSelectedImages
        );
      }
      // Check if Video model is Veo 3.1 or Veo 3.1 Fast
    } else if (
      this.videoModelNameLabel === this.videoModelNameOptions[2].displayName ||
      this.videoModelNameLabel === this.videoModelNameOptions[3].displayName
    ) {
      if (this.imageSelectionTypeLabel === 'Reference Image') {
        this.maxAllowedSelectedImages = 3;
        // Change to reflect in table component
        this.generatedImagesTableComponent.setMaxAllowedSelectedImages(
          this.maxAllowedSelectedImages
        );
      } else if (this.imageSelectionTypeLabel === 'First/Last Frame') {
        this.maxAllowedSelectedImages = 2;
        // Change to reflect in table component
        this.generatedImagesTableComponent.setMaxAllowedSelectedImages(2);
      }
    }
  }
}
