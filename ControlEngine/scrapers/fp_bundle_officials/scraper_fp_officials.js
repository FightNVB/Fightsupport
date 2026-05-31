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
// UNIQUE (matchmaking_id, controle_run_id, va_nummer)
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

      // Unlock/pincodepagina is GEEN gewone loginpagina.
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
    maxAttempts = 3,
    softWaitMs = 900,
    betweenAttemptsMs = 400,
    workerLabel = "",
  } = opts ?? {};

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const p = context ? await context.newPage() : await browser.newPage();
    await p.setCacheEnabled(false);

    try {
      if (Array.isArray(cookies) && cookies.length) {
        await p.setCookie(...cookies);
      }
    } catch {}

    const url = fighterUrl(va);

    await p.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await wait(softWaitMs);

    const loginNow = await isLoginPage(p);

    if (loginNow) {
      await hardClosePage(p).catch(() => {});
      throw new Error("LOGIN_PAGE");
    }

    const info = await readHeaderInfo(p);
    const gotVa = info?.gotVa ?? null;
    const koptekst1 = info?.koptekst1 ?? "";
    const ok = gotVa && String(gotVa) === String(va);

    if (ok) return p;

    console.log(`[bundle] ↪️ openTab mismatch/empty ${workerLabel}`, {
      requested: String(va),
      gotVa: gotVa ?? null,
      attempt,
      urlNow: p.url(),
      koptekst1,
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
  return await page.evaluate((va) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
    if (!tab) return null;

    const tile = tab.querySelector(`div[title="DETAILS"]`);
    if (!tile) return null;

    const p = [...tile.querySelectorAll("ul.get_tile_content p")];

    let licentie = null;
    let totaal = null;
    let gewonnen = null;
    let heeft_startverbod = false;

    for (const row of p) {
      const raw = row.innerText || "";
      const txt = raw.toLowerCase().trim();

      if (txt.startsWith("licentie")) {
        const parts = raw.split(":");
        licentie = (parts[1] ?? "").trim() || null;
      }

      if (txt.startsWith("wedstrijden")) {
        const m = raw.match(/\d+/);
        totaal = m ? parseInt(m[0], 10) : null;
      }

      if (txt.startsWith("gewonnen")) {
        const m = raw.match(/\d+/);
        gewonnen = m ? parseInt(m[0], 10) : null;
      }

      if (txt.includes("startverbod")) {
        if (txt.includes("nee") || txt.includes("geen")) {
          heeft_startverbod = false;
        } else if (txt.includes("ja") || txt.includes("actief")) {
          heeft_startverbod = true;
        } else {
          const hasDate = /\d{2}-\d{2}-\d{4}/.test(raw);
          if (hasDate) heeft_startverbod = true;
        }
      }
    }

    return {
      licentie,
      totaal,
      gewonnen,
      heeft_startverbod: heeft_startverbod ? "Ja" : "Nee",
    };
  }, va);
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
    onConflict: "matchmaking_id,controle_run_id,va_nummer",
  });

  if (error) console.log("[fullfighter] ❌ fighters_raw upsert fout:", error.message);
  else console.log("[fullfighter] ✅ fighters_raw upsert OK:", header.va_nummer);
}

async function doFullfighter(page, va, matchmaking_id, controle_run_id) {
  const header = await scrapeHeader(page);

  if (!header?.va_nummer) {
    console.log("[fullfighter] ❌ header.va_nummer ontbreekt:", va);
    return;
  }

  await openTile(page, va, "DETAILS");
  const details = await scrapeDetails(page, va);
  const zero = await scrapeZeroMeting(page);

  await saveFighterRaw(va, header, details, zero, matchmaking_id, controle_run_id);
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

  let dd = m[1].padStart(2, "0");
  let mm = m[2].padStart(2, "0");
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
      Array.from(set).sort((a, b) => a - b)
    );
  }

  return out;
}

async function openUitslagenTile(page, va) {
  await closeAnyModal(page);

  await page.evaluate((va) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
    if (!tab) return;

    const headers = [...tab.querySelectorAll(".tileHeader.enabled")];
    const target = headers.find((h) => (h.innerText || "").trim().toUpperCase() === "UITSLAGEN");

    target?.closest(".tile")?.click();
  }, va);

  await wait(450);
}

async function waitForAnySelectorInAnyFrame(page, selectors, timeoutMs = 45000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const frames = page.frames();

    for (const fr of frames) {
      for (const sel of selectors) {
        try {
          const el = await fr.$(sel);
          if (el) return { frame: fr, selector: sel };
        } catch {}
      }
    }

    await wait(250);
  }

  return null;
}

