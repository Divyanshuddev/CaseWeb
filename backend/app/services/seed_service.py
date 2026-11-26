from sqlalchemy.orm import Session

from app.models.board import BoardConnection, BoardNode, InvestigationBoard
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.suspect import Suspect
from app.models.timeline import TimelineEvent


def seed_demo_cases(db: Session) -> None:
    """Seed two rich fictional mystery demo cases if none exist yet."""
    existing_demo = db.query(Case).filter(Case.is_demo.is_(True)).first()
    if existing_demo:
        return

    # ------------------------------------------------------------------
    # DEMO CASE 1: The Blackwood Manor Disappearance (Fictional Mystery)
    # ------------------------------------------------------------------
    case1 = Case(
        user_id=None,
        case_number="CW-1947-01",
        title="The Blackwood Manor Disappearance",
        description=(
            "Fictional Case Study: Following an autumn gala at the historic Blackwood estate, "
            "archivist Julian Vance vanished from the locked east study. Investigators must piece "
            "together alibis, torn correspondence, and estate floor plans."
        ),
        status="Active",
        thumbnail_url="/images/demo/manor-thumbnail.svg",
        is_demo=True,
    )
    db.add(case1)
    db.flush()

    ev_photo = Evidence(
        case_id=case1.id,
        title="Photograph 01 — East Study Threshold",
        category="Photograph",
        description="Black-and-white flash photograph of the east study desk taken at 01:15 AM. Note the overturned brass inkwell.",
        file_url="/images/demo/study-photo.svg",
        extra_metadata={"collectionDate": "1947-10-14", "photographer": "Det. H. Mercer", "plate": "B-14"},
    )
    ev_letter = Evidence(
        case_id=case1.id,
        title="Torn Telegraph Clipping",
        category="Document",
        description="Charred fragment retrieved from the library grate mentioning 'midnight ledger transfer at the Boathouse'.",
        file_url="/images/demo/newspaper-clipping.svg",
        extra_metadata={"collectionDate": "1947-10-14", "source": "Study Hearth"},
    )
    ev_map = Evidence(
        case_id=case1.id,
        title="Blackwood Estate Ground Plan",
        category="Location",
        description="Annotated 1922 architect blueprint showing the servants' passage connecting the East Study to the Lake Boathouse.",
        file_url="/images/demo/estate-map.svg",
        extra_metadata={"collectionDate": "1947-10-15", "scale": "1:200"},
    )
    ev_key = Evidence(
        case_id=case1.id,
        title="Monogrammed Brass Skeleton Key",
        category="Physical clue",
        description="Found wedged beneath the boathouse floorboards; bears fresh file marks along the teeth.",
        file_url="/images/demo/clue-key.svg",
        extra_metadata={"collectionDate": "1947-10-15", "labRef": "LAB-47-09"},
    )
    db.add_all([ev_photo, ev_letter, ev_map, ev_key])
    db.flush()

    sp_1 = Suspect(
        case_id=case1.id,
        name="Eleanor Blackwood",
        alias="Lady Blackwood",
        description="Estate heiress and gala host. Reportedly argued with Julian Vance over missing family trust deeds earlier that evening.",
        relationship_to_case="Estate Owner & Gala Host",
        alibi_notes="Claims she remained in the Conservatory with guests from 11:00 PM until 12:30 AM.",
        image_url="/images/demo/suspect-eleanor.svg",
        status="Person of Interest",
    )
    sp_2 = Suspect(
        case_id=case1.id,
        name="Arthur Pendelton",
        alias="The Groundskeeper",
        description="Longtime caretaker familiar with every locked passage and boathouse mooring on the estate.",
        relationship_to_case="Estate Groundskeeper",
        alibi_notes="Stated he locked the boathouse at 10:45 PM, though a witness saw lantern light by the dock at 11:40 PM.",
        image_url="/images/demo/suspect-arthur.svg",
        status="Primary Subject",
    )
    db.add_all([sp_1, sp_2])
    db.flush()

    board1 = InvestigationBoard(
        case_id=case1.id,
        name="Primary Investigation Wall",
        is_default=True,
    )
    db.add(board1)
    db.flush()

    n_victim = BoardNode(
        case_id=case1.id,
        board_id=board1.id,
        node_type="victim",
        position_x=430,
        position_y=60,
        width=260,
        height=240,
        rotation=-1.5,
        node_data={
            "name": "Julian Vance (Missing)",
            "imageUrl": "/images/demo/victim-vance.svg",
            "description": "Senior Archivist auditing the Blackwood estate ledgers.",
            "details": "Last seen entering the East Study at 11:10 PM with a locked leather satchel.",
        },
    )
    n_suspect_a = BoardNode(
        case_id=case1.id,
        board_id=board1.id,
        node_type="suspect",
        position_x=60,
        position_y=120,
        width=265,
        height=265,
        rotation=-2.5,
        node_data={
            "suspectId": sp_2.id,
            "name": "Arthur Pendelton",
            "alias": "Groundskeeper",
            "imageUrl": "/images/demo/suspect-arthur.svg",
            "description": "Knows the hidden servants' corridor and boathouse locks.",
            "relationshipStatus": "Primary Subject",
            "notes": "Alibi conflicts with 11:40 PM lantern sighting near dock.",
        },
    )
    n_location = BoardNode(
        case_id=case1.id,
        board_id=board1.id,
        evidence_id=ev_map.id,
        node_type="location",
        position_x=430,
        position_y=360,
        width=270,
        height=240,
        rotation=1.5,
        node_data={
            "title": "East Study & Boathouse",
            "imageUrl": "/images/demo/estate-map.svg",
            "description": "Connected via hidden servants' stair behind the oak paneling.",
            "relatedEvidence": "Blueprint 1922 + Study Flash Photo",
        },
    )
    n_photo = BoardNode(
        case_id=case1.id,
        board_id=board1.id,
        evidence_id=ev_photo.id,
        node_type="photograph",
        position_x=790,
        position_y=100,
        width=260,
        height=245,
        rotation=2.5,
        node_data={
            "title": "Photograph 01",
            "caption": "East Study Desk — Overturned Inkwell",
            "label": "EXHIBIT A-01",
            "imageUrl": "/images/demo/study-photo.svg",
        },
    )
    n_clue = BoardNode(
        case_id=case1.id,
        board_id=board1.id,
        evidence_id=ev_key.id,
        node_type="clue",
        position_x=785,
        position_y=410,
        width=260,
        height=210,
        rotation=-1.8,
        node_data={
            "title": "Filed Brass Skeleton Key",
            "details": "Fresh metal shavings match the East Study wainscot latch.",
            "importance": "High",
            "verificationStatus": "Unverified",
        },
    )
    n_doc = BoardNode(
        case_id=case1.id,
        board_id=board1.id,
        evidence_id=ev_letter.id,
        node_type="document",
        position_x=65,
        position_y=430,
        width=260,
        height=225,
        rotation=1.8,
        node_data={
            "title": "Charred Telegraph Note",
            "docType": "Handwritten / Clipping",
            "excerpt": "...midnight ledger transfer at the Boathouse. Do not alert Lady B...",
            "imageUrl": "/images/demo/newspaper-clipping.svg",
        },
    )
    db.add_all([n_victim, n_suspect_a, n_location, n_photo, n_clue, n_doc])
    db.flush()

    db.add_all([
        BoardConnection(
            case_id=case1.id,
            board_id=board1.id,
            source_node_id=n_suspect_a.id,
            target_node_id=n_location.id,
            relationship_label="Hypothesis: Had duplicate access to servants' passage",
            connection_style={"stroke": "#B3262E", "curved": True},
        ),
        BoardConnection(
            case_id=case1.id,
            board_id=board1.id,
            source_node_id=n_location.id,
            target_node_id=n_photo.id,
            relationship_label="Scene photo taken at 01:15 AM",
            connection_style={"stroke": "#B3262E", "curved": True},
        ),
        BoardConnection(
            case_id=case1.id,
            board_id=board1.id,
            source_node_id=n_photo.id,
            target_node_id=n_clue.id,
            relationship_label="Scratches on desk lock align with key teeth",
            connection_style={"stroke": "#B3262E", "curved": True},
        ),
        BoardConnection(
            case_id=case1.id,
            board_id=board1.id,
            source_node_id=n_clue.id,
            target_node_id=n_victim.id,
            relationship_label="Satchel & ledger missing from study",
            connection_style={"stroke": "#B3262E", "curved": True},
        ),
        BoardConnection(
            case_id=case1.id,
            board_id=board1.id,
            source_node_id=n_doc.id,
            target_node_id=n_suspect_a.id,
            relationship_label="Hypothesis: Boathouse rendezvous reference",
            connection_style={"stroke": "#B3262E", "curved": True},
        ),
    ])

    db.add_all([
        TimelineEvent(
            case_id=case1.id,
            title="Julian Vance enters East Study",
            description="Butler observed Vance carrying his locked ledger satchel toward the east wing.",
            event_date="1947-10-13",
            event_time="23:10",
            evidence_id=ev_photo.id,
        ),
        TimelineEvent(
            case_id=case1.id,
            title="Lantern sighted at Lake Boathouse",
            description="Kitchen maid saw a swinging brass lantern near the pier despite the boathouse supposedly being locked.",
            event_date="1947-10-13",
            event_time="23:40",
            evidence_id=ev_map.id,
        ),
        TimelineEvent(
            case_id=case1.id,
            title="Groundskeeper's reported lock-up time (Conflicting)",
            description="Arthur Pendelton claimed he was securing the north gate at this exact minute, conflicting with the pier sighting.",
            event_date="1947-10-13",
            event_time="23:40",
            evidence_id=ev_key.id,
        ),
        TimelineEvent(
            case_id=case1.id,
            title="East Study door forced open",
            description="Gala guests and constable discover the room empty with an overturned inkwell.",
            event_date="1947-10-14",
            event_time="01:15",
            evidence_id=ev_photo.id,
        ),
    ])

    # ------------------------------------------------------------------
    # DEMO CASE 2: The Midnight Harbor Cipher (Fictional Mystery)
    # ------------------------------------------------------------------
    case2 = Case(
        user_id=None,
        case_number="CW-1953-04",
        title="The Midnight Harbor Cipher",
        description=(
            "Fictional Case Study: A locked maritime trunk washes ashore at Foghorn Pier 9 "
            "containing coded shipping manifests and an unsigned newspaper personal ad."
        ),
        status="Under Review",
        thumbnail_url="/images/demo/harbor-thumbnail.svg",
        is_demo=True,
    )
    db.add(case2)
    db.flush()

    ev2_clip = Evidence(
        case_id=case2.id,
        title="Harbor Gazette Personal Ad",
        category="Document",
        description="Circled classified notice reading: 'BAROMETER DROPS AT NINE. BRING COMPASS.'",
        file_url="/images/demo/newspaper-clipping.svg",
        extra_metadata={"collectionDate": "1953-02-08", "edition": "Morning Final"},
    )
    ev2_photo = Evidence(
        case_id=case2.id,
        title="Pier 9 Fogbound Crate",
        category="Photograph",
        description="Dockside photograph showing stenciled customs markings scraped off the starboard panel.",
        file_url="/images/demo/harbor-photo.svg",
        extra_metadata={"collectionDate": "1953-02-09"},
    )
    db.add_all([ev2_clip, ev2_photo])
    db.flush()

    sp2_1 = Suspect(
        case_id=case2.id,
        name="Captain Marcus Hale",
        alias="Old Foghorn",
        description="Retired harbor pilot who still holds keys to the old signal tower.",
        relationship_to_case="Former Harbor Pilot",
        alibi_notes="Maintains he was repairing radio gear at the lighthouse all night.",
        image_url="/images/demo/suspect-arthur.svg",
        status="Witness",
    )
    db.add(sp2_1)
    db.flush()

    board2 = InvestigationBoard(
        case_id=case2.id,
        name="Harbor Cipher Wall",
        is_default=True,
    )
    db.add(board2)
    db.flush()

    n2_doc = BoardNode(
        case_id=case2.id,
        board_id=board2.id,
        evidence_id=ev2_clip.id,
        node_type="document",
        position_x=140,
        position_y=140,
        width=260,
        height=225,
        rotation=-1.2,
        node_data={
            "title": "Gazette Classified Cipher",
            "docType": "Newspaper Clipping",
            "excerpt": "BAROMETER DROPS AT NINE. BRING COMPASS.",
            "imageUrl": "/images/demo/newspaper-clipping.svg",
        },
    )
    n2_photo = BoardNode(
        case_id=case2.id,
        board_id=board2.id,
        evidence_id=ev2_photo.id,
        node_type="photograph",
        position_x=520,
        position_y=160,
        width=260,
        height=240,
        rotation=1.8,
        node_data={
            "title": "Pier 9 Crate",
            "caption": "Scraped stencil marks on cedar trunk",
            "label": "EXHIBIT H-02",
            "imageUrl": "/images/demo/harbor-photo.svg",
        },
    )
    db.add_all([n2_doc, n2_photo])
    db.flush()

    db.add(
        BoardConnection(
            case_id=case2.id,
            board_id=board2.id,
            source_node_id=n2_doc.id,
            target_node_id=n2_photo.id,
            relationship_label="Hypothesis: 'AT NINE' refers to Pier 9 drop",
            connection_style={"stroke": "#B3262E", "curved": True},
        )
    )
    db.add(
        TimelineEvent(
            case_id=case2.id,
            title="Trunk discovered at low tide",
            description="Dock patrol spotted the cedar trunk caught against Pier 9 pilings.",
            event_date="1953-02-09",
            event_time="05:45",
            evidence_id=ev2_photo.id,
        )
    )

    db.commit()
