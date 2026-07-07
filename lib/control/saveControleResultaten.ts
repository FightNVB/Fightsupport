// lib/control/saveControleResultaten.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type RuleHit = {
  rule_code: string;
  rule: string;
  severity: string;
  resultaat: string;
  boodschap?: string | null;
  message?: string | null;
  hoek?: "rood" | "blauw" | null;

  partij_nr?: number | null;

  // uuid string
  bout_id?: string | null;

  // uuid string
  matchmaking_id?: string | null;

  // toernooi context
  toernooi_code?: string | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
  toernooi_va_nummer?: string | null;
};

function asUuid(v: any): string | null {
  if (v == null) return null;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s || s === "[object Object]") return null;
    return s;
  }

  if (typeof v === "object") {
    const cand =
      (typeof (v as any).bout_id === "string" && (v as any).bout_id) ||
      (typeof (v as any).bout_uid === "string" && (v as any).bout_uid) ||
      (typeof (v as any).id === "string" && (v as any).id) ||
      null;

    const s = String(cand ?? "").trim();
    if (!s || s === "[object Object]") return null;
    return s;
  }

  const s = String(v ?? "").trim();
  if (!s || s === "[object Object]") return null;
  return s;
}

function asInt(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normStr(v: any): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function reviewKey(row: {
  partij_nr: any;
  bout_id: any;
  rule_code: any;
  hoek: any;
  toernooi_code?: any;
  fighter_id?: any;
  va_nummer?: any;
  toernooi_va_nummer?: any;
}) {
  const partij = asInt(row.partij_nr) ?? -1;
  const bout = asUuid(row.bout_id) ?? "";
  const code = String(row.rule_code ?? "").trim().toUpperCase();
  const hoek = String(row.hoek ?? "").trim().toLowerCase();
  const toernooi = String(row.toernooi_code ?? "").trim().toUpperCase();
  const fighter = String(row.fighter_id ?? "").trim();
  const va = String(row.va_nummer ?? "").trim();
  const toernooiVa = String(row.toernooi_va_nummer ?? "").trim() || va;
  return `${partij}|${bout}|${code}|${hoek}|${toernooi}|${fighter}|${toernooiVa}`;
}


function duplicateRowKey(row: {
  partij_nr: any;
  bout_id: any;
  rule_code: any;
  hoek: any;
  toernooi_code?: any;
  fighter_id?: any;
  toernooi_va_nummer?: any;
  boodschap?: any;
}) {
  const scope = reviewKey({
    partij_nr: row.partij_nr,
    bout_id: row.bout_id,
    rule_code: row.rule_code,
    hoek: row.hoek,
    toernooi_code: row.toernooi_code,
    fighter_id: row.fighter_id,
    toernooi_va_nummer: row.toernooi_va_nummer,
  });
  const boodschap = String(row.boodschap ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return `${scope}|${boodschap}`;
}

function normalizeReviewStatus(v: any): "approved" | "rejected" | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "approved" || s === "goedgekeurd") return "approved";
  if (s === "rejected" || s === "afgekeurd") return "rejected";
  return null;
}

function makePlaceholderKey(opts: {
  partij_nr?: number | null;
  bout_id?: string | null;
  toernooi_code?: string | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
  toernooi_va_nummer?: string | null;
}) {
  return reviewKey({
    partij_nr: opts.partij_nr ?? null,
    bout_id: opts.bout_id ?? null,
    rule_code: "__NO_RULES__",
    hoek: null,
    toernooi_code: opts.toernooi_code ?? null,
    fighter_id: opts.fighter_id ?? null,
    va_nummer: opts.va_nummer ?? null,
    toernooi_va_nummer: opts.toernooi_va_nummer ?? opts.va_nummer ?? null,
  });
}

