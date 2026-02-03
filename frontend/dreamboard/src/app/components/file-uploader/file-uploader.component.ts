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
 * @fileoverview This component provides a file upload interface, allowing users
 * to select or drag-and-drop files. It manages the upload process, displays progress
 * and status, and communicates uploaded file information to other parts of the application.
 */

import {
  Component,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FilesManagerService } from '../../services/files-manager.service';
import { Subscription } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { openSnackBar } from '../../utils';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  UploadedFile,
  UploadedFileType,
  UploadStatus,
} from '../../models/settings-models';
import { ComponentsCommunicationService } from '../../services/components-communication.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-file-uploader',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss'],
})
export class FileUploaderComponent {
  @ViewChild('fileUpload', { static: false }) fileUploadElementRef!: ElementRef;
  id = uuidv4();
  @Input() storyId!: string;
  @Input() sceneId!: string;
  @Input() fileType!: UploadedFileType;
  @Input() referenceImageId: string | undefined;
  @Input() fileItems: UploadedFile[] = [];
  statusIcon: string = '';
  uploadInProgress: boolean = false;
  uploadError: boolean = false;
  uploadSub!: Subscription;
  @Output() fileUploadedEvent = new EventEmitter<UploadedFile>();
  private _snackBar = inject(MatSnackBar);

  constructor(
    private filesManagerService: FilesManagerService,
    private componentsCommunicationService: ComponentsCommunicationService
  ) {}

  /**
   * Sets the visual status of the file uploader based on the provided `UploadStatus`.
   * It updates `uploadInProgress`, `uploadError`, and `statusIcon` accordingly.
   * @param {string} status - The current status of the upload, defined by `UploadStatus` enum.
   * @returns {void}
   */
  setUploadStatus(status: string): void {
    this.uploadInProgress = false;
    this.uploadError = false;
    switch (status) {
      case UploadStatus.InProgress:
        this.uploadInProgress = true;
        this.statusIcon = 'file_upload';
        break;
      case UploadStatus.Cancel:
        this.statusIcon = 'cancel';
        break;
      case UploadStatus.Error:
        this.uploadError = true;
        this.statusIcon = 'error';
        break;
      case UploadStatus.Success:
        this.statusIcon = 'check_circle';
        break;
      default:
        break;
    }
  }

  clickFileUpload(event: any) {
    const buttonUploader = event.target.parentElement.parentElement;
    const div = buttonUploader.parentElement;
    const inputUploaderId = div.getElementsByTagName('input')[0].click();
    document.getElementById(inputUploaderId)?.click();
  }

  getElementId() {
    return uuidv4();
  }

  getButtonTypeLabel(): string {
    switch (this.fileType) {
      case UploadedFileType.ReferenceImage:
        return 'Reference image';
      case UploadedFileType.UserProvidedImage:
        return 'Your Reference Image';
      case UploadedFileType.CreativeBrief:
        return 'Creative Brief';
      case UploadedFileType.BrandGuidelines:
        return 'Brand Guidelines';
      case UploadedFileType.Video:
        return 'Video';
      default:
        console.log(`No file type supported ${this.fileType}.`);
        return UploadedFileType.None;
    }
  }

  /**
   * Handles files dropped onto the uploader area.
   * It passes the files to `processFiles` for further handling and upload.
   * @param {any} files - The file list object from the drop event.
   * @returns {void}
   */
  onFileDropped(files: any): void {
    this.processFiles(files);
  }

  /**
   * Handles files selected via the native file input dialog.
   * It extracts the selected files and passes them to `processFiles` for handling and upload.
   * @param {any} event - The DOM event object from the file input change.
   * @returns {void}
   */
  onFileSelected(event: any): void {
    const files = event.target.files;
    this.processFiles(files);
  }

  /**
   * Processes the selected or dropped files for upload.
   * For each file, it prepares `FormData`, creates an `UploadedFile` item,
   * and initiates the upload to the `filesManagerService`.
   * It updates the upload status and communicates successful uploads.
   * Currently, it only handles one file by replacing `fileItems`.
   * @param {File[]} files - An array of `File` objects to be processed and uploaded.
   * @returns {void}
   */
  processFiles(files: File[]): void {
    this.setUploadStatus(UploadStatus.InProgress);
    for (const file of files) {
      // File uploader needs a FormData
      const formData = new FormData();
      formData.append('file', file);
      const fileId = this.referenceImageId ? this.referenceImageId : uuidv4();
      const fileItem: UploadedFile = {
        sceneId: this.sceneId,
        id: fileId,
        name: file.name,
        gcsUri: '', // Updated on upload to the server
        signedUri: '', // Updated on upload to the server
        gcsFusePath: '', // Updated on upload to the server
        mimeType: file.type,
        type: this.fileType,
      };
      openSnackBar(this._snackBar, `Uploading file ${fileItem.name}...`);
      this.fileItems = [fileItem]; // Just 1 file for now
      // Upload to server
      this.filesManagerService
        .uploadFile(this.storyId, this.sceneId, this.fileType, formData)
        .subscribe(
          (response: any) => {
            if (response.type == HttpEventType.Response) {
              this.setUploadStatus(UploadStatus.Success);
              const uploadedFile = response.body;
              console.log(`File uploaded to server ${uploadedFile.gcs_uri}`);
              openSnackBar(
                this._snackBar,
                `File ${uploadedFile.name} uploaded successfully!`,
                10
              );
              fileItem.gcsUri = uploadedFile.gcs_uri;
              fileItem.signedUri = uploadedFile.signed_uri;
              fileItem.gcsFusePath = uploadedFile.gcs_fuse_path;
              this.fileUploadedEvent.emit(fileItem);
            } else {
              console.log('Uploading image...');
            }
          },
          (error: any) => {
            this.uploadInProgress = false;
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
    this.fileUploadElementRef.nativeElement.value = '';
  }

  getAcceptOptions() {
    switch (this.fileType) {
      case UploadedFileType.ReferenceImage:
      case UploadedFileType.UserProvidedImage:
        return '.png,.jpeg,.jpg';
      case UploadedFileType.CreativeBrief:
      case UploadedFileType.BrandGuidelines:
        return '.pdf,.txt';
      case UploadedFileType.Video:
        return '.mp4';
      default:
        return '';
    }
  }

  disableUploadButton() {
    // TODO (ae) workaround for now
    this.fileType === UploadedFileType.ReferenceImage &&
      this.fileItems.length > 0;
  }

  /**
   * Formats a given number of bytes into a human-readable file size string (e.g., "10.24 MB").
   * @param {number} bytes - The number of bytes to format.
   * @returns {string} The formatted file size string.
   */
  getSize(bytes: number) {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const size = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, size)).toFixed(2)) + ' ' + sizes[size]
    );
  }

  /**
   * Angular lifecycle hook, called when the component is destroyed.
   * It unsubscribes from the `uploadSub` observable to prevent memory leaks
   * if an upload is in progress when the component is removed.
   * @returns {void}
   */
  ngOnDestroy(): void {
    if (this.uploadSub) {
      this.uploadSub.unsubscribe();
    }
  }
}
