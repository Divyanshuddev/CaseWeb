from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.models.user import User
from app.schemas.evidence import EvidenceCreate, EvidenceUpdate
from app.services.case_service import ensure_case_access
from app.utils.storage import get_storage_backend


def list_case_evidence(
    db: Session,
    case_id: str,
    user: Optional[User],
    category: Optional[str] = None,
    query: Optional[str] = None,
) -> List[Evidence]:
    ensure_case_access(db, case_id, user, require_write=False)
    q = db.query(Evidence).filter(Evidence.case_id == case_id)
    if category and category != "All":
        q = q.filter(Evidence.category == category)
    if query:
        like = f"%{query.strip()}%"
        q = q.filter(or_(Evidence.title.ilike(like), Evidence.description.ilike(like)))
    return q.order_by(Evidence.created_at.desc()).all()


def create_evidence(
    db: Session,
    case_id: str,
    user: User,
    data: EvidenceCreate,
) -> Evidence:
    ensure_case_access(db, case_id, user, require_write=True)
    evidence = Evidence(
        case_id=case_id,
        title=data.title.strip(),
        category=data.category,
        description=data.description.strip(),
        file_url=data.file_url,
        extra_metadata=data.metadata or {},
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence


def update_evidence(
    db: Session,
    evidence_id: str,
    user: User,
    data: EvidenceUpdate,
) -> Evidence:
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found.")
    ensure_case_access(db, evidence.case_id, user, require_write=True)

    if data.title is not None:
        evidence.title = data.title.strip()
    if data.category is not None:
        evidence.category = data.category
    if data.description is not None:
        evidence.description = data.description.strip()
    if data.file_url is not None:
        evidence.file_url = data.file_url
    if data.metadata is not None:
        evidence.extra_metadata = data.metadata

    db.commit()
    db.refresh(evidence)
    return evidence


def delete_evidence(db: Session, evidence_id: str, user: User) -> None:
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found.")
    ensure_case_access(db, evidence.case_id, user, require_write=True)

    file_url = evidence.file_url
    db.delete(evidence)
    db.commit()

    if file_url:
        storage = get_storage_backend()
        storage.delete_file(file_url)
