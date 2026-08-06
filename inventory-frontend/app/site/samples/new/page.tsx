"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Upload, FileText, Image as ImageIcon } from "lucide-react";
import { useFieldDefinitions } from "@/lib/useFieldDefinitions";
import { DynamicFieldInput } from "@/components/DynamicFieldInput";
import { AddFieldModal } from "@/components/AddFieldModal";
import { Spinner } from "@/components/Spinner";
import { api, ApiError } from "@/lib/api";
import { SAMPLE_TYPES } from "@/lib/types";
import type { FieldDefinition } from "@/lib/types";
import { formatBytes } from "@/lib/format";

export default function NewSamplePage() {
  const { fields, reload } = useFieldDefinitions();
  const router = useRouter();

  const [subjectCode, setSubjectCode] = useState("");
  const [sampleCode, setSampleCode] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [showAddField, setShowAddField] = useState(false);
  const [addFieldSection, setAddFieldSection] = useState<string | undefined>(undefined);
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState("Saving…");
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof fields> = {};
    for (const f of fields) {
      const key = f.section || "Additional details";
      groups[key] = groups[key] ?? [];
      groups[key].push(f);
    }
    return groups;
  }, [fields]);

  async function handleRemoveField(field: FieldDefinition) {
    if (!confirm(`Remove "${field.field_label}" from the form? Existing samples keep their saved value; this just stops it from being offered going forward.`)) return;
    try {
      await api.delete(`/field-definitions/${field.id}`);
      setData((d) => {
        const next = { ...d };
        delete next[field.field_key];
        return next;
      });
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to remove field");
    }
  }

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    setReportFiles((prev) => [...prev, ...files]);
  }

  function removeStagedFile(index: number) {
    setReportFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavingLabel("Saving…");
    setError(null);
    let sample;
    try {
      sample = await api.post("/samples", {
        subject_code: subjectCode,
        sample_code: sampleCode,
        sample_type: sampleType,
        collection_date: collectionDate || null,
        data,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setSaving(false);
      return;
    }

    if (reportFiles.length > 0) {
      setSavingLabel("Uploading reports…");
      try {
        await api.upload(`/samples/${sample.id}/reports`, reportFiles);
      } catch (err) {
        // Sample is already saved at this point -- send them to the detail
        // page instead of losing the entry; they can retry the upload there.
        router.push(`/site/samples/${sample.id}?reportUploadFailed=1`);
        return;
      }
    }

    router.push(`/site/samples/${sample.id}`);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Add sample</h1>
        <p className="mt-1 text-sm text-ink-400">Register a new block or specimen in your inventory.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Sample information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Subject ID</label>
              <input
                className="input font-mono"
                required
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="e.g. GB-01"
              />
              <p className="mt-1 text-xs text-ink-400">Shared across every sample from this patient.</p>
            </div>
            <div>
              <label className="label">Sample ID</label>
              <input
                className="input font-mono"
                required
                value={sampleCode}
                onChange={(e) => setSampleCode(e.target.value)}
                placeholder="e.g. GB-01FFPE1"
              />
            </div>
            <div>
              <label className="label">Sample type</label>
              <select className="input" required value={sampleType} onChange={(e) => setSampleType(e.target.value)}>
                <option value="">Select…</option>
                {SAMPLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date of collection</label>
              <input type="date" className="input" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} />
            </div>
          </div>
        </section>

        {Object.entries(grouped).map(([section, sectionFields]) => (
          <section key={section} className="card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">{section}</h2>
            <div className="grid grid-cols-2 gap-4">
              {sectionFields.map((f) => (
                <div key={f.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="label !mb-0">{f.field_label}</label>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(f)}
                      className="text-ink-400 hover:text-danger"
                      aria-label={`Remove ${f.field_label}`}
                      title="Remove this field"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <DynamicFieldInput
                    field={f}
                    value={data[f.field_key]}
                    onChange={(v) => setData((d) => ({ ...d, [f.field_key]: v }))}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost mt-4"
              onClick={() => { setAddFieldSection(section); setShowAddField(true); }}
            >
              <Plus size={14} /> Add field to this section
            </button>
          </section>
        ))}

        <button
          type="button"
          className="btn-secondary"
          onClick={() => { setAddFieldSection(undefined); setShowAddField(true); }}
        >
          <Plus size={15} /> Add a new field
        </button>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Reports</h2>
            <label className="btn-secondary cursor-pointer">
              <Upload size={14} /> Add files
              <input
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/tiff,image/webp"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []); // snapshot before clearing the input
                  e.target.value = "";
                  addFiles(files);
                }}
              />
            </label>
          </div>

          {reportFiles.length === 0 ? (
            <p className="py-2 text-sm text-ink-400">
              No reports attached yet. You can add PDFs or images now, or upload them later from the sample page.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {reportFiles.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {f.type === "application/pdf" ? (
                      <FileText size={16} className="shrink-0 text-ink-400" />
                    ) : (
                      <ImageIcon size={16} className="shrink-0 text-ink-400" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm text-ink">{f.name}</div>
                      <div className="text-xs text-ink-400">{formatBytes(f.size)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost px-2 hover:text-danger"
                    onClick={() => removeStagedFile(i)}
                    aria-label={`Remove ${f.name}`}
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && <div className="rounded border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</div>}

        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <>
                <Spinner className="border-white/30 border-t-white" /> {savingLabel}
              </>
            ) : (
              "Save sample"
            )}
          </button>
        </div>
      </form>

      {showAddField && (
        <AddFieldModal
          defaultSection={addFieldSection}
          onClose={() => setShowAddField(false)}
          onCreated={(field) => {
            reload();
            setData((d) => ({ ...d, [field.field_key]: d[field.field_key] ?? "" }));
          }}
        />
      )}
    </div>
  );
}