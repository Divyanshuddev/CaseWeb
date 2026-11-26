"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, Pin, Plus, Search, Trash2, Upload } from "lucide-react";
import {
  boardApi,
  casesApi,
  evidenceApi,
  extractApiError,
  resolveAssetUrl,
} from "@/services/api";
import { useToastStore } from "@/store/toastStore";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";
import { CaseHeaderTabs } from "@/components/ui/CaseHeaderTabs";
import { DeviceImageUpload } from "@/components/ui/DeviceImageUpload";
import type { CaseItem, EvidenceCategory, EvidenceItem, NodeType } from "@/types";

const CATEGORIES: Array<"All" | EvidenceCategory> = [
  "All",
  "Photograph",
  "Document",
  "Physical clue",
  "Digital clue",
  "Location",
  "Witness statement",
  "Other",
];

function categoryToNodeType(cat: string): NodeType {
  if (cat === "Photograph") return "photograph";
  if (cat === "Document" || cat === "Witness statement") return "document";
  if (cat === "Location") return "location";
  return "clue";
}

export default function CaseEvidencePage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;
  const pushToast = useToastStore((s) => s.push);

  const [caseItem, setCaseItem] = useState<CaseItem | null>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [formCategory, setFormCategory] = useState<EvidenceCategory>("Photograph");
  const [description, setDescription] = useState("");
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, ev] = await Promise.all([
        casesApi.get(caseId),
        evidenceApi.list(caseId, {
          category: category !== "All" ? category : undefined,
          q: query.trim() || undefined,
        }),
      ]);
      setCaseItem(c);
      setItems(ev);
    } catch (err) {
      pushToast({ type: "error", title: "Could not load archive", description: extractApiError(err) });
    } finally {
      setLoading(false);
    }
  }, [caseId, category, query, pushToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("category", formCategory);
      fd.append("description", description.trim());
      fd.append("collection_date", collectionDate);
      if (file) {
        fd.append("file", file);
      }
      await evidenceApi.createMultipart(caseId, fd);
      setTitle("");
      setDescription("");
      setFile(null);
      pushToast({ type: "success", title: "Evidence logged to archive" });
      loadData();
    } catch (err) {
      pushToast({ type: "error", title: "Upload failed", description: extractApiError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this evidence item from the archive?")) return;
    try {
      await evidenceApi.delete(id);
      pushToast({ type: "info", title: "Evidence removed" });
      loadData();
    } catch (err) {
      pushToast({ type: "error", title: "Delete failed", description: extractApiError(err) });
    }
  };

  const handlePinToBoard = async (ev: EvidenceItem) => {
    try {
      const nodeType = categoryToNodeType(ev.category);
      const nodeData =
        nodeType === "photograph"
          ? { title: ev.title, caption: ev.description, label: "ARCHIVE EXHIBIT", imageUrl: ev.file_url || "" }
          : nodeType === "document"
            ? { title: ev.title, docType: ev.category, excerpt: ev.description, imageUrl: ev.file_url || "" }
            : nodeType === "location"
              ? { title: ev.title, description: ev.description, imageUrl: ev.file_url || "" }
              : { title: ev.title, details: ev.description, importance: "Medium", verificationStatus: "Unverified" };

      await boardApi.createNode(caseId, {
        evidence_id: ev.id,
        node_type: nodeType,
        position_x: 160 + Math.round(Math.random() * 240),
        position_y: 120 + Math.round(Math.random() * 180),
        rotation: Number(((Math.random() - 0.5) * 6).toFixed(1)),
        node_data: nodeData,
      });
      pushToast({ type: "success", title: "Pinned to investigation board" });
      router.push(`/cases/${caseId}`);
    } catch (err) {
      pushToast({ type: "error", title: "Could not pin evidence", description: extractApiError(err) });
    }
  };

  return (
    <WorkspaceShell activeCaseId={caseId}>
      {caseItem && <CaseHeaderTabs caseItem={caseItem} onUpdated={setCaseItem} />}

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Upload Form */}
        {caseItem && !caseItem.is_demo && (
          <form
            onSubmit={handleUpload}
            className="bg-[#1b1815] border border-[#3a2f24] rounded-sm p-5 space-y-4"
          >
            <div className="flex items-center gap-2 text-paper">
              <Upload className="w-4 h-4 text-blood-red" />
              <h2 className="font-typewriter text-sm uppercase tracking-wider">
                Log New Evidence Item
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Title *
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Exhibit B-03 — Torn Train Ticket"
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as EvidenceCategory)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                >
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Collection Date
                </label>
                <input
                  type="date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Description &amp; Chain Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe where it was recovered and why it matters..."
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>

              <div>
                <DeviceImageUpload
                  mode="file"
                  variant="dark"
                  label="Attach Photo / PDF / TXT (Max 10MB)"
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.md"
                  buttonText="Upload Image / File from Device"
                  selectedFile={file}
                  onFileSelect={setFile}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blood-red hover:bg-[#991e25] text-cream font-typewriter text-xs uppercase rounded-sm"
              >
                <Plus className="w-4 h-4" />
                {submitting ? "Archiving..." : "Add to Evidence Archive"}
              </button>
            </div>
          </form>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-sm font-typewriter text-xs uppercase border ${
                  category === cat
                    ? "bg-blood-red border-blood-red text-cream"
                    : "bg-[#1b1815] border-[#352b22] text-paper/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-muted-gray absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search evidence..."
              className="w-full bg-[#1b1815] border border-[#352b22] rounded-sm pl-9 pr-3 py-1.5 text-sm text-cream"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-56 bg-[#1b1815] animate-pulse rounded-sm" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 bg-[#1b1815] border border-[#352b22] rounded-sm text-center text-sm text-paper/75">
            No evidence items cataloged yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((ev) => {
              const assetUrl = resolveAssetUrl(ev.file_url);
              const isPdf = assetUrl?.toLowerCase().endsWith(".pdf");
              return (
                <div
                  key={ev.id}
                  className="vintage-paper rounded-sm border border-[#7b6244] shadow-xl overflow-hidden flex flex-col text-[#1d1712]"
                >
                  {assetUrl && !isPdf ? (
                    <div className="h-40 bg-[#1a1714] border-b border-[#8e7454]">
                      <img src={assetUrl} alt={ev.title} className="w-full h-full object-cover" />
                    </div>
                  ) : isPdf && assetUrl ? (
                    <a
                      href={assetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-28 bg-[#251f19] text-paper flex flex-col items-center justify-center gap-1 hover:bg-[#312921]"
                    >
                      <FileText className="w-7 h-7 text-blood-red" />
                      <span className="font-typewriter text-xs underline">Open PDF Exhibit</span>
                    </a>
                  ) : null}

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-typewriter uppercase px-2 py-0.5 bg-[#1f1812] text-paper rounded-sm">
                          {ev.category}
                        </span>
                        <span className="text-[11px] font-typewriter text-[#54422f]">
                          {String(ev.metadata?.collectionDate || new Date(ev.created_at).toLocaleDateString())}
                        </span>
                      </div>
                      <h3 className="font-serifVintage text-lg font-bold">{ev.title}</h3>
                      <p className="text-xs text-[#3f3122] mt-1.5">{ev.description}</p>
                    </div>

                    {caseItem && !caseItem.is_demo && (
                      <div className="mt-4 pt-3 border-t border-[#bfa682] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handlePinToBoard(ev)}
                          className="inline-flex items-center gap-1.5 text-xs font-typewriter uppercase text-blood-red font-bold hover:underline"
                        >
                          <Pin className="w-3.5 h-3.5" /> Pin to Corkboard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ev.id)}
                          className="p-1.5 text-blood-red hover:bg-blood-red/15 rounded-sm"
                          title="Delete evidence"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
