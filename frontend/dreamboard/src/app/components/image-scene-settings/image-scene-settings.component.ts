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
 * @fileoverview This component manages the image generation settings for a single video scene.
 * It allows users to configure various parameters for image creation, upload reference images,
 * trigger image generation, and navigate through generated image samples.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  inject,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { VideoScene } from '../../models/scene-models';
import {
  ImageSceneRequest,
  Image,
  ImageReference,
  ImageCreativeDirection,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageReferenceItem,
  ReferenceImageCard,
} from '../../models/image-gen-models';
import { ImageGenerationService } from '../../services/image-generation.service';
import { TextGenerationService } from '../../services/text-generation.service';
import {
  SelectItem,
  UploadedFile,
  UploadedFileType,
} from '../../models/settings-models';
import { openSnackBar, closeSnackBar } from '../../utils';
import {
  IMAGE_MODEL_NAME,
  getAspectRatiosByModelName,
  getOutputMimeTypes,
  imageLanguages,
  getSafetyFilterLevels,
  getPersonGenerationOptionsByModelName,
  updateScenesWithGeneratedImages,
  getImageReferenceTypes,
} from '../../image-utils';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';
import { ComponentsCommunicationService } from '../../services/components-communication.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-image-scene-settings',
  imports: [
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatCardModule,
    MatCheckboxModule,
    MatDividerModule,
    ReactiveFormsModule,
    MatExpansionModule,
    FileUploaderComponent,
  ],
  templateUrl: './image-scene-settings.component.html',
  styleUrl: './image-scene-settings.component.css',
})
export class ImageSceneSettingsComponent implements AfterViewInit {
  @Input() scene!: VideoScene;
  @Input() storyId!: string;
  @Output() sceneImageSettingsUpdatedEvent = new EventEmitter<VideoScene>();
  @ViewChild(FileUploaderComponent)
  fileUploaderComponent!: FileUploaderComponent;
  // Form selects
  aspectRatios: SelectItem[] = getAspectRatiosByModelName(IMAGE_MODEL_NAME);
  outputMimeTypes: SelectItem[] = getOutputMimeTypes();
  languages: SelectItem[] = imageLanguages();
  safetyFilterLevels: SelectItem[] = getSafetyFilterLevels();
  personGenerationOptions: SelectItem[] =
    getPersonGenerationOptionsByModelName(IMAGE_MODEL_NAME);
  currentGeneratedImageIndex: number = 0;
  imageReferenceTypes = getImageReferenceTypes();
  referenceImageCards: ReferenceImageCard[] = [];
  fileReader = new FileReader();
  uploadProgress: number = 0;
  uploadSub!: Subscription;
  private _snackBar = inject(MatSnackBar);

  imageSettingsForm = new FormGroup({
    prompt: new FormControl('', [Validators.required]),
    numImages: new FormControl(4, [Validators.required]),
    aspectRatio: new FormControl('', []),
    outputMimeType: new FormControl('', []),
    compressionQuality: new FormControl(75, []),
    language: new FormControl('', []),
    safetyFilterLevel: new FormControl('', []),
    personGeneration: new FormControl('', []),
    /*seed: new FormControl(-1, []),*/
    negativePrompt: new FormControl('', []),
    selectedImageUri: new FormControl(''),
    referenceType: new FormControl('subject-SUBJECT_TYPE_DEFAULT', []),
    imageReferenceDescription: new FormControl('', []),
    withSceneDescription: new FormControl(true, []),
  });

  constructor(
    private imageGenerationService: ImageGenerationService,
    private textGenerationService: TextGenerationService,
    private componentsCommunicationService: ComponentsCommunicationService
  ) {}

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   * It initializes the image settings form with values from the current scene.
   * @returns {void}
   */
  ngAfterViewInit(): void {
    // viewChild is set after the view has been initialized
    this.initImageSettingsForm();
  }

