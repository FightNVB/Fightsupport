// ControlEngine/scrapers/startverbod/scraper_startverbod.js
//
// Dashboardrapport STARTVERBODEN:
// - logt in via de bestaande FightPassport-login;
// - opent op het dashboard de tegel STARTVERBODEN;
// - downloadt het Excelrapport;
// - koppelt Naam veilig aan fightpassport_fighters.va_nummer;
// - schrijft uitsluitend naar startverbod / startverbod_koppelfouten / startverbod_runs;
// - wijzigt fightpassport_fighters NIET;
// - bewaart historie en markeert de laatste volledige rapportset met is_actueel=true;
// - verwijdert het Excelbestand pas na succesvolle verwerking.

import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import { readXlsxToRows } from "../utils/excelRowsExceljs.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import startverbodMatcher from "./startverbodMatcher.cjs";
import { verifyStartverbodCandidate } from "./startverbodVerification.js";
import {
  hardCloseFightPassportPage,
  openFighterPageVerified,
} from "../utils/fightPassportFighterNavigation.js";

const {
  buildFighterIndexes: buildSafeFighterIndexes,
  findCandidateFighters,
  resolveVerifiedCandidates,
} = startverbodMatcher;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compactName(value) {
  return normalizeName(value).replace(/\s+/g, "");
}

function parseExcelDate(value) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel 1900-datumsysteem; 25569 = 1970-01-01.
    const millis = Math.round((value - 25569) * 86400 * 1000);
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!match) return null;

  let year = match[3];
  if (year.length === 2) year = Number(year) < 30 ? `20${year}` : `19${year}`;

  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function listExcelFiles(downloadDir) {
  if (!fs.existsSync(downloadDir)) return [];
  return fs.readdirSync(downloadDir)
    .filter((name) => /\.(xlsx|xls)$/i.test(name))
    .map((name) => path.join(downloadDir, name));
}

async function waitForReadableExcel(downloadDir, before, timeoutMs = 90000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const files = listExcelFiles(downloadDir);
    const candidate = files
      .filter((file) => !before.has(file))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

    if (candidate) {
      const hasPartial = fs.readdirSync(downloadDir).some((name) =>
        name.toLowerCase().endsWith(".crdownload")
      );

      if (!hasPartial && fs.statSync(candidate).size > 0) {
        try {
          await readXlsxToRows(candidate, { sheetIndex: 0 });
          return candidate;
        } catch {
          // Bestand bestaat al maar Chrome schrijft nog; opnieuw proberen.
        }
      }
    }

    await sleep(200);
  }

  throw new Error("STARTVERBODEN Excel niet binnen of niet leesbaar binnen timeout");
}

async function waitForDashboard(page) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const state = await page.evaluate(() => {
      const isVisible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      const unlock =
        document.querySelector("input.pincode") ||
        document.querySelector("input.target_input.pincode") ||
        document.querySelector("input[class*='pincode']");

      const login = document.querySelector("input.gebruikersnaam");
      const tile = [...document.querySelectorAll(".tileHeader")].find(
        (element) => String(element.textContent || "").trim().toUpperCase() === "STARTVERBODEN"
      );

      return {
        unlock: Boolean(unlock && isVisible(unlock)),
        login: Boolean(login && isVisible(login)),
        tile: Boolean(tile && isVisible(tile)),
      };
    });

    if (state.unlock) throw new Error("UNLOCK_REQUIRED: FightPassport vraagt om unlockcode");
    if (state.login) throw new Error("LOGIN_PAGE: FightPassport loginpagina staat open");
    if (state.tile) return;

    await sleep(500);
  }

  throw new Error("Dashboardtegel STARTVERBODEN niet gevonden");
}

