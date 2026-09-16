from fastapi.testclient import TestClient


def test_create_trip_defaults_to_planning(client: TestClient, account: dict):
    response = client.post(
        "/api/v1/trips",
        headers=account["headers"],
        json={"name": "Summer in Doha", "destination": "Doha"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "planning"
    assert body["name"] == "Summer in Doha"


def test_list_trips_returns_created_trips(client: TestClient, account: dict):
    headers = account["headers"]
    client.post("/api/v1/trips", headers=headers, json={"name": "City break", "destination": "Dubai"})
    client.post("/api/v1/trips", headers=headers, json={"name": "Beach trip", "destination": "London"})
    listed = client.get("/api/v1/trips", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 2


def test_trip_validation_rejects_short_name(client: TestClient, account: dict):
    response = client.post(
        "/api/v1/trips", headers=account["headers"], json={"name": "A", "destination": "Dubai"}
    )
    assert response.status_code == 422


def test_trips_require_authentication(client: TestClient):
    assert client.get("/api/v1/trips").status_code == 401
