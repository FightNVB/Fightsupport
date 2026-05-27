import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

function cleanId(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function isMissingColumn(error: any, columnName: string) {
  const msg = String(error?.message ?? error?.details ?? "").toLowerCase();
  return (
    error?.code === "42703" ||
    msg.includes(`column ${columnName.toLowerCase()}`) ||
    msg.includes(`'${columnName.toLowerCase()}'`) ||
    msg.includes(`\"${columnName.toLowerCase()}\"`) ||
    msg.includes(columnName.toLowerCase())
  );
}

async function readMeekijkSportschoolId(userId: string) {
  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("meekijk_sportschool_id, active_sportschool_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile.error) {
    const row = profile.data as any;
    return cleanId(row?.meekijk_sportschool_id ?? row?.active_sportschool_id);
  }

  // Alleen terugvallen naar users als user_profiles echt de kolommen/tabel niet kan lezen.
  // Andere fouten willen we niet verbergen.
  if (
    !isMissingColumn(profile.error, "meekijk_sportschool_id") &&
    !isMissingColumn(profile.error, "active_sportschool_id") &&
    profile.error?.code !== "42P01" &&
    profile.error?.code !== "PGRST205"
  ) {
    throw profile.error;
  }

  const users = await supabaseAdmin
    .from("users")
    .select("meekijk_sportschool_id, active_sportschool_id")
    .eq("id", userId)
    .maybeSingle();

  if (!users.error) {
    const row = users.data as any;
    return cleanId(row?.meekijk_sportschool_id ?? row?.active_sportschool_id);
  }

  return null;
}

async function updateOne(
  table: "user_profiles" | "users",
  userId: string,
  payload: Record<string, string | null>,
) {
  const result = await supabaseAdmin
    .from(table)
    .update(payload)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (result.error) return { ok: false, error: result.error };
  if (!result.data?.id) return { ok: false, error: new Error(`Geen profiel gevonden in ${table}`) };
  return { ok: true, error: null };
}

async function writeMeekijkSportschoolId(userId: string, sportschoolId: string | null) {
  // Belangrijk: jouw user_profiles heeft wel meekijk_sportschool_id en active_sportschool_id,
  // maar in je voorbeeld géén updated_at. Daarom proberen we bewust zonder updated_at.
  // Anders faalt de update en krijg je onterecht de melding dat meekijk_sportschool_id ontbreekt.
  const profileFull = await updateOne("user_profiles", userId, {
    meekijk_sportschool_id: sportschoolId,
    active_sportschool_id: sportschoolId,
  });
  if (profileFull.ok) return;

  const profileSingle = await updateOne("user_profiles", userId, {
    meekijk_sportschool_id: sportschoolId,
  });
  if (profileSingle.ok) return;

  // Alleen fallback naar users voor oudere installaties waar de kolom nog daar stond.
  const usersFull = await updateOne("users", userId, {
    meekijk_sportschool_id: sportschoolId,
    active_sportschool_id: sportschoolId,
  });
  if (usersFull.ok) return;

  const usersSingle = await updateOne("users", userId, {
    meekijk_sportschool_id: sportschoolId,
  });
  if (usersSingle.ok) return;

  const errors = [
    profileFull.error,
    profileSingle.error,
    usersFull.error,
    usersSingle.error,
  ]
    .map((e: any) => e?.message ?? String(e ?? ""))
    .filter(Boolean)
    .join(" | ");

  throw new Error(
    `Meekijken opslaan mislukt. Details: ${errors || "onbekende databasefout"}`,
  );
}

export async function GET(req: Request) {
  try {
    const { userId } = await requireAnyRole(req, ["admin", "superadmin"] as any);
    const sportschool_id = await readMeekijkSportschoolId(userId);
    return NextResponse.json({ sportschool_id });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAnyRole(req, ["admin", "superadmin"] as any);
    const body = await req.json().catch(() => ({}));
    const sportschool_id = cleanId(body.sportschool_id);

    if (sportschool_id) {
      const { data: school, error } = await supabaseAdmin
        .from("sportscholen")
        .select("sportschool_id")
        .eq("sportschool_id", sportschool_id)
        .maybeSingle();

      if (error) throw error;
      if (!school) return NextResponse.json({ error: "Sportschool niet gevonden" }, { status: 404 });
    }

    await writeMeekijkSportschoolId(userId, sportschool_id);
    return NextResponse.json({ ok: true, sportschool_id });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
