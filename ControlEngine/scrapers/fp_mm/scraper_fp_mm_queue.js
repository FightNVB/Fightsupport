// ControlEngine/scrapers/fp_bundle_officials/scraper_fp_officials_queue.js
//
// Zelfde principe als fp_total/scraper_fp_refresh_queue.js:
// - 1 queue-worker tegelijk via lock
// - oudste pending aanvraag eerst
// - ALLE pending VA's van dezelfde matchmaking_id + controle_run_id als batch
// - start 1 officials scraper voor die batch
// - daarna volgende matchmaking/controlerun
//
// Hierdoor kunnen NKF / WPKL / FOG / UMC / enz. tegelijk aanvragen,
// maar FightPassport wordt netjes achter elkaar afgewerkt.

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import supabase from "../utils/supabaseClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_TABLE = "controle_fighter_actueel_queue";
const OFFICIALS_SCRIPT = path.join(
  __dirname,
  "scraper_fp_mm.js",
);
const LOCK_FILE = path.join(
  __dirname,
  ".fp_mm_queue_worker.lock",
);

const IDLE_GRACE_MS = Math.max(
  1500,
  Number(
    process.env.FP_OFFICIALS_QUEUE_IDLE_GRACE_MS ?? "4000",
  ),
);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
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

    try {
      existingPid = Number(
        fs.readFileSync(LOCK_FILE, "utf8").trim(),
      );
    } catch {}

    if (processExists(existingPid)) {
      console.log(
        `[fp-mm-queue] worker draait al met PID ${existingPid}; deze launcher stopt.`,
      );
      return false;
    }

    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {}

    const fd = fs.openSync(LOCK_FILE, "wx");
    fs.writeFileSync(fd, String(process.pid), "utf8");
    fs.closeSync(fd);
    return true;
  }
}

