// app/api/admin/controle/toernooi-fighter/autocheck/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";
import { buildControleBoutContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function toVaStrict(v: unknown): string | null {
  const digits = s(v).replace(/\D/g, "");
  return /^\d{3,5}$/.test(digits) ? digits : null;
}

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

async function runNodeScript(scriptPath: string, args: string[], cwd?: string) {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("node", [scriptPath, ...args], {
      cwd: cwd ?? process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`scraper exit code ${code}`));
    });
  });
}

async function getLatestControleRunId(matchmaking_id: string) {
  const { data, error } = await supabase
    .from("controle_runs")
    .select("id")
    .eq("matchmaking_id", matchmaking_id)
    .order("is_latest", { ascending: false })
    .order("gestart_op", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return s((data as any)?.id) || null;
}

async function createControleRun(matchmaking_id: string, userId: string | null, role: string | null) {
  const { data, error } = await supabase
    .from("controle_runs")
    .insert({
      matchmaking_id,
      gestart_door_user_id: userId,
      gestart_door_rol: role,
      status: "running",
      run_type: "toernooi-fighter-rescrape",
      gestart_op: new Date().toISOString(),
      is_latest: true,
    })
    .select("id")
    .single();

  if (error) throw error;

  await supabase
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", matchmaking_id)
    .neq("id", (data as any).id);

  return String((data as any).id);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const matchmaking_id = s(body.matchmaking_id);
    const va_nummer = toVaStrict(body.va_nummer ?? body.fighter_id);
    const toernooi_code = s(body.toernooi_code);

    if (!matchmaking_id) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    if (!va_nummer) return NextResponse.json({ error: "va_nummer/fighter_id ontbreekt of is ongeldig" }, { status: 400 });
    if (!toernooi_code) return NextResponse.json({ error: "toernooi_code ontbreekt" }, { status: 400 });

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const controle_run_id = s(body.controle_run_id) || (await getLatestControleRunId(matchmaking_id)) || (await createControleRun(matchmaking_id, userId, role));

    const bundlePath = resolveScriptPath("scrapers", "fp_bundle", "scraper_fp_bundle.js");
    await runNodeScript(bundlePath, [matchmaking_id, controle_run_id, va_nummer], path.dirname(bundlePath));

    await buildControleBoutContext(matchmaking_id, controle_run_id, {
      toernooi_code,
      fighter_id: va_nummer,
      va_nummer,
      only_toernooi: true,
    } as any);

    await enrichControleBoutContext(matchmaking_id, controle_run_id, {
      toernooi_code,
      fighter_id: va_nummer,
      va_nummer,
      only_toernooi: true,
    } as any);

    const { data: toernooiRows, error: ctxErr } = await supabase
      .from("controle_toernooi_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("toernooi_code", toernooi_code);

    if (ctxErr) throw ctxErr;

    await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows: [],
      toernooiRows: toernooiRows ?? [],
      scoped_toernooi_code: toernooi_code,
      scoped_fighter_id: va_nummer,
    } as any);

    await supabase
      .from("controle_runs")
      .update({ status: "klaar", afgerond_op: new Date().toISOString() })
      .eq("id", controle_run_id);

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      controle_run_id,
      va_nummer,
      toernooi_code,
      rows: toernooiRows?.length ?? 0,
      ms: Date.now() - t0,
    });
  } catch (err: any) {
    console.error("[toernooi-fighter/autocheck]", err);
    return NextResponse.json({ error: err?.message ?? "Toernooi-vechter autocheck mislukt" }, { status: 500 });
  }
}
