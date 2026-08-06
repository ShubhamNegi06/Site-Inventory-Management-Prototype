"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Site } from "@/lib/types";

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/sites")
      .then((res) => !cancelled && setSites(res))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { sites, loading, reload };
}
