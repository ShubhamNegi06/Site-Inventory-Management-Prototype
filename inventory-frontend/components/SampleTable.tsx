"use client";

import { useRouter } from "next/navigation";
import type { Sample, Site } from "@/lib/types";
import { sampleTypeChipClass, formatDate } from "@/lib/format";
import { FileX2 } from "lucide-react";

export function SampleTable({
  samples,
  sites,
  basePath,
}: {
  samples: Sample[];
  sites?: Record<string, Site>; // id -> Site, pass only when a Site column is needed
  basePath: string; // e.g. "/admin/samples" or "/site/samples"
}) {
  const router = useRouter();

  if (samples.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-2 py-16 text-center">
        <FileX2 size={28} className="text-ink-400" />
        <p className="text-sm font-medium text-ink">No samples match these filters</p>
        <p className="text-xs text-ink-400">Try widening your search or clearing filters.</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Sample code</th>
            <th>Type</th>
            {sites && <th>Site</th>}
            <th>Collected</th>
            <th>Diagnosis</th>
            <th>Stage</th>
            <th>Added</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <tr
              key={s.id}
              className="cursor-pointer"
              onClick={() => router.push(`${basePath}/${s.id}`)}
            >
              <td className="font-mono text-ink-600">{s.subject_code ?? "—"}</td>
              <td className="font-mono font-medium text-ink">{s.sample_code}</td>
              <td>
                <span className={`chip ${sampleTypeChipClass(s.sample_type)}`}>{s.sample_type}</span>
              </td>
              {sites && <td className="text-ink-600">{sites[s.site_id]?.name ?? "—"}</td>}
              <td className="text-ink-600">{formatDate(s.collection_date)}</td>
              <td className="text-ink-600">{(s.data?.diagnosis as string) ?? "—"}</td>
              <td className="text-ink-600">{(s.data?.stage as string) ?? "—"}</td>
              <td className="text-ink-400">{formatDate(s.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}