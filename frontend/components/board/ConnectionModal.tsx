"use client";

import { useEffect, useState } from "react";
import { GitBranch, X } from "lucide-react";

export function ConnectionModal({
  open,
  initialLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialLabel: string;
  onClose: () => void;
  onSubmit: (label: string) => Promise<void>;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setLabel(initialLabel);
  }, [open, initialLabel]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(label.trim() || "Investigator hypothesis");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md vintage-paper rounded-sm border-2 border-[#5a452d] shadow-2xl overflow-hidden text-[#1e1914]">
        <div className="bg-[#231d18] text-cream px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blood-red" />
            <h3 className="font-typewriter text-sm uppercase tracking-wider">
              Red-String Hypothesis
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-gray hover:text-cream">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-[#4a3a2a] bg-[#f5ebd8] p-2.5 border border-[#c6ad86] rounded-sm">
            Red strings represent investigator-created hypotheses and leads—never automated
            determinations of guilt.
          </p>
          <div>
            <label className="block text-xs font-typewriter uppercase mb-1">
              Relationship Description
            </label>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Hypothesis: Witnessed near Boathouse at 11:40 PM"
              className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs uppercase border border-[#7c664a] rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs uppercase bg-blood-red text-cream rounded-sm font-semibold"
            >
              {saving ? "Threading..." : "Save Thread"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
