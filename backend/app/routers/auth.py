from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.routers.dependencies import get_current_user
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserSummary
from app.services.auth import AuthService, refresh_cookie_options

router = APIRouter(prefix="/auth", tags=["authentication"])


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(value=token, **refresh_cookie_options())


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)
):
    tokens, refresh = AuthService(db).register(payload, request.headers.get("user-agent"))
    _set_refresh_cookie(response, refresh)
    return tokens


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)
):
    tokens, refresh = AuthService(db).login(payload, request.headers.get("user-agent"))
    _set_refresh_cookie(response, refresh)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("aeroopt_refresh")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is missing"
        )
    tokens, refresh_token = AuthService(db).refresh(token, request.headers.get("user-agent"))
    _set_refresh_cookie(response, refresh_token)
    return tokens


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    AuthService(db).logout(request.cookies.get("aeroopt_refresh"))
    response.delete_cookie(key="aeroopt_refresh", path="/api/v1/auth")


@router.get("/me", response_model=UserSummary)
def me(user: User = Depends(get_current_user)):
    return user
