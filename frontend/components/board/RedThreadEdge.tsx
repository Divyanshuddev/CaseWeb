"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { Edit2, Trash2 } from "lucide-react";
import type { CaseFlowEdge } from "@/store/boardStore";

export function RedThreadEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<CaseFlowEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  const label = data?.relationship || "Hypothesis";

  return (
    <>
      {/* Shadow string beneath */}
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth={selected ? 6 : 4}
        transform="translate(2, 4)"
      />
      {/* Signature crimson thread */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#e0353f" : "#B3262E",
          strokeWidth: selected ? 3.5 : 2.5,
          filter: selected ? "drop-shadow(0 0 6px rgba(224, 53, 63, 0.9))" : undefined,
        }}
      />

      {/* Pushpin endpoints */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={5}
        fill="#B3262E"
        stroke="#4f0b0f"
        strokeWidth={1.5}
      />
      <circle
        cx={targetX}
        cy={targetY}
        r={5}
        fill="#B3262E"
        stroke="#4f0b0f"
        strokeWidth={1.5}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div
            className={`px-2 py-1 rounded-sm border text-[10px] font-typewriter max-w-[190px] shadow-lg flex items-center gap-1.5 transition ${
              selected
                ? "bg-[#221414] text-cream border-blood-red ring-1 ring-blood-red"
                : "bg-[#f4e6cb]/95 text-[#1c1611] border-[#8b7252]"
            }`}
          >
            <span className="truncate" title={label}>
              {label}
            </span>
            {!data?.isReadOnly && (
              <span className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => data?.onEdit?.(id)}
                  className="p-0.5 hover:text-blood-red"
                  title="Edit relationship hypothesis"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => data?.onDelete?.(id)}
                  className="p-0.5 hover:text-blood-red"
                  title="Cut red string"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const BOARD_EDGE_TYPES = {
  redThread: RedThreadEdge,
};
