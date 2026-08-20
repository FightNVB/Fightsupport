// scrapers/team/scraper_team.js

import { loginFightPassport } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import fs from "fs";
import path from "path";
import { readXlsxToRows } from "../utils/excelRowsExceljs.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  try {
    const client = await page.target().createCDPSession();

    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
    });
  } catch (e) {
    console.log("⚠️ Page.setDownloadBehavior fout:", e?.message ?? e);
  }

  try {
    const bClient = await browser.target().createCDPSession();

    await bClient.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
      eventsEnabled: true,
    });
  } catch (e) {
    console.log("⚠️ Browser.setDownloadBehavior overgeslagen:", e?.message ?? e);
  }
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

    if (dir.includes(`${path.sep}.tmp_fightcrew_download${path.sep}`) && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    const tmpRoot = path.resolve(__dirname, ".tmp_fightcrew_download");
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
  const sportschoolName = normalizeText(sportschool?.naam).toLowerCase();

  console.log("🔍 Exact controleren of sportschoolpagina geladen is...", {
    key,
    sportschool: sportschoolName || null,
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

    const nameOk =
      !sportschoolName ||
      normalizeText(state.body).toLowerCase().includes(sportschoolName);

    const tilesOk = state.hasDetailsTile && state.hasVechtersTile;

    if (hashOk && tilesOk && !state.hasWrongPopup) {
      if (!nameOk) {
        console.log("⚠️ Sportschoolnaam niet zichtbaar, maar key + tegels kloppen:", {
          key,
          sportschool: sportschoolName,
          hash: state.hash,
          headers: state.tileHeaders,
        });
      }

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

async function openOrganisation(page, key, sportschool) {
  const cleanKey = normalizeSportschoolKey(key);
  const url = organisationUrl(cleanKey);

  console.log("🌐 Open organisatie HARD:", url);

  async function hardEnterUrl(attempt) {
    console.log(`🔁 Organisation URL hard openen poging ${attempt}:`, url);

    try {
      await page.bringToFront?.();
    } catch {}

    try {
      await page.goto("https://fightpassport.nl/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await sleep(800);
    } catch (e) {
      console.log("⚠️ Basispagina openen lukte niet:", e?.message ?? e);
    }

    try {
      const modifier = process.platform === "darwin" ? "Meta" : "Control";

      await page.keyboard.down(modifier);
      await page.keyboard.press("KeyL");
      await page.keyboard.up(modifier);

      await sleep(150);

      await page.keyboard.type(url, { delay: 10 });
      await sleep(150);
      await page.keyboard.press("Enter");

      await sleep(2500);
    } catch (e) {
      console.log("⚠️ Hard url typen mislukt, fallback goto:", e?.message ?? e);

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await sleep(2500);
    }

    try {
      await page.evaluate((expectedUrl) => {
        if (window.location.href !== expectedUrl) {
          window.location.href = expectedUrl;
        }
      }, url);

      await sleep(2000);
    } catch {}

    try {
      const modifier = process.platform === "darwin" ? "Meta" : "Control";

      await page.keyboard.down(modifier);
      await page.keyboard.press("KeyL");
      await page.keyboard.up(modifier);

      await sleep(150);
      await page.keyboard.type(url, { delay: 8 });
      await sleep(150);
      await page.keyboard.press("Enter");

      await sleep(2000);
    } catch (e) {
      console.log("⚠️ Tweede hard-enter overgeslagen:", e?.message ?? e);
    }

    try {
      await page.evaluate((expectedHashValue) => {
        if (window.location.hash !== expectedHashValue) {
          window.location.hash = expectedHashValue.replace(/^#/, "");
        }
      }, `#organisation/${cleanKey}`);

      await sleep(1500);
    } catch {}

    try {
      await page.reload({
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await sleep(1500);
    } catch (e) {
      console.log("⚠️ Reload overgeslagen:", e?.message ?? e);
    }

    try {
      const modifier = process.platform === "darwin" ? "Meta" : "Control";

      await page.keyboard.down(modifier);
      await page.keyboard.press("KeyL");
      await page.keyboard.up(modifier);

      await sleep(150);
      await page.keyboard.type(url, { delay: 8 });
      await sleep(150);
      await page.keyboard.press("Enter");

      await sleep(2500);
    } catch (e) {
      console.log("⚠️ Derde hard-enter overgeslagen:", e?.message ?? e);
    }
  }

  let lastError = null;

  for (let attempt = 1; attempt <= 6; attempt++) {
    await closeWrongVechtersPopup(page);

    await hardEnterUrl(attempt);

    try {
      await waitForOrganisationPage(page, cleanKey, sportschool);
      await sleep(700);
      await waitForOrganisationPage(page, cleanKey, sportschool);

      console.log("✅ Organisation hard geopend en bevestigd:", {
        key: cleanKey,
        url: page.url(),
      });

      return;
    } catch (e) {
      lastError = e;

      const debug = await getPageDebug(page).catch(() => null);

      console.log("⚠️ Organisation poging mislukt:", {
        attempt,
        error: e?.message ?? String(e),
        debug,
      });

      await sleep(1000);
    }
  }

  throw new Error(
    `Sportschoolpagina organisation/${cleanKey} niet hard geopend na 6 pogingen. Laatste fout=${
      lastError?.message ?? String(lastError)
    }`
  );
}

async function openVechtersTile(page, key, sportschool) {
  await closeWrongVechtersPopup(page);

  await waitForOrganisationPage(page, key, sportschool);

  await sleep(1000);

  await waitForOrganisationPage(page, key, sportschool);

  console.log("🔍 Nu pas VECHTERS tegel op sportschoolpagina openen...");

  const clicked = await page.evaluate((expectedKey) => {
    const bodyText = document.body?.innerText || "";
    const expectedHash = `#organisation/${expectedKey}`;

    if (
      window.location.hash !== expectedHash &&
      !window.location.href.includes(`#organisation/${expectedKey}`)
    ) {
      return {
        ok: false,
        reason: "Niet op organisation hash, klik geblokkeerd",
        hash: window.location.hash,
        href: window.location.href,
      };
    }

    if (bodyText.includes("Actuele vechters")) {
      return {
        ok: false,
        reason: "Verkeerde popup Actuele vechters is open",
      };
    }

    const detailsTile =
      document.querySelector('.tile[title="DETAILS"]') ||
      [...document.querySelectorAll(".tileHeader")]
        .find((el) => (el.innerText || "").trim().toUpperCase() === "DETAILS")
        ?.closest(".tile");

    const vechtersTile =
      document.querySelector('.tile[title="VECHTERS"]') ||
      [...document.querySelectorAll(".tileHeader")]
        .find((el) => (el.innerText || "").trim().toUpperCase() === "VECHTERS")
        ?.closest(".tile");

    if (!detailsTile || !vechtersTile) {
      return {
        ok: false,
        reason: "DETAILS en VECHTERS sportschooltegels niet allebei zichtbaar",
        hash: window.location.hash,
        headers: [...document.querySelectorAll(".tileHeader")]
          .map((el) => (el.innerText || "").trim())
          .filter(Boolean)
          .slice(0, 30),
      };
    }

    vechtersTile.scrollIntoView?.({ block: "center", inline: "center" });

    const rect = vechtersTile.getBoundingClientRect();

    vechtersTile.dispatchEvent(
      new MouseEvent("mouseover", {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      })
    );

    vechtersTile.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      })
    );

    vechtersTile.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      })
    );

    vechtersTile.click();

    return {
      ok: true,
      method: "exacte VECHTERS tegel op organisation pagina",
      hash: window.location.hash,
      title: vechtersTile.getAttribute("title"),
      text: vechtersTile.innerText,
    };
  }, normalizeSportschoolKey(key));

  if (!clicked?.ok) {
    const debug = await getPageDebug(page);

    throw new Error(
      `VECHTERS tegel NIET aangeklikt. Result=${JSON.stringify(
        clicked
      )}. Debug=${JSON.stringify(debug)}`
    );
  }

  console.log("✅ Sportschool VECHTERS tegel aangeklikt:", clicked);

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

async function downloadVechtersExcel(page, browser, sportschoolKey) {
  const key = normalizeSportschoolKey(sportschoolKey);

  await ensureReadyForVechtersDownload(page, key);

  console.log("📥 Excel downloaden vanaf rapport Vechters bij sportschool...");

  // Gebruik één tijdelijke map en ruim die na verwerking weer op.
  // Zo blijven er geen downloadmappen achter in je app.
  const downloadDir = path.resolve(__dirname, ".tmp_fightcrew_download", String(key));

  if (fs.existsSync(downloadDir)) {
    fs.rmSync(downloadDir, { recursive: true, force: true });
  }

  await cleanupDownloadDir(downloadDir);
  await setDownloadBehavior(page, browser, downloadDir);

  const selectors = [
    '[title="download als excel"]',
    '[title*="download"][title*="excel"]',
    ".icon.source_1.has_action.linksonder",
    "#id_URjADzk3Y > div.flexlist_bottom_wrapper > div.flexlist_icons > div",
    "#id_URjADzk3Y > div.flexlist_bottom_wrapper > div.flexlist_icons > div > svg",
    "#id_URjADzk3Y > div.flexlist_bottom_wrapper > div.flexlist_icons > div > svg > use",
    'svg use[href*="#img_41"]',
  ];

  const found = await waitForAnySelectorInAnyFrame(page, selectors, 45000);

  if (!found) {
    const debug = await getPageDebug(page);
    throw new Error(
      "Excel knop niet gevonden op Vechters rapport. Debug=" + JSON.stringify(debug)
    );
  }

  console.log("✅ Excel knop gevonden:", found.selector);

  async function clickDownload() {
    await ensureReadyForVechtersDownload(page, key);

    const handle = await found.frame.$(found.selector);

    if (!handle) {
      throw new Error("Excel knop handle niet meer gevonden");
    }

    const clickableHandle = await found.frame.evaluateHandle((el) => {
      return (
        el.closest?.('[title="download als excel"]') ||
        el.closest?.('[title*="download"][title*="excel"]') ||
        el.closest?.(".icon") ||
        el.closest?.(".has_action") ||
        el.closest?.("div") ||
        el
      );
    }, handle);

    const clickable = clickableHandle.asElement();

    if (!clickable) {
      throw new Error("Excel knop clickable element niet gevonden");
    }

    const box = await clickable.boundingBox();

    if (!box) {
      throw new Error("Excel knop heeft geen boundingBox");
    }

    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    console.log("🖱️ Echte muisklik op Excel knop:", {
      x,
      y,
      selector: found.selector,
    });

    await page.mouse.move(x, y, { steps: 12 });
    await sleep(250);
    await page.mouse.down();
    await sleep(120);
    await page.mouse.up();

    await sleep(500);
  }

  await clickDownload();

  const start = Date.now();
  let retried = false;

  while (Date.now() - start < 70000) {
    const files = fs.existsSync(downloadDir) ? fs.readdirSync(downloadDir) : [];

    const xlsx = files
      .filter((f) => {
        const low = f.toLowerCase();
        return low.endsWith(".xlsx") || low.endsWith(".xls");
      })
      .map((f) => path.join(downloadDir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    if (xlsx[0]) {
      let lastSize = -1;
      let stable = 0;

      for (let i = 0; i < 80; i++) {
        const file = xlsx[0];

        if (!fs.existsSync(file)) break;

        const size = fs.statSync(file).size;

        if (size > 0 && size === lastSize) {
          stable++;

          if (stable >= 3) {
            console.log("✅ Excel gedownload:", file);
            return file;
          }
        } else {
          stable = 0;
          lastSize = size;
        }

        await sleep(250);
      }

      console.log("✅ Excel gevonden:", xlsx[0]);
      return xlsx[0];
    }

    const hasCrdownload = files.some((f) =>
      f.toLowerCase().endsWith(".crdownload")
    );

    if (!retried && Date.now() - start > 8000 && files.length === 0 && !hasCrdownload) {
      retried = true;

      console.log(
        "↪️ Geen download na 8 sec, rapport opnieuw gecontroleerd en klik nog een keer..."
      );

      await clickDownload().catch((e) => {
        console.log("⚠️ Tweede klik mislukt:", e?.message ?? e);
      });
    }

    await sleep(250);
  }

  return await waitForNewExcel(downloadDir, 10000);
}

function findHeaderIndex(headers, names) {
  const low = headers.map((h) => String(h || "").trim().toLowerCase());

  for (const name of names) {
    const idx = low.indexOf(name.toLowerCase());
    if (idx !== -1) return idx;
  }

  for (const name of names) {
    const idx = low.findIndex((h) => h.includes(name.toLowerCase()));
    if (idx !== -1) return idx;
  }

  return -1;
}

function findHeaderRowIndex(rows) {
  const max = Math.min(rows.length, 25);

  for (let i = 0; i < max; i++) {
    const cells = rows[i] || [];
    const joined = cells
      .map((x) => String(x ?? "").trim().toLowerCase())
      .join(" ");

    const hasVa =
      joined.includes("va-nummer") ||
      joined.includes("va nummer") ||
      joined.includes("va");

    const hasNaam =
      joined.includes("naam vechter") ||
      joined.includes("naam") ||
      joined.includes("vechter");

    if (hasVa && hasNaam) return i;
  }

  return -1;
}

function splitNaam(fullName) {
  const naam = normalizeText(fullName);
  if (!naam) return { voornaam: null, achternaam: null };

  const parts = naam.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return {
      voornaam: parts[0],
      achternaam: null,
    };
  }

  return {
    voornaam: parts.slice(0, -1).join(" "),
    achternaam: parts.slice(-1).join(" "),
  };
}

async function parseVechtersExcel(filePath, sportschool) {
  console.log("📊 Excel verwerken:", filePath);

  const rows = await readXlsxToRows(filePath, {
    sheetIndex: 0,
  });

  if (!rows?.length) {
    throw new Error("Excel is leeg of kon niet gelezen worden");
  }

  const headerRowIndex = findHeaderRowIndex(rows);

  if (headerRowIndex === -1) {
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
    const naamParts = splitNaam(naam);

    out.push({
      sportschool_id: String(sportschool.sportschool_id),
      va_nummer: va,
      naam,
      voornaam: naamParts.voornaam,
      achternaam: naamParts.achternaam,
      geboortedatum: null,
      geslacht: idxGeslacht !== -1 ? normalizeText(row[idxGeslacht]) || null : null,
      discipline: null,
      klasse: null,
      gewicht: null,
      licentie_status: null,
      keurmerk_status: null,
      heeft_keurmerk: null,
      startverbod: false,
      status: "nieuw",
      raw: {
        headerRowIndex,
        headers,
        row,
        vervaldatum:
          idxVervaldatum !== -1 ? normalizeText(row[idxVervaldatum]) || null : null,
        imported_from: "fightcrew_excel",
        imported_at: now,
      },
      scraped_at: null,
      updated_at: now,
    });
  }

  console.log(`✅ ${out.length} vechters gevonden`);

  if (!out.length) {
    const preview = rows
      .slice(headerRowIndex + 1, headerRowIndex + 8)
      .map((r) => (r || []).map((c) => String(c ?? "").trim()).join(" | "));

    throw new Error(
      `Geen vechters met VA-nummer gevonden in Excel. Headers=${JSON.stringify(
        headers
      )}. Preview=${JSON.stringify(preview)}`
    );
  }

  return out;
}

function normalizeGymName(raw) {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function latestResultGymByVa(vaList) {
  if (!vaList.length) return new Map();

  const { data, error } = await supabase
    .from("fightpassport_results")
    .select("va_nummer,datum,sportschool")
    .in("va_nummer", vaList)
    .not("sportschool", "is", null)
    .order("datum", { ascending: false });

  if (error) throw error;

  const out = new Map();

  // Door datum DESC is de eerste rij per VA de meest recente uitslag met sportschool.
  for (const row of data ?? []) {
    const va = normalizeVa(row?.va_nummer);
    const gym = normalizeText(row?.sportschool);
    if (!va || !gym || out.has(va)) continue;

    out.set(va, {
      sportschool: gym,
      sportschool_norm: normalizeGymName(gym),
      datum: row?.datum ?? null,
    });
  }

  return out;
}

async function saveFightcrew(fighters, sportschool) {
  if (!fighters.length) return [];

  const sportschoolId = String(
    sportschool?.sportschool_id ?? fighters[0]?.sportschool_id ?? ""
  ).trim();

  if (!sportschoolId) {
    throw new Error("sportschool_id ontbreekt in FightPassport Excel");
  }

  const sportschoolNaam = normalizeText(sportschool?.naam);
  const sportschoolNaamNorm = normalizeGymName(sportschoolNaam);
  const now = new Date().toISOString();
  const vaList = fighters.map((f) => String(f.va_nummer)).filter(Boolean);

  // De sportschool-Excel bevat ook historische leden.
  // Daarom bepaalt de meest recente uitslag met sportschool welke gym actueel is.
  const latestGymByVa = await latestResultGymByVa(vaList);

  let activeCount = 0;
  let historicalCount = 0;
  let noResultCount = 0;

  for (const fighter of fighters) {
    const va = String(fighter.va_nummer);
    const latest = latestGymByVa.get(va);

    // Geen uitslag = geen betrouwbare historische gym om mee te vergelijken.
    // Dan blijft de Excel-koppeling geldig, zodat debutanten niet verdwijnen.
    const currentGymMatches =
      !latest ||
      (sportschoolNaamNorm &&
        latest.sportschool_norm &&
        latest.sportschool_norm === sportschoolNaamNorm);

    if (latest && !currentGymMatches) historicalCount++;
    else if (!latest) noResultCount++;

    if (latest && currentGymMatches) {
      // Deze gym staat in de meest recente uitslag:
      // alle oudere sportschoolkoppelingen voor deze VA vervallen.
      const { error: deactivateOthersError } = await supabase
        .from("fightpassport_school_fighters")
        .update({ actief: false, updated_at: now })
        .eq("va_nummer", va)
        .neq("sportschool_id", sportschoolId);

      if (deactivateOthersError) throw deactivateOthersError;
    }

    const link = {
      sportschool_id: sportschoolId,
      va_nummer: va,
      naam: fighter.naam ?? null,
      geslacht: fighter.geslacht ?? null,
      actief: currentGymMatches,
      updated_at: now,
    };

    const { error: upsertError } = await supabase
      .from("fightpassport_school_fighters")
      .upsert(link, { onConflict: "sportschool_id,va_nummer" });

    if (upsertError) throw upsertError;
    if (currentGymMatches) activeCount++;
  }

  // Vechters die vroeger aan deze gym gekoppeld waren maar nu helemaal niet meer
  // in de Excel staan, mogen eveneens niet actief blijven.
  const { data: existingRows, error: existingError } = await supabase
    .from("fightpassport_school_fighters")
    .select("va_nummer")
    .eq("sportschool_id", sportschoolId)
    .eq("actief", true);

  if (existingError) throw existingError;

  const excelVaSet = new Set(vaList);

  const missingFromExcel = (existingRows ?? [])
    .map((r) => normalizeVa(r?.va_nummer))
    .filter((va) => va && !excelVaSet.has(va));

  if (missingFromExcel.length) {
    const { error: deactivateMissingError } = await supabase
      .from("fightpassport_school_fighters")
      .update({ actief: false, updated_at: now })
      .eq("sportschool_id", sportschoolId)
      .in("va_nummer", missingFromExcel);

    if (deactivateMissingError) throw deactivateMissingError;
  }

  console.log("✅ Fightcrew gekoppeld op basis van Excel + meest recente uitslag", {
    sportschool_id: sportschoolId,
    sportschool: sportschoolNaam || null,
    excel: vaList.length,
    actief: activeCount,
    historisch_bij_deze_gym: historicalCount,
    zonder_uitslag_fallback_excel: noResultCount,
    niet_meer_in_excel: missingFromExcel.length,
  });

  return vaList;
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

  let downloadedExcelFile = null;

  try {
    await updateSportschoolSyncStatus(key, "bezig");

    await openOrganisation(page, key, sportschool);
    await openVechtersTile(page, key, sportschool);

    downloadedExcelFile = await downloadVechtersExcel(page, browser, key);

    const fighters = await parseVechtersExcel(downloadedExcelFile, sportschool);
    const vaList = await saveFightcrew(fighters, sportschool);

    console.log("✅ Sportschool vechters opgeslagen in DB:", {
      sportschool: sportschool.naam,
      key,
      count: vaList.length,
    });

    await removeDownloadedExcel(downloadedExcelFile);
    downloadedExcelFile = null;

    // Geen individuele VA-scrape meer.
    // De Excel bepaalt uitsluitend welke vechters NU bij de sportschool horen.
    // De Fightcrew API haalt de details van deze VA's uit fightpassport_fighters.

    await updateSportschoolSyncStatus(key, "klaar");

    console.log("🎉 Fightcrew klaar", {
      sportschool: sportschool.naam,
      key,
      count: vaList.length,
    });

    return vaList;
  } catch (err) {
    await updateSportschoolSyncStatus(key, "mislukt", err?.message ?? err).catch(
      () => {}
    );

    console.error("❌ Fightcrew fout:", err?.stack ?? err);

    throw err;
  } finally {
    await removeDownloadedExcel(downloadedExcelFile);

    try {
      await browser.close();
    } catch {}
  }
}

export async function scraperFightcrewAll() {
  // Alleen sportscholen met minimaal één actieve contactpersoon automatisch verversen.
  const { data: contacts, error: contactError } = await supabase
    .from("sportschool_contactpersonen")
    .select("sportschool_id")
    .eq("actief", true)
    .not("sportschool_id", "is", null);

  if (contactError) throw contactError;

  const sportschoolIds = [
    ...new Set(
      (contacts ?? [])
        .map((row) => normalizeSportschoolKey(row.sportschool_id))
        .filter(Boolean)
    ),
  ];

  if (!sportschoolIds.length) {
    console.log("ℹ️ Geen sportscholen met een actieve contactpersoon gevonden.");
    return [];
  }

  const { data: schools, error: schoolError } = await supabase
    .from("sportscholen")
    .select("sportschool_id, naam")
    .in("sportschool_id", sportschoolIds.map(Number))
    .order("naam", { ascending: true });

  if (schoolError) throw schoolError;

  console.log("🏫 Wekelijkse teamscrape gestart", {
    actieve_contact_sportscholen: sportschoolIds.length,
    gevonden_sportscholen: schools?.length ?? 0,
  });

  const results = [];

  for (const sportschool of schools ?? []) {
    try {
      const vaList = await scraperFightcrew(sportschool.sportschool_id);

      results.push({
        sportschool_id: sportschool.sportschool_id,
        sportschool_naam: sportschool.naam ?? null,
        ok: true,
        count: vaList.length,
      });
    } catch (e) {
      results.push({
        sportschool_id: sportschool.sportschool_id,
        sportschool_naam: sportschool.naam ?? null,
        ok: false,
        error: e?.message ?? String(e),
      });
    }

    await sleep(Number(process.env.FIGHTCREW_BETWEEN_SCHOOLS_MS ?? "1500"));
  }

  const succeeded = results.filter((row) => row.ok).length;
  const failed = results.length - succeeded;

  console.log("✅ Wekelijkse teamscrape afgerond", {
    totaal: results.length,
    geslaagd: succeeded,
    mislukt: failed,
  });

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