async function downloadExcel(page, matchmaking_id, va) {
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

  const selectors = [
    '[title="download als excel"]',
    '[title*="download"][title*="excel"]',
    'svg use[href*="#img_41"]',
    'svg use[href*="img_41"]',
  ];

  const found = await waitForAnySelectorInAnyFrame(page, selectors, 45000);

  if (!found) throw new Error(`Download knop niet gevonden — VA ${va}`);

  const clickDownload = async () => {
    await found.frame.evaluate((sel) => {
      const el = document.querySelector(sel);

      if (!el) return;

      const clickable =
        el.closest?.('[title="download als excel"]') ||
        el.closest?.('[title*="download"][title*="excel"]') ||
        el.closest?.(".icon") ||
        el.closest?.(".has_action") ||
        el.closest?.("div") ||
        el;

      clickable?.scrollIntoView?.({ block: "center", inline: "center" });
      clickable?.click?.();
    }, found.selector);
  };

  await clickDownload();

  const start = Date.now();
  let retried = false;

  while (Date.now() - start < 60000) {
    const filesNow = fs.existsSync(downloadDir) ? fs.readdirSync(downloadDir) : [];
    const lower = filesNow.map((f) => f.toLowerCase());

    const xlsx = filesNow
      .filter((f) => f.toLowerCase().endsWith(".xlsx"))
      .map((f) => path.join(downloadDir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    if (xlsx[0]) {
      const downloadedFile = xlsx[0];

      await wait(300);

      process.once("exit", () => {
        try {
          if (fs.existsSync(downloadedFile)) {
            fs.unlinkSync(downloadedFile);
          }

          if (fs.existsSync(downloadDir)) {
            fs.rmSync(downloadDir, { recursive: true, force: true });
          }
        } catch {}
      });

      return downloadedFile;
    }

    const hasCr = lower.some((f) => f.endsWith(".crdownload"));

    if (!retried && Date.now() - start > 8000 && filesNow.length === 0 && !hasCr) {
      retried = true;
      await clickDownload().catch(() => {});
    }

    await wait(250);
  }

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

  /**
   * BELANGRIJK:
   * Geen kolomkoppen betekent bij FightPassport meestal:
   * "deze vechter heeft geen uitslagen".
   * Dit is dus GEEN scraper-fout.
   */
  if (missing.length) {
    return {
      rows: [],
      meta: {
        ok: true,
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
      .map((x) => String(x ?? "").replace(/\s+/g, " ").trim())
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

async function cleanupDownloadedFile(filePath) {
  if (!filePath) return;

  try {
    const dir = path.dirname(filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {}
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
    let file = null;

    try {
      await openUitslagenTile(page, va);

      file = await downloadExcel(page, matchmaking_id, va);

      if (!file) {
        await saveUitslagenSnapshot([], matchmaking_id, controle_run_id, va, partijNrByVaMap).catch(
          () => {}
        );

        console.log(`[uitslagen] ✅ done VA ${va} (n=0) (no file)`);
        return { ok: true, n: 0, reason: "no_file" };
      }

      const parsed = await parseExcel(file, va, matchmaking_id, controle_run_id);
      lastMeta = parsed?.meta ?? null;

      /**
       * Ook bij lege export is parsed.meta.ok === true.
       * Dan worden bestaande oude uitslagen voor deze run/VA verwijderd
       * en slaan we gewoon 0 regels op.
       */
      if (parsed?.meta?.ok) {
        const res = await saveUitslagenSnapshot(
          parsed.rows,
          matchmaking_id,
          controle_run_id,
          va,
          partijNrByVaMap
        );

        const n = res?.saved ?? parsed.rows.length ?? 0;

        if (parsed?.meta?.emptyExport) {
          console.log(`[uitslagen] ℹ️ Geen uitslagen voor VA ${va} (lege export / geen kolomkoppen)`);
          console.log(`[uitslagen] ✅ done VA ${va} (n=0)`);
          return { ok: true, n: 0, reason: "geen_uitslagen" };
        }

        console.log(`[uitslagen] ✅ done VA ${va} (n=${n})`);
        return { ok: true, n, reason: "ok" };
      }

      await closeAnyModal(page).catch(() => {});
      await wait(600 + attempt * 400);
    } finally {
      await cleanupDownloadedFile(file).catch(() => {});
    }
  }

  await saveUitslagenSnapshot([], matchmaking_id, controle_run_id, va, partijNrByVaMap).catch(
    () => {}
  );

  console.log(`[uitslagen] ℹ️ Geen uitslagen gevonden voor VA ${va}`, lastMeta ?? "");
  console.log(`[uitslagen] ✅ done VA ${va} (n=0)`);

  return { ok: true, n: 0, reason: "no_uitslagen" };
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

  const FULLFIGHTER_TIMEOUT_MS = Number(process.env.FULLFIGHTER_TIMEOUT_MS ?? "35000");
  const UITSLAGEN_TIMEOUT_MS = Number(process.env.UITSLAGEN_TIMEOUT_MS ?? "90000");

  let idx = 0;

  async function workerLoop(workerIdx) {
    const STAGGER = Number(process.env.STAGGER_MS ?? "350");
    await wait(workerIdx * STAGGER);

    let ctx = await createWorkerContext(browser);

    async function resetWorkerContext(reason) {
      console.log(
        `[bundle] 🧨 reset worker context (worker${workerIdx + 1}) ${
          reason ? `(${reason})` : ""
        }`
      );

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
          maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "6"),
          softWaitMs: Number(process.env.SOFT_WAIT_MS ?? "900"),
          betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "450"),
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
  tab_attempts: Number(process.env.TAB_ATTEMPTS ?? "6"),
  soft_wait_ms: Number(process.env.SOFT_WAIT_MS ?? "900"),
  between_attempts_ms: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "450"),
  uitslagen_tries: Number(process.env.UITSLAGEN_TRIES ?? "2"),
  fullfighter_timeout_ms: Number(process.env.FULLFIGHTER_TIMEOUT_MS ?? "35000"),
  uitslagen_timeout_ms: Number(process.env.UITSLAGEN_TIMEOUT_MS ?? "90000"),
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