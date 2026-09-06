// ControlEngine/scrapers/sportscholen/scraper_sportscholen.js
//
// COMPLETE SPORTSCHOLEN-SYNC volgens het actuele Total-model:
// - route downloadt eerst 1x de volledige sportscholenlijst
// - route verdeelt organisation-keys over 3 processen
// - ieder proces draait standaard 10 workers
// - iedere sportschool krijgt een volledig verse page
// - direct naar #organisation/<key>
// - DETAILS -> alle keurmerkregels -> exact sluiten via #sluit_inr_detail
// - daarna VECHTERS -> Excel -> fightpassport_school_fighters
// - page daarna sluiten


import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { readXlsxToRows } from "../utils/excelRowsExceljs.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPLICIT_SCHOOL_KEYS = [
  ...new Set(
    String(process.env.FP_SPORTSCHOLEN_KEYS || "")
      .split(",")
      .map((value) =>
        String(value ?? "")
          .trim()
          .replace(/\D/g, "")
          .replace(/^0+/, "")
      )
      .filter(Boolean)
  ),
];
const EXPLICIT_SCHOOL_KEY_SET = new Set(EXPLICIT_SCHOOL_KEYS);

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err?.stack ?? err);
  process.exitCode = 1;
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err?.stack ?? err);
  process.exitCode = 1;
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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


async function waitForMasterLoginReady(page, timeoutMs = 120000) {
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
      const body = String(document.body?.innerText || "").toLowerCase();
      const href = String(location.href || "").toLowerCase();

      return {
        loginVisible: !!loginInput && visible(loginInput),
        loggedInSignal:
          body.includes("afmelden") ||
          body.includes("uitloggen") ||
          body.includes("fightpassport"),
        href,
      };
    }).catch(() => null);

    if (
      state &&
      !state.loginVisible &&
      !state.href.includes("#login") &&
      !state.href.includes("/login") &&
      state.loggedInSignal
    ) {
      console.log(
        "🔐 Master-tab aantoonbaar ingelogd; workers mogen starten:",
        page.url()
      );
      return;
    }

    await sleep(500);
  }

  throw new Error(
    `Master-tab niet aantoonbaar ingelogd binnen ${Math.round(
      timeoutMs / 1000
    )} seconden`
  );
}

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

function normalizeText(raw) {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

function normalizeVa(raw) {
  if (!raw) return null;

  const cleaned = String(raw)
    .toUpperCase()
    .replace(/^VA/, "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");

  return cleaned || null;
}

function normalizeSportschoolKey(raw) {
  return (
    String(raw ?? "")
      .trim()
      .replace(/\D/g, "")
      .replace(/^0+/, "") || null
  );
}

function organisationUrl(key) {
  return `https://fightpassport.nl/#organisation/${normalizeSportschoolKey(key)}`;
}

function listExcelFiles(downloadDir) {
  if (!fs.existsSync(downloadDir)) return [];

  return fs
    .readdirSync(downloadDir)
    .filter((f) => {
      const low = f.toLowerCase();
      return low.endsWith(".xlsx") || low.endsWith(".xls");
    })
    .map((f) => path.join(downloadDir, f));
}

async function waitForNewExcel(downloadDir, timeoutMs = 60000) {
  const start = Date.now();
  const before = new Set(listExcelFiles(downloadDir));

  while (Date.now() - start < timeoutMs) {
    const now = listExcelFiles(downloadDir);
    const newly = now.find((p) => !before.has(p));

    if (newly) {
      let lastSize = -1;
      let stable = 0;

      for (let i = 0; i < 100; i++) {
        if (!fs.existsSync(newly)) break;

        const size = fs.statSync(newly).size;

        if (size > 0 && size === lastSize) {
          stable++;
          if (stable >= 3) return newly;
        } else {
          stable = 0;
          lastSize = size;
        }

        await sleep(250);
      }

      return newly;
    }

    const files = fs.existsSync(downloadDir) ? fs.readdirSync(downloadDir) : [];
    const hasCrdownload = files.some((f) =>
      f.toLowerCase().endsWith(".crdownload")
    );

    if (hasCrdownload) {
      await sleep(300);
      continue;
    }

    await sleep(300);
  }

  throw new Error(`Geen nieuwe Excel gevonden in ${downloadDir}`);
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

async function waitForFunctionInAnyFrame(
  page,
  fn,
  timeoutMs = 30000,
  label = "functie"
) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      try {
        const result = await frame.evaluate(fn);
        if (result) return { frame, result };
      } catch {}
    }

    await sleep(300);
  }

  throw new Error(`${label} niet gevonden binnen ${timeoutMs}ms`);
}

async function getPageDebug(page) {
  try {
    return await page.evaluate(() => ({
      url: window.location.href,
      hash: window.location.hash,
      title: document.title,
      body: String(document.body?.innerText || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200),
      titles: Array.from(
        document.querySelectorAll("div[title],img[title],button[title],a[title]")
      )
        .map((x) => x.getAttribute("title"))
        .filter(Boolean)
        .slice(0, 120),
      tileHeaders: Array.from(document.querySelectorAll(".tileHeader"))
        .map((x) => String(x.innerText || "").trim())
        .filter(Boolean)
        .slice(0, 40),
    }));
  } catch (e) {
    return { error: e?.message ?? String(e), url: page.url() };
  }
}

async function setDownloadBehavior(page, browser, downloadDir) {
  // Bij één browser met meerdere tabs mag Browser.setDownloadBehavior NIET
  // per tab opnieuw gezet worden: dat is browser-breed en tabs zouden elkaars
  // downloadmap overschrijven. Daarom alleen target/page-level instellen.
  try {
    const client = await page.target().createCDPSession();

    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
    });

    await client.detach().catch(() => {});
  } catch (e) {
    console.log("⚠️ Page.setDownloadBehavior fout:", e?.message ?? e);
    throw e;
  }
}


async function setBrowserDownloadFallback(browser) {
  // Vang downloads die buiten de page-scoped VECHTERS-target vallen
  // op binnen de scraper zelf, nooit in Windows Downloads.
  const fallbackDir = path.resolve(
    __dirname,
    "downloads",
    `_browser_${process.pid}`
  );

  fs.mkdirSync(fallbackDir, { recursive: true });

  const client = await browser.target().createCDPSession();
  try {
    await client.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: fallbackDir,
      eventsEnabled: true,
    });

    console.log(
      `[sportscholen] 📁 browser download-fallback → ${fallbackDir}`
    );
  } finally {
    await client.detach().catch(() => {});
  }

  return fallbackDir;
}

function cleanupBrowserDownloadFallback(fallbackDir) {
  if (!fallbackDir) return;

  try {
    fs.rmSync(fallbackDir, { recursive: true, force: true });
  } catch {}

  try {
    const root = path.resolve(__dirname, "downloads");
    if (fs.existsSync(root) && fs.readdirSync(root).length === 0) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  } catch {}
}

async function cleanupDownloadDir(downloadDir) {
  fs.mkdirSync(downloadDir, { recursive: true });

  for (const f of fs.readdirSync(downloadDir)) {
    const low = f.toLowerCase();

    if (
      low.endsWith(".xlsx") ||
      low.endsWith(".xls") ||
      low.endsWith(".crdownload") ||
      low.endsWith(".tmp")
    ) {
      try {
        fs.unlinkSync(path.join(downloadDir, f));
      } catch {}
    }
  }
}

