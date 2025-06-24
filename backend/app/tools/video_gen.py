from google.adk.tools import ToolContext
from google.genai import types

from services.agent.video_service import VideoService


async def generate_video(prompt: str, tool_context: "ToolContext") -> dict:
  """Generates images based on a prompt

  Args:
      prompt: The prompt to generate videos from

  Returns:
      A dictionary containing the generated image and status.
  """
  video_service = VideoService()
  video_response = video_service.generate_videos(prompt=prompt)
  if video_response:
    video_bytes = video_response[0].video.video_bytes
    await tool_context.save_artifact(
        "video.mp4",
        types.Part.from_bytes(data=video_bytes, mime_type="video/mp4"),
    )
    return {
        "status": "success",
        "detail": "Video generated successfully and stored in artifacts.",
        "filename": "video.mp4",
    }
  else:
    return {"image": None, "status": "failure"}
