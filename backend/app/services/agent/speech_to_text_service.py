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
