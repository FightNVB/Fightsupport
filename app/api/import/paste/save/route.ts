// app/api/import/paste/save/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type PasteRow = {
  partij_nr: number | null;

  discipline: string | null;
  klasse: string | null;

  rood_naam: string | null;
  rood_va: string | null;
  rood_gewicht: number | null;
  rood_gym: string | null;

  blauw_naam: string | null;
  blauw_va: string | null;
  blauw_gewicht: number | null;
  blauw_gym: string | null;

  max_gewicht: number | null;
};

function isoDateOnly(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function weightToDb(v: number | null): string | null {
  if (v === null || v === undefined) return null;
  if (!Number.isFinite(v)) return null;
  return (Math.round(v * 10) / 10).toFixed(1);
}

function toUpper(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.toUpperCase();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const rows = (body?.rows ?? []) as PasteRow[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Geen rijen ontvangen." }, { status: 400 });
    }

    const uploaded_by = String(body?.uploaded_by ?? "").trim() || null;
    const evenement_naam = String(body?.evenement_naam ?? "").trim() || "Paste import";
    const evenement_datum = isoDateOnly(body?.evenement_datum);
    const event_id = String(body?.event_id ?? "").trim() || null;
    const matchmaker = String(body?.matchmaker ?? "").trim() || null;

    let finalEventNaam = evenement_naam;
    let finalEventDatum = evenement_datum;

    if (event_id) {
      const { data: ev } = await supabaseAdmin.from("events").select("naam, datum").eq("id", event_id).maybeSingle();
      if (ev) {
        finalEventNaam = String((ev as any)?.naam ?? finalEventNaam ?? "Paste import");
        const d = String((ev as any)?.datum ?? "").slice(0, 10);
        if (d) finalEventDatum = d;
      }
    }

    const matchmaking_id = crypto.randomUUID();
    const upload_id = crypto.randomUUID();

    const uploadInsert: any = {
      id: upload_id,
      evenement_naam: finalEventNaam,
      evenement_datum: finalEventDatum,
      uploaded_by,
      uploaded_at: new Date().toISOString(),
      controle_status: "nog_niet",
      event_id,
      matchmaking_id,
      matchmaker,
      raw_filename: null,
      bestandsnaam: null,
    };

    const { error: upErr } = await supabaseAdmin.from("matchmaking_uploads").insert(uploadInsert);
    if (upErr) {
      return NextResponse.json({ ok: false, error: `Opslaan upload mislukt: ${upErr.message}` }, { status: 500 });
    }

    const bouts = rows.map((r, idx) => {
      const partij_nr = r.partij_nr && Number.isFinite(r.partij_nr) ? r.partij_nr : idx + 1;

      return {
        upload_id,
        matchmaking_id,
        partij_nr,

        rood_naam: r.rood_naam ?? null,
        rood_gym: r.rood_gym ?? null,
        rood_gewicht: weightToDb(r.rood_gewicht),
        va_rood: r.rood_va ?? null,

        blauw_naam: r.blauw_naam ?? null,
        blauw_gym: r.blauw_gym ?? null,
        blauw_gewicht: weightToDb(r.blauw_gewicht),
        va_blauw: r.blauw_va ?? null,

        max_gewicht: weightToDb(r.max_gewicht),
        discipline: toUpper(r.discipline),
        klasse: r.klasse ? String(r.klasse).trim() : null,

        raw_json: JSON.stringify({ parse_mode: "paste", row_index: idx }),
        row_index: idx,
        bout_uid: crypto.randomUUID(),
        event_id: event_id ?? null,
      };
    });

    for (const part of chunk(bouts, 500)) {
      const { error: bErr } = await supabaseAdmin.from("matchmaking_bouts_raw").insert(part);
      if (bErr) {
        return NextResponse.json(
          { ok: false, error: `Opslaan bouts mislukt: ${bErr.message}`, upload_id, matchmaking_id },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, upload_id, matchmaking_id, inserted_bouts: bouts.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Onbekende fout bij opslaan paste import." }, { status: 500 });
  }
}