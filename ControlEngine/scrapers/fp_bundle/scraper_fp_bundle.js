// ControlEngine/scrapers/fp_bundle/scraper_fp_bundle.js
// ✅ MASTER tab logt 1x in en blijft open (sessie warm)
// ✅ Per VA: worker opent NIEUWE TAB DIRECT op fighter-url:
//     https://fightpassport.nl/#va_vechter/<va>
// ✅ Ziet hij login page? -> master ensureLoggedIn(force) -> cookies refresh (LOCKED)
// ✅ Ziet hij mismatch header? -> TAB SLUITEN -> NIEUWE TAB OPENEN met dezelfde fighter-url (retry)
// ✅ GEEN SYS42, GEEN dashboard “fixes”
//
// FULLFIGHTER -> fighters_raw
// UITSLAGEN  -> uitslagen_raw snapshot per (mm, run, va)
// ⚠️ DB verwachting fighters unique:
// UNIQUE (matchmaking_id, va_nummer)
// ⚠️ DB verwachting uitslagen unique:
// UNIQUE (matchmaking_id, controle_run_id, va_nummer, datum, evenement, tegenstander)

import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { readXlsxToRows } from "../utils/excelRowsExceljs.js";
import { fileURLToPath } from "url";

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err?.stack ?? err);
  process.exitCode = 1;
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err?.stack ?? err);
  process.exitCode = 1;
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeVaStrict(v) {
  const s = String(v ?? "").trim();
  const digits = s.replace(/\D/g, "");
  return /^\d{3,5}$/.test(digits) ? digits : null;
}

function safeSlug(v) {
  return String(v ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

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
        await wait(120);
      }
    } catch {}
  }

  try {
    await page.keyboard.press("Escape");
    await wait(80);
    await page.keyboard.press("Escape");
    await wait(80);
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
    const currentHash = await page.evaluate(() => location.hash).catch(() => "");

    if (
      String(info?.gotVa || "") === requestedVa &&
      String(currentHash || "") === wantedHash
    ) {
      await wait(500);

      const confirm = await readHeaderInfo(page);
      const confirmHash = await page.evaluate(() => location.hash).catch(() => "");

      if (
        String(confirm?.gotVa || "") === requestedVa &&
        String(confirmHash || "") === wantedHash
      ) {
        return true;
      }
    }

    const now = Date.now();

    if (now - lastForcedAt >= 1200) {
      lastForcedAt = now;

      await page.evaluate((forcedUrl, forcedHash) => {
        if (location.hash !== forcedHash) {
          location.hash = forcedHash;
        }

        if (location.href !== forcedUrl) {
          history.replaceState(null, "", forcedUrl);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
      }, url, wantedHash).catch(() => {});

      await wait(600);

      const afterForce = await readHeaderInfo(page);

      if (
        String(afterForce?.gotVa || "") !== requestedVa &&
        hardReloads < 3
      ) {
        hardReloads++;

        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 25000,
        }).catch(() => {});

        await wait(1200);
      }
    }

    await wait(250);
  }

  console.log(`[bundle] ❌ VA ${va} kon niet hard op juiste fighter-url worden vastgezet`, {
    urlNow: page.url(),
    header: await readHeaderInfo(page).catch(() => null),
  });

  return false;
}

async function openTabToFighterVerified(browser, context, cookies, va, opts) {
  const {
    maxAttempts = 5,
    softWaitMs = 1500,
    betweenAttemptsMs = 1200,
    workerLabel = "",
  } = opts ?? {};

  const requestedVa = String(va);
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

    await p.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    }).catch(() => {});

    const forced = await forceExactFighterUrl(p, va, 30000).catch((e) => {
      if (e?.message === "LOGIN_PAGE") throw e;
      return false;
    });

    if (!forced) {
      await hardClosePage(p).catch(() => {});
      await wait(betweenAttemptsMs);
      continue;
    }

    await wait(softWaitMs);

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
        await wait(500);
        const confirm = await readHeaderInfo(p);

        if (String(confirm?.gotVa || "") === requestedVa) {
          return p;
        }
      }

      await wait(pollMs);
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
    await wait(betweenAttemptsMs);
  }

  return null;
}

