import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_caseweb.db"
os.environ["UPLOAD_DIR"] = "./test_uploads"

from app.database import Base, SessionLocal, engine
from app.main import app
from app.services.seed_service import seed_demo_cases


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_cases(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


client = TestClient(app)


def register_and_login(username: str, email: str, password: str = "Detective123!"):
    res = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password,
            "full_name": f"Det. {username}",
            "badge_number": "CW-409",
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    return data["access_token"], data["user"]


def test_demo_cases_accessible_without_auth_and_read_only():
    res = client.get("/api/cases/demo")
    assert res.status_code == 200
    demos = res.json()
    assert len(demos) >= 2
    demo_id = demos[0]["id"]

    board_res = client.get(f"/api/cases/{demo_id}/board")
    assert board_res.status_code == 200
    board = board_res.json()
    assert len(board["nodes"]) >= 4
    assert len(board["connections"]) >= 4

    # Cannot mutate demo case even when authenticated
    token, _ = register_and_login("alice", "alice@example.com")
    mut_res = client.put(
        f"/api/cases/{demo_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Hacked"},
    )
    assert mut_res.status_code == 403

    # Can clone demo case into own workspace
    clone_res = client.post(
        f"/api/cases/{demo_id}/clone",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert clone_res.status_code == 201
    cloned = clone_res.json()
    assert cloned["is_demo"] is False
    assert cloned["evidence_count"] == demos[0]["evidence_count"]


def test_auth_profile_password_and_case_isolation():
    token_a, _ = register_and_login("holmes", "holmes@example.com")
    token_b, _ = register_and_login("moriarty", "moriarty@example.com")

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert me.status_code == 200
    assert me.json()["username"] == "holmes"

    prof = client.put(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"full_name": "Sherlock Holmes", "badge_number": "221B"},
    )
    assert prof.status_code == 200
    assert prof.json()["badge_number"] == "221B"

    pw = client.put(
        "/api/users/me/password",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"current_password": "Detective123!", "new_password": "NewPassword456!"},
    )
    assert pw.status_code == 200

    login_res = client.post(
        "/api/auth/login",
        json={"email_or_username": "holmes", "password": "NewPassword456!"},
    )
    assert login_res.status_code == 200

    # Create case as A
    case_res = client.post(
        "/api/cases",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "case_number": "CW-2026-88",
            "title": "The Vanishing Clockmaker",
            "description": "Private investigation file.",
            "status": "Active",
        },
    )
    assert case_res.status_code == 201
    case_id = case_res.json()["id"]

    # User B cannot access User A's case
    forbidden = client.get(
        f"/api/cases/{case_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert forbidden.status_code == 403


def test_full_investigation_workflow_board_evidence_suspects_timeline():
    token, _ = register_and_login("marlowe", "marlowe@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    case_res = client.post(
        "/api/cases",
        headers=headers,
        json={
            "case_number": "CW-1949-12",
            "title": "The Velvet Envelope",
            "description": "Missing manuscript mystery.",
            "status": "Active",
        },
    )
    assert case_res.status_code == 201
    case_id = case_res.json()["id"]

    # Secure upload: reject disguised PNG
    bad_upload = client.post(
        f"/api/cases/{case_id}/evidence",
        headers=headers,
        data={"title": "Bad File", "category": "Photograph"},
        files={"file": ("fake.png", b"NOT_A_PNG_HEADER", "image/png")},
    )
    assert bad_upload.status_code == 400

    # Valid PNG upload
    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    good_upload = client.post(
        f"/api/cases/{case_id}/evidence",
        headers=headers,
        data={"title": "Study Photograph", "category": "Photograph", "description": "Desk clue"},
        files={"file": ("study.png", valid_png, "image/png")},
    )
    assert good_upload.status_code == 201
    ev_id = good_upload.json()["id"]
    assert good_upload.json()["file_url"].startswith("/uploads/")

    # Suspect creation
    sp_res = client.post(
        f"/api/cases/{case_id}/suspects",
        headers=headers,
        json={
            "name": "Victor Sterling",
            "alias": "The Editor",
            "description": "Seen leaving archive.",
            "relationship_to_case": "Publisher",
            "alibi_notes": "Claims he took the 10 PM train.",
            "status": "Person of Interest",
        },
    )
    assert sp_res.status_code == 201

    # Add two board nodes and connect with red string
    n1 = client.post(
        f"/api/cases/{case_id}/board/nodes",
        headers=headers,
        json={
            "node_type": "suspect",
            "position_x": 100,
            "position_y": 150,
            "rotation": -2.0,
            "node_data": {"name": "Victor Sterling", "relationshipStatus": "Person of Interest"},
        },
    ).json()

    n2 = client.post(
        f"/api/cases/{case_id}/board/nodes",
        headers=headers,
        json={
            "evidence_id": ev_id,
            "node_type": "clue",
            "position_x": 450,
            "position_y": 200,
            "node_data": {"title": "Ink-stained Receipt", "verificationStatus": "Unverified"},
        },
    ).json()

    conn = client.post(
        f"/api/cases/{case_id}/board/connections",
        headers=headers,
        json={
            "source_node_id": n1["id"],
            "target_node_id": n2["id"],
            "relationship": "Hypothesis: Purchased blotting paper at station",
        },
    )
    assert conn.status_code == 201
    assert conn.json()["relationship"] == "Hypothesis: Purchased blotting paper at station"

    # Bulk save positions
    save_res = client.put(
        f"/api/cases/{case_id}/board/save",
        headers=headers,
        json={"nodes": [{"id": n1["id"], "position_x": 220, "position_y": 310, "rotation": 3.5}]},
    )
    assert save_res.status_code == 200
    assert save_res.json()[0]["position_x"] == 220

    # Timeline conflict detection
    client.post(
        f"/api/cases/{case_id}/timeline",
        headers=headers,
        json={"title": "Train departure", "event_date": "1949-11-04", "event_time": "22:00"},
    )
    t2 = client.post(
        f"/api/cases/{case_id}/timeline",
        headers=headers,
        json={"title": "Lobby sighting", "event_date": "1949-11-04", "event_time": "22:00"},
    )
    assert t2.status_code == 201
    assert t2.json()["has_conflict"] is True

    # Dashboard metrics reflect real DB counts
    dash = client.get("/api/cases/dashboard", headers=headers).json()
    assert dash["total_cases"] == 1
    assert dash["evidence_collected"] == 1
    assert dash["unresolved_clues"] == 1

    # Global search & Export
    search = client.get("/api/cases/search?q=Sterling", headers=headers).json()
    assert len(search["results"]) >= 1

    export_res = client.get(f"/api/cases/{case_id}/export", headers=headers)
    assert export_res.status_code == 200
    exported = export_res.json()
    assert len(exported["board_nodes"]) == 2
    assert len(exported["board_connections"]) == 1

    # Direct case image upload (used by board cards & timeline)
    img_res = client.post(
        f"/api/cases/{case_id}/uploads/image",
        headers=headers,
        files={"file": ("board-card.png", valid_png, "image/png")},
    )
    assert img_res.status_code == 201, img_res.text
    assert img_res.json()["url"].startswith("/uploads/")

    bad_img = client.post(
        f"/api/cases/{case_id}/uploads/image",
        headers=headers,
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert bad_img.status_code == 400

    demo_id = client.get("/api/cases/demo").json()[0]["id"]
    demo_img = client.post(
        f"/api/cases/{demo_id}/uploads/image",
        headers=headers,
        files={"file": ("board-card.png", valid_png, "image/png")},
    )
    assert demo_img.status_code == 403


def test_settings_normalizes_render_database_url_and_cors():
    from app.config import Settings

    s = Settings(
        DATABASE_URL="postgres://user:pass@dpg-123.oregon-postgres.render.com/caseweb_db",
        DATABASE_URL_UNPOOLED="postgresql://user:pass@ep-abc.us-east-2.aws.neon.tech/neondb?sslmode=require",
        CORS_ORIGINS="https://caseweb.vercel.app/, http://localhost:3000 ",
    )
    assert s.DATABASE_URL == "postgresql+psycopg2://user:pass@dpg-123.oregon-postgres.render.com/caseweb_db"
    assert (
        s.migration_database_url
        == "postgresql+psycopg2://user:pass@ep-abc.us-east-2.aws.neon.tech/neondb?sslmode=require"
    )
    assert s.cors_origins_list == ["https://caseweb.vercel.app", "http://localhost:3000"]
