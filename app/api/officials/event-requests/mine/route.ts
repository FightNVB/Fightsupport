import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const REQUEST_STATUSES = ["verzonden_naar_official", "geaccepteerd", "afgewezen"];
const ALLOWED_ROLES = ["official", "hoofdofficial", "admin", "superadmin"];

function asText(v: unknown): string {
  return String(v ?? "").trim();
}

function isUuid(v: unknown): v is string {
  const s = asText(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function bearerToken(req: Request): string {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return asText(m?.[1]);
}

function normRole(v: unknown): string {
  return asText(v).toLowerCase();
}

function normBondteam(v: unknown): string {
  return asText(v).toUpperCase();
}

export async function GET(req: Request) {
  try {
    const token = bearerToken(req);
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Geen geldige sessie gevonden. Log opnieuw in." },
        { status: 401 },
      );
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError) throw authError;

    const userId = asText(authData?.user?.id);
    if (!isUuid(userId)) {
      return NextResponse.json(
        { ok: false, error: "Gebruiker niet herkend. Log opnieuw in." },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, role, bondteam")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Gebruikersprofiel niet gevonden in user_profiles." },
        { status: 403 },
      );
    }

    const role = normRole((profile as any).role);
    const bondteam = normBondteam((profile as any).bondteam);

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { ok: false, error: "Niet toegestaan voor deze rol." },
        { status: 403 },
      );
    }

    if (!bondteam) {
      return NextResponse.json(
        { ok: false, error: "Geen bondteam gevonden in user_profiles." },
        { status: 403 },
      );
    }

    let query = supabase
      .from("event_requests")
      .select("id, naam, datum, locatie, bondteam, disciplines, promotor_name, status, opmerking_admin")
      .in("status", REQUEST_STATUSES)
      .order("datum", { ascending: true });

    // Superadmin van NVB mag alles zien. Iedereen anders alleen eigen bondteam.
    if (!(role === "superadmin" && bondteam === "NVB")) {
      query = query.eq("bondteam", bondteam);
    }

    // Officials/hoofdofficials zien alleen verzoeken die aan hun user_id zijn toegewezen.
    // Admin/superadmin zien de verzoeken van hun bondteam, zodat bondteam-overzicht werkt.
    if (role === "official" || role === "hoofdofficial") {
      query = query.eq("toegewezen_hoofdofficial_user_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      viewer: {
        id: userId,
        role,
        bondteam,
        name: asText((profile as any).full_name) || asText((profile as any).email) || "Gebruiker",
      },
      rows: data ?? [],
    });
  } catch (e: any) {
    console.error("GET /api/officials/event-requests/mine failed", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Laden mislukt" },
      { status: 500 },
    );
  }
}
