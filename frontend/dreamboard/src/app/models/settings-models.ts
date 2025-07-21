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

export enum UploadedFileType {
  UserProvidedImage = 'UserProvidedImage',
  ReferenceImage = 'ReferenceImage',
  Video = 'Video',
  CreativeBrief = 'CreativeBrief',
  BrandGuidelines = 'BrandGuidelines',
  None = 'None',
}

export interface UploadedFile {
  sceneId: string;
  id: string;
  name: string;
  gcsUri: string;
  signedUri: string;
  gcsFusePath: string;
  mimeType: string;
  type: UploadedFileType;
}

export interface SelectItem {
  displayName: string;
  value: string;
  field1?: any; // represents any additional information for the item
}

export const enum UploadStatus {
  InProgress = 'inProgress',
  Cancel = 'cancel',
  Error = 'error',
  Success = 'success',
}

export interface APIError {
  error: { [id: string] : { detail: string }; }
}