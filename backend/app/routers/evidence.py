import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.evidence import EvidenceCreate, EvidenceOut, EvidenceUpdate
from app.services.auth_service import get_current_user, get_optional_user
from app.services.case_service import ensure_case_access
from app.services.evidence_service import (
    create_evidence,
    delete_evidence,
    list_case_evidence,
    update_evidence,
)
from app.utils.storage import ALLOWED_EXTENSIONS, get_storage_backend

router = APIRouter(tags=["Evidence"])


@router.get("/api/cases/{case_id}/evidence", response_model=List[EvidenceOut])
def get_case_evidence(
    case_id: str,
    category: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    items = list_case_evidence(db, case_id, current_user, category=category, query=q)
    return [EvidenceOut.model_validate(item) for item in items]


@router.post("/api/cases/{case_id}/evidence", response_model=EvidenceOut, status_code=status.HTTP_201_CREATED)
async def add_case_evidence(
    case_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_case_access(db, case_id, current_user, require_write=True)
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        title = str(form.get("title", "")).strip()
        category = str(form.get("category", "Other")).strip() or "Other"
        description = str(form.get("description", "")).strip()
        metadata_raw = form.get("metadata")
        metadata = {}
        if metadata_raw:
            try:
                metadata = json.loads(str(metadata_raw))
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON in metadata field.")

        collection_date = form.get("collection_date")
        if collection_date:
            metadata["collectionDate"] = str(collection_date)

        file_url = form.get("file_url")
        file_url_str = str(file_url) if file_url else None

        upload = form.get("file")
        if isinstance(upload, UploadFile) or hasattr(upload, "filename"):
            if getattr(upload, "filename", None):
                storage = get_storage_backend()
                _, saved_url, size_bytes, sha256 = await storage.save_file(
                    upload,
                    subdir=f"case-{case_id}",
                    allowed_extensions=ALLOWED_EXTENSIONS,
                )
                file_url_str = saved_url
                metadata["fileName"] = upload.filename
                metadata["fileSize"] = size_bytes
                metadata["sha256"] = sha256
                metadata["mimeType"] = upload.content_type

        payload = EvidenceCreate(
            title=title,
            category=category,  # type: ignore[arg-type]
            description=description,
            file_url=file_url_str,
            metadata=metadata,
        )
    else:
        body = await request.json()
        payload = EvidenceCreate.model_validate(body)

    created = create_evidence(db, case_id, current_user, payload)
    return EvidenceOut.model_validate(created)


@router.put("/api/evidence/{evidence_id}", response_model=EvidenceOut)
def edit_evidence(
    evidence_id: str,
    payload: EvidenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = update_evidence(db, evidence_id, current_user, payload)
    return EvidenceOut.model_validate(updated)


@router.delete("/api/evidence/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_evidence(db, evidence_id, current_user)
    return None
