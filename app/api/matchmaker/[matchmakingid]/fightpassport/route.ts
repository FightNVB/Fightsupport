import { NextRequest } from "next/server";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
  supabaseAdmin,
} from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeVa(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ matchmakingid: string }> },
) {
  try {
    const { matchmakingid } = await context.params;
    const matchmakingId = String(matchmakingid ?? "").trim();
    const requestedVas = [...new Set(req.nextUrl.searchParams.getAll("va").map(normalizeVa).filter(Boolean))];

    if (!matchmakingId || requestedVas.length === 0 || requestedVas.length > 50) {
      return privateJson({ error: "Ongeldige matchmaking of VA-selectie." }, 400);
    }

    const auth = await requireUserWithRole(req, ["matchmaker", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({
      matchmaking_id: matchmakingId,
      userId: auth.userId,
      role: auth.role,
    });

    const [aanmeldingen, contextRows, bouts] = await Promise.all([
      supabaseAdmin
        .from("aanmeldingen")
        .select("va_nummer")
        .eq("matchmaking_id", matchmakingId)
        .in("va_nummer", requestedVas),
      supabaseAdmin
        .from("matchmaker_fighter_context")
        .select("va_nummer")
        .eq("matchmaking_id", matchmakingId)
        .in("va_nummer", requestedVas),
      supabaseAdmin
        .from("matchmaking_bouts_raw")
        .select("va_rood,va_blauw")
        .eq("matchmaking_id", matchmakingId),
    ]);

    if (aanmeldingen.error || contextRows.error || bouts.error) {
      return privateJson({ error: "Vechterkoppeling kon niet worden gecontroleerd." }, 500);
    }

    const linkedVas = new Set<string>();
    for (const row of [...(aanmeldingen.data ?? []), ...(contextRows.data ?? [])]) {
      const va = normalizeVa((row as any).va_nummer);
      if (va) linkedVas.add(va);
    }
    for (const row of bouts.data ?? []) {
      const red = normalizeVa((row as any).va_rood);
      const blue = normalizeVa((row as any).va_blauw);
      if (red) linkedVas.add(red);
      if (blue) linkedVas.add(blue);
    }

    if (requestedVas.some((va) => !linkedVas.has(va))) {
      return privateJson({ error: "Geen toegang tot een of meer geselecteerde vechters." }, 403);
    }

    const [fighters, results] = await Promise.all([
      supabaseAdmin
        .from("fightpassport_fighters")
        .select("va_nummer,naam,geboortedatum,geslacht,licentie_actief,heeft_startverbod,nulmeting_discipline,nulmeting_klasse,nulmeting_gewicht,nulmeting_totaal,nulmeting_gewonnen,nulmeting_verloren,nulmeting_onbeslist,nulmeting_kos,nulmeting_overige_ervaring,nulmeting_opmerking,totaal_wedstrijden,gewonnen,kos,berekende_klasse,mma_level")
        .in("va_nummer", requestedVas),
      supabaseAdmin
        .from("fightpassport_results")
        .select("id,va_nummer,datum,evenement,tegenstander,sportschool,discipline,klasse,gewicht,uitslag,last_seen_at")
        .in("va_nummer", requestedVas)
        .order("datum", { ascending: false }),
    ]);

    if (fighters.error || results.error) {
      return privateJson({ error: "FightPassport-gegevens konden niet worden geladen." }, 500);
    }

    return privateJson({ fighters: fighters.data ?? [], results: results.data ?? [] });
  } catch (error) {
    return secureError(error, "FightPassport-gegevens konden niet worden geladen.");
  }
}
