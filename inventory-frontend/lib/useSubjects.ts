"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SubjectPage } from "@/lib/types";

export function useSubjects(search: string, siteId: string, page: number, pageSize = 50) {
  const [data, setData] = useState<SubjectPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (siteId) params.set("site_id", siteId);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));

    let cancelled = false;
    setLoading(true);
    api
      .get(`/subjects?${params.toString()}`)
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
  }, [search, siteId, page, pageSize]);

  return { data, loading, error };
}