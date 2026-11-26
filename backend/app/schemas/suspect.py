from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SuspectStatus = Literal[
    "Person of Interest",
    "Primary Subject",
    "Witness",
    "Cleared",
    "Unverified",
]


class SuspectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    alias: str = Field(default="", max_length=160)
    description: str = Field(default="", max_length=5000)
    relationship_to_case: str = Field(default="", max_length=255)
    alibi_notes: str = Field(default="", max_length=5000)
    image_url: Optional[str] = Field(None, max_length=500)
    status: str = Field(default="Person of Interest", max_length=64)


class SuspectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=160)
    alias: Optional[str] = Field(None, max_length=160)
    description: Optional[str] = Field(None, max_length=5000)
    relationship_to_case: Optional[str] = Field(None, max_length=255)
    alibi_notes: Optional[str] = Field(None, max_length=5000)
    image_url: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field(None, max_length=64)


class SuspectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    name: str
    alias: str
    description: str
    relationship_to_case: str
    alibi_notes: str
    image_url: Optional[str] = None
    status: str
    created_at: datetime