  /**
   * Processes an uploaded file, adding it to the appropriate data structure
   * within the scene based on its type. For user-provided images, this also
   * triggers an update to the selected image view.
   *
   * @param {UploadedFile} file The uploaded file object to process and add.
   */
  addUploadedFile(file: UploadedFile) {
    const uploadedImage: Image = {
      id: file.id,
      name: file.name,
      gcsUri: file.gcsUri,
      signedUri: file.signedUri,
      gcsFusePath: file.gcsFusePath,
      mimeType: file.mimeType,
    };
    if (file.type === UploadedFileType.ReferenceImage) {
      // Reference Image types are different from Image type.
      const uploadedReferenceImage: ImageReference = {
        id: file.id, // File ID is the same as Reference ID for ReferenceImage type
        referenceType: this.getReferenceType(
          this.imageSettingsForm.get('referenceType')?.value!
        ),
        referenceSubType: this.getReferenceSubType(
          this.imageSettingsForm.get('referenceType')?.value!
        ),
        name: file.name,
        gcsUri: file.gcsUri,
        signedUri: file.signedUri,
        gcsFusePath: file.gcsFusePath,
        mimeType: file.mimeType,
      };
      // 1. Check if array already has a reference image card in that index
      // 2. If so, remove the reference image in that index for that card
      // 3. Add the new reference image in the same index for that card
      const refImgCardFoundIndex = this.getReferenceImageIndexById(
        uploadedReferenceImage.id!,
        this.referenceImageCards
      );
      if (refImgCardFoundIndex !== undefined) {
        // Remove existing reference image from index
        this.scene.imageGenerationSettings.referenceImages?.splice(
          refImgCardFoundIndex,
          1
        );
        // Add new reference image at same index
        this.scene.imageGenerationSettings.referenceImages?.splice(
          refImgCardFoundIndex,
          0,
          uploadedReferenceImage
        );
      }
    }
    if (file.type === UploadedFileType.UserProvidedImage) {
      // Add all user provided images to generated images to show in the carrousel
      this.scene.imageGenerationSettings.generatedImages.push(uploadedImage);
      const updateForm = true;
      this.updateSelectedImage(uploadedImage.gcsUri, updateForm);
    }
  }

  disableAddReferenceButton() {
    if (this.referenceImageCards.length === 0) {
      return false;
    }
    const lastAddedCard =
      this.referenceImageCards[this.referenceImageCards.length - 1];
    const lastAddedRefImgIndex = this.getReferenceImageIndexById(
      lastAddedCard.id,
      this.scene.imageGenerationSettings.referenceImages!
    );
    // Disable if there is no reference image uploaded for this card
    // until user adds an image
    // or the limit of ref images is reached == 4
    if (
      lastAddedRefImgIndex === undefined ||
      this.referenceImageCards.length === 4
    ) {
      return true;
    }

    return false;
  }

  /**
   * Initializes the `imageSettingsForm` with the current image generation settings
   * from the `scene` input property. This ensures the form reflects the existing state
   * and sets the selected image for video if present.
   * @returns {void}
   */
  initImageSettingsForm(): void {
    this.imageSettingsForm.controls['prompt'].setValue(
      this.scene.imageGenerationSettings.prompt
    );
    this.imageSettingsForm.controls['numImages'].setValue(
      this.scene.imageGenerationSettings.numImages
    );
    this.imageSettingsForm.controls['aspectRatio'].setValue(
      this.scene.imageGenerationSettings.aspectRatio!
    );
    this.imageSettingsForm.controls['outputMimeType'].setValue(
      this.scene.imageGenerationSettings.outputMimeType!
    );
    this.imageSettingsForm.controls['aspectRatio'].setValue(
      this.scene.imageGenerationSettings.aspectRatio!
    );
    this.imageSettingsForm.controls['compressionQuality'].setValue(
      this.scene.imageGenerationSettings.compressionQuality!
    );
    this.imageSettingsForm.controls['language'].setValue(
      this.scene.imageGenerationSettings.language!
    );
    this.imageSettingsForm.controls['safetyFilterLevel'].setValue(
      this.scene.imageGenerationSettings.safetyFilterLevel!
    );
    this.imageSettingsForm.controls['personGeneration'].setValue(
      this.scene.imageGenerationSettings.personGeneration!
    );
    this.imageSettingsForm.controls['negativePrompt'].setValue(
      this.scene.imageGenerationSettings.negativePrompt!
    );

    // On edit
    if (this.scene.imageGenerationSettings.selectedImageForVideo) {
      this.setCurrentGeneratedImageIndex(
        this.scene.imageGenerationSettings.selectedImageForVideo.gcsUri
      );
      this.imageSettingsForm.controls['selectedImageUri'].setValue(
        this.scene.imageGenerationSettings.selectedImageForVideo.gcsUri
      );
    } else {
      this.imageSettingsForm.controls['selectedImageUri'].setValue('no-image');
    }
    // Reference Type is set in initReferenceImageCards
    this.initReferenceImageCards();
  }

