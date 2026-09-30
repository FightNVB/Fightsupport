import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import supabase from "../utils/supabaseClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUEUE_TABLE = "fightpassport_email_queue";
const WRITER_SCRIPT = path.join(__dirname, "scraper_fp_email_writer.js");
const LOCK_FILE = path.join(__dirname, ".fp_email_queue_worker.lock");
const IDLE_GRACE_MS = Math.max(1500, Number(process.env.FP_EMAIL_QUEUE_IDLE_GRACE_MS ?? "4000"));
const LANES = Math.max(1, Math.min(3, Number(process.env.FP_EMAIL_QUEUE_LANES ?? "3")));
const BATCH_SIZE = Math.max(LANES, Number(process.env.FP_EMAIL_QUEUE_BATCH_SIZE ?? "24"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function acquireLock() {
  try {
    const fd = fs.openSync(LOCK_FILE, "wx");
    fs.writeFileSync(fd, String(process.pid), "utf8");
    fs.closeSync(fd);
    return true;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    let existingPid = null;
    try { existingPid = Number(fs.readFileSync(LOCK_FILE, "utf8").trim()); } catch {}
    if (processExists(existingPid)) {
      console.log(`[fp-email-queue] worker draait al met PID ${existingPid}; deze launcher stopt.`);
      return false;
    }
    try { fs.unlinkSync(LOCK_FILE); } catch {}
    const fd = fs.openSync(LOCK_FILE, "wx");
    fs.writeFileSync(fd, String(process.pid), "utf8");
    fs.closeSync(fd);
    return true;
  }
}

function releaseLock() {
  try {
    const current = Number(fs.readFileSync(LOCK_FILE, "utf8").trim());
    if (current === process.pid) fs.unlinkSync(LOCK_FILE);
  } catch {}
}

function cleanVa(raw) {
  const va = String(raw ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(va) ? va : null;
}

async function claimBatch() {
  const { data: pending, error } = await supabase
    .from(QUEUE_TABLE)
    .select("id,va_nummer,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw error;
  if (!pending?.length) return [];

  const valid = [];
  for (const row of pending) {
    const va = cleanVa(row.va_nummer);
    if (!va) {
      await supabase.from(QUEUE_TABLE).update({
        status: "error", finished_at: new Date().toISOString(), error_message: "Ongeldig VA-nummer."
      }).eq("id", row.id);
    } else valid.push({ ...row, va });
  }
  if (!valid.length) return [];

  const ids = valid.map((row) => row.id);
  const { data: claimed, error: claimError } = await supabase
    .from(QUEUE_TABLE)
    .update({ status: "processing", claimed_at: new Date().toISOString(), finished_at: null, error_message: null })
    .in("id", ids)
    .eq("status", "pending")
    .select("id,va_nummer");
  if (claimError) throw claimError;
  return (claimed ?? []).map((row) => ({ ...row, va: cleanVa(row.va_nummer) })).filter((row) => row.va);
}

function splitIntoLanes(rows, laneCount) {
  const lanes = Array.from({ length: laneCount }, () => []);
  rows.forEach((row, index) => lanes[index % laneCount].push(row));
  return lanes.filter((lane) => lane.length);
}

function runWriterLane(rows, laneIndex, laneCount) {
  return new Promise((resolve) => {
    const vas = rows.map((row) => row.va);
    console.log(`[fp-email-queue] ▶ lane ${laneIndex + 1}/${laneCount}: ${vas.length} VA's`);
    const child = spawn(process.execPath, [WRITER_SCRIPT, ...vas], {
      stdio: ["ignore", "pipe", "pipe"], shell: false, cwd: __dirname, windowsHide: true,
      env: {
        ...process.env,
        FP_SESSION_MODE: "master",
        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
        TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "5",
        SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "200",
        BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "350",
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => { const s=data.toString(); stdout+=s; process.stdout.write(`[fp-email ${laneIndex + 1}/${laneCount}] ${s}`); });
    child.stderr?.on("data", (data) => { const s=data.toString(); stderr+=s; process.stderr.write(`[fp-email ${laneIndex + 1}/${laneCount}] ${s}`); });
    child.on("error", (error) => resolve(rows.map((row) => ({ va: row.va, ok: false, error: error?.message ?? String(error) }))));
    child.on("close", (code) => {
      const match = stdout.match(/EMAIL_WRITER_RESULT=(\{.*\})/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed?.results)) return resolve(parsed.results);
        } catch {}
      }
      const message = stderr.trim() || `E-mailwriter stopte met exitcode ${code}`;
      resolve(rows.map((row) => ({ va: row.va, ok: false, error: message })));
    });
  });
}

async function finishRows(rows, results) {
  const byVa = new Map(results.map((result) => [String(result.va), result]));
  for (const row of rows) {
    const result = byVa.get(String(row.va));
    const ok = Boolean(result?.ok);
    const { error } = await supabase.from(QUEUE_TABLE).update({
      status: ok ? "done" : "error",
      finished_at: new Date().toISOString(),
      error_message: ok ? null : (result?.error || "E-mailcorrectie mislukt."),
    }).eq("id", row.id);
    if (error) throw error;
  }
}

async function processBatch(rows) {
  const lanes = splitIntoLanes(rows, Math.min(LANES, rows.length));
  const laneResults = await Promise.all(lanes.map((lane, index) => runWriterLane(lane, index, lanes.length)));
  const results = laneResults.flat();
  await finishRows(rows, results);
  const failed = results.filter((result) => !result.ok).length;
  console.log(`[fp-email-queue] batch klaar: ${rows.length - failed} goed, ${failed} fout`);
}

async function main() {
  if (!acquireLock()) return;
  const cleanup = () => releaseLock();
  process.on("exit", cleanup);
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  console.log(`[fp-email-queue] 🧵 worker actief PID ${process.pid}; max ${LANES} parallelle writers`);
  try {
    let emptySince = null;
    while (true) {
      const rows = await claimBatch();
      if (rows.length) {
        emptySince = null;
        await processBatch(rows);
        continue;
      }
      if (emptySince == null) emptySince = Date.now();
      if (Date.now() - emptySince < IDLE_GRACE_MS) { await sleep(500); continue; }
      const finalRows = await claimBatch();
      if (finalRows.length) { emptySince = null; await processBatch(finalRows); continue; }
      break;
    }
  } finally {
    releaseLock();
    console.log("[fp-email-queue] 🏁 queue leeg; worker afgesloten");
  }
}

main().catch((error) => {
  console.error("[fp-email-queue] fatale fout:", error);
  releaseLock();
  process.exit(1);
});