function releaseLock() {
  try {
    const current = Number(
      fs.readFileSync(LOCK_FILE, "utf8").trim(),
    );

    if (current === process.pid) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {}
}

function cleanVa(raw) {
  const va = String(raw ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(va) ? va : null;
}

async function findOldestPending() {
  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .select(
      "id,matchmaking_id,controle_run_id,va_nummer,created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

async function claimBatch(seed) {
  if (!seed?.matchmaking_id || !seed?.controle_run_id) {
    return null;
  }

  const { data: pending, error } = await supabase
    .from(QUEUE_TABLE)
    .select(
      "id,matchmaking_id,controle_run_id,va_nummer,created_at",
    )
    .eq("status", "pending")
    .eq("matchmaking_id", seed.matchmaking_id)
    .eq("controle_run_id", seed.controle_run_id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const valid = (pending ?? [])
    .map((row) => ({
      ...row,
      va: cleanVa(row.va_nummer),
    }))
    .filter((row) => row.va);

  if (!valid.length) return null;

  const ids = valid.map((row) => row.id);

  const { data: claimed, error: claimError } = await supabase
    .from(QUEUE_TABLE)
    .update({
      status: "processing",
      claimed_at: new Date().toISOString(),
      finished_at: null,
      error_message: null,
    })
    .in("id", ids)
    .eq("status", "pending")
    .select(
      "id,matchmaking_id,controle_run_id,va_nummer",
    );

  if (claimError) throw claimError;

  const rows = (claimed ?? []).map((row) => ({
    ...row,
    va: cleanVa(row.va_nummer),
  }));

  if (!rows.length) return null;

  return {
    matchmaking_id: String(rows[0].matchmaking_id),
    controle_run_id: String(rows[0].controle_run_id),
    rows,
    va_numbers: [
      ...new Set(rows.map((row) => row.va).filter(Boolean)),
    ],
  };
}

function splitIntoLanes(values, lanes = 3) {
  const out = Array.from({ length: lanes }, () => []);
  values.forEach((value, index) => out[index % lanes].push(value));
  return out.filter((lane) => lane.length > 0);
}

function runOfficialsLane(batch, vaNumbers, laneIndex, laneCount) {
  return new Promise((resolve, reject) => {
    console.log(
      `[fp-mm-queue] ▶ lane ${laneIndex + 1}/${laneCount} ${batch.matchmaking_id} / ${batch.controle_run_id}: ${vaNumbers.length} VA's · 8 workers`,
    );

    const child = spawn(
      process.execPath,
      [
        OFFICIALS_SCRIPT,
        batch.matchmaking_id,
        batch.controle_run_id,
        ...vaNumbers,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        cwd: __dirname,
        windowsHide: true,
        env: {
          ...process.env,
          FP_SESSION_MODE: "master",
          FP_MATCHMAKER_ID: "",
          HEADLESS: process.env.HEADLESS ?? "false",
          PUPPETEER_HEADLESS:
            process.env.PUPPETEER_HEADLESS ??
            process.env.HEADLESS ??
            "false",
          // Eindcontrole draait bewust als 3 parallelle scraperprocessen × 8 workers.
          FP_OFFICIALS_WORKERS: "8",
          WORKERS: "8",
          STAGGER_MS: process.env.STAGGER_MS ?? "250",
          TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "5",
          SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "200",
          BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "350",
          FP_OFFICIALS_TIMEOUT_MS:
            process.env.FP_OFFICIALS_TIMEOUT_MS ?? "45000",
          FP_OFFICIALS_ALLOW_INCOMPLETE_EXIT: "1",
          FP_MM_LANE: String(laneIndex + 1),
          FP_MM_LANES: String(laneCount),
        },
      },
    );

    child.stdout?.on("data", (data) => {
      process.stdout.write(
        `[fp-mm ${laneIndex + 1}/${laneCount}] ${data.toString()}`,
      );
    });

    child.stderr?.on("data", (data) => {
      process.stderr.write(
        `[fp-mm ${laneIndex + 1}/${laneCount}] ${data.toString()}`,
      );
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(
        new Error(
          `fp_mm lane ${laneIndex + 1}/${laneCount} stopte met exitcode ${code}`,
        ),
      );
    });
  });
}

async function runOfficialsBatch(batch) {
  const lanes = splitIntoLanes(batch.va_numbers, 3);
  console.log(
    `[fp-mm-queue] 🚀 3x8 modus: ${batch.va_numbers.length} VA's verdeeld over ${lanes.length} parallelle lanes`,
  );
  await Promise.all(
    lanes.map((vaNumbers, laneIndex) =>
      runOfficialsLane(batch, vaNumbers, laneIndex, lanes.length),
    ),
  );
}

async function finishBatch(batch, status, message = null) {
  const ids = batch.rows.map((row) => row.id);

  const { error } = await supabase
    .from(QUEUE_TABLE)
    .update({
      status,
      finished_at: new Date().toISOString(),
      error_message: message,
    })
    .in("id", ids);

  if (error) throw error;
}

async function processBatch(batch) {
  try {
    await runOfficialsBatch(batch);

    const { data: results, error } = await supabase
      .from("controle_fighter_actueel")
      .select(
        "va_nummer,licentie_ok,startverbod_actief,keurmerk_ok,error_message",
      )
      .eq("matchmaking_id", batch.matchmaking_id)
      .eq("controle_run_id", batch.controle_run_id)
      .in("va_nummer", batch.va_numbers);

    if (error) throw error;

    const byVa = new Map(
      (results ?? []).map((row) => [
        String(row.va_nummer),
        row,
      ]),
    );

    const failedRows = batch.rows.filter((queueRow) => {
      const result = byVa.get(String(queueRow.va));

      return (
        !result ||
        result.error_message ||
        typeof result.licentie_ok !== "boolean" ||
        typeof result.startverbod_actief !== "boolean" ||
        typeof result.keurmerk_ok !== "boolean"
      );
    });

    if (failedRows.length) {
      const failedIds = failedRows.map((row) => row.id);
      const doneIds = batch.rows
        .filter((row) => !failedIds.includes(row.id))
        .map((row) => row.id);

      if (doneIds.length) {
        await supabase
          .from(QUEUE_TABLE)
          .update({
            status: "done",
            finished_at: new Date().toISOString(),
            error_message: null,
          })
          .in("id", doneIds);
      }

      await supabase
        .from(QUEUE_TABLE)
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_message:
            "Geen complete actuele FightPassport-check voor deze VA.",
        })
        .in("id", failedIds);

      throw new Error(
        `${failedRows.length}/${batch.rows.length} queue-items mislukt.`,
      );
    }

    await finishBatch(batch, "done", null);

    console.log(
      `[fp-mm-queue] ✅ batch klaar: ${batch.rows.length} items`,
    );
  } catch (error) {
    const message = error?.message ?? String(error);

    await finishBatch(batch, "error", message).catch(
      () => {},
    );

    console.error(
      `[fp-mm-queue] ❌ batch ${batch.matchmaking_id}: ${message}`,
    );
  }
}

async function main() {
  if (!acquireLock()) return;

  const cleanup = () => releaseLock();

  process.on("exit", cleanup);
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });

  console.log(
    `[fp-mm-queue] 🧵 queue-worker actief PID ${process.pid}`,
  );

  try {
    let emptySince = null;

    while (true) {
      const seed = await findOldestPending();

      if (seed) {
        emptySince = null;

        const batch = await claimBatch(seed);

        if (batch) {
          await processBatch(batch);
        }

        continue;
      }

      if (emptySince == null) {
        emptySince = Date.now();
      }

      if (Date.now() - emptySince < IDLE_GRACE_MS) {
        await sleep(500);
        continue;
      }

      const finalSeed = await findOldestPending();

      if (finalSeed) {
        emptySince = null;

        const batch = await claimBatch(finalSeed);
        if (batch) await processBatch(batch);

        continue;
      }

      break;
    }
  } finally {
    releaseLock();

    console.log(
      "[fp-mm-queue] 🏁 queue leeg; worker afgesloten",
    );
  }
}

main().catch((error) => {
  console.error(
    "[fp-mm-queue] fatale fout:",
    error,
  );
  releaseLock();
  process.exit(1);
});
