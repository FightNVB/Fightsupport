// lib/control/buildControleBoutContext.ts

import dayjs from "dayjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildClassAwareRecord, totalsToFlat } from "@/lib/recordCalculator";
import { makeBoutId } from "@/lib/shared/makeBoutId";
import crypto from "crypto";

function toIsoDateOnly(d: any): string | null {
  if (!d) return null;
  const x = dayjs(d);
  return x.isValid() ? x.format("YYYY-MM-DD") : null;
}

function calcAgeYears(geboorte: any, eventDate: any): number | null {
  const g = dayjs(geboorte);
  const e = dayjs(eventDate);
  if (!g.isValid() || !e.isValid()) return null;
  const years = e.diff(g, "year");
  return Number.isFinite(years) ? years : null;
}

function normGender(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (s.startsWith("m")) return "man";
  if (s.startsWith("v")) return "vrouw";
  if (s.includes("male")) return "man";
  if (s.includes("female")) return "vrouw";
  return String(v);
}

function mapUitslagen(rows: any[]) {
  return rows.map((r) => ({
    datum: r.datum ?? null,
    discipline: r.discipline ?? null,
    klasse: r.klasse ?? null,
    uitslag: r.uitslag ?? null,
  }));
}

function toNullableStr(v: any): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function toNullableNumber(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toNullableBool(v: any): boolean | null {
  if (v === true || v === false) return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["true", "1", "ja", "yes", "y"].includes(s)) return true;
  if (["false", "0", "nee", "no", "n"].includes(s)) return false;
  return null;
}

function toBoolJaNeeLoose(v: any): boolean | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (["ja", "yes", "true", "1"].includes(s)) return true;
  if (["nee", "no", "false", "0"].includes(s)) return false;
  return null;
}

function toVaStrict(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (/^\d{1,5}$/.test(s)) return s;
  const digits = s.replace(/[^0-9]/g, "");
  if (/^\d{1,5}$/.test(digits)) return digits;
  return null;
}

type EvenementInfo = {
  evenement_naam: string | null;
  evenement_datum: string | null; // YYYY-MM-DD
  event_id: string | null;
};

async function fetchEvenementInfo(matchmaking_id: string): Promise<EvenementInfo> {
  // Primair: nieuwste matchmaking_uploads rij
  const { data, error } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("evenement_naam, evenement_datum, event_id")
    .eq("matchmaking_id", matchmaking_id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  let evenement_naam: string | null = toNullableStr((data as any)?.[0]?.evenement_naam ?? null);
  let evenement_datum: string | null = toIsoDateOnly((data as any)?.[0]?.evenement_datum ?? null);
  const event_id: string | null = toNullableStr((data as any)?.[0]?.event_id ?? null);

  // Fallback: events tabel (als event_id bestaat en info (deels) ontbreekt)
  if (event_id && (!evenement_naam || !evenement_datum)) {
    const { data: ev, error: evErr } = await supabaseAdmin
      .from("events")
      .select("naam, datum")
      .eq("id", event_id)
      .maybeSingle();

    if (evErr) throw evErr;

    if (!evenement_naam) evenement_naam = toNullableStr((ev as any)?.naam ?? null);
    if (!evenement_datum) evenement_datum = toIsoDateOnly((ev as any)?.datum ?? null);
  }

  return { evenement_naam, evenement_datum, event_id };
}

// ✅ MMA: afleiden huidige klasse uit uitslagen (laatste partij)
function parseMmaFromUitslagKlasse(v: any): "PRO" | "AMATEUR" | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return null;
  if (s === "P" || s === "PRO") return "PRO";
  if (s === "AMA" || s === "AMATEUR") return "AMATEUR";
  return null;
}

function latestUitslagByDatum(uitslagen: any[]): any | null {
  if (!Array.isArray(uitslagen) || uitslagen.length === 0) return null;
  // probeer te sorteren op datum (YYYY-MM-DD). Als datum ontbreekt: laat originele volgorde staan.
  const withDate = uitslagen
    .map((u) => ({ u, d: toIsoDateOnly((u as any)?.datum) }))
    .filter((x) => !!x.d);

  if (withDate.length > 0) {
    withDate.sort((a, b) => (a.d! < b.d! ? 1 : a.d! > b.d! ? -1 : 0));
    return withDate[0].u;
  }

  return uitslagen[uitslagen.length - 1] ?? null;
}

function resolveMmaCurrentKlasse(fighter: any, uitslagen: any[]): "PRO" | "AMATEUR" | null {
  // 1) direct uit fighters_raw (als aanwezig)
  const direct =
    fighter?.mma_current_klasse ??
    fighter?.mma_klasse ??
    fighter?.current_mma_class ??
    fighter?.rood_mma_current_klasse ??
    fighter?.blauw_mma_current_klasse;

  const directParsed = parseMmaFromUitslagKlasse(direct);
  if (directParsed) return directParsed;

  // 2) anders: laatste partij in uitslagen_raw
  const last = latestUitslagByDatum(uitslagen);
  const parsed = parseMmaFromUitslagKlasse(last?.klasse);
  return parsed;
}

