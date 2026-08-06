"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { SamplePage } from "@/lib/types";
import type { SampleFiltersState } from "@/components/SampleFilters";

export function useSamples(filters: SampleFiltersState, page: number, pageSize = 50) {
  const [data, setData] = useState<SamplePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.sample_type) params.set("sample_type", filters.sample_type);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.site_id) params.set("site_id", filters.site_id);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));

    let cancelled = false;
    setLoading(true);
    api
      .get(`/samples?${params.toString()}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.search,
    filters.sample_type,
    filters.date_from,
    filters.date_to,
    filters.site_id,
    page,
    pageSize,
    reloadKey,
  ]);

  return { data, loading, error, reload };
}
