"use client";

import { Search } from "lucide-react";
import type { Site } from "@/lib/types";

export interface SampleFiltersState {
  search: string;
  sample_type: string;
  date_from: string;
  date_to: string;
  site_id: string;
}

export function SampleFilters({
  value,
  onChange,
  sites,
}: {
  value: SampleFiltersState;
  onChange: (next: SampleFiltersState) => void;
  sites?: Site[]; // pass only on the admin master inventory view
}) {
  function set<K extends keyof SampleFiltersState>(key: K, v: SampleFiltersState[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="card flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-[220px] flex-1">
        <label className="label">Search</label>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-2.5 text-ink-400" />
          <input
            className="input pl-8"
            placeholder="Sample code, diagnosis, notes…"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
          />
        </div>
      </div>

      {sites && (
        <div className="w-48">
          <label className="label">Site</label>
          <select className="input" value={value.site_id} onChange={(e) => set("site_id", e.target.value)}>
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="w-44">
        <label className="label">Sample type</label>
        <select className="input" value={value.sample_type} onChange={(e) => set("sample_type", e.target.value)}>
          <option value="">All types</option>
          <option value="FFPE Block">FFPE Block</option>
          <option value="Frozen Tumor">Frozen Tumor</option>
          <option value="Serum">Serum</option>
          <option value="Plasma">Plasma</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="w-36">
        <label className="label">From</label>
        <input type="date" className="input" value={value.date_from} onChange={(e) => set("date_from", e.target.value)} />
      </div>
      <div className="w-36">
        <label className="label">To</label>
        <input type="date" className="input" value={value.date_to} onChange={(e) => set("date_to", e.target.value)} />
      </div>

      {(value.search || value.sample_type || value.date_from || value.date_to || value.site_id) && (
        <button
          className="btn-ghost"
          onClick={() => onChange({ search: "", sample_type: "", date_from: "", date_to: "", site_id: "" })}
        >
          Clear
        </button>
      )}
    </div>
  );
}
