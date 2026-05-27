// app/api/admin/sportscholen/fightcrew/enrich/route.ts

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

function normalizeVa(raw: unknown) {
  const va = String(raw ?? "")
    .trim()
    .replace(/^va/i, "")
    .replace(/^0+/, "")
    .replace(/\D/g, "");

  return va || null;
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

function logLine(file: string, line: string) {
  try {
    fs.appendFileSync(file, `[${new Date().toISOString()}] ${line}\n`, "utf8");
  } catch {}
}

function findLiteScraperPath() {
  const candidates = [
    // Nieuwe sportschool/team VA-scraper. Deze schrijft naar sportschool_fighters
    // en sportschool_fighter_uitslagen_raw, dus NIET naar fighters_raw/uitslagen_raw.
    path.join(process.cwd(), "control-engine", "scrapers", "team", "scraper_team_bundle.js"),
    path.join(process.cwd(), "ControlEngine", "scrapers", "team", "scraper_team_bundle.js"),
    path.join(process.cwd(), "scrapers", "team", "scraper_team_bundle.js"),
    path.join(process.cwd(), "control-engine", "scrapers", "team", "scraper_team_bundle_sportschool.js"),
    path.join(process.cwd(), "ControlEngine", "scrapers", "team", "scraper_team_bundle_sportschool.js"),
    path.join(process.cwd(), "scrapers", "team", "scraper_team_bundle_sportschool.js"),
  ];

  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function makeScrapeRunId(sportschoolKey: string) {
  const stamp = new Date().toISOString().replace(/-/g, "").replace(/:/g, "").replace(/T/g, "").replace(/Z/g, "").replace(/\./g, "").slice(0, 14);
  return `school_${sportschoolKey}_${stamp}`;
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
      return NextResponse.json({ error: "sportschool_id ontbreekt" }, { status: 400 });
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
      return NextResponse.json({ error: "Sportschool niet gevonden" }, { status: 404 });
    }

    const { data: fighterRows, error: fightersErr } = await admin
      .from("sportschool_fighters")
      .select("va_nummer")
      .eq("sportschool_id", Number(sportschoolKey))
      .limit(1000);

    if (fightersErr) {
      return NextResponse.json({ error: fightersErr.message }, { status: 500 });
    }

    const vaList = [
      ...new Set((fighterRows ?? []).map((row: any) => normalizeVa(row.va_nummer)).filter(Boolean)),
    ];

    if (!vaList.length) {
      return NextResponse.json(
        { error: "Geen VA-nummers gevonden voor deze sportschool." },
        { status: 400 }
      );
    }

    const scraperPath = findLiteScraperPath();

    if (!fs.existsSync(scraperPath)) {
      return NextResponse.json(
        { error: `Beperkte vechter scraper niet gevonden: ${scraperPath}` },
        { status: 500 }
      );
    }

    const logDir = path.join(process.cwd(), ".fightsupport-logs");
    fs.mkdirSync(logDir, { recursive: true });

    logFile = path.join(logDir, `fightcrew-enrich-${sportschoolKey}-${Date.now()}.log`);

    await admin
      .from("sportschool_fighters")
      .update({
        scrape_status: "bezig",
        scrape_error: null,
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

    logLine(
      logFile,
      `Start beperkte vechter scrape voor sportschool ${sportschoolKey} (${school.naam}), ${vaList.length} VA-nummers`
    );
    const scrapeRunId = makeScrapeRunId(sportschoolKey);

    // Let op: de sportschool/team scraper verwacht:
    // node scraper_team_bundle.js <sportschool_id> [scrape_run_id] [va1 va2 ...]
    // Dus GEEN "run" als eerste argument, anders wordt "run" als sportschool_id gelezen.
    const scraperArgs = [scraperPath, sportschoolKey, scrapeRunId, ...vaList];

    logLine(logFile, `Command: ${process.execPath} ${scraperArgs.join(" ")}`);

    const child = spawn(process.execPath, scraperArgs, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TEAM_SPORTSCHOOL_ID: sportschoolKey,
        FIGHTCREW_SPORTSCHOOL_ID: sportschoolKey,
        TEAM_SCRAPE_RUN_ID: scrapeRunId,
        FIGHTCREW_SCRAPE_RUN_ID: scrapeRunId,
        TEAM_VA_LIST: JSON.stringify(vaList),
        FIGHTCREW_VA_LIST: JSON.stringify(vaList),
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
      const msg = err?.message ?? "Beperkte vechter scraper kon niet starten";
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
      const ok = code === 0;
      logLine(logFile, `Beperkte vechter scraper klaar met exit code ${code}`);

      await admin
        .from("sportscholen")
        .update({
          team_sync_status: ok ? "klaar" : "mislukt",
          team_sync_error: ok
            ? null
            : `Beperkte vechter scraper gestopt met exit code ${code}. Zie log: ${logFile}`,
          team_sync_finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("sportschool_id", Number(sportschoolKey));
    });

    return NextResponse.json({
      ok: true,
      status: "bezig",
      sportschool_id: Number(sportschoolKey),
      naam: school.naam,
      count: vaList.length,
      scrape_run_id: scrapeRunId,
      pid: child.pid,
      log_file: logFile,
    });
  } catch (e: any) {
    if (logFile) {
      logLine(logFile, `[fatal] ${e?.message ?? String(e)}`);
    }

    return NextResponse.json(
      { error: e?.message ?? "Beperkte vechter scrape starten mislukt" },
      { status: 500 }
    );
  }
}
