import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertCanAccessMatchmaking, requireAnyRole } from "@/app/api/_utils/authz";
import { buildTrainerReviewData, gymKey, s } from "@/lib/trainerReview";

export const runtime = "nodejs";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchmakingid: string }> },
) {
  try {
    const { matchmakingid } = await params;
    const matchmaking_id = s(matchmakingid);
    const { userId, role } = await requireAnyRole(req, ["matchmaker", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // Gebruik exact dezelfde actuele partij-opbouw als de trainerpagina.
    const reviewData = await buildTrainerReviewData(matchmaking_id);

    const [linksRes, responsesRes] = await Promise.all([
      supabaseAdmin
        .from("trainer_match_links")
        .select("id,sportschool_key,sportschool_naam,is_enabled,opened_at")
        .eq("matchmaking_id", matchmaking_id),
      supabaseAdmin
        .from("trainer_match_responses")
        .select("link_id,bout_id,partij_nr,status,opmerking,dispensatie_toestemming,dispensatie_redenen,responded_at")
        .eq("matchmaking_id", matchmaking_id),
    ]);

    if (linksRes.error) throw linksRes.error;
    if (responsesRes.error) throw responsesRes.error;

    const links = linksRes.data ?? [];
    const responses = responsesRes.data ?? [];

    const byBoutId: Record<string, any> = {};
    const byVaPair: Record<string, any> = {};
    const byPartijNr: Record<string, any> = {};

    const va = (value: any) => s(value).replace(/\D/g, "");
    const vaPair = (red: any, blue: any) => {
      const r = va(red);
      const b = va(blue);
      if (!r || !b) return "";
      return [r, b].sort().join("|");
    };

    function ensureResult(target: Record<string, any>, key: string) {
      if (!key) return null;
      if (!target[key]) target[key] = { rood: null, blauw: null };
      return target[key];
    }

    for (const gym of reviewData.gyms ?? []) {
      const link = links.find((l: any) => s(l.sportschool_key) === s(gym.key));
      if (!link) continue;

      const ownResponses = responses.filter(
        (r: any) => s(r.link_id) === s(link.id),
      );

      for (const bout of gym.bouts ?? []) {
        const boutId = s(bout?.id);
        const partijNr = Number(bout?.partijNr);
        const pair = vaPair(bout?.red?.vaNummer, bout?.blue?.vaNummer);

        const response =
          ownResponses
            .filter((r: any) => s(r.bout_id) === boutId)
            .sort((a: any, b: any) =>
              String(a?.responded_at ?? "").localeCompare(String(b?.responded_at ?? "")),
            )
            .at(-1) ?? null;

        const ownCorner =
          gymKey(bout?.red?.sportschool) === s(gym.key) ? "rood" : "blauw";

        const enriched = response
          ? {
              ...response,
              sportschool: s(link.sportschool_naam) || s(gym.naam) || s(link.sportschool_key),
              sportschool_key: s(link.sportschool_key),
              link_opened_at: link.opened_at ?? null,
              link_enabled: link.is_enabled === true,
            }
          : null;

        const targets = [
          ensureResult(byBoutId, boutId),
          ensureResult(byVaPair, pair),
          Number.isFinite(partijNr)
            ? ensureResult(byPartijNr, String(partijNr))
            : null,
        ].filter(Boolean);

        for (const target of targets as any[]) {
          target[ownCorner] = enriched;
        }
      }
    }

    return NextResponse.json(
      { ok: true, byBoutId, byVaPair, byPartijNr },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: s(e?.message) || "Trainerreacties laden mislukt" },
      { status: 500 },
    );
  }
}
