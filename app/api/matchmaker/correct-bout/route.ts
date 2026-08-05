import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processMatchmakingFighters } from "@/lib/matchmaker/processMatchmakingFighters";
import { buildControleBoutContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(v: unknown): string { return String(v ?? "").trim(); }
function normalizedVa(v: unknown): string | null {
  const digits = s(v).replace(/\D+/g, "").replace(/^0+(?=\d)/, "");
  return digits || null;
}
function emptyToNull(v: unknown) { const value = s(v); return value || null; }
function hasOwn(o: any, k: string) { return Object.prototype.hasOwnProperty.call(o ?? {}, k); }
function isMissingColumn(e: any) { return ["42703", "PGRST204"].includes(String(e?.code ?? "")); }
function uuid(v: unknown): string | null { const value = s(v); return value && value !== "[object Object]" ? value : null; }

async function latestRunId(matchmakingId: string): Promise<string | null> {
  const { data, error } = await supabase.from("controle_runs").select("id, gestart_op")
    .eq("matchmaking_id", matchmakingId).order("gestart_op", { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0]?.id ? String(data[0].id) : null;
}

async function findAanmelding(
  matchmakingId: string,
  aanmeldingId: string | null,
  oldVa: string | null,
) {
  if (aanmeldingId) {
    const { data, error } = await supabase
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("id", aanmeldingId)
      .maybeSingle();

    if (error && !isMissingColumn(error)) throw error;
    if (data) return data;
  }

  if (!oldVa) return null;

  for (const column of ["va_nummer", "va", "fightpaspoort_nummer"]) {
    const { data, error } = await supabase
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq(column, oldVa)
      .limit(1);

    if (!error && data?.[0]) return data[0];
    if (error && !isMissingColumn(error)) throw error;
  }

  return null;
}

function setExisting(patch: Record<string, any>, row: Record<string, any>, columns: string[], value: unknown) {
  if (value === undefined) return;
  for (const column of columns) if (Object.prototype.hasOwnProperty.call(row, column)) patch[column] = emptyToNull(value);
}

function setBoutField(
  patch: Record<string, any>,
  bout: Record<string, any>,
  columns: string[],
  value: unknown,
) {
  if (value === undefined) return;

  let written = false;
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(bout, column)) {
      patch[column] = emptyToNull(value);
      written = true;
    }
  }

  // Op oude schema's kan niet iedere alias bestaan. De eerste standaardkolom
  // wordt dan alsnog gebruikt; ontbrekende kolommen worden hieronder opgevangen.
  if (!written && columns[0]) patch[columns[0]] = emptyToNull(value);
}

