from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def test_health_and_demo_flight_search():
    with TestClient(app) as client:
        health = client.get("/api/v1/health")
        assert health.status_code == 200
        result = client.post(
            "/api/v1/flights/search",
            json={
                "origin": "MAA",
                "destination": "DXB",
                "departure_date": "2026-10-16",
                "adults": 1,
                "cabin": "economy",
                "max_stops": 1,
                "currency": "INR",
                "profile": "balanced",
                "checked_bag_required": False,
                "value_of_time": 500,
            },
        )
    assert result.status_code == 200
    payload = result.json()
    assert payload["meta"]["provider_mode"] == "demo"
    assert payload["offers"]
    assert payload["recommendations"]["smart_pick_id"]


def test_authentication_and_preferences_are_protected():
    email = f"test-{uuid4().hex[:12]}@example.com"
    with TestClient(app) as client:
        register = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "a-long-test-password",
                "display_name": "Test Traveler",
            },
        )
        assert register.status_code == 201
        token = register.json()["access_token"]
        assert client.get("/api/v1/users/preferences").status_code == 401
        preferences = client.get(
            "/api/v1/users/preferences", headers={"Authorization": f"Bearer {token}"}
        )
        assert preferences.status_code == 200
        updated = client.put(
            "/api/v1/users/preferences",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "profile": "comfort",
                "max_stops": 1,
                "checked_bag_required": True,
                "value_of_time": 700,
                "preferred_airports": ["MAA"],
            },
        )
    assert updated.status_code == 200
    assert updated.json()["profile"] == "comfort"