async function removeDownloadedExcel(filePath) {
  if (!filePath) return;

  try {
    const dir = path.dirname(filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("🗑️ Excel verwijderd:", filePath);
    }

    if (dir.includes(`${path.sep}downloads${path.sep}`) && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    const tmpRoot = path.resolve(__dirname, "downloads");
    if (fs.existsSync(tmpRoot) && fs.readdirSync(tmpRoot).length === 0) {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  } catch (e) {
    console.log("⚠️ Excel/tijdelijke map verwijderen mislukt:", e?.message ?? e);
  }
}

async function closeWrongVechtersPopup(page) {
  const closed = await page.evaluate(() => {
    const body = document.body?.innerText || "";

    if (!body.includes("Actuele vechters")) return false;

    const closeButtons = [
      ...document.querySelectorAll(
        '.window_close, .close, [title="Sluiten"], [title="SLUITEN"], button, input[type="button"]'
      ),
    ];

    const btn = closeButtons.find((el) => {
      const txt = (el.innerText || el.value || el.getAttribute("title") || "")
        .trim()
        .toUpperCase();

      return txt.includes("SLUITEN") || txt === "×" || txt === "X";
    });

    if (btn) {
      btn.click();
      return true;
    }

    const x = [...document.querySelectorAll("div, span")].find((el) => {
      const txt = (el.innerText || "").trim();
      const rect = el.getBoundingClientRect();
      return (txt === "x" || txt === "×") && rect.width < 40 && rect.height < 40;
    });

    if (x) {
      x.click();
      return true;
    }

    return false;
  });

  if (closed) {
    console.log("↩️ Verkeerde popup 'Actuele vechters' gesloten");
    await sleep(1000);
  }
}

async function waitForOrganisationPage(page, expectedKey, sportschool) {
  const key = normalizeSportschoolKey(expectedKey);
  const expectedHash = `#organisation/${key}`;
  console.log("🔍 Exact controleren of sportschoolpagina geladen is...", {
    key,
  });

  const start = Date.now();
  let forceCount = 0;

  while (Date.now() - start < 60000) {
    await closeWrongVechtersPopup(page);

    const state = await page.evaluate(() => {
      const bodyText = document.body?.innerText || "";
      const hash = window.location.hash || "";
      const href = window.location.href || "";

      const detailTile =
        document.querySelector('.tile[title="DETAILS"]') ||
        [...document.querySelectorAll(".tileHeader")]
          .find(
            (el) => (el.innerText || "").trim().toUpperCase() === "DETAILS"
          )
          ?.closest(".tile");

      const vechtersTile =
        document.querySelector('.tile[title="VECHTERS"]') ||
        [...document.querySelectorAll(".tileHeader")]
          .find(
            (el) => (el.innerText || "").trim().toUpperCase() === "VECHTERS"
          )
          ?.closest(".tile");

      return {
        href,
        hash,
        body: bodyText.replace(/\s+/g, " ").trim().slice(0, 1200),
        hasDetailsTile: !!detailTile,
        hasVechtersTile: !!vechtersTile,
        hasWrongPopup: bodyText.includes("Actuele vechters"),
        tileHeaders: [...document.querySelectorAll(".tileHeader")]
          .map((el) => (el.innerText || "").trim())
          .filter(Boolean)
          .slice(0, 30),
      };
    });

    const hashOk =
      state.hash === expectedHash ||
      state.href.includes(`/#organisation/${key}`) ||
      state.href.includes(`#organisation/${key}`);

    const bodyUpper = normalizeText(state.body).toUpperCase();
    const tilesOk =
      (state.hasDetailsTile && state.hasVechtersTile) ||
      (bodyUpper.includes("DETAILS") && bodyUpper.includes("VECHTERS"));

    if (hashOk && tilesOk && !state.hasWrongPopup) {
      console.log("✅ Exact juiste sportschoolpagina bevestigd:", {
        hash: state.hash,
        key,
        headers: state.tileHeaders,
      });

      return;
    }

    console.log("⏳ Nog niet op juiste sportschoolpagina:", {
      hash: state.hash,
      hashOk,
      tilesOk,
      wrongPopup: state.hasWrongPopup,
      headers: state.tileHeaders,
    });

    if (!hashOk && forceCount < 6 && Date.now() - start > 2500) {
      forceCount++;

      console.log("🔨 Hash opnieuw forceren:", {
        poging: forceCount,
        expectedHash,
      });

      try {
        await page.evaluate((hash) => {
          window.location.hash = hash;
        }, `organisation/${key}`);

        await sleep(1200);
      } catch {}
    }

    await sleep(750);
  }

  const debug = await getPageDebug(page);

  throw new Error(
    `Niet exact op sportschoolpagina organisation/${key}. Debug=${JSON.stringify(
      debug
    )}`
  );
}

async function forceExactOrganisationUrl(page, key, sportschool, timeoutMs = 30000) {
  const requestedKey = normalizeSportschoolKey(key);
  const url = organisationUrl(requestedKey);
  const wantedHash = `#organisation/${requestedKey}`;
  const startedAt = Date.now();
  let lastForcedAt = 0;
  let hardReloads = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const state = await page.evaluate(() => {
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

      const loginEl = document.querySelector("input.gebruikersnaam");
      const body = String(document.body?.innerText || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      const headers = [...document.querySelectorAll(".tileHeader")]
        .map((el) => String(el.innerText || "").trim().toUpperCase());

      return {
        loginVisible: !!loginEl && isVisible(loginEl),
        href: String(location.href || ""),
        hash: String(location.hash || ""),
        body,
        headers,
      };
    }).catch(() => null);

    if (
      state?.loginVisible ||
      String(state?.href || "").toLowerCase().includes("#login") ||
      String(state?.href || "").toLowerCase().includes("/login")
    ) {
      throw new Error("LOGIN_PAGE");
    }

    const exactIdentity =
      state &&
      state.hash === wantedHash &&
      (
        (state.headers.includes("DETAILS") && state.headers.includes("VECHTERS")) ||
        (state.body.includes("details") && state.body.includes("vechters"))
      );

    if (exactIdentity) {
      await sleep(500);

      const confirm = await page.evaluate((forcedHash) => {
        const body = String(document.body?.innerText || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        const headers = [...document.querySelectorAll(".tileHeader")]
          .map((el) => String(el.innerText || "").trim().toUpperCase());

        return (
          String(location.hash || "") === forcedHash &&
          (
            (headers.includes("DETAILS") && headers.includes("VECHTERS")) ||
            (body.includes("details") && body.includes("vechters"))
          )
        );
      }, wantedHash).catch(() => false);

      if (confirm) return true;
    }

    const now = Date.now();

    const hashAlreadyCorrect = state?.hash === wantedHash;

    // Staat de tab al exact op de gevraagde organisation-hash, dan NIET opnieuw
    // forceren. FightPassport krijgt eerst tijd om DETAILS en VECHTERS te renderen.
    if (!hashAlreadyCorrect && now - lastForcedAt >= 1200) {
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

      await sleep(600);

      const afterForce = await page.evaluate((forcedHash) => {
        const body = String(document.body?.innerText || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        const headers = [...document.querySelectorAll(".tileHeader")]
          .map((el) => String(el.innerText || "").trim().toUpperCase());

        return (
          String(location.hash || "") === forcedHash &&
          (
            (headers.includes("DETAILS") && headers.includes("VECHTERS")) ||
            (body.includes("details") && body.includes("vechters"))
          )
        );
      }, wantedHash).catch(() => false);

      if (!afterForce && hardReloads < 3) {
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

  console.log(`[sportscholen] ❌ organisation/${requestedKey} kon niet hard op juiste URL worden vastgezet`, {
    urlNow: page.url(),
    debug: await getPageDebug(page).catch(() => null),
  });

  return false;
}

async function openOrganisation(page, key, sportschool) {
  const cleanKey = normalizeSportschoolKey(key);
  const url = organisationUrl(cleanKey);

  const forced = await forceExactOrganisationUrl(
    page,
    cleanKey,
    sportschool,
    30000
  ).catch((e) => {
    if (e?.message === "LOGIN_PAGE") throw e;
    return false;
  });

  if (!forced) {
    throw new Error(
      `Sportschoolpagina organisation/${cleanKey} niet exact bevestigd`
    );
  }

  await sleep(1500);
  await waitForOrganisationPage(page, cleanKey, sportschool);
}

async function openVechtersTile(page, key, sportschool) {
  await closeWrongVechtersPopup(page);

  await waitForOrganisationPage(page, key, sportschool);
  await sleep(800);

  console.log("🔍 VECHTERS tegel zoeken op bevestigde sportschoolpagina...");

  const clicked = await page.evaluate((expectedKey) => {
    const expectedHash = `#organisation/${expectedKey}`;

    if (
      window.location.hash !== expectedHash &&
      !window.location.href.includes(`#organisation/${expectedKey}`)
    ) {
      return {
        ok: false,
        reason: "Niet op juiste organisation-url",
        hash: window.location.hash,
        href: window.location.href,
      };
    }

    const header = [...document.querySelectorAll("div.tileHeader.enabled")].find(
      (el) => String(el.innerText || "").trim().toUpperCase() === "VECHTERS"
    );

    if (!header) {
      return {
        ok: false,
        reason: "Exacte div.tileHeader.enabled VECHTERS niet gevonden",
        headers: [...document.querySelectorAll("div.tileHeader")]
          .map((el) => ({
            text: String(el.innerText || "").trim(),
            className: String(el.className || ""),
          }))
          .slice(0, 30),
      };
    }

    header.scrollIntoView?.({ block: "center", inline: "center" });
    header.click();

    return {
      ok: true,
      method: "exact div.tileHeader.enabled met tekst VECHTERS",
      hash: window.location.hash,
      text: String(header.innerText || "").trim(),
      className: String(header.className || ""),
    };
  }, normalizeSportschoolKey(key));

  if (!clicked?.ok) {
    const debug = await getPageDebug(page);
    throw new Error(
      `VECHTERS tegel niet exact aangeklikt. Result=${JSON.stringify(
        clicked
      )}. Debug=${JSON.stringify(debug)}`
    );
  }

  console.log("✅ Exacte VECHTERS tegel aangeklikt:", clicked);

  await waitForVechtersRapport(page, key);
}

async function waitForVechtersRapport(page, key) {
  console.log("🔍 Controleren of rapport Vechters bij sportschool geladen is...");

  const result = await waitForFunctionInAnyFrame(
    page,
    () => {
      const bodyText = document.body?.innerText || "";
      const textOk = bodyText.includes("Rapport: Vechters bij sportschool");

      const excelOk =
        !!document.querySelector('[title="download als excel"]') ||
        !!document.querySelector('[title*="download"][title*="excel"]') ||
        !!document.querySelector('svg use[href*="#img_41"]');

      if (textOk) {
        return {
          url: window.location.href,
          hash: window.location.hash,
          hasExcelButton: excelOk,
          preview: bodyText.replace(/\s+/g, " ").trim().slice(0, 500),
        };
      }

      return false;
    },
    35000,
    "Rapport: Vechters bij sportschool"
  ).catch(async (e) => {
    const debug = await getPageDebug(page);

    throw new Error(
      `${e.message}. Verwacht rapport voor sportschool ${key}. Debug=${JSON.stringify(
        debug
      )}`
    );
  });

  console.log("✅ Rapport Vechters bij sportschool gevonden", result.result);
}

async function ensureReadyForVechtersDownload(page, key) {
  await closeWrongVechtersPopup(page);

  const current = page.url();

  if (!current.includes(`#organisation/${key}`)) {
    const debug = await getPageDebug(page);

    throw new Error(
      `Download geblokkeerd: niet op organisation/${key}. Huidige url=${current}. Debug=${JSON.stringify(
        debug
      )}`
    );
  }

  await waitForVechtersRapport(page, key);
}


async function findVechtersDownloadControl(page, timeoutMs = 45000) {
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

            const looksLikeVechters =
              contextText.includes("RAPPORT: VECHTERS BIJ SPORTSCHOOL") ||
              contextText.includes("RAPPORT: VECHTERS BIJ SPORTSSCHOOL");

            return { ok: looksLikeVechters };
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

async function downloadVechtersExcel(page, browser, sportschoolKey) {
  const key = normalizeSportschoolKey(sportschoolKey);

  await ensureReadyForVechtersDownload(page, key);

  console.log("📥 Excel downloaden vanaf rapport Vechters bij sportschool...");

  // LETTERLIJK hetzelfde downloadmodel als fp_total:
  // eigen downloads/<key_uuid>-map naast deze scraper,
  // page-scoped CDP downloadBehavior, events volgen, daarna cleanup.
  const dir = path.resolve(
    __dirname,
    "downloads",
    `${key}_${crypto.randomUUID().slice(0, 8)}`
  );
  fs.mkdirSync(dir, { recursive: true });

  const client = await page.target().createCDPSession();
  await client.send("Page.enable").catch(() => {});
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: dir,
  });

  const found = await findVechtersDownloadControl(page, 45000);

  if (!found) {
    await client.detach().catch(() => {});
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
    throw new Error("Exacte Excel-knop van Vechters-rapport niet gevonden");
  }

  let downloadStarted = null;
  let downloadProgress = null;

  const onDownloadWillBegin = (event) => {
    downloadStarted = {
      guid: event?.guid || null,
      suggestedFilename: event?.suggestedFilename || null,
      at: Date.now(),
    };
    console.log(
      `[sportscholen] 🚀 ${key} Chrome bevestigt downloadstart: ` +
      `${event?.suggestedFilename || "bestand"}`
    );
  };

  const onDownloadProgress = (event) => {
    if (!downloadStarted?.guid || event?.guid === downloadStarted.guid) {
      downloadProgress = event || null;
    }
  };

  client.on("Page.downloadWillBegin", onDownloadWillBegin);
  client.on("Page.downloadProgress", onDownloadProgress);

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

  const listFiles = () => {
    try {
      return fs.readdirSync(dir);
    } catch {
      return [];
    }
  };

  const getExcel = () => {
    return (
      listFiles()
        .filter((f) => {
          const low = f.toLowerCase();
          return low.endsWith(".xlsx") || low.endsWith(".xls");
        })
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
        })[0] || null
    );
  };

  const cleanupDir = () => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}

    try {
      const root = path.resolve(__dirname, "downloads");
      if (fs.existsSync(root) && fs.readdirSync(root).length === 0) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    } catch {}
  };

  const startTimeoutMs = Math.max(
    1000,
    Number(process.env.FP_SPORTSCHOLEN_DOWNLOAD_START_TIMEOUT_MS ?? "6000")
  );

  const completeTimeoutMs = Math.max(
    5000,
    Number(process.env.FP_SPORTSCHOLEN_DOWNLOAD_COMPLETE_TIMEOUT_MS ?? "60000")
  );

  try {
    console.log(
      `[sportscholen] ⬇️ ${key} VECHTERS downloadklik → ${dir}`
    );

    await clickDownload();

    const startAt = Date.now();
    while (Date.now() - startAt < startTimeoutMs) {
      const candidate = getExcel();

      if (downloadStarted || candidate) {
        break;
      }

      await sleep(50);
    }

    if (!downloadStarted && !getExcel()) {
      console.log(
        `[sportscholen] ❌ ${key} geen downloadstart binnen ${startTimeoutMs}ms`,
        { dir, files: listFiles() }
      );
      cleanupDir();
      throw new Error(
        `VECHTERS_EXCEL_START_TIMEOUT: sportschool ${key} na ` +
        `${Math.round(startTimeoutMs / 1000)}s geen downloadstart`
      );
    }

    const completeAt = Date.now();

    while (Date.now() - completeAt < completeTimeoutMs) {
      const filesNow = listFiles();
      const candidate = getExcel();
      const stillDownloading = filesNow.some((f) =>
        f.toLowerCase().endsWith(".crdownload")
      );

      if (candidate && !stillDownloading) {
        try {
          await readXlsxToRows(candidate, { sheetIndex: 0 });

          console.log(
            `[sportscholen] ✅ ${key} Vechters Excel volledig binnen ` +
            `(${fs.statSync(candidate).size} bytes) → ${candidate}`
          );

          // Parser + removeDownloadedExcel ruimen bestand en submap daarna op.
          return candidate;
        } catch {
          // Bestand net zichtbaar maar nog niet volledig geflusht.
        }
      }

      if (downloadProgress?.state === "canceled") {
        cleanupDir();
        throw new Error(
          `VECHTERS_EXCEL_CANCELED: sportschool ${key}`
        );
      }

      await sleep(50);
    }

    console.log(
      `[sportscholen] ❌ ${key} download gestart maar Excel niet tijdig leesbaar`,
      {
        dir,
        files: listFiles(),
        progress: downloadProgress?.state || null,
      }
    );

    cleanupDir();
    throw new Error(
      `VECHTERS_EXCEL_COMPLETE_TIMEOUT: sportschool ${key}`
    );
  } finally {
    client.off("Page.downloadWillBegin", onDownloadWillBegin);
    client.off("Page.downloadProgress", onDownloadProgress);
    await client.detach().catch(() => {});
  }
}

function findHeaderIndex(headers, names) {
  const low = headers.map((h) => String(h || "").trim().toLowerCase());

  for (const name of names) {
    const idx = low.indexOf(String(name).toLowerCase());
    if (idx !== -1) return idx;
  }

  for (const name of names) {
    const needle = String(name).toLowerCase();
    const idx = low.findIndex((h) => h.includes(needle));
    if (idx !== -1) return idx;
  }

  return -1;
}

function findHeaderRowIndex(rows) {
  const max = Math.min(rows?.length ?? 0, 25);

  for (let i = 0; i < max; i++) {
    const cells = rows[i] || [];
    const normalized = cells.map((x) => String(x ?? "").trim().toLowerCase());

    const hasVa = normalized.some((cell) =>
      cell === "va" ||
      cell.includes("va-nummer") ||
      cell.includes("va nummer") ||
      cell.includes("vanummer") ||
      cell.includes("va nr") ||
      cell.includes("relatienummer")
    );

    const hasNaam = normalized.some((cell) =>
      cell.includes("naam vechter") ||
      cell === "naam" ||
      cell === "vechter" ||
      cell.includes("volledige naam")
    );

    if (hasVa && hasNaam) return i;
  }

  return -1;
}

async function parseVechtersExcel(filePath, sportschool) {
  console.log("📊 Excel verwerken:", filePath);

  const rows = await readXlsxToRows(filePath, {
    sheetIndex: 0,
  });

  if (!rows?.length) {
    console.log("✅ Lege Vechters Excel: 0 vechters voor deze sportschool");
    return [];
  }

  const headerRowIndex = findHeaderRowIndex(rows);

  if (headerRowIndex === -1) {
    const reportTitle = String(rows?.[0]?.[0] ?? "").trim();
    const groupTitle = String(rows?.[1]?.[0] ?? "").trim();

    // Een geldig leeg Vechters-rapport bevat alleen de rapporttitel en groep,
    // maar geen headerregel op rij 5 en dus ook geen vechters vanaf rij 6.
    if (
      reportTitle === "Rapport: Vechters bij sportschool" &&
      groupTitle === "Groep: Vechters"
    ) {
      console.log("✅ Geldig leeg Vechters-rapport: 0 vechters");
      return [];
    }

    const preview = rows
      .slice(0, 12)
      .map((r) => (r || []).map((c) => String(c ?? "").trim()).join(" | "));

    throw new Error(
      `Headerregel niet gevonden in Excel. Preview=${JSON.stringify(preview)}`
    );
  }

  const headers = (rows[headerRowIndex] || []).map((h) =>
    String(h || "").trim()
  );

  console.log("📑 Headerregel gevonden:", {
    headerRowIndex,
    headers,
  });

  const idxNaam = findHeaderIndex(headers, [
    "Naam vechter",
    "Naam",
    "Vechter",
    "Volledige naam",
  ]);

  const idxVa = findHeaderIndex(headers, [
    "VA-nummer",
    "VA nummer",
    "VA",
    "VAnummer",
    "VA nr",
    "Relatienummer",
    "Nummer",
  ]);

  const idxGeslacht = findHeaderIndex(headers, ["Geslacht", "M/V", "Gender"]);
  const idxVervaldatum = findHeaderIndex(headers, [
    "Vervaldatum",
    "Verloopdatum",
    "Licentie geldig tot",
    "Geldig tot",
  ]);

  if (idxVa === -1) {
    throw new Error(`Kolom VA-nummer niet gevonden: ${JSON.stringify(headers)}`);
  }

  const now = new Date().toISOString();
  const seen = new Set();
  const out = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const va = normalizeVa(row?.[idxVa]);

    if (!va || seen.has(va)) continue;

    seen.add(va);

    const naam = idxNaam !== -1 ? normalizeText(row[idxNaam]) || null : null;
    out.push({
      sportschool_id: Number(sportschool.sportschool_id),
      va_nummer: va,
      naam,
      geslacht:
        idxGeslacht !== -1 ? normalizeText(row[idxGeslacht]) || null : null,
      actief: true,
      bron: "fightpassport_vechters_excel",
      last_seen_at: now,
      updated_at: now,
    });
  }

  console.log(`✅ ${out.length} vechters gevonden`);

  // Een geldige Vechters-Excel zonder vechters is geen scraperfout.
  return out;
}

async function saveSportschoolFighterLinks(sportschoolKey, fighters) {
  const key = Number(sportschoolKey);
  const now = new Date().toISOString();

  // Na iedere succesvolle Excel-parse eerst oude koppelingen voor deze sportschool
  // inactief zetten. Bij een lege Excel blijven er terecht 0 actieve koppelingen over.
  const { error: deactivateError } = await supabase
    .from("fightpassport_school_fighters")
    .update({
      actief: false,
      updated_at: now,
    })
    .eq("sportschool_id", key)
    .eq("actief", true);

  if (deactivateError) throw deactivateError;

  if (!fighters.length) return [];

  const payload = fighters.map((fighter) => ({
    ...fighter,
    sportschool_id: key,
    actief: true,
    last_seen_at: now,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("fightpassport_school_fighters")
    .upsert(payload, {
      onConflict: "sportschool_id,va_nummer",
    });

  if (error) throw error;

  return payload.map((f) => f.va_nummer);
}

async function updateSportschoolSyncStatus(key, status, errorMessage = null) {
  const payload = {
    team_sync_status: status,
    team_sync_error: errorMessage ? String(errorMessage).slice(0, 1000) : null,
    updated_at: new Date().toISOString(),
  };

  if (status === "klaar") {
    payload.last_team_sync_at = new Date().toISOString();
  }

  await supabase
    .from("sportscholen")
    .update(payload)
    .eq("sportschool_id", Number(key));
}

async function pageIsExactOrganisation(page, key, sportschool) {
  const cleanKey = normalizeSportschoolKey(key);
  const expectedHash = `#organisation/${cleanKey}`;

  const state = await page.evaluate(() => {
    const body = String(document.body?.innerText || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const headers = [...document.querySelectorAll(".tileHeader")]
      .map((el) => String(el.innerText || "").trim().toUpperCase());

    return {
      hash: String(location.hash || ""),
      body,
      headers,
    };
  }).catch(() => null);

  return !!(
    state &&
    state.hash === expectedHash &&
    (
      (state.headers.includes("DETAILS") && state.headers.includes("VECHTERS")) ||
      (state.body.includes("details") && state.body.includes("vechters"))
    )
  );
}

async function openTabToOrganisationVerified(browser, context, cookies, key, sportschool, opts) {
  const {
    maxAttempts = 5,
    softWaitMs = 1500,
    betweenAttemptsMs = 1200,
    workerLabel = "",
  } = opts ?? {};

  const cleanKey = normalizeSportschoolKey(key);
  const url = organisationUrl(cleanKey);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const p = context ? await context.newPage() : await browser.newPage();
    await p.setCacheEnabled(false).catch(() => {});

    try {
      if (Array.isArray(cookies) && cookies.length) {
        await p.setCookie(...cookies);
      }
    } catch {}

    await p.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    }).catch(() => {});

    let forced = false;
    try {
      forced = await forceExactOrganisationUrl(
        p,
        cleanKey,
        sportschool,
        30000
      );
    } catch (e) {
      if (e?.message === "LOGIN_PAGE") {
        // Page is in deze helper gemaakt. Direct sluiten vóór LOGIN_PAGE
        // naar de worker gaat, zodat geen loginvenster kan blijven hangen.
        await hardClosePage(p).catch(() => {});
        throw e;
      }
      forced = false;
    }

    if (!forced) {
      await hardClosePage(p).catch(() => {});
      await sleep(betweenAttemptsMs);
      continue;
    }

    await sleep(softWaitMs);

    const verified = await pageIsExactOrganisation(
      p,
      cleanKey,
      sportschool
    ).catch(() => false);

    if (verified) {
      return p;
    }

    console.log(`[sportscholen] ↪️ worker-tab niet op gevraagde sportschool ${workerLabel}`, {
      requested: cleanKey,
      attempt,
      urlNow: p.url(),
    });

    await hardClosePage(p).catch(() => {});
    await sleep(betweenAttemptsMs);
  }

  return null;
}


function parseNlDateStrict(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

async function openDetailsTile(page, key) {
  const cleanKey = normalizeSportschoolKey(key);

  const clicked = await page.evaluate((expectedKey) => {
    const expectedHash = `#organisation/${expectedKey}`;
    if (String(location.hash || "") !== expectedHash) {
      return { ok: false, reason: "verkeerde organisation hash", hash: location.hash };
    }

    const header = [...document.querySelectorAll("div.tileHeader.enabled, div.tileHeader")]
      .find((el) => String(el.innerText || "").trim().toUpperCase() === "DETAILS");

    if (!header) {
      return {
        ok: false,
        reason: "DETAILS header niet gevonden",
        headers: [...document.querySelectorAll("div.tileHeader")]
          .map((el) => String(el.innerText || "").trim())
          .filter(Boolean)
          .slice(0, 30),
      };
    }

    const tile = header.closest(".tile");
    (tile || header).scrollIntoView?.({ block: "center" });
    (tile || header).click();
    return { ok: true };
  }, cleanKey);

  if (!clicked?.ok) {
    throw new Error(`DETAILS tegel niet geopend voor sportschool ${cleanKey}: ${JSON.stringify(clicked)}`);
  }

  await sleep(600);
}

async function readKeurmerkPeriods(page, key) {
  const cleanKey = normalizeSportschoolKey(key);
  const startedAt = Date.now();
  let lastState = null;

  while (Date.now() - startedAt < 15000) {
    const state = await page.evaluate(() => {
      const visible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          st.display !== "none" &&
          st.visibility !== "hidden" &&
          st.opacity !== "0"
        );
      };

      const clean = (v) =>
        String(v ?? "")
          .replace(/\u00a0/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const norm = (v) => clean(v).toLowerCase();
      const requiredHeaders = ["toegevoegd door", "toegevoegd op", "start", "einde"];

      const bodyText = clean(document.body?.innerText);

      // 1) Eerst de normale tabelstructuur proberen.
      const tables = [...document.querySelectorAll("table")].filter(visible);
      let chosenTable = null;
      let chosenHeaders = [];

      for (const table of tables) {
        const headerCandidates = [
          ...table.querySelectorAll(
            "thead th, thead td, th, tr.flexlist_header td, tr.flexlist_header th"
          ),
        ]
          .map((el) => norm(el.textContent))
          .filter(Boolean);

        const joined = headerCandidates.join(" | ");
        if (requiredHeaders.every((header) => joined.includes(header))) {
          chosenTable = table;
          chosenHeaders = headerCandidates;
          break;
        }
      }

      // 2) FightPassport gebruikt soms #overview_table_body zonder bruikbare <th>.
      if (!chosenTable) {
        const bodies = [...document.querySelectorAll("#overview_table_body")].filter(visible);
        for (const body of bodies) {
          const table = body.closest("table");
          if (!table || !visible(table)) continue;

          const tableText = norm(table.innerText || table.textContent);
          if (requiredHeaders.every((header) => tableText.includes(header))) {
            chosenTable = table;
            chosenHeaders = requiredHeaders;
            break;
          }
        }
      }

      if (chosenTable) {
        const candidateRows = [
          ...chosenTable.querySelectorAll("tbody tr.flexlist_row, tbody tr, tr.flexlist_row"),
        ].filter((row) => {
          if (!visible(row) || row.classList.contains("filler")) return false;
          if (row.closest("thead")) return false;
          return true;
        });

        const parsed = candidateRows
          .map((row) => [...row.querySelectorAll("td")].map((td) => clean(td.textContent)))
          .filter((cells) => cells.length >= 4)
          .filter((cells) => {
            const joined = cells.map(norm).join(" | ");
            return !requiredHeaders.every((header) => joined.includes(header));
          });

        return {
          ready: true,
          foundTable: true,
          source: "table",
          headers: chosenHeaders,
          rows: parsed,
          body: bodyText.slice(0, 1400),
        };
      }

      // 3) Laatste fallback: lees de zichtbare DETAILS-tekst zelf.
      // In FightPassport staat de keurmerksectie soms wel volledig zichtbaar in de DOM,
      // maar niet als een herkenbare HTML-table. De sectie ziet er dan bijvoorbeeld uit als:
      // "Keurmerk Toegevoegd door Toegevoegd op Start Einde Naam 01-01-2026 01-01-2026 31-12-2027 ... Vervallen kaarten zichtbaar"
      const startMarker = "Keurmerk Toegevoegd door Toegevoegd op Start Einde";
      const endMarker = "Vervallen kaarten zichtbaar";
      const markerIndex = bodyText.indexOf(startMarker);

      if (markerIndex >= 0) {
        const afterHeader = bodyText.slice(markerIndex + startMarker.length).trim();
        const endIndex = afterHeader.indexOf(endMarker);
        const section = clean(endIndex >= 0 ? afterHeader.slice(0, endIndex) : afterHeader);

        // Iedere keurmerkregel eindigt met exact drie NL-datums:
        // toegevoegd_op, start, einde. Alles vóór die drie datums is 'toegevoegd door'.
        // Door non-greedy te matchen blijven regels in de zichtbare volgorde staan,
        // dus periods[0] blijft de bovenste FightPassport-regel.
        const date = "\\d{2}-\\d{2}-\\d{4}";
        const rowRegex = new RegExp(`(.+?)\\s+(${date})\\s+(${date})\\s+(${date})(?=\\s|$)`, "g");
        const rows = [];
        let match;

        while ((match = rowRegex.exec(section)) !== null) {
          const toegevoegdDoor = clean(match[1]);
          const toegevoegdOp = clean(match[2]);
          const start = clean(match[3]);
          const einde = clean(match[4]);

          if (!toegevoegdDoor) continue;
          rows.push([toegevoegdDoor, toegevoegdOp, start, einde]);
        }

        return {
          ready: true,
          foundTable: true,
          source: "details_text",
          headers: requiredHeaders,
          rows,
          body: bodyText.slice(0, 1400),
        };
      }

      // Loginpagina of echt nog niet geladen: niet als lege keurmerktabel accepteren,
      // zodat het bestaande retry/login-herstel in werking blijft.
      return {
        ready: false,
        foundTable: false,
        source: "none",
        headers: [],
        rows: [],
        body: bodyText.slice(0, 1400),
      };
    }).catch(() => null);

    lastState = state;

    if (state?.ready) {
      const periods = [];

      for (const cells of state.rows ?? []) {
        const toegevoegdDoor = String(cells?.[0] ?? "").trim() || null;
        const toegevoegdOp = parseNlDateStrict(cells?.[1]);
        const start = parseNlDateStrict(cells?.[2]);
        const einde = parseNlDateStrict(cells?.[3]);

        if (!start && !einde) continue;

        periods.push({
          toegevoegd_door: toegevoegdDoor,
          toegevoegd_op: toegevoegdOp,
          start,
          einde,
        });
      }

      console.log(`[sportscholen] 📜 ${cleanKey} keurmerkregels gelezen`, {
        bron: state.source ?? null,
        aantal: periods.length,
        bovenste_regel: periods[0] ?? null,
        headers: state.headers ?? [],
      });

      return periods;
    }

    await sleep(150);
  }

  throw new Error(
    `DETAILS keurmerktabel niet tijdig leesbaar voor sportschool ${cleanKey}. ` +
      `Laatste state=${JSON.stringify(lastState)}`
  );
}

async function closeDetailsExact(page, key) {
  const cleanKey = normalizeSportschoolKey(key);
  const startedAt = Date.now();

  // Eerst een paar seconden wachten op de exacte FightPassport-knop.
  while (Date.now() - startedAt < 3500) {
    const result = await page.evaluate(() => {
      const visible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          st.display !== "none" &&
          st.visibility !== "hidden" &&
          st.opacity !== "0"
        );
      };

      const exact = [...document.querySelectorAll("button#sluit_inr_detail")]
        .find(visible);

      if (!exact) return { clicked: false, exactVisible: false };

      exact.scrollIntoView?.({ block: "center" });
      exact.click();
      return { clicked: true, exactVisible: true };
    }).catch(() => ({ clicked: false, exactVisible: false }));

    if (result?.clicked) {
      console.log(`[sportscholen] ↩️ ${cleanKey} DETAILS sluiten aangeklikt`);
      break;
    }

    await sleep(120);
  }

  // Zelfde robuuste fallbackgedachte als startverbod/fp_total: FightPassport kan
  // de exacte knop tijdens een rerender al hebben vervangen. Probeer dan andere
  // bekende sluitknoppen en uiteindelijk Escape, zonder de hele school te laten falen.
  let exactStillVisible = await page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        st.display !== "none" &&
        st.visibility !== "hidden" &&
        st.opacity !== "0"
      );
    };

    return [...document.querySelectorAll("button#sluit_inr_detail")].some(visible);
  }).catch(() => false);

  if (exactStillVisible) {
    const selectors = [
      "button#sluit_inr_detail",
      "button.sluit_scherm.detail_modal",
      "button.sluit_scherm.overview",
      "button.sluit_scherm",
      "img.sluit_modal",
      "button.ui-dialog-titlebar-close",
    ];

    for (const selector of selectors) {
      try {
        const handles = await page.$$(selector);
        for (const handle of handles) {
          const isVisible = await page.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            return (
              r.width > 0 &&
              r.height > 0 &&
              st.display !== "none" &&
              st.visibility !== "hidden" &&
              st.opacity !== "0"
            );
          }, handle).catch(() => false);

          if (!isVisible) continue;
          await handle.click().catch(() => {});
          await sleep(120);
          break;
        }
      } catch {}
    }
  }

  try {
    await page.keyboard.press("Escape");
    await sleep(80);
  } catch {}

  const waitClosedAt = Date.now();
  while (Date.now() - waitClosedAt < 3000) {
    exactStillVisible = await page.evaluate(() => {
      const visible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          st.display !== "none" &&
          st.visibility !== "hidden" &&
          st.opacity !== "0"
        );
      };

      return [...document.querySelectorAll("button#sluit_inr_detail")].some(visible);
    }).catch(() => false);

    if (!exactStillVisible) {
      await sleep(200);
      return true;
    }

    await sleep(100);
  }

  console.log(
    `[sportscholen] ⚠️ ${cleanKey} DETAILS lijkt nog open; VECHTERS-controle bepaalt of de pagina bruikbaar is`
  );
  return true;
}

