import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import { readXlsxToRows } from "../utils/excelRowsExceljs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const START_VA = Number(process.argv[2] || process.env.FP_TOTAL_START_VA || 775);
const END_VA = Number(process.argv[3] || process.env.FP_TOTAL_END_VA || 33150);
const WORKERS_RAW = Number(process.env.FP_TOTAL_WORKERS ?? process.env.WORKERS ?? "4");
const WORKERS = Number.isFinite(WORKERS_RAW) && WORKERS_RAW > 0
  ? Math.min(10, Math.max(1, Math.floor(WORKERS_RAW)))
  : 4;
const FULL_DETAILS_ONLY_LICENSED = String(process.env.FP_TOTAL_ONLY_LICENSED || "false").toLowerCase() === "true";
const SCRAPE_RESULTS = String(process.env.FP_TOTAL_RESULTS || "true").toLowerCase() !== "false";

/**
 * HARD timeout wrapper.
 * Let op: Promise.race annuleert de onderliggende async NIET.
 * Daarom killen we bij timeout de worker-context (hard stop).
 */
async function withTimeout(promiseFactory, ms, label, onTimeout) {
  let t;

  const timeout = new Promise((_, rej) => {
    t = setTimeout(async () => {
      try {
        if (typeof onTimeout === "function") {
          await onTimeout();
        }
      } catch {}
      rej(new Error(`HARD TIMEOUT ${ms}ms for ${label}`));
    }, ms);
  });

  try {
    const p = Promise.resolve().then(() => promiseFactory());
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function closeAnyModal(page) {
  const selectors = [
    "button#sluit_inr_detail",
    "button.sluit_scherm.overview",
    "button.sluit_scherm",
    "img.sluit_modal",
    "button.ui-dialog-titlebar-close",
  ];

  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        await sleep(120);
      }
    } catch {}
  }

  try {
    await page.keyboard.press("Escape");
    await sleep(80);
    await page.keyboard.press("Escape");
    await sleep(80);
  } catch {}
}

async function readHeaderInfo(page) {
  try {
    return await page.evaluate(() => {
      const k1 = document.querySelector(".koptekst1");
      const t = (k1?.innerText || "").trim();
      const m = t.match(/\((\d{3,5})\)$/);
      return { gotVa: m ? m[1] : null, koptekst1: t };
    });
  } catch {
    return { gotVa: null, koptekst1: "" };
  }
}

function fighterUrl(va) {
  return `https://fightpassport.nl/#va_vechter/${va}`;
}

async function isLoginPage(page) {
  try {
    return await page.evaluate(() => {
      function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          r.width > 0 &&
          r.height > 0
        );
      }

      // Unlockpagina is geen gewone loginpagina.
      const pincode =
        document.querySelector("input.pincode") ||
        document.querySelector("input.target_input.pincode") ||
        document.querySelector("input[class*='pincode']");
      if (pincode && isVisible(pincode)) return false;

      const loginEl = document.querySelector("input.gebruikersnaam");
      if (loginEl && isVisible(loginEl)) return true;

      const u = String(location.href || "").toLowerCase();
      return u.includes("login") || u.includes("#login") || u.includes("aanmeld");
    });
  } catch {}

  return false;
}

/**
 * Hard close page: stopLoading + close (best effort)
 */
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

/**
 * Compat worker-context:
 * - Puppeteer nieuw: createBrowserContext()
 * - Puppeteer klassiek: createIncognitoBrowserContext()
 * - Geen support: null (fallback)
 */
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
    for (const p of pages) {
      await hardClosePage(p).catch(() => {});
    }
  } catch {}

  try {
    await ctx.close().catch(() => {});
  } catch {}
}

/* -------------------------------------------------------
   CORE: Open tab DIRECT fighter-url, verify header,
   else close and reopen until correct.
   (context-aware, fallback naar browser.newPage)
------------------------------------------------------- */
async function openTabToFighterVerified(browser, context, cookies, va, opts) {
  const {
    maxAttempts = 5,
    softWaitMs = 1500,
    betweenAttemptsMs = 400,
    workerLabel = "",
  } = opts ?? {};

  const requestedVa = String(va);
  // FightPassport is een SPA en de fighter-header kan duidelijk later verschijnen
  // dan domcontentloaded. Geef dezelfde tab dus eerst echt de tijd om op de
  // gevraagde vechter uit te komen voordat we hem als mismatch/niet gevonden zien.
  const verifyWindowMs = Math.max(15000, softWaitMs * 8);
  const pollMs = 250;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const p = context ? await context.newPage() : await browser.newPage();
    await p.setCacheEnabled(false);

    try {
      if (Array.isArray(cookies) && cookies.length) {
        await p.setCookie(...cookies);
      }
    } catch {}

    const url = fighterUrl(va);
    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});

    // FightPassport is een hash-SPA: forceer de gevraagde vechter direct na openen nogmaals.
    const forced = await forceExactFighterUrl(p, va, 30000).catch((e) => {
      if (e?.message === "LOGIN_PAGE") throw e;
      return false;
    });
    if (!forced) {
      await hardClosePage(p).catch(() => {});
      await sleep(betweenAttemptsMs);
      continue;
    }

    // Eerste rustige wachttijd nadat de exacte VA aantoonbaar staat.
    await sleep(softWaitMs);

    const verifyStartedAt = Date.now();
    let lastInfo = { gotVa: null, koptekst1: "" };
    let lastUrl = p.url();

    while (Date.now() - verifyStartedAt < verifyWindowMs) {
      if (await isLoginPage(p)) {
        await hardClosePage(p).catch(() => {});
        throw new Error("LOGIN_PAGE");
      }

      lastUrl = p.url();
      lastInfo = await readHeaderInfo(p);

      const gotVa = lastInfo?.gotVa ?? null;
      if (gotVa && String(gotVa) === requestedVa) {
        return p;
      }

      // Een andere of lege header kan nog de vorige/tussentijdse SPA-state zijn.
      // Niet meteen opnieuw openen: blijf eerst in deze tab kijken waar FP uitkomt.
      await sleep(pollMs);
    }

    console.log(`[bundle] ↪️ openTab niet op gevraagde VA na wachten ${workerLabel}`, {
      requested: requestedVa,
      gotVa: lastInfo?.gotVa ?? null,
      attempt,
      urlNow: lastUrl,
      koptekst1: lastInfo?.koptekst1 ?? "",
      waitedMs: verifyWindowMs,
    });

    await hardClosePage(p).catch(() => {});
    await sleep(betweenAttemptsMs);
  }

  return null;
}


function parseNlDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!m) return null;
  let y = m[3];
  if (y.length === 2) y = Number(y) < 30 ? `20${y}` : `19${y}`;
  return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function boolFromJaNee(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (/^(ja|yes|true|geldig|actief)\b/.test(s)) return true;
  if (/^(nee|no|false|ongeldig|inactief)\b/.test(s)) return false;
  return null;
}

