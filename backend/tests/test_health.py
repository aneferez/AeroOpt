from fastapi.testclient import TestClient


def test_health_reports_database_reachable(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "reachable"}
