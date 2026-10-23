from sqlalchemy import create_engine

from app.database import normalize_database_url

from app.config import Settings

def test_sqlite_database_url_is_preserved():
    database_url = "sqlite:///./aventra.db"
    assert normalize_database_url(database_url) == database_url


def test_postgres_database_urls_use_psycopg_and_preserve_parameters():
    assert normalize_database_url(
        "postgresql://host/db?sslmode=require"
    ) == "postgresql+psycopg://host/db?sslmode=require"
    assert normalize_database_url(
        "postgres://host/db"
    ) == "postgresql+psycopg://host/db"

    engine = create_engine(normalize_database_url("postgresql://host/db"))
    try:
        assert engine.dialect.name == "postgresql"
    finally:
        engine.dispose()


def test_cors_origins_accept_comma_separated_deployment_domains():
    settings = Settings(
        _env_file=None,
        cors_origins="https://frontend.test, https://preview.test/",
    )
    assert settings.allowed_cors_origins == [
        "https://frontend.test",
        "https://preview.test",
    ]
