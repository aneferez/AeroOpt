from fastapi.testclient import TestClient


def test_interpret_extracts_route_and_constraints(client: TestClient):
    response = client.post(
        "/api/v1/assistant/interpret",
        json={"query": "Find me a cheap nonstop flight from Chennai to Dubai next month"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "rules"
    extraction = body["extraction"]
    assert extraction["origin"] == "MAA"
    assert extraction["destination"] == "DXB"
    assert extraction["priority"] == "price"
    assert extraction["max_stops"] == 0


def test_interpret_flags_missing_fields_when_route_absent(client: TestClient):
    response = client.post(
        "/api/v1/assistant/interpret",
        json={"query": "I want to go somewhere sunny and warm"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ready_to_search"] is False
    assert "origin" in body["extraction"]["missing_fields"]
    assert "destination" in body["extraction"]["missing_fields"]


def test_interpret_reads_business_cabin(client: TestClient):
    response = client.post(
        "/api/v1/assistant/interpret",
        json={"query": "business class from Delhi to London, max one stop"},
    )
    extraction = response.json()["extraction"]
    assert extraction["cabin"] == "business"
    assert extraction["max_stops"] == 1


def test_interpret_validates_minimum_query_length(client: TestClient):
    assert client.post("/api/v1/assistant/interpret", json={"query": "hi"}).status_code == 422