function intFrom(v) {
  const m = String(v ?? "").match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

function numFrom(v) {
  const s = String(v ?? "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return s ? Number(s[0]) : null;
}


function normalizeClass(v) {
  const s = String(v ?? "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes("JEUGD") || s.includes("YOUTH") || /^J\+?$/.test(s.trim())) return "J";
  if (s.includes("A KLASSE") || s.includes("A CLASS") || /\bA\b/.test(s)) return "A";
  if (s.includes("B KLASSE") || s.includes("B CLASS") || /\bB\b/.test(s)) return "B";
  if (s.includes("C KLASSE") || s.includes("C CLASS") || /\bC\b/.test(s)) return "C";
  if (s.includes("NIEUWELING") || s.includes("NEWCOMER") || s.includes("N KLASSE") || /\bN\b/.test(s)) return "N";
  if (s.includes("R KLASSE") || s.includes("R CLASS") || /\bR\b/.test(s)) return "R";
  return null;
}

function isKbTb(v) {
  const s = String(v ?? "").toLowerCase();
  return s.includes("kick") || s.includes("k1") || s.includes("muay") || s.includes("thai");
}

function isMma(v) {
  return String(v ?? "").toLowerCase().includes("mma");
}

function deriveCurrentClassification(results, nulmeting) {
  const rows = Array.isArray(results) ? results : [];
  const mmaRows = rows.filter((r) => isMma(r.discipline) || /mma/i.test(String(r.klasse ?? "")));
  const kbRows = rows.filter((r) => isKbTb(r.discipline));
  let mmaLevel = null;
  if (mmaRows.some((r) => /(^|\b)(pro|professional|p)(\b|$)/i.test(String(r.klasse ?? "")))) mmaLevel = "PRO";
  else if (mmaRows.length) mmaLevel = "AMATEUR";

  const order = ["R", "N", "C", "B", "A"];
  let current = null;
  for (const r of kbRows) {
    const k = normalizeClass(r.klasse);
    if (k && k !== "J" && (!current || order.indexOf(k) > order.indexOf(current))) current = k;
  }
  if (!current) current = normalizeClass(nulmeting?.klasse);

  if (current && current !== "J") {
    const same = kbRows.filter((r) => normalizeClass(r.klasse) === current && !/demo/i.test(String(r.uitslag ?? "")));
    const total = same.length;
    const wins = same.filter((r) => /win|wint|gewonnen/i.test(String(r.uitslag ?? ""))).length;
    if (current === "R" && total >= 2) current = "N";
    else if (current === "N" && (wins >= 4 || total >= 6)) current = "C";
    else if (current === "C" && (wins >= 6 || total >= 8)) current = "B";
    else if (current === "B" && (wins >= 8 || total >= 10)) current = "A";
  }

  const nulDiscipline = String(nulmeting?.discipline ?? "");
  const primaryDiscipline = mmaRows.length && !kbRows.length ? "MMA" : kbRows.length ? "KB/TB" : isMma(nulDiscipline) ? "MMA" : isKbTb(nulDiscipline) ? "KB/TB" : null;
  return { berekende_klasse: current, mma_level: mmaLevel, primary_discipline: primaryDiscipline };
}
async function readHeaderAndSummary(page, va) {
  await page.waitForSelector(".koptekst1", { timeout: 12000 }).catch(() => null);
  return page.evaluate((requestedVa) => {
    const k1 = document.querySelector(".koptekst1");
    const k2 = document.querySelector(".koptekst2");
    const title = String(k1?.innerText || "").trim();
    const info = String(k2?.innerText || "").trim();
    const m = title.match(/^(.+?)\s*\((\d{3,6})\)\s*$/);
    const gotVa = m?.[2] || null;
    if (!gotVa || String(gotVa) !== String(requestedVa)) return null;

    const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
    const tiles = [...(tab?.querySelectorAll(".tile") || [])];
    const detailsTile = tiles.find((tile) => {
      const h = String(tile.querySelector(".tileHeader")?.innerText || "").trim().toUpperCase();
      return h === "DETAILS";
    });
    const text = String(detailsTile?.innerText || "").replace(/\u00a0/g, " ").trim();

    const line = (label) => {
      const re = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, "i");
      return text.match(re)?.[1]?.trim() || null;
    };

    return {
      va_nummer: gotVa,
      naam: m?.[1]?.trim() || null,
      header_info: info,
      summary_text: text,
      fit_to_fight: /fit\s*to\s*fight/i.test(text),
      heeft_startverbod: /startverbod/i.test(text),
      licentie: line("Licentie"),
      wedstrijden: line("Wedstrijden"),
      gewonnen: line("Gewonnen"),
      kos: line("KO'?s"),
    };
  }, va);
}

async function clickTile(page, va, title) {
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(80);
  const clicked = await page.evaluate((va, title) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
    if (!tab) return false;
    const h = [...tab.querySelectorAll(".tileHeader.enabled, .tileHeader")].find(
      (x) => String(x.innerText || "").trim().toUpperCase() === title.toUpperCase()
    );
    const tile = h?.closest(".tile");
    if (!tile) return false;
    tile.click();
    return true;
  }, va, title);
  if (clicked) await sleep(700);
  return clicked;
}


async function forceExactFighterUrl(page, va, timeoutMs = 30000) {
  const requestedVa = String(va);
  const url = fighterUrl(va);
  const wantedHash = `#va_vechter/${requestedVa}`;
  const startedAt = Date.now();
  let lastForcedAt = 0;
  let hardReloads = 0;

  while (Date.now() - startedAt < timeoutMs) {
    if (await isLoginPage(page)) {
      throw new Error("LOGIN_PAGE");
    }

    const info = await readHeaderInfo(page);
    const currentUrl = page.url();
    const currentHash = await page.evaluate(() => location.hash).catch(() => "");

    if (
      String(info?.gotVa || "") === requestedVa &&
      String(currentHash || "") === wantedHash
    ) {
      // Nog een korte bevestiging om te voorkomen dat we een oude SPA-state lezen.
      await sleep(500);
      const confirm = await readHeaderInfo(page);
      const confirmHash = await page.evaluate(() => location.hash).catch(() => "");
      if (String(confirm?.gotVa || "") === requestedVa && confirmHash === wantedHash) {
        return true;
      }
    }

    const now = Date.now();
    if (now - lastForcedAt >= 1200) {
      lastForcedAt = now;

      await page.evaluate((forcedUrl, forcedHash) => {
        // Eerst de hash exact afdwingen; FightPassport routeert als SPA op de hash.
        if (location.hash !== forcedHash) {
          location.hash = forcedHash;
        }

        // Daarna ook de volledige URL hard gelijkzetten.
        if (location.href !== forcedUrl) {
          history.replaceState(null, "", forcedUrl);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
      }, url, wantedHash).catch(() => {});

      await sleep(600);

      const afterForce = await readHeaderInfo(page);
      if (String(afterForce?.gotVa || "") !== requestedVa && hardReloads < 3) {
        hardReloads++;
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 25000,
        }).catch(() => {});
        await sleep(1200);
      }
    }

    await sleep(250);
  }

  console.log(`[fp-total] ❌ VA ${va} kon niet hard op juiste fighter-url worden vastgezet`, {
    urlNow: page.url(),
    header: await readHeaderInfo(page).catch(() => null),
  });

  return false;
}

