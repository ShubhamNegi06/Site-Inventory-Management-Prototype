"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/Spinner";

export default function RootPage() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
    } else if (profile?.role === "admin") {
      router.replace("/admin/inventory");
    } else if (profile?.role === "site") {
      router.replace("/site/inventory");
    }
  }, [loading, session, profile, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-paper">
      <Spinner />
    </div>
  );
}
