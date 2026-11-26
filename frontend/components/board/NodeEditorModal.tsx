"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DeviceImageUpload } from "@/components/ui/DeviceImageUpload";
import type { NodeType } from "@/types";

export interface NodeEditorInitial {
  id?: string;
  nodeType: NodeType;
  rotation: number;
  payload: Record<string, unknown>;
}

export function NodeEditorModal({
  open,
  caseId,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  caseId: string;
  initial: NodeEditorInitial | null;
  onClose: () => void;
  onSubmit: (values: {
    nodeType: NodeType;
    rotation: number;
    payload: Record<string, unknown>;
  }) => Promise<void>;
}) {
  const [nodeType, setNodeType] = useState<NodeType>("clue");
  const [rotation, setRotation] = useState(0);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [extraA, setExtraA] = useState("");
  const [extraB, setExtraB] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !initial) return;
    const p = initial.payload || {};
    setNodeType(initial.nodeType);
    setRotation(initial.rotation || 0);
    setTitle(String(p.title || p.name || ""));
    setSubtitle(String(p.caption || p.alias || p.docType || p.eventDate || ""));
    setDescription(String(p.description || p.details || p.excerpt || ""));
    setImageUrl(String(p.imageUrl || ""));
    setExtraA(
      String(
        p.label ||
          p.relationshipStatus ||
          p.importance ||
          p.eventTime ||
          p.relatedEvidence ||
          ""
      )
    );
    setExtraB(String(p.notes || p.verificationStatus || p.details || ""));
  }, [open, initial]);

  if (!open || !initial) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let payload: Record<string, unknown> = {};
      if (nodeType === "photograph") {
        payload = {
          title: title || "Photograph",
          caption: subtitle,
          label: extraA || "EXHIBIT",
          imageUrl: imageUrl || "/images/demo/study-photo.svg",
        };
      } else if (nodeType === "suspect") {
        payload = {
          name: title || "Suspect",
          alias: subtitle,
          description,
          relationshipStatus: extraA || "Person of Interest",
          notes: extraB,
          imageUrl: imageUrl || "/images/demo/suspect-arthur.svg",
        };
      } else if (nodeType === "victim") {
        payload = {
          name: title || "Victim / Missing Subject",
          description,
          details: extraB,
          imageUrl: imageUrl || "/images/demo/victim-vance.svg",
        };
      } else if (nodeType === "document") {
        payload = {
          title: title || "Document",
          docType: subtitle || "Newspaper Clipping",
          excerpt: description,
          imageUrl: imageUrl || "/images/demo/newspaper-clipping.svg",
        };
      } else if (nodeType === "location") {
        payload = {
          title: title || "Location",
          description,
          relatedEvidence: extraA,
          imageUrl: imageUrl || "/images/demo/estate-map.svg",
        };
      } else if (nodeType === "clue") {
        payload = {
          title: title || "Clue",
          details: description,
          importance: extraA || "Medium",
          verificationStatus: extraB || "Unverified",
        };
      } else if (nodeType === "timeline") {
        payload = {
          title: title || "Timeline Event",
          eventDate: subtitle || new Date().toISOString().slice(0, 10),
          eventTime: extraA || "12:00",
          description,
        };
      }

      await onSubmit({ nodeType, rotation, payload });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg vintage-paper rounded-sm border-2 border-[#5a452d] shadow-2xl overflow-hidden text-[#1e1914]">
        <div className="bg-[#231d18] text-cream px-5 py-3 flex items-center justify-between">
          <h3 className="font-typewriter text-sm uppercase tracking-wider">
            {initial.id ? `EDIT ${nodeType.toUpperCase()} CARD` : `PIN NEW ${nodeType.toUpperCase()} CARD`}
          </h3>
          <button type="button" onClick={onClose} className="text-muted-gray hover:text-cream">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-3.5 text-sm">
          <div>
            <label className="block text-xs font-typewriter uppercase mb-1">
              {nodeType === "suspect" || nodeType === "victim" ? "Name *" : "Title *"}
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm"
            />
          </div>

          {nodeType !== "victim" && nodeType !== "location" && nodeType !== "clue" && (
            <div>
              <label className="block text-xs font-typewriter uppercase mb-1">
                {nodeType === "photograph"
                  ? "Caption"
                  : nodeType === "suspect"
                    ? "Alias"
                    : nodeType === "document"
                      ? "Document Type (Clipping / Note / PDF)"
                      : "Event Date (YYYY-MM-DD)"}
              </label>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm"
              />
            </div>
          )}

          {nodeType !== "photograph" && (
            <div>
              <label className="block text-xs font-typewriter uppercase mb-1">
                {nodeType === "document" ? "Excerpt / Notes" : "Description / Details"}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nodeType !== "victim" && nodeType !== "document" && (
              <div>
                <label className="block text-xs font-typewriter uppercase mb-1">
                  {nodeType === "photograph"
                    ? "Exhibit Label"
                    : nodeType === "suspect"
                      ? "Status"
                      : nodeType === "location"
                        ? "Related Evidence"
                        : nodeType === "clue"
                          ? "Importance (Low/Medium/High)"
                          : "Event Time (HH:MM)"}
                </label>
                <input
                  value={extraA}
                  onChange={(e) => setExtraA(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm"
                />
              </div>
            )}

            {(nodeType === "suspect" || nodeType === "victim" || nodeType === "clue") && (
              <div>
                <label className="block text-xs font-typewriter uppercase mb-1">
                  {nodeType === "clue"
                    ? "Verification (Verified / Unverified)"
                    : nodeType === "victim"
                      ? "Important Details"
                      : "Investigator Notes"}
                </label>
                <input
                  value={extraB}
                  onChange={(e) => setExtraB(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm"
                />
              </div>
            )}
          </div>

          {nodeType !== "clue" && nodeType !== "timeline" && (
            <DeviceImageUpload
              caseId={caseId}
              variant="paper"
              label="Card Image (optional)"
              buttonText="Upload Image from Device"
              value={imageUrl}
              onChange={setImageUrl}
              onUploadingChange={setUploadingImage}
              placeholder="/images/demo/study-photo.svg or uploaded /uploads/..."
            />
          )}

          <div>
            <label className="block text-xs font-typewriter uppercase mb-1">
              Pin Tilt ({rotation}°)
            </label>
            <input
              type="range"
              min={-15}
              max={15}
              step={0.5}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full accent-blood-red"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#bfa682]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs uppercase border border-[#7c664a] rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="px-4 py-2 text-xs uppercase bg-blood-red text-cream rounded-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Pinning..." : "Save Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
