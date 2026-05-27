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

function s(v: any) { return String(v ?? "").trim(); }

function resolveScriptPath(...parts: string[]) {
  const root = process.cwd();
  const candidates = [
    path.join(root, ...parts),
    path.join(root, "ControlEngine", ...parts),
    path.join(root, "ControlEngine", "ControlEngine", ...parts),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error(`Script niet gevonden:\n- ${candidates.join("\n- ")}`);
}

function runNodeScript(scriptPath: string, envExtra: Record<string,string>) {
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
    proc.stdout.on("data", (d) => { const x = d.toString(); stdout += x; process.stdout.write(`[fp-connect] ${x}`); });
    proc.stderr.on("data", (d) => { const x = d.toString(); stderr += x; process.stderr.write(`[fp-connect] ${x}`); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`FightPassport koppelen mislukt (exit ${code})\n${stderr}\n${stdout}`));
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

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "Gebruikersnaam en wachtwoord zijn verplicht om te koppelen." }, { status: 400 });
    }
    if (unlockCode && !/^\d{7}$/.test(unlockCode)) {
      return NextResponse.json({ ok: false, error: "Unlockcode moet 7 cijfers zijn." }, { status: 400 });
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
      existingSession?.status === "connecting" &&
      existingUpdated &&
      Date.now() - existingUpdated < CONNECT_STALE_MS
    ) {
      return NextResponse.json(
        { ok: false, error: "FightPassport koppeling loopt al voor deze matchmaker. Wacht even of probeer opnieuw over enkele minuten." },
        { status: 409 }
      );
    }

    await supabase.from("fightpassport_sessions").upsert({
      matchmaker_id: userId,
      status: "connecting",
      message: "FightPassport koppeling wordt gestart.",
      updated_at: new Date().toISOString(),
    }, { onConflict: "matchmaker_id" });

    const scriptPath = resolveScriptPath("scrapers", "utils", "login_matchmaker_session.js");
    await runNodeScript(scriptPath, {
      FP_MATCHMAKER_ID: userId,
      FP_LOGIN_USERNAME: username,
      FP_LOGIN_PASSWORD: password,
      FP_LOGIN_UNLOCK_CODE: unlockCode,
      FP_TRUST_DEVICE: trustDevice ? "true" : "false",
      PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? "true",
    });

    const { data } = await supabase
      .from("fightpassport_sessions")
      .select("status, message, updated_at")
      .eq("matchmaker_id", userId)
      .maybeSingle();

    return NextResponse.json({ ok: true, session: data ?? null });
  } catch (err: any) {
    console.error("❌ FightPassport connect fout:", err);
    if (currentUserId) {
      await supabase.from("fightpassport_sessions").upsert({
        matchmaker_id: currentUserId,
        status: "failed",
        message: err?.message ?? "Koppelen mislukt",
        updated_at: new Date().toISOString(),
      }, { onConflict: "matchmaker_id" });
    }
    return NextResponse.json({ ok: false, error: err?.message ?? "Koppelen mislukt" }, { status: 500 });
  }
}

