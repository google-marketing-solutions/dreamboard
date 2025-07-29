# Copyright 2025 Google Inc
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from typing import Optional

from google.cloud import speech


class SpeechToTextService:

  def __init__(self):
    # Initialize the Speech-to-Text client
    self.client = speech.SpeechClient()

  async def transcribe_audio(self, audio_content: bytes) -> Optional[str]:
    """
    Transcribe audio content using Google Cloud Speech-to-Text.

    Args:
        audio_content: The audio content in bytes

    Returns:
        The transcribed text or None if transcription fails
    """
    try:
      # Configure the audio and recognition settings
      audio = speech.RecognitionAudio(content=audio_content)
      config = speech.RecognitionConfig(
          encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
          sample_rate_hertz=48000,  # WebM Opus typically uses 48kHz
          language_code="en-US",
          enable_automatic_punctuation=True,
      )

      # Perform the transcription
      response = self.client.recognize(config=config, audio=audio)

      # Combine all transcribed text
      transcript = " ".join(
          [result.alternatives[0].transcript for result in response.results]
      )
      return transcript

    except Exception as e:
      print(f"Error transcribing audio: {str(e)}")
      return None
