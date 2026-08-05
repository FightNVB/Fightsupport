import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAccess, secureError } from "@/lib/api/secureRoute";
import { spawn } from "child_process";
import path from "path";
import { runYocFighterContextPipeline } from "@/lib/yoc/runYocFighterContextPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ yocId: string }> };
type AnyRow = Record<string, any>;

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

function normalizeVa(v: unknown) {
  const digits = String(v ?? "").trim().replace(/\D/g, "").replace(/^0+/, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function resolveYocScraperPath() {
  return path.join(process.cwd(), "ControlEngine", "scrapers", "yoc", "scraper_yoc_bundle.js");
}

function runNodeScript(scriptPath: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        WORKERS: "1",
        YOC_WORKERS: "1",
        FULLFIGHTER_TIMEOUT_MS: process.env.FULLFIGHTER_TIMEOUT_MS ?? "35000",
        TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "6",
        SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "900",
        BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "450",
        STAGGER_MS: "0",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      console.log(`[yoc_rescrape] ${s.trimEnd()}`);
    });

    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      console.error(`[yoc_rescrape] ${s.trimEnd()}`);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`YOC herscrape failed with exit code ${code}\n${stderr || stdout}`));
    });
  });
}

async function updateRun(supabase: ReturnType<typeof adminClient>, runId: string, patch: Record<string, any>) {
  const { error } = await supabase.from("yoc_runs").update(patch).eq("id", runId);
  if (error) console.error("[yoc_rescrape] yoc_runs update fout:", error.message);
}

async function fetchEventDate(supabase: ReturnType<typeof adminClient>, yocId: string) {
  const { data, error } = await supabase.from("yoc_events").select("*").eq("id", yocId).maybeSingle();
  if (error) throw error;
  return (data?.event_datum ?? data?.evenement_datum ?? data?.datum ?? data?.event_date ?? null) as string | null;
}

async function cleanupOneFighter(params: {
  supabase: ReturnType<typeof adminClient>;
  yocId: string;
  yocFighterId?: string | null;
  vaValues: string[];
}) {
  const { supabase, yocId, yocFighterId, vaValues } = params;
  const vas = Array.from(new Set(vaValues.map(normalizeVa).filter(Boolean))) as string[];

  let contexts: AnyRow[] = [];
  if (yocFighterId) {
    const { data, error } = await supabase
      .from("yoc_fighter_context")
      .select("id,fighter_raw_id,va_nummer")
      .eq("yoc_event_id", yocId)
      .eq("yoc_fighter_id", yocFighterId);
    if (error) throw error;
    contexts = contexts.concat(data || []);
  }

  if (vas.length) {
    const { data, error } = await supabase
      .from("yoc_fighter_context")
      .select("id,fighter_raw_id,va_nummer")
      .eq("yoc_event_id", yocId)
      .in("va_nummer", vas);
    if (error) throw error;
    contexts = contexts.concat(data || []);
  }

  const rawIds = Array.from(new Set(contexts.map((r) => r.fighter_raw_id).filter(Boolean)));
  const contextIds = Array.from(new Set(contexts.map((r) => r.id).filter(Boolean)));

  if (rawIds.length) await supabase.from("yoc_resultaten").delete().eq("yoc_event_id", yocId).in("fighter_raw_id", rawIds);
  if (contextIds.length) await supabase.from("yoc_fighter_context").delete().eq("yoc_event_id", yocId).in("id", contextIds);
  if (vas.length) await supabase.from("yoc_fighters_raw").delete().eq("yoc_event_id", yocId).in("va_nummer", vas);
}

