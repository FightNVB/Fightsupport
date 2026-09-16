import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import { readXlsxToRows } from "../utils/excelRowsExceljs.js";
import { terminateSyncRun } from "../../Terminator/terminator.js";
import { openFighterPageVerified } from "../utils/fightPassportFighterNavigation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function throwIfAborted(signal, va = "") {
  if (signal?.aborted) {
    const err = new Error(`SCRAPE_ABORTED${va ? ` VA ${va}` : ""}`);
    err.name = "AbortError";
    throw err;
  }
}

const START_VA = Number(process.argv[2] || process.env.FP_TOTAL_START_VA || 775);
const END_VA = Number(process.argv[3] || process.env.FP_TOTAL_END_VA || 33150);
const WORKERS_RAW = Number(process.env.FP_TOTAL_WORKERS ?? process.env.WORKERS ?? "8");
const WORKERS = Number.isFinite(WORKERS_RAW) && WORKERS_RAW > 0
  ? Math.min(20, Math.max(1, Math.floor(WORKERS_RAW)))
  : 8;
const SCRAPE_RESULTS = String(process.env.FP_TOTAL_RESULTS || "true").toLowerCase() !== "false";
const RESUME_RUN_ID = String(process.env.FP_TOTAL_RUN_ID || "").trim();
const EXPLICIT_VA_LIST = String(process.env.FP_TOTAL_VA_LIST || "")
  .split(",")
  .map((value) => String(value).trim())
  .filter((value) => /^\d{3,6}$/.test(value));
const HAS_EXPLICIT_VA_LIST = EXPLICIT_VA_LIST.length > 0;
const RUN_KIND = String(process.env.FP_TOTAL_RUN_KIND || (HAS_EXPLICIT_VA_LIST ? "retry" : "full"))
  .trim()
  .toLowerCase();
const IS_RETRY_RUN = RUN_KIND === "retry";
const SKIP_RUN_TERMINATOR = String(process.env.FP_SKIP_RUN_TERMINATOR || "false").toLowerCase() === "true";
const BATCH_ID = String(process.env.FP_TOTAL_BATCH_ID || "").trim();
const BATCH_PART = Number(process.env.FP_TOTAL_BATCH_PART || "1");
const BATCH_PARTS = Number(process.env.FP_TOTAL_BATCH_PARTS || "1");
const BATCH_START_VA = Number(process.env.FP_TOTAL_BATCH_START_VA || START_VA);
const BATCH_END_VA = Number(process.env.FP_TOTAL_BATCH_END_VA || END_VA);
const ADMIN_MATCHMAKING_ID = String(process.env.FP_ADMIN_MATCHMAKING_ID || "").trim();
const ADMIN_CONTROLE_RUN_ID = String(process.env.FP_ADMIN_CONTROLE_RUN_ID || "").trim();
const ADMIN_CONTROL_MODE = !!ADMIN_MATCHMAKING_ID && !!ADMIN_CONTROLE_RUN_ID;
const BATCH_META = BATCH_ID ? {
  batch_id: BATCH_ID,
  batch_part: Number.isFinite(BATCH_PART) ? BATCH_PART : 1,
  batch_parts: Number.isFinite(BATCH_PARTS) ? BATCH_PARTS : 1,
  batch_start_va: Number.isFinite(BATCH_START_VA) ? BATCH_START_VA : START_VA,
  batch_end_va: Number.isFinite(BATCH_END_VA) ? BATCH_END_VA : END_VA,
  workers_per_process: WORKERS,
} : {};

let stopRequested = false;
let stopSignal = null;
let activeRun = null;
let recoverRunPromise = null;
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    if (!stopRequested) {
      stopRequested = true;
      stopSignal = signal;
      console.log(`[fp-total] ⏸️ ${signal} ontvangen: geen nieuwe VA's meer uitdelen; lopende workers ronden af.`);
    }
  });
}

async function withTimeout(promiseFactory, ms, label, onTimeout) {
  let t;
  const controller = new AbortController();

  const timeout = new Promise((_, rej) => {
    t = setTimeout(async () => {
      controller.abort();
      try {
        if (typeof onTimeout === "function") {
          await onTimeout(controller.signal);
        }
      } catch {}
      rej(new Error(`HARD TIMEOUT ${ms}ms for ${label}`));
    }, ms);
  });

  try {
    const p = Promise.resolve().then(() => promiseFactory(controller.signal));
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
        await sleep(120);
      }
    } catch {}
  }

  try {
    await page.keyboard.press("Escape");
    await sleep(80);
    await page.keyboard.press("Escape");
    await sleep(80);
  } catch {}
}

async function closeDetailsExact(page, va = "", signal = null) {
  throwIfAborted(signal, va);

  const clicked = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button#sluit_inr_detail")];
    const button = buttons.find((el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        st.display !== "none" &&
        st.visibility !== "hidden" &&
        st.opacity !== "0"
      );
    });

    if (!button) return false;
    button.scrollIntoView?.({ block: "center" });
    button.click();
    return true;
  }).catch(() => false);

  if (!clicked) {
    throw new Error(`DETAILS sluitknop #sluit_inr_detail niet gevonden — VA ${va}`);
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 3000) {
    throwIfAborted(signal, va);
    const ready = await page.evaluate((requestedVa) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      if (!tab) return false;
      const head = [...tab.querySelectorAll(".tileHeader.enabled")].find(
        (h) => String(h.innerText || "").trim().toUpperCase() === "UITSLAGEN"
      );
      const tile = head?.closest(".tile");
      if (!tile) return false;
      const r = tile.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }, va).catch(() => false);

    if (ready) {
      console.log(`[fp-total] 🚪 VA ${va} DETAILS gesloten via #sluit_inr_detail; UITSLAGEN op dezelfde tab`);
      return true;
    }

    await sleep(50);
  }

  throw new Error(`DETAILS gesloten maar UITSLAGEN-tegel niet vrij — VA ${va}`);
}

async function closeDetailsModalVerified(page, va = "") {
  const closeSelector = "button#sluit_inr_detail";
  const clicked = await page.evaluate((selector) => {
    const buttons = [...document.querySelectorAll(selector)];
    const button =
      buttons.find((el) => {
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          st.display !== "none" &&
          st.visibility !== "hidden" &&
          st.opacity !== "0"
        );
      }) || buttons[0] || null;

    if (!button) return false;
    button.scrollIntoView?.({ block: "center" });
    button.click();
    return true;
  }, closeSelector).catch(() => false);

  if (!clicked) {
    console.log(`[fp-total] ⚠️ VA ${va} DETAILS sluitknop niet gevonden; probeer UITSLAGEN-ready controle`);
  }

  await sleep(700);

  const startedAt = Date.now();
  while (Date.now() - startedAt < 12000) {
    const state = await page.evaluate((requestedVa) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      if (!tab) return { ready: false, reason: "tab ontbreekt" };

      const head = [...tab.querySelectorAll(".tileHeader.enabled, .tileHeader")].find(
        (h) => String(h.innerText || "").trim().toUpperCase() === "UITSLAGEN"
      );
      const tile = head?.closest(".tile");
      if (!tile) return { ready: false, reason: "uitslagen tegel ontbreekt" };

      const r = tile.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        return { ready: false, reason: "uitslagen tegel niet zichtbaar" };
      }

      const x = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2));
      const y = Math.min(window.innerHeight - 1, Math.max(0, r.top + Math.min(r.height / 2, 30)));
      const top = document.elementFromPoint(x, y);
      const unobstructed = !!top && (top === tile || tile.contains(top));

      return {
        ready: unobstructed,
        reason: unobstructed ? "ready" : "uitslagen tegel nog bedekt",
      };
    }, va).catch(() => ({ ready: false, reason: "evaluate fout" }));

    if (state.ready) {
      console.log(`[fp-total] ✅ VA ${va} DETAILS gesloten; UITSLAGEN tegel vrij`);
      await sleep(250);
      return true;
    }

    await sleep(200);
  }

  const retried = await page.evaluate((selector) => {
    const buttons = [...document.querySelectorAll(selector)];
    const button = buttons.find((el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        st.display !== "none" &&
        st.visibility !== "hidden"
      );
    });
    if (!button) return false;
    button.click();
    return true;
  }, closeSelector).catch(() => false);

  if (retried) await sleep(800);
  console.log(`[fp-total] ⚠️ VA ${va} DETAILS sluiting niet volledig verifieerbaar; UITSLAGEN krijgt eigen retry`);
  return true;
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
    for (const p of pages) {
      await hardClosePage(p).catch(() => {});
    }
  } catch {}

  try {
    await ctx.close().catch(() => {});
  } catch {}
}

async function openTabToFighterVerified(browser, context, cookies, va, opts) {
  const {
    maxAttempts = 4,
    softWaitMs = 200,
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
      await sleep(betweenAttemptsMs);
      continue;
    }

    await sleep(softWaitMs);

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
        await sleep(500);
        const confirm = await readHeaderInfo(p);

        if (String(confirm?.gotVa || "") === requestedVa) {
          return p;
        }
      }

      await sleep(pollMs);
    }

    console.log(`[fp-total] ↪️ openTab niet op gevraagde VA na wachten ${workerLabel}`, {
      requested: requestedVa,
      gotVa: lastInfo?.gotVa ?? null,
      attempt,
      urlNow: lastUrl,
      koptekst1: lastInfo?.koptekst1 ?? "",
      waitedMs: verifyWindowMs,
    });

    await hardClosePage(p).catch(() => {});
    await sleep(betweenAttemptsMs);
  }

  return null;
}

function parseNlDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!m) return null;
  let y = m[3];
  if (y.length === 2) y = Number(y) < 30 ? `20${y}` : `19${y}`;
  return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function boolFromJaNee(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (/^(ja|yes|true|geldig|actief)\b/.test(s)) return true;
  if (/^(nee|no|false|ongeldig|inactief)\b/.test(s)) return false;
  return null;
}

