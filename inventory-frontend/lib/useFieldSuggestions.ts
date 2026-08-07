"use client";
 
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FieldSuggestion } from "@/lib/types";
 
export function useFieldSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);
 
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    api
      .get(`/field-definitions/search-fields?q=${encodeURIComponent(query)}`)
      .then((res) => !cancelled && setSuggestions(res))
      .catch(() => !cancelled && setSuggestions([]));
    return () => {
      cancelled = true;
    };
  }, [query]);
 
  return suggestions;
}