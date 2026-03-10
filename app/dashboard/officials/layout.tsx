"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * ✅ Route-guard Officials portaal.
 * Toegestaan: official, hoofdofficial, admin, superadmin
 */
export default function OfficialsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, roles, loading } = useAuth();

  const allowed =
    (roles ?? []).includes("official") ||
    (roles ?? []).includes("hoofdofficial") ||
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
