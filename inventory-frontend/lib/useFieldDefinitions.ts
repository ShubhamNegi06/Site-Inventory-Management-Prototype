"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { FieldDefinition } from "@/lib/types";

export function useFieldDefinitions() {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/field-definitions")
      .then((res) => !cancelled && setFields(res))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { fields, loading, reload };
}
