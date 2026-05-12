import dayjs from "dayjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildClassAwareRecord, totalsToFlat } from "@/lib/recordCalculator";
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

function toNullableStr(v: any): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function toNullableRealStr(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === "-" || low === "—" || low === "n.v.t." || low === "nvt" || low === "null" || low === "undefined") return null;
  return s;
}

function toernooiParticipantHasRealData(row: any): boolean {
  return !!(
    firstValidVa(row?.fighter_id, row?.va_nummer, row?.va_nummer_fp, row?.va_nummer_mm) ||
    toNullableRealStr(row?.naam_fp) ||
    toNullableRealStr(row?.naam) ||
    toNullableRealStr(row?.naam_mm) ||
    toNullableRealStr(row?.sportschool) ||
    toNullableRealStr(row?.sportschool_mm)
  );
}

function toNullableNumber(v: any): number | null {
  if (v == null) return null;
  const raw = String(v).trim();
  if (!raw) return null;

  let s = raw.toLowerCase().replace(/kg/g, "").replace(/\s+/g, "");

  if (/^-\d+([.,]\d+)?$/.test(s)) {
    s = s.slice(1);
  }

  s = s.replace(",", ".");
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
  if (/^\d{3,6}$/.test(s)) return s;
  const digits = s.replace(/[^0-9]/g, "");
  if (/^\d{3,6}$/.test(digits)) return digits;
  return null;
}

function firstValidVa(...values: any[]): string | null {
  for (const v of values) {
    const parsed = toVaStrict(v);
    if (parsed) return parsed;
  }
  return null;
}

// FIX:
// matchmaking_bouts_raw moet leidend zijn.
// Handmatige correcties landen in va_rood / va_blauw en moeten dus
// vóór oude / scrape-velden gekozen worden.
function pickVA(row: any, side: "rood" | "blauw"): string | null {
  if (side === "rood") {
    return firstValidVa(
      row?.va_rood,
      row?.rood_va_mm,
      row?.rood_va,
      row?.rood_va_mm_prev,
      row?.va_rood_prev,
      row?.rood_va_prev,
      row?.rood_va_was
    );
  }

  return firstValidVa(
    row?.va_blauw,
    row?.blauw_va_mm,
    row?.blauw_va,
    row?.blauw_va_mm_prev,
    row?.va_blauw_prev,
    row?.blauw_va_prev,
    row?.blauw_va_was
  );
}

function resolveMaxGewicht(partij: any): number | null {
  return toNullableNumber(
    partij?.max_gewicht ??
      partij?.max_gewicht_mm ??
      partij?.maxgewicht ??
      partij?.max_kg ??
      partij?.gewicht_max ??
      partij?.afgesproken_gewicht ??
      partij?.agreed_weight ??
      null
  );
}

function resolveMaxGewichtNotatie(partij: any): string | null {
  return toNullableStr(
    partij?.max_gewicht_notatie ??
      partij?.max_gewicht_notatie_mm ??
      partij?.gewicht_notatie ??
      partij?.gewichtsklasse_notatie ??
      null
  );
}

function resolveMaxGewichtType(partij: any): string | null {
  const s = String(
    partij?.max_gewicht_type ?? partij?.extra?.max_gewicht_type ?? ""
  )
    .trim()
    .toLowerCase();

  if (!s) return null;
  if (s === "exact" || s === "up_to" || s === "open_above") return s;
  return null;
}

function parseJsonSafe(v: any): any | null {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

function resolveToernooiCode(partij: any): string | null {
  const directCandidates = [
    partij?.toernooi_code,
    partij?.toernooi_id,
    partij?.toernooi_nummer,
    partij?.toernooi,
    partij?.t_nummer,
    partij?.t_code,
    partij?.tournament_code,
  ];

  for (const c of directCandidates) {
    const s = String(c ?? "").trim().toUpperCase();
    if (s) return s;
  }

  const raw = parseJsonSafe(partij?.raw_json);
  const rawCandidates = [
    raw?.toernooi_code,
    raw?.toernooi_id,
    raw?.toernooi_nummer,
    raw?.toernooi,
    raw?.t_nummer,
    raw?.t_code,
    raw?.tournament_code,
  ];

  for (const c of rawCandidates) {
    const s = String(c ?? "").trim().toUpperCase();
    if (s) return s;
  }

  return null;
}

function resolveIsToernooi(partij: any): boolean | null {
  const direct = toNullableBool(partij?.is_toernooi ?? partij?.toernooi);
  if (direct != null) return direct;
  return resolveToernooiCode(partij) ? true : null;
}

function parseMmaFromUitslagKlasse(v: any): "PRO" | "AMATEUR" | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return null;
  if (s === "P" || s === "PRO") return "PRO";
  if (s === "AMA" || s === "AMATEUR") return "AMATEUR";
  return null;
}

function latestUitslagByDatum(uitslagen: any[]): any | null {
  if (!Array.isArray(uitslagen) || uitslagen.length === 0) return null;

  const withDate = uitslagen
    .map((u) => ({ u, d: toIsoDateOnly((u as any)?.datum) }))
    .filter((x) => !!x.d);

  if (withDate.length > 0) {
    withDate.sort((a, b) => (a.d! < b.d! ? 1 : a.d! > b.d! ? -1 : 0));
    return withDate[0].u;
  }

  return uitslagen[uitslagen.length - 1] ?? null;
}

function resolveMmaCurrentKlasse(
  fighter: any,
  uitslagen: any[]
): "PRO" | "AMATEUR" | null {
  const direct =
    fighter?.mma_current_klasse ??
    fighter?.mma_klasse ??
    fighter?.current_mma_class ??
    fighter?.rood_mma_current_klasse ??
    fighter?.blauw_mma_current_klasse;

  const directParsed = parseMmaFromUitslagKlasse(direct);
  if (directParsed) return directParsed;

  const last = latestUitslagByDatum(uitslagen);
  const parsed = parseMmaFromUitslagKlasse(last?.klasse);
  return parsed;
}

