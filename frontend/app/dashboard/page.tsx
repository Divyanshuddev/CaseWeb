"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Copy,
  FileText,
  FolderOpen,
  HelpCircle,
  Plus,
  SearchCheck,
} from "lucide-react";
import { casesApi, extractApiError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";
import { CaseCreateModal } from "@/components/ui/CaseCreateModal";
import type { CaseItem, DashboardStats } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  const pushToast = useToastStore((s) => s.push);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [demoCases, setDemoCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const demos = await casesApi.demo();
      setDemoCases(demos);

      if (user) {
        const [dashData, userCases] = await Promise.all([
          casesApi.dashboard(),
          casesApi.list(),
        ]);
        setStats(dashData);
        setCases(userCases);
      } else {
        setStats(null);
        setCases([]);
      }
    } catch (err) {
      setError(extractApiError(err, "Failed to load investigation dashboard."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (initialized) {
      loadDashboard();
    }
  }, [initialized, loadDashboard]);

  const handleCloneDemo = async (demoId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      const cloned = await casesApi.cloneDemo(demoId);
      pushToast({
        type: "success",
        title: "Case cloned to your desk",
        description: `${cloned.case_number} is now editable.`,
      });
      router.push(`/cases/${cloned.id}`);
    } catch (err) {
      pushToast({
        type: "error",
        title: "Clone failed",
        description: extractApiError(err),
      });
    }
  };

  const statCards = stats
    ? [
        { label: "Total Cases", value: stats.total_cases, icon: FolderOpen, accent: "text-paper" },
        {
          label: "Active Investigations",
          value: stats.active_investigations,
          icon: SearchCheck,
          accent: "text-amber-300",
        },
        {
          label: "Evidence Collected",
          value: stats.evidence_collected,
          icon: Archive,
          accent: "text-paper",
        },
        {
          label: "Unresolved Clues",
          value: stats.unresolved_clues,
          icon: HelpCircle,
          accent: "text-blood-red",
        },
        {
          label: "Completed Investigations",
          value: stats.completed_investigations,
          icon: CheckCircle2,
          accent: "text-emerald-400",
        },
      ]
    : [];

  return (
    <WorkspaceShell onCaseCreated={(c) => setCases((prev) => [c, ...prev])}>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2e261f] pb-5">
          <div>
            <p className="font-typewriter text-xs uppercase tracking-[0.22em] text-blood-red">
              Investigation Bureau
            </p>
            <h1 className="font-serifVintage text-3xl font-bold text-cream mt-1">
              {user ? `Detective ${user.full_name || user.username}'s Desk` : "Demo Investigation Desk"}
            </h1>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blood-red hover:bg-[#991e25] text-cream font-typewriter text-xs uppercase tracking-wider rounded-sm transition"
            >
              <Plus className="w-4 h-4" /> Open New Case
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 border border-[#5a4733] text-paper text-xs font-typewriter uppercase rounded-sm hover:bg-[#221c17]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blood-red text-cream text-xs font-typewriter uppercase rounded-sm hover:bg-[#991e25]"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-blood-red/15 border border-blood-red text-cream text-sm rounded-sm">
            {error}
          </div>
        )}

        {/* Metric Cards */}
        {user && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {loading
                ? [1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-28 bg-[#1b1815] border border-[#2f2720] rounded-sm animate-pulse"
                    />
                  ))
                : statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="bg-[#1b1815] border border-[#352b22] rounded-sm p-4 shadow-lg flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-typewriter uppercase tracking-wider text-muted-gray">
                            {card.label}
                          </span>
                          <Icon className={`w-4 h-4 ${card.accent}`} />
                        </div>
                        <p className="font-serifVintage text-3xl font-bold text-cream mt-3">
                          {card.value}
                        </p>
                      </div>
                    );
                  })}
            </div>
          </section>
        )}

        {/* User's Recent Cases */}
        {user && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serifVintage text-xl font-bold text-cream">Recent Case Files</h2>
              <Link href="/cases" className="text-xs font-typewriter text-paper hover:underline">
                View All Cases →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-56 bg-[#1b1815] border border-[#2f2720] animate-pulse" />
                ))}
              </div>
            ) : cases.length === 0 ? (
              <div className="vintage-paper p-7 rounded-sm border border-[#7b6244] text-[#1d1712] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serifVintage text-xl font-bold">No Private Cases Yet</h3>
                  <p className="text-sm text-[#403224] mt-1">
                    Open a blank case folder or clone one of the fictional demo mysteries below to
                    start pinning evidence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="px-4 py-2.5 bg-blood-red text-cream font-typewriter text-xs uppercase rounded-sm shrink-0"
                >
                  Create First Case
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {cases.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="group vintage-paper rounded-sm border border-[#7b6244] shadow-xl overflow-hidden flex flex-col hover:border-blood-red transition"
                  >
                    <div className="h-32 bg-[#1c1814] relative overflow-hidden">
                      <img
                        src={c.thumbnail_url || "/images/demo/manor-thumbnail.svg"}
                        alt={c.title}
                        className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition duration-300"
                      />
                      <span className="absolute top-2.5 left-2.5 font-typewriter text-[11px] px-2 py-0.5 bg-[#151515]/90 text-paper rounded-sm">
                        {c.case_number}
                      </span>
                      <span className="absolute top-2.5 right-2.5 font-typewriter text-[11px] px-2 py-0.5 bg-blood-red text-cream rounded-sm">
                        {c.status}
                      </span>
                    </div>
                    <div className="p-4 text-[#1d1712] flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-serifVintage text-lg font-bold group-hover:text-blood-red transition">
                          {c.title}
                        </h3>
                        <p className="text-xs text-[#4a3a2a] line-clamp-2 mt-1">
                          {c.description || "No briefing notes added."}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#bfa682] flex items-center justify-between text-[11px] font-typewriter text-[#4b3b29]">
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        <span>{c.evidence_count} Evidence · {c.node_count} Pins</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Fictional Sample Cases */}
        <section>
          <div className="mb-4">
            <h2 className="font-serifVintage text-xl font-bold text-cream">
              Sample Fictional Mysteries
            </h2>
            <p className="text-xs text-muted-gray mt-0.5">
              Inspect these pre-built boards anytime, or clone one into your workspace to customize.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {demoCases.map((demo) => (
              <div
                key={demo.id}
                className="bg-[#1b1815] border border-[#3a2f24] rounded-sm p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={demo.thumbnail_url || "/images/demo/manor-thumbnail.svg"}
                    alt={demo.title}
                    className="w-24 h-20 object-cover rounded-sm border border-[#4a3a2c] shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-typewriter text-[11px] text-paper bg-[#29221b] px-2 py-0.5 rounded-sm">
                        {demo.case_number}
                      </span>
                      <span className="font-typewriter text-[11px] text-blood-red">DEMO FILE</span>
                    </div>
                    <h3 className="font-serifVintage text-lg font-bold text-cream mt-1">
                      {demo.title}
                    </h3>
                    <p className="text-xs text-paper/75 mt-1 line-clamp-2">{demo.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2d251d]">
                  <span className="text-xs font-typewriter text-muted-gray">
                    {demo.evidence_count} Evidence · {demo.suspect_count} Suspects ·{" "}
                    {demo.connection_count} Red Strings
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cases/${demo.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#5a4733] text-paper hover:text-cream text-xs font-typewriter uppercase rounded-sm"
                    >
                      <FileText className="w-3.5 h-3.5" /> Inspect Board
                    </Link>
                    {user && (
                      <button
                        type="button"
                        onClick={() => handleCloneDemo(demo.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blood-red hover:bg-[#991e25] text-cream text-xs font-typewriter uppercase rounded-sm"
                      >
                        <Copy className="w-3.5 h-3.5" /> Clone &amp; Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <CaseCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(c) => {
          setCases((prev) => [c, ...prev]);
          loadDashboard();
        }}
      />
    </WorkspaceShell>
  );
}
