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


const DOPING_COMMENT = "Doping certificaat behaald";

async function enableNulmetingEditing(page, va, timeoutMs = 20000) {
  const receiverSelector = "div.receiver.switch_on";

  console.log(`[doping-writer] VA ${va}: START switch zoeken`);
  console.log(`[doping-writer] VA ${va}: selector = ${receiverSelector}`);

  await page.evaluate((requestedVa, selector) => {
    document.getElementById("doping-writer-debug")?.remove();
    const box = document.createElement("div");
    box.id = "doping-writer-debug";
    box.style.cssText = [
      "position:fixed",
      "top:10px",
      "left:10px",
      "z-index:2147483647",
      "background:#b00020",
      "color:white",
      "padding:12px 16px",
      "font:700 16px/1.35 Arial,sans-serif",
      "border:4px solid yellow",
      "box-shadow:0 0 0 4px black",
      "white-space:pre-wrap"
    ].join(";");
    box.textContent = `DOPING WRITER VA ${requestedVa}\nZOEK NU:\n${selector}`;
    document.body.appendChild(box);
  }, va, receiverSelector).catch((e) => {
    console.log(`[doping-writer] VA ${va}: debugvak kon niet worden geplaatst: ${e?.message ?? e}`);
  });

  const startedAt = Date.now();
  let lastLogAt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const frames = page.frames();
    let totalExact = 0;
    let totalOn = 0;

    for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
      const frame = frames[frameIndex];
      const counts = await frame.evaluate((selector) => ({
        exact: document.querySelectorAll(selector).length,
        on: document.querySelectorAll("div.receiver.switch_on").length,
        offSlider: document.querySelectorAll("span.drag.slider_off").length,
        title: document.title,
        url: location.href,
      }), receiverSelector).catch(() => null);

      if (!counts) continue;
      totalExact += counts.exact;
      totalOn += counts.on;

      if (counts.exact > 0) {
        console.log(`[doping-writer] VA ${va}: GEVONDEN in frame ${frameIndex}`, counts);

        const handle = await frame.$("div.receiver.switch_on");
        if (!handle) continue;

        await frame.evaluate((selector, requestedVa) => {
          const el = document.querySelector(selector);
          if (!el) return;
          el.scrollIntoView({ block: "center", inline: "center" });
          el.style.setProperty("outline", "8px solid red", "important");
          el.style.setProperty("box-shadow", "0 0 0 8px yellow", "important");
          el.style.setProperty("background", "lime", "important");

          const box = document.getElementById("doping-writer-debug");
          if (box) {
            box.style.background = "#006400";
            box.textContent = `DOPING WRITER VA ${requestedVa}\nGEVONDEN EN KLIK NU:\n${selector}`;
          }
        }, receiverSelector, va);

        await wait(1500);
        console.log(`[doping-writer] VA ${va}: klik NU exact receiver.switch_on`);
        await handle.click({ delay: 120 });
        console.log(`[doping-writer] VA ${va}: ElementHandle.click uitgevoerd`);

        await wait(800);

        const state = await frame.evaluate((selector) => {
          const receiver = document.querySelector(selector);
          const slider = document.querySelector(
            "#id_HPJVCoorn > div.flex_detail_header_right > div.edit_switch > span.drag"
          );
          const textarea = document.querySelector("textarea.dvcz_omschr2");
          return {
            receiverClass: receiver?.className || null,
            sliderClass: slider?.className || null,
            textareaDisabled: textarea?.disabled ?? null,
            textareaReadOnly: textarea?.readOnly ?? null,
          };
        }, receiverSelector).catch(() => null);

        console.log(`[doping-writer] VA ${va}: toestand NA klik`, state);

        if (
          state &&
          (String(state.sliderClass || "").includes("slider_on") ||
            (state.textareaDisabled === false && state.textareaReadOnly === false))
        ) {
          return true;
        }

        console.log(`[doping-writer] VA ${va}: selector is gevonden en aangeklikt, maar switch werd niet actief`);
        return false;
      }
    }

    if (Date.now() - lastLogAt >= 1000) {
      lastLogAt = Date.now();
      console.log(
        `[doping-writer] VA ${va}: nog zoeken | frames=${frames.length} | exact=${totalExact} | receiver.switch_on=${totalOn}`
      );

      await page.evaluate((requestedVa, framesCount, exactCount, onCount) => {
        const box = document.getElementById("doping-writer-debug");
        if (box) {
          box.textContent = `DOPING WRITER VA ${requestedVa}\nNOG ZOEKEN...\nframes=${framesCount} exact=${exactCount} receiver.switch_on=${onCount}`;
        }
      }, va, frames.length, totalExact, totalOn).catch(() => {});
    }

    await wait(250);
  }

  console.log(`[doping-writer] VA ${va}: TIMEOUT - exacte switch niet gevonden`);
  return false;
}