function intFrom(v) {
  const m = String(v ?? "").match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

function numFrom(v) {
  const s = String(v ?? "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return s ? Number(s[0]) : null;
}

function normalizeClass(v) {
  const s = String(v ?? "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes("JEUGD") || s.includes("YOUTH") || /^J\+?$/.test(s.trim())) return "J";
  if (s.includes("A KLASSE") || s.includes("A CLASS") || /\bA\b/.test(s)) return "A";
  if (s.includes("B KLASSE") || s.includes("B CLASS") || /\bB\b/.test(s)) return "B";
  if (s.includes("C KLASSE") || s.includes("C CLASS") || /\bC\b/.test(s)) return "C";
  if (s.includes("NIEUWELING") || s.includes("NEWCOMER") || s.includes("N KLASSE") || /\bN\b/.test(s)) return "N";
  if (s.includes("R KLASSE") || s.includes("R CLASS") || /\bR\b/.test(s)) return "R";
  return null;
}

function parseTalentstatusFromNulmeting(opmerking) {
  const text = String(opmerking ?? "").replace(/\u00a0/g, " ").trim();
  const actief = /\btalent\s*status\b|\btalentstatus\b/i.test(text);
  return { actief, tekst: text || null };
}

function ageOnToday(dateValue) {
  const raw = String(dateValue ?? "").trim();
  const birth = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : new Date(raw);
  if (!raw || Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age--;
  return age >= 0 ? age : null;
}

async function syncTalentstatusVechterFromFighter(payload, results = []) {
  const talent = parseTalentstatusFromNulmeting(payload?.nulmeting_opmerking);
  if (!talent.actief) return;

  const age = ageOnToday(payload?.geboortedatum);
  const classToken = normalizeClass(payload?.nulmeting_klasse);
  const isYouth = classToken === "J" || (age !== null && age < 18);
  if (!isYouth) return;

  const va = String(payload?.va_nummer ?? "").replace(/\D/g, "");
  if (!va) return;

  const { data: existing, error: existingError } = await supabase
    .from("talentstatus_vechters")
    .select("id,opmerkingen,max_proef_partijen")
    .eq("va_nummer", va)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) {
    const autoPrefix = "Automatisch uit FightPassport nulmeting";
    const existingNote = String(existing?.opmerkingen ?? "");
    if (existingNote.startsWith(autoPrefix)) {
      const nextNote = autoPrefix;
      if (existingNote !== nextNote || Number(existing?.max_proef_partijen ?? 0) !== 3) {
        const { error: updateError } = await supabase
          .from("talentstatus_vechters")
          .update({
            opmerkingen: nextNote,
            max_proef_partijen: 3,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updateError) throw updateError;
        console.log(`[fp-total] 🏆 VA ${va} automatische talentstatus bijgewerkt`);
      }
    }
    return;
  }

  const firstGym = Array.isArray(results)
    ? String(results.find((row) => String(row?.sportschool ?? "").trim())?.sportschool ?? "").trim() || null
    : null;

  const insertRow = {
    va_nummer: va,
    naam: payload?.naam || null,
    geboortedatum: payload?.geboortedatum || null,
    geslacht: payload?.geslacht || null,
    sportschool: firstGym,
    land: "NL",
    klasse: "J+",
    talent_status: "voorlopig",
    status: "actief",
    admin_bevestigd: true,
    admin_bevestigd_op: new Date().toISOString(),
    max_proef_partijen: 3,
    is_actief: true,
    opmerkingen: "Automatisch uit FightPassport nulmeting",
  };

  const { error: insertError } = await supabase
    .from("talentstatus_vechters")
    .insert(insertRow);

  if (insertError) {
    if (String(insertError.code || "") !== "23505") throw insertError;
    return;
  }

  console.log(`[fp-total] ⭐ VA ${va} automatisch toegevoegd aan talentstatus_vechters`);
}

function isKbTb(v) {
  const s = String(v ?? "").toLowerCase();
  return s.includes("kick") || s.includes("k1") || s.includes("muay") || s.includes("thai");
}

function isMma(v) {
  return String(v ?? "").toLowerCase().includes("mma");
}

function deriveCurrentClassification(results, nulmeting) {
  const rows = Array.isArray(results) ? results : [];
  const mmaRows = rows.filter((r) => isMma(r.discipline) || /mma/i.test(String(r.klasse ?? "")));
  const kbRows = rows.filter((r) => isKbTb(r.discipline));
  let mmaLevel = null;
  if (mmaRows.some((r) => /(^|\b)(pro|professional|p)(\b|$)/i.test(String(r.klasse ?? "")))) mmaLevel = "PRO";
  else if (mmaRows.length) mmaLevel = "AMATEUR";

  const order = ["R", "N", "C", "B", "A"];
  let current = null;
  for (const r of kbRows) {
    const k = normalizeClass(r.klasse);
    if (k && k !== "J" && (!current || order.indexOf(k) > order.indexOf(current))) current = k;
  }
  if (!current) current = normalizeClass(nulmeting?.klasse);

  if (current && current !== "J") {
    const same = kbRows.filter((r) => normalizeClass(r.klasse) === current && !/demo/i.test(String(r.uitslag ?? "")));
    const total = same.length;
    const wins = same.filter((r) => /win|wint|gewonnen/i.test(String(r.uitslag ?? ""))).length;
    if (current === "R" && total >= 2) current = "N";
    else if (current === "N" && (wins >= 4 || total >= 6)) current = "C";
    else if (current === "C" && (wins >= 6 || total >= 8)) current = "B";
    else if (current === "B" && (wins >= 8 || total >= 10)) current = "A";
  }

  const nulDiscipline = String(nulmeting?.discipline ?? "");
  const primaryDiscipline = mmaRows.length && !kbRows.length ? "MMA" : kbRows.length ? "KB/TB" : isMma(nulDiscipline) ? "MMA" : isKbTb(nulDiscipline) ? "KB/TB" : null;
  return { berekende_klasse: current, mma_level: mmaLevel, primary_discipline: primaryDiscipline };
}

async function readHeaderAndSummary(page, va, opts = {}) {
  const {
    timeoutMs = 15000,
    pollMs = 250,
    reopenDetails = true,
  } = opts;

  await page.waitForSelector(".koptekst1", { timeout: 12000 }).catch(() => null);

  const startedAt = Date.now();
  let last = null;
  let reopened = false;

  while (Date.now() - startedAt < timeoutMs) {
    last = await page.evaluate((requestedVa) => {
      const k1 = document.querySelector(".koptekst1");
      const k2 = document.querySelector(".koptekst2");
      const title = String(k1?.innerText || "").trim();
      const info = String(k2?.innerText || "").trim();
      const m = title.match(/^(.+?)\s*\((\d{3,6})\)\s*$/);
      const gotVa = m?.[2] || null;
      if (!gotVa || String(gotVa) !== String(requestedVa)) return null;

      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      const detailTiles = [...(tab?.querySelectorAll('div[title="DETAILS"], .tile') || [])].filter((tile) => {
        const titleAttr = String(tile.getAttribute?.("title") || "").trim().toUpperCase();
        const header = String(tile.querySelector?.(".tileHeader")?.innerText || "").trim().toUpperCase();
        const txt = String(tile.innerText || tile.textContent || "").trim().toUpperCase();
        return titleAttr === "DETAILS" || header === "DETAILS" || txt.startsWith("DETAILS");
      });

      const detailsTile = detailTiles[0] || null;
      if (!detailsTile) {
        return {
          va_nummer: gotVa,
          naam: m?.[1]?.trim() || null,
          header_info: info,
          summary_text: "",
          fit_to_fight: false,
          heeft_startverbod: false,
          licentie: null,
          wedstrijden: null,
          gewonnen: null,
          kos: null,
          ready: false,
        };
      }

      const contentNodes = detailsTile.querySelectorAll(
        "ul.get_tile_content p, ul.get_tile_content li, ul.get_tile_content div, .get_tile_content p, .get_tile_content li, .get_tile_content div"
      );

      let text = [...contentNodes]
        .map((el) => el.innerText || el.textContent || "")
        .join("\n");

      if (!String(text || "").trim()) {
        text = detailsTile.innerText || detailsTile.textContent || "";
      }

      text = String(text || "")
        .replace(/\u00a0/g, " ")
        .replace(/\r/g, "\n")
        .trim();

      const valueAfterLabel = (labels) => {
        const escaped = labels
          .map((label) => String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|");
        const re = new RegExp(`(?:^|\\n|\\s)(?:${escaped})\\s*:?\\s*([^\\n]+)`, "i");
        return text.match(re)?.[1]?.trim() || null;
      };

      const licentie = valueAfterLabel(["Licentie", "Geldige licentie", "License"]);
      const wedstrijden = valueAfterLabel(["Wedstrijden", "Totaal wedstrijden", "Aantal wedstrijden"]);
      const gewonnen = valueAfterLabel(["Gewonnen", "Wins"]);
      const kos = valueAfterLabel(["KO's", "KOs", "KO"]);

      const ready =
        licentie !== null ||
        wedstrijden !== null ||
        gewonnen !== null ||
        /licentie/i.test(text) ||
        /wedstrijden/i.test(text) ||
        /gewonnen/i.test(text);

      return {
        va_nummer: gotVa,
        naam: m?.[1]?.trim() || null,
        header_info: info,
        summary_text: text,
        fit_to_fight: /fit\s*to\s*fight/i.test(text),
        heeft_startverbod: /startverbod/i.test(text),
        licentie,
        wedstrijden,
        gewonnen,
        kos,
        ready,
      };
    }, va).catch(() => null);

    if (last?.ready) {
      const { ready, ...summary } = last;
      return summary;
    }

    if (reopenDetails && !reopened && Date.now() - startedAt > 2500) {
      reopened = true;
      await closeAnyModal(page).catch(() => {});
      await clickTile(page, va, "DETAILS").catch(() => false);
    }

    await sleep(pollMs);
  }

  console.log(`[fp-total] ⚠️ VA ${va} summary/DETAILS niet volledig geladen`, {
    summaryText: last?.summary_text ?? null,
  });

  if (last) {
    const { ready, ...summary } = last;
    return summary;
  }

  return null;
}

async function clickTile(page, va, title) {
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(80);
  const clicked = await page.evaluate((va, title) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
    if (!tab) return false;
    const h = [...tab.querySelectorAll(".tileHeader.enabled, .tileHeader")].find(
      (x) => String(x.innerText || "").trim().toUpperCase() === title.toUpperCase()
    );
    const tile = h?.closest(".tile");
    if (!tile) return false;
    tile.click();
    return true;
  }, va, title);
  if (clicked) await sleep(700);
  return clicked;
}

async function forceExactFighterUrl(page, va, timeoutMs = 30000, signal = null) {
  const requestedVa = String(va);
  const url = fighterUrl(va);
  const wantedHash = `#va_vechter/${requestedVa}`;
  const startedAt = Date.now();
  let lastForcedAt = 0;
  let hardReloads = 0;

  while (Date.now() - startedAt < timeoutMs) {
    throwIfAborted(signal, va);
    if (await isLoginPage(page)) {
      throw new Error("LOGIN_PAGE");
    }

    const info = await readHeaderInfo(page);
    const currentHash = await page.evaluate(() => location.hash).catch(() => "");

    if (
      String(info?.gotVa || "") === requestedVa &&
      String(currentHash || "") === wantedHash
    ) {
      await sleep(500);

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

      await sleep(600);

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

        await sleep(1200);
      }
    }

    await sleep(250);
  }

  console.log(`[fp-total] ❌ VA ${va} kon niet hard op juiste fighter-url worden vastgezet`, {
    urlNow: page.url(),
    header: await readHeaderInfo(page).catch(() => null),
  });

  return false;
}

async function openDetailsLikeBundle(page, va, signal = null) {
  throwIfAborted(signal, va);
  await closeAnyModal(page).catch(() => {});

  const exactVaLoaded = await forceExactFighterUrl(page, va, 15000, signal);
  if (!exactVaLoaded) return false;

  const startedAt = Date.now();

  while (Date.now() - startedAt < 15000) {
    throwIfAborted(signal, va);
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

    if (clicked) return true;
    await sleep(100);
  }

  return false;
}

async function waitForDetailsTileContentLikeBundle(page, va, signal = null) {
  let last = null;

  for (let attempt = 1; attempt <= 60; attempt++) {
    throwIfAborted(signal, va);
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
    await sleep(100);
  }

  console.log(`[fp-total] ⚠️ VA ${va} DETAILS tegelinhoud nog niet volledig zichtbaar`, {
    raw: last?.raw ?? null,
  });

  return false;
}

async function readDetailsModal(page) {
  for (let i = 0; i < 20; i++) {
    const has = await page.$("input.dv2factemail");
    if (has) break;
    await page.evaluate(() => {
      const scrollers = [...document.querySelectorAll("div")]
        .filter((el) => el.scrollHeight > el.clientHeight + 100)
        .sort((a, b) => b.scrollHeight - a.scrollHeight);
      const s = scrollers[0];
      if (s) s.scrollTop = Math.min(s.scrollHeight, s.scrollTop + Math.max(400, s.clientHeight * 0.8));
      else window.scrollBy(0, 600);
    });
    await sleep(120);
  }

  return page.evaluate(() => {
    const visibleModal = [...document.querySelectorAll(".outer, .modal, [role=dialog]")].find((el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 300 && r.height > 200 && st.display !== "none" && st.visibility !== "hidden";
    }) || document.body;

    const text = String(visibleModal.innerText || "").replace(/\u00a0/g, " ");
    const inputs = [...visibleModal.querySelectorAll("input, select, textarea")];

    const byClass = (cls) => {
      const el = visibleModal.querySelector(cls);
      if (!el) return null;
      if (el.tagName === "SELECT") return el.options?.[el.selectedIndex]?.textContent?.trim() || el.value || null;
      return String(el.value ?? "").trim() || null;
    };

    const nul = {
      gewicht: byClass("input.dfva_nulmeting_gewicht"),
      discipline: byClass("select.dvnulmetingdisciplineoms"),
      klasse: byClass("select.dvnulmetingklasseoms"),
      totaal: byClass("input.dnva_nulmetingaantalwedstr"),
      gewonnen: byClass("input.dnva_nulmetingaantalgewonwedstr"),
      verloren: byClass("input.dnva_nulmetingaantalverlwedstr"),
      onbeslist: byClass("input.dnva_nulmetingaantalonbeslwedstr"),
      kos: byClass("input.dnva_nulmetingaantalkowedstr"),
      opmerking: byClass("textarea.dvcz_omschr2"),
    };

    const emailInputs = [...visibleModal.querySelectorAll("input.dv2factemail")];
    const email = emailInputs.map((e) => String(e.value || "").trim()).find((v) => v.includes("@")) || null;

    return {
      email,
      nulmeting: nul,
      raw_text: text.slice(0, 30000),
      field_dump: inputs.slice(0, 250).map((el) => ({
        tag: el.tagName,
        name: el.getAttribute("name"),
        id: el.id || null,
        class: el.className || null,
        value: el.tagName === "SELECT" ? el.options?.[el.selectedIndex]?.textContent?.trim() || el.value : String(el.value ?? "").trim(),
        title: el.getAttribute("title"),
      })),
    };
  });
}

function detailsScrapeSucceeded(details) {
  if (!details || typeof details !== "object") return false;

  const nul = details.nulmeting || {};
  const hasNulmeting = [
    nul.totaal,
    nul.opmerking,
    nul.klasse,
    nul.gewicht,
    nul.discipline,
    nul.gewonnen,
    nul.verloren,
    nul.onbeslist,
    nul.kos,
  ].some((v) => v !== null && v !== undefined && String(v).trim() !== "");

  const hasEmail =
    typeof details.email === "string" &&
    details.email.trim().includes("@");

  const hasMeaningfulFields =
    Array.isArray(details.field_dump) &&
    details.field_dump.some((f) => {
      const cls = String(f?.class || "").toLowerCase();
      const id = String(f?.id || "").toLowerCase();
      const name = String(f?.name || "").toLowerCase();
      const v = f?.value;

      if (v === null || v === undefined || String(v).trim() === "") return false;
      if (id === "username" || id === "password") return false;
      if (name === "login" || name === "password") return false;
      if (cls.includes("login_invoer")) return false;
      if (String(v).trim() === "overview_modal") return false;

      return (
        cls.includes("nulmeting") ||
        cls.includes("dv2factemail") ||
        cls.includes("dvcz_omschr2") ||
        /gewicht|discipline|klasse|wedstrijd|gewonnen|verloren|onbeslist|ko/i.test(`${id} ${name} ${cls}`)
      );
    });

  const text = typeof details.raw_text === "string" ? details.raw_text : "";
  const hasMeaningfulText =
    /persoonlijk/i.test(text) &&
    (/licentie\s*:/i.test(text) || /wedstrijden\s*:/i.test(text) || /gewonnen\s*:/i.test(text));

  return hasNulmeting || hasEmail || hasMeaningfulFields || hasMeaningfulText;
}

async function extractVisibleTables(page) {
  return page.evaluate(() => {
    const candidates = [...document.querySelectorAll("table")].filter((t) => {
      const r = t.getBoundingClientRect();
      const st = getComputedStyle(t);
      return r.width > 200 && r.height > 30 && st.display !== "none" && st.visibility !== "hidden";
    });

    return candidates.map((table) => {
      const rows = [...table.querySelectorAll("tr")].map((tr) => {
        const cells = [...tr.querySelectorAll("th,td")];
        const values = cells.map((c) =>
          String(c.innerText || c.textContent || "").replace(/\s+/g, " ").trim()
        );

        const rowMeta = {
          html: tr.innerHTML || "",
          images: [...tr.querySelectorAll("img")].map((img) => ({
            src: img.getAttribute("src") || "",
            alt: img.getAttribute("alt") || "",
            title: img.getAttribute("title") || "",
            className: img.className || "",
          })),
        };

        return { values, rowMeta };
      }).filter((r) => r.values.some(Boolean) || r.rowMeta.images.length);

      return rows;
    }).filter((rows) => rows.length);
  });
}

function tableToObjects(tables) {
  const out = [];
  for (const rows of tables || []) {
    if (rows.length < 2) continue;

    const headers = rows[0].values.map((h) => h.trim());

    for (const rowEntry of rows.slice(1)) {
      const row = rowEntry.values;
      if (!row.some(Boolean) && !rowEntry.rowMeta?.images?.length) continue;

      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? null; });
      obj.__row_meta = rowEntry.rowMeta || null;

      if (Object.keys(obj).length) out.push(obj);
    }
  }
  return out;
}

function rowHasKeurmerkShield(row) {
  const meta = row?.__row_meta || {};
  const html = String(meta.html || "");
  return /(?:href|xlink:href)=["'][^"']*#img_132["']/i.test(html);
}

async function scrapeTileTable(page, va, title) {
  const ok = await clickTile(page, va, title);
  if (!ok) return [];
  await sleep(400);
  const tables = await extractVisibleTables(page);
  const rows = tableToObjects(tables);
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(100);
  return rows;
}

async function readCurrentSportschool(page, va, signal = null) {
  throwIfAborted(signal, va);
  const opened = await clickTile(page, va, "SPORTSCHOLEN");
  if (!opened) throw new Error(`SPORTSCHOLEN-tegel niet gevonden voor VA ${va}`);

  await sleep(400);
  throwIfAborted(signal, va);

  const state = await page.evaluate(() => {
    const clean = (value) => String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 200 && r.height > 30 && st.display !== "none" && st.visibility !== "hidden";
    };

    const candidates = [];
    for (const table of [...document.querySelectorAll("table")].filter(visible)) {
      const rows = [...table.querySelectorAll("tr.flexlist_row, tr")]
        .filter((row) => !row.classList.contains("filler"));

      for (const row of rows) {
        const cells = [...row.querySelectorAll("td")];
        if (cells.length < 4) continue;

        const sportschool = clean(cells[1]?.textContent);
        const plaats = clean(cells[2]?.textContent);
        const land = clean(cells[cells.length - 2]?.textContent);

        if (!sportschool || !land) continue;
        if (/^organisatie\s*naam$/i.test(sportschool)) continue;
        if (/^land$/i.test(land)) continue;

        candidates.push({
          sportschool,
          plaats,
          land,
          keurmerk_schild_gevonden: /(?:href|xlink:href)=["'][^"']*#img_132["']/i.test(
            String(row.innerHTML || "")
          ),
        });
      }
    }

    return candidates.length
      ? { ok: true, ...candidates[candidates.length - 1] }
      : { ok: false };
  }).catch(() => ({ ok: false }));

  await page.keyboard.press("Escape").catch(() => {});
  await sleep(100);

  if (!state?.ok) {
    throw new Error(`Sportschooltabel niet compleet voor VA ${va}`);
  }
  return state;
}

