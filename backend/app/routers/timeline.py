from collections import Counter
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.schemas.timeline import TimelineEventCreate, TimelineEventOut, TimelineEventUpdate
from app.services.auth_service import get_current_user, get_optional_user
from app.services.case_service import ensure_case_access

router = APIRouter(tags=["Timeline"])


def _annotate_conflicts(events: List[TimelineEvent]) -> List[TimelineEventOut]:
    slot_counts = Counter((ev.event_date.strip(), ev.event_time.strip()) for ev in events)
    result: List[TimelineEventOut] = []
    for ev in events:
        out = TimelineEventOut.model_validate(ev)
        out.has_conflict = slot_counts[(ev.event_date.strip(), ev.event_time.strip())] > 1
        result.append(out)
    return result


@router.get("/api/cases/{case_id}/timeline", response_model=List[TimelineEventOut])
def list_timeline(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    ensure_case_access(db, case_id, current_user, require_write=False)
    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.case_id == case_id)
        .order_by(TimelineEvent.event_date.asc(), TimelineEvent.event_time.asc())
        .all()
    )
    return _annotate_conflicts(events)


@router.post("/api/cases/{case_id}/timeline", response_model=TimelineEventOut, status_code=status.HTTP_201_CREATED)
def create_timeline_event(
    case_id: str,
    payload: TimelineEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_case_access(db, case_id, current_user, require_write=True)
    event = TimelineEvent(
        case_id=case_id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        event_date=payload.event_date.strip(),
        event_time=payload.event_time.strip() or "00:00",
        evidence_id=payload.evidence_id,
        image_url=payload.image_url,
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.case_id == case_id)
        .all()
    )
    annotated = {e.id: e for e in _annotate_conflicts(events)}
    return annotated[event.id]


@router.put("/api/timeline/{event_id}", response_model=TimelineEventOut)
def update_timeline_event(
    event_id: str,
    payload: TimelineEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(TimelineEvent).filter(TimelineEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Timeline event not found.")
    ensure_case_access(db, event.case_id, current_user, require_write=True)

    if payload.title is not None:
        event.title = payload.title.strip()
    if payload.description is not None:
        event.description = payload.description.strip()
    if payload.event_date is not None:
        event.event_date = payload.event_date.strip()
    if payload.event_time is not None:
        event.event_time = payload.event_time.strip()
    if payload.evidence_id is not None:
        event.evidence_id = payload.evidence_id or None
    if payload.image_url is not None:
        event.image_url = payload.image_url or None

    db.commit()
    db.refresh(event)

    events = db.query(TimelineEvent).filter(TimelineEvent.case_id == event.case_id).all()
    annotated = {e.id: e for e in _annotate_conflicts(events)}
    return annotated[event.id]


@router.delete("/api/timeline/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timeline_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(TimelineEvent).filter(TimelineEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Timeline event not found.")
    ensure_case_access(db, event.case_id, current_user, require_write=True)
    db.delete(event)
    db.commit()
    return None
