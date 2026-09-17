from app.core.config import Settings


def _settings(**overrides: object) -> Settings:
    return Settings(_env_file=None, **overrides)


def test_bare_postgresql_url_gets_psycopg_driver():
    settings = _settings(database_url="postgresql://user:pass@host:5432/db")
    assert settings.database_url == "postgresql+psycopg://user:pass@host:5432/db"


def test_heroku_style_postgres_url_gets_psycopg_driver():
    settings = _settings(database_url="postgres://user:pass@host/db")
    assert settings.database_url == "postgresql+psycopg://user:pass@host/db"


def test_explicit_driver_is_left_untouched():
    url = "postgresql+psycopg://user:pass@host/db"
    assert _settings(database_url=url).database_url == url


def test_sqlite_url_is_left_untouched():
    url = "sqlite:///./aeroopt.db"
    assert _settings(database_url=url).database_url == url
