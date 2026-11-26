"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pin, Plus, Trash2, UserPlus } from "lucide-react";
import {
  boardApi,
  casesApi,
  extractApiError,
  resolveAssetUrl,
  suspectsApi,
} from "@/services/api";
import { useToastStore } from "@/store/toastStore";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";
import { CaseHeaderTabs } from "@/components/ui/CaseHeaderTabs";
import { DeviceImageUpload } from "@/components/ui/DeviceImageUpload";
import type { CaseItem, SuspectItem } from "@/types";

export default function CaseSuspectsPage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;
  const pushToast = useToastStore((s) => s.push);

  const [caseItem, setCaseItem] = useState<CaseItem | null>(null);
  const [suspects, setSuspects] = useState<SuspectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [relationship, setRelationship] = useState("");
  const [status, setStatus] = useState("Person of Interest");
  const [description, setDescription] = useState("");
  const [alibiNotes, setAlibiNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, list] = await Promise.all([casesApi.get(caseId), suspectsApi.list(caseId)]);
      setCaseItem(c);
      setSuspects(list);
    } catch (err) {
      pushToast({ type: "error", title: "Failed to load suspects", description: extractApiError(err) });
    } finally {
      setLoading(false);
    }
  }, [caseId, pushToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("alias", alias.trim());
      fd.append("relationship_to_case", relationship.trim());
      fd.append("status", status);
      fd.append("description", description.trim());
      fd.append("alibi_notes", alibiNotes.trim());
      if (imageFile) fd.append("image", imageFile);

      await suspectsApi.createMultipart(caseId, fd);
      setName("");
      setAlias("");
      setRelationship("");
      setDescription("");
      setAlibiNotes("");
      setImageFile(null);
      pushToast({ type: "success", title: "Suspect dossier created" });
      loadData();
    } catch (err) {
      pushToast({ type: "error", title: "Could not add suspect", description: extractApiError(err) });
    } finally {
      setSaving(false);
    }
  };

  const handlePin = async (sp: SuspectItem) => {
    try {
      await boardApi.createNode(caseId, {
        node_type: "suspect",
        position_x: 150 + Math.round(Math.random() * 220),
        position_y: 120 + Math.round(Math.random() * 180),
        rotation: -2,
        node_data: {
          suspectId: sp.id,
          name: sp.name,
          alias: sp.alias,
          description: sp.description,
          relationshipStatus: sp.status,
          notes: sp.alibi_notes,
          imageUrl: sp.image_url || "/images/demo/suspect-arthur.svg",
        },
      });
      pushToast({ type: "success", title: `${sp.name} pinned to corkboard` });
      router.push(`/cases/${caseId}`);
    } catch (err) {
      pushToast({ type: "error", title: "Pin failed", description: extractApiError(err) });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this fictional suspect profile?")) return;
    try {
      await suspectsApi.delete(id);
      pushToast({ type: "info", title: "Suspect profile removed" });
      loadData();
    } catch (err) {
      pushToast({ type: "error", title: "Delete failed", description: extractApiError(err) });
    }
  };

  return (
    <WorkspaceShell activeCaseId={caseId}>
      {caseItem && <CaseHeaderTabs caseItem={caseItem} onUpdated={setCaseItem} />}

      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {caseItem && !caseItem.is_demo && (
          <form
            onSubmit={handleCreate}
            className="bg-[#1b1815] border border-[#3a2f24] rounded-sm p-5 space-y-4"
          >
            <div className="flex items-center gap-2 text-paper">
              <UserPlus className="w-4 h-4 text-blood-red" />
              <h2 className="font-typewriter text-sm uppercase tracking-wider">
                Create Fictional Suspect Profile
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Full Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>
              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Alias
                </label>
                <input
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>
              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Relationship to Case
                </label>
                <input
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>
              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                >
                  <option value="Person of Interest">Person of Interest</option>
                  <option value="Primary Subject">Primary Subject</option>
                  <option value="Witness">Witness</option>
                  <option value="Cleared">Cleared</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Background Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>
              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Alibi Notes
                </label>
                <textarea
                  rows={2}
                  value={alibiNotes}
                  onChange={(e) => setAlibiNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>
              <div>
                <DeviceImageUpload
                  mode="file"
                  variant="dark"
                  label="Profile Photo (optional)"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  buttonText="Upload Image from Device"
                  selectedFile={imageFile}
                  onFileSelect={setImageFile}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blood-red hover:bg-[#991e25] text-cream font-typewriter text-xs uppercase rounded-sm"
              >
                <Plus className="w-4 h-4" />
                {saving ? "Saving..." : "Add Suspect Dossier"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-52 bg-[#1b1815] animate-pulse rounded-sm" />
            ))}
          </div>
        ) : suspects.length === 0 ? (
          <div className="p-8 bg-[#1b1815] border border-[#352b22] rounded-sm text-center text-sm text-paper/75">
            No suspect profiles created for this case yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {suspects.map((sp) => {
              const img = resolveAssetUrl(sp.image_url) || "/images/demo/suspect-arthur.svg";
              return (
                <div
                  key={sp.id}
                  className="vintage-paper rounded-sm border border-[#7b6244] shadow-xl p-5 flex gap-4 text-[#1d1712]"
                >
                  <img
                    src={img}
                    alt={sp.name}
                    className="w-24 h-32 object-cover grayscale border border-[#5d4b36] shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-serifVintage text-xl font-bold">{sp.name}</h3>
                          {sp.alias && (
                            <p className="font-typewriter text-xs text-blood-red">
                              Alias: &ldquo;{sp.alias}&rdquo;
                            </p>
                          )}
                        </div>
                        <span className="font-typewriter text-[10px] uppercase px-2 py-0.5 bg-[#1e1813] text-paper rounded-sm">
                          {sp.status}
                        </span>
                      </div>

                      {sp.relationship_to_case && (
                        <p className="text-xs font-semibold text-[#4b3b29] mt-1">
                          Role: {sp.relationship_to_case}
                        </p>
                      )}
                      <p className="text-xs text-[#382b1e] mt-2">{sp.description}</p>
                      {sp.alibi_notes && (
                        <p className="text-xs bg-[#f5ebd8] border border-[#c8b08a] p-2 rounded-sm mt-2">
                          <strong>Alibi:</strong> {sp.alibi_notes}
                        </p>
                      )}
                    </div>

                    {caseItem && !caseItem.is_demo && (
                      <div className="mt-3 pt-2 border-t border-[#bfa682] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handlePin(sp)}
                          className="inline-flex items-center gap-1.5 text-xs font-typewriter uppercase text-blood-red font-bold hover:underline"
                        >
                          <Pin className="w-3.5 h-3.5" /> Pin to Corkboard
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sp.id)}
                          className="p-1.5 text-blood-red hover:bg-blood-red/15 rounded-sm"
                          title="Delete suspect"
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
