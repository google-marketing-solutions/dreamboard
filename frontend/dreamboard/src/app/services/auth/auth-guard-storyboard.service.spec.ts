import { TestBed } from '@angular/core/testing';

import { AuthGuardStoryboardService } from './auth-guard-storyboard.service';

describe('AuthStoryboardGuardService', () => {
  let service: AuthGuardStoryboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthGuardStoryboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
