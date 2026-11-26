import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


JSONVariant = JSON().with_variant(JSONB, "postgresql")


class InvestigationBoard(Base):
    """Supports multiple named corkboards per case while keeping a default main board."""

    __tablename__ = "investigation_boards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("cases.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), default="Primary Investigation Wall", nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("Case", back_populates="boards")
    nodes = relationship("BoardNode", back_populates="board", cascade="all, delete-orphan")
    connections = relationship("BoardConnection", back_populates="board", cascade="all, delete-orphan")


class BoardNode(Base):
    __tablename__ = "board_nodes"
    __table_args__ = (
        Index("ix_board_nodes_case_board", "case_id", "board_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("cases.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    board_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("investigation_boards.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    evidence_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("evidence.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    node_type: Mapped[str] = mapped_column(String(48), nullable=False)
    position_x: Mapped[float] = mapped_column(Float, default=120.0, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, default=120.0, nullable=False)
    width: Mapped[float] = mapped_column(Float, default=260.0, nullable=False)
    height: Mapped[float] = mapped_column(Float, default=220.0, nullable=False)
    rotation: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    node_data: Mapped[Dict[str, Any]] = mapped_column(JSONVariant, default=dict, nullable=False)

    case = relationship("Case", back_populates="board_nodes")
    board = relationship("InvestigationBoard", back_populates="nodes")
    evidence = relationship("Evidence", back_populates="board_nodes")


class BoardConnection(Base):
    __tablename__ = "board_connections"
    __table_args__ = (
        Index("ix_board_connections_case_board", "case_id", "board_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("cases.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    board_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("investigation_boards.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    source_node_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("board_nodes.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    target_node_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("board_nodes.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    relationship_label: Mapped[str] = mapped_column("relationship", String(500), default="Hypothesis link", nullable=False)
    connection_style: Mapped[Dict[str, Any]] = mapped_column(JSONVariant, default=dict, nullable=False)

    case = relationship("Case", back_populates="board_connections")
    board = relationship("InvestigationBoard", back_populates="connections")
    source_node = relationship("BoardNode", foreign_keys=[source_node_id])
    target_node = relationship("BoardNode", foreign_keys=[target_node_id])
