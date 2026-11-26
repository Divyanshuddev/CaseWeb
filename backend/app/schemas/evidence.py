from datetime import datetime
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

EvidenceCategory = Literal[
    "Photograph",
    "Document",
    "Physical clue",
    "Digital clue",
    "Location",
    "Witness statement",
    "Other",
]


class EvidenceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    category: EvidenceCategory = "Other"
    description: str = Field(default="", max_length=5000)
    file_url: Optional[str] = Field(None, max_length=500)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvidenceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[EvidenceCategory] = None
    description: Optional[str] = Field(None, max_length=5000)
    file_url: Optional[str] = Field(None, max_length=500)
    metadata: Optional[Dict[str, Any]] = None


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    case_id: str
    title: str
    category: str
    description: str
    file_url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, validation_alias="extra_metadata")
    created_at: datetime
