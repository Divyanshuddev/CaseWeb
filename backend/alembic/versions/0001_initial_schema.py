"""Initial CaseWeb schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-26 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    json_type = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=True),
        sa.Column("badge_number", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "cases",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("case_number", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "case_number", name="uq_cases_user_case_number"),
    )
    op.create_index("ix_cases_user_id", "cases", ["user_id"])
    op.create_index("ix_cases_case_number", "cases", ["case_number"])
    op.create_index("ix_cases_status", "cases", ["status"])
    op.create_index("ix_cases_is_demo", "cases", ["is_demo"])
    op.create_index("ix_cases_user_status", "cases", ["user_id", "status"])

    op.create_table(
        "evidence",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("case_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=True),
        sa.Column("metadata", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evidence_case_id", "evidence", ["case_id"])
    op.create_index("ix_evidence_category", "evidence", ["category"])
    op.create_index("ix_evidence_case_category", "evidence", ["case_id", "category"])

    op.create_table(
        "suspects",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("case_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("alias", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("relationship_to_case", sa.String(length=255), nullable=False),
        sa.Column("alibi_notes", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_suspects_case_id", "suspects", ["case_id"])
    op.create_index("ix_suspects_case_status", "suspects", ["case_id", "status"])

    op.create_table(
        "investigation_boards",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("case_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_investigation_boards_case_id", "investigation_boards", ["case_id"])

    op.create_table(
        "board_nodes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("case_id", sa.String(length=36), nullable=False),
        sa.Column("board_id", sa.String(length=36), nullable=True),
        sa.Column("evidence_id", sa.String(length=36), nullable=True),
        sa.Column("node_type", sa.String(length=48), nullable=False),
        sa.Column("position_x", sa.Float(), nullable=False),
        sa.Column("position_y", sa.Float(), nullable=False),
        sa.Column("width", sa.Float(), nullable=False),
        sa.Column("height", sa.Float(), nullable=False),
        sa.Column("rotation", sa.Float(), nullable=False),
        sa.Column("node_data", json_type, nullable=False),
        sa.ForeignKeyConstraint(["board_id"], ["investigation_boards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["evidence_id"], ["evidence.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_board_nodes_case_id", "board_nodes", ["case_id"])
    op.create_index("ix_board_nodes_board_id", "board_nodes", ["board_id"])
    op.create_index("ix_board_nodes_evidence_id", "board_nodes", ["evidence_id"])
    op.create_index("ix_board_nodes_case_board", "board_nodes", ["case_id", "board_id"])

    op.create_table(
        "board_connections",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("case_id", sa.String(length=36), nullable=False),
        sa.Column("board_id", sa.String(length=36), nullable=True),
        sa.Column("source_node_id", sa.String(length=36), nullable=False),
        sa.Column("target_node_id", sa.String(length=36), nullable=False),
        sa.Column("relationship", sa.String(length=500), nullable=False),
        sa.Column("connection_style", json_type, nullable=False),
        sa.ForeignKeyConstraint(["board_id"], ["investigation_boards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_node_id"], ["board_nodes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_node_id"], ["board_nodes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_board_connections_case_id", "board_connections", ["case_id"])
    op.create_index("ix_board_connections_board_id", "board_connections", ["board_id"])
    op.create_index("ix_board_connections_source_node_id", "board_connections", ["source_node_id"])
    op.create_index("ix_board_connections_target_node_id", "board_connections", ["target_node_id"])
    op.create_index("ix_board_connections_case_board", "board_connections", ["case_id", "board_id"])

    op.create_table(
        "timeline_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("case_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("event_date", sa.String(length=32), nullable=False),
        sa.Column("event_time", sa.String(length=32), nullable=False),
        sa.Column("evidence_id", sa.String(length=36), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["evidence_id"], ["evidence.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_timeline_events_case_id", "timeline_events", ["case_id"])
    op.create_index("ix_timeline_events_evidence_id", "timeline_events", ["evidence_id"])
    op.create_index("ix_timeline_case_date", "timeline_events", ["case_id", "event_date", "event_time"])


def downgrade() -> None:
    op.drop_table("timeline_events")
    op.drop_table("board_connections")
    op.drop_table("board_nodes")
    op.drop_table("investigation_boards")
    op.drop_table("suspects")
    op.drop_table("evidence")
    op.drop_table("cases")
    op.drop_table("users")