/* -------------------------------------------------------
   FULLFIGHTER scrape
------------------------------------------------------- */
async function scrapeHeader(page) {
  await page.waitForSelector(".koptekst1", { timeout: 20000 });

  return await page.evaluate(() => {
    const r = {
      va_nummer: null,
      naam: null,
      geboortedatum: null,
      leeftijd: null,
      geslacht: null,
    };

    const k1 = document.querySelector(".koptekst1");
    const k2 = document.querySelector(".koptekst2");

    const nameBlock = k1?.innerText?.trim() || "";
    const infoBlock = k2?.innerText?.trim() || "";

    const m = nameBlock.match(/^(.+)\((\d+)\)$/);
    if (m) {
      r.naam = m[1].trim();
      r.va_nummer = m[2].trim();
    }

    const p = infoBlock.split(" ");
    if (p[0]?.match(/^\d{2}-\d{2}-\d{4}$/)) r.geboortedatum = p[0];

    const age = infoBlock.match(/\((\d+)\s*jr/);
    if (age) r.leeftijd = parseInt(age[1], 10);

    const low = infoBlock.toLowerCase();
    if (low.includes("man")) r.geslacht = "man";
    if (low.includes("vrouw")) r.geslacht = "vrouw";

    return r;
  });
}

async function openTile(page, va, title) {
  await closeAnyModal(page);

  await page.evaluate(
    (va, title) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
      if (!tab) return;

      const head = [...tab.querySelectorAll(".tileHeader.enabled")].find(
        (h) => (h.innerText || "").trim().toUpperCase() === title.toUpperCase()
      );

      head?.closest(".tile")?.click();
    },
    va,
    title
  );

  await wait(650);
}

async function scrapeDetails(page, va) {
  // FightPassport rendert de DETAILS-tegel soms later dan de header.
  // Daarom niet direct na de klik uitlezen, maar kort pollen tot Licentie/Wedstrijden zichtbaar is.
  let last = null;

  for (let attempt = 1; attempt <= 12; attempt++) {
    last = await page.evaluate((va) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
      if (!tab) return null;

      const detailTiles = [...tab.querySelectorAll(`div[title="DETAILS"], .tile`)].filter((el) => {
        const title = String(el.getAttribute("title") || "").trim().toUpperCase();
        const header = String(el.querySelector(".tileHeader")?.innerText || "").trim().toUpperCase();
        const text = String(el.innerText || el.textContent || "").trim().toUpperCase();
        return title === "DETAILS" || header === "DETAILS" || text.startsWith("DETAILS");
      });

      const tile = detailTiles[0] || null;
      if (!tile) return null;

      const contentNodes = tile.querySelectorAll(
        "ul.get_tile_content p, ul.get_tile_content li, ul.get_tile_content div, .get_tile_content p, .get_tile_content li, .get_tile_content div"
      );

      let detailText = [...contentNodes]
        .map((el) => el.innerText || el.textContent || "")
        .join("\n");

      // Fallback: in sommige FP-renders staat de tekst direct in de tile.
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

      let licentie = null;
      let totaal = null;
      let gewonnen = null;
      let heeft_startverbod = false;

      function valueAfterLabel(text, labels) {
        const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
        const re = new RegExp(`(?:^|\\n|\\s)(?:${escaped})\\s*:?\\s*([^\\n]+)`, "i");
        const m = String(text || "").match(re);
        return (m?.[1] || "").trim() || null;
      }

      function normalizeJaNee(v) {
        const s = String(v || "").trim().toLowerCase();
        if (!s) return null;
        if (/^(ja|j|yes|true|geldig)\b/.test(s)) return "Ja";
        if (/^(nee|n|no|false|ongeldig)\b/.test(s)) return "Nee";
        return String(v || "").trim() || null;
      }

      licentie = normalizeJaNee(valueAfterLabel(allText, ["Licentie", "Geldige licentie", "License"]));

      const wedstrijdenRaw = valueAfterLabel(allText, ["Wedstrijden", "Totaal wedstrijden", "Aantal wedstrijden"]);
      if (wedstrijdenRaw) {
        const m = wedstrijdenRaw.match(/\d+/);
        totaal = m ? parseInt(m[0], 10) : null;
      }

      const gewonnenRaw = valueAfterLabel(allText, ["Gewonnen", "Wins"]);
      if (gewonnenRaw) {
        const m = gewonnenRaw.match(/\d+/);
        gewonnen = m ? parseInt(m[0], 10) : null;
      }

      for (const line of lines) {
        const txt = line.toLowerCase().trim();

        if (licentie == null && txt.includes("licentie")) {
          const rawValue = line.includes(":") ? line.split(":").slice(1).join(":") : line.replace(/licentie/ig, "");
          licentie = normalizeJaNee(rawValue);
        }

        if (totaal == null && txt.startsWith("wedstrijden")) {
          const m = line.match(/\d+/);
          totaal = m ? parseInt(m[0], 10) : null;
        }

        if (gewonnen == null && txt.startsWith("gewonnen")) {
          const m = line.match(/\d+/);
          gewonnen = m ? parseInt(m[0], 10) : null;
        }

        if (txt.includes("startverbod")) {
          if (txt.includes("nee") || txt.includes("geen")) {
            heeft_startverbod = false;
          } else if (txt.includes("ja") || txt.includes("actief")) {
            heeft_startverbod = true;
          } else {
            const hasDate = /\d{2}-\d{2}-\d{4}/.test(line);
            if (hasDate) heeft_startverbod = true;
          }
        }
      }

      return {
        licentie,
        totaal,
        gewonnen,
        heeft_startverbod: heeft_startverbod ? "Ja" : "Nee",
        _raw_lines: lines.slice(0, 8),
      };
    }, va);

    if (last?.licentie != null || last?.totaal != null || last?.gewonnen != null) {
      const { _raw_lines, ...clean } = last;
      return clean;
    }

    if (attempt === 4 || attempt === 8) {
      await openTile(page, va, "DETAILS");
    }

    await wait(250);
  }

  console.log("[fullfighter] ⚠️ DETAILS niet volledig geladen/gelezen", {
    va: String(va),
    raw: last?._raw_lines ?? null,
  });

  if (last) {
    const { _raw_lines, ...clean } = last;
    return clean;
  }

  return null;
}

