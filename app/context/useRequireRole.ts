"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type UseRequireRoleResult = {
  loading: boolean;
  ok: boolean;
  role: string | null;
  profile: any | null;
};

export function useRequireRole(allowedRoles: string[]): UseRequireRoleResult {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  // normalize allowed roles once
  const allowedLower = useMemo(
    () =>
      (allowedRoles ?? [])
        .map((r) => String(r ?? "").trim().toLowerCase())
        .filter(Boolean),
    [allowedRoles]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);

        const { data: sess } = await supabase.auth.getSession();
        const user = sess.session?.user;

        // 🔒 Niet ingelogd → naar login
        if (!user) {
          if (!cancelled) {
            setOk(false);
            setRole(null);
            setProfile(null);
            setLoading(false);
            router.replace("/login");
          }
          return;
        }

        // 📥 Haal profiel op
        const { data: prof, error } = await supabase
          .from("user_profiles")
          .select("id, email, full_name, role, bondteam, created_at")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        const r = String(prof?.role ?? "").trim().toLowerCase() || null;

        if (cancelled) return;

        setProfile(prof ?? null);
        setRole(r);

        // 🧠 superadmin bypass
        const isSuperAdmin = r === "superadmin";

        const hasRole =
          isSuperAdmin ||
          (r !== null && allowedLower.includes(r));

        setOk(hasRole);
        setLoading(false);

        // 🚫 Geen toegang → terug naar dashboard
        if (!hasRole) {
          router.replace("/dashboard");
        }
      } catch (e) {
        console.error("useRequireRole error:", e);

        if (!cancelled) {
          setOk(false);
          setRole(null);
          setProfile(null);
          setLoading(false);
          router.replace("/login");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [router, allowedLower]);

  return { loading, ok, role, profile };
}