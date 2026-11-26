import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


JSONVariant = JSON().with_variant(JSONB, "postgresql")


class Evidence(Base):
    __tablename__ = "evidence"
    __table_args__ = (
        Index("ix_evidence_case_category", "case_id", "category"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("cases.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(64), default="Other", index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    extra_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSONVariant, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("Case", back_populates="evidence_items")
    board_nodes = relationship("BoardNode", back_populates="evidence")
    timeline_events = relationship("TimelineEvent", back_populates="evidence")
