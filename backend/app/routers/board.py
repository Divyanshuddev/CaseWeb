from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.board import (
    BoardConnectionCreate,
    BoardConnectionOut,
    BoardConnectionUpdate,
    BoardCreate,
    BoardNodeCreate,
    BoardNodeOut,
    BoardNodeUpdate,
    BoardOut,
    BoardResponse,
    BoardStateSave,
)
from app.services.auth_service import get_current_user, get_optional_user
from app.services.board_service import (
    create_board,
    create_board_connection,
    create_board_node,
    delete_board_connection,
    delete_board_node,
    get_board_state,
    save_board_state,
    update_board_connection,
    update_board_node,
)

router = APIRouter(tags=["Board"])


@router.get("/api/cases/{case_id}/board", response_model=BoardResponse)
def fetch_board(
    case_id: str,
    board_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    return get_board_state(db, case_id, current_user, board_id=board_id)


@router.post("/api/cases/{case_id}/boards", response_model=BoardOut, status_code=status.HTTP_201_CREATED)
def add_board(
    case_id: str,
    payload: BoardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = create_board(db, case_id, current_user, payload)
    return BoardOut.model_validate(board)


@router.put("/api/cases/{case_id}/board/save", response_model=List[BoardNodeOut])
def bulk_save_board(
    case_id: str,
    payload: BoardStateSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    nodes = save_board_state(db, case_id, current_user, payload)
    return [BoardNodeOut.model_validate(n) for n in nodes]


@router.post("/api/cases/{case_id}/board/nodes", response_model=BoardNodeOut, status_code=status.HTTP_201_CREATED)
def add_board_node(
    case_id: str,
    payload: BoardNodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    node = create_board_node(db, case_id, current_user, payload)
    return BoardNodeOut.model_validate(node)


@router.put("/api/board/nodes/{node_id}", response_model=BoardNodeOut)
def edit_board_node(
    node_id: str,
    payload: BoardNodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    node = update_board_node(db, node_id, current_user, payload)
    return BoardNodeOut.model_validate(node)


@router.delete("/api/board/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_board_node(
    node_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_board_node(db, node_id, current_user)
    return None


@router.post(
    "/api/cases/{case_id}/board/connections",
    response_model=BoardConnectionOut,
    status_code=status.HTTP_201_CREATED,
)
def add_board_connection(
    case_id: str,
    payload: BoardConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conn = create_board_connection(db, case_id, current_user, payload)
    return BoardConnectionOut.model_validate(conn)


@router.put("/api/board/connections/{connection_id}", response_model=BoardConnectionOut)
def edit_board_connection(
    connection_id: str,
    payload: BoardConnectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conn = update_board_connection(db, connection_id, current_user, payload)
    return BoardConnectionOut.model_validate(conn)


@router.delete("/api/board/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_board_connection(
    connection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_board_connection(db, connection_id, current_user)
    return None
