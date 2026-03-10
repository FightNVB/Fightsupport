import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import { requireUserFromAuthHeader, hasAnyRole, hasAnyRoleFromReq } from "@/lib/api/requireRole";
import { parseExcelToBouts } from "@/app/api/submit-matchmaking/parse_matchmaking";
import { buildControleBoutContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* =========================================================
   helpers (copy from control-engine/start & submit-matchmaking)
========================================================= */

function toVaStrict(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  const digits = s.replace(/[^0-9]/g, "");
  return /^\d{1,6}$/.test(digits) ? digits : null;
}

function pickVA(b: any, side: "rood" | "blauw"): string | null {
  if (side === "rood") {
    return toVaStrict(b.rood_va) ?? toVaStrict(b.va_rood) ?? toVaStrict(b.rood_va_mm) ?? null;
  }
  return toVaStrict(b.blauw_va) ?? toVaStrict(b.va_blauw) ?? toVaStrict(b.blauw_va_mm) ?? null;
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

function clampInt(n: any, def: number, min: number, max: number): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return def;
  const v = Math.floor(num);
  return Math.max(min, Math.min(max, v));
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  envExtra?: Record<string, string>,
  logPrefix?: string
): Promise<{ stdout: string; stderr: string; ms: number }> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();

    const proc = spawn("node", [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: path.dirname(scriptPath),
      windowsHide: true,
      env: { ...process.env, ...envExtra },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(logPrefix ? `[${logPrefix}] ${s}` : s);
    });
    proc.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(logPrefix ? `[${logPrefix}] ${s}` : s);
    });

    proc.on("error", (err) => {
      const ms = Date.now() - t0;
      reject(new Error(`Script spawn error: ${err?.message ?? err}\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`));
    });
    proc.on("close", (code) => {
      const ms = Date.now() - t0;
      if (code === 0) resolve({ stdout, stderr, ms });
      else reject(new Error(`Script failed: ${scriptPath} (exit code ${code})\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`));
    });
  });
}

function normUpper(v: any): string {
  return String(v ?? "").trim().toUpperCase();
}

