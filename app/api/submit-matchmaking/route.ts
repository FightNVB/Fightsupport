// app/api/submit-matchmaking/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { parseExcelToBouts } from "./parse_matchmaking";
import { getUserBondteam, requireAnyRole, RoleName } from "../_utils/authz";
import { ensureLifecycleRecord } from "../_utils/matchmakingLifecycle";

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

async function fetchExistingBoutUidIndex(matchmaking_id: string) {
  const index = new Map<string, string[]>();

  const { data, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select(
      "bout_uid,va_rood,va_blauw,discipline,klasse,is_toernooi,toernooi_code"
    )
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
      toernooi_code: (r as any)?.toernooi_code,
    });

    if (!fp) continue;

    if (!index.has(fp)) index.set(fp, []);
    index.get(fp)!.push(uid);
  }

  return index;
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

function isNvbOrEmptyBondteam(v: any): boolean {
  const s = String(v ?? "").trim().toUpperCase();
  return !s || s === "NVB";
}

function resolveLifecycleBronType(role: RoleName, bondteamForRole?: string | null): string {
  if (role === "matchmaker") return "matchmaker_upload";

  // Superadmin met NVB/leeg is centrale admin.
  // Superadmin met een ander bondteam uploadt namens het eigen bondteam
  // en mag dus niet automatisch naar de admin-flow schieten.
  if (role === "superadmin") {
    return isNvbOrEmptyBondteam(bondteamForRole) ? "admin_upload" : "official_upload";
  }

  if (role === "admin") return "admin_upload";
  return "official_upload";
}


type UploadUserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  bondteam: string | null;
  role: string | null;
};

async function findUserProfileForUpload(auth: any): Promise<UploadUserProfile> {
  const authProfileId = String(
    auth?.profile?.id ?? auth?.userProfile?.id ?? auth?.profileId ?? ""
  ).trim();
  const authEmail = String(
    auth?.profile?.email ?? auth?.userProfile?.email ?? auth?.email ?? auth?.user?.email ?? ""
  )
    .trim()
    .toLowerCase();
  const fallbackAuthUserId = String(auth?.userId ?? auth?.id ?? auth?.user?.id ?? "").trim();

  // Voor FightSupport is public.user_profiles leidend voor applicatie-login:
  // id + role + bondteam komen uit user_profiles. uploaded_by verwijst ook naar user_profiles(id).
  // Daarom zoeken we eerst op profiel-id als authz die meegeeft, anders op e-mail.
  let query = supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, email, bondteam, role");

  if (authProfileId) {
    query = query.eq("id", authProfileId);
  } else if (authEmail) {
    query = query.ilike("email", authEmail);
  } else if (fallbackAuthUserId) {
    query = query.eq("id", fallbackAuthUserId);
  } else {
    throw new Error("Geen ingelogde gebruiker gevonden voor deze upload.");
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Ingelogde gebruiker zoeken in public.user_profiles mislukt: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error(
      "Ingelogde gebruiker bestaat niet in public.user_profiles. " +
        `Gezocht met profileId=${authProfileId || "-"}, email=${authEmail || "-"}, fallbackUserId=${fallbackAuthUserId || "-"}. ` +
        "Voor uploads moet de ingelogde gebruiker als rij in public.user_profiles bestaan."
    );
  }

  return data as UploadUserProfile;
}


