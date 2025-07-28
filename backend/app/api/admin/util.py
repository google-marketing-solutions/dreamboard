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

from fastapi import Depends, HTTPException

from models.agent.user_model import User
from api.endpoints.login_router import get_current_active_user


async def verify_admin(current_user: User = Depends(get_current_active_user)):
  if not current_user.admin:
    raise HTTPException(
        status_code=403, detail="Not enough permissions. Admin access required."
    )
  return current_user
