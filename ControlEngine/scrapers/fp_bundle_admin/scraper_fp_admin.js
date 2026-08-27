// ControlEngine/scrapers/fp_bundle_admin/scraper_fp_admin.js
//
// Gebaseerd op de actuele fp_total worker/session-flow.
// Verschil met fp_total is ALLEEN wat per VA wordt uitgelezen:
//   - licentie Ja/Nee
//   - Fit to fight / Startverbod
//   - keurmerk op huidige (onderste) sportschool
//
// Belangrijk:
//   - 1 schone master-login voor de hele run
//   - workers delen die login/browser
//   - ELKE VA opent een volledig verse fighterpage
//   - na die VA wordt die page gesloten
//   - GEEN browsercontext/incognito-context per worker
//   - GEEN hergebruik van fighterpage-state tussen VA's
//   - EXACT Total: 1 masterpage blijft open; fresh session + actuele mastercookies alleen in memory
//
// Start:
// node scraper_fp_admin.js <matchmaking_id> <controle_run_id> <va1> <va2> ...

import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import { openFighterPageVerified } from "../utils/fightPassportFighterNavigation.js";
import supabase from "../utils/supabaseClient.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function throwIfAborted(signal, va = "") {
  if (signal?.aborted) {
    const err = new Error(`SCRAPE_ABORTED${va ? ` VA ${va}` : ""}`);
    err.name = "AbortError";
    throw err;
  }
}

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

async function hardClosePage(page) {
  if (!page) return;

  try {
    const client = await page.target().createCDPSession();
    await client.send("Page.stopLoading").catch(() => {});
    await client.detach().catch(() => {});
  } catch {}

  try {
    await page.close({ runBeforeUnload: true }).catch(() => {});
  } catch {}
}


async function waitForMasterDashboardReady(page, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const state = await page.evaluate(() => {
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

      const loginInput = document.querySelector("input.gebruikersnaam");
      const unlockInput =
        document.querySelector("input.pincode") ||
        document.querySelector("input.target_input.pincode") ||
        document.querySelector("input[class*='pincode']");

      const body = String(document.body?.innerText || "").toLowerCase();
      const href = String(location.href || "").toLowerCase();

      return {
        loginVisible: !!loginInput && visible(loginInput),
        unlockVisible: !!unlockInput && visible(unlockInput),
        dashboardSignal:
          body.includes("afmelden") ||
          body.includes("uitloggen") ||
          [...document.querySelectorAll(".tileHeader")].some((el) => visible(el)),
        href,
      };
    }).catch(() => null);

    if (
      state &&
      !state.loginVisible &&
      !state.unlockVisible &&
      !state.href.includes("#login") &&
      !state.href.includes("/login") &&
      state.dashboardSignal
    ) {
      return true;
    }

    await sleep(250);
  }

  throw new Error("MASTER_NOT_READY: masterpage niet stabiel op dashboard");
}

async function closeAnyModal(page) {
  const selectors = [
    "button#sluit_inr_detail",
    "button.sluit_scherm.overview",
    "button.sluit_scherm",
    "img.sluit_modal",
    "button.ui-dialog-titlebar-close",
  ];

  for (const selector of selectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        await sleep(100);
      }
    } catch {}
  }

  try {
    await page.keyboard.press("Escape");
    await sleep(60);
  } catch {}
}

const MATCHMAKING_ID = String(process.argv[2] || "").trim();
const CONTROLE_RUN_ID = String(process.argv[3] || "").trim();

const INITIAL_VA_LIST = [
  ...new Set(
    process.argv
      .slice(4)
      .map((value) => String(value ?? "").replace(/\D/g, ""))
      .filter((value) => /^\d{3,6}$/.test(value)),
  ),
];

const WORKERS_RAW = Number(
  process.env.FP_ADMIN_WORKERS ?? process.env.WORKERS ?? "10",
);
const WORKERS =
  Number.isFinite(WORKERS_RAW) && WORKERS_RAW > 0
    ? Math.min(20, Math.max(1, Math.floor(WORKERS_RAW)))
    : 10;