function deriveKeurmerkSummary(periods) {
  const cleaned = (periods ?? [])
    .filter((p) => p && (p.start || p.einde))
    .map((p) => ({
      toegevoegd_door: p.toegevoegd_door ?? null,
      toegevoegd_op: p.toegevoegd_op ?? null,
      start: p.start ?? null,
      einde: p.einde ?? null,
    }))
    .sort((a, b) =>
      String(a.start || a.toegevoegd_op || "").localeCompare(
        String(b.start || b.toegevoegd_op || "")
      )
    );

  const today = new Date().toISOString().slice(0, 10);

  const current =
    cleaned.find((p) =>
      (!p.start || p.start <= today) &&
      (!p.einde || p.einde >= today)
    ) ?? null;

  const future =
    cleaned
      .filter((p) => p.start && p.start > today)
      .sort((a, b) => String(a.start).localeCompare(String(b.start)))[0] ?? null;

  const latestEnd =
    cleaned
      .map((p) => p.einde)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  return {
    periods: cleaned,
    current,
    future,
    latestEnd,
  };
}

async function saveKeurmerkPeriods(sportschoolKey, periods) {
  const key = Number(normalizeSportschoolKey(sportschoolKey));
  if (!Number.isFinite(key)) {
    throw new Error("Ongeldige sportschool key bij keurmerk-save");
  }

  const summary = deriveKeurmerkSummary(periods);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("sportscholen")
    .update({
      keurmerk_start: summary.current?.start ?? null,
      keurmerk_einde: summary.current?.einde ?? null,
      keurmerk_volgende_start: summary.future?.start ?? null,
      keurmerk_volgende_einde: summary.future?.einde ?? null,
      keurmerk_laatste_einde: summary.latestEnd,
      keurmerk_periodes: summary.periods,
      keurmerk_checked_at: now,
      updated_at: now,
    })
    .eq("sportschool_id", key);

  if (error) throw error;

  return {
    aantal: summary.periods.length,
    current: summary.current,
    future: summary.future,
    latestEnd: summary.latestEnd,
  };
}