function calculateKeurmerkOk(land, shield) {
  const normalizedLand = String(land ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (normalizedLand !== "nederland") return true;
  return shield === true;
}

async function saveAdminCurrentFighter({ va, summary, school, error_message = null }) {
  if (!ADMIN_CONTROL_MODE) return;

  const shield = typeof school?.keurmerk_schild_gevonden === "boolean"
    ? school.keurmerk_schild_gevonden
    : null;

  const { error } = await supabase
    .from("controle_fighter_actueel")
    .upsert(
      {
        matchmaking_id: ADMIN_MATCHMAKING_ID,
        controle_run_id: ADMIN_CONTROLE_RUN_ID,
        va_nummer: String(va),
        licentie_ok: boolFromJaNee(summary?.licentie),
        startverbod_actief: summary?.heeft_startverbod === true,
        keurmerk_ok: school ? calculateKeurmerkOk(school.land, shield) : null,
        sportschool: school?.sportschool ?? null,
        land: school?.land ?? null,
        keurmerk_schild_gevonden: shield,
        source: "fightpassport_live",
        checked_at: new Date().toISOString(),
        error_message,
      },
      { onConflict: "matchmaking_id,controle_run_id,va_nummer" }
    );

  if (error) {
    throw new Error(`controle_fighter_actueel opslaan mislukt voor VA ${va}: ${error.message}`);
  }
}

function val(obj, names) {
  for (const [k, v] of Object.entries(obj || {})) {
    const nk = String(k).toLowerCase().replace(/\s+/g, " ").trim();
    if (names.some((n) => nk === n || nk.includes(n))) return v || null;
  }
  return null;
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

async function openResultsTileVerified(page, va, timeoutMs = 20000, signal = null) {
  throwIfAborted(signal, va);
  await closeAnyModal(page);

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    throwIfAborted(signal, va);
    const clicked = await page.evaluate((requestedVa) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      if (!tab) return false;

      const headers = [...tab.querySelectorAll(".tileHeader.enabled")];
      const target = headers.find(
        (h) => String(h.innerText || "").trim().toUpperCase() === "UITSLAGEN"
      );

      const tile = target?.closest(".tile");
      if (!tile) return false;

      tile.scrollIntoView?.({ block: "center" });
      tile.click();
      return true;
    }, va).catch(() => false);

    if (!clicked) {
      await sleep(100);
      continue;
    }

    const found = await findResultsDownloadControl(page, 8000, signal);
    if (found) return found;

    await closeAnyModal(page).catch(() => {});
    await sleep(100);
  }

  return null;
}