async function clickStartverbodenTile(page) {
  const clicked = await page.evaluate(() => {
    const header = [...document.querySelectorAll(".tileHeader.enabled, .tileHeader")].find(
      (element) => String(element.textContent || "").trim().toUpperCase() === "STARTVERBODEN"
    );
    const tile = header?.closest(".tile");
    if (!tile) return false;
    tile.scrollIntoView?.({ block: "center" });
    tile.click();
    return true;
  });

  if (!clicked) throw new Error("STARTVERBODEN tegel kon niet worden aangeklikt");
  await sleep(800);
}

async function findVisibleExcelButton(page, timeoutMs = 30000) {
  const selectors = [
    'img[title="download als excel"]',
    'div[title="download als excel"]',
    '[title*="download"][title*="excel"]',
  ];
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    for (const frame of page.frames()) {
      for (const selector of selectors) {
        const handles = await frame.$$(selector).catch(() => []);
        for (const handle of handles) {
          const visible = await frame.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden"
            );
          }, handle).catch(() => false);

          if (visible) return { frame, handle };
        }
      }
    }
    await sleep(200);
  }

  return null;
}

async function downloadStartverbodenExcel(page, browser) {
  const downloadDir = path.resolve(__dirname, "downloads");
  fs.mkdirSync(downloadDir, { recursive: true });

  // Restanten van eerdere runs verwijderen.
  for (const name of fs.readdirSync(downloadDir)) {
    if (/\.(xlsx|xls|crdownload)$/i.test(name)) {
      fs.rmSync(path.join(downloadDir, name), { force: true });
    }
  }

  const before = new Set(listExcelFiles(downloadDir));

  try {
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
    });
  } catch {}

  try {
    const client = await browser.target().createCDPSession();
    await client.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
      eventsEnabled: true,
    });
  } catch {}

  const button = await findVisibleExcelButton(page);
  if (!button) throw new Error("Excel-downloadknop van STARTVERBODEN niet gevonden");

  await button.frame.evaluate((element) => {
    element.scrollIntoView?.({ block: "center" });
    element.click();
  }, button.handle);

  console.log("[startverbod] ⬇️ Download gestart");
  return await waitForReadableExcel(downloadDir, before);
}

async function parseStartverbodenExcel(filePath) {
  const rows = await readXlsxToRows(filePath, { sheetIndex: 0 });
  const headerIndex = rows.findIndex((row) => {
    const normalized = (row || []).map((value) => String(value ?? "").trim().toLowerCase());
    return normalized.includes("soort") && normalized.includes("ingang") && normalized.includes("naam");
  });

  if (headerIndex === -1) {
    throw new Error("Excelkop met Soort, Ingang en Naam niet gevonden");
  }

  const headers = (rows[headerIndex] || []).map((value) => String(value ?? "").trim());
  const normalizedHeaders = headers.map((value) => value.toLowerCase());
  const indexOf = (name) => normalizedHeaders.indexOf(name);

  const soortIndex = indexOf("soort");
  const ingangIndex = indexOf("ingang");
  const eindeIndex = indexOf("einde");
  const naamIndex = indexOf("naam");

  const parsed = [];
  for (const row of rows.slice(headerIndex + 1)) {
    if (!row) continue;

    const naam = String(row[naamIndex] ?? "").trim();
    const soort = String(row[soortIndex] ?? "").trim();
    if (!naam || !soort) continue;

    const ingang = parseExcelDate(row[ingangIndex]);
    const einde = eindeIndex >= 0 ? parseExcelDate(row[eindeIndex]) : null;

    if (!ingang) {
      throw new Error(`Ongeldige ingangsdatum voor ${naam}: ${String(row[ingangIndex] ?? "")}`);
    }

    parsed.push({
      naam_bron: naam,
      soort,
      ingang,
      einde,
      raw_json: { headers, row },
    });
  }

  if (!parsed.length) {
    throw new Error("STARTVERBODEN Excel bevat geen gegevensregels");
  }

  return parsed;
}

async function loadAllFighters() {
  const fighters = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("fightpassport_fighters")
      .select("va_nummer,naam,fit_to_fight,heeft_startverbod")
      .not("va_nummer", "is", null)
      .not("naam", "is", null)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const batch = data ?? [];
    fighters.push(...batch);
    if (batch.length < pageSize) break;
  }

  return fighters;
}


