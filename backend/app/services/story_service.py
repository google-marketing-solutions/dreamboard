# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Service that loads, saves, and deletes stories from Firestore."""

import os
from google.cloud import firestore
from typing import Dict, List, Optional

class StoryService:
    def __init__(self):
        self.db = firestore.Client(project=os.getenv("GCP_PROJECT"))

    def save_story(self, user_id: str, story: Dict) -> None:
        """
        Saves a story under the given user using its provided 'id'.
        If the story already exists, it will be overwritten.
        """
        story_id = story.get("id")
        doc_ref = self.db.collection("users").document(user_id).collection("stories").document(story_id)
        doc_ref.set(story)

    def get_story(self, user_id: str, story_id: str) -> Optional[Dict]:
        doc_ref = self.db.collection("users").document(user_id).collection("stories").document(story_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        return data

    def list_stories(self, user_id: str) -> List[Dict]:
        stories_ref = self.db.collection("users").document(user_id).collection("stories")
        docs = stories_ref.stream()
        return [{**doc.to_dict(), "id": doc.id} for doc in docs]

    def delete_story(self, user_id: str, story_id: str) -> None:
        doc_ref = self.db.collection("users").document(user_id).collection("stories").document(story_id)
        doc_ref.delete()