// Zelfde model/defaults als actuele Total.
const STAGGER = Math.max(0, Number(process.env.STAGGER_MS ?? "450"));
const WORKER_DRIFT_MAX_MS = Math.max(
  0,
  Number(process.env.FP_ADMIN_WORKER_DRIFT_MAX_MS ?? "250"),
);

const MAX_LOGIN_RETRIES_PER_VA = Math.max(
  1,
  Number(process.env.FP_ADMIN_LOGIN_RETRIES ?? "1"),
);

const MAX_TRANSIENT_RETRIES_PER_VA = Math.max(
  0,
  Number(process.env.FP_ADMIN_TRANSIENT_RETRIES ?? "1"),
);

const SCRAPE_TIMEOUT_RAW = Number(
  process.env.FP_ADMIN_TIMEOUT_MS ?? "120000",
);
const SCRAPE_TIMEOUT_MS = Number.isFinite(SCRAPE_TIMEOUT_RAW)
  ? Math.max(30000, SCRAPE_TIMEOUT_RAW)
  : 120000;

// In route-modus beslist de start-route na alle 3 processen en de verse
// herstelronde of de totale check compleet is. Een child mag dus partieel
// eindigen zonder de hele route al af te breken.
const ALLOW_INCOMPLETE_EXIT =
  String(process.env.FP_ADMIN_ALLOW_INCOMPLETE_EXIT ?? "0") === "1";

let stopRequested = false;

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    if (!stopRequested) {
      stopRequested = true;
      console.log(
        `[fp-admin] ⏸️ ${signal} ontvangen: geen nieuwe VA's meer uitdelen; lopende workers ronden af.`,
      );
    }
  });
}

function isBrowserConnectionError(message) {
  return /Connection closed|Target closed|Session closed|Protocol error|browser has disconnected|Not connected to DevTools/i.test(
    String(message || ""),
  );
}

async function readHeaderVa(page) {
  try {
    return await page.evaluate(() => {
      const header = document.querySelector(".koptekst1");
      const text = String(header?.innerText || "").trim();
      const match = text.match(/\((\d{3,6})\)\s*$/);
      return match ? match[1] : null;
    });
  } catch {
    return null;
  }
}

async function readLicenseAndStartverbod(page, va, signal = null) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 12000) {
    throwIfAborted(signal, va);

    const result = await page
      .evaluate((requestedVa) => {
        const tab = document.querySelector(
          `.internal_tab.va_vechter_${requestedVa}`,
        );
        if (!tab) return null;

        const paragraphs = [...tab.querySelectorAll("p")]
          .map((el) =>
            String(el.textContent || "")
              .replace(/\s+/g, " ")
              .trim(),
          )
          .filter(Boolean);

        const licentieJa = paragraphs.some((text) =>
          /^licentie\s*:\s*ja$/i.test(text),
        );

        const licentieNee = paragraphs.some((text) =>
          /^licentie\s*:\s*nee$/i.test(text),
        );

        const startverbod = paragraphs.some(
          (text) => text.toLowerCase() === "startverbod",
        );

        const fitToFight = paragraphs.some(
          (text) => text.toLowerCase() === "fit to fight",
        );

        return {
          licentie_ok: licentieJa ? true : licentieNee ? false : null,
          startverbod_actief: startverbod
            ? true
            : fitToFight
              ? false
              : null,
        };
      }, String(va))
      .catch(() => null);

    if (
      result &&
      typeof result.licentie_ok === "boolean" &&
      typeof result.startverbod_actief === "boolean"
    ) {
      return result;
    }

    await sleep(150);
  }

  throw new Error(
    `Licentie/startverbod niet volledig leesbaar voor VA ${va}`,
  );
}

async function openSportscholenTile(page, va, signal = null) {
  throwIfAborted(signal, va);

  // Zelfde gedrag als Total clickTile(): eerst bestaande overlay weg,
  // tegel op exact deze VA-tab aanklikken, daarna FP tijd geven om te renderen.
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(80);

  const startedAt = Date.now();

  while (Date.now() - startedAt < 10000) {
    throwIfAborted(signal, va);

    const clicked = await page.evaluate((requestedVa) => {
      const tab = document.querySelector(
        `.internal_tab.va_vechter_${requestedVa}`,
      );
      if (!tab) return false;

      const header = [
        ...tab.querySelectorAll(".tileHeader.enabled, .tileHeader"),
      ].find(
        (el) =>
          String(el.innerText || el.textContent || "")
            .trim()
            .toUpperCase() === "SPORTSCHOLEN",
      );

      const tile = header?.closest(".tile");
      if (!tile) return false;

      tile.scrollIntoView?.({ block: "center" });
      tile.click();
      return true;
    }, String(va)).catch(() => false);

    if (clicked) {
      // Total wacht na clickTile 700ms en scrapeTileTable nog 400ms.
      // Zelfde renderbudget hier vóór het pollen van de echte rijen.
      await sleep(1100);
      return true;
    }

    await sleep(100);
  }

  return false;
}

