import os
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine

sqlite_file_name = os.getenv("DB_PATH")
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})


def get_session():
  with Session(engine) as session:
    yield session
    session.close()


def initialize_clean_db():
  SQLModel.metadata.drop_all(engine)
  SQLModel.metadata.create_all(engine)


SessionDep = Annotated[Session, Depends(get_session)]
