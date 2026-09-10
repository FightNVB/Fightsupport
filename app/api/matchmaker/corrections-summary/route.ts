import { NextRequest, NextResponse } from "next/server";

import {
  assertCanAccessMatchmaking,
  requireAnyRole,
  supabaseAdmin,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

type CorrectionRow = {
  id: number;
  matchmaking_id: string;
  bout_id: number | null;
  bout_uid: string | null;
  partij_nr: number | null;
  veld: string;
  hoek: string | null;
  oude_waarde: string | null;
  nieuwe_waarde: string | null;
  created_at: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await requireAnyRole(req, [
      "matchmaker",
      "admin",
      "superadmin",
    ]);

    const matchmakingId = clean(
      req.nextUrl.searchParams.get("matchmaking_id"),
    );

    if (!matchmakingId) {
      return NextResponse.json(
        { ok: false, error: "matchmaking_id ontbreekt." },
        { status: 400 },
      );
    }

    await assertCanAccessMatchmaking({
      matchmaking_id: matchmakingId,
      userId,
      role,
    });

    const { data, error } = await supabaseAdmin
      .from("matchmaking_correcties")
      .select(
        "id, matchmaking_id, bout_id, bout_uid, partij_nr, veld, hoek, oude_waarde, nieuwe_waarde, created_at",
      )
      .eq("matchmaking_id", matchmakingId)
      .eq("bron", "nvb")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Dezelfde correctie kan tijdens een controle meerdere keren worden opgeslagen.
    // Toon per partij/hoek/veld één regel: eerste waarde -> laatste waarde.
    const grouped = new Map<string, CorrectionRow>();

    for (const row of (data ?? []) as CorrectionRow[]) {
      const key = [
        row.bout_id ?? row.bout_uid ?? row.partij_nr ?? "onbekend",
        clean(row.hoek).toLowerCase(),
        clean(row.veld).toLowerCase(),
      ].join("|");

      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { ...row });
      } else {
        grouped.set(key, {
          ...existing,
          id: row.id,
          partij_nr: row.partij_nr ?? existing.partij_nr,
          nieuwe_waarde: row.nieuwe_waarde,
          created_at: row.created_at,
        });
      }
    }

    const correcties = Array.from(grouped.values())
      .filter(
        (row) => clean(row.oude_waarde) !== clean(row.nieuwe_waarde),
      )
      .sort((a, b) => {
        const pa = Number(a.partij_nr ?? 999999);
        const pb = Number(b.partij_nr ?? 999999);
        if (pa !== pb) return pa - pb;
        return clean(a.veld).localeCompare(clean(b.veld), "nl");
      });

    return NextResponse.json({
      ok: true,
      count: correcties.length,
      correcties,
    });
  } catch (error: any) {
    console.error("[matchmaker/corrections-summary]", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "NVB-correcties laden mislukt.",
      },
      { status: Number(error?.status ?? 500) },
    );
  }
}
