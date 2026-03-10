import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ALLOWED_BONDTEAMS = new Set(["IRO", "NKF", "WPKL", "WMTA", "VON", "UMC", "MMAAN", "MON"]);
const ALLOWED_DISCIPLINES = new Set(["MMA", "KB", "MT", "K1"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const naam = String(body?.naam ?? "").trim();
    const datum = String(body?.datum ?? "").trim();
    const locatie = body?.locatie == null ? null : String(body.locatie).trim() || null;
    const status = String(body?.status ?? "draft").trim() || "draft";

    const bondteamRaw = body?.bondteam == null ? null : String(body.bondteam).trim();
    const bondteam = bondteamRaw && ALLOWED_BONDTEAMS.has(bondteamRaw) ? bondteamRaw : null;

    const disciplinesIn: unknown[] = Array.isArray(body?.disciplines) ? body.disciplines : [];
    const disciplines = disciplinesIn
      .map((x) => String(x).trim())
      .filter((x) => ALLOWED_DISCIPLINES.has(x));

    const promotor = body?.promotor == null ? null : String(body.promotor).trim() || null;
    const matchmaker = body?.matchmaker == null ? null : String(body.matchmaker).trim() || null;
    const hoofdofficial = body?.hoofdofficial == null ? null : String(body.hoofdofficial).trim() || null;

    if (!naam) return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    if (!datum) return NextResponse.json({ error: "Datum is verplicht" }, { status: 400 });

    // events insert
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .insert({
        naam,
        datum,
        locatie,
        status,
        bondteam,
        matchmaker,
        hoofdofficial,
      })
      .select("id")
      .single();

    if (evErr) {
      return NextResponse.json({ error: evErr.message }, { status: 500 });
    }

    // disciplines
    if (disciplines.length) {
      const rows = disciplines.map((d) => ({ event_id: ev.id, discipline: d }));
      const { error: dErr } = await supabase.from("event_disciplines").insert(rows);
      if (dErr) {
        // event bestaat al; disciplines fail → geef fout terug zodat je het ziet
        return NextResponse.json({ error: dErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, event_id: ev.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Onbekende fout" }, { status: 500 });
  }
}
