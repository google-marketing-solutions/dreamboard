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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { UploadedFileType } from '../models/settings-models';

@Injectable({
  providedIn: 'root',
})
export class FilesManagerService {
  PROXY_URL = environment.proxyURL;
  BASE_URL = environment.fileUploaderApiURL;

  constructor(private http: HttpClient) {}

  uploadFile(
    story_id: string,
    fileType: UploadedFileType,
    fileData: FormData
  ): any {
    let bucketPath = '';
    if (
      fileType === UploadedFileType.ReferenceImage ||
      fileType === UploadedFileType.UserProvidedImage
    ) {
    }
    switch (fileType) {
      case UploadedFileType.ReferenceImage:
      case UploadedFileType.UserProvidedImage:
        bucketPath = `${story_id}@images`;
        break;
      case UploadedFileType.CreativeBrief:
      case UploadedFileType.BrandGuidelines:
      case UploadedFileType.Video:
        bucketPath = `${story_id}`;
        break;
      default:
        console.log(`No file type supported ${fileType}.`);
        break;
    }
    // Append bucket where the file will be uploaded to
    fileData.append('bucketPath', bucketPath);
    return this.http.post<any>(
      `${this.PROXY_URL}/api/handleFileUploadRequest`,
      fileData,
      {
        reportProgress: true,
        observe: 'events',
      }
    );
  }
}
