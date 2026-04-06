import { supabaseAdmin } from "@/lib/matchmaker/access";

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function asId(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
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
    .eq("matchmaking_id", mmId)
    .order("row_nr", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (insErr) throw insErr;

  const { data: scrapedRows, error: rawErr } = await supabaseAdmin
    .from("matchmaker_fighters_raw")
    .select("*")
    .eq("matchmaking_id", mmId)
    .order("scraped_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (rawErr) throw rawErr;

  const { data: uitslagenRows, error: uitsErr } = await supabaseAdmin
    .from("matchmaker_uitslagen_raw")
    .select("*")
    .eq("matchmaking_id", mmId);

  if (uitsErr) throw uitsErr;

  const uitslagenByVa = new Map<string, any[]>();
  for (const row of uitslagenRows ?? []) {
    const va =
      asId(row?.va_nummer) ??
      asId(row?.va) ??
      asId(row?.fighter_va) ??
      asId(row?.vechter_va);

    if (!va) continue;

    const arr = uitslagenByVa.get(va) ?? [];
    arr.push(row);
    uitslagenByVa.set(va, arr);
  }

  const latestScrapedByInschrijving = new Map<string, any>();
  const latestScrapedByVa = new Map<string, any>();
  const latestScrapedByRowNr = new Map<number, any>();

  for (const row of scrapedRows ?? []) {
    const inschrijvingId = asId(row?.inschrijving_id);
    const va = asId(row?.va_nummer);
    const rowNr = asNumber(row?.row_nr);

    if (inschrijvingId && !latestScrapedByInschrijving.has(inschrijvingId)) {
      latestScrapedByInschrijving.set(inschrijvingId, row);
    }

    if (va && !latestScrapedByVa.has(va)) {
      latestScrapedByVa.set(va, row);
    }

    if (rowNr != null && !latestScrapedByRowNr.has(rowNr)) {
      latestScrapedByRowNr.set(rowNr, row);
    }
  }

  const now = new Date().toISOString();

  const upserts = (inschrijvingen ?? []).map((ins: any) => {
    const inschrijvingId = asId(ins?.id);
    const insVa = asId(ins?.va_nummer);
    const insRowNr = asNumber(ins?.row_nr);

    const raw =
      (inschrijvingId
        ? latestScrapedByInschrijving.get(inschrijvingId)
        : null) ??
      (insRowNr != null ? latestScrapedByRowNr.get(insRowNr) : null) ??
      (insVa ? latestScrapedByVa.get(insVa) : null) ??
      null;

    const rawPayload = stripRawForContext(raw);

    const va = asId(ins?.va_nummer ?? raw?.va_nummer);
    const uitslagen = va ? uitslagenByVa.get(va) ?? [] : [];

    const uitslagenDatums = uniqueSortedDates(
      uitslagen
        .map((row: any) =>
          asDateString(
            row?.datum ??
              row?.partij_datum ??
              row?.event_datum ??
              row?.created_at
          )
        )
        .filter(Boolean) as string[]
    );

    const latestBoutDate =
      uitslagenDatums.length > 0
        ? uitslagenDatums[uitslagenDatums.length - 1]
        : null;

    const naamInput =
      fullName(ins?.voornaam, ins?.achternaam) ??
      asId(ins?.naam_input) ??
      asId(ins?.naam) ??
      null;

    const fpNaam =
      raw?.fp_naam ??
      raw?.naam ??
      fullName(raw?.voornaam, raw?.achternaam) ??
      null;

    const geboortedatumInput =
      asDateString(ins?.geboortedatum_input) ??
      asDateString(ins?.geboortedatum) ??
      null;

    const fpGeboortedatum =
      asDateString(raw?.fp_geboortedatum) ??
      asDateString(raw?.geboortedatum) ??
      null;

    const gymInput = asId(ins?.gym_input ?? ins?.gym ?? ins?.sportschool);
    const fpGym = asId(raw?.fp_gym ?? raw?.gym ?? raw?.sportschool);

    const recordW = asNumber(
      raw?.record_w ?? raw?.gewonnen ?? raw?.win ?? raw?.wins
    );
    const recordL = asNumber(
      raw?.record_l ?? raw?.verloren ?? raw?.loss ?? raw?.losses
    );
    const recordD = asNumber(
      raw?.record_d ?? raw?.gelijk ?? raw?.draw ?? raw?.draws
    );

    const existingExtra =
      raw?.extra && typeof raw.extra === "object" ? raw.extra : null;

    return {
      matchmaking_id: mmId,
      inschrijving_id: inschrijvingId,
      row_nr: insRowNr,

      discipline: ins?.discipline ?? raw?.discipline ?? null,
      klasse: ins?.klasse ?? raw?.fp_klasse ?? raw?.klasse ?? null,
      geslacht: ins?.geslacht ?? raw?.geslacht ?? null,

      voornaam: ins?.voornaam ?? null,
      achternaam: ins?.achternaam ?? null,
      naam_input: naamInput,

      gym_input: gymInput,
      geboortedatum_input: geboortedatumInput,
      gewicht: asNumber(ins?.gewicht),
      va_nummer: va,

      fp_naam: fpNaam,
      fp_geboortedatum: fpGeboortedatum,
      fp_gym: fpGym,
      fp_klasse: raw?.fp_klasse ?? null,

      record_w: recordW,
      record_l: recordL,
      record_d: recordD,

      naam_match: namesRoughlyMatch(naamInput, fpNaam),
      geboortedatum_match: datesMatch(geboortedatumInput, fpGeboortedatum),
      gym_match: gymsMatch(gymInput, fpGym),

      uitslagen_count: uitslagen.length,
      laatste_partij_datum: latestBoutDate,

      nulmeting_opmerking:
        raw?.nulmeting_opmerking ??
        raw?.opmerking ??
        null,

      heeft_keurmerk:
        raw?.heeft_keurmerk != null
          ? String(raw.heeft_keurmerk)
          : null,

      ...rawPayload,

      extra: {
        ...(existingExtra ?? {}),
        upload_id: asId(ins?.upload_id),
        row_nr: insRowNr,
        scraped_at: raw?.scraped_at ?? null,
        scrape_run_id:
          asId(raw?.scrape_run_id) ??
          asId(raw?.controle_run_id) ??
          runId,
        controle_run_id:
          runId ??
          asId(raw?.controle_run_id) ??
          null,
        opmerkingen: ins?.opmerkingen ?? null,
        raw_inschrijving: ins?.raw ?? null,
        raw_scrape: raw ?? null,
        uitslagen_datums: uitslagenDatums,
        uitslagen_raw_count: uitslagen.length,
      },

      updated_at: now,
    };
  });

  if (upserts.length === 0) {
    return { count: 0 };
  }

  const { error: upsertErr } = await supabaseAdmin
    .from("matchmaker_fighter_context")
    .upsert(upserts, {
      onConflict: "matchmaking_id,inschrijving_id",
    });

  if (upsertErr) throw upsertErr;

  return { count: upserts.length };
}