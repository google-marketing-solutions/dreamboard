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

"""Unit tests for pure modules (no core import, no cloud credentials)."""

import socket

import pytest

from bulk_app import models
from bulk_app import paths
from bulk_app import security

SHEET_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd"


@pytest.fixture(autouse=True)
def _bucket(monkeypatch):
  monkeypatch.setenv("GCS_BUCKET", "test-bucket")


# ---------- paths ----------


def test_bulk_paths():
  bulk_id = f"20260101120000_{SHEET_ID}"
  base = f"gs://test-bucket/bulk-video-creator/{bulk_id}/"
  assert paths.get_bulk_base_path(bulk_id) == base
  assert (
      paths.get_row_images_path(bulk_id, "row_3")
      == f"{base}row_3/images_seeds/"
  )
  assert (
      paths.get_row_video_output_path(bulk_id, "row_3")
      == f"{base}row_3/video_output/"
  )
  assert (
      paths.get_row_metadata_path(bulk_id, "row_3")
      == f"{base}row_3/metadata.json"
  )


def test_missing_bucket_fails_closed(monkeypatch):
  monkeypatch.delenv("GCS_BUCKET")
  with pytest.raises(RuntimeError):
    paths.get_bulk_base_path("x")


def test_custom_gcs_prefix(monkeypatch):
  monkeypatch.setenv("BULK_GCS_PREFIX", "/team-a/bulks/")
  assert paths.get_bulk_blob_prefix("b1") == "team-a/bulks/b1/"


@pytest.mark.parametrize("prefix", ["../x", "a/../b", "a//b", "a b", ""])
def test_invalid_gcs_prefix(monkeypatch, prefix):
  monkeypatch.setenv("BULK_GCS_PREFIX", prefix)
  with pytest.raises(RuntimeError):
    paths.get_bulk_blob_prefix("b1")


def test_blob_name_rejects_other_bucket():
  assert paths.blob_name_from_gcs_uri("gs://test-bucket/a/b.png") == "a/b.png"
  with pytest.raises(ValueError):
    paths.blob_name_from_gcs_uri("gs://other-bucket/a/b.png")


@pytest.mark.parametrize("row_id,index", [("row_1", 1), ("row_42", 42)])
def test_row_index(row_id, index):
  assert paths.get_row_index_from_row_id(row_id) == index


@pytest.mark.parametrize(
    "row_id", ["row_", "row_x", "../row_1", "row_1/..", ""]
)
def test_row_index_invalid(row_id):
  with pytest.raises(ValueError):
    paths.get_row_index_from_row_id(row_id)


def test_bulk_id_roundtrip():
  bulk_id = paths.generate_bulk_id(SHEET_ID)
  assert paths.get_spreadsheet_id_from_bulk_id(bulk_id) == SHEET_ID


@pytest.mark.parametrize(
    "bulk_id", ["abc", f"2026_{SHEET_ID}", f"20260101120000_../{SHEET_ID}", ""]
)
def test_bulk_id_invalid(bulk_id):
  with pytest.raises(ValueError):
    paths.get_spreadsheet_id_from_bulk_id(bulk_id)


def test_mime_types():
  assert paths.get_mime_type_from_filename("a.JPG") == "image/jpeg"
  assert paths.get_mime_type_from_filename("a.webp") == "image/webp"
  assert (
      paths.get_mime_type_from_filename("image_metadata.json")
      == "application/octet-stream"
  )
  assert not paths.is_image_filename("image_metadata.json")


@pytest.mark.parametrize(
    "url_path,mime,expected",
    [
        ("/imgs/photo.jpeg", "image/jpeg", "photo.jpg"),
        ("/imgs/photo", "image/png", "photo.png"),
        ("/a/../../etc/passwd", "image/png", "passwd.png"),
        ("/a\\..\\evil.exe", "image/webp", "evil.webp"),
        ("/", "image/gif", "image.gif"),
        ("/my photo (1).png", "image/png", "my_photo__1.png"),
    ],
)
def test_safe_image_filename(url_path, mime, expected):
  assert paths.safe_image_filename(url_path, mime) == expected


# ---------- sheet URL ----------


def test_valid_sheet_url():
  url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit?gid=1#gid=1"
  assert security.validate_sheet_url(url) == SHEET_ID
  assert models.BulkUploadSheetRequest(sheet_url=url).sheet_url == url


@pytest.mark.parametrize(
    "url",
    [
        f"http://docs.google.com/spreadsheets/d/{SHEET_ID}",
        f"https://docs.google.com.evil.example/spreadsheets/d/{SHEET_ID}",
        f"https://evil.example/docs.google.com/spreadsheets/d/{SHEET_ID}",
        f"https://user:pw@docs.google.com/spreadsheets/d/{SHEET_ID}",
        f"https://docs.google.com:8443/spreadsheets/d/{SHEET_ID}",
        "https://docs.google.com/document/d/abc",
        "javascript:alert(1)",
        "",
    ],
)
def test_invalid_sheet_url(url):
  with pytest.raises(ValueError):
    security.validate_sheet_url(url)
  with pytest.raises(ValueError):
    models.BulkUploadSheetRequest(sheet_url=url)


