import { TestBed } from '@angular/core/testing';

import { AuthGuardLogInService } from './auth-guard-login.service';

describe('AuthGuardLogInService', () => {
  let service: AuthGuardLogInService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthGuardLogInService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
