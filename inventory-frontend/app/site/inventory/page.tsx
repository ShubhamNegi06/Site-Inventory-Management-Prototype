"use client";

import { useState } from "react";
import { SampleFilters, type SampleFiltersState } from "@/components/SampleFilters";
import { SampleTable } from "@/components/SampleTable";
import { Pagination } from "@/components/Pagination";
import { Spinner } from "@/components/Spinner";
import { useSamples } from "@/lib/useSamples";
import { useDebounced } from "@/lib/useDebounce";

const EMPTY: SampleFiltersState = { search: "", sample_type: "", date_from: "", date_to: "", site_id: "" };

export default function SiteInventoryPage() {
  const [filters, setFilters] = useState<SampleFiltersState>(EMPTY);
  const debouncedFilters = useDebounced(filters);
  const [page, setPage] = useState(1);
  const { data, loading, error } = useSamples(debouncedFilters, page);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Your inventory</h1>
        <p className="mt-1 text-sm text-ink-400">Samples collected at your site.</p>
      </div>

      <div className="mb-4">
        <SampleFilters value={filters} onChange={(v) => { setFilters(v); setPage(1); }} />
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <div className="rounded border border-danger/30 bg-dangerSoft px-4 py-3 text-sm text-danger">{error}</div>
      ) : (
        <>
          <SampleTable samples={data?.items ?? []} basePath="/site/samples" />
          {data && <Pagination page={page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
