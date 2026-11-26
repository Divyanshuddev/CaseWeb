from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

CaseStatus = Literal["New", "Active", "Under Review", "Solved", "Archived"]


class CaseCreate(BaseModel):
    case_number: str = Field(..., min_length=2, max_length=64)
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(default="", max_length=5000)
    status: CaseStatus = "New"
    thumbnail_url: Optional[str] = Field(None, max_length=500)


class CaseUpdate(BaseModel):
    case_number: Optional[str] = Field(None, min_length=2, max_length=64)
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    status: Optional[CaseStatus] = None
    thumbnail_url: Optional[str] = Field(None, max_length=500)


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    case_number: str
    title: str
    description: str
    status: str
    thumbnail_url: Optional[str] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime
    evidence_count: int = 0
    suspect_count: int = 0
    node_count: int = 0
    connection_count: int = 0


class DashboardStats(BaseModel):
    total_cases: int
    active_investigations: int
    evidence_collected: int
    unresolved_clues: int
    completed_investigations: int


class SearchHit(BaseModel):
    type: Literal["case", "evidence", "suspect", "clue", "timeline"]
    id: str
    case_id: str
    case_number: str
    case_title: str
    title: str
    subtitle: str = ""
    status_or_category: str = ""
    created_at: Optional[datetime] = None


class GlobalSearchResponse(BaseModel):
    query: str
    results: List[SearchHit]