async function findResultsDownloadControl(page, timeoutMs = 10000, signal = null, va = "") {
  const start = Date.now();
  const selectors = ['[title="download als excel"]', '[title*="download"][title*="excel"]'];

  while (Date.now() - start < timeoutMs) {
    throwIfAborted(signal, va);
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

            const contextText = String(
              container.innerText || document.body.innerText || ""
            )
              .replace(/\u00a0/g, " ")
              .toUpperCase();

            if (contextText.includes("LICENTIES") && !contextText.includes("UITSLAGEN")) {
              return { ok: false };
            }

            const looksLikeResults =
              contextText.includes("UITSLAGEN") ||
              (
                contextText.includes("DATUM") &&
                contextText.includes("EVENEMENT") &&
                contextText.includes("TEGENSTANDER")
              );

            return { ok: looksLikeResults };
          }, handle).catch(() => ({ ok: false }));

          if (verdict?.ok) {
            return { frame, selector, handle };
          }
        }
      }
    }

    await sleep(100);
  }

  return null;
}

function cleanupDownloadDir(dir) {
  if (!dir) return;

  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}

  try {
    const parent = path.dirname(dir);
    if (
      path.basename(parent) === "downloads" &&
      fs.existsSync(parent) &&
      fs.readdirSync(parent).length === 0
    ) {
      fs.rmdirSync(parent);
    }
  } catch {}
}

async function downloadResultsExcel(page, va, initialFound = null, signal = null) {
  throwIfAborted(signal, va);
  const dir = path.resolve(__dirname, "downloads", `${va}_${crypto.randomUUID().slice(0, 8)}`);
  fs.mkdirSync(dir, { recursive: true });

  const client = await page.target().createCDPSession();
  await client.send("Page.enable").catch(() => {});
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: dir,
  });

  const found =
    initialFound ||
    await findResultsDownloadControl(page, 8000, signal, va);

  if (!found) {
    await client.detach().catch(() => {});
    cleanupDownloadDir(dir);
    throw new Error(`UITSLAGEN downloadknop niet gevonden — VA ${va}`);
  }

  let downloadStarted = null;
  let downloadProgress = null;

  const onDownloadWillBegin = (event) => {
    downloadStarted = {
      guid: event?.guid || null,
      suggestedFilename: event?.suggestedFilename || null,
      url: event?.url || null,
      at: Date.now(),
    };
    console.log(
      `[fp-total] 🚀 VA ${va} Chrome bevestigt downloadstart: ${event?.suggestedFilename || "bestand"}`
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

  const getXlsx = () => {
    return listFiles()
      .filter((f) => f.toLowerCase().endsWith(".xlsx"))
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
      })[0] || null;
  };

  const firstStartWaitMs = Math.max(
    500,
    Number(process.env.FP_RESULTS_DOWNLOAD_START_TIMEOUT_MS ?? "2500")
  );
  const retryStartWaitMs = Math.max(
    1000,
    Number(process.env.FP_RESULTS_DOWNLOAD_RETRY_TIMEOUT_MS ?? "5000")
  );
  const completeWaitMs = Math.max(
    1000,
    Number(process.env.FP_RESULTS_DOWNLOAD_COMPLETE_TIMEOUT_MS ?? "5000")
  );

  const waitForStartOrFile = async (timeoutMs) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      throwIfAborted(signal, va);
      const candidate = getXlsx();
      if (downloadStarted || candidate) return { started: !!downloadStarted, candidate };
      await sleep(50);
    }
    return { started: !!downloadStarted, candidate: getXlsx() };
  };

  try {
    console.log(`[fp-total] ⬇️ VA ${va} UITSLAGEN downloadklik`);
    await clickDownload();

    let downloadSignal = await waitForStartOrFile(firstStartWaitMs);

    if (!downloadSignal.started && !downloadSignal.candidate) {
      console.log(
        `[fp-total] 🔁 VA ${va} geen downloadstart binnen ${firstStartWaitMs}ms; één directe herklik`
      );
      await clickDownload().catch(() => {});
      downloadSignal = await waitForStartOrFile(retryStartWaitMs);
    }

    if (!downloadSignal.started && !downloadSignal.candidate) {
      const filesNow = listFiles();
      console.log(`[fp-total] ❌ VA ${va} Chrome startte geen uitslagen-download`, {
        waitedMs: firstStartWaitMs + retryStartWaitMs,
        files: filesNow,
      });
      cleanupDownloadDir(dir);
      return null;
    }

    const completeStartedAt = Date.now();
    let loggedSeen = false;

    while (Date.now() - completeStartedAt < completeWaitMs) {
      throwIfAborted(signal, va);
      const filesNow = listFiles();
      const candidate = getXlsx();
      const stillDownloading = filesNow.some((f) => f.toLowerCase().endsWith(".crdownload"));

      if (candidate) {
        let size = 0;
        try {
          size = fs.statSync(candidate).size;
        } catch {
          size = 0;
        }

        if (!loggedSeen) {
          loggedSeen = true;
          console.log(
            `[fp-total] 📥 VA ${va} Excel gezien; direct leescontrole: ${path.basename(candidate)}`
          );
        }

        if (!stillDownloading && size > 0) {
          try {
            await readXlsxToRows(candidate, { sheetIndex: 0 });
            console.log(
              `[fp-total] ✅ VA ${va} uitslagen Excel volledig binnen (${size} bytes)`
            );
            return { file: candidate, dir };
          } catch {}
        }
      }

      if (downloadProgress?.state === "canceled") {
        console.log(`[fp-total] ❌ VA ${va} Chrome meldde download geannuleerd`, {
          guid: downloadProgress?.guid || downloadStarted?.guid || null,
        });
        cleanupDownloadDir(dir);
        return null;
      }

      await sleep(50);
    }

    console.log(`[fp-total] ❌ VA ${va} download gestart maar Excel niet tijdig leesbaar`, {
      waitedMs: completeWaitMs,
      files: listFiles(),
      progress: downloadProgress?.state || null,
    });
    cleanupDownloadDir(dir);
    return null;
  } finally {
    client.off("Page.downloadWillBegin", onDownloadWillBegin);
    client.off("Page.downloadProgress", onDownloadProgress);
    await client.detach().catch(() => {});
  }
}

async function parseResultsExcel(filePath, va) {
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
      meta: {
        ok: false,
        emptyExport: true,
        missingHeaders: missing,
        headers: headers.filter(Boolean),
      },
    };
  }

  const out = [];
  const toStr = (v) => {
    if (v == null) return null;
    const value = String(v).trim();
    return value.length ? value : null;
  };

  for (let r = 5; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const rawDate = row[idxDatum];
    if (!rawDate) continue;

    const datum = parseNlDate(rawDate);
    if (!datum) continue;

    out.push({
      va_nummer: String(va),
      datum,
      evenement: toStr(row[idxEvenement]),
      tegenstander: toStr(row[idxTegenstander]),
      sportschool: idxSportschool !== -1 ? toStr(row[idxSportschool]) : null,
      discipline: toStr(row[idxDiscipline]),
      klasse: idxKlasse !== -1 ? toStr(row[idxKlasse]) : null,
      gewicht: idxGewicht !== -1 ? toStr(row[idxGewicht]) : null,
      uitslag: toStr(row[idxUitslag]),
      raw_json: { headers, row },
      last_seen_at: new Date().toISOString(),
    });
  }

  const deduped = [
    ...new Map(
      out.map((row) => {
        const key = [
          row.va_nummer,
          row.datum,
          row.evenement,
          row.tegenstander,
          row.uitslag,
          row.discipline,
          row.klasse,
        ]
          .map((value) => String(value ?? "").replace(/\s+/g, " ").trim())
          .join("||");
        return [key, row];
      })
    ).values(),
  ];

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

async function scrapeResults(page, va, signal = null) {
  throwIfAborted(signal, va);
  if (!SCRAPE_RESULTS) {
    return { status: "skipped", rows: [], error: null, download: null };
  }

  const maxTries = Number(process.env.UITSLAGEN_TRIES ?? "1");
  let lastError = null;

  for (let attempt = 1; attempt <= maxTries; attempt++) {
    throwIfAborted(signal, va);
    let dl = null;

    try {
      const downloadControl = await openResultsTileVerified(page, va, 20000, signal);

      if (!downloadControl) {
        throw new Error(`UITSLAGEN tegel/downloadknop niet geladen — VA ${va}`);
      }

      dl = await downloadResultsExcel(page, va, downloadControl, signal);

      if (!dl) {
        console.log(`[fp-total] ❌ VA ${va} geen volledig Excel-bestand ontvangen`);
        return {
          status: "error",
          rows: [],
          error: "Uitslagenbestand niet gedownload",
          download: null,
        };
      }

      const parsed = await parseResultsExcel(dl.file, va);

      if (parsed?.meta?.ok) {
        return {
          status: parsed.rows.length ? "success" : "no_results",
          rows: parsed.rows || [],
          error: null,
          download: dl,
        };
      }

      console.log(
        `[fp-total] ℹ️ Geen uitslagen gevonden voor VA ${va} (lege export / geen kolomkoppen)`,
        {
          attempt,
          missingHeaders: parsed?.meta?.missingHeaders ?? [],
          headers: parsed?.meta?.headers ?? [],
        }
      );

      return {
        status: "no_results",
        rows: [],
        error: null,
        download: dl,
      };
    } catch (e) {
      lastError = e;
      const msg = e?.message ?? String(e);

      if (msg === "LOGIN_PAGE" || msg === "SCRAPE_ABORTED") throw e;
      if (dl?.dir) cleanupDownloadDir(dl.dir);

      if (attempt >= maxTries) {
        return {
          status: "error",
          rows: [],
          error: msg,
          download: null,
        };
      }

      console.log(
        `[fp-total] ⚠️ VA ${va} UITSLAGEN poging ${attempt}/${maxTries} mislukt:`,
        msg
      );

      await closeAnyModal(page).catch(() => {});
      await sleep(1000);
    }
  }

  return {
    status: "error",
    rows: [],
    error: lastError?.message ?? "UITSLAGEN mislukt",
    download: null,
  };
}

