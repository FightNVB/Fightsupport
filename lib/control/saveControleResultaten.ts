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

  // ✅ uuid string, nooit object
  bout_id?: string | null;

  // ✅ uuid string
  matchmaking_id?: string | null;
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
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function reviewKey(row: { partij_nr: any; bout_id: any; rule_code: any; hoek: any }) {
  const partij = asInt(row.partij_nr) ?? -1;
  const bout = asUuid(row.bout_id) ?? "";
  const code = String(row.rule_code ?? "").trim().toUpperCase();
  const hoek = String(row.hoek ?? "").trim().toLowerCase();
  return `${partij}|${bout}|${code}|${hoek}`;
}

function normalizeReviewStatus(v: any): "approved" | "rejected" | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "approved" || s === "goedgekeurd") return "approved";
  if (s === "rejected" || s === "afgekeurd") return "rejected";
  return null;
}

/**
 * ✅ saveControleResultaten (preserve handmatige reviews + aantekeningen)
 *
 * Scopes:
 * - zonder bout_id: werkt zoals vroeger (hele run vervangen)
 * - met bout_id: alleen die bout vervangen (perfect voor rescrape 1 partij)
 */
export async function saveControleResultaten(opts: {
  controle_run_id: string;
  matchmaking_id: string;
  hits: RuleHit[];
  bout_id?: string | null; // ✅ scope op stabiele bout sleutel (== bout_uid)
}) {
  const controle_run_id = asUuid(opts?.controle_run_id);
  const matchmaking_id = asUuid(opts?.matchmaking_id);
  const scopedBoutId = asUuid(opts?.bout_id);

  if (!controle_run_id) throw new Error("[saveControleResultaten] controle_run_id ontbreekt/ongeldig");
  if (!matchmaking_id) throw new Error("[saveControleResultaten] matchmaking_id ontbreekt/ongeldig");

  const hitsIn = Array.isArray(opts?.hits) ? opts.hits : [];

  // ✅ 0) bestaande reviews ophalen (voordat we deleten) — scoped indien bout_id
  let exQ = supabaseAdmin
    .from("controle_resultaten")
    .select(
      "partij_nr,bout_id,rule_code,hoek,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,original_resultaat,resultaat,actie_status"
    )
    .eq("controle_run_id", controle_run_id);

  if (scopedBoutId) exQ = exQ.eq("bout_id", scopedBoutId);

  const { data: existing, error: exErr } = await exQ;
  if (exErr) throw exErr;

  const reviewMap = new Map<string, any>();
  for (const r of existing ?? []) {
    const key = reviewKey(r as any);
    const rs = normalizeReviewStatus((r as any).review_status);
    const hasReview = !!rs || !!(r as any).reviewed_at || !!String((r as any).review_note ?? "").trim();
    const hasNotes = !!String((r as any).aantekeningen ?? "").trim();

    if (hasReview || hasNotes) {
      reviewMap.set(key, { ...r, _norm: rs });
    }
  }

  // ✅ 1) oude resultaten weg — scoped indien bout_id
  let delQ = supabaseAdmin.from("controle_resultaten").delete().eq("controle_run_id", controle_run_id);
  if (scopedBoutId) delQ = delQ.eq("bout_id", scopedBoutId);

  const { error: delErr } = await delQ;
  if (delErr) throw delErr;

  // ✅ 2) rows bouwen + review terugplakken
  const rowsToInsert: any[] = [];

  for (const hit of hitsIn) {
    const partij_nr = asInt(hit?.partij_nr);

    // als hit geen bout_id meegeeft maar we werken scoped: forceer scopedBoutId
    const bout_id = asUuid(hit?.bout_id) ?? scopedBoutId ?? null;

    // safety: bij scoped opslaan MÓET bout_id bestaan
    if (scopedBoutId && !bout_id) continue;

    const mmId = asUuid(hit?.matchmaking_id) ?? matchmaking_id;

    const baseRow: any = {
      controle_run_id,
      run_id: controle_run_id, // legacy/handig
      matchmaking_id: mmId,

      partij_nr,
      bout_id,

      rule_code: hit.rule_code ?? null,
      rule: hit.rule ?? hit.rule_code ?? "RULE",
      severity: hit.severity ?? null,
      resultaat: hit.resultaat ?? null,
      boodschap: hit.boodschap ?? hit.message ?? null,
      hoek: hit.hoek ?? null,
      original_resultaat: hit.resultaat ?? null,
    };

    const key = reviewKey({
      partij_nr,
      bout_id,
      rule_code: hit.rule_code,
      hoek: hit.hoek,
    });

    const prev = reviewMap.get(key);

    // ✅ als admin ooit reviewed heeft: behoud review + override resultaat
    if (prev) {
      const norm = prev._norm as "approved" | "rejected" | null;

      baseRow.review_status = norm ?? prev.review_status ?? null;
      baseRow.review_note = prev.review_note ?? null;
      baseRow.reviewed_by = prev.reviewed_by ?? null;
      baseRow.reviewed_at = prev.reviewed_at ?? null;

      // behoud aantekeningen altijd
      baseRow.aantekeningen = prev.aantekeningen ?? null;

      // admin decision wint van rule-hit
      if (norm === "approved") {
        baseRow.resultaat = "OK";
        baseRow.actie_status = "goedgekeurd";
      } else if (norm === "rejected") {
        baseRow.resultaat = "AFKEUR";
        baseRow.actie_status = "afgekeurd";
      }
    }

    rowsToInsert.push(baseRow);
  }

  if (rowsToInsert.length === 0) return;

  const { error: insErr } = await supabaseAdmin.from("controle_resultaten").insert(rowsToInsert);
  if (insErr) throw insErr;
}
