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

// Dossierhistorie-only:
// deze scraper schrijft uitsluitend historische startverbod/schorsing-data.
// Hij mag nooit fightpassport_fighters, actuele startverbodstatus,
// matchmaking- of gala-controledata wijzigen.

const cliArgs = process.argv.slice(2);
const cliCommand = cliArgs.find((v) =>
  ["run", "run-all"].includes(String(v).toLowerCase())
);
const numericArgs = cliArgs.filter((v) => /^\d+$/.test(String(v)));

const startVa = Number(
  numericArgs[0] || process.env.HISTORY_START_VA || 775
);
const endVa = Number(
  numericArgs[1] || process.env.HISTORY_END_VA || startVa
);

const WORKERS_RAW = Number(
  process.env.HISTORY_WORKERS ?? process.env.WORKERS ?? "10"
);
const workers =
  Number.isFinite(WORKERS_RAW) && WORKERS_RAW > 0
    ? Math.min(20, Math.max(1, Math.floor(WORKERS_RAW)))
    : 10;

const staggerMs = Math.max(
  0,
  Number(
    process.env.HISTORY_STAGGER_MS ??
      process.env.STAGGER_MS ??
      "300"
  )
);

const resumeRunId = String(process.env.HISTORY_RUN_ID || "").trim();

let stopRequested = false;
process.on("SIGTERM", () => {
  stopRequested = true;
});
process.on("SIGINT", () => {
  stopRequested = true;
});

process.on("unhandledRejection", (error) => {
  console.error("[historie] ❌ UNHANDLED REJECTION:", error?.stack ?? error);
});

process.on("uncaughtException", (error) => {
  console.error("[historie] ❌ UNCAUGHT EXCEPTION:", error?.stack ?? error);
});

