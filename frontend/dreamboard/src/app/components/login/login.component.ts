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

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../environments/environment.development';
import { decodeJwtResponse } from '../../utils';
import { ComponentsCommunicationService } from '../../services/components-communication.service';
import { v4 as uuidv4 } from 'uuid';
import { confirmAction } from '../../utils';

@Component({
  selector: 'app-login',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  confirmDialog = inject(MatDialog);

  constructor(
    private router: Router,
    private componentsCommunicationService: ComponentsCommunicationService
  ) {}

  ngOnInit(): void {
    this.initializeGoogleSignIn();
  }

  initializeGoogleSignIn(): void {
    window.google.accounts.id.initialize({
      client_id: environment.clientID,
      callback: (response: any) => this.handleCredentialResponse(response),
      use_fedcm_for_prompt: true,
    });

    // Render the Google Sign-In button (optional, if you're using the button)
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-button'),
      { theme: 'outline', size: 'large' }
    );

    // Optionally, display the One Tap dialog
    //window.google.accounts.id.prompt();
  }

  handleCredentialResponse(response: any): void {
    // Handle the JWT token received in response.credential
    console.log('Login successful!');
    const creds = decodeJwtResponse(response.credential);
    localStorage.setItem('user', creds.email);
    this.componentsCommunicationService.userLoggedIn(true);
    this.router.navigate(['/storyboard']);
  }

  onLogInAsGuest() {
    confirmAction(
      this.confirmDialog,
      '450px',
      `Logging in as guest will generate a random user id and all stories will be saved under this user.
      Do you want to proceed?`,
      '',
      this.logInAsGuest.bind(this)
    );
  }

  logInAsGuest() {
    const user = uuidv4();
    localStorage.setItem('user', user);
    this.componentsCommunicationService.userLoggedIn(true);
    this.router.navigate(['/storyboard']);
  }
}