  /**
   * Updates the `scene.imageGenerationSettings` object with the current values from the `imageSettingsForm`.
   * This method ensures that changes made in the UI form are reflected in the underlying scene data model.
   * It also sets the `selectedImageForVideo` based on the `currentGeneratedImageIndex`.
   * @returns {void}
   */
  setImageSettings(): void {
    this.scene.imageGenerationSettings.prompt =
      this.imageSettingsForm.get('prompt')?.value!;
    this.scene.imageGenerationSettings.numImages =
      this.imageSettingsForm.get('numImages')?.value!;
    this.scene.imageGenerationSettings.aspectRatio =
      this.imageSettingsForm.get('aspectRatio')?.value!;
    this.scene.imageGenerationSettings.outputMimeType =
      this.imageSettingsForm.get('outputMimeType')?.value!;
    this.scene.imageGenerationSettings.compressionQuality =
      this.imageSettingsForm.get('compressionQuality')?.value!;
    this.scene.imageGenerationSettings.language =
      this.imageSettingsForm.get('language')?.value!;
    this.scene.imageGenerationSettings.safetyFilterLevel =
      this.imageSettingsForm.get('safetyFilterLevel')?.value!;
    this.scene.imageGenerationSettings.personGeneration =
      this.imageSettingsForm.get('personGeneration')?.value!;
    this.scene.imageGenerationSettings.negativePrompt =
      this.imageSettingsForm.get('negativePrompt')?.value!;
    // Set up selected image. generatedImages array is populated after API call
    const selectedImageForVideo: Image =
      this.scene.imageGenerationSettings.generatedImages[
        this.currentGeneratedImageIndex
      ];
    this.scene.imageGenerationSettings.selectedImageForVideo =
      selectedImageForVideo;
  }

  /**
   * Adds a new empty reference image card to the UI.
   * A unique ID is generated for the new card. This action primarily affects
   * the visual representation in the UI, allowing users to upload a reference image.
   * @returns {void}
   */
  addReference(): void {
    // Add empty object since we just need to show the cards in the ui
    const id = uuidv4();
    const card: ReferenceImageCard = {
      id: id,
    };

    this.referenceImageCards.push(card);
  }

  /**
   * Removes a reference image card from the UI and its corresponding data from the scene settings.
   * It identifies the card and image by ID and removes them from their respective arrays.
   * @param {any} event - The DOM event object from the remove action (e.g., click event).
   * @returns {void}
   */
  removeReferenceImage(event: any): void {
    const cardId = event.target.parentElement.parentElement.id;
    const cardsFoundIndex = this.getReferenceImageIndexById(
      cardId,
      this.referenceImageCards
    );
    if (cardsFoundIndex !== undefined) {
      // Remove reference image from visual cards
      this.referenceImageCards.splice(cardsFoundIndex, 1);
    } else {
      console.log('Reference image card not found. No card to remove.');
    }
    const referenceImagesFoundIndex = this.getReferenceImageIndexById(
      cardId,
      this.scene.imageGenerationSettings.referenceImages ?? []
    );
    if (referenceImagesFoundIndex !== undefined) {
      // Remove reference image from scene image generation settings
      this.scene.imageGenerationSettings.referenceImages!.splice(
        referenceImagesFoundIndex,
        1
      );
    } else {
      console.log('Reference image not found. No image to remove.');
    }
  }

