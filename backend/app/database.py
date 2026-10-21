"""Database setup for Aventra."""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize the database by creating all tables and ensuring schema compatibility."""
    from app.models import event, budget, task, vendor, plan  # noqa: F401
    from sqlalchemy import text
    Base.metadata.create_all(bind=engine)

    # Safe migration: ensure planning_mode exists in events table for existing SQLite databases
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(events)"))
            columns = [row[1] for row in result.fetchall()]
            if columns and "planning_mode" not in columns:
                conn.execute(text("ALTER TABLE events ADD COLUMN planning_mode VARCHAR DEFAULT 'ai'"))
                conn.commit()
    except Exception:
        pass
