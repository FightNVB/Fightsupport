// app/api/submit_matchmaking/start/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { parseExcelToBouts } from "./parse_matchmaking";
import { getUserBondteam, requireAnyRole, RoleName } from "../_utils/authz";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export const runtime = "nodejs";

/* =========================================================
   Content-type helpers
========================================================= */
function ct(req: Request) {
  return (req.headers.get("content-type") ?? "").toLowerCase();
}
function isJson(req: Request) {
  return ct(req).includes("application/json");
}
function isForm(req: Request) {
  const c = ct(req);
  return c.includes("multipart/form-data") || c.includes("application/x-www-form-urlencoded");
}

/* =========================================================
   Storage download (JSON flow)
========================================================= */
async function downloadStorageFile(file_path: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from("uploads").download(file_path);
  if (error) throw new Error(`Storage download mislukt: ${error.message}`);

  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

/* =========================================================
   Fingerprint helpers (order-agnostic VA pair)
========================================================= */
function toVaStrict(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (/^\d{1,6}$/.test(s)) return s;
  const digits = s.replace(/[^0-9]/g, "");
  if (/^\d{1,6}$/.test(digits)) return digits;
  return null;
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

function toBoolLoose(v: any): boolean | null {
  if (v === true || v === false) return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["true", "1", "ja", "yes", "y"].includes(s)) return true;
  if (["false", "0", "nee", "no", "n"].includes(s)) return false;
  return null;
}

function boutFingerprint(opts: {
  vaR: string | null;
  vaB: string | null;
  discipline: any;
  klasse: any;
  is_toernooi?: any;
}) {
  const pair = canonVaPair(opts.vaR, opts.vaB);
  if (!pair) return null;

  const d = normUpper(opts.discipline);
  const k = normUpper(opts.klasse);

  // optioneel toernooi meenemen als je 'm hebt
  const tBool = toBoolLoose(opts.is_toernooi);
  const t = tBool == null ? "" : tBool ? "||T" : "||F";

  return `${pair}||${d}||${k}${t}`;
}

async function fetchExistingBoutUidIndex(matchmaking_id: string) {
  // Map fingerprint -> list of bout_uid(s)
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

const ALLOWED_BONDTEAMS = new Set(["IRO", "NKF", "WPKL", "WMTA", "VON", "UMC", "MMAAN", "MON"]);

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function roleLower(r: any): RoleName {
  const x = String(r ?? "").trim().toLowerCase();
  if (
    x === "superadmin" ||
    x === "admin" ||
    x === "matchmaker" ||
    x === "official" ||
    x === "hoofdofficial" ||
    x === "dispensatie_admin"
  ) {
    return x as RoleName;
  }
  return "unknown";
}

/* =========================================================
   Main route
========================================================= */
export async function POST(req: Request) {
  try {
    // ✅ Auth: only authenticated roles can submit
    const auth = await requireAnyRole(req, ["admin", "matchmaker", "official", "hoofdofficial"]);
    const userId = auth.userId;
    const role = roleLower(auth.role);

    let evenement_naam = "";
    let evenement_datum = "";
    let locatie: string | null = null;

    let matchmaker: string | null = null;
    let bondteam: string | null = null;
    let hoofdofficial: string | null = null;
    let promotor: string | null = null;

    // uploaded_by is ALWAYS enforced server-side from auth
    const uploaded_by: string = userId;

    let matchmaking_id: string | null = null;
    let force_new = false;

    // ✅ event koppeling / auto-create
    let event_id: string | null = null;

    // upload token (client-side correlation, not DB id)
    const upload_token = randomUUID();
    let raw_filename: string | null = null;

    let bouts: any[] = [];

    // -----------------------
    // A) JSON + file_path
    // -----------------------
    if (isJson(req)) {
      const body = await req.json();

      const file_path = String(body.file_path ?? "").trim();
      raw_filename = body.raw_filename ? String(body.raw_filename) : null;

      evenement_naam = String(body.evenement_naam ?? "").trim();
      evenement_datum = String(body.evenement_datum ?? "").trim();
      locatie = body.locatie ? String(body.locatie).trim() : null;

      matchmaker = body.matchmaker ? String(body.matchmaker).trim() : null;

      const bondteamRaw = body.bondteam ? String(body.bondteam).trim() : null;
      bondteam = bondteamRaw && ALLOWED_BONDTEAMS.has(bondteamRaw) ? bondteamRaw : bondteamRaw; // niet blokkeren, maar wel normaliseren

      hoofdofficial = body.hoofdofficial ? String(body.hoofdofficial).trim() : null;
      promotor = body.promotor ? String(body.promotor).trim() : null;

      // ignore uploaded_by from client (spoofing)

      matchmaking_id = body.matchmaking_id ? String(body.matchmaking_id) : null;
      force_new = Boolean(body.force_new ?? false);

      event_id = body.event_id ? String(body.event_id) : null;

      if (!file_path) return NextResponse.json({ error: "JSON mist file_path." }, { status: 400 });

      const buffer = await downloadStorageFile(file_path);
      bouts = await parseExcelToBouts(buffer);
    }
    // -----------------------
    // B) multipart form-data
    // -----------------------
    else if (isForm(req)) {
      const form = await req.formData();
      const file = form.get("file") as File | null;

      evenement_naam = String(form.get("evenement_naam") ?? "").trim();
      evenement_datum = String(form.get("evenement_datum") ?? "").trim();
      locatie = String(form.get("locatie") ?? "").trim() || null;

      matchmaker = String(form.get("matchmaker") ?? "").trim() || null;
      const bondteamRaw = String(form.get("bondteam") ?? "").trim() || null;
      bondteam = bondteamRaw && ALLOWED_BONDTEAMS.has(bondteamRaw) ? bondteamRaw : bondteamRaw;

      hoofdofficial = String(form.get("hoofdofficial") ?? "").trim() || null;
      promotor = String(form.get("promotor") ?? "").trim() || null;

      // ignore uploaded_by from client (spoofing)

      matchmaking_id = String(form.get("matchmaking_id") ?? "").trim() || null;
      force_new = String(form.get("force_new") ?? "false") === "true";

      event_id = String(form.get("event_id") ?? "").trim() || null;

      if (!file) return NextResponse.json({ error: "Geen file ontvangen." }, { status: 400 });


      raw_filename = (file as any)?.name ? String((file as any).name) : null;

      const ab = await file.arrayBuffer();
      const buffer = Buffer.from(ab);
      bouts = await parseExcelToBouts(buffer);
    } else {
      return NextResponse.json(
        { error: "Onjuiste Content-Type. Gebruik application/json of multipart/form-data." },
        { status: 415 }
      );
    }

    // ✅ Shared validation (after parsing)
    if (!evenement_naam || !evenement_datum) return bad("Vul verplicht in: evenement_naam en evenement_datum.");
    if (!bondteam) return bad("Bondteam is verplicht.");
    if (!ALLOWED_BONDTEAMS.has(String(bondteam))) return bad("Onbekend bondteam.");

    if (role === "official" || role === "hoofdofficial") {
      // official: must stay within own bondteam
      const userBond = await getUserBondteam(userId);
      if (!userBond) return bad("Je profiel mist bondteam.", 403);
      if (String(userBond) !== String(bondteam)) return bad("Bondteam mismatch: je mag alleen uploaden voor je eigen bondteam.", 403);

      const mm = String(matchmaker ?? "").trim();
      const pr = String(promotor ?? "").trim();
      if (!mm && !pr) return bad("Vul matchmaker of promotor in (minimaal één).", 400);
    } else {
      // matchmaker/admin: matchmaker verplicht
      const mm = String(matchmaker ?? "").trim();
      if (!mm) return bad("Matchmaker is verplicht.", 400);
    }

    const now = new Date().toISOString();

    // -----------------------
    // 0) event aanmaken (als niet meegegeven)
    // -----------------------
    let evId = event_id ? String(event_id).trim() : "";
    if (!evId) {
      const { data: ev, error: evErr } = await supabaseAdmin
        .from("events")
        .insert({
          naam: evenement_naam,
          datum: evenement_datum,
          locatie,
          status: "draft",
          bondteam,
          matchmaker,
          hoofdofficial,
          promotor,
        })
        .select("id")
        .single();

      if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });
      evId = String((ev as any)?.id ?? "").trim();
    } else {
      // licht check: bestaat event?
      const { data: ex, error: exErr } = await supabaseAdmin.from("events").select("id").eq("id", evId).maybeSingle();
      if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
      if (!ex) {
        return NextResponse.json({ error: "event_id bestaat niet (events)." }, { status: 400 });
      }
    }

    // -----------------------
    // 1) matchmaking id bepalen (bigint-safe)
    // -----------------------
    // Let op: sommige installs gebruiken BIGINT ids i.p.v. UUID. Daarom:
    // - Als matchmaking_id wordt meegegeven: moet dit numeriek zijn.
    // - Als nieuw: laat Postgres het id genereren en lees het terug.
    let mmId: string = "";
    if (!force_new && matchmaking_id) {
      const s = String(matchmaking_id).trim();
      if (!/^\d+$/.test(s)) {
        return NextResponse.json(
          { error: "matchmaking_id moet een numerieke id zijn (bigint) in deze database." },
          { status: 400 }
        );
      }
      mmId = s;
    } else {
      const { data: mm, error: mmError } = await supabaseAdmin
        .from("matchmakings")
        .insert({
          naam: evenement_naam,
          datum: evenement_datum,
          locatie,
          created_at: now,
        })
        .select("id")
        .single();
      if (mmError) return NextResponse.json({ error: mmError.message }, { status: 500 });
      mmId = String((mm as any)?.id ?? "").trim();
      if (!mmId) return NextResponse.json({ error: "Kon matchmaking id niet bepalen." }, { status: 500 });
    }

    // -----------------------
    // 2) upload meta opslaan (met event_id!) (bigint-safe)
    // -----------------------
    // Laat ook hier het id door Postgres genereren als de kolom BIGINT is.
    const { data: uploadRow, error: uploadErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .insert({
        matchmaking_id: mmId,
        event_id: evId,

        evenement_naam,
        evenement_datum,
        locatie,
        raw_filename,
        matchmaker,
        bondteam,
        hoofdofficial,
        promotor,
        uploaded_by,
        uploaded_at: now,
        created_at: now,
      })
      .select("id")
      .single();
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    // Zorg dat response altijd upload_id teruggeeft (string)
    const uploadIdFinal = String((uploadRow as any)?.id ?? "").trim();

    // -----------------------
    // 4) bouts insert met bout_uid herkenning
    // -----------------------
    const existingIndex = await fetchExistingBoutUidIndex(mmId);

    let reused = 0;
    let ambiguous = 0;
    let created = 0;

    const rows: any[] = [];
    for (const b of bouts ?? []) {
      const vaR = toVaStrict((b as any)?.va_rood ?? (b as any)?.rood_va ?? (b as any)?.rood_va_mm);
      const vaB = toVaStrict((b as any)?.va_blauw ?? (b as any)?.blauw_va ?? (b as any)?.blauw_va_mm);

      const discipline = normUpper((b as any)?.discipline ?? "");
      const klasse = normUpper((b as any)?.klasse ?? "");

      // ✅ parser kan is_toernooi of toernooi geven
      const is_toernooi = (b as any)?.is_toernooi ?? (b as any)?.toernooi ?? null;

      const fp = boutFingerprint({ vaR, vaB, discipline, klasse, is_toernooi });

      let bout_uid = (b as any)?.bout_uid ? String((b as any).bout_uid).trim() : randomUUID();

      if (fp) {
        const list = existingIndex.get(fp) ?? [];
        if (list.length === 1) {
          bout_uid = list[0];
          reused++;
        } else if (list.length > 1) {
          // ambigu: kies niet automatisch
          ambiguous++;
          bout_uid = randomUUID();
        } else {
          created++;
        }
      } else {
        created++;
      }

      rows.push({
        upload_id: uploadIdFinal,
        matchmaking_id: mmId,
        bout_uid,

        partij_nr: (b as any)?.partij_nr ?? null,

        rood_naam: (b as any)?.rood_naam ?? null,
        rood_gym: (b as any)?.rood_gym ?? null,
        va_rood: vaR,
        rood_geboortedatum: (b as any)?.rood_geboortedatum ?? null,
        rood_gewicht: (b as any)?.rood_gewicht ?? null,

        blauw_naam: (b as any)?.blauw_naam ?? null,
        blauw_gym: (b as any)?.blauw_gym ?? null,
        va_blauw: vaB,
        blauw_geboortedatum: (b as any)?.blauw_geboortedatum ?? null,
        blauw_gewicht: (b as any)?.blauw_gewicht ?? null,

        discipline: discipline || null,
        klasse: klasse || null,
        is_toernooi: toBoolLoose(is_toernooi),

        raw_json: (b as any)?.extra ?? null,

        created_at: now,
      });
    }

    if (rows.length) {
      const { error: boutErr } = await supabaseAdmin.from("matchmaking_bouts_raw").insert(rows);
      if (boutErr) return NextResponse.json({ error: boutErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      upload_id: uploadIdFinal,
      upload_token,
      matchmaking_id: mmId,
      event_id: evId,
      stats: { total: rows.length, reused, ambiguous, created },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Onbekende fout" }, { status: 500 });
  }
}