async function createOrResumeRun() {
  if (resumeRunId) {
    const { data, error } = await supabase
      .from("fighter_startverbod_history_runs")
      .update({
        status: "running",
        finished_at: null,
        pid: process.pid,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resumeRunId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("fighter_startverbod_history_runs")
    .insert({
      status: "running",
      start_va: startVa,
      end_va: endVa,
      workers,
      pid: process.pid,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function saveRecords(records) {
  if (!records.length) {
    return { inserted: 0, updated: 0 };
  }

  const fingerprints = records.map((record) => record.fingerprint);

  const { data: existing, error: readError } = await supabase
    .from("fighter_startverbod_history")
    .select("fingerprint")
    .in("fingerprint", fingerprints);

  if (readError) throw readError;

  const existingKeys = new Set(
    (existing ?? []).map((row) => row.fingerprint)
  );

  const now = new Date().toISOString();

  const payload = records.map((record) => ({
    ...record,
    scraped_at: now,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("fighter_startverbod_history")
    .upsert(payload, {
      onConflict: "fingerprint",
      ignoreDuplicates: false,
    });

  if (error) throw error;

  return {
    inserted: records.filter(
      (record) => !existingKeys.has(record.fingerprint)
    ).length,
    updated: records.filter((record) =>
      existingKeys.has(record.fingerprint)
    ).length,
  };
}

async function loadConfirmedDeletedVaNumbers(rangeStart, rangeEnd) {
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
      console.log(
        `[historie] ⚠️ confirmed_deleted lijst niet beschikbaar: ${error.message}`
      );
      return skipped;
    }

    const rows = data ?? [];

    for (const row of rows) {
      const n = Number(row.va_number);
      if (
        Number.isInteger(n) &&
        n >= rangeStart &&
        n <= rangeEnd
      ) {
        skipped.add(n);
      }
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return skipped;
}

async function saveItem(runId, va, patch) {
  const { error } = await supabase
    .from("fighter_startverbod_history_items")
    .upsert(
      {
        run_id: runId,
        va_nummer: va,
        ...patch,
      },
      {
        onConflict: "run_id,va_nummer",
      }
    );

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
    .upsert(
      {
        va_number: String(va),
        status:
          existing?.status === "confirmed_deleted"
            ? "confirmed_deleted"
            : "pending_review",
        first_seen_at: existing?.first_seen_at || now,
        last_seen_at: now,
        not_found_count:
          Number(existing?.not_found_count || 0) + 1,
        last_source: "historical_startverbod",
        last_run_id: runId,
        last_error_message: message,
        resolved_at: null,
        updated_at: now,
      },
      {
        onConflict: "va_number",
      }
    );

  if (queueError) throw queueError;
}

async function waitForMasterLoginReady(page, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (
    !stopRequested &&
    Date.now() - startedAt < timeoutMs
  ) {
    const state = await page
      .evaluate(() => {
        const visible = (el) => {
          if (!el) return false;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            rect.width > 0 &&
            rect.height > 0
          );
        };

        const loginInput =
          document.querySelector("input.gebruikersnaam");
        const href = String(location.href || "").toLowerCase();
        const body = String(
          document.body?.innerText || ""
        ).toLowerCase();

        return {
          loginVisible:
            Boolean(loginInput) && visible(loginInput),
          href,
          loggedInSignal:
            body.includes("afmelden") ||
            body.includes("uitloggen") ||
            body.includes("fightpassport"),
        };
      })
      .catch(() => null);

    if (
      state &&
      !state.loginVisible &&
      !state.href.includes("#login") &&
      !state.href.includes("/login") &&
      state.loggedInSignal
    ) {
      return true;
    }

    await sleep(500);
  }

  throw new Error(
    `Master-login niet aantoonbaar gereed binnen ${Math.round(
      timeoutMs / 1000
    )} seconden`
  );
}

export async function scraperHistoricalStartverbod() {
  const run = await createOrResumeRun();

  console.log(
    `[historie] 🏁 start VA ${startVa} t/m ${endVa} met ${workers} worker(s), stagger=${staggerMs}ms`
  );

  let browser;
  let masterPage;
  let cookies = [];
  let browserGeneration = 1;
  let browserRestartPromise = null;
  let masterRefreshPromise = null;

  const timeoutMs = Math.max(
    30000,
    Number(process.env.HISTORY_TIMEOUT_MS ?? "120000")
  );

  const maxAttemptsPerVa = Math.max(
    2,
    Number(process.env.HISTORY_MAX_ATTEMPTS ?? "5")
  );

  const tabAttempts = Math.max(
    2,
    Number(process.env.HISTORY_TAB_ATTEMPTS ?? process.env.TAB_ATTEMPTS ?? "4")
  );

  const workerDriftMaxMs = Math.max(
    0,
    Number(process.env.HISTORY_WORKER_DRIFT_MAX_MS ?? "150")
  );

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

  async function persistRun(
    status = "running",
    finishedAt = null
  ) {
    const { error } = await supabase
      .from("fighter_startverbod_history_runs")
      .update({
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
      })
      .eq("id", run.id);

    if (error) throw error;
  }

  function isBrowserConnectionError(message) {
    return /Connection closed|Target closed|Session closed|Protocol error|browser has disconnected|Not connected to DevTools|WebSocket is not open/i.test(
      String(message || "")
    );
  }

  async function applyFreshCookiesToSharedArray() {
    const freshCookies = await masterPage
      .cookies()
      .catch(() => []);

    // Bewust dezelfde Array-reference behouden:
    // openFighterPageVerified kan tijdens een lopende poging
    // dezelfde cookies-array opnieuw gebruiken.
    cookies.splice(0, cookies.length, ...freshCookies);
    return cookies;
  }

  async function refreshMasterSessionLocked(reason = "") {
    if (masterRefreshPromise) {
      await masterRefreshPromise;
      return cookies;
    }

    masterRefreshPromise = (async () => {
      console.log(
        `[historie] 🔁 master-login herstellen${
          reason ? ` (${reason})` : ""
        }`
      );

      await ensureLoggedIn(masterPage, {
        force: true,
        saveCookiesToDisk: false,
        useStoredCookies: false,
      });

      await waitForMasterLoginReady(masterPage);
      await applyFreshCookiesToSharedArray();

      console.log(
        "[historie] ✅ master-login hersteld; cookies opnieuw gedeeld"
      );
    })();

    try {
      await masterRefreshPromise;
      return cookies;
    } finally {
      masterRefreshPromise = null;
    }
  }

  async function restartBrowserLocked(reason = "") {
    if (browserRestartPromise) {
      await browserRestartPromise;
      return browserGeneration;
    }

    browserRestartPromise = (async () => {
      console.log(
        `[historie] 🔌 browser echt disconnected; volledig opnieuw starten${
          reason ? ` (${reason})` : ""
        }`
      );

      try {
        await masterPage?.close();
      } catch {}

      try {
        await browser?.close();
      } catch {}

      const fresh = await loginFightPassport({
        freshSession: true,
        saveCookiesToDisk: false,
      });

      browser = fresh.browser;
      masterPage = fresh.page;

      await waitForMasterLoginReady(masterPage);

      const newCookies = await masterPage
        .cookies()
        .catch(() => []);
      cookies.splice(0, cookies.length, ...newCookies);

      browserGeneration += 1;

      console.log(
        `[historie] ✅ browser hersteld; generatie ${browserGeneration}`
      );

      return browserGeneration;
    })();

    try {
      return await browserRestartPromise;
    } finally {
      browserRestartPromise = null;
    }
  }

  try {
    const login = await loginFightPassport({
      freshSession: true,
      saveCookiesToDisk: false,
    });

    browser = login.browser;
    masterPage = login.page;

    // Zelfde principe als Total:
    // eerst één aantoonbaar geldige master-login,
    // pas daarna starten de workers.
    await waitForMasterLoginReady(masterPage);
    cookies = await masterPage.cookies().catch(() => []);

    console.log(
      "[historie] ✅ Master-login aantoonbaar gereed; workers mogen starten"
    );

    const confirmedDeleted =
      await loadConfirmedDeletedVaNumbers(
        startVa,
        endVa
      );

    const existingItems = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("fighter_startverbod_history_items")
        .select(
          "va_nummer,status,found_count,error_type"
        )
        .eq("run_id", run.id)
        .order("va_nummer", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const rows = data ?? [];
      existingItems.push(...rows);

      if (rows.length < pageSize) break;
      from += pageSize;
    }

    const terminalStatuses = new Set([
      "completed",
      "skipped",
    ]);

    const terminalByVa = new Map(
      existingItems.map((item) => [
        Number(item.va_nummer),
        String(item.status || "").toLowerCase(),
      ])
    );

    // Resume: counters uitsluitend opnieuw opbouwen uit
    // de reeds opgeslagen itemstatussen.
    stats.processed = existingItems.filter((item) =>
      terminalStatuses.has(
        String(item.status || "").toLowerCase()
      )
    ).length;

    stats.found = existingItems
      .filter(
        (item) =>
          String(item.status || "").toLowerCase() ===
          "completed"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.found_count || 0),
        0
      );

    stats.skipped = existingItems.filter(
      (item) =>
        String(item.status || "").toLowerCase() ===
        "skipped"
    ).length;

    stats.errors = existingItems.filter(
      (item) =>
        String(item.error_type || "") ===
        "pending_review"
    ).length;

    const vaList = [];

    for (let va = startVa; va <= endVa; va++) {
      if (
        terminalStatuses.has(
          terminalByVa.get(va)
        )
      ) {
        continue;
      }

      if (confirmedDeleted.has(va)) {
        const now = new Date().toISOString();

        await saveItem(run.id, va, {
          status: "skipped",
          found_count: 0,
          error_type: "confirmed_deleted",
          error_step: "confirmed_deleted",
          error_message:
            "Handmatig bevestigd als verwijderd; niet opnieuw bevraagd.",
          started_at: now,
          finished_at: now,
        });

        stats.processed += 1;
        stats.skipped += 1;
        stats.lastVa = Math.max(
          stats.lastVa,
          va
        );

        continue;
      }

      vaList.push(va);
    }

    console.log(
      `[historie] ▶️ ${stats.processed} al klaar, ${vaList.length} VA(s) nog te doen`
    );

    await persistRun();

    let cursor = 0;
    let activeAttempts = 0;

    // Totaal aantal volledig verse VA-pogingen.
    // Niet apart voor login/navigation/scrape:
    // één VA mag maximaal HISTORY_MAX_ATTEMPTS
    // volledig nieuwe tabs krijgen.
    const attemptCounts = new Map();

    async function terminalReview(
      va,
      error,
      step = "pending_review"
    ) {
      const key = String(va);

      stats.processed += 1;
      stats.skipped += 1;
      stats.errors += 1;
      stats.lastVa = Math.max(
        stats.lastVa,
        Number(va)
      );
      stats.lastError =
        error?.message ?? String(error);

      await sendHistoricalVaToAiReview(
        run.id,
        va,
        error
      );

      await saveItem(run.id, va, {
        status: "skipped",
        found_count: 0,
        error_type: "pending_review",
        error_step: step,
        error_message: `${
          error?.message ?? String(error)
        } (na ${attemptCounts.get(key) || 1}/${maxAttemptsPerVa} volledig verse VA-poging(en); run gaat verder)`,
        retry_status: "pending_review",
        finished_at: new Date().toISOString(),
      });

      console.log(
        `[historie] 🧠 VA ${va}: apart gezet voor controle; overige VA's gaan door`
      );
    }

    async function requeueVa(
      va,
      label,
      reason
    ) {
      const key = String(va);
      const used = attemptCounts.get(key) || 0;

      if (used >= maxAttemptsPerVa) {
        return false;
      }

      await saveItem(run.id, va, {
        status: "pending",
        found_count: 0,
        error_type: "temporary_retry",
        error_step: "temporary_retry",
        error_message: `Verse tab wordt opnieuw geprobeerd (${used + 1}/${maxAttemptsPerVa}). Oorzaak: ${reason}`,
        finished_at: null,
      });

      vaList.push(va);

      console.log(
        `[historie] ♻️ ${label} VA ${va} achteraan opnieuw ingepland: ${reason}`
      );

      return true;
    }

    async function worker(workerIndex) {
      const label = `worker${workerIndex + 1}/${workers}`;
      const delay = workerIndex * staggerMs;

      if (delay > 0) {
        await sleep(delay);
      }

      while (!stopRequested) {
        if (cursor >= vaList.length) {
          if (activeAttempts > 0) {
            await sleep(100);
            continue;
          }

          break;
        }

        const index = cursor++;
        if (index >= vaList.length) continue;

        const va = vaList[index];
        const key = String(va);

        const attempt =
          (attemptCounts.get(key) || 0) + 1;
        attemptCounts.set(key, attempt);

        activeAttempts += 1;

        const thisBrowserGeneration =
          browserGeneration;

        let page = null;
        let terminalThisAttempt = false;

        console.log(
          `[historie] 🤖 ${label} → VA ${va} | verse poging ${attempt}/${maxAttemptsPerVa}`
        );

        await saveItem(run.id, va, {
          status: "running",
          started_at: new Date().toISOString(),
          finished_at: null,
          error_type: null,
          error_step: null,
          error_message: null,
        });

        try {
          // HARD NAVIGATION MODEL:
          // iedere poging begint met een volledig nieuwe tab
          // rechtstreeks op #va_vechter/<VA>.
          //
          // Komt de worker op login of een verkeerde fighter,
          // dan sluit openFighterPageVerified die tab en probeert
          // hij met een verse tab opnieuw.
          page = await openFighterPageVerified(
            browser,
            null,
            cookies,
            va,
            {
              maxAttempts: tabAttempts,
              softWaitMs: Math.min(
                250,
                Math.max(
                  0,
                  Number(
                    process.env.SOFT_WAIT_MS ??
                      "150"
                  )
                )
              ),
              betweenAttemptsMs: Math.max(
                50,
                Number(
                  process.env.BETWEEN_ATTEMPTS_MS ??
                    "150"
                )
              ),
              freshRetryOnLogin: true,
              workerLabel: `[${label}]`,
              onLoginPage: async () => {
                // Belangrijk: login-tab is door de helper al dicht.
                // Alleen master-sessie herstellen; daarna volgende verse tab.
                await refreshMasterSessionLocked(
                  `${label} VA ${va}`
                );
              },
            }
          );

          if (!page) {
            const error = new Error(
              "Fighterprofiel kwam na harde verse tabs niet betrouwbaar op de juiste VA."
            );

            if (
              await requeueVa(
                va,
                label,
                error.message
              )
            ) {
              continue;
            }

            await terminalReview(
              va,
              error,
              "navigation_pending_review"
            );
            terminalThisAttempt = true;
            continue;
          }

          const result = await withTimeout(
            () =>
              scrapeHistoricalStartverbodPage(
                page,
                va
              ),
            timeoutMs,
            `historical-startverbod ${va}`,
            async () => {
              // Timeout van één VA:
              // uitsluitend die worker-tab hard sluiten.
              await hardCloseFightPassportPage(
                page
              ).catch(() => {});
              page = null;
            }
          );

          if (result.status === "skipped") {
            stats.processed += 1;
            stats.skipped += 1;
            stats.lastVa = Math.max(
              stats.lastVa,
              Number(va)
            );

            terminalThisAttempt = true;

            await saveItem(run.id, va, {
              status: "skipped",
              naam_fp:
                result.naam_fp ?? null,
              found_count: 0,
              error_type: result.reason,
              error_step:
                "startverboden_tile",
              error_message: null,
              retry_status: null,
              finished_at:
                new Date().toISOString(),
            });
          } else {
            const saved = await saveRecords(
              result.records
            );

            stats.processed += 1;
            stats.found += result.records.length;
            stats.inserted += saved.inserted;
            stats.updated += saved.updated;
            stats.lastVa = Math.max(
              stats.lastVa,
              Number(va)
            );

            terminalThisAttempt = true;

            await saveItem(run.id, va, {
              status: "completed",
              naam_fp:
                result.naam_fp ?? null,
              found_count:
                result.records.length,
              error_type: null,
              error_step: null,
              error_message: null,
              retry_status: null,
              finished_at:
                new Date().toISOString(),
            });

            console.log(
              `[historie] ✅ ${label} VA ${va}: ${result.records.length} historische regel(s)`
            );
          }
        } catch (error) {
          const message =
            error?.message ?? String(error);

          await hardCloseFightPassportPage(
            page
          ).catch(() => {});
          page = null;

          if (stopRequested) {
            await saveItem(run.id, va, {
              status: "pending",
              error_type: "paused",
              error_step: "paused",
              error_message:
                "Run gepauzeerd; VA wordt bij hervatten opnieuw uitgevoerd.",
              finished_at: null,
            }).catch(() => {});

            continue;
          }

          if (
            isBrowserConnectionError(message)
          ) {
            console.log(
              `[historie] 🔌 ${label} browserverbinding weg bij VA ${va}: ${message}`
            );

            try {
              if (
                thisBrowserGeneration ===
                browserGeneration
              ) {
                await restartBrowserLocked(
                  `${label} VA ${va}`
                );
              }

              if (
                await requeueVa(
                  va,
                  label,
                  `browser hersteld: ${message}`
                )
              ) {
                continue;
              }

              await terminalReview(
                va,
                error,
                "browser_pending_review"
              );
              terminalThisAttempt = true;
            } catch (restartError) {
              await terminalReview(
                va,
                restartError,
                "browser_pending_review"
              );
              terminalThisAttempt = true;
            }

            continue;
          }

          // LOGIN_PAGE hoort normaliter al intern als verse tab
          // opnieuw geprobeerd te worden. Als hij alsnog naar buiten
          // komt: master opnieuw inloggen en VA achteraan.
          if (message === "LOGIN_PAGE") {
            try {
              await refreshMasterSessionLocked(
                `${label} VA ${va}`
              );

              if (
                await requeueVa(
                  va,
                  label,
                  "loginpagina bleef terugkomen; master opnieuw ingelogd"
                )
              ) {
                continue;
              }

              await terminalReview(
                va,
                error,
                "login_pending_review"
              );
              terminalThisAttempt = true;
            } catch (loginError) {
              await terminalReview(
                va,
                loginError,
                "login_pending_review"
              );
              terminalThisAttempt = true;
            }

            continue;
          }

          // Iedere andere fout (modal, rij, detail, timeout):
          // TAB weg, zelfde VA later volledig vers opnieuw.
          if (
            await requeueVa(
              va,
              label,
              message
            )
          ) {
            continue;
          }

          await terminalReview(
            va,
            error,
            String(message).startsWith(
              "HARD TIMEOUT"
            )
              ? "timeout_pending_review"
              : "scrape_pending_review"
          );

          terminalThisAttempt = true;
        } finally {
          await hardCloseFightPassportPage(
            page
          ).catch(() => {});
          page = null;

          activeAttempts = Math.max(
            0,
            activeAttempts - 1
          );

          if (
            terminalThisAttempt ||
            stats.processed % 10 === 0 ||
            stopRequested
          ) {
            await persistRun().catch(
              (error) =>
                console.log(
                  "[historie] run progress update fout:",
                  error?.message ??
                    String(error)
                )
            );
          }

          if (
            !stopRequested &&
            workerDriftMaxMs > 0
          ) {
            const driftMs =
              ((workerIndex + 1) * 37 +
                (Number(va) % 97)) %
              (workerDriftMaxMs + 1);

            if (driftMs > 0) {
              await sleep(driftMs);
            }
          }
        }
      }
    }

    await Promise.all(
      Array.from(
        { length: workers },
        (_, index) => worker(index)
      )
    );

    if (stopRequested) {
      await persistRun("paused", null);

      console.log(
        `[historie] ⏸️ run ${run.id} gepauzeerd | verwerkt=${stats.processed}`
      );

      return {
        ok: true,
        run_id: run.id,
        status: "paused",
        ...stats,
      };
    }

    // Finale vangrail:
    // geen enkele ontbrekende/pending/running VA mag de HELE run
    // nog op failed zetten. Alles wat na de workerfase niet
    // terminaal is, wordt apart gezet voor controle.
    const finalItems = [];
    from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("fighter_startverbod_history_items")
        .select(
          "va_nummer,status,error_type,error_message"
        )
        .eq("run_id", run.id)
        .order("va_nummer", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const rows = data ?? [];
      finalItems.push(...rows);

      if (rows.length < pageSize) break;
      from += pageSize;
    }

    const finalByVa = new Map(
      finalItems.map((item) => [
        Number(item.va_nummer),
        item,
      ])
    );

    for (let va = startVa; va <= endVa; va++) {
      const item = finalByVa.get(va);
      const status = String(
        item?.status || ""
      ).toLowerCase();

      if (terminalStatuses.has(status)) {
        continue;
      }

      const error = new Error(
        item
          ? `VA ${va} bleef na workerfase in status "${status || "onbekend"}".`
          : `VA ${va} had na workerfase nog geen itemstatus.`
      );

      if (
        !attemptCounts.has(String(va))
      ) {
        attemptCounts.set(String(va), 0);
      }

      await terminalReview(
        va,
        error,
        "final_safety_review"
      );
    }

    // Opnieuw ophalen na finale vangrail, zodat status
    // en fouttelling werkelijk uit de database volgen.
    const completedItems = [];
    from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("fighter_startverbod_history_items")
        .select(
          "va_nummer,status,error_type,found_count"
        )
        .eq("run_id", run.id)
        .order("va_nummer", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const rows = data ?? [];
      completedItems.push(...rows);

      if (rows.length < pageSize) break;
      from += pageSize;
    }

    const expectedCount =
      endVa - startVa + 1;

    const terminalCount =
      completedItems.filter((item) =>
        terminalStatuses.has(
          String(
            item.status || ""
          ).toLowerCase()
        )
      ).length;

    const hasReviewErrors =
      completedItems.some(
        (item) =>
          String(item.error_type || "") ===
          "pending_review"
      );

    if (terminalCount < expectedCount) {
      // Dit hoort praktisch niet meer voor te komen,
      // maar de run blijft hervatbaar in plaats van "failed".
      stats.lastError = `Na finale vangrail ${terminalCount}/${expectedCount} terminaal.`;
      await persistRun("paused", null);

      console.log(
        `[historie] ⚠️ run ${run.id} niet volledig terminaal; gepauzeerd voor veilige hervatting`
      );

      return {
        ok: true,
        run_id: run.id,
        status: "paused",
        ...stats,
      };
    }

    const finalStatus =
      hasReviewErrors
        ? "completed_with_errors"
        : "completed";

    await persistRun(
      finalStatus,
      new Date().toISOString()
    );

    console.log(
      `[historie] 🏁 run ${run.id}: ${finalStatus} | terminaal=${terminalCount}/${expectedCount} | verwerkt=${stats.processed} | historie=${stats.found} | fouten=${stats.errors}`
    );

    return {
      ok: true,
      run_id: run.id,
      status: finalStatus,
      ...stats,
    };
  } catch (error) {
    // Alleen een echt proces-/infrastructuurprobleem mag de run hier stoppen.
    // Maak hem hervatbaar in plaats van alle voortgang kwijt te raken.
    await supabase
      .from("fighter_startverbod_history_runs")
      .update({
        status: "paused",
        last_error:
          error?.message ?? String(error),
        pid: null,
        finished_at: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", run.id)
      .catch(() => {});

    throw error;
  } finally {
    await browser?.close().catch(() => {});
  }
}

if (cliCommand) {
  scraperHistoricalStartverbod()
    .then((result) => {
      console.log(JSON.stringify(result));
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
