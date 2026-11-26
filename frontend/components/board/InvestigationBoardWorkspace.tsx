"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  Camera,
  Clock,
  Download,
  FileJson,
  FileText,
  GitBranch,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { boardApi, casesApi, extractApiError } from "@/services/api";
import {
  mapRecordToFlowEdge,
  mapRecordToFlowNode,
  useBoardStore,
} from "@/store/boardStore";
import { useToastStore } from "@/store/toastStore";
import { BOARD_NODE_TYPES } from "@/components/board/EvidenceNodes";
import { BOARD_EDGE_TYPES } from "@/components/board/RedThreadEdge";
import { NodeEditorModal, type NodeEditorInitial } from "@/components/board/NodeEditorModal";
import { ConnectionModal } from "@/components/board/ConnectionModal";
import type { CaseItem, NodeType } from "@/types";

const NODE_PALETTE: Array<{ type: NodeType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: "photograph", label: "Photograph", icon: Camera },
  { type: "suspect", label: "Suspect", icon: Users },
  { type: "victim", label: "Victim", icon: UserCheck },
  { type: "document", label: "Document", icon: FileText },
  { type: "location", label: "Location", icon: MapPin },
  { type: "clue", label: "Clue", icon: HelpCircle },
  { type: "timeline", label: "Timeline", icon: Clock },
];

