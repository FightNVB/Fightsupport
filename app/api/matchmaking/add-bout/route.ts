import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Payload = {
  matchmaking_id: string;
  discipline: string;
  klasse: string;

  rood_naam: string;
  rood_gym: string;
  va_rood: string;
  rood_gewicht: number;

  blauw_naam: string;
  blauw_gym: string;
  va_blauw: string;
  blauw_gewicht: number;

  max_gewicht: number | null;
};

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function toNum(v: any): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toVaStrict(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (/^\d{1,6}$/.test(s)) return s;
  const digits = s.replace(/[^0-9]/g, "");
  if (/^\d{1,6}$/.test(digits)) return digits;
  return null;
}

function resolveOrigin(req: Request) {
  const fromHeader = req.headers.get("origin") || "";

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || (host ? "https" : "");
  const fromHost = host ? `${proto}://${host}` : "";

  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "") ||
    "";

  return (fromHeader || fromHost || fromEnv).replace(/\/$/, "");
}

function asUuid(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
    ? s
    : null;
}

function safeStatusFromKlasse(klasse: string): string {
  const k = klasse.toLowerCase();
  if (k.includes("jeugd")) return "concept";
  return "concept";
}

function safeLeeftijdTypeFromKlasse(klasse: string): string | null {
  const k = klasse.toLowerCase();
  if (k.includes("jeugd")) return "jeugd";
  return "senior";
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnon || !serviceKey) {
      return bad(
        "Missing env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return bad("Missing Authorization Bearer token", 401);

    const authClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) return bad("Unauthorized", 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as Partial<Payload>;

    const matchmaking_id = asUuid(body.matchmaking_id);
    if (!matchmaking_id) return bad("matchmaking_id ontbreekt of is ongeldig");

    const discipline = String(body.discipline ?? "").trim();
    const klasse = String(body.klasse ?? "").trim();

    const rood_naam = String(body.rood_naam ?? "").trim();
    const rood_gym = String(body.rood_gym ?? "").trim();
    const va_rood = String(body.va_rood ?? "").trim();
    const rood_gewicht = toNum(body.rood_gewicht);

    const blauw_naam = String(body.blauw_naam ?? "").trim();
    const blauw_gym = String(body.blauw_gym ?? "").trim();
    const va_blauw = String(body.va_blauw ?? "").trim();
    const blauw_gewicht = toNum(body.blauw_gewicht);

    const max_gewicht = toNum(body.max_gewicht);

    if (!discipline) return bad("discipline ontbreekt");
    if (!klasse) return bad("klasse ontbreekt");
    if (!rood_naam) return bad("rood_naam ontbreekt");
    if (!rood_gym) return bad("rood_gym ontbreekt");
    if (!va_rood) return bad("va_rood ontbreekt");
    if (rood_gewicht == null) return bad("rood_gewicht ongeldig");
    if (!blauw_naam) return bad("blauw_naam ontbreekt");
    if (!blauw_gym) return bad("blauw_gym ontbreekt");
    if (!va_blauw) return bad("va_blauw ontbreekt");
    if (blauw_gewicht == null) return bad("blauw_gewicht ongeldig");

    const { data: mmRow, error: mmErr } = await admin
      .from("matchmaker_matchmakings")
      .select("*")
      .eq("id", matchmaking_id)
      .maybeSingle();

    if (mmErr) return bad(mmErr.message, 500);
    if (!mmRow) return bad("Matchmaking niet gevonden", 404);

    const matchmaker_matchmaking_id =
      Number(mmRow?.matchmaker_matchmaking_id ?? mmRow?.legacy_matchmaking_id ?? mmRow?.numeric_id);

    if (!Number.isFinite(matchmaker_matchmaking_id)) {
      return bad("matchmaker_matchmaking_id (int8) ontbreekt in matchmaker_matchmakings", 500);
    }

    const { data: latestUpload, error: upErr } = await admin
      .from("matchmaking_uploads")
      .select("id, event_id, evenement_datum, uploaded_at")
      .eq("matchmaking_id", matchmaking_id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (upErr) return bad(upErr.message, 500);

    const upload_id = latestUpload?.id ? String(latestUpload.id) : null;
    const event_id = latestUpload?.event_id ?? null;

    const { data: lastBout, error: lastErr } = await admin
      .from("matchmaker_bouts_raw")
      .select("partij_nr")
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) return bad(lastErr.message, 500);

    const nextPartijNr = Number(lastBout?.partij_nr ?? 0) + 1;

    const raw = {
      parse_mode: "manual_add",
      created_by: userRes.user.id,
      source: "add-bout",
      event_id,
      upload_id,
      rood: {
        naam: rood_naam,
        gym: rood_gym,
        va: va_rood,
        gewicht: rood_gewicht,
      },
      blauw: {
        naam: blauw_naam,
        gym: blauw_gym,
        va: va_blauw,
        gewicht: blauw_gewicht,
      },
    };

    const insertRow = {
      matchmaker_matchmaking_id,
      matchmaking_id,
      partij_nr: nextPartijNr,

      discipline,
      klasse,
      status: safeStatusFromKlasse(klasse),
      leeftijd_type: safeLeeftijdTypeFromKlasse(klasse),

      rood_inschrijving_id: null,
      blauw_inschrijving_id: null,

      rood_naam,
      blauw_naam,

      rood_gym,
      blauw_gym,

      rood_va: va_rood,
      blauw_va: va_blauw,

      rood_gewicht,
      blauw_gewicht,
      max_gewicht,

      geslacht: null,
      created_by: userRes.user.id,
      source_match_id: null,
      raw,
    };

    const { data: inserted, error: insErr } = await admin
      .from("matchmaker_bouts_raw")
      .insert(insertRow)
      .select("*")
      .single();

    if (insErr) return bad(insErr.message, 500);

    const vaR = toVaStrict(va_rood);
    const vaB = toVaStrict(va_blauw);

    if (!vaR || !vaB) {
      return NextResponse.json({
        ok: true,
        row: inserted,
        rescrape: {
          ok: false,
          skipped: true,
          error: "Rescrape overgeslagen: VA nummers ontbreken/ongeldig.",
          partij_nr: nextPartijNr,
          va_rood: vaR,
          va_blauw: vaB,
        },
      });
    }

    let rescrapeOk = false;
    let rescrapeError: string | null = null;

    try {
      const origin = resolveOrigin(req);
      const url = origin
        ? `${origin}/api/control-engine/bout-rescrape`
        : "/api/control-engine/bout-rescrape";

      const cookie = req.headers.get("cookie") || "";

      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          cookie,
        },
        body: JSON.stringify({
          matchmaking_id,
          partij_nr: nextPartijNr,
          va_rood: vaR,
          va_blauw: vaB,
        }),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        rescrapeError = j?.error ?? `bout-rescrape failed (${r.status})`;
      } else {
        rescrapeOk = true;
      }
    } catch (e: any) {
      rescrapeError = e?.message ?? String(e);
    }

    return NextResponse.json({
      ok: true,
      row: inserted,
      rescrape: {
        ok: rescrapeOk,
        skipped: false,
        error: rescrapeError,
        partij_nr: nextPartijNr,
        va_rood: vaR,
        va_blauw: vaB,
      },
    });
  } catch (e: any) {
    return bad(e?.message ?? String(e), 500);
  }
}