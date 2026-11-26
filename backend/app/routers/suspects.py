from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.suspect import Suspect
from app.models.user import User
from app.schemas.suspect import SuspectCreate, SuspectOut, SuspectUpdate
from app.services.auth_service import get_current_user, get_optional_user
from app.services.case_service import ensure_case_access
from app.utils.storage import ALLOWED_IMAGE_EXTENSIONS, get_storage_backend

router = APIRouter(tags=["Suspects"])


@router.get("/api/cases/{case_id}/suspects", response_model=List[SuspectOut])
def list_suspects(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    ensure_case_access(db, case_id, current_user, require_write=False)
    suspects = (
        db.query(Suspect)
        .filter(Suspect.case_id == case_id)
        .order_by(Suspect.created_at.desc())
        .all()
    )
    return [SuspectOut.model_validate(s) for s in suspects]


@router.post("/api/cases/{case_id}/suspects", response_model=SuspectOut, status_code=status.HTTP_201_CREATED)
async def create_suspect(
    case_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_case_access(db, case_id, current_user, require_write=True)
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        image_url = str(form.get("image_url") or "") or None
        upload = form.get("image") or form.get("file")
        if isinstance(upload, UploadFile) or hasattr(upload, "filename"):
            if getattr(upload, "filename", None):
                storage = get_storage_backend()
                _, saved_url, _, _ = await storage.save_file(
                    upload,
                    subdir=f"suspects-{case_id}",
                    allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
                )
                image_url = saved_url

        payload = SuspectCreate(
            name=str(form.get("name", "")).strip(),
            alias=str(form.get("alias", "")).strip(),
            description=str(form.get("description", "")).strip(),
            relationship_to_case=str(form.get("relationship_to_case", "")).strip(),
            alibi_notes=str(form.get("alibi_notes", "")).strip(),
            image_url=image_url,
            status=str(form.get("status", "Person of Interest")).strip() or "Person of Interest",
        )
    else:
        body = await request.json()
        payload = SuspectCreate.model_validate(body)

    suspect = Suspect(
        case_id=case_id,
        name=payload.name.strip(),
        alias=payload.alias.strip(),
        description=payload.description.strip(),
        relationship_to_case=payload.relationship_to_case.strip(),
        alibi_notes=payload.alibi_notes.strip(),
        image_url=payload.image_url,
        status=payload.status.strip(),
    )
    db.add(suspect)
    db.commit()
    db.refresh(suspect)
    return SuspectOut.model_validate(suspect)


@router.put("/api/suspects/{suspect_id}", response_model=SuspectOut)
def update_suspect(
    suspect_id: str,
    payload: SuspectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    suspect = db.query(Suspect).filter(Suspect.id == suspect_id).first()
    if not suspect:
        raise HTTPException(status_code=404, detail="Suspect profile not found.")
    ensure_case_access(db, suspect.case_id, current_user, require_write=True)

    for field in (
        "name",
        "alias",
        "description",
        "relationship_to_case",
        "alibi_notes",
        "image_url",
        "status",
    ):
        val = getattr(payload, field)
        if val is not None:
            setattr(suspect, field, val.strip() if isinstance(val, str) else val)

    db.commit()
    db.refresh(suspect)
    return SuspectOut.model_validate(suspect)


@router.delete("/api/suspects/{suspect_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_suspect(
    suspect_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    suspect = db.query(Suspect).filter(Suspect.id == suspect_id).first()
    if not suspect:
        raise HTTPException(status_code=404, detail="Suspect profile not found.")
    ensure_case_access(db, suspect.case_id, current_user, require_write=True)

    image_url = suspect.image_url
    db.delete(suspect)
    db.commit()

    if image_url:
        get_storage_backend().delete_file(image_url)
    return None