async function scrapeKeurmerkDetails(page, sportschool) {
  const key = normalizeSportschoolKey(sportschool?.sportschool_id);
  if (!key) throw new Error("sportschoolKey ontbreekt voor DETAILS");

  await openDetailsTile(page, key);

  let result;
  try {
    const periods = await readKeurmerkPeriods(page, key);
    result = await saveKeurmerkPeriods(key, periods);

    console.log(`[sportscholen] ✅ ${key} keurmerk DETAILS opgeslagen`, {
      sportschool: sportschool?.naam ?? null,
      periodes: result.aantal,
      huidig_einde: result.current?.einde ?? null,
      volgende_start: result.future?.start ?? null,
      volgende_einde: result.future?.einde ?? null,
      laatste_einde: result.latestEnd ?? null,
    });
  } finally {
    // Expliciet exact sluiten zoals FightPassport bedoeld heeft.
    await closeDetailsExact(page, key);
  }

  return result;
}


async function scrapeSportschoolWithPage(page, browser, sportschool) {
  const key = normalizeSportschoolKey(sportschool?.sportschool_id);

  if (!key) {
    throw new Error("sportschoolKey ontbreekt");
  }

  let downloadedExcelFile = null;

  try {
    await updateSportschoolSyncStatus(key, "bezig");

    // De verse worker-page is al exact op #organisation/<key> bevestigd.
    await waitForOrganisationPage(page, key, sportschool);

    // 1) DETAILS -> alle keurmerkregels -> exact sluiten via #sluit_inr_detail.
    const keurmerkResult = await scrapeKeurmerkDetails(page, sportschool);

    // 2) Daarna VECHTERS op dezelfde organisation-page.
    await waitForOrganisationPage(page, key, sportschool);
    await openVechtersTile(page, key, sportschool);

    downloadedExcelFile = await downloadVechtersExcel(page, browser, key);

    const fighters = await parseVechtersExcel(downloadedExcelFile, sportschool);
    const vaList = await saveSportschoolFighterLinks(key, fighters);

    await updateSportschoolSyncStatus(key, "klaar");

    console.log("✅ Sportschool volledig opgeslagen", {
      sportschool: sportschool.naam,
      sportschool_id: Number(key),
      keurmerk_periodes: keurmerkResult?.aantal ?? 0,
      aantal_vechters: vaList.length,
    });

    return {
      vaList,
      keurmerkResult,
    };
  } catch (err) {
    await updateSportschoolSyncStatus(
      key,
      "mislukt",
      err?.message ?? String(err)
    ).catch(() => {});

    console.error("❌ Sportschool scrape fout:", err?.stack ?? err);
    throw err;
  } finally {
    await removeDownloadedExcel(downloadedExcelFile);

    try {
      await page.goto("about:blank", {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });
    } catch {}
  }
}

