import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import supabase from "../utils/supabaseClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_TABLE = "fightpassport_refresh_queue";
const TOTAL_SCRIPT = path.join(__dirname, "scraper_fp_total.js");
const LOCK_FILE = path.join(__dirname, ".fp_refresh_queue_worker.lock");
const IDLE_GRACE_MS = Math.max(
  1500,
  Number(process.env.FP_REFRESH_WORKER_IDLE_GRACE_MS ?? "4000"),
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resolveInternalBaseUrl() {
  return String(
    process.env.FIGHTSUPPORT_INTERNAL_URL ||
      process.env.INTERNAL_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "",
  )
    .trim()
    .replace(/\/$/, "");
}

function resolveTerminatorToken() {
  return String(
    process.env.TERMINATOR_INTERNAL_TOKEN ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "",
  ).trim();
}

async function terminateVaNumbers({ vaNumbers }) {
  const baseUrl = resolveInternalBaseUrl();
  const token = resolveTerminatorToken();
  const cleaned = [
    ...new Set(
      (Array.isArray(vaNumbers) ? vaNumbers : [])
        .map((value) => String(value ?? "").replace(/\D/g, ""))
        .filter(Boolean),
    ),
  ];

  if (!baseUrl) {
    throw new Error(
      "Terminator URL ontbreekt voor de FightPassport update-worker.",
    );
  }
  if (!token) {
    throw new Error(
      "Terminator interne sleutel ontbreekt voor de FightPassport update-worker.",
    );
  }
  if (!cleaned.length) {
    throw new Error("Geen VA-nummers opgegeven voor Terminator.");
  }

  console.log(
    `[fp-refresh-worker] [TERMINATOR] rebuild voor VA ${cleaned.join(", ")}`,
  );

  const response = await fetch(`${baseUrl}/api/admin/terminator/run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-terminator-source": "fp-refresh-queue",
    },
    body: JSON.stringify({ va_numbers: cleaned }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error || `Terminator HTTP ${response.status}`,
    );
  }

  return payload;
}

function cleanVa(raw) {
  const va = String(raw ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(va) ? va : null;
}

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
      existingPid = Number(fs.readFileSync(LOCK_FILE, "utf8").trim());
    } catch {}

    if (processExists(existingPid)) {
      console.log(
        `[fp-refresh-worker] extra worker draait al met PID ${existingPid}; deze launcher stopt.`,
      );
      return false;
    }

    // Stale lock na crash/reboot.
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
    const current = Number(fs.readFileSync(LOCK_FILE, "utf8").trim());
    if (current === process.pid) fs.unlinkSync(LOCK_FILE);
  } catch {}
}

async function claimNext() {
  const { data: rows, error } = await supabase
    .from(QUEUE_TABLE)
    .select("id,va_nummer,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;

  const row = rows?.[0];
  if (!row?.id) return null;

  const va = cleanVa(row.va_nummer);
  if (!va) {
    await supabase
      .from(QUEUE_TABLE)
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: "Ongeldig VA-nummer in updatewachtrij.",
      })
      .eq("id", row.id);
    return null;
  }

  const { data: claimed, error: claimError } = await supabase
    .from(QUEUE_TABLE)
    .update({
      status: "processing",
      claimed_at: new Date().toISOString(),
      finished_at: null,
      error_message: null,
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id,va_nummer")
    .maybeSingle();

  if (claimError) throw claimError;
  return claimed?.id ? { id: claimed.id, va } : null;
}

function runTotalForVa(va) {
  return new Promise((resolve, reject) => {
    console.log(`[fp-refresh-worker] ▶ extra worker start VA ${va}`);

    const child = spawn(process.execPath, [TOTAL_SCRIPT, va, va], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: __dirname,
      windowsHide: true,
      env: {
        ...process.env,
        FP_TOTAL_VA_LIST: va,
        FP_TOTAL_RUN_KIND: "retry",
        FP_TOTAL_START_VA: va,
        FP_TOTAL_END_VA: va,
        FP_TOTAL_BATCH_START_VA: va,
        FP_TOTAL_BATCH_END_VA: va,
        FP_TOTAL_WORKERS: "1",
        WORKERS: "1",
        STAGGER_MS: "0",
        FP_TOTAL_RESULTS: "true",

        // De queue-worker draait Terminator zelf expliciet per VA.
        FP_SKIP_RUN_TERMINATOR: "true",

        FP_MATCHMAKER_ID: "",
        FP_SESSION_MODE: "master",
        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS:
          process.env.PUPPETEER_HEADLESS ??
          process.env.HEADLESS ??
          "false",
      },
    });

    child.stdout?.on("data", (data) => {
      process.stdout.write(`[fp-refresh VA ${va}] ${data.toString()}`);
    });

    child.stderr?.on("data", (data) => {
      process.stderr.write(`[fp-refresh VA ${va}] ${data.toString()}`);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Total scraper voor VA ${va} stopte met exit code ${code}`));
    });
  });
}

