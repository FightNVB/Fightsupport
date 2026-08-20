// app/api/admin/sportscholen/fightcrew/start/route.ts

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeKey(raw: unknown) {
  const key = String(raw ?? "")
    .trim()
    .replace(/\D/g, "")
    .replace(/^0+/, "");
  return key || null;
}

function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (env) return env;
  throw new Error("NEXT_PUBLIC_SUPABASE_URL ontbreekt");
}

function getServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt");
  return key;
}

function logLine(line: string) {
  console.log(`[${new Date().toISOString()}] ${line}`);
}

function findScraperPath() {
  const candidates = [
    path.join(
      process.cwd(),
      "control-engine",
      "scrapers",
      "team",
      "scraper_team.js"
    ),
    path.join(
      process.cwd(),
      "ControlEngine",
      "scrapers",
      "team",
      "scraper_team.js"
    ),
    path.join(process.cwd(), "scrapers", "team", "scraper_team.js"),
  ];

  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

export async function POST(req: NextRequest) {
  try {
    await requireAnyRole(req, ["admin", "superadmin", "trainer"]);

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

    await admin
      .from("sportscholen")
      .update({
        team_sync_status: "bezig",
        team_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("sportschool_id", Number(sportschoolKey));

    logLine(
      `Start actuele FightPassport Fightcrew-sync voor sportschool ${sportschoolKey} (${school.naam})`
    );
    logLine(`Command: ${process.execPath} ${scraperPath} run ${sportschoolKey}`);

    const child = spawn(
      process.execPath,
      [scraperPath, "run", sportschoolKey],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,

          // Team/sportschool gebruikt master-login.
          FP_MATCHMAKER_ID: "",
          FP_SESSION_MODE: "master",
          HEADLESS: process.env.HEADLESS ?? "false",
          PUPPETEER_HEADLESS:
            process.env.PUPPETEER_HEADLESS ??
            process.env.HEADLESS ??
            "false",

          TEAM_SPORTSCHOOL_ID: sportschoolKey,
          FIGHTCREW_SPORTSCHOOL_ID: sportschoolKey,
        },
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    child.stdout?.on("data", (chunk) => {
      logLine(String(chunk).trimEnd());
    });

    child.stderr?.on("data", (chunk) => {
      logLine(`[stderr] ${String(chunk).trimEnd()}`);
    });

    child.on("error", async (err) => {
      const msg = err?.message ?? "Fightcrew scraper kon niet starten";
      logLine(`[error] ${msg}`);

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

      logLine(`Fightcrew scraper klaar met exit code ${code}`);

      // scraper_team.js zet bij succes zelf last_team_sync_at/status.
      // Hier alleen een vangnet voor onverwachte exit.
      if (!ok) {
        await admin
          .from("sportscholen")
          .update({
            team_sync_status: "mislukt",
            team_sync_error: `Fightcrew scraper gestopt met exit code ${code}. Zie terminal output.`,
            updated_at: new Date().toISOString(),
          })
          .eq("sportschool_id", Number(sportschoolKey));
      }
    });

    return NextResponse.json({
      ok: true,
      sportschool_id: Number(sportschoolKey),
      naam: school.naam,
      status: "bezig",
      pid: child.pid,
    });
  } catch (e: any) {
    console.error("[admin/fightcrew/start] POST fout", e);
    return NextResponse.json(
      { error: e?.message ?? "Fightcrew-sync starten mislukt" },
      { status: 500 }
    );
  }
}