function getDemoTotaalFromRecord(rec: any): number {
  const flat: any = totalsToFlat(rec as any) as any;
  const candidates = [
    flat?.demo,
    flat?._all_demo,
    rec?.current?._all?.demo,
    rec?._all?.demo,
  ];

  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.max(0, n);
  }

  return 0;
}

function newestTimestampValue(row: any): string {
  return String(
    row?.updated_at ??
      row?.created_at ??
      row?.scraped_at ??
      row?.inserted_at ??
      ""
  );
}

function pickNewestByVa(rows: any[]): Map<string, any> {
  const out = new Map<string, any>();

  for (const row of rows ?? []) {
    const va = String((row as any)?.va_nummer ?? "").trim();
    if (!va) continue;

    const prev = out.get(va);
    if (!prev) {
      out.set(va, row);
      continue;
    }

    const prevTs = newestTimestampValue(prev);
    const rowTs = newestTimestampValue(row);

    if (rowTs > prevTs) {
      out.set(va, row);
    }
  }

  return out;
}

function groupByVa(rows: any[]): Map<string, any[]> {
  const out = new Map<string, any[]>();

  for (const row of rows ?? []) {
    const va = String((row as any)?.va_nummer ?? "").trim();
    if (!va) continue;
    if (!out.has(va)) out.set(va, []);
    out.get(va)!.push(row);
  }

  return out;
}

