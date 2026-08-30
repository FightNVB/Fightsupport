import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import {
  hardCloseFightPassportPage,
  openFighterPageVerified,
} from "../utils/fightPassportFighterNavigation.js";
import { scrapeHistoricalStartverbodPage } from "./scrapeHistoricalStartverbodPage.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withTimeout(promiseFactory, ms, label, onTimeout) {
  let timer;
  const controller = new AbortController();

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(async () => {
      controller.abort();
      try {
        if (typeof onTimeout === "function") {
          await onTimeout(controller.signal);
        }
      } catch {}
      reject(new Error(`HARD TIMEOUT ${ms}ms for ${label}`));
    }, ms);
  });

  try {
    const p = Promise.resolve().then(() => promiseFactory(controller.signal));
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Dossierhistorie-only: deze scraper mag nooit fightpassport_fighters,
// heeft_startverbod, actuele blokkadestatus of gala-controledata schrijven.

const cliArgs = process.argv.slice(2);
const cliCommand = cliArgs.find((v) => ["run", "run-all"].includes(String(v).toLowerCase()));
const numericArgs = cliArgs.filter((v) => /^\d+$/.test(String(v)));
const startVa = Number(numericArgs[0] || process.env.HISTORY_START_VA || 775);
const endVa = Number(numericArgs[1] || process.env.HISTORY_END_VA || startVa);

// EXACT dezelfde worker-defaults als actuele fp_total.
const WORKERS_RAW = Number(process.env.HISTORY_WORKERS ?? process.env.WORKERS ?? "8");
const workers = Number.isFinite(WORKERS_RAW) && WORKERS_RAW > 0
  ? Math.min(20, Math.max(1, Math.floor(WORKERS_RAW)))
  : 8;
const staggerMs = Math.max(0, Number(process.env.HISTORY_STAGGER_MS ?? process.env.STAGGER_MS ?? "450"));
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


async function loadConfirmedDeletedVaNumbers(startVa, endVa) {
  const skipped = new Set();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("fightpassport_missing_va")
      .select("va_number")
      .eq("status", "confirmed_deleted")
      .range(from, from + pageSize - 1);

    if (error) {
      console.log(`[historie] ⚠️ confirmed_deleted lijst niet beschikbaar: ${error.message}`);
      return skipped;
    }

    const rows = data ?? [];
    for (const row of rows) {
      const n = Number(row.va_number);
      if (Number.isInteger(n) && n >= startVa && n <= endVa) skipped.add(n);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return skipped;
}

async function saveItem(runId, va, patch) {
  const { error } = await supabase.from("fighter_startverbod_history_items").upsert({
    run_id: runId, va_nummer: va, ...patch,
  }, { onConflict: "run_id,va_nummer" });
  if (error) throw error;
}

async function sendHistoricalVaToAiReview(runId, va, error) {
  const now = new Date().toISOString();
  const message = error?.message ?? String(error);
  const { data: existing } = await supabase
    .from("fightpassport_missing_va")
    .select("status,not_found_count,first_seen_at")
    .eq("va_number", String(va))
    .maybeSingle();

  const { error: queueError } = await supabase
    .from("fightpassport_missing_va")
    .upsert({
      va_number: String(va),
      status: existing?.status === "confirmed_deleted" ? "confirmed_deleted" : "pending_review",
      first_seen_at: existing?.first_seen_at || now,
      last_seen_at: now,
      not_found_count: Number(existing?.not_found_count || 0) + 1,
      last_source: "historical_startverbod",
      last_run_id: runId,
      last_error_message: message,
      resolved_at: null,
      updated_at: now,
    }, { onConflict: "va_number" });

  if (queueError) throw queueError;
}

export async function scraperHistoricalStartverbod() {
  const run = await createOrResumeRun();
  console.log(`[historie] 🏁 start VA ${startVa} t/m ${endVa} met ${workers} worker(s), stagger=${staggerMs}ms`);

  let browser;
  let masterPage;
  let cookies = [];
  let browserGeneration = 1;
  let browserRestartPromise = null;
  let masterRefreshPromise = null;

  const timeoutMs = Math.max(30000, Number(process.env.HISTORY_TIMEOUT_MS ?? "120000"));
  const maxLoginRetries = Math.max(1, Number(process.env.HISTORY_LOGIN_RETRIES ?? "1"));
  const maxTransientRetries = Math.max(0, Number(process.env.HISTORY_TRANSIENT_RETRIES ?? "1"));
  const workerDriftMaxMs = Math.max(0, Number(process.env.HISTORY_WORKER_DRIFT_MAX_MS ?? "250"));

  const stats = {
    processed: 0,
    found: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    lastVa: Number(run.last_processed_va || startVa - 1),
    lastError: null,
  };

  async function persistRun(status = "running", finishedAt = null) {
    const { error } = await supabase.from("fighter_startverbod_history_runs").update({
      status,
      processed_count: stats.processed,
      found_count: stats.found,
      inserted_count: stats.inserted,
      updated_count: stats.updated,
      skipped_count: stats.skipped,
      error_count: stats.errors,
      last_processed_va: stats.lastVa,
      last_error: stats.lastError,
      finished_at: finishedAt,
      pid: status === "running" ? process.pid : null,
      updated_at: new Date().toISOString(),
    }).eq("id", run.id);
    if (error) throw error;
  }

  function isBrowserConnectionError(message) {
    return /Connection closed|Target closed|Session closed|Protocol error|browser has disconnected|Not connected to DevTools/i.test(
      String(message || "")
    );
  }

  async function restartBrowserLocked(reason = "") {
    if (browserRestartPromise) {
      await browserRestartPromise;
      return browserGeneration;
    }

    browserRestartPromise = (async () => {
      console.log(`[historie] 🔄 volledige browser opnieuw starten ${reason ? `(${reason})` : ""}`);
      try { await masterPage?.close(); } catch {}
      try { await browser?.close(); } catch {}

      const fresh = await loginFightPassport({ freshSession: true, saveCookiesToDisk: false });
      browser = fresh.browser;
      masterPage = fresh.page;
      cookies = await masterPage.cookies().catch(() => []);
      browserGeneration++;
      console.log(`[historie] ✅ browser hersteld; generatie ${browserGeneration}`);
      return browserGeneration;
    })();

    try { return await browserRestartPromise; }
    finally { browserRestartPromise = null; }
  }

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

    try { return await masterRefreshPromise; }
    finally { masterRefreshPromise = null; }
  }

  try {
    ({ browser, page: masterPage } = await loginFightPassport({
      freshSession: true,
      saveCookiesToDisk: false,
    }));
    cookies = await masterPage.cookies().catch(() => []);
    console.log("[historie] ✅ Schone master-sessie gestart; workers delen browser + actuele sessiecookies");

    const confirmedDeleted = await loadConfirmedDeletedVaNumbers(startVa, endVa);

    // Alle items paginagewijs ophalen; een volle range is groter dan Supabase's standaard response-limiet.
    const existingItems = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("fighter_startverbod_history_items")
        .select("va_nummer,status,found_count,error_type")
        .eq("run_id", run.id)
        .order("va_nummer", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = data ?? [];
      existingItems.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    }

    const terminalStatuses = new Set(["completed", "skipped"]);
    const terminalByVa = new Map(
      existingItems.map((item) => [Number(item.va_nummer), String(item.status || "").toLowerCase()])
    );

    // Stats opnieuw uit itemstatus opbouwen zodat resume nooit oude run-counters dubbel telt.
    stats.processed = existingItems.filter((item) => terminalStatuses.has(String(item.status || "").toLowerCase())).length;
    stats.found = existingItems
      .filter((item) => String(item.status || "").toLowerCase() === "completed")
      .reduce((sum, item) => sum + Number(item.found_count || 0), 0);
    stats.skipped = existingItems.filter((item) => String(item.status || "").toLowerCase() === "skipped").length;
    stats.errors = existingItems.filter((item) => String(item.error_type || "") === "pending_review").length;

    const vaList = [];
    for (let va = startVa; va <= endVa; va++) {
      if (terminalStatuses.has(terminalByVa.get(va))) continue;

      if (confirmedDeleted.has(va)) {
        const now = new Date().toISOString();
        await saveItem(run.id, va, {
          status: "skipped",
          found_count: 0,
          error_type: "confirmed_deleted",
          error_step: "confirmed_deleted",
          error_message: "Handmatig bevestigd als verwijderd; niet opnieuw bevraagd.",
          started_at: now,
          finished_at: now,
        });
        stats.processed++;
        stats.skipped++;
        stats.lastVa = Math.max(stats.lastVa, va);
        continue;
      }

      vaList.push(va);
    }

    console.log(`[historie] ▶️ ${stats.processed} al terminaal, ${vaList.length} VA(s) in wachtrij`);
    await persistRun();

    let cursor = 0;
    let activeAttempts = 0;
    const loginRetryCounts = new Map();
    const transientRetryCounts = new Map();

    async function requeueTransientVa(va, label, reason) {
      const key = String(va);
      const retryNr = (transientRetryCounts.get(key) || 0) + 1;
      if (retryNr > maxTransientRetries) return false;
      transientRetryCounts.set(key, retryNr);

      await saveItem(run.id, va, {
        status: "pending",
        found_count: 0,
        error_type: "temporary_retry",
        error_step: "temporary_retry",
        error_message: `Tijdelijke fout; VA achteraan opnieuw ingepland (poging ${retryNr + 1}/${maxTransientRetries + 1}). Oorzaak: ${reason}`,
        finished_at: null,
      });
      vaList.push(va);
      console.log(`[historie] ♻️ ${label} VA ${va} achteraan opnieuw ingepland (verse poging ${retryNr + 1}/${maxTransientRetries + 1}): ${reason}`);
      return true;
    }

    async function sendToReview(va, error, step = "ai_review") {
      stats.processed++;
      stats.skipped++;
      stats.errors++;
      stats.lastVa = Math.max(stats.lastVa, Number(va));
      stats.lastError = error?.message ?? String(error);

      await sendHistoricalVaToAiReview(run.id, va, error);
      await saveItem(run.id, va, {
        status: "skipped",
        found_count: 0,
        error_type: "pending_review",
        error_step: step,
        error_message: `${error?.message ?? String(error)} (na ${maxTransientRetries + 1} volledig verse poging(en); naar AI Controle)`,
        retry_status: "pending_review",
        finished_at: new Date().toISOString(),
      });
      console.log(`[historie] 🧠 VA ${va}: naar AI Controle; run gaat verder`);
    }

    async function confirmProfileMissing(va, label, vaPages) {
      // Exact Total-model: na de eerste volledige mislukte open-cyclus nog twee
      // onafhankelijke profielverificaties. Pas daarna behandelen als niet betrouwbaar geopend.
      for (let retry = 1; retry <= 2; retry++) {
        await sleep(1000 * retry);
        const retryPage = await openFighterPageVerified(browser, null, cookies, va, {
          maxAttempts: 2,
          softWaitMs: Math.min(200, Math.max(0, Number(process.env.SOFT_WAIT_MS ?? "200"))),
          betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "1200"),
          workerLabel: `[${label} ontbrekend-hercontrole ${retry}/2]`,
        });
        if (retryPage) {
          vaPages.add(retryPage);
          return retryPage;
        }
      }
      return null;
    }

    async function worker(workerIndex) {
      const label = `worker${workerIndex + 1}/${workers}`;
      const delay = workerIndex * staggerMs;
      if (delay > 0) await sleep(delay);

      while (!stopRequested) {
        if (cursor >= vaList.length) {
          if (activeAttempts > 0) {
            await sleep(100);
            continue;
          }
          break;
        }

        const myIndex = cursor++;
        if (myIndex >= vaList.length) continue;
        const va = vaList[myIndex];
        activeAttempts++;
        const vaBrowserGeneration = browserGeneration;
        let page = null;
        const vaPages = new Set();
        let terminalThisAttempt = false;

        console.log(`[historie] 🤖 ${label} → VA ${va}`);
        await saveItem(run.id, va, {
          status: "running",
          started_at: new Date().toISOString(),
          finished_at: null,
        });

        try {
          page = await openFighterPageVerified(browser, null, cookies, va, {
            maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
            softWaitMs: Math.min(200, Math.max(0, Number(process.env.SOFT_WAIT_MS ?? "200"))),
            betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "350"),
            workerLabel: `[${label}]`,
          });

          if (page) vaPages.add(page);

          if (!page) {
            page = await confirmProfileMissing(va, label, vaPages);
          }

          if (!page) {
            const requeued = await requeueTransientVa(va, label, "fighter-url/profiel niet betrouwbaar geopend");
            if (requeued) continue;
            await sendToReview(va, new Error("Na volledig verse profielpogingen geen geldige fighter-header gevonden."), "navigation_pending_review");
            terminalThisAttempt = true;
            continue;
          }

          const result = await withTimeout(
            (signal) => scrapeHistoricalStartverbodPage(page, va, signal),
            timeoutMs,
            `historical-startverbod ${va}`,
            async () => {
              for (const p of vaPages) {
                await hardCloseFightPassportPage(p).catch(() => {});
              }
              page = null;
            }
          );

          loginRetryCounts.delete(String(va));
          transientRetryCounts.delete(String(va));

          if (result.status === "skipped") {
            stats.processed++;
            stats.skipped++;
            stats.lastVa = Math.max(stats.lastVa, Number(va));
            terminalThisAttempt = true;
            await saveItem(run.id, va, {
              status: "skipped",
              naam_fp: result.naam_fp ?? null,
              found_count: 0,
              error_type: result.reason,
              error_step: "startverboden_tile",
              error_message: null,
              retry_status: null,
              finished_at: new Date().toISOString(),
            });
          } else {
            const saved = await saveRecords(result.records);
            stats.processed++;
            stats.found += result.records.length;
            stats.inserted += saved.inserted;
            stats.updated += saved.updated;
            stats.lastVa = Math.max(stats.lastVa, Number(va));
            terminalThisAttempt = true;
            await saveItem(run.id, va, {
              status: "completed",
              naam_fp: result.naam_fp ?? null,
              found_count: result.records.length,
              error_type: null,
              error_step: null,
              error_message: null,
              retry_status: null,
              finished_at: new Date().toISOString(),
            });
            console.log(`[historie] ✅ ${label} VA ${va}: ${result.records.length} historische regel(s)`);
          }
        } catch (error) {
          const message = error?.message ?? String(error);

          for (const p of vaPages) {
            await hardCloseFightPassportPage(p).catch(() => {});
          }
          page = null;

          if (message === "LOGIN_PAGE") {
            const key = String(va);
            const retryNr = (loginRetryCounts.get(key) || 0) + 1;
            loginRetryCounts.set(key, retryNr);
            console.log(`[historie] 🔐 ${label} LOGIN_PAGE bij VA ${va}; master opnieuw inloggen (poging ${retryNr}/${maxLoginRetries})`);

            await saveItem(run.id, va, {
              status: "pending",
              error_type: "login_recovery",
              error_step: "login_recovery",
              error_message: `Loginpagina geraakt; sessie wordt hersteld (poging ${retryNr}/${maxLoginRetries}).`,
              finished_at: null,
            });

            try {
              await refreshMasterSessionLocked(`LOGIN_PAGE from ${label} VA ${va}`);
              if (retryNr <= maxLoginRetries) {
                vaList.push(va);
                console.log(`[historie] ♻️ ${label} VA ${va} opnieuw ingepland na verse login`);
              } else {
                throw new Error(`LOGIN_PAGE bleef terugkomen na ${maxLoginRetries} herstelpogingen`);
              }
            } catch (loginError) {
              await sendToReview(va, loginError, "login_pending_review");
              terminalThisAttempt = true;
            }
          } else if (isBrowserConnectionError(message)) {
            console.log(`[historie] 🔌 ${label} browserverbinding weg bij VA ${va}: ${message}`);
            try {
              if (vaBrowserGeneration === browserGeneration) {
                await restartBrowserLocked(`${label} VA ${va}`);
              }
              const requeued = await requeueTransientVa(va, label, `browserverbinding hersteld: ${message}`);
              if (!requeued) throw new Error(`Browserverbinding bleef fout: ${message}`);
            } catch (restartError) {
              await sendToReview(va, restartError, "browser_pending_review");
              terminalThisAttempt = true;
            }
          } else {
            const requeued = await requeueTransientVa(va, label, message);
            if (!requeued) {
              await sendToReview(
                va,
                error,
                String(message).startsWith("HARD TIMEOUT") ? "timeout_pending_review" : "scrape_pending_review"
              );
              terminalThisAttempt = true;
            }
          }
        } finally {
          for (const p of vaPages) {
            await hardCloseFightPassportPage(p).catch(() => {});
          }
          activeAttempts = Math.max(0, activeAttempts - 1);

          if (terminalThisAttempt || stats.processed % 10 === 0 || stopRequested) {
            await persistRun().catch((error) =>
              console.log("[historie] run progress update fout:", error?.message ?? String(error))
            );
          }

          if (!stopRequested && workerDriftMaxMs > 0) {
            const driftMs = ((workerIndex + 1) * 37 + (Number(va) % 97)) % (workerDriftMaxMs + 1);
            if (driftMs > 0) await sleep(driftMs);
          }
        }
      }
    }

    await Promise.all(Array.from({ length: workers }, (_, index) => worker(index)));

    // Eindcontrole zoals Total: nooit completed zolang er pending/running items bestaan.
    const finalItems = [];
    from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("fighter_startverbod_history_items")
        .select("va_nummer,status,error_type")
        .eq("run_id", run.id)
        .order("va_nummer", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = data ?? [];
      finalItems.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    }

    const pendingItems = finalItems.filter((item) =>
      !terminalStatuses.has(String(item.status || "").toLowerCase())
    );
    const expectedCount = endVa - startVa + 1;
    const terminalCount = finalItems.filter((item) =>
      terminalStatuses.has(String(item.status || "").toLowerCase())
    ).length;

    if (!stopRequested && (pendingItems.length > 0 || terminalCount < expectedCount)) {
      const message = `Eindcontrole mislukt: ${terminalCount}/${expectedCount} terminaal, ${pendingItems.length} pending/running.`;
      stats.lastError = message;
      await persistRun("failed", new Date().toISOString());
      throw new Error(message);
    }

    const finalStatus = stopRequested
      ? "paused"
      : finalItems.some((item) => String(item.error_type || "") === "pending_review")
        ? "completed_with_errors"
        : "completed";

    await persistRun(finalStatus, stopRequested ? null : new Date().toISOString());
    console.log(`[historie] 🏁 run ${run.id}: ${finalStatus} | verwerkt=${stats.processed} | historie=${stats.found} | fouten=${stats.errors}`);
    return { ok: true, run_id: run.id, status: finalStatus, ...stats };
  } catch (error) {
    await supabase.from("fighter_startverbod_history_runs").update({
      status: "failed",
      last_error: error?.message ?? String(error),
      pid: null,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", run.id).catch(() => {});
    throw error;
  } finally {
    await browser?.close().catch(() => {});
  }
}

if (cliCommand) {
  scraperHistoricalStartverbod().then((result) => {
    console.log(JSON.stringify(result));
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