# ---------- image URL (SSRF) ----------


def _fake_resolver(ip):
  def resolver(host, port, proto=0):  # pylint: disable=unused-argument
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port))]

  return resolver


@pytest.mark.parametrize(
    "ip",
    [
        "127.0.0.1",
        "10.0.0.5",
        "192.168.1.1",
        "169.254.169.254",
        "0.0.0.0",
        "::1",
    ],
)
def test_image_url_private_ip_blocked(monkeypatch, ip):
  monkeypatch.setattr(socket, "getaddrinfo", _fake_resolver(ip))
  with pytest.raises(security.UnsafeUrlError):
    security.validate_public_https_url("https://example.com/a.png")


def test_image_url_public_ip_allowed(monkeypatch):
  monkeypatch.setattr(socket, "getaddrinfo", _fake_resolver("142.250.0.1"))
  assert (
      security.validate_public_https_url("https://example.com/a.png")
      == "example.com"
  )


@pytest.mark.parametrize(
    "url",
    [
        "http://example.com/a.png",
        "file:///etc/passwd",
        "gs://bucket/a.png",
        "https://user:pw@example.com/a.png",
        "https://example.com:8080/a.png",
    ],
)
def test_image_url_bad_scheme_or_shape(url):
  with pytest.raises(security.UnsafeUrlError):
    security.validate_public_https_url(url)


def test_detect_image_mime_type():
  assert (
      security.detect_image_mime_type(b"\xff\xd8\xff\xe0rest") == "image/jpeg"
  )
  assert (
      security.detect_image_mime_type(b"\x89PNG\r\n\x1a\nrest") == "image/png"
  )
  assert (
      security.detect_image_mime_type(b"RIFF\x00\x00\x00\x00WEBPVP8")
      == "image/webp"
  )
  assert security.detect_image_mime_type(b"<html>") is None


class _FakeResponse:
  """Minimal stand-in for a streamed requests.Response."""

  def __init__(self, status=200, headers=None, body=b""):
    self.status_code = status
    self.headers = headers or {}
    self._body = body
    self.is_redirect = status in (301, 302, 303, 307, 308)
    self.is_permanent_redirect = status in (301, 308)

  def __enter__(self):
    return self

  def __exit__(self, *args):
    return False

  def raise_for_status(self):
    if self.status_code >= 400:
      raise RuntimeError("http error")

  def iter_content(self, chunk_size):
    for i in range(0, len(self._body), chunk_size):
      yield self._body[i : i + chunk_size]


def test_download_blocks_redirect_to_metadata(monkeypatch):
  def resolver(host, port, proto=0):  # pylint: disable=unused-argument
    ip = (
        "169.254.169.254"
        if host == "metadata.google.internal"
        else "142.250.0.1"
    )
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port))]

  monkeypatch.setattr(socket, "getaddrinfo", resolver)
  monkeypatch.setattr(
      security.requests,
      "get",
      lambda *args, **kwargs: _FakeResponse(
          302,
          {"Location": "https://metadata.google.internal/computeMetadata/v1/"},
      ),
  )
  with pytest.raises(security.UnsafeUrlError):
    security.download_image("https://example.com/a.png")


def test_download_rejects_non_image_and_oversize(monkeypatch):
  monkeypatch.setattr(socket, "getaddrinfo", _fake_resolver("142.250.0.1"))
  monkeypatch.setattr(
      security.requests,
      "get",
      lambda *args, **kwargs: _FakeResponse(body=b"<html></html>"),
  )
  with pytest.raises(ValueError):
    security.download_image("https://example.com/a.png")

  monkeypatch.setenv("BULK_MAX_IMAGE_BYTES", "10")
  monkeypatch.setattr(
      security.requests,
      "get",
      lambda *args, **kwargs: _FakeResponse(
          body=b"\x89PNG\r\n\x1a\n" + b"0" * 100
      ),
  )
  with pytest.raises(ValueError):
    security.download_image("https://example.com/a.png")


def test_download_ok(monkeypatch):
  monkeypatch.setattr(socket, "getaddrinfo", _fake_resolver("142.250.0.1"))
  body = b"\xff\xd8\xff\xe0" + b"0" * 100
  monkeypatch.setattr(
      security.requests, "get", lambda *args, **kwargs: _FakeResponse(body=body)
  )
  data, mime, path = security.download_image(
      "https://example.com/x/photo.jpeg?s=1"
  )
  assert data == body and mime == "image/jpeg" and path == "/x/photo.jpeg"
