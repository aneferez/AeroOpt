"""Shared test configuration.

Every test runs against an isolated temporary SQLite database and the
deterministic demo flight provider, so the suite never touches a real
database, provider credentials, Redis, or SMTP.
"""

import os
import tempfile
from collections.abc import Iterator
from uuid import uuid4

# The application binds its engine and settings at import time, so the
# environment must be configured before anything from `app` is imported.
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.close(_db_fd)
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path.replace(os.sep, '/')}"
os.environ["JWT_SECRET"] = "test-secret-key-that-is-definitely-long-enough"
os.environ["ALLOW_DEMO_PROVIDER"] = "true"
os.environ["FLIGHT_PROVIDER"] = "demo"
os.environ["REDIS_URL"] = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["RATE_LIMIT_PER_MINUTE"] = "100000"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services.cache import search_cache  # noqa: E402


@pytest.fixture(autouse=True)
def _clear_search_cache() -> Iterator[None]:
    """Keep the in-memory search cache from leaking between tests."""
    search_cache.memory.clear()
    yield
    search_cache.memory.clear()


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def register_user(client: TestClient, *, password: str = "a-long-test-password") -> dict:
    """Register a fresh user and return its email, token, and auth headers."""
    email = f"user-{uuid4().hex[:12]}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": "Test Traveler"},
    )
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    return {"email": email, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def account(client: TestClient) -> dict:
    return register_user(client)


@pytest.fixture
def register():
    """Expose the registration helper so tests can create extra accounts."""
    return register_user


def _teardown() -> None:
    try:
        os.remove(_db_path)
    except OSError:
        pass


import atexit  # noqa: E402

atexit.register(_teardown)
