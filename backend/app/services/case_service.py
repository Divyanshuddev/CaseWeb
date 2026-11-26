import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.board import BoardConnection, BoardNode, InvestigationBoard
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.suspect import Suspect
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.schemas.case import CaseCreate, CaseOut, CaseUpdate, DashboardStats, SearchHit


def ensure_case_access(
    db: Session,
    case_id: str,
    user: Optional[User],
    require_write: bool = False,
) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")

    if case.is_demo:
        if require_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Demo cases are read-only. Clone this demo case to your workspace to edit it.",
            )
        return case

    if not user or case.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this case.",
        )
    return case


def serialize_case(db: Session, case: Case) -> CaseOut:
    evidence_count = db.query(func.count(Evidence.id)).filter(Evidence.case_id == case.id).scalar() or 0
    suspect_count = db.query(func.count(Suspect.id)).filter(Suspect.case_id == case.id).scalar() or 0
    node_count = db.query(func.count(BoardNode.id)).filter(BoardNode.case_id == case.id).scalar() or 0
    connection_count = (
        db.query(func.count(BoardConnection.id)).filter(BoardConnection.case_id == case.id).scalar() or 0
    )
    return CaseOut(
        id=case.id,
        user_id=case.user_id,
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        status=case.status,
        thumbnail_url=case.thumbnail_url,
        is_demo=case.is_demo,
        created_at=case.created_at,
        updated_at=case.updated_at,
        evidence_count=evidence_count,
        suspect_count=suspect_count,
        node_count=node_count,
        connection_count=connection_count,
    )


def list_user_cases(
    db: Session,
    user: User,
    status_filter: Optional[str] = None,
    query: Optional[str] = None,
) -> List[CaseOut]:
    q = db.query(Case).filter(Case.user_id == user.id, Case.is_demo.is_(False))
    if status_filter and status_filter != "All":
        q = q.filter(Case.status == status_filter)
    if query:
        like = f"%{query.strip()}%"
        q = q.filter(
            or_(
                Case.title.ilike(like),
                Case.case_number.ilike(like),
                Case.description.ilike(like),
            )
        )
    cases = q.order_by(Case.updated_at.desc()).all()
    return [serialize_case(db, c) for c in cases]


def list_demo_cases(db: Session) -> List[CaseOut]:
    cases = db.query(Case).filter(Case.is_demo.is_(True)).order_by(Case.created_at.asc()).all()
    return [serialize_case(db, c) for c in cases]


def create_case(db: Session, user: User, data: CaseCreate) -> CaseOut:
    duplicate = (
        db.query(Case)
        .filter(Case.user_id == user.id, Case.case_number == data.case_number.strip())
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Case number '{data.case_number}' already exists in your files.",
        )

    case = Case(
        user_id=user.id,
        case_number=data.case_number.strip(),
        title=data.title.strip(),
        description=data.description.strip(),
        status=data.status,
        thumbnail_url=data.thumbnail_url,
        is_demo=False,
    )
    db.add(case)
    db.flush()

    default_board = InvestigationBoard(
        case_id=case.id,
        name="Primary Investigation Wall",
        is_default=True,
    )
    db.add(default_board)
    db.commit()
    db.refresh(case)
    return serialize_case(db, case)


def update_case(db: Session, user: User, case_id: str, data: CaseUpdate) -> CaseOut:
    case = ensure_case_access(db, case_id, user, require_write=True)

    if data.case_number is not None and data.case_number.strip() != case.case_number:
        dup = (
            db.query(Case)
            .filter(
                Case.user_id == user.id,
                Case.case_number == data.case_number.strip(),
                Case.id != case.id,
            )
            .first()
        )
        if dup:
            raise HTTPException(status_code=400, detail="Another case already uses that case number.")
        case.case_number = data.case_number.strip()

    if data.title is not None:
        case.title = data.title.strip()
    if data.description is not None:
        case.description = data.description.strip()
    if data.status is not None:
        case.status = data.status
    if data.thumbnail_url is not None:
        case.thumbnail_url = data.thumbnail_url

    db.commit()
    db.refresh(case)
    return serialize_case(db, case)


def delete_case(db: Session, user: User, case_id: str) -> None:
    case = ensure_case_access(db, case_id, user, require_write=True)
    db.delete(case)
    db.commit()


