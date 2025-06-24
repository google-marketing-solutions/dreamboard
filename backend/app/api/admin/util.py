from fastapi import Depends, HTTPException

from models.agent.user_model import User
from api.endpoints.login_router import get_current_active_user


async def verify_admin(current_user: User = Depends(get_current_active_user)):
  if not current_user.admin:
    raise HTTPException(
        status_code=403, detail="Not enough permissions. Admin access required."
    )
  return current_user
