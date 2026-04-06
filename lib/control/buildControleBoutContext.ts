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
    partij?.max_gewicht_type ??
      partij?.extra?.max_gewicht_type ??
      ""
  )
    .trim()
    .toLowerCase();

  if (!s) return null;
  if (s === "exact" || s === "up_to" || s === "open_above") return s;
  return null;
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
  const flat = totalsToFlat(rec);
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
    const r = toVaStrict((p as any)?.va_rood);
    const b = toVaStrict((p as any)?.va_blauw);
    if (r) vas.add(r);
    if (b) vas.add(b);
  }

  const vaList = [...vas];

  const fighterByVa = new Map<string, any>();
  if (vaList.length > 0) {
    const { data: fighters, error: fErr } = await supabaseAdmin
      .from("fighters_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .in("va_nummer", vaList);

    if (fErr) throw fErr;

    const newestFighters = pickNewestByVa(fighters ?? []);
    for (const [va, row] of newestFighters.entries()) {
      fighterByVa.set(va, row);
    }
  }

  const uitslagenByVa = new Map<string, any[]>();
  if (vaList.length > 0) {
    const { data: uitslagen, error: uErr } = await supabaseAdmin
      .from("uitslagen_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .in("va_nummer", vaList);

    if (uErr) throw uErr;

    const grouped = groupByVa(uitslagen ?? []);
    for (const [va, rows] of grouped.entries()) {
      uitslagenByVa.set(va, dedupeUitslagenRows(rows));
    }
  }

  let delCtxQ = supabaseAdmin
    .from("controle_bout_context")
    .delete()
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);

  if (scopedPartijNr != null) {
    delCtxQ = delCtxQ.eq("partij_nr", scopedPartijNr);
  }

  const { error: delCtxErr } = await delCtxQ;
  if (delCtxErr) throw delCtxErr;

  let delUitsQ = supabaseAdmin
    .from("controle_uitslagen")
    .delete()
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);

  if (scopedPartijNr != null) {
    delUitsQ = delUitsQ.eq("partij_nr", scopedPartijNr);
  }

  const { error: delUitsErr } = await delUitsQ;
  if (delUitsErr) throw delUitsErr;

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

    const vaR = toVaStrict((partij as any)?.va_rood ?? null);
    const vaB = toVaStrict((partij as any)?.va_blauw ?? null);

    const vaRPrev = firstValidVa(
      (partij as any)?.rood_va_mm_prev,
      (partij as any)?.va_rood_prev,
      (partij as any)?.rood_va_prev,
      (partij as any)?.rood_va_was
    );

    const vaBPrev = firstValidVa(
      (partij as any)?.blauw_va_mm_prev,
      (partij as any)?.va_blauw_prev,
      (partij as any)?.blauw_va_prev,
      (partij as any)?.blauw_va_was
    );

    const uitslagenR = vaR ? uitslagenByVa.get(vaR) ?? [] : [];
    const uitslagenB = vaB ? uitslagenByVa.get(vaB) ?? [] : [];

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

    const rood_leeftijd_event =
      fr?.geboortedatum && evenement_datum
        ? calcAgeYears(fr.geboortedatum, evenement_datum)
        : null;
    const blauw_leeftijd_event =
      fb?.geboortedatum && evenement_datum
        ? calcAgeYears(fb.geboortedatum, evenement_datum)
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
      is_toernooi: toNullableBool(partij?.is_toernooi ?? partij?.toernooi),

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

      rood_naam_fp: fr?.naam ?? null,
      rood_geboortedatum_fp: fr?.geboortedatum
        ? toIsoDateOnly(fr.geboortedatum)
        : null,
      rood_geslacht: normGender(fr?.geslacht),
      rood_leeftijd_event,

      blauw_naam_fp: fb?.naam ?? null,
      blauw_geboortedatum_fp: fb?.geboortedatum
        ? toIsoDateOnly(fb.geboortedatum)
        : null,
      blauw_geslacht: normGender(fb?.geslacht),
      blauw_leeftijd_event,

      rood_mma_current_klasse,
      blauw_mma_current_klasse,

      rood_totaal_wedstrijden_scrape:
        fr?.totaal_wedstrijden ??
        fr?.totaal ??
        fr?.totaal_wedstrijden_scrape ??
        null,
      rood_gewonnen_scrape:
        fr?.gewonnen ?? fr?.wins ?? fr?.gewonnen_scrape ?? null,

      blauw_totaal_wedstrijden_scrape:
        fb?.totaal_wedstrijden ??
        fb?.totaal ??
        fb?.totaal_wedstrijden_scrape ??
        null,
      blauw_gewonnen_scrape:
        fb?.gewonnen ?? fb?.wins ?? fb?.gewonnen_scrape ?? null,

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

      const { error: uInsErr } = await supabaseAdmin
        .from("controle_uitslagen")
        .upsert(chunk, {
          onConflict:
            "controle_run_id,bout_id,hoek,va_nummer,datum,discipline,klasse,uitslag,evenement,tegenstander,evenement_datum",
          ignoreDuplicates: true,
        });

      if (uInsErr) throw uInsErr;
    }
  }

  if (rowsToInsert.length > 0) {
    const { error: insErr } = await supabaseAdmin
      .from("controle_bout_context")
      .upsert(rowsToInsert, {
        onConflict: "controle_run_id,bout_id",
      });

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