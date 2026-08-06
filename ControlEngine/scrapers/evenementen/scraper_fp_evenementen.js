import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const START_EVENT = Number(process.argv[2] || process.env.FP_EVENTS_START || 77);
const END_EVENT = Number(process.argv[3] || process.env.FP_EVENTS_END || 5000);
const WORKERS = Math.min(20, Math.max(1, Number(process.env.FP_EVENTS_WORKERS || 20)));
const RESUME_RUN_ID = String(process.env.FP_EVENTS_RUN_ID || "").trim();
const STAGGER_MS = Math.max(0, Number(process.env.FP_EVENTS_STAGGER_MS || 1000));
const PAGE_TIMEOUT_MS = Math.max(30000, Number(process.env.FP_EVENTS_PAGE_TIMEOUT_MS || 60000));
const MAX_CONSECUTIVE_MISSING = Math.max(0, Number(process.env.FP_EVENTS_MAX_CONSECUTIVE_MISSING || 0));

if (!Number.isInteger(START_EVENT) || !Number.isInteger(END_EVENT) || START_EVENT < 1 || END_EVENT < START_EVENT) {
  throw new Error(`Ongeldig evenementbereik: ${START_EVENT}-${END_EVENT}`);
}

let stopRequested = false;
let signalCount = 0;
let activeBrowser = null;
let forceExitStarted = false;

async function forceShutdown(signal) {
  if (forceExitStarted) return;
  forceExitStarted = true;
  console.log(`[fp-events] ${signal} opnieuw ontvangen; browser en scraper worden direct afgesloten.`);

  const hardExit = setTimeout(() => process.exit(130), 5000);
  hardExit.unref?.();

  try {
    await activeBrowser?.close?.();
  } catch (error) {
    console.error("[fp-events] browser geforceerd sluiten mislukt:", error?.message || String(error));
  } finally {
    process.exit(130);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    signalCount += 1;

    if (signalCount === 1) {
      stopRequested = true;
      console.log(
        `[fp-events] ${signal} ontvangen; geen nieuwe evenementnummers meer uitdelen. ` +
        "Lopende workers worden afgerond. Druk nogmaals Ctrl+C voor direct stoppen.",
      );
      return;
    }

    void forceShutdown(signal);
  });
}

function eventUrl(eventId) {
  return `https://fightpassport.nl/#va_evenement/${eventId}`;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseNlDate(value) {
  const input = normalizeText(value);
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const match = input.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!match) return null;
  let year = match[3];
  if (year.length === 2) year = Number(year) < 30 ? `20${year}` : `19${year}`;
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

async function isLoginPage(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const pin = document.querySelector("input.pincode, input[class*='pincode']");
    if (visible(pin)) return false;
    if (visible(document.querySelector("input.gebruikersnaam"))) return true;
    return /login|aanmeld/i.test(location.hash || location.href);
  }).catch(() => false);
}

async function hardClosePage(page) {
  if (!page) return;
  try {
    const client = await page.target().createCDPSession();
    await client.send("Page.stopLoading").catch(() => {});
    await client.detach().catch(() => {});
  } catch {}
  await page.close({ runBeforeUnload: true }).catch(() => {});
}

async function createWorkerContext(browser) {
  if (typeof browser.createBrowserContext === "function") return browser.createBrowserContext();
  if (typeof browser.createIncognitoBrowserContext === "function") return browser.createIncognitoBrowserContext();
  return null;
}

async function closeWorkerContext(context) {
  if (!context) return;
  const pages = await context.pages().catch(() => []);
  for (const page of pages) await hardClosePage(page);
  await context.close().catch(() => {});
}

