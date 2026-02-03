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

import { Image } from './models/image-gen-models';
import {
  Character,
  CharacterItem,
  SceneItem,
  VideoScene,
} from './models/scene-models';
import { VideoStory } from './models/story-models';
import { v4 as uuidv4 } from 'uuid';

export function getNewVideoStory() {
  const videoStory: VideoStory = {
    id: uuidv4(),
    title: 'New Story',
    description: 'This is a new story',
    brandGuidelinesAdherence: '',
    abcdAdherence: '',
    scenes: [],
    generatedVideos: [],
    owner: localStorage.getItem('user')!,
    created_at: '', // to comply with the backend
    updated_at: '', // to comply with the backend
    shareWith: [],
  };

  return videoStory;
}

export function mapCharactersToVideoScene(
  generatedCharacters: CharacterItem[],
): Character[] {
  const characters: Character[] = generatedCharacters.map(
    (genCharacter: CharacterItem) => {
      let image: Image | undefined = undefined;
      if (genCharacter.image) {
        image = {
          id: genCharacter.image.id,
          name: genCharacter.image.name,
          gcsUri: genCharacter.image.gcs_uri,
          signedUri: genCharacter.image.signed_uri,
          gcsFusePath: genCharacter.image.gcs_fuse_path,
          mimeType: genCharacter.image.mime_type,
        };
      }
      const character: Character = {
        id: genCharacter.id,
        name: genCharacter.name,
        description: genCharacter.description,
        image: image,
      };
      return character;
    },
  );

  return characters;
}
