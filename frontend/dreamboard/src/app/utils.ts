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

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

export function openSnackBar(
  snackBar: MatSnackBar,
  message: string,
  duration?: number
) {
  if (duration) {
    snackBar.open(message, 'X', {
      duration: 5 * 1000,
    });
  } else {
    snackBar.open(message, 'X');
  }
}

export function closeSnackBar(snackBar: MatSnackBar) {
  snackBar.dismiss();
}

export function confirmAction(
  confirmDialog: MatDialog,
  width: string,
  message: string,
  param1: any,
  func: any
) {
  const dialogRef = confirmDialog.open(ConfirmDialogComponent, {
    width: width,
    data: {
      title: 'Confirm Action',
      message: message,
    },
  });

  dialogRef.afterClosed().subscribe((result) => {
    if (result) {
      // User clicked OK
      func(param1);
    } else {
      // User clicked Cancel
      console.log('Action cancelled.');
    }
  });
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getWarningMessage() {
  return `WARNING: You are not logged in. Please use the Google Sign In button to
      log in. If you don't have a Google account, please create/save your first story
      to generate a random User Id.`;
}

export function decodeJwtResponse(token: string) {
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  let jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );

  return JSON.parse(jsonPayload);
}