async function saveChildSnapshot(table, va, rows, mapper) {
  const now = new Date().toISOString();
  await supabase.from(table).delete().eq("va_nummer", String(va));
  if (!rows.length) return;
  const payload = rows.map((r) => mapper(r, now));
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw error;
}

async function saveFighter(all) {
  const now = new Date().toISOString();
  const d = all.details || {};
  const n = d.nulmeting || {};
  const headerInfo = String(all.summary.header_info || "");
  const dob = headerInfo.match(/\b\d{2}-\d{2}-\d{4}\b/)?.[0] || null;
  const gender = /\bvrouw\b/i.test(headerInfo) ? "vrouw" : /\bman\b/i.test(headerInfo) ? "man" : null;
  const classification = deriveCurrentClassification(all.results, n);
  const totalStartverbod = !!all.summary.heeft_startverbod;
  const { data: existingStatus, error: existingStatusError } = await supabase
    .from("fightpassport_fighters")
    .select("heeft_startverbod_actuele_sync,startverbod_actuele_sync_at")
    .eq("va_nummer", String(all.va))
    .maybeSingle();
  if (existingStatusError) throw existingStatusError;
  const actualSyncAt = existingStatus?.startverbod_actuele_sync_at
    ? new Date(existingStatus.startverbod_actuele_sync_at).getTime()
    : 0;
  const actualSyncIsRecent = actualSyncAt > 0 && Date.now() - actualSyncAt <= 7 * 24 * 60 * 60 * 1000;
  const effectiveStartverbod = actualSyncIsRecent
    ? existingStatus.heeft_startverbod_actuele_sync === true
    : totalStartverbod;
  const payload = {
    va_nummer: String(all.va), naam: all.summary.naam,
    geboortedatum: parseNlDate(dob), geslacht: gender, email: d.email,
    fit_to_fight: !!all.summary.fit_to_fight,
    licentie_actief: boolFromJaNee(all.summary.licentie),
    heeft_startverbod: effectiveStartverbod,
    heeft_startverbod_total: totalStartverbod,
    startverbod_total_at: now,
    startverbod_status_source: actualSyncIsRecent ? "actuele_excel_sync" : "total_profielsamenvatting",
    totaal_wedstrijden: intFrom(all.summary.wedstrijden), gewonnen: intFrom(all.summary.gewonnen), kos: intFrom(all.summary.kos),
    nulmeting_gewicht: numFrom(n.gewicht), nulmeting_discipline: n.discipline || null, nulmeting_klasse: n.klasse || null,
    nulmeting_totaal: intFrom(n.totaal), nulmeting_gewonnen: intFrom(n.gewonnen), nulmeting_verloren: intFrom(n.verloren), nulmeting_onbeslist: intFrom(n.onbeslist), nulmeting_kos: intFrom(n.kos),
    nulmeting_opmerking: n.opmerking || null,
    berekende_klasse: classification.berekende_klasse,
    mma_level: classification.mma_level,
    primary_discipline: classification.primary_discipline,
    raw_summary: all.summary, raw_details: d,
    last_seen_at: now, last_scraped_at: now, updated_at: now,
  };
  const { error } = await supabase.from("fightpassport_fighters").upsert(payload, { onConflict: "va_nummer" });
  if (error) throw error;

  await syncTalentstatusVechterFromFighter(payload, all.results);

  await saveChildSnapshot("fightpassport_startbans", all.va, all.startbans, (r, ts) => ({
    va_nummer: String(all.va), soort: val(r, ["soort"]), ingang: parseNlDate(val(r, ["ingang"])), einde: parseNlDate(val(r, ["einde"])),
    opgelegd_door: val(r, ["door"]), reden: val(r, ["reden"]), evenement: val(r, ["evenement"]), evenement_datum: parseNlDate(val(r, ["evenement datum", "datum"])),
    actief: (() => { const e = parseNlDate(val(r, ["einde"])); return !e || e >= new Date().toISOString().slice(0,10); })(), raw_json: r, last_seen_at: ts,
  }));

  await saveChildSnapshot("fightpassport_licenses", all.va, all.licenses, (r, ts) => ({
    va_nummer: String(all.va), soort: val(r, ["soort", "licentie"]), status: val(r, ["status"]), geldig_van: parseNlDate(val(r, ["van", "ingang"])), geldig_tot: parseNlDate(val(r, ["tot", "einde", "vervaldatum"])), bond: val(r, ["bond"]), raw_json: r, last_seen_at: ts,
  }));
}

async function saveResultsSnapshot(va, results) {
  const uniqueResults = [
    ...new Map(
      (results || []).map((r) => {
        const key = [
          String(va),
          r.datum || "1900-01-01",
          r.evenement || "",
          r.tegenstander || "",
          r.discipline || "",
          r.klasse || "",
          r.uitslag || "",
        ].join("||");

        return [key, r];
      })
    ).values(),
  ];

  await supabase
    .from("fightpassport_results")
    .delete()
    .eq("va_nummer", String(va));

  if (uniqueResults.length) {
    const { error: re } = await supabase
      .from("fightpassport_results")
      .insert(uniqueResults);

    if (re) throw re;
  }
}

async function scrapeOne(page, va, openFreshPage, signal = null) {
  throwIfAborted(signal, va);

  // Eén lineaire VA-flow:
  // VA -> DETAILS -> sluiten -> UITSLAGEN -> sluiten -> SPORTSCHOLEN -> sluiten -> VA-tab dicht.
  let currentPage = page;

  const summary = await readHeaderAndSummary(currentPage, va, {
    timeoutMs: 18000,
    pollMs: 250,
    reopenDetails: true,
  }).catch(() => null);

  if (!summary) {
    return {
      exists: false,
      licensed: false,
      summary: null,
      counts: { results: 0, gyms: 0, startbans: 0, licenses: 0 },
    };
  }

  const licensed = boolFromJaNee(summary.licentie) === true;
  let details = {};
  const gyms = [];
  const startbans = [];
  const licenses = [];
  let results = [];
  let resultsStatus = SCRAPE_RESULTS ? "pending" : "skipped";
  let resultsError = null;
  let resultsDownload = null;

  async function scrapeDetailsFromPage(p) {
    throwIfAborted(signal, va);
    const opened = await openDetailsLikeBundle(p, va, signal);
    if (!opened) {
      throw new Error("DETAILS: exacte VA-url/tegel niet correct geladen");
    }

    const tileReady = await waitForDetailsTileContentLikeBundle(p, va, signal);
    if (!tileReady) {
      throw new Error("DETAILS tegelinhoud niet volledig geladen");
    }

    const detailsWaitStartedAt = Date.now();
    let lastScraped = null;

    while (Date.now() - detailsWaitStartedAt < 10000) {
      throwIfAborted(signal, va);
      lastScraped = await readDetailsModal(p).catch(() => null);
      if (detailsScrapeSucceeded(lastScraped)) return lastScraped;
      await sleep(100);
    }

    throw new Error("DETAILS geopend maar inhoud onvoldoende/lege scrape");
  }

  let detailsLastError = null;
  for (let detailsAttempt = 1; detailsAttempt <= 3; detailsAttempt++) {
    throwIfAborted(signal, va);

    try {
      details = await scrapeDetailsFromPage(currentPage);
      console.log(`[fp-total] ✅ VA ${va} DETAILS gelukt (poging ${detailsAttempt})`);
      detailsLastError = null;
      break;
    } catch (e) {
      detailsLastError = e;
      console.log(
        `[fp-total] ⚠️ VA ${va} DETAILS poging ${detailsAttempt}/3 mislukt:`,
        e?.message ?? String(e)
      );

      if (detailsAttempt >= 3) break;

      await hardClosePage(currentPage).catch(() => {});
      throwIfAborted(signal, va);
      currentPage = await openFreshPage(`DETAILS poging ${detailsAttempt + 1}`, signal);
      throwIfAborted(signal, va);
      if (!currentPage) {
        detailsLastError = new Error(`DETAILS poging ${detailsAttempt + 1}: VA ${va} kon niet opnieuw worden geopend`);
        break;
      }
    }
  }

  if (detailsLastError || !detailsScrapeSucceeded(details)) {
    await hardClosePage(currentPage).catch(() => {});
    throw new Error(
      `DETAILS verplicht maar niet gelukt voor VA ${va}: ${
        detailsLastError?.message ?? "onvoldoende gegevens"
      }`
    );
  }

  throwIfAborted(signal, va);
  await closeDetailsExact(currentPage, va, signal);
  throwIfAborted(signal, va);

  if (SCRAPE_RESULTS) {
    try {
      console.log(`[fp-total] 📊 VA ${va} UITSLAGEN opent op dezelfde VA-tab`);
      const resultStep = await scrapeResults(currentPage, va, signal);
      resultsStatus = resultStep.status;
      resultsError = resultStep.error;
      results = resultStep.rows || [];
      resultsDownload = resultStep.download || null;
    } catch (e) {
      const msg = e?.message ?? String(e);
      if (msg === "LOGIN_PAGE" || msg === "SCRAPE_ABORTED") throw e;
      resultsStatus = "error";
      resultsError = msg;
      results = [];
      resultsDownload = null;
    }
  }

  if (ADMIN_CONTROL_MODE) {
    try {
      throwIfAborted(signal, va);
      await closeAnyModal(currentPage).catch(() => {});
      console.log(`[fp-total] 🏫 VA ${va} SPORTSCHOLEN opent op dezelfde VA-tab`);
      const currentSchool = await readCurrentSportschool(currentPage, va, signal);
      gyms.push(currentSchool);
      await saveAdminCurrentFighter({ va, summary, school: currentSchool });
      console.log(
        `[fp-total] ✅ VA ${va} SPORTSCHOLEN klaar: ${currentSchool.sportschool} | ${currentSchool.land} | keurmerk=${
          calculateKeurmerkOk(currentSchool.land, currentSchool.keurmerk_schild_gevonden) ? "Ja" : "Nee"
        }`
      );
    } catch (e) {
      const msg = e?.message ?? String(e);
      if (msg === "LOGIN_PAGE" || msg === "SCRAPE_ABORTED") throw e;
      await saveAdminCurrentFighter({ va, summary, school: null, error_message: msg }).catch(() => {});
      throw new Error(`SPORTSCHOLEN verplicht maar niet gelukt voor VA ${va}: ${msg}`);
    }
  }

  await hardClosePage(currentPage).catch(() => {});
  console.log(`[fp-total] 🧹 VA ${va} VA-tab gesloten na DETAILS + UITSLAGEN + SPORTSCHOLEN`);
  throwIfAborted(signal, va);

  await saveFighter({ va, summary, details, gyms, startbans, licenses, results });

  if (resultsStatus === "success" || resultsStatus === "no_results") {
    try {
      throwIfAborted(signal, va);
      await saveResultsSnapshot(va, results);

      if (resultsDownload?.dir) {
        cleanupDownloadDir(resultsDownload.dir);
        resultsDownload = null;
      }
    } catch (e) {
      console.log(
        `[fp-total] ❌ VA ${va} uitslagen DB-save mislukt; download blijft staan:`,
        resultsDownload?.file || null
      );
      throw e;
    }
  }

  return {
    exists: true,
    licensed,
    summary,
    counts: {
      results: results.length,
      gyms: gyms.length,
      startbans: startbans.length,
      licenses: licenses.length,
    },
    resultsStatus,
    resultsError,
  };
}