async function assertPublicUserProfileId(profileId: string): Promise<UploadUserProfile> {
  const id = String(profileId ?? "").trim();
  if (!id) {
    throw new Error("Geen public.user_profiles.id bepaald voor matchmaking_uploads.uploaded_by.");
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, email, bondteam, role")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Controle uploaded_by in public.user_profiles mislukt: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error(
      `Ongeldige uploaded_by voor matchmaking_uploads: ${id}. ` +
        "Deze waarde bestaat niet in public.user_profiles.id. " +
        "Gebruik de profiel-id uit public.user_profiles, niet auth.users.id."
    );
  }

  return data as UploadUserProfile;
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
    const authUserId = String((auth as any)?.userId ?? "").trim();
    const authRole = roleLower((auth as any)?.role);
    let profileForUpload: UploadUserProfile | null = null;
    let userId = "";
    let role: RoleName = authRole;

    let evenement_naam = "";
    let evenement_datum = "";
    let locatie: string | null = null;

    let matchmaker: string | null = null;
    let bondteam: string | null = null;
    let hoofdofficial: string | null = null;
    let promotor: string | null = null;

    let uploaded_by = "";

    let matchmaking_id: string | null = null;
    let force_new = false;

    let event_id: string | null = null;

    const upload_token = randomUUID();
    let lifecycleBronType: string | null = null;
    let raw_filename: string | null = null;

    let requestedLifecycleMode: string | null = null;
    let requestedKeepOwner: string | null = null;

    let bouts: any[] = [];

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

      requestedLifecycleMode = body.lifecycle_mode
        ? String(body.lifecycle_mode).trim().toLowerCase()
        : null;
      requestedKeepOwner = body.keep_owner
        ? String(body.keep_owner).trim().toLowerCase()
        : null;

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

      requestedLifecycleMode =
        String(form.get("lifecycle_mode") ?? "").trim().toLowerCase() || null;
      requestedKeepOwner =
        String(form.get("keep_owner") ?? "").trim().toLowerCase() || null;

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

    profileForUpload = await findUserProfileForUpload(auth);

    console.log("[submit-matchmaking] ingelogde user_profiles gebruiker", {
      id: profileForUpload.id,
      email: profileForUpload.email,
      role: profileForUpload.role,
      bondteam: profileForUpload.bondteam,
      authUserId,
    });

    // BELANGRIJK VOOR fk_upload_user:
    // matchmaking_uploads.uploaded_by verwijst naar public.user_profiles(id).
    // Gebruik hier dus nooit auth.users.id. Controleer dit hard voordat we insert doen.
    profileForUpload = await assertPublicUserProfileId(profileForUpload.id);
    userId = String(profileForUpload.id).trim();
    uploaded_by = userId;

    role = roleLower(profileForUpload.role ?? authRole);

    if (!matchmaker && role === "matchmaker") {
      matchmaker = profileForUpload.full_name || profileForUpload.email || null;
    }

    if (!bondteam && profileForUpload.bondteam) {
      const profileBondteam = String(profileForUpload.bondteam).trim().toUpperCase();
      if (ALLOWED_BONDTEAMS.has(profileBondteam)) bondteam = profileBondteam;
    }

    lifecycleBronType = resolveLifecycleBronType(role, bondteam ?? profileForUpload.bondteam);

    if (!evenement_naam || !evenement_datum) {
      return bad("Vul verplicht in: evenement_naam en evenement_datum.");
    }
    if (!bondteam) {
      return bad("Bondteam is verplicht.");
    }
    if (!ALLOWED_BONDTEAMS.has(String(bondteam))) {
      return bad("Onbekend bondteam.");
    }

    const isBondteamSuperadmin = role === "superadmin" && !isNvbOrEmptyBondteam(bondteam);

    if (role === "official" || role === "hoofdofficial" || isBondteamSuperadmin) {
      const userBond = await getUserBondteam(userId);
      if (!userBond) return bad("Je profiel mist bondteam.", 403);

      const normalizedUserBond = String(userBond).trim().toUpperCase();
      const normalizedUploadBond = String(bondteam).trim().toUpperCase();

      if (normalizedUserBond !== normalizedUploadBond) {
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
      if (!mm) {
        return bad("Matchmaker is verplicht.", 400);
      }
    }

    const now = new Date().toISOString();

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

    const isOfficialUpload =
      role === "official" ||
      role === "hoofdofficial" ||
      (role === "superadmin" && !isNvbOrEmptyBondteam(bondteam));

    // Belangrijk:
    // - uploaded_by moet altijd public.user_profiles.id zijn, niet auth.users.id.
    // - Een hoofdofficial/official of superadmin van een ander bondteam dan NVB
    //   uploadt namens het eigen bondteam en houdt de MM daar om hem zelf te controleren.
    // - Alleen matchmaker-uploads gaan automatisch naar admin-controle.
    const makerType =
      role === "matchmaker"
        ? "matchmaker"
        : isOfficialUpload
          ? role
          : role === "admin" || role === "superadmin"
            ? "admin"
            : null;

    const makerUserId = userId;

    // matchmaker_id alleen vullen als de ingelogde maker echt matchmaker is.
    // Bij hoofdofficial/admin uploads is er vaak alleen een tekstveld matchmaker/promotor.
    const matchmakerIdForRow = role === "matchmaker" ? userId : null;

    const shouldSendToAdmin =
      !isOfficialUpload &&
      (
        requestedLifecycleMode === "submitted_to_admin" ||
        requestedKeepOwner === "admin" ||
        role === "matchmaker"
      );

    const lifecycleStage = shouldSendToAdmin
      ? "ingediend_admin"
      : ("concept_matchmaking" as const);

    const lifecycleOwnerType = shouldSendToAdmin
      ? "admin"
      : isOfficialUpload
        ? "bondteam"
        : "admin";

    const lifecycleOwnerUserId = shouldSendToAdmin ? null : isOfficialUpload ? userId : null;
    const lifecycleOwnerBondteam = shouldSendToAdmin ? null : isOfficialUpload ? bondteam : null;
    const submittedToAdminAt = shouldSendToAdmin ? now : null;

    if (!force_new && matchmaking_id) {
      const s = String(matchmaking_id).trim();
      if (!s) {
        return NextResponse.json(
          { error: "matchmaking_id is leeg." },
          { status: 400 }
        );
      }

      const { data: existingMatchmaking, error: existingMatchmakingErr } =
        await supabaseAdmin
          .from("matchmakings")
          .select("id")
          .eq("id", s)
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
          final_status: lifecycleStage,
          submitted_to_admin_at: submittedToAdminAt,

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
          final_status: lifecycleStage,
          submitted_to_admin_at: submittedToAdminAt,

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
      makerType: makerType === "matchmaker" ? "matchmaker" : "matchmaker_upload",
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
      metadata: {
        route: "app/api/submit-matchmaking/route.ts",
        auth_user_id: authUserId,
        requested_lifecycle_mode: requestedLifecycleMode,
        requested_keep_owner: requestedKeepOwner,
      },
    });

    const lifecycleBondteam = bondteam;

    // Laatste beveiliging tegen FK-fout: uploaded_by moet exact public.user_profiles.id zijn.
    // Dit voorkomt dat auth.users.id zoals e43d7b0c-... per ongeluk wordt opgeslagen.
    uploaded_by = userId;
    await assertPublicUserProfileId(uploaded_by);

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

    const existingIndex = await fetchExistingBoutUidIndex(mmId);

    let reused = 0;
    let ambiguous = 0;
    let created = 0;

    const rows: any[] = [];

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

      let bout_uid = (b as any)?.bout_uid
        ? String((b as any).bout_uid).trim()
        : randomUUID();

      if (fp) {
        const list = existingIndex.get(fp) ?? [];
        if (list.length === 1) {
          bout_uid = list[0];
          reused++;
        } else if (list.length > 1) {
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
        },

        created_at: now,
      });
    }

    if (rows.length) {
      const { error: boutErr } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .insert(rows);

      if (boutErr) {
        return NextResponse.json({ error: boutErr.message }, { status: 500 });
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
        total: rows.length,
        reused,
        ambiguous,
        created,
        toernooi_rows: rows.filter((r) => r.is_toernooi === true).length,
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