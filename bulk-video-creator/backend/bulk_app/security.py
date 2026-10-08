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

"""Input validation for Bulk Video Creator.

Covers the two kinds of untrusted input the bulk receives:
  * The Google Sheets URL sent by the API client.
  * The image URLs written by users inside the sheet, which the server
    downloads (Server-Side Request Forgery risk).

This module does not import the backend core.
"""

import ipaddress
import logging
import os
import re
import socket
from urllib import parse

import requests

logger = logging.getLogger(__name__)

MAX_URL_LENGTH = 2048
SHEETS_HOST = "docs.google.com"
SHEET_PATH_REGEX = re.compile(
    r"^/spreadsheets/d/([A-Za-z0-9_-]{10,100})(/.*)?$"
)

DEFAULT_MAX_IMAGE_BYTES = 20 * 1024 * 1024
MAX_REDIRECTS = 3
DOWNLOAD_TIMEOUT_SECS = 30

# Magic bytes of the image formats accepted as Veo seed images.
_IMAGE_SIGNATURES = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
)


class UnsafeUrlError(ValueError):
  """Raised when a URL is malformed or points to a forbidden destination."""


def validate_sheet_url(sheet_url: str) -> str:
  """Validates a Google Sheets URL and returns its spreadsheet id.

  Only https://docs.google.com/spreadsheets/d/{id}... is accepted. The host
  is compared exactly (not as a substring), so hosts like
  'docs.google.com.attacker.example' are rejected.

  Args:
      sheet_url: The URL sent by the API client.

  Returns:
      The spreadsheet id.

  Raises:
      UnsafeUrlError: If the URL is not a valid Google Sheets URL.
  """
  if not isinstance(sheet_url, str) or not sheet_url.strip():
    raise UnsafeUrlError("Sheet URL must be a non-empty string")
  sheet_url = sheet_url.strip()
  if len(sheet_url) > MAX_URL_LENGTH:
    raise UnsafeUrlError("Sheet URL is too long")

  parsed = parse.urlparse(sheet_url)
  if parsed.scheme != "https":
    raise UnsafeUrlError("Sheet URL must use https")
  if parsed.username or parsed.password or parsed.port:
    raise UnsafeUrlError("Sheet URL must not contain credentials or a port")
  if (parsed.hostname or "").lower() != SHEETS_HOST:
    raise UnsafeUrlError(f"Sheet URL host must be {SHEETS_HOST}")

  match = SHEET_PATH_REGEX.match(parsed.path)
  if not match:
    raise UnsafeUrlError("Sheet URL must look like /spreadsheets/d/{id}")
  return match.group(1)


def get_max_image_bytes() -> int:
  """Max size of a downloaded seed image (env BULK_MAX_IMAGE_BYTES)."""
  try:
    value = int(os.getenv("BULK_MAX_IMAGE_BYTES", str(DEFAULT_MAX_IMAGE_BYTES)))
  except ValueError:
    return DEFAULT_MAX_IMAGE_BYTES
  return value if value > 0 else DEFAULT_MAX_IMAGE_BYTES


def _is_forbidden_ip(ip_text: str) -> bool:
  """True for loopback, private, link-local (metadata server), etc."""
  ip = ipaddress.ip_address(ip_text.split("%", 1)[0])
  if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
    ip = ip.ipv4_mapped
  return not ip.is_global or ip.is_multicast


def validate_public_https_url(url: str) -> str:
  """Validates that a URL is https and resolves only to public IPs.

  Blocks requests to localhost, private networks and the GCE metadata
  server (169.254.169.254 / metadata.google.internal).

  Args:
      url: The URL to validate.

  Returns:
      The hostname of the URL.

  Raises:
      UnsafeUrlError: If the URL is malformed or not public.
  """
  if not isinstance(url, str) or not url.strip():
    raise UnsafeUrlError("URL must be a non-empty string")
  if len(url) > MAX_URL_LENGTH:
    raise UnsafeUrlError("URL is too long")

  parsed = parse.urlparse(url.strip())
  if parsed.scheme != "https":
    raise UnsafeUrlError("Only https image URLs are allowed")
  if parsed.username or parsed.password:
    raise UnsafeUrlError("URL must not contain credentials")
  hostname = (parsed.hostname or "").lower()
  if not hostname:
    raise UnsafeUrlError("URL has no host")
  if parsed.port not in (None, 443):
    raise UnsafeUrlError("Only the default https port is allowed")

  try:
    addresses = socket.getaddrinfo(hostname, 443, proto=socket.IPPROTO_TCP)
  except socket.gaierror as ex:
    raise UnsafeUrlError("URL host could not be resolved") from ex
  if not addresses:
    raise UnsafeUrlError("URL host could not be resolved")
  for address in addresses:
    if _is_forbidden_ip(address[4][0]):
      raise UnsafeUrlError("URL resolves to a non-public address")
  return hostname


def detect_image_mime_type(data: bytes) -> str | None:
  """Returns the MIME type based on magic bytes, or None if not an image."""
  for signature, mime_type in _IMAGE_SIGNATURES:
    if data.startswith(signature):
      return mime_type
  if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
    return "image/webp"
  return None


def download_image(url: str) -> tuple[bytes, str, str]:
  """Downloads an image from a public https URL with SSRF protections.

  * https only, public IPs only (re-checked on every redirect hop).
  * Redirects are followed manually, at most MAX_REDIRECTS.
  * The body is streamed and capped at BULK_MAX_IMAGE_BYTES.
  * The content must be a JPEG, PNG, GIF or WEBP by magic bytes.

  Args:
      url: The image URL written in the sheet (untrusted).

  Returns:
      A tuple (image bytes, detected MIME type, final URL path).

  Raises:
      UnsafeUrlError: If the URL or any redirect target is not allowed.
      ValueError: If the content is too large or not a supported image.
      requests.RequestException: On network errors.
  """
  # TODO(ezkap): DNS rebinding between validation and connection is
  # still possible. For stronger isolation, run the service with a VPC egress
  # firewall that blocks private ranges, or pin the resolved IP.
  max_bytes = get_max_image_bytes()
  current_url = url.strip()

  for _ in range(MAX_REDIRECTS + 1):
    validate_public_https_url(current_url)
    with requests.get(
        current_url,
        timeout=DOWNLOAD_TIMEOUT_SECS,
        allow_redirects=False,
        stream=True,
    ) as response:
      if response.is_redirect or response.is_permanent_redirect:
        location = response.headers.get("Location", "")
        if not location:
          raise UnsafeUrlError("Redirect without Location header")
        current_url = parse.urljoin(current_url, location)
        continue

      response.raise_for_status()
      declared = response.headers.get("Content-Length")
      if declared and declared.isdigit() and int(declared) > max_bytes:
        raise ValueError("Image exceeds the maximum allowed size")

      chunks = []
      total = 0
      for chunk in response.iter_content(chunk_size=64 * 1024):
        total += len(chunk)
        if total > max_bytes:
          raise ValueError("Image exceeds the maximum allowed size")
        chunks.append(chunk)
      data = b"".join(chunks)

    mime_type = detect_image_mime_type(data)
    if not mime_type:
      raise ValueError("Downloaded content is not a supported image type")
    return data, mime_type, parse.urlparse(current_url).path

  raise UnsafeUrlError("Too many redirects")