async function loadConfirmedDeletedVaNumbers(startVa, endVa) {
  const skipped = new Set();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("fightpassport_missing_va")
      .select("va_number")
      .eq("status", "confirmed_deleted")
      .range(from, from + pageSize - 1);

    if (error) {
      console.log(`[fp-total] ⚠️ confirmed_deleted lijst niet beschikbaar: ${error.message}`);
      return skipped;
    }

    const rows = data ?? [];
    for (const row of rows) {
      const n = Number(row.va_number);
      if (Number.isInteger(n) && n >= startVa && n <= endVa) skipped.add(String(n));
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return skipped;
}

async function registerMissingVa(va, runId, message = null) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("fightpassport_missing_va")
    .select("status,not_found_count,first_seen_at")
    .eq("va_number", String(va))
    .maybeSingle();

  const payload = {
    va_number: String(va),
    status: existing?.status === "confirmed_deleted" ? "confirmed_deleted" : "pending_review",
    first_seen_at: existing?.first_seen_at || now,
    last_seen_at: now,
    not_found_count: Number(existing?.not_found_count || 0) + 1,
    last_source: "total",
    last_run_id: runId,
    last_error_message: message,
    resolved_at: null,
    updated_at: now,
  };

  const { error } = await supabase
    .from("fightpassport_missing_va")
    .upsert(payload, { onConflict: "va_number" });

  if (error) console.log(`[fp-total] missing-va registratie fout VA ${va}: ${error.message}`);
}

async function sendVaToAiReview(va, runId, message, { profielGevonden = false, step = "pending_review" } = {}) {
  await registerMissingVa(va, runId, message);
  await upsertSyncItem(runId, va, {
    status: profielGevonden ? "skipped" : "not_found",
    profiel_gevonden: !!profielGevonden,
    error_step: step,
    error_message: `${message} Toegevoegd aan AI Controle: opnieuw proberen of nummer als verwijderd bevestigen.`,
    finished_at: new Date().toISOString(),
  });
}

async function resolveMissingVa(va, runId) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("fightpassport_missing_va")
    .update({
      status: "resolved",
      resolved_at: now,
      last_seen_at: now,
      last_source: "total",
      last_run_id: runId,
      last_error_message: null,
      updated_at: now,
    })
    .eq("va_number", String(va))
    .neq("status", "resolved");

  if (error) console.log(`[fp-total] missing-va resolve fout VA ${va}: ${error.message}`);
}

async function confirmProfileMissing(browser, context, cookies, va, label) {
  for (let retry = 1; retry <= 2; retry++) {
    await sleep(1000 * retry);
    const retryPage = await openTabToFighterVerified(browser, context, cookies, va, {
      maxAttempts: 2,
      softWaitMs: Math.min(200, Math.max(0, Number(process.env.SOFT_WAIT_MS ?? "200"))),
      betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "1200"),
      workerLabel: `[${label} ontbrekend-hercontrole ${retry}/2]`,
    });
    if (retryPage) return retryPage;
  }
  return null;
}