async function updateBoutRaw(
  bout: Record<string, any>,
  body: Record<string, any>,
) {
  const patch: Record<string, any> = {};

  setBoutField(patch, bout, ["va_rood", "rood_va", "rood_va_mm"], hasOwn(body, "new_va_rood") ? normalizedVa(body.new_va_rood) : undefined);
  setBoutField(patch, bout, ["rood_naam", "rood_naam_mm"], hasOwn(body, "new_rood_naam") ? body.new_rood_naam : undefined);
  setBoutField(patch, bout, ["rood_gym", "rood_gym_mm", "rood_sportschool"], hasOwn(body, "new_rood_gym") ? body.new_rood_gym : undefined);
  setBoutField(patch, bout, ["rood_gewicht", "rood_gewicht_mm"], hasOwn(body, "new_rood_gewicht") ? body.new_rood_gewicht : undefined);

  setBoutField(patch, bout, ["va_blauw", "blauw_va", "blauw_va_mm"], hasOwn(body, "new_va_blauw") ? normalizedVa(body.new_va_blauw) : undefined);
  setBoutField(patch, bout, ["blauw_naam", "blauw_naam_mm"], hasOwn(body, "new_blauw_naam") ? body.new_blauw_naam : undefined);
  setBoutField(patch, bout, ["blauw_gym", "blauw_gym_mm", "blauw_sportschool"], hasOwn(body, "new_blauw_gym") ? body.new_blauw_gym : undefined);
  setBoutField(patch, bout, ["blauw_gewicht", "blauw_gewicht_mm"], hasOwn(body, "new_blauw_gewicht") ? body.new_blauw_gewicht : undefined);

  setBoutField(patch, bout, ["discipline"], hasOwn(body, "new_discipline") ? body.new_discipline : undefined);
  setBoutField(patch, bout, ["klasse_mm", "klasse"], hasOwn(body, "new_klasse_mm") ? body.new_klasse_mm : hasOwn(body, "new_klasse") ? body.new_klasse : undefined);
  setBoutField(patch, bout, ["geslacht"], hasOwn(body, "new_geslacht") ? body.new_geslacht : undefined);

  if (hasOwn(body, "new_max_gewicht")) {
    const max = emptyToNull(body.new_max_gewicht);
    setBoutField(patch, bout, ["max_gewicht"], max);
    setBoutField(patch, bout, ["max_gewicht_notatie"], max ? `-${max}` : null);
  }

  if (Object.prototype.hasOwnProperty.call(bout, "laatste_bewerking_op")) {
    patch.laatste_bewerking_op = new Date().toISOString();
  }
  if (Object.prototype.hasOwnProperty.call(bout, "updated_at")) {
    patch.updated_at = new Date().toISOString();
  }

  if (!Object.keys(patch).length) return;

  let currentPatch = { ...patch };
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { error } = await supabase
      .from("matchmaking_bouts_raw")
      .update(currentPatch)
      .eq("id", bout.id);

    if (!error) return;

    if (isMissingColumn(error)) {
      const message = String(error?.message ?? "");
      const match = message.match(/column ['"]?([^'"]+)['"]?/i);
      const missing = match?.[1];
      if (missing && Object.prototype.hasOwnProperty.call(currentPatch, missing)) {
        delete currentPatch[missing];
        continue;
      }
    }

    throw error;
  }

  throw new Error("Partij kon niet worden bijgewerkt: schema blijft kolommen weigeren.");
}

async function updateAanmelding(matchmakingId: string, row: Record<string, any>, input: {
  va?: unknown; naam?: unknown; gym?: unknown; gewicht?: unknown; discipline?: unknown; klasse?: unknown; geslacht?: unknown;
}) {
  const patch: Record<string, any> = {};
  setExisting(patch, row, ["va_nummer", "va", "fightpaspoort_nummer"], input.va);
  setExisting(patch, row, ["naam", "fighter_naam"], input.naam);
  setExisting(patch, row, ["sportschool", "gym"], input.gym);
  setExisting(patch, row, ["gewicht", "gewicht_kg"], input.gewicht);
  setExisting(patch, row, ["discipline", "sport"], input.discipline);
  setExisting(patch, row, ["klasse", "klasse_mm"], input.klasse);
  setExisting(patch, row, ["geslacht", "gender"], input.geslacht);
  if (Object.prototype.hasOwnProperty.call(row, "updated_at")) patch.updated_at = new Date().toISOString();
  if (!Object.keys(patch).length) throw new Error(`Geen wijzigbare kolommen gevonden voor aanmelding ${row.id}.`);

  const { error } = await supabase.from("aanmeldingen").update(patch)
    .eq("matchmaking_id", matchmakingId).eq("id", row.id);
  if (error) throw error;
  await processMatchmakingFighters({ supabase, matchmakingId, aanmeldingId: String(row.id) });
  return String(row.id);
}

