"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/lib/types";
import { Spinner } from "@/components/Spinner";

export function RoleGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (profile && profile.role !== role) {
      router.replace(profile.role === "admin" ? "/admin/inventory" : "/site/inventory");
    }
  }, [loading, session, profile, role, router]);

  if (loading || !profile || profile.role !== role) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
