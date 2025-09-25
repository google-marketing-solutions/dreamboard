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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Image } from '../models/image-gen-models';

@Injectable({
  providedIn: 'root',
})
export class FrameExtractionService {
  private apiUrl = `${environment.videoGenerationApiURL}/extract_frames`;
  private handleRequestUrl = `${environment.proxyURL}/api/handleRequest`;

  constructor(private http: HttpClient) {}

  extractFrames(
    gcs_uri: string,
    story_id: string,
    scene_num: string,
    time_sec: number,
    frame_count: number
  ): Observable<any> {
    const body = {
      gcs_uri,
      story_id,
      scene_num,
      time_sec,
      frame_count,
    };
    const request = {
      url: this.apiUrl,
      options: {
        method: 'POST',
        data: body,
      },
    };
    return this.http.post(this.handleRequestUrl, request).pipe(
      map((response: any) => {
        if (response.data && Array.isArray(response.data)) {
          response.data = response.data.map((image: any): Image => ({
            id: image.id,
            name: image.name,
            gcsUri: image.gcs_uri,
            signedUri: image.signed_uri,
            gcsFusePath: image.gcs_fuse_path,
            mimeType: image.mime_type,
          }));
        }
        return response;
      })
    );
  }
}