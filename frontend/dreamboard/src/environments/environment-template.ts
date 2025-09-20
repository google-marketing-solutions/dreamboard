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

export const environment = {
  production: true,
  videoGenerationApiURL: '{BACKEND_CLOUD_RUN_SERVICE_URL}/api/video_generation',
  imageGenerationApiURL: '{BACKEND_CLOUD_RUN_SERVICE_URL}/api/image_generation',
  textGenerationApiURL: '{BACKEND_CLOUD_RUN_SERVICE_URL}/api/text_generation',
  fileUploaderApiURL: '{BACKEND_CLOUD_RUN_SERVICE_URL}/api/file_uploader',
  storiesStorageApiURL: '{BACKEND_CLOUD_RUN_SERVICE_URL}/api/story_storage',
  clientID: '{CLIENT_ID}',
  proxyURL: '', // proxy url is just api/handleRequest for Nodejs server in PROD
};
