import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

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
    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    const userId = auth.userId;
    const role = auth.role;
    const bondteam = normBondteam(auth.bondteam);

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

    if (role !== "superadmin" && role !== "admin") {
      query = query.eq("bondteam", bondteam);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      viewer: {
        id: userId,
        role,
        bondteam,
        name: asText(auth.profile?.full_name) || asText(auth.email) || "Gebruiker",
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
