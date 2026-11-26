"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderPlus, X } from "lucide-react";
import { casesApi, extractApiError } from "@/services/api";
import { useToastStore } from "@/store/toastStore";
import type { CaseItem } from "@/types";

const caseSchema = z.object({
  case_number: z
    .string()
    .min(2, "Case number must be at least 2 characters")
    .max(64, "Max 64 characters"),
  title: z.string().min(2, "Case title is required").max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["New", "Active", "Under Review", "Solved", "Archived"]),
});

type CaseFormValues = z.infer<typeof caseSchema>;

export function CaseCreateModal({
  open,
  onClose,
  onSuccess,
  editingCase,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (c: CaseItem) => void;
  editingCase?: CaseItem | null;
}) {
  const pushToast = useToastStore((s) => s.push);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      case_number: "",
      title: "",
      description: "",
      status: "New",
    },
  });

  useEffect(() => {
    if (open) {
      if (editingCase) {
        reset({
          case_number: editingCase.case_number,
          title: editingCase.title,
          description: editingCase.description,
          status: editingCase.status,
        });
      } else {
        const year = new Date().getFullYear();
        const code = Math.floor(100 + Math.random() * 900);
        reset({
          case_number: `CW-${year}-${code}`,
          title: "",
          description: "",
          status: "New",
        });
      }
    }
  }, [open, editingCase, reset]);

  if (!open) return null;

  const onSubmit = async (values: CaseFormValues) => {
    try {
      const result = editingCase
        ? await casesApi.update(editingCase.id, {
            case_number: values.case_number,
            title: values.title,
            description: values.description || "",
            status: values.status,
          })
        : await casesApi.create({
            case_number: values.case_number,
            title: values.title,
            description: values.description || "",
            status: values.status,
          });
      pushToast({
        type: "success",
        title: editingCase ? "Case dossier updated" : "New case folder created",
        description: `${result.case_number} — ${result.title}`,
      });
      onSuccess(result);
      onClose();
    } catch (err) {
      pushToast({
        type: "error",
        title: "Could not save case file",
        description: extractApiError(err),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg vintage-paper rounded-sm border-2 border-[#5a452d] shadow-2xl overflow-hidden">
        <div className="bg-[#231d18] text-cream px-5 py-3.5 flex items-center justify-between border-b border-[#4a3a2c]">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-5 h-5 text-blood-red" />
            <h2 className="font-typewriter text-base tracking-wide">
              {editingCase ? "UPDATE CASE DOSSIER" : "OPEN NEW CASE FILE"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-gray hover:text-cream transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 text-[#1e1914]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-typewriter uppercase tracking-wider mb-1">
                Case Number *
              </label>
              <input
                {...register("case_number")}
                className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm font-typewriter focus:outline-none focus:border-blood-red"
                placeholder="CW-2026-104"
              />
              {errors.case_number && (
                <p className="text-xs text-blood-red mt-1">{errors.case_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-typewriter uppercase tracking-wider mb-1">
                Status *
              </label>
              <select
                {...register("status")}
                className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm focus:outline-none focus:border-blood-red"
              >
                <option value="New">New</option>
                <option value="Active">Active</option>
                <option value="Under Review">Under Review</option>
                <option value="Solved">Solved</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-typewriter uppercase tracking-wider mb-1">
              Mystery / Case Title *
            </label>
            <input
              {...register("title")}
              className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm focus:outline-none focus:border-blood-red"
              placeholder="e.g., The Vanishing Clockmaker of Oak Street"
            />
            {errors.title && <p className="text-xs text-blood-red mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-typewriter uppercase tracking-wider mb-1">
              Case Briefing & Scope
            </label>
            <textarea
              {...register("description")}
              rows={4}
              className="w-full px-3 py-2 bg-[#f5ebd8] border border-[#8c7353] rounded-sm text-sm focus:outline-none focus:border-blood-red"
              placeholder="Summarize the fictional mystery, initial leads, and primary questions..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#bfa682]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-[#7c664a] rounded-sm hover:bg-[#d8c199] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-blood-red text-cream rounded-sm hover:bg-[#991e25] transition disabled:opacity-60"
            >
              {isSubmitting ? "Filing..." : editingCase ? "Save Changes" : "Create Case File"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
