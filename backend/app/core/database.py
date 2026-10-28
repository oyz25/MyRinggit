from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings
from sqlalchemy.pool import NullPool

engine = create_engine(settings.database_url, poolclass=NullPool)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