  /**
   * Finds the index of a reference image (either a UI card or an actual image reference)
   * within a given array based on its ID.
   * @param {string} id - The ID of the reference image or card to find.
   * @param {Array<ReferenceImageCard | ImageReference>} referenceImages - The array to search within.
   * @returns {number | undefined} The index of the found item, or `undefined` if not found.
   */
  getReferenceImageIndexById(
    id: string,
    referenceImages: ReferenceImageCard[] | ImageReference[]
  ): number | undefined {
    let foundIndex;
    referenceImages.forEach(
      (referenceImage: ReferenceImageCard | ImageReference, index: number) => {
        if (referenceImage.id === id) {
          foundIndex = index;
          return false;
        }
        return true;
      }
    );
    return foundIndex;
  }

  /**
   * Navigates to the previous generated image in the `generatedImages` array.
   * It updates `currentGeneratedImageIndex` and sets the `selectedImageUri` in the form
   * and `selectedImageForVideo` in the scene to the previous image.
   * It loops back to the last image if currently at the first image.
   * @returns {void}
   */
  onPrev(): void {
    const previousImageIndex = this.currentGeneratedImageIndex - 1;
    this.currentGeneratedImageIndex =
      previousImageIndex < 0
        ? this.scene.imageGenerationSettings.generatedImages.length - 1
        : previousImageIndex;

    const generatedImage =
      this.scene.imageGenerationSettings.generatedImages[
        this.currentGeneratedImageIndex
      ];
    // Set selected generated image in form
    this.imageSettingsForm.controls['selectedImageUri'].setValue(
      generatedImage.gcsUri
    );
    // Set selected generated image in scene
    this.scene.imageGenerationSettings.selectedImageForVideo = generatedImage;
  }

  /**
   * Navigates to the next generated image in the `generatedImages` array.
   * It updates `currentGeneratedImageIndex` and sets the `selectedImageUri` in the form
   * and `selectedImageForVideo` in the scene to the next image.
   * It loops back to the first image if currently at the last image.
   * @returns {void}
   */
  onNext(): void {
    const nextImageIndex = this.currentGeneratedImageIndex + 1;
    this.currentGeneratedImageIndex =
      nextImageIndex ===
      this.scene.imageGenerationSettings.generatedImages.length
        ? 0
        : nextImageIndex;
    const generatedImage =
      this.scene.imageGenerationSettings.generatedImages[
        this.currentGeneratedImageIndex
      ];
    // Set selected generated image in form
    this.imageSettingsForm.controls['selectedImageUri'].setValue(
      generatedImage.gcsUri
    );
    // Set selected generated image in scene
    this.scene.imageGenerationSettings.selectedImageForVideo = generatedImage;
  }

  /**
   * Handles the selection of an image from a dropdown or similar control.
   * It updates `currentGeneratedImageIndex` based on the selected image's URI
   * and sets the `selectedImageForVideo` in the scene.
   * @param {MatSelectChange} event - The change event from the MatSelect component,
   * containing the URI of the selected image in `event.value`.
   * @returns {void}
   */
  onImageSelected(event: MatSelectChange): void {
    // Clear selected video
    if (event.value === 'no-image') {
      this.scene.imageGenerationSettings.selectedImageForVideo = undefined;
    }
    const imageUri = event.value;
    const updateForm = false;
    this.updateSelectedImage(imageUri, updateForm);
  }

  /**
   * Handles the change event when the reference type is selected from a MatSelect.
   * Updates the `referenceType` and `referenceSubType` for all existing
   * reference images within the current scene's image generation settings.
   *
   * @param event The MatSelectChange event object, containing the new reference type value.
   */
  onReferenceTypeChanged(event: MatSelectChange): void {
    const referenceType = event.value;
    // Update the reference type and sub type for all the already uploaded reference images
    this.scene.imageGenerationSettings.referenceImages?.forEach(
      (refImage: ImageReference) => {
        refImage.referenceType = this.getReferenceType(referenceType);
        refImage.referenceSubType = this.getReferenceSubType(referenceType);
      }
    );
  }

  /**
   * Extracts the main reference type from a combined string value.
   * Assumes the format "type-subtype" and returns the "type" part.
   *
   * @param value The combined string value (e.g., "pose-standing", "material-wood").
   * @returns The extracted reference type (e.g., "pose", "material").
   */
  getReferenceType(value: string): string {
    const referenceType = value.split('-')[0];

    return referenceType;
  }

