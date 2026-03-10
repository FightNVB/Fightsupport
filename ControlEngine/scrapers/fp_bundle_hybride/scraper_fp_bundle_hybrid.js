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

/* -------------------------------------------------------
   ✅ NAAM SEARCH helpers (fuzzy)
------------------------------------------------------- */
function normName(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/['’`]/g, "") // apostrophes
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(s) {
  return normName(s).split(" ").filter(Boolean);
}

function tokenOverlapScore(a, b) {
  const A = new Set(nameTokens(a));
  const B = new Set(nameTokens(b));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit++;
  return hit / Math.max(A.size, B.size); // 0..1
}

function levenshtein(a, b) {
  a = normName(a);
  b = normName(b);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = new Array(b.length + 1).fill(0);
  const v1 = new Array(b.length + 1).fill(0);
  for (let i = 0; i < v0.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

function similarity(a, b) {
  // 0..1 (1 = exact)
  a = normName(a);
  b = normName(b);
  if (!a && !b) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(1, Math.max(a.length, b.length));
}

function formatBirthToFP(v) {
  // input kan ISO yyyy-mm-dd of dd-mm-jjjj; output dd-mm-jjjj (FightPassport strict)
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yyyy, mm, dd] = s.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  return null;
}

// -----------------------------
// FightPassport UI selectors (zoals jij aangaf)
// -----------------------------
const SEL = {
  dashTitle: ".koptekst1",
  tileHeaders: ".tileHeader.enabled",
  fightersTileText: "VECHTERS",
  searchInput: "input.flexlist_search_box",
  searchButton: "button.flexlist_search_button.hover.general_image",
  // terug naar dashboard (rechtsboven)
  logoHome: 'img[src="img/logo_header.svg"], img[src$="/logo_header.svg"], img[src$="logo_header.svg"]',
  // kandidaten (we proberen meerdere)
  flexRows: ".flexlist_row, .flexlistRow, .flexlist_item, .flexlistItem",
};

async function findFrameWithSelector(page, selector, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const frames = page.frames();
    for (const fr of frames) {
      try {
        const el = await fr.$(selector);
        if (el) return fr;
      } catch {}
    }
    await page.waitForTimeout(200);
  }
  return null;
}

async function getFightersSearchFrame(page) {
  // Zoekveld zit soms in modal/iframe (Sys42)
  const fr = await findFrameWithSelector(page, SEL.searchInput, 20000);
  return fr || page.mainFrame();
}


function dashboardNameHint() {
  // optioneel: zet in .env bv FP_DASHBOARD_NAME="Renate" of volledige naam
  return String(process.env.FP_DASHBOARD_NAME ?? "").trim();
}

async function isDashboard(page) {
  try {
    return await page.evaluate((nameHint) => {
      const titles = Array.from(document.querySelectorAll(".koptekst1"))
        .map((el) => (el?.textContent || "").trim())
        .filter(Boolean);

      const hasFP = titles.some((t) => t.toUpperCase() === "FIGHTPASSPORT" || t.toUpperCase().includes("FIGHTPASSPORT"));
      if (!hasFP) return false;
      if (!nameHint) return true;

      const lowHint = nameHint.toLowerCase();
      const pageText = (document.body?.innerText || "").toLowerCase();
      return pageText.includes(lowHint);
    }, dashboardNameHint());
  } catch {
    return false;
  }
}

async function clickLogoBackToDashboard(page, maxClicks = 3) {
  for (let i = 0; i < maxClicks; i++) {
    if (await isDashboard(page)) return true;
    try {
      const el = await page.$(SEL.logoHome);
      if (el) {
        await el.click().catch(() => {});
        await wait(600);
      }
    } catch {}
  }
  return await isDashboard(page);
}

async function ensureDashboard(page) {
  // ✅ Altijd eerst domein openen zonder hash (jouw flow)
  if (await isDashboard(page)) return true;

  // Zorg dat we echt op fightpassport.nl zitten
  await page.goto("https://fightpassport.nl/", { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await wait(800);

  // Login detect
  if (await isLoginPage(page)) return false;

  if (await isDashboard(page)) return true;

  // Probeer via logo terug
  await clickLogoBackToDashboard(page, 4).catch(() => {});
  if (await isDashboard(page)) return true;

  // Fallback: direct naar root/hash (soms laadt dashboard pas met #)
  await page.goto("https://fightpassport.nl/#", { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await wait(900);

  if (await isLoginPage(page)) return false;

  return await isDashboard(page);
}

async function goToFightersSearch(page) {
  // jouw flow: eerst naar fightpassport.nl, dashboard checken, anders terug naar dashboard
  const okDash = await ensureDashboard(page);
  if (!okDash) {
    // als we hier zitten en het is login => laat caller master-refresh doen
    if (await isLoginPage(page)) throw new Error("LOGIN_PAGE");
  }

  // klik tegel VECHTERS
  // klik op tile header met tekst VECHTERS
  const clicked = await page
    .evaluate((tileSel, txt) => {
      const headers = Array.from(document.querySelectorAll(tileSel));
      const h = headers.find((el) => (el?.textContent || "").trim().toUpperCase() === txt);
      if (!h) return false;
      h.closest(".tile")?.click?.();
      h.click?.();
      return true;
    }, SEL.tileHeaders, SEL.fightersTileText)
    .catch(() => false);

  if (!clicked) {
    // fallback: direct hash
    await page
      .goto("https://fightpassport.nl/#vechters", { waitUntil: "domcontentloaded", timeout: 25000 })
      .catch(() => {});
  }

  // ✅ wacht op zoekveld in eender welk frame (Sys42 modal kan iframe zijn)
  await findFrameWithSelector(page, SEL.searchInput, 20000).catch(() => null);
  await wait(350);
}


async function collectFighterCandidates(page) {
  const fr = await getFightersSearchFrame(page);

  // Zorg dat table er is (Sys42 modal laadt soms later)
  await fr.waitForSelector("table", { timeout: 15000 }).catch(() => {});

  return await fr.evaluate(() => {
    const out = [];

    const norm = (s) => String(s || "").trim().toLowerCase();

    // Pak de eerste "data table" in dit scherm die headers heeft
    const tables = Array.from(document.querySelectorAll("table"));
    const table = tables.find((t) => {
      const head = (t.querySelector("thead")?.innerText || "").toUpperCase();
      // In jouw modal: headers bevatten VAnr en Naam
      return head.includes("VANR") || head.includes("VA NR") || head.includes("NAAM");
    });

    if (!table) return out;

    // Header mapping (op basis van header tekst)
    const ths = Array.from(table.querySelectorAll("thead th, thead td")).map((el) => norm(el.textContent));
    let headerCells = ths;

    // fallback: soms geen thead, dan eerste rij
    if (!headerCells.length) {
      const firstRow = table.querySelector("tr");
      headerCells = Array.from(firstRow?.querySelectorAll("th,td") || []).map((el) => norm(el.textContent));
    }

    const idxVa = headerCells.findIndex((h) => h.includes("vanr") || h.includes("va nr") || h === "va");
    const idxNaam = headerCells.findIndex((h) => h === "naam" || h.includes("naam"));
    const idxVoornaam = headerCells.findIndex((h) => h.includes("voornaam"));
    const idxAchternaam = headerCells.findIndex((h) => h.includes("achternaam"));
    const idxDob = headerCells.findIndex((h) => h.includes("geb") || h.includes("geboortedatum") || h.includes("geb.datum"));

    const rows = Array.from(table.querySelectorAll("tbody tr"));

    for (let i = 0; i < rows.length; i++) {
      const tr = rows[i];
      const tds = Array.from(tr.querySelectorAll("td"));
      if (!tds.length) continue;

      const cols = tds.map((td) => (td.innerText || td.textContent || "").trim());
      const joined = cols.filter(Boolean).join(" | ");
      if (!joined) continue;

      // VA
      let vaCell = null;
      if (idxVa >= 0 && cols[idxVa]) {
        const v = String(cols[idxVa]).trim();
        if (/^\d{3,6}$/.test(v)) vaCell = v;
      }
      if (!vaCell) vaCell = cols.find((c) => /^\d{3,6}$/.test(String(c || "").trim())) || null;

      // Naam (FP gebruikt vaak: "Yentar, BY" in kolom Naam)
      let nameCell = null;
      if (idxNaam >= 0 && cols[idxNaam]) {
        nameCell = String(cols[idxNaam]).trim() || null;
      } else if (idxAchternaam >= 0 || idxVoornaam >= 0) {
        const a = idxAchternaam >= 0 ? (cols[idxAchternaam] || "").trim() : "";
        const v = idxVoornaam >= 0 ? (cols[idxVoornaam] || "").trim() : "";
        const comb = [v, a].filter(Boolean).join(" ").trim();
        nameCell = comb || null;
      } else {
        const guess = cols.find((c) => /[a-zA-Zà-ÿ]/.test(String(c || "")) && String(c || "").length >= 3);
        nameCell = guess ? String(guess).trim() : null;
      }

      // DOB
      let dob = null;
      if (idxDob >= 0 && cols[idxDob] && /^\d{2}-\d{2}-\d{4}$/.test(String(cols[idxDob]).trim())) {
        dob = String(cols[idxDob]).trim();
      } else {
        dob = (joined.match(/\b\d{2}-\d{2}-\d{4}\b/) || [])[0] || null;
      }

      if (!vaCell || !nameCell) continue;

      out.push({
        kind: "tr_table",
        idx: i,
        va: vaCell,
        name: nameCell,
        dob,
        txt: joined,
      });
    }

    return out.slice(0, 250);
  });
}


async function clickCandidate(page, cand) {
  if (!cand || cand.kind !== "tr_table") return false;

  const fr = await getFightersSearchFrame(page);

  try {
    return await fr.evaluate((rowIndex) => {
      const tables = Array.from(document.querySelectorAll("table"));
      const table = tables.find((t) => {
        const txt = (t.innerText || "").toUpperCase();
        return txt.includes("VANR") && txt.includes("NAAM");
      });
      if (!table) return false;

      const rows = Array.from(table.querySelectorAll("tbody tr"));
      const tr = rows[rowIndex];
      if (!tr) return false;

      tr.scrollIntoView?.({ block: "center" });

      const evt = new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window });
      tr.dispatchEvent(evt);

      // fallback: 2 clicks
      tr.click?.();
      tr.click?.();

      return true;
    }, cand.idx);
  } catch {
    return false;
  }
}



async function waitForSearchResults(frame, timeoutMs = 9000) {
  // Wacht tot de resultaten-lijst/tabel is bijgewerkt na klikken op "zoeken".
  // FightPassport kan traag zijn; we wachten tot er óf rows zijn óf de HTML "signature" verandert.
  try {
    // Snapshot van huidige resultaten (signature)
    const before = await frame.evaluate(() => {
      const table = document.querySelector("table");
      const tbodyRows = table ? table.querySelectorAll("tbody tr").length : 0;
      const flexRows = document.querySelectorAll(".flexlist_row, .flexlistRow, .flexlist_item, .flexlistItem").length;
      const sig =
        (table ? (table.innerText || "").slice(0, 500) : "") +
        "|" +
        String(tbodyRows) +
        "|" +
        String(flexRows);
      return { tbodyRows, flexRows, sig };
    });

    await frame.waitForFunction(
      (b) => {
        const table = document.querySelector("table");
        const tbodyRows = table ? table.querySelectorAll("tbody tr").length : 0;
        const flexRows = document.querySelectorAll(".flexlist_row, .flexlistRow, .flexlist_item, .flexlistItem").length;

        // Als er rows zijn: klaar
        if (tbodyRows > 0 || flexRows > 0) return true;

        // Of als signature verandert (soms "geen resultaten" view)
        const sig =
          (table ? (table.innerText || "").slice(0, 500) : "") +
          "|" +
          String(tbodyRows) +
          "|" +
          String(flexRows);

        return sig !== (b?.sig || "");
      },
      { timeout: timeoutMs, polling: 200 },
      before
    );

    return true;
  } catch {
    return false;
  }
}

async function fillSearchForm(page, { naam, geboortedatumFp }) {
  const fr = await getFightersSearchFrame(page);

  const q = String(naam ?? "").trim();
  const dob = String(geboortedatumFp ?? "").trim();

  // FightPassport: 1 term per keer (naam OF geboortedatum)
  const value = q || dob;

  await fr.waitForSelector(SEL.searchInput, { timeout: 20000 });

  // Vind input
  const input = await fr.$(SEL.searchInput);
  if (!input) return;

  // Snapshot vóór zoeken (Sys42 table bestaat vaak al, maar rows veranderen)
  const before = await fr
    .evaluate(() => {
      const table = document.querySelector("table");
      const tbody = table ? table.querySelector("tbody") : null;
      const html = tbody ? (tbody.innerHTML || "") : "";
      const rows = tbody ? tbody.querySelectorAll("tr").length : 0;
      return { html, rows };
    })
    .catch(() => ({ html: "", rows: 0 }));

  // Clear input (Sys42 luistert op input/change events)
  await input.click({ clickCount: 3 }).catch(() => {});
  await fr
    .evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.focus?.();
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, SEL.searchInput)
    .catch(() => {});
  await input.press("Backspace").catch(() => {});

  if (value) {
    await input.type(value, { delay: 35 }).catch(() => {});
  }

  // ✅ Klik altijd op ZOEKEN (jouw exacte knop)
  const clicked = await fr
    .evaluate(() => {
      const exact = document.querySelector("button.flexlist_search_button.hover.general_image");
      if (exact) {
        exact.click?.();
        return true;
      }
      const byFlex = document.querySelector("button.flexlist_search_button");
      if (byFlex) {
        byFlex.click?.();
        return true;
      }
      const btns = Array.from(document.querySelectorAll("button"));
      const b = btns.find((x) => (x.textContent || "").trim().toLowerCase() === "zoeken");
      if (b) {
        b.click?.();
        return true;
      }
      return false;
    })
    .catch(() => false);

  if (!clicked) {
    // Enter werkt soms niet, maar als fallback kan het nog helpen
    await input.press("Enter").catch(() => {});
  }


  // ✅ Wacht tot de resultaten ECHT zijn bijgewerkt.
  // We wachten op:
  // - er verschijnt een "echte" VA in de tabel (3-6 cijfers), OF
  // - tbody html verandert (ook bij 0 resultaten view), OF
  // - er verschijnt een "geen resultaten" melding
  const timeoutMs = Number(process.env.FP_SEARCH_WAIT_MS ?? "15000");

  await fr
    .waitForFunction(
      (b) => {
        const table = document.querySelector("table");
        const tbody = table ? table.querySelector("tbody") : null;
        if (!tbody) return false;

        const html = tbody.innerHTML || "";

        // ✅ html wijziging = update (ook bij 0 resultaten view)
        if ((b?.html || "") !== html) return true;

        // ✅ echte data row: ergens een td met alleen digits (VA)
        const tds = Array.from(tbody.querySelectorAll("td"));
        const hasVa = tds.some((td) => /^\s*\d{3,6}\s*$/.test((td.textContent || "").trim()));
        if (hasVa) return true;

        // ✅ 0-resultaten melding (verschilt per Sys42 build)
        const bodyText = (document.body?.innerText || "").toLowerCase();
        if (bodyText.includes("geen resultaten") || bodyText.includes("geen records") || bodyText.includes("no records")) {
          return true;
        }

        return false;
      },
      { timeout: timeoutMs, polling: 200 },
      before
    )
    .catch(() => {});

  // kleine settle
  await page.waitForTimeout(350);
}


function scoreCandidateText(txt, target) {
  const { naam, geboortedatumFp, gym } = target;
  const t = String(txt ?? "");

  const nameSim = similarity(t, naam);
  const tok = tokenOverlapScore(t, naam);

  let dobScore = 0;
  if (geboortedatumFp) {
    dobScore = t.includes(geboortedatumFp) ? 1 : 0;
  }

  let gymScore = 0;
  if (gym) {
    const gSim = similarity(t, gym);
    // gym is minder belangrijk dan naam/dob
    gymScore = Math.max(0, gSim);
  }

  // weging:
  // - geboortedatum exact match = grote boost
  // - naam similarity + token overlap
  return (
    dobScore * 2.2 +
    nameSim * 1.2 +
    tok * 0.9 +
    gymScore * 0.35
  );
}

async function openTabToFighterByNameAndGetVa(browser, context, cookies, job, opts) {
  const { maxAttempts = 3, softWaitMs = 800, betweenAttemptsMs = 450, workerLabel = "" } = opts ?? {};
  const geboortedatumFp = formatBirthToFP(job?.geboortedatum);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const p = context ? await context.newPage() : await browser.newPage();
    await p.setCacheEnabled(false);

    try {
      if (Array.isArray(cookies) && cookies.length) {
        await p.setCookie(...cookies);
      }
    } catch {}


    // ✅ Zorg dat we op het FightPassport domein zitten (anders blijft page op about:blank)
    await p.goto("https://fightpassport.nl/", { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
    await wait(900);

    // login check (kan hier al gebeuren)
    if (await isLoginPage(p)) {
      await hardClosePage(p).catch(() => {});
      throw new Error("LOGIN_PAGE");
    }

    await goToFightersSearch(p);

    // 1) naam-zoek in stappen (FightPassport: 1 term per keer)
    // - volledige naam
    // - first + last
    // - alleen achternaam
    // - alleen voornaam
    const terms = [];
    const rawName = String(job?.naam ?? "").trim();
    const parts = nameTokens(rawName);

    if (rawName) terms.push(rawName);
    if (parts.length >= 2) terms.push(`${parts[0]} ${parts[parts.length - 1]}`); // first + last
    if (parts.length >= 2) terms.push(parts[parts.length - 1]); // last
    if (parts.length >= 1) terms.push(parts[0]); // first

    // dedupe + minimale lengte
    const seen = new Set();
    const uniqTerms = terms
      .map((t) => String(t || "").trim())
      .filter((t) => t.length >= 3)
      .filter((t) => (seen.has(t.toLowerCase()) ? false : (seen.add(t.toLowerCase()), true)));

    let candidates = [];
    for (const term of uniqTerms) {
      await fillSearchForm(p, { naam: term, geboortedatumFp: null });
      candidates = await collectFighterCandidates(p);
      if (candidates?.length) break;
    }

    // 2) laatste redmiddel: geboortedatum als zoekterm (dd-mm-jjjj)
    if (!candidates?.length && geboortedatumFp) {
      await fillSearchForm(p, { naam: null, geboortedatumFp });
      candidates = await collectFighterCandidates(p);
    }


    if (!candidates?.length) {
      console.log(`[bundle] 🔎 geen kandidaten ${workerLabel}`, { attempt, naam: job?.naam });
      await hardClosePage(p).catch(()=>{});
      await wait(betweenAttemptsMs);
      continue;
    }

    // Score & kies best
    let best = null;
    let bestScore = -1;
    for (const c of candidates) {
      const s = scoreCandidateText(c.txt, { naam: job?.naam, geboortedatumFp, gym: job?.gym });
      if (s > bestScore) { bestScore = s; best = c; }
    }

    // minimale drempel (anders teveel false positives)
    if (!best || bestScore < 0.55) {
      console.log(`[bundle] 🔎 candidates but low confidence ${workerLabel}`, {
        attempt,
        naam: job?.naam,
        geboortedatum: geboortedatumFp,
        bestScore,
        bestText: best?.txt ?? null,
      });
      await hardClosePage(p).catch(()=>{});
      await wait(betweenAttemptsMs);
      continue;
    }

    await clickCandidate(p, best);
    await wait(softWaitMs);

    // login check
    const loginNow = await isLoginPage(p);
    if (loginNow) {
      await hardClosePage(p).catch(() => {});
      throw new Error("LOGIN_PAGE");
    }

    // lees header -> VA
    const info = await readHeaderInfo(p);
    const gotVa = info?.gotVa ?? null;

    if (gotVa) return { page: p, va: String(gotVa), score: bestScore, pickedText: best?.txt ?? "" };

    console.log(`[bundle] 🔎 clicked but no VA header ${workerLabel}`, { attempt, urlNow: p.url(), bestScore });
    await hardClosePage(p).catch(()=>{});
    await wait(betweenAttemptsMs);
  }

  return null;
}

async function updateBoutVaInDb(matchmaking_id, partij_nr, hoek, newVa) {
  if (!matchmaking_id || !partij_nr || !hoek || !newVa) return;

  const col = hoek === "rood" ? "va_rood" : "va_blauw";
  const wasCol = hoek === "rood" ? "rood_va_was" : "blauw_va_was";
  const changedCol = hoek === "rood" ? "rood_va_changed" : "blauw_va_changed";
  const changedAtCol = hoek === "rood" ? "rood_va_changed_at" : "blauw_va_changed_at";
  const isGewijzigdCol = hoek === "rood" ? "rood_va_is_gewijzigd" : "blauw_va_is_gewijzigd";

  // huidige waarde ophalen
  const { data: rows, error: selErr } = await supabase
    .from("matchmaking_bouts_raw")
    .select(`id, ${col}`)
    .eq("matchmaking_id", matchmaking_id)
    .eq("partij_nr", partij_nr)
    .limit(1);

  if (selErr) throw selErr;
  const row = rows?.[0];
  const current = row?.[col] ?? null;

  if (String(current ?? "").trim() === String(newVa).trim()) return; // niets te doen

  const nowIso = new Date().toISOString();

  const patch = {
    [col]: String(newVa).trim(),
    [wasCol]: current ? String(current).trim() : null,
    [changedCol]: true,
    [changedAtCol]: nowIso,
    [isGewijzigdCol]: true,
  };

  const { error: upErr } = await supabase
    .from("matchmaking_bouts_raw")
    .update(patch)
    .eq("matchmaking_id", matchmaking_id)
    .eq("partij_nr", partij_nr);

  if (upErr) throw upErr;

  console.log(`[bundle] ✅ bouts_raw updated partij ${partij_nr} (${hoek}) => VA ${newVa}`);
}

async function fetchMissingVaJobs(matchmaking_id) {
  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("partij_nr, rood_naam, rood_gym, rood_geboortedatum, va_rood, blauw_naam, blauw_gym, blauw_geboortedatum, va_blauw")
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: true });

  if (error) throw error;

  const jobs = [];
  for (const r of data ?? []) {
    const nr = r?.partij_nr ?? null;
    if (!nr) continue;

    const vaR = normalizeVaStrict(r?.va_rood);
    const vaB = normalizeVaStrict(r?.va_blauw);

    if (!vaR && r?.rood_naam) {
      jobs.push({
        mode: "name",
        hoek: "rood",
        partij_nr: nr,
        naam: r.rood_naam,
        gym: r.rood_gym ?? null,
        geboortedatum: r.rood_geboortedatum ?? null,
      });
    } else if (vaR) {
      jobs.push({ mode: "va", va: String(vaR) });
    }

    if (!vaB && r?.blauw_naam) {
      jobs.push({
        mode: "name",
        hoek: "blauw",
        partij_nr: nr,
        naam: r.blauw_naam,
        gym: r.blauw_gym ?? null,
        geboortedatum: r.blauw_geboortedatum ?? null,
      });
    } else if (vaB) {
      jobs.push({ mode: "va", va: String(vaB) });
    }
  }
  return jobs;
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
    const loginEl = await page.$("input.gebruikersnaam").catch(() => null);
    if (loginEl) return true;
  } catch {}
  try {
    const u = (page.url() || "").toLowerCase();
    if (u.includes("login") || u.includes("#login") || u.includes("aanmeld")) return true;
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

  await page.evaluate((va, title) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
    if (!tab) return;

    const head = [...tab.querySelectorAll(".tileHeader.enabled")].find(
      (h) => (h.innerText || "").trim().toUpperCase() === title.toUpperCase()
    );

    head?.closest(".tile")?.click();
  }, va, title);

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
    onConflict: "matchmaking_id,va_nummer",
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

  // ✅ ExcelJS helper kan al ISO leveren: 2024-07-14
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ✅ NL formaat: 14-07-2024 / 14/07/2024 / 14.07.2024
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

  // Zelf-contained normalisatie (niet afhankelijk van andere helpers)
  const normVa = (v) => {
    const s = String(v ?? "").trim().replace(/\D+/g, "");
    if (!s) return null;
    const noZeros = s.replace(/^0+/, "");
    return noZeros ? noZeros : null;
  };

  const tmp = new Map(); // va -> Set(partij_nr)

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

  const out = new Map(); // va -> number[]
  for (const [va, set] of tmp.entries()) {
    out.set(va, Array.from(set).sort((a, b) => a - b));
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

/**
 * downloadExcel:
 * - herklik download knop 1x als er na 8s nog niets verschijnt
 * - wacht ook op .crdownload -> uiteindelijk .xlsx
 */
async function downloadExcel(page, matchmaking_id, va) {
  const mm = safeSlug(matchmaking_id);
  const vaSafe = String(va ?? "").replace(/[^0-9]/g, "");
  const uniq = crypto.randomUUID().slice(0, 8);

  const downloadDir = path.resolve(__dirname, "downloads", mm, `${vaSafe}_${uniq}`);
  fs.mkdirSync(downloadDir, { recursive: true });

  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir });

  const selectors = ['[title="download als excel"]', '[title*="download"][title*="excel"]'];
  const found = await waitForAnySelectorInAnyFrame(page, selectors, 45000);
  if (!found) throw new Error(`Download knop niet gevonden — VA ${va}`);

  const clickDownload = async () => {
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

    if (xlsx[0]) return xlsx[0];

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

  if (missing.length) {
    return {
      rows: [],
      meta: { ok: false, missingHeaders: missing, headers: headers.filter(Boolean) },
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

      sportschool: idxSportschool !== -1 ? (toStr(row[idxSportschool]) ?? null) : null,
      discipline: toStr(row[idxDiscipline]) ?? null,
      klasse: idxKlasse !== -1 ? (toStr(row[idxKlasse]) ?? null) : null,
      gewicht: idxGewicht !== -1 ? (toStr(row[idxGewicht]) ?? null) : null,
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
    meta: { ok: true, missingHeaders: [], headers: headers.filter(Boolean) },
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
    await openUitslagenTile(page, va);

    const file = await downloadExcel(page, matchmaking_id, va);
    if (!file) {
      await saveUitslagenSnapshot([], matchmaking_id, controle_run_id, va, partijNrByVaMap).catch(() => {});
      console.log(`[uitslagen] ✅ done VA ${va} (n=0) (no file)`);
      return { ok: true, n: 0, reason: "no_file" };
    }
    
    const parsed = await parseExcel(file, va, matchmaking_id, controle_run_id);
    lastMeta = parsed?.meta ?? null;

    if (parsed?.meta?.ok) {
      const res = await saveUitslagenSnapshot(parsed.rows, matchmaking_id, controle_run_id, va, partijNrByVaMap);
      const n = res?.saved ?? parsed.rows.length ?? 0;
      console.log(`[uitslagen] ✅ done VA ${va} (n=${n})`);
      return { ok: true, n, reason: "ok" };
    }

    const missing = (parsed?.meta?.missingHeaders ?? []).join(", ");
    const hdrs = (parsed?.meta?.headers ?? []).join(" | ");
    console.log(
      `[uitslagen] ❌ Kolomkoppen niet gevonden (attempt ${attempt}/${MAX_TRIES}) — VA ${va}. Missing: ${missing}`
    );
    console.log(`[uitslagen] ➡️ Headers: ${hdrs}`);

    await closeAnyModal(page).catch(() => {});
    await wait(600 + attempt * 400);
  }

// headers missing => behandel als "geen uitslagen"
await saveUitslagenSnapshot([], matchmaking_id, controle_run_id, va, partijNrByVaMap).catch(() => {});
console.log(`[uitslagen] ✅ done VA ${va} (n=0)`);
return { ok: true, n: 0, reason: "no_uitslagen" };
}

/* -------------------------------------------------------
   RUN (worker pool) - per worker context (killbaar)
   ✅ ondersteunt nu 2 job types:
   - { mode:"va", va:"1234" }
   - { mode:"name", naam:"...", geboortedatum:"yyyy-mm-dd|dd-mm-jjjj", gym:"...", partij_nr:75, hoek:"rood|blauw" }
   - { mode:"name", ... } vult automatisch va_rood/va_blauw terug in matchmaking_bouts_raw
------------------------------------------------------- */
async function runBundle(matchmaking_id, controle_run_id, jobs, workers = 5) {
  const partijNrByVaMap = await fetchPartijNrByVa(matchmaking_id);

  const { browser, page: masterPage } = await loginFightPassport();

  let cookies = [];
  try {
    cookies = await masterPage.cookies();
  } catch {}

  console.log("[bundle] ✅ Master logged in (cookies captured)");

  // 🔒 MASTER REFRESH LOCK
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

    // ✅ eigen context per worker (compat)
    let ctx = await createWorkerContext(browser);

    async function resetWorkerContext(reason) {
      console.log(`[bundle] 🧨 reset worker context (worker${workerIdx + 1}) ${reason ? `(${reason})` : ""}`);
      await closeWorkerContext(ctx).catch(() => {});
      ctx = await createWorkerContext(browser);
    }

    while (true) {
      const myIdx = idx++;
      if (myIdx >= jobs.length) break;

      const job = jobs[myIdx];
      const label = `worker${workerIdx + 1}/${workers}`;

      const jobDesc =
        job?.mode === "va"
          ? `VA ${job?.va}`
          : `NAME ${job?.naam ?? "?"} (partij=${job?.partij_nr ?? "?"} ${job?.hoek ?? "?"})`;

      console.log(`[bundle] 🤖 ${label} → ${jobDesc} (run=${controle_run_id})`);

      let page = null;
      let va = null;

      let fullfighterStatus = "skip";
      let uitslagenStatus = "skip";

      try {
        if (job?.mode === "va") {
          va = normalizeVaStrict(job?.va);
          if (!va) throw new Error("INVALID_VA_JOB");

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
        } else if (job?.mode === "name") {
          const res = await openTabToFighterByNameAndGetVa(browser, ctx, cookies, job, {
            maxAttempts: Number(process.env.NAME_ATTEMPTS ?? "4"),
            softWaitMs: Number(process.env.SOFT_WAIT_MS ?? "900"),
            betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "450"),
            workerLabel: `[${label}]`,
          });

          if (!res?.page || !res?.va) {
            console.log(`[bundle] ❌ ${label} naam-zoek faalde:`, {
              naam: job?.naam,
              geboortedatum: job?.geboortedatum ?? null,
              gym: job?.gym ?? null,
              partij_nr: job?.partij_nr ?? null,
              hoek: job?.hoek ?? null,
            });
            fullfighterStatus = "name_not_found";
            uitslagenStatus = "name_not_found";
            continue;
          }

          page = res.page;
          va = normalizeVaStrict(res.va);

          // ✅ schrijf gevonden VA terug naar bouts_raw (alleen als job dat heeft)
          if (job?.partij_nr && (job?.hoek === "rood" || job?.hoek === "blauw") && va) {
            await updateBoutVaInDb(matchmaking_id, Number(job.partij_nr), job.hoek, va).catch((e) => {
              console.log("[bundle] ❌ bouts_raw update failed:", e?.message ?? String(e));
            });
          }

          // after name click: soms route mismatch; verificatie extra (optioneel)
          await wait(350);
        } else {
          throw new Error("UNKNOWN_JOB_MODE");
        }

        if (!va) throw new Error("NO_VA_AFTER_OPEN");

        // FULLFIGHTER
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

        // UITSLAGEN
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
          console.log(`[bundle] 🔐 ${label} LOGIN_PAGE (${jobDesc}) → master ensureLoggedIn + refresh cookies (LOCKED)`);
          fullfighterStatus = "login_page";
          uitslagenStatus = "login_page";
          try {
            await refreshMasterSessionLocked(`LOGIN_PAGE from ${label} (${jobDesc})`);
            await resetWorkerContext(`login refresh (${jobDesc})`);
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
          console.log(`[bundle] ❌ ${label} fout ${jobDesc}:`, msg);
        } else {
          console.log(`[bundle] ❌ ${label} fout ${jobDesc}:`, msg);
          if (fullfighterStatus === "skip") fullfighterStatus = "error";
          if (uitslagenStatus === "skip") uitslagenStatus = "error";
        }

      } finally {
        console.log(`[bundle] ✅ END ${label} ${jobDesc} | fullfighter=${fullfighterStatus} | uitslagen=${uitslagenStatus}`);

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
}

/* -------------------------------------------------------
   CLI
   ✅ 3 modi:
   1) VA-lijst (backward compatible):
      node scraper_fp_bundle.js <mm> <run> 1234 2345 3456

   2) JSON jobs (naam/va mix):
      node scraper_fp_bundle.js <mm> <run> '[{"mode":"name","naam":"John d\'Avis","geboortedatum":"2002-04-12","gym":"X","partij_nr":75,"hoek":"rood"}]'

   3) AUTO: haal missende VA's uit matchmaking_bouts_raw en vul terug:
      node scraper_fp_bundle.js <mm> <run> --auto
------------------------------------------------------- */
const matchmaking_id = (process.argv[2] ?? "").trim();
const controle_run_id = (process.argv[3] ?? "").trim();
const args = process.argv.slice(4);

if (!matchmaking_id) {
  console.error("❌ matchmaking_id ontbreekt");
  process.exit(1);
}
if (!controle_run_id) {
  console.error("❌ controle_run_id ontbreekt");
  process.exit(1);
}

const WORKERS = Number(process.env.WORKERS ?? "5");
const workers =
  Number.isFinite(WORKERS) && WORKERS > 0 ? Math.min(10, Math.max(1, Math.floor(WORKERS))) : 5;

async function buildJobsFromCli() {
  // --auto
  if (args.includes("--auto")) {
    const jobs = await fetchMissingVaJobs(matchmaking_id);
    if (!jobs.length) {
      console.log("[bundle] ℹ️ --auto: geen jobs gevonden (alles heeft VA?)");
    }
    return jobs;
  }

  // JSON jobs
  if (args[0] && String(args[0]).trim().startsWith("[")) {
    let parsed = [];
    try {
      parsed = JSON.parse(args[0]);
    } catch (e) {
      console.error("❌ JSON parse fout in jobs-arg:", e?.message ?? String(e));
      process.exit(1);
    }
    const jobs = (Array.isArray(parsed) ? parsed : []).map((j) => {
      if (j && (j.mode === "va" || j.mode === "name")) return j;
      const va = normalizeVaStrict(j?.va ?? j?.va_nummer);
      if (va) return { mode: "va", va: String(va) };
      return {
        mode: "name",
        naam: j?.naam ?? j?.name ?? null,
        geboortedatum: j?.geboortedatum ?? j?.dob ?? null,
        gym: j?.gym ?? j?.sportschool ?? null,
        partij_nr: j?.partij_nr ?? null,
        hoek: j?.hoek ?? null,
      };
    }).filter((j) => (j.mode === "va" ? !!normalizeVaStrict(j.va) : !!j.naam));
    if (!jobs.length) {
      console.error("❌ Geen geldige jobs in JSON (verwacht va of naam).");
      process.exit(1);
    }
    return jobs;
  }

  // Backward compatible: VA list
  const vaList = args.map(normalizeVaStrict).filter(Boolean).map(String);
  if (!vaList.length) {
    console.error("❌ Geen geldige VA’s meegegeven (verwacht 3–5 cijfers), of gebruik --auto of JSON jobs.");
    process.exit(1);
  }
  return vaList.map((va) => ({ mode: "va", va }));
}

(async () => {
  const jobs = await buildJobsFromCli();

  console.log("SCRAPER — FP_BUNDLE (hybrid: va + name search + bouts_raw update)", {
    matchmaking_id,
    controle_run_id,
    count: jobs.length,
    workers,
    mode_sample: jobs.slice(0, 6).map((j) => (j.mode === "va" ? `va:${j.va}` : `name:${j.naam}`)),
    stagger_ms: Number(process.env.STAGGER_MS ?? "350"),
    tab_attempts: Number(process.env.TAB_ATTEMPTS ?? "6"),
    name_attempts: Number(process.env.NAME_ATTEMPTS ?? "4"),
    soft_wait_ms: Number(process.env.SOFT_WAIT_MS ?? "900"),
    between_attempts_ms: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "450"),
    uitslagen_tries: Number(process.env.UITSLAGEN_TRIES ?? "2"),
    fullfighter_timeout_ms: Number(process.env.FULLFIGHTER_TIMEOUT_MS ?? "35000"),
    uitslagen_timeout_ms: Number(process.env.UITSLAGEN_TIMEOUT_MS ?? "90000"),
  });

  await runBundle(matchmaking_id, controle_run_id, jobs, workers);

  console.log("✅ FP bundle klaar");
  process.exit(0);
})().catch((e) => {
  console.error("❌ FP bundle hard failed:", e?.stack ?? e?.message ?? String(e));
  process.exit(1);
});