async function context(matchmakingId: string, runId: string, partijNr: number) {
  const { data, error } = await supabase.from("controle_bout_context").select("*")
    .eq("matchmaking_id", matchmakingId).eq("controle_run_id", runId).eq("partij_nr", partijNr).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body.matchmaking_id);
    const partijNr = Number(body.partij_nr);
    if (!matchmakingId) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    if (!Number.isFinite(partijNr) || partijNr <= 0) return NextResponse.json({ error: "partij_nr ontbreekt of ongeldig" }, { status: 400 });
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    const { data: bout, error: boutError } = await supabase.from("matchmaking_bouts_raw").select("*")
      .eq("matchmaking_id", matchmakingId).eq("partij_nr", partijNr).maybeSingle();
    if (boutError) throw boutError;
    if (!bout) return NextResponse.json({ error: "Partij niet gevonden" }, { status: 404 });

    const oldRoodVa = normalizedVa(bout.va_rood ?? bout.rood_va ?? bout.rood_va_mm);
    const oldBlauwVa = normalizedVa(bout.va_blauw ?? bout.blauw_va ?? bout.blauw_va_mm);
    const roodAanmeldingId = uuid(
      bout.rood_aanmelding_id ?? bout.rood_inschrijving_id ?? bout.red_aanmelding_id ?? bout.red_inschrijving_id,
    );
    const blauwAanmeldingId = uuid(
      bout.blauw_aanmelding_id ?? bout.blauw_inschrijving_id ?? bout.blue_aanmelding_id ?? bout.blue_inschrijving_id,
    );
    const changed: string[] = [];

    // Een gematchte vechter leeft vanaf dit moment ook in de partijtabel.
    // Werk die daarom altijd eerst bij. De aanmelding blijft daarnaast gesynchroniseerd
    // wanneer die nog gevonden kan worden.
    await updateBoutRaw(bout, body);

    const common = {
      discipline: hasOwn(body, "new_discipline") ? body.new_discipline : undefined,
      klasse: hasOwn(body, "new_klasse_mm") ? body.new_klasse_mm : hasOwn(body, "new_klasse") ? body.new_klasse : undefined,
      geslacht: hasOwn(body, "new_geslacht") ? body.new_geslacht : undefined,
    };

    if (["new_va_rood", "new_rood_naam", "new_rood_gym", "new_rood_gewicht"].some((k) => hasOwn(body, k)) || Object.values(common).some((v) => v !== undefined)) {
      const row = await findAanmelding(matchmakingId, roodAanmeldingId, oldRoodVa);
      if (row) changed.push(await updateAanmelding(matchmakingId, row, {
        va: hasOwn(body, "new_va_rood") ? normalizedVa(body.new_va_rood) : undefined,
        naam: hasOwn(body, "new_rood_naam") ? body.new_rood_naam : undefined,
        gym: hasOwn(body, "new_rood_gym") ? body.new_rood_gym : undefined,
        gewicht: hasOwn(body, "new_rood_gewicht") ? body.new_rood_gewicht : undefined,
        ...common,
      }));
    }

    if (["new_va_blauw", "new_blauw_naam", "new_blauw_gym", "new_blauw_gewicht"].some((k) => hasOwn(body, k)) || Object.values(common).some((v) => v !== undefined)) {
      const row = await findAanmelding(matchmakingId, blauwAanmeldingId, oldBlauwVa);
      if (row) changed.push(await updateAanmelding(matchmakingId, row, {
        va: hasOwn(body, "new_va_blauw") ? normalizedVa(body.new_va_blauw) : undefined,
        naam: hasOwn(body, "new_blauw_naam") ? body.new_blauw_naam : undefined,
        gym: hasOwn(body, "new_blauw_gym") ? body.new_blauw_gym : undefined,
        gewicht: hasOwn(body, "new_blauw_gewicht") ? body.new_blauw_gewicht : undefined,
        ...common,
      }));
    }

    const runId = s(body.controle_run_id) || (await latestRunId(matchmakingId));
    if (!runId) return NextResponse.json({ ok: true, message: "Aanmelding opgeslagen; geen controle-run gevonden.", changed_aanmeldingen: changed });

    await buildControleBoutContext(matchmakingId, runId, { partij_nr: partijNr });
    let ctx = await context(matchmakingId, runId, partijNr);
    const boutId = uuid(ctx?.bout_id) ?? uuid(bout.bout_uid) ?? uuid(bout.bout_id);
    await enrichControleBoutContext(matchmakingId, runId, { partij_nr: partijNr, bout_id: boutId });
    ctx = await context(matchmakingId, runId, partijNr);
    await rulesEngine({ matchmaking_id: matchmakingId, controle_run_id: runId, ctxRows: ctx ? [ctx] : [], scoped_partij_nr: partijNr, scoped_bout_id: uuid(ctx?.bout_id) ?? boutId });

    return NextResponse.json({
      ok: true,
      message: "Aanmelding(en) aangepast en partij opnieuw opgebouwd zonder scrape.",
      matchmaking_id: matchmakingId,
      partij_nr: partijNr,
      controle_run_id: runId,
      changed_aanmeldingen: Array.from(new Set(changed)),
    });
  } catch (error: any) {
    console.error("[POST /api/matchmaker/correct-bout]", error);
    return NextResponse.json({ ok: false, error: error?.message ?? "Correctie mislukt" }, { status: 500 });
  }
}