async function loadConfirmedDeletedVaNumbers() {
  const deleted = new Set();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("fightpassport_missing_va")
      .select("va_number")
      .eq("status", "confirmed_deleted")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = data ?? [];
    for (const row of batch) {
      if (row?.va_number !== null && row?.va_number !== undefined) {
        deleted.add(String(row.va_number));
      }
    }

    if (batch.length < pageSize) break;
  }

  return deleted;
}

function buildFighterIndexes(fighters) {
  const exact = new Map();

  const add = (key, fighter) => {
    if (typeof key !== "string" || key.length === 0) return;
    const list = exact.get(key) ?? [];
    list.push(fighter);
    exact.set(key, list);
  };

  for (const fighter of fighters) {
    // Letterlijk dezelfde FightPassportnaam gebruiken.
    // Geen lowercase, accentverwijdering, spatiecorrectie of fuzzy matching.
    add(String(fighter.naam ?? ""), fighter);
  }

  return { exact };
}

function uniqueByVa(rows) {
  return [...new Map(rows.map((row) => [String(row.va_nummer), row])).values()];
}

function resolveCandidates(candidates, method, confirmedDeletedVaNumbers) {
  const allCandidates = uniqueByVa(candidates);
  const activeCandidates = allCandidates.filter(
    (fighter) => !confirmedDeletedVaNumbers.has(String(fighter.va_nummer))
  );

  // Eén letterlijk exacte naamtreffer is veilig te koppelen.
  if (activeCandidates.length === 1) {
    return {
      status: "matched",
      fighters: activeCandidates,
      candidates: allCandidates,
      method,
    };
  }

  // Bij meerdere VA-nummers met exact dezelfde FightPassportnaam bepaalt
  // heeft_startverbod welke records bij het rapport horen.
  if (activeCandidates.length > 1) {
    const withStartverbod = activeCandidates.filter(
      (fighter) => fighter.heeft_startverbod === true
    );

    // FightPassport kan bewust op meerdere VA-nummers van dezelfde persoon
    // een startverbod hebben gezet. Koppel in dat geval alle true-records.
    if (withStartverbod.length >= 1) {
      return {
        status: "matched",
        fighters: withStartverbod,
        candidates: allCandidates,
        method: "exact",
      };
    }

    // Geen actuele true-status: niet gokken.
    return {
      status: "duplicate",
      candidates: activeCandidates,
      all_candidates: allCandidates,
      method: "exact",
    };
  }

  return {
    status: allCandidates.length ? "duplicate" : "not_found",
    candidates: allCandidates,
    method,
  };
}

function matchFighter(naam, indexes, confirmedDeletedVaNumbers) {
  // Letterlijke vergelijking met de naam zoals FightPassport die opslaat.
  // P. Janssen en P. Jansen zijn dus verschillende namen.
  const exactMatches = uniqueByVa(indexes.exact.get(String(naam ?? "")) ?? []);

  if (exactMatches.length) {
    return resolveCandidates(
      exactMatches,
      "exact",
      confirmedDeletedVaNumbers
    );
  }

  return {
    status: "not_found",
    candidates: [],
    method: "exact",
  };
}

function sourceKey(row) {
  return crypto
    .createHash("sha256")
    .update([
      String(row.va_nummer),
      normalizeName(row.soort),
      row.ingang || "",
      row.einde || "",
    ].join("|"))
    .digest("hex");
}