async function writeDopingCommentInOpenDetails(page, va, timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await page.evaluate((comment) => {
      const visible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && st.display !== "none" && st.visibility !== "hidden";
      };

      const textarea = [...document.querySelectorAll("textarea.dvcz_omschr2")].find(visible);
      if (!textarea || textarea.disabled || textarea.readOnly) return null;

      const current = String(textarea.value || "").trim();
      const alreadyPresent = current
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .includes(comment.toLowerCase());

      if (alreadyPresent) {
        return { changed: false, value: current };
      }

      const nextValue = current ? `${current}\n${comment}` : comment;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;

      if (setter) setter.call(textarea, nextValue);
      else textarea.value = nextValue;

      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.dispatchEvent(new Event("blur", { bubbles: true }));

      return { changed: true, value: nextValue };
    }, DOPING_COMMENT).catch(() => null);

    if (result) return result;
    await wait(250);
  }

  throw new Error(`NULMETING: opmerkingenveld niet schrijfbaar voor VA ${va}`);
}

async function saveOpenNulmeting(page, va, timeoutMs = 20000) {
  const selector = "div.receiver.switch_off";
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    for (const frame of page.frames()) {
      const handle = await frame.$(selector).catch(() => null);
      if (!handle) continue;

      const isVisible = await frame.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          st.display !== "none" &&
          st.visibility !== "hidden"
        );
      }, handle).catch(() => false);

      if (!isVisible) continue;

      await frame.evaluate((el) => {
        el.scrollIntoView?.({ block: "center", inline: "center" });
      }, handle).catch(() => {});

      console.log(`[doping-writer] VA ${va}: klik switch_off om op te slaan`);
      await handle.click({ delay: 120 });
      await wait(350);
      return true;
    }

    await wait(250);
  }

  throw new Error(`NULMETING: switch_off niet gevonden voor VA ${va}`);
}

async function doDopingWriter(page, va) {
  const header = await scrapeHeader(page);

  if (!header?.va_nummer) {
    throw new Error(`DOPING_WRITER: header.va_nummer ontbreekt voor VA ${va}`);
  }

  if (String(header.va_nummer) !== String(va)) {
    throw new Error(`DOPING_WRITER: VA mismatch requested=${va} got=${header.va_nummer}`);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`[doping-writer] VA ${va}: stap 1 forceExactFighterUrl`);
      const exact = await forceExactFighterUrl(page, va, 30000);
      if (!exact) throw new Error("DETAILS: juiste VA niet bevestigd");

      console.log(`[doping-writer] VA ${va}: stap 2 openDetailsVerified`);
      const opened = await openDetailsVerified(page, va, 20000);
      if (!opened) throw new Error("DETAILS: tegel niet correct geopend");

      console.log(`[doping-writer] VA ${va}: stap 3 DETAILS open, ga NU switch zoeken`);
      const editing = await enableNulmetingEditing(page, va, 20000);
      if (!editing) throw new Error("NULMETING: wijzigingsschakelaar niet gevonden of opmerkingenveld bleef geblokkeerd");

      const result = await writeDopingCommentInOpenDetails(page, va, 20000);

      if (!result.changed) {
        console.log(`[doping-writer] ℹ️ VA ${va}: opmerking stond al in nulmeting`);
        return { va, ok: true, status: "already_present" };
      }

      await saveOpenNulmeting(page, va, 20000);
      console.log(`[doping-writer] ✅ VA ${va}: dopingcertificaat opgeslagen in nulmeting`);
      return { va, ok: true, status: "written" };
    } catch (e) {
      lastError = e;
      console.log(
        `[doping-writer] ⚠️ VA ${va} poging ${attempt}/5 mislukt:`,
        e?.message ?? String(e)
      );
      await closeAnyModal(page).catch(() => {});
      await wait(1000);
    }
  }

  throw new Error(
    `DOPING_WRITER verplicht maar niet gelukt voor VA ${va}: ${lastError?.message ?? "onbekende fout"}`
  );
}

