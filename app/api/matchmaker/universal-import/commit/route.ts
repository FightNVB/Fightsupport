import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processMatchmakingFighters } from "@/lib/matchmaker/processMatchmakingFighters";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
export const runtime = "nodejs";
const s = (v: unknown) => String(v ?? "").trim();
const num = (v: unknown) => { const n = Number(String(v ?? "").replace(",", ".").replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? Math.abs(n) : null; };
async function getUser(req: Request) { const auth=req.headers.get("authorization")||""; const token=auth.startsWith("Bearer ")?auth.slice(7):""; const {data,error}=await supabase.auth.getUser(token); if(error||!data.user) throw new Error("Niet ingelogd."); return data.user; }

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    const body = await req.json();
    const matchmakingId = s(body.matchmaking_id);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!matchmakingId || !rows.length) throw new Error("Geen te importeren aanmeldingen ontvangen.");
    const { data: mm } = await supabase.from("matchmakings").select("id,maker_user_id,matchmaker_id,uploaded_by,locked_for_editing,stadium,status").eq("id", matchmakingId).maybeSingle();
    if (!mm) throw new Error("Matchmaking niet gevonden.");
    if (![mm.maker_user_id, mm.matchmaker_id, mm.uploaded_by].filter(Boolean).includes(user.id)) throw new Error("Geen rechten voor deze matchmaking.");
    if (mm.locked_for_editing) throw new Error("Deze matchmaking is vergrendeld.");

    const vaNumbers = [...new Set(rows.map((r:any)=>s(r.va_nummer)).filter(Boolean))];
    const { data: fighters, error: fighterError } = await supabase.from("fightpassport_fighters").select("*").in("va_nummer", vaNumbers);
    if (fighterError) throw fighterError;
    const byVa = new Map((fighters ?? []).map((f:any)=>[s(f.va_nummer).replace(/^0+(?=\d)/,""), f]));
    const { data: existing } = await supabase.from("aanmeldingen").select("va_nummer").eq("matchmaking_id", matchmakingId).in("va_nummer", vaNumbers);
    const existingVa = new Set((existing ?? []).map((r:any)=>s(r.va_nummer).replace(/^0+(?=\d)/,"")));
    const inserts:any[] = [];
    const skipped:any[] = [];

    for (const row of rows) {
      const va = s(row.va_nummer).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      const fighter:any = byVa.get(va);
      const weight = num(row.trainer_weight);
      const maxWeight = num(row.max_weight);
      if (!fighter || !weight || !s(row.trainer_school) || !s(row.discipline) || !s(row.klasse) || maxWeight == null) { skipped.push({ va_nummer: va, reason: "Verplichte koppeling of matchmakerkeuze ontbreekt" }); continue; }
      if (existingVa.has(va)) { skipped.push({ va_nummer: va, reason: "Staat al in matchmaking" }); continue; }
      inserts.push({
        matchmaking_id: matchmakingId,
        status: "rauw",
        discipline: s(row.discipline),
        klasse: s(row.klasse),
        geslacht: s(fighter.geslacht) || null,
        voornaam: s(fighter.voornaam) || null,
        achternaam: s(fighter.achternaam) || null,
        naam: s(fighter.naam) || null,
        geboortedatum: s(fighter.geboortedatum) || null,
        email: s(fighter.email) || null,
        telefoon: s(fighter.telefoon) || null,
        gym: s(row.trainer_school),
        va_nummer: va,
        gewicht: weight,
        max_gewicht: maxWeight,
        win: null, loss: null, draw: null, demo: null,
        opmerkingen: Array.isArray(row.source_notes) ? row.source_notes.join(" | ") || null : null,
        raw: {
          universal_import: true,
          bron_type: s(body.source_type) || "tekst",
          bron_afzender: s(body.sender_name) || null,
          bron_tekst: s(body.source_text) || null,
          bron_blok: s(row.raw_block) || null,
          bron_opgegeven: {
            naam: s(row.source_name) || null, va_nummer: s(row.source_va) || null,
            geboortedatum: s(row.source_birth_date) || null, geslacht: s(row.source_gender) || null,
            discipline: s(row.source_discipline) || null, klasse: s(row.source_class) || null,
            record: s(row.source_record) || null, gewicht: s(row.trainer_weight_text) || weight,
            sportschool: s(row.trainer_school), email: s(row.source_email) || null,
          },
          waarheid: { trainer: ["gewicht", "sportschool"], matchmaker: ["discipline", "klasse", "max_gewicht"], database: ["identiteit", "naam", "geboortedatum", "geslacht", "record", "licentie", "startverbod"] },
          imported_by: user.id,
          imported_at: new Date().toISOString(),
        },
        uploaded_by: user.id,
      });
      existingVa.add(va);
    }
    if (!inserts.length) return NextResponse.json({ error: "Geen geldige nieuwe aanmeldingen om te importeren.", skipped }, { status: 400 });
    let payload = inserts;
    let inserted:any[]=[];
    for (let attempt=0; attempt<12; attempt++) {
      const { data, error } = await supabase.from("aanmeldingen").insert(payload).select("*");
      if (!error) { inserted=data??[]; break; }
      const missing=String(error.message||"").match(/Could not find the ['\"]([^'\"]+)['\"] column/i)?.[1];
      if (!missing || !payload.some((r:any)=>missing in r)) throw error;
      payload=payload.map((r:any)=>{ const x={...r}; delete x[missing]; return x; });
    }
    await supabase.from("matchmakings").update({ last_updated_at:new Date().toISOString(), last_updated_by:user.id }).eq("id",matchmakingId);

    let totalProcessed = 0;
    let totalRuleHits = 0;

    for (const row of inserted) {
      const processing = await processMatchmakingFighters({
        supabase,
        matchmakingId,
        aanmeldingId: row.id,
      });

      totalProcessed += processing.processed;
      totalRuleHits += processing.hits.length;
    }

    return NextResponse.json({
      ok: true,
      inserted: inserted.length,
      skipped,
      fighter_processing: {
        processed: totalProcessed,
        rule_hits: totalRuleHits,
      },
    });
  } catch(e:any) { return NextResponse.json({ error:e?.message||"Importeren mislukt." },{status:400}); }
}