async function openDetailsLikeBundle(page, va) {
  await closeAnyModal(page).catch(() => {});

  // Voor DETAILS eerst nogmaals expliciet exact deze fighter-url forceren.
  const exactVaLoaded = await forceExactFighterUrl(page, va, 15000);
  if (!exactVaLoaded) return false;

  const startedAt = Date.now();

  // Zelfde tegel-detectie als de werkende bundle:
  // alleen de echte enabled DETAILS-header accepteren.
  while (Date.now() - startedAt < 15000) {
    const clicked = await page.evaluate((requestedVa) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      if (!tab) return false;

      const head = [...tab.querySelectorAll(".tileHeader.enabled")].find(
        (h) => String(h.innerText || "").trim().toUpperCase() === "DETAILS"
      );

      const tile = head?.closest(".tile");
      if (!tile) return false;

      tile.scrollIntoView?.({ block: "center" });
      tile.click();
      return true;
    }, va).catch(() => false);

    if (clicked) {
      await sleep(1200);
      return true;
    }

    await sleep(250);
  }

  return false;
}

async function waitForDetailsTileContentLikeBundle(page, va) {
  let last = null;

  // Bundle pollt de tegelinhoud; total krijgt bewust meer tijd.
  for (let attempt = 1; attempt <= 60; attempt++) {
    last = await page.evaluate((requestedVa) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      if (!tab) return null;

      const detailTiles = [...tab.querySelectorAll('div[title="DETAILS"], .tile')].filter((el) => {
        const title = String(el.getAttribute("title") || "").trim().toUpperCase();
        const header = String(el.querySelector(".tileHeader")?.innerText || "").trim().toUpperCase();
        const txt = String(el.innerText || el.textContent || "").trim().toUpperCase();
        return title === "DETAILS" || header === "DETAILS" || txt.startsWith("DETAILS");
      });

      const tile = detailTiles[0] || null;
      if (!tile) return null;

      const contentNodes = tile.querySelectorAll(
        "ul.get_tile_content p, ul.get_tile_content li, ul.get_tile_content div, .get_tile_content p, .get_tile_content li, .get_tile_content div"
      );

      let detailText = [...contentNodes]
        .map((el) => el.innerText || el.textContent || "")
        .join("\n");

      if (!String(detailText || "").trim()) {
        detailText = tile.innerText || tile.textContent || "";
      }

      detailText = String(detailText || "")
        .replace(/\u00a0/g, " ")
        .replace(/\r/g, "\n");

      const lines = detailText
        .split(/\n+/g)
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .filter((x) => x.toUpperCase() !== "DETAILS");

      const allText = lines.join("\n");

      return {
        ready:
          /licentie/i.test(allText) ||
          /wedstrijden/i.test(allText) ||
          /gewonnen/i.test(allText),
        raw: lines.slice(0, 12),
      };
    }, va).catch(() => null);

    if (last?.ready) return true;
    await sleep(500);
  }

  console.log(`[fp-total] ⚠️ VA ${va} DETAILS tegelinhoud nog niet volledig zichtbaar`, {
    raw: last?.raw ?? null,
  });

  return false;
}

async function readDetailsModal(page) {
  // Het e-mailveld staat lager in het modal. Scrollen is niet vereist als het al in DOM staat;
  // anders scrollen we het modal gecontroleerd naar beneden.
  for (let i = 0; i < 20; i++) {
    const has = await page.$("input.dv2factemail");
    if (has) break;
    await page.evaluate(() => {
      const scrollers = [...document.querySelectorAll("div")]
        .filter((el) => el.scrollHeight > el.clientHeight + 100)
        .sort((a, b) => b.scrollHeight - a.scrollHeight);
      const s = scrollers[0];
      if (s) s.scrollTop = Math.min(s.scrollHeight, s.scrollTop + Math.max(400, s.clientHeight * 0.8));
      else window.scrollBy(0, 600);
    });
    await sleep(120);
  }

  return page.evaluate(() => {
    const visibleModal = [...document.querySelectorAll(".outer, .modal, [role=dialog]")].find((el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 300 && r.height > 200 && st.display !== "none" && st.visibility !== "hidden";
    }) || document.body;

    const text = String(visibleModal.innerText || "").replace(/\u00a0/g, " ");
    const inputs = [...visibleModal.querySelectorAll("input, select, textarea")];

    const byClass = (cls) => {
      const el = visibleModal.querySelector(cls);
      if (!el) return null;
      if (el.tagName === "SELECT") return el.options?.[el.selectedIndex]?.textContent?.trim() || el.value || null;
      return String(el.value ?? "").trim() || null;
    };

    const findValueNearLabel = (label) => {
      const labels = [...visibleModal.querySelectorAll("label, div, span")];
      const lab = labels.find((el) => String(el.textContent || "").trim().toLowerCase() === label.toLowerCase());
      if (!lab) return null;
      const parent = lab.parentElement;
      const field = parent?.querySelector("input, select, textarea") || lab.nextElementSibling?.querySelector?.("input, select, textarea") || lab.nextElementSibling;
      if (!field) return null;
      if (field.tagName === "SELECT") return field.options?.[field.selectedIndex]?.textContent?.trim() || field.value || null;
      return String(field.value ?? field.textContent ?? "").trim() || null;
    };

    const nul = {
      totaal: byClass("input.dnva_nulmetingaantalwedstr") || findValueNearLabel("Aantal wedstrijden"),
      opmerking: byClass("textarea.dvcz_omschr2") || null,
      klasse: byClass("select.dvnulmetingklasseoms") || findValueNearLabel("Klasse"),
      gewicht: findValueNearLabel("Gewicht"),
      discipline: findValueNearLabel("Discipline"),
      gewonnen: findValueNearLabel("Aantal gewonnen"),
      verloren: findValueNearLabel("Aantal verloren"),
      onbeslist: findValueNearLabel("Aantal onbeslist"),
      kos: findValueNearLabel("Aantal KO's"),
    };

    const emailInputs = [...visibleModal.querySelectorAll("input.dv2factemail")];
    const email = emailInputs.map((e) => String(e.value || "").trim()).find((v) => v.includes("@")) || null;

    return {
      email,
      nulmeting: nul,
      raw_text: text.slice(0, 30000),
      field_dump: inputs.slice(0, 250).map((el) => ({
        tag: el.tagName,
        name: el.getAttribute("name"),
        id: el.id || null,
        class: el.className || null,
        value: el.tagName === "SELECT" ? el.options?.[el.selectedIndex]?.textContent?.trim() || el.value : String(el.value ?? "").trim(),
        title: el.getAttribute("title"),
      })),
    };
  });
}


