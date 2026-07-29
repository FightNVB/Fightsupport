#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCK_PATH = path.join(os.tmpdir(), "fightsupport-fp-retry-queue.lock");
const scraperPath = path.join(__dirname, "scraper_fp_total.js");
const PARALLEL_WORKERS = Math.max(1, Number.parseInt(process.env.FP_RETRY_WORKERS || "8", 10) || 8);

function supabaseConfig() {
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (!url || !key) throw new Error("Supabase URL of service-role key ontbreekt.");
  return { url, key };
}

async function rest(pathname, init = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return json;
}

async function loadQueuedItems() {
  const rows = await rest(
    "fightpassport_missing_va?select=id,va_number,status&status=eq.retry_requested&order=updated_at.asc",
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows : [];
}

async function claimItem(item) {
  const rows = await rest(
    `fightpassport_missing_va?id=eq.${encodeURIComponent(item.id)}&status=eq.retry_requested`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "pending_review",
        updated_at: new Date().toISOString(),
      }),
    }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function claimQueuedItems() {
  const queued = await loadQueuedItems();
  const claimed = [];
  for (const item of queued) {
    if (await claimItem(item)) claimed.push(item);
  }
  return claimed;
}

function runTotalScraper(items) {
  return new Promise((resolve) => {
    const vaNumbers = items.map((item) => String(item.va_number));
    const numeric = vaNumbers.map(Number).filter(Number.isFinite);
    const startVa = Math.min(...numeric);
    const endVa = Math.max(...numeric);

    const child = spawn(process.execPath, [scraperPath, String(startVa), String(endVa)], {
      cwd: __dirname,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        FP_MATCHMAKER_ID: "",
        FP_SESSION_MODE: "master",
        FP_TOTAL_RUN_KIND: "retry",
        FP_TOTAL_VA_LIST: vaNumbers.join(","),
        HEADLESS: process.env.HEADLESS ?? "true",
        PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "true",
        WORKERS: String(PARALLEL_WORKERS),
        FP_TOTAL_WORKERS: String(PARALLEL_WORKERS),
        STAGGER_MS: process.env.STAGGER_MS ?? "2500",
        TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "5",
        SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "2500",
        BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "1200",
        FP_TOTAL_TIMEOUT_MS: process.env.FP_TOTAL_TIMEOUT_MS ?? "480000",
        FP_TOTAL_RESULTS: "true",
      },
    });

    child.stdout?.on("data", (chunk) => {
      const text = String(chunk).trimEnd();
      if (text) console.log(`[fp-retry-total] ${text}`);
    });
    child.stderr?.on("data", (chunk) => {
      const text = String(chunk).trimEnd();
      if (text) console.error(`[fp-retry-total][stderr] ${text}`);
    });
    child.on("error", (error) => {
      console.error("[fp-retry-total] startfout", error);
      resolve({ code: -1, signal: null });
    });
    child.on("close", (code, signal) => resolve({ code: code ?? -1, signal }));
  });
}

async function fighterExists(vaNumber) {
  const rows = await rest(
    `fightpassport_fighters?select=va_nummer&va_nummer=eq.${encodeURIComponent(vaNumber)}&limit=1`,
    { method: "GET" }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function finishItem(item, found) {
  const now = new Date().toISOString();
  await rest(`fightpassport_missing_va?id=eq.${encodeURIComponent(item.id)}`, {
    method: "PATCH",
    body: JSON.stringify(
      found
        ? { status: "resolved", resolved_at: now, updated_at: now }
        : { status: "pending_review", resolved_at: null, updated_at: now }
    ),
  });
}

function readLock() {
  try {
    const raw = fs.readFileSync(LOCK_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const pid = Number(parsed?.pid);
    return Number.isInteger(pid) && pid > 0 ? { ...parsed, pid } : null;
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    console.warn("[fp-retry-queue] Ongeldig lockbestand; wordt als stale behandeld.", error);
    return null;
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && error.code === "ESRCH") return false;
    if (error && error.code === "EPERM") return true;
    return false;
  }
}

function writeLock() {
  const fd = fs.openSync(LOCK_PATH, "wx");
  try {
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
  } finally {
    fs.closeSync(fd);
  }
}

function acquireLock() {
  try {
    writeLock();
    return true;
  } catch (error) {
    if (!error || error.code !== "EEXIST") throw error;
  }

  const existingLock = readLock();
  if (existingLock && isProcessAlive(existingLock.pid)) {
    console.log(`[fp-retry-queue] Actieve retry-run gevonden (pid ${existingLock.pid}).`);
    return false;
  }

  console.warn("[fp-retry-queue] Achtergebleven lockbestand gevonden; lock wordt hersteld.");
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  try {
    writeLock();
    return true;
  } catch (error) {
    if (error && error.code === "EEXIST") return false;
    throw error;
  }
}

function releaseLock() {
  try {
    const lock = readLock();
    if (lock && lock.pid !== process.pid) return;
    fs.unlinkSync(LOCK_PATH);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      console.error("[fp-retry-queue] lock verwijderen mislukt", error);
    }
  }
}

async function main() {
  if (!fs.existsSync(scraperPath)) throw new Error(`Total scraper niet gevonden: ${scraperPath}`);
  if (!acquireLock()) {
    console.log("[fp-retry-queue] Er draait al een retry-run; dit proces stopt.");
    return;
  }

  try {
    const items = await claimQueuedItems();
    if (!items.length) {
      console.log("[fp-retry-queue] Geen retry_requested VA-nummers gevonden.");
      return;
    }

    console.log(
      `[fp-retry-queue] Eén total-scraper gestart voor ${items.length} VA-nummers met ${PARALLEL_WORKERS} workers.`
    );

    const result = await runTotalScraper(items);
    console.log("[fp-retry-queue] Total-scraper afgerond.", result);

    for (const item of items) {
      const vaNumber = String(item.va_number);
      const found = await fighterExists(vaNumber).catch((error) => {
        console.error(`[fp-retry-queue VA ${vaNumber}] databasecontrole mislukt`, error);
        return false;
      });
      await finishItem(item, found);
      console.log(`[fp-retry-queue] VA ${vaNumber} bijgewerkt.`, { found });
    }
  } finally {
    releaseLock();
  }

  console.log("[fp-retry-queue] Retry-run gestopt.");
}

main().catch((error) => {
  releaseLock();
  console.error("[fp-retry-queue] Fatale fout", error);
  process.exitCode = 1;
});
