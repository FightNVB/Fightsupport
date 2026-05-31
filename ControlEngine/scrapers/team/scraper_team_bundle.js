// ControlEngine/scrapers/team/scraper_team_bundle.js
// ✅ Team/sportschool scraper voor bestaande VA-nummers uit sportschool_fighters
// ✅ MASTER tab logt 1x in en blijft open (sessie warm)
// ✅ Per VA: worker opent NIEUWE TAB DIRECT op fighter-url:
//     https://fightpassport.nl/#va_vechter/<va>
// ✅ FULLFIGHTER output schrijft terug naar sportschool_fighters
// ✅ UITSLAGEN output schrijft naar aparte tabel sportschool_fighter_uitslagen_raw
// ✅ Geen matchmaking_id / controle_run_id nodig
// ✅ Geen kolomkoppen in uitslagen-export = GEEN FOUT, maar gewoon 0 uitslagen
//
// CLI:
//   node scraper_team_bundle.js <sportschool_id> [scrape_run_id] [va1 va2 va3 ...]
//
// Voorbeeld:
//   node ControlEngine/scrapers/team/scraper_team_bundle.js 4505
//   node ControlEngine/scrapers/team/scraper_team_bundle.js 4505 run_20260513_001 22572 29852

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
  const digits = s.replace(/\D/g, "").replace(/^0+/, "");
  return /^\d{3,5}$/.test(digits) ? digits : null;
}

function normalizeSportschoolId(v) {
  const s = String(v ?? "").trim().replace(/\D/g, "");
  return s ? Number(s) : null;
}

function makeRunId() {
  const d = new Date();
  const stamp = d
    .toISOString()
    .replace(/-/g, "")
    .replace(/:/g, "")
    .replace(/T/g, "")
    .replace(/Z/g, "")
    .replace(/\./g, "")
    .slice(0, 14);

  return `team_${stamp}_${crypto.randomUUID().slice(0, 8)}`;
}

