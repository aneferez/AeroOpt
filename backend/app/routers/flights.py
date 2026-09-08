from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.optimization.profiles import PROFILES
from app.providers import ProviderError, get_flight_provider
from app.routers.dependencies import get_optional_user
from app.schemas.flight import AirportSuggestion, SearchRequest, SearchResponse
from app.services.flight_search import FlightSearchService

router = APIRouter(tags=["flights"])


@router.get("/airports", response_model=list[AirportSuggestion])
async def airports(query: str = Query(min_length=2, max_length=80)):
    provider = get_flight_provider()
    try:
        return await provider.get_airports(query)
    except ProviderError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    finally:
        await provider.close()


@router.post("/flights/search", response_model=SearchResponse)
async def search_flights(
    request: SearchRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    try:
        return await FlightSearchService(db).search(request, user.id if user else None)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ProviderError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.get("/optimization/profiles")
def optimization_profiles():
    return {"profiles": PROFILES, "note": "Weights are normalized to 1.0 before scoring."}