async function readEventState(page, requestedEventId) {
  return page.evaluate((eventId) => {
    const clean = (value) => String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const bodyText = clean(document.body?.innerText || "");
    const hash = String(location.hash || "");
    const tab = document.querySelector(`.internal_tab.va_evenement_${eventId}`);
    const anyEventTab = document.querySelector("[class*='internal_tab'][class*='va_evenement_']");
    const tabClass = anyEventTab?.className || "";
    const tabMatch = String(tabClass).match(/va_evenement_(\d+)/);
    const loadedEventId = tab ? String(eventId) : (tabMatch?.[1] || null);
    // FightPassport gebruikt onder meer: "Onbekende id (code 705)".
    // Accepteer ook oudere varianten zoals "Onbekende code (705)".
    const has705 =
      /onbekende\s*(?:id|code).*?(?:code\s*)?\(?\s*705\s*\)?/i.test(bodyText) ||
      (/\b705\b/.test(bodyText) && /onbekende\s*(?:id|code)/i.test(bodyText));
    const headers = [...(tab?.querySelectorAll(".tileHeader") || [])]
      .map((el) => clean(el.innerText).toUpperCase());

    // De detail-inputs uit de aangeleverde outerHTML verschijnen pas NADAT
    // de DETAILS-tegel is geopend. Ze mogen dus niet worden gebruikt om de
    // eerste eventpagina te valideren. Net als FP Total valideren we eerst de
    // exacte interne tab en de tegel-shell van het gevraagde nummer.
    const hasEventShell =
      !!tab &&
      headers.includes("DETAILS") &&
      headers.includes("MATCHMAKING") &&
      headers.includes("UITSLAGEN");

    return {
      hash,
      loadedEventId,
      hasRequestedTab: !!tab,
      hasEventShell,
      has705,
      headers,
      bodySample: bodyText.slice(0, 1000),
    };
  }, String(requestedEventId));
}

async function forceExactEventUrl(page, eventId, timeoutMs = PAGE_TIMEOUT_MS) {
  const requestedEventId = String(eventId);
  const wantedHash = `#va_evenement/${requestedEventId}`;
  const wantedUrl = eventUrl(requestedEventId);
  const startedAt = Date.now();
  let lastForcedAt = 0;
  let hardReloads = 0;
  let lastState = null;

  while (Date.now() - startedAt < timeoutMs) {
    if (await isLoginPage(page)) throw new Error("LOGIN_PAGE");

    lastState = await readEventState(page, requestedEventId);

    // 705 is geen scraperfout: dit evenementnummer bestaat niet.
    if (lastState?.has705) {
      return { status: "not_found", state: lastState };
    }

    const exactLoaded =
      lastState?.hasRequestedTab &&
      lastState?.hasEventShell &&
      String(lastState?.loadedEventId || "") === requestedEventId &&
      String(lastState?.hash || "") === wantedHash;

    if (exactLoaded) {
      await sleep(500);
      const confirm = await readEventState(page, requestedEventId);

      if (confirm?.has705) {
        return { status: "not_found", state: confirm };
      }

      if (
        confirm?.hasRequestedTab &&
        confirm?.hasEventShell &&
        String(confirm?.loadedEventId || "") === requestedEventId &&
        String(confirm?.hash || "") === wantedHash
      ) {
        return { status: "found", state: confirm };
      }
    }

    const now = Date.now();
    if (now - lastForcedAt >= 1200) {
      lastForcedAt = now;

      // Zelfde harde aanpak als FP Total: hash plus volledige URL afdwingen.
      await page.evaluate((forcedUrl, forcedHash) => {
        if (location.hash !== forcedHash) location.hash = forcedHash;
        if (location.href !== forcedUrl) {
          history.replaceState(null, "", forcedUrl);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
      }, wantedUrl, wantedHash).catch(() => {});

      await sleep(600);
      const afterForce = await readEventState(page, requestedEventId).catch(() => null);

      if (afterForce?.has705) {
        return { status: "not_found", state: afterForce };
      }

      const wrongOrOldEvent =
        !afterForce?.hasRequestedTab ||
        !afterForce?.hasEventShell ||
        String(afterForce?.loadedEventId || "") !== requestedEventId ||
        String(afterForce?.hash || "") !== wantedHash;

      // Als FightPassport een oude/verkeerde tab vasthoudt, echt opnieuw naar
      // de volledige event-URL navigeren. Dit is bewust gelijk aan FP Total.
      if (wrongOrOldEvent && hardReloads < 3) {
        hardReloads += 1;
        await page.goto(wantedUrl, {
          waitUntil: "domcontentloaded",
          timeout: 25000,
        }).catch(() => {});
        await sleep(1200);
      }
    }

    await sleep(250);
  }

  console.log(`[fp-events] event ${eventId} kon niet hard op de juiste event-url worden vastgezet`, {
    urlNow: page.url(),
    state: lastState,
  });

  return { status: "timeout", state: lastState };
}

async function openEventVerified(browser, context, cookies, eventId, label) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const page = context ? await context.newPage() : await browser.newPage();
    await page.setCacheEnabled(false).catch(() => {});
    if (cookies?.length) await page.setCookie(...cookies).catch(() => {});
    await page.goto(eventUrl(eventId), { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});

    const result = await forceExactEventUrl(page, eventId).catch((error) => {
      if (error?.message === "LOGIN_PAGE") throw error;
      return { status: "timeout", state: null };
    });

    if (result.status === "found" || result.status === "not_found") return { page, ...result };
    console.log(`[fp-events] ${label} event ${eventId} poging ${attempt}: niet correct geladen`, result.state);
    await hardClosePage(page);
    await sleep(800 * attempt);
  }
  return { page: null, status: "timeout", state: null };
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
      const element = await page.$(selector);
      if (element) {
        await element.click();
        await sleep(120);
      }
    } catch {}
  }

  try {
    await page.keyboard.press("Escape");
    await sleep(80);
  } catch {}
}

