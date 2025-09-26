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
import { Subject, BehaviorSubject } from 'rxjs';
import { VideoStory } from '../models/story-models';
import { ExportScenes, VideoScene } from '../models/scene-models';
import { ExportStory } from '../models/story-models';
import { UploadedFile } from '../models/settings-models';

@Injectable({
  providedIn: 'root',
})
export class ComponentsCommunicationService {
  constructor() {}

  // Observable sources
  private videoGeneratedSource = new Subject<VideoStory>();
  private storyExportedSource = new Subject<ExportStory>();
  private scenesExportedSource = new Subject<ExportScenes>();
  private tabChangedSource = new Subject<number>();
  private fileUploadedSource = new Subject<UploadedFile>();
  private referenceImageRemovedSource = new Subject<string>();
  private userLoggedInSource = new Subject<boolean>();
  private scenesSource = new BehaviorSubject<VideoScene[]>([]);

  // Observable streams
  videoGenerated$ = this.videoGeneratedSource.asObservable();
  storyExportedSource$ = this.storyExportedSource.asObservable();
  scenesExportedSource$ = this.scenesExportedSource.asObservable();
  tabChangedSource$ = this.tabChangedSource.asObservable();
  fileUploadedSource$ = this.fileUploadedSource.asObservable();
  referenceImageRemovedSource$ =
    this.referenceImageRemovedSource.asObservable();
  userLoggedInSource$ = this.userLoggedInSource.asObservable();
  scenes$ = this.scenesSource.asObservable();

  videoGenerated(story: VideoStory) {
    this.videoGeneratedSource.next(story);
  }

  storyExported(exportStory: ExportStory) {
    this.storyExportedSource.next(exportStory);
  }

  scenesExported(exportScenes: ExportScenes) {
    this.scenesExportedSource.next(exportScenes);
  }

  tabChanged(tabNumber: number) {
    this.tabChangedSource.next(tabNumber);
  }

  // Doesn't work as intended
  fileUploaded(file: UploadedFile) {
    this.fileUploadedSource.next(file);
  }

  referenceImageRemoved(id: string) {
    this.referenceImageRemovedSource.next(id);
  }

  userLoggedIn(loggedIn: boolean) {
    this.userLoggedInSource.next(loggedIn);
  }

  updateScenes(scenes: VideoScene[]) {
    this.scenesSource.next(scenes);
  }
}
