"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { useSubjects } from "@/lib/useSubjects";
import { useDebounced } from "@/lib/useDebounce";
import { Pagination } from "@/components/Pagination";
import { Spinner } from "@/components/Spinner";
import { sampleTypeChipClass, formatDate } from "@/lib/format";
import type { Site } from "@/lib/types";

export function SubjectsView({
  basePath,
  sites,
}: {
  basePath: string; // e.g. "/site/inventory" or "/admin/inventory" -- where "View samples" links to
  sites?: Record<string, Site>; // admin only, for showing a Site column
}) {
  const [search, setSearch] = useState("");
  const [siteId, setSiteId] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);
  const { data, loading, error } = useSubjects(debouncedSearch, siteId, page);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Subjects</h1>
        <p className="mt-1 text-sm text-ink-400">One row per subject — every sample collected from them, grouped together.</p>
      </div>

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <label className="label">Search</label>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-2.5 text-ink-400" />
            <input
              className="input pl-8"
              placeholder="Subject ID…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        {sites && (
          <div className="w-48">
            <label className="label">Site</label>
            <select className="input" value={siteId} onChange={(e) => { setSiteId(e.target.value); setPage(1); }}>
              <option value="">All sites</option>
              {Object.values(sites).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <div className="rounded border border-danger/30 bg-dangerSoft px-4 py-3 text-sm text-danger">{error}</div>
      ) : !data || data.items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <Users size={28} className="text-ink-400" />
          <p className="text-sm font-medium text-ink">No subjects yet</p>
          <p className="text-xs text-ink-400">Subjects appear here once samples are added with a Subject ID.</p>
        </div>
      ) : (
        <>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  {sites && <th>Site</th>}
                  <th>Samples</th>
                  <th>Sample types</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Collection range</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((subj) => (
                  <tr key={`${subj.site_id}-${subj.subject_code}`}>
                    <td className="font-mono font-medium text-ink">{subj.subject_code}</td>
                    {sites && <td className="text-ink-600">{sites[subj.site_id]?.name ?? "—"}</td>}
                    <td className="text-ink-600">{subj.sample_count}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {subj.sample_types.map((t) => (
                          <span key={t} className={`chip ${sampleTypeChipClass(t)}`}>{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="text-ink-600">{String(subj.data?.age ?? "—")}</td>
                    <td className="text-ink-600">{String(subj.data?.gender ?? "—")}</td>
                    <td className="text-ink-400">
                      {subj.first_collection_date === subj.last_collection_date
                        ? formatDate(subj.first_collection_date)
                        : `${formatDate(subj.first_collection_date)} – ${formatDate(subj.last_collection_date)}`}
                    </td>
                    <td>
                      <Link
                        href={`${basePath}?search=${encodeURIComponent(subj.subject_code)}`}
                        className="btn-ghost"
                      >
                        View samples
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}