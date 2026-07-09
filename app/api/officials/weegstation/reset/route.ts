import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function jsonError(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = String(body?.matchmakingId ?? body?.matchmaking_id ?? "").trim();

    if (!matchmakingId) {
      return jsonError("matchmakingId ontbreekt.", 400);
    }

    const auth = await getWeegstationAuthContext(req, matchmakingId);

    const { data: mm, error: mmErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .select("matchmaking_id, bondteam")
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (mmErr) throw mmErr;
    if (!mm) return jsonError("Matchmaking niet gevonden.", 404);

    const isSuperOrAdmin = auth.roles.some((r) =>
      ["admin", "superadmin", "dispensatie_admin"].includes(r),
    );

    const isOwnBondOfficial =
      auth.roles.some((r) => r === "official" || r === "hoofdofficial") &&
      String(mm?.bondteam ?? "").trim().toLowerCase() ===
        String(auth.bondteam ?? "").trim().toLowerCase();

    if (!isSuperOrAdmin && !isOwnBondOfficial) {
      return jsonError("Je mag alleen weegdata van je eigen bondteam verwijderen.", 403);
    }

    const deleted: Record<string, number | null> = {};

    // Eerst de weegstation-meldingen verwijderen, zodat de detailpagina schoon is.
    // We verwijderen alleen regels die door het weegstation zijn gemaakt.
    const { count: resultCount, error: resultErr } = await supabaseAdmin
      .from("controle_resultaten")
      .delete({ count: "exact" })
      .eq("matchmaking_id", matchmakingId)
      .or(
        [
          "rule.ilike.weegstation%",
          "rule_code.in.(OK,AFKEUR,MINPUNT_ROOD,MINPUNT_BLAUW,WEEGDISPENSATIE_VERLEEND,WEEGDISPENSATIE_AFGEKEURD)",
          "source_table.eq.weigh_in_bouts",
        ].join(","),
      );

    if (resultErr) throw resultErr;
    deleted.controle_resultaten = resultCount ?? null;

    // Daarna de gewichten zelf verwijderen. Build kan daarna de lijst opnieuw aanmaken.
    const { count: boutCount, error: boutErr } = await supabaseAdmin
      .from("weigh_in_bouts")
      .delete({ count: "exact" })
      .eq("matchmaking_id", matchmakingId);

    if (boutErr) throw boutErr;
    deleted.weigh_in_bouts = boutCount ?? null;

    // Matchmaking blijft bestaan en wordt teruggezet naar klaar voor weegstation.
    // Daardoor kan de official/hoofdofficial de weging opnieuw openen en schoon opnieuw opbouwen.
    const { count: matchmakingUpdateCount, error: matchmakingUpdateErr } = await supabaseAdmin
      .from("matchmakings")
      .update(
        {
          stadium: "klaar_voor_weegstation",
          status: "klaar_voor_weegstation",
          huidige_eigenaar_type: "bondteam",
          huidige_eigenaar_bondteam: mm.bondteam,
          locked_for_editing: false,
        },
        { count: "exact" },
      )
      .eq("id", matchmakingId);

    if (matchmakingUpdateErr) throw matchmakingUpdateErr;

    return NextResponse.json({
      ok: true,
      matchmakingId,
      deleted,
      reset: {
        matchmakings_updated: matchmakingUpdateCount ?? null,
        stadium: "klaar_voor_weegstation",
        status: "klaar_voor_weegstation",
      },
    });
  } catch (e: any) {
    return jsonError(e?.message ?? "Weegdata verwijderen mislukt.", 500);
  }
}
