from datetime import time

from app.optimization.profiles import resolve_weights
from app.schemas.flight import (
    NormalizedFlightOffer,
    RankedOffer,
    RecommendationSet,
    ScoreBreakdown,
    SearchRequest,
)


def _relative_score(value: float, best: float, worst: float, floor: float = 20) -> float:
    if worst <= best:
        return 100.0
    position = (value - best) / (worst - best)
    return max(floor, 100 - position * (100 - floor))


def _layover_score(offer: NormalizedFlightOffer) -> float:
    if offer.stops == 0:
        return 100.0
    score = 88 - max(0, offer.stops - 1) * 18
    if offer.total_layover_minutes < 55:
        score -= 28
    elif offer.total_layover_minutes > 240:
        score -= min(35, (offer.total_layover_minutes - 240) / 12)
    if offer.overnight_layover:
        score -= 18
    if offer.self_transfer:
        score -= 24
    return max(0.0, score)


def _baggage_score(offer: NormalizedFlightOffer, checked_bag_required: bool) -> float:
    checked = offer.baggage.checked_weight_kg
    if checked >= 25:
        score = 100
    elif checked >= 20:
        score = 92
    elif checked >= 15:
        score = 78
    elif offer.baggage.checked_bags:
        score = 70
    else:
        score = 45
    if checked_bag_required and checked == 0:
        score = 10
    return float(score)


def _schedule_score(offer: NormalizedFlightOffer, preferred_period: str | None) -> float:
    hour = offer.segments[0].departure_at.hour
    periods = {
        "morning": range(5, 12),
        "afternoon": range(12, 17),
        "evening": range(17, 22),
        "night": tuple(range(22, 24)) + tuple(range(0, 5)),
    }
    if preferred_period:
        return 100.0 if hour in periods[preferred_period] else 58.0
    if time(6) <= time(hour) <= time(21):
        return 88.0
    return 72.0


def _flexibility_score(offer: NormalizedFlightOffer) -> float:
    if offer.fare.refundable and offer.fare.changeable:
        return 100.0
    if offer.fare.changeable:
        return 72.0 if offer.fare.change_fee else 88.0
    if offer.fare.refundable:
        return 84.0
    return 35.0


def _explain(
    scores: dict[str, float], offer: NormalizedFlightOffer, price_delta: float
) -> list[str]:
    factors: list[str] = []
    strongest = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:3]
    labels = {
        "price": "strong fare value",
        "duration": "a time-efficient itinerary",
        "layover": "a manageable connection plan",
        "reliability": "above-average operating reliability",
        "baggage": "useful included baggage",
        "schedule": "convenient departure timing",
        "airport_convenience": "a convenient airport choice",
        "fare_flexibility": "more flexible fare rules",
        "connection_risk": "low connection risk",
    }
    factors.append("Scores well for " + ", ".join(labels[key] for key, _ in strongest) + ".")
    if price_delta > 0:
        factors.append(
            f"Costs {offer.currency} {price_delta:,.0f} more than the lowest fare in these results."
        )
    else:
        factors.append("This is the lowest fare in these results.")
    if offer.stops == 0:
        factors.append("Nonstop travel removes missed-connection exposure.")
    elif offer.connection_risk >= 0.3:
        factors.append("The connection plan carries elevated disruption risk.")
    if offer.expected_baggage_fee:
        factors.append(
            f"Estimated checked-bag cost adds {offer.currency} {offer.expected_baggage_fee:,.0f}."
        )
    return factors[:4]


def rank_offers(
    offers: list[NormalizedFlightOffer], request: SearchRequest
) -> tuple[list[RankedOffer], RecommendationSet]:
    if not offers:
        raise ValueError("Cannot rank an empty offer list")
    weights = resolve_weights(request.profile, request.custom_weights)
    prices = [
        offer.total_price + offer.expected_baggage_fee + offer.estimated_ground_cost
        for offer in offers
    ]
    durations = [offer.duration_minutes for offer in offers]
    min_price, max_price = min(prices), max(prices)
    min_duration, max_duration = min(durations), max(durations)
    ranked: list[RankedOffer] = []
    for offer, adjusted_price in zip(offers, prices, strict=True):
        dimension_scores = {
            "price": _relative_score(adjusted_price, min_price, max_price),
            "duration": _relative_score(offer.duration_minutes, min_duration, max_duration),
            "layover": _layover_score(offer),
            "reliability": offer.reliability * 100,
            "baggage": _baggage_score(offer, request.checked_bag_required),
            "schedule": _schedule_score(offer, request.preferred_departure_period),
            "airport_convenience": offer.airport_convenience * 100,
            "fare_flexibility": _flexibility_score(offer),
            "connection_risk": (1 - offer.connection_risk) * 100,
        }
        overall = sum(dimension_scores[key] * weight for key, weight in weights.items())
        true_cost = adjusted_price + request.value_of_time * (offer.duration_minutes / 60)
        score = ScoreBreakdown(
            overall_score=round(overall, 1),
            price_score=round(dimension_scores["price"], 1),
            duration_score=round(dimension_scores["duration"], 1),
            layover_score=round(dimension_scores["layover"], 1),
            reliability_score=round(dimension_scores["reliability"], 1),
            baggage_score=round(dimension_scores["baggage"], 1),
            schedule_score=round(dimension_scores["schedule"], 1),
            airport_convenience_score=round(dimension_scores["airport_convenience"], 1),
            fare_flexibility_score=round(dimension_scores["fare_flexibility"], 1),
            connection_risk_score=round(dimension_scores["connection_risk"], 1),
            estimated_true_cost=round(true_cost, 2),
            applied_weights={key: round(value, 4) for key, value in weights.items()},
            explanation_factors=_explain(dimension_scores, offer, adjusted_price - min_price),
        )
        ranked.append(RankedOffer(offer=offer, score=score))

    ranked.sort(key=lambda item: (-item.score.overall_score, item.score.estimated_true_cost))
    cheapest = min(ranked, key=lambda item: item.offer.total_price)
    fastest = min(ranked, key=lambda item: item.offer.duration_minutes)
    lowest_risk = max(ranked, key=lambda item: item.score.connection_risk_score)
    eligible_value = [
        item for item in ranked if item.offer.total_price <= cheapest.offer.total_price * 1.25
    ]
    best_value = max(eligible_value, key=lambda item: item.score.overall_score)
    recommendations = RecommendationSet(
        smart_pick_id=ranked[0].offer.id,
        cheapest_id=cheapest.offer.id,
        fastest_id=fastest.offer.id,
        best_value_id=best_value.offer.id,
        lowest_risk_id=lowest_risk.offer.id,
    )
    badges = {
        recommendations.smart_pick_id: "Smart Pick",
        recommendations.cheapest_id: "Cheapest",
        recommendations.fastest_id: "Fastest",
        recommendations.best_value_id: "Best Value",
        recommendations.lowest_risk_id: "Lowest Risk",
    }
    for item in ranked:
        item.badges = [label for offer_id, label in badges.items() if item.offer.id == offer_id]
    return ranked, recommendations