async function recoverDeletedRun(missingRunId) {
  if (activeRun?.id && String(activeRun.id) !== String(missingRunId)) {
    return activeRun.id;
  }

  if (recoverRunPromise) return recoverRunPromise;

  recoverRunPromise = (async () => {
    const now = new Date().toISOString();
    const previousRun = activeRun || {};
    const previousMeta = previousRun.meta || {};

    const { data, error } = await supabase
      .from("fightpassport_sync_runs")
      .insert({
        start_va: Number(previousRun.start_va ?? START_VA),
        end_va: Number(previousRun.end_va ?? END_VA),
        run_type: "full",
        status: "running",
        last_processed_va: previousRun.last_processed_va ?? null,
        processed_count: Number(previousRun.processed_count ?? 0),
        found_count: Number(previousRun.found_count ?? 0),
        licensed_count: Number(previousRun.licensed_count ?? 0),
        error_count: Number(previousRun.error_count ?? 0),
        meta: {
          ...previousMeta,
          ...BATCH_META,
          workers: WORKERS,
          pid: process.pid,
          recovered_at: now,
          recovered_from_deleted_run_id: String(missingRunId),
        },
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error || new Error(`Vervangende run voor ${missingRunId} kon niet worden aangemaakt`);
    }

    activeRun = data;
    console.log(`[fp-total] ♻️ verwijderde run ${missingRunId} hersteld als ${data.id}`);
    return data.id;
  })();

  try {
    return await recoverRunPromise;
  } finally {
    recoverRunPromise = null;
  }
}

async function upsertSyncItem(runId, va, patch) {
  const write = async (syncRunId) => {
    const payload = {
      sync_run_id: syncRunId,
      va_nummer: String(va),
      ...patch,
    };
    return supabase
      .from("fightpassport_sync_items")
      .upsert(payload, { onConflict: "sync_run_id,va_nummer" });
  };

  let effectiveRunId = activeRun?.id || runId;
  let { error } = await write(effectiveRunId);

  const isMissingRunForeignKey = error && (
    String(error.code || "") === "23503" ||
    String(error.message || "").includes("fightpassport_sync_items_sync_run_id_fkey")
  );

  if (isMissingRunForeignKey) {
    effectiveRunId = await recoverDeletedRun(effectiveRunId);
    ({ error } = await write(effectiveRunId));
  }

  if (error) console.log(`[fp-total] sync item log fout VA ${va}: ${error.message}`);
}

async function loadExistingRunItems(runId) {
  const items = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("fightpassport_sync_items")
      .select("va_nummer,status,profiel_gevonden,licentie_actief")
      .eq("sync_run_id", runId)
      .order("va_nummer", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const rows = data ?? [];
    items.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return items;
}

async function main() {
  if (!HAS_EXPLICIT_VA_LIST && (!Number.isInteger(START_VA) || !Number.isInteger(END_VA) || END_VA < START_VA)) {
    throw new Error("Ongeldig VA-bereik");
  }

  let run;
  const explicitVaNumbers = [...new Set(EXPLICIT_VA_LIST.map((value) => Number(value)))].sort((a, b) => a - b);
  let effectiveStartVa = HAS_EXPLICIT_VA_LIST ? explicitVaNumbers[0] : START_VA;
  let effectiveEndVa = HAS_EXPLICIT_VA_LIST ? explicitVaNumbers[explicitVaNumbers.length - 1] : END_VA;
  let existingItems = [];

  if (RESUME_RUN_ID) {
    const { data, error } = await supabase
      .from("fightpassport_sync_runs")
      .select("*")
      .eq("id", RESUME_RUN_ID)
      .single();

    if (error || !data) throw error || new Error(`Run ${RESUME_RUN_ID} niet gevonden`);
    if (String(data.run_type || "").toLowerCase() !== "full") {
      throw new Error("Alleen full-runs kunnen worden hervat");
    }
    if (["completed", "cancelled", "canceled"].includes(String(data.status || "").toLowerCase())) {
      throw new Error(`Run ${RESUME_RUN_ID} is al afgesloten (${data.status})`);
    }

    run = data;
    activeRun = run;
    effectiveStartVa = Number(data.start_va);
    effectiveEndVa = Number(data.end_va);
    existingItems = await loadExistingRunItems(run.id);

    const meta = { ...(data.meta || {}), ...BATCH_META, workers: WORKERS, pid: process.pid, resumed_at: new Date().toISOString() };
    const { error: resumeErr } = await supabase
      .from("fightpassport_sync_runs")
      .update({ status: "running", finished_at: null, error_message: null, meta })
      .eq("id", run.id);
    if (resumeErr) throw resumeErr;
    run.meta = meta;
    activeRun = run;

    console.log(`[fp-total] ▶️ hervat run ${run.id} voor VA ${effectiveStartVa}-${effectiveEndVa}`);
  } else {
    const { data, error } = await supabase
      .from("fightpassport_sync_runs")
      .insert({
        start_va: effectiveStartVa,
        end_va: effectiveEndVa,
        run_type: "full",
        meta: {
          ...BATCH_META,
          workers: WORKERS,
          pid: process.pid,
          cycle_started_at: new Date().toISOString(),
          run_kind: RUN_KIND,
          is_retry: IS_RETRY_RUN,
          explicit_va_list: HAS_EXPLICIT_VA_LIST ? explicitVaNumbers.map(String) : undefined,
        },
      })
      .select("*")
      .single();

    if (error) throw error;
    run = data;
    activeRun = run;
  }

  const terminalStatuses = new Set(["success", "not_found", "skipped", "error"]);
  const terminalByVa = new Map(existingItems.map((item) => [String(item.va_nummer), String(item.status || "").toLowerCase()]));

  const requestedVaNumbers = HAS_EXPLICIT_VA_LIST
    ? explicitVaNumbers
    : Array.from(
        { length: effectiveEndVa - effectiveStartVa + 1 },
        (_, index) => effectiveStartVa + index
      );

  const confirmedDeleted = await loadConfirmedDeletedVaNumbers(effectiveStartVa, effectiveEndVa);
  const vaList = [];
  let skippedConfirmedDeleted = 0;
  for (const va of requestedVaNumbers) {
    const vaString = String(va);
    const status = terminalByVa.get(vaString);
    if (terminalStatuses.has(status)) continue;
    if (confirmedDeleted.has(vaString)) {
      skippedConfirmedDeleted++;
      await upsertSyncItem(run.id, vaString, {
        status: "skipped",
        profiel_gevonden: false,
        error_step: "confirmed_deleted",
        error_message: "Handmatig bevestigd als verwijderd; niet opnieuw bevraagd.",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      });
      continue;
    }
    vaList.push(vaString);
  }

  if (skippedConfirmedDeleted) {
    console.log(`[fp-total] ⏭️ ${skippedConfirmedDeleted} handmatig bevestigde verwijderde VA-nummers overgeslagen`);
  }

  let processed = existingItems.filter((x) => terminalStatuses.has(String(x.status || "").toLowerCase())).length + skippedConfirmedDeleted;
  let found = existingItems.filter((x) => terminalStatuses.has(String(x.status || "").toLowerCase()) && x.profiel_gevonden === true).length;
  let licensed = existingItems.filter((x) => terminalStatuses.has(String(x.status || "").toLowerCase()) && x.licentie_actief === true).length;
  let errors = existingItems.filter((x) => String(x.status || "").toLowerCase() === "error").length;
  let lastProcessedVa = existingItems
    .filter((x) => terminalStatuses.has(String(x.status || "").toLowerCase()))
    .reduce((max, x) => Math.max(max, Number(x.va_nummer) || 0), 0) || null;

  if (vaList.length === 0) {
    await supabase
      .from("fightpassport_sync_runs")
      .update({
        status: "completed",
        last_processed_va: effectiveEndVa,
        processed_count: processed,
        found_count: found,
        licensed_count: licensed,
        error_count: errors,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    console.log(`[fp-total] ✅ run ${run.id} was al volledig verwerkt`);
    if (!SKIP_RUN_TERMINATOR) {
      await terminateSyncRun({ syncRunId: run.id }).catch((error) => {
        console.log(`[TERMINATOR] Fout na reeds complete run ${run.id}:`, error?.message ?? String(error));
      });
    }
    return;
  }

  let { browser, page: masterPage } = await loginFightPassport({
    freshSession: true,
    saveCookiesToDisk: false,
  });
  let browserGeneration = 1;
  let browserRestartPromise = null;

  let cookies = [];
  try {
    cookies = await masterPage.cookies();
  } catch {}

  console.log("[fp-total] ✅ Schone master-sessie gestart; workers delen browser + actuele sessiecookies");

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
      console.log(`[fp-total] 🔄 volledige browser opnieuw starten ${reason ? `(${reason})` : ""}`);

      try { await masterPage?.close(); } catch {}
      try { await browser?.close(); } catch {}

      const fresh = await loginFightPassport({
        freshSession: true,
        saveCookiesToDisk: false,
      });
      browser = fresh.browser;
      masterPage = fresh.page;

      try { cookies = await masterPage.cookies(); } catch { cookies = []; }
      browserGeneration++;

      console.log(`[fp-total] ✅ browser hersteld; generatie ${browserGeneration}`);
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
      console.log(`[fp-total] 🔁 master ensureLoggedIn(force) start ${reason ? `(${reason})` : ""}`);
      await ensureLoggedIn(masterPage, {
        force: true,
        saveCookiesToDisk: false,
        useStoredCookies: false,
      });
      try { cookies = await masterPage.cookies(); } catch {}
      console.log("[fp-total] ✅ master refreshed (cookies updated)");
      return cookies;
    })();

    try { return await masterRefreshPromise; }
    finally { masterRefreshPromise = null; }
  }

  const SCRAPE_TIMEOUT_RAW = Number(process.env.FP_TOTAL_TIMEOUT_MS ?? "120000");
  const SCRAPE_TIMEOUT_MS = Number.isFinite(SCRAPE_TIMEOUT_RAW)
    ? Math.max(30000, SCRAPE_TIMEOUT_RAW)
    : 120000;
  const STAGGER = Math.max(0, Number(process.env.STAGGER_MS ?? "450"));
  const WORKER_DRIFT_MAX_MS = Math.max(
    0,
    Number(process.env.FP_TOTAL_WORKER_DRIFT_MAX_MS ?? "250")
  );

  let idx = 0;
  let activeAttempts = 0;
  const loginRetryCounts = new Map();
  const MAX_LOGIN_RETRIES_PER_VA = Math.max(1, Number(process.env.FP_TOTAL_LOGIN_RETRIES ?? "1"));
  const transientRetryCounts = new Map();
  const MAX_TRANSIENT_RETRIES_PER_VA = Math.max(
    0,
    Number(process.env.FP_TOTAL_TRANSIENT_RETRIES ?? "1")
  );

  async function requeueTransientVa(va, label, reason) {
    const key = String(va);
    const retryNr = (transientRetryCounts.get(key) || 0) + 1;
    if (retryNr > MAX_TRANSIENT_RETRIES_PER_VA) return false;

    transientRetryCounts.set(key, retryNr);

    await upsertSyncItem(run.id, va, {
      status: "pending",
      profiel_gevonden: false,
      error_step: "temporary_retry",
      error_message:
        `Tijdelijke fout; VA achteraan opnieuw ingepland ` +
        `(poging ${retryNr + 1}/${MAX_TRANSIENT_RETRIES_PER_VA + 1}). Oorzaak: ${reason}`,
      finished_at: null,
    });

    vaList.push(key);
    console.log(
      `[fp-total] ♻️ ${label} VA ${va} achteraan opnieuw ingepland ` +
      `(verse poging ${retryNr + 1}/${MAX_TRANSIENT_RETRIES_PER_VA + 1}): ${reason}`
    );
    return true;
  }

  async function updateRunProgress(lastVa = lastProcessedVa) {
    if (lastVa != null) {
      lastProcessedVa = Math.max(
        Number(lastProcessedVa || 0),
        Number(lastVa || 0)
      );
    }

    const progressPatch = {
      status: "running",
      finished_at: null,
      last_processed_va: lastProcessedVa,
      processed_count: processed,
      found_count: found,
      licensed_count: licensed,
      error_count: errors,
    };

    Object.assign(run, progressPatch);
    activeRun = run;

    await supabase
      .from("fightpassport_sync_runs")
      .update(progressPatch)
      .eq("id", run.id);
  }

  async function workerLoop(workerIdx) {
    const workerStartDelay = workerIdx * STAGGER;
    if (workerStartDelay > 0) await sleep(workerStartDelay);

    while (!stopRequested) {
      if (idx >= vaList.length) {
        if (activeAttempts > 0) {
          await sleep(100);
          continue;
        }
        break;
      }

      const myIdx = idx++;
      if (myIdx >= vaList.length) {
        await sleep(50);
        continue;
      }

      activeAttempts++;
      const va = vaList[myIdx];
      const label = `worker${workerIdx + 1}/${WORKERS}`;
      const itemStartedAt = new Date().toISOString();
      const vaBrowserGeneration = browserGeneration;

      console.log(`[fp-total] 🤖 ${label} → VA ${va}`);
      await upsertSyncItem(run.id, va, { status: "processing", started_at: itemStartedAt, finished_at: null });

      let page = null;
      const vaPages = new Set();
      try {
        page = await openFighterPageVerified(browser, null, cookies, va, {
          maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
          softWaitMs: Math.min(200, Math.max(0, Number(process.env.SOFT_WAIT_MS ?? "200"))),
          betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "350"),
          workerLabel: `[${label}]`,
        });

        if (page) vaPages.add(page);

        if (!page) {
          page = await confirmProfileMissing(browser, null, cookies, va, label);
          if (page) vaPages.add(page);
        }

        if (!page) {
          const requeued = await requeueTransientVa(
            va,
            label,
            "fighter-url/profiel niet betrouwbaar geopend"
          );
          if (requeued) {
            console.log(`[fp-total] 🚪 ${label} VA ${va}: mislukte openpoging afgesloten; later vers opnieuw`);
            continue;
          }

          processed++;
          lastProcessedVa = Math.max(Number(lastProcessedVa || 0), Number(va));
          await sendVaToAiReview(
            va,
            run.id,
            "Na 2 volledig verse profielpogingen geen geldige fighter-header gevonden.",
            { profielGevonden: false, step: "pending_review" }
          );
          console.log(`[fp-total] 🧠 ${label} VA ${va}: na 2 pogingen naar AI Controle`);
          continue;
        }

        const openFreshPage = async (stepName = "", signal = null) => {
          throwIfAborted(signal, va);
          const freshPage = await openFighterPageVerified(browser, null, cookies, va, {
            maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "5"),
            softWaitMs: Math.min(200, Math.max(0, Number(process.env.SOFT_WAIT_MS ?? "200"))),
            betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "350"),
            workerLabel: `[${label}${stepName ? ` ${stepName}` : ""}]`,
          });
          if (signal?.aborted) {
            if (freshPage) await hardClosePage(freshPage).catch(() => {});
            throwIfAborted(signal, va);
          }
          if (freshPage) vaPages.add(freshPage);
          return freshPage;
        };

        const res = await withTimeout(
          (signal) => scrapeOne(page, va, openFreshPage, signal),
          SCRAPE_TIMEOUT_MS,
          `fp-total ${va}`,
          async () => {
            for (const p of vaPages) {
              await hardClosePage(p).catch(() => {});
            }
            page = null;
          }
        );

        if (res?.resultsStatus === "error") {
          const reason = res?.resultsError || "UITSLAGEN stap gaf error";
          const requeued = await requeueTransientVa(va, label, reason);
          if (requeued) {
            console.log(
              `[fp-total] 🚪 ${label} VA ${va}: UITSLAGEN niet goed; VA-tab is dicht en VA gaat achteraan`
            );
            continue;
          }

          processed++;
          lastProcessedVa = Math.max(Number(lastProcessedVa || 0), Number(va));
          await sendVaToAiReview(
            va,
            run.id,
            `UITSLAGEN kon na 2 verse pogingen niet betrouwbaar worden verwerkt: ${reason}`,
            { profielGevonden: true, step: "results_pending_review" }
          );
          console.log(`[fp-total] 🧠 ${label} VA ${va}: UITSLAGEN na 2 pogingen naar AI Controle`);
          continue;
        }

        loginRetryCounts.delete(String(va));
        transientRetryCounts.delete(String(va));
        processed++;
        lastProcessedVa = Math.max(Number(lastProcessedVa || 0), Number(va));
        if (res.exists) {
          found++;
          await resolveMissingVa(va, run.id);
        }
        if (res.licensed) licensed++;

        await upsertSyncItem(run.id, va, {
          status: res.exists ? "success" : "not_found",
          naam: res.summary?.naam ?? null,
          profiel_gevonden: !!res.exists,
          licentie_actief: res.exists ? !!res.licensed : null,
          heeft_startverbod: res.exists ? !!res.summary?.heeft_startverbod : null,
          results_count: res.counts?.results ?? 0,
          gyms_count: res.counts?.gyms ?? 0,
          startbans_count: res.counts?.startbans ?? 0,
          licenses_count: res.counts?.licenses ?? 0,
          finished_at: new Date().toISOString(), error_step: null, error_message: null,
        });

        console.log(`[fp-total] ✅ ${label} VA ${va}: FULLFIGHTER=${res.exists ? "success" : "not_found"} | UITSLAGEN=${res.resultsStatus || "skipped"}${res.resultsError ? ` (${res.resultsError})` : ""}${res.licensed ? " | licentie" : ""}`);
        console.log(`[fp-total] ➡️ ${label} VA ${va} volledig klaar; worker gaat zelfstandig door`);
      } catch (e) {
        const msg = e?.message ?? String(e);

        if (msg === "LOGIN_PAGE") {
          for (const p of vaPages) {
            await hardClosePage(p).catch(() => {});
          }
          page = null;

          const retryKey = String(va);
          const retryNr = (loginRetryCounts.get(retryKey) || 0) + 1;
          loginRetryCounts.set(retryKey, retryNr);

          console.log(
            `[fp-total] 🔐 ${label} LOGIN_PAGE bij VA ${va}; tab gesloten → master opnieuw inloggen ` +
            `(poging ${retryNr}/${MAX_LOGIN_RETRIES_PER_VA})`
          );

          await upsertSyncItem(run.id, va, {
            status: "pending",
            profiel_gevonden: false,
            error_step: "login_recovery",
            error_message: `Loginpagina geraakt; sessie wordt hersteld (poging ${retryNr}/${MAX_LOGIN_RETRIES_PER_VA}).`,
            finished_at: null,
          });

          try {
            await refreshMasterSessionLocked(`LOGIN_PAGE from ${label} VA ${va}`);

            if (retryNr <= MAX_LOGIN_RETRIES_PER_VA) {
              vaList.push(retryKey);
              console.log(`[fp-total] ♻️ ${label} VA ${va} opnieuw ingepland na verse login`);
            } else {
              throw new Error(`LOGIN_PAGE bleef terugkomen na ${MAX_LOGIN_RETRIES_PER_VA} herstelpogingen`);
            }
          } catch (loginError) {
            processed++;
            lastProcessedVa = Math.max(Number(lastProcessedVa || 0), Number(va));
            const loginMsg = loginError?.message ?? String(loginError);
            await sendVaToAiReview(
              va,
              run.id,
              `Login/sessie kon na 2 pogingen niet betrouwbaar worden hersteld: ${loginMsg}`,
              { profielGevonden: false, step: "login_pending_review" }
            );
            console.log(`[fp-total] 🧠 ${label} VA ${va}: login na 2 pogingen naar AI Controle`);
          }
        } else if (isBrowserConnectionError(msg)) {
          console.log(`[fp-total] 🔌 ${label} browserverbinding weg bij VA ${va}: ${msg}`);

          await upsertSyncItem(run.id, va, {
            status: "pending",
            profiel_gevonden: false,
            error_step: "browser_recovery",
            error_message: `Browserverbinding hersteld; VA opnieuw ingepland. Oorzaak: ${msg}`,
            finished_at: null,
          });

          try {
            if (vaBrowserGeneration === browserGeneration) {
              await restartBrowserLocked(`${label} VA ${va}`);
            } else {
              console.log(
                `[fp-total] ♻️ ${label} gebruikte oude browsergeneratie ${vaBrowserGeneration}; ` +
                `actuele generatie is ${browserGeneration}. Geen extra browserherstart nodig.`
              );
            }

            const requeued = await requeueTransientVa(
              va,
              label,
              `browserverbinding hersteld: ${msg}`
            );
            if (!requeued) {
              throw new Error(
                `Browserverbinding bleef fout na ${MAX_TRANSIENT_RETRIES_PER_VA + 1} verse pogingen: ${msg}`
              );
            }
          } catch (restartError) {
            processed++;
            lastProcessedVa = Math.max(Number(lastProcessedVa || 0), Number(va));
            const restartMsg = restartError?.message ?? String(restartError);
            await sendVaToAiReview(
              va,
              run.id,
              `Browserverbinding kon na 2 verse pogingen niet worden hersteld: ${restartMsg}`,
              { profielGevonden: false, step: "browser_pending_review" }
            );
            console.log(`[fp-total] 🧠 ${label} VA ${va}: browserprobleem na 2 pogingen naar AI Controle`);
          }
        } else {
          const requeued = await requeueTransientVa(va, label, msg);

          if (!requeued) {
            processed++;
            lastProcessedVa = Math.max(Number(lastProcessedVa || 0), Number(va));

            await sendVaToAiReview(
              va,
              run.id,
              `${msg} (na 2 volledig verse pogingen)`,
              {
                profielGevonden: false,
                step: String(msg).startsWith("HARD TIMEOUT") ? "timeout_pending_review" : "scrape_pending_review",
              }
            );

            console.log(`[fp-total] 🧠 ${label} VA ${va}: na 2 pogingen naar AI Controle: ${msg}`);
          }
        }
      } finally {
        try {
          for (const p of vaPages) {
            await closeAnyModal(p).catch(() => {});
            await hardClosePage(p).catch(() => {});
          }
        } catch {}

        if (processed % 10 === 0 || Number(va) === effectiveEndVa || stopRequested) {
          await updateRunProgress(va).catch((e) => console.log("[fp-total] run progress update fout:", e?.message ?? String(e)));
        }

        activeAttempts = Math.max(0, activeAttempts - 1);

        if (!stopRequested && WORKER_DRIFT_MAX_MS > 0) {
          const driftMs =
            ((workerIdx + 1) * 37 + (Number(va) % 97)) %
            (WORKER_DRIFT_MAX_MS + 1);
          if (driftMs > 0) await sleep(driftMs);
        }
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: WORKERS }, (_, i) => workerLoop(i)));
    await updateRunProgress();

    const finalSyncRunId = activeRun?.id || run.id;
    const finalItems = [];
    const finalPageSize = 1000;
    let finalFrom = 0;

    while (true) {
      const { data: pageItems, error: finalItemsError } = await supabase
        .from("fightpassport_sync_items")
        .select("va_nummer,status")
        .eq("sync_run_id", finalSyncRunId)
        .order("va_nummer", { ascending: true })
        .range(finalFrom, finalFrom + finalPageSize - 1);

      if (finalItemsError) throw finalItemsError;

      const rows = pageItems ?? [];
      finalItems.push(...rows);

      if (rows.length < finalPageSize) break;
      finalFrom += finalPageSize;
    }

    const requestedSet = new Set(requestedVaNumbers.map((v) => String(v)));
    const finalStatusByVa = new Map(
      (finalItems || [])
        .filter((item) => requestedSet.has(String(item.va_nummer)))
        .map((item) => [String(item.va_nummer), String(item.status || "").toLowerCase()])
    );

    const nonTerminalVaNumbers = requestedVaNumbers
      .map((v) => String(v))
      .filter((vaNr) => {
        const status = finalStatusByVa.get(vaNr) || "";
        return !terminalStatuses.has(status);
      });

    const allDone = nonTerminalVaNumbers.length === 0;
    const now = new Date().toISOString();

    if (!allDone) {
      console.log(
        `[fp-total] ⚠️ run kan nog niet afronden; ${nonTerminalVaNumbers.length} VA('s) niet terminaal:`,
        nonTerminalVaNumbers.slice(0, 50)
      );
    }
    const segmentStartedAt = new Date(run.meta?.resumed_at || run.meta?.cycle_started_at || run.started_at).getTime();
    const segmentEndedAt = new Date(now).getTime();
    const previousRuntimeMs = Number(run.meta?.accumulated_runtime_ms);
    const accumulatedRuntimeMs =
      (Number.isFinite(previousRuntimeMs) && previousRuntimeMs >= 0 ? previousRuntimeMs : 0) +
      (Number.isFinite(segmentStartedAt) && segmentEndedAt >= segmentStartedAt
        ? segmentEndedAt - segmentStartedAt
        : 0);
    const currentMeta = {
      ...(run.meta || {}),
      pid: null,
      accumulated_runtime_ms: accumulatedRuntimeMs,
      last_stopped_at: stopRequested ? now : undefined,
      last_stop_signal: stopSignal || undefined,
    };

    const finalPatch = allDone ? {
      status: "completed",
      last_processed_va: effectiveEndVa,
      processed_count: processed,
      found_count: found,
      licensed_count: licensed,
      error_count: errors,
      finished_at: now,
      error_message: null,
      meta: currentMeta,
    } : stopRequested ? {
      status: "paused",
      processed_count: processed,
      found_count: found,
      licensed_count: licensed,
      error_count: errors,
      finished_at: null,
      error_message: null,
      meta: currentMeta,
    } : {
      status: "failed",
      processed_count: processed,
      found_count: found,
      licensed_count: licensed,
      error_count: errors,
      finished_at: now,
      error_message:
        `Scraper beëindigd terwijl ${nonTerminalVaNumbers.length} VA('s) nog pending/processing waren: ` +
        nonTerminalVaNumbers.slice(0, 25).join(", "),
      meta: currentMeta,
    };

    await supabase
      .from("fightpassport_sync_runs")
      .update(finalPatch)
      .eq("id", run.id);

    console.log(allDone
      ? `[fp-total] ✅ volledige ronde ${run.id} afgerond`
      : stopRequested
        ? `[fp-total] ⏸️ ronde ${run.id} gepauzeerd na expliciet stopsignaal en ${processed} verwerkte VA's`
        : `[fp-total] ❌ ronde ${run.id} onverwacht beëindigd na ${processed} verwerkte VA's`);

    if (allDone && !SKIP_RUN_TERMINATOR) {
      await terminateSyncRun({ syncRunId: run.id }).catch((error) => {
        console.log(`[TERMINATOR] Fout na total run ${run.id}:`, error?.message ?? String(error));
      });
    }
  } catch (e) {
    const failedAt = new Date().toISOString();
    const segmentStartedAt = new Date(run.meta?.resumed_at || run.meta?.cycle_started_at || run.started_at).getTime();
    const failedAtMs = new Date(failedAt).getTime();
    const previousRuntimeMs = Number(run.meta?.accumulated_runtime_ms);
    const accumulatedRuntimeMs =
      (Number.isFinite(previousRuntimeMs) && previousRuntimeMs >= 0 ? previousRuntimeMs : 0) +
      (Number.isFinite(segmentStartedAt) && failedAtMs >= segmentStartedAt
        ? failedAtMs - segmentStartedAt
        : 0);
    await supabase
      .from("fightpassport_sync_runs")
      .update({
        status: "failed",
        error_message: e?.message ?? String(e),
        finished_at: failedAt,
        meta: { ...(run.meta || {}), pid: null, accumulated_runtime_ms: accumulatedRuntimeMs },
      })
      .eq("id", run.id);
    throw e;
  } finally {
    try { await masterPage.close(); } catch {}
    try { await browser.close(); } catch {}
  }
}

main().then(() => { console.log("✅ FightPassport totaal-scrape klaar"); process.exit(0); }).catch((e) => { console.error("❌ totaal-scrape mislukt", e); process.exit(1); });