async function openDetailsVerified(page, va, timeoutMs = 20000) {
  await closeAnyModal(page).catch(() => {});

  const exactVaLoaded = await forceExactFighterUrl(page, va, 30000);
  if (!exactVaLoaded) return false;

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
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
      await wait(1200);
      return true;
    }

    await wait(250);
  }

  return false;
}

async function waitForDetailsContent(page, va) {
  let last = null;

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

    await wait(500);
  }

  console.log(`[fullfighter] ⚠️ VA ${va} DETAILS tegelinhoud nog niet volledig zichtbaar`, {
    raw: last?.raw ?? null,
  });

  return false;
}

async function waitForDetailsModalStable(page, timeoutMs = 30000) {
  let previousSignature = "";
  let stableChecks = 0;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const signature = await page.evaluate(() => {
      const visibleModal = [...document.querySelectorAll(".outer, .modal, [role=dialog]")].find((el) => {
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);

        return (
          r.width > 300 &&
          r.height > 200 &&
          st.display !== "none" &&
          st.visibility !== "hidden"
        );
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

    if (signature && stableChecks >= 7) {
      return true;
    }

    await wait(350);
  }

  return false;
}

function detailsComplete(details, zero) {
  if (!details || typeof details !== "object") return false;

  const hasDetails =
    details.licentie != null ||
    details.totaal != null ||
    details.gewonnen != null ||
    details.heeft_startverbod != null;

  const hasZero =
    zero &&
    (
      zero.totaal != null ||
      zero.klasse != null ||
      String(zero.opmerking || "").trim() !== ""
    );

  return hasDetails || hasZero;
}

async function scrapeZeroMeting(page) {
  const exists = await page.$("input.dnva_nulmetingaantalwedstr");
  if (!exists) {
    await closeAnyModal(page);
    return { totaal: 0, opmerking: "", klasse: null };
  }

  const result = await page.evaluate(() => {
    const totaal =
      parseInt(
        (document.querySelector("input.dnva_nulmetingaantalwedstr")?.value || "").replace(/\D/g, "")
      ) || 0;

    const opmerking = document.querySelector("textarea.dvcz_omschr2")?.value?.trim() || "";

    let klasse = null;
    const sel = document.querySelector("select.dvnulmetingklasseoms");
    if (sel) {
      const opt = sel.options[sel.selectedIndex];
      klasse = opt?.textContent?.trim() || sel.value || null;
    }

    return { totaal, opmerking, klasse };
  });

  await closeAnyModal(page);
  return result;
}

async function saveFighterRaw(requestedVA, header, details, zero, matchmaking_id, controle_run_id) {
  if (!header?.va_nummer) return;

  if (String(header.va_nummer) !== String(requestedVA)) {
    console.log("[fullfighter] ⚠️ VA mismatch!", {
      requested: String(requestedVA),
      got: String(header.va_nummer),
      naam: header?.naam ?? null,
    });
    return;
  }

  let geboortedatum_correct = null;
  if (header.geboortedatum) {
    const [dd, mm, yyyy] = header.geboortedatum.split("-");
    geboortedatum_correct = `${yyyy}-${mm}-${dd}`;
  }

  const payload = {
    matchmaking_id: matchmaking_id ?? null,
    controle_run_id: controle_run_id ?? null,

    va_nummer: String(header.va_nummer),
    naam: header.naam,
    geboortedatum: geboortedatum_correct,
    geslacht: header.geslacht,

    licentie: details?.licentie || null,
    heeft_startverbod: details?.heeft_startverbod === "Ja" ? "Ja" : "Nee",

    totaal_wedstrijden: details?.totaal ?? null,
    gewonnen: details?.gewonnen ?? null,

    nulmeting_totaal: zero?.totaal ?? null,
    nulmeting_opmerking: zero?.opmerking || null,
    nulmeting_klasse: zero?.klasse || null,
  };

  const { error } = await supabase.from("fighters_raw").upsert(payload, {
    onConflict: "matchmaking_id,va_nummer",
  });

  if (error) console.log("[fullfighter] ❌ fighters_raw upsert fout:", error.message);
  else console.log("[fullfighter] ✅ fighters_raw upsert OK:", header.va_nummer);
}

async function doFullfighter(page, va, matchmaking_id, controle_run_id) {
  const header = await scrapeHeader(page);

  if (!header?.va_nummer) {
    throw new Error(`FULLFIGHTER: header.va_nummer ontbreekt voor VA ${va}`);
  }

  if (String(header.va_nummer) !== String(va)) {
    throw new Error(
      `FULLFIGHTER: VA mismatch requested=${va} got=${header.va_nummer}`
    );
  }

  let details = null;
  let zero = null;
  let lastError = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const exact = await forceExactFighterUrl(page, va, 30000);

      if (!exact) {
        throw new Error("DETAILS: juiste VA niet bevestigd");
      }

      const opened = await openDetailsVerified(page, va, 20000);

      if (!opened) {
        throw new Error("DETAILS: tegel niet correct geopend");
      }

      const tileReady = await waitForDetailsContent(page, va);

      if (!tileReady) {
        throw new Error("DETAILS: tegelinhoud niet volledig geladen");
      }

      await wait(1800);
      await waitForDetailsModalStable(page, 30000);
      await wait(1500);

      details = await scrapeDetails(page, va);
      zero = await scrapeZeroMeting(page);

      if (!detailsComplete(details, zero)) {
        throw new Error("DETAILS geopend maar inhoud onvoldoende/lege scrape");
      }

      console.log(`[fullfighter] ✅ VA ${va} DETAILS gelukt (poging ${attempt})`);
      lastError = null;
      break;
    } catch (e) {
      lastError = e;

      console.log(
        `[fullfighter] ⚠️ VA ${va} DETAILS poging ${attempt}/5 mislukt:`,
        e?.message ?? String(e)
      );

      await closeAnyModal(page).catch(() => {});
      await wait(1000);
    }
  }

  if (lastError || !detailsComplete(details, zero)) {
    throw new Error(
      `DETAILS verplicht maar niet gelukt voor VA ${va}: ${
        lastError?.message ?? "onvoldoende gegevens"
      }`
    );
  }

  await saveFighterRaw(
    va,
    header,
    details,
    zero,
    matchmaking_id,
    controle_run_id
  );
}

