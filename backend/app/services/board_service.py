from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.board import BoardConnection, BoardNode, InvestigationBoard
from app.models.user import User
from app.schemas.board import (
    BoardConnectionCreate,
    BoardConnectionUpdate,
    BoardCreate,
    BoardNodeCreate,
    BoardNodeUpdate,
    BoardResponse,
    BoardStateSave,
)
from app.services.case_service import ensure_case_access


def get_or_create_default_board(db: Session, case_id: str) -> InvestigationBoard:
    board = (
        db.query(InvestigationBoard)
        .filter(InvestigationBoard.case_id == case_id, InvestigationBoard.is_default.is_(True))
        .first()
    )
    if board:
        return board

    first_board = (
        db.query(InvestigationBoard)
        .filter(InvestigationBoard.case_id == case_id)
        .order_by(InvestigationBoard.created_at.asc())
        .first()
    )
    if first_board:
        return first_board

    board = InvestigationBoard(
        case_id=case_id,
        name="Primary Investigation Wall",
        is_default=True,
    )
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


def resolve_board(db: Session, case_id: str, board_id: Optional[str]) -> InvestigationBoard:
    if board_id:
        board = (
            db.query(InvestigationBoard)
            .filter(InvestigationBoard.id == board_id, InvestigationBoard.case_id == case_id)
            .first()
        )
        if not board:
            raise HTTPException(status_code=404, detail="Investigation board not found.")
        return board
    return get_or_create_default_board(db, case_id)


def get_board_state(
    db: Session,
    case_id: str,
    user: Optional[User],
    board_id: Optional[str] = None,
) -> BoardResponse:
    ensure_case_access(db, case_id, user, require_write=False)
    boards = (
        db.query(InvestigationBoard)
        .filter(InvestigationBoard.case_id == case_id)
        .order_by(InvestigationBoard.created_at.asc())
        .all()
    )
    if not boards:
        active_board = get_or_create_default_board(db, case_id)
        boards = [active_board]
    else:
        active_board = resolve_board(db, case_id, board_id)

    nodes_q = db.query(BoardNode).filter(BoardNode.case_id == case_id)
    conns_q = db.query(BoardConnection).filter(BoardConnection.case_id == case_id)

    if active_board.is_default:
        nodes = nodes_q.filter(
            (BoardNode.board_id == active_board.id) | (BoardNode.board_id.is_(None))
        ).all()
        connections = conns_q.filter(
            (BoardConnection.board_id == active_board.id) | (BoardConnection.board_id.is_(None))
        ).all()
    else:
        nodes = nodes_q.filter(BoardNode.board_id == active_board.id).all()
        connections = conns_q.filter(BoardConnection.board_id == active_board.id).all()

    return BoardResponse(
        case_id=case_id,
        board=active_board,
        boards=boards,
        nodes=nodes,
        connections=connections,
    )


def create_board(db: Session, case_id: str, user: User, data: BoardCreate) -> InvestigationBoard:
    ensure_case_access(db, case_id, user, require_write=True)
    has_any = (
        db.query(InvestigationBoard).filter(InvestigationBoard.case_id == case_id).first() is not None
    )
    board = InvestigationBoard(
        case_id=case_id,
        name=data.name.strip(),
        is_default=not has_any,
    )
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


def create_board_node(
    db: Session,
    case_id: str,
    user: User,
    data: BoardNodeCreate,
) -> BoardNode:
    ensure_case_access(db, case_id, user, require_write=True)
    board = resolve_board(db, case_id, data.board_id)

    node = BoardNode(
        case_id=case_id,
        board_id=board.id,
        evidence_id=data.evidence_id,
        node_type=data.node_type,
        position_x=data.position_x,
        position_y=data.position_y,
        width=data.width,
        height=data.height,
        rotation=data.rotation,
        node_data=data.node_data or {},
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


def update_board_node(
    db: Session,
    node_id: str,
    user: User,
    data: BoardNodeUpdate,
) -> BoardNode:
    node = db.query(BoardNode).filter(BoardNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board node not found.")
    ensure_case_access(db, node.case_id, user, require_write=True)

    if data.evidence_id is not None:
        node.evidence_id = data.evidence_id
    if data.node_type is not None:
        node.node_type = data.node_type
    if data.position_x is not None:
        node.position_x = data.position_x
    if data.position_y is not None:
        node.position_y = data.position_y
    if data.width is not None:
        node.width = data.width
    if data.height is not None:
        node.height = data.height
    if data.rotation is not None:
        node.rotation = data.rotation
    if data.node_data is not None:
        node.node_data = data.node_data

    db.commit()
    db.refresh(node)
    return node


def delete_board_node(db: Session, node_id: str, user: User) -> None:
    node = db.query(BoardNode).filter(BoardNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board node not found.")
    ensure_case_access(db, node.case_id, user, require_write=True)

    db.query(BoardConnection).filter(
        (BoardConnection.source_node_id == node_id) | (BoardConnection.target_node_id == node_id)
    ).delete(synchronize_session=False)
    db.delete(node)
    db.commit()


def create_board_connection(
    db: Session,
    case_id: str,
    user: User,
    data: BoardConnectionCreate,
) -> BoardConnection:
    ensure_case_access(db, case_id, user, require_write=True)
    if data.source_node_id == data.target_node_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot connect a board card to itself.",
        )

    source_node = (
        db.query(BoardNode)
        .filter(BoardNode.id == data.source_node_id, BoardNode.case_id == case_id)
        .first()
    )
    target_node = (
        db.query(BoardNode)
        .filter(BoardNode.id == data.target_node_id, BoardNode.case_id == case_id)
        .first()
    )
    if not source_node or not target_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source or target node does not belong to this case.",
        )

    board = resolve_board(db, case_id, data.board_id or source_node.board_id)

    conn = BoardConnection(
        case_id=case_id,
        board_id=board.id,
        source_node_id=data.source_node_id,
        target_node_id=data.target_node_id,
        relationship_label=data.relationship.strip() or "Investigator hypothesis",
        connection_style=data.connection_style or {"stroke": "#B3262E", "curved": True},
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


def update_board_connection(
    db: Session,
    connection_id: str,
    user: User,
    data: BoardConnectionUpdate,
) -> BoardConnection:
    conn = db.query(BoardConnection).filter(BoardConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")
    ensure_case_access(db, conn.case_id, user, require_write=True)

    if data.relationship is not None:
        conn.relationship_label = data.relationship.strip()
    if data.connection_style is not None:
        conn.connection_style = data.connection_style

    db.commit()
    db.refresh(conn)
    return conn


def delete_board_connection(db: Session, connection_id: str, user: User) -> None:
    conn = db.query(BoardConnection).filter(BoardConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")
    ensure_case_access(db, conn.case_id, user, require_write=True)

    db.delete(conn)
    db.commit()


def save_board_state(
    db: Session,
    case_id: str,
    user: User,
    payload: BoardStateSave,
) -> List[BoardNode]:
    ensure_case_access(db, case_id, user, require_write=True)
    updated: List[BoardNode] = []
    node_map = {
        n.id: n
        for n in db.query(BoardNode).filter(BoardNode.case_id == case_id).all()
    }
    for item in payload.nodes:
        node = node_map.get(item.id)
        if not node:
            continue
        node.position_x = item.position_x
        node.position_y = item.position_y
        if item.width is not None:
            node.width = item.width
        if item.height is not None:
            node.height = item.height
        if item.rotation is not None:
            node.rotation = item.rotation
        if item.node_data is not None:
            node.node_data = item.node_data
        updated.append(node)

    db.commit()
    for node in updated:
        db.refresh(node)
    return updated
