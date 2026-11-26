from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

NodeType = Literal[
    "photograph",
    "suspect",
    "victim",
    "document",
    "location",
    "clue",
    "timeline",
]


class BoardCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)


class BoardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    name: str
    is_default: bool
    created_at: datetime


class BoardNodeCreate(BaseModel):
    board_id: Optional[str] = None
    evidence_id: Optional[str] = None
    node_type: NodeType
    position_x: float = 120.0
    position_y: float = 120.0
    width: float = Field(default=260.0, ge=120.0, le=900.0)
    height: float = Field(default=220.0, ge=100.0, le=900.0)
    rotation: float = Field(default=0.0, ge=-45.0, le=45.0)
    node_data: Dict[str, Any] = Field(default_factory=dict)


class BoardNodeUpdate(BaseModel):
    evidence_id: Optional[str] = None
    node_type: Optional[NodeType] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[float] = Field(None, ge=120.0, le=900.0)
    height: Optional[float] = Field(None, ge=100.0, le=900.0)
    rotation: Optional[float] = Field(None, ge=-45.0, le=45.0)
    node_data: Optional[Dict[str, Any]] = None


class BoardNodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: str
    board_id: Optional[str] = None
    evidence_id: Optional[str] = None
    node_type: str
    position_x: float
    position_y: float
    width: float
    height: float
    rotation: float
    node_data: Dict[str, Any] = Field(default_factory=dict)


class BoardConnectionCreate(BaseModel):
    board_id: Optional[str] = None
    source_node_id: str
    target_node_id: str
    relationship: str = Field(default="Investigator hypothesis", max_length=500)
    connection_style: Dict[str, Any] = Field(default_factory=dict)


class BoardConnectionUpdate(BaseModel):
    relationship: Optional[str] = Field(None, max_length=500)
    connection_style: Optional[Dict[str, Any]] = None


class BoardConnectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    case_id: str
    board_id: Optional[str] = None
    source_node_id: str
    target_node_id: str
    relationship: str = Field(validation_alias="relationship_label")
    connection_style: Dict[str, Any] = Field(default_factory=dict)


class BulkNodePositionItem(BaseModel):
    id: str
    position_x: float
    position_y: float
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = None
    node_data: Optional[Dict[str, Any]] = None


class BoardStateSave(BaseModel):
    board_id: Optional[str] = None
    nodes: List[BulkNodePositionItem] = Field(default_factory=list)


class BoardResponse(BaseModel):
    case_id: str
    board: BoardOut
    boards: List[BoardOut]
    nodes: List[BoardNodeOut]
    connections: List[BoardConnectionOut]
