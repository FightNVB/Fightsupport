// app/api/matchmaker/submit-matchmaking/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { parseExcelToBouts } from "./parse_matchmaking";
import { requireAnyRole, RoleName } from "../../_utils/authz";
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

function isOpenOpponentName(v: any): boolean {
  const s = String(v ?? "")
    .toLowerCase()
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [
    "tba",
    "t b a",
    "gezocht",
    "tegenstander gezocht",
    "opponent gezocht",
    "nog gezocht",
    "to be announced",
  ].includes(s);
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
  "FOG",
  "MMAAN",
  "MON",
]);

function normalizeBondteamValue(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function findDuplicatePartijNrs(bouts: any[]): number[] {
  const seen = new Set<number>();
  const duplicates = new Set<number>();

  for (const b of bouts ?? []) {
    if ((b as any)?.is_toernooi === true) continue;

    const raw = (b as any)?.partij_nr;
    if (raw == null || raw === "") continue;

    const nr = Number(raw);
    if (!Number.isInteger(nr) || nr <= 0) continue;

    if (seen.has(nr)) duplicates.add(nr);
    seen.add(nr);
  }

  return Array.from(duplicates).sort((a, b) => a - b);
}

function duplicatePartijNrsResponse(duplicates: number[]) {
  return NextResponse.json(
    {
      error: "Dubbele partijnummers gevonden",
      duplicate_partij_nrs: duplicates,
      message: `Partijnummer(s) ${duplicates.join(", ")} komen dubbel voor in de matchmaking-upload. Pas de Excel aan en upload opnieuw.`,
    },
    { status: 400 }
  );
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

function resolveLifecycleBronType(role: RoleName): string {
  if (role === "matchmaker") return "matchmaker_upload";

  // Superadmin en admin uploaden altijd via de admin-flow,
  // ook wanneer zij een specifiek bondteam selecteren.
  if (role === "superadmin" || role === "admin") return "admin_upload";

  return "official_upload";
}


type UploadUserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  bondteam: string | null;
  role: string | null;
  active_role: string | null;
};


function normalizeAppRole(v: any): RoleName {
  const x = String(v ?? "").trim().toLowerCase();
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

async function getUserRoleNamesFromUserRoles(profileId: string): Promise<string[]> {
  const id = String(profileId ?? "").trim();
  if (!id) return [];

  const { data: rows, error: userRolesErr } = await supabaseAdmin
    .from("user_roles")
    .select("role_id")
    .eq("user_id", id);

  if (userRolesErr) {
    throw new Error(`Rollen ophalen uit user_roles mislukt: ${userRolesErr.message}`);
  }

  const roleIds = (rows ?? [])
    .map((r: any) => r?.role_id)
    .filter((v: any) => v != null && String(v).trim() !== "");

  if (roleIds.length === 0) return [];

  const { data: roles, error: rolesErr } = await supabaseAdmin
    .from("roles")
    .select("id, name")
    .in("id", roleIds);

  if (rolesErr) {
    throw new Error(`Rollen ophalen uit roles mislukt: ${rolesErr.message}`);
  }

  return Array.from(
    new Set(
      (roles ?? [])
        .map((r: any) => String(r?.name ?? "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

async function resolveActiveAppRoleForUpload(profile: UploadUserProfile): Promise<{
  activeRole: RoleName;
  allowedRoles: string[];
}> {
  const activeRole = normalizeAppRole(profile.active_role);
  const profileRole = normalizeAppRole(profile.role);
  const allowedRoles = await getUserRoleNamesFromUserRoles(profile.id);

  const allowedSet = new Set(allowedRoles.map((r) => r.toLowerCase()));

  if (activeRole !== "unknown") {
    if (!allowedSet.has(activeRole)) {
      throw new Error(
        `Actieve rol '${activeRole}' staat niet in user_roles voor deze gebruiker.`
      );
    }
    return { activeRole, allowedRoles: Array.from(allowedSet) };
  }

  if (profileRole !== "unknown" && allowedSet.has(profileRole)) {
    return { activeRole: profileRole, allowedRoles: Array.from(allowedSet) };
  }

  if (profileRole !== "unknown") {
    throw new Error(
      `Legacy rol '${profileRole}' staat niet in user_roles voor deze gebruiker.`
    );
  }

  {
    throw new Error("Geen geldige active_role gevonden in user_profiles.");
  }
}

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
    .select("id, full_name, email, bondteam, role, active_role");

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
    const auth = await requireAnyRole(req, ["matchmaker", "admin", "superadmin", "official", "hoofdofficial", "dispensatie_admin"]);
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
    let aantal_uren = 7;

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
      aantal_uren = Number(body.aantal_uren ?? 7);

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
      aantal_uren = Number(form.get("aantal_uren") ?? 7);

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


    const duplicatePartijNrs = findDuplicatePartijNrs(bouts);
    if (duplicatePartijNrs.length > 0) {
      return duplicatePartijNrsResponse(duplicatePartijNrs);
    }

    profileForUpload = await findUserProfileForUpload(auth);

    const { activeRole, allowedRoles } = await resolveActiveAppRoleForUpload(profileForUpload);

    console.log("[submit-matchmaking] ingelogde user_profiles gebruiker", {
      id: profileForUpload.id,
      email: profileForUpload.email,
      role: profileForUpload.role,
      active_role: profileForUpload.active_role,
      allowedRoles,
      resolved_active_role: activeRole,
      bondteam: profileForUpload.bondteam,
      authUserId,
      authRole,
    });

    if (activeRole !== "matchmaker") {
      return bad(
        `Deze upload hoort bij de actieve rol matchmaker. Huidige actieve rol: ${activeRole}.`,
        403
      );
    }

    // BELANGRIJK VOOR fk_upload_user:
    // matchmaking_uploads.uploaded_by verwijst naar public.user_profiles(id).
    // Gebruik hier dus nooit auth.users.id. Controleer dit hard voordat we insert doen.
    profileForUpload = await assertPublicUserProfileId(profileForUpload.id);
    userId = String(profileForUpload.id).trim();
    uploaded_by = userId;

    role = activeRole;

    if (!matchmaker && role === "matchmaker") {
      matchmaker = profileForUpload.full_name || profileForUpload.email || null;
    }

    if (!bondteam && profileForUpload.bondteam) {
      const profileBondteam = String(profileForUpload.bondteam).trim().toUpperCase();
      if (ALLOWED_BONDTEAMS.has(profileBondteam)) bondteam = profileBondteam;
    }

    lifecycleBronType = resolveLifecycleBronType(role);

    const normalizedBondteam = normalizeBondteamValue(bondteam);

    if (!evenement_naam || !evenement_datum) {
      return bad("Vul verplicht in: evenement_naam en evenement_datum.");
    }
    if (!normalizedBondteam) {
      return bad("Bondteam is verplicht.");
    }
    if (![7, 8, 9].includes(aantal_uren)) {
      return bad("aantal_uren moet 7, 8 of 9 zijn.");
    }
    if (!ALLOWED_BONDTEAMS.has(normalizedBondteam)) {
      return bad(`Onbekend bondteam: ${normalizedBondteam}.`);
    }

    // Vanaf hier is normalizedBondteam de enige bron voor matchmakings.bondteam.
    // De Excel-parser hoort hier niets mee te doen; dit komt uit het formulier/profiel.
    bondteam = normalizedBondteam;

    // Deze route is uitsluitend voor de actieve rol matchmaker.
    // Official/admin uploads horen via hun eigen routes te lopen.
    const mm = String(matchmaker ?? "").trim();
    if (!mm) {
      return bad("Matchmaker is verplicht.", 400);
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
          bondteam: normalizedBondteam,
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

    // Belangrijk:
    // - uploaded_by moet altijd public.user_profiles.id zijn, niet auth.users.id.
    // - Deze route is alleen voor matchmaker-uploads.
    // - Matchmaker-upload blijft lokaal bij de matchmaker tot /api/matchmaker/send-to-admin.
    const makerType = "matchmaker" as const;

    const makerUserId = userId;

    // matchmaker_id vullen met de ingelogde matchmaker.
    const matchmakerIdForRow = userId;

    // Matchmaker-upload blijft ALTIJD eerst bij de matchmaker.
    // Pas /api/matchmaker/send-to-admin zet hem op ingediend_admin.
    const lifecycleStage = "concept_matchmaking" as const;
    const lifecycleOwnerType = "matchmaker" as const;
    const lifecycleOwnerUserId = userId;
    const lifecycleOwnerBondteam = null;
    const submittedToAdminAt = null;

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
          bondteam: normalizedBondteam,
          aantal_uren,

          maker_type: makerType,
          maker_user_id: makerUserId,

          matchmaker_id: matchmakerIdForRow,
          matchmaker_naam: mm,
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
      const { data: insertedMatchmaking, error: mmError } = await supabaseAdmin
        .from("matchmakings")
        .insert({
          naam: evenement_naam,
          datum: evenement_datum,
          locatie,
          bondteam: normalizedBondteam,
          aantal_uren,

          maker_type: makerType,
          maker_user_id: makerUserId,

          matchmaker_id: matchmakerIdForRow,
          matchmaker_naam: mm,
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

      mmId = String((insertedMatchmaking as any)?.id ?? "").trim();
      if (!mmId) {
        return NextResponse.json(
          { error: "Kon matchmaking id niet bepalen." },
          { status: 500 }
        );
      }
    }

    const lifecycleMakerType = "matchmaker" as const;

    await ensureLifecycleRecord({
      matchmakingId: String(mmId),
      naam: evenement_naam || null,
      datum: evenement_datum || null,
      locatie: locatie || null,
      matchmakerId: makerUserId,
      makerType: lifecycleMakerType,
      makerUserId,
      bondteam: normalizedBondteam,
      eventId: evId || null,
      bronType: lifecycleBronType,
      stage: lifecycleStage,
      ownerType: lifecycleOwnerType,
      ownerUserId: lifecycleOwnerUserId,
      ownerBondteam: lifecycleOwnerBondteam,
      actorUserId: userId,
      actorRole: role,
      metadata: {
        route: "app/api/matchmaker/submit-matchmaking/route.ts",
        auth_user_id: authUserId,
        requested_lifecycle_mode: requestedLifecycleMode,
        requested_keep_owner: requestedKeepOwner,
        matchmaker_upload_kept_local: true,
        maker_type: makerType,
        lifecycle_maker_type: lifecycleMakerType,
      },
    });

    const lifecycleBondteam = normalizedBondteam;

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
        bondteam: normalizedBondteam,
        hoofdofficial,
        promotor,
        uploaded_by,
        uploaded_at: now,
        created_at: now,
      })
      .select("id")
      .single();

    if (uploadErr) {
      console.error("[submit-matchmaking] matchmaking_uploads insert mislukt", {
        error: uploadErr.message,
        code: (uploadErr as any)?.code,
        details: (uploadErr as any)?.details,
        hint: (uploadErr as any)?.hint,
        matchmaking_id: mmId,
        event_id: evId,
        uploaded_by,
        role,
        makerType,
        bondteam: normalizedBondteam,
      });
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const uploadIdFinal = String((uploadRow as any)?.id ?? "").trim();

    const existingIndex = await fetchExistingBoutUidIndex(mmId);

    let reused = 0;
    let ambiguous = 0;
    let created = 0;

    const rows: any[] = [];

    for (const b of bouts ?? []) {
      const roodOpen = isOpenOpponentName((b as any)?.rood_naam);
      const blauwOpen = isOpenOpponentName((b as any)?.blauw_naam);
      const vaR = roodOpen ? null : toVaStrict(
        (b as any)?.va_rood ??
          (b as any)?.rood_va ??
          (b as any)?.rood_va_mm
      );
      const vaB = blauwOpen ? null : toVaStrict(
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

        rood_naam: roodOpen ? "TBA" : (b as any)?.rood_naam ?? null,
        rood_gym: roodOpen ? null : (b as any)?.rood_gym ?? null,
        va_rood: vaR,
        rood_geboortedatum: roodOpen ? null : (b as any)?.rood_geboortedatum ?? null,
        rood_gewicht: roodOpen ? null : (b as any)?.rood_gewicht ?? null,

        blauw_naam: blauwOpen ? "TBA" : (b as any)?.blauw_naam ?? null,
        blauw_gym: blauwOpen ? null : (b as any)?.blauw_gym ?? null,
        va_blauw: vaB,
        blauw_geboortedatum: blauwOpen ? null : (b as any)?.blauw_geboortedatum ?? null,
        blauw_gewicht: blauwOpen ? null : (b as any)?.blauw_gewicht ?? null,

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
          rood_open_opponent: roodOpen || undefined,
          blauw_open_opponent: blauwOpen || undefined,
        },

        created_at: now,
      });
    }

    if (rows.length) {
      const { error: boutErr } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .insert(rows);

      if (boutErr) {
        console.error("[submit-matchmaking] matchmaking_bouts_raw insert mislukt", {
          error: boutErr.message,
          code: (boutErr as any)?.code,
          details: (boutErr as any)?.details,
          hint: (boutErr as any)?.hint,
          matchmaking_id: mmId,
          upload_id: uploadIdFinal,
          rows: rows.length,
        });
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
        eigenaar_user_id: lifecycleOwnerUserId,
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
