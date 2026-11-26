"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, Clock, Copy, GitBranch, Users } from "lucide-react";
import { casesApi, extractApiError } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { CaseItem, CaseStatus } from "@/types";

export function CaseHeaderTabs({
  caseItem,
  onUpdated,
}: {
  caseItem: CaseItem;
  onUpdated?: (next: CaseItem) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const pushToast = useToastStore((s) => s.push);

  const tabs = [
    { label: "Investigation Board", href: `/cases/${caseItem.id}`, icon: GitBranch },
    { label: "Evidence Archive", href: `/cases/${caseItem.id}/evidence`, icon: Archive },
    { label: "Suspects", href: `/cases/${caseItem.id}/suspects`, icon: Users },
    { label: "Timeline", href: `/cases/${caseItem.id}/timeline`, icon: Clock },
  ];

  const handleStatusChange = async (nextStatus: CaseStatus) => {
    try {
      const updated = await casesApi.update(caseItem.id, { status: nextStatus });
      pushToast({ type: "success", title: `Case status updated to ${nextStatus}` });
      onUpdated?.(updated);
    } catch (err) {
      pushToast({ type: "error", title: "Could not update status", description: extractApiError(err) });
    }
  };

  const handleClone = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      const cloned = await casesApi.cloneDemo(caseItem.id);
      pushToast({
        type: "success",
        title: "Demo case cloned",
        description: `Created editable copy ${cloned.case_number}`,
      });
      router.push(`/cases/${cloned.id}`);
    } catch (err) {
      pushToast({ type: "error", title: "Clone failed", description: extractApiError(err) });
    }
  };

  return (
    <div className="bg-[#161310] border-b border-[#2e261f] px-4 lg:px-6 pt-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-typewriter text-xs px-2 py-0.5 bg-[#26201a] text-paper border border-[#4a3a2c] rounded-sm">
              {caseItem.case_number}
            </span>
            {caseItem.is_demo && (
              <span className="font-typewriter text-[11px] px-2 py-0.5 bg-blood-red/20 text-blood-red border border-blood-red/40 rounded-sm">
                DEMO READ-ONLY
              </span>
            )}
          </div>
          <h1 className="font-serifVintage text-2xl font-bold text-cream mt-1">
            {caseItem.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {caseItem.is_demo ? (
            <button
              type="button"
              onClick={handleClone}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blood-red hover:bg-[#991e25] text-cream font-typewriter text-xs uppercase rounded-sm transition"
            >
              <Copy className="w-3.5 h-3.5" />
              {user ? "Clone to My Workspace" : "Sign In to Clone & Edit"}
            </button>
          ) : (
            <select
              value={caseItem.status}
              onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
              className="bg-[#211c17] border border-[#47382b] text-paper text-xs font-typewriter uppercase px-3 py-1.5 rounded-sm focus:outline-none focus:border-blood-red"
            >
              <option value="New">Status: New</option>
              <option value="Active">Status: Active</option>
              <option value="Under Review">Status: Under Review</option>
              <option value="Solved">Status: Solved</option>
              <option value="Archived">Status: Archived</option>
            </select>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-typewriter uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
                active
                  ? "border-blood-red text-cream bg-[#1e1914]"
                  : "border-transparent text-paper/70 hover:text-cream hover:bg-[#1a1612]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-blood-red" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
