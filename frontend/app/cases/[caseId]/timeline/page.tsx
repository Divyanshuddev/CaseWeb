"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Pin, Plus, Trash2 } from "lucide-react";
import { boardApi, casesApi, evidenceApi, extractApiError, resolveAssetUrl, timelineApi } from "@/services/api";
import { useToastStore } from "@/store/toastStore";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";
import { CaseHeaderTabs } from "@/components/ui/CaseHeaderTabs";
import { DeviceImageUpload } from "@/components/ui/DeviceImageUpload";
import type { CaseItem, EvidenceItem, TimelineEventItem } from "@/types";

export default function CaseTimelinePage() {
  const params = useParams<{ caseId: string }>();
  const router = useRouter();
  const caseId = params.caseId;
  const pushToast = useToastStore((s) => s.push);

  const [caseItem, setCaseItem] = useState<CaseItem | null>(null);
  const [events, setEvents] = useState<TimelineEventItem[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("1947-10-13");
  const [eventTime, setEventTime] = useState("23:00");
  const [description, setDescription] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, tl, ev] = await Promise.all([
        casesApi.get(caseId),
        timelineApi.list(caseId),
        evidenceApi.list(caseId),
      ]);
      setCaseItem(c);
      setEvents(tl);
      setEvidence(ev);
    } catch (err) {
      pushToast({ type: "error", title: "Failed to load timeline", description: extractApiError(err) });
    } finally {
      setLoading(false);
    }
  }, [caseId, pushToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await timelineApi.create(caseId, {
        title: title.trim(),
        description: description.trim(),
        event_date: eventDate,
        event_time: eventTime,
        evidence_id: evidenceId || null,
        image_url: imageUrl.trim() || null,
      });
      setTitle("");
      setDescription("");
      setEvidenceId("");
      setImageUrl("");
      pushToast({ type: "success", title: "Timeline event logged" });
      loadData();
    } catch (err) {
      pushToast({ type: "error", title: "Could not add event", description: extractApiError(err) });
    } finally {
      setSaving(false);
    }
  };

  const handlePin = async (ev: TimelineEventItem) => {
    try {
      await boardApi.createNode(caseId, {
        evidence_id: ev.evidence_id || null,
        node_type: "timeline",
        position_x: 180 + Math.round(Math.random() * 240),
        position_y: 120 + Math.round(Math.random() * 180),
        rotation: 1,
        node_data: {
          title: ev.title,
          eventDate: ev.event_date,
          eventTime: ev.event_time,
          description: ev.description,
        },
      });
      pushToast({ type: "success", title: "Timeline event pinned to board" });
      router.push(`/cases/${caseId}`);
    } catch (err) {
      pushToast({ type: "error", title: "Pin failed", description: extractApiError(err) });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this timeline entry?")) return;
    try {
      await timelineApi.delete(id);
      pushToast({ type: "info", title: "Timeline entry removed" });
      loadData();
    } catch (err) {
      pushToast({ type: "error", title: "Delete failed", description: extractApiError(err) });
    }
  };

  return (
    <WorkspaceShell activeCaseId={caseId}>
      {caseItem && <CaseHeaderTabs caseItem={caseItem} onUpdated={setCaseItem} />}

      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        {caseItem && !caseItem.is_demo && (
          <form
            onSubmit={handleCreate}
            className="bg-[#1b1815] border border-[#3a2f24] rounded-sm p-5 space-y-4"
          >
            <div className="flex items-center gap-2 text-paper">
              <CalendarClock className="w-4 h-4 text-blood-red" />
              <h2 className="font-typewriter text-sm uppercase tracking-wider">
                Record Chronological Event
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Event Title *
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>
              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>
              <div>
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  required
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-typewriter uppercase text-paper/80 mb-1">
                  Event Notes
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
                  Linked Evidence (Optional)
                </label>
                <select
                  value={evidenceId}
                  onChange={(e) => setEvidenceId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#12100e] border border-[#3d3126] rounded-sm text-sm text-cream"
                >
                  <option value="">None</option>
                  {evidence.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DeviceImageUpload
              caseId={caseId}
              variant="dark"
              label="Event Image (optional)"
              buttonText="Upload Image from Device"
              value={imageUrl}
              onChange={setImageUrl}
              onUploadingChange={setUploadingImage}
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blood-red hover:bg-[#991e25] text-cream font-typewriter text-xs uppercase rounded-sm disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {saving ? "Logging..." : "Add Timeline Marker"}
              </button>
            </div>
          </form>
        )}

        {/* Chronological List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-[#1b1815] animate-pulse rounded-sm" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 bg-[#1b1815] border border-[#352b22] rounded-sm text-center text-sm text-paper/75">
            No timeline events logged yet.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-blood-red/60 space-y-5">
            {events.map((ev) => {
              const linkedEv = evidence.find((e) => e.id === ev.evidence_id);
              return (
                <div
                  key={ev.id}
                  className={`relative vintage-paper rounded-sm border p-5 shadow-xl text-[#1d1712] ${
                    ev.has_conflict ? "border-blood-red ring-2 ring-blood-red/50" : "border-[#7b6244]"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full absolute -left-[32px] top-6 border-2 border-charcoal ${
                      ev.has_conflict ? "bg-amber-400" : "bg-blood-red"
                    }`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 font-typewriter text-xs">
                      <span className="px-2 py-0.5 bg-[#1e1813] text-paper rounded-sm">
                        {ev.event_date} · {ev.event_time}
                      </span>
                      {ev.has_conflict && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blood-red text-cream rounded-sm">
                          <AlertTriangle className="w-3 h-3" /> CONFLICTING TIMESTAMP
                        </span>
                      )}
                    </div>

                    {caseItem && !caseItem.is_demo && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePin(ev)}
                          className="inline-flex items-center gap-1 text-xs font-typewriter uppercase text-blood-red font-bold hover:underline"
                        >
                          <Pin className="w-3.5 h-3.5" /> Pin
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ev.id)}
                          className="p-1 text-blood-red hover:bg-blood-red/15 rounded-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-serifVintage text-lg font-bold">{ev.title}</h3>
                  <p className="text-sm text-[#3d3023] mt-1">{ev.description}</p>

                  {resolveAssetUrl(ev.image_url) && (
                    <div className="mt-3 max-w-xs border border-[#8e7454] bg-[#1a1714] rounded-sm overflow-hidden">
                      <img
                        src={resolveAssetUrl(ev.image_url) || ""}
                        alt={ev.title}
                        className="w-full h-36 object-cover"
                      />
                    </div>
                  )}

                  {linkedEv && (
                    <p className="mt-2 text-xs font-typewriter text-[#54422f]">
                      Linked Evidence: {linkedEv.title} ({linkedEv.category})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
