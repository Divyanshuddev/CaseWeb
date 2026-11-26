"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { casesApi, extractApiError } from "@/services/api";
import { WorkspaceShell } from "@/components/ui/WorkspaceShell";
import { CaseHeaderTabs } from "@/components/ui/CaseHeaderTabs";
import { InvestigationBoardWorkspace } from "@/components/board/InvestigationBoardWorkspace";
import type { CaseItem } from "@/types";

export default function CaseBoardPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;
  const [caseItem, setCaseItem] = useState<CaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    casesApi
      .get(caseId)
      .then((res) => {
        if (active) setCaseItem(res);
      })
      .catch((err) => {
        if (active) setError(extractApiError(err, "Could not open case dossier."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [caseId]);

  return (
    <WorkspaceShell activeCaseId={caseId}>
      {loading ? (
        <div className="p-8 text-center font-typewriter text-sm text-paper">
          Opening case dossier...
        </div>
      ) : error || !caseItem ? (
        <div className="p-8 max-w-xl mx-auto text-center space-y-2">
          <p className="text-blood-red font-typewriter">{error || "Case not found."}</p>
        </div>
      ) : (
        <div className="flex flex-col">
          <CaseHeaderTabs caseItem={caseItem} onUpdated={setCaseItem} />
          <InvestigationBoardWorkspace caseItem={caseItem} />
        </div>
      )}
    </WorkspaceShell>
  );
}
