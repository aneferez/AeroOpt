from fastapi import APIRouter

from app.schemas.assistant import NaturalLanguageQueryRequest, NaturalLanguageQueryResponse
from app.services.assistant import interpret_query

router = APIRouter(prefix="/assistant", tags=["AI travel assistant"])


@router.post("/interpret", response_model=NaturalLanguageQueryResponse)
async def interpret(payload: NaturalLanguageQueryRequest):
    return await interpret_query(payload.query)
