"use client";

import { Trash2, X } from "lucide-react";
import { Spinner } from "@/components/Spinner";

export function BulkActionsBar({
  count,
  deleting,
  onDelete,
  onClear,
}: {
  count: number;
  deleting: boolean;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
      <span className="text-sm font-medium text-slate-700">{count} selected</span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost" onClick={onClear}>
          <X size={14} /> Clear
        </button>
        <button className="btn-danger" onClick={onDelete} disabled={deleting}>
          {deleting ? <Spinner className="border-white/30 border-t-white" /> : <Trash2 size={14} />}
          Delete {count === 1 ? "sample" : `${count} samples`}
        </button>
      </div>
    </div>
  );
}