async function clickDetails(page, eventId) {
  await closeAnyModal(page).catch(() => {});

  // Vlak vóór DETAILS opnieuw exact hetzelfde eventnummer afdwingen, zoals
  // FP Total dat vóór zijn DETAILS-stap ook doet.
  const exact = await forceExactEventUrl(page, eventId, 15000);
  if (exact.status !== "found") return false;
  const clicked = await page.evaluate((id) => {
    const tab = document.querySelector(`.internal_tab.va_evenement_${id}`);
    const header = [...(tab?.querySelectorAll(".tileHeader.enabled, .tileHeader") || [])]
      .find((el) => String(el.innerText || "").trim().toUpperCase() === "DETAILS");
    const tile = header?.closest(".tile");
    if (!tile) return false;
    tile.click();
    return true;
  }, String(eventId)).catch(() => false);
  if (!clicked) return false;

  const found = await page.waitForFunction(() => {
    const selectors = [
      "input.dvnaambond",
      "input.dvevenementnaam",
      "input.ddevenementdatum",
      "input.dvpromotor",
    ];

    return selectors.some((selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });
  }, { timeout: 15000 }).then(() => true).catch(() => false);

  if (found) await sleep(500);
  return found;
}

async function readOverviewTiles(page, eventId) {
  // BELANGRIJK: OFFICIALS, MATCHMAKING, UITSLAGEN, SCHORSINGEN en STARTVERBODEN
  // worden uitsluitend uit de reeds zichtbare tegeltekst gelezen.
  // Deze tegels worden absoluut niet aangeklikt.
  return page.evaluate((id) => {
    const clean = (value) => String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const tab = document.querySelector(`.internal_tab.va_evenement_${id}`);
    if (!tab) return null;

    const readVisibleTile = (title) => {
      const wanted = title.toUpperCase();
      const tile = [...tab.querySelectorAll(".tile")].find((node) => {
        const attr = clean(node.getAttribute("title")).toUpperCase();
        const head = clean(node.querySelector(".tileHeader")?.innerText).toUpperCase();
        return attr === wanted || head === wanted;
      });

      if (!tile) return { found: false, values: {}, raw: [] };

      // FightPassport gebruikt per tegel zowel li- als p-regels. Lees uitsluitend
      // zichtbare inhoud en dedupliceer een p die dezelfde tekst als zijn li bevat.
      const lines = [...new Set([...tile.querySelectorAll("ul.get_tile_content li, ul.get_tile_content p")]
        .filter((el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        })
        .map((el) => clean(el.innerText || el.textContent))
        .filter(Boolean))];

      const values = {};
      for (const line of lines) {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) values[clean(match[1]).toLowerCase()] = clean(match[2]);
      }

      return { found: true, values, raw: lines };
    };

    const readOfficialsTile = () => {
      const tile = [...tab.querySelectorAll(".tile")].find((node) => {
        const attr = clean(node.getAttribute("title")).toUpperCase();
        const head = clean(node.querySelector(".tileHeader")?.innerText).toUpperCase();
        return attr === "OFFICIALS" || head === "OFFICIALS";
      });

      if (!tile) return { found: false, rows: [], raw: [] };

      // OFFICIALS staat net als de andere gegevens al op de tegel.
      // Ook deze tegel wordt dus NIET aangeklikt.
      const lines = [...tile.querySelectorAll("ul.get_tile_content li")]
        .filter((el) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        })
        .map((el) => clean(el.innerText || el.textContent))
        .filter(Boolean);

      const rows = lines.map((line, index) => {
        const separator = line.indexOf(":");
        if (separator < 0) {
          return { volgorde: index + 1, functie: null, naam: line };
        }
        return {
          volgorde: index + 1,
          functie: clean(line.slice(0, separator)) || null,
          naam: clean(line.slice(separator + 1)) || null,
        };
      }).filter((row) => row.naam);

      return { found: true, rows, raw: lines };
    };

    return {
      officials: readOfficialsTile(),
      matchmaking: readVisibleTile("MATCHMAKING"),
      results: readVisibleTile("UITSLAGEN"),
      suspensions: readVisibleTile("SCHORSINGEN"),
      startbans: readVisibleTile("STARTVERBODEN (ter info)"),
    };
  }, String(eventId));
}

