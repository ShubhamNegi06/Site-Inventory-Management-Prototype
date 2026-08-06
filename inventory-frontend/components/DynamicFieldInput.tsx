"use client";

import type { FieldDefinition } from "@/lib/types";

export function DynamicFieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const strValue = value == null ? "" : String(value);

  if (field.field_type === "select" && field.options) {
    const options = field.options.split(",").map((o) => o.trim()).filter(Boolean);
    return (
      <select className="input" value={strValue} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }

  if (field.field_type === "boolean") {
    return (
      <select className="input" value={strValue} onChange={(e) => onChange(e.target.value === "true")}>
        <option value="">Select…</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (field.field_type === "date") {
    return <input type="date" className="input" value={strValue} onChange={(e) => onChange(e.target.value)} />;
  }

  if (field.field_type === "number") {
    return (
      <input
        type="number"
        className="input"
        value={strValue}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    );
  }

  return <input type="text" className="input" value={strValue} onChange={(e) => onChange(e.target.value)} />;
}