async function latestRetryRunForVa(va) {
  const { data, error } = await supabase
    .from("fightpassport_sync_runs")
    .select("id,status,started_at,finished_at,error_message")
    .eq("run_kind", "retry")
    .lte("start_va", Number(va))
    .gte("end_va", Number(va))
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Sommige installaties hebben run_kind alleen in meta.
    const { data: fallback, error: fallbackError } = await supabase
      .from("fightpassport_sync_runs")
      .select("id,status,started_at,finished_at,error_message")
      .lte("start_va", Number(va))
      .gte("end_va", Number(va))
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return fallback ?? null;
  }

  return data ?? null;
}

async function finishItem(item, status, errorMessage = null, syncRunId = null) {
  const { error } = await supabase
    .from(QUEUE_TABLE)
    .update({
      status,
      finished_at: new Date().toISOString(),
      error_message: errorMessage,
      sync_run_id: syncRunId,
    })
    .eq("id", item.id);

  if (error) throw error;
}

async function processItem(item) {
  try {
    await runTotalForVa(item.va);

    const run = await latestRetryRunForVa(item.va);
    if (!run?.id || String(run.status || "").toLowerCase() !== "completed") {
      throw new Error(
        run?.error_message ||
          `Geen afgeronde retry-run gevonden voor VA ${item.va}.`,
      );
    }

    // Expliciet alleen deze VA herbouwen: fightercontexten + eventuele bouts/matches.
    const terminator = await terminateVaNumbers({ vaNumbers: [item.va] });

    await finishItem(item, "done", null, run.id);

    console.log(
      `[fp-refresh-worker] ✅ VA ${item.va} klaar; Terminator: ` +
        `${terminator?.fighter_contexts || 0} fightercontext(en), ` +
        `${terminator?.bouts || 0} wedstrijd(en) rebuilt`,
    );
  } catch (error) {
    const message = error?.message ?? String(error);
    await finishItem(item, "error", message, null).catch(() => {});
    console.log(`[fp-refresh-worker] ❌ VA ${item.va}: ${message}`);
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
    `[fp-refresh-worker] 🧵 extra FightPassport update-worker actief (PID ${process.pid})`,
  );

  try {
    let emptySince = null;

    while (true) {
      const item = await claimNext();

      if (item) {
        emptySince = null;
        await processItem(item);
        continue;
      }

      if (emptySince == null) emptySince = Date.now();

      // Kleine grace zodat verzoeken die vlak na elkaar binnenkomen
      // door dezelfde extra worker worden meegenomen.
      if (Date.now() - emptySince < IDLE_GRACE_MS) {
        await sleep(500);
        continue;
      }

      // Laatste check vóór afsluiten.
      const finalItem = await claimNext();
      if (finalItem) {
        emptySince = null;
        await processItem(finalItem);
        continue;
      }

      break;
    }
  } finally {
    releaseLock();
    console.log("[fp-refresh-worker] 🏁 wachtrij leeg; extra worker afgesloten");
  }
}

main().catch((error) => {
  console.error("[fp-refresh-worker] fatale fout:", error);
  releaseLock();
  process.exit(1);
});
