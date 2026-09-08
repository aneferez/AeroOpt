import asyncio
from datetime import date

from app.optimization.engine import rank_offers
from app.optimization.profiles import resolve_weights
from app.providers.demo import DemoProvider
from app.schemas.flight import SearchRequest


def request(profile: str = "balanced") -> SearchRequest:
    return SearchRequest(
        origin="MAA",
        destination="DXB",
        departure_date=date(2026, 10, 16),
        adults=1,
        cabin="economy",
        max_stops=1,
        currency="INR",
        profile=profile,
        checked_bag_required=False,
        value_of_time=500,
    )


def test_profiles_normalize_to_one():
    for profile in ("balanced", "budget", "business", "comfort", "family"):
        assert round(sum(resolve_weights(profile).values()), 8) == 1


def test_score_is_bounded_and_explained():
    offers = asyncio.run(DemoProvider().search_flights(request()))
    ranked, recommendations = rank_offers(offers, request())
    assert ranked[0].offer.id == recommendations.smart_pick_id
    assert all(0 <= item.score.overall_score <= 100 for item in ranked)
    assert all(item.score.explanation_factors for item in ranked)
    assert all(item.score.estimated_true_cost >= item.offer.total_price for item in ranked)


def test_budget_profile_favors_the_lowest_price():
    offers = asyncio.run(DemoProvider().search_flights(request("budget")))
    ranked, recommendations = rank_offers(offers, request("budget"))
    cheapest = min(offers, key=lambda offer: offer.total_price)
    assert recommendations.cheapest_id == cheapest.id
    assert ranked[0].score.price_score >= 80