function normalizeLooseText(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function dedupeUitslagenRows(rows: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];

  for (const row of rows ?? []) {
    const key = [
      String((row as any)?.va_nummer ?? "").trim(),
      toIsoDateOnly((row as any)?.datum) ?? "",
      normalizeLooseText((row as any)?.discipline),
      normalizeLooseText((row as any)?.klasse),
      normalizeLooseText((row as any)?.uitslag),
      normalizeLooseText((row as any)?.evenement),
      normalizeLooseText((row as any)?.tegenstander),
      toIsoDateOnly((row as any)?.evenement_datum ?? (row as any)?.datum) ?? "",
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function countDemoUitslagen(rows: any[]): number {
  let total = 0;
  for (const row of rows ?? []) {
    const u = normalizeLooseText((row as any)?.uitslag);
    if (u.includes("demo") || u.includes("demonstr")) total += 1;
  }
  return total;
}

function asPartijNr(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

function buildPartijNrSequence(rows: any[]): Map<string, number> {
  const out = new Map<string, number>();
  let nextAuto = 1;

  for (const row of rows ?? []) {
    const uid = String(row?.bout_uid ?? "").trim();
    if (!uid) continue;

    const pn = asPartijNr(row?.partij_nr);
    if (pn != null) {
      out.set(uid, pn);
      nextAuto = Math.max(nextAuto, pn + 1);
      continue;
    }

    out.set(uid, nextAuto++);
  }

  return out;
}

type EvenementInfo = {
  evenement_naam: string | null;
  evenement_datum: string | null;
  event_id: string | null;
};

async function fetchEvenementInfo(matchmaking_id: string): Promise<EvenementInfo> {
  const { data, error } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("evenement_naam, evenement_datum, event_id")
    .eq("matchmaking_id", matchmaking_id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  let evenement_naam: string | null = toNullableStr(
    (data as any)?.[0]?.evenement_naam ?? null
  );
  let evenement_datum: string | null = toIsoDateOnly(
    (data as any)?.[0]?.evenement_datum ?? null
  );
  const event_id: string | null = toNullableStr((data as any)?.[0]?.event_id ?? null);

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

export async function buildControleBoutContext(
  matchmaking_id: string,
  controle_run_id: string,
  opts?: { partij_nr?: number | null }
) {
  if (!matchmaking_id) {
    throw new Error("[buildControleBoutContext] matchmaking_id ontbreekt");
  }
  if (!controle_run_id) {
    throw new Error("[buildControleBoutContext] controle_run_id ontbreekt");
  }

  const scopedPartijNr =
    opts?.partij_nr != null && Number.isFinite(Number(opts.partij_nr))
      ? Number(opts.partij_nr)
      : null;

  console.log("[buildControleBoutContext] start", {
    matchmaking_id,
    controle_run_id,
    partij_nr: scopedPartijNr,
  });

  let boutsQ = supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (scopedPartijNr != null) {
    boutsQ = boutsQ.eq("partij_nr", scopedPartijNr);
  }

  const { data: bouts, error: bErr } = await boutsQ;
  if (bErr) throw bErr;
  if (!bouts?.length) return;

  const evInfo = await fetchEvenementInfo(matchmaking_id);
  const evenement_datum = evInfo.evenement_datum;
  const evenement_naam = evInfo.evenement_naam;

  if (!evenement_datum) {
    console.warn("[buildControleBoutContext] evenement_datum is NULL", {
      matchmaking_id,
    });
  }
  if (!evenement_naam) {
    console.warn("[buildControleBoutContext] evenement_naam is NULL", {
      matchmaking_id,
    });
  }

  const vas = new Set<string>();
  for (const p of bouts as any[]) {
    const r = pickVA(p, "rood");
    const b = pickVA(p, "blauw");
    if (r) vas.add(r);
    if (b) vas.add(b);
  }

  const vaList = [...vas];

  const fighterByVa = new Map<string, any>();
  if (vaList.length > 0) {
    const vaListAsNumbers = vaList
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));

    let fightersQ = supabaseAdmin
      .from("fighters_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .order("updated_at", { ascending: false });

    // fighters_raw.va_nummer is bij jou numeriek. Numeriek zoeken voorkomt dat
    // toernooi- en partijvechters niet verrijkt worden terwijl de scraper-row er wel is.
    if (vaListAsNumbers.length > 0) {
      fightersQ = fightersQ.in("va_nummer", vaListAsNumbers);
    } else {
      fightersQ = fightersQ.in("va_nummer", vaList);
    }

    const { data: fighters, error: fErr } = await fightersQ;

    if (fErr) throw fErr;

    const newestFighters = pickNewestByVa(fighters ?? []);
    for (const [va, row] of newestFighters.entries()) {
      fighterByVa.set(va, row);
    }

    console.log("[buildControleBoutContext] fighters loaded", {
      matchmaking_id,
      requested_vas: vaList.length,
      fighter_rows: fighters?.length ?? 0,
      unique_fighters: newestFighters.size,
    });
  }

  const uitslagenByVa = new Map<string, any[]>();
  if (vaList.length > 0) {
    const { data: uitslagen, error: uErr } = await supabaseAdmin
      .from("uitslagen_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .in("va_nummer", vaList)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (uErr) throw uErr;

    const grouped = groupByVa(uitslagen ?? []);
    for (const [va, rows] of grouped.entries()) {
      uitslagenByVa.set(va, dedupeUitslagenRows(rows));
    }

    console.log("[buildControleBoutContext] uitslagen loaded", {
      matchmaking_id,
      requested_vas: vaList.length,
      uitslagen_rows: uitslagen?.length ?? 0,
      unique_vas: grouped.size,
    });
  }

  if (scopedPartijNr != null) {
    const { error: delCtxErr } = await supabaseAdmin
      .from("controle_bout_context")
      .delete()
      .eq("matchmaking_id", matchmaking_id)
      .eq("partij_nr", scopedPartijNr);

    if (delCtxErr) throw delCtxErr;

    const { error: delUitsErr } = await supabaseAdmin
      .from("controle_uitslagen")
      .delete()
      .eq("matchmaking_id", matchmaking_id)
      .eq("partij_nr", scopedPartijNr);

    if (delUitsErr) throw delUitsErr;
  } else {
    const { error: delCtxErr } = await supabaseAdmin
      .from("controle_bout_context")
      .delete()
      .eq("matchmaking_id", matchmaking_id);

    if (delCtxErr) throw delCtxErr;

    const { error: delUitsErr } = await supabaseAdmin
      .from("controle_uitslagen")
      .delete()
      .eq("matchmaking_id", matchmaking_id);

    if (delUitsErr) throw delUitsErr;
  }

  const partijNrByBoutUid = buildPartijNrSequence(bouts);

  const rowsToInsert: any[] = [];
  const uitslagenToInsert: any[] = [];
  const duplicatePartijNrs = new Map<number, string[]>();

  for (const partij of bouts as any[]) {
    let bout_id: string | null = null;

    if (typeof partij?.bout_uid === "string" && partij.bout_uid.trim()) {
      bout_id = partij.bout_uid.trim();
    } else {
      const newUid = crypto.randomUUID();

      console.error(
        "[buildControleBoutContext] bout_uid ontbreekt -> nieuwe bout_uid",
        {
          matchmaking_id,
          controle_run_id,
          partij_nr: partij?.partij_nr ?? null,
          upload_id: partij?.upload_id ?? null,
          rood_naam: partij?.rood_naam ?? null,
          blauw_naam: partij?.blauw_naam ?? null,
          new_uid: newUid,
        }
      );

      const rawPartijNr = asPartijNr(partij?.partij_nr);

      if (rawPartijNr != null) {
        try {
          await supabaseAdmin
            .from("matchmaking_bouts_raw")
            .update({ bout_uid: newUid })
            .eq("matchmaking_id", matchmaking_id)
            .eq("partij_nr", rawPartijNr)
            .is("bout_uid", null);
        } catch (e) {
          console.warn(
            "[buildControleBoutContext] herstel bout_uid mislukt (non-fatal)",
            e
          );
        }
      }

      partij.bout_uid = newUid;
      bout_id = newUid;
    }

    const partijNr =
      partijNrByBoutUid.get(String(bout_id ?? "").trim()) ??
      asPartijNr(partij?.partij_nr);

    if (partijNr == null) {
      console.warn(
        "[buildControleBoutContext] partij zonder bruikbaar partij_nr overgeslagen",
        {
          matchmaking_id,
          controle_run_id,
          bout_id,
          rood_naam: partij?.rood_naam ?? null,
          blauw_naam: partij?.blauw_naam ?? null,
        }
      );
      continue;
    }

    if (!duplicatePartijNrs.has(partijNr)) duplicatePartijNrs.set(partijNr, []);
    duplicatePartijNrs.get(partijNr)!.push(String(bout_id));

    const vaR = pickVA(partij, "rood");
    const vaB = pickVA(partij, "blauw");

    const vaRPrev = firstValidVa(
      partij?.rood_va_mm_prev,
      partij?.va_rood_prev,
      partij?.rood_va_prev,
      partij?.rood_va_was
    );

    const vaBPrev = firstValidVa(
      partij?.blauw_va_mm_prev,
      partij?.va_blauw_prev,
      partij?.blauw_va_prev,
      partij?.blauw_va_was
    );

    const uitslagenR = vaR ? uitslagenByVa.get(vaR) ?? [] : [];
    const uitslagenB = vaB ? uitslagenByVa.get(vaB) ?? [] : [];

    const toernooi_code = resolveToernooiCode(partij);

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
          evenement: u?.evenement ?? null,
          tegenstander: u?.tegenstander ?? null,
          evenement_datum: toIsoDateOnly(u?.evenement_datum ?? u?.datum),
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
          evenement: u?.evenement ?? null,
          tegenstander: u?.tegenstander ?? null,
          evenement_datum: toIsoDateOnly(u?.evenement_datum ?? u?.datum),
        });
      }
    }

    const fr = vaR ? fighterByVa.get(vaR) : null;
    const fb = vaB ? fighterByVa.get(vaB) : null;

    const currentClass = partij?.klasse ?? partij?.klasse_mm ?? null;
    const recRClass = buildClassAwareRecord(uitslagenR, currentClass);
    const recBClass = buildClassAwareRecord(uitslagenB, currentClass);

    const roodGeboortedatum =
      fr?.geboortedatum ?? partij?.rood_geboortedatum ?? null;
    const blauwGeboortedatum =
      fb?.geboortedatum ?? partij?.blauw_geboortedatum ?? null;

    const rood_leeftijd_event =
      roodGeboortedatum && evenement_datum
        ? calcAgeYears(roodGeboortedatum, evenement_datum)
        : null;
    const blauw_leeftijd_event =
      blauwGeboortedatum && evenement_datum
        ? calcAgeYears(blauwGeboortedatum, evenement_datum)
        : null;

    const rood_mma_current_klasse = resolveMmaCurrentKlasse(fr, uitslagenR);
    const blauw_mma_current_klasse = resolveMmaCurrentKlasse(fb, uitslagenB);

    const max_gewicht = resolveMaxGewicht(partij);
    const max_gewicht_notatie = resolveMaxGewichtNotatie(partij);
    const max_gewicht_type = resolveMaxGewichtType(partij);

    const rood_demo_totaal = Math.max(
      getDemoTotaalFromRecord(recRClass),
      countDemoUitslagen(uitslagenR)
    );
    const blauw_demo_totaal = Math.max(
      getDemoTotaalFromRecord(recBClass),
      countDemoUitslagen(uitslagenB)
    );

    rowsToInsert.push({
      controle_run_id,
      upload_id: partij?.upload_id ?? null,
      partij_nr: partijNr,
      matchmaking_id: partij?.matchmaking_id ?? matchmaking_id,
      bout_id,

      discipline: partij?.discipline ?? null,
      klasse_mm: partij?.klasse ?? null,
      is_toernooi: resolveIsToernooi(partij),
      toernooi_code,

      max_gewicht,
      max_gewicht_notatie,
      max_gewicht_type,

      rood_naam_mm: toNullableStr(partij?.rood_naam),
      rood_gym_mm: toNullableStr(partij?.rood_gym),
      rood_gewicht_mm: toNullableNumber(partij?.rood_gewicht),
      rood_va_mm: vaR,
      rood_va_mm_prev: vaRPrev,

      blauw_naam_mm: toNullableStr(partij?.blauw_naam),
      blauw_gym_mm: toNullableStr(partij?.blauw_gym),
      blauw_gewicht_mm: toNullableNumber(partij?.blauw_gewicht),
      blauw_va_mm: vaB,
      blauw_va_mm_prev: vaBPrev,

      evenement_naam: evenement_naam ?? null,
      evenement_datum: evenement_datum ?? null,

      // Fightpaspoort/fighters_raw is de waarheid. MM-data blijft apart in *_mm.
      rood_naam_fp: toNullableStr(fr?.naam),
      rood_geboortedatum_fp: fr?.geboortedatum
        ? toIsoDateOnly(fr.geboortedatum)
        : null,
      rood_geslacht: normGender(fr?.geslacht) ?? normGender(partij?.rood_geslacht),
      rood_leeftijd_event,

      // Fightpaspoort/fighters_raw is de waarheid. MM-data blijft apart in *_mm.
      blauw_naam_fp: toNullableStr(fb?.naam),
      blauw_geboortedatum_fp: fb?.geboortedatum
        ? toIsoDateOnly(fb.geboortedatum)
        : null,
      blauw_geslacht: normGender(fb?.geslacht) ?? normGender(partij?.blauw_geslacht),
      blauw_leeftijd_event,

      rood_mma_current_klasse,
      blauw_mma_current_klasse,

      rood_totaal_wedstrijden_scrape:
        (fr as any)?.totaal_wedstrijden ??
        (fr as any)?.totaal ??
        (fr as any)?.totaal_wedstrijden_scrape ??
        null,
      rood_gewonnen_scrape:
        fr?.gewonnen ?? (fr as any)?.wins ?? fr?.gewonnen_scrape ?? null,

      blauw_totaal_wedstrijden_scrape:
        fb?.totaal_wedstrijden ??
        fb?.totaal ??
        fb?.totaal_wedstrijden_scrape ??
        null,
      blauw_gewonnen_scrape:
        fb?.gewonnen ?? fb?.wins ?? fb?.gewonnen_scrape ?? null,

      rood_licentie: fr?.licentie ?? null,
      rood_heeft_startverbod:
        toNullableBool(fr?.heeft_startverbod) ??
        toNullableBool(fr?.startverbod_actief) ??
        null,

      blauw_licentie: fb?.licentie ?? null,
      blauw_heeft_startverbod:
        toNullableBool(fb?.heeft_startverbod) ??
        toNullableBool(fb?.startverbod_actief) ??
        null,

      rood_nulmeting_totaal: fr?.nulmeting_totaal ?? null,
      rood_nulmeting_opmerking: fr?.nulmeting_opmerking ?? null,
      rood_nulmeting_klasse: fr?.nulmeting_klasse ?? null,

      blauw_nulmeting_totaal: fb?.nulmeting_totaal ?? null,
      blauw_nulmeting_opmerking: fb?.nulmeting_opmerking ?? null,
      blauw_nulmeting_klasse: fb?.nulmeting_klasse ?? null,

      rood_uitslagen_per_discipline: recRClass,
      blauw_uitslagen_per_discipline: recBClass,
      rood_demo_totaal,
      blauw_demo_totaal,
      rood_demo: rood_demo_totaal,
      blauw_demo: blauw_demo_totaal,
    });
  }

  const duplicateSummary = [...duplicatePartijNrs.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([partij_nr, ids]) => ({ partij_nr, bout_ids: ids }));

  if (duplicateSummary.length > 0) {
    console.warn("[buildControleBoutContext] dubbele partij_nrs gevonden", {
      matchmaking_id,
      controle_run_id,
      duplicates: duplicateSummary,
    });
  }

  if (uitslagenToInsert.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < uitslagenToInsert.length; i += chunkSize) {
      const chunk = uitslagenToInsert.slice(i, i + chunkSize);

      // We hebben de oude controle_uitslagen voor deze matchmaking/scope hierboven al verwijderd.
      // Daarom is insert veiliger dan upsert: upsert vereist namelijk een UNIQUE/EXCLUSION
      // constraint op exact dezelfde onConflict-kolommen. Die bestaat niet standaard.
      const { error: uInsErr } = await supabaseAdmin
        .from("controle_uitslagen")
        .insert(chunk);

      if (uInsErr) throw uInsErr;
    }
  }

  if (rowsToInsert.length > 0) {
    // Ook controle_bout_context is hierboven voor deze matchmaking/scope opgeschoond.
    // Insert voorkomt een onConflict-fout wanneer er geen unieke constraint bestaat.
    const { error: insErr } = await supabaseAdmin
      .from("controle_bout_context")
      .insert(rowsToInsert);

    if (insErr) throw insErr;
  }

  console.log("[buildControleBoutContext] klaar", {
    matchmaking_id,
    controle_run_id,
    partij_nr: scopedPartijNr,
    rows: rowsToInsert.length,
    uitslagen: uitslagenToInsert.length,
    duplicates: duplicateSummary.length,
  });
}
// -----------------------------------------------------------------------------
// TOERNOOI FLOW
// Losse toernooi-vechters horen in controle_toernooi_context te staan.
// Deze build vult eerst ontbrekende deelnemers vanuit matchmaking_bouts_raw
// wanneer daar een toernooi_code op staat, en verrijkt daarna die deelnemers
// met FP-data + uitslagen voor dezelfde controle_run.
// -----------------------------------------------------------------------------
export async function buildToernooiContext(
  matchmaking_id: string,
  controle_run_id: string,
  opts?: { toernooi_code?: string | null; fighter_id?: string | null; va_nummer?: string | null }
) {
  if (!matchmaking_id) throw new Error("[buildToernooiContext] matchmaking_id ontbreekt");
  if (!controle_run_id) throw new Error("[buildToernooiContext] controle_run_id ontbreekt");

  const scopedToernooiCode = toNullableStr(opts?.toernooi_code)?.toUpperCase() ?? null;
  const scopedVa = firstValidVa(opts?.fighter_id, opts?.va_nummer) ?? null;

  console.log("[buildToernooiContext] start", {
    matchmaking_id,
    controle_run_id,
    toernooi_code: scopedToernooiCode,
    fighter_id: scopedVa,
  });

  const evInfo = await fetchEvenementInfo(matchmaking_id);
  const evenement_datum = evInfo.evenement_datum;
  const evenement_naam = evInfo.evenement_naam;

  // 1) Bestaande deelnemers van DEZE run lezen, zodat handmatig toegevoegde losse
  // toernooi-vechters niet verdwijnen als ze niet in matchmaking_bouts_raw staan.
  // Daarna verwijderen we de oude snapshot voor dezelfde run/scope. Zo kun je dezelfde
  // controle meerdere keren scrapen/builden zonder unique-constraint conflicten.
  let bestaandeQuery = supabaseAdmin
    .from("controle_toernooi_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id)
    .order("toernooi_code", { ascending: true })
    .order("naam", { ascending: true });

  if (scopedToernooiCode) bestaandeQuery = bestaandeQuery.eq("toernooi_code", scopedToernooiCode);
  if (scopedVa) bestaandeQuery = bestaandeQuery.or(`fighter_id.eq.${scopedVa},va_nummer.eq.${scopedVa}`);

  const { data: bestaandeDeelnemers, error: bestaandeErr } = await bestaandeQuery;

  if (bestaandeErr) {
    if ((bestaandeErr as any)?.code === "42P01") {
      console.warn("[buildToernooiContext] tabel controle_toernooi_context bestaat nog niet; toernooi build overgeslagen");
      return [];
    }
    throw bestaandeErr;
  }

  let deleteOldQuery = supabaseAdmin
    .from("controle_toernooi_context")
    .delete()
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);

  if (scopedToernooiCode) deleteOldQuery = deleteOldQuery.eq("toernooi_code", scopedToernooiCode);
  if (scopedVa) deleteOldQuery = deleteOldQuery.or(`fighter_id.eq.${scopedVa},va_nummer.eq.${scopedVa}`);

  const { error: deleteOldErr } = await deleteOldQuery;
  if (deleteOldErr) throw deleteOldErr;

  console.log("[buildToernooiContext] oude toernooi_context verwijderd", {
    matchmaking_id,
    controle_run_id,
    toernooi_code: scopedToernooiCode,
    fighter_id: scopedVa,
    bestaande_rows: bestaandeDeelnemers?.length ?? 0,
  });

  // 2) De echte bron voor toernooi-deelnemers is matchmaking_bouts_raw.
  // Daar staan toernooi_code + VA's + MM-naam/sportschool/gewicht/discipline/klasse.
  const { data: rawBouts, error: rawBoutErr } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: true });

  if (rawBoutErr) throw rawBoutErr;

  const rawSourceByKey = new Map<string, any>();
  const derivedByKey = new Map<string, any>();

  // Handmatige/bestaande deelnemers van deze run behouden als ze niet opnieuw uit
  // matchmaking_bouts_raw afgeleid worden. Raw data mag deze straks overschrijven.
  for (const oldRow of bestaandeDeelnemers ?? []) {
    const tCode = toNullableStr((oldRow as any)?.toernooi_code)?.toUpperCase();
    const va = firstValidVa((oldRow as any)?.fighter_id, (oldRow as any)?.va_nummer);
    if (!tCode || !va) continue;
    if (!toernooiParticipantHasRealData(oldRow)) continue;
    if (scopedToernooiCode && tCode !== scopedToernooiCode) continue;
    if (scopedVa && va !== scopedVa) continue;

    derivedByKey.set(`${tCode}:${va}`, {
      ...(oldRow as any),
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
      controle_run_id,
      matchmaking_id,
      toernooi_code: tCode,
      fighter_id: va,
      va_nummer: va,
      bijgewerkt_op: new Date().toISOString().slice(0, 10),
    });
  }

  for (const partij of rawBouts ?? []) {
    const tCode = resolveToernooiCode(partij);
    if (!tCode) continue;
    if (scopedToernooiCode && tCode !== scopedToernooiCode) continue;

    const candidates = [
      {
        hoek: "rood",
        va: pickVA(partij, "rood"),
        naam: toNullableRealStr((partij as any)?.rood_naam),
        sportschool: toNullableRealStr((partij as any)?.rood_gym),
        gewicht: toNullableNumber((partij as any)?.rood_gewicht),
        geboortedatum: toIsoDateOnly((partij as any)?.rood_geboortedatum),
      },
      {
        hoek: "blauw",
        va: pickVA(partij, "blauw"),
        naam: toNullableRealStr((partij as any)?.blauw_naam),
        sportschool: toNullableRealStr((partij as any)?.blauw_gym),
        gewicht: toNullableNumber((partij as any)?.blauw_gewicht),
        geboortedatum: toIsoDateOnly((partij as any)?.blauw_geboortedatum),
      },
    ];

    for (const c of candidates) {
      if (!c.va) continue;
      if (scopedVa && c.va !== scopedVa) continue;

      const key = `${tCode}:${c.va}`;

      const source = {
        hoek: c.hoek,
        bout_id: (partij as any)?.bout_uid ?? null,
        partij_nr: asPartijNr((partij as any)?.partij_nr),
        upload_id: (partij as any)?.upload_id ?? null,
        toernooi_code: tCode,
        fighter_id: c.va,
        va_nummer: c.va,
        naam: c.naam,
        sportschool: c.sportschool,
        gewicht: c.gewicht,
        geboortedatum: c.geboortedatum,
        discipline: toNullableStr((partij as any)?.discipline),
        klasse: toNullableStr((partij as any)?.klasse),
        evenement_naam: evenement_naam ?? null,
        evenement_datum: evenement_datum ?? null,
      };

      // Eerste bron bewaren; bij toernooi kan dezelfde deelnemer meerdere keren voorkomen.
      if (!rawSourceByKey.has(key)) rawSourceByKey.set(key, source);

      if (!derivedByKey.has(key)) {
        derivedByKey.set(key, {
          controle_run_id,
          matchmaking_id,
          bout_id: source.bout_id,
          partij_nr: source.partij_nr,
          upload_id: source.upload_id,
          toernooi_code: tCode,
          fighter_id: c.va,
          va_nummer: c.va,

          naam: c.naam,
          naam_mm: c.naam,
          sportschool: c.sportschool,
          sportschool_mm: c.sportschool,
          gewicht: c.gewicht,
          geboortedatum: c.geboortedatum,
          discipline: source.discipline,
          klasse: source.klasse,
          klasse_mm: source.klasse,

          evenement_naam: evenement_naam ?? null,
          evenement_datum: evenement_datum ?? null,
          bijgewerkt_op: new Date().toISOString().slice(0, 10),
        });
      }
    }
  }

  console.log("[buildToernooiContext] raw toernooi bronnen", {
    matchmaking_id,
    raw_bouts: rawBouts?.length ?? 0,
    derived_deelnemers: derivedByKey.size,
  });

  const deelnemersToInsert = [...derivedByKey.values()].filter((r) => {
    const tCode = toNullableStr(r?.toernooi_code)?.toUpperCase();
    const va = firstValidVa(r?.fighter_id, r?.va_nummer);
    return !!(tCode && va && toernooiParticipantHasRealData(r));
  });

  if (deelnemersToInsert.length > 0) {
    const { error: insertErr } = await supabaseAdmin
      .from("controle_toernooi_context")
      .insert(deelnemersToInsert);

    if (insertErr) throw insertErr;

    console.log("[buildToernooiContext] deelnemers opnieuw opgebouwd", {
      rows: deelnemersToInsert.length,
      preserved_existing_rows: bestaandeDeelnemers?.length ?? 0,
    });
  }

  // 3) Deelnemers opnieuw lezen, inclusief bestaande rijen.
  let deelnemersQuery = supabaseAdmin
    .from("controle_toernooi_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id)
    .order("toernooi_code", { ascending: true })
    .order("naam", { ascending: true });

  if (scopedToernooiCode) deelnemersQuery = deelnemersQuery.eq("toernooi_code", scopedToernooiCode);
  if (scopedVa) deelnemersQuery = deelnemersQuery.or(`fighter_id.eq.${scopedVa},va_nummer.eq.${scopedVa}`);

  const { data: deelnemers, error: deelnemersErr } = await deelnemersQuery;
  if (deelnemersErr) throw deelnemersErr;

  if (!deelnemers?.length) {
    console.log("[buildToernooiContext] geen deelnemers gevonden");
    return [];
  }

  const vaList = [
    ...new Set(
      (deelnemers as any[])
        .map((r) => firstValidVa(r?.fighter_id, r?.va_nummer))
        .filter(Boolean) as string[]
    ),
  ];

  // 4) Scrape-data ophalen uit fighters_raw.
  const fighterByVa = new Map<string, any>();

  if (vaList.length > 0) {
    const vaListAsNumbers = vaList
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));

    let fighterQuery = supabaseAdmin
      .from("fighters_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .order("updated_at", { ascending: false });

    // In jouw fighters_raw is va_nummer numeriek. Daarom numeriek zoeken.
    if (vaListAsNumbers.length > 0) {
      fighterQuery = fighterQuery.in("va_nummer", vaListAsNumbers);
    } else {
      fighterQuery = fighterQuery.in("va_nummer", vaList);
    }

    const { data: fighters, error: fightersErr } = await fighterQuery;
    if (fightersErr) throw fightersErr;

    const newestFighters = pickNewestByVa(fighters ?? []);
    for (const [va, row] of newestFighters.entries()) {
      fighterByVa.set(va, row);
    }

    console.log("[buildToernooiContext] fighters loaded", {
      matchmaking_id,
      requested_vas: vaList.length,
      fighter_rows: fighters?.length ?? 0,
      unique_fighters: newestFighters.size,
    });
  }

  // 5) Uitslagen ophalen uit uitslagen_raw.
  const uitslagenByVa = new Map<string, any[]>();

  if (vaList.length > 0) {
    const { data: uitslagen, error: uitslagenErr } = await supabaseAdmin
      .from("uitslagen_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .in("va_nummer", vaList)
      .order("datum", { ascending: false });

    if (uitslagenErr) throw uitslagenErr;

    const grouped = groupByVa(uitslagen ?? []);
    for (const [va, rows] of grouped.entries()) {
      uitslagenByVa.set(va, dedupeUitslagenRows(rows));
    }

    console.log("[buildToernooiContext] uitslagen loaded", {
      matchmaking_id,
      requested_vas: vaList.length,
      uitslagen_rows: uitslagen?.length ?? 0,
      unique_vas: grouped.size,
    });
  }

  // 6) Oude toernooi-uitslagen voor deze run/scope vervangen.
  // Let op: controle_uitslagen.partij_nr is NOT NULL. Voor toernooien gebruiken we partij_nr = 0 en toernooi_code als echte sleutel.
  let delUitslagen = supabaseAdmin
    .from("controle_uitslagen")
    .delete()
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);

  if (scopedToernooiCode) {
    delUitslagen = delUitslagen.eq("toernooi_code", scopedToernooiCode);
  } else {
    delUitslagen = delUitslagen.not("toernooi_code", "is", null);
  }

  if (scopedVa) delUitslagen = delUitslagen.eq("va_nummer", scopedVa);

  const { error: delUitslagenErr } = await delUitslagen;
  if (delUitslagenErr) throw delUitslagenErr;

  const updates: any[] = [];
  const uitslagenToInsert: any[] = [];

  for (const row of deelnemers as any[]) {
    const tCode = toNullableStr(row?.toernooi_code)?.toUpperCase() ?? scopedToernooiCode;
    const va = firstValidVa(row?.fighter_id, row?.va_nummer);
    if (!tCode || !va) continue;

    const rawSource = rawSourceByKey.get(`${tCode}:${va}`) ?? null;
    const fr = fighterByVa.get(va) ?? null;
    const uitslagen = uitslagenByVa.get(va) ?? [];
    const latestUitslag = latestUitslagByDatum(uitslagen);

    // Fightpaspoort/fighters_raw is leidend voor persoonsdata.
    // Matchmaker/raw blijft alleen fallback en vergelijkingsbron (*_mm).
    const fpNaam = toNullableStr(fr?.naam);
    const fpGeboortedatum = fr?.geboortedatum ? toIsoDateOnly(fr.geboortedatum) : null;
    const fpGeslacht = normGender(fr?.geslacht);

    for (const u of uitslagen) {
      uitslagenToInsert.push({
        matchmaking_id,
        controle_run_id,
        // Toernooi-uitslagen hebben geen rood/blauw-hoek.
        // partij_nr blijft numeriek verplicht; toernooi_code is de echte toernooi-sleutel.
        partij_nr: 0,
        bout_id: null,
        hoek: "toernooi",
        toernooi_code: tCode,
        va_nummer: va,
        datum: u?.datum ? toIsoDateOnly(u.datum) : null,
        discipline: u?.discipline ?? null,
        klasse: u?.klasse ?? null,
        uitslag: u?.uitslag ?? null,
        evenement: u?.evenement ?? null,
        tegenstander: u?.tegenstander ?? null,
        evenement_datum: toIsoDateOnly(u?.evenement_datum ?? u?.datum),
      });
    }

    const basisKlasse =
      row?.klasse_mm ??
      rawSource?.klasse ??
      row?.klasse ??
      latestUitslag?.klasse ??
      fr?.nulmeting_klasse ??
      null;

    const record = buildClassAwareRecord(uitslagen, basisKlasse);
    const flatRecord: any = totalsToFlat(record as any) as any;

    const geboortedatum =
      fr?.geboortedatum ??
      row?.geboortedatum ??
      rawSource?.geboortedatum ??
      null;

    const totaalWedstrijden =
      toNullableNumber((fr as any)?.totaal_wedstrijden) ??
      toNullableNumber((fr as any)?.totaal) ??
      toNullableNumber(row?.totaal_wedstrijden) ??
      toNullableNumber(flatRecord?._all_total) ??
      toNullableNumber(flatRecord?.total) ??
      null;

    const gewonnen =
      toNullableNumber(fr?.gewonnen) ??
      toNullableNumber((fr as any)?.wins) ??
      toNullableNumber(row?.gewonnen) ??
      toNullableNumber(flatRecord?._all_wins) ??
      toNullableNumber(flatRecord?.wins) ??
      null;

    const verloren =
      toNullableNumber((fr as any)?.verloren) ??
      toNullableNumber((fr as any)?.losses) ??
      toNullableNumber(row?.verloren) ??
      toNullableNumber(flatRecord?._all_losses) ??
      toNullableNumber(flatRecord?.losses) ??
      null;

    const draw =
      toNullableNumber((fr as any)?.draw) ??
      toNullableNumber((fr as any)?.draws) ??
      toNullableNumber(row?.draw) ??
      toNullableNumber(flatRecord?._all_draws) ??
      toNullableNumber(flatRecord?.draws) ??
      null;

    const demo =
      toNullableNumber((fr as any)?.demo) ??
      toNullableNumber(row?.demo) ??
      getDemoTotaalFromRecord(record) ??
      countDemoUitslagen(uitslagen) ??
      null;

    const patch: any = {
      controle_run_id,
      bout_id: row?.bout_id ?? rawSource?.bout_id ?? null,
      // Voor toernooi-context mag partij_nr ook de toernooi_code zijn.
      partij_nr: asPartijNr(row?.partij_nr ?? rawSource?.partij_nr) ?? 0,
      upload_id: row?.upload_id ?? rawSource?.upload_id ?? null,

      fighter_id: va,
      va_nummer: va,
      toernooi_code: tCode,

      naam: fpNaam ?? row?.naam ?? rawSource?.naam ?? row?.naam_fp ?? null,
      naam_fp: fpNaam ?? row?.naam_fp ?? null,
      naam_mm: row?.naam_mm ?? rawSource?.naam ?? row?.naam ?? null,

      sportschool:
        row?.sportschool ??
        rawSource?.sportschool ??
        fr?.sportschool ??
        fr?.sportschool_naam ??
        latestUitslag?.sportschool ??
        null,
      sportschool_mm:
        row?.sportschool_mm ??
        rawSource?.sportschool ??
        row?.sportschool ??
        null,

      geboortedatum: fpGeboortedatum ?? (geboortedatum ? toIsoDateOnly(geboortedatum) : null),
      geslacht: fpGeslacht ?? normGender(row?.geslacht),

      gewicht:
        toNullableNumber(row?.gewicht) ??
        toNullableNumber(rawSource?.gewicht) ??
        toNullableNumber(fr?.gewicht) ??
        toNullableNumber(fr?.gewicht_kg) ??
        null,

      discipline:
        row?.discipline ??
        rawSource?.discipline ??
        latestUitslag?.discipline ??
        null,

      klasse:
        row?.klasse ??
        rawSource?.klasse ??
        latestUitslag?.klasse ??
        fr?.klasse ??
        fr?.nulmeting_klasse ??
        null,
      klasse_mm:
        row?.klasse_mm ??
        rawSource?.klasse ??
        row?.klasse ??
        null,

      licentie: fr?.licentie ?? row?.licentie ?? null,
      heeft_startverbod:
        toNullableBool(fr?.heeft_startverbod) ??
        toNullableBool(fr?.startverbod_actief) ??
        toNullableBool(row?.heeft_startverbod) ??
        null,

      nulmeting_totaal: fr?.nulmeting_totaal ?? row?.nulmeting_totaal ?? null,
      nulmeting_klasse: fr?.nulmeting_klasse ?? row?.nulmeting_klasse ?? null,
      nulmeting_opmerking: fr?.nulmeting_opmerking ?? row?.nulmeting_opmerking ?? null,

      totaal_wedstrijden: totaalWedstrijden,
      gewonnen,
      verloren,
      draw,
      demo,

      leeftijd_event:
        (fpGeboortedatum ?? geboortedatum) && evenement_datum
          ? calcAgeYears(fpGeboortedatum ?? geboortedatum, evenement_datum)
          : row?.leeftijd_event ?? null,

      evenement_naam: evenement_naam ?? row?.evenement_naam ?? null,
      evenement_datum: evenement_datum ?? row?.evenement_datum ?? null,
      locatie: row?.locatie ?? null,
      bondteam: row?.bondteam ?? null,

      // Keurmerk wordt door enrichControleBoutContext gevuld; hier niet leegmaken.
      heeft_keurmerk: row?.heeft_keurmerk ?? null,
      keurmerk_reason: row?.keurmerk_reason ?? null,

      bijgewerkt_op: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };

    let updateQuery = supabaseAdmin
      .from("controle_toernooi_context")
      .update(patch)
      .eq("matchmaking_id", matchmaking_id);

    if (row?.id) {
      updateQuery = updateQuery.eq("id", row.id);
    } else {
      updateQuery = updateQuery.eq("toernooi_code", tCode).or(`fighter_id.eq.${va},va_nummer.eq.${va}`);
    }

    const { error: updateErr } = await updateQuery;
    if (updateErr) throw updateErr;

    updates.push({ ...row, ...patch });
  }

  if (uitslagenToInsert.length > 0) {
    const chunkSize = 500;

    for (let i = 0; i < uitslagenToInsert.length; i += chunkSize) {
      const chunk = uitslagenToInsert.slice(i, i + chunkSize);

      // Oude toernooi-uitslagen voor deze run/scope zijn hierboven al verwijderd.
      // Gebruik insert i.p.v. upsert, anders vereist Postgres een UNIQUE constraint
      // op alle onConflict-kolommen en krijg je 42P10.
      const { error: insErr } = await supabaseAdmin
        .from("controle_uitslagen")
        .insert(chunk);

      if (insErr) throw insErr;
    }
  }

  console.log("[buildToernooiContext] klaar", {
    matchmaking_id,
    controle_run_id,
    toernooi_code: scopedToernooiCode,
    fighter_id: scopedVa,
    rows: updates.length,
    uitslagen: uitslagenToInsert.length,
  });

  return updates;
}