function BoardInner({ caseItem }: { caseItem: CaseItem }) {
  const pushToast = useToastStore((s) => s.push);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const { fitView } = useReactFlow();

  const {
    activeBoard,
    boards,
    nodes,
    edges,
    selectedNodeIds,
    connectSourceNodeId,
    isDirty,
    isSaving,
    lastSavedAt,
    setBoardMeta,
    setGraph,
    onNodesChange,
    onEdgesChange,
    setConnectSourceNodeId,
    setSaving,
    markSaved,
    restoreBaseline,
    updateLocalNode,
  } = useBoardStore();

  const [loading, setLoading] = useState(true);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [editingInitial, setEditingInitial] = useState<NodeEditorInitial | null>(null);

  const [connModalOpen, setConnModalOpen] = useState(false);
  const [pendingConn, setPendingConn] = useState<{
    mode: "create" | "edit";
    edgeId?: string;
    sourceId?: string;
    targetId?: string;
    label: string;
  } | null>(null);

  const isReadOnly = caseItem.is_demo;

  const handleEditNode = useCallback((nodeId: string) => {
    const found = useBoardStore.getState().nodes.find((n) => n.id === nodeId);
    if (!found) return;
    setEditingInitial({
      id: found.id,
      nodeType: found.data.nodeType,
      rotation: found.data.rotation,
      payload: found.data.payload,
    });
    setNodeEditorOpen(true);
  }, []);

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      if (isReadOnly) return;
      try {
        await boardApi.deleteNode(nodeId);
        const state = useBoardStore.getState();
        setGraph(
          state.nodes.filter((n) => n.id !== nodeId),
          state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
        );
        pushToast({ type: "info", title: "Card removed from corkboard" });
      } catch (err) {
        pushToast({ type: "error", title: "Remove failed", description: extractApiError(err) });
      }
    },
    [isReadOnly, pushToast, setGraph]
  );

  const handleRotateNode = useCallback(
    (nodeId: string, delta: number) => {
      if (isReadOnly) return;
      updateLocalNode(nodeId, (node) => {
        const nextRot = Math.max(-25, Math.min(25, (node.data.rotation || 0) + delta));
        return {
          ...node,
          data: { ...node.data, rotation: nextRot },
        };
      });
    },
    [isReadOnly, updateLocalNode]
  );

  const handleStartConnect = useCallback(
    (nodeId: string) => {
      if (isReadOnly) return;
      const currentSource = useBoardStore.getState().connectSourceNodeId;
      if (!currentSource) {
        setConnectSourceNodeId(nodeId);
        pushToast({
          type: "info",
          title: "Pin thread started",
          description: "Click the thread icon on a second card to complete the red string.",
        });
        return;
      }
      if (currentSource === nodeId) {
        setConnectSourceNodeId(null);
        return;
      }
      setPendingConn({
        mode: "create",
        sourceId: currentSource,
        targetId: nodeId,
        label: "Investigator hypothesis",
      });
      setConnModalOpen(true);
      setConnectSourceNodeId(null);
    },
    [isReadOnly, pushToast, setConnectSourceNodeId]
  );

  const handleEditEdge = useCallback((edgeId: string) => {
    const found = useBoardStore.getState().edges.find((e) => e.id === edgeId);
    if (!found) return;
    setPendingConn({
      mode: "edit",
      edgeId,
      label: found.data?.relationship || "",
    });
    setConnModalOpen(true);
  }, []);

  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      if (isReadOnly) return;
      try {
        await boardApi.deleteConnection(edgeId);
        const state = useBoardStore.getState();
        setGraph(
          state.nodes,
          state.edges.filter((e) => e.id !== edgeId)
        );
        pushToast({ type: "info", title: "Red string removed" });
      } catch (err) {
        pushToast({ type: "error", title: "Could not remove thread", description: extractApiError(err) });
      }
    },
    [isReadOnly, pushToast, setGraph]
  );

  const loadBoard = useCallback(
    async (boardId?: string) => {
      setLoading(true);
      try {
        const res = await boardApi.get(caseItem.id, boardId);
        setBoardMeta(caseItem.id, res.board, res.boards);
        const mappedNodes = res.nodes.map((n) =>
          mapRecordToFlowNode(n, isReadOnly, {
            onEdit: handleEditNode,
            onDelete: handleDeleteNode,
            onRotate: handleRotateNode,
            onStartConnect: handleStartConnect,
          })
        );
        const mappedEdges = res.connections.map((c) =>
          mapRecordToFlowEdge(c, isReadOnly, {
            onEdit: handleEditEdge,
            onDelete: handleDeleteEdge,
          })
        );
        setGraph(mappedNodes, mappedEdges, true);
        setTimeout(() => fitView({ padding: 0.16 }), 60);
      } catch (err) {
        pushToast({ type: "error", title: "Failed to load corkboard", description: extractApiError(err) });
      } finally {
        setLoading(false);
      }
    },
    [
      caseItem.id,
      isReadOnly,
      setBoardMeta,
      setGraph,
      handleEditNode,
      handleDeleteNode,
      handleRotateNode,
      handleStartConnect,
      handleEditEdge,
      handleDeleteEdge,
      fitView,
      pushToast,
    ]
  );

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleSaveBoard = useCallback(
    async (silent = false) => {
      if (isReadOnly) return;
      const state = useBoardStore.getState();
      if (!state.nodes.length && !state.isDirty) return;
      setSaving(true);
      try {
        await boardApi.saveState(
          caseItem.id,
          state.nodes.map((n) => ({
            id: n.id,
            position_x: n.position.x,
            position_y: n.position.y,
            width: Number(n.measured?.width ?? n.style?.width ?? n.data.width ?? 260),
            height: Number(n.measured?.height ?? n.style?.height ?? n.data.height ?? 220),
            rotation: n.data.rotation,
            node_data: n.data.payload,
          })),
          state.activeBoard?.id
        );
        markSaved();
        if (!silent) {
          pushToast({ type: "success", title: "Corkboard layout saved" });
        }
      } catch (err) {
        setSaving(false);
        if (!silent) {
          pushToast({ type: "error", title: "Save failed", description: extractApiError(err) });
        }
      }
    },
    [caseItem.id, isReadOnly, markSaved, pushToast, setSaving]
  );

  // Automatic board saving every 2 seconds when dirty
  useEffect(() => {
    if (!isDirty || isReadOnly) return;
    const timer = setTimeout(() => {
      handleSaveBoard(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, [isDirty, isReadOnly, handleSaveBoard]);

  const handleConnect = (params: Connection) => {
    if (isReadOnly || !params.source || !params.target) return;
    setPendingConn({
      mode: "create",
      sourceId: params.source,
      targetId: params.target,
      label: "Investigator hypothesis",
    });
    setConnModalOpen(true);
  };

  const handleSubmitConnection = async (label: string) => {
    if (!pendingConn) return;
    try {
      if (pendingConn.mode === "create" && pendingConn.sourceId && pendingConn.targetId) {
        const created = await boardApi.createConnection(caseItem.id, {
          board_id: activeBoard?.id,
          source_node_id: pendingConn.sourceId,
          target_node_id: pendingConn.targetId,
          relationship: label,
        });
        const newEdge = mapRecordToFlowEdge(created, isReadOnly, {
          onEdit: handleEditEdge,
          onDelete: handleDeleteEdge,
        });
        const state = useBoardStore.getState();
        setGraph(state.nodes, [...state.edges, newEdge]);
        pushToast({ type: "success", title: "Red string pinned" });
      } else if (pendingConn.mode === "edit" && pendingConn.edgeId) {
        const updated = await boardApi.updateConnection(pendingConn.edgeId, {
          relationship: label,
        });
        const state = useBoardStore.getState();
        setGraph(
          state.nodes,
          state.edges.map((e) =>
            e.id === pendingConn.edgeId
              ? { ...e, data: { ...e.data!, relationship: updated.relationship } }
              : e
          )
        );
        pushToast({ type: "success", title: "Hypothesis updated" });
      }
    } catch (err) {
      pushToast({ type: "error", title: "Connection failed", description: extractApiError(err) });
    }
  };

  const handleSubmitNode = async (values: {
    nodeType: NodeType;
    rotation: number;
    payload: Record<string, unknown>;
  }) => {
    try {
      if (editingInitial?.id) {
        const updated = await boardApi.updateNode(editingInitial.id, {
          rotation: values.rotation,
          node_data: values.payload,
        });
        updateLocalNode(editingInitial.id, (n) => ({
          ...n,
          data: { ...n.data, rotation: updated.rotation, payload: updated.node_data },
        }));
        pushToast({ type: "success", title: "Card updated" });
      } else {
        const offset = (nodes.length % 5) * 45;
        const created = await boardApi.createNode(caseItem.id, {
          board_id: activeBoard?.id,
          node_type: values.nodeType,
          position_x: 140 + offset,
          position_y: 110 + offset,
          width: 260,
          height: 230,
          rotation: values.rotation,
          node_data: values.payload,
        });
        const newFlowNode = mapRecordToFlowNode(created, isReadOnly, {
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
          onRotate: handleRotateNode,
          onStartConnect: handleStartConnect,
        });
        const state = useBoardStore.getState();
        setGraph([...state.nodes, newFlowNode], state.edges);
        pushToast({ type: "success", title: "Evidence card pinned to board" });
      }
    } catch (err) {
      pushToast({ type: "error", title: "Card save failed", description: extractApiError(err) });
    }
  };

  const handleConnectTwoSelected = () => {
    if (selectedNodeIds.length !== 2) {
      pushToast({
        type: "info",
        title: "Select 2 cards",
        description: "Hold Shift and click two cards, or click the thread icon on two cards.",
      });
      return;
    }
    setPendingConn({
      mode: "create",
      sourceId: selectedNodeIds[0],
      targetId: selectedNodeIds[1],
      label: "Investigator hypothesis",
    });
    setConnModalOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (isReadOnly || selectedNodeIds.length === 0) return;
    for (const id of selectedNodeIds) {
      await handleDeleteNode(id);
    }
  };

  const handleCreateExtraBoard = async () => {
    const name = window.prompt("Name for new corkboard wall (e.g., Suspect Alibis Wall):");
    if (!name || !name.trim()) return;
    try {
      const created = await boardApi.createBoard(caseItem.id, name.trim());
      pushToast({ type: "success", title: `Created board "${created.name}"` });
      loadBoard(created.id);
    } catch (err) {
      pushToast({ type: "error", title: "Could not create board", description: extractApiError(err) });
    }
  };

  const handleExportPng = async () => {
    if (!boardRef.current) return;
    try {
      const dataUrl = await toPng(boardRef.current, {
        backgroundColor: "#70452D",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${caseItem.case_number}-corkboard.png`;
      link.href = dataUrl;
      link.click();
      pushToast({ type: "success", title: "Corkboard exported as PNG" });
    } catch {
      pushToast({ type: "error", title: "PNG export failed" });
    }
  };

  const handleExportPdf = async () => {
    try {
      const data = await casesApi.exportJson(caseItem.id);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFont("courier", "bold");
      doc.setFontSize(18);
      doc.text(`CASEWEB DOSSIER: ${caseItem.case_number}`, 40, 50);
      doc.setFontSize(14);
      doc.text(caseItem.title, 40, 74);

      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(`Status: ${caseItem.status}`, 40, 96);
      const descLines = doc.splitTextToSize(caseItem.description || "No summary.", 510);
      doc.text(descLines, 40, 118);

      let y = 135 + descLines.length * 14;
      doc.setFont("courier", "bold");
      doc.text(`Pinned Corkboard Items (${nodes.length}) & Red-String Leads (${edges.length})`, 40, y);
      y += 18;
      doc.setFont("courier", "normal");

      nodes.slice(0, 18).forEach((n, idx) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const label = String(n.data.payload.title || n.data.payload.name || n.data.nodeType);
        doc.text(
          `${idx + 1}. [${n.data.nodeType.toUpperCase()}] ${label} (${Math.round(n.position.x)}, ${Math.round(n.position.y)})`,
          45,
          y
        );
        y += 14;
      });

      y += 10;
      edges.slice(0, 18).forEach((e, idx) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const line = doc.splitTextToSize(
          `Thread ${idx + 1}: ${e.data?.relationship || "Hypothesis"}`,
          500
        );
        doc.text(line, 45, y);
        y += line.length * 13;
      });

      const evidenceList = (data.evidence as Array<{ title: string; category: string }>) || [];
      if (evidenceList.length > 0 && y < 710) {
        y += 12;
        doc.setFont("courier", "bold");
        doc.text(`Evidence Catalog (${evidenceList.length})`, 40, y);
        y += 16;
        doc.setFont("courier", "normal");
        evidenceList.slice(0, 12).forEach((ev) => {
          if (y > 760) return;
          doc.text(`- [${ev.category}] ${ev.title}`, 45, y);
          y += 13;
        });
      }

      doc.save(`${caseItem.case_number}-summary.pdf`);
      pushToast({ type: "success", title: "Case summary PDF downloaded" });
    } catch (err) {
      pushToast({ type: "error", title: "PDF export failed", description: extractApiError(err) });
    }
  };

  const handleExportJson = async () => {
    try {
      const data = await casesApi.exportJson(caseItem.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${caseItem.case_number}-investigation.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast({ type: "success", title: "Investigation JSON downloaded" });
    } catch (err) {
      pushToast({ type: "error", title: "JSON export failed", description: extractApiError(err) });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-11.5rem)] min-h-[580px]">
      {/* Board Toolbar */}
      <div className="bg-[#1b1713] border-b border-[#332920] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Board Selector & Add Node Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Layers className="w-4 h-4 text-paper/75" />
            <select
              value={activeBoard?.id || ""}
              onChange={(e) => loadBoard(e.target.value)}
              className="bg-[#12100e] border border-[#3d3126] text-xs font-typewriter text-paper px-2.5 py-1.5 rounded-sm"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleCreateExtraBoard}
                className="px-2 py-1.5 text-xs border border-[#3d3126] bg-[#12100e] text-paper hover:text-cream rounded-sm"
                title="Create additional board"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-1">
              {NODE_PALETTE.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setEditingInitial({ nodeType: item.type, rotation: 0, payload: {} });
                      setNodeEditorOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#26201a] hover:bg-[#332a21] border border-[#45372a] text-[11px] font-typewriter text-paper rounded-sm transition"
                  >
                    <Icon className="w-3 h-3 text-blood-red" />
                    <span className="hidden xl:inline">{item.label}</span>
                    <span className="xl:hidden">+{item.label.slice(0, 4)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Threading, Save, Restore & Exports */}
        <div className="flex flex-wrap items-center gap-2">
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={handleConnectTwoSelected}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-typewriter uppercase rounded-sm border transition ${
                  connectSourceNodeId || selectedNodeIds.length === 2
                    ? "bg-blood-red border-blood-red text-cream"
                    : "bg-[#26201a] border-[#45372a] text-paper hover:text-cream"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>{connectSourceNodeId ? "Pick 2nd Card..." : "Connect 2"}</span>
              </button>

              {selectedNodeIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-typewriter uppercase rounded-sm border border-blood-red/50 text-blood-red hover:bg-blood-red/15"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedNodeIds.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  restoreBaseline();
                  pushToast({ type: "info", title: "Restored previous saved board layout" });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#26201a] border border-[#45372a] text-[11px] font-typewriter text-paper hover:text-cream rounded-sm"
                title="Restore previous saved positions"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restore</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveBoard(false)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blood-red hover:bg-[#991e25] text-cream text-[11px] font-typewriter uppercase rounded-sm transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : isDirty ? "Save*" : "Saved"}</span>
              </button>
            </>
          )}

          {lastSavedAt && (
            <span className="text-[10px] font-typewriter text-muted-gray hidden md:inline">
              {lastSavedAt}
            </span>
          )}

          <div className="flex items-center gap-1 border-l border-[#352b22] pl-2">
            <button
              type="button"
              onClick={handleExportPng}
              className="p-1.5 bg-[#211c17] hover:bg-[#2d261f] border border-[#403326] text-paper rounded-sm"
              title="Export Corkboard PNG"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="p-1.5 bg-[#211c17] hover:bg-[#2d261f] border border-[#403326] text-paper rounded-sm"
              title="Export Case Summary PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="p-1.5 bg-[#211c17] hover:bg-[#2d261f] border border-[#403326] text-paper rounded-sm"
              title="Download Investigation JSON"
            >
              <FileJson className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Corkboard Canvas */}
      <div
        ref={boardRef}
        className="flex-1 relative corkboard-surface wood-frame overflow-hidden"
      >
        <div className="absolute inset-0 desk-lamp-glow pointer-events-none z-0" />
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
            <p className="font-typewriter text-sm text-paper tracking-widest animate-pulse">
              PINNING EVIDENCE TO CORKBOARD...
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={BOARD_NODE_TYPES}
            edgeTypes={BOARD_EDGE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            nodesDraggable={!isReadOnly}
            nodesConnectable={!isReadOnly}
            elementsSelectable
            multiSelectionKeyCode="Shift"
            selectionOnDrag={!isReadOnly}
            fitView
            minZoom={0.25}
            maxZoom={2}
          >
            <Background color="rgba(232,212,176,0.08)" gap={32} size={1} />
            <Controls />
            <MiniMap
              nodeColor="#e8d4b0"
              maskColor="rgba(21,21,21,0.65)"
              pannable
              zoomable
            />
          </ReactFlow>
        )}
      </div>

      <NodeEditorModal
        open={nodeEditorOpen}
        caseId={caseItem.id}
        initial={editingInitial}
        onClose={() => setNodeEditorOpen(false)}
        onSubmit={handleSubmitNode}
      />

      <ConnectionModal
        open={connModalOpen}
        initialLabel={pendingConn?.label || "Investigator hypothesis"}
        onClose={() => setConnModalOpen(false)}
        onSubmit={handleSubmitConnection}
      />
    </div>
  );
}

export function InvestigationBoardWorkspace({ caseItem }: { caseItem: CaseItem }) {
  return (
    <ReactFlowProvider>
      <BoardInner caseItem={caseItem} />
    </ReactFlowProvider>
  );
}
