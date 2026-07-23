// scrapers/sportscholen/scraper_sportscholen.js

import { loginFightPassport } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import fs from "fs";
import path from "path";
import { readXlsxToRows } from "../utils/excelRowsExceljs.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//////////////////////////////////////////////////////////////
// Helpers
//////////////////////////////////////////////////////////////
function parseDate(raw) {
  if (!raw) return null;

  // Format DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [dd, mm, yyyy] = raw.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Excel date number
  if (!isNaN(raw)) {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) {
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${d.y}-${mm}-${dd}`;
    }
  }

  return null;
}

function detectColumn(columns, possibleNames) {
  return columns.find((col) =>
    possibleNames.some((p) => col.toLowerCase().includes(p))
  );
}

function normalizeAliasText(raw) {
  return String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function listExcelFiles(downloadDir) {
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

    // nieuw bestand = niet in before
    const newly = now.find((p) => !before.has(p));
    if (newly) {
      // wacht tot file “stabiel” is (niet meer groeit)
      let lastSize = -1;
      let stable = 0;

      for (let i = 0; i < 80; i++) {
        if (!fs.existsSync(newly)) break;
        const s = fs.statSync(newly).size;

        if (s > 0 && s === lastSize) {
          stable++;
          if (stable >= 3) return newly;
        } else {
          stable = 0;
          lastSize = s;
        }
        await sleep(250);
      }

      return newly;
    }

    await sleep(300);
  }

  // debug
  const after = listExcelFiles(downloadDir);
  throw new Error(
    `Geen nieuwe Excel gevonden in ${downloadDir} binnen ${Math.round(
      timeoutMs / 1000
    )}s. After=${JSON.stringify(after)}`
  );
}

//////////////////////////////////////////////////////////////
// 1. FightPassport navigatie
//////////////////////////////////////////////////////////////
async function waitForDashboard(page) {
  for (let i = 0; i < 60; i++) {
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

      const pincode =
        document.querySelector("input.pincode") ||
        document.querySelector("input.target_input.pincode") ||
        document.querySelector("input[class*='pincode']");

      const login = document.querySelector("input.gebruikersnaam");

      const txt = String(document.body?.innerText || "").toLowerCase();

      return {
        isUnlock: !!(pincode && isVisible(pincode)),
        isLogin: !!(login && isVisible(login)),
        hasDashboardText: txt.includes("fightpassport") && txt.includes("afmelden"),
        hasSportscholenTile:
          !!document.querySelector('[title="SPORTSCHOLEN"]') ||
          Array.from(document.querySelectorAll(".tileHeader")).some(
            (t) => String(t.innerText || "").trim().toUpperCase() === "SPORTSCHOLEN"
          ),
      };
    });

    if (state.isUnlock) {
      throw new Error("UNLOCK_REQUIRED: FightPassport vraagt om een unlockcode.");
    }

    if (state.isLogin) {
      throw new Error("LOGIN_PAGE: FightPassport loginpagina staat open.");
    }

    if (state.hasDashboardText && state.hasSportscholenTile) return true;

    await sleep(500);
  }

  throw new Error("Dashboard niet gevonden");
}

async function clickSportscholenTile(page) {
  console.log("🔍 Tile 'SPORTSCHOLEN' zoeken…");

  // 1) Eerst jouw originele aanpak
  const clickedOld = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll(".tileHeader")];
    const tile = tiles.find((t) => (t.innerText || "").trim().toUpperCase() === "SPORTSCHOLEN");
    if (tile) {
      tile.closest(".tile")?.click();
      return true;
    }
    return false;
  });

  if (clickedOld) {
    await sleep(800);
    return;
  }

  // 2) Fallback: click op title="SPORTSCHOLEN" (jij ziet dit letterlijk in je titles list)
  const clickedTitle = await page.evaluate(() => {
    const el =
      document.querySelector('[title="SPORTSCHOLEN"]') ||
      document.querySelector('div[title="SPORTSCHOLEN"]') ||
      document.querySelector('a[title="SPORTSCHOLEN"]') ||
      document.querySelector('button[title="SPORTSCHOLEN"]');

    if (el) {
      (el).click();
      return true;
    }
    return false;
  });

  if (!clickedTitle) {
    const titles = await page.evaluate(() =>
      Array.from(document.querySelectorAll("div[title],a[title],button[title]"))
        .map((x) => x.getAttribute("title"))
        .filter(Boolean)
        .slice(0, 80)
    );
    throw new Error("SPORTSCHOLEN tile niet gevonden. titles=" + JSON.stringify(titles));
  }

  await sleep(800);
}

async function downloadExcel(page, browser) {
  console.log("📥 Excel downloaden…");

  // ✅ precies zoals je origineel: vaste map
  const downloadDir = path.resolve(__dirname, "downloads");
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

  // ✅ precies zoals je origineel: oude excel opruimen
  const existing = fs.readdirSync(downloadDir);
  for (const f of existing) {
    if (f.toLowerCase().endsWith(".xlsx") || f.toLowerCase().endsWith(".xls")) {
      try {
        fs.unlinkSync(path.join(downloadDir, f));
      } catch {}
    }
  }

  // ✅ download behavior zetten (2 lagen)
  // 1) Page.setDownloadBehavior (jouw origineel)
  try {
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
    });
  } catch (e) {
    console.log("⚠️ Page.setDownloadBehavior faalde:", e?.message ?? e);
  }

  // 2) Browser.setDownloadBehavior (extra zekerheid)
  try {
    const bClient = await browser.target().createCDPSession();
    await bClient.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
      eventsEnabled: true,
    });
  } catch (e) {
    // niet elke Chromium build ondersteunt dit; geen probleem
  }

  // ✅ selectors: eerst jouw originele IMG (exact), daarna jouw echte DIV
  const excelSelImg = 'img[title="download als excel"]';
  const excelSelDiv = 'div[title="download als excel"]';

  // wachten tot view klaar is (knop verschijnt)
  // probeer img, anders div
  const hasImg = await page.$(excelSelImg);
  const hasDiv = await page.$(excelSelDiv);

  if (!hasImg && !hasDiv) {
    // wacht op één van beide
    try {
      await page.waitForSelector(excelSelImg, { timeout: 8000 });
    } catch {
      await page.waitForSelector(excelSelDiv, { timeout: 25000 });
    }
  }

  // klik
  const btnImg = await page.$(excelSelImg);
  if (btnImg) {
    await page.click(excelSelImg);
  } else {
    await page.click(excelSelDiv);
  }

  // ✅ wacht op nieuwe excel (geen vaste 6s)
  const file = await waitForNewExcel(downloadDir, 60000);
  return file;
}

//////////////////////////////////////////////////////////////
// 2. Excel-parser — headers op rij 5, data vanaf rij 6
//////////////////////////////////////////////////////////////
async function parseExcel(filePath) {
  console.log("📊 Excel verwerken…", filePath);

  // ✅ Vervangt XLSX.readFile + sheet_to_json
  // Geeft array-of-arrays terug, net als header:1
  const aoaRaw = await readXlsxToRows(filePath, { sheetIndex: 0 });

  // defval: null gedrag nadoen: lege strings -> null
  const aoa = (aoaRaw || []).map((row) =>
    (row || []).map((v) => {
      const s = typeof v === "string" ? v.trim() : v;
      return s === "" ? null : s;
    })
  );

  if (!aoa || aoa.length < 6) {
    console.log("❌ Excel bevat te weinig rijen");
    return [];
  }

  const headerRowIndex = 4; // rij 5
  const dataStartIndex = 5; // rij 6

  const headers = (aoa[headerRowIndex] || []).map((h) => String(h || "").trim());
  console.log("🔍 Headers (rij 5):", headers);

  const dataRows = aoa.slice(dataStartIndex);
  if (!dataRows.length) {
    console.log("❌ Geen data rijen gevonden");
    return [];
  }

  const colNaam = detectColumn(headers, ["naam"]);
  const colPlaats = detectColumn(headers, ["plaats"]);
  const colLand = detectColumn(headers, ["land"]);
  const colStart = detectColumn(headers, ["start"]);
  const colEinde = detectColumn(headers, ["einde"]);
  const colKey = detectColumn(headers, ["key"]);

  if (!colNaam || !colKey) {
    console.log("❌ Vereiste kolommen ontbreken (Naam / Key)");
    return [];
  }

  const idx = (col) => headers.indexOf(col);

  const cleaned = dataRows
    .filter((row) => row && row[idx(colKey)] != null)
    .map((row) => ({
      sportschool_id: Number(row[idx(colKey)]),
      naam: row[idx(colNaam)] || null,
      plaats: colPlaats ? row[idx(colPlaats)] || null : null,
      land: colLand ? row[idx(colLand)] || null : null,
      keurmerk_start: colStart ? parseDate(row[idx(colStart)]) : null,
      keurmerk_einde: colEinde ? parseDate(row[idx(colEinde)]) : null,
      updated_at: new Date().toISOString(),
    }));

  console.log(`📌 ${cleaned.length} sportscholen gevonden`);
  return cleaned;
}

//////////////////////////////////////////////////////////////
// 3. Save to Supabase → juiste tabel
//////////////////////////////////////////////////////////////
async function loadSportschoolAliases() {
  const aliases = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("sportschool_aliases")
      .select("alias_text,sportschool_id")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = data ?? [];
    aliases.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return aliases;
}

function canonicalizeSportscholen(rows, aliases) {
  const aliasMap = new Map();

  for (const alias of aliases ?? []) {
    const normalized = normalizeAliasText(alias?.alias_text);
    const canonicalId = Number(alias?.sportschool_id);

    if (!normalized || !Number.isFinite(canonicalId)) continue;
    aliasMap.set(normalized, canonicalId);
  }

  const grouped = new Map();

  for (const row of rows ?? []) {
    const originalId = Number(row?.sportschool_id);
    if (!Number.isFinite(originalId)) continue;

    const normalizedName = normalizeAliasText(row?.naam);
    const aliasTargetId = normalizedName ? aliasMap.get(normalizedName) : null;
    const canonicalId = Number.isFinite(Number(aliasTargetId))
      ? Number(aliasTargetId)
      : originalId;

    const candidate = {
      ...row,
      sportschool_id: canonicalId,
      _original_sportschool_id: originalId,
      _is_canonical_source: originalId === canonicalId,
    };

    const current = grouped.get(canonicalId);

    if (!current) {
      grouped.set(canonicalId, candidate);
      continue;
    }

    // Als zowel de echte/canonieke FightPassport-ID als een oude alias-ID
    // aanwezig zijn, krijgt de echte ID altijd voorrang.
    const preferred =
      candidate._is_canonical_source && !current._is_canonical_source
        ? candidate
        : current;

    const fallback = preferred === candidate ? current : candidate;

    grouped.set(canonicalId, {
      ...preferred,
      naam: preferred.naam || fallback.naam || null,
      plaats: preferred.plaats || fallback.plaats || null,
      land: preferred.land || fallback.land || null,
      keurmerk_start: preferred.keurmerk_start || fallback.keurmerk_start || null,
      keurmerk_einde: preferred.keurmerk_einde || fallback.keurmerk_einde || null,
      updated_at: new Date().toISOString(),
    });
  }

  return [...grouped.values()].map(
    ({ _original_sportschool_id, _is_canonical_source, ...row }) => row
  );
}

async function loadExistingSportschoolIds() {
  const ids = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("sportscholen")
      .select("sportschool_id")
      .not("sportschool_id", "is", null)
      .order("sportschool_id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = data ?? [];
    ids.push(
      ...batch
        .map((row) => Number(row?.sportschool_id))
        .filter(Number.isFinite)
    );

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return ids;
}

async function deleteStaleSportscholen(currentIds) {
  // Veiligheidsstop: de normale FightPassport-lijst bevat duizenden sportscholen.
  // Bij een kapotte of onvolledige Excel mag er absoluut niets verwijderd worden.
  if (!Array.isArray(currentIds) || currentIds.length < 1000) {
    throw new Error(
      `Veiligheidsstop: slechts ${currentIds?.length ?? 0} actuele sportscholen gevonden; oude sportscholen worden niet verwijderd`
    );
  }

  const currentSet = new Set(currentIds.map(Number));
  const existingIds = await loadExistingSportschoolIds();
  const staleIds = existingIds.filter((id) => !currentSet.has(Number(id)));

  if (!staleIds.length) {
    console.log("✅ Geen vervallen sportschool-IDs gevonden");
    return [];
  }

  console.log("🗑️ Vervallen sportschool-IDs worden verwijderd", {
    aantal: staleIds.length,
    ids: staleIds,
  });

  // In kleine batches verwijderen om URL/query-limieten van PostgREST te vermijden.
  const batchSize = 100;

  for (let i = 0; i < staleIds.length; i += batchSize) {
    const batch = staleIds.slice(i, i + batchSize);

    const { error } = await supabase
      .from("sportscholen")
      .delete()
      .in("sportschool_id", batch);

    if (error) throw error;
  }

  console.log("✅ Vervallen sportscholen verwijderd", {
    aantal: staleIds.length,
  });

  return staleIds;
}

async function saveToSupabase(data) {
  const aliases = await loadSportschoolAliases();
  const canonicalData = canonicalizeSportscholen(data, aliases);

  console.log("🔗 Sportschool-aliassen toegepast", {
    bron_rijen: data?.length ?? 0,
    aliasregels: aliases.length,
    unieke_canonieke_sportscholen: canonicalData.length,
  });

  // Eerst de actuele lijst volledig en succesvol opslaan.
  const { error } = await supabase.from("sportscholen").upsert(canonicalData, {
    onConflict: "sportschool_id",
  });

  if (error) {
    throw error;
  }

  console.log("✅ Sportscholen opgeslagen in Supabase");

  // Pas NA een geslaagde upsert oude IDs verwijderen die niet meer in de
  // actuele, reeds gecanonicaliseerde FightPassport-lijst voorkomen.
  const currentIds = canonicalData
    .map((row) => Number(row?.sportschool_id))
    .filter(Number.isFinite);

  const staleIds = await deleteStaleSportscholen(currentIds);

  return {
    ok: true,
    opgeslagen: canonicalData.length,
    verwijderd: staleIds.length,
  };
}

//////////////////////////////////////////////////////////////
// 4. MAIN SCRAPER
//////////////////////////////////////////////////////////////
export async function scraperSportscholen() {
  console.log("🏁 START: Sportscholen-scraper");

  const { browser, page } = await loginFightPassport();

  try {
    await waitForDashboard(page);
    await clickSportscholenTile(page);

    const file = await downloadExcel(page, browser);
    const parsed = await parseExcel(file);

    await saveToSupabase(parsed);

    console.log("🎉 Sportscholen scrape compleet!");
  } catch (err) {
    console.log("❌ Fout:", err.message);
    // laat hem falen zodat je API route 500 kan geven
    throw err;
  } finally {
    await browser.close();
  }
}

if (["run", "run-all"].includes(process.argv[2])) {
  scraperSportscholen()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error?.stack ?? error);
      process.exit(1);
    });
}
