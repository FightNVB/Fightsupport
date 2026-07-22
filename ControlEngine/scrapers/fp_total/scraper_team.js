// scrapers/team/scraper_team.js

import { loginFightPassport } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
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

  console.log("🌐 Organisation URL direct HARD forceren:", url);

  let lastError = null;

  for (let attempt = 1; attempt <= 6; attempt++) {
    await closeWrongVechtersPopup(page);

    console.log(`🔁 Directe organisation URL forceerpoging ${attempt}:`, url);

    try {
      // Niet eerst via de FightPassport-home.
      // Iedere worker forceert rechtstreeks zijn eigen organisation-URL.
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await sleep(1800);

      // Forceer ook de hash nogmaals wanneer de SPA de route niet heeft behouden.
      await page.evaluate((expectedKey) => {
        const expectedHash = `#organisation/${expectedKey}`;
        if (window.location.hash !== expectedHash) {
          window.location.hash = `organisation/${expectedKey}`;
        }
      }, cleanKey);

      await sleep(1200);

      await waitForOrganisationPage(page, cleanKey, sportschool);
      await sleep(700);
      await waitForOrganisationPage(page, cleanKey, sportschool);

      console.log("✅ Organisation direct hard geopend en bevestigd:", {
        key: cleanKey,
        url: page.url(),
      });

      return;
    } catch (e) {
      lastError = e;

      const debug = await getPageDebug(page).catch(() => null);

      console.log("⚠️ Directe organisation forceerpoging mislukt:", {
        attempt,
        error: e?.message ?? String(e),
        debug,
      });

      await sleep(1000);
    }
  }

  throw new Error(
    `Sportschoolpagina organisation/${cleanKey} niet direct hard geopend na 6 pogingen. Laatste fout=${
      lastError?.message ?? String(lastError)
    }`
  );
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

  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      let handles = [];

      try {
        handles = await frame.$$(
          'div.icon.source_1.has_action[title="download als excel"]'
        );
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

          const use = el.querySelector('svg use[href$="#img_41"], svg use[xlink\\:href$="#img_41"]');
          if (!use) return { ok: false };

          const bodyText = String(document.body?.innerText || "")
            .replace(/\u00a0/g, " ")
            .toUpperCase();

          const reportOk =
            bodyText.includes("RAPPORT: VECHTERS BIJ SPORTSSCHOOL") ||
            bodyText.includes("RAPPORT: VECHTERS BIJ SPORTSCHOOL");

          if (!reportOk) return { ok: false };

          return {
            ok: true,
            title: el.getAttribute("title"),
            className: el.className,
            href:
              use.getAttribute("href") ||
              use.getAttribute("xlink:href") ||
              null,
          };
        }, handle).catch(() => ({ ok: false }));

        if (verdict?.ok) {
          return { frame, handle, verdict };
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

  const downloadDir = path.resolve(
    __dirname,
    ".tmp_fightcrew_download",
    `${key}_${crypto.randomUUID().slice(0, 8)}`
  );

  fs.mkdirSync(downloadDir, { recursive: true });

  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
  });

  try {
    const found = await findVechtersDownloadControl(page, 45000);

    if (!found) {
      const debug = await getPageDebug(page);
      throw new Error(
        "Exacte Excel-knop van Vechters-rapport niet gevonden. Debug=" +
          JSON.stringify(debug)
      );
    }

    console.log("✅ Exacte Excel-knop bevestigd:", found.verdict);

    // Exact één keer klikken op de DIV zelf.
    await found.frame.evaluate((el) => {
      el.scrollIntoView?.({ block: "center", inline: "center" });
      el.click();
    }, found.handle);

    console.log(
      `⬇️ Sportschool ${key}: Excel één keer aangeklikt; wachten op volledige download...`
    );

    const startedAt = Date.now();
    const timeoutMs = Number(
      process.env.TEAM_EXCEL_DOWNLOAD_TIMEOUT_MS ?? "180000"
    );
    let lastLogAt = 0;

    while (Date.now() - startedAt < timeoutMs) {
      let filesNow = [];

      try {
        filesNow = fs.readdirSync(downloadDir);
      } catch {
        filesNow = [];
      }

      const elapsedMs = Date.now() - startedAt;

      if (Date.now() - lastLogAt >= 5000) {
        lastLogAt = Date.now();
        console.log(
          `⏳ Sportschool ${key}: wacht op Vechters Excel (${Math.round(
            elapsedMs / 1000
          )}s)`,
          { files: filesNow }
        );
      }

      const crdownloads = filesNow.filter((f) =>
        f.toLowerCase().endsWith(".crdownload")
      );

      const excelFiles = filesNow
        .filter((f) => {
          const low = f.toLowerCase();
          return low.endsWith(".xlsx") || low.endsWith(".xls");
        })
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

      if (excelFiles.length > 0) {
        const candidate = excelFiles[0];
        let lastSize = -1;
        let stableSince = null;
        const completeCheckStartedAt = Date.now();

        console.log(
          `📥 Sportschool ${key}: Excel gezien; wachten tot bestand volledig klaar is: ${path.basename(
            candidate
          )}`
        );

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
            await sleep(1500);

            try {
              await readXlsxToRows(candidate, { sheetIndex: 0 });

              console.log(
                `✅ Sportschool ${key}: Vechters Excel volledig binnen (${size} bytes)`
              );

              return candidate;
            } catch (e) {
              console.log(
                `⏳ Sportschool ${key}: Excel bestaat maar is nog niet leesbaar:`,
                e?.message ?? String(e)
              );
              stableSince = null;
            }
          }

          await sleep(500);
        }
      }

      // Bewust géén tweede klik.
      // Eén klik per sportschool voorkomt dubbele exports/downloads.
      if (crdownloads.length > 0) {
        await sleep(500);
        continue;
      }

      await sleep(500);
    }

    throw new Error(
      `Geen volledige Vechters Excel ontvangen voor sportschool ${key} binnen ${Math.round(
        timeoutMs / 1000
      )} seconden`
    );
  } finally {
    await client.detach().catch(() => {});
  }
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