function canonVaPair(vaR: string | null, vaB: string | null): string | null {
  if (!vaR || !vaB) return null;
  const a = String(vaR).trim();
  const b = String(vaB).trim();
  if (!a || !b) return null;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function boutFingerprint(opts: { vaR: string | null; vaB: string | null; discipline: any; klasse: any; is_toernooi?: any }) {
  const pair = canonVaPair(opts.vaR, opts.vaB);
  if (!pair) return null;
  const d = normUpper(opts.discipline);
  const k = normUpper(opts.klasse);
  const t = opts.is_toernooi == null ? "" : String(opts.is_toernooi).toLowerCase() === "true" ? "||T" : "||F";
  return `${pair}||${d}||${k}${t}`;
}

async function fetchExistingBoutUidIndex(matchmaking_id: string) {
  const index = new Map<string, string[]>();
  const { data, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("bout_uid,va_rood,va_blauw,discipline,klasse,is_toernooi")
    .eq("matchmaking_id", matchmaking_id);
  if (error) throw error;
  for (const r of data ?? []) {
    const uid = String((r as any)?.bout_uid ?? "").trim();
    if (!uid) continue;
    const vaR = toVaStrict((r as any)?.va_rood);
    const vaB = toVaStrict((r as any)?.va_blauw);
    const fp = boutFingerprint({
      vaR,
      vaB,
      discipline: (r as any)?.discipline,
      klasse: (r as any)?.klasse,
      is_toernooi: (r as any)?.is_toernooi,
    });
    if (!fp) continue;
    if (!index.has(fp)) index.set(fp, []);
    index.get(fp)!.push(uid);
  }
  return index;
}

/* =========================================================
   POST: upload -> parse -> scrape -> build/enrich -> rules -> done
========================================================= */

export async function POST(req: Request) {
  let controle_run_id: string | null = null;

  try {
    const { user } = await requireUserFromAuthHeader(req);
    const isAdmin = await hasAnyRoleFromReq(req, ["superadmin", "admin"]);
    const isOfficial = await hasAnyRoleFromReq(req, ["official", "hoofdofficial", "superadmin", "admin"]);
    if (!isOfficial) return NextResponse.json({ ok: false, error: "Geen rechten" }, { status: 403 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const event_id = String(form.get("event_id") ?? "").trim();

    if (!file) return NextResponse.json({ ok: false, error: "Geen file ontvangen" }, { status: 400 });
    if (!event_id) return NextResponse.json({ ok: false, error: "event_id ontbreekt" }, { status: 400 });

    // bondteam guard (officials only)
    if (!isAdmin) {
      const { data: prof, error: pErr } = await supabaseAdmin
        .from("user_profiles")
        .select("bondteam")
        .eq("id", user.id)
        .maybeSingle();
      if (pErr) throw pErr;
      const myBond = String((prof as any)?.bondteam ?? "").trim();
      if (!myBond) {
        return NextResponse.json({ ok: false, error: "Geen bondteam ingesteld (user_profiles.bondteam)" }, { status: 400 });
      }

      const { data: ev, error: evErr } = await supabaseAdmin
        .from("events")
        .select("bondteam")
        .eq("id", event_id)
        .maybeSingle();
      if (evErr) throw evErr;
      const eventBond = String((ev as any)?.bondteam ?? "").trim();
      if (!eventBond || eventBond !== myBond) {
        return NextResponse.json({ ok: false, error: "Dit event hoort niet bij jouw bondteam" }, { status: 403 });
      }
    }

    // event meta
    const { data: eventRow, error: eventErr } = await supabaseAdmin
      .from("events")
      .select("id, naam, datum, locatie, plaats")
      .eq("id", event_id)
      .maybeSingle();
    if (eventErr) throw eventErr;
    if (!eventRow) return NextResponse.json({ ok: false, error: "Event niet gevonden" }, { status: 404 });

    const evenement_naam = String((eventRow as any)?.naam ?? "").trim();
    const evenement_datum = String((eventRow as any)?.datum ?? "").trim();
    const locatie = String((eventRow as any)?.locatie ?? (eventRow as any)?.plaats ?? "").trim() || null;

    if (!evenement_naam || !evenement_datum) {
      return NextResponse.json({ ok: false, error: "Event mist naam of datum" }, { status: 400 });
    }

    // buffer -> parse
    const raw_filename = (file as any)?.name ? String((file as any).name) : null;
    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab);
    const bouts = await parseExcelToBouts(buffer);

    // choose matchmaking_id: reuse latest for event if exists
    let matchmaking_id: string | null = null;
    const { data: latestUp } = await supabaseAdmin
      .from("matchmaking_uploads")
      .select("matchmaking_id")
      .eq("event_id", event_id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    matchmaking_id = (latestUp as any)?.matchmaking_id ? String((latestUp as any).matchmaking_id) : null;
    if (!matchmaking_id) matchmaking_id = randomUUID();

    // ensure matchmakings row exists
    const { data: mmCheck } = await supabaseAdmin.from("matchmakings").select("id").eq("id", matchmaking_id).maybeSingle();
    if (!mmCheck) {
      const { error: mmErr } = await supabaseAdmin.from("matchmakings").insert({
        id: matchmaking_id,
        naam: evenement_naam,
        datum: evenement_datum,
        locatie,
        created_at: new Date().toISOString(),
      });
      if (mmErr) throw mmErr;
    }

    const upload_id = randomUUID();
    const now = new Date().toISOString();

    // save upload meta (official)
    const { error: uploadErr } = await supabaseAdmin.from("matchmaking_uploads").insert({
      id: upload_id,
      matchmaking_id,
      event_id,
      evenement_naam,
      evenement_datum,
      locatie,
      raw_filename,
      uploaded_by: user.id,
      uploaded_at: now,
      created_at: now,
      controle_status: "nog_niet",
    });
    if (uploadErr) throw uploadErr;

    // bout_uid reuse index
    const uidIndex = await fetchExistingBoutUidIndex(matchmaking_id);

    // insert bouts
    const inserts: any[] = [];
    let partijNr = 0;
    for (const b of bouts ?? []) {
      partijNr += 1;

      const vaR = toVaStrict((b as any)?.va_rood ?? (b as any)?.rood_va);
      const vaB = toVaStrict((b as any)?.va_blauw ?? (b as any)?.blauw_va);

      const fp = boutFingerprint({
        vaR,
        vaB,
        discipline: (b as any)?.discipline,
        klasse: (b as any)?.klasse,
        is_toernooi: (b as any)?.is_toernooi,
      });

      let bout_uid = randomUUID();
      if (fp && uidIndex.has(fp) && uidIndex.get(fp)!.length > 0) {
        // take first stable uid
        bout_uid = uidIndex.get(fp)![0];
      }

      inserts.push({
        ...b,
        upload_id,
        matchmaking_id,
        partij_nr: (b as any)?.partij_nr ?? partijNr,
        bout_uid,
        event_id,
        created_at: now,
      });
    }

    if (inserts.length > 0) {
      const chunk = 500;
      for (let i = 0; i < inserts.length; i += chunk) {
        const slice = inserts.slice(i, i + chunk);
        const { error: insErr } = await supabaseAdmin.from("matchmaking_bouts_raw").insert(slice);
        if (insErr) throw insErr;
      }
    }

    // ---- LIVE RUN ----
    // 1) controle_run
    const { data: runRows, error: runErr } = await supabaseAdmin
      .from("controle_runs")
      .insert({
        matchmaking_id,
        status: "running",
        gestart_op: now,
        run_type: "official",
      })
      .select("id")
      .limit(1);
    if (runErr) throw runErr;
    controle_run_id = (runRows as any)?.[0]?.id ?? null;
    if (!controle_run_id) throw new Error("controle_run insert gaf geen id terug");

    // 2) VA’s verzamelen uit huidige matchmaking
    const { data: mmBouts, error: boutsErr } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id);
    if (boutsErr) throw boutsErr;

    const vaSet = new Set<string>();
    (mmBouts ?? []).forEach((row: any) => {
      const r = pickVA(row, "rood");
      const bl = pickVA(row, "blauw");
      if (r) vaSet.add(r);
      if (bl) vaSet.add(bl);
    });
    const va_nummers = [...vaSet].filter(Boolean);

    // scrape config
    const do_scrape = String(form.get("do_scrape") ?? "true") !== "false";
    const workers = clampInt(form.get("workers") ?? 8, 8, 1, 20);
    const stagger_ms = clampInt(form.get("stagger_ms") ?? 250, 250, 0, 5000);
    const tab_attempts = clampInt(form.get("tab_attempts") ?? 8, 8, 1, 30);
    const soft_wait_ms = clampInt(form.get("soft_wait_ms") ?? 900, 900, 200, 5000);
    const between_attempts_ms = clampInt(form.get("between_attempts_ms") ?? 450, 450, 0, 5000);
    const fullfighter_timeout_ms = clampInt(form.get("fullfighter_timeout_ms") ?? 35000, 35000, 5000, 180000);
    const uitslagen_timeout_ms = clampInt(form.get("uitslagen_timeout_ms") ?? 90000, 90000, 5000, 240000);
    const uitslagen_tries = clampInt(form.get("uitslagen_tries") ?? 1, 1, 1, 5);

    if (do_scrape && va_nummers.length > 0) {
      const fpBundlePath = resolveScriptPath("scrapers", "fp_bundle", "scraper_fp_bundle.js");
      console.log("[officials/upload-run] ▶ fp_bundle start", { va_count: va_nummers.length, workers });
      try {
        await runNodeScript(
          fpBundlePath,
          [matchmaking_id, controle_run_id, ...va_nummers],
          {
            WORKERS: String(workers),
            STAGGER_MS: String(stagger_ms),
            TAB_ATTEMPTS: String(tab_attempts),
            SOFT_WAIT_MS: String(soft_wait_ms),
            BETWEEN_ATTEMPTS_MS: String(between_attempts_ms),
            FULLFIGHTER_TIMEOUT_MS: String(fullfighter_timeout_ms),
            UITSLAGEN_TIMEOUT_MS: String(uitslagen_timeout_ms),
            UITSLAGEN_TRIES: String(uitslagen_tries),
            RUN_TYPE: "official",
          },
          "fp_bundle_official"
        );
      } catch (e: any) {
        console.log("[officials/upload-run] ❌ fp_bundle failed (continuing)", { error: e?.message ?? String(e) });
      }
    }

    // build/enrich/rules
    await buildControleBoutContext(matchmaking_id, controle_run_id);
    await enrichControleBoutContext(matchmaking_id, controle_run_id);

    const { data: ctxRows, error: ctxErr } = await supabaseAdmin
      .from("controle_bout_context")
      .select("*")
      .eq("controle_run_id", controle_run_id);
    if (ctxErr) throw ctxErr;

    await rulesEngine({ matchmaking_id, controle_run_id, ctxRows: (ctxRows ?? []) as any[] });

    await supabaseAdmin
      .from("controle_runs")
      .update({ status: "klaar", afgerond_op: new Date().toISOString() })
      .eq("id", controle_run_id);

    return NextResponse.json({ ok: true, matchmaking_id, controle_run_id, event_id, va_count: va_nummers.length });
  } catch (e: any) {
    if (controle_run_id) {
      await supabaseAdmin
        .from("controle_runs")
        .update({ status: "failed", foutmelding: e?.message ?? "Onbekende fout", afgerond_op: new Date().toISOString() })
        .eq("id", controle_run_id);
    }
    return NextResponse.json({ ok: false, error: e?.message ?? "Onbekende fout", controle_run_id }, { status: 500 });
  }
}
