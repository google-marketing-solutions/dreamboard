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
  BASE_URL = environment.storiesStorageApiURL;

  constructor(private http: HttpClient) {}

  addNewStory(userId: string, newStory: VideoStory): any {
    return this.http.post<any[]>(
      `${this.BASE_URL}/save_story/${userId}`,
      newStory
    );
  }

  getStoriesByUserId(userId: string): any {
    return this.http.get<any[]>(`${this.BASE_URL}/list_all_stories/${userId}`);
  }

  deleteStoryById(userId: string, storyId: string): any {
    return this.http.delete<any[]>(
      `${this.BASE_URL}/remove_story/${userId}/${storyId}`
    );
  }
}
