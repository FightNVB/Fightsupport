// app/api/matchmaker/fightpassport/connect/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const CONNECT_STALE_MS = 5 * 60 * 1000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: any) {
  return String(v ?? "").trim();
}

function resolveHeadlessEnv() {
  // Gebruik dezelfde env als de gewone scrapers.
  // PUPPETEER_HEADLESS mag overrulen, maar HEADLESS=false werkt ook.
  const raw = process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "true";
  return String(raw).toLowerCase() === "false" ? "false" : "true";
}

function resolveScriptPath(...parts: string[]) {
  const root = process.cwd();
  const candidates = [
    path.join(root, ...parts),
    path.join(root, "ControlEngine", ...parts),
    path.join(root, "ControlEngine", "ControlEngine", ...parts),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(`Script niet gevonden:\n- ${candidates.join("\n- ")}`);
}

function runNodeScript(scriptPath: string, envExtra: Record<string, string>) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const proc = spawn("node", [scriptPath], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: path.dirname(scriptPath),
      windowsHide: true,
      env: { ...process.env, ...envExtra },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      const x = d.toString();
      stdout += x;
      process.stdout.write(`[fp-connect] ${x}`);
    });

    proc.stderr.on("data", (d) => {
      const x = d.toString();
      stderr += x;
      process.stderr.write(`[fp-connect] ${x}`);
    });

    proc.on("error", reject);

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `FightPassport koppelen mislukt (exit ${code})\n${stderr}\n${stdout}`
          )
        );
      }
    });
  });
}

export async function POST(req: Request) {
  let currentUserId: string | null = null;

  try {
    const { userId } = await requireUserWithRole(req);
    currentUserId = userId;

    const body = await req.json().catch(() => ({}));
    const username = s(body?.username);
    const password = s(body?.password);
    const unlockCode = s(body?.unlock_code);
    const trustDevice = body?.trust_device !== false;

    const isUnlockStep = !!unlockCode && !username && !password;

    if (!isUnlockStep && (!username || !password)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Gebruikersnaam en wachtwoord zijn verplicht om te koppelen.",
        },
        { status: 400 }
      );
    }

    if (unlockCode && !/^\d{7}$/.test(unlockCode)) {
      return NextResponse.json(
        { ok: false, error: "Unlockcode moet 7 cijfers zijn." },
        { status: 400 }
      );
    }

    const { data: existingSession } = await supabase
      .from("fightpassport_sessions")
      .select("status, updated_at")
      .eq("matchmaker_id", userId)
      .maybeSingle();

    const existingUpdated = existingSession?.updated_at
      ? new Date(existingSession.updated_at).getTime()
      : 0;

    if (
      !isUnlockStep &&
      existingSession?.status === "connecting" &&
      existingUpdated &&
      Date.now() - existingUpdated < CONNECT_STALE_MS
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "FightPassport koppeling loopt al voor deze matchmaker. Wacht even of probeer opnieuw over enkele minuten.",
        },
        { status: 409 }
      );
    }

    await supabase.from("fightpassport_sessions").upsert(
      {
        matchmaker_id: userId,
        status: "connecting",
        message: isUnlockStep
          ? "FightPassport unlockcode wordt bevestigd."
          : "FightPassport koppeling wordt gestart.",
        trusted_device: trustDevice,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "matchmaker_id" }
    );

    const scriptPath = resolveScriptPath(
      "scrapers",
      "utils",
      "login_matchmaker_session.js"
    );

    await runNodeScript(scriptPath, {
      FP_MATCHMAKER_ID: userId,
      FP_LOGIN_USERNAME: username,
      FP_LOGIN_PASSWORD: password,
      FP_LOGIN_UNLOCK_CODE: unlockCode,
      FP_TRUST_DEVICE: trustDevice ? "true" : "false",
      FP_UNLOCK_ONLY: isUnlockStep ? "true" : "false",
      PUPPETEER_HEADLESS: resolveHeadlessEnv(),
      HEADLESS: process.env.HEADLESS ?? resolveHeadlessEnv(),
    });

    await supabase.from("fightpassport_sessions").upsert(
      {
        matchmaker_id: userId,
        status: "active",
        message: "FightPassport sessie gekoppeld.",
        trusted_device: trustDevice,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "matchmaker_id" }
    );

    const { data } = await supabase
      .from("fightpassport_sessions")
      .select("status, message, updated_at, last_login_at, trusted_device")
      .eq("matchmaker_id", userId)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      connected: data?.status === "active",
      session: data ?? null,
    });
  } catch (err: any) {
    console.error("❌ FightPassport connect fout:", err);

    const msg = String(err?.message ?? "Koppelen mislukt");
    const isUnlockRequired = msg.includes("UNLOCK_REQUIRED");
    const isUnlockFailed = msg.includes("UNLOCK_FAILED");

    if (currentUserId) {
      await supabase.from("fightpassport_sessions").upsert(
        {
          matchmaker_id: currentUserId,
          status: isUnlockRequired ? "unlock_required" : "failed",
          message: isUnlockRequired
            ? "FightPassport vraagt om een unlockcode."
            : isUnlockFailed
              ? "Unlockcode niet geaccepteerd of apparaatregistratie niet afgerond. Controleer de code en probeer opnieuw."
              : msg,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "matchmaker_id" }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        needsUnlock: isUnlockRequired,
        error: isUnlockRequired
          ? "Unlockcode nodig"
          : isUnlockFailed
            ? "Unlockcode niet geaccepteerd of apparaatregistratie niet afgerond."
            : msg,
      },
      { status: isUnlockRequired ? 409 : 500 }
    );
  }
}