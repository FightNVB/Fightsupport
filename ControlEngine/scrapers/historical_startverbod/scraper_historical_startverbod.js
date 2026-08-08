import { loginFightPassport } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import {
  hardCloseFightPassportPage,
  openFighterPageVerified,
} from "../utils/fightPassportFighterNavigation.js";
import { scrapeHistoricalStartverbodPage } from "./scrapeHistoricalStartverbodPage.js";

const startVa = Number(process.argv[2] || process.env.HISTORY_START_VA || 775);
const endVa = Number(process.argv[3] || process.env.HISTORY_END_VA || startVa);
const workers = Math.max(1, Math.min(20, Number(process.env.HISTORY_WORKERS || 4)));
const resumeRunId = String(process.env.HISTORY_RUN_ID || "").trim();
let stopRequested = false;
process.on("SIGTERM", () => { stopRequested = true; });
process.on("SIGINT", () => { stopRequested = true; });

async function createOrResumeRun() {
  if (resumeRunId) {
    const { data, error } = await supabase.from("fighter_startverbod_history_runs")
      .update({ status: "running", finished_at: null, pid: process.pid, updated_at: new Date().toISOString() })
      .eq("id", resumeRunId).select("*").single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("fighter_startverbod_history_runs").insert({
    status: "running", start_va: startVa, end_va: endVa, workers,
    pid: process.pid, started_at: new Date().toISOString(),
  }).select("*").single();
  if (error) throw error;
  return data;
}

async function saveRecords(records) {
  if (!records.length) return { inserted: 0, updated: 0 };
  const fingerprints = records.map((record) => record.fingerprint);
  const { data: existing, error: readError } = await supabase
    .from("fighter_startverbod_history").select("fingerprint").in("fingerprint", fingerprints);
  if (readError) throw readError;
  const existingKeys = new Set((existing ?? []).map((row) => row.fingerprint));
  const now = new Date().toISOString();
  const payload = records.map((record) => ({ ...record, scraped_at: now, updated_at: now }));
  const { error } = await supabase.from("fighter_startverbod_history").upsert(payload, {
    onConflict: "fingerprint", ignoreDuplicates: false,
  });
  if (error) throw error;
  return {
    inserted: records.filter((record) => !existingKeys.has(record.fingerprint)).length,
    updated: records.filter((record) => existingKeys.has(record.fingerprint)).length,
  };
}

async function saveItem(runId, va, patch) {
  const { error } = await supabase.from("fighter_startverbod_history_items").upsert({
    run_id: runId, va_nummer: va, ...patch,
  }, { onConflict: "run_id,va_nummer" });
  if (error) throw error;
}

export async function scraperHistoricalStartverbod() {
  const run = await createOrResumeRun();
  let browser;
  let masterPage;
  const stats = {
    processed: Number(run.processed_count || 0), found: Number(run.found_count || 0),
    inserted: Number(run.inserted_count || 0), updated: Number(run.updated_count || 0),
    skipped: Number(run.skipped_count || 0), errors: Number(run.error_count || 0),
    lastVa: Number(run.last_processed_va || startVa - 1), lastError: run.last_error || null,
  };

  try {
    ({ browser, page: masterPage } = await loginFightPassport());
    let cookies = await masterPage.cookies().catch(() => []);
    const allVas = Array.from({ length: endVa - startVa + 1 }, (_, index) => startVa + index)
      .filter((va) => va > stats.lastVa);
    let cursor = 0;

    async function persistRun(status = "running", finishedAt = null) {
      await supabase.from("fighter_startverbod_history_runs").update({
        status, processed_count: stats.processed, found_count: stats.found,
        inserted_count: stats.inserted, updated_count: stats.updated,
        skipped_count: stats.skipped, error_count: stats.errors,
        last_processed_va: stats.lastVa, last_error: stats.lastError,
        finished_at: finishedAt, pid: status === "running" ? process.pid : null,
        updated_at: new Date().toISOString(),
      }).eq("id", run.id);
    }

    async function worker(workerIndex) {
      while (!stopRequested) {
        const va = allVas[cursor++];
        if (va == null) break;
        const startedAt = new Date().toISOString();
        await saveItem(run.id, va, { status: "running", started_at: startedAt, finished_at: null });
        let page = null;
        try {
          page = await openFighterPageVerified(browser, null, cookies, va, {
            maxAttempts: Number(process.env.TAB_ATTEMPTS || 5),
            softWaitMs: Number(process.env.SOFT_WAIT_MS || 2500),
            betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS || 1200),
            workerLabel: `[historie ${workerIndex + 1}/${workers}]`,
          });
          if (!page) throw Object.assign(new Error("Vechterpagina niet geladen binnen de timeout."), { step: "navigation", type: "timeout" });
          const result = await scrapeHistoricalStartverbodPage(page, va);
          if (result.status === "skipped") {
            stats.skipped++;
            await saveItem(run.id, va, {
              status: "skipped", naam_fp: result.naam_fp ?? null, found_count: 0,
              error_type: result.reason, error_step: "startverboden_tile", finished_at: new Date().toISOString(),
            });
          } else {
            const saved = await saveRecords(result.records);
            stats.found += result.records.length;
            stats.inserted += saved.inserted;
            stats.updated += saved.updated;
            await saveItem(run.id, va, {
              status: "completed", naam_fp: result.naam_fp, found_count: result.records.length,
              error_type: null, error_step: null, error_message: null, finished_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          stats.errors++;
          stats.lastError = `VA ${va}: ${error?.message ?? String(error)}`;
          await saveItem(run.id, va, {
            status: "failed", error_type: error?.type || "scrape_error",
            error_step: error?.step || "historical_startverbod", error_message: error?.message ?? String(error),
            retry_status: "beschikbaar", finished_at: new Date().toISOString(),
          });
        } finally {
          await hardCloseFightPassportPage(page).catch(() => {});
          stats.processed++;
          stats.lastVa = Math.max(stats.lastVa, va);
          await persistRun();
        }
      }
    }

    await Promise.all(Array.from({ length: workers }, (_, index) => worker(index)));
    const { data: latestRun } = await supabase.from("fighter_startverbod_history_runs")
      .select("status").eq("id", run.id).single();
    const finalStatus = latestRun?.status === "failed"
      ? "failed"
      : stopRequested ? "paused" : stats.errors ? "completed_with_errors" : "completed";
    await persistRun(finalStatus, stopRequested ? null : new Date().toISOString());
    return { ok: true, run_id: run.id, status: finalStatus, ...stats };
  } catch (error) {
    await supabase.from("fighter_startverbod_history_runs").update({
      status: "failed", last_error: error?.message ?? String(error), pid: null,
      finished_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", run.id).catch(() => {});
    throw error;
  } finally {
    await browser?.close().catch(() => {});
  }
}

if (["run", "run-all"].includes(process.argv[4] || process.argv[2])) {
  scraperHistoricalStartverbod().then((result) => {
    console.log(JSON.stringify(result));
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
