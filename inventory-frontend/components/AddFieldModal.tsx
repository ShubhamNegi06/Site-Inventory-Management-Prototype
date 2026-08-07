"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { api, ApiError } from "@/lib/api";
import type { FieldDefinition, FieldType } from "@/lib/types";

function toKey(label: string) {
  // Sanitized for storage: "Country Of Origin" -> "country-of-origin".
  // The label stays the human-readable text shown everywhere in the UI --
  // this key is only ever used as the JSONB dict key under the hood.
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AddFieldModal({
  defaultSection,
  onClose,
  onCreated,
}: {
  defaultSection?: string;
  onClose: () => void;
  onCreated: (field: FieldDefinition) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [section, setSection] = useState(defaultSection ?? "");
  const [options, setOptions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const field = await api.post("/field-definitions", {
        field_key: toKey(label),
        field_label: label,
        field_type: type,
        section: section || null,
        options: type === "select" ? options : null,
      });
      onCreated(field);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add a new field" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Field label</label>
          <input className="input" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Tumor %" />
          {label && <p className="mt-1 font-mono text-xs text-ink-400">key: {toKey(label)}</p>}
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as FieldType)}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Select (dropdown)</option>
            <option value="boolean">Yes / No</option>
          </select>
        </div>
        {type === "select" && (
          <div>
            <label className="label">Options</label>
            <input className="input" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Comma-separated, e.g. Low, Medium, High" />
          </div>
        )}
        <div>
          <label className="label">Section</label>
          <input className="input" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Diagnosis Information" />
        </div>
        {error && <div className="rounded border border-danger/30 bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner className="border-white/30 border-t-white" /> : "Add field"}</button>
        </div>
      </form>
    </Modal>
  );
}