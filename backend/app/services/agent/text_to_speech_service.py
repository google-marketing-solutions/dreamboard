from typing import Optional

from google.cloud import texttospeech


class TextToSpeechService:

  def __init__(self):
    try:
      # Initialize the Text-to-Speech client
      self.client = texttospeech.TextToSpeechClient()
      print("TextToSpeechService initialized successfully")
    except Exception as e:
      print(f"Error initializing TextToSpeechService: {str(e)}")
      raise

  async def text_to_speech(self, text: str) -> Optional[bytes]:
    """
    Convert text to speech using Google Cloud Text-to-Speech.

    Args:
        text: The text to convert to speech

    Returns:
        The audio content in bytes or None if conversion fails
    """
    try:
      print(f"Attempting to convert text to speech: {text[:100]}...")

      # Set the text input to be synthesized
      synthesis_input = texttospeech.SynthesisInput(text=text)

      # Build the voice request
      voice = texttospeech.VoiceSelectionParams(
          language_code="en-US",
          name="en-US-Chirp3-HD-Zephyr",  # Using a neural voice for better quality
      )

      # Select the type of audio file
      audio_config = texttospeech.AudioConfig(
          audio_encoding=texttospeech.AudioEncoding.MP3,
          speaking_rate=1.0,
          pitch=0.0,
      )

      print("Sending request to Google Cloud Text-to-Speech API...")
      # Perform the text-to-speech request
      response = self.client.synthesize_speech(
          input=synthesis_input, voice=voice, audio_config=audio_config
      )

      print(
          "Received response from API, audio content length:"
          f" {len(response.audio_content)} bytes"
      )
      return response.audio_content

    except Exception as e:
      print(f"Error converting text to speech: {str(e)}")
      return None