async function waitForStableOverviewTiles(page, eventId) {
  const startedAt = Date.now();
  const timeoutMs = 15000;
  let previousSnapshot = null;
  let latest = null;

  while (Date.now() - startedAt < timeoutMs) {
    latest = await readOverviewTiles(page, eventId);
    const completeTileSet = latest && [
      latest.officials,
      latest.matchmaking,
      latest.results,
      latest.suspensions,
      latest.startbans,
    ].every((tile) => tile?.found);
    const snapshot = completeTileSet ? JSON.stringify(latest) : null;

    if (snapshot !== null && snapshot === previousSnapshot) {
      const waitedMs = Date.now() - startedAt;
      console.log(`[fp-events] event ${eventId}: overzichtstegels stabiel`, {
        waited_ms: waitedMs,
        official_regels: latest.officials.rows.length,
      });
      return latest;
    }

    previousSnapshot = snapshot;
    await sleep(1000);
  }

  // Bij timeout nog eenmaal definitief lezen. Zo blijft de scrape bruikbaar als
  // FightPassport blijft muteren, zonder gegevens uit een andere eventtab te lezen.
  latest = await readOverviewTiles(page, eventId);
  console.log(`[fp-events] event ${eventId}: stabiliteitswachttijd verlopen; definitieve tegelread gebruikt`, {
    waited_ms: Date.now() - startedAt,
    official_regels: latest?.officials?.rows?.length ?? 0,
  });
  return latest;
}

