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
import { SECTION_ORDER } from "@/lib/sections";
import { sortByFieldOrder } from "@/lib/fieldOrder";
import { useAuth } from "@/lib/auth-context";

// Module-scope (not defined inside NewSamplePage) on purpose: a component
// defined inside another component's body gets recreated -- a "new"
// component type -- on every render, which makes React unmount and
// remount its inputs instead of just updating them, dropping focus after
// every keystroke. Keeping this stable and passing data in via props is
// what lets typing work normally.
function DynamicFieldGrid({
  sectionFields,
  data,
  onChange,
  onRemoveField,
  canRemove,
}: {
  sectionFields: FieldDefinition[];
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onRemoveField: (field: FieldDefinition) => void;
  canRemove: (field: FieldDefinition) => boolean;
}) {
  return (
    <>
      {sectionFields.map((f) => (
        <div key={f.id}>
          <div className="mb-1 flex items-center justify-between">
            <label className="label !mb-0">{f.field_label}</label>
            {canRemove(f) && (
              <button
                type="button"
                onClick={() => onRemoveField(f)}
                className="text-ink-400 hover:text-danger"
                aria-label={`Remove ${f.field_label}`}
                title="Remove this field"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <DynamicFieldInput
            field={f}
            value={data[f.field_key]}
            onChange={(v) => onChange(f.field_key, v)}
          />
        </div>
      ))}
    </>
  );
}

export default function NewSamplePage() {
  const { fields, reload } = useFieldDefinitions();
  const { profile } = useAuth();
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
    for (const key of Object.keys(groups)) {
      groups[key] = sortByFieldOrder(groups[key]);
    }
    return groups;
  }, [fields]);

  // A site user can only remove fields they registered for their own site
  // -- global/template fields (site_id null) and other sites' fields
  // aren't theirs to remove, so the button simply isn't shown for those
  // (the backend enforces the same rule; this just avoids a 403 surprise).
  function canRemoveField(field: FieldDefinition): boolean {
    if (!profile) return false;
    if (profile.role === "admin") return true;
    return field.site_id === profile.site_id;
  }

  // Canonical sections always render, in template order, even with zero
  // dynamic fields yet. Anything registered under a section name we don't
  // recognize (custom, ad hoc) renders afterward, in whatever order it was
  // created -- same as before.
  const extraSections = Object.keys(grouped).filter(
    (s) => !SECTION_ORDER.includes(s as (typeof SECTION_ORDER)[number])
  );

  function openAddField(section?: string) {
    setAddFieldSection(section);
    setShowAddField(true);
  }

  function handleFieldChange(key: string, value: unknown) {
    setData((d) => ({ ...d, [key]: value }));
  }

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
        {/* Case Details -- Subject ID and Sample ID are fixed columns; Type of
            Tissue (and anything else registered under this section) is dynamic. */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Case Details</h2>
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
            <DynamicFieldGrid sectionFields={grouped["Case Details"] ?? []} data={data} onChange={handleFieldChange} onRemoveField={handleRemoveField} canRemove={canRemoveField} />
          </div>
          <button type="button" className="btn-ghost mt-4" onClick={() => openAddField("Case Details")}>
            <Plus size={14} /> Add field to this section
          </button>
        </section>

        {/* Demographic Details -- fully dynamic (Age, Gender, Ethnicity, Country Of Origin, ...) */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Demographic Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <DynamicFieldGrid sectionFields={grouped["Demographic Details"] ?? []} data={data} onChange={handleFieldChange} onRemoveField={handleRemoveField} canRemove={canRemoveField} />
          </div>
          {(grouped["Demographic Details"] ?? []).length === 0 && (
            <p className="text-sm text-ink-400">No fields yet.</p>
          )}
          <button type="button" className="btn-ghost mt-4" onClick={() => openAddField("Demographic Details")}>
            <Plus size={14} /> Add field to this section
          </button>
        </section>

        {/* Diagnosis Information -- fully dynamic */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Diagnosis Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <DynamicFieldGrid sectionFields={grouped["Diagnosis Information"] ?? []} data={data} onChange={handleFieldChange} onRemoveField={handleRemoveField} canRemove={canRemoveField} />
          </div>
          {(grouped["Diagnosis Information"] ?? []).length === 0 && (
            <p className="text-sm text-ink-400">No fields yet.</p>
          )}
          <button type="button" className="btn-ghost mt-4" onClick={() => openAddField("Diagnosis Information")}>
            <Plus size={14} /> Add field to this section
          </button>
        </section>

        {/* Sample Information -- Sample Type and Date of Sample Collection are
            fixed columns; Fixation, Tumor %, Necrosis %, Storage Temperature,
            Date of Reporting, etc. are dynamic. */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Sample Information</h2>
          <div className="grid grid-cols-2 gap-4">
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
              <label className="label">Date of Sample Collection</label>
              <input type="date" className="input" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} />
            </div>
            <DynamicFieldGrid sectionFields={grouped["Sample Information"] ?? []} data={data} onChange={handleFieldChange} onRemoveField={handleRemoveField} canRemove={canRemoveField} />
          </div>
          <button type="button" className="btn-ghost mt-4" onClick={() => openAddField("Sample Information")}>
            <Plus size={14} /> Add field to this section
          </button>
        </section>

        {/* Serology Report -- fully dynamic (HIV, HBV, HCV) */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Serology Report</h2>
          <div className="grid grid-cols-2 gap-4">
            <DynamicFieldGrid sectionFields={grouped["Serology Report"] ?? []} data={data} onChange={handleFieldChange} onRemoveField={handleRemoveField} canRemove={canRemoveField} />
          </div>
          {(grouped["Serology Report"] ?? []).length === 0 && (
            <p className="text-sm text-ink-400">No fields yet.</p>
          )}
          <button type="button" className="btn-ghost mt-4" onClick={() => openAddField("Serology Report")}>
            <Plus size={14} /> Add field to this section
          </button>
        </section>

        {/* Treatment Detail -- fully dynamic */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Treatment Detail</h2>
          <div className="grid grid-cols-2 gap-4">
            <DynamicFieldGrid sectionFields={grouped["Treatment Detail"] ?? []} data={data} onChange={handleFieldChange} onRemoveField={handleRemoveField} canRemove={canRemoveField} />
          </div>
          {(grouped["Treatment Detail"] ?? []).length === 0 && (
            <p className="text-sm text-ink-400">No fields yet.</p>
          )}
          <button type="button" className="btn-ghost mt-4" onClick={() => openAddField("Treatment Detail")}>
            <Plus size={14} /> Add field to this section
          </button>
        </section>

        {/* Biomarker Characterization -- fully dynamic */}
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">Biomarker Characterization</h2>
          <div className="grid grid-cols-2 gap-4">
            <DynamicFieldGrid sectionFields={grouped["Biomarker Characterization"] ?? []} data={data} onChange={handleFieldChange} onRemoveField={handleRemoveField} canRemove={canRemoveField} />
          </div>
          {(grouped["Biomarker Characterization"] ?? []).length === 0 && (
            <p className="text-sm text-ink-400">No fields yet.</p>
          )}
          <button type="button" className="btn-ghost mt-4" onClick={() => openAddField("Biomarker Characterization")}>
            <Plus size={14} /> Add field to this section
          </button>
        </section>

        {/* Any custom/ad hoc sections someone added that aren't part of the template */}
        {extraSections.map((section) => (
          <section key={section} className="card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-400">{section}</h2>
            <div className="grid grid-cols-2 gap-4">
              <DynamicFieldGrid sectionFields={grouped[section]} data={data} onChange={handleFieldChange} onRemoveField={handleRemoveField} canRemove={canRemoveField} />
            </div>
            <button type="button" className="btn-ghost mt-4" onClick={() => openAddField(section)}>
              <Plus size={14} /> Add field to this section
            </button>
          </section>
        ))}

        <button type="button" className="btn-secondary" onClick={() => openAddField(undefined)}>
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