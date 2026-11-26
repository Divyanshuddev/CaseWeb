from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import PasswordUpdate, UserProfileUpdate, UserRegister
from app.utils.security import create_access_token, decode_access_token, hash_password, verify_password

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
        )
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists.",
        )
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    return db.query(User).filter(User.id == payload["sub"]).first()


def register_user(db: Session, data: UserRegister) -> tuple[User, str]:
    existing = (
        db.query(User)
        .filter(or_(User.email == data.email.lower(), User.username == data.username))
        .first()
    )
    if existing:
        if existing.email == data.email.lower():
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        raise HTTPException(status_code=400, detail="This username is already taken.")

    user = User(
        username=data.username,
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        badge_number=data.badge_number,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=user.id, extra_claims={"username": user.username})
    return user, token


def authenticate_user(db: Session, email_or_username: str, password: str) -> tuple[User, str]:
    lookup = email_or_username.strip()
    user = (
        db.query(User)
        .filter(or_(User.email == lookup.lower(), User.username == lookup))
        .first()
    )
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
        )
    token = create_access_token(subject=user.id, extra_claims={"username": user.username})
    return user, token


def update_user_profile(db: Session, user: User, data: UserProfileUpdate) -> User:
    if data.username and data.username != user.username:
        clash = db.query(User).filter(User.username == data.username, User.id != user.id).first()
        if clash:
            raise HTTPException(status_code=400, detail="This username is already taken.")
        user.username = data.username

    if data.email and data.email.lower() != user.email:
        clash = db.query(User).filter(User.email == data.email.lower(), User.id != user.id).first()
        if clash:
            raise HTTPException(status_code=400, detail="This email is already in use.")
        user.email = data.email.lower()

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.badge_number is not None:
        user.badge_number = data.badge_number

    db.commit()
    db.refresh(user)
    return user


def update_user_password(db: Session, user: User, data: PasswordUpdate) -> None:
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
