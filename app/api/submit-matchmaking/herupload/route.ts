// app/api/submit_matchmaking/start/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { parseExcelToBouts } from "../parse_matchmaking";
import { getUserBondteam, requireAnyRole, RoleName } from "../../_utils/authz";
import { ensureLifecycleRecord } from "../../_utils/matchmakingLifecycle";

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
  return (
    c.includes("multipart/form-data") ||
    c.includes("application/x-www-form-urlencoded")
  );
}

/* =========================================================
   Storage download (JSON flow)
========================================================= */
async function downloadStorageFile(file_path: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage
    .from("uploads")
    .download(file_path);

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

function normalizeMaxGewicht(v: any): number | null {
  if (v == null) return null;

  const raw = String(v).trim();
  if (!raw) return null;

  const cleaned = raw.replace(",", ".").replace(/\s+/g, "");
  const numeric = cleaned.replace(/[^0-9.\-]/g, "");

  if (!numeric) return null;

  const n = Number(numeric);
  if (!Number.isFinite(n)) return null;

  return Math.abs(n);
}

function normalizeWeightNotation(v: any): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function normalizeWeightType(v: any): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;

  if (s === "exact" || s === "up_to" || s === "open_above") {
    return s;
  }

  return null;
}

function inferMaxGewichtType(notatie: any, waarde: any): "up_to" | "open_above" | null {
  const s = String(notatie ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (/^(\+?95|95\+)kg?$/.test(s) || /^\+95kg?$/.test(s) || /^95\+kg?$/.test(s)) {
    return "open_above";
  }
  if (/\d\+/.test(s) || /^\+\d/.test(s)) return "open_above";

  const n = normalizeMaxGewicht(waarde ?? notatie);
  if (n == null) return null;
  return "up_to";
}

function normalizeMaxGewichtNotationForBout(notatie: any, waarde: any, type: any): string | null {
  const t = normalizeWeightType(type) ?? inferMaxGewichtType(notatie, waarde);
  const n = normalizeMaxGewicht(waarde ?? notatie);

  if (t === "open_above") {
    const base = n ?? normalizeMaxGewicht(notatie) ?? 95;
    return `${base}+`;
  }

  if (t === "up_to") {
    if (n == null) return null;
    return `-${n}`;
  }

  if (n == null) return normalizeWeightNotation(notatie);
  return `-${n}`;
}

function normalizeMaxGewichtTypeForBout(notatie: any, waarde: any, type: any): "up_to" | "open_above" | null {
  return normalizeWeightType(type) as any ?? inferMaxGewichtType(notatie, waarde);
}

function normalizeToernooiCode(v: any): string | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return null;
  if (/^T\d{1,3}$/.test(s)) return s;
  return null;
}

function boutFingerprint(opts: {
  vaR: string | null;
  vaB: string | null;
  discipline: any;
  klasse: any;
  is_toernooi?: any;
  toernooi_code?: any;
}) {
  const pair = canonVaPair(opts.vaR, opts.vaB);
  if (!pair) return null;

  const d = normUpper(opts.discipline);
  const k = normUpper(opts.klasse);

  const tBool = toBoolLoose(opts.is_toernooi);
  const t = tBool == null ? "" : tBool ? "||T" : "||F";

  const tc = normalizeToernooiCode(opts.toernooi_code);
  const tcPart = tc ? `||${tc}` : "";

  return `${pair}||${d}||${k}${t}${tcPart}`;
}

type ExistingBoutIndexRow = {
  id: number | string;
  bout_uid: string | null;
  va_rood: string | null;
  va_blauw: string | null;
  discipline: string | null;
  klasse: string | null;
  is_toernooi: boolean | null;
  toernooi_code: string | null;
  verwijderd?: boolean | null;
};

