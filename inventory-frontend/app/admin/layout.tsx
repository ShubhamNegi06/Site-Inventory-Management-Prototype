"use client";

import { LayoutGrid, Building2 } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";

const navItems = [
  { href: "/admin/inventory", label: "Master inventory", icon: LayoutGrid },
  { href: "/admin/sites", label: "Sites", icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="admin">
      <AppShell navItems={navItems} roleLabel="Admin">
        {children}
      </AppShell>
    </RoleGuard>
  );
}