function detailsScrapeSucceeded(details) {
  if (!details || typeof details !== "object") return false;

  const nul = details.nulmeting || {};
  const hasNulmeting = [
    nul.totaal,
    nul.opmerking,
    nul.klasse,
    nul.gewicht,
    nul.discipline,
    nul.gewonnen,
    nul.verloren,
    nul.onbeslist,
    nul.kos,
  ].some((v) => v !== null && v !== undefined && String(v).trim() !== "");

  const hasEmail =
    typeof details.email === "string" &&
    details.email.trim().includes("@");

  const hasFields =
    Array.isArray(details.field_dump) &&
    details.field_dump.some((f) => {
      const v = f?.value;
      return v !== null && v !== undefined && String(v).trim() !== "";
    });

  const hasText =
    typeof details.raw_text === "string" &&
    details.raw_text.trim().length > 100;

  // DETAILS moet echt inhoud hebben. Eén van deze bronnen moet aantoonbaar gevuld zijn.
  return hasNulmeting || hasEmail || hasFields || hasText;
}

async function extractVisibleTables(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll("table")].filter((t) => {
      const r = t.getBoundingClientRect();
      const st = getComputedStyle(t);
      return r.width > 200 && r.height > 30 && st.display !== "none" && st.visibility !== "hidden";
    });

    return candidates.map((table) => {
      const rows = [...table.querySelectorAll("tr")].map((tr) => {
        const cells = [...tr.querySelectorAll("th,td")];
        const values = cells.map((c) =>
          String(c.innerText || c.textContent || "").replace(/\s+/g, " ").trim()
        );

        // Bewaar daarnaast metadata van de hele rij. Bij SPORTSCHOLEN staat
        // het keurmerk-schildje in een aparte (lege) eerste kolom en zou dat
        // met alleen innerText verloren gaan.
        const rowMeta = {
          html: tr.innerHTML || "",
          images: [...tr.querySelectorAll("img")].map((img) => ({
            src: img.getAttribute("src") || "",
            alt: img.getAttribute("alt") || "",
            title: img.getAttribute("title") || "",
            className: img.className || "",
          })),
        };

        return { values, rowMeta };
      }).filter((r) => r.values.some(Boolean) || r.rowMeta.images.length);

      return rows;
    }).filter((rows) => rows.length);
  });
}

function tableToObjects(tables) {
  const out = [];
  for (const rows of tables || []) {
    if (rows.length < 2) continue;

    const headers = rows[0].values.map((h) => h.trim());

    for (const rowEntry of rows.slice(1)) {
      const row = rowEntry.values;
      if (!row.some(Boolean) && !rowEntry.rowMeta?.images?.length) continue;

      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? null; });

      // Interne scraper-metadata; wordt gebruikt om het blauwe keurmerkschild
      // per sportschoolkoppeling te herkennen.
      obj.__row_meta = rowEntry.rowMeta || null;

      if (Object.keys(obj).length) out.push(obj);
    }
  }
  return out;
}

function rowHasKeurmerkShield(row) {
  const meta = row?.__row_meta || {};
  const html = String(meta.html || "");

  // FightPassport toont het actuele keurmerk als SVG-sprite #img_132
  // in de eerste kolom van de betreffende sportschoolrij.
  return /(?:href|xlink:href)=["'][^"']*#img_132["']/i.test(html);
}

async function scrapeTileTable(page, va, title) {
  const ok = await clickTile(page, va, title);
  if (!ok) return [];
  await sleep(400);
  const tables = await extractVisibleTables(page);
  const rows = tableToObjects(tables);
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(100);
  return rows;
}

function val(obj, names) {
  for (const [k, v] of Object.entries(obj || {})) {
    const nk = String(k).toLowerCase().replace(/\s+/g, " ").trim();
    if (names.some((n) => nk === n || nk.includes(n))) return v || null;
  }
  return null;
}

async function waitForAnySelectorInAnyFrame(page, selectors, timeoutMs = 45000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      for (const selector of selectors) {
        try {
          const el = await frame.$(selector);
          if (el) return { frame, selector };
        } catch {}
      }
    }
    await sleep(250);
  }

  return null;
}

async function openResultsTileVerified(page, va, timeoutMs = 20000) {
  await closeAnyModal(page);

  // Voor UITSLAGEN eerst nogmaals exact deze VA afdwingen.
  const exactVaLoaded = await forceExactFighterUrl(page, va, 30000);
  if (!exactVaLoaded) return null;

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const clicked = await page.evaluate((requestedVa) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      if (!tab) return false;

      // Alleen de echte enabled UITSLAGEN-tegel van deze VA.
      const header = [...tab.querySelectorAll(".tileHeader.enabled")].find(
        (el) => String(el.innerText || "").trim().toUpperCase() === "UITSLAGEN"
      );

      const tile = header?.closest(".tile");
      if (!tile) return false;

      tile.scrollIntoView?.({ block: "center" });
      tile.click();
      return true;
    }, va).catch(() => false);

    if (!clicked) {
      await sleep(400);
      continue;
    }

    // FightPassport heeft soms tijd nodig om de juiste modal/frame op te bouwen.
    await sleep(1200);

    const found = await findResultsDownloadControl(page, 8000);
    if (found) return found;

    // Verkeerde/oude modal: sluiten en UITSLAGEN opnieuw openen.
    await closeAnyModal(page).catch(() => {});
    await sleep(600);
  }

  return null;
}

async function findResultsDownloadControl(page, timeoutMs = 10000) {
  const start = Date.now();
  const selectors = ['[title="download als excel"]', '[title*="download"][title*="excel"]'];

  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      for (const selector of selectors) {
        let handles = [];
        try {
          handles = await frame.$$(selector);
        } catch {
          handles = [];
        }

        for (const handle of handles) {
          const verdict = await frame.evaluate((el) => {
            const visible = (node) => {
              if (!node) return false;
              const r = node.getBoundingClientRect();
              const st = getComputedStyle(node);
              return (
                r.width > 0 &&
                r.height > 0 &&
                st.display !== "none" &&
                st.visibility !== "hidden"
              );
            };

            if (!visible(el)) return { ok: false };

            const container =
              el.closest(".outer, .modal, [role=dialog], .ui-dialog, .tile, body") ||
              document.body;

            const contextText = String(container.innerText || document.body.innerText || "")
              .replace(/\u00a0/g, " ")
              .toUpperCase();

            // Nooit een downloadknop uit LICENTIES accepteren.
            if (contextText.includes("LICENTIES") && !contextText.includes("UITSLAGEN")) {
              return { ok: false };
            }

            const looksLikeResults =
              contextText.includes("UITSLAGEN") ||
              (
                contextText.includes("DATUM") &&
                contextText.includes("EVENEMENT") &&
                contextText.includes("TEGENSTANDER")
              );

            return { ok: looksLikeResults };
          }, handle).catch(() => ({ ok: false }));

          if (verdict?.ok) {
            return { frame, selector, handle };
          }
        }
      }
    }

    await sleep(300);
  }

  return null;
}

