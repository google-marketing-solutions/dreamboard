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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostVideoProductionComponent } from './post-video-production.component';

describe('PostVideoProductionComponent', () => {
  let component: PostVideoProductionComponent;
  let fixture: ComponentFixture<PostVideoProductionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostVideoProductionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PostVideoProductionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
