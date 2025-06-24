import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlmodel import Session, select

from dependencies.database import SessionDep
from models.agent.user_model import User, UserInDB

# TODO: move to .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


router = APIRouter(
    prefix="/user",
    responses={404: {"description": "Not found"}},
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/user/token")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
  return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
  return pwd_context.hash(password)


class Token(BaseModel):
  access_token: str
  token_type: str


class TokenData(BaseModel):
  username: str | None = None


def get_user(session: Session, username: str) -> User | None:
  user = session.exec(
      select(UserInDB).where(UserInDB.username == username)
  ).first()
  if user:
    return user
  return None


def authenticate_user(session: Session, username: str, password: str) -> User:
  user = get_user(session, username)
  if not user:
    return False
  if not verify_password(password, user.hashed_password):
    return False
  return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
  to_encode = data.copy()
  if expires_delta:
    expire = datetime.now(timezone.utc) + expires_delta
  else:
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
  to_encode.update({"exp": expire})
  encoded_jwt = jwt.encode(
      to_encode, os.getenv("SECRET_KEY"), algorithm=ALGORITHM
  )
  return encoded_jwt


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: SessionDep,
) -> User:
  credentials_exception = HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Could not validate credentials",
      headers={"WWW-Authenticate": "Bearer"},
  )
  try:
    payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=[ALGORITHM])
    username = payload.get("sub")
    if username is None:
      raise credentials_exception
    token_data = TokenData(username=username)
  except InvalidTokenError:
    raise credentials_exception
  user = get_user(session, username=token_data.username)
  if user is None:
    raise credentials_exception
  return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
):
  if current_user.disabled:
    raise HTTPException(status_code=400, detail="Inactive user")
  return current_user


@router.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
) -> Token:
  user = authenticate_user(session, form_data.username, form_data.password)
  if not user:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )
  access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
  access_token = create_access_token(
      data={"sub": user.username}, expires_delta=access_token_expires
  )
  return Token(access_token=access_token, token_type="bearer")


# Note: could use response_model=User, but since UserInDB inherits from User,
# we can use return type User to get proper type hinting, etc.
@router.get("/me")
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
  return current_user
