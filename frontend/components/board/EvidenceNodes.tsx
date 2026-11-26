"use client";

import { memo } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import {
  CalendarClock,
  Edit2,
  FileText,
  GitCommitHorizontal,
  MapPin,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { resolveAssetUrl } from "@/services/api";
import type { CaseFlowNode } from "@/store/boardStore";
import { RedPushpin } from "@/components/ui/RedPushpin";

function CardFrame({
  id,
  selected,
  data,
  children,
  variantClass = "vintage-paper border-[#7e6446]",
  tag,
}: {
  id: string;
  selected?: boolean;
  data: CaseFlowNode["data"];
  children: React.ReactNode;
  variantClass?: string;
  tag: string;
}) {
  const isConnectSource = Boolean(data.isConnectSource);

  return (
    <>
      <NodeResizer
        minWidth={180}
        minHeight={140}
        isVisible={Boolean(selected && !data.isReadOnly)}
        lineStyle={{ borderColor: "#B3262E" }}
        handleStyle={{ backgroundColor: "#B3262E", width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blood-red !border-2 !border-cream"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blood-red !border-2 !border-cream"
      />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-blood-red/80 !border !border-cream"
      />
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-blood-red/80 !border !border-cream"
      />

      <div
        style={{ transform: `rotate(${data.rotation || 0}deg)` }}
        className={`w-full h-full rounded-sm border p-3 flex flex-col justify-between shadow-card transition-shadow relative group ${variantClass} ${
          selected ? "ring-2 ring-blood-red" : ""
        } ${isConnectSource ? "ring-2 ring-amber-300 shadow-[0_0_24px_rgba(179,38,46,0.75)]" : ""}`}
      >
        {/* Top Pushpin & Quick Controls */}
        <div className="flex items-center justify-between gap-1 mb-1.5 shrink-0">
          <span className="text-[10px] font-typewriter uppercase tracking-wider px-1.5 py-0.5 bg-[#1b1612] text-paper rounded-sm">
            {tag}
          </span>
          <div className="-mt-5">
            <RedPushpin size="md" />
          </div>
          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
            {!data.isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onStartConnect?.(id);
                  }}
                  title="Connect with Red String"
                  className={`p-1 rounded-sm hover:bg-black/15 ${
                    isConnectSource ? "bg-blood-red text-cream" : "text-blood-red"
                  }`}
                >
                  <GitCommitHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onRotate?.(id, -3);
                  }}
                  title="Tilt left"
                  className="p-1 rounded-sm hover:bg-black/15 text-[#33271a]"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onRotate?.(id, 3);
                  }}
                  title="Tilt right"
                  className="p-1 rounded-sm hover:bg-black/15 text-[#33271a]"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onEdit?.(id);
                  }}
                  title="Edit card"
                  className="p-1 rounded-sm hover:bg-black/15 text-[#33271a]"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onDelete?.(id);
                  }}
                  title="Remove from board"
                  className="p-1 rounded-sm hover:bg-blood-red/20 text-blood-red"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
      </div>
    </>
  );
}

export const PhotographNode = memo(function PhotographNode({ id, data, selected }: NodeProps<CaseFlowNode>) {
  const p = data.payload || {};
  const img = resolveAssetUrl(String(p.imageUrl || "")) || "/images/demo/study-photo.svg";
  return (
    <CardFrame
      id={id}
      selected={selected}
      data={data}
      tag={String(p.label || "PHOTOGRAPH")}
      variantClass="bg-[#f2e8d4] text-[#1a1510] border-[#8c7556]"
    >
      <div className="flex-1 min-h-0 bg-[#1a1714] border border-[#7c664a] overflow-hidden">
        <img
          src={img}
          alt={String(p.title || "Photograph")}
          crossOrigin={img.startsWith("http") ? "anonymous" : undefined}
          className="w-full h-full object-cover grayscale contrast-125"
        />
      </div>
      <div className="pt-1.5 shrink-0">
        <p className="font-typewriter text-xs font-bold truncate">{String(p.title || "Evidence Photo")}</p>
        {Boolean(p.caption) && (
          <p className="font-handwriting text-sm text-[#3d3123] truncate leading-tight">
            {String(p.caption)}
          </p>
        )}
      </div>
    </CardFrame>
  );
});

