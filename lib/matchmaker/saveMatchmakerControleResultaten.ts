import { supabaseAdmin } from "@/lib/matchmaker/access";

export type MatchmakerRuleHit = {
  row_nr?: number | null;
  inschrijving_id?: string | null;
  va_nummer?: string | null;

  rule_code: string;
  rule?: string | null;
  severity?: string | null;
  resultaat?: string | null;
  boodschap?: string | null;
  message?: string | null;
  hoek?: "rood" | "blauw" | null;
};

function asId(v: any): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function asInt(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function normalizeHit(hit: MatchmakerRuleHit) {
  return {
    row_nr: asInt(hit?.row_nr),
    inschrijving_id: asId(hit?.inschrijving_id),
    va_nummer: asId(hit?.va_nummer),
    rule_code: String(hit?.rule_code ?? "").trim(),
    rule: String(hit?.rule ?? hit?.rule_code ?? "").trim() || null,
    severity: String(hit?.severity ?? "").trim() || null,
    resultaat: String(hit?.resultaat ?? "").trim() || null,
    boodschap:
      String(hit?.boodschap ?? hit?.message ?? "").trim() || null,
    hoek: hit?.hoek ?? null,
  };
}

export async function saveMatchmakerControleResultaten(opts: {
  matchmaking_id: string;
  controle_run_id?: string | null;
  hits: MatchmakerRuleHit[];
}) {
  const matchmaking_id = asId(opts?.matchmaking_id);
  const controle_run_id = asId(opts?.controle_run_id);
  const hits = Array.isArray(opts?.hits) ? opts.hits : [];

  if (!matchmaking_id) {
    throw new Error("[saveMatchmakerControleResultaten] matchmaking_id ontbreekt");
  }

  const { data: existingRows, error: existingErr } = await supabaseAdmin
    .from("matchmaker_fighter_context")
    .select("id, inschrijving_id, row_nr, va_nummer, extra")
    .eq("matchmaking_id", matchmaking_id);

  if (existingErr) throw existingErr;

  const byRowNr = new Map<number, any>();
  const byInschrijvingId = new Map<string, any>();
  const byVa = new Map<string, any>();

  for (const row of existingRows ?? []) {
    const rowNr = asInt(row?.row_nr);
    const inschrijvingId = asId(row?.inschrijving_id);
    const va = asId(row?.va_nummer);

    if (rowNr != null && !byRowNr.has(rowNr)) byRowNr.set(rowNr, row);
    if (inschrijvingId && !byInschrijvingId.has(inschrijvingId)) {
      byInschrijvingId.set(inschrijvingId, row);
    }
    if (va && !byVa.has(va)) byVa.set(va, row);
  }

  const grouped = new Map<
    string,
    {
      row: any;
      meldingen: any[];
      verschillen: any[];
    }
  >();

  for (const rawHit of hits) {
    const hit = normalizeHit(rawHit);
    if (!hit.rule_code) continue;

    const row =
      (hit.inschrijving_id
        ? byInschrijvingId.get(hit.inschrijving_id)
        : null) ??
      (hit.row_nr != null ? byRowNr.get(hit.row_nr) : null) ??
      (hit.va_nummer ? byVa.get(hit.va_nummer) : null) ??
      null;

    if (!row?.id) continue;

    const key = String(row.id);
    const bucket =
      grouped.get(key) ??
      {
        row,
        meldingen: [],
        verschillen: [],
      };

    const item = {
      rule_code: hit.rule_code,
      rule: hit.rule,
      severity: hit.severity,
      resultaat: hit.resultaat,
      boodschap: hit.boodschap,
      hoek: hit.hoek,
    };

    bucket.meldingen.push(item);

    if (
      hit.resultaat &&
      ["warn", "warning", "afwijking", "check", "review"].includes(
        String(hit.resultaat).trim().toLowerCase()
      )
    ) {
      bucket.verschillen.push(item);
    }

    grouped.set(key, bucket);
  }

  for (const [, bucket] of grouped) {
    const prevExtra =
      bucket.row?.extra && typeof bucket.row.extra === "object"
        ? bucket.row.extra
        : {};

    const nextExtra = {
      ...prevExtra,
      controle_run_id,
      meldingen: bucket.meldingen,
      verschillen: bucket.verschillen,
      meldingen_count: bucket.meldingen.length,
      verschillen_count: bucket.verschillen.length,
      laatste_rules_save_op: new Date().toISOString(),
    };

    const { error: updErr } = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .update({
        extra: nextExtra,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bucket.row.id);

    if (updErr) throw updErr;
  }

  return {
    ok: true,
    geraakt: grouped.size,
    hits: hits.length,
  };
}