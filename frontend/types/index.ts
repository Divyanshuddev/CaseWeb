export type CaseStatus = "New" | "Active" | "Under Review" | "Solved" | "Archived";

export type EvidenceCategory =
  | "Photograph"
  | "Document"
  | "Physical clue"
  | "Digital clue"
  | "Location"
  | "Witness statement"
  | "Other";

export type NodeType =
  | "photograph"
  | "suspect"
  | "victim"
  | "document"
  | "location"
  | "clue"
  | "timeline";

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  badge_number?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface CaseItem {
  id: string;
  user_id?: string | null;
  case_number: string;
  title: string;
  description: string;
  status: CaseStatus;
  thumbnail_url?: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  evidence_count: number;
  suspect_count: number;
  node_count: number;
  connection_count: number;
}

export interface DashboardStats {
  total_cases: number;
  active_investigations: number;
  evidence_collected: number;
  unresolved_clues: number;
  completed_investigations: number;
}

export interface EvidenceItem {
  id: string;
  case_id: string;
  title: string;
  category: EvidenceCategory;
  description: string;
  file_url?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SuspectItem {
  id: string;
  case_id: string;
  name: string;
  alias: string;
  description: string;
  relationship_to_case: string;
  alibi_notes: string;
  image_url?: string | null;
  status: string;
  created_at: string;
}

export interface InvestigationBoard {
  id: string;
  case_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface BoardNodeRecord {
  id: string;
  case_id: string;
  board_id?: string | null;
  evidence_id?: string | null;
  node_type: NodeType;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  node_data: Record<string, unknown>;
}

export interface BoardConnectionRecord {
  id: string;
  case_id: string;
  board_id?: string | null;
  source_node_id: string;
  target_node_id: string;
  relationship: string;
  connection_style: Record<string, unknown>;
}

export interface BoardResponse {
  case_id: string;
  board: InvestigationBoard;
  boards: InvestigationBoard[];
  nodes: BoardNodeRecord[];
  connections: BoardConnectionRecord[];
}

export interface TimelineEventItem {
  id: string;
  case_id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  evidence_id?: string | null;
  image_url?: string | null;
  created_at: string;
  has_conflict: boolean;
}

export interface SearchHit {
  type: "case" | "evidence" | "suspect" | "clue" | "timeline";
  id: string;
  case_id: string;
  case_number: string;
  case_title: string;
  title: string;
  subtitle: string;
  status_or_category: string;
  created_at?: string | null;
}