/* -------------------------------------------------------
   UITSLAGEN scrape
------------------------------------------------------- */
function parseNlDate(v) {
  if (!v) return null;

  const s = String(v).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!m) return null;

  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  let yy = m[3];

  if (yy.length === 2) yy = Number(yy) < 30 ? `20${yy}` : `19${yy}`;

  return `${yy}-${mm}-${dd}`;
}

function toStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

async function fetchPartijNrByVa(matchmaking_id) {
  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("partij_nr, va_rood, va_blauw")
    .eq("matchmaking_id", matchmaking_id);

  if (error) throw error;

  const normVa = (v) => {
    const s = String(v ?? "")
      .trim()
      .replace(/\D+/g, "");
    if (!s) return null;

    const noZeros = s.replace(/^0+/, "");
    return noZeros ? noZeros : null;
  };

  const tmp = new Map();

  for (const r of data ?? []) {
    const nr = r?.partij_nr ?? null;
    if (!nr) continue;

    const vaR = normVa(r?.va_rood);
    const vaB = normVa(r?.va_blauw);

    if (vaR) {
      if (!tmp.has(vaR)) tmp.set(vaR, new Set());
      tmp.get(vaR).add(nr);
    }

    if (vaB) {
      if (!tmp.has(vaB)) tmp.set(vaB, new Set());
      tmp.get(vaB).add(nr);
    }
  }

  const out = new Map();

  for (const [va, set] of tmp.entries()) {
    out.set(
      va,
      Array.from(set).sort((a, b) => Number(a) - Number(b))
    );
  }

  return out;
}

async function openUitslagenTile(page, va, timeoutMs = 20000) {
  await closeAnyModal(page);

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const clicked = await page.evaluate((requestedVa) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      if (!tab) return false;

      const headers = [...tab.querySelectorAll(".tileHeader.enabled")];
      const target = headers.find(
        (h) => String(h.innerText || "").trim().toUpperCase() === "UITSLAGEN"
      );

      const tile = target?.closest(".tile");
      if (!tile) return false;

      tile.scrollIntoView?.({ block: "center" });
      tile.click();
      return true;
    }, va).catch(() => false);

    if (!clicked) {
      await wait(400);
      continue;
    }

    await wait(1200);

    const found = await findUitslagenDownloadControl(page, 8000);
    if (found) return found;

    await closeAnyModal(page).catch(() => {});
    await wait(600);
  }

  return null;
}