function cleanupDownloadDir(dir) {
  if (!dir) return;

  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}

  // Ruim ook de bovenliggende downloads-map op als die leeg is.
  try {
    const parent = path.dirname(dir);
    if (
      path.basename(parent) === "downloads" &&
      fs.existsSync(parent) &&
      fs.readdirSync(parent).length === 0
    ) {
      fs.rmdirSync(parent);
    }
  } catch {}
}

async function downloadResultsExcel(page, va, initialFound = null) {
  const dir = path.resolve(__dirname, "downloads", `${va}_${crypto.randomUUID().slice(0, 8)}`);
  fs.mkdirSync(dir, { recursive: true });

  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: dir,
  });

  const selectors = ['[title="download als excel"]', '[title*="download"][title*="excel"]'];
  const found =
    initialFound ||
    await waitForAnySelectorInAnyFrame(page, selectors, 45000);

  if (!found) {
    cleanupDownloadDir(dir);
    return null;
  }

  const clickDownload = async () => {
    if (found.handle) {
      await found.frame.evaluate((el) => {
        el?.scrollIntoView?.({ block: "center" });
        el?.click?.();
      }, found.handle);
      return;
    }

    await found.frame.evaluate((selector) => {
      const el = document.querySelector(selector);
      el?.scrollIntoView?.({ block: "center" });
      el?.click?.();
    }, found.selector);
  };

  console.log(`[fp-total] ⬇️ VA ${va} UITSLAGEN download gestart; wachten op Excel...`);
  await clickDownload();

  // FightPassport kan de Excel server-side eerst nog opbouwen.
  // Daarom maximaal 3 minuten wachten voordat deze stap opgeeft.
  const downloadStartedAt = Date.now();
  const maxDownloadWaitMs = Number(
    process.env.FP_RESULTS_DOWNLOAD_TIMEOUT_MS ?? "180000"
  );

  let retried = false;
  let lastLogAt = 0;

  while (Date.now() - downloadStartedAt < maxDownloadWaitMs) {
    let filesNow = [];
    try {
      filesNow = fs.readdirSync(dir);
    } catch {
      filesNow = [];
    }

    const elapsedMs = Date.now() - downloadStartedAt;

    // Iedere 5 seconden zichtbaar loggen wat de downloadmap bevat.
    if (Date.now() - lastLogAt >= 5000) {
      lastLogAt = Date.now();
      console.log(
        `[fp-total] ⏳ VA ${va} wacht op uitslagen Excel (${Math.round(elapsedMs / 1000)}s)`,
        { files: filesNow }
      );
    }

    const crdownloads = filesNow.filter((f) =>
      f.toLowerCase().endsWith(".crdownload")
    );

    const xlsxFiles = filesNow
      .filter((f) => f.toLowerCase().endsWith(".xlsx"))
      .map((f) => path.join(dir, f))
      .filter((f) => {
        try {
          return fs.statSync(f).size > 0;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
        } catch {
          return 0;
        }
      });

    if (xlsxFiles.length > 0) {
      const candidate = xlsxFiles[0];

      console.log(
        `[fp-total] 📥 VA ${va} Excel gezien; wachten tot bestand volledig klaar is: ${path.basename(candidate)}`
      );

      // Bestand moet minimaal 4 seconden volledig stabiel zijn,
      // zonder .crdownload, voordat de scraper verder mag.
      let lastSize = -1;
      let stableSince = null;
      const completeCheckStartedAt = Date.now();

      while (Date.now() - completeCheckStartedAt < 60000) {
        let currentFiles = [];
        try {
          currentFiles = fs.readdirSync(dir);
        } catch {
          currentFiles = [];
        }

        const stillDownloading = currentFiles.some((f) =>
          f.toLowerCase().endsWith(".crdownload")
        );

        let size = 0;
        try {
          size = fs.statSync(candidate).size;
        } catch {
          size = 0;
        }

        if (!stillDownloading && size > 0 && size === lastSize) {
          if (stableSince === null) stableSince = Date.now();
        } else {
          stableSince = null;
        }

        lastSize = size;

        if (
          !stillDownloading &&
          size > 0 &&
          stableSince !== null &&
          Date.now() - stableSince >= 4000
        ) {
          // Extra marge voordat ExcelJS het bestand opent.
          await sleep(1500);

          // Laat ExcelJS het bestand hier al één keer echt openen.
          // Pas als dit lukt noemen we de download voltooid.
          try {
            await readXlsxToRows(candidate, { sheetIndex: 0 });
            console.log(
              `[fp-total] ✅ VA ${va} uitslagen Excel volledig binnen (${size} bytes)`
            );
            return { file: candidate, dir };
          } catch (e) {
            console.log(
              `[fp-total] ⏳ VA ${va} Excel bestaat maar is nog niet leesbaar:`,
              e?.message ?? String(e)
            );
            stableSince = null;
          }
        }

        await sleep(500);
      }
    }

    // Alleen opnieuw klikken als er na 20 seconden werkelijk nog geen enkel
    // downloadbestand of tijdelijke .crdownload zichtbaar is.
    if (
      !retried &&
      elapsedMs > 20000 &&
      filesNow.length === 0 &&
      crdownloads.length === 0
    ) {
      retried = true;
      console.log(
        `[fp-total] 🔁 VA ${va} nog geen downloadbestand na 20s; UITSLAGEN download één keer opnieuw klikken`
      );
      await clickDownload().catch(() => {});
    }

    await sleep(500);
  }

  console.log(
    `[fp-total] ❌ VA ${va} uitslagen Excel niet volledig binnen na ${Math.round(maxDownloadWaitMs / 1000)} seconden`
  );

  // Alleen bij definitieve download-timeout opruimen.
  cleanupDownloadDir(dir);
  return null;
}

