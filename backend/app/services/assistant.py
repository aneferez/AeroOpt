import calendar
import re
from datetime import date, timedelta

from app.core.config import get_settings
from app.schemas.assistant import NaturalLanguageQueryResponse, TravelQueryExtraction

AIRPORT_ALIASES = {
    "chennai": "MAA",
    "dubai": "DXB",
    "delhi": "DEL",
    "mumbai": "BOM",
    "bengaluru": "BLR",
    "bangalore": "BLR",
    "singapore": "SIN",
    "london": "LHR",
    "new york": "JFK",
    "doha": "DOH",
}
WEEKDAYS = {name.lower(): index for index, name in enumerate(calendar.day_name)}


def _next_weekday(start: date, weekday: int) -> date:
    return start + timedelta(days=(weekday - start.weekday()) % 7)


def _rule_extract(query: str) -> TravelQueryExtraction:
    lowered = query.lower()
    codes = re.findall(r"\b[A-Z]{3}\b", query)
    mentioned = [
        (lowered.find(name), code) for name, code in AIRPORT_ALIASES.items() if name in lowered
    ]
    ordered = [code for _, code in sorted(mentioned)]
    route = codes + [code for code in ordered if code not in codes]
    origin = route[0] if route else None
    destination = route[1] if len(route) > 1 else None
    today = date.today()
    window_start = today
    if "next month" in lowered:
        year = today.year + (1 if today.month == 12 else 0)
        month = 1 if today.month == 12 else today.month + 1
        window_start = date(year, month, 1)
    day_mentions = [weekday for name, weekday in WEEKDAYS.items() if name in lowered]
    departure = _next_weekday(window_start, day_mentions[0]) if day_mentions else None
    returning = (
        _next_weekday(departure + timedelta(days=1), day_mentions[1])
        if departure and len(day_mentions) > 1
        else None
    )
    period = next(
        (item for item in ("morning", "afternoon", "evening", "night") if item in lowered), None
    )
    stop_match = re.search(r"(?:max(?:imum)?|up to)\s+(\d+|one|two)\s+stops?", lowered)
    number_words = {"one": 1, "two": 2}
    max_stops = None
    if "nonstop" in lowered or "direct" in lowered:
        max_stops = 0
    elif stop_match:
        raw = stop_match.group(1)
        max_stops = number_words.get(raw, int(raw) if raw.isdigit() else None)
    priority = (
        "price"
        if any(word in lowered for word in ("cheap", "budget", "lowest fare"))
        else "balanced"
    )
    cabin = "business" if "business class" in lowered else "economy"
    missing = [
        name
        for name, value in (
            ("origin", origin),
            ("destination", destination),
            ("departure_date", departure),
        )
        if value is None
    ]
    return TravelQueryExtraction(
        origin=origin,
        destination=destination,
        departure_date=departure,
        return_date=returning,
        departure_period=period,
        return_period=period
        if returning and lowered.rfind(period or "\0") > lowered.find("return")
        else None,
        max_stops=max_stops,
        priority=priority,
        cabin=cabin,
        missing_fields=missing,
    )


async def interpret_query(query: str) -> NaturalLanguageQueryResponse:
    settings = get_settings()
    extraction: TravelQueryExtraction
    mode = "rules"
    if settings.openai_api_key:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.openai_api_key)
            response = await client.responses.parse(
                model=settings.openai_model,
                instructions=(
                    "Extract only explicit travel constraints. Resolve relative dates against today's date. "
                    "Use IATA codes only when confidently known. Put required unknowns in missing_fields."
                ),
                input=query,
                text_format=TravelQueryExtraction,
                store=False,
            )
            extraction = response.output_parsed
            if extraction is None:
                raise ValueError("AI response did not contain structured data")
            extraction = TravelQueryExtraction.model_validate(extraction)
            mode = "ai"
        except Exception:
            extraction = _rule_extract(query)
    else:
        extraction = _rule_extract(query)
    route = " to ".join(part for part in (extraction.origin, extraction.destination) if part)
    interpretation = f"{route or 'Trip'}"
    if extraction.departure_date:
        interpretation += f" departing {extraction.departure_date:%d %b %Y}"
    if extraction.return_date:
        interpretation += f" and returning {extraction.return_date:%d %b %Y}"
    if extraction.max_stops is not None:
        interpretation += (
            f", up to {extraction.max_stops} stop{'s' if extraction.max_stops != 1 else ''}"
        )
    return NaturalLanguageQueryResponse(
        extraction=extraction,
        interpretation=interpretation + ".",
        mode=mode,
        ready_to_search=not extraction.missing_fields,
    )
