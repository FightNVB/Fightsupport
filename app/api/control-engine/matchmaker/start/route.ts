// app/api/control-engine/matchmaker/start/route.ts
// Matchmaker eindcontrole: lichte live FightPassport-check, 3 processen x 8 workers.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { buildControleBoutContext, buildToernooiContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const FINAL_RUN_TYPE = "matchmaker_eindcontrole";
const PROCESS_COUNT = 3;
const WORKERS_PER_PROCESS = 8;
const SCRAPER_FILE = "scraper_fp_matchmaker.js";

type ReviewRow = {
  partij_nr?: number | null;
  bout_id?: string | null;
  rule_code?: string | null;
  hoek?: string | null;
  toernooi_code?: string | null;
  fighter_id?: string | null;
  toernooi_va_nummer?: string | null;
  review_status?: string | null;
  review_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  aantekeningen?: string | null;
};

function norm(value: unknown) { return String(value ?? "").trim(); }
function toVaStrict(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}
function pickVA(row: any, side: "rood" | "blauw") {
  const candidates = side === "rood"
    ? [row?.rood_va, row?.va_rood, row?.rood_va_mm, row?.rood_va_nummer, row?.rood_fighter_id]
    : [row?.blauw_va, row?.va_blauw, row?.blauw_va_mm, row?.blauw_va_nummer, row?.blauw_fighter_id];
  for (const value of candidates) { const va = toVaStrict(value); if (va) return va; }
  return null;
}
function isRoleAllowed(role: string | null | undefined) {
  return ["matchmaker", "admin", "superadmin"].includes(String(role ?? "").toLowerCase());
}
function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}
function resolveScriptPath(file: string) {
  const root = process.cwd();
  const candidates = [
    path.join(root, "ControlEngine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "ControlEngine", "ControlEngine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "control-engine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "control-engine", "control-engine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "scrapers", "fp_bundle_matchmaker", file),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Matchmaker scraper niet gevonden: ${file}\n- ${candidates.join("\n- ")}`);
  return found;
}
function splitIntoLanes<T>(items: T[], laneCount: number): T[][] {
  const lanes = Array.from({ length: Math.min(laneCount, Math.max(1, items.length)) }, () => [] as T[]);
  items.forEach((item, index) => lanes[index % lanes.length].push(item));
  return lanes.filter((lane) => lane.length > 0);
}
function runNodeScript(scriptPath: string, args: string[], envExtra: Record<string, string>, logPrefix: string) {
  return new Promise<{ stdout: string; stderr: string; ms: number }>((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"], shell: false, cwd: path.dirname(scriptPath), windowsHide: true,
      env: { ...process.env, ...envExtra },
    });
    let stdout = ""; let stderr = "";
    child.stdout?.on("data", (data) => { const text = data.toString(); stdout += text; process.stdout.write(`[${logPrefix}] ${text}`); });
    child.stderr?.on("data", (data) => { const text = data.toString(); stderr += text; process.stderr.write(`[${logPrefix}] ${text}`); });
    child.on("error", reject);
    child.on("close", (code) => {
      const ms = Date.now() - startedAt;
      if (code === 0) return resolve({ stdout, stderr, ms });
      reject(new Error(`Script failed: ${scriptPath} (exit code ${code})\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`));
    });
  });
}
async function updateRun(controleRunId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("controle_runs").update(patch).eq("id", controleRunId);
  if (error) console.warn("[control-engine/matchmaker/start] run update mislukt", error);
}
async function abortOlderFinalRuns(matchmakingId: string) {
  await supabase.from("controle_runs").update({
    status: "aborted", afgerond_op: new Date().toISOString(), is_latest: false,
    foutmelding: "Afgebroken omdat een nieuwe eindcontrole is gestart.",
  }).eq("matchmaking_id", matchmakingId).eq("run_type", FINAL_RUN_TYPE).eq("status", "running");
}
async function createFinalRun(args: { matchmakingId: string; userId: string | null; role: string | null; total: number }) {
  const { data, error } = await supabase.from("controle_runs").insert({
    matchmaking_id: args.matchmakingId, gestart_door_user_id: args.userId, gestart_door_rol: args.role,
    status: "running", gestart_op: new Date().toISOString(), run_type: FINAL_RUN_TYPE, is_latest: true,
    totaal_aantal: args.total, verwerkt_aantal: 0, progress: 2, current_step: "Matchmaker eindcontrole wordt voorbereid...",
  }).select("id").single();
  if (error) throw error;
  if (!data?.id) throw new Error("Geen controle_run_id ontvangen.");
  const { error: latestError } = await supabase.from("controle_runs").update({ is_latest: false })
    .eq("matchmaking_id", args.matchmakingId).neq("id", data.id);
  if (latestError) console.warn("[control-engine/matchmaker/start] is_latest update warning", latestError);
  return String(data.id);
}
async function collectVaNumbers(matchmakingId: string) {
  const [{ data: bouts, error: boutsError }, { data: tournamentRows, error: tournamentError }] = await Promise.all([
    supabase.from("matchmaking_bouts_raw").select("*").eq("matchmaking_id", matchmakingId).or("verwijderd.is.null,verwijderd.eq.false"),
    supabase.from("controle_toernooi_context").select("fighter_id,va_nummer").eq("matchmaking_id", matchmakingId),
  ]);
  if (boutsError) throw boutsError;
  if (tournamentError && String((tournamentError as any)?.code ?? "") !== "42P01") throw tournamentError;
  const vaSet = new Set<string>();
  for (const bout of bouts ?? []) { const rood = pickVA(bout, "rood"); const blauw = pickVA(bout, "blauw"); if (rood) vaSet.add(rood); if (blauw) vaSet.add(blauw); }
  for (const row of tournamentRows ?? []) { const va = toVaStrict((row as any)?.va_nummer) ?? toVaStrict((row as any)?.fighter_id); if (va) vaSet.add(va); }
  return { vaNumbers: [...vaSet], bouts: bouts ?? [] };
}
async function cleanupPreviousContext(matchmakingId: string) {
  for (const table of ["controle_bout_context", "controle_toernooi_context", "controle_uitslagen"] as const) {
    const { error } = await supabase.from(table).delete().eq("matchmaking_id", matchmakingId);
    if (error && String((error as any)?.code ?? "") !== "42P01") throw error;
  }
  const { error: liveError } = await supabase.from("controle_fighter_actueel").delete().eq("matchmaking_id", matchmakingId);
  if (liveError && String((liveError as any)?.code ?? "") !== "42P01") throw liveError;
}
function normalizeReviewStatus(value: unknown): "approved" | "rejected" | null {
  const status = norm(value).toLowerCase();
  if (["approved", "approve", "goedgekeurd", "ok"].includes(status)) return "approved";
  if (["rejected", "reject", "afgekeurd", "afkeur"].includes(status)) return "rejected";
  return null;
}
function reviewKey(row: ReviewRow, includeBoutId: boolean) {
  return [String(row?.partij_nr ?? ""), includeBoutId ? String(row?.bout_id ?? "") : "", norm(row?.rule_code).toLowerCase(),
    norm(row?.hoek).toLowerCase(), norm(row?.toernooi_code).toUpperCase(), String(row?.fighter_id ?? "").replace(/\D/g, ""),
    String(row?.toernooi_va_nummer ?? "").replace(/\D/g, "")].join("|");
}
async function loadPreviousReviewedResults(matchmakingId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase.from("controle_resultaten")
    .select("partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,created_at")
    .eq("matchmaking_id", matchmakingId).not("review_status", "is", null)
    .order("reviewed_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((row: any) => !!normalizeReviewStatus(row?.review_status));
}
async function carryForwardReviews(args: { matchmakingId: string; controleRunId: string; previous: ReviewRow[] }) {
  if (!args.previous.length) return 0;
  const strictMap = new Map<string, ReviewRow>(); const fallbackMap = new Map<string, ReviewRow>();
  for (const row of args.previous) { const strict = reviewKey(row, true); const fallback = reviewKey(row, false); if (!strictMap.has(strict)) strictMap.set(strict, row); if (!fallbackMap.has(fallback)) fallbackMap.set(fallback, row); }
  const { data: current, error } = await supabase.from("controle_resultaten")
    .select("id,partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer")
    .eq("matchmaking_id", args.matchmakingId).eq("controle_run_id", args.controleRunId);
  if (error) throw error;
  let carried = 0;
  for (const row of current ?? []) {
    const previous = strictMap.get(reviewKey(row, true)) ?? fallbackMap.get(reviewKey(row, false));
    if (!previous) continue;
    const normalized = normalizeReviewStatus(previous.review_status); if (!normalized) continue;
    const { error: updateError } = await supabase.from("controle_resultaten").update({
      review_status: previous.review_status ?? null, review_note: previous.review_note ?? null,
      reviewed_by: previous.reviewed_by ?? null, reviewed_at: previous.reviewed_at ?? null,
      aantekeningen: previous.aantekeningen ?? null, resultaat: normalized === "approved" ? "OK" : "AFKEUR",
      actie_status: normalized === "approved" ? "goedgekeurd" : "afgekeurd",
    }).eq("id", (row as any).id);
    if (updateError) throw updateError; carried += 1;
  }
  return carried;
}
async function deleteOldResultRows(matchmakingId: string, controleRunId: string) {
  const { error } = await supabase.from("controle_resultaten").delete().eq("matchmaking_id", matchmakingId).neq("controle_run_id", controleRunId);
  if (error) throw error;
}
async function runLightScrape(args: { matchmakingId: string; controleRunId: string; vaNumbers: string[]; scrapeTimeoutMs: number }) {
  const scriptPath = resolveScriptPath(SCRAPER_FILE);
  const lanes = splitIntoLanes(args.vaNumbers, PROCESS_COUNT);
  console.log(`[matchmaker-eindcontrole] 🚀 3x8 modus: ${args.vaNumbers.length} VA's verdeeld over ${lanes.length} parallelle processen`);
  const startedAt = Date.now();
  const results = await Promise.all(lanes.map((lane, index) => runNodeScript(
    scriptPath,
    [args.matchmakingId, args.controleRunId, ...lane],
    {
      FP_OFFICIALS_WORKERS: String(WORKERS_PER_PROCESS), WORKERS: String(WORKERS_PER_PROCESS),
      FP_OFFICIALS_TIMEOUT_MS: String(args.scrapeTimeoutMs), FP_OFFICIALS_ALLOW_INCOMPLETE_EXIT: "0",
      HEADLESS: process.env.HEADLESS ?? "false", PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
    },
    `fp_matchmaker_light_${index + 1}`,
  )));
  return { ms: Date.now() - startedAt, processes: results.length };
}
async function finalizeInBackground(args: { matchmakingId: string; controleRunId: string; vaNumbers: string[]; boutCount: number; scrapeTimeoutMs: number; previousReviews: ReviewRow[] }) {
  try {
    await updateRun(args.controleRunId, { progress: 8, current_step: `Licentie, startverbod en keurmerk controleren (${args.vaNumbers.length} vechters, 3x8)...` });
    const scrape = await runLightScrape(args);
    await updateRun(args.controleRunId, { progress: 55, verwerkt_aantal: args.vaNumbers.length, current_step: "Control partij-context opnieuw opbouwen..." });
    await buildControleBoutContext(args.matchmakingId, args.controleRunId);
    await updateRun(args.controleRunId, { progress: 65, current_step: "Control toernooi-context opnieuw opbouwen..." });
    const toernooiRows = await buildToernooiContext(args.matchmakingId, args.controleRunId);
    await updateRun(args.controleRunId, { progress: 75, current_step: "Control context verrijken met actuele FightPassport-data..." });
    await enrichControleBoutContext(args.matchmakingId, args.controleRunId);
    const { data: ctxRows, error: ctxError } = await supabase.from("controle_bout_context").select("*")
      .eq("matchmaking_id", args.matchmakingId).eq("controle_run_id", args.controleRunId).order("partij_nr", { ascending: true });
    if (ctxError) throw ctxError;
    if (args.boutCount > 0 && !(ctxRows ?? []).length) throw new Error("Na control build/enrich is geen controle_bout_context gevonden.");
    await updateRun(args.controleRunId, { progress: 88, current_step: "Control RulesEngine draait..." });
    const hits = await rulesEngine({ matchmaking_id: args.matchmakingId, controle_run_id: args.controleRunId, ctxRows: (ctxRows ?? []) as any[] });
    const carried = await carryForwardReviews({ matchmakingId: args.matchmakingId, controleRunId: args.controleRunId, previous: args.previousReviews });
    await deleteOldResultRows(args.matchmakingId, args.controleRunId);
    await updateRun(args.controleRunId, { status: "klaar", afgerond_op: new Date().toISOString(), is_latest: true,
      totaal_aantal: args.vaNumbers.length, verwerkt_aantal: args.vaNumbers.length, progress: 100,
      current_step: "Matchmaker eindcontrole klaar. Rapport is bijgewerkt.", foutmelding: null });
    console.log("[matchmaker-eindcontrole] klaar", { matchmakingId: args.matchmakingId, controleRunId: args.controleRunId,
      vaCount: args.vaNumbers.length, scrapeMs: scrape.ms, processes: scrape.processes, ctxRows: (ctxRows ?? []).length,
      toernooiRows: Array.isArray(toernooiRows) ? toernooiRows.length : 0, hits: Array.isArray(hits) ? hits.length : 0, carriedReviews: carried });
  } catch (error: any) {
    console.error("[matchmaker-eindcontrole] mislukt", error);
    await updateRun(args.controleRunId, { status: "failed", afgerond_op: new Date().toISOString(), progress: 100,
      current_step: "Eindcontrole mislukt.", foutmelding: error?.message ?? String(error) });
  }
}
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})); const matchmakingId = norm(body?.matchmaking_id);
    if (!matchmakingId) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    const { userId, role } = await requireUserWithRole(req);
    if (!isRoleAllowed(role)) return NextResponse.json({ error: "Geen toegang tot matchmaker eindcontrole" }, { status: 403 });
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });
    await abortOlderFinalRuns(matchmakingId);
    const previousReviews = await loadPreviousReviewedResults(matchmakingId);
    const { vaNumbers, bouts } = await collectVaNumbers(matchmakingId);
    if (!vaNumbers.length) return NextResponse.json({ error: "Geen VA-nummers gevonden in deze matchmaking/toernooien." }, { status: 400 });
    const controleRunId = await createFinalRun({ matchmakingId, userId: userId ?? null, role: role ?? null, total: vaNumbers.length });
    await cleanupPreviousContext(matchmakingId);
    const scrapeTimeoutMs = clampInt(body?.scrape_timeout_ms ?? 120000, 120000, 30000, 300000);
    void finalizeInBackground({ matchmakingId, controleRunId, vaNumbers, boutCount: bouts.length, scrapeTimeoutMs, previousReviews });
    return NextResponse.json({ ok: true, started: true, matchmaking_id: matchmakingId, controle_run_id: controleRunId,
      va_count: vaNumbers.length, status: "running", scraper: "matchmaker_light_3x8", pipeline: "control", scope: "eindcontrole_only" }, { status: 202 });
  } catch (error: any) {
    console.error("[control-engine/matchmaker/start] fout", error);
    return NextResponse.json({ error: error?.message ?? "Laatste eindcontrole starten mislukt." }, { status: 500 });
  }
}
export async function GET(req: Request) {
  try {
    const url = new URL(req.url); const matchmakingId = norm(url.searchParams.get("matchmaking_id")); const controleRunId = norm(url.searchParams.get("controle_run_id"));
    if (!matchmakingId && !controleRunId) return NextResponse.json({ error: "matchmaking_id of controle_run_id ontbreekt" }, { status: 400 });
    const { userId, role } = await requireUserWithRole(req);
    if (!isRoleAllowed(role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    if (matchmakingId) await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });
    let query = supabase.from("controle_runs").select("id,matchmaking_id,status,gestart_op,afgerond_op,run_type,progress,current_step,totaal_aantal,verwerkt_aantal,foutmelding").eq("run_type", FINAL_RUN_TYPE);
    if (controleRunId) query = query.eq("id", controleRunId); if (matchmakingId) query = query.eq("matchmaking_id", matchmakingId);
    const { data, error } = await query.order("gestart_op", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (error) throw error; return NextResponse.json({ ok: true, run: data ?? null });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Eindcontrole-status ophalen mislukt." }, { status: 500 });
  }
}