async function parseResultsExcel(filePath, va) {
  const rows = await readXlsxToRows(filePath, { sheetIndex: 0 });
  const headerIndex = rows.findIndex((r) => Array.isArray(r) && r.some((x) => String(x || "").trim() === "Datum") && r.some((x) => String(x || "").trim() === "Evenement"));
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((h) => String(h || "").trim());
  const ix = (n) => headers.indexOf(n);
  const out = [];
  for (const row of rows.slice(headerIndex + 1)) {
    if (!row || !row[ix("Datum")]) continue;
    const datum = parseNlDate(row[ix("Datum")]);
    if (!datum) continue;
    out.push({
      va_nummer: String(va), datum,
      evenement: ix("Evenement") >= 0 ? String(row[ix("Evenement")] || "").trim() || null : null,
      tegenstander: ix("Tegenstander") >= 0 ? String(row[ix("Tegenstander")] || "").trim() || null : null,
      sportschool: ix("Sportschool") >= 0 ? String(row[ix("Sportschool")] || "").trim() || null : null,
      discipline: ix("Discipline") >= 0 ? String(row[ix("Discipline")] || "").trim() || null : null,
      klasse: ix("Kl.") >= 0 ? String(row[ix("Kl.")] || "").trim() || null : null,
      gewicht: ix("Gewicht") >= 0 ? String(row[ix("Gewicht")] || "").trim() || null : null,
      uitslag: ix("Uitslag") >= 0 ? String(row[ix("Uitslag")] || "").trim() || null : null,
      raw_json: { headers, row },
      last_seen_at: new Date().toISOString(),
    });
  }
  return out;
}

async function scrapeResults(page, va) {
  if (!SCRAPE_RESULTS) {
    return { status: "skipped", rows: [], error: null, download: null };
  }

  const downloadControl = await openResultsTileVerified(page, va);
  if (!downloadControl) {
    return {
      status: "error",
      rows: [],
      error: "UITSLAGEN tegel/downloadknop niet geladen",
      download: null,
    };
  }

  const dl = await downloadResultsExcel(page, va, downloadControl).catch(() => null);
  if (!dl) {
    await page.keyboard.press("Escape").catch(() => {});
    return {
      status: "error",
      rows: [],
      error: "Uitslagenbestand niet gedownload",
      download: null,
    };
  }

  try {
    const rows = await parseResultsExcel(dl.file, va);

    // BELANGRIJK:
    // nog NIET opruimen. Dit gebeurt pas nadat saveResultsSnapshot succesvol is.
    return {
      status: rows.length ? "success" : "no_results",
      rows,
      error: null,
      download: dl,
    };
  } catch (e) {
    // Parse mislukt: dan mag tijdelijke download wel weg.
    cleanupDownloadDir(dl.dir);
    return {
      status: "error",
      rows: [],
      error: e?.message ?? String(e),
      download: null,
    };
  } finally {
    await page.keyboard.press("Escape").catch(() => {});
  }
}

async function saveChildSnapshot(table, va, rows, mapper) {
  const now = new Date().toISOString();
  await supabase.from(table).delete().eq("va_nummer", String(va));
  if (!rows.length) return;
  const payload = rows.map((r) => mapper(r, now));
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw error;
}

async function saveFighter(all) {
  const now = new Date().toISOString();
  const d = all.details || {};
  const n = d.nulmeting || {};
  const headerInfo = String(all.summary.header_info || "");
  const dob = headerInfo.match(/\b\d{2}-\d{2}-\d{4}\b/)?.[0] || null;
  const gender = /\bvrouw\b/i.test(headerInfo) ? "vrouw" : /\bman\b/i.test(headerInfo) ? "man" : null;
  const classification = deriveCurrentClassification(all.results, n);
  const payload = {
    va_nummer: String(all.va), naam: all.summary.naam,
    geboortedatum: parseNlDate(dob), geslacht: gender, email: d.email,
    fit_to_fight: !!all.summary.fit_to_fight,
    licentie_actief: boolFromJaNee(all.summary.licentie),
    heeft_startverbod: !!all.summary.heeft_startverbod,
    totaal_wedstrijden: intFrom(all.summary.wedstrijden), gewonnen: intFrom(all.summary.gewonnen), kos: intFrom(all.summary.kos),
    nulmeting_gewicht: numFrom(n.gewicht), nulmeting_discipline: n.discipline || null, nulmeting_klasse: n.klasse || null,
    nulmeting_totaal: intFrom(n.totaal), nulmeting_gewonnen: intFrom(n.gewonnen), nulmeting_verloren: intFrom(n.verloren), nulmeting_onbeslist: intFrom(n.onbeslist), nulmeting_kos: intFrom(n.kos),
    nulmeting_opmerking: n.opmerking || null,
    berekende_klasse: classification.berekende_klasse,
    mma_level: classification.mma_level,
    primary_discipline: classification.primary_discipline,
    raw_summary: all.summary, raw_details: d,
    last_seen_at: now, last_scraped_at: now, updated_at: now,
  };
  const { error } = await supabase.from("fightpassport_fighters").upsert(payload, { onConflict: "va_nummer" });
  if (error) throw error;

  await saveChildSnapshot("fightpassport_startbans", all.va, all.startbans, (r, ts) => ({
    va_nummer: String(all.va), soort: val(r, ["soort"]), ingang: parseNlDate(val(r, ["ingang"])), einde: parseNlDate(val(r, ["einde"])),
    opgelegd_door: val(r, ["door"]), reden: val(r, ["reden"]), evenement: val(r, ["evenement"]), evenement_datum: parseNlDate(val(r, ["evenement datum", "datum"])),
    actief: (() => { const e = parseNlDate(val(r, ["einde"])); return !e || e >= new Date().toISOString().slice(0,10); })(), raw_json: r, last_seen_at: ts,
  }));

  await saveChildSnapshot("fightpassport_licenses", all.va, all.licenses, (r, ts) => ({
    va_nummer: String(all.va), soort: val(r, ["soort", "licentie"]), status: val(r, ["status"]), geldig_van: parseNlDate(val(r, ["van", "ingang"])), geldig_tot: parseNlDate(val(r, ["tot", "einde", "vervaldatum"])), bond: val(r, ["bond"]), raw_json: r, last_seen_at: ts,
  }));

}

async function saveResultsSnapshot(va, results) {
  // Alleen aanroepen nadat de UITSLAGEN-stap aantoonbaar succesvol is.
  // Een tijdelijke fout of mislukte download mag bestaande uitslagen nooit wissen.
  await supabase.from("fightpassport_results").delete().eq("va_nummer", String(va));
  if (results.length) {
    const { error: re } = await supabase.from("fightpassport_results").insert(results);
    if (re) throw re;
  }
}