async function findUitslagenDownloadControl(page, timeoutMs = 10000) {
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

            const contextText = String(
              container.innerText || document.body.innerText || ""
            )
              .replace(/\u00a0/g, " ")
              .toUpperCase();

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

    await wait(300);
  }

  return null;
}

async function downloadExcel(page, matchmaking_id, va, initialFound = null) {
  const mm = safeSlug(matchmaking_id);
  const vaSafe = String(va ?? "").replace(/[^0-9]/g, "");
  const uniq = crypto.randomUUID().slice(0, 8);

  const downloadDir = path.resolve(__dirname, "downloads", mm, `${vaSafe}_${uniq}`);
  fs.mkdirSync(downloadDir, { recursive: true });

  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
  });

  const found =
    initialFound ||
    await findUitslagenDownloadControl(page, 45000);

  if (!found) {
    fs.rmSync(downloadDir, { recursive: true, force: true });
    throw new Error(`UITSLAGEN downloadknop niet gevonden — VA ${va}`);
  }

  const clickDownload = async () => {
    if (found.handle) {
      await found.frame.evaluate((el) => {
        el?.scrollIntoView?.({ block: "center" });
        el?.click?.();
      }, found.handle);
      return;
    }

    await found.frame.evaluate((sel) => {
      const el = document.querySelector(sel);
      el?.scrollIntoView?.({ block: "center" });
      el?.click?.();
    }, found.selector);
  };

  console.log(`[uitslagen] ⬇️ VA ${va} download gestart; wachten op Excel...`);
  await clickDownload();

  const start = Date.now();
  const maxWaitMs = Number(process.env.UITSLAGEN_DOWNLOAD_TIMEOUT_MS ?? "180000");
  let retried = false;
  let lastLogAt = 0;

  while (Date.now() - start < maxWaitMs) {
    let filesNow = [];
    try {
      filesNow = fs.readdirSync(downloadDir);
    } catch {
      filesNow = [];
    }

    const elapsedMs = Date.now() - start;

    if (Date.now() - lastLogAt >= 5000) {
      lastLogAt = Date.now();
      console.log(
        `[uitslagen] ⏳ VA ${va} wacht op Excel (${Math.round(elapsedMs / 1000)}s)`,
        { files: filesNow }
      );
    }

    const xlsxFiles = filesNow
      .filter((f) => f.toLowerCase().endsWith(".xlsx"))
      .map((f) => path.join(downloadDir, f))
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
        `[uitslagen] 📥 VA ${va} Excel gezien; wachten tot bestand volledig klaar is: ${path.basename(candidate)}`
      );

      let lastSize = -1;
      let stableSince = null;
      const completeCheckStartedAt = Date.now();

      while (Date.now() - completeCheckStartedAt < 60000) {
        let currentFiles = [];
        try {
          currentFiles = fs.readdirSync(downloadDir);
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
          await wait(1500);

          try {
            await readXlsxToRows(candidate, { sheetIndex: 0 });

            console.log(
              `[uitslagen] ✅ VA ${va} Excel volledig binnen (${size} bytes)`
            );

            return {
              file: candidate,
              dir: downloadDir,
            };
          } catch (e) {
            console.log(
              `[uitslagen] ⏳ VA ${va} Excel bestaat maar is nog niet leesbaar:`,
              e?.message ?? String(e)
            );
            stableSince = null;
          }
        }

        await wait(500);
      }
    }

    if (
      !retried &&
      elapsedMs > 20000 &&
      filesNow.length === 0
    ) {
      retried = true;
      console.log(
        `[uitslagen] 🔁 VA ${va} na 20s nog geen bestand; download één keer opnieuw klikken`
      );
      await clickDownload().catch(() => {});
    }

    await wait(500);
  }

  fs.rmSync(downloadDir, { recursive: true, force: true });
  return null;
}

