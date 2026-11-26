import { create } from "zustand";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import type { BoardConnectionRecord, BoardNodeRecord, InvestigationBoard } from "@/types";

export interface EvidenceFlowNodeData extends Record<string, unknown> {
  dbId: string;
  nodeType: BoardNodeRecord["node_type"];
  evidenceId?: string | null;
  width: number;
  height: number;
  rotation: number;
  payload: Record<string, unknown>;
  isReadOnly?: boolean;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  onRotate?: (nodeId: string, delta: number) => void;
  onStartConnect?: (nodeId: string) => void;
  isConnectSource?: boolean;
}

export interface RedThreadEdgeData extends Record<string, unknown> {
  dbId: string;
  relationship: string;
  isReadOnly?: boolean;
  onEdit?: (edgeId: string) => void;
  onDelete?: (edgeId: string) => void;
}

export type CaseFlowNode = Node<EvidenceFlowNodeData>;
export type CaseFlowEdge = Edge<RedThreadEdgeData>;

interface BoardStoreState {
  caseId: string | null;
  activeBoard: InvestigationBoard | null;
  boards: InvestigationBoard[];
  nodes: CaseFlowNode[];
  edges: CaseFlowEdge[];
  selectedNodeIds: string[];
  connectSourceNodeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  historySnapshot: { nodes: CaseFlowNode[]; edges: CaseFlowEdge[] } | null;

  setBoardMeta: (caseId: string, activeBoard: InvestigationBoard, boards: InvestigationBoard[]) => void;
  setGraph: (nodes: CaseFlowNode[], edges: CaseFlowEdge[], saveBaseline?: boolean) => void;
  onNodesChange: (changes: NodeChange<CaseFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<CaseFlowEdge>[]) => void;
  setConnectSourceNodeId: (nodeId: string | null) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  markSaved: () => void;
  restoreBaseline: () => void;
  updateLocalNode: (nodeId: string, updater: (node: CaseFlowNode) => CaseFlowNode) => void;
}

export function mapRecordToFlowNode(
  rec: BoardNodeRecord,
  isReadOnly: boolean,
  handlers: {
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onRotate: (id: string, delta: number) => void;
    onStartConnect: (id: string) => void;
  }
): CaseFlowNode {
  return {
    id: rec.id,
    type: rec.node_type,
    position: { x: rec.position_x, y: rec.position_y },
    style: { width: rec.width, height: rec.height },
    data: {
      dbId: rec.id,
      nodeType: rec.node_type,
      evidenceId: rec.evidence_id,
      width: rec.width,
      height: rec.height,
      rotation: rec.rotation,
      payload: rec.node_data || {},
      isReadOnly,
      ...handlers,
    },
  };
}

export function mapRecordToFlowEdge(
  rec: BoardConnectionRecord,
  isReadOnly: boolean,
  handlers: {
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }
): CaseFlowEdge {
  return {
    id: rec.id,
    source: rec.source_node_id,
    target: rec.target_node_id,
    type: "redThread",
    animated: false,
    data: {
      dbId: rec.id,
      relationship: rec.relationship,
      isReadOnly,
      ...handlers,
    },
  };
}

export const useBoardStore = create<BoardStoreState>((set, get) => ({
  caseId: null,
  activeBoard: null,
  boards: [],
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  connectSourceNodeId: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  historySnapshot: null,

  setBoardMeta: (caseId, activeBoard, boards) => set({ caseId, activeBoard, boards }),

  setGraph: (nodes, edges, saveBaseline = false) =>
    set((state) => ({
      nodes,
      edges,
      isDirty: false,
      historySnapshot: saveBaseline
        ? {
            nodes: nodes.map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data } })),
            edges: edges.map((e) => ({ ...e, data: e.data ? { ...e.data } : undefined })),
          }
        : state.historySnapshot,
    })),

  onNodesChange: (changes) => {
    const hasSpatialChange = changes.some(
      (c) => c.type === "position" || c.type === "dimensions" || c.type === "remove"
    );
    set((state) => {
      const nextNodes = applyNodeChanges(changes, state.nodes);
      const selected = nextNodes.filter((n) => n.selected).map((n) => n.id);
      return {
        nodes: nextNodes,
        selectedNodeIds: selected,
        isDirty: hasSpatialChange ? true : state.isDirty,
      };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  setConnectSourceNodeId: (nodeId) =>
    set((state) => ({
      connectSourceNodeId: nodeId,
      nodes: state.nodes.map((n) => ({
        ...n,
        data: { ...n.data, isConnectSource: n.id === nodeId },
      })),
    })),

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),

  markSaved: () => {
    const { nodes, edges } = get();
    set({
      isDirty: false,
      isSaving: false,
      lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      historySnapshot: {
        nodes: nodes.map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data } })),
        edges: edges.map((e) => ({ ...e, data: e.data ? { ...e.data } : undefined })),
      },
    });
  },

  restoreBaseline: () => {
    const snapshot = get().historySnapshot;
    if (!snapshot) return;
    set({
      nodes: snapshot.nodes.map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data } })),
      edges: snapshot.edges.map((e) => ({ ...e, data: e.data ? { ...e.data } : undefined })),
      isDirty: true,
    });
  },

  updateLocalNode: (nodeId, updater) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === nodeId ? updater(n) : n)),
      isDirty: true,
    })),
}));
