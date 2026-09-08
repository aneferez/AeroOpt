from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User, UserPreference
from app.schemas.auth import RegisterRequest
from app.schemas.user import PreferenceUpdate


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def by_id(self, user_id: str) -> User | None:
        return self.db.get(User, user_id)

    def create(self, request: RegisterRequest, password_hash: str) -> User:
        user = User(
            email=request.email.lower(),
            display_name=request.display_name.strip(),
            password_hash=password_hash,
        )
        user.preferences = UserPreference(profile="balanced")
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_preferences(self, user: User, request: PreferenceUpdate) -> UserPreference:
        preference = user.preferences or UserPreference(user_id=user.id)
        for field, value in request.model_dump().items():
            setattr(preference, field, value)
        self.db.add(preference)
        self.db.commit()
        self.db.refresh(preference)
        return preference