export async function scraperFightcrew(sportschoolKey) {
  const key = normalizeSportschoolKey(sportschoolKey);

  if (!key) {
    throw new Error("sportschoolKey ontbreekt");
  }

  const { data: sportschool, error } = await supabase
    .from("sportscholen")
    .select("*")
    .eq("sportschool_id", Number(key))
    .single();

  if (error) throw error;

  if (!sportschool) {
    throw new Error(`Sportschool niet gevonden: ${key}`);
  }

  const { browser, page } = await loginFightPassport();

  try {
    return await scrapeSportschoolWithPage(page, browser, sportschool);
  } finally {
    try {
      await browser.close();
    } catch {}
  }
}


async function createTeamSyncRun(totalSchools, tabCount) {
  const now = new Date().toISOString();

  // Nieuwe 3x10 sportscholen-run:
  // de API-route bewaakt de volledige run al met de globale FightPassport scraper-lock.
  // De drie deelprocessen mogen elkaars actieve runrecords dus NIET als stale/failed
  // markeren. De oude team-scraper cleanup is hier bewust verwijderd.

  const { data, error } = await supabase
    .from("fightpassport_sync_runs")
    .insert({
      start_va: 1,
      end_va: Math.max(1, Number(totalSchools) || 1),
      run_type: "team",
      status: "running",
      processed_count: 0,
      found_count: 0,
      licensed_count: 0,
      error_count: 0,
      meta: {
        kind: "sportscholen",
        total_schools: Number(totalSchools) || 0,
        succeeded: 0,
        failed: 0,
        fighter_links: 0,
        tabs: tabCount,
        pid: process.pid,
        started_at: now,
      },
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function upsertTeamSyncItem(runId, sportschool, patch = {}) {
  if (!runId) return;

  const sportschoolId = Number(sportschool?.sportschool_id);
  if (!Number.isFinite(sportschoolId)) return;

  const now = new Date().toISOString();

  const payload = {
    sync_run_id: runId,
    sportschool_id: sportschoolId,
    sportschool_naam: sportschool?.naam ?? null,
    plaats: sportschool?.plaats ?? null,
    status: patch.status ?? "running",
    error_message: patch.error_message ?? null,
    attempts: Number(patch.attempts ?? 1),
    fighter_links: Number(patch.fighter_links ?? 0),
    started_at: patch.started_at ?? now,
    finished_at: patch.finished_at ?? null,
    updated_at: now,
  };

  const { error } = await supabase
    .from("fightpassport_team_sync_items")
    .upsert(payload, {
      onConflict: "sync_run_id,sportschool_id",
    });

  if (error) {
    console.log(
      `⚠️ Team-run item opslaan mislukt voor sportschool ${sportschoolId}:`,
      error.message
    );
  }
}

async function updateTeamSyncRun(runId, {
  totalSchools,
  processed,
  succeeded,
  failed,
  fighterLinks,
  tabCount,
  status = "running",
  finishedAt = null,
  errorMessage = null,
}) {
  if (!runId) return;

  const { error } = await supabase
    .from("fightpassport_sync_runs")
    .update({
      status,
      processed_count: processed,
      found_count: succeeded,
      licensed_count: fighterLinks,
      error_count: failed,
      finished_at: finishedAt,
      error_message: errorMessage,
      last_processed_va: processed || null,
      meta: {
        kind: "sportscholen",
        total_schools: totalSchools,
        succeeded,
        failed,
        fighter_links: fighterLinks,
        tabs: tabCount,
        pid: status === "running" ? process.pid : null,
        updated_at: new Date().toISOString(),
      },
    })
    .eq("id", runId);

  if (error) {
    console.log("⚠️ Team-run voortgang opslaan mislukt:", error.message);
  }
}

async function loadAllSportscholen() {
  const allSchools = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("sportscholen")
      .select(
        "sportschool_id, naam, plaats, land, last_team_sync_at, team_sync_status, team_sync_error"
      )
      .not("sportschool_id", "is", null)
      .order("sportschool_id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = data ?? [];
    allSchools.push(...batch);

    console.log("🏫 Sportscholen uit database geladen", {
      batch_vanaf: from,
      batch_aantal: batch.length,
      totaal_geladen: allSchools.length,
    });

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return allSchools;
}

export async function scraperFightcrewAll(options = {}) {
  const failedOnly = options?.failedOnly === true;

  const { data: schools, error } = await supabase
    .from("sportscholen")
    .select(
      "sportschool_id, naam, plaats, land, team_sync_status, team_sync_error"
    )
    .order("sportschool_id", { ascending: true });

  if (error) throw error;

  const tabsRaw = Number(
    process.env.FP_SPORTSCHOLEN_WORKERS ??
    process.env.WORKERS ??
    "10"
  );

  const tabCount =
    Number.isFinite(tabsRaw) && tabsRaw > 0
      ? Math.min(20, Math.max(1, Math.floor(tabsRaw)))
      : 10;

  const baseSchoolList = EXPLICIT_SCHOOL_KEY_SET.size > 0
    ? (schools ?? []).filter((sportschool) =>
        EXPLICIT_SCHOOL_KEY_SET.has(normalizeSportschoolKey(sportschool?.sportschool_id))
      )
    : (schools ?? []);

  const schoolList = failedOnly
    ? baseSchoolList.filter((sportschool) => {
        const status = String(sportschool?.team_sync_status ?? "").trim().toLowerCase();
        return status === "fout" || status === "mislukt";
      })
    : baseSchoolList;

  if (failedOnly) {
    console.log("🔁 Alleen mislukte sportscholen opnieuw verwerken", {
      aantal: schoolList.length,
      statuses: ["fout", "mislukt"],
    });
  }

  const results = [];
  let processedCount = 0;
  let succeededCount = 0;
  let failedCount = 0;
  let fighterLinksCount = 0;

  const teamRun = await createTeamSyncRun(schoolList.length, tabCount);

  console.log(
    failedOnly
      ? "🔁 Herkansing mislukte sportscholen gestart"
      : "🏫 Volledige sportscholenscrape gestart",
    {
      gevonden_sportscholen: schoolList.length,
      browsers: 1,
      parallelle_tabs: tabCount,
      max_pogingen_per_sportschool: 2,
      doel: "DETAILS keurmerk + VECHTERS Excel",
      worker_model: "EXACT Total worker/session/retry model",
    }
  );

  if (!schoolList.length) {
    await updateTeamSyncRun(teamRun.id, {
      totalSchools: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      fighterLinks: 0,
      tabCount,
      status: "completed",
      finishedAt: new Date().toISOString(),
    });
    return [];
  }

  // EXACT Total-model: schone master-sessie, trusted-device herkenning via login-helper,
  // oude PHPSESSID niet hergebruiken, niets naar disk schrijven.
  let { browser, page: masterPage } = await loginFightPassport({
    freshSession: true,
    saveCookiesToDisk: false,
  });

  // Eén browserbrede fallback per child-proces.
  // Worker-downloads houden hun eigen downloads/<school_uuid>-map.
  let browserDownloadFallbackDir = await setBrowserDownloadFallback(browser);

  let browserGeneration = 1;
  let browserRestartPromise = null;

  let cookies = [];
  try {
    cookies = await masterPage.cookies();
  } catch {}

  console.log(
    "[sportscholen] ✅ Schone master-sessie gestart; workers delen browser + actuele sessiecookies"
  );

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
      console.log(
        `[sportscholen] 🔄 volledige browser opnieuw starten ${
          reason ? `(${reason})` : ""
        }`
      );

      cleanupBrowserDownloadFallback(browserDownloadFallbackDir);
      browserDownloadFallbackDir = null;

      try { await masterPage?.close(); } catch {}
      try { await browser?.close(); } catch {}

      const fresh = await loginFightPassport({
        freshSession: true,
        saveCookiesToDisk: false,
      });

      browser = fresh.browser;
      masterPage = fresh.page;
      browserDownloadFallbackDir = await setBrowserDownloadFallback(browser);

      try {
        cookies = await masterPage.cookies();
      } catch {
        cookies = [];
      }

      browserGeneration++;

      console.log(
        `[sportscholen] ✅ browser hersteld; generatie ${browserGeneration}`
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
      try { await masterRefreshPromise; } catch {}
      return cookies;
    }

    masterRefreshPromise = (async () => {
      console.log(
        `[sportscholen] 🔁 master ensureLoggedIn(force) start ${
          reason ? `(${reason})` : ""
        }`
      );

      await ensureLoggedIn(masterPage, {
        force: true,
        saveCookiesToDisk: false,
        useStoredCookies: false,
      });

      try {
        cookies = await masterPage.cookies();
      } catch {}

      console.log("[sportscholen] ✅ master refreshed (cookies updated)");
      return cookies;
    })();

    try {
      return await masterRefreshPromise;
    } finally {
      masterRefreshPromise = null;
    }
  }

  // Exact dezelfde defaults als huidige Total-route.
  const STAGGER = Math.max(
    0,
    Number(
      process.env.STAGGER_MS ??
      process.env.FP_SPORTSCHOLEN_STAGGER_MS ??
      "2500"
    )
  );

  const WORKER_DRIFT_MAX_MS = Math.max(
    0,
    Number(process.env.FP_SPORTSCHOLEN_WORKER_DRIFT_MAX_MS ?? "250")
  );

  const TAB_ATTEMPTS = Math.max(
    1,
    Number(process.env.TAB_ATTEMPTS ?? "3")
  );

  const SOFT_WAIT_MS = Math.max(
    0,
    Number(process.env.SOFT_WAIT_MS ?? "1500")
  );

  const BETWEEN_ATTEMPTS_MS = Math.max(
    0,
    Number(process.env.BETWEEN_ATTEMPTS_MS ?? "700")
  );

  let idx = 0;
  let activeAttempts = 0;

  // Exact Total-gedrag: een fout item achteraan opnieuw plannen.
  const schoolQueue = [...schoolList];

  const loginRetryCounts = new Map();
  const MAX_LOGIN_RETRIES_PER_SCHOOL = Math.max(
    1,
    Number(process.env.FP_SPORTSCHOLEN_LOGIN_RETRIES ?? "1")
  );

  const transientRetryCounts = new Map();
  const MAX_TRANSIENT_RETRIES_PER_SCHOOL = Math.max(
    0,
    Number(process.env.FP_SPORTSCHOLEN_TRANSIENT_RETRIES ?? "1")
  );

  async function finalizeProgress() {
    await updateTeamSyncRun(teamRun.id, {
      totalSchools: schoolList.length,
      processed: processedCount,
      succeeded: succeededCount,
      failed: failedCount,
      fighterLinks: fighterLinksCount,
      tabCount,
    });
  }

  async function requeueTransientSchool(sportschool, label, reason) {
    const key = normalizeSportschoolKey(sportschool?.sportschool_id);
    const retryNr = (transientRetryCounts.get(key) || 0) + 1;

    if (retryNr > MAX_TRANSIENT_RETRIES_PER_SCHOOL) {
      return false;
    }

    transientRetryCounts.set(key, retryNr);

    await updateSportschoolSyncStatus(
      key,
      "bezig",
      `Tijdelijke fout; volledig verse poging ${
        retryNr + 1
      }/${MAX_TRANSIENT_RETRIES_PER_SCHOOL + 1}. Oorzaak: ${reason}`
    ).catch(() => {});

    schoolQueue.push(sportschool);

    console.log(
      `[sportscholen] ♻️ ${label} sportschool ${key} achteraan opnieuw ingepland ` +
      `(verse poging ${retryNr + 1}/${MAX_TRANSIENT_RETRIES_PER_SCHOOL + 1}): ${reason}`
    );

    return true;
  }

  async function markPermanentFailure(sportschool, message, startedAt) {
    const key = normalizeSportschoolKey(sportschool?.sportschool_id);

    await updateSportschoolSyncStatus(key, "fout", message).catch(() => {});

    await upsertTeamSyncItem(teamRun.id, sportschool, {
      status: "error",
      attempts:
        (transientRetryCounts.get(key) || 0) +
        (loginRetryCounts.get(key) || 0) +
        1,
      fighter_links: 0,
      error_message: message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    results.push({
      sportschool_id: Number(key),
      sportschool_naam: sportschool?.naam ?? null,
      ok: false,
      error: message,
    });

    processedCount++;
    failedCount++;
    await finalizeProgress();
  }

  async function workerLoop(workerIdx) {
    const workerStartDelay = workerIdx * STAGGER;
    if (workerStartDelay > 0) {
      await sleep(workerStartDelay);
    }

    // Exact Total: worker is alleen async taakverdeler.
    // Geen eigen incognito/browsercontext; iedere sportschool krijgt een verse page.
    while (true) {
      if (idx >= schoolQueue.length) {
        if (activeAttempts > 0) {
          await sleep(100);
          continue;
        }
        break;
      }

      const myIdx = idx++;
      if (myIdx >= schoolQueue.length) {
        await sleep(50);
        continue;
      }

      activeAttempts++;

      const sportschool = schoolQueue[myIdx];
      const key = normalizeSportschoolKey(sportschool?.sportschool_id);
      const label = `worker${workerIdx + 1}/${tabCount}`;
      const startedAt = new Date().toISOString();
      const schoolBrowserGeneration = browserGeneration;

      let page = null;

      try {
        if (!key) {
          throw new Error("Ongeldige sportschool_id");
        }

        console.log(
          `🏫 [sportscholen] 🤖 ${label} → sportschool ${key} (${sportschool?.naam ?? "-"})`
        );

        await upsertTeamSyncItem(teamRun.id, sportschool, {
          status: "running",
          attempts:
            (transientRetryCounts.get(key) || 0) +
            (loginRetryCounts.get(key) || 0) +
            1,
          fighter_links: 0,
          error_message: null,
          started_at: startedAt,
          finished_at: null,
        });

        // EXACT Total-navigationmodel: verse page, actuele mastercookies,
        // retry-parameters vanuit dezelfde env/defaults als Total.
        page = await openTabToOrganisationVerified(
          browser,
          null,
          cookies,
          key,
          sportschool,
          {
            maxAttempts: TAB_ATTEMPTS,
            softWaitMs: SOFT_WAIT_MS,
            betweenAttemptsMs: BETWEEN_ATTEMPTS_MS,
            workerLabel: `[${label}]`,
          }
        );

        if (!page) {
          const requeued = await requeueTransientSchool(
            sportschool,
            label,
            "organisation-url/profiel niet betrouwbaar geopend"
          );

          if (requeued) {
            continue;
          }

          throw new Error(
            `Na ${MAX_TRANSIENT_RETRIES_PER_SCHOOL + 1} volledig verse pogingen geen geldige organisation-page gevonden.`
          );
        }

        const schoolResult = await scrapeSportschoolWithPage(
          page,
          browser,
          sportschool
        );

        const vaList = schoolResult?.vaList ?? [];

        loginRetryCounts.delete(key);
        transientRetryCounts.delete(key);

        results.push({
          sportschool_id: Number(key),
          sportschool_naam: sportschool?.naam ?? null,
          ok: true,
          count: vaList.length,
          keurmerk_periodes: schoolResult?.keurmerkResult?.aantal ?? 0,
        });

        await upsertTeamSyncItem(teamRun.id, sportschool, {
          status: "success",
          attempts: 1,
          fighter_links: vaList.length,
          error_message: null,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
        });

        processedCount++;
        succeededCount++;
        fighterLinksCount += Number(vaList.length || 0);

        await finalizeProgress();

        console.log(
          `[sportscholen] ✅ ${label} sportschool ${key} volledig klaar ` +
          `(keurmerk=${schoolResult?.keurmerkResult?.aantal ?? 0}, vechters=${vaList.length})`
        );
      } catch (error) {
        const message = error?.message ?? String(error);

        if (message === "LOGIN_PAGE") {
          await hardClosePage(page).catch(() => {});
          page = null;

          const retryNr = (loginRetryCounts.get(key) || 0) + 1;
          loginRetryCounts.set(key, retryNr);

          if (retryNr <= MAX_LOGIN_RETRIES_PER_SCHOOL) {
            console.log(
              `[sportscholen] 🔐 ${label} LOGIN_PAGE bij sportschool ${key}; ` +
              `verse page dicht → alleen master-login herstellen ` +
              `(herstel ${retryNr}/${MAX_LOGIN_RETRIES_PER_SCHOOL})`
            );

            try {
              await refreshMasterSessionLocked(
                `LOGIN_PAGE from ${label} sportschool ${key}`
              );

              // Exact Total: hetzelfde item achteraan; volgende poging is volledig verse page.
              schoolQueue.push(sportschool);
            } catch (loginError) {
              await markPermanentFailure(
                sportschool,
                loginError?.message ?? String(loginError),
                startedAt
              );
            }
          } else {
            await markPermanentFailure(
              sportschool,
              `LOGIN_PAGE bleef terugkomen na ${MAX_LOGIN_RETRIES_PER_SCHOOL} herstelpoging(en).`,
              startedAt
            );
          }
        } else if (isBrowserConnectionError(message)) {
          await hardClosePage(page).catch(() => {});
          page = null;

          try {
            if (schoolBrowserGeneration === browserGeneration) {
              await restartBrowserLocked(`${label} sportschool ${key}`);
            } else {
              console.log(
                `[sportscholen] ♻️ ${label} gebruikte oude browsergeneratie ${schoolBrowserGeneration}; ` +
                `actuele generatie is ${browserGeneration}. Geen extra browserherstart.`
              );
            }

            const requeued = await requeueTransientSchool(
              sportschool,
              label,
              `browserverbinding hersteld: ${message}`
            );

            if (!requeued) {
              await markPermanentFailure(
                sportschool,
                `Browserverbinding bleef fout na ${
                  MAX_TRANSIENT_RETRIES_PER_SCHOOL + 1
                } verse pogingen: ${message}`,
                startedAt
              );
            }
          } catch (restartError) {
            await markPermanentFailure(
              sportschool,
              restartError?.message ?? String(restartError),
              startedAt
            );
          }
        } else {
          const requeued = await requeueTransientSchool(
            sportschool,
            label,
            message
          );

          if (!requeued) {
            await markPermanentFailure(sportschool, message, startedAt);

            console.error(
              `[sportscholen] ❌ ${label} sportschool ${key}: ${message}`
            );
          }
        }
      } finally {
        if (page) {
          await hardClosePage(page).catch(() => {});
        }

        activeAttempts = Math.max(0, activeAttempts - 1);

        if (WORKER_DRIFT_MAX_MS > 0) {
          const n = Number(key) || 0;
          const driftMs =
            ((workerIdx + 1) * 37 + (n % 97)) %
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
      Array.from({ length: Math.min(tabCount, Math.max(1, schoolList.length)) }, (_, i) =>
        workerLoop(i)
      )
    );
  } finally {
    cleanupBrowserDownloadFallback(browserDownloadFallbackDir);
    browserDownloadFallbackDir = null;

    try { await masterPage?.close(); } catch {}
    try { await browser?.close(); } catch {}
  }

  const succeeded = results.filter((row) => row.ok).length;
  const failed = results.filter((row) => !row.ok).length;
  const fighters = results
    .filter((row) => row.ok)
    .reduce((sum, row) => sum + Number(row.count || 0), 0);

  await updateTeamSyncRun(teamRun.id, {
    totalSchools: schoolList.length,
    processed: processedCount,
    succeeded: succeededCount,
    failed: failedCount,
    fighterLinks: fighterLinksCount,
    tabCount,
    status: "completed",
    finishedAt: new Date().toISOString(),
  });

  console.log(
    failedOnly
      ? "✅ Herkansing mislukte sportscholen afgerond"
      : "✅ Volledige sportscholenscrape afgerond",
    {
      totaal_sportscholen: schoolList.length,
      geslaagd: succeeded,
      mislukt: failed,
      totaal_vechters_verwerkt: fighters,
      browsers: 1,
      parallelle_tabs: tabCount,
      sync_run_id: teamRun.id,
      worker_model: "EXACT Total worker/session/retry model",
    }
  );

  return results;
}

if (process.argv[2] === "run") {
  scraperFightcrew(process.argv[3])
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e?.stack ?? e);
      process.exit(1);
    });
}

if (process.argv[2] === "run-all") {
  scraperFightcrewAll()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e?.stack ?? e);
      process.exit(1);
    });
}

if (process.argv[2] === "run-errors") {
  scraperFightcrewAll({ failedOnly: true })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e?.stack ?? e);
      process.exit(1);
    });
}
