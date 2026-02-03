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
import {
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoMergeRequest,
  VideoMergeResponse,
} from '../models/video-gen-models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VideoGenerationService {
  PROXY_URL = environment.proxyURL;
  BASE_URL = environment.videoGenerationApiURL;

  constructor(private http: HttpClient) {}

  generateVideosFromScenes(
    story_id: string,
    videoGeneration: VideoGenerationRequest
  ): any {
    const requestBody = {
      url: `${this.BASE_URL}/generate_videos_from_scenes/${story_id}`,
      options: { method: 'POST', data: videoGeneration },
    };
    return this.http.post<VideoGenerationResponse[]>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }

  mergeVideos(story_id: string, videoMergeRequest: VideoMergeRequest) {
    const requestBody = {
      url: `${this.BASE_URL}/merge_videos/${story_id}`,
      options: { method: 'POST', data: videoMergeRequest },
    };
    return this.http.post<VideoMergeResponse>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }
}