/* -------------------------------------------------------
   RUN (zelfde master + worker pool als fp_bundle)
------------------------------------------------------- */
async function runDopingWriter(vaList, workers = 5) {
  const { browser, page: masterPage } = await loginFightPassport();

  let cookies = [];
  try {
    cookies = await masterPage.cookies();
  } catch {}

  console.log("[doping-writer] ✅ Master logged in (cookies captured)");

  let masterRefreshPromise = null;

  async function refreshMasterSessionLocked(reason = "") {
    if (masterRefreshPromise) {
      try { await masterRefreshPromise; } catch {}
      return cookies;
    }

    masterRefreshPromise = (async () => {
      console.log(`[doping-writer] 🔁 master ensureLoggedIn(force) start ${reason ? `(${reason})` : ""}`);
      await ensureLoggedIn(masterPage, { force: true });
      try { cookies = await masterPage.cookies(); } catch {}
      console.log("[doping-writer] ✅ master refreshed (cookies updated)");
      return cookies;
    })();

    try {
      return await masterRefreshPromise;
    } finally {
      masterRefreshPromise = null;
    }
  }

  const WRITER_TIMEOUT_MS = Number(process.env.DOPING_WRITER_TIMEOUT_MS ?? "240000");
  const results = new Array(vaList.length);
  let idx = 0;

  async function workerLoop(workerIdx) {
    const STAGGER = Number(process.env.STAGGER_MS ?? "350");
    await wait(workerIdx * STAGGER);

    let ctx = await createWorkerContext(browser);

    async function resetWorkerContext(reason) {
      console.log(`[doping-writer] 🧨 reset worker context (worker${workerIdx + 1}) ${reason ? `(${reason})` : ""}`);
      await closeWorkerContext(ctx).catch(() => {});
      ctx = await createWorkerContext(browser);
    }

    while (true) {
      const myIdx = idx++;
      if (myIdx >= vaList.length) break;

      const va = vaList[myIdx];
      const label = `worker${workerIdx + 1}/${workers}`;
      console.log(`[doping-writer] 🤖 ${label} → VA ${va}`);

      let page = null;
      let status = "skip";

      try {
        page = await openTabToFighterVerified(browser, ctx, cookies, va, {
          maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
          softWaitMs: Number(process.env.SOFT_WAIT_MS ?? "2500"),
          betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "1200"),
          workerLabel: `[${label}]`,
        });

        if (!page) {
          status = "open_fail";
          results[myIdx] = { va, ok: false, status, error: "fighter kon niet worden geopend" };
          continue;
        }

        const result = await withTimeout(
          () => doDopingWriter(page, va),
          WRITER_TIMEOUT_MS,
          `doping-writer ${va}`,
          async () => {
            await resetWorkerContext(`writer timeout VA ${va}`);
            page = null;
          }
        );

        status = result?.status ?? "written";
        results[myIdx] = result;
      } catch (e) {
        const msg = e?.message ?? String(e);

        if (msg === "LOGIN_PAGE") {
          status = "login_page";
          try {
            await refreshMasterSessionLocked(`LOGIN_PAGE from ${label} VA ${va}`);
            await resetWorkerContext(`login refresh VA ${va}`);
          } catch (err) {
            console.log("[doping-writer] ❌ master refresh failed:", err?.message ?? String(err));
          }
        } else if (String(msg).startsWith("HARD TIMEOUT")) {
          status = "timeout";
        } else {
          status = "error";
        }

        results[myIdx] = { va, ok: false, status, error: msg };
        console.log(`[doping-writer] ❌ ${label} fout VA ${va}:`, msg);
      } finally {
        console.log(`[doping-writer] ✅ END ${label} VA ${va} | status=${status}`);
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
    try { await masterPage.close(); } catch {}
    try { await browser.close(); } catch {}
  }

  return results.filter(Boolean);
}

/* -------------------------------------------------------
   CLI: alleen VA-nummers
------------------------------------------------------- */
const vaList = process.argv.slice(2).map(normalizeVaStrict).filter(Boolean).map(String);

if (!vaList.length) {
  console.error("❌ Geen geldige VA’s meegegeven (verwacht 3–5 cijfers).");
  process.exit(1);
}

const WORKERS = Number(process.env.WORKERS ?? "5");
const workers = Number.isFinite(WORKERS) && WORKERS > 0
  ? Math.min(10, Math.max(1, Math.floor(WORKERS)))
  : 5;

console.log("WRITER — FP_DOPING (master login + hard forced fighter tabs)", {
  count: vaList.length,
  workers,
  stagger_ms: Number(process.env.STAGGER_MS ?? "350"),
  tab_attempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
  soft_wait_ms: Number(process.env.SOFT_WAIT_MS ?? "2500"),
  between_attempts_ms: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "1200"),
  writer_timeout_ms: Number(process.env.DOPING_WRITER_TIMEOUT_MS ?? "240000"),
  va_sample: vaList.slice(0, 6),
});

runDopingWriter(vaList, workers)
  .then((results) => {
    console.log(`DOPING_WRITER_RESULT=${JSON.stringify({ results })}`);
    process.exit(results.some((item) => !item.ok) ? 2 : 0);
  })
  .catch((e) => {
    console.error("❌ FP doping writer hard failed:", e?.stack ?? e?.message ?? String(e));
    process.exit(1);
  });