async function scrapeOne(page, va, openFreshPage) {
  // Eerst alleen de profiel/header lezen op de initiele, geverifieerde VA-tab.
  const summary = await readHeaderAndSummary(page, va).catch(() => null);
  if (!summary) {
    return {
      exists: false,
      licensed: false,
      summary: null,
      counts: { results: 0, gyms: 0, startbans: 0, licenses: 0 },
    };
  }

  const licensed = boolFromJaNee(summary.licentie) === true;
  let details = {};
  let gyms = [];
  let startbans = [];
  let licenses = [];
  let results = [];
  let resultsStatus = SCRAPE_RESULTS ? "pending" : "skipped";
  let resultsError = null;
  let resultsDownload = null;

  // Iedere tegel krijgt bewust een SCHONE, opnieuw geverifieerde VA-tab.
  // Zo kunnen oude modals/downloadknoppen van o.a. LICENTIES nooit meekomen
  // wanneer daarna UITSLAGEN wordt geopend.
  async function withFreshVaTab(stepName, fn) {
    const freshPage = await openFreshPage(stepName);
    if (!freshPage) throw new Error(`${stepName}: VA ${va} kon niet opnieuw worden geopend`);

    try {
      return await fn(freshPage);
    } finally {
      await closeAnyModal(freshPage).catch(() => {});
      await hardClosePage(freshPage).catch(() => {});
    }
  }

  if (!FULL_DETAILS_ONLY_LICENSED || licensed) {
    // DETAILS is verplicht. Pas als dit aantoonbaar gelukt is,
    // mag deze VA verder naar STARTVERBODEN / LICENTIES / UITSLAGEN.
    let detailsLastError = null;

    for (let detailsAttempt = 1; detailsAttempt <= 5; detailsAttempt++) {
      try {
        details = await withFreshVaTab(`DETAILS poging ${detailsAttempt}`, async (p) => {
          const opened = await openDetailsLikeBundle(p, va);
          if (!opened) {
            throw new Error("DETAILS: exacte VA-url/tegel niet correct geladen");
          }

          // Eerst dezelfde controle als de bundle: DETAILS-tegel moet echt inhoud hebben.
          const tileReady = await waitForDetailsTileContentLikeBundle(p, va);
          if (!tileReady) {
            throw new Error("DETAILS tegelinhoud niet volledig geladen");
          }

          // Total leest daarna méér: volledige modal, e-mail en nulmeting.
          await sleep(1800);

          let previousSignature = "";
          let stableChecks = 0;
          const detailsWaitStartedAt = Date.now();

          while (Date.now() - detailsWaitStartedAt < 30000) {
            const signature = await p.evaluate(() => {
              const visibleModal = [...document.querySelectorAll(".outer, .modal, [role=dialog]")].find((el) => {
                const r = el.getBoundingClientRect();
                const st = getComputedStyle(el);
                return r.width > 300 && r.height > 200 && st.display !== "none" && st.visibility !== "hidden";
              });

              if (!visibleModal) return "";

              const fields = [...visibleModal.querySelectorAll("input, select, textarea")];

              return fields.map((el) => {
                const value =
                  el.tagName === "SELECT"
                    ? (el.options?.[el.selectedIndex]?.textContent?.trim() || el.value || "")
                    : String(el.value ?? "").trim();

                return [
                  el.tagName,
                  el.getAttribute("name") || "",
                  el.id || "",
                  typeof el.className === "string" ? el.className : "",
                  value,
                ].join("|");
              }).join("||");
            }).catch(() => "");

            if (signature && signature === previousSignature) {
              stableChecks++;
            } else {
              stableChecks = 0;
            }

            previousSignature = signature;

            // Ruim 2 seconden stabiele inhoud.
            if (signature && stableChecks >= 7) break;

            await sleep(350);
          }

          await sleep(1500);

          const scraped = await readDetailsModal(p);
          if (!detailsScrapeSucceeded(scraped)) {
            throw new Error("DETAILS geopend maar inhoud onvoldoende/lege scrape");
          }

          return scraped;
        });

        console.log(`[fp-total] ✅ VA ${va} DETAILS gelukt (poging ${detailsAttempt})`);
        detailsLastError = null;
        break;
      } catch (e) {
        detailsLastError = e;
        console.log(
          `[fp-total] ⚠️ VA ${va} DETAILS poging ${detailsAttempt}/5 mislukt:`,
          e?.message ?? String(e)
        );
        await sleep(700);
      }
    }

    if (detailsLastError || !detailsScrapeSucceeded(details)) {
      throw new Error(
        `DETAILS verplicht maar niet gelukt voor VA ${va}: ${
          detailsLastError?.message ?? "onvoldoende gegevens"
        }`
      );
    }

    if (summary.heeft_startverbod) {
      startbans = await withFreshVaTab("STARTVERBODEN", async (p) => {
        return await scrapeTileTable(p, va, "STARTVERBODEN");
      }).catch((e) => {
        console.log(`[fp-total] ⚠️ VA ${va} STARTVERBODEN fout:`, e?.message ?? String(e));
        return [];
      });
    }

    if (SCRAPE_RESULTS) {
      const resultStep = await withFreshVaTab("UITSLAGEN", async (p) => {
        return await scrapeResults(p, va);
      }).catch((e) => ({
        status: "error",
        rows: [],
        error: e?.message ?? String(e),
      }));

      resultsStatus = resultStep.status;
      resultsError = resultStep.error;
      results = resultStep.rows || [];
      resultsDownload = resultStep.download || null;
    }
  }

  // FULLFIGHTER en UITSLAGEN zijn bewust twee losse opslagstappen.
  await saveFighter({ va, summary, details, gyms, startbans, licenses, results });

  if (resultsStatus === "success" || resultsStatus === "no_results") {
    try {
      // Eerst parsen-resultaat naar database schrijven.
      await saveResultsSnapshot(va, results);

      // Pas NA succesvolle database-save het gedownloade Excel-bestand/map opruimen.
      if (resultsDownload?.dir) {
        cleanupDownloadDir(resultsDownload.dir);
        resultsDownload = null;
      }
    } catch (e) {
      // Bij databasefout download bewust laten staan voor controle/herstel.
      console.log(
        `[fp-total] ❌ VA ${va} uitslagen DB-save mislukt; download blijft staan:`,
        resultsDownload?.file || null
      );
      throw e;
    }
  }

  return {
    exists: true,
    licensed,
    summary,
    counts: {
      results: results.length,
      gyms: gyms.length,
      startbans: startbans.length,
      licenses: licenses.length,
    },
    resultsStatus,
    resultsError,
  };
}

