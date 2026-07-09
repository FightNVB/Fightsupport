import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeStageKey(v: unknown) {
  return s(v).toLowerCase().replace(/_/g, "-");
}

function isWeegstationFlow(row: any) {
  const stadium = normalizeStageKey(row?.stadium);
  const status = normalizeStageKey(row?.status);
  const ownerType = s(row?.huidige_eigenaar_type).toLowerCase();

  const stages = new Set([
    "naar-weegstation",
    "klaar-voor-weegstation",
    "in-weegstation",
    "weegstation-verwerkt",
    "definitieve-matchmaking-ingediend",
    "definitieve-lineup",
    "klaar-voor-uitslagen",
    "uitslagen-in-bewerking",
    "uitslagen-definitief",
  ]);

  if (
    ownerType === "bondteam" &&
    (stadium === "naar-weegstation" || stadium === "klaar-voor-weegstation")
  ) {
    return true;
  }

  return stages.has(stadium) || stages.has(status);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getWeegstationAuthContext(req);
    const roles = auth.roles;

    const isSuperadmin = roles.includes("superadmin");
    const myBondteam = s(auth.bondteam);
    const myBondteamKey = myBondteam.toLowerCase();

    const { data, error } = await supabaseAdmin
      .from("matchmakings")
      .select(
        `
          id,
          naam,
          datum,
          bondteam,
          locatie,
          stadium,
          status,
          huidige_eigenaar_type,
          huidige_eigenaar_user_id,
          huidige_eigenaar_bondteam,
          is_actief,
          is_archived,
          created_at
        `,
      )
      .eq("is_actief", true)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []).filter((row: any) => {
      if (!row?.id || row?.is_archived === true) return false;
      if (!isWeegstationFlow(row)) return false;

      if (isSuperadmin) return true;
      if (!myBondteamKey) return false;

      const rowBondteam = s(row?.bondteam).toLowerCase();
      const ownerBondteam = s(row?.huidige_eigenaar_bondteam).toLowerCase();

      return rowBondteam === myBondteamKey || ownerBondteam === myBondteamKey;
    });

    return NextResponse.json({
      ok: true,
      roles,
      bondteam: myBondteam,
      rows,
      count: rows.length,
    });
  } catch (e: any) {
    console.error("officials/weegstation/list GET error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Weegstation overzicht laden mislukt." },
      { status: 500 },
    );
  }
}
