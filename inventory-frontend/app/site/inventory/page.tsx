"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SampleFilters, type SampleFiltersState } from "@/components/SampleFilters";
import { SampleTable } from "@/components/SampleTable";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { Pagination } from "@/components/Pagination";
import { Spinner } from "@/components/Spinner";
import { useSamples } from "@/lib/useSamples";
import { useDebounced } from "@/lib/useDebounce";
import { api, ApiError } from "@/lib/api";

const EMPTY: SampleFiltersState = { search: "", sample_type: "", date_from: "", date_to: "", site_id: "" };

export default function SiteInventoryPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
      <SiteInventoryInner />
    </Suspense>
  );
}

function SiteInventoryInner() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [filters, setFilters] = useState<SampleFiltersState>({ ...EMPTY, search: initialSearch });
  const debouncedFilters = useDebounced(filters);
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useSamples(debouncedFilters, page);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function handleFiltersChange(v: SampleFiltersState) {
    setSelectedIds(new Set());
    setFilters(v);
    setPage(1);
  }

  function handlePageChange(p: number) {
    setSelectedIds(new Set());
    setPage(p);
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} sample${selectedIds.size === 1 ? "" : "s"}? This can't be undone from here.`)) return;
    setDeleting(true);
    try {
      await api.post("/samples/bulk-delete", { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete samples");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Your inventory</h1>
        <p className="mt-1 text-sm text-ink-400">Samples collected at your site.</p>
      </div>

      <div className="mb-4">
        <SampleFilters value={filters} onChange={handleFiltersChange} />
      </div>

      <BulkActionsBar
        count={selectedIds.size}
        deleting={deleting}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
      />

      {loading && !data ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <div className="rounded border border-danger/30 bg-dangerSoft px-4 py-3 text-sm text-danger">{error}</div>
      ) : (
        <>
          <SampleTable
            samples={data?.items ?? []}
            basePath="/site/samples"
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          {data && (
            <Pagination page={page} pageSize={data.page_size} total={data.total} onPageChange={handlePageChange} />
          )}
        </>
      )}
    </div>
  );
}