async function scrapeEvent(page, eventId) {
  // Verifieer direct vóór de snapshot opnieuw de exacte event-URL en interne tab.
  const exact = await forceExactEventUrl(page, eventId, 15000);
  if (exact.status === "not_found") return { scrape_status: "not_found" };
  if (exact.status !== "found") throw new Error("Evenement kon niet op de exacte event-URL worden vastgezet");

  // Stap 1: eerst ALLE informatie uitlezen die al op de tegels staat.
  // OFFICIALS, MATCHMAKING, UITSLAGEN, SCHORSINGEN en STARTVERBODEN
  // worden niet geopend. Alleen DETAILS wordt later aangeklikt.
  const summary = await waitForStableOverviewTiles(page, eventId);
  if (!summary) throw new Error("Evenementtab verdween vóór uitlezen van de overzichtstegels");

  console.log(`[fp-events] event ${eventId}: overzichtstegels uitgelezen zonder openen`, {
    officials: summary.officials.raw,
    matchmaking: summary.matchmaking.raw,
    uitslagen: summary.results.raw,
    schorsingen: summary.suspensions.raw,
    startverboden: summary.startbans.raw,
  });

  // Stap 2: alleen DETAILS openen. Dit is de enige tegel waarop de scraper klikt.
  if (!(await clickDetails(page, eventId))) {
    throw new Error("DETAILS-tegel of detailvelden niet geladen");
  }

  const details = await page.evaluate(() => {
    const value = (selector) => {
      const el = document.querySelector(selector);
      return String(el?.value ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim() || null;
    };

    return {
      bond_naam: value("input.dvnaambond"),
      evenement_naam: value("input.dvevenementnaam"),
      evenement_datum: value("input.ddevenementdatum"),
      straatnaam: value("input.dvevenementstreetname"),
      postcode: value("input.dvevenementzip"),
      plaats: value("input.dvevenementtown"),
      promotor: value("input.dvpromotor"),
      aangemaakt_op: value("input.ddaanmaak"),
      afgehandeld_op: value("input.ddafgehandeld"),
      laatst_gewijzigd_op: value("input.ddmutatie"),
      laatst_gewijzigd_door: value("input.dvmuteerderfriendlyname"),
    };
  });

  const mm = summary.matchmaking.values;
  const results = summary.results.values;
  const suspensions = summary.suspensions.values;
  const startbans = summary.startbans.values;
  const integer = (value) => {
    const match = String(value ?? "").match(/-?\d+/);
    return match ? Number(match[0]) : null;
  };

  return {
    event_id: Number(eventId),
    bond_naam: details.bond_naam,
    evenement_naam: details.evenement_naam,
    evenement_datum: parseNlDate(details.evenement_datum),
    straatnaam: details.straatnaam,
    postcode: details.postcode,
    plaats: details.plaats,
    promotor: details.promotor,
    aangemaakt_op: parseNlDate(details.aangemaakt_op),
    afgehandeld_op: parseNlDate(details.afgehandeld_op),
    laatst_gewijzigd_op: parseNlDate(details.laatst_gewijzigd_op),
    laatst_gewijzigd_door: details.laatst_gewijzigd_door,
    matchmaking_aantal_vechters: integer(mm["aantal vechters"]),
    matchmaking_fit_to_fight: integer(mm["fit to fight"]),
    matchmaking_startverbod: integer(mm["startverbod"]),
    matchmaking_aantal_partijen: integer(mm["aantal partijen"]),
    matchmaking_nog_in_te_delen: integer(mm["nog in te delen vechters"]),
    uitslagen_aantal: integer(results["aantal"]),
    uitslagen_nog_in_te_voeren: integer(results["nog in te voeren"]),
    schorsingen_aantal: integer(suspensions["aantal"]),
    startverboden_aantal: integer(startbans["aantal"]),
    officials_count: summary.officials.rows.length,
    officials: summary.officials.rows,
    raw_json: { details, summary },
  };
}

async function saveEvent(data, runId) {
  const now = new Date().toISOString();
  const { officials = [], ...eventData } = data;
  const payload = {
    ...eventData,
    source_url: eventUrl(data.event_id),
    exists_in_fightpassport: true,
    last_seen_at: now,
    last_scraped_at: now,
    last_run_id: runId,
    updated_at: now,
  };
  const { error } = await supabase.from("fightpassport_events").upsert(payload, { onConflict: "event_id" });
  if (error) throw error;

  // Snapshot: wat nu op de OFFICIALS-tegel staat is de actuele bezetting.
  const { error: deleteOfficialsError } = await supabase
    .from("fightpassport_event_officials")
    .delete()
    .eq("event_id", Number(data.event_id));
  if (deleteOfficialsError) throw deleteOfficialsError;

  if (officials.length) {
    const rows = officials.map((official) => ({
      event_id: Number(data.event_id),
      functie: official.functie,
      naam: official.naam,
      volgorde: official.volgorde,
      last_seen_at: now,
      raw_json: official,
    }));
    const { error: officialsError } = await supabase
      .from("fightpassport_event_officials")
      .insert(rows);
    if (officialsError) throw officialsError;
  }
}

async function upsertRunItem(runId, eventId, patch) {
  const { error } = await supabase.from("fightpassport_event_sync_items").upsert({
    sync_run_id: runId,
    event_id: Number(eventId),
    ...patch,
  }, { onConflict: "sync_run_id,event_id" });
  if (error) throw error;
}

async function createOrResumeRun() {
  if (RESUME_RUN_ID) {
    const { data, error } = await supabase.from("fightpassport_event_sync_runs").select("*").eq("id", RESUME_RUN_ID).single();
    if (error || !data) throw error || new Error(`Run ${RESUME_RUN_ID} niet gevonden`);
    console.log("[fp-events] workers afgerond", { processed, found, notFound, errors, stopRequested });
    await supabase.from("fightpassport_event_sync_runs").update({ status: "running", finished_at: null, pid: process.pid }).eq("id", data.id);
    return data;
  }
  const { data, error } = await supabase.from("fightpassport_event_sync_runs").insert({
    start_event_id: START_EVENT,
    end_event_id: END_EVENT,
    status: "running",
    workers: WORKERS,
    pid: process.pid,
    started_at: new Date().toISOString(),
  }).select("*").single();
  if (error) throw error;
  return data;
}

async function main() {
  console.log("[fp-events] start", {
    pid: process.pid,
    start_event_id: START_EVENT,
    end_event_id: END_EVENT,
    workers: WORKERS,
    resume_run_id: RESUME_RUN_ID || null,
    headless: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? null,
  });
  const run = await createOrResumeRun();
  console.log("[fp-events] run aangemaakt/hervat", {
    run_id: run.id,
    start_event_id: run.start_event_id,
    end_event_id: run.end_event_id,
    workers: WORKERS,
  });
  const start = Number(run.start_event_id);
  const end = Number(run.end_event_id);

  const { data: existingItems, error: existingError } = await supabase
    .from("fightpassport_event_sync_items")
    .select("event_id,status")
    .eq("sync_run_id", run.id);
  if (existingError) throw existingError;

  const terminal = new Set(["success", "not_found"]);
  const completed = new Set((existingItems || []).filter((item) => terminal.has(item.status)).map((item) => Number(item.event_id)));
  const queue = Array.from({ length: end - start + 1 }, (_, index) => start + index).filter((id) => !completed.has(id));

  let processed = completed.size;
  let found = (existingItems || []).filter((item) => item.status === "success").length;
  let notFound = (existingItems || []).filter((item) => item.status === "not_found").length;
  let errors = (existingItems || []).filter((item) => item.status === "error").length;
  let index = 0;
  let consecutiveMissing = 0;

  console.log("[fp-events] FightPassport-login wordt geopend...");
  let { browser, page: masterPage } = await loginFightPassport();
  console.log("[fp-events] FightPassport-login gereed");
  let cookies = await masterPage.cookies().catch(() => []);
  let sessionRefresh = null;

  async function refreshSession() {
    if (sessionRefresh) return sessionRefresh;
    sessionRefresh = (async () => {
      await ensureLoggedIn(masterPage, { force: true });
      cookies = await masterPage.cookies().catch(() => []);
    })();
    try { await sessionRefresh; } finally { sessionRefresh = null; }
  }

  async function updateProgress() {
    await supabase.from("fightpassport_event_sync_runs").update({
      status: "running",
      processed_count: processed,
      found_count: found,
      not_found_count: notFound,
      error_count: errors,
      last_event_id: queue[Math.max(0, index - 1)] || null,
      pid: process.pid,
    }).eq("id", run.id);
  }

  async function worker(workerNumber) {
    await sleep(workerNumber * STAGGER_MS);
    let context = await createWorkerContext(browser);
    const label = `worker${workerNumber + 1}/${WORKERS}`;
    console.log(`[fp-events] ${label} gestart`);

    while (!stopRequested) {
      const queueIndex = index++;
      if (queueIndex >= queue.length) break;
      const eventId = queue[queueIndex];
      let page = null;
      const startedAt = new Date().toISOString();
      console.log(`[fp-events] ${label} event ${eventId} openen`);

      try {
        await upsertRunItem(run.id, eventId, { status: "processing", started_at: startedAt, finished_at: null, error_message: null });
        const opened = await openEventVerified(browser, context, cookies, eventId, label);
        page = opened.page;

        if (opened.status === "not_found") {
          processed++; notFound++; consecutiveMissing++;
          await upsertRunItem(run.id, eventId, {
            status: "not_found",
            exists_in_fightpassport: false,
            error_code: "705",
            error_message: "FightPassport toont onbekende code (705).",
            finished_at: new Date().toISOString(),
          });
          console.log(`[fp-events] — ${label} event ${eventId}: bestaat niet (705)`);
          if (MAX_CONSECUTIVE_MISSING > 0 && consecutiveMissing >= MAX_CONSECUTIVE_MISSING) stopRequested = true;
          continue;
        }
        if (opened.status !== "found" || !page) throw new Error("Evenement kon niet hard en geverifieerd worden geopend");

        const event = await scrapeEvent(page, eventId);
        if (event.scrape_status === "not_found") {
          processed++; notFound++; consecutiveMissing++;
          await upsertRunItem(run.id, eventId, {
            status: "not_found",
            exists_in_fightpassport: false,
            error_code: "705",
            error_message: "FightPassport toont onbekende code (705).",
            finished_at: new Date().toISOString(),
          });
          console.log(`[fp-events] â€” ${label} event ${eventId}: bestaat niet (705)`);
          if (MAX_CONSECUTIVE_MISSING > 0 && consecutiveMissing >= MAX_CONSECUTIVE_MISSING) stopRequested = true;
          continue;
        }
        await saveEvent(event, run.id);
        processed++; found++; consecutiveMissing = 0;
        await upsertRunItem(run.id, eventId, {
          status: "success",
          exists_in_fightpassport: true,
          evenement_naam: event.evenement_naam,
          evenement_datum: event.evenement_datum,
          finished_at: new Date().toISOString(),
          error_code: null,
          error_message: null,
        });
        console.log(`[fp-events] ✅ ${label} event ${eventId}: ${event.evenement_naam || "naam onbekend"}`);
      } catch (error) {
        const message = error?.message || String(error);
        if (message === "LOGIN_PAGE") {
          await refreshSession().catch(() => {});
          queue.push(eventId);
          await upsertRunItem(run.id, eventId, { status: "pending", error_message: "Sessie vernieuwd; opnieuw ingepland." });
        } else {
          processed++; errors++;
          await upsertRunItem(run.id, eventId, {
            status: "error",
            exists_in_fightpassport: null,
            error_message: message,
            finished_at: new Date().toISOString(),
          });
          console.log(`[fp-events] ❌ ${label} event ${eventId}: ${message}`);
        }
      } finally {
        await hardClosePage(page);
        if (processed % 10 === 0 || stopRequested) await updateProgress().catch(() => {});
      }
    }
    await closeWorkerContext(context);
    console.log(`[fp-events] ${label} klaar`);
  }

  try {
    console.log(`[fp-events] ${queue.length} evenementnummers in wachtrij`);
    await Promise.all(Array.from({ length: WORKERS }, (_, workerIndex) => worker(workerIndex)));
    const fullyProcessed = index >= queue.length && !stopRequested;
    await supabase.from("fightpassport_event_sync_runs").update({
      status: fullyProcessed ? "completed" : "paused",
      processed_count: processed,
      found_count: found,
      not_found_count: notFound,
      error_count: errors,
      finished_at: fullyProcessed ? new Date().toISOString() : null,
      pid: null,
    }).eq("id", run.id);
  } catch (error) {
    await supabase.from("fightpassport_event_sync_runs").update({
      status: "failed",
      error_message: error?.message || String(error),
      finished_at: new Date().toISOString(),
      pid: null,
    }).eq("id", run.id);
    throw error;
  } finally {
    await hardClosePage(masterPage);
    await browser.close().catch(() => {});
    activeBrowser = null;
  }
}

main()
  .then(() => { console.log("✅ FightPassport evenementenscrape klaar"); process.exit(0); })
  .catch((error) => { console.error("❌ FightPassport evenementenscrape mislukt", error); process.exit(1); });