async function createRun() {
  const { data, error } = await supabase
    .from("startverbod_runs")
    .insert({ status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function finishRun(runId, patch) {
  const { error } = await supabase
    .from("startverbod_runs")
    .update({ ...patch, finished_at: new Date().toISOString() })
    .eq("id", runId);

  if (error) throw error;
}

async function saveMatchErrors(runId, errors) {
  if (!errors.length) return;

  const payload = errors.map((item) => ({
    run_id: runId,
    naam_bron: item.naam_bron,
    soort: item.soort,
    ingang: item.ingang,
    einde: item.einde,
    fout_type: item.match.status,
    mogelijke_va_nummers: (item.match.candidates ?? []).map((candidate) => String(candidate.va_nummer)),
    mogelijke_namen: (item.match.candidates ?? []).map((candidate) => String(candidate.naam)),
    raw_json: item.raw_json,
  }));

  const { error } = await supabase.from("startverbod_koppelfouten").insert(payload);
  if (error) throw error;
}

async function saveSnapshot(runId, matchedRows, hasMatchErrors) {
  const now = new Date().toISOString();

  // Alleen wanneer iedere Excelregel veilig gekoppeld is, mag de vorige actuele
  // rapportset worden afgesloten. Anders zouden niet-gekoppelde actieve verboden
  // ten onrechte uit de actuele lijst verdwijnen.
  if (!hasMatchErrors) {
    const { error } = await supabase
      .from("startverbod")
      .update({ is_actueel: false, laatst_gezien_op: now })
      .eq("is_actueel", true);

    if (error) throw error;
  }

  const payload = matchedRows.map((row) => ({
    bron_sleutel: sourceKey(row),
    va_nummer: String(row.va_nummer),
    naam: row.naam,
    naam_bron: row.naam_bron,
    soort: row.soort,
    ingang: row.ingang,
    einde: row.einde,
    is_actueel: true,
    koppel_methode: row.koppel_methode,
    eerste_gezien_op: now,
    laatst_gezien_op: now,
    laatste_run_id: runId,
    raw_json: row.raw_json,
    reden: row.reden ?? null,
    opmerkingen: row.opmerkingen ?? null,
    aangemaakt_op: row.aangemaakt_op ?? null,
    aangemaakt_door: row.aangemaakt_door ?? null,
    gewijzigd_op: row.gewijzigd_op ?? null,
    gewijzigd_door: row.gewijzigd_door ?? null,
    naam_fp: row.naam_fp ?? row.naam ?? null,
    verified_in_fightpassport: row.verified_in_fightpassport ?? false,
    verified_at: row.verified_at ?? null,
    verification_method: row.verification_method ?? null,
  }));

  // PostgreSQL kan dezelfde conflict-sleutel niet tweemaal binnen één
  // upsert bijwerken. Alleen volledig identieke bron_sleutels samenvoegen.
  // Verschillende namen of VA-nummers blijven afzonderlijke records.
  const uniquePayload = [
    ...new Map(payload.map((row) => [row.bron_sleutel, row])).values(),
  ];

  if (uniquePayload.length !== payload.length) {
    console.warn("[startverbod] identieke dubbele rapportregels verwijderd vóór upsert", {
      ontvangen: payload.length,
      uniek: uniquePayload.length,
      verwijderd: payload.length - uniquePayload.length,
    });
  }

  const { error } = await supabase
    .from("startverbod")
    .upsert(uniquePayload, {
      onConflict: "bron_sleutel",
      ignoreDuplicates: false,
    });

  if (error) throw error;
}

export async function scraperStartverbod() {
  console.log("🏁 START: startverbod-scraper");
  const runId = await createRun();
  let browser = null;
  let downloadedFile = null;

  try {
    const login = await loginFightPassport();
    browser = login.browser;
    const page = login.page;

    await waitForDashboard(page);
    await clickStartverbodenTile(page);
    downloadedFile = await downloadStartverbodenExcel(page, browser);

    const parsed = await parseStartverbodenExcel(downloadedFile);
    const [fighters, confirmedDeletedVaNumbers] = await Promise.all([
      loadAllFighters(),
      loadConfirmedDeletedVaNumbers(),
    ]);
    const indexes = buildSafeFighterIndexes(fighters);
    let cookies = await page.cookies().catch(() => []);

    const matched = [];
    const errors = [];

    for (const row of parsed) {
      const candidates = findCandidateFighters(row.naam_bron, indexes, confirmedDeletedVaNumbers);
      const verifications = [];

      for (const fighter of candidates) {
        let fighterPage = null;
        try {
          fighterPage = await openFighterPageVerified(browser, null, cookies, fighter.va_nummer, {
            maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
            softWaitMs: Number(process.env.SOFT_WAIT_MS ?? "2500"),
            betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "1200"),
            workerLabel: `[startverbod VA ${fighter.va_nummer}]`,
          });
          if (!fighterPage) {
            verifications.push({ verified: false, fighter, reason: "navigation_timeout" });
            continue;
          }
          verifications.push(await verifyStartverbodCandidate(fighterPage, fighter, row));
        } catch (error) {
          if (error?.message === "LOGIN_PAGE") {
            await ensureLoggedIn(page, { force: true });
            cookies = await page.cookies().catch(() => cookies);
          }
          verifications.push({
            verified: false,
            fighter,
            reason: error?.message === "LOGIN_PAGE" ? "login_refresh_required" : "verification_error",
            error: error?.message ?? String(error),
          });
        } finally {
          await hardCloseFightPassportPage(fighterPage).catch(() => {});
        }
      }

      const match = resolveVerifiedCandidates(candidates, verifications);

      if (match.status !== "matched" || !Array.isArray(match.fighters)) {
        errors.push({
          ...row,
          match,
          raw_json: { ...row.raw_json, fightpassport_verifications: verifications },
        });
        continue;
      }

      for (const fighter of match.fighters) {
        const verification = match.verification;
        const verifiedAt = new Date().toISOString();
        matched.push({
          ...row,
          va_nummer: String(fighter.va_nummer),
          naam: fighter.naam,
          naam_fp: verification.profileName || fighter.naam,
          koppel_methode: match.method,
          reden: verification.detail?.reden ?? null,
          opmerkingen: verification.detail?.opmerkingen ?? null,
          aangemaakt_op: parseExcelDate(verification.detail?.aangemaakt_op),
          aangemaakt_door: verification.detail?.aangemaakt_door ?? null,
          gewijzigd_op: parseExcelDate(verification.detail?.gewijzigd_op),
          gewijzigd_door: verification.detail?.gewijzigd_door ?? null,
          verified_in_fightpassport: true,
          verified_at: verifiedAt,
          verification_method: "startverboden_tegel_details",
          raw_json: { ...row.raw_json, fightpassport_verification: verification },
        });
      }
    }

    await saveMatchErrors(runId, errors);
    await saveSnapshot(runId, matched, errors.length > 0);

    await finishRun(runId, {
      status: errors.length ? "completed_with_errors" : "success",
      excel_rijen: parsed.length,
      gekoppeld: matched.length,
      koppelfouten: errors.length,
      foutmelding: errors.length
        ? "Niet alle namen konden veilig aan een werkend VA-nummer worden gekoppeld; vorige actuele set is daarom niet volledig afgesloten."
        : null,
    });

    // Pas na geslaagde databaseverwerking verwijderen.
    fs.rmSync(downloadedFile, { force: true });
    downloadedFile = null;

    console.log("🎉 Startverbod scrape compleet", {
      excel: parsed.length,
      gekoppeld: matched.length,
      koppelfouten: errors.length,
    });

    return {
      ok: true,
      run_id: runId,
      excel_rijen: parsed.length,
      gekoppeld: matched.length,
      koppelfouten: errors.length,
    };
  } catch (error) {
    const message = error?.message ?? String(error);
    await finishRun(runId, {
      status: "error",
      foutmelding: message,
    }).catch(() => {});

    console.error("❌ Startverbod scraper fout:", error?.stack ?? error);
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    // Bij fout blijft het Excelbestand bewust staan voor controle.
  }
}

if (["run", "run-all"].includes(process.argv[2])) {
  scraperStartverbod()
    .then((result) => {
      console.log(JSON.stringify(result));
      process.exit(0);
    })
    .catch(() => process.exit(1));
}
