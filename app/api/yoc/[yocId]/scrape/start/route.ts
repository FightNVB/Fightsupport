import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import path from "path";
import { runYocFighterContextPipeline } from "@/lib/yoc/runYocFighterContextPipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ yocId: string }> };
type AnyRow = Record<string, any>;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function normalizeVa(v: unknown) {
  const digits = String(v ?? "").trim().replace(/\D/g, "").replace(/^0+/, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function resolveYocScraperPath() {
  return path.join(
    process.cwd(),
    "ControlEngine",
    "scrapers",
    "yoc",
    "scraper_yoc_bundle.js"
  );
}

function runNodeScript(scriptPath: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        WORKERS: process.env.YOC_WORKERS ?? process.env.WORKERS ?? "5",
        FULLFIGHTER_TIMEOUT_MS: process.env.FULLFIGHTER_TIMEOUT_MS ?? "35000",
        TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "6",
        SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "900",
        BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "450",
        STAGGER_MS: process.env.STAGGER_MS ?? "350",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      console.log(`[yoc_scraper] ${s.trimEnd()}`);
    });

    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      console.error(`[yoc_scraper] ${s.trimEnd()}`);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`YOC scraper failed with exit code ${code}\n${stderr || stdout}`));
    });
  });
}

async function updateRun(
  supabase: ReturnType<typeof adminClient>,
  runId: string,
  patch: Record<string, any>
) {
  const { error } = await supabase.from("yoc_runs").update(patch).eq("id", runId);
  if (error) console.error("[yoc_autocheck] yoc_runs update fout:", error.message);
}

async function fetchRows(
  supabase: ReturnType<typeof adminClient>,
  table: string,
  yocId: string,
  orderColumn?: string
) {
  let q = supabase.from(table).select("*").eq("yoc_event_id", yocId);
  if (orderColumn) q = q.order(orderColumn, { ascending: true });

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AnyRow[];
}

async function fetchEventDate(supabase: ReturnType<typeof adminClient>, yocId: string) {
  const { data, error } = await supabase
    .from("yoc_events")
    .select("*")
    .eq("id", yocId)
    .maybeSingle();

  if (error) throw error;
  return (
    data?.event_datum ??
    data?.evenement_datum ??
    data?.datum ??
    data?.event_date ??
    null
  ) as string | null;
}

async function runYocAutocheckInBackground(yocId: string, yocRunId: string) {
  const supabase = adminClient();

  try {
    // Oude snapshot opruimen vóór de scraper start.
    // yoc_fighters blijft staan, want dat is de originele upload/input.
    await supabase.from("yoc_resultaten").delete().eq("yoc_event_id", yocId);
    await supabase.from("yoc_fighter_context").delete().eq("yoc_event_id", yocId);
    await supabase.from("yoc_fighters_raw").delete().eq("yoc_event_id", yocId);

    await updateRun(supabase, yocRunId, { status: "scraping" });
    await supabase
      .from("yoc_events")
      .update({ status: "scraping", updated_at: new Date().toISOString() })
      .eq("id", yocId);

    const yocFighters = await fetchRows(supabase, "yoc_fighters", yocId, "row_index");
    const vaList = Array.from(
      new Set(
        yocFighters
          .map((f) => normalizeVa(f.va_nummer_mm ?? f.va_nummer ?? f.va ?? f.fighter_id))
          .filter(Boolean) as string[]
      )
    );

    if (!vaList.length) {
      throw new Error("Geen geldige VA nummers gevonden in YOC upload.");
    }

    // 1. SCRAPE: schrijft alleen FightPassport snapshot-data naar yoc_fighters_raw.
    const scriptPath = resolveYocScraperPath();
    await runNodeScript(scriptPath, [yocId, yocRunId, ...vaList]);

    // 2. BUILD + ENRICH + RULES + SAVE: centrale YOC-pipeline.
    await updateRun(supabase, yocRunId, { status: "building" });

    const eventDate = await fetchEventDate(supabase, yocId);
    const rawRows = await fetchRows(supabase, "yoc_fighters_raw", yocId);

    const pipeline = await runYocFighterContextPipeline({
      supabase,
      yocEventId: yocId,
      yocRunId,
      yocFighters,
      rawRows,
      eventDate,
      writeRules: true,
    });

    if (pipeline.error) throw pipeline.error;

    await updateRun(supabase, yocRunId, {
      status: "klaar",
      afgerond_op: new Date().toISOString(),
      foutmelding: null,
    });

    await supabase
      .from("yoc_events")
      .update({ status: "scraped", updated_at: new Date().toISOString() })
      .eq("id", yocId);

    console.log("[yoc_autocheck] ✅ klaar", {
      yoc_event_id: yocId,
      yoc_run_id: yocRunId,
      scraped_count: vaList.length,
      context_count: pipeline.count,
      rules_count: pipeline.rules_count,
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error("[yoc_autocheck] ❌ failed:", msg);

    await updateRun(supabase, yocRunId, {
      status: "failed",
      afgerond_op: new Date().toISOString(),
      foutmelding: msg,
    });

    await supabase
      .from("yoc_events")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", yocId);
  }
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { yocId } = await params;
  const supabase = adminClient();

  if (!yocId || yocId === "undefined") {
    return NextResponse.json({ ok: false, error: "Ongeldig YOC-id." }, { status: 400 });
  }

  const { data: run, error: runErr } = await supabase
    .from("yoc_runs")
    .insert({ yoc_event_id: yocId, run_type: "scrape", status: "queued" })
    .select("id")
    .single();

  if (runErr) {
    return NextResponse.json({ ok: false, error: runErr.message }, { status: 500 });
  }

  // Niet awaiten: voorkomt Failed to fetch door een browser-request van 4+ minuten.
  void runYocAutocheckInBackground(yocId, run.id);

  return NextResponse.json(
    {
      ok: true,
      started: true,
      yoc_event_id: yocId,
      yoc_run_id: run.id,
      status_url: `/api/yoc/${yocId}/scrape/status?run_id=${run.id}`,
    },
    { status: 202 }
  );
}