async function upsertSyncItem(runId, va, patch) {
  const payload = {
    sync_run_id: runId,
    va_nummer: String(va),
    ...patch,
  };
  const { error } = await supabase
    .from("fightpassport_sync_items")
    .upsert(payload, { onConflict: "sync_run_id,va_nummer" });
  if (error) console.log(`[fp-total] sync item log fout VA ${va}: ${error.message}`);
}
async function main() {
  if (!Number.isInteger(START_VA) || !Number.isInteger(END_VA) || END_VA < START_VA) {
    throw new Error("Ongeldig VA-bereik");
  }

  const vaList = [];
  for (let va = START_VA; va <= END_VA; va++) vaList.push(String(va));

  const { data: run, error: runErr } = await supabase
    .from("fightpassport_sync_runs")
    .insert({
      start_va: START_VA,
      end_va: END_VA,
      run_type: "full",
      meta: { workers: WORKERS },
    })
    .select("id")
    .single();

  if (runErr) throw runErr;

  const { browser, page: masterPage } = await loginFightPassport();

  let cookies = [];
  try {
    cookies = await masterPage.cookies();
  } catch {}

  console.log("[fp-total] ✅ Master logged in (cookies captured)");

  let masterRefreshPromise = null;

  async function refreshMasterSessionLocked(reason = "") {
    if (masterRefreshPromise) {
      try {
        await masterRefreshPromise;
      } catch {}
      return cookies;
    }

    masterRefreshPromise = (async () => {
      console.log(`[fp-total] 🔁 master ensureLoggedIn(force) start ${reason ? `(${reason})` : ""}`);
      await ensureLoggedIn(masterPage, { force: true });

      try {
        cookies = await masterPage.cookies();
      } catch {}

      console.log("[fp-total] ✅ master refreshed (cookies updated)");
      return cookies;
    })();

    try {
      return await masterRefreshPromise;
    } finally {
      masterRefreshPromise = null;
    }
  }

  const SCRAPE_TIMEOUT_MS = Number(process.env.FP_TOTAL_TIMEOUT_MS ?? "600000");
  const STAGGER = Number(process.env.STAGGER_MS ?? "700");

  let idx = 0;
  let processed = 0;
  let found = 0;
  let licensed = 0;
  let errors = 0;

  async function updateRunProgress(lastVa) {
    await supabase
      .from("fightpassport_sync_runs")
      .update({
        last_processed_va: Number(lastVa),
        processed_count: processed,
        found_count: found,
        licensed_count: licensed,
        error_count: errors,
      })
      .eq("id", run.id);
  }

  async function workerLoop(workerIdx) {
    await sleep(workerIdx * STAGGER);

    let ctx = await createWorkerContext(browser);

    async function resetWorkerContext(reason = "") {
      console.log(
        `[fp-total] 🧨 reset worker context (worker${workerIdx + 1}) ${reason ? `(${reason})` : ""}`
      );
      await closeWorkerContext(ctx).catch(() => {});
      ctx = await createWorkerContext(browser);
    }

    while (true) {
      const myIdx = idx++;
      if (myIdx >= vaList.length) break;

      const va = vaList[myIdx];
      const label = `worker${workerIdx + 1}/${WORKERS}`;
      const itemStartedAt = new Date().toISOString();

      console.log(`[fp-total] 🤖 ${label} → VA ${va}`);

      await upsertSyncItem(run.id, va, {
        status: "processing",
        started_at: itemStartedAt,
      });

      let page = null;

      try {
        // Exact same principle as fp_bundle:
        // NEW TAB for this VA, direct fighter URL, verify header, close after this VA.
        page = await openTabToFighterVerified(browser, ctx, cookies, va, {
          maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
          softWaitMs: Number(process.env.SOFT_WAIT_MS ?? "2500"),
          betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "1200"),
          workerLabel: `[${label}]`,
        });

        if (!page) {
          processed++;

          await upsertSyncItem(run.id, va, {
            status: "not_found",
            profiel_gevonden: false,
            finished_at: new Date().toISOString(),
            error_step: null,
            error_message: null,
          });

          console.log(`[fp-total] — ${label} VA ${va}: niet gevonden / geen geldige fighter-header`);
          continue;
        }

        const openFreshPage = async (stepName = "") => {
          return await openTabToFighterVerified(browser, ctx, cookies, va, {
            maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
            softWaitMs: Number(process.env.SOFT_WAIT_MS ?? "2500"),
            betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "1200"),
            workerLabel: `[${label}${stepName ? ` ${stepName}` : ""}]`,
          });
        };

        const res = await withTimeout(
          () => scrapeOne(page, va, openFreshPage),
          SCRAPE_TIMEOUT_MS,
          `fp-total ${va}`,
          async () => {
            await resetWorkerContext(`timeout VA ${va}`);
            page = null;
          }
        );

        processed++;
        if (res.exists) found++;
        if (res.licensed) licensed++;

        await upsertSyncItem(run.id, va, {
          status: res.exists ? "success" : "not_found",
          naam: res.summary?.naam ?? null,
          profiel_gevonden: !!res.exists,
          licentie_actief: res.exists ? !!res.licensed : null,
          heeft_startverbod: res.exists ? !!res.summary?.heeft_startverbod : null,
          results_count: res.counts?.results ?? 0,
          gyms_count: res.counts?.gyms ?? 0,
          startbans_count: res.counts?.startbans ?? 0,
          licenses_count: res.counts?.licenses ?? 0,
          finished_at: new Date().toISOString(),
          error_step: null,
          error_message: null,
        });

        console.log(
          `[fp-total] ✅ ${label} VA ${va}: FULLFIGHTER=${res.exists ? "success" : "not_found"} | UITSLAGEN=${res.resultsStatus || "skipped"}${res.resultsError ? ` (${res.resultsError})` : ""}${res.licensed ? " | licentie" : ""}`
        );
      } catch (e) {
        processed++;
        errors++;

        const msg = e?.message ?? String(e);

        await upsertSyncItem(run.id, va, {
          status: "error",
          profiel_gevonden: false,
          error_step: String(msg).startsWith("HARD TIMEOUT") ? "timeout" : "scrape_or_save",
          error_message: msg,
          finished_at: new Date().toISOString(),
        });

        if (msg === "LOGIN_PAGE") {
          console.log(
            `[fp-total] 🔐 ${label} LOGIN_PAGE (VA ${va}) → master ensureLoggedIn + refresh cookies (LOCKED)`
          );

          try {
            await refreshMasterSessionLocked(`LOGIN_PAGE from ${label} VA ${va}`);
            await resetWorkerContext(`login refresh VA ${va}`);
          } catch (err) {
            console.log("[fp-total] ❌ master refresh failed:", err?.message ?? String(err));
          }
        } else {
          console.log(`[fp-total] ❌ ${label} fout VA ${va}:`, msg);
        }
      } finally {
        try {
          if (page) {
            await closeAnyModal(page).catch(() => {});
            await hardClosePage(page).catch(() => {});
          }
        } catch {}

        if (processed % 10 === 0 || Number(va) === END_VA) {
          await updateRunProgress(va).catch((e) =>
            console.log("[fp-total] run progress update fout:", e?.message ?? String(e))
          );
        }
      }
    }

    await closeWorkerContext(ctx).catch(() => {});
  }

  try {
    await Promise.all(Array.from({ length: WORKERS }, (_, i) => workerLoop(i)));

    await supabase
      .from("fightpassport_sync_runs")
      .update({
        status: "completed",
        last_processed_va: END_VA,
        processed_count: processed,
        found_count: found,
        licensed_count: licensed,
        error_count: errors,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
  } catch (e) {
    await supabase
      .from("fightpassport_sync_runs")
      .update({
        status: "failed",
        error_message: e?.message ?? String(e),
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    throw e;
  } finally {
    try {
      await masterPage.close();
    } catch {}

    try {
      await browser.close();
    } catch {}
  }
}

main().then(() => { console.log("✅ FightPassport totaal-scrape klaar"); process.exit(0); }).catch((e) => { console.error("❌ totaal-scrape mislukt", e); process.exit(1); });
