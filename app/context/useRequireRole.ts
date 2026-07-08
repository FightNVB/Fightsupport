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
        let { data: prof, error } = await supabase
          .from("user_profiles")
          .select("id, email, full_name, role, active_role, bondteam, created_at")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && !prof?.id && user.email) {
          const byEmail = await supabase
            .from("user_profiles")
            .select("id, email, full_name, role, active_role, bondteam, created_at")
            .ilike("email", user.email)
            .maybeSingle();
          prof = byEmail.data;
          error = byEmail.error;
        }

        if (error) throw error;
        if (!prof?.id) throw new Error("NO_PROFILE");

        const { data: userRoles, error: userRolesError } = await supabase
          .from("user_roles")
          .select("role_id")
          .eq("user_id", prof.id);

        if (userRolesError) throw userRolesError;

        const roleIds = (userRoles ?? []).map((row: any) => row.role_id).filter(Boolean);
        let allowedProfileRoles: string[] = [];

        if (roleIds.length > 0) {
          const { data: rolesData, error: rolesError } = await supabase
            .from("roles")
            .select("id, name")
            .in("id", roleIds);

          if (rolesError) throw rolesError;

          allowedProfileRoles = Array.from(
            new Set(
              (rolesData ?? [])
                .map((row: any) => String(row?.name ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_"))
                .filter(Boolean)
            )
          );
        }

        const activeRole = String(prof?.active_role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_") || null;
        const legacyRole = String(prof?.role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_") || null;
        const r =
          activeRole && allowedProfileRoles.includes(activeRole)
            ? activeRole
            : !activeRole && legacyRole && allowedProfileRoles.includes(legacyRole)
              ? legacyRole
              : null;

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