/**
 * saveControleResultaten
 *
 * Scopes:
 * - zonder scope: hele run vervangen
 * - met bout_id: alleen die bout vervangen
 * - met partij_nr: alleen die partij vervangen
 * - met beide: bout_id heeft voorrang, partij_nr als extra safety
 *
 * Belangrijk:
 * - ook als er GEEN hits zijn, schrijven we bij een scoped save altijd een placeholder row
 * - zo verlies je geen partij/bout zonder VA of zonder rule hits
 */
export async function saveControleResultaten(opts: {
  controle_run_id: string;
  matchmaking_id: string;
  hits: RuleHit[];
  bout_id?: string | null;
  partij_nr?: number | null;
}) {
  const controle_run_id = asUuid(opts?.controle_run_id);
  const matchmaking_id = asUuid(opts?.matchmaking_id);
  const scopedBoutId = asUuid(opts?.bout_id);
  const scopedPartijNr = asInt(opts?.partij_nr);

  if (!controle_run_id) {
    throw new Error("[saveControleResultaten] controle_run_id ontbreekt/ongeldig");
  }
  if (!matchmaking_id) {
    throw new Error("[saveControleResultaten] matchmaking_id ontbreekt/ongeldig");
  }

  const hitsIn = Array.isArray(opts?.hits) ? opts.hits : [];

  // Als deze functie zonder bout_id/partij_nr wordt aangeroepen vanuit een deel-save
  // (bijvoorbeeld eerst gewone partijen en daarna toernooi-vechters), mag de tweede
  // save niet de eerste groep verwijderen. Daarom bepalen we bij unscoped saves of
  // de hits alleen toernooi of alleen wedstrijden bevatten.
  const unscoped = !scopedBoutId && scopedPartijNr == null;
  const hitGroups = hitsIn.reduce(
    (acc, hit) => {
      const hasToernooi = !!normStr((hit as any)?.toernooi_code);
      if (hasToernooi) acc.toernooi += 1;
      else acc.wedstrijd += 1;
      return acc;
    },
    { wedstrijd: 0, toernooi: 0 }
  );
  const unscopedOnlyToernooi = unscoped && hitGroups.toernooi > 0 && hitGroups.wedstrijd === 0;
  const unscopedOnlyWedstrijd = unscoped && hitGroups.wedstrijd > 0 && hitGroups.toernooi === 0;

  // 0) bestaande reviews ophalen vóór delete
  let exQ = supabaseAdmin
    .from("controle_resultaten")
    .select(
      "partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,original_resultaat,resultaat,actie_status"
    )
    .eq("controle_run_id", controle_run_id)
    .eq("matchmaking_id", matchmaking_id);

  if (scopedBoutId) {
    exQ = exQ.eq("bout_id", scopedBoutId);
  } else if (scopedPartijNr != null) {
    exQ = exQ.eq("partij_nr", scopedPartijNr);
  } else if (unscopedOnlyToernooi) {
    exQ = exQ.not("toernooi_code", "is", null);
  } else if (unscopedOnlyWedstrijd) {
    exQ = exQ.is("toernooi_code", null);
  }

  const { data: existing, error: exErr } = await exQ;
  if (exErr) throw exErr;

  const reviewMap = new Map<string, any>();
  for (const r of existing ?? []) {
    const key = reviewKey(r as any);
    const rs = normalizeReviewStatus((r as any).review_status);
    const hasReview =
      !!rs ||
      !!(r as any).reviewed_at ||
      !!String((r as any).review_note ?? "").trim();
    const hasNotes = !!String((r as any).aantekeningen ?? "").trim();

    if (hasReview || hasNotes) {
      reviewMap.set(key, { ...r, _norm: rs });
    }
  }

  // 1) oude resultaten scoped verwijderen
  let delQ = supabaseAdmin
    .from("controle_resultaten")
    .delete()
    .eq("controle_run_id", controle_run_id)
    .eq("matchmaking_id", matchmaking_id);

  if (scopedBoutId) {
    delQ = delQ.eq("bout_id", scopedBoutId);
  } else if (scopedPartijNr != null) {
    delQ = delQ.eq("partij_nr", scopedPartijNr);
  } else if (unscopedOnlyToernooi) {
    delQ = delQ.not("toernooi_code", "is", null);
  } else if (unscopedOnlyWedstrijd) {
    delQ = delQ.is("toernooi_code", null);
  }

  const { error: delErr } = await delQ;
  if (delErr) throw delErr;

  // 2) rows bouwen + reviews terugzetten
  // Safety-net: rulesEngine kan dezelfde melding via meerdere routes aanleveren
  // (bijv. gewone save + toernooi/deel-save). Sla exact dezelfde zichtbare melding
  // binnen dezelfde scope maar één keer op.
  const rowsToInsert: any[] = [];
  const insertedKeys = new Set<string>();

  for (const hit of hitsIn) {
    const hitToernooiCode = normStr(hit?.toernooi_code)?.toUpperCase() ?? null;
    const partij_nr = asInt(hit?.partij_nr) ?? scopedPartijNr ?? (hitToernooiCode ? 0 : null);
    const hitBoutId = asUuid(hit?.bout_id);
    const bout_id = hitBoutId ?? scopedBoutId ?? null;
    const mmId = asUuid(hit?.matchmaking_id) ?? matchmaking_id;
    const toernooi_code = normStr(hit?.toernooi_code)?.toUpperCase() ?? null;
    const isToernooiHit = !!toernooi_code;
    const hitVa =
      normStr(hit?.toernooi_va_nummer) ??
      normStr((hit as any)?.va_nummer) ??
      normStr(hit?.fighter_id);

    // controle_resultaten heeft géén kolom va_nummer.
    // Gewone partij-vechters gaan in fighter_id.
    // Toernooi-vechters gaan in toernooi_va_nummer.
    const fighter_id = isToernooiHit ? null : hitVa;
    const toernooi_va_nummer = isToernooiHit ? hitVa : null;

    // safety:
    // - scoped op bout: alleen skippen als hit expliciet een andere bout_id heeft
    if (scopedBoutId && hitBoutId && hitBoutId !== scopedBoutId) continue;

    // - scoped op partij: alleen skippen als hit expliciet een andere partij_nr heeft
    if (
      scopedBoutId == null &&
      scopedPartijNr != null &&
      hit?.partij_nr != null &&
      asInt(hit?.partij_nr) !== scopedPartijNr
    ) {
      continue;
    }

    // helemaal onbruikbare hit overslaan
    if (partij_nr == null && bout_id == null && !toernooi_code) {
      continue;
    }

    const baseRow: any = {
      controle_run_id,
      run_id: controle_run_id,
      matchmaking_id: mmId,

      partij_nr,
      bout_id,
      toernooi_code,
      fighter_id,
      toernooi_va_nummer,

      rule_code: normStr(hit.rule_code),
      rule: normStr(hit.rule) ?? normStr(hit.rule_code) ?? "RULE",
      severity: normStr(hit.severity),
      resultaat: normStr(hit.resultaat),
      boodschap: normStr(hit.boodschap) ?? normStr(hit.message),
      hoek: hit.hoek ?? null,
      original_resultaat: normStr(hit.resultaat),
    };

    const key = reviewKey({
      partij_nr,
      bout_id,
      rule_code: hit.rule_code,
      hoek: hit.hoek,
      toernooi_code,
      fighter_id,
      toernooi_va_nummer,
    });

    const prev = reviewMap.get(key);

    if (prev) {
      const norm = prev._norm as "approved" | "rejected" | null;

      baseRow.review_status = norm ?? prev.review_status ?? null;
      baseRow.review_note = prev.review_note ?? null;
      baseRow.reviewed_by = prev.reviewed_by ?? null;
      baseRow.reviewed_at = prev.reviewed_at ?? null;
      baseRow.aantekeningen = prev.aantekeningen ?? null;

      if (norm === "approved") {
        baseRow.resultaat = "OK";
        baseRow.actie_status = "goedgekeurd";
      } else if (norm === "rejected") {
        baseRow.resultaat = "AFKEUR";
        baseRow.actie_status = "afgekeurd";
      }
    }

    const dupeKey = duplicateRowKey(baseRow);
    if (insertedKeys.has(dupeKey)) continue;
    insertedKeys.add(dupeKey);

    rowsToInsert.push(baseRow);
  }

  // 3) Geen hits? Dan toch placeholder row schrijven voor scoped save
  // Zo blijft een partij/bout zonder VA of zonder rule hits bestaan.
  if (rowsToInsert.length === 0) {
    // scoped op bout of partij -> placeholder opslaan
    if (scopedBoutId || scopedPartijNr != null) {
      const placeholderFromHit = hitsIn[0] ?? null;
      const key = makePlaceholderKey({
        partij_nr: scopedPartijNr ?? null,
        bout_id: scopedBoutId ?? null,
        toernooi_code: normStr((placeholderFromHit as any)?.toernooi_code)?.toUpperCase() ?? null,
        fighter_id: normStr((placeholderFromHit as any)?.toernooi_code)
          ? null
          : normStr((placeholderFromHit as any)?.fighter_id) ??
            normStr((placeholderFromHit as any)?.va_nummer),
        toernooi_va_nummer: normStr((placeholderFromHit as any)?.toernooi_code)
          ? normStr((placeholderFromHit as any)?.toernooi_va_nummer) ??
            normStr((placeholderFromHit as any)?.va_nummer) ??
            normStr((placeholderFromHit as any)?.fighter_id)
          : null,
      });

      const prev = reviewMap.get(key);

      const placeholderRow: any = {
        controle_run_id,
        run_id: controle_run_id,
        matchmaking_id,

        partij_nr: scopedPartijNr ?? null,
        bout_id: scopedBoutId ?? null,
        toernooi_code:
          normStr((placeholderFromHit as any)?.toernooi_code)?.toUpperCase() ?? null,
        fighter_id: normStr((placeholderFromHit as any)?.toernooi_code)
          ? null
          : normStr((placeholderFromHit as any)?.fighter_id) ??
            normStr((placeholderFromHit as any)?.va_nummer),
        toernooi_va_nummer: normStr((placeholderFromHit as any)?.toernooi_code)
          ? normStr((placeholderFromHit as any)?.toernooi_va_nummer) ??
            normStr((placeholderFromHit as any)?.va_nummer) ??
            normStr((placeholderFromHit as any)?.fighter_id)
          : null,

        rule_code: "__NO_RULES__",
        rule: "NO_RULES",
        severity: null,
        resultaat: "OK",
        boodschap: null,
        hoek: null,
        original_resultaat: "OK",
        actie_status: null,
      };

      if (prev) {
        const norm = prev._norm as "approved" | "rejected" | null;

        placeholderRow.review_status = norm ?? prev.review_status ?? null;
        placeholderRow.review_note = prev.review_note ?? null;
        placeholderRow.reviewed_by = prev.reviewed_by ?? null;
        placeholderRow.reviewed_at = prev.reviewed_at ?? null;
        placeholderRow.aantekeningen = prev.aantekeningen ?? null;

        if (norm === "approved") {
          placeholderRow.resultaat = "OK";
          placeholderRow.actie_status = "goedgekeurd";
        } else if (norm === "rejected") {
          placeholderRow.resultaat = "AFKEUR";
          placeholderRow.actie_status = "afgekeurd";
        }
      }

      rowsToInsert.push(placeholderRow);
    } else {
      // hele run zonder hits: dan is er niets te schrijven
      // maar dit is bewust, want zonder scope weten we niet welke partijen placeholders moeten krijgen
      return;
    }
  }

  const { error: insErr } = await supabaseAdmin
    .from("controle_resultaten")
    .insert(rowsToInsert);

  if (insErr) throw insErr;
}