async function withTimeout(promiseFactory, ms, label, onTimeout) {
  let t;

  const timeout = new Promise((_, rej) => {
    t = setTimeout(async () => {
      try {
        if (typeof onTimeout === "function") await onTimeout();
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
        await page.waitForTimeout(120);
      }
    } catch {}
  }

  try {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(80);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(80);
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
      // Anders gaat de team scraper onterecht refreshen of nieuwe unlocks triggeren.
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
    for (const p of pages) await hardClosePage(p).catch(() => {});
  } catch {}

  try {
    await ctx.close().catch(() => {});
  } catch {}
}

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
      if (Array.isArray(cookies) && cookies.length) await p.setCookie(...cookies);
    } catch {}

    await p.goto(fighterUrl(va), {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    }).catch(() => {});

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

    console.log(`[Team] ↪️ openTab mismatch/empty ${workerLabel}`, {
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

async function fetchVaListFromSportschoolFighters(sportschoolId, explicitVaList = []) {
  const explicit = [
    ...new Set(
      (explicitVaList ?? [])
        .map(normalizeVaStrict)
        .filter(Boolean)
        .map(String),
    ),
  ];

  if (explicit.length) return explicit;

  const { data, error } = await supabase
    .from("sportschool_fighters")
    .select("va_nummer")
    .eq("sportschool_id", sportschoolId)
    .not("va_nummer", "is", null)
    .order("va_nummer", { ascending: true });

  if (error) throw error;

  return [
    ...new Set(
      (data ?? [])
        .map((r) => normalizeVaStrict(r?.va_nummer))
        .filter(Boolean)
        .map(String),
    ),
  ];
}

async function markFightcrewScrapeStatus(
  sportschoolId,
  vaList,
  status,
  errorMessage = null,
  scrapeRunId = null,
) {
  const cleanVaList = [
    ...new Set(
      (vaList ?? [])
        .map(normalizeVaStrict)
        .filter(Boolean)
        .map(String),
    ),
  ];

  if (!sportschoolId || !cleanVaList.length) return;

  const payload = {
    scrape_status: status,
    updated_at: new Date().toISOString(),
  };

  if (scrapeRunId) payload.scrape_run_id = scrapeRunId;
  if (status === "bezig") payload.scraped_at = null;
  if (status === "klaar") payload.scraped_at = new Date().toISOString();
  if (errorMessage) payload.scrape_error = String(errorMessage).slice(0, 1000);
  if (!errorMessage && status !== "fout") payload.scrape_error = null;

  const { error } = await supabase
    .from("sportschool_fighters")
    .update(payload)
    .eq("sportschool_id", sportschoolId)
    .in("va_nummer", cleanVaList);

  if (error) console.log("[Team] ⚠️ status update fout:", error.message);
}

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
    if (low.includes("vrouw")) r.geslacht = "vrouw";
    else if (low.includes("man")) r.geslacht = "man";

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
        (h) => (h.innerText || "").trim().toUpperCase() === title.toUpperCase(),
      );

      head?.closest(".tile")?.click();
    },
    va,
    title,
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
    let verloren = null;
    let onbeslist = null;
    let heeft_startverbod = false;

    for (const row of p) {
      const raw = row.innerText || "";
      const txt = raw.toLowerCase().trim();

      if (txt.startsWith("licentie")) {
        licentie = (raw.split(":")[1] ?? "").trim() || null;
      }

      if (txt.startsWith("wedstrijden")) {
        totaal = parseInt((raw.match(/\d+/) || [null])[0], 10) || null;
      }

      if (txt.startsWith("gewonnen")) {
        gewonnen = parseInt((raw.match(/\d+/) || [null])[0], 10) || null;
      }

      if (txt.startsWith("verloren")) {
        verloren = parseInt((raw.match(/\d+/) || [null])[0], 10) || null;
      }

      if (txt.startsWith("onbeslist") || txt.startsWith("gelijk")) {
        onbeslist = parseInt((raw.match(/\d+/) || [null])[0], 10) || null;
      }

      if (txt.includes("startverbod")) {
        if (txt.includes("nee") || txt.includes("geen")) heeft_startverbod = false;
        else if (txt.includes("ja") || txt.includes("actief")) heeft_startverbod = true;
        else if (/\d{2}-\d{2}-\d{4}/.test(raw)) heeft_startverbod = true;
      }
    }

    return {
      licentie,
      totaal,
      gewonnen,
      verloren,
      onbeslist,
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
        (document.querySelector("input.dnva_nulmetingaantalwedstr")?.value || "").replace(/\D/g, ""),
        10,
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

async function saveFighterToSportschoolFighters(
  requestedVA,
  header,
  details,
  zero,
  sportschoolId,
  scrapeRunId,
) {
  if (!header?.va_nummer) return { ok: false, reason: "missing_header_va" };

  if (String(header.va_nummer) !== String(requestedVA)) {
    console.log("[fullfighter] ⚠️ VA mismatch!", {
      requested: String(requestedVA),
      got: String(header.va_nummer),
      naam: header?.naam ?? null,
    });

    return { ok: false, reason: "va_mismatch" };
  }

  let geboortedatum_correct = null;

  if (header.geboortedatum) {
    const [dd, mm, yyyy] = header.geboortedatum.split("-");
    geboortedatum_correct = `${yyyy}-${mm}-${dd}`;
  }

  const payload = {
    sportschool_id: sportschoolId,
    va_nummer: String(header.va_nummer),

    naam: header.naam,
    fp_naam: header.naam,
    geboortedatum: geboortedatum_correct,
    fp_geboortedatum: geboortedatum_correct,
    geslacht: header.geslacht,

    licentie: details?.licentie || null,
    heeft_startverbod: details?.heeft_startverbod === "Ja" ? "Ja" : "Nee",

    totaal_wedstrijden: details?.totaal ?? null,
    gewonnen: details?.gewonnen ?? null,
    verloren: details?.verloren ?? null,
    onbeslist: details?.onbeslist ?? null,

    nulmeting_totaal: zero?.totaal ?? null,
    nulmeting_opmerking: zero?.opmerking || null,
    nulmeting_klasse: zero?.klasse || null,

    scrape_status: "klaar",
    scrape_run_id: scrapeRunId,
    scraped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scrape_error: null,

    raw: {
      bron: "team_scraper_fullfighter",
      requested_va: String(requestedVA),
      header,
      details,
      nulmeting: zero,
      scrape_run_id: scrapeRunId,
      scraped_at: new Date().toISOString(),
    },
  };

  const { error } = await supabase.from("sportschool_fighters").upsert(payload, {
    onConflict: "sportschool_id,va_nummer",
  });

  if (error) {
    console.log("[fullfighter] ❌ sportschool_fighters upsert fout:", error.message);
    return { ok: false, reason: error.message };
  }

  console.log("[fullfighter] ✅ sportschool_fighters upsert OK:", header.va_nummer);
  return { ok: true };
}

async function doFullfighter(page, va, sportschoolId, scrapeRunId) {
  const header = await scrapeHeader(page);

  if (!header?.va_nummer) {
    console.log("[fullfighter] ❌ header.va_nummer ontbreekt:", va);
    return { ok: false, reason: "missing_header" };
  }

  await openTile(page, va, "DETAILS");

  const details = await scrapeDetails(page, va);
  const zero = await scrapeZeroMeting(page);

  return await saveFighterToSportschoolFighters(
    va,
    header,
    details,
    zero,
    sportschoolId,
    scrapeRunId,
  );
}

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

async function openUitslagenTile(page, va) {
  await closeAnyModal(page);

  await page.evaluate((va) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
    if (!tab) return;

    const headers = [...tab.querySelectorAll(".tileHeader.enabled")];
    const target = headers.find(
      (h) => (h.innerText || "").trim().toUpperCase() === "UITSLAGEN",
    );

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

async function downloadExcel(page, sportschoolId, va, scrapeRunId) {
  const downloadDir = path.resolve(__dirname, ".tmp_download");

  if (fs.existsSync(downloadDir)) {
    fs.rmSync(downloadDir, { recursive: true, force: true });
  }

  fs.mkdirSync(downloadDir, { recursive: true });

  const client = await page.target().createCDPSession();

  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
  });

  const selectors = ['[title="download als excel"]', '[title*="download"][title*="excel"]'];

  const found = await waitForAnySelectorInAnyFrame(page, selectors, 45000);

  if (!found) throw new Error(`Download knop niet gevonden — VA ${va}`);

  const clickDownload = async () => {
    const handle = await found.frame.$(found.selector);

    if (!handle) throw new Error("Excel knop handle niet meer gevonden");

    const clickableHandle = await found.frame.evaluateHandle((el) => {
      return (
        el.closest?.('[title="download als excel"]') ||
        el.closest?.(".icon") ||
        el.closest?.(".has_action") ||
        el.closest?.("div") ||
        el
      );
    }, handle);

    const el = clickableHandle.asElement();
    const box = await el?.boundingBox();

    if (box) {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      await page.mouse.move(x, y, { steps: 12 });
      await wait(160);
      await page.mouse.down();
      await wait(80);
      await page.mouse.up();

      return;
    }

    await found.frame.evaluate((sel) => {
      const el = document.querySelector(sel);
      el?.scrollIntoView?.({ block: "center" });
      el?.click?.();
    }, found.selector);
  };

  await clickDownload();

  const start = Date.now();
  let retried = false;

  while (Date.now() - start < 60000) {
    const filesNow = fs.readdirSync(downloadDir);
    const lower = filesNow.map((f) => f.toLowerCase());

    const xlsx = filesNow
      .filter((f) => f.toLowerCase().endsWith(".xlsx"))
      .map((f) => path.join(downloadDir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    if (xlsx[0]) {
      const downloadedFile = xlsx[0];
      await wait(300);
      return { filePath: downloadedFile, downloadDir };
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

async function cleanupDownloaded(downloadResult) {
  try {
    if (downloadResult?.filePath && fs.existsSync(downloadResult.filePath)) {
      fs.unlinkSync(downloadResult.filePath);
    }

    if (downloadResult?.downloadDir && fs.existsSync(downloadResult.downloadDir)) {
      fs.rmSync(downloadResult.downloadDir, { recursive: true, force: true });
    }
  } catch {}
}

async function parseExcel(filePath, va, sportschoolId, scrapeRunId) {
  const rows = await readXlsxToRows(filePath, { sheetIndex: 0 });

  let headerIndex = -1;

  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const normalizedRow = (rows[i] || []).map((x) =>
      String(x ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase(),
    );

    const joined = normalizedRow.join(" ");

    if (joined.includes("datum") && joined.includes("evenement") && joined.includes("uitslag")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    const preview = rows
      .slice(0, 12)
      .map((r) => (r || []).map((c) => String(c ?? "").trim()).join(" | "));

    return {
      rows: [],
      meta: {
        ok: true,
        empty: true,
        reason: "geen_kolomkoppen_dus_geen_uitslagen",
        missingHeaders: [],
        headers: [],
        preview,
      },
    };
  }

  const headerRow = rows[headerIndex] || [];
  const headers = headerRow.map((h) => (h ? String(h).trim() : ""));
  const headersLower = headers.map((h) => h.toLowerCase());

  const findIdx = (names) => {
    const targets = names.map((n) => String(n).toLowerCase());

    for (const target of targets) {
      const exact = headersLower.indexOf(target);
      if (exact !== -1) return exact;
    }

    for (const target of targets) {
      const includes = headersLower.findIndex((h) => h.includes(target));
      if (includes !== -1) return includes;
    }

    return -1;
  };

  const idxDatum = findIdx(["Datum"]);
  const idxEvenement = findIdx(["Evenement"]);
  const idxTegenstander = findIdx(["Tegenstander"]);
  const idxSportschool = findIdx(["Sportschool"]);
  const idxDiscipline = findIdx(["Discipline"]);
  const idxKlasse = findIdx(["Kl.", "Klasse", "Kl"]);
  const idxGewicht = findIdx(["Gewicht"]);
  const idxUitslag = findIdx(["Uitslag", "Resultaat"]);

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
        ok: true,
        empty: true,
        reason: "kolomkoppen_onvolledig_dus_geen_uitslagen",
        missingHeaders: missing,
        headers: headers.filter(Boolean),
        headerIndex,
      },
    };
  }

  const out = [];

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const d = row[idxDatum];
    if (!d) continue;

    const isoDatum = parseNlDate(d);
    if (!isoDatum) continue;

    out.push({
      sportschool_id: sportschoolId,
      scrape_run_id: scrapeRunId,
      va_nummer: String(va),
      datum: isoDatum,
      evenement: toStr(row[idxEvenement]) ?? null,
      tegenstander: toStr(row[idxTegenstander]) ?? null,
      sportschool: idxSportschool !== -1 ? toStr(row[idxSportschool]) ?? null : null,
      discipline: toStr(row[idxDiscipline]) ?? null,
      klasse: idxKlasse !== -1 ? toStr(row[idxKlasse]) ?? null : null,
      gewicht: idxGewicht !== -1 ? toStr(row[idxGewicht]) ?? null : null,
      uitslag: toStr(row[idxUitslag]) ?? null,
      raw: {
        source_row: r + 1,
        headerIndex,
        values: row,
      },
    });
  }

  const seen = new Set();
  const deduped = [];

  for (const r of out) {
    const k = [
      r.sportschool_id,
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
      empty: deduped.length === 0,
      reason: deduped.length === 0 ? "lege_uitslagen_export" : "ok",
      missingHeaders: [],
      headers: headers.filter(Boolean),
      headerIndex,
    },
  };
}

async function saveUitslagenSnapshot(rows, sportschoolId, scrapeRunId, va) {
  const vaStr = String(va ?? "").trim();
  const data = Array.isArray(rows) ? rows : [];

  const { error: delErr } = await supabase
    .from("sportschool_fighter_uitslagen_raw")
    .delete()
    .eq("sportschool_id", sportschoolId)
    .eq("va_nummer", vaStr);

  if (delErr) throw delErr;

  if (!data.length) return { saved: 0 };

  const normalized = data.map((row) => ({
    ...row,
    sportschool_id: sportschoolId,
    scrape_run_id: scrapeRunId,
    va_nummer: vaStr,
    created_at: new Date().toISOString(),
  }));

  const seen = new Set();

  const deduped = normalized.filter((row) => {
    const key = [
      row.sportschool_id,
      row.va_nummer,
      row.datum,
      row.evenement,
      row.tegenstander,
    ]
      .map((x) => String(x ?? "").replace(/\s+/g, " ").trim())
      .join("||");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });

  const { error: insErr } = await supabase
    .from("sportschool_fighter_uitslagen_raw")
    .insert(deduped);

  if (insErr) throw insErr;

  return { saved: deduped.length };
}

async function doUitslagen(page, sportschoolId, scrapeRunId, va) {
  console.log(`[uitslagen] ▶️ start VA ${va}`);

  const MAX_TRIES = Number(process.env.UITSLAGEN_TRIES ?? "1");
  let lastDownload = null;

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      await openUitslagenTile(page, va);

      lastDownload = await downloadExcel(page, sportschoolId, va, scrapeRunId);

      if (!lastDownload?.filePath) {
        await saveUitslagenSnapshot([], sportschoolId, scrapeRunId, va).catch(() => {});
        console.log(`[uitslagen] ✅ done VA ${va} (n=0) (no file)`);
        return { ok: true, n: 0, reason: "no_file" };
      }

      const parsed = await parseExcel(lastDownload.filePath, va, sportschoolId, scrapeRunId);

      if (parsed?.meta?.empty) {
        console.log(
          `[uitslagen] ℹ️ Geen uitslagen gevonden voor VA ${va} (${parsed?.meta?.reason ?? "lege export"})`,
        );

        await saveUitslagenSnapshot([], sportschoolId, scrapeRunId, va).catch(() => {});

        return {
          ok: true,
          n: 0,
          reason: parsed?.meta?.reason ?? "geen_uitslagen",
        };
      }

      const res = await saveUitslagenSnapshot(parsed.rows, sportschoolId, scrapeRunId, va);
      const n = res?.saved ?? parsed.rows.length ?? 0;

      console.log(`[uitslagen] ✅ done VA ${va} (n=${n})`);

      return { ok: true, n, reason: "ok" };
    } catch (e) {
      const msg = e?.message ?? String(e);

      console.log(`[uitslagen] ⚠️ poging ${attempt}/${MAX_TRIES} VA ${va}: ${msg}`);

      if (attempt >= MAX_TRIES) {
        await saveUitslagenSnapshot([], sportschoolId, scrapeRunId, va).catch(() => {});
        console.log(`[uitslagen] ✅ done VA ${va} (n=0) na fout/pogingen`);
        return { ok: true, n: 0, reason: `uitslagen_overgeslagen: ${msg}` };
      }

      await closeAnyModal(page).catch(() => {});
      await wait(600 + attempt * 400);
    } finally {
      await cleanupDownloaded(lastDownload).catch(() => {});
      lastDownload = null;
    }
  }

  await saveUitslagenSnapshot([], sportschoolId, scrapeRunId, va).catch(() => {});
  console.log(`[uitslagen] ✅ done VA ${va} (n=0)`);

  return { ok: true, n: 0, reason: "no_uitslagen" };
}

async function runBundle(sportschoolId, scrapeRunId, vaList, workers = 5) {
  const { browser, page: masterPage } = await loginFightPassport();

  console.log("[Team] 🔑 Login mode: master sportschool/team scraper");

  let cookies = [];

  try {
    cookies = await masterPage.cookies();
  } catch {}

  console.log("[Team] ✅ Master logged in (cookies captured)");

  let masterRefreshPromise = null;

  async function refreshMasterSessionLocked(reason = "") {
    if (masterRefreshPromise) {
      try {
        await masterRefreshPromise;
      } catch {}

      return cookies;
    }

    masterRefreshPromise = (async () => {
      console.log(`[Team] 🔁 master ensureLoggedIn(force) start ${reason ? `(${reason})` : ""}`);

      await ensureLoggedIn(masterPage, { force: true });

      try {
        cookies = await masterPage.cookies();
      } catch {}

      console.log("[Team] ✅ master refreshed (cookies updated)");

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
        `[Team] 🧨 reset worker context (worker${workerIdx + 1}) ${
          reason ? `(${reason})` : ""
        }`,
      );

      await closeWorkerContext(ctx).catch(() => {});
      ctx = await createWorkerContext(browser);
    }

    while (true) {
      const myIdx = idx++;

      if (myIdx >= vaList.length) break;

      const va = vaList[myIdx];
      const label = `worker${workerIdx + 1}/${workers}`;

      console.log(`[Team] 🤖 ${label} → VA ${va} (sportschool=${sportschoolId}, run=${scrapeRunId})`);

      let page = null;
      let fullfighterStatus = "skip";
      let uitslagenStatus = "skip";

      await markFightcrewScrapeStatus(sportschoolId, [va], "bezig", null, scrapeRunId).catch(() => {});

      try {
        page = await openTabToFighterVerified(browser, ctx, cookies, va, {
          maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "6"),
          softWaitMs: Number(process.env.SOFT_WAIT_MS ?? "900"),
          betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "450"),
          workerLabel: `[${label}]`,
        });

        if (!page) {
          fullfighterStatus = "open_fail";
          uitslagenStatus = "open_fail";

          await markFightcrewScrapeStatus(
            sportschoolId,
            [va],
            "fout",
            "Kon fighter niet openen na retries",
            scrapeRunId,
          );

          continue;
        }

        const fullRes = await withTimeout(
          () => doFullfighter(page, va, sportschoolId, scrapeRunId),
          FULLFIGHTER_TIMEOUT_MS,
          `fullfighter ${va}`,
          async () => {
            await resetWorkerContext(`fullfighter timeout VA ${va}`);
            page = null;
          },
        );

        fullfighterStatus = fullRes?.ok ? "ok" : `fail(${fullRes?.reason ?? "unknown"})`;

        const uRes = await withTimeout(
          () => doUitslagen(page, sportschoolId, scrapeRunId, va),
          UITSLAGEN_TIMEOUT_MS,
          `uitslagen ${va}`,
          async () => {
            await resetWorkerContext(`uitslagen timeout VA ${va}`);
            page = null;
          },
        );

        uitslagenStatus = uRes?.ok ? `ok(n=${uRes?.n ?? 0})` : `fail(${uRes?.reason ?? "unknown"})`;

        await markFightcrewScrapeStatus(sportschoolId, [va], "klaar", null, scrapeRunId);
      } catch (e) {
        const msg = e?.message ?? String(e);

        if (msg === "LOGIN_PAGE") {
          console.log(
            `[Team] 🔐 ${label} LOGIN_PAGE (VA ${va}) → master ensureLoggedIn + refresh cookies (LOCKED)`,
          );

          fullfighterStatus = "login_page";
          uitslagenStatus = "login_page";

          try {
            await refreshMasterSessionLocked(`LOGIN_PAGE from ${label} VA ${va}`);
            await resetWorkerContext(`login refresh VA ${va}`);
          } catch (err) {
            console.log("[Team] ❌ master refresh failed:", err?.message ?? String(err));
          }

          await markFightcrewScrapeStatus(
            sportschoolId,
            [va],
            "fout",
            "LOGIN_PAGE; probeer opnieuw",
            scrapeRunId,
          ).catch(() => {});
        } else if (String(msg).startsWith("HARD TIMEOUT")) {
          if (msg.includes("fullfighter")) {
            fullfighterStatus = "timeout";
            uitslagenStatus = "skipped_fullfighter_timeout";
          } else if (msg.includes("uitslagen")) {
            uitslagenStatus = "timeout";
          }

          await markFightcrewScrapeStatus(sportschoolId, [va], "fout", msg, scrapeRunId).catch(() => {});
          console.log(`[Team] ❌ ${label} fout VA ${va}:`, msg);
        } else {
          if (fullfighterStatus === "skip") fullfighterStatus = "error";
          if (uitslagenStatus === "skip") uitslagenStatus = "error";

          await markFightcrewScrapeStatus(sportschoolId, [va], "fout", msg, scrapeRunId).catch(() => {});
          console.log(`[Team] ❌ ${label} fout VA ${va}:`, msg);
        }
      } finally {
        console.log(
          `[Team] ✅ END ${label} VA ${va} | fullfighter=${fullfighterStatus} | uitslagen=${uitslagenStatus}`,
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

const sportschool_id = normalizeSportschoolId(process.argv[2]);
const maybeRunOrVa = (process.argv[3] ?? "").trim();

let scrape_run_id = maybeRunOrVa && !normalizeVaStrict(maybeRunOrVa) ? maybeRunOrVa : makeRunId();
let vaArgs = process.argv.slice(4);

if (maybeRunOrVa && normalizeVaStrict(maybeRunOrVa)) {
  vaArgs = process.argv.slice(3);
}

if (!sportschool_id) {
  console.error(
    "❌ sportschool_id ontbreekt. Gebruik: node scraper_team_bundle.js <sportschool_id> [scrape_run_id] [va1 va2 ...]",
  );
  process.exit(1);
}

const explicitVaList = vaArgs.map(normalizeVaStrict).filter(Boolean).map(String);

const WORKERS = Number(process.env.WORKERS ?? "5");
const workers =
  Number.isFinite(WORKERS) && WORKERS > 0
    ? Math.min(10, Math.max(1, Math.floor(WORKERS)))
    : 5;

fetchVaListFromSportschoolFighters(sportschool_id, explicitVaList)
  .then(async (vaList) => {
    if (!vaList.length) {
      console.error("❌ Geen geldige VA’s gevonden in sportschool_fighters voor deze sportschool.");
      process.exit(1);
    }

    console.log("SCRAPER — TEAM/SPORTSCHOOL VA SCRAPER", {
      sportschool_id,
      scrape_run_id,
      count: vaList.length,
      workers,
      stagger_ms: Number(process.env.STAGGER_MS ?? "350"),
      tab_attempts: Number(process.env.TAB_ATTEMPTS ?? "6"),
      soft_wait_ms: Number(process.env.SOFT_WAIT_MS ?? "900"),
      between_attempts_ms: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "450"),
      uitslagen_tries: Number(process.env.UITSLAGEN_TRIES ?? "1"),
      fullfighter_timeout_ms: Number(process.env.FULLFIGHTER_TIMEOUT_MS ?? "35000"),
      uitslagen_timeout_ms: Number(process.env.UITSLAGEN_TIMEOUT_MS ?? "90000"),
      va_sample: vaList.slice(0, 6),
    });

    await markFightcrewScrapeStatus(sportschool_id, vaList, "wachtrij", null, scrape_run_id).catch(() => {});
    await runBundle(sportschool_id, scrape_run_id, vaList, workers);
  })
  .then(() => {
    console.log("✅ FP Team klaar");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ FP Team hard failed:", e?.stack ?? e?.message ?? String(e));
    process.exit(1);
  });