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

/**
 * @fileoverview This component represents the main navigation bar of the application.
 * It provides a consistent header across different views and can be extended to include
 * navigation links, branding, and user-related elements.
 */

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ComponentsCommunicationService } from '../../services/components-communication.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  user: string | null = localStorage.getItem('user');

  constructor(
    private componentsCommunicationService: ComponentsCommunicationService,
    private router: Router
  ) {
    componentsCommunicationService.userLoggedInSource$.subscribe(
      (updated: boolean) => {
        this.user = localStorage.getItem('user');
      }
    );
  }

  logOut() {
    // TODO (ae) log out with Google button
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