async function parseExcel(filePath, va, matchmaking_id, controle_run_id) {
  const rows = await readXlsxToRows(filePath, { sheetIndex: 0 });

  const headerRow = rows[4] || [];
  const headers = headerRow.map((h) => (h ? String(h).trim() : ""));

  const idxDatum = headers.indexOf("Datum");
  const idxEvenement = headers.indexOf("Evenement");
  const idxTegenstander = headers.indexOf("Tegenstander");
  const idxSportschool = headers.indexOf("Sportschool");
  const idxDiscipline = headers.indexOf("Discipline");
  const idxKlasse = headers.indexOf("Kl.");
  const idxGewicht = headers.indexOf("Gewicht");
  const idxUitslag = headers.indexOf("Uitslag");

  const must = [
    ["Datum", idxDatum],
    ["Evenement", idxEvenement],
    ["Tegenstander", idxTegenstander],
    ["Discipline", idxDiscipline],
    ["Uitslag", idxUitslag],
  ];

  const missing = must.filter(([, idx]) => idx === -1).map(([name]) => name);

  if (missing.length) {
    return {
      rows: [],
      meta: {
        ok: false,
        emptyExport: true,
        missingHeaders: missing,
        headers: headers.filter(Boolean),
      },
    };
  }

  const out = [];

  for (let r = 5; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const d = row[idxDatum];
    if (!d) continue;

    const isoDatum = parseNlDate(d);
    if (!isoDatum) continue;

    out.push({
      matchmaking_id,
      controle_run_id,
      va_nummer: String(va),

      datum: isoDatum,
      evenement: toStr(row[idxEvenement]) ?? null,
      tegenstander: toStr(row[idxTegenstander]) ?? null,

      sportschool: idxSportschool !== -1 ? toStr(row[idxSportschool]) ?? null : null,
      discipline: toStr(row[idxDiscipline]) ?? null,
      klasse: idxKlasse !== -1 ? toStr(row[idxKlasse]) ?? null : null,
      gewicht: idxGewicht !== -1 ? toStr(row[idxGewicht]) ?? null : null,
      uitslag: toStr(row[idxUitslag]) ?? null,
    });
  }

  const seen = new Set();
  const deduped = [];

  for (const r of out) {
    const k = [
      r.matchmaking_id,
      r.controle_run_id,
      r.va_nummer,
      r.datum,
      r.evenement,
      r.tegenstander,
      r.uitslag,
      r.discipline,
      r.klasse,
    ]
      .map((x) =>
        String(x ?? "")
          .replace(/\s+/g, " ")
          .trim()
      )
      .join("||");

    if (seen.has(k)) continue;

    seen.add(k);
    deduped.push(r);
  }

  return {
    rows: deduped,
    meta: {
      ok: true,
      emptyExport: false,
      missingHeaders: [],
      headers: headers.filter(Boolean),
    },
  };
}

async function saveUitslagenSnapshot(rows, matchmaking_id, controle_run_id, va, partijNrByVaMap) {
  const vaStr = String(va ?? "").trim();
  const data = Array.isArray(rows) ? rows : [];

  const partijList = partijNrByVaMap?.get?.(vaStr) ?? [];
  const partij_nr = Array.isArray(partijList) && partijList.length ? Number(partijList[0]) : null;

  const { error: delErr } = await supabase
    .from("uitslagen_raw")
    .delete()
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id)
    .eq("va_nummer", vaStr);

  if (delErr) throw delErr;

  if (!data.length) return { saved: 0 };

  const normalized = data.map((row) => ({
    ...row,
    matchmaking_id,
    controle_run_id,
    va_nummer: vaStr,
    partij_nr,
  }));

  const { error: insErr } = await supabase.from("uitslagen_raw").upsert(normalized, {
    onConflict: "matchmaking_id,controle_run_id,va_nummer,datum,evenement,tegenstander",
    ignoreDuplicates: false,
  });

  if (insErr) throw insErr;

  return { saved: normalized.length };
}

