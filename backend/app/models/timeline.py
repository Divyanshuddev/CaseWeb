import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimelineEvent(Base):
    __tablename__ = "timeline_events"
    __table_args__ = (
        Index("ix_timeline_case_date", "case_id", "event_date", "event_time"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("cases.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    event_date: Mapped[str] = mapped_column(String(32), nullable=False)
    event_time: Mapped[str] = mapped_column(String(32), default="00:00", nullable=False)
    evidence_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("evidence.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("Case", back_populates="timeline_events")
    evidence = relationship("Evidence", back_populates="timeline_events")
