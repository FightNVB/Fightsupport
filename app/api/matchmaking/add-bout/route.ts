// app/api/.../add-bout/route.ts
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
  // In sommige deployments ontbreekt Origin; daarom fallbacks.
  const fromHeader = req.headers.get("origin") || "";

  // Host/proto fallback (werkt achter proxies zoals Vercel/NGINX)
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

    // ✅ Auth check (token verplicht)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return bad("Missing Authorization Bearer token", 401);

    const authClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) return bad("Unauthorized", 401);

    // ✅ Service client (insert mag ook als RLS strak staat)
    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as Partial<Payload>;

    const matchmaking_id = String(body.matchmaking_id ?? "").trim();
    if (!matchmaking_id) return bad("matchmaking_id ontbreekt");

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

    // minimale validatie
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

    // ✅ Pak laatste upload voor deze matchmaking (voor upload_id + event_id)
    const { data: latestUpload, error: upErr } = await admin
      .from("matchmaking_uploads")
      .select("id, event_id, evenement_datum, uploaded_at")
      .eq("matchmaking_id", matchmaking_id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (upErr) return bad(upErr.message, 500);
    if (!latestUpload?.id) return bad("Geen matchmaking_upload gevonden voor dit matchmaking_id", 400);

    const upload_id = String(latestUpload.id);
    const event_id = latestUpload.event_id ?? null;

    // ✅ Next partij_nr (max + 1)
    const { data: lastBout, error: lastErr } = await admin
      .from("matchmaking_bouts_raw")
      .select("partij_nr")
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) return bad(lastErr.message, 500);

    const nextPartijNr = Number(lastBout?.partij_nr ?? 0) + 1;

    const bout_uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const insertRow = {
      upload_id,
      matchmaking_id,
      partij_nr: nextPartijNr,
      discipline,
      klasse,

      rood_naam,
      rood_gym,
      va_rood,
      rood_gewicht,

      blauw_naam,
      blauw_gym,
      va_blauw,
      blauw_gewicht,

      max_gewicht,

      event_id,

      // handig om te kunnen herkennen
      raw_json: JSON.stringify({ parse_mode: "manual_add", created_by: userRes.user.id }),

      bout_uid,
    };

    const { data: inserted, error: insErr } = await admin
      .from("matchmaking_bouts_raw")
      .insert(insertRow)
      .select("*")
      .single();

    if (insErr) return bad(insErr.message, 500);

    // ✅ NA INSERT: scoped rescrape (op VA’s) zodat controle_bout_context meteen bijgewerkt wordt
    const vaR = toVaStrict(va_rood);
    const vaB = toVaStrict(va_blauw);

    if (!vaR || !vaB) {
      // Insert is ok, maar rescrape kan niet zonder VA’s
      return NextResponse.json({
        ok: true,
        row: inserted,
        rescrape: {
          ok: false,
          skipped: true,
          error: "Rescrape overgeslagen: VA nummers ontbreken/ongeldig (va_rood en va_blauw zijn verplicht).",
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
      const url = origin ? `${origin}/api/control-engine/bout-rescrape` : "/api/control-engine/bout-rescrape";

      // Sommige endpoints gebruiken cookie-sessie i.p.v. bearer; daarom beiden doorgeven.
      const cookie = req.headers.get("cookie") || "";

      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader, // bearer doorgeven
          cookie, // sessie doorgeven (voor requireUserWithRole / assertCanAccessMatchmaking)
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
