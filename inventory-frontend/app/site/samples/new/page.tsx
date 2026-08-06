"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useFieldDefinitions } from "@/lib/useFieldDefinitions";
import { DynamicFieldInput } from "@/components/DynamicFieldInput";
import { AddFieldModal } from "@/components/AddFieldModal";
import { Spinner } from "@/components/Spinner";
import { api, ApiError } from "@/lib/api";
import { SAMPLE_TYPES } from "@/lib/types";
import type { FieldDefinition } from "@/lib/types";

export default function NewSamplePage() {
  const { fields, reload } = useFieldDefinitions();
  const router = useRouter();

  const [sampleCode, setSampleCode] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [showAddField, setShowAddField] = useState(false);
  const [addFieldSection, setAddFieldSection] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const sample = await api.post("/samples", {
        sample_code: sampleCode,
        sample_type: sampleType,
        collection_date: collectionDate || null,
        data,
      });
      router.push(`/site/samples/${sample.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setSaving(false);
    }
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
              <label className="label">Sample / subject ID</label>
              <input
                className="input font-mono"
                required
                value={sampleCode}
                onChange={(e) => setSampleCode(e.target.value)}
                placeholder="e.g. UCMA-25-01"
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

        {error && <div className="rounded border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</div>}

        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner className="border-white/30 border-t-white" /> : "Save sample"}
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
