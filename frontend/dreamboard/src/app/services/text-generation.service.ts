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
  BASE_URL = environment.textGenerationApiURL;

  constructor(private http: HttpClient) {}

  generateStories(storiesGeneration: StoriesGenerationRequest): any {
    return this.http.post<any[]>(
      `${this.BASE_URL}/brainstorm_stories`,
      storiesGeneration
    );
  }

  generateScenes(scenesGeneration: ScenesGenerationRequest): any {
    return this.http.post<any[]>(
      `${this.BASE_URL}/brainstorm_scenes`,
      scenesGeneration
    );
  }

  rewriteImagePrompt(
    prompt: string,
    scene_description: string,
    withSceneDescription: boolean
  ): any {
    // Change Endpoints because prompts are different
    if (withSceneDescription) {
      return this.http.post<any>(
        `${this.BASE_URL}/enhance_image_prompt_with_scene`,
        { prompt: prompt, scene: scene_description }
      );
    } else {
      return this.http.post<any>(`${this.BASE_URL}/enhance_image_prompt`, {
        prompt: prompt,
        scene: scene_description,
      });
    }
  }

  rewriteVideoPrompt(
    prompt: string,
    scene_description: string,
    withSceneDescription: boolean
  ): any {
    // Change Endpoints because prompts are different
    if (withSceneDescription) {
      return this.http.post<any>(
        `${this.BASE_URL}/enhance_video_prompt_with_scene`,
        { prompt: prompt, scene: scene_description }
      );
    } else {
      return this.http.post<any>(`${this.BASE_URL}/enhance_video_prompt`, {
        prompt: prompt,
        scene: scene_description,
      });
    }
  }

  rewriteBrainstormPrompt(idea: string): any {
    return this.http.post<any>(`${this.BASE_URL}/rewrite_brainstorm_prompt`, {
      idea: idea,
    });
  }

  extract_text_from_file(extract_text_request: ExtractTextItem): any {
    return this.http.post<any>(
      `${this.BASE_URL}/extract_text_from_file`,
      extract_text_request
    );
  }
}
