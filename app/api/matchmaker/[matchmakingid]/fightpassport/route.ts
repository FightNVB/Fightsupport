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

    // Centrale FightPassport/Total-tabellen zijn vanaf hier de waarheid.
    // Geen fighters_raw of andere oude scraper-snapshots gebruiken.
    const [fighters, results, startbans, licenses] = await Promise.all([
      supabaseAdmin
        .from("fightpassport_fighters")
        .select(
          "va_nummer,naam,geboortedatum,geslacht,fit_to_fight,licentie_actief,heeft_startverbod,nulmeting_discipline,nulmeting_klasse,nulmeting_gewicht,nulmeting_totaal,nulmeting_gewonnen,nulmeting_verloren,nulmeting_onbeslist,nulmeting_kos,nulmeting_overige_ervaring,nulmeting_opmerking,totaal_wedstrijden,gewonnen,kos,berekende_klasse,mma_level,primary_discipline,last_seen_at,last_scraped_at,updated_at",
        )
        .in("va_nummer", requestedVas),
      supabaseAdmin
        .from("fightpassport_results")
        .select(
          "id,va_nummer,datum,evenement,tegenstander,sportschool,discipline,klasse,gewicht,uitslag,last_seen_at",
        )
        .in("va_nummer", requestedVas)
        .order("datum", { ascending: false }),
      supabaseAdmin
        .from("fightpassport_startbans")
        .select(
          "id,va_nummer,soort,ingang,einde,opgelegd_door,reden,evenement,evenement_datum,actief,last_seen_at",
        )
        .in("va_nummer", requestedVas)
        .order("ingang", { ascending: false }),
      supabaseAdmin
        .from("fightpassport_licenses")
        .select(
          "id,va_nummer,soort,status,geldig_van,geldig_tot,bond,last_seen_at",
        )
        .in("va_nummer", requestedVas)
        .order("geldig_tot", { ascending: false }),
    ]);

    if (fighters.error || results.error || startbans.error || licenses.error) {
      console.error("[fightpassport] centrale data laden mislukt", {
        fighters: fighters.error?.message,
        results: results.error?.message,
        startbans: startbans.error?.message,
        licenses: licenses.error?.message,
      });
      return privateJson(
        { error: "FightPassport-gegevens konden niet worden geladen." },
        500,
      );
    }

    const startbansByVa = new Map<string, any[]>();
    for (const row of startbans.data ?? []) {
      const va = normalizeVa((row as any).va_nummer);
      if (!va) continue;
      const list = startbansByVa.get(va) ?? [];
      list.push(row);
      startbansByVa.set(va, list);
    }

    const licensesByVa = new Map<string, any[]>();
    for (const row of licenses.data ?? []) {
      const va = normalizeVa((row as any).va_nummer);
      if (!va) continue;
      const list = licensesByVa.get(va) ?? [];
      list.push(row);
      licensesByVa.set(va, list);
    }

    const enrichedFighters = (fighters.data ?? []).map((fighter: any) => {
      const va = normalizeVa(fighter.va_nummer);
      const fighterStartbans = startbansByVa.get(va) ?? [];
      const fighterLicenses = licensesByVa.get(va) ?? [];

      // Detailregels uit Total zijn leidend wanneer ze aanwezig zijn.
      // De samenvattingsvelden op fightpassport_fighters blijven fallback.
      const activeStartban = fighterStartbans.find((row: any) => row?.actief === true);
      const activeLicense = fighterLicenses.find((row: any) => {
        const status = String(row?.status ?? "").trim().toLowerCase();
        return ["actief", "active", "geldig", "valid"].includes(status);
      });

      return {
        ...fighter,
        heeft_startverbod:
          fighterStartbans.length > 0
            ? Boolean(activeStartban)
            : fighter.heeft_startverbod,
        licentie_actief:
          fighterLicenses.length > 0
            ? Boolean(activeLicense)
            : fighter.licentie_actief,
        startverbod_detail: activeStartban ?? null,
        startverboden: fighterStartbans,
        licentie_detail: activeLicense ?? fighterLicenses[0] ?? null,
        licenties: fighterLicenses,
      };
    });

    return privateJson({
      fighters: enrichedFighters,
      results: results.data ?? [],
      startbans: startbans.data ?? [],
      licenses: licenses.data ?? [],
    });
  } catch (error) {
    return secureError(error, "FightPassport-gegevens konden niet worden geladen.");
  }
}