async function ensurePlaceholderRaw(params: {
  supabase: ReturnType<typeof adminClient>;
  yocId: string;
  yocRunId: string;
  fighter: AnyRow;
  va: string;
}) {
  const { supabase, yocId, yocRunId, fighter, va } = params;
  const { data: existing, error: existingErr } = await supabase
    .from("yoc_fighters_raw")
    .select("*")
    .eq("yoc_event_id", yocId)
    .eq("va_nummer", va)
    .order("created_at", { ascending: false })
    .limit(1);
  if (existingErr) throw existingErr;
  if (existing?.length) return existing[0];

  // Fallback zodat yoc_fighter_context nooit meer crasht op fighter_raw_id NOT NULL.
  // De regels tonen daarna gewoon dat FightPassport-data/licentie/keurmerk niet opgehaald is.
  const insertRow: AnyRow = {
    yoc_event_id: yocId,
    yoc_run_id: yocRunId,
    va_nummer: va,
    fighter_id: va,
    naam: fighter?.naam_mm ?? fighter?.naam ?? null,
    sportschool: fighter?.sportschool_mm ?? fighter?.sportschool ?? null,
    geslacht: fighter?.geslacht_mm ?? fighter?.geslacht ?? null,
    licentie: "nee",
    heeft_startverbod: "onbekend",
    heeft_keurmerk: "nee",
    scrape_status: "geen_fp_data",
    scrape_error: "Geen FightPassport raw-data gevonden na herscrape.",
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("yoc_fighters_raw").insert(insertRow).select("*").single();
  if (error) throw error;
  return data;
}

async function runOneFighterInBackground(params: {
  yocId: string;
  yocRunId: string;
  yocFighterId?: string | null;
  va: string;
}) {
  const { yocId, yocRunId, yocFighterId = null, va } = params;
  const supabase = adminClient();

  try {
    await updateRun(supabase, yocRunId, { status: "rescraping" });
    await supabase.from("yoc_events").update({ status: "scraping", updated_at: new Date().toISOString() }).eq("id", yocId);

    let fighterQuery = supabase.from("yoc_fighters").select("*").eq("yoc_event_id", yocId);
    if (yocFighterId) fighterQuery = fighterQuery.eq("id", yocFighterId);
    else fighterQuery = fighterQuery.or(`va_nummer_mm.eq.${va},va_nummer.eq.${va},va.eq.${va},fighter_id.eq.${va}`);

    const { data: fighter, error: fighterErr } = await fighterQuery.maybeSingle();
    if (fighterErr) throw fighterErr;
    if (!fighter) throw new Error("YOC vechter niet gevonden voor herscrape.");

    const oldVa = normalizeVa(fighter?.va_nummer_mm_prev ?? fighter?.old_va_nummer ?? fighter?.oude_va_nummer);
    await cleanupOneFighter({ supabase, yocId, yocFighterId: fighter.id, vaValues: [oldVa || "", va] });

    await runNodeScript(resolveYocScraperPath(), [yocId, yocRunId, va]);

    await updateRun(supabase, yocRunId, { status: "building" });

    const eventDate = await fetchEventDate(supabase, yocId);
    const placeholderOrRaw = await ensurePlaceholderRaw({ supabase, yocId, yocRunId, fighter, va });

    const { data: rawRows, error: rawErr } = await supabase
      .from("yoc_fighters_raw")
      .select("*")
      .eq("yoc_event_id", yocId)
      .eq("va_nummer", va)
      .order("created_at", { ascending: false });
    if (rawErr) throw rawErr;

    const pipeline = await runYocFighterContextPipeline({
      supabase,
      yocEventId: yocId,
      yocRunId,
      yocFighters: [fighter],
      rawRows: rawRows?.length ? rawRows : [placeholderOrRaw],
      eventDate,
      writeRules: true,
    });

    if (pipeline.error) throw pipeline.error;

    await updateRun(supabase, yocRunId, { status: "klaar", afgerond_op: new Date().toISOString(), foutmelding: null });
    await supabase.from("yoc_events").update({ status: "scraped", updated_at: new Date().toISOString() }).eq("id", yocId);
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[yoc_rescrape] ❌ failed:", msg);
    await updateRun(supabase, yocRunId, { status: "failed", afgerond_op: new Date().toISOString(), foutmelding: msg });
    await supabase.from("yoc_events").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", yocId);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAdminAccess(req); } catch (error) { return secureError(error); }
  const { yocId } = await params;
  const supabase = adminClient();

  if (!yocId || yocId === "undefined") return NextResponse.json({ ok: false, error: "Ongeldig YOC-id." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const yocFighterId = body?.yoc_fighter_id ? String(body.yoc_fighter_id) : null;
  const va = normalizeVa(body?.va_nummer ?? body?.va ?? body?.fighter_id);

  if (!yocFighterId && !va) return NextResponse.json({ ok: false, error: "Geef yoc_fighter_id of VA nummer mee." }, { status: 400 });

  let finalVa = va;
  if (yocFighterId) {
    const { data: fighter, error } = await supabase.from("yoc_fighters").select("*").eq("yoc_event_id", yocId).eq("id", yocFighterId).maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: "YOC-vechter kon niet worden geladen." }, { status: 500 });
    finalVa = normalizeVa(body?.va_nummer ?? fighter?.va_nummer_mm ?? fighter?.va_nummer ?? fighter?.va ?? fighter?.fighter_id);
  }

  if (!finalVa) return NextResponse.json({ ok: false, error: "Geen geldig VA nummer gevonden voor deze vechter." }, { status: 400 });

  const { data: run, error: runErr } = await supabase
    .from("yoc_runs")
    .insert({ yoc_event_id: yocId, run_type: "rescrape", status: "queued" })
    .select("id")
    .single();

  if (runErr) return NextResponse.json({ ok: false, error: runErr.message }, { status: 500 });

  void runOneFighterInBackground({ yocId, yocRunId: run.id, yocFighterId, va: finalVa });

  return NextResponse.json({
    ok: true,
    started: true,
    yoc_event_id: yocId,
    yoc_run_id: run.id,
    va_nummer: finalVa,
    status_url: `/api/yoc/${yocId}/scrape/status?run_id=${run.id}`,
  }, { status: 202 });
}
