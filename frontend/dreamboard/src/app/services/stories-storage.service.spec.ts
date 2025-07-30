import { TestBed } from '@angular/core/testing';

import { StoriesStorageService } from './stories-storage.service';

describe('StoriesStorageService', () => {
  let service: StoriesStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StoriesStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
