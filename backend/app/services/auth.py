from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_token,
    decode_token,
    hash_password,
    hash_token_id,
    verify_password,
)
from app.models import RefreshSession, User
from app.repositories.users import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def register(
        self, request: RegisterRequest, user_agent: str | None = None
    ) -> tuple[TokenResponse, str]:
        if self.users.by_email(request.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account already exists for this email",
            )
        user = self.users.create(request, hash_password(request.password))
        return self._issue_tokens(user, user_agent)

    def login(
        self, request: LoginRequest, user_agent: str | None = None
    ) -> tuple[TokenResponse, str]:
        user = self.users.by_email(request.email)
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
            )
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
        return self._issue_tokens(user, user_agent)

    def refresh(
        self, refresh_token: str, user_agent: str | None = None
    ) -> tuple[TokenResponse, str]:
        try:
            payload = decode_token(refresh_token, "refresh")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
        session = self.db.scalar(
            select(RefreshSession).where(
                RefreshSession.jti_hash == hash_token_id(payload["jti"]),
                RefreshSession.revoked_at.is_(None),
            )
        )
        if not session or session.expires_at.replace(tzinfo=UTC) <= datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh session is no longer valid",
            )
        session.revoked_at = datetime.now(UTC)
        user = self.users.by_id(payload["sub"])
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is unavailable"
            )
        self.db.commit()
        return self._issue_tokens(user, user_agent)

    def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        try:
            payload = decode_token(refresh_token, "refresh")
        except ValueError:
            return
        session = self.db.scalar(
            select(RefreshSession).where(RefreshSession.jti_hash == hash_token_id(payload["jti"]))
        )
        if session and not session.revoked_at:
            session.revoked_at = datetime.now(UTC)
            self.db.commit()

    def _issue_tokens(self, user: User, user_agent: str | None) -> tuple[TokenResponse, str]:
        access, _, access_expires = create_token(user.id, "access")
        refresh, refresh_jti, refresh_expires = create_token(user.id, "refresh")
        self.db.add(
            RefreshSession(
                user_id=user.id,
                jti_hash=hash_token_id(refresh_jti),
                expires_at=refresh_expires,
                user_agent=user_agent,
            )
        )
        self.db.commit()
        return (
            TokenResponse(access_token=access, expires_at=access_expires, user=user),
            refresh,
        )


def refresh_cookie_options() -> dict:
    settings = get_settings()
    return {
        "key": "aeroopt_refresh",
        "httponly": True,
        "secure": settings.cookie_secure or settings.is_production,
        "samesite": "lax",
        "max_age": settings.refresh_token_days * 86400,
        "path": f"{settings.api_v1_prefix}/auth",
    }
