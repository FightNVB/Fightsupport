// ControlEngine/scrapers/uitslagen/scraper_uitslagen.js
// ✅ Snapshot strategie (PER RUN):
// - uitslagen_raw = snapshot per matchmaking_id + controle_run_id + va_nummer
// - partij_nr erbij via matchmaking_bouts_raw lookup (eerste partij_nr)
// - delete per (mm + run + va) zodat je veilig opnieuw kunt runnen
// - upsert met onConflict dat EXACT matcht met je UNIQUE constraint:
//   UNIQUE (matchmaking_id, controle_run_id, va_nummer, datum, evenement, tegenstander)
//
// Snelheid & stabiliteit:
// - 1x login master -> cookies naar worker pages
// - WORKERS + STAGGER_MS + SPEED_MODE
// - HARD TIMEOUT per VA + page reset (hangende worker blokkeert run niet)

import { loginFightPassport } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { readXlsxToRows } from "../utils/excelRowsExceljs.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPEED_MODE = String(process.env.SPEED_MODE ?? "1") === "1";
const STAGGER_MS = Number(process.env.STAGGER_MS ?? "900");
const HARD_TIMEOUT_MS = Number(process.env.UITSLAGEN_TIMEOUT_MS ?? "90000");

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

function parseNlDate(v) {
  if (!v) return null;
  const m = String(v).trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!m) return null;

  let [_, dd, mm, yy] = m;
  if (yy.length === 2) yy = Number(yy) < 30 ? `20${yy}` : `19${yy}`;

  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

async function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function safeSlug(v) {
  return String(v ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

function isVaStrict(v) {
  return /^\d{3,5}$/.test(String(v ?? "").trim());
}

function normalizeVaStrict(v) {
  const s = String(v ?? "").trim();
  const digits = s.replace(/\D/g, "");
  return isVaStrict(digits) ? digits : null;
}

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim()
  );
}

function toStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function dedupeKey(r) {
  return [
    String(r.matchmaking_id ?? ""),
    String(r.controle_run_id ?? ""),
    String(r.va_nummer ?? ""),
    String(r.datum ?? ""),
    String(r.evenement ?? ""),
    String(r.tegenstander ?? ""),
  ]
    .map((x) => x.replace(/\s+/g, " ").trim())
    .join("||");
}

async function waitForAnySelector(page, selectors, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const s of selectors) {
      try {
        const el = await page.$(s);
        if (el) return s;
      } catch {}
    }
    await wait(200);
  }
  return null;
}

async function closeAnyModal(page) {
  const selectors = [
    "button#sluit_inr_detail",
    "button.sluit_scherm.overview",
    "button.sluit_scherm",
    "img.sluit_modal",
    "button.ui-dialog-titlebar-close",
    ".ui-dialog-titlebar-close",
  ];

  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click().catch(() => {});
        await page.waitForTimeout(80);
      }
    } catch {}
  }

  try {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
  } catch {}
}

async function preparePageForSpeed(page) {
  if (!SPEED_MODE) return;

  try {
    await page.setCacheEnabled(true);
  } catch {}

  try {
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const t = req.resourceType();
      if (t === "image" || t === "font" || t === "stylesheet") req.abort();
      else req.continue();
    });
  } catch {}
}

/* -------------------------------------------------------
   0) partij_nr mapping uit matchmaking_bouts_raw
------------------------------------------------------- */
async function fetchPartijNrByVa(matchmaking_id) {
  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("partij_nr, va_rood, va_blauw")
    .eq("matchmaking_id", matchmaking_id);

  if (error) throw error;

  const map = new Map(); // va -> Set(partij_nr)
  for (const r of data ?? []) {
    const nr = r?.partij_nr ?? null;
    if (!nr) continue;

    const vaR = normalizeVaStrict(r?.va_rood);
    const vaB = normalizeVaStrict(r?.va_blauw);

    if (vaR) {
      if (!map.has(vaR)) map.set(vaR, new Set());
      map.get(vaR).add(nr);
    }
    if (vaB) {
      if (!map.has(vaB)) map.set(vaB, new Set());
      map.get(vaB).add(nr);
    }
  }

  const out = new Map();
  for (const [va, set] of map.entries()) out.set(va, Array.from(set).sort((a, b) => a - b));
  return out;
}