async function readCurrentSportschool(page, va, signal = null) {
  const opened = await openSportscholenTile(page, va, signal);

  if (!opened) {
    throw new Error(`SPORTSCHOLEN-tegel niet gevonden voor VA ${va}`);
  }

  // Niet op .dialog_header vertrouwen. Total leest zichtbare tabellen/rijen
  // rechtstreeks; lokaal zie je de rijen ook al terwijl die header-check soms faalt.
  //
  // Poll daarom de echte niet-filler rijen totdat de ONDERSTE rij compleet is:
  // kolom 0 = keurmerkschild
  // kolom 1 = sportschoolnaam (altijd gevuld)
  // kolom 2 = plaats (mag leeg zijn)
  // één-na-laatste = land (altijd gevuld)
  // laatste = type
  const startedAt = Date.now();
  let lastState = null;

  while (Date.now() - startedAt < 12000) {
    throwIfAborted(signal, va);

    const state = await page.evaluate(() => {
      const clean = (value) =>
        String(value || "")
          .replace(/\u00a0/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const isVisible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      // SYS42 kan meerdere overview_table_body's in de DOM laten staan.
      // Pak een zichtbare body met echte rijen; val daarna terug op zichtbare tabellen.
      const bodies = [...document.querySelectorAll("#overview_table_body")];
      let body =
        bodies.find((candidate) => {
          if (!isVisible(candidate)) return false;
          return [...candidate.querySelectorAll("tr.flexlist_row")]
            .some((row) => !row.classList.contains("filler"));
        }) ||
        bodies.find(isVisible) ||
        null;

      let realRows = body
        ? [...body.querySelectorAll("tr.flexlist_row")]
            .filter((row) => !row.classList.contains("filler"))
        : [];

      // Total gebruikt generieke zichtbare tabellen. Als SYS42 de body niet
      // netjes onder #overview_table_body hangt, zoek dezelfde echte datarijen
      // binnen alle zichtbare tabellen.
      if (!realRows.length) {
        const visibleTables = [...document.querySelectorAll("table")]
          .filter(isVisible);

        for (const table of visibleTables) {
          const candidates = [...table.querySelectorAll("tr.flexlist_row")]
            .filter((row) => !row.classList.contains("filler"));
          if (candidates.length) {
            realRows = candidates;
            break;
          }
        }
      }

      if (!realRows.length) {
        return {
          ok: false,
          reason: "nog_geen_echte_rijen",
          realRowCount: 0,
        };
      }

      const currentRow = realRows[realRows.length - 1];
      const cells = [...currentRow.querySelectorAll("td")];

      if (cells.length < 4) {
        return {
          ok: false,
          reason: "onderste_rij_te_weinig_kolommen",
          cellCount: cells.length,
          realRowCount: realRows.length,
        };
      }

      const sportschool = clean(cells[1]?.textContent);
      const plaats = clean(cells[2]?.textContent);
      const land = clean(cells[cells.length - 2]?.textContent);
      const iconHtml = String(cells[0]?.innerHTML || "");

      if (!sportschool || !land) {
        return {
          ok: false,
          reason: !sportschool
            ? "sportschool_kolom_2_nog_leeg"
            : "land_een_na_laatste_nog_leeg",
          sportschool: sportschool || null,
          plaats: plaats || null,
          land: land || null,
          cellCount: cells.length,
          realRowCount: realRows.length,
        };
      }

      return {
        ok: true,
        sportschool,
        plaats: plaats || null,
        land,
        keurmerk_schild_gevonden:
          /(?:href|xlink:href)=["'][^"']*#img_132["']/i.test(iconHtml),
        cellCount: cells.length,
        realRowCount: realRows.length,
      };
    }).catch(() => ({
      ok: false,
      reason: "evaluate_fout",
    }));

    lastState = state;

    if (
      state?.ok &&
      state?.sportschool &&
      state?.land
    ) {
      await closeAnyModal(page).catch(() => {});
      return state;
    }

    await sleep(150);
  }

  await closeAnyModal(page).catch(() => {});

  throw new Error(
    `Sportschooltabel niet tijdig compleet voor VA ${va} ` +
    `(${lastState?.reason || "unknown"}; ` +
    `naam=${lastState?.sportschool ?? "-"}; ` +
    `plaats=${lastState?.plaats ?? "-"}; ` +
    `land=${lastState?.land ?? "-"}; ` +
    `rijen=${lastState?.realRowCount ?? "?"}; ` +
    `kolommen=${lastState?.cellCount ?? "?"})`,
  );
}

function calculateKeurmerkOk(land, shield) {
  const normalizedLand = String(land ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // Buiten Nederland is geen keurmerk vereist.
  if (normalizedLand !== "nederland") return true;

  // Nederlandse sportschool: blauw #img_132-schild verplicht.
  return shield === true;
}

async function saveResult({
  va,
  licentie_ok,
  startverbod_actief,
  keurmerk_ok,
  sportschool,
  land,
  keurmerk_schild_gevonden,
  error_message = null,
}) {
  const vaNummer = String(va);

  // controle_fighter_actueel betekent letterlijk ACTUEEL:
  // per matchmaking + VA mag er maar één rij overblijven.
  //
  // De bestaande database heeft nog een conflict-key mét controle_run_id.
  // Daarom ruimen we vóór iedere save alle oudere rijen voor exact deze
  // matchmaking + VA op. Zo werkt dit direct zonder database-migratie en
  // stapelen oude controleruns hier nooit meer op.
  const { error: deleteError } = await supabase
    .from("controle_fighter_actueel")
    .delete()
    .eq("matchmaking_id", MATCHMAKING_ID)
    .eq("va_nummer", vaNummer);

  if (deleteError) {
    throw new Error(
      `oude controle_fighter_actueel rij verwijderen mislukt voor VA ${va}: ${deleteError.message}`,
    );
  }

  const { error } = await supabase
    .from("controle_fighter_actueel")
    .upsert(
      {
        matchmaking_id: MATCHMAKING_ID,
        controle_run_id: CONTROLE_RUN_ID,
        va_nummer: vaNummer,
        licentie_ok,
        startverbod_actief,
        keurmerk_ok,
        sportschool: sportschool ?? null,
        land: land ?? null,
        keurmerk_schild_gevonden:
          typeof keurmerk_schild_gevonden === "boolean"
            ? keurmerk_schild_gevonden
            : null,
        source: "fightpassport_live",
        checked_at: new Date().toISOString(),
        error_message,
      },
      {
        onConflict: "matchmaking_id,controle_run_id,va_nummer",
      },
    );

  if (error) {
    throw new Error(
      `controle_fighter_actueel opslaan mislukt voor VA ${va}: ${error.message}`,
    );
  }
}

async function saveError(va, message) {
  await saveResult({
    va,
    licentie_ok: null,
    startverbod_actief: null,
    keurmerk_ok: null,
    sportschool: null,
    land: null,
    keurmerk_schild_gevonden: null,
    error_message: message,
  }).catch((error) => {
    console.error(
      `[fp-admin] foutstatus opslaan VA ${va}:`,
      error?.message ?? error,
    );
  });
}

async function scrapeOne(page, va, signal = null) {
  throwIfAborted(signal, va);

  const openedVa = await readHeaderVa(page);

  if (String(openedVa || "") !== String(va)) {
    throw new Error(
      `VA mismatch vóór scrape: gevraagd ${va}, geopend ${openedVa || "onbekend"}`,
    );
  }

  const summary = await readLicenseAndStartverbod(page, va, signal);
  const school = await readCurrentSportschool(page, va, signal);

  const keurmerk_ok = calculateKeurmerkOk(
    school.land,
    school.keurmerk_schild_gevonden,
  );

  await saveResult({
    va,
    licentie_ok: summary.licentie_ok,
    startverbod_actief: summary.startverbod_actief,
    keurmerk_ok,
    sportschool: school.sportschool,
    land: school.land,
    keurmerk_schild_gevonden: school.keurmerk_schild_gevonden,
    error_message: null,
  });

  return {
    licentie_ok: summary.licentie_ok,
    startverbod_actief: summary.startverbod_actief,
    keurmerk_ok,
    land: school.land,
    sportschool: school.sportschool,
    schild: school.keurmerk_schild_gevonden,
  };
}

async function run() {
  if (!MATCHMAKING_ID || !CONTROLE_RUN_ID) {
    throw new Error(
      "Gebruik: node scraper_fp_admin.js <matchmaking_id> <controle_run_id> <va...>",
    );
  }

  if (!INITIAL_VA_LIST.length) {
    console.log("[fp-admin] Geen VA-nummers ontvangen.");
    return;
  }

  // 1 master-sessie per proces, maar alle 3 deelprocessen hergebruiken dezelfde opgeslagen trusted-device cookies.
  let { browser, page: masterPage } = await loginFightPassport({
    freshSession: true,
    saveCookiesToDisk: false,
  });

  // Master is de vaste anker-tab van dit child-proces.
  // Eerst volledig/stabiel inloggen en op dashboard blijven; pas daarna workers starten.
  await waitForMasterDashboardReady(masterPage);

  let browserGeneration = 1;
  let browserRestartPromise = null;

  let cookies = [];
  try {
    cookies = await masterPage.cookies();
  } catch {}

  console.log(
    "[fp-admin] ✅ Schone master-sessie gestart; masterpage blijft open; workers delen actuele sessiecookies",
  );

  async function restartBrowserLocked(reason = "") {
    if (browserRestartPromise) {
      await browserRestartPromise;
      return browserGeneration;
    }

    browserRestartPromise = (async () => {
      console.log(
        `[fp-admin] 🔄 volledige browser opnieuw starten ${reason ? `(${reason})` : ""}`,
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

      await waitForMasterDashboardReady(masterPage);

      try {
        cookies = await masterPage.cookies();
      } catch {
        cookies = [];
      }

      browserGeneration++;

      console.log(
        `[fp-admin] ✅ browser hersteld; generatie ${browserGeneration}`,
      );

      return browserGeneration;
    })();

    try {
      return await browserRestartPromise;
    } finally {
      browserRestartPromise = null;
    }
  }

  let masterRefreshPromise = null;

  async function refreshMasterSessionLocked(reason = "") {
    if (masterRefreshPromise) {
      try {
        await masterRefreshPromise;
      } catch {}
      return cookies;
    }

    masterRefreshPromise = (async () => {
      console.log(
        `[fp-admin] 🔁 master ensureLoggedIn(force) start ${reason ? `(${reason})` : ""}`,
      );

      await ensureLoggedIn(masterPage, {
        force: true,
        saveCookiesToDisk: false,
        useStoredCookies: false,
      });

      await waitForMasterDashboardReady(masterPage);

      try {
        cookies = await masterPage.cookies();
      } catch {}

      console.log(
        "[fp-admin] ✅ master refreshed (cookies updated)",
      );

      return cookies;
    })();

    try {
      return await masterRefreshPromise;
    } finally {
      masterRefreshPromise = null;
    }
  }

  const vaList = [...INITIAL_VA_LIST];
  let idx = 0;
  let activeAttempts = 0;

  const loginRetryCounts = new Map();
  const transientRetryCounts = new Map();

  let successCount = 0;
  const permanentErrors = [];

  async function requeueTransientVa(va, label, reason) {
    const key = String(va);
    const retryNr = (transientRetryCounts.get(key) || 0) + 1;

    if (retryNr > MAX_TRANSIENT_RETRIES_PER_VA) {
      return false;
    }

    transientRetryCounts.set(key, retryNr);

    // Exact Total-model: dezelfde VA achteraan als VOLLEDIG VERSE page-poging.
    vaList.push(key);

    console.log(
      `[fp-admin] ♻️ ${label} VA ${va} achteraan opnieuw ingepland ` +
        `(poging ${retryNr + 1}/${MAX_TRANSIENT_RETRIES_PER_VA + 1}). Oorzaak: ${reason}`,
    );

    return true;
  }

  async function workerLoop(workerIdx) {
    const workerStartDelay = workerIdx * STAGGER;
    if (workerStartDelay > 0) {
      await sleep(workerStartDelay);
    }

    // Exact Total/Historisch-model:
    // worker = alleen async taakverdeler.
    // Geen aparte browsercontext.
    while (!stopRequested) {
      if (idx >= vaList.length) {
        if (activeAttempts > 0) {
          await sleep(100);
          continue;
        }

        break;
      }

      const myIdx = idx++;

      if (myIdx >= vaList.length) {
        await sleep(50);
        continue;
      }

      activeAttempts++;

      const va = vaList[myIdx];
      const label = `worker${workerIdx + 1}/${WORKERS}`;
      const vaBrowserGeneration = browserGeneration;

      // Per VA ALTIJD verse page; nooit hergebruiken.
      let page = null;

      try {
        console.log(`[fp-admin] 🤖 ${label} → VA ${va}`);

        page = await openFighterPageVerified(
          browser,
          null,
          cookies,
          va,
          {
            maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
            softWaitMs: Math.min(
              200,
              Math.max(
                0,
                Number(process.env.SOFT_WAIT_MS ?? "200"),
              ),
            ),
            betweenAttemptsMs: Number(
              process.env.BETWEEN_ATTEMPTS_MS ?? "350",
            ),
            workerLabel: `[${label}]`,
          },
        );

        if (!page) {
          const requeued = await requeueTransientVa(
            va,
            label,
            "fighter-url/profiel niet betrouwbaar geopend",
          );

          if (requeued) {
            console.log(
              `[fp-admin] 🚪 ${label} VA ${va}: mislukte verse page gesloten; later volledig vers opnieuw`,
            );
            continue;
          }

          throw new Error(
            "Na 2 volledig verse profielpogingen geen geldige fighterpage gevonden.",
          );
        }

        const result = await withTimeout(
          (signal) => scrapeOne(page, va, signal),
          SCRAPE_TIMEOUT_MS,
          `fp-admin ${va}`,
          async () => {
            await hardClosePage(page).catch(() => {});
            page = null;
          },
        );

        loginRetryCounts.delete(String(va));
        transientRetryCounts.delete(String(va));
        successCount++;

        console.log(
          `[fp-admin] ✅ ${label} VA ${va} ` +
            `licentie=${result.licentie_ok ? "Ja" : "Nee"} | ` +
            `startverbod=${result.startverbod_actief ? "Ja" : "Nee"} | ` +
            `keurmerk=${result.keurmerk_ok ? "Ja" : "Nee"}`,
        );
      } catch (error) {
        const message = error?.message ?? String(error);

        if (message === "LOGIN_PAGE") {
          await hardClosePage(page).catch(() => {});
          page = null;

          const retryKey = String(va);
          const retryNr =
            (loginRetryCounts.get(retryKey) || 0) + 1;

          loginRetryCounts.set(retryKey, retryNr);

          if (retryNr <= MAX_LOGIN_RETRIES_PER_VA) {
            console.log(
              `[fp-admin] 🔐 ${label} LOGIN_PAGE bij VA ${va}; ` +
                `verse page dicht → alleen master-login herstellen ` +
                `(herstel ${retryNr}/${MAX_LOGIN_RETRIES_PER_VA})`,
            );
          } else {
            console.warn(
              `[fp-admin] ⚠️ ${label} LOGIN_PAGE bij VA ${va}; ` +
                `interne login-herstelpoging al gebruikt. VA blijft incompleet voor de verse herstelronde.`,
            );
          }

          try {
            if (retryNr <= MAX_LOGIN_RETRIES_PER_VA) {
              await refreshMasterSessionLocked(
                `LOGIN_PAGE from ${label} VA ${va}`,
              );

              // Daarna exact dezelfde VA achteraan; volgende keer weer een VOLLEDIG verse page.
              vaList.push(retryKey);
            } else {
              throw new Error(
                `LOGIN_PAGE bleef terugkomen na ${MAX_LOGIN_RETRIES_PER_VA} herstelpoging(en).`,
              );
            }
          } catch (loginError) {
            const msg =
              loginError?.message ?? String(loginError);

            permanentErrors.push({ va, message: msg });
            await saveError(va, msg);
          }
        } else if (isBrowserConnectionError(message)) {
          try {
            if (vaBrowserGeneration === browserGeneration) {
              await restartBrowserLocked(`${label} VA ${va}`);
            } else {
              console.log(
                `[fp-admin] ♻️ ${label} gebruikte oude browsergeneratie ${vaBrowserGeneration}; ` +
                  `actuele generatie is ${browserGeneration}. Geen extra browserherstart.`,
              );
            }

            const requeued = await requeueTransientVa(
              va,
              label,
              `browserverbinding hersteld: ${message}`,
            );

            if (!requeued) {
              throw new Error(
                `Browserverbinding bleef fout na ${MAX_TRANSIENT_RETRIES_PER_VA + 1} verse pogingen: ${message}`,
              );
            }
          } catch (restartError) {
            const msg =
              restartError?.message ?? String(restartError);

            permanentErrors.push({ va, message: msg });
            await saveError(va, msg);
          }
        } else {
          const requeued = await requeueTransientVa(
            va,
            label,
            message,
          );

          if (!requeued) {
            permanentErrors.push({ va, message });
            await saveError(va, message);

            console.error(
              `[fp-admin] ❌ ${label} VA ${va}: ${message}`,
            );
          }
        }
      } finally {
        // CRUCIAAL: iedere VA-page weg.
        // De volgende VA krijgt altijd een volledig nieuwe page.
        if (page) {
          await closeAnyModal(page).catch(() => {});
          await hardClosePage(page).catch(() => {});
        }

        activeAttempts = Math.max(0, activeAttempts - 1);

        if (!stopRequested && WORKER_DRIFT_MAX_MS > 0) {
          const driftMs =
            ((workerIdx + 1) * 37 + (Number(va) % 97)) %
            (WORKER_DRIFT_MAX_MS + 1);

          if (driftMs > 0) {
            await sleep(driftMs);
          }
        }
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: WORKERS }, (_, i) => workerLoop(i)),
    );
  } finally {
    try {
      await masterPage?.close();
    } catch {}

    try {
      await browser?.close();
    } catch {}
  }

  const originalVaSet = [...new Set(INITIAL_VA_LIST)];

  const { data: results, error: resultError } = await supabase
    .from("controle_fighter_actueel")
    .select(
      "va_nummer,licentie_ok,startverbod_actief,keurmerk_ok,error_message",
    )
    .eq("matchmaking_id", MATCHMAKING_ID)
    .eq("controle_run_id", CONTROLE_RUN_ID)
    .in("va_nummer", originalVaSet);

  if (resultError) {
    throw resultError;
  }

  const complete = (results ?? []).filter(
    (row) =>
      !row?.error_message &&
      typeof row?.licentie_ok === "boolean" &&
      typeof row?.startverbod_actief === "boolean" &&
      typeof row?.keurmerk_ok === "boolean",
  );

  console.log(
    `[fp-admin] 🏁 klaar: ${complete.length}/${originalVaSet.length} VA's compleet`,
  );

  if (
    permanentErrors.length > 0 ||
    complete.length !== originalVaSet.length
  ) {
    const message =
      `Admin live-check niet compleet: ${complete.length}/${originalVaSet.length} succesvol.`;

    if (ALLOW_INCOMPLETE_EXIT) {
      console.warn(
        `[fp-admin] ⚠️ ${message} Start-route bepaalt de ontbrekende VA's en doet zo nodig de verse herstelronde.`,
      );
      return;
    }

    throw new Error(message);
  }
}

run().catch((error) => {
  console.error(
    "[fp-admin] ❌ fatale fout:",
    error?.stack ?? error,
  );
  process.exit(1);
});
