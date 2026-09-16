from fastapi.testclient import TestClient


def _search(**overrides) -> dict:
    return {
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
        **overrides,
    }


def test_airport_search_returns_matches(client: TestClient):
    response = client.get("/api/v1/airports", params={"query": "dubai"})
    assert response.status_code == 200
    codes = [airport["iata_code"] for airport in response.json()]
    assert "DXB" in codes


def test_airport_search_validates_minimum_length(client: TestClient):
    assert client.get("/api/v1/airports", params={"query": "d"}).status_code == 422


def test_flight_search_ranks_offers(client: TestClient):
    response = client.post("/api/v1/flights/search", json=_search())
    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["provider_mode"] == "demo"
    assert payload["offers"]
    scores = [offer["score"]["overall_score"] for offer in payload["offers"]]
    assert scores == sorted(scores, reverse=True)
    assert payload["recommendations"]["smart_pick_id"] == payload["offers"][0]["offer"]["id"]


def test_flight_search_is_cached_on_repeat(client: TestClient):
    first = client.post("/api/v1/flights/search", json=_search(destination="SIN"))
    assert first.json()["meta"]["cached"] is False
    second = client.post("/api/v1/flights/search", json=_search(destination="SIN"))
    assert second.json()["meta"]["cached"] is True


def test_flight_search_respects_max_stops(client: TestClient):
    payload = client.post("/api/v1/flights/search", json=_search(max_stops=0)).json()
    assert all(offer["offer"]["stops"] == 0 for offer in payload["offers"])


def test_flight_search_rejects_identical_route(client: TestClient):
    response = client.post("/api/v1/flights/search", json=_search(destination="MAA"))
    assert response.status_code == 422


def test_flight_search_without_results_returns_404(client: TestClient):
    response = client.post("/api/v1/flights/search", json=_search(max_price=1))
    assert response.status_code == 404


def test_optimization_profiles_endpoint(client: TestClient):
    response = client.get("/api/v1/optimization/profiles")
    assert response.status_code == 200
    assert "balanced" in response.json()["profiles"]
