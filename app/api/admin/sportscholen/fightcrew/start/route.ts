// app/api/admin/sportscholen/fightcrew/start/route.ts

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeKey(raw: unknown) {
  const key = String(raw ?? "").trim().replace(/\D/g, "").replace(/^0+/, "");
  return key || null;
}

function bearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
}

function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (env) return env;
  throw new Error("NEXT_PUBLIC_SUPABASE_URL ontbreekt");
}

function getAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreekt");
  return key;
}

function getServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt");
  return key;
}

function logLine(_file: string, line: string) {
  // Alleen terminal logging. Geen .fightsupport-logs map en geen logbestanden meer.
  console.log(`[${new Date().toISOString()}] ${line}`);
}

function findScraperPath() {
  const candidates = [
    path.join(process.cwd(), "control-engine", "scrapers", "team", "scraper_team.js"),
    path.join(process.cwd(), "ControlEngine", "scrapers", "team", "scraper_team.js"),
    path.join(process.cwd(), "scrapers", "team", "scraper_team.js"),
  ];

  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function findTeamBundlePath() {
  const candidates = [
    path.join(process.cwd(), "control-engine", "scrapers", "team", "scraper_team_bundle.js"),
    path.join(process.cwd(), "ControlEngine", "scrapers", "team", "scraper_team_bundle.js"),
    path.join(process.cwd(), "scrapers", "team", "scraper_team_bundle.js"),
  ];

  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function makeScrapeRunId(sportschoolKey: string) {
  const stamp = new Date()
    .toISOString()
    .replace(/-/g, "")
    .replace(/:/g, "")
    .replace(/T/g, "")
    .replace(/Z/g, "")
    .replace(/\./g, "")
    .slice(0, 14);

  return `school_${sportschoolKey}_${stamp}`;
}

async function startVaEnrichAfterFightcrew(params: {
  admin: any;
  sportschoolKey: string;
  schoolName: string;
  parentLogFile: string;
}) {
  const { admin, sportschoolKey, schoolName, parentLogFile } = params;

  const bundlePath = findTeamBundlePath();
  if (!fs.existsSync(bundlePath)) {
    const msg = `VA team bundle niet gevonden: ${bundlePath}`;
    logLine(parentLogFile, `[enrich] ${msg}`);

    await admin
      .from("sportscholen")
      .update({
        team_sync_status: "klaar",
        team_sync_error: `Fightcrew is opgehaald, maar VA-verrijking kon niet starten. ${msg}`,
        updated_at: new Date().toISOString(),
      })
      .eq("sportschool_id", Number(sportschoolKey));

    return null;
  }

  const { data: fighterRows, error: fighterErr } = await admin
    .from("sportschool_fighters")
    .select("va_nummer")
    .eq("sportschool_id", Number(sportschoolKey))
    .not("va_nummer", "is", null)
    .limit(2000);

  if (fighterErr) {
    logLine(parentLogFile, `[enrich] VA lijst ophalen mislukt: ${fighterErr.message}`);
    return null;
  }

  const vaList = [
    ...new Set(
      (fighterRows ?? [])
        .map((row: any) => String(row?.va_nummer ?? "").replace(/\D/g, "").replace(/^0+/, ""))
        .filter(Boolean)
    ),
  ] as string[];

  if (!vaList.length) {
    logLine(parentLogFile, "[enrich] Geen VA-nummers gevonden na fightcrew import");
    return null;
  }

  const scrapeRunId = makeScrapeRunId(sportschoolKey);
  const enrichLogFile = "terminal";

  await admin
    .from("sportschool_fighters")
    .update({
      scrape_status: "wachtrij",
      scrape_error: null,
      scrape_run_id: scrapeRunId,
      updated_at: new Date().toISOString(),
    })
    .eq("sportschool_id", Number(sportschoolKey))
    .in("va_nummer", vaList);

  await admin
    .from("sportscholen")
    .update({
      team_sync_status: "verrijken_bezig",
      team_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("sportschool_id", Number(sportschoolKey));

  const workers = String(process.env.FIGHTCREW_WORKERS ?? process.env.WORKERS ?? "8");

  logLine(parentLogFile, `[enrich] Start automatisch VA verrijken voor ${sportschoolKey} (${schoolName}), ${vaList.length} VA's, workers=${workers}`);
  logLine(enrichLogFile, `Start automatisch VA verrijken voor sportschool ${sportschoolKey} (${schoolName}), ${vaList.length} VA's, run=${scrapeRunId}, workers=${workers}`);
  logLine(enrichLogFile, `Command: ${process.execPath} ${bundlePath} ${sportschoolKey} ${scrapeRunId}`);

  // Let op: bewust alleen sportschool_id + scrape_run_id.
  // De bundle haalt zelf alle VA's op uit sportschool_fighters en verwerkt ze VA-voor-VA per worker.
  const child = spawn(process.execPath, [bundlePath, sportschoolKey, scrapeRunId], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      TEAM_SPORTSCHOOL_ID: sportschoolKey,
      FIGHTCREW_SPORTSCHOOL_ID: sportschoolKey,
      TEAM_SCRAPE_RUN_ID: scrapeRunId,
      FIGHTCREW_SCRAPE_RUN_ID: scrapeRunId,
      WORKERS: workers,
      STAGGER_MS: process.env.STAGGER_MS ?? "220",
      UITSLAGEN_TRIES: process.env.UITSLAGEN_TRIES ?? "1",
    },
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk) => {
    const line = String(chunk).trimEnd();
    logLine(enrichLogFile, line);
    console.log(line);
  });

  child.stderr?.on("data", (chunk) => {
    const line = `[stderr] ${String(chunk).trimEnd()}`;
    logLine(enrichLogFile, line);
    console.error(line);
  });

  child.on("error", async (err) => {
    const msg = err?.message ?? "VA-verrijking kon niet starten";
    logLine(enrichLogFile, `[error] ${msg}`);

    await admin
      .from("sportscholen")
      .update({
        team_sync_status: "mislukt",
        team_sync_error: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("sportschool_id", Number(sportschoolKey));
  });

  child.on("close", async (code) => {
    const ok = code === 0;
    logLine(enrichLogFile, `VA-verrijking klaar met exit code ${code}`);

    await admin
      .from("sportscholen")
      .update({
        team_sync_status: ok ? "klaar" : "mislukt",
        team_sync_error: ok ? null : `VA-verrijking gestopt met exit code ${code}. Zie terminal output`,
        updated_at: new Date().toISOString(),
      })
      .eq("sportschool_id", Number(sportschoolKey));
  });

  return { pid: child.pid, scrapeRunId, logFile: null, count: vaList.length };
}

export async function POST(req: NextRequest) {
  let logFile = "";

  try {
    const token = bearer(req);
    if (!token) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const sportschoolKey = normalizeKey(
      body?.sportschool_id ?? body?.sportschoolKey ?? body?.key
    );

    if (!sportschoolKey) {
      return NextResponse.json(
        { error: "sportschool_id ontbreekt" },
        { status: 400 }
      );
    }

    const userClient = createClient(getBaseUrl(), getAnonKey(), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser(token);

    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Ongeldige sessie" }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await userClient
      .from("user_profiles")
      .select("id, role, email, full_name, bondteam")
      .eq("id", userRes.user.id)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    const role = String(profile?.role ?? "").trim().toLowerCase();
    const allowed = ["admin", "superadmin", "trainer"].includes(role);

    if (!allowed) {
      return NextResponse.json({ error: "Geen rechten" }, { status: 403 });
    }

    const admin = createClient(getBaseUrl(), getServiceKey(), {
      auth: { persistSession: false },
    });

    const { data: school, error: schoolErr } = await admin
      .from("sportscholen")
      .select("sportschool_id, naam")
      .eq("sportschool_id", Number(sportschoolKey))
      .single();

    if (schoolErr || !school) {
      return NextResponse.json(
        { error: "Sportschool niet gevonden" },
        { status: 404 }
      );
    }

    const scraperPath = findScraperPath();

    if (!fs.existsSync(scraperPath)) {
      const msg = `Scraper niet gevonden: ${scraperPath}`;

      await admin
        .from("sportscholen")
        .update({
          team_sync_status: "mislukt",
          team_sync_error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("sportschool_id", Number(sportschoolKey));

      return NextResponse.json({ error: msg }, { status: 500 });
    }

    logFile = "terminal";

    await admin
      .from("sportscholen")
      .update({
        team_sync_status: "bezig",
        team_sync_error: null,
        team_sync_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("sportschool_id", Number(sportschoolKey));

    logLine(
      logFile,
      `Start Fightcrew scraper voor sportschool ${sportschoolKey} (${school.naam})`
    );
    logLine(logFile, `Command: ${process.execPath} ${scraperPath} run ${sportschoolKey}`);

    const child = spawn(process.execPath, [scraperPath, "run", sportschoolKey], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TEAM_SPORTSCHOOL_ID: sportschoolKey,
        FIGHTCREW_SPORTSCHOOL_ID: sportschoolKey,
      },
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", (chunk) => {
      logLine(logFile, String(chunk).trimEnd());
    });

    child.stderr?.on("data", (chunk) => {
      logLine(logFile, `[stderr] ${String(chunk).trimEnd()}`);
    });

    child.on("error", async (err) => {
      const msg = err?.message ?? "Scraper kon niet starten";
      logLine(logFile, `[error] ${msg}`);

      await admin
        .from("sportscholen")
        .update({
          team_sync_status: "mislukt",
          team_sync_error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("sportschool_id", Number(sportschoolKey));
    });

    child.on("close", async (code) => {
      logLine(logFile, `Fightcrew scraper klaar met exit code ${code}`);

      const { count } = await admin
        .from("sportschool_fighters")
        .select("id", { count: "exact", head: true })
        .eq("sportschool_id", Number(sportschoolKey));

      const hasFightcrew = Number(count ?? 0) > 0;
      const fightcrewOk = code === 0 || hasFightcrew;

      if (!fightcrewOk) {
        await admin
          .from("sportscholen")
          .update({
            team_sync_status: "mislukt",
            team_sync_error: `Fightcrew scraper gestopt met exit code ${code}. Zie terminal output`,
              updated_at: new Date().toISOString(),
          })
          .eq("sportschool_id", Number(sportschoolKey));
        return;
      }

      await admin
        .from("sportscholen")
        .update({
          team_sync_status: "fightcrew_opgehaald",
          team_sync_error:
            code === 0
              ? null
              : `Fightcrew is opgehaald (${count} vechters), ondanks exit code ${code}. VA-verrijking start alsnog. Log: terminal output`,
          last_team_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("sportschool_id", Number(sportschoolKey));

      await startVaEnrichAfterFightcrew({
        admin,
        sportschoolKey,
        schoolName: school.naam,
        parentLogFile: logFile,
      });
    });

    return NextResponse.json({
      ok: true,
      sportschool_id: Number(sportschoolKey),
      naam: school.naam,
      status: "bezig",
      auto_enrich: true,
      enrich_workers: Number(process.env.FIGHTCREW_WORKERS ?? process.env.WORKERS ?? "8"),
      pid: child.pid,
      log_file: null,
    });
  } catch (e: any) {
    if (logFile) {
      logLine(logFile, `[fatal] ${e?.message ?? String(e)}`);
    }

    return NextResponse.json(
      { error: e?.message ?? "Fightcrew-sync starten mislukt" },
      { status: 500 }
    );
  }
}
