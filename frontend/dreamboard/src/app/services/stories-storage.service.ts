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
import { environment } from '../../environments/environment.development';
import { VideoStory } from '../models/story-models';

@Injectable({
  providedIn: 'root',
})
export class StoriesStorageService {
  PROXY_URL = environment.proxyURL;
  BASE_URL = environment.storiesStorageApiURL;

  constructor(private http: HttpClient) {}

  addNewStory(userId: string, newStory: VideoStory): any {
    const requestBody = {
      url: `${this.BASE_URL}/save_story/${userId}`,
      options: { method: 'POST', data: newStory },
    };
    return this.http.post<any[]>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }

  getStoriesByUserId(userId: string): any {
    const requestBody = {
      url: `${this.BASE_URL}/list_all_stories/${userId}`,
      options: { method: 'GET' },
    };
    return this.http.post<any[]>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }

  getStoryById(userId: string, storyId: string): any {
    const requestBody = {
      url: `${this.BASE_URL}/read_story/${userId}/${storyId}`,
      options: { method: 'GET' },
    };
    return this.http.post<any>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }

  deleteStoryById(userId: string, storyId: string): any {
    const requestBody = {
      url: `${this.BASE_URL}/remove_story/${userId}/${storyId}`,
      options: { method: 'DELETE' },
    };
    return this.http.post<any[]>(
      `${this.PROXY_URL}/api/handleRequest`,
      requestBody
    );
  }
}