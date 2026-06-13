import { NextResponse } from "next/server";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";
import { evaluateWeighInBout } from "@/lib/weegstation/weighInRulesEngine";

export const runtime = "nodejs";

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function cleanText(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const s = cleanText(value);
    if (s) return s;
  }
  return null;
}

function isYouthClassCode(v: unknown): boolean {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "j" || s === "j+" || s.includes("jeugd") || s.includes("junior");
}

function getLeeftijdType(ctx: any): string {
  const existing = cleanText(ctx?.leeftijd_type);
  if (existing) return existing;

  const rood = Number(ctx?.rood_leeftijd_event ?? ctx?.rood_leeftijd_mm);
  const blauw = Number(ctx?.blauw_leeftijd_event ?? ctx?.blauw_leeftijd_mm);
  const single = Number(ctx?.leeftijd_event);
  if (Number.isFinite(single) && single < 18) return "jeugd";
  if (Number.isFinite(rood) && rood < 18) return "jeugd";
  if (Number.isFinite(blauw) && blauw < 18) return "jeugd";
  if (isYouthClassCode(ctx?.klasse_mm ?? ctx?.klasse)) return "jeugd";
  return "volwassene";
}

function sameValue(a: unknown, b: unknown) {
  if (a == null && b == null) return true;
  return String(a ?? "") === String(b ?? "");
}

function toernooiSortNr(code: unknown, fallbackIndex: number) {
  const s = String(code ?? "")
    .trim()
    .toUpperCase();
  const n = Number(s.replace(/[^0-9]/g, ""));
  const base = Number.isFinite(n) && n > 0 ? n : 999;
  return 900000 + base * 1000 + fallbackIndex;
}

function getToernooiCodeFromPartijNr(partijNr: unknown): string | null {
  const n = Number(partijNr);
  if (!Number.isFinite(n) || n < 900000) return null;
  const codeNr = Math.floor((n - 900000) / 1000);
  return codeNr > 0 && codeNr < 999 ? `T${codeNr}` : null;
}

function isSyntheticToernooiRow(row: any): boolean {
  return Number(row?.partij_nr) >= 900000 || (Number(row?.original_partij_nr) === 0 && !cleanText(row?.blauw_naam));
}

