import axios from "axios";
import type {
  AuthResponse,
  BoardConnectionRecord,
  BoardNodeRecord,
  BoardResponse,
  CaseItem,
  DashboardStats,
  EvidenceItem,
  InvestigationBoard,
  NodeType,
  SearchHit,
  SuspectItem,
  TimelineEventItem,
  User,
} from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("caseweb_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function resolveAssetUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/uploads/")) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

export function extractApiError(err: unknown, fallback = "Operation failed"): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const authApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    badge_number?: string;
  }) => apiClient.post<AuthResponse>("/api/auth/register", data).then((r) => r.data),

  login: (data: { email_or_username: string; password: string }) =>
    apiClient.post<AuthResponse>("/api/auth/login", data).then((r) => r.data),

  me: () => apiClient.get<User>("/api/auth/me").then((r) => r.data),

  updateProfile: (data: {
    username?: string;
    email?: string;
    full_name?: string;
    badge_number?: string;
  }) => apiClient.put<User>("/api/users/me", data).then((r) => r.data),

  updatePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.put<{ message: string }>("/api/users/me/password", data).then((r) => r.data),
};

export const casesApi = {
  list: (params?: { status?: string; q?: string }) =>
    apiClient.get<CaseItem[]>("/api/cases", { params }).then((r) => r.data),

  demo: () => apiClient.get<CaseItem[]>("/api/cases/demo").then((r) => r.data),

  dashboard: () => apiClient.get<DashboardStats>("/api/cases/dashboard").then((r) => r.data),

  search: (params: { q: string; status?: string; category?: string }) =>
    apiClient
      .get<{ query: string; results: SearchHit[] }>("/api/cases/search", { params })
      .then((r) => r.data),

  get: (caseId: string) => apiClient.get<CaseItem>(`/api/cases/${caseId}`).then((r) => r.data),

  create: (data: {
    case_number: string;
    title: string;
    description: string;
    status: string;
  }) => apiClient.post<CaseItem>("/api/cases", data).then((r) => r.data),

  update: (
    caseId: string,
    data: Partial<{ case_number: string; title: string; description: string; status: string }>
  ) => apiClient.put<CaseItem>(`/api/cases/${caseId}`, data).then((r) => r.data),

  delete: (caseId: string) => apiClient.delete(`/api/cases/${caseId}`),

  cloneDemo: (caseId: string) =>
    apiClient.post<CaseItem>(`/api/cases/${caseId}/clone`).then((r) => r.data),

  exportJson: (caseId: string) =>
    apiClient.get<Record<string, unknown>>(`/api/cases/${caseId}/export`).then((r) => r.data),

  uploadImage: (caseId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiClient
      .post<{ url: string; filename?: string; size_bytes?: number; sha256?: string }>(
        `/api/cases/${caseId}/uploads/image`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      .then((r) => r.data);
  },
};

export const evidenceApi = {
  list: (caseId: string, params?: { category?: string; q?: string }) =>
    apiClient.get<EvidenceItem[]>(`/api/cases/${caseId}/evidence`, { params }).then((r) => r.data),

  createMultipart: (caseId: string, formData: FormData) =>
    apiClient
      .post<EvidenceItem>(`/api/cases/${caseId}/evidence`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),

  createJson: (
    caseId: string,
    data: {
      title: string;
      category: string;
      description: string;
      file_url?: string | null;
      metadata?: Record<string, unknown>;
    }
  ) => apiClient.post<EvidenceItem>(`/api/cases/${caseId}/evidence`, data).then((r) => r.data),

  update: (
    evidenceId: string,
    data: Partial<{
      title: string;
      category: string;
      description: string;
      metadata: Record<string, unknown>;
    }>
  ) => apiClient.put<EvidenceItem>(`/api/evidence/${evidenceId}`, data).then((r) => r.data),

  delete: (evidenceId: string) => apiClient.delete(`/api/evidence/${evidenceId}`),
};

export const suspectsApi = {
  list: (caseId: string) =>
    apiClient.get<SuspectItem[]>(`/api/cases/${caseId}/suspects`).then((r) => r.data),

  createMultipart: (caseId: string, formData: FormData) =>
    apiClient
      .post<SuspectItem>(`/api/cases/${caseId}/suspects`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),

  createJson: (
    caseId: string,
    data: {
      name: string;
      alias?: string;
      description?: string;
      relationship_to_case?: string;
      alibi_notes?: string;
      status?: string;
      image_url?: string | null;
    }
  ) => apiClient.post<SuspectItem>(`/api/cases/${caseId}/suspects`, data).then((r) => r.data),

  update: (suspectId: string, data: Partial<SuspectItem>) =>
    apiClient.put<SuspectItem>(`/api/suspects/${suspectId}`, data).then((r) => r.data),

  delete: (suspectId: string) => apiClient.delete(`/api/suspects/${suspectId}`),
};

export const boardApi = {
  get: (caseId: string, boardId?: string) =>
    apiClient
      .get<BoardResponse>(`/api/cases/${caseId}/board`, {
        params: boardId ? { board_id: boardId } : undefined,
      })
      .then((r) => r.data),

  createBoard: (caseId: string, name: string) =>
    apiClient
      .post<InvestigationBoard>(`/api/cases/${caseId}/boards`, { name })
      .then((r) => r.data),

  createNode: (
    caseId: string,
    data: {
      board_id?: string | null;
      evidence_id?: string | null;
      node_type: NodeType;
      position_x: number;
      position_y: number;
      width?: number;
      height?: number;
      rotation?: number;
      node_data: Record<string, unknown>;
    }
  ) =>
    apiClient.post<BoardNodeRecord>(`/api/cases/${caseId}/board/nodes`, data).then((r) => r.data),

  updateNode: (
    nodeId: string,
    data: Partial<{
      position_x: number;
      position_y: number;
      width: number;
      height: number;
      rotation: number;
      node_data: Record<string, unknown>;
    }>
  ) => apiClient.put<BoardNodeRecord>(`/api/board/nodes/${nodeId}`, data).then((r) => r.data),

  deleteNode: (nodeId: string) => apiClient.delete(`/api/board/nodes/${nodeId}`),

  createConnection: (
    caseId: string,
    data: {
      board_id?: string | null;
      source_node_id: string;
      target_node_id: string;
      relationship: string;
      connection_style?: Record<string, unknown>;
    }
  ) =>
    apiClient
      .post<BoardConnectionRecord>(`/api/cases/${caseId}/board/connections`, data)
      .then((r) => r.data),

  updateConnection: (
    connectionId: string,
    data: { relationship?: string; connection_style?: Record<string, unknown> }
  ) =>
    apiClient
      .put<BoardConnectionRecord>(`/api/board/connections/${connectionId}`, data)
      .then((r) => r.data),

  deleteConnection: (connectionId: string) =>
    apiClient.delete(`/api/board/connections/${connectionId}`),

  saveState: (
    caseId: string,
    nodes: Array<{
      id: string;
      position_x: number;
      position_y: number;
      width?: number;
      height?: number;
      rotation?: number;
      node_data?: Record<string, unknown>;
    }>,
    boardId?: string | null
  ) =>
    apiClient
      .put<BoardNodeRecord[]>(`/api/cases/${caseId}/board/save`, {
        board_id: boardId || undefined,
        nodes,
      })
      .then((r) => r.data),
};

export const timelineApi = {
  list: (caseId: string) =>
    apiClient.get<TimelineEventItem[]>(`/api/cases/${caseId}/timeline`).then((r) => r.data),

  create: (
    caseId: string,
    data: {
      title: string;
      description: string;
      event_date: string;
      event_time: string;
      evidence_id?: string | null;
      image_url?: string | null;
    }
  ) =>
    apiClient
      .post<TimelineEventItem>(`/api/cases/${caseId}/timeline`, data)
      .then((r) => r.data),

  update: (
    eventId: string,
    data: Partial<{
      title: string;
      description: string;
      event_date: string;
      event_time: string;
      evidence_id?: string | null;
      image_url?: string | null;
    }>
  ) => apiClient.put<TimelineEventItem>(`/api/timeline/${eventId}`, data).then((r) => r.data),

  delete: (eventId: string) => apiClient.delete(`/api/timeline/${eventId}`),
};
