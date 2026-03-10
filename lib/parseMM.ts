import { createClient } from "@supabase/supabase-js";
import type { ParsedPartij, Discipline } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase URL of SERVICE ROLE KEY ontbreekt in environment.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export async function parseMatchmaking(matchmakingId: string): Promise<ParsedPartij[]> {
  // 1) Haal basisinfo van matchmaking
  const { data: mm, error: mmErr } = await supabaseAdmin
    .from("matchmakings")
    .select("id, naam, datum, matchmaking_upload_id")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (mmErr) throw mmErr;
  if (!mm) return [];

  const eventNaam = mm.naam ?? "Onbekend evenement";
  const datum = mm.datum ?? null;

  // 2) Haal alle bouts uit matchmaking_bouts_raw (incl gyms!)
  const { data: bouts, error: boutsErr } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select(`
      upload_id,
      bout_id,
      row_index,
      partij_nr,
      partij_nummer,

      rood_naam,
      rood_gym,
      rood_gewicht,
      va_rood,
      rood_va,

      blauw_naam,
      blauw_gym,
      blauw_gewicht,
      va_blauw,
      blauw_va,

      max_gewicht,
      klasse,
      discipline,
      rondes,
      extra
    `)
    .eq("matchmaking_id", matchmakingId)
    .order("row_index", { ascending: true });

  if (boutsErr) throw boutsErr;
  if (!bouts || bouts.length === 0) return [];

  return bouts.map((b: any) => {
    const id = String(b.bout_id ?? `${b.upload_id ?? "u"}-${b.row_index ?? "r"}`);

    // VA’s (support beide naamvarianten)
    const roodVa = (b.va_rood ?? b.rood_va ?? "") as string;
    const blauwVa = (b.va_blauw ?? b.blauw_va ?? "") as string;

    // partij nr (support beide naamvarianten)
    const partijNr = b.partij_nr ?? b.partij_nummer ?? null;

    return {
      id,
      matchmaking_id: matchmakingId,
      event_naam: eventNaam,
      datum,

      discipline: (b.discipline || "KB") as Discipline,

      // jouw ParsedPartij velden (ik laat gyms alleen staan als je type het heeft)
      rood_nvb: roodVa,
      blauw_nvb: blauwVa,

      rood_naam: b.rood_naam ?? "",
      blauw_naam: b.blauw_naam ?? "",

      // als je ParsedPartij ook gyms heeft: zet ze erbij
      // rood_gym: b.rood_gym ?? null,
      // blauw_gym: b.blauw_gym ?? null,

      // gewichten: jouw MM lijkt 2 velden te hebben
      gewicht_rood: b.rood_gewicht ?? null,
      gewicht_blauw: b.blauw_gewicht ?? null,

      // extra info
      rondes: b.rondes ?? null,
      tijd_per_ronde: null,

      // eventueel: partij nr in extra stoppen als je type geen veld heeft
      // partij_nr: partijNr,

      leeftijd_rood: null,
      leeftijd_blauw: null,
    } as ParsedPartij;
  });
}
