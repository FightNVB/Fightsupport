import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import {
  hardCloseFightPassportPage,
  openFighterPageVerified,
} from "../utils/fightPassportFighterNavigation.js";
import { scrapeHistoricalStartverbodPage } from "./scrapeHistoricalStartverbodPage.js";

async function createWorkerContext(browser) {
  if (browser && typeof browser.createBrowserContext === "function") {
    return await browser.createBrowserContext();
  }
  if (browser && typeof browser.createIncognitoBrowserContext === "function") {
    return await browser.createIncognitoBrowserContext();
  }
  return null;
}

async function closeWorkerContext(ctx) {
  if (!ctx) return;
  try {
    const pages = await ctx.pages().catch(() => []);
    for (const workerPage of pages) {
      await hardCloseFightPassportPage(workerPage).catch(() => {});
    }
  } catch {}
  try {
    await ctx.close().catch(() => {});
  } catch {}
}


// Dossierhistorie-only: deze scraper mag nooit fightpassport_fighters,
// heeft_startverbod, actuele blokkadestatus of gala-controledata schrijven.

const startVa = Number(process.argv[2] || process.env.HISTORY_START_VA || 775);
const endVa = Number(process.argv[3] || process.env.HISTORY_END_VA || startVa);
const workers = Math.max(1, Math.min(10, Number(process.env.HISTORY_WORKERS || 2)));
const staggerMs = Math.max(
  0,
  Number(process.env.HISTORY_STAGGER_MS || process.env.STAGGER_MS || 350)
);
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
  console.log(`[historie] 🏁 start VA ${startVa} t/m ${endVa} met ${workers} worker(s), stagger=${staggerMs}ms`);
  let browser;
  let masterPage;
  const stats = {
    processed: Number(run.processed_count || 0), found: Number(run.found_count || 0),
    inserted: Number(run.inserted_count || 0), updated: Number(run.updated_count || 0),
    skipped: Number(run.skipped_count || 0), errors: Number(run.error_count || 0),
    lastVa: Number(run.last_processed_va || startVa - 1), lastError: run.last_error || null,
  };

  try {
    // HISTORIE ALTIJD met een schone FightPassport-sessie starten.
    // Alleen de permanente trusted-device cookie mag uit cookies.json mee; PHPSESSID niet.
    ({ browser, page: masterPage } = await loginFightPassport({
      freshSession: true,
      saveCookiesToDisk: false,
    }));
    let cookies = await masterPage.cookies().catch(() => []);
    console.log("[historie] ✅ Schone master-sessie gestart met trusted-device herkenning; alleen nieuwe sessiecookies worden intern gedeeld");

    let masterRefreshPromise = null;
    async function refreshMasterSessionLocked(reason = "") {
      if (masterRefreshPromise) {
        try { await masterRefreshPromise; } catch {}
        return cookies;
      }

      masterRefreshPromise = (async () => {
        console.log(`[historie] 🔁 master ensureLoggedIn(force) start ${reason ? `(${reason})` : ""}`);
        await ensureLoggedIn(masterPage, {
          force: true,
          saveCookiesToDisk: false,
          useStoredCookies: false,
        });
        cookies = await masterPage.cookies().catch(() => cookies);
        console.log("[historie] ✅ master refreshed (cookies updated)");
        return cookies;
      })();

      try {
        return await masterRefreshPromise;
      } finally {
        masterRefreshPromise = null;
      }
    }
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
      // Zelfde login/cookies als Total, maar iedere VA krijgt via openFighterPageVerified een schone geverifieerde tab.
      // HISTORY_WORKERS is bewust standaard 4: SYS42-tabellen zijn zwaarder dan de profielsummary van Total.
      await new Promise((resolve) => setTimeout(resolve, workerIndex * staggerMs));

while (!stopRequested) {
        const va = allVas[cursor++];
        if (va == null) break;
        const startedAt = new Date().toISOString();
        await saveItem(run.id, va, { status: "running", started_at: startedAt, finished_at: null });
        let page = null;
        try {
          const loginRetries = Math.max(1, Number(process.env.HISTORY_LOGIN_RETRIES || 3));
          let result = null;

          for (let loginAttempt = 1; loginAttempt <= loginRetries; loginAttempt++) {
            try {
              // Pak bij iedere poging de meest actuele master-cookies.
              // Een worker die per ongeluk op de loginpagina belandt, wordt gesloten
              // en krijgt voor DEZELFDE VA een volledig nieuwe tab.
              page = await openFighterPageVerified(browser, null, cookies, va, {
                maxAttempts: Number(process.env.TAB_ATTEMPTS || 5),
                softWaitMs: Number(process.env.SOFT_WAIT_MS || 2500),
                betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS || 1200),
                workerLabel: `[historie ${workerIndex + 1}/${workers}]`,
              });

              if (!page) {
                throw Object.assign(
                  new Error("Vechterpagina niet geladen binnen de timeout."),
                  { step: "navigation", type: "timeout" }
                );
              }

              result = await scrapeHistoricalStartverbodPage(page, va);
              break;
            } catch (error) {
              const isLoginPage = error?.message === "LOGIN_PAGE";

              await hardCloseFightPassportPage(page).catch(() => {});
              page = null;

              if (!isLoginPage || loginAttempt >= loginRetries) {
                throw error;
              }

              console.log(
                `[historie] 🔐 VA ${va}: worker ${workerIndex + 1} kwam op loginpagina ` +
                `(poging ${loginAttempt}/${loginRetries}); master-sessie verversen en DEZELFDE VA opnieuw openen`
              );

              cookies = await refreshMasterSessionLocked(
                `worker ${workerIndex + 1} VA ${va} retry ${loginAttempt}`
              );

              await new Promise((resolve) =>
                setTimeout(resolve, Math.max(750, Number(process.env.HISTORY_LOGIN_RETRY_WAIT_MS || 1200)))
              );
            }
          }

          if (!result) {
            throw Object.assign(
              new Error("Geen scraperresultaat na worker-retries."),
              { step: "navigation", type: "retry_exhausted" }
            );
          }

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
              error_type: null, error_step: null, error_message: null,
              retry_status: null, finished_at: new Date().toISOString(),
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
