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
import { ImageGenerationRequest } from '../models/image-gen-models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImageGenerationService {
  PROXY_URL = environment.proxyURL;
  BASE_URL = environment.imageGenerationApiURL;

  constructor(private http: HttpClient) {}

  generateImage(
    story_id: string,
    imageGeneration: ImageGenerationRequest,
  ): any {
    const requestBody = {
      url: `${this.BASE_URL}/generate_image/${story_id}`,
      options: { method: 'POST', data: imageGeneration },
    };
    return this.http.post<any>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody,
    );
  }

  uploadImage(story_id: string, imageData: FormData): any {
    // TODO (ae) check
    const requestBody = {
      url: `${this.BASE_URL}/upload_file/${story_id}`,
      options: { method: 'POST', data: imageData },
    };
    /*  {
        reportProgress: true,
        observe: 'events',
      } */
    return this.http.post<any>(
      `${this.PROXY_URL}/api/handleFileUploadRequest`,
      requestBody,
    );
  }
}
