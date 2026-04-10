import { supabaseAdmin } from "@/lib/matchmaker/access";

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function asId(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

function asVa(v: unknown) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.replace(/[^0-9]/g, "") || null;
}

function asDateString(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

function asNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asBoolLike(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;

  const s = String(v).trim().toLowerCase();
  if (!s) return null;

  if (["1", "true", "ja", "yes", "y"].includes(s)) return true;
  if (["0", "false", "nee", "no", "n"].includes(s)) return false;

  return null;
}

function fullName(vn?: unknown, an?: unknown) {
  return (
    [String(vn ?? "").trim(), String(an ?? "").trim()]
      .filter(Boolean)
      .join(" ")
      .trim() || null
  );
}

function namesRoughlyMatch(a: string | null, b: string | null) {
  const aa = norm(a).replace(/\s+/g, " ");
  const bb = norm(b).replace(/\s+/g, " ");
  if (!aa || !bb) return false;
  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

function datesMatch(a: string | null, b: string | null) {
  return !!a && !!b && String(a) === String(b);
}

function gymsMatch(a: string | null, b: string | null) {
  const aa = norm(a);
  const bb = norm(b);
  if (!aa || !bb) return false;
  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

function uniqueSortedDates(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function stripRawForContext(raw: Record<string, any> | null | undefined) {
  if (!raw) return {};
  const copy = { ...raw };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.matchmaking_id;
  return copy;
}

export async function buildMatchmakerFighterContext(
  matchmakingId: string,
  controleRunId?: string | null
) {
  const mmId = asId(matchmakingId);
  if (!mmId) {
    throw new Error("buildMatchmakerFighterContext: matchmakingId ontbreekt.");
  }

  const runId = asId(controleRunId);

  const { data: inschrijvingen, error: insErr } = await supabaseAdmin
    .from("matchmaker_inschrijvingen")
    .select("*")
    .eq("matchmaking_id", mmId);

  if (insErr) throw insErr;

  const { data: scrapedRows, error: rawErr } = await supabaseAdmin
    .from("matchmaker_fighters_raw")
    .select("*")
    .eq("matchmaking_id", mmId);

  if (rawErr) throw rawErr;

  const latestScrapedByVa = new Map<string, any>();

  for (const row of scrapedRows ?? []) {
    const va = asVa(row?.va_nummer);
    if (va && !latestScrapedByVa.has(va)) {
      latestScrapedByVa.set(va, row);
    }
  }

  const now = new Date().toISOString();

  const upserts = (inschrijvingen ?? []).map((ins: any) => {
    const insVa = asVa(ins?.va_nummer);

    const raw = insVa ? latestScrapedByVa.get(insVa) : null;

    const naamInput =
      fullName(ins?.voornaam, ins?.achternaam) ??
      asId(ins?.naam_input) ??
      null;

    const fpNaam =
      raw?.naam ??
      fullName(raw?.voornaam, raw?.achternaam) ??
      null;

    const geboortedatumInput =
      asDateString(ins?.geboortedatum_input) ??
      asDateString(ins?.geboortedatum) ??
      null;

    const fpGeboortedatum =
      asDateString(raw?.geboortedatum) ??
      null;

    return {
      matchmaking_id: mmId,
      inschrijving_id: asId(ins?.id),

      naam: fpNaam ?? naamInput,
      geboortedatum: fpGeboortedatum ?? geboortedatumInput,
      gewicht: asNumber(ins?.gewicht ?? raw?.gewicht),
      geslacht: ins?.geslacht ?? raw?.geslacht ?? null,
      klasse: ins?.klasse ?? raw?.klasse ?? null,

      licentie: raw?.licentie ?? null,
      heeft_startverbod: raw?.heeft_startverbod ?? null,
      totaal_wedstrijden: asNumber(raw?.totaal_wedstrijden),
      gewonnen: asNumber(raw?.gewonnen),

      naam_match: namesRoughlyMatch(naamInput, fpNaam),
      geboortedatum_match: datesMatch(geboortedatumInput, fpGeboortedatum),
      gym_match: gymsMatch(ins?.gym_input, raw?.gym),

      extra: {
        raw_scrape: raw ?? null,
      },

      updated_at: now,
    };
  });

  const { error: upsertErr } = await supabaseAdmin
    .from("matchmaker_fighter_context")
    .upsert(upserts, {
      onConflict: "matchmaking_id,inschrijving_id",
    });

  if (upsertErr) throw upsertErr;

  return { count: upserts.length };
}