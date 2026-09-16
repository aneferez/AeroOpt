from uuid import uuid4

from fastapi.testclient import TestClient


def _credentials() -> dict:
    return {
        "email": f"auth-{uuid4().hex[:12]}@example.com",
        "password": "a-long-test-password",
        "display_name": "Auth Tester",
    }


def test_register_returns_token_and_user(client: TestClient):
    creds = _credentials()
    response = client.post("/api/v1/auth/register", json=creds)
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == creds["email"].lower()
    assert body["user"]["display_name"] == "Auth Tester"


def test_register_rejects_duplicate_email(client: TestClient):
    creds = _credentials()
    assert client.post("/api/v1/auth/register", json=creds).status_code == 201
    duplicate = client.post("/api/v1/auth/register", json=creds)
    assert duplicate.status_code == 409


def test_register_validates_short_password(client: TestClient):
    creds = _credentials() | {"password": "short"}
    assert client.post("/api/v1/auth/register", json=creds).status_code == 422


def test_login_succeeds_with_valid_credentials(client: TestClient):
    creds = _credentials()
    client.post("/api/v1/auth/register", json=creds)
    response = client.post(
        "/api/v1/auth/login", json={"email": creds["email"], "password": creds["password"]}
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_rejects_wrong_password(client: TestClient):
    creds = _credentials()
    client.post("/api/v1/auth/register", json=creds)
    response = client.post(
        "/api/v1/auth/login", json={"email": creds["email"], "password": "wrong-password-here"}
    )
    assert response.status_code == 401


def test_me_returns_the_authenticated_user(client: TestClient, account: dict):
    response = client.get("/api/v1/auth/me", headers=account["headers"])
    assert response.status_code == 200
    assert response.json()["email"] == account["email"]


def test_me_requires_authentication(client: TestClient):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_invalid_bearer_token_is_rejected(client: TestClient):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_refresh_cookie_flow_and_logout(client: TestClient):
    creds = _credentials()
    registered = client.post("/api/v1/auth/register", json=creds)
    assert "aeroopt_refresh" in registered.cookies

    refreshed = client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]

    # Capture the (rotated) refresh token, then log out.
    revoked_token = client.cookies.get("aeroopt_refresh")
    assert client.post("/api/v1/auth/logout").status_code == 204

    # Replaying the revoked token must fail even though it is still well-formed.
    client.cookies.set("aeroopt_refresh", revoked_token)
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_refresh_without_cookie_is_unauthorized(client: TestClient):
    client.cookies.clear()
    assert client.post("/api/v1/auth/refresh").status_code == 401
