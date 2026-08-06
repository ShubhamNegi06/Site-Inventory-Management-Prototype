"use client";

import { useMemo } from "react";
import { SubjectsView } from "@/components/SubjectsView";
import { useSites } from "@/lib/useSites";

export default function AdminSubjectsPage() {
  const { sites } = useSites();
  const siteMap = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s])), [sites]);
  return <SubjectsView basePath="/admin/inventory" sites={siteMap} />;
}