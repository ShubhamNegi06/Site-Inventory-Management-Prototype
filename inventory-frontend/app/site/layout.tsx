"use client";

import { LayoutGrid, FilePlus2, Users, FileSpreadsheet } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";

const navItems = [
  { href: "/site/inventory", label: "Inventory", icon: LayoutGrid },
  { href: "/site/subjects", label: "Subjects", icon: Users },
  { href: "/site/samples/new", label: "Add sample", icon: FilePlus2 },
  { href: "/site/samples/import", label: "Bulk import", icon: FileSpreadsheet },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="site">
      <AppShell navItems={navItems} roleLabel="Site">
        {children}
      </AppShell>
    </RoleGuard>
  );
}