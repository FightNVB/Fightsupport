import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function bad(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function allowedType(value: unknown) {
  const type = s(value);
  const allowed = new Set([
    "traint_niet_meer_bij_ons",
    "gegevens_wijzigen",
    "uitslag_klopt_niet",
    "licentie_klopt_niet",
    "startverbod_klopt_niet",
    "sportschool_klopt_niet",
    "anders",
  ]);
  return allowed.has(type) ? type : "anders";
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) return bad("Niet ingelogd", 401);

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) return bad("Ongeldige sessie", 401, userError?.message);

    const body = await req.json().catch(() => ({}));

    const fighterId = s(body.fighter_id || body.fighterId);
    const sportschoolId = s(body.sportschool_id || body.sportschoolId);
    const sportschoolNaam = s(body.sportschool_naam || body.sportschoolNaam);
    const vaNummer = s(body.va_nummer || body.vaNummer);
    const naam = s(body.naam);
    const type = allowedType(body.type);
    const melding = s(body.melding || body.bericht || body.opmerking);

    if (!fighterId) return bad("fighter_id ontbreekt");
    if (!melding) return bad("Melding ontbreekt");

    const insertRow = {
      status: "open",
      fighter_id: fighterId,
      sportschool_id: sportschoolId || null,
      sportschool_naam: sportschoolNaam || null,
      va_nummer: vaNummer || null,
      naam: naam || null,
      type,
      melding,
      created_by: userData.user.id,
      raw: body.snapshot && typeof body.snapshot === "object" ? body.snapshot : body,
    };

    const { data, error } = await supabaseAdmin
      .from("sportschool_vechter_meldingen")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      return bad("Melding opslaan mislukt", 500, error.message);
    }

    return NextResponse.json({ ok: true, melding: data });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}
