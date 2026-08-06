"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function AppShell({
  navItems,
  roleLabel,
  children,
}: {
  navItems: NavItem[];
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col justify-between overflow-y-auto border-r border-line bg-sidebar px-4 py-5 text-ink">
        <div>
          <div className="mb-8 px-2">
            <img
              src="https://clinvedica.com/logo.png"
              alt="Clin Vedica Life Sciences"
              className="h-12 w-auto max-w-full object-contain"
            />
            <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
              Specimen Inventory
            </div>
            <div className="mt-0.5 text-xs text-ink-400">{roleLabel}</div>
          </div>

          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors ${
                    active
                      ? "bg-gradient-to-r from-brand to-brand-amber text-white font-medium shadow-sm"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-line pt-3">
          <div className="px-2 text-xs text-ink-400 truncate">{profile?.email}</div>
          <button
            onClick={signOut}
            className="mt-1.5 flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink"
          >
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-[1400px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
