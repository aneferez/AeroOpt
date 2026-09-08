import asyncio
import json
from datetime import UTC, datetime, timedelta
from hashlib import sha256

from redis.asyncio import Redis

from app.core.config import get_settings
from app.schemas.flight import SearchRequest


class SearchCache:
    def __init__(self) -> None:
        settings = get_settings()
        self.redis = (
            Redis.from_url(settings.redis_url, decode_responses=True)
            if settings.redis_url
            else None
        )
        self.memory: dict[str, tuple[datetime, str]] = {}
        self.lock = asyncio.Lock()

    @staticmethod
    def key(request: SearchRequest) -> str:
        payload = request.model_dump_json(exclude_none=True)
        digest = sha256(payload.encode()).hexdigest()[:16]
        return (
            f"flight-search:{request.origin}:{request.destination}:"
            f"{request.departure_date.isoformat()}:{request.cabin}:{request.adults}:{digest}"
        )

    async def get(self, key: str) -> dict | None:
        if self.redis:
            try:
                value = await self.redis.get(key)
                return json.loads(value) if value else None
            except Exception:
                return None
        async with self.lock:
            entry = self.memory.get(key)
            if not entry:
                return None
            expires_at, value = entry
            if expires_at <= datetime.now(UTC):
                self.memory.pop(key, None)
                return None
            return json.loads(value)

    async def set(self, key: str, value: dict, ttl_seconds: int) -> None:
        serialized = json.dumps(value, separators=(",", ":"))
        if self.redis:
            try:
                await self.redis.setex(key, ttl_seconds, serialized)
                return
            except Exception:
                return
        async with self.lock:
            self.memory[key] = (datetime.now(UTC) + timedelta(seconds=ttl_seconds), serialized)

    async def close(self) -> None:
        if self.redis:
            await self.redis.aclose()


search_cache = SearchCache()
