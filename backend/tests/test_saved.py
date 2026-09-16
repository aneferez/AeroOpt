from fastapi.testclient import TestClient


def _payload(offer_id: str = "demo-offer-1", **overrides) -> dict:
    return {
        "provider": "demo",
        "provider_offer_id": offer_id,
        "offer_snapshot": {"airline_name": "Emirates", "total_price": 21000},
        "score_snapshot": {"overall_score": 87},
        **overrides,
    }


def test_save_and_list_flight(client: TestClient, account: dict):
    headers = account["headers"]
    created = client.post("/api/v1/saved-flights", headers=headers, json=_payload(label="Best value"))
    assert created.status_code == 201
    assert created.json()["label"] == "Best value"

    listed = client.get("/api/v1/saved-flights", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_saving_the_same_offer_upserts(client: TestClient, account: dict):
    headers = account["headers"]
    client.post("/api/v1/saved-flights", headers=headers, json=_payload(label="First"))
    client.post("/api/v1/saved-flights", headers=headers, json=_payload(label="Updated"))
    listed = client.get("/api/v1/saved-flights", headers=headers).json()
    assert len(listed) == 1
    assert listed[0]["label"] == "Updated"


def test_delete_saved_flight(client: TestClient, account: dict):
    headers = account["headers"]
    saved_id = client.post("/api/v1/saved-flights", headers=headers, json=_payload()).json()["id"]
    assert client.delete(f"/api/v1/saved-flights/{saved_id}", headers=headers).status_code == 204
    assert client.get("/api/v1/saved-flights", headers=headers).json() == []


def test_delete_missing_saved_flight_returns_404(client: TestClient, account: dict):
    response = client.delete("/api/v1/saved-flights/does-not-exist", headers=account["headers"])
    assert response.status_code == 404


def test_saved_flights_require_authentication(client: TestClient):
    assert client.get("/api/v1/saved-flights").status_code == 401


def test_saved_flights_are_isolated_per_user(client: TestClient, account: dict, register):
    client.post("/api/v1/saved-flights", headers=account["headers"], json=_payload())
    other = register(client)
    assert client.get("/api/v1/saved-flights", headers=other["headers"]).json() == []
