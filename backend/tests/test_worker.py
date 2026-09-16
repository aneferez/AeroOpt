import asyncio

from fastapi.testclient import TestClient

from app.workers.price_alerts import check_price_alerts


def test_price_alert_worker_checks_and_triggers(client: TestClient, account: dict):
    # A very high target guarantees the demo fare is at or below it.
    client.post(
        "/api/v1/alerts",
        headers=account["headers"],
        json={
            "origin": "MAA",
            "destination": "DXB",
            "departure_date": "2026-12-20",
            "target_price": 999999,
            "notification_email": account["email"],
        },
    )

    result = asyncio.run(check_price_alerts())

    # SMTP is unconfigured, so no email is sent, but the run still succeeds.
    assert result["failed"] == 0
    assert result["checked"] >= 1
    assert result["triggered"] >= 1

    # The alert now records the observed fare.
    listed = client.get("/api/v1/alerts", headers=account["headers"]).json()
    assert listed[0]["last_price"] is not None


def test_price_alert_worker_deactivates_past_alerts(client: TestClient, account: dict):
    alert_id = client.post(
        "/api/v1/alerts",
        headers=account["headers"],
        json={
            "origin": "BOM",
            "destination": "DXB",
            "departure_date": "2020-01-01",
            "target_price": 12000,
            "notification_email": account["email"],
        },
    ).json()["id"]

    asyncio.run(check_price_alerts())

    listed = client.get("/api/v1/alerts", headers=account["headers"]).json()
    past = next(alert for alert in listed if alert["id"] == alert_id)
    assert past["is_active"] is False