async function getLatestBoutContextRows(admin: any, matchmakingId: string) {
  const { data, error } = await admin
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .eq("is_toernooi", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const byKey = new Map<string, any>();
  for (const row of data ?? []) {
    const partijNr = Number((row as any)?.partij_nr);
    if (!Number.isFinite(partijNr) || partijNr <= 0) continue;
    const boutId = cleanText((row as any)?.bout_id);
    const key = boutId ? `bout:${boutId}` : `partij:${partijNr}`;
    if (!byKey.has(key)) byKey.set(key, row);
  }

  return Array.from(byKey.values()).sort(
    (a: any, b: any) => Number(a.partij_nr) - Number(b.partij_nr),
  );
}

async function getLatestToernooiContextRows(admin: any, matchmakingId: string) {
  const { data, error } = await admin
    .from("controle_toernooi_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const byKey = new Map<string, any>();
  for (const row of data ?? []) {
    const code = cleanText((row as any)?.toernooi_code);
    const va = cleanText((row as any)?.va_nummer ?? (row as any)?.fighter_id);
    if (!code || !va) continue;
    const key = `${code}__${va}`;
    if (!byKey.has(key)) byKey.set(key, row);
  }

  return Array.from(byKey.values()).sort((a: any, b: any) => {
    const ca = String(a.toernooi_code ?? "");
    const cb = String(b.toernooi_code ?? "");
    if (ca !== cb) return ca.localeCompare(cb, "nl", { numeric: true });
    return String(a.naam ?? "").localeCompare(String(b.naam ?? ""));
  });
}

function makeBoutBasePayload(ctx: any, fallbackBondteam: string | null) {
  const leeftijdType = getLeeftijdType(ctx);

  return {
    upload_id: ctx.upload_id ?? null,
    bout_context_id: ctx.id ?? null,
    controle_run_id: ctx.controle_run_id ?? null,
    partij_nr: Number(ctx.partij_nr),
    bondteam: firstText(ctx.bondteam, fallbackBondteam) ?? "",
    evenement_naam: cleanText(ctx.evenement_naam),
    evenement_datum: cleanText(ctx.evenement_datum),
    discipline: cleanText(ctx.discipline),
    klasse_mm: cleanText(ctx.klasse_mm),
    max_gewicht: ctx.max_gewicht ?? null,
    max_gewicht_notatie: ctx.max_gewicht_notatie ?? null,
    max_gewicht_type: ctx.max_gewicht_type ?? null,
    original_partij_nr: ctx.original_partij_nr ?? null,
    rood_naam: firstText(ctx.rood_naam_mm, ctx.rood_naam_fp),
    rood_gym: cleanText(ctx.rood_gym_mm),
    rood_va: cleanText(ctx.rood_va_mm),
    rood_geboortedatum:
      ctx.rood_geboortedatum_mm ?? ctx.rood_geboortedatum_fp ?? null,
    rood_leeftijd_event:
      ctx.rood_leeftijd_event ?? ctx.rood_leeftijd_mm ?? null,
    rood_doorgegeven_gewicht: ctx.rood_gewicht_mm ?? null,
    blauw_naam: firstText(ctx.blauw_naam_mm, ctx.blauw_naam_fp),
    blauw_gym: cleanText(ctx.blauw_gym_mm),
    blauw_va: cleanText(ctx.blauw_va_mm),
    blauw_geboortedatum:
      ctx.blauw_geboortedatum_mm ?? ctx.blauw_geboortedatum_fp ?? null,
    blauw_leeftijd_event:
      ctx.blauw_leeftijd_event ?? ctx.blauw_leeftijd_mm ?? null,
    blauw_doorgegeven_gewicht: ctx.blauw_gewicht_mm ?? null,
    leeftijd_type: leeftijdType,
  };
}

function makeToernooiBasePayload(
  ctx: any,
  fallbackBondteam: string | null,
  index: number,
) {
  const code = cleanText(ctx.toernooi_code) ?? "T?";
  const maxGewicht = ctx.max_gewicht ?? ctx.gewicht ?? null;

  return {
    upload_id: ctx.upload_id ?? null,
    bout_context_id: ctx.id ?? null,
    controle_run_id: ctx.controle_run_id ?? null,
    partij_nr: toernooiSortNr(code, index),
    bondteam: firstText(ctx.bondteam, fallbackBondteam) ?? "",
    evenement_naam: cleanText(ctx.evenement_naam),
    evenement_datum: cleanText(ctx.evenement_datum),
    discipline: cleanText(ctx.discipline),
    klasse_mm: cleanText(ctx.klasse_mm ?? ctx.klasse),
    max_gewicht: maxGewicht,
    max_gewicht_notatie:
      ctx.max_gewicht_notatie ?? (maxGewicht != null ? `-${maxGewicht}` : null),
    max_gewicht_type: ctx.max_gewicht_type ?? "up_to",
    original_partij_nr: 0,
    rood_naam: firstText(ctx.naam_mm, ctx.naam_fp, ctx.naam),
    rood_gym: cleanText(ctx.sportschool_mm ?? ctx.sportschool),
    rood_va: cleanText(ctx.va_nummer ?? ctx.fighter_id),
    rood_geboortedatum: ctx.geboortedatum ?? null,
    rood_leeftijd_event: ctx.leeftijd_event ?? null,
    rood_doorgegeven_gewicht: ctx.gewicht ?? null,
    blauw_naam: null,
    blauw_gym: null,
    blauw_va: null,
    blauw_geboortedatum: null,
    blauw_leeftijd_event: null,
    blauw_doorgegeven_gewicht: null,
    leeftijd_type: getLeeftijdType(ctx),
  };
}

function makeEvaluatedPayload(
  base: any,
  existing?: any,
  userId?: string | null,
  groupWeights?: number[],
) {
  const roodGewogen = toNum(existing?.rood_gewogen_gewicht);
  const baseIsToernooi = Number(base.original_partij_nr) === 0 && !cleanText(base.blauw_naam);
  const blauwGewogen = baseIsToernooi
    ? null
    : toNum(existing?.blauw_gewogen_gewicht);

  const evalResult = evaluateWeighInBout({
    discipline: base.discipline,
    klasse_mm: base.klasse_mm,
    leeftijd_type: base.leeftijd_type,
    max_gewicht: toNum(base.max_gewicht),
    max_gewicht_notatie: base.max_gewicht_notatie ?? null,
    rood_doorgegeven_gewicht: toNum(base.rood_doorgegeven_gewicht),
    blauw_doorgegeven_gewicht: toNum(base.blauw_doorgegeven_gewicht),
    rood_gewogen_gewicht: roodGewogen,
    blauw_gewogen_gewicht: blauwGewogen,
    dispensatie_verleend: !!existing?.dispensatie_verleend,
    is_toernooi: baseIsToernooi,
    toernooi_code: baseIsToernooi ? getToernooiCodeFromPartijNr(base.partij_nr) : null,
    toernooi_group_gewichten: groupWeights ?? [],
  });

  const nextDispensatieNodig = !!evalResult.dispensatieNodig;

  return {
    ...base,
    rood_gewogen_gewicht: roodGewogen,
    blauw_gewogen_gewicht: blauwGewogen,
    gewicht_verschil: evalResult.diff,
    leeftijd_type: evalResult.leeftijdType,
    reglement_status: evalResult.reglementStatus,
    praktijk_status: evalResult.praktijkStatus,
    eindstatus: evalResult.eindStatus,
    dispensatie_nodig: nextDispensatieNodig,
    dispensatie_verleend: nextDispensatieNodig
      ? !!existing?.dispensatie_verleend
      : false,
    dispensatie_reason: nextDispensatieNodig
      ? (existing?.dispensatie_reason ?? null)
      : null,
    gewicht_strafpunt_rood: existing?.gewicht_strafpunt_rood ?? 0,
    gewicht_strafpunt_blauw: baseIsToernooi
      ? 0
      : (existing?.gewicht_strafpunt_blauw ?? 0),
    admin_sanctie_nodig: !!evalResult.adminSanctieNodig,
    admin_sanctie_reason: evalResult.adminSanctieReason ?? null,
    weging_notitie: existing?.weging_notitie ?? null,
    laatste_bewerking_door: existing?.laatste_bewerking_door ?? userId ?? null,
    laatste_bewerking_op: existing?.laatste_bewerking_op ?? null,
    updated_at: new Date().toISOString(),
  };
}


function newestTimestamp(row: any): number {
  return new Date(row?.updated_at ?? row?.laatste_bewerking_op ?? row?.created_at ?? 0).getTime();
}

function fighterWeighKey(va: unknown, name?: unknown): string | null {
  const vaText = cleanText(va);
  if (vaText) return `va:${vaText}`;
  const nameText = cleanText(name)?.toLowerCase();
  return nameText ? `naam:${nameText}` : null;
}

function matchupKey(roodVa: unknown, blauwVa: unknown, roodNaam?: unknown, blauwNaam?: unknown): string | null {
  const a = fighterWeighKey(roodVa, roodNaam);
  const b = fighterWeighKey(blauwVa, blauwNaam);
  if (!a || !b) return null;
  return [a, b].sort().join("__vs__");
}

function matchupKeyFromBase(base: any): string | null {
  const isToernooi = Number(base?.original_partij_nr) === 0 && !cleanText(base?.blauw_naam);
  if (isToernooi) return null;
  return matchupKey(base?.rood_va, base?.blauw_va, base?.rood_naam, base?.blauw_naam);
}

function matchupKeyFromRow(row: any): string | null {
  const isToernooi = isSyntheticToernooiRow(row);
  if (isToernooi) return null;
  return matchupKey(row?.rood_va, row?.blauw_va, row?.rood_naam, row?.blauw_naam);
}

type PreservedFighterWeighing = {
  gewicht: number | null;
  strafpunt: 0 | 1;
  laatste_bewerking_door: string | null;
  laatste_bewerking_op: string | null;
  sourceRow: any;
};

function rememberFighterWeighing(
  map: Map<string, PreservedFighterWeighing>,
  key: string | null,
  value: PreservedFighterWeighing,
) {
  if (!key || value.gewicht == null) return;
  const prev = map.get(key);
  if (!prev || newestTimestamp(value.sourceRow) >= newestTimestamp(prev.sourceRow)) {
    map.set(key, value);
  }
}

function makeExistingWithMappedWeighing(
  base: any,
  targetRow: any,
  exactMatchRow: any,
  fighterWeights: Map<string, PreservedFighterWeighing>,
) {
  const existing = exactMatchRow ? { ...exactMatchRow } : { ...(targetRow ?? {}) };
  const roodKey = fighterWeighKey(base?.rood_va, base?.rood_naam);
  const blauwKey = fighterWeighKey(base?.blauw_va, base?.blauw_naam);
  const rood = roodKey ? fighterWeights.get(roodKey) : null;
  const blauw = blauwKey ? fighterWeights.get(blauwKey) : null;
  const isToernooi = Number(base?.original_partij_nr) === 0 && !cleanText(base?.blauw_naam);

  existing.rood_gewogen_gewicht = rood?.gewicht ?? null;
  existing.gewicht_strafpunt_rood = rood?.strafpunt ?? 0;
  existing.blauw_gewogen_gewicht = isToernooi ? null : (blauw?.gewicht ?? null);
  existing.gewicht_strafpunt_blauw = isToernooi ? 0 : (blauw?.strafpunt ?? 0);

  const latestEdit = [rood, blauw]
    .filter(Boolean)
    .sort((a: any, b: any) => newestTimestamp(b.sourceRow) - newestTimestamp(a.sourceRow))[0] as PreservedFighterWeighing | undefined;

  existing.laatste_bewerking_door = latestEdit?.laatste_bewerking_door ?? exactMatchRow?.laatste_bewerking_door ?? targetRow?.laatste_bewerking_door ?? null;
  existing.laatste_bewerking_op = latestEdit?.laatste_bewerking_op ?? exactMatchRow?.laatste_bewerking_op ?? targetRow?.laatste_bewerking_op ?? null;

  if (!exactMatchRow) {
    existing.dispensatie_verleend = false;
    existing.dispensatie_reason = null;
    existing.weging_notitie = null;
    existing.admin_sanctie_nodig = false;
    existing.admin_sanctie_reason = null;
  }

  return existing;
}

function didChange(existing: any, payload: Record<string, unknown>) {
  for (const [key, value] of Object.entries(payload)) {
    if (key === "updated_at") continue;
    if (!sameValue(existing?.[key], value)) return true;
  }
  return false;
}

async function recalcToernooiGroups(admin: any, matchmakingId: string) {
  const { data: rows, error } = await admin
    .from("weigh_in_bouts")
    .select("*")
    .eq("matchmaking_id", matchmakingId);

  if (error) throw error;

  const byCode = new Map<string, any[]>();
  for (const row of rows ?? []) {
    if (!isSyntheticToernooiRow(row)) continue;
    const code = getToernooiCodeFromPartijNr(row.partij_nr);
    if (!code) continue;
    byCode.set(code, [...(byCode.get(code) ?? []), row]);
  }

  for (const groupRows of byCode.values()) {
    const groupWeights = groupRows
      .map((row) => toNum(row.rood_gewogen_gewicht))
      .filter((v): v is number => v != null);

    for (const row of groupRows) {
      const payload = makeEvaluatedPayload(
        row,
        row,
        row.laatste_bewerking_door,
        groupWeights,
      );
      const { error: updErr } = await admin
        .from("weigh_in_bouts")
        .update({
          gewicht_verschil: payload.gewicht_verschil,
          reglement_status: payload.reglement_status,
          praktijk_status: payload.praktijk_status,
          eindstatus: payload.eindstatus,
          dispensatie_nodig: payload.dispensatie_nodig,
          dispensatie_verleend: payload.dispensatie_verleend,
          dispensatie_reason: payload.dispensatie_reason,
          admin_sanctie_nodig: payload.admin_sanctie_nodig,
          admin_sanctie_reason: payload.admin_sanctie_reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (updErr) throw updErr;
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = String((body as any)?.matchmakingId ?? "").trim();

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmakingId ontbreekt." },
        { status: 400 },
      );
    }

    const { admin, userId } = await getWeegstationAuthContext(
      req,
      matchmakingId,
    );

    const { data: mmRow, error: mmErr } = await admin
      .from("matchmakings")
      .select("id, bondteam")
      .eq("id", matchmakingId)
      .single();

    if (mmErr) throw mmErr;

    const fallbackBondteam = cleanText(mmRow?.bondteam);
    const boutRows = await getLatestBoutContextRows(admin, matchmakingId);
    const toernooiRows = await getLatestToernooiContextRows(
      admin,
      matchmakingId,
    );

    if (boutRows.length === 0 && toernooiRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Geen actuele controle-context gevonden. Bouw eerst de controle-context opnieuw op.",
        },
        { status: 404 },
      );
    }

    const { data: existingRows, error: existingErr } = await admin
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId);

    if (existingErr) throw existingErr;

    const existingByPartij = new Map<number, any>();
    const existingByMatchup = new Map<string, any>();
    const existingByToernooi = new Map<string, any>();
    const fighterWeights = new Map<string, PreservedFighterWeighing>();

    function rememberNewest(map: Map<any, any>, key: any, row: any) {
      if (key == null || key === "") return;
      const prev = map.get(key);
      if (!prev) return map.set(key, row);
      if (newestTimestamp(row) >= newestTimestamp(prev)) map.set(key, row);
    }

    for (const row of existingRows ?? []) {
      const isToernooi = isSyntheticToernooiRow(row);
      const partijNr = Number(row.partij_nr);
      if (!isToernooi && Number.isFinite(partijNr)) {
        rememberNewest(existingByPartij, partijNr, row);
      }

      const matchKey = matchupKeyFromRow(row);
      if (matchKey) rememberNewest(existingByMatchup, matchKey, row);

      rememberFighterWeighing(
        fighterWeights,
        fighterWeighKey(row.rood_va, row.rood_naam),
        {
          gewicht: toNum(row.rood_gewogen_gewicht),
          strafpunt: Number(row.gewicht_strafpunt_rood) === 1 ? 1 : 0,
          laatste_bewerking_door: cleanText(row.laatste_bewerking_door),
          laatste_bewerking_op: cleanText(row.laatste_bewerking_op),
          sourceRow: row,
        },
      );

      if (!isToernooi) {
        rememberFighterWeighing(
          fighterWeights,
          fighterWeighKey(row.blauw_va, row.blauw_naam),
          {
            gewicht: toNum(row.blauw_gewogen_gewicht),
            strafpunt: Number(row.gewicht_strafpunt_blauw) === 1 ? 1 : 0,
            laatste_bewerking_door: cleanText(row.laatste_bewerking_door),
            laatste_bewerking_op: cleanText(row.laatste_bewerking_op),
            sourceRow: row,
          },
        );
      }

      const code = getToernooiCodeFromPartijNr(row.partij_nr);
      const va = cleanText(row.rood_va);
      if (isToernooi && code && va) {
        rememberNewest(existingByToernooi, `${code}__${va}`, row);
      }
    }

    const touchedIds = new Set<string>();
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let deleted = 0;

    async function upsertPayload(basePayload: any, existing: any) {
      const payload = makeEvaluatedPayload(basePayload, existing, userId);
      if (existing?.id) {
        touchedIds.add(String(existing.id));
        if (!didChange(existing, payload)) {
          unchanged++;
          return;
        }
        const { error: updErr } = await admin
          .from("weigh_in_bouts")
          .update(payload)
          .eq("id", existing.id);
        if (updErr) throw updErr;
        updated++;
      } else {
        const { data: insertedRow, error: insErr } = await admin
          .from("weigh_in_bouts")
          .insert({
            matchmaking_id: matchmakingId,
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        if (insertedRow?.id) touchedIds.add(String(insertedRow.id));
        inserted++;
      }
    }

    for (const ctx of boutRows) {
      const partijNr = Number(ctx.partij_nr);
      const basePayload = makeBoutBasePayload(ctx, fallbackBondteam);
      const exactMatchRow = existingByMatchup.get(matchupKeyFromBase(basePayload) ?? "") ?? null;
      const targetRow = exactMatchRow ?? existingByPartij.get(partijNr) ?? null;
      const existing = makeExistingWithMappedWeighing(
        basePayload,
        targetRow,
        exactMatchRow,
        fighterWeights,
      );
      await upsertPayload(basePayload, existing);
    }

    let tIndex = 1;
    for (const ctx of toernooiRows) {
      const code = cleanText(ctx.toernooi_code);
      const va = cleanText(ctx.va_nummer ?? ctx.fighter_id);
      const basePayload = makeToernooiBasePayload(ctx, fallbackBondteam, tIndex++);
      const targetRow = code && va ? existingByToernooi.get(`${code}__${va}`) : null;
      const existing = makeExistingWithMappedWeighing(
        basePayload,
        targetRow,
        targetRow,
        fighterWeights,
      );
      await upsertPayload(basePayload, existing);
    }

    const staleRows = (existingRows ?? []).filter(
      (row: any) => row?.id && !touchedIds.has(String(row.id)),
    );
    if (staleRows.length > 0) {
      const staleIds = staleRows.map((row: any) => row.id);
      const { error: deleteErr } = await admin
        .from("weigh_in_bouts")
        .delete()
        .in("id", staleIds);
      if (deleteErr) throw deleteErr;
      deleted = staleIds.length;
    }

    await recalcToernooiGroups(admin, matchmakingId);

    const { data: rows, error: rowsErr } = await admin
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("partij_nr", { ascending: true });

    if (rowsErr) throw rowsErr;

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      count: (rows ?? []).length,
      inserted,
      updated,
      unchanged,
      deleted,
      toernooi_count: toernooiRows.length,
      preserved_weighing_fields: true,
      rows: rows ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Verversen van weegstation mislukt." },
      { status: 500 },
    );
  }
}