  /**
   * Extracts the reference sub-type from a combined string value.
   * Assumes the format "type-subtype" and returns the "subtype" part.
   *
   * @param value The combined string value (e.g., "pose-standing", "material-wood").
   * @returns The extracted reference sub-type (e.g., "standing", "wood").
   */
  getReferenceSubType(value: string): string {
    const referenceSubtype = value.split('-')[1];

    return referenceSubtype;
  }

  /**
   * Determines the `UploadedFileType` based on a given string identifier.
   * @param {string} type - A string representing the file type ('referenceImage' or 'userProvidedImage').
   * @returns {UploadedFileType} The corresponding `UploadedFileType` enum value, or `UploadedFileType.None` if no match.
   */
  getFileType(type: string): UploadedFileType {
    if (type == 'referenceImage') {
      return UploadedFileType.ReferenceImage;
    }
    if (type == 'userProvidedImage') {
      return UploadedFileType.UserProvidedImage;
    }

    return UploadedFileType.None;
  }

  /**
   * Sets the `currentGeneratedImageIndex` to the index of the image with the given URI
   * within the `generatedImages` array of the current scene.
   * @param {string} imageUri - The URI of the image to find.
   * @returns {void}
   */
  setCurrentGeneratedImageIndex(gcsUri: string): void {
    const index = this.scene.imageGenerationSettings.generatedImages.findIndex(
      (image) => image.gcsUri === gcsUri
    );
    this.currentGeneratedImageIndex = index;
  }

  /**
   * Rewrites the image prompt for the current scene using the `TextGenerationService`.
   * It sends the current prompt and scene description to the text generation API,
   * and updates the form and scene with the enhanced prompt upon success.
   * Displays snackbar messages for feedback during the process.
   * @returns {void}
   */
  rewriteImagePrompt(): void {
    const currentPrompt = this.imageSettingsForm.get('prompt')?.value!;
    const sceneDescription = this.scene.description;
    const withSceneDescription = this.imageSettingsForm.get(
      'withSceneDescription'
    )?.value!;

    openSnackBar(
      this._snackBar,
      `Generating enhanced image prompt for scene ${this.scene.number}...`
    );

    this.textGenerationService
      .rewriteImagePrompt(currentPrompt, sceneDescription, withSceneDescription)
      .subscribe(
        (enhancedPrompt: any) => {
          // Find scene in responses to update generated videos
          closeSnackBar(this._snackBar);
          if (enhancedPrompt && enhancedPrompt.data) {
            this.scene.imageGenerationSettings.prompt = enhancedPrompt.data;
            this.imageSettingsForm.get('prompt')?.setValue(enhancedPrompt.data);
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
   * Initiates the image generation process for the current scene.
   * It displays a loading snackbar, constructs an `ImageGenerationRequest` from the current scene's settings,
   * sends it to the `ImageGenerationService`, and handles the API response.
   * Upon successful generation, it updates the scene's `generatedImages` and provides feedback via snackbar.
   * @returns {void}
   */
  generateImage(): void {
    openSnackBar(
      this._snackBar,
      `Generating image for scene ${this.scene.number}. This might take some time...`
    );

    const imageGeneration: ImageGenerationRequest = {
      scenes: [this.buildImageSegment()],
    };

    this.imageGenerationService
      .generateImage(this.storyId, imageGeneration)
      .subscribe(
        (images: ImageGenerationResponse[]) => {
          // Find scene in responses to update generated videoss
          const executionStatus = updateScenesWithGeneratedImages(images, [
            this.scene,
          ]);
          openSnackBar(
            this._snackBar,
            executionStatus['execution_message'],
            10
          );
          const lastGenImage =
            this.scene.imageGenerationSettings.generatedImages[
              this.scene.imageGenerationSettings.generatedImages.length - 1
            ];
          const updateForm = true;
          this.updateSelectedImage(lastGenImage.gcsUri, updateForm);
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
   * Updates the selected image in the component's state and optionally in the form.
   * This function sets the image URI, finds the full image object from the list of
   * generated images, and designates it as the selected image for video generation.
   *
   * @param {string} gcsUri The GCS URI of the image to be selected.
   * @param {boolean} updateForm A flag to determine whether to update the reactive form with the new image URI.
   */
  updateSelectedImage(gcsUri: string, updateForm: boolean) {
    if (updateForm) {
      // Update selected image in form
      this.imageSettingsForm.controls['selectedImageUri'].setValue(
        gcsUri
      );
    }
    // Find image index in array
    this.setCurrentGeneratedImageIndex(gcsUri);
    const selectedImageForVideo =
      this.scene.imageGenerationSettings.generatedImages[
        this.currentGeneratedImageIndex
      ];
    // Set selected image in scene to be used as selectedImageForVideo
    this.scene.imageGenerationSettings.selectedImageForVideo =
      selectedImageForVideo;
  }

  /**
   * Finds reference images by their ID within the scene's settings.
   *
   * @param {string} id The unique identifier of the reference image to find.
   * @returns {ImageReference[] | undefined} An array containing the matching image(s).
   * Returns an empty array if no match is found, or `undefined` if the reference image list does not exist.
   */
  getReferenceImageById(id: string): ImageReference[] | undefined {
    const refImgFound =
      this.scene.imageGenerationSettings.referenceImages?.filter(
        (referenceImage: ImageReference) => {
          return referenceImage.id === id;
        }
      );

    return refImgFound;
  }

  /**
   * Retrieves and formats a file item into the UploadedFile structure based on its type.
   * This is primarily used to populate file uploader components when editing an item.
   *
   * @param {string} cardId - The unique identifier, which is treated as the reference image ID.
   * @param {string} fileType - The type of file to retrieve (e.g., UploadedFileType.ReferenceImage).
   * @returns {UploadedFile[]} An array containing the formatted file item if found, otherwise an empty array.
   */
  getFileItemsByType(cardId: string, fileType: string) {
    // For On Edit action
    const fileItems: UploadedFile[] = [];

    // Build uploaded reference images for file uploader component
    if (fileType === UploadedFileType.ReferenceImage) {
      // cardId is also reference image id
      const referenceImage = this.getReferenceImageById(cardId);
      // Build file tems for file uploader component
      if (referenceImage && referenceImage.length > 0) {
        const uploadedFile: UploadedFile = {
          sceneId: this.scene.id,
          id: cardId,
          name: referenceImage[0].name,
          gcsUri: referenceImage[0].gcsUri,
          signedUri: referenceImage[0].signedUri,
          gcsFusePath: referenceImage[0].gcsFusePath,
          mimeType: referenceImage[0].mimeType,
          type: UploadedFileType.ReferenceImage,
        };
        fileItems.push(uploadedFile);
      }
    }

    // Build uploaded user provided images for file uploader component
    if (fileType === UploadedFileType.UserProvidedImage) {
      const selectedImageForVideo =
        this.scene.imageGenerationSettings.selectedImageForVideo;
      if (selectedImageForVideo) {
        const uploadedFile: UploadedFile = {
          sceneId: this.scene.id,
          id: selectedImageForVideo.id!, // check this
          name: selectedImageForVideo.name,
          gcsUri: selectedImageForVideo.gcsUri,
          signedUri: selectedImageForVideo.signedUri,
          gcsFusePath: selectedImageForVideo.gcsFusePath,
          mimeType: selectedImageForVideo.mimeType,
          type: UploadedFileType.ReferenceImage,
        };
        fileItems.push(uploadedFile);
      }
    }

    return fileItems;
  }

  /**
   * Initializes the `referenceImageCards` array based on the reference images
   * found in the scene's settings. For each reference image, a corresponding
   * card with a matching ID is created and pushed into the local array.
   */
  initReferenceImageCards() {
    this.scene.imageGenerationSettings.referenceImages?.forEach(
      (refImage: ImageReference, index: number) => {
        // Init Reference type form control with first refImage
        // since all reference images use the same ref type as the Vertex UI
        if (index === 0) {
          this.imageSettingsForm.controls['referenceType'].setValue(
            refImage.referenceType
          );
        }

        const card: ReferenceImageCard = {
          id: refImage.id!, // refImage id is the same as reference card id
        };
        const foundIndex = this.getReferenceImageIndexById(
          refImage.id,
          this.referenceImageCards
        );
        // TODO (ae) fix this. For now only add if not added previously
        if (foundIndex === undefined) {
          this.referenceImageCards.push(card);
          // Workaround for now
          const refImgDescElement = document.getElementById(
            `desc@${refImage.id}`
          ) as any;
          if (refImgDescElement) {
            // TODO (ae) fix this later
            //refImgDescElement!.value = refImage.description;
          }
        }
      }
    );
  }

  /**
   * Constructs an `ImageSceneRequest` object for the current scene.
   * This object encapsulates all necessary parameters for a single image generation request,
   * including prompt, creative direction settings, and any associated reference images.
   * It processes `referenceImageCards` to include their descriptions and types.
   * @returns {ImageSceneRequest} The constructed image scene request.
   */
  buildImageSegment(): ImageSceneRequest {
    // Build reference images with latest changes in the form
    const referenceImages: ImageReferenceItem[] = this.referenceImageCards
      .filter((card: ReferenceImageCard) => {
        const refImageFound =
          this.scene.imageGenerationSettings.referenceImages!.filter(
            (img: ImageReference) => {
              return img.id === card.id;
            }
          );

        // Filter out cards that don't have an uploaded image
        return refImageFound && refImageFound.length > 0;
      })
      .map((card: ReferenceImageCard, index: number) => {
        const refImageFound =
          this.scene.imageGenerationSettings.referenceImages!.filter(
            (img: ImageReference) => {
              return img.id === card.id;
            }
          );
        // Get latest values from form
        // Work around since dynamically adding controls didn't work using FromGrop
        // FormRecord should be used but was introducing other issues
        const descriptionElement = document.getElementById(
          `desc@${card.id}`
        ) as any;
        //const referenceType = descFormControlValue.value.split('@')[0];
        return {
          reference_id: index + 1,
          reference_type: this.getReferenceType(
            this.imageSettingsForm.get('referenceType')?.value!
          ),
          reference_subtype: this.getReferenceSubType(
            this.imageSettingsForm.get('referenceType')?.value!
          ),
          description: descriptionElement.value,
          id: refImageFound[0].id,
          name: refImageFound[0].name, // validate this
          gcs_uri: refImageFound[0].gcsUri,
          signed_uri: refImageFound[0].signedUri,
          gcs_fuse_path: refImageFound[0].gcsFusePath,
          mime_type: refImageFound[0].mimeType,
        } as ImageReferenceItem;
      });

    const segments: ImageSceneRequest = {
      scene_num: this.scene.number,
      img_prompt: this.imageSettingsForm.get('prompt')?.value!,
      creative_dir: {
        aspect_ratio: this.imageSettingsForm.get('aspectRatio')?.value,
        person_generation:
          this.imageSettingsForm.get('personGeneration')?.value,
        number_of_images: this.imageSettingsForm.get('numImages')?.value,
        output_mime_type: this.imageSettingsForm.get('outputMimeType')?.value,
        /*seed?: this.imageSettingsForm.get('prompt')?.value;*/
        negative_prompt: this.imageSettingsForm.get('negativePrompt')?.value,
        enhance_prompt: this.imageSettingsForm.get('enhancePrompt')?.value,
        use_last_frame: this.imageSettingsForm.get('useLastFrame')?.value,
        safety_filter_level:
          this.imageSettingsForm.get('safetyFilterLevel')?.value,
        language: this.imageSettingsForm.get('language')?.value,
        output_compression_quality:
          this.imageSettingsForm.get('compressionQuality')?.value,
      } as ImageCreativeDirection,
      use_reference_image_for_image:
        (this.scene.imageGenerationSettings?.referenceImages?.length ?? 0) > 0,
      edit_mode: this.scene.imageGenerationSettings.editMode,
      reference_images: referenceImages,
    };

    return segments;
  }

  /**
   * Determines whether the "Generate Image" button should be disabled.
   * The button is enabled only if the `imageSettingsForm` is valid (e.g., prompt is filled).
   * @returns {boolean} `true` if the button should be disabled, `false` otherwise.
   */
  disableGenerateImageButton(): boolean {
    return !this.imageSettingsForm.valid;
  }
}
