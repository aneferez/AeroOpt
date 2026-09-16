from fastapi.testclient import TestClient


def test_default_preferences_are_created_on_register(client: TestClient, account: dict):
    response = client.get("/api/v1/users/preferences", headers=account["headers"])
    assert response.status_code == 200
    body = response.json()
    assert body["profile"] == "balanced"
    assert body["preferred_airports"] == []


def test_preferences_require_authentication(client: TestClient):
    assert client.get("/api/v1/users/preferences").status_code == 401


def test_update_preferences_persists_changes(client: TestClient, account: dict):
    response = client.put(
        "/api/v1/users/preferences",
        headers=account["headers"],
        json={
            "profile": "comfort",
            "max_stops": 1,
            "checked_bag_required": True,
            "value_of_time": 750,
            "preferred_airports": ["maa", "dxb"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["profile"] == "comfort"
    assert body["checked_bag_required"] is True
    assert body["preferred_airports"] == ["MAA", "DXB"]
    # A subsequent read reflects the persisted values.
    reread = client.get("/api/v1/users/preferences", headers=account["headers"])
    assert reread.json()["value_of_time"] == 750


def test_update_preferences_rejects_unknown_weight(client: TestClient, account: dict):
    response = client.put(
        "/api/v1/users/preferences",
        headers=account["headers"],
        json={"profile": "custom", "weights": {"unknown_dimension": 1.0}},
    )
    assert response.status_code == 422


def test_dashboard_counts_reflect_user_activity(client: TestClient, account: dict):
    headers = account["headers"]
    empty = client.get("/api/v1/users/dashboard", headers=headers).json()
    assert empty == {
        "saved_flights": 0,
        "active_alerts": 0,
        "upcoming_trips": 0,
        "recent_searches": 0,
    }

    client.post(
        "/api/v1/saved-flights",
        headers=headers,
        json={
            "provider": "demo",
            "provider_offer_id": "demo-1",
            "offer_snapshot": {"airline_name": "Emirates"},
            "score_snapshot": {"overall_score": 88},
        },
    )
    client.post(
        "/api/v1/alerts",
        headers=headers,
        json={
            "origin": "MAA",
            "destination": "DXB",
            "departure_date": "2026-12-01",
            "target_price": 18000,
            "notification_email": account["email"],
        },
    )
    client.post(
        "/api/v1/trips",
        headers=headers,
        json={"name": "Winter break", "destination": "Dubai"},
    )

    dashboard = client.get("/api/v1/users/dashboard", headers=headers).json()
    assert dashboard["saved_flights"] == 1
    assert dashboard["active_alerts"] == 1
    assert dashboard["upcoming_trips"] == 1