async function doUitslagen(page, matchmaking_id, controle_run_id, va, partijNrByVaMap) {
  console.log(`[uitslagen] ▶️ start VA ${va}`);

  const MAX_TRIES = Number(process.env.UITSLAGEN_TRIES ?? "1");
  let lastMeta = null;

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    let download = null;

    try {
      const downloadControl = await openUitslagenTile(page, va);

      if (!downloadControl) {
        throw new Error(`UITSLAGEN tegel/downloadknop niet geladen — VA ${va}`);
      }

      download = await downloadExcel(
        page,
        matchmaking_id,
        va,
        downloadControl
      );

      if (!download) {
        console.log(`[uitslagen] ❌ VA ${va} geen volledig Excel-bestand ontvangen`);
        return { ok: false, n: 0, reason: "no_file" };
      }

      const parsed = await parseExcel(
        download.file,
        va,
        matchmaking_id,
        controle_run_id
      );

      lastMeta = parsed?.meta ?? null;

      if (parsed?.meta?.ok) {
        const res = await saveUitslagenSnapshot(
          parsed.rows,
          matchmaking_id,
          controle_run_id,
          va,
          partijNrByVaMap
        );

        const n = res?.saved ?? parsed.rows.length ?? 0;

        // Pas NA succesvolle DB-save opruimen.
        fs.rmSync(download.dir, { recursive: true, force: true });

        console.log(`[uitslagen] ✅ done VA ${va} (n=${n})`);
        return { ok: true, n, reason: "ok" };
      }

      const missing = lastMeta?.missingHeaders ?? [];
      const headers = lastMeta?.headers ?? [];

      console.log(
        `[uitslagen] ℹ️ Geen uitslagen gevonden voor VA ${va} (lege export / geen kolomkoppen)`,
        {
          attempt,
          missingHeaders: missing,
          headers,
        }
      );

      await saveUitslagenSnapshot(
        [],
        matchmaking_id,
        controle_run_id,
        va,
        partijNrByVaMap
      );

      // Ook bij aantoonbaar lege export pas na DB-save opruimen.
      fs.rmSync(download.dir, { recursive: true, force: true });

      return {
        ok: true,
        n: 0,
        reason: "geen_uitslagen",
        missingHeaders: missing,
      };
    } catch (e) {
      // Bij parse/downloadfout mag tijdelijke map weg.
      // Bij DB-savefout laten we hem juist staan voor controle/herstel.
      const msg = e?.message ?? String(e);
      const looksLikeDbError =
        /supabase|duplicate|violates|constraint|database|insert|upsert|delete/i.test(msg);

      if (download?.dir && !looksLikeDbError) {
        fs.rmSync(download.dir, { recursive: true, force: true });
      }

      if (attempt >= MAX_TRIES) throw e;

      console.log(
        `[uitslagen] ⚠️ VA ${va} poging ${attempt}/${MAX_TRIES} mislukt:`,
        msg
      );

      await closeAnyModal(page).catch(() => {});
      await wait(1000);
    }
  }

  return { ok: false, n: 0, reason: "no_uitslagen" };
}

/* -------------------------------------------------------
   RUN (worker pool) - per worker context (killbaar)
------------------------------------------------------- */
async function runBundle(matchmaking_id, controle_run_id, vaList, workers = 5) {
  const partijNrByVaMap = await fetchPartijNrByVa(matchmaking_id);

  const { browser, page: masterPage } = await loginFightPassport();

  let cookies = [];

  try {
    cookies = await masterPage.cookies();
  } catch {}

  console.log("[bundle] ✅ Master logged in (cookies captured)");

  let masterRefreshPromise = null;

  async function refreshMasterSessionLocked(reason = "") {
    if (masterRefreshPromise) {
      try {
        await masterRefreshPromise;
      } catch {}

      return cookies;
    }

    masterRefreshPromise = (async () => {
      console.log(`[bundle] 🔁 master ensureLoggedIn(force) start ${reason ? `(${reason})` : ""}`);
      await ensureLoggedIn(masterPage, { force: true });

      try {
        cookies = await masterPage.cookies();
      } catch {}

      console.log("[bundle] ✅ master refreshed (cookies updated)");
      return cookies;
    })();

    try {
      return await masterRefreshPromise;
    } finally {
      masterRefreshPromise = null;
    }
  }

  const FULLFIGHTER_TIMEOUT_MS = Number(process.env.FULLFIGHTER_TIMEOUT_MS ?? "240000");
  const UITSLAGEN_TIMEOUT_MS = Number(process.env.UITSLAGEN_TIMEOUT_MS ?? "240000");

  let idx = 0;

  async function workerLoop(workerIdx) {
    const STAGGER = Number(process.env.STAGGER_MS ?? "350");
    await wait(workerIdx * STAGGER);

    let ctx = await createWorkerContext(browser);

    async function resetWorkerContext(reason) {
      console.log(`[bundle] 🧨 reset worker context (worker${workerIdx + 1}) ${reason ? `(${reason})` : ""}`);
      await closeWorkerContext(ctx).catch(() => {});
      ctx = await createWorkerContext(browser);
    }

    while (true) {
      const myIdx = idx++;
      if (myIdx >= vaList.length) break;

      const va = vaList[myIdx];
      const label = `worker${workerIdx + 1}/${workers}`;

      console.log(`[bundle] 🤖 ${label} → VA ${va} (run=${controle_run_id})`);

      let page = null;
      let fullfighterStatus = "skip";
      let uitslagenStatus = "skip";

      try {
        page = await openTabToFighterVerified(browser, ctx, cookies, va, {
          maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
          softWaitMs: Number(process.env.SOFT_WAIT_MS ?? "2500"),
          betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "1200"),
          workerLabel: `[${label}]`,
        });

        if (!page) {
          console.log(`[bundle] ❌ ${label} kon fighter niet openen na retries: VA ${va}`);
          fullfighterStatus = "open_fail";
          uitslagenStatus = "open_fail";
          continue;
        }

        await withTimeout(
          () => doFullfighter(page, va, matchmaking_id, controle_run_id),
          FULLFIGHTER_TIMEOUT_MS,
          `fullfighter ${va}`,
          async () => {
            await resetWorkerContext(`fullfighter timeout VA ${va}`);
            page = null;
          }
        );

        fullfighterStatus = "ok";

        const uRes = await withTimeout(
          () => doUitslagen(page, matchmaking_id, controle_run_id, va, partijNrByVaMap),
          UITSLAGEN_TIMEOUT_MS,
          `uitslagen ${va}`,
          async () => {
            await resetWorkerContext(`uitslagen timeout VA ${va}`);
            page = null;
          }
        );

        uitslagenStatus = uRes?.ok ? `ok(n=${uRes?.n ?? 0})` : `fail(${uRes?.reason ?? "unknown"})`;
      } catch (e) {
        const msg = e?.message ?? String(e);

        if (msg === "LOGIN_PAGE") {
          console.log(
            `[bundle] 🔐 ${label} LOGIN_PAGE (VA ${va}) → master ensureLoggedIn + refresh cookies (LOCKED)`
          );

          fullfighterStatus = "login_page";
          uitslagenStatus = "login_page";

          try {
            await refreshMasterSessionLocked(`LOGIN_PAGE from ${label} VA ${va}`);
            await resetWorkerContext(`login refresh VA ${va}`);
          } catch (err) {
            console.log("[bundle] ❌ master refresh failed:", err?.message ?? String(err));
          }
        } else if (String(msg).startsWith("HARD TIMEOUT")) {
          if (msg.includes("fullfighter")) {
            fullfighterStatus = "timeout";
            uitslagenStatus = "skipped_fullfighter_timeout";
          } else if (msg.includes("uitslagen")) {
            uitslagenStatus = "timeout";
          }

          console.log(`[bundle] ❌ ${label} fout VA ${va}:`, msg);
        } else {
          console.log(`[bundle] ❌ ${label} fout VA ${va}:`, msg);

          if (fullfighterStatus === "skip") fullfighterStatus = "error";
          if (uitslagenStatus === "skip") uitslagenStatus = "error";
        }
      } finally {
        console.log(
          `[bundle] ✅ END ${label} VA ${va} | fullfighter=${fullfighterStatus} | uitslagen=${uitslagenStatus}`
        );

        try {
          if (page) {
            await closeAnyModal(page).catch(() => {});
            await hardClosePage(page).catch(() => {});
          }
        } catch {}
      }
    }

    await closeWorkerContext(ctx).catch(() => {});
  }

  try {
    await Promise.all(Array.from({ length: workers }, (_, i) => workerLoop(i)));
  } finally {
    try {
      await masterPage.close();
    } catch {}

    try {
      await browser.close();
    } catch {}
  }
}

