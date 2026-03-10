"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * ✅ Hard route-guard voor het hele Admin portaal.
 * - Geen flicker: toont stabiele loader.
 * - Geen dubbele role-fetches: gebruikt AuthContext (1 bron).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, roles, loading } = useAuth();

  const isAdmin = (roles ?? []).includes("admin") || (roles ?? []).includes("superadmin");

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isAdmin) router.replace("/dashboard");
  }, [loading, user, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b0b0b" }}>
        <div style={{ color: "rgba(255,255,255,0.78)", fontWeight: 800, letterSpacing: "0.06em" }}>
          Laden…
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;
  return <>{children}</>;
}
