"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { SampleFilters, type SampleFiltersState } from "@/components/SampleFilters";
import { SampleTable } from "@/components/SampleTable";
import { Pagination } from "@/components/Pagination";
import { Spinner } from "@/components/Spinner";
import { useSamples } from "@/lib/useSamples";
import { useSites } from "@/lib/useSites";
import { useDebounced } from "@/lib/useDebounce";

const EMPTY: SampleFiltersState = { search: "", sample_type: "", date_from: "", date_to: "", site_id: "" };

export default function MasterInventoryPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
      <MasterInventoryInner />
    </Suspense>
  );
}

function MasterInventoryInner() {
  const searchParams = useSearchParams();
  const initialSiteId = searchParams.get("site_id") ?? "";
  const [filters, setFilters] = useState<SampleFiltersState>({ ...EMPTY, site_id: initialSiteId });
  const debouncedFilters = useDebounced(filters);
  const [page, setPage] = useState(1);
  const { sites } = useSites();
  const { data, loading, error } = useSamples(debouncedFilters, page);

  const siteMap = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s])), [sites]);

  function exportCsv() {
    if (!data) return;
    const rows = data.items;
    const dynamicKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r.data ?? {}))));
    const headers = ["sample_code", "sample_type", "site", "collection_date", ...dynamicKeys];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.sample_code,
          r.sample_type,
          siteMap[r.site_id]?.name ?? "",
          r.collection_date ?? "",
          ...dynamicKeys.map((k) => JSON.stringify(r.data?.[k] ?? "")),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `master-inventory-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Master inventory</h1>
          <p className="mt-1 text-sm text-ink-400">Consolidated samples across every site.</p>
        </div>
        <button className="btn-secondary" onClick={exportCsv} disabled={!data || data.items.length === 0}>
          <Download size={15} /> Export page (CSV)
        </button>
      </div>

      <div className="mb-4">
        <SampleFilters value={filters} onChange={(v) => { setFilters(v); setPage(1); }} sites={sites} />
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <div className="rounded border border-danger/30 bg-dangerSoft px-4 py-3 text-sm text-danger">{error}</div>
      ) : (
        <>
          <SampleTable samples={data?.items ?? []} sites={siteMap} basePath="/admin/samples" />
          {data && <Pagination page={page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
