"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, Upload, XCircle, AlertTriangle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Spinner } from "@/components/Spinner";
import type { BulkImportPreviewResponse, BulkImportRow, BulkImportCommitResponse } from "@/lib/types";

type Stage = "upload" | "reviewing" | "committing" | "done";

export default function BulkImportPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<BulkImportPreviewResponse | null>(null);
  const [excludedRows, setExcludedRows] = useState<Set<string>>(new Set()); // key: `${sheet}:${row_number}`
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<BulkImportCommitResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function rowKey(row: BulkImportRow) {
    return `${row.sheet}:${row.row_number}`;
  }

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setStage("reviewing");
    setPreview(null);
    try {
      const res: BulkImportPreviewResponse = await api.uploadOne("/samples/bulk-import/preview", "file", file);
      setPreview(res);
      // Rows the parser already flagged start out excluded, so "Import"
      // only ever submits rows that are ready to go -- the user opts a
      // fixed-elsewhere row back in by re-uploading a corrected file.
      setExcludedRows(new Set(res.rows.filter((r) => r.errors.length > 0).map(rowKey)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't read that file.");
      setStage("upload");
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function toggleRow(row: BulkImportRow) {
    if (row.errors.length > 0) return; // can't include a row that still has errors
    setExcludedRows((prev) => {
      const next = new Set(prev);
      const key = rowKey(row);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleCommit() {
    if (!preview) return;
    const rowsToImport = preview.rows.filter((r) => r.errors.length === 0 && !excludedRows.has(rowKey(r)));
    if (rowsToImport.length === 0) return;

    setStage("committing");
    setError(null);
    try {
      const res: BulkImportCommitResponse = await api.post("/samples/bulk-import/commit", {
        rows: rowsToImport.map((r) => ({
          row_number: r.row_number,
          sheet: r.sheet,
          subject_code: r.subject_code,
          sample_code: r.sample_code,
          sample_type: r.sample_type,
          collection_date: r.collection_date,
          data: r.data,
        })),
      });
      setResult(res);
      setStage("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed.");
      setStage("reviewing");
    }
  }

  function reset() {
    setStage("upload");
    setFileName(null);
    setPreview(null);
    setExcludedRows(new Set());
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const readyCount = preview ? preview.rows.filter((r) => r.errors.length === 0 && !excludedRows.has(rowKey(r))).length : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Bulk import from Excel</h1>
        <p className="mt-1 text-sm text-ink-400">
          Upload a filled-in copy of the sample template to add many samples at once, instead of entering them one by one.
        </p>
      </div>

      {stage === "upload" && (
        <div
          className={`card flex flex-col items-center justify-center gap-3 border-2 border-dashed py-16 text-center transition-colors ${
            dragOver ? "border-brand bg-brand/5" : "border-line"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FileSpreadsheet size={32} className="text-ink-400" />
          <div>
            <p className="text-sm font-medium text-ink">Drag and drop your .xlsx file here</p>
            <p className="mt-1 text-xs text-ink-400">Or click below to browse. Max 10MB.</p>
          </div>
          <label className="btn-primary mt-2 cursor-pointer">
            <Upload size={14} /> Choose file
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}

      {stage === "reviewing" && !preview && (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Spinner />
          <p className="text-sm text-ink-400">Reading {fileName}…</p>
        </div>
      )}

      {preview && (stage === "reviewing" || stage === "committing") && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet size={16} className="text-ink-400" />
              <span className="font-medium text-ink">{fileName}</span>
              <span className="text-ink-400">
                &middot; {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"} found
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 size={14} /> {readyCount} ready
              </span>
              {preview.error_count > 0 && (
                <span className="flex items-center gap-1 text-danger">
                  <XCircle size={14} /> {preview.error_count} need attention
                </span>
              )}
              <button type="button" className="btn-ghost" onClick={reset}>
                Upload a different file
              </button>
            </div>
          </div>

          {preview.unmapped_columns.length > 0 && (
            <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">
                  {preview.unmapped_columns.length} column{preview.unmapped_columns.length === 1 ? "" : "s"} couldn&apos;t be matched to a known field, so
                  {preview.unmapped_columns.length === 1 ? " its" : " their"} data was skipped:
                </span>{" "}
                {preview.unmapped_columns.join(", ")}
              </div>
            </div>
          )}

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                  <th className="w-10 px-3 py-2.5"></th>
                  <th className="px-3 py-2.5">Row</th>
                  <th className="px-3 py-2.5">Subject ID</th>
                  <th className="px-3 py-2.5">Sample ID</th>
                  <th className="px-3 py-2.5">Sample Type</th>
                  <th className="px-3 py-2.5">Collected</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((row) => {
                  const key = rowKey(row);
                  const hasErrors = row.errors.length > 0;
                  const excluded = excludedRows.has(key);
                  return (
                    <tr key={key} className={hasErrors ? "bg-dangerSoft/40" : excluded ? "opacity-50" : ""}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!hasErrors && !excluded}
                          disabled={hasErrors}
                          onChange={() => toggleRow(row)}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-ink-400">
                        {row.sheet} #{row.row_number}
                      </td>
                      <td className="px-3 py-2 font-mono">{row.subject_code ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{row.sample_code ?? "—"}</td>
                      <td className="px-3 py-2">{row.sample_type ?? "—"}</td>
                      <td className="px-3 py-2">{row.collection_date ?? "—"}</td>
                      <td className="px-3 py-2">
                        {hasErrors ? (
                          <span className="text-xs text-danger">{row.errors.join("; ")}</span>
                        ) : (
                          <span className="text-xs text-emerald-600">Ready</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && <div className="rounded border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</div>}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button type="button" className="btn-secondary" onClick={reset}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={readyCount === 0 || stage === "committing"} onClick={handleCommit}>
              {stage === "committing" ? (
                <>
                  <Spinner className="border-white/30 border-t-white" /> Importing…
                </>
              ) : (
                `Import ${readyCount} sample${readyCount === 1 ? "" : "s"}`
              )}
            </button>
          </div>
        </div>
      )}

      {stage === "done" && result && (
        <div className="card space-y-4 p-6 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-ink">
              Imported {result.created} sample{result.created === 1 ? "" : "s"}
              {result.failed > 0 ? `, ${result.failed} failed` : ""}.
            </p>
          </div>
          {result.failed > 0 && (
            <div className="mx-auto max-w-md text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Failed rows</p>
              <ul className="space-y-1 text-sm">
                {result.results
                  .filter((r) => r.status === "failed")
                  .map((r) => (
                    <li key={`${r.sheet}:${r.row_number}`} className="text-danger">
                      {r.sheet} #{r.row_number} ({r.sample_code}): {r.error}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <div className="flex justify-center gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={reset}>
              Import another file
            </button>
            <button type="button" className="btn-primary" onClick={() => router.push("/site/inventory")}>
              Go to inventory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
