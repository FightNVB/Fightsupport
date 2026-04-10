import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/api/requireRole";
import { runOfficialsControlJob } from "@/lib/control/runOfficialsControlJob";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type MatchmakingRow = {
  id: string;
  bondteam: string | null;
  huidige_eigenaar_type: string | null;
  huidige_eigenaar_user_id: string | null;
  huidige_eigenaar_bondteam: string | null;
  is_actief: boolean | null;
  is_archived: boolean | null;
};

type ProfileRow = {
  id: string;
  role: string | null;
  bondteam: string | null;
};

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

async function assertOfficialCanStartMatchmaking(
  matchmaking_id: string,
  userId: string,
  roles: string[]
) {
  const normalizedRoles = (roles ?? []).map((r) => norm(r)).filter(Boolean);
  const isAdmin =
    normalizedRoles.includes("admin") || normalizedRoles.includes("superadmin");

  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("id, role, bondteam")
    .eq("id", userId)
    .single<ProfileRow>();

  if (profileErr || !profile) {
    throw new Error(`Profiel niet gevonden: ${profileErr?.message ?? "onbekend"}`);
  }

  const { data: mm, error: mmErr } = await supabase
    .from("matchmakings")
    .select(
      "id, bondteam, huidige_eigenaar_type, huidige_eigenaar_user_id, huidige_eigenaar_bondteam, is_actief, is_archived"
    )
    .eq("id", matchmaking_id)
    .single<MatchmakingRow>();

  if (mmErr || !mm) {
    throw new Error(`Matchmaking niet gevonden: ${mmErr?.message ?? "onbekend"}`);
  }

  if (isAdmin) return;

  if (mm.is_archived) {
    throw new Error("Deze matchmaking is gearchiveerd.");
  }

  if (mm.is_actief === false) {
    throw new Error("Deze matchmaking is niet actief.");
  }

  const profileRole = norm(profile.role);
  const userBondteam = norm(profile.bondteam);

  const ownerType = norm(mm.huidige_eigenaar_type);
  const ownerUserId = String(mm.huidige_eigenaar_user_id ?? "").trim();
  const ownerBondteam = norm(mm.huidige_eigenaar_bondteam);
  const matchmakingBondteam = norm(mm.bondteam);

  const isOfficialRole =
    profileRole === "official" || profileRole === "hoofdofficial";

  if (!isOfficialRole) {
    throw new Error(`Geen toegang. Rol ${profile.role ?? ""} is niet toegestaan.`);
  }

  if (ownerUserId && ownerUserId === userId) {
    return;
  }

  const bondteamMatches =
    userBondteam !== "" &&
    (
      (ownerBondteam !== "" && ownerBondteam === userBondteam) ||
      (matchmakingBondteam !== "" && matchmakingBondteam === userBondteam)
    );

  const ownerIsOfficialsSide =
    ownerType === "bondteam" ||
    ownerType === "official" ||
    ownerType === "hoofdofficial";

  if (ownerIsOfficialsSide && bondteamMatches) {
    return;
  }

  throw new Error("Geen toegang tot deze matchmaking.");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    const { userId, roles } = await requireRole(req, [
      "official",
      "hoofdofficial",
      "admin",
      "superadmin",
    ]);

    await assertOfficialCanStartMatchmaking(matchmaking_id, userId, roles);

    const payload = {
      do_scrape: body?.do_scrape !== false,
      workers: body?.workers ?? 8,
      stagger_ms: body?.stagger_ms ?? 250,
      tab_attempts: body?.tab_attempts ?? 8,
      soft_wait_ms: body?.soft_wait_ms ?? 900,
      between_attempts_ms: body?.between_attempts_ms ?? 450,
      fullfighter_timeout_ms: body?.fullfighter_timeout_ms ?? 35000,
      uitslagen_timeout_ms: body?.uitslagen_timeout_ms ?? 90000,
      uitslagen_tries: body?.uitslagen_tries ?? 1,
      scrape_mode: body?.scrape_mode ?? "auto",
      reset_before_run: body?.reset_before_run === true,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("official_control_queue")
      .insert({
        matchmaking_id,
        requested_by: userId,
        status: "running",
        payload,
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertErr) {
      throw new Error(
        `Insert official_control_queue mislukt: ${insertErr.message} (${insertErr.code ?? "geen code"})`
      );
    }

    const result = await runOfficialsControlJob({
      queueJobId: inserted.id,
      matchmaking_id,
      payload,
    });

    return NextResponse.json({
      ok: true,
      queued: false,
      started_directly: true,
      job_id: inserted.id,
      matchmaking_id,
      result,
    });
  } catch (err: any) {
    if (err instanceof Response) return err;

    const message = String(err?.message ?? "Onbekende fout");
    const lowered = message.toLowerCase();

    return NextResponse.json(
      { error: message },
      {
        status:
          lowered.includes("geen toegang")
            ? 403
            : lowered.includes("niet ingelogd")
            ? 401
            : lowered.includes("ontbreekt")
            ? 400
            : 500,
      }
    );
  }
}