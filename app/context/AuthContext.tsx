"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type RoleName =
  | "superadmin"
  | "admin"
  | "promotor"
  | "matchmaker"
  | "official"
  | "hoofdofficial"
  | "dispensatie_admin"
  | "trainer";

interface AuthContextType {
  user: any | null;
  roles: RoleName[];
  loading: boolean; // true = auth is nog aan het laden
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function asRoleName(v: any): RoleName | null {
  const r = String(v ?? "").trim().toLowerCase();
  if (!r) return null;

  // normaliseer eventuele oude schrijfwijzen
  if (r === "dispensatie_admin" || r === "dispensatie admin" || r === "dispensatie-admin") return "dispensatie_admin";

  // whitelist
  const allowed = new Set<RoleName>([
    "superadmin",
    "admin",
    "promotor",
    "matchmaker",
    "official",
    "hoofdofficial",
    "dispensatie_admin",
    "trainer",
  ]);

  return allowed.has(r as RoleName) ? (r as RoleName) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- ⭐ FIXED LOADER: sessie correct ophalen ----
  const loadAuthState = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user) {
      setUser(null);
      setRoles([]);
      setLoading(false);
      return;
    }

    const u = session.user;
    setUser(u);

    let { data: prof, error: profErr } = await supabase
      .from("user_profiles")
      .select("id, email, role, active_role")
      .eq("id", u.id)
      .maybeSingle();

    if (!profErr && !(prof as any)?.id && u.email) {
      const byEmail = await supabase
        .from("user_profiles")
        .select("id, email, role, active_role")
        .ilike("email", u.email)
        .maybeSingle();
      prof = byEmail.data;
      profErr = byEmail.error;
    }

    if (profErr || !(prof as any)?.id) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const { data: userRoles, error: userRolesError } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", (prof as any).id);

    if (userRolesError || !userRoles) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const roleIds = userRoles.map((r: any) => r.role_id).filter(Boolean);
    if (roleIds.length === 0) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from("roles")
      .select("id, name")
      .in("id", roleIds);

    if (rolesError || !rolesData) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const mapped = rolesData
      .map((r: any) => asRoleName(r?.name))
      .filter(Boolean) as RoleName[];

    const allowed = Array.from(new Set(mapped));
    const activeRole = asRoleName((prof as any)?.active_role);
    const legacyRole = asRoleName((prof as any)?.role);

    if (activeRole) {
      setRoles(allowed.includes(activeRole) ? [activeRole] : []);
    } else if (legacyRole && allowed.includes(legacyRole)) {
      setRoles([legacyRole]);
    } else {
      setRoles([]);
    }
    setLoading(false);
  };

  // ---- ✅ Logout ----
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      // hard redirect voorkomt "blijven hangen" door oude state
      window.location.href = "/login";
    }
  };

  // ---- 🔄 Auth herladen bij sessie-wijzigingen ----
  useEffect(() => {
    loadAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAuthState(); // na login / logout / refresh opnieuw laden
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        loading,
        refresh: loadAuthState,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth moet binnen AuthProvider gebruikt worden");
  return ctx;
}
