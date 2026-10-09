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

"""Bulk Video Creator backend: FastAPI app with the bulk endpoints.

Run locally from the `bulk-video-creator/backend/` folder:

    python -m bulk_app.main

In the container: uvicorn bulk_app.main:app (see Dockerfile).
"""

from collections.abc import Awaitable, Callable
import logging
import os

import dotenv

# The core reads its configuration when imported: load .env first.
dotenv.load_dotenv()

# pylint: disable=wrong-import-position
import fastapi
from fastapi.middleware import cors
import uvicorn

from bulk_app import routes
# pylint: enable=wrong-import-position

# The core attaches a Cloud Logging handler to the root logger when imported,
# which turns logging.basicConfig into a no-op. Add a console handler
# explicitly so progress is visible locally (and in Cloud Run stdout).
_console_handler = logging.StreamHandler()
_console_handler.setFormatter(
    logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
)
logging.getLogger().addHandler(_console_handler)
logging.getLogger().setLevel(logging.INFO)

API_PREFIX = "/api"

app = fastapi.FastAPI(title="Bulk Video Creator")


@app.middleware("http")
async def add_security_headers(
    request: fastapi.Request,
    call_next: Callable[[fastapi.Request], Awaitable[fastapi.Response]],
) -> fastapi.Response:
  """Adds basic security headers to every response.

  Args:
      request: The incoming request.
      call_next: The next handler in the middleware chain.

  Returns:
      The response of the next handler, with the extra headers.
  """
  response = await call_next(request)
  response.headers["X-Content-Type-Options"] = "nosniff"
  response.headers["X-Frame-Options"] = "DENY"
  response.headers["Cache-Control"] = "no-store"
  return response


# CORS: explicit allow-list from BULK_CORS_ORIGINS (comma separated). No
# wildcard; when unset, cross-origin browser calls are not allowed.
_cors_origins = [
    origin.strip()
    for origin in os.getenv("BULK_CORS_ORIGINS", "").split(",")
    if origin.strip() and origin.strip() != "*"
]
if _cors_origins:
  app.add_middleware(
      cors.CORSMiddleware,
      allow_origins=_cors_origins,
      allow_methods=["GET", "POST"],
      allow_headers=["Content-Type", "Authorization"],
  )

app.include_router(routes.bulk_router, prefix=API_PREFIX)


def main() -> None:
  """Runs the app locally with uvicorn, listening only on localhost."""
  uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("BULK_PORT", "8000")))


if __name__ == "__main__":
  main()
