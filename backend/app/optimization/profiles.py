DIMENSIONS = (
    "price",
    "duration",
    "layover",
    "reliability",
    "baggage",
    "schedule",
    "airport_convenience",
    "fare_flexibility",
    "connection_risk",
)

PROFILES: dict[str, dict[str, float]] = {
    "balanced": {
        "price": 0.28,
        "duration": 0.18,
        "layover": 0.12,
        "reliability": 0.10,
        "baggage": 0.08,
        "schedule": 0.06,
        "airport_convenience": 0.05,
        "fare_flexibility": 0.05,
        "connection_risk": 0.08,
    },
    "budget": {
        "price": 0.47,
        "duration": 0.10,
        "layover": 0.08,
        "reliability": 0.06,
        "baggage": 0.11,
        "schedule": 0.03,
        "airport_convenience": 0.03,
        "fare_flexibility": 0.04,
        "connection_risk": 0.08,
    },
    "business": {
        "price": 0.10,
        "duration": 0.29,
        "layover": 0.10,
        "reliability": 0.17,
        "baggage": 0.05,
        "schedule": 0.12,
        "airport_convenience": 0.07,
        "fare_flexibility": 0.05,
        "connection_risk": 0.05,
    },
    "comfort": {
        "price": 0.14,
        "duration": 0.18,
        "layover": 0.17,
        "reliability": 0.11,
        "baggage": 0.12,
        "schedule": 0.08,
        "airport_convenience": 0.05,
        "fare_flexibility": 0.08,
        "connection_risk": 0.07,
    },
    "family": {
        "price": 0.21,
        "duration": 0.15,
        "layover": 0.14,
        "reliability": 0.10,
        "baggage": 0.15,
        "schedule": 0.06,
        "airport_convenience": 0.05,
        "fare_flexibility": 0.06,
        "connection_risk": 0.08,
    },
}


def resolve_weights(profile: str, custom: dict[str, float] | None = None) -> dict[str, float]:
    raw = custom if profile == "custom" and custom else PROFILES.get(profile, PROFILES["balanced"])
    sanitized = {dimension: max(0.0, float(raw.get(dimension, 0))) for dimension in DIMENSIONS}
    total = sum(sanitized.values())
    if total <= 0:
        raise ValueError("Optimization weights must contain at least one positive value")
    return {dimension: value / total for dimension, value in sanitized.items()}
