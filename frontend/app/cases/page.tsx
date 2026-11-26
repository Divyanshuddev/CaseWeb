"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, Edit3, FolderPlus, Search, Trash2 } from "lucide-react";
import { casesApi, extractApiError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";
import { CaseCreateModal } from "@/components/ui/CaseCreateModal";
import type { CaseItem } from "@/types";

const STATUS_FILTERS = ["All", "New", "Active", "Under Review", "Solved", "Archived"] as const;

export default function CasesPage() {
  const { user, initialized } = useAuthStore();
  const pushToast = useToastStore((s) => s.push);

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [demoCases, setDemoCases] = useState<CaseItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseItem | null>(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const demos = await casesApi.demo();
      setDemoCases(demos);
      if (user) {
        const list = await casesApi.list({
          status: statusFilter !== "All" ? statusFilter : undefined,
          q: query.trim() || undefined,
        });
        setCases(list);
      } else {
        setCases([]);
      }
    } catch (err) {
      pushToast({ type: "error", title: "Could not load cases", description: extractApiError(err) });
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, query, pushToast]);

  useEffect(() => {
    if (initialized) {
      loadCases();
    }
  }, [initialized, loadCases]);

  const handleArchive = async (item: CaseItem) => {
    try {
      await casesApi.update(item.id, { status: "Archived" });
      pushToast({ type: "info", title: `Archived ${item.case_number}` });
      loadCases();
    } catch (err) {
      pushToast({ type: "error", title: "Archive failed", description: extractApiError(err) });
    }
  };

  const handleDelete = async (item: CaseItem) => {
    if (!window.confirm(`Permanently delete case "${item.title}" and all its evidence?`)) return;
    try {
      await casesApi.delete(item.id);
      pushToast({ type: "success", title: `Deleted ${item.case_number}` });
      loadCases();
    } catch (err) {
      pushToast({ type: "error", title: "Delete failed", description: extractApiError(err) });
    }
  };

  return (
    <WorkspaceShell onCaseCreated={() => loadCases()}>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2e261f] pb-5">
          <div>
            <p className="font-typewriter text-xs uppercase tracking-[0.22em] text-blood-red">
              Case Registry
            </p>
            <h1 className="font-serifVintage text-3xl font-bold text-cream mt-1">
              My Investigations
            </h1>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => {
                setEditingCase(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blood-red hover:bg-[#991e25] text-cream font-typewriter text-xs uppercase tracking-wider rounded-sm transition"
            >
              <FolderPlus className="w-4 h-4" /> Create Case
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-sm font-typewriter text-xs uppercase transition border ${
                  statusFilter === st
                    ? "bg-blood-red border-blood-red text-cream"
                    : "bg-[#1b1815] border-[#352b22] text-paper/80 hover:border-paper/50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-muted-gray absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by title or case #..."
              className="w-full bg-[#1b1815] border border-[#352b22] rounded-sm pl-9 pr-3 py-1.5 text-sm text-cream focus:outline-none focus:border-paper"
            />
          </div>
        </div>

        {!user ? (
          <div className="bg-[#1b1815] border border-[#352b22] rounded-sm p-6 text-center space-y-3">
            <p className="text-sm text-paper">
              Sign in or register to create and persist your own private case boards. Meanwhile,
              browse our sample mysteries below.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 border border-[#5a4733] text-xs font-typewriter uppercase rounded-sm"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blood-red text-xs font-typewriter uppercase rounded-sm"
              >
                Register
              </Link>
            </div>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 bg-[#1b1815] border border-[#2f2720] animate-pulse" />
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-[#1b1815] border border-[#352b22] rounded-sm p-8 text-center text-sm text-paper/80">
            No cases match the current filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cases.map((c) => (
              <div
                key={c.id}
                className="vintage-paper rounded-sm border border-[#7b6244] shadow-xl overflow-hidden flex flex-col text-[#1c1611]"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-typewriter text-xs px-2 py-0.5 bg-[#1e1813] text-paper rounded-sm">
                      {c.case_number}
                    </span>
                    <span className="font-typewriter text-xs px-2 py-0.5 bg-blood-red/15 text-blood-red border border-blood-red/30 rounded-sm">
                      {c.status}
                    </span>
                  </div>
                  <Link href={`/cases/${c.id}`}>
                    <h2 className="font-serifVintage text-xl font-bold hover:text-blood-red transition">
                      {c.title}
                    </h2>
                  </Link>
                  <p className="text-xs text-[#453626] mt-2 line-clamp-3">
                    {c.description || "No case summary provided."}
                  </p>
                </div>

                <div className="px-5 py-3 bg-[#dcc49a] border-t border-[#bfa682] flex items-center justify-between text-xs">
                  <Link
                    href={`/cases/${c.id}`}
                    className="font-typewriter font-bold uppercase text-blood-red hover:underline"
                  >
                    Open Corkboard →
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCase(c);
                        setModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-[#cbb082] rounded-sm"
                      title="Edit case"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {c.status !== "Archived" && (
                      <button
                        type="button"
                        onClick={() => handleArchive(c)}
                        className="p-1.5 hover:bg-[#cbb082] rounded-sm"
                        title="Archive case"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="p-1.5 hover:bg-blood-red/20 text-blood-red rounded-sm"
                      title="Delete case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Demo Cases Reference */}
        {demoCases.length > 0 && (
          <div className="pt-6 border-t border-[#2e261f]">
            <h2 className="font-serifVintage text-lg font-bold text-paper mb-3">
              Reference Demo Files
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {demoCases.map((d) => (
                <Link
                  key={d.id}
                  href={`/cases/${d.id}`}
                  className="bg-[#1b1815] border border-[#332a21] hover:border-paper/60 p-4 rounded-sm flex items-center justify-between gap-4 transition"
                >
                  <div>
                    <span className="font-typewriter text-[11px] text-paper">{d.case_number}</span>
                    <h3 className="font-serifVintage text-base font-bold text-cream">{d.title}</h3>
                  </div>
                  <span className="font-typewriter text-xs text-blood-red shrink-0">Inspect →</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <CaseCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingCase={editingCase}
        onSuccess={() => loadCases()}
      />
    </WorkspaceShell>
  );
}