/* -------------------------------------------------------
   1) NAVIGATIE
------------------------------------------------------- */
async function goToFighterPage(page, va) {
  const url = `https://fightpassport.nl/#va_vechter/${va}`;
  const tabSel = `.internal_tab.va_vechter_${va}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(250);
    await closeAnyModal(page).catch(() => {});

    const start = Date.now();
    while (Date.now() - start < 12000) {
      const loginEl = await page.$("input.gebruikersnaam").catch(() => null);
      if (loginEl) throw new Error("LOGIN_PAGE");

      const fighterTab = await page.$(tabSel).catch(() => null);
      if (fighterTab) return true;

      await wait(200);
    }

    await wait(400);
  }

  console.log("[uitslagen] ❌ Vechterpagina faalde", va);
  return false;
}

/* -------------------------------------------------------
   2) TILE OPENEN
------------------------------------------------------- */
async function openUitslagenTile(page, va) {
  await closeAnyModal(page).catch(() => {});

  await page.evaluate((va) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
    if (!tab) return;

    const headers = [...tab.querySelectorAll(".tileHeader.enabled")];
    const target = headers.find((h) => (h.innerText || "").trim().toUpperCase() === "UITSLAGEN");
    target?.closest(".tile")?.click();
  }, va);

  await wait(200);
}

/* -------------------------------------------------------
   3) DOWNLOAD EXCEL (worker-safe)
------------------------------------------------------- */
async function ensureDownloadBehavior(page, downloadDir) {
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
  });
}

async function downloadExcel(page, matchmaking_id, va) {
  const mm = safeSlug(matchmaking_id);
  const vaSafe = String(va ?? "").replace(/[^0-9]/g, "");
  const uniq = crypto.randomUUID().slice(0, 8);

  const downloadDir = path.resolve(__dirname, "downloads", mm, `${vaSafe}_${uniq}`);
  fs.mkdirSync(downloadDir, { recursive: true });

  await ensureDownloadBehavior(page, downloadDir);

  const selectors = ['[title="download als excel"]', '[title*="download"][title*="excel"]'];

  const sel = (await waitForAnySelector(page, selectors, 20000)) ?? null;
  if (!sel) throw new Error(`Download knop niet gevonden — VA ${va}`);

  await page.evaluate((s) => {
    const el = document.querySelector(s);
    el?.scrollIntoView?.({ block: "center" });
    el?.click?.();
  }, sel);

  const start = Date.now();
  while (Date.now() - start < 25000) {
    const files = fs
      .readdirSync(downloadDir)
      .filter((f) => f.toLowerCase().endsWith(".xlsx"))
      .map((f) => path.join(downloadDir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

    if (files[0]) return files[0];
    await wait(200);
  }

  return null;
}

/* -------------------------------------------------------
   4) PARSE EXCEL
------------------------------------------------------- */
function parseExcel(filePath, va, matchmaking_id, controle_run_id) {
 const rows = await readXlsxToRows(fileBuffer, { sheetIndex: 0 });

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
    console.log("[uitslagen] ❌ Kolomkoppen missen:", missing.join(", "));
    console.log("[uitslagen] ➡️ Headers:", headers.filter(Boolean).join(" | "));
    return [];
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

      sportschool: idxSportschool !== -1 ? (toStr(row[idxSportschool]) ?? null) : null,
      discipline: toStr(row[idxDiscipline]) ?? null,
      klasse: idxKlasse !== -1 ? (toStr(row[idxKlasse]) ?? null) : null,
      gewicht: idxGewicht !== -1 ? (toStr(row[idxGewicht]) ?? null) : null,
      uitslag: toStr(row[idxUitslag]) ?? null,
    });
  }

  // extra dedupe op volledige key
  const seen = new Set();
  const deduped = [];
  for (const r of out) {
    const k = dedupeKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }

  console.log(`[uitslagen] 📌 ${deduped.length} uitslagen gevonden (VA ${va})`);
  return deduped;
}

/* -------------------------------------------------------
   5) OPSLAAN SNAPSHOT per mm + run + va
------------------------------------------------------- */
async function saveToSupabaseSnapshot(rows, matchmaking_id, controle_run_id, va, partijNrByVaMap) {
  const vaStr = String(va ?? "").trim();
  const data = Array.isArray(rows) ? rows : [];

  if (!vaStr) return;

  const partijList = partijNrByVaMap?.get?.(vaStr) ?? [];
  const partij_nr = Array.isArray(partijList) && partijList.length ? Number(partijList[0]) : null;

  // ✅ delete exact scope van snapshot
  const { error: delErr } = await supabase
    .from("uitslagen_raw")
    .delete()
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id)
    .eq("va_nummer", vaStr);

  if (delErr) {
    console.log("[uitslagen] ❌ Supabase delete fout:", delErr.message);
    throw delErr;
  }

  if (!data.length) return;

  const normalized = data.map((row) => ({
    ...row,
    matchmaking_id,
    controle_run_id,
    va_nummer: vaStr,
    partij_nr,
  }));

  // ✅ laatste dedupe (veilig)
  const seen = new Set();
  const finalRows = [];
  for (const r of normalized) {
    const k = dedupeKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    finalRows.push(r);
  }

  const chunkSize = 500;
  for (let i = 0; i < finalRows.length; i += chunkSize) {
    const chunk = finalRows.slice(i, i + chunkSize);

    // ✅ onConflict EXACT gelijk aan je UNIQUE constraint
    const { error: insErr } = await supabase.from("uitslagen_raw").upsert(chunk, {
      onConflict: "matchmaking_id,controle_run_id,va_nummer,datum,evenement,tegenstander",
      ignoreDuplicates: false,
    });

    if (insErr) {
      console.log("[uitslagen] ❌ Supabase upsert fout:", insErr.message);
      throw insErr;
    }
  }

  console.log(
    "[uitslagen] ✅ snapshot opgeslagen VA",
    vaStr,
    "run",
    controle_run_id,
    "rows",
    finalRows.length
  );
}

/* -------------------------------------------------------
   6) ONE VA
------------------------------------------------------- */
async function scrapeOne(page, matchmaking_id, controle_run_id, va, partijNrByVaMap) {
  const ok = await goToFighterPage(page, va);
  if (!ok) {
    await saveToSupabaseSnapshot([], matchmaking_id, controle_run_id, va, partijNrByVaMap);
    return;
  }

  await openUitslagenTile(page, va);

  const file = await downloadExcel(page, matchmaking_id, va);
  if (!file) {
    console.log("[uitslagen] ❌ Geen Excel gevonden (VA", va, ")");
    await saveToSupabaseSnapshot([], matchmaking_id, controle_run_id, va, partijNrByVaMap);
    return;
  }

  const parsed = parseExcel(file, va, matchmaking_id, controle_run_id);
  await saveToSupabaseSnapshot(parsed, matchmaking_id, controle_run_id, va, partijNrByVaMap);
}

/* -------------------------------------------------------
   7) WORKER POOL (HARD TIMEOUT + page reset)
------------------------------------------------------- */
async function runWithWorkers(matchmaking_id, controle_run_id, vaList, workers = 5) {
  const partijNrByVaMap = await fetchPartijNrByVa(matchmaking_id);

  const { browser, page: master } = await loginFightPassport();
  try {
    const cookies = await master.cookies();

    async function makeWorkerPage() {
      const p = await browser.newPage();
      await preparePageForSpeed(p);
      try {
        await p.setCookie(...cookies);
      } catch {}
      try {
        p.setDefaultNavigationTimeout(60000);
      } catch {}
      try {
        p.setDefaultTimeout(30000);
      } catch {}
      return p;
    }

    const pages = [];
    for (let i = 0; i < workers; i++) pages.push(await makeWorkerPage());

    let idx = 0;

    async function workerLoop(workerIdx) {
      await wait(workerIdx * STAGGER_MS);

      while (true) {
        const myIdx = idx++;
        if (myIdx >= vaList.length) break;

        const va = vaList[myIdx];
        console.log(`🤖 worker${workerIdx + 1}/${workers} → VA ${va} (run=${controle_run_id})`);

        const p = pages[workerIdx];

        const job = (async () => {
          await closeAnyModal(p).catch(() => {});
          await scrapeOne(p, matchmaking_id, controle_run_id, va, partijNrByVaMap);
        })();

        const timeout = new Promise((_, rej) =>
          setTimeout(() => rej(new Error(`HARD TIMEOUT ${HARD_TIMEOUT_MS}ms (VA ${va})`)), HARD_TIMEOUT_MS)
        );

        try {
          await Promise.race([job, timeout]);
        } catch (e) {
          // ❗ dit is timeout of scrape error, NIET een duplicate key (die logt saveToSupabaseSnapshot zelf)
          console.log(
            `[uitslagen] ⏱️ worker${workerIdx + 1} timeout/fout VA ${va}:`,
            e?.message ?? String(e)
          );

          // page reset
          try {
            await p.close();
          } catch {}
          pages[workerIdx] = await makeWorkerPage();

          // snapshot leeg voor deze VA (zodat rules niet op oude data loopt)
          try {
            await saveToSupabaseSnapshot([], matchmaking_id, controle_run_id, va, partijNrByVaMap);
          } catch {}
        }
      }
    }

    await Promise.all(pages.map((_, i) => workerLoop(i)));

    for (const p of pages) {
      try {
        await p.close();
      } catch {}
    }
  } finally {
    try {
      await master.close();
    } catch {}
    await browser.close();
  }
}

/* -------------------------------------------------------
   8) CLI
------------------------------------------------------- */
function parseArgs(argv) {
  const args = argv.slice(2);

  const matchmaking_id = (args[0] ?? "").trim();
  const controle_run_id = (args[1] ?? "").trim();

  const vaList = args
    .slice(2)
    .map(normalizeVaStrict)
    .filter(Boolean)
    .map(String);

  return { matchmaking_id, controle_run_id, vaList };
}

const parsed = parseArgs(process.argv);

if (!parsed.matchmaking_id) {
  console.error("❌ matchmaking_id ontbreekt");
  process.exit(1);
}
if (!parsed.controle_run_id || !isUuid(parsed.controle_run_id)) {
  console.error("❌ controle_run_id ontbreekt of is geen UUID:", parsed.controle_run_id);
  process.exit(1);
}
if (!parsed.vaList.length) {
  console.error("❌ Geen geldige VA’s meegegeven (verwacht 3–5 cijfers).");
  process.exit(1);
}

const WORKERS = Number(process.env.WORKERS ?? "5");
const workers =
  Number.isFinite(WORKERS) && WORKERS > 0 ? Math.min(12, Math.max(1, Math.floor(WORKERS))) : 5;

console.log("SCRAPER — UITSLAGEN — SNAPSHOT (PER RUN)", {
  matchmaking_id: parsed.matchmaking_id,
  controle_run_id: parsed.controle_run_id,
  count: parsed.vaList.length,
  workers,
  stagger_ms: STAGGER_MS,
  speed_mode: SPEED_MODE ? 1 : 0,
  va_sample: parsed.vaList.slice(0, 6),
});

runWithWorkers(parsed.matchmaking_id, parsed.controle_run_id, parsed.vaList, workers)
  .then(() => {
    console.log("✅ Uitslagen scraper klaar");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Uitslagen scraper hard failed:", e?.message ?? String(e));
    process.exit(1);
  });
