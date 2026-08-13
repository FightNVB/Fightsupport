import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";
import { secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeVa(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function rowRaw(row: any) {
  const value = row?.raw_json;
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { return {}; }
}
function rowCornerForVa(row: any, va: string): "rood"|"blauw"|null {
  const raw = rowRaw(row);
  const red = normalizeVa(row?.va_rood ?? row?.rood_va ?? row?.rood_va_nummer ?? raw?.rood?.va_nummer ?? raw?.rood?.va);
  const blue = normalizeVa(row?.va_blauw ?? row?.blauw_va ?? row?.blauw_va_nummer ?? raw?.blauw?.va_nummer ?? raw?.blauw?.va);
  if (red && red === va) return "rood";
  if (blue && blue === va) return "blauw";
  return null;
}
function infoKind(row: any): "doping"|"talentstatus"|null {
  const resultaat = String(row?.resultaat ?? "").toUpperCase();
  if (resultaat !== "INFO") return null;
  const txt = `${row?.rule_code ?? ""} ${row?.rule ?? ""} ${row?.boodschap ?? ""}`.toLowerCase();
  if (txt.includes("dopingcertificaat") || txt.includes("doping certificaat")) return "doping";
  if (txt.includes("talentstatus") || txt.includes("talent status")) return "talentstatus";
  return null;
}

export async function GET(
  req: Request,
  context: {
    params: Promise<{
      matchmakingId: string;
      va: string;
    }>;
  },
) {
  try {
    const { matchmakingId, va: rawVa } = await context.params;
    const matchmaking_id = String(matchmakingId ?? "").trim();
    const va = normalizeVa(rawVa);

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "Matchmaking ontbreekt." },
        { status: 400 },
      );
    }

    if (!va) {
      return NextResponse.json(
        { error: "Geen geldig VA-nummer gevonden." },
        { status: 400 },
      );
    }

    const { userId, role } = await requireUserWithRole(req, [
      "matchmaker",
      "official",
      "hoofdofficial",
      "admin",
      "superadmin",
    ]);

    // Centrale autorisatie: matchmaker moet eigenaar/huidige eigenaar zijn.
    // Admin en superadmin blijven via dezelfde helper toegang houden.
    await assertCanAccessMatchmaking({
      matchmaking_id,
      userId,
      role,
    });

    // Het dossier mag via deze route alleen worden geopend wanneer de vechter
    // werkelijk aan deze matchmaking gekoppeld is.
    const [aanmeldingLink, contextLink] = await Promise.all([
      supabaseAdmin
        .from("aanmeldingen")
        .select("id")
        .eq("matchmaking_id", matchmaking_id)
        .eq("va_nummer", va)
        .limit(1),
      supabaseAdmin
        .from("matchmaker_fighter_context")
        .select("id")
        .eq("matchmaking_id", matchmaking_id)
        .eq("va_nummer", va)
        .limit(1),
    ]);

    if (aanmeldingLink.error) throw aanmeldingLink.error;
    if (contextLink.error) throw contextLink.error;

    const belongsToMatchmaking =
      (aanmeldingLink.data?.length ?? 0) > 0 ||
      (contextLink.data?.length ?? 0) > 0;

    if (!belongsToMatchmaking) {
      return NextResponse.json(
        { error: "Deze vechter hoort niet bij deze matchmaking." },
        { status: 404 },
      );
    }

    const [
      fighter,
      results,
      gyms,
      bans,
      licenses,
      syncItems,
      doping,
      fighterSchools,
      matchmaking,
      aanmelding,
      fighterRules,
    ] = await Promise.all([
      supabaseAdmin
        .from("fightpassport_fighters")
        .select("*")
        .eq("va_nummer", va)
        .maybeSingle(),
      supabaseAdmin
        .from("fightpassport_results")
        .select("*")
        .eq("va_nummer", va)
        .order("datum", { ascending: false }),
      supabaseAdmin
        .from("fightpassport_fighter_gyms")
        .select("*")
        .eq("va_nummer", va)
        .order("last_seen_at", { ascending: false }),
      supabaseAdmin
        .from("fightpassport_startbans")
        .select("*")
        .eq("va_nummer", va)
        .order("ingang", { ascending: false }),
      supabaseAdmin
        .from("fightpassport_licenses")
        .select("*")
        .eq("va_nummer", va)
        .order("geldig_tot", { ascending: false }),
      supabaseAdmin
        .from("fightpassport_sync_items")
        .select(
          "*, fightpassport_sync_runs(start_va,end_va,started_at,status)",
        )
        .eq("va_nummer", va)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("doping_fighters")
        .select("*")
        .eq("va_nummer", va)
        .maybeSingle(),
      supabaseAdmin
        .from("fightpassport_school_fighters")
        .select("sportschool_id")
        .eq("va_nummer", va)
        .eq("actief", true),
      supabaseAdmin
        .from("matchmakings")
        .select("datum")
        .eq("id", matchmaking_id)
        .maybeSingle(),
      supabaseAdmin
        .from("aanmeldingen")
        .select("id,naam,gym,discipline,klasse,geslacht,gewicht,va_nummer,email,telefoon,source_type,upload_batch_id")
        .eq("matchmaking_id", matchmaking_id)
        .eq("va_nummer", va)
        .maybeSingle(),
      supabaseAdmin
        .from("matchmaker_fighter_resultaten")
        .select("id,matchmaking_id,inschrijving_id,va_nummer,rule,rule_code,resultaat,severity,boodschap,created_at,review_status,review_note,reviewed_by,reviewed_at,actie_status,aantekeningen,event_id,bondteam")
        .eq("matchmaking_id", matchmaking_id)
        .eq("va_nummer", va)
        .order("created_at", { ascending: false }),
    ]);

    if (fighter.error) throw fighter.error;
    if (!fighter.data) {
      return NextResponse.json(
        { error: "Vechter niet gevonden." },
        { status: 404 },
      );
    }

    if (results.error) throw results.error;
    if (gyms.error) throw gyms.error;
    if (bans.error) throw bans.error;
    if (licenses.error) throw licenses.error;
    if (syncItems.error) throw syncItems.error;
    if (doping.error) throw doping.error;
    if (fighterSchools.error) throw fighterSchools.error;
    if (matchmaking.error) throw matchmaking.error;
    if (aanmelding.error) throw aanmelding.error;
    if (fighterRules.error) throw fighterRules.error;

    const sportschoolIds = [
      ...new Set(
        (fighterSchools.data ?? [])
          .map((row: any) => Number(row.sportschool_id))
          .filter((id: number) => Number.isFinite(id)),
      ),
    ];

    let sportscholen: any[] = [];

    if (sportschoolIds.length > 0) {
      const schools = await supabaseAdmin
        .from("sportscholen")
        .select(
          "sportschool_id, naam, plaats, land, keurmerk_start, keurmerk_einde, last_team_sync_at, team_sync_status",
        )
        .in("sportschool_id", sportschoolIds)
        .order("naam", { ascending: true });

      if (schools.error) throw schools.error;
      sportscholen = schools.data ?? [];
    }

    let controleInfoMeldingen: any[] = [];
    const latestRun = await supabaseAdmin
      .from("controle_runs")
      .select("id")
      .eq("matchmaking_id", matchmaking_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRun.error) throw latestRun.error;

    if (latestRun.data?.id) {
      const bouts = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .select("*")
        .eq("matchmaking_id", matchmaking_id);
      if (bouts.error) throw bouts.error;

      const ownBouts = new Map<string, { partijNr: string; corner: "rood"|"blauw" }>();
      const ownPartijNrs = new Set<string>();
      for (const bout of bouts.data ?? []) {
        const corner = rowCornerForVa(bout, va);
        if (!corner) continue;
        const id = String(bout?.id ?? "").trim();
        const partijNr = String(bout?.partij_nr ?? rowRaw(bout)?.partij_nr ?? "").trim();
        if (id) ownBouts.set(id, { partijNr, corner });
        if (partijNr) ownPartijNrs.add(partijNr);
      }

      const infoRows = await supabaseAdmin
        .from("controle_resultaten")
        .select("id,bout_id,partij_nr,rule,rule_code,resultaat,severity,boodschap,hoek,created_at")
        .eq("matchmaking_id", matchmaking_id)
        .eq("controle_run_id", latestRun.data.id)
        .eq("resultaat", "INFO");
      if (infoRows.error) throw infoRows.error;

      controleInfoMeldingen = (infoRows.data ?? []).filter((row: any) => {
        if (!infoKind(row)) return false;
        const boutId = String(row?.bout_id ?? "").trim();
        const partijNr = String(row?.partij_nr ?? "").trim();
        const match = (boutId && ownBouts.get(boutId)) ||
          (partijNr && ownPartijNrs.has(partijNr) ? { partijNr, corner: null as "rood"|"blauw"|null } : null);
        if (!match) return false;

        const hoek = String(row?.hoek ?? "").toLowerCase();
        if (hoek && match.corner) {
          const same = hoek === match.corner ||
            (match.corner === "rood" && hoek === "red") ||
            (match.corner === "blauw" && hoek === "blue");
          if (!same) return false;
        }
        return true;
      });
    }

    return NextResponse.json(
      {
        fighter: fighter.data,
        results: results.data ?? [],
        gyms: gyms.data ?? [],
        sportscholen,
        startbans: bans.data ?? [],
        licenses: licenses.data ?? [],
        syncItems: syncItems.data ?? [],
        doping: doping.data ?? null,
        eventDate: matchmaking.data?.datum ?? null,
        aanmelding: aanmelding.data ?? null,
        fighterRuleMeldingen: fighterRules.data ?? [],
        controleInfoMeldingen,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    return secureError(err, "Dossier kon niet worden geladen.");
  }
}
