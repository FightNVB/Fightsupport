import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertCanAccessMatchmaking, requireAnyRole } from "@/app/api/_utils/authz";
import { gymKey, s } from "@/lib/trainerReview";

export const runtime = "nodejs";

function obj(v: any) {
  if (!v) return {};
  if (typeof v === "object") return v;
  try { return JSON.parse(String(v)); } catch { return {}; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchmakingid: string }> },
) {
  try {
    const { matchmakingid } = await params;
    const matchmaking_id = s(matchmakingid);
    const { userId, role } = await requireAnyRole(req, ["matchmaker", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const [boutsRes, linksRes, responsesRes] = await Promise.all([
      supabaseAdmin
        .from("matchmaking_bouts_raw")
        .select("id,partij_nr,rood_gym,blauw_gym,raw_json,verwijderd")
        .eq("matchmaking_id", matchmaking_id),
      supabaseAdmin
        .from("trainer_match_links")
        .select("id,sportschool_key,is_enabled,opened_at")
        .eq("matchmaking_id", matchmaking_id),
      supabaseAdmin
        .from("trainer_match_responses")
        .select("link_id,bout_id,partij_nr,status,opmerking,dispensatie_toestemming,dispensatie_redenen,responded_at")
        .eq("matchmaking_id", matchmaking_id),
    ]);

    if (boutsRes.error) throw boutsRes.error;
    if (linksRes.error) throw linksRes.error;
    if (responsesRes.error) throw responsesRes.error;

    const links = linksRes.data ?? [];
    const responses = responsesRes.data ?? [];
    const linkById = new Map(links.map((l: any) => [s(l.id), l]));
    const byBoutId: Record<string, any> = {};

    for (const bout of boutsRes.data ?? []) {
      if ((bout as any)?.verwijderd === true) continue;
      const raw = obj((bout as any)?.raw_json);
      const roodGym = s((bout as any)?.rood_gym || raw?.rood?.sportschool || raw?.rood?.gym);
      const blauwGym = s((bout as any)?.blauw_gym || raw?.blauw?.sportschool || raw?.blauw?.gym);
      const redKey = gymKey(roodGym);
      const blueKey = gymKey(blauwGym);
      const boutId = s((bout as any)?.id);

      const result: any = { rood: null, blauw: null };
      for (const response of responses.filter((r: any) => s(r.bout_id) === boutId)) {
        const link: any = linkById.get(s(response.link_id));
        if (!link) continue;
        const enriched = {
          ...response,
          sportschool: s(link.sportschool_key),
          link_opened_at: link.opened_at ?? null,
          link_enabled: link.is_enabled === true,
        };
        if (s(link.sportschool_key) === redKey) result.rood = enriched;
        if (s(link.sportschool_key) === blueKey) result.blauw = enriched;
      }
      byBoutId[boutId] = result;
    }

    return NextResponse.json({ ok: true, byBoutId }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: s(e?.message) || "Trainerreacties laden mislukt" }, { status: 500 });
  }
}
