from fastapi.testclient import TestClient

from app.core.config import Settings
from app.providers import provider_status


def test_status_endpoint_reports_demo_in_tests(client: TestClient):
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["environment"] == "test"
    assert body["mode"] == "demo"
    assert body["live_configured"] is False


def test_provider_status_live_when_amadeus_configured():
    status = provider_status(
        Settings(amadeus_client_id="id", amadeus_client_secret="secret", flight_provider="auto")
    )
    assert status["provider"] == "amadeus"
    assert status["mode"] == "live"
    assert status["live_configured"] is True
    assert status["ready"] is True


def test_provider_status_flags_amadeus_without_credentials():
    status = provider_status(
        Settings(amadeus_client_id=None, amadeus_client_secret=None, flight_provider="amadeus")
    )
    assert status["provider"] == "amadeus"
    assert status["live_configured"] is False
    assert status["ready"] is False


def test_provider_status_falls_back_to_demo_outside_production():
    status = provider_status(
        Settings(flight_provider="auto", allow_demo_provider=True, environment="development")
    )
    assert status["mode"] == "demo"
    assert status["ready"] is True


def test_provider_status_none_when_production_without_live_provider():
    status = provider_status(
        Settings(flight_provider="auto", allow_demo_provider=False, environment="production")
    )
    assert status["provider"] == "none"
    assert status["ready"] is False