async function saveSportschoolFighterLinks(sportschoolKey, fighters) {
  if (!fighters.length) return [];

  const key = Number(sportschoolKey);
  const now = new Date().toISOString();

  // Na een succesvolle Excel-parse eerst oude koppelingen voor deze sportschool
  // inactief zetten. De huidige Excel-leden worden daarna weer actief ge-upsert.
  const { error: deactivateError } = await supabase
    .from("fightpassport_school_fighters")
    .update({
      actief: false,
      updated_at: now,
    })
    .eq("sportschool_id", key)
    .eq("actief", true);

  if (deactivateError) throw deactivateError;

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

async function scrapeSportschoolWithPage(page, browser, sportschool) {
  const key = normalizeSportschoolKey(sportschool?.sportschool_id);

  if (!key) {
    throw new Error("sportschoolKey ontbreekt");
  }

  let downloadedExcelFile = null;

  try {
    await updateSportschoolSyncStatus(key, "bezig");

    await openOrganisation(page, key, sportschool);
    await openVechtersTile(page, key, sportschool);

    downloadedExcelFile = await downloadVechtersExcel(page, browser, key);

    const fighters = await parseVechtersExcel(downloadedExcelFile, sportschool);
    const vaList = await saveSportschoolFighterLinks(key, fighters);

    await updateSportschoolSyncStatus(key, "klaar");

    console.log("✅ Sportschool-koppelingen opgeslagen", {
      sportschool: sportschool.naam,
      sportschool_id: Number(key),
      aantal_vechters: vaList.length,
      tabel: "fightpassport_school_fighters",
    });

    return vaList;
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

  // Sluit een eventueel achtergebleven "running" team-runrecord af als stale.
  // Een echte dubbele scraper wordt primair voorkomen door de start-route/UI.
  const { data: activeRuns } = await supabase
    .from("fightpassport_sync_runs")
    .select("id,started_at,status,run_type")
    .eq("run_type", "team")
    .in("status", ["running", "paused"])
    .order("started_at", { ascending: false })
    .limit(5);

  if (Array.isArray(activeRuns) && activeRuns.length) {
    for (const stale of activeRuns) {
      await supabase
        .from("fightpassport_sync_runs")
        .update({
          status: "failed",
          finished_at: now,
          error_message: "Vorige team-run was nog als actief geregistreerd toen een nieuwe run startte.",
        })
        .eq("id", stale.id)
        .catch(() => {});
    }
  }

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

export async function scraperFightcrewAll() {
  // Supabase/PostgREST retourneert standaard maximaal 1000 rijen per request.
  // Daarom alle sportscholen in batches ophalen, zodat iedere run echt de
  // volledige actuele sportscholenlijst uit de database verwerkt.
  const schools = await loadAllSportscholen();

  const tabsRaw = Number(
    process.env.TEAM_SCHOOL_TABS ??
    process.env.TEAM_SCHOOL_WORKERS ??
    "8"
  );

  const tabCount =
    Number.isFinite(tabsRaw) && tabsRaw > 0
      ? Math.min(12, Math.max(1, Math.floor(tabsRaw)))
      : 8;

  // Iedere run gebruikt de actuele volledige lijst uit de tabel sportscholen.
  // Nieuwe sportscholen die sinds de vorige run in de database zijn gekomen,
  // worden hierdoor automatisch meegenomen.
  const schoolList = schools ?? [];
  const results = [];
  let processedCount = 0;
  let succeededCount = 0;
  let failedCount = 0;
  let fighterLinksCount = 0;
  let finalizedCount = 0;

  // Takenwachtrij:
  // - poging 1 mag door iedere worker worden opgepakt;
  // - bij mislukking wordt dezelfde sportschool als poging 2 expliciet
  //   doorgeschoven naar de VOLGENDE Puppeteer-worker/tab;
  // - pas na poging 2 telt de sportschool definitief als mislukt.
  const taskQueue = schoolList.map((sportschool) => ({
    sportschool,
    attempt: 1,
    targetWorker: null,
    firstError: null,
  }));

  const teamRun = await createTeamSyncRun(schoolList.length, tabCount);

  console.log("🏫 Volledige sportscholenscrape gestart", {
    gevonden_sportscholen: schoolList.length,
    browsers: 1,
    parallelle_tabs: tabCount,
    max_pogingen_per_sportschool: 2,
    doel: "alleen VECHTERS Excel en sportschool-VA koppelingen",
  });

  // Eerst logt één master-tab volledig in en blijft open.
  // PAS NA bevestigde login starten de workers. Alle worker-tabs worden daarna
  // in dezelfde browsercontext geopend en delen dus exact dezelfde sessie.
  const { browser, page: loginPage } = await loginFightPassport();

  try {
    await waitForMasterLoginReady(
      loginPage,
      Number(process.env.TEAM_MASTER_LOGIN_TIMEOUT_MS ?? "120000")
    );

    console.log("🔐 Login-tab blijft open als master-sessie:", loginPage.url());

    function takeTaskForWorker(workerIndex) {
      let index = taskQueue.findIndex(
        (task) => task.targetWorker === workerIndex
      );

      if (index === -1) {
        index = taskQueue.findIndex((task) => task.targetWorker === null);
      }

      if (index === -1) return null;
      return taskQueue.splice(index, 1)[0];
    }

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

    async function tabWorker(workerIndex) {
      await sleep(
        workerIndex *
          Number(process.env.TEAM_SCHOOL_STAGGER_MS ?? "500")
      );

      while (finalizedCount < schoolList.length) {
        const task = takeTaskForWorker(workerIndex);

        if (!task) {
          await sleep(300);
          continue;
        }

        const { sportschool, attempt } = task;
        const key = normalizeSportschoolKey(sportschool.sportschool_id);

        if (!key) {
          results.push({
            sportschool_id: sportschool.sportschool_id,
            sportschool_naam: sportschool.naam ?? null,
            ok: false,
            attempts: attempt,
            error: "Ongeldige sportschool_id",
          });

          processedCount++;
          failedCount++;
          finalizedCount++;
          await finalizeProgress();
          continue;
        }

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(
          `🏫 [tab ${workerIndex + 1}/${tabCount}] Sportschool starten`,
          {
            sportschool_id: Number(key),
            naam: sportschool.naam ?? null,
            plaats: sportschool.plaats ?? null,
            poging: `${attempt}/2`,
          }
        );

        let page = null;

        try {
          // Schone tab, maar bewust in DEZELFDE browsercontext als de master-login.
          page = await browser.newPage();
          await page.setCacheEnabled(false).catch(() => {});

          const vaList = await scrapeSportschoolWithPage(
            page,
            browser,
            sportschool
          );

          results.push({
            sportschool_id: Number(key),
            sportschool_naam: sportschool.naam ?? null,
            ok: true,
            attempts: attempt,
            count: vaList.length,
          });

          processedCount++;
          succeededCount++;
          finalizedCount++;
          fighterLinksCount += Number(vaList.length || 0);

          await finalizeProgress();

          console.log(
            `✅ [tab ${workerIndex + 1}/${tabCount}] Sportschool volledig klaar`,
            {
              sportschool_id: Number(key),
              naam: sportschool.naam ?? null,
              vechters: vaList.length,
              poging: `${attempt}/2`,
            }
          );
        } catch (e) {
          const message = e?.message ?? String(e);
          const brokenSession =
            /Session closed|Target closed|Protocol error|Execution context was destroyed|Cannot find context/i.test(
              message
            );

          if (brokenSession) {
            console.log(
              `[fp_team_all] 🧨 Kapotte worker-tab [tab ${workerIndex + 1}/${tabCount}] wordt gesloten; master-sessie blijft open: ${message}`
            );
            await hardClosePage(page).catch(() => {});
            page = null;
          }

          if (attempt < 2) {
            const nextWorker = (workerIndex + 1) % tabCount;

            taskQueue.push({
              sportschool,
              attempt: 2,
              targetWorker: nextWorker,
              firstError: message,
            });

            await updateSportschoolSyncStatus(
              key,
              "bezig",
              `Poging 1 mislukt; opnieuw aangeboden aan tab ${
                nextWorker + 1
              }. Fout: ${message}`
            ).catch(() => {});

            console.log(
              `🔁 [tab ${workerIndex + 1}/${tabCount}] Sportschool doorgeschoven naar volgende Puppeteer`,
              {
                sportschool_id: Number(key),
                naam: sportschool.naam ?? null,
                volgende_tab: `${nextWorker + 1}/${tabCount}`,
                volgende_poging: "2/2",
                fout_eerste_poging: message,
              }
            );
          } else {
            await updateSportschoolSyncStatus(
              key,
              "fout",
              message
            ).catch(() => {});

            results.push({
              sportschool_id: Number(key),
              sportschool_naam: sportschool.naam ?? null,
              ok: false,
              attempts: 2,
              first_error: task.firstError ?? null,
              error: message,
            });

            processedCount++;
            failedCount++;
            finalizedCount++;

            await finalizeProgress();

            console.log(
              `❌ [tab ${workerIndex + 1}/${tabCount}] Sportschool na 2 pogingen definitief mislukt; doorgaan`,
              {
                sportschool_id: Number(key),
                naam: sportschool.naam ?? null,
                eerste_fout: task.firstError ?? null,
                tweede_fout: message,
              }
            );
          }
        } finally {
          await hardClosePage(page).catch(() => {});
        }

        await sleep(
          Number(process.env.FIGHTCREW_BETWEEN_SCHOOLS_MS ?? "500")
        );
      }

    }

    await Promise.all(
      Array.from({ length: tabCount }, (_, index) => tabWorker(index))
    );
  } finally {
    try {
      await browser.close();
    } catch {}
  }

  const succeeded = results.filter((row) => row.ok).length;
  const failed = results.length - succeeded;
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

  console.log("✅ Volledige sportscholenscrape afgerond", {
    totaal_sportscholen: results.length,
    geslaagd: succeeded,
    mislukt: failed,
    totaal_vechters_verwerkt: fighters,
    browsers: 1,
    parallelle_tabs: tabCount,
    sync_run_id: teamRun.id,
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