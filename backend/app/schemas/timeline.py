from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TimelineEventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    event_date: str = Field(..., min_length=4, max_length=32)
    event_time: str = Field(default="00:00", max_length=32)
    evidence_id: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)


class TimelineEventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    event_date: Optional[str] = Field(None, min_length=4, max_length=32)
    event_time: Optional[str] = Field(None, max_length=32)
    evidence_id: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)


class TimelineEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    title: str
    description: str
    event_date: str
    event_time: str
    evidence_id: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime
    has_conflict: bool = False