def get_dashboard_stats(db: Session, user: User) -> DashboardStats:
    user_cases = db.query(Case).filter(Case.user_id == user.id, Case.is_demo.is_(False)).all()
    case_ids = [c.id for c in user_cases]
    total_cases = len(user_cases)
    active_investigations = sum(1 for c in user_cases if c.status in {"New", "Active", "Under Review"})
    completed_investigations = sum(1 for c in user_cases if c.status == "Solved")

    if not case_ids:
        return DashboardStats(
            total_cases=0,
            active_investigations=0,
            evidence_collected=0,
            unresolved_clues=0,
            completed_investigations=0,
        )

    evidence_collected = (
        db.query(func.count(Evidence.id)).filter(Evidence.case_id.in_(case_ids)).scalar() or 0
    )

    clue_nodes = (
        db.query(BoardNode)
        .filter(BoardNode.case_id.in_(case_ids), BoardNode.node_type == "clue")
        .all()
    )
    unresolved_clues = sum(
        1
        for node in clue_nodes
        if str((node.node_data or {}).get("verificationStatus", "Unverified")).lower() != "verified"
    )

    return DashboardStats(
        total_cases=total_cases,
        active_investigations=active_investigations,
        evidence_collected=evidence_collected,
        unresolved_clues=unresolved_clues,
        completed_investigations=completed_investigations,
    )


