"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Plus, Upload, Download, FileText, Image as ImageIcon, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useFieldDefinitions } from "@/lib/useFieldDefinitions";
import { DynamicFieldInput } from "@/components/DynamicFieldInput";
import { AddFieldModal } from "@/components/AddFieldModal";
import { Spinner } from "@/components/Spinner";
import { sampleTypeChipClass, formatDate, formatBytes } from "@/lib/format";
import { SAMPLE_TYPES } from "@/lib/types";
import type { Report, Sample, FieldDefinition } from "@/lib/types";

export function SampleDetail({
  sampleId,
  backHref,
  canDelete,
}: {
  sampleId: string;
  backHref: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { fields, reload: reloadFields } = useFieldDefinitions();
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadFailedNotice, setUploadFailedNotice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("reportUploadFailed") === "1") {
      setUploadFailedNotice(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const [form, setForm] = useState<{ subject_code: string; sample_code: string; sample_type: string; collection_date: string; data: Record<string, unknown> }>({
    subject_code: "",
    sample_code: "",
    sample_type: "",
    collection_date: "",
    data: {},
  });

  async function loadSample() {
    setLoading(true);
    setLoadError(null);
    try {
      const s = await api.get(`/samples/${sampleId}`);
      setSample(s);
      setForm({
        subject_code: s.subject_code ?? "",
        sample_code: s.sample_code,
        sample_type: s.sample_type,
        collection_date: s.collection_date ?? "",
        data: s.data ?? {},
      });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        setNotFound(true);
      } else {
        // Anything else (expired session, network failure, 500, a bad id, ...)
        // is a real error -- surface it instead of silently claiming "not found".
        setLoadError(err instanceof ApiError ? err.message : "Failed to load this sample. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleId]);

  const fieldByKey = useMemo(() => Object.fromEntries(fields.map((f) => [f.field_key, f])), [fields]);

  const groupedDataKeys = useMemo(() => {
    const source = editing ? form.data : sample?.data ?? {};
    const groups: Record<string, string[]> = {};
    for (const key of Object.keys(source)) {
      const section = fieldByKey[key]?.section || "Additional details";
      groups[section] = groups[section] ?? [];
      groups[section].push(key);
    }
    return groups;
  }, [editing, form.data, sample, fieldByKey]);

  async function handleRemoveField(key: string, def?: FieldDefinition) {
    const label = def?.field_label ?? key;
    const message = def
      ? `Remove "${label}" from the form? Existing samples keep their saved value; this just stops it from being offered going forward.`
      : `Remove the "${label}" value from this sample?`;
    if (!confirm(message)) return;

    if (def) {
      try {
        await api.delete(`/field-definitions/${def.id}`);
        reloadFields();
      } catch (err) {
        alert(err instanceof ApiError ? err.message : "Failed to remove field");
        return;
      }
    }

    setForm((f) => {
      const next = { ...f.data };
      delete next[key];
      return { ...f, data: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch(`/samples/${sampleId}`, {
        subject_code: form.subject_code,
        sample_code: form.sample_code,
        sample_type: form.sample_type,
        collection_date: form.collection_date || null,
        data: form.data,
      });
      setSample(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this sample? This can only be undone by an admin restoring the database record.")) return;
    await api.delete(`/samples/${sampleId}`);
    router.push(backHref);
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  if (loadError) {
    return (
      <div className="card flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-danger">Couldn&apos;t load this sample</p>
        <p className="max-w-sm text-xs text-ink-400">{loadError}</p>
        <div className="mt-3 flex gap-2">
          <button className="btn-secondary" onClick={() => router.push(backHref)}>Back to inventory</button>
          <button className="btn-primary" onClick={loadSample}>Retry</button>
        </div>
      </div>
    );
  }

  if (notFound || !sample) {
    return (
      <div className="card flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-ink">Sample not found</p>
        <p className="text-xs text-ink-400">It may have been removed, or you don&apos;t have access to it.</p>
        <button className="btn-secondary mt-3" onClick={() => router.push(backHref)}>Back to inventory</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <button className="btn-ghost -ml-2 mb-4" onClick={() => router.push(backHref)}>
        <ArrowLeft size={15} /> Back
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-ink">{sample.sample_code}</h1>
            <span className={`chip ${sampleTypeChipClass(sample.sample_type)}`}>{sample.sample_type}</span>
          </div>
          {sample.subject_code && (
            <p className="mt-0.5 text-sm text-ink-400">Subject <span className="font-mono text-ink-600">{sample.subject_code}</span></p>
          )}
          <p className="mt-1 text-sm text-ink-400">Collected {formatDate(sample.collection_date)} · Added {formatDate(sample.created_at)}</p>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit
            </button>
          )}
          {canDelete && (
            <button className="btn-danger" onClick={handleDelete}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Sample information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Subject ID</label>
                <input className="input font-mono" value={form.subject_code} onChange={(e) => setForm((f) => ({ ...f, subject_code: e.target.value }))} />
              </div>
              <div>
                <label className="label">Sample ID</label>
                <input className="input font-mono" value={form.sample_code} onChange={(e) => setForm((f) => ({ ...f, sample_code: e.target.value }))} />
              </div>
              <div>
                <label className="label">Sample type</label>
                <select className="input" value={form.sample_type} onChange={(e) => setForm((f) => ({ ...f, sample_type: e.target.value }))}>
                  {!SAMPLE_TYPES.includes(form.sample_type) && <option value={form.sample_type}>{form.sample_type}</option>}
                  {SAMPLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date of collection</label>
                <input type="date" className="input" value={form.collection_date} onChange={(e) => setForm((f) => ({ ...f, collection_date: e.target.value }))} />
              </div>
            </div>
          </section>

          {Object.entries(groupedDataKeys).map(([section, keys]) => (
            <section key={section} className="card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">{section}</h2>
              <div className="grid grid-cols-2 gap-4">
                {keys.map((key) => {
                  const def = fieldByKey[key];
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="label !mb-0">{def?.field_label ?? key}</label>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(key, def)}
                          className="text-ink-400 hover:text-danger"
                          aria-label={`Remove ${def?.field_label ?? key}`}
                          title={def ? "Remove this field from the form" : "Remove this value from the sample"}
                        >
                          <X size={13} />
                        </button>
                      </div>
                      {def ? (
                        <DynamicFieldInput field={def} value={form.data[key]} onChange={(v) => setForm((f) => ({ ...f, data: { ...f.data, [key]: v } }))} />
                      ) : (
                        <input className="input" value={String(form.data[key] ?? "")} onChange={(e) => setForm((f) => ({ ...f, data: { ...f.data, [key]: e.target.value } }))} />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <button type="button" className="btn-secondary" onClick={() => setShowAddField(true)}>
            <Plus size={15} /> Add a new field
          </button>

          {error && <div className="rounded border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</div>}

          <div className="flex justify-end gap-2 border-t border-line pt-5">
            <button className="btn-secondary" onClick={() => { setEditing(false); setForm({ subject_code: sample.subject_code ?? "", sample_code: sample.sample_code, sample_type: sample.sample_type, collection_date: sample.collection_date ?? "", data: sample.data ?? {} }); }}>
              Cancel
            </button>
            <button className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? <Spinner className="border-white/30 border-t-white" /> : "Save changes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedDataKeys).map(([section, keys]) => (
            <section key={section} className="card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">{section}</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {keys.map((key) => (
                  <div key={key}>
                    <dt className="text-xs text-ink-400">{fieldByKey[key]?.field_label ?? key}</dt>
                    <dd className="text-sm text-ink">{String(sample.data[key] ?? "—") || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      <div className="mt-6">
        {uploadFailedNotice && (
          <div className="mb-3 rounded border border-amber/40 bg-amber-50 px-3 py-2 text-sm text-amber-600">
            The sample saved, but the reports you attached didn&apos;t upload. Try again below.
          </div>
        )}
        <ReportsPanel sampleId={sampleId} canDelete={canDelete} />
      </div>

      {showAddField && (
        <AddFieldModal
          onClose={() => setShowAddField(false)}
          onCreated={(field) => {
            reloadFields();
            setForm((f) => ({ ...f, data: { ...f.data, [field.field_key]: f.data[field.field_key] ?? "" } }));
          }}
        />
      )}
    </div>
  );
}

function ReportsPanel({ sampleId, canDelete }: { sampleId: string; canDelete: boolean }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await api.get(`/samples/${sampleId}/reports`);
      setReports(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleId]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      await api.upload(`/samples/${sampleId}/reports`, Array.from(fileList));
      await loadReports();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(report: Report) {
    const res = await api.get(`/reports/${report.id}/download`);
    window.open(res.url, "_blank");
  }

  async function handleDelete(report: Report) {
    if (!confirm(`Delete "${report.file_name}"?`)) return;
    await api.delete(`/reports/${report.id}`);
    setReports((rs) => rs.filter((r) => r.id !== report.id));
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Reports</h2>
        <label className="btn-secondary cursor-pointer">
          {uploading ? <Spinner className="border-ink-100 border-t-slate" /> : <Upload size={14} />}
          Upload
          <input
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg,image/tiff,image/webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>

      {error && <div className="mb-3 rounded border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : reports.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">No reports uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {reports.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {r.content_type === "application/pdf" ? (
                  <FileText size={16} className="shrink-0 text-ink-400" />
                ) : (
                  <ImageIcon size={16} className="shrink-0 text-ink-400" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{r.file_name}</div>
                  <div className="text-xs text-ink-400">{formatBytes(r.file_size)} · {formatDate(r.uploaded_at)}</div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button className="btn-ghost px-2" onClick={() => handleDownload(r)} aria-label="Download">
                  <Download size={15} />
                </button>
                {canDelete && (
                  <button className="btn-ghost px-2 hover:text-danger" onClick={() => handleDelete(r)} aria-label="Delete">
                    <X size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}