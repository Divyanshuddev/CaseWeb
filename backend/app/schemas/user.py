from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=120)
    badge_number: Optional[str] = Field(None, max_length=40)


class UserLogin(BaseModel):
    email_or_username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserProfileUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=120)
    badge_number: Optional[str] = Field(None, max_length=40)


class PasswordUpdate(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    badge_number: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