def global_search(
    db: Session,
    user: Optional[User],
    query: str,
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> List[SearchHit]:
    term = query.strip()
    if not term:
        return []
    like = f"%{term}%"

    if user:
        accessible_cases = db.query(Case).filter(
            or_(Case.user_id == user.id, Case.is_demo.is_(True))
        )
    else:
        accessible_cases = db.query(Case).filter(Case.is_demo.is_(True))

    if status_filter and status_filter != "All":
        accessible_cases = accessible_cases.filter(Case.status == status_filter)

    cases_list = accessible_cases.all()
    case_map = {c.id: c for c in cases_list}
    case_ids = list(case_map.keys())
    if not case_ids:
        return []

    hits: List[SearchHit] = []

    if not category_filter or category_filter == "All":
        for c in cases_list:
            if (
                term.lower() in c.title.lower()
                or term.lower() in c.case_number.lower()
                or term.lower() in c.description.lower()
            ):
                hits.append(
                    SearchHit(
                        type="case",
                        id=c.id,
                        case_id=c.id,
                        case_number=c.case_number,
                        case_title=c.title,
                        title=f"{c.case_number} — {c.title}",
                        subtitle=c.description[:140],
                        status_or_category=c.status,
                        created_at=c.created_at,
                    )
                )

    ev_q = db.query(Evidence).filter(
        Evidence.case_id.in_(case_ids),
        or_(Evidence.title.ilike(like), Evidence.description.ilike(like)),
    )
    if category_filter and category_filter != "All":
        ev_q = ev_q.filter(Evidence.category == category_filter)

    for ev in ev_q.limit(30).all():
        c = case_map[ev.case_id]
        hits.append(
            SearchHit(
                type="evidence",
                id=ev.id,
                case_id=c.id,
                case_number=c.case_number,
                case_title=c.title,
                title=ev.title,
                subtitle=ev.description[:140],
                status_or_category=ev.category,
                created_at=ev.created_at,
            )
        )

    if not category_filter or category_filter == "All":
        suspects = (
            db.query(Suspect)
            .filter(
                Suspect.case_id.in_(case_ids),
                or_(
                    Suspect.name.ilike(like),
                    Suspect.alias.ilike(like),
                    Suspect.description.ilike(like),
                    Suspect.alibi_notes.ilike(like),
                ),
            )
            .limit(20)
            .all()
        )
        for s in suspects:
            c = case_map[s.case_id]
            hits.append(
                SearchHit(
                    type="suspect",
                    id=s.id,
                    case_id=c.id,
                    case_number=c.case_number,
                    case_title=c.title,
                    title=s.name + (f' ("{s.alias}")' if s.alias else ""),
                    subtitle=s.description[:140],
                    status_or_category=s.status,
                    created_at=s.created_at,
                )
            )

        clue_nodes = (
            db.query(BoardNode)
            .filter(BoardNode.case_id.in_(case_ids), BoardNode.node_type == "clue")
            .all()
        )
        for node in clue_nodes:
            data = node.node_data or {}
            title = str(data.get("title", ""))
            details = str(data.get("details", data.get("description", "")))
            if term.lower() in title.lower() or term.lower() in details.lower():
                c = case_map[node.case_id]
                hits.append(
                    SearchHit(
                        type="clue",
                        id=node.id,
                        case_id=c.id,
                        case_number=c.case_number,
                        case_title=c.title,
                        title=title or "Clue Card",
                        subtitle=details[:140],
                        status_or_category=str(data.get("verificationStatus", "Unverified")),
                    )
                )

        events = (
            db.query(TimelineEvent)
            .filter(
                TimelineEvent.case_id.in_(case_ids),
                or_(TimelineEvent.title.ilike(like), TimelineEvent.description.ilike(like)),
            )
            .limit(20)
            .all()
        )
        for ev in events:
            c = case_map[ev.case_id]
            hits.append(
                SearchHit(
                    type="timeline",
                    id=ev.id,
                    case_id=c.id,
                    case_number=c.case_number,
                    case_title=c.title,
                    title=ev.title,
                    subtitle=ev.description[:140],
                    status_or_category=f"{ev.event_date} {ev.event_time}",
                    created_at=ev.created_at,
                )
            )

    return hits[:60]


def clone_demo_case(db: Session, user: User, demo_case_id: str) -> CaseOut:
    source = db.query(Case).filter(Case.id == demo_case_id, Case.is_demo.is_(True)).first()
    if not source:
        raise HTTPException(status_code=404, detail="Demo case not found.")

    suffix = uuid.uuid4().hex[:4].upper()
    candidate_number = f"{source.case_number}-{suffix}"

    cloned_case = Case(
        user_id=user.id,
        case_number=candidate_number,
        title=source.title,
        description=source.description,
        status="Active",
        thumbnail_url=source.thumbnail_url,
        is_demo=False,
    )
    db.add(cloned_case)
    db.flush()

    evidence_map: dict[str, str] = {}
    for ev in source.evidence_items:
        new_ev = Evidence(
            case_id=cloned_case.id,
            title=ev.title,
            category=ev.category,
            description=ev.description,
            file_url=ev.file_url,
            extra_metadata=dict(ev.extra_metadata or {}),
        )
        db.add(new_ev)
        db.flush()
        evidence_map[ev.id] = new_ev.id

    for sp in source.suspects:
        db.add(
            Suspect(
                case_id=cloned_case.id,
                name=sp.name,
                alias=sp.alias,
                description=sp.description,
                relationship_to_case=sp.relationship_to_case,
                alibi_notes=sp.alibi_notes,
                image_url=sp.image_url,
                status=sp.status,
            )
        )

    board_map: dict[str, str] = {}
    for brd in source.boards:
        new_brd = InvestigationBoard(
            case_id=cloned_case.id,
            name=brd.name,
            is_default=brd.is_default,
        )
        db.add(new_brd)
        db.flush()
        board_map[brd.id] = new_brd.id

    node_map: dict[str, str] = {}
    for node in source.board_nodes:
        new_node = BoardNode(
            case_id=cloned_case.id,
            board_id=board_map.get(node.board_id) if node.board_id else None,
            evidence_id=evidence_map.get(node.evidence_id) if node.evidence_id else None,
            node_type=node.node_type,
            position_x=node.position_x,
            position_y=node.position_y,
            width=node.width,
            height=node.height,
            rotation=node.rotation,
            node_data=dict(node.node_data or {}),
        )
        db.add(new_node)
        db.flush()
        node_map[node.id] = new_node.id

    for conn in source.board_connections:
        if conn.source_node_id in node_map and conn.target_node_id in node_map:
            db.add(
                BoardConnection(
                    case_id=cloned_case.id,
                    board_id=board_map.get(conn.board_id) if conn.board_id else None,
                    source_node_id=node_map[conn.source_node_id],
                    target_node_id=node_map[conn.target_node_id],
                    relationship_label=conn.relationship_label,
                    connection_style=dict(conn.connection_style or {}),
                )
            )

    for ev_t in source.timeline_events:
        db.add(
            TimelineEvent(
                case_id=cloned_case.id,
                title=ev_t.title,
                description=ev_t.description,
                event_date=ev_t.event_date,
                event_time=ev_t.event_time,
                evidence_id=evidence_map.get(ev_t.evidence_id) if ev_t.evidence_id else None,
                image_url=ev_t.image_url,
            )
        )

    db.commit()
    db.refresh(cloned_case)
    return serialize_case(db, cloned_case)