/* -------------------------------------------------------
   CLI
------------------------------------------------------- */
const matchmaking_id = (process.argv[2] ?? "").trim();
const controle_run_id = (process.argv[3] ?? "").trim();
const args = process.argv.slice(4);

const vaList = args.map(normalizeVaStrict).filter(Boolean).map(String);

if (!matchmaking_id) {
  console.error("❌ matchmaking_id ontbreekt");
  process.exit(1);
}

if (!controle_run_id) {
  console.error("❌ controle_run_id ontbreekt");
  process.exit(1);
}

if (!vaList.length) {
  console.error("❌ Geen geldige VA’s meegegeven (verwacht 3–5 cijfers).");
  process.exit(1);
}

const WORKERS = Number(process.env.WORKERS ?? "5");

const workers =
  Number.isFinite(WORKERS) && WORKERS > 0 ? Math.min(10, Math.max(1, Math.floor(WORKERS))) : 5;

console.log("SCRAPER — FP_BUNDLE (reopen tab until header matches)", {
  matchmaking_id,
  controle_run_id,
  count: vaList.length,
  workers,
  stagger_ms: Number(process.env.STAGGER_MS ?? "350"),
  tab_attempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
  soft_wait_ms: Number(process.env.SOFT_WAIT_MS ?? "2500"),
  between_attempts_ms: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "1200"),
  uitslagen_tries: Number(process.env.UITSLAGEN_TRIES ?? "2"),
  fullfighter_timeout_ms: Number(process.env.FULLFIGHTER_TIMEOUT_MS ?? "240000"),
  uitslagen_timeout_ms: Number(process.env.UITSLAGEN_TIMEOUT_MS ?? "240000"),
  va_sample: vaList.slice(0, 6),
});

runBundle(matchmaking_id, controle_run_id, vaList, workers)
  .then(() => {
    console.log("✅ FP bundle klaar");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ FP bundle hard failed:", e?.stack ?? e?.message ?? String(e));
    process.exit(1);
  });