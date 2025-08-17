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
import { ScenesGenerationRequest } from '../models/scene-models';
import {
  StoriesGenerationRequest,
  ExtractTextItem,
} from '../models/story-models';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class TextGenerationService {
  PROXY_URL = environment.proxyURL;
  BASE_URL = environment.textGenerationApiURL;

  constructor(private http: HttpClient) {}

  generateStories(storiesGeneration: StoriesGenerationRequest): any {
    const requestBody = {
      url: `${this.BASE_URL}/brainstorm_stories`,
      options: { method: 'POST', data: storiesGeneration },
    };
    return this.http.post<any[]>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }

  generateScenes(scenesGeneration: ScenesGenerationRequest): any {
    const requestBody = {
      url: `${this.BASE_URL}/brainstorm_scenes`,
      options: { method: 'POST', data: scenesGeneration },
    };
    return this.http.post<any[]>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }

  rewriteImagePrompt(
    prompt: string,
    scene_description: string,
    withSceneDescription: boolean
  ): any {
    // Change Endpoints because prompts are different
    if (withSceneDescription) {
      const requestBody = {
        url: `${this.BASE_URL}/enhance_image_prompt_with_scene`,
        options: {
          method: 'POST',
          data: { prompt: prompt, scene: scene_description },
        },
      };
      return this.http.post<any>(
        `${this.PROXY_URL}/api/handleRequest`,
        requestBody
      );
    } else {
      const requestBody = {
        url: `${this.BASE_URL}/enhance_image_prompt`,
        options: {
          method: 'POST',
          data: {
            prompt: prompt,
            scene: scene_description,
          },
        },
      };
      return this.http.post<any>(
        `${this.PROXY_URL}/api/handleRequest`,
        requestBody
      );
    }
  }

  rewriteVideoPrompt(
    prompt: string,
    scene_description: string,
    withSceneDescription: boolean
  ): any {
    // Change Endpoints because prompts are different
    if (withSceneDescription) {
      const requestBody = {
        url: `${this.BASE_URL}/enhance_video_prompt_with_scene`,
        options: {
          method: 'POST',
          data: { prompt: prompt, scene: scene_description },
        },
      };
      return this.http.post<any>(
        `${this.PROXY_URL}/api/handleRequest`,
        requestBody
      );
    } else {
      const requestBody = {
        url: `${this.BASE_URL}/enhance_video_prompt`,
        options: {
          method: 'POST',
          data: {
            prompt: prompt,
            scene: scene_description,
          },
        },
      };
      return this.http.post<any>(
        `${this.PROXY_URL}/api/handleRequest`,
        requestBody
      );
    }
  }

  rewriteBrainstormPrompt(idea: string): any {
    const requestBody = {
      url: `${this.BASE_URL}/rewrite_brainstorm_prompt`,
      options: {
        method: 'POST',
        data: {
          idea: idea,
        },
      },
    };
    return this.http.post<any>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }

  extract_text_from_file(extract_text_request: ExtractTextItem): any {
    // TODO(ae) TEST
    const requestBody = {
      url: `${this.BASE_URL}/extract_text_from_file`,
      options: {
        method: 'POST',
        data: extract_text_request,
      },
    };
    return this.http.post<any>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }
}
