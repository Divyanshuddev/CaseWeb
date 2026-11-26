from typing import List, Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.board import BoardConnectionOut, BoardNodeOut, BoardOut
from app.schemas.case import (
    CaseCreate,
    CaseOut,
    CaseUpdate,
    DashboardStats,
    GlobalSearchResponse,
)
from app.schemas.evidence import EvidenceOut
from app.schemas.suspect import SuspectOut
from app.schemas.timeline import TimelineEventOut
from app.services.auth_service import get_current_user, get_optional_user
from app.services.board_service import get_board_state
from app.services.case_service import (
    clone_demo_case,
    create_case,
    delete_case,
    ensure_case_access,
    get_dashboard_stats,
    global_search,
    list_demo_cases,
    list_user_cases,
    serialize_case,
    update_case,
)
from app.utils.storage import ALLOWED_IMAGE_EXTENSIONS, get_storage_backend

router = APIRouter(prefix="/api/cases", tags=["Cases"])


@router.get("/demo", response_model=List[CaseOut])
def get_demo_cases(db: Session = Depends(get_db)):
    return list_demo_cases(db)


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_dashboard_stats(db, current_user)


@router.get("/search", response_model=GlobalSearchResponse)
def search_all(
    q: str = Query(default="", max_length=200),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    hits = global_search(
        db,
        user=current_user,
        query=q,
        status_filter=status_filter,
        category_filter=category,
    )
    return GlobalSearchResponse(query=q, results=hits)


@router.get("", response_model=List[CaseOut])
def list_cases(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    q: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_user_cases(db, current_user, status_filter=status_filter, query=q)


@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def create_new_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_case(db, current_user, payload)


@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    case = ensure_case_access(db, case_id, current_user, require_write=False)
    return serialize_case(db, case)


@router.put("/{case_id}", response_model=CaseOut)
def update_existing_case(
    case_id: str,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_case(db, current_user, case_id, payload)


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_case(db, current_user, case_id)
    return None


@router.post("/{case_id}/clone", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def clone_demo(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return clone_demo_case(db, current_user, case_id)


@router.get("/{case_id}/export")
def export_case_json(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    case = ensure_case_access(db, case_id, current_user, require_write=False)
    board_state = get_board_state(db, case_id, current_user)
    return {
        "case": serialize_case(db, case).model_dump(mode="json"),
        "evidence": [EvidenceOut.model_validate(e).model_dump(mode="json") for e in case.evidence_items],
        "suspects": [SuspectOut.model_validate(s).model_dump(mode="json") for s in case.suspects],
        "timeline": [
            TimelineEventOut.model_validate(t).model_dump(mode="json")
            for t in sorted(case.timeline_events, key=lambda x: (x.event_date, x.event_time))
        ],
        "boards": [BoardOut.model_validate(b).model_dump(mode="json") for b in board_state.boards],
        "board_nodes": [BoardNodeOut.model_validate(n).model_dump(mode="json") for n in case.board_nodes],
        "board_connections": [
            BoardConnectionOut.model_validate(c).model_dump(mode="json") for c in case.board_connections
        ],
    }


@router.post("/{case_id}/uploads/image", status_code=status.HTTP_201_CREATED)
async def upload_case_image(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and validate an image for board cards, timeline events, or case assets."""
    ensure_case_access(db, case_id, current_user, require_write=True)
    storage = get_storage_backend()
    _, saved_url, size_bytes, sha256 = await storage.save_file(
        file,
        subdir=f"case-{case_id}",
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
    )
    return {
        "url": saved_url,
        "filename": file.filename,
        "size_bytes": size_bytes,
        "sha256": sha256,
    }