export const SuspectNode = memo(function SuspectNode({ id, data, selected }: NodeProps<CaseFlowNode>) {
  const p = data.payload || {};
  const img = resolveAssetUrl(String(p.imageUrl || "")) || "/images/demo/suspect-arthur.svg";
  return (
    <CardFrame id={id} selected={selected} data={data} tag="SUSPECT">
      <div className="flex gap-2.5 items-start shrink-0">
        <img
          src={img}
          alt={String(p.name || "Suspect")}
          crossOrigin={img.startsWith("http") ? "anonymous" : undefined}
          className="w-16 h-20 object-cover grayscale border border-[#5d4b36] shrink-0"
        />
        <div className="min-w-0">
          <p className="font-serifVintage text-sm font-bold leading-tight truncate">
            {String(p.name || "Unknown Subject")}
          </p>
          {Boolean(p.alias) && (
            <p className="font-typewriter text-[11px] text-blood-red truncate">
              &ldquo;{String(p.alias)}&rdquo;
            </p>
          )}
          <span className="inline-block mt-1 text-[10px] font-typewriter px-1.5 py-0.5 bg-blood-red/15 text-blood-red border border-blood-red/30 rounded-sm">
            {String(p.relationshipStatus || "Person of Interest")}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-[#3a2e21] mt-2 line-clamp-3 leading-snug">
        {String(p.description || "")}
      </p>
      {Boolean(p.notes) && (
        <p className="font-handwriting text-sm text-[#241b12] border-t border-[#bfa682] mt-auto pt-1 truncate">
          Note: {String(p.notes)}
        </p>
      )}
    </CardFrame>
  );
});

export const VictimNode = memo(function VictimNode({ id, data, selected }: NodeProps<CaseFlowNode>) {
  const p = data.payload || {};
  const img = resolveAssetUrl(String(p.imageUrl || "")) || "/images/demo/victim-vance.svg";
  return (
    <CardFrame
      id={id}
      selected={selected}
      data={data}
      tag="VICTIM / SUBJECT"
      variantClass="bg-[#ead7b7] text-[#1a1410] border-blood-red/70"
    >
      <div className="flex gap-2.5 items-start shrink-0">
        <img
          src={img}
          alt={String(p.name || "Victim")}
          crossOrigin={img.startsWith("http") ? "anonymous" : undefined}
          className="w-16 h-20 object-cover grayscale border-2 border-blood-red/60 shrink-0"
        />
        <div className="min-w-0">
          <p className="font-serifVintage text-sm font-bold leading-tight">
            {String(p.name || "Subject Name")}
          </p>
          <p className="text-[11px] text-[#453526] mt-1 line-clamp-2">
            {String(p.description || "")}
          </p>
        </div>
      </div>
      {Boolean(p.details) && (
        <div className="mt-2 p-2 bg-[#f5ebd8]/75 border border-[#b79a72] text-[11px] text-[#2b2117] line-clamp-3">
          {String(p.details)}
        </div>
      )}
    </CardFrame>
  );
});

export const DocumentNode = memo(function DocumentNode({ id, data, selected }: NodeProps<CaseFlowNode>) {
  const p = data.payload || {};
  const img = resolveAssetUrl(String(p.imageUrl || ""));
  return (
    <CardFrame
      id={id}
      selected={selected}
      data={data}
      tag={String(p.docType || "DOCUMENT")}
      variantClass="bg-[#e6d1ab] text-[#1d1712] border-[#8b7252]"
    >
      <div className="flex items-center gap-1.5 mb-1 shrink-0">
        <FileText className="w-3.5 h-3.5 text-blood-red shrink-0" />
        <p className="font-serifVintage text-sm font-bold truncate">{String(p.title || "Document")}</p>
      </div>
      {img && (
        <img
          src={img}
          alt={String(p.title || "Document")}
          crossOrigin={img.startsWith("http") ? "anonymous" : undefined}
          className="w-full h-16 object-cover border border-[#9d8360] mb-1.5 shrink-0"
        />
      )}
      <p className="font-typewriter text-[11px] text-[#35291d] line-clamp-4 leading-relaxed">
        {String(p.excerpt || p.description || "Attach document notes or clipping excerpt...")}
      </p>
    </CardFrame>
  );
});

export const LocationNode = memo(function LocationNode({ id, data, selected }: NodeProps<CaseFlowNode>) {
  const p = data.payload || {};
  const img = resolveAssetUrl(String(p.imageUrl || "")) || "/images/demo/estate-map.svg";
  return (
    <CardFrame id={id} selected={selected} data={data} tag="LOCATION / MAP">
      <div className="flex items-center gap-1.5 mb-1 shrink-0">
        <MapPin className="w-3.5 h-3.5 text-blood-red shrink-0" />
        <p className="font-serifVintage text-sm font-bold truncate">{String(p.title || "Location")}</p>
      </div>
      <div className="h-24 bg-[#d9c49d] border border-[#8e7454] overflow-hidden shrink-0">
        <img
          src={img}
          alt={String(p.title || "Map")}
          crossOrigin={img.startsWith("http") ? "anonymous" : undefined}
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-[11px] text-[#3a2d20] mt-1.5 line-clamp-2">
        {String(p.description || "")}
      </p>
      {Boolean(p.relatedEvidence) && (
        <p className="text-[10px] font-typewriter text-blood-red mt-auto truncate">
          Ref: {String(p.relatedEvidence)}
        </p>
      )}
    </CardFrame>
  );
});

export const ClueNode = memo(function ClueNode({ id, data, selected }: NodeProps<CaseFlowNode>) {
  const p = data.payload || {};
  const status = String(p.verificationStatus || "Unverified");
  const importance = String(p.importance || "Medium");
  return (
    <CardFrame
      id={id}
      selected={selected}
      data={data}
      tag={`CLUE · ${importance.toUpperCase()}`}
      variantClass="bg-[#eedb9e] text-[#1f1911] border-[#a58a4c] torn-paper-edge"
    >
      <p className="font-typewriter text-sm font-bold leading-tight">
        {String(p.title || "Unverified Clue")}
      </p>
      <p className="font-handwriting text-base text-[#2b2216] mt-1.5 line-clamp-4 leading-snug">
        {String(p.details || p.description || "")}
      </p>
      <div className="mt-auto pt-2 flex items-center justify-between text-[10px] font-typewriter border-t border-[#c4af6d]">
        <span>STATUS:</span>
        <span
          className={`px-1.5 py-0.5 rounded-sm ${
            status === "Verified"
              ? "bg-emerald-800 text-cream"
              : "bg-blood-red text-cream"
          }`}
        >
          {status.toUpperCase()}
        </span>
      </div>
    </CardFrame>
  );
});

export const TimelineNode = memo(function TimelineNode({ id, data, selected }: NodeProps<CaseFlowNode>) {
  const p = data.payload || {};
  return (
    <CardFrame
      id={id}
      selected={selected}
      data={data}
      tag="TIMELINE MARKER"
      variantClass="bg-[#f3e5cb] text-[#1a1510] border-[#8b7252]"
    >
      <div className="flex items-center gap-2 text-blood-red font-typewriter text-xs font-bold mb-1">
        <CalendarClock className="w-4 h-4 shrink-0" />
        <span>
          {String(p.eventDate || "1947-10-13")} · {String(p.eventTime || "23:10")}
        </span>
      </div>
      <p className="font-serifVintage text-sm font-bold leading-snug">
        {String(p.title || "Key Event")}
      </p>
      <p className="text-[11px] text-[#3f3123] mt-1.5 line-clamp-4">
        {String(p.description || "")}
      </p>
    </CardFrame>
  );
});

export const BOARD_NODE_TYPES = {
  photograph: PhotographNode,
  suspect: SuspectNode,
  victim: VictimNode,
  document: DocumentNode,
  location: LocationNode,
  clue: ClueNode,
  timeline: TimelineNode,
};