export async function buildControleBoutContext(matchmaking_id: string, controle_run_id: string) {
  if (!matchmaking_id) throw new Error("[buildControleBoutContext] matchmaking_id ontbreekt");
  if (!controle_run_id) throw new Error("[buildControleBoutContext] controle_run_id ontbreekt");

  console.log("[buildControleBoutContext] start", { matchmaking_id, controle_run_id });

  // 1) bouts ophalen
  const { data: bouts, error: bErr } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("*") // moet bout_uid bevatten
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: true });

  if (bErr) throw bErr;
  if (!bouts?.length) return;

  // 2) event info (naam + datum) waarheid
  const evInfo = await fetchEvenementInfo(matchmaking_id);
  const evenement_datum = evInfo.evenement_datum;
  const evenement_naam = evInfo.evenement_naam;

  if (!evenement_datum)
    console.warn("[buildControleBoutContext] evenement_datum is NULL", { matchmaking_id });
  if (!evenement_naam)
    console.warn("[buildControleBoutContext] evenement_naam is NULL", { matchmaking_id });

  // 3) VA’s verzamelen
  const vas = new Set<string>();
  for (const p of bouts as any[]) {
    const r = toVaStrict(p?.va_rood);
    const b = toVaStrict(p?.va_blauw);
    if (r) vas.add(r);
    if (b) vas.add(b);
  }

  // 4) fighters_raw bulk
  const fighterByVa = new Map<string, any>();
  if (vas.size > 0) {
    const { data: fighters, error: fErr } = await supabaseAdmin
      .from("fighters_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .in("va_nummer", [...vas]);

    if (fErr) throw fErr;
    for (const f of fighters ?? []) fighterByVa.set(String((f as any).va_nummer), f);
  }

  // 5) uitslagen_raw bulk
  const uitslagenByVa = new Map<string, any[]>();
  if (vas.size > 0) {
    const { data: uitslagen, error: uErr } = await supabaseAdmin
      .from("uitslagen_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .in("va_nummer", [...vas]);

    if (uErr) throw uErr;

    for (const r of uitslagen ?? []) {
      const va = String((r as any).va_nummer);
      if (!uitslagenByVa.has(va)) uitslagenByVa.set(va, []);
      uitslagenByVa.get(va)!.push(r);
    }
  }

  // 6) oude context weg
  const { error: delCtxErr } = await supabaseAdmin
    .from("controle_bout_context")
    .delete()
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);
  if (delCtxErr) throw delCtxErr;

  const { error: delUitsErr } = await supabaseAdmin
    .from("controle_uitslagen")
    .delete()
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);
  if (delUitsErr) throw delUitsErr;

  // 7) rows bouwen
  const rowsToInsert: any[] = [];
  const uitslagenToInsert: any[] = [];

  for (const partij of bouts as any[]) {
    const vaR = toVaStrict(partij?.va_rood);
    const vaB = toVaStrict(partij?.va_blauw);

    // ✅ VA wijziging (persistente bron): probeer 'oude MM VA' uit matchmaking_bouts_raw te lezen.
    // Belangrijk: controle_bout_context wordt per run opnieuw opgebouwd, dus 'prev' moet uit raw/audit komen.
    const vaRPrev = toVaStrict(
      (partij as any)?.rood_va_mm_prev ??
        (partij as any)?.va_rood_prev ??
        (partij as any)?.rood_va_prev ??
        null
    );
    const vaBPrev = toVaStrict(
      (partij as any)?.blauw_va_mm_prev ??
        (partij as any)?.va_blauw_prev ??
        (partij as any)?.blauw_va_prev ??
        null
    );

    const uitslagenR = vaR ? uitslagenByVa.get(vaR) ?? [] : [];
    const uitslagenB = vaB ? uitslagenByVa.get(vaB) ?? [] : [];

    const partijNr = partij?.partij_nr ?? null;

    // ✅ bout_id = immutable (uuid uit matchmaking_bouts_raw.bout_uid)
    let bout_id = makeBoutId(partij?.bout_uid);

    if (!bout_id) {
      // ❗ Dit mag eigenlijk nooit meer gebeuren als de parser altijd bout_uid zet.
      // Maar: liever NIET een hele partij verliezen. We maken dan een nieuwe uuid, loggen hard,
      // en schrijven hem meteen terug naar matchmaking_bouts_raw zodat het vanaf nu stabiel is.
      const newUid = crypto.randomUUID();
      console.error("[buildControleBoutContext] FATAAL: bout_uid ontbreekt/ongeldig -> maak nieuwe bout_uid", {
        matchmaking_id,
        controle_run_id,
        partij_nr: partijNr,
        upload_id: partij?.upload_id ?? null,
        rood_naam: partij?.rood_naam ?? null,
        blauw_naam: partij?.blauw_naam ?? null,
        bout_uid_type: typeof partij?.bout_uid,
        bout_uid_preview: String(partij?.bout_uid ?? "").slice(0, 120),
        new_uid: newUid,
      });

      // probeer te herstellen in raw-tabel (beste effort)
      if (partijNr != null) {
        try {
          await supabaseAdmin
            .from("matchmaking_bouts_raw")
            .update({ bout_uid: newUid })
            .eq("matchmaking_id", matchmaking_id)
            .eq("partij_nr", partijNr)
            .is("bout_uid", null);
        } catch (e) {
          console.warn("[buildControleBoutContext] herstel bout_uid mislukt (non-fatal)", e);
        }
      }

      // gebruik nieuwe uid als bout_id
      // (makeBoutId accepteert uuid-string)
      (partij as any).bout_uid = newUid;
    }
    bout_id = makeBoutId((partij as any).bout_uid);
    // ✅ uitslagen klaarzetten voor controle_uitslagen (met bout_id)
    if (partijNr != null) {
      if (vaR) {
        for (const u of uitslagenR) {
          uitslagenToInsert.push({
            matchmaking_id,
            controle_run_id,
            partij_nr: partijNr,
            bout_id,

            hoek: "rood",
            va_nummer: vaR,
            datum: u?.datum ? toIsoDateOnly(u.datum) : null,
            discipline: u?.discipline ?? null,
            klasse: u?.klasse ?? null,
            uitslag: u?.uitslag ?? null,
          });
        }
      }

      if (vaB) {
        for (const u of uitslagenB) {
          uitslagenToInsert.push({
            matchmaking_id,
            controle_run_id,
            partij_nr: partijNr,
            bout_id,

            hoek: "blauw",
            va_nummer: vaB,
            datum: u?.datum ? toIsoDateOnly(u.datum) : null,
            discipline: u?.discipline ?? null,
            klasse: u?.klasse ?? null,
            uitslag: u?.uitslag ?? null,
          });
        }
      }
    }

    const fr = vaR ? fighterByVa.get(vaR) : null;
    const fb = vaB ? fighterByVa.get(vaB) : null;

    const currentClass = partij?.klasse ?? partij?.klasse_mm ?? null;

    const recRClass = buildClassAwareRecord(uitslagenR, currentClass);
    const recBClass = buildClassAwareRecord(uitslagenB, currentClass);

    const flatR = totalsToFlat(recRClass.current._all);
    const flatB = totalsToFlat(recBClass.current._all);

    const histR = totalsToFlat(recRClass.historic._all);
    const histB = totalsToFlat(recBClass.historic._all);

    const rood_leeftijd_event =
      fr?.geboortedatum && evenement_datum ? calcAgeYears(fr.geboortedatum, evenement_datum) : null;
    const blauw_leeftijd_event =
      fb?.geboortedatum && evenement_datum ? calcAgeYears(fb.geboortedatum, evenement_datum) : null;

    // ✅ MMA: current klasse uit fighters_raw of laatste uitslag (P=PRO, AMA=AMATEUR)
    const rood_mma_current_klasse = resolveMmaCurrentKlasse(fr, uitslagenR);
    const blauw_mma_current_klasse = resolveMmaCurrentKlasse(fb, uitslagenB);

    rowsToInsert.push({
      controle_run_id,

      upload_id: partij?.upload_id ?? null,
      partij_nr: partij?.partij_nr ?? null,

      matchmaking_id: partij?.matchmaking_id ?? matchmaking_id,

      // ✅ stabiele bout sleutel (uuid)
      bout_id,

      discipline: partij?.discipline ?? null,
      klasse_mm: partij?.klasse ?? null,
      is_toernooi: toNullableBool(partij?.is_toernooi ?? partij?.toernooi),
      max_gewicht: toNullableNumber(partij?.max_gewicht),

      rood_naam_mm: toNullableStr(partij?.rood_naam),
      rood_gym_mm: toNullableStr(partij?.rood_gym),
      rood_gewicht_mm: toNullableNumber(partij?.rood_gewicht),
      rood_va_mm: vaR,
      // ✅ Als matchmaker VA is gecorrigeerd: toon zowel oude (MM) als nieuwe (huidig)
      // (prev blijft leeg als er nooit een wijziging is geweest)
      rood_va_mm_prev: vaRPrev,

      blauw_naam_mm: toNullableStr(partij?.blauw_naam),
      blauw_gym_mm: toNullableStr(partij?.blauw_gym),
      blauw_gewicht_mm: toNullableNumber(partij?.blauw_gewicht),
      blauw_va_mm: vaB,
      blauw_va_mm_prev: vaBPrev,

      evenement_naam: evenement_naam ?? null,
      evenement_datum: evenement_datum ?? null,

      // fighters_raw
      rood_naam_fp: fr?.naam ?? null,
      rood_geboortedatum_fp: fr?.geboortedatum ? toIsoDateOnly(fr.geboortedatum) : null,
      rood_geslacht: normGender(fr?.geslacht),
      rood_leeftijd_event,

      blauw_naam_fp: fb?.naam ?? null,
      blauw_geboortedatum_fp: fb?.geboortedatum ? toIsoDateOnly(fb.geboortedatum) : null,
      blauw_geslacht: normGender(fb?.geslacht),
      blauw_leeftijd_event,
      rood_mma_current_klasse,
      blauw_mma_current_klasse,


      rood_totaal_wedstrijden_scrape:
        fr?.totaal_wedstrijden ?? fr?.totaal ?? fr?.totaal_wedstrijden_scrape ?? null,
      rood_gewonnen_scrape: fr?.gewonnen ?? fr?.wins ?? fr?.gewonnen_scrape ?? null,

      blauw_totaal_wedstrijden_scrape:
        fb?.totaal_wedstrijden ?? fb?.totaal ?? fb?.totaal_wedstrijden_scrape ?? null,
      blauw_gewonnen_scrape: fb?.gewonnen ?? fb?.wins ?? fb?.gewonnen_scrape ?? null,

      rood_licentie: fr?.licentie ?? null,
      rood_heeft_startverbod:
        fr?.heeft_startverbod ??
        fr?.startverbod_actief ??
        toBoolJaNeeLoose(fr?.heeft_startverbod) ??
        null,

      blauw_licentie: fb?.licentie ?? null,
      blauw_heeft_startverbod:
        fb?.heeft_startverbod ??
        fb?.startverbod_actief ??
        toBoolJaNeeLoose(fb?.heeft_startverbod) ??
        null,

      rood_nulmeting_totaal: fr?.nulmeting_totaal ?? null,
      rood_nulmeting_opmerking: fr?.nulmeting_opmerking ?? null,
      rood_nulmeting_klasse: fr?.nulmeting_klasse ?? null,

      blauw_nulmeting_totaal: fb?.nulmeting_totaal ?? null,
      blauw_nulmeting_opmerking: fb?.nulmeting_opmerking ?? null,
      blauw_nulmeting_klasse: fb?.nulmeting_klasse ?? null,

      rood_record_w: flatR.record_w,
      rood_record_l: flatR.record_l,
      rood_record_d: flatR.record_d,
      rood_record_o: flatR.record_o,

      blauw_record_w: flatB.record_w,
      blauw_record_l: flatB.record_l,
      blauw_record_d: flatB.record_d,
      blauw_record_o: flatB.record_o,

      rood_demo: flatR.demo_totaal,
      blauw_demo: flatB.demo_totaal,

      rood_historisch_w: histR.record_w,
      rood_historisch_l: histR.record_l,
      rood_historisch_d: histR.record_d,
      rood_historisch_o: histR.record_o,
      rood_historisch_demo: histR.demo_totaal,
      rood_historisch_totaal: histR.partijen_historie,
      rood_historisch_overige_discipline: recRClass.historic_other_discipline_total,

      blauw_historisch_w: histB.record_w,
      blauw_historisch_l: histB.record_l,
      blauw_historisch_d: histB.record_d,
      blauw_historisch_o: histB.record_o,
      blauw_historisch_demo: histB.demo_totaal,
      blauw_historisch_totaal: histB.partijen_historie,
      blauw_historisch_overige_discipline: recBClass.historic_other_discipline_total,

      rood_uitslagen_per_discipline: recRClass,
      blauw_uitslagen_per_discipline: recBClass,
    });
  }

  // 8) insert controle_uitslagen (chunks)
  if (uitslagenToInsert.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < uitslagenToInsert.length; i += chunkSize) {
      const chunk = uitslagenToInsert.slice(i, i + chunkSize);
      const { error: uInsErr } = await supabaseAdmin.from("controle_uitslagen").insert(chunk);
      if (uInsErr) throw uInsErr;
    }
  }

  // 9) insert controle_bout_context
  if (rowsToInsert.length > 0) {
    const { error: insErr } = await supabaseAdmin.from("controle_bout_context").upsert(rowsToInsert, { onConflict: "controle_run_id,partij_nr" });
    if (insErr) throw insErr;
  }

  console.log("[buildControleBoutContext] klaar", {
    matchmaking_id,
    controle_run_id,
    rows: rowsToInsert.length,
    uitslagen: uitslagenToInsert.length,
  });
}
