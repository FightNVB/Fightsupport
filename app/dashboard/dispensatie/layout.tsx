"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * ✅ Route-guard Dispensatie portaal.
 * Toegestaan: dispensatie_admin, admin, superadmin
 */
export default function DispensatieLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, roles, loading } = useAuth();

  const allowed =
    (roles ?? []).includes("dispensatie_admin") ||
    (roles ?? []).includes("admin") ||
    (roles ?? []).includes("superadmin");

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!allowed) router.replace("/dashboard");
  }, [loading, user, allowed, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0b0b0b" }}>
        <div style={{ color: "rgba(255,255,255,0.78)", fontWeight: 800, letterSpacing: "0.06em" }}>Laden…</div>
      </div>
    );
  }

  if (!user || !allowed) return null;
  return <>{children}</>;
}
