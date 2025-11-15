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
import {
  getImageSelectionTypeOptions,
  getVideoModelNameOptions,
} from '../../image-utils';

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
  videoModelNameOptions: SelectItem[] = getVideoModelNameOptions();
  imageSelectionTypeOptions: SelectItem[] = getImageSelectionTypeOptions(
    'veo-3.0-generate-001'
  );
  videoModelNameLabel: string = this.videoModelNameOptions[0].displayName;
  imageSelectionTypeLabel: string =
    this.imageSelectionTypeOptions[0].displayName;
  maxAllowedSelectedImages: number = 1; // For default Veo 3

  imageSelectionSettingsForm = new FormGroup({
    videoModelName: new FormControl('veo-3.0-generate-001', [
      Validators.required,
    ]),
    imageSelectionType: new FormControl('reference-image', [
      Validators.required,
    ]),
  });

  ngAfterViewInit(): void {
    const modelName =
      this.imageSelectionSettingsForm.get('videoModelName')?.value!;
    this.imageSelectionTypeOptions = getImageSelectionTypeOptions(modelName);
  }

  /**
   * Refreshes the generated images table component.
   */
  refreshGeneratedImagesTableComponent(): void {
    this.initImageSelectionSettingsForm();
    this.generatedImagesTableComponent.refreshTable(false);
  }

  /**
   * Initializes the image selection settings form.
   */
  initImageSelectionSettingsForm() {
    this.imageSelectionSettingsForm.controls['imageSelectionType'].setValue(
      'reference-image'
    );
  }

  /**
   * @returns The list of selected images for the video.
   */
  getSelectedImagesForVideo(): Image[] {
    return this.generatedImagesTableComponent.selection.selected;
  }

  getVideoModelName(): string {
    return this.imageSelectionSettingsForm.get('videoModelName')?.value!;
  }

  /**
   * Handles the logic when the model name is changed.
   */
  onVideoModelNameChange(event: MatSelectChange) {
    const modelName = this.videoModelNameOptions.find(
      (option) => option.value === event.value
    );
    if (modelName) {
      this.videoModelNameLabel = modelName.displayName;
    }
    this.imageSelectionTypeOptions = getImageSelectionTypeOptions(event.value);
    // Always select the first element on video model name change
    this.imageSelectionTypeLabel =
      this.imageSelectionTypeOptions[0].displayName;
    this.imageSelectionSettingsForm.controls['imageSelectionType'].setValue(
      this.imageSelectionTypeOptions[0].value
    );
    this.updateLabelsAccordingToSelections();
  }

  /**
   * Handles the logic when the image selection type is changed.
   * @param event The select change event.
   */
  onImageSelectionTypeChanged(event: MatSelectChange) {
    // Clear selection every time image selection type is changed
    this.generatedImagesTableComponent.clearAllSelections();
    const imageSelectionType = this.imageSelectionTypeOptions.find(
      (option) => option.value === event.value
    );
    if (imageSelectionType) {
      this.imageSelectionTypeLabel = imageSelectionType.displayName;
    }
    this.updateLabelsAccordingToSelections();
  }

  updateLabelsAccordingToSelections() {
    // Clear selection every time image selection type is changed
    this.generatedImagesTableComponent.clearAllSelections();
    // Check if Video model is Veo 3 or Veo 3 Flash
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
      // Check if Video model is Veo 3.1 or Veo 3.1 Flash
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
