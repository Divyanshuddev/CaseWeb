from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import PasswordUpdate, UserOut, UserProfileUpdate
from app.services.auth_service import get_current_user, update_user_password, update_user_profile

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = update_user_profile(db, current_user, payload)
    return UserOut.model_validate(updated)


@router.put("/me/password")
def change_password(
    payload: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_user_password(db, current_user, payload)
    return {"message": "Password updated successfully."}