async function fetchExistingBoutIndex(matchmaking_id: string) {
  const index = new Map<string, ExistingBoutIndexRow[]>();
  const all: ExistingBoutIndexRow[] = [];

  const { data, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select(
      "id,bout_uid,va_rood,va_blauw,discipline,klasse,is_toernooi,toernooi_code,verwijderd"
    )
    .eq("matchmaking_id", matchmaking_id);

  if (error) throw error;

  for (const r of (data ?? []) as ExistingBoutIndexRow[]) {
    all.push(r);

    if ((r as any)?.verwijderd === true) continue;

    const vaR = toVaStrict((r as any)?.va_rood);
    const vaB = toVaStrict((r as any)?.va_blauw);

    const fp = boutFingerprint({
      vaR,
      vaB,
      discipline: (r as any)?.discipline,
      klasse: (r as any)?.klasse,
      is_toernooi: (r as any)?.is_toernooi,
      toernooi_code: (r as any)?.toernooi_code,
    });

    if (!fp) continue;

    if (!index.has(fp)) index.set(fp, []);
    index.get(fp)!.push(r);
  }

  return { index, all };
}

const ALLOWED_BONDTEAMS = new Set([
  "IRO",
  "NKF",
  "WPKL",
  "WMTA",
  "VON",
  "UMC",
  "MMAAN",
  "MON",
]);

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

function resolveLifecycleBronType(role: RoleName): string {
  if (role === "matchmaker") return "matchmaker_upload";
  if (role === "admin" || role === "superadmin") return "admin_upload";
  return "official_upload";
}

/* =========================================================
   Main route
========================================================= */
export async function POST(req: Request) {
  try {
    const auth = await requireAnyRole(req, [
      "superadmin",
      "admin",
      "matchmaker",
      "official",
      "hoofdofficial",
    ]);
    const userId = auth.userId;
    const role = roleLower(auth.role);

    let evenement_naam = "";
    let evenement_datum = "";
    let locatie: string | null = null;

    let matchmaker: string | null = null;
    let bondteam: string | null = null;
    let hoofdofficial: string | null = null;
    let promotor: string | null = null;

    const uploaded_by: string = userId;

    let matchmaking_id: string | null = null;
    let force_new = false;

    let event_id: string | null = null;

    const upload_token = randomUUID();
    let lifecycleBronType: string | null = null;
    let raw_filename: string | null = null;

    let bouts: any[] = [];

    lifecycleBronType = resolveLifecycleBronType(role);

    if (isJson(req)) {
      const body = await req.json();

      const file_path = String(body.file_path ?? "").trim();
      raw_filename = body.raw_filename ? String(body.raw_filename) : null;

      evenement_naam = String(body.evenement_naam ?? "").trim();
      evenement_datum = String(body.evenement_datum ?? "").trim();
      locatie = body.locatie ? String(body.locatie).trim() : null;

      matchmaker = body.matchmaker ? String(body.matchmaker).trim() : null;

      const bondteamRaw = body.bondteam ? String(body.bondteam).trim() : null;
      bondteam =
        bondteamRaw && ALLOWED_BONDTEAMS.has(bondteamRaw)
          ? bondteamRaw
          : bondteamRaw;

      hoofdofficial = body.hoofdofficial
        ? String(body.hoofdofficial).trim()
        : null;
      promotor = body.promotor ? String(body.promotor).trim() : null;

      matchmaking_id = body.matchmaking_id
        ? String(body.matchmaking_id).trim()
        : null;
      force_new = Boolean(body.force_new ?? false);

      event_id = body.event_id ? String(body.event_id).trim() : null;

      if (!file_path) {
        return NextResponse.json(
          { error: "JSON mist file_path." },
          { status: 400 }
        );
      }

      const buffer = await downloadStorageFile(file_path);
      bouts = await parseExcelToBouts(buffer);
    } else if (isForm(req)) {
      const form = await req.formData();
      const file = form.get("file") as File | null;

      evenement_naam = String(form.get("evenement_naam") ?? "").trim();
      evenement_datum = String(form.get("evenement_datum") ?? "").trim();
      locatie = String(form.get("locatie") ?? "").trim() || null;

      matchmaker = String(form.get("matchmaker") ?? "").trim() || null;

      const bondteamRaw = String(form.get("bondteam") ?? "").trim() || null;
      bondteam =
        bondteamRaw && ALLOWED_BONDTEAMS.has(bondteamRaw)
          ? bondteamRaw
          : bondteamRaw;

      hoofdofficial = String(form.get("hoofdofficial") ?? "").trim() || null;
      promotor = String(form.get("promotor") ?? "").trim() || null;

      matchmaking_id = String(form.get("matchmaking_id") ?? "").trim() || null;
      force_new = String(form.get("force_new") ?? "false") === "true";

      event_id = String(form.get("event_id") ?? "").trim() || null;

      if (!file) {
        return NextResponse.json(
          { error: "Geen file ontvangen." },
          { status: 400 }
        );
      }

      raw_filename = (file as any)?.name ? String((file as any).name) : null;

      const ab = await file.arrayBuffer();
      const buffer = Buffer.from(ab);
      bouts = await parseExcelToBouts(buffer);
    } else {
      return NextResponse.json(
        {
          error:
            "Onjuiste Content-Type. Gebruik application/json of multipart/form-data.",
        },
        { status: 415 }
      );
    }

    if (!evenement_naam || !evenement_datum) {
      return bad("Vul verplicht in: evenement_naam en evenement_datum.");
    }
    if (!bondteam) {
      return bad("Bondteam is verplicht.");
    }
    if (!ALLOWED_BONDTEAMS.has(String(bondteam))) {
      return bad("Onbekend bondteam.");
    }

    if (role === "official" || role === "hoofdofficial") {
      const userBond = await getUserBondteam(userId);
      if (!userBond) return bad("Je profiel mist bondteam.", 403);
      if (String(userBond) !== String(bondteam)) {
        return bad(
          "Bondteam mismatch: je mag alleen uploaden voor je eigen bondteam.",
          403
        );
      }

      const mm = String(matchmaker ?? "").trim();
      const pr = String(promotor ?? "").trim();
      if (!mm && !pr) {
        return bad("Vul matchmaker of promotor in (minimaal één).", 400);
      }
    } else {
      const mm = String(matchmaker ?? "").trim();
      const existingUploadTarget = !force_new && String(matchmaking_id ?? "").trim();
      if (!mm && !existingUploadTarget) {
        return bad("Matchmaker is verplicht.", 400);
      }
    }

    const now = new Date().toISOString();

    const incomingMatchmakingId = !force_new && matchmaking_id
      ? String(matchmaking_id).trim()
      : "";

    let existingMatchmakingForReuse: any = null;
    if (incomingMatchmakingId) {
      const { data: existingMatchmaking, error: existingMatchmakingErr } =
        await supabaseAdmin
          .from("matchmakings")
          .select("id,event_id,matchmaker_id,maker_type,maker_user_id,bron_type")
          .eq("id", incomingMatchmakingId)
          .maybeSingle();

      if (existingMatchmakingErr) {
        return NextResponse.json(
          { error: existingMatchmakingErr.message },
          { status: 500 }
        );
      }

      if (!existingMatchmaking) {
        return NextResponse.json(
          { error: "De opgegeven matchmaking_id bestaat niet." },
          { status: 400 }
        );
      }

      existingMatchmakingForReuse = existingMatchmaking;
    }

    let evId = event_id ? String(event_id).trim() : "";
    if (!evId && existingMatchmakingForReuse?.event_id) {
      evId = String(existingMatchmakingForReuse.event_id).trim();
    }

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

      if (evErr) {
        return NextResponse.json({ error: evErr.message }, { status: 500 });
      }
      evId = String((ev as any)?.id ?? "").trim();
    } else {
      const { data: ex, error: exErr } = await supabaseAdmin
        .from("events")
        .select("id")
        .eq("id", evId)
        .maybeSingle();

      if (exErr) {
        return NextResponse.json({ error: exErr.message }, { status: 500 });
      }
      if (!ex) {
        return NextResponse.json(
          { error: "event_id bestaat niet (events)." },
          { status: 400 }
        );
      }
    }

    let mmId = "";

    const makerType =
      existingMatchmakingForReuse?.maker_type ??
      (role === "matchmaker" ? "matchmaker" : null);
    const makerUserId =
      existingMatchmakingForReuse?.maker_user_id ??
      (role === "matchmaker" ? userId : null);
    const matchmakerIdForRow =
      existingMatchmakingForReuse?.matchmaker_id ??
      (role === "matchmaker" ? userId : null);

const lifecycleStage = "concept_matchmaking" as const;
const lifecycleOwnerType =
  role === "admin" || role === "superadmin" ? "admin" : "matchmaker";
const lifecycleOwnerUserId =
  lifecycleOwnerType === "admin" || lifecycleOwnerType === "matchmaker"
    ? userId
    : null;
const lifecycleOwnerBondteam = null;

    if (incomingMatchmakingId) {
      const s = incomingMatchmakingId;

      const { error: updateMmErr } = await supabaseAdmin
        .from("matchmakings")
        .update({
          naam: evenement_naam,
          datum: evenement_datum,
          locatie,
          bondteam,

          maker_type: makerType,
          maker_user_id: makerUserId,

          matchmaker_id: matchmakerIdForRow,
          status: lifecycleStage,
          bron_type: lifecycleBronType,
          stadium: lifecycleStage,

          huidige_eigenaar_type: lifecycleOwnerType,
          huidige_eigenaar_user_id: lifecycleOwnerUserId,
          huidige_eigenaar_bondteam: lifecycleOwnerBondteam,

          last_updated_at: now,
          last_updated_by: userId,
          event_id: evId || null,
        })
        .eq("id", s);

      if (updateMmErr) {
        return NextResponse.json(
          { error: updateMmErr.message },
          { status: 500 }
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
          bondteam,

          maker_type: makerType,
          maker_user_id: makerUserId,

          matchmaker_id: matchmakerIdForRow,
          created_at: now,
          status: lifecycleStage,
          bron_type: lifecycleBronType,
          stadium: lifecycleStage,

          huidige_eigenaar_type: lifecycleOwnerType,
          huidige_eigenaar_user_id: lifecycleOwnerUserId,
          huidige_eigenaar_bondteam: lifecycleOwnerBondteam,

          last_updated_at: now,
          last_updated_by: userId,
          event_id: evId || null,
        })
        .select("id")
        .single();

      if (mmError) {
        return NextResponse.json({ error: mmError.message }, { status: 500 });
      }

      mmId = String((mm as any)?.id ?? "").trim();
      if (!mmId) {
        return NextResponse.json(
          { error: "Kon matchmaking id niet bepalen." },
          { status: 500 }
        );
      }
    }

    await ensureLifecycleRecord({
      matchmakingId: String(mmId),
      naam: evenement_naam || null,
      datum: evenement_datum || null,
      locatie: locatie || null,
      matchmakerId: makerUserId,
      makerType,
      makerUserId,
      bondteam: bondteam || null,
      eventId: evId || null,
      bronType: lifecycleBronType,
      stage: lifecycleStage,
      ownerType: lifecycleOwnerType,
      ownerUserId: lifecycleOwnerUserId,
      ownerBondteam: lifecycleOwnerBondteam,
      actorUserId: userId,
      actorRole: role,
      metadata: { route: "app/api/submit_matchmaking/start/route.ts" },
    });

    const lifecycleBondteam = bondteam;

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

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const uploadIdFinal = String((uploadRow as any)?.id ?? "").trim();

    const { index: existingIndex, all: existingBouts } = await fetchExistingBoutIndex(mmId);
    const isHerupload = Boolean(incomingMatchmakingId);

    let updated = 0;
    let reused = 0;
    let ambiguous = 0;
    let created = 0;
    let removed = 0;

    const rows: any[] = [];
    const updates: Array<{ id: string | number; values: any }> = [];
    const touchedExistingIds = new Set<string>();

    for (const b of bouts ?? []) {
      const vaR = toVaStrict(
        (b as any)?.va_rood ??
          (b as any)?.rood_va ??
          (b as any)?.rood_va_mm
      );
      const vaB = toVaStrict(
        (b as any)?.va_blauw ??
          (b as any)?.blauw_va ??
          (b as any)?.blauw_va_mm
      );

      const discipline = normUpper((b as any)?.discipline ?? "");
      const klasse = normUpper((b as any)?.klasse ?? "");
      const is_toernooi =
        (b as any)?.is_toernooi ?? (b as any)?.toernooi ?? null;

      const toernooi_code = normalizeToernooiCode(
        (b as any)?.toernooi_code ?? (b as any)?.extra?.toernooi_code
      );

      const fp = boutFingerprint({
        vaR,
        vaB,
        discipline,
        klasse,
        is_toernooi,
        toernooi_code,
      });

      const insertBoutUid = (b as any)?.bout_uid
        ? String((b as any).bout_uid).trim()
        : randomUUID();

      const baseValues = {
        upload_id: uploadIdFinal,
        matchmaking_id: mmId,

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
        toernooi_code,

        max_gewicht: normalizeMaxGewicht((b as any)?.max_gewicht),
        max_gewicht_notatie: normalizeMaxGewichtNotationForBout(
          (b as any)?.max_gewicht_notatie,
          (b as any)?.max_gewicht,
          (b as any)?.extra?.max_gewicht_type
        ),
        max_gewicht_type: normalizeMaxGewichtTypeForBout(
          (b as any)?.max_gewicht_notatie,
          (b as any)?.max_gewicht,
          (b as any)?.extra?.max_gewicht_type
        ),

        raw_json: {
          ...((b as any)?.extra ?? {}),
          toernooi_code:
            toernooi_code ?? (b as any)?.extra?.toernooi_code ?? null,
          herupload_upload_id: isHerupload ? uploadIdFinal : null,
        },

        verwijderd: false,
        verwijderd_op: null,
        laatste_bewerking_op: now,
      };

      if (fp) {
        const list = existingIndex.get(fp) ?? [];
        if (list.length === 1) {
          const existing = list[0];
          const existingId = (existing as any).id;
          const existingBoutUid = String((existing as any).bout_uid ?? "").trim();

          touchedExistingIds.add(String(existingId));
          reused++;
          updated++;

          updates.push({
            id: existingId,
            values: {
              ...baseValues,
              bout_uid: existingBoutUid || insertBoutUid,
            },
          });
          continue;
        }

        if (list.length > 1) {
          ambiguous++;
        }
      }

      created++;
      rows.push({
        ...baseValues,
        bout_uid: insertBoutUid,
        created_at: now,
      });
    }

    for (const u of updates) {
      const { error: updateBoutErr } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .update(u.values)
        .eq("id", u.id);

      if (updateBoutErr) {
        return NextResponse.json(
          { error: updateBoutErr.message },
          { status: 500 }
        );
      }
    }

    if (rows.length) {
      const { error: boutErr } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .insert(rows);

      if (boutErr) {
        return NextResponse.json({ error: boutErr.message }, { status: 500 });
      }
    }

    if (isHerupload) {
      const idsToSoftDelete = existingBouts
        .filter((r) => (r as any)?.verwijderd !== true)
        .map((r) => (r as any)?.id)
        .filter((id) => id != null && !touchedExistingIds.has(String(id)));

      if (idsToSoftDelete.length) {
        const { error: removeErr } = await supabaseAdmin
          .from("matchmaking_bouts_raw")
          .update({
            verwijderd: true,
            verwijderd_op: now,
            laatste_bewerking_op: now,
          })
          .in("id", idsToSoftDelete);

        if (removeErr) {
          return NextResponse.json(
            { error: removeErr.message },
            { status: 500 }
          );
        }

        removed = idsToSoftDelete.length;
      }
    }


    return NextResponse.json({
      ok: true,
      upload_id: uploadIdFinal,
      upload_token,
      matchmaking_id: mmId,
      event_id: evId,
      lifecycle: {
        bron_type: lifecycleBronType,
        stadium: lifecycleStage,
        eigenaar_type: lifecycleOwnerType,
        eigenaar_bondteam: lifecycleBondteam,
      },
      stats: {
        total: rows.length + updates.length,
        inserted: rows.length,
        updated,
        removed,
        reused,
        ambiguous,
        created,
        toernooi_rows:
          rows.filter((r) => r.is_toernooi === true).length +
          updates.filter((u) => u.values?.is_toernooi === true).length,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Onbekende fout" },
      { status: 500 }
    );
  }
}