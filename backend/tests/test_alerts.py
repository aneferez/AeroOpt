from fastapi.testclient import TestClient


def _payload(email: str, **overrides) -> dict:
    return {
        "origin": "MAA",
        "destination": "DXB",
        "departure_date": "2026-12-01",
        "target_price": 18000,
        "notification_email": email,
        **overrides,
    }


def test_create_and_list_alert(client: TestClient, account: dict):
    headers = account["headers"]
    created = client.post("/api/v1/alerts", headers=headers, json=_payload(account["email"]))
    assert created.status_code == 201
    body = created.json()
    assert body["is_active"] is True
    assert body["origin"] == "MAA"

    listed = client.get("/api/v1/alerts", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_alert_uppercases_codes(client: TestClient, account: dict):
    created = client.post(
        "/api/v1/alerts",
        headers=account["headers"],
        json=_payload(account["email"], origin="maa", destination="dxb"),
    )
    assert created.json()["destination"] == "DXB"


def test_alert_rejects_non_positive_target(client: TestClient, account: dict):
    response = client.post(
        "/api/v1/alerts", headers=account["headers"], json=_payload(account["email"], target_price=0)
    )
    assert response.status_code == 422


def test_disable_alert(client: TestClient, account: dict):
    headers = account["headers"]
    alert_id = client.post("/api/v1/alerts", headers=headers, json=_payload(account["email"])).json()["id"]
    assert client.delete(f"/api/v1/alerts/{alert_id}", headers=headers).status_code == 204
    remaining = client.get("/api/v1/alerts", headers=headers).json()
    assert remaining[0]["is_active"] is False


def test_disable_missing_alert_returns_404(client: TestClient, account: dict):
    assert client.delete("/api/v1/alerts/nope", headers=account["headers"]).status_code == 404


def test_alerts_require_authentication(client: TestClient):
    assert client.get("/api/v1/alerts").status_code == 401
