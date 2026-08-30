import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function GET(req: Request, { params }: { params: Promise<{ va: string }> }) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const { va } = await params;
    const [fighter, results, gyms, startverbod, startverbodHistory, licenses, syncItems, doping, fighterSchools] = await Promise.all([
      supabaseAdmin.from("fightpassport_fighters").select("*").eq("va_nummer", va).maybeSingle(),
      supabaseAdmin.from("fightpassport_results").select("*").eq("va_nummer", va).order("datum", { ascending: false }),
      supabaseAdmin.from("fightpassport_fighter_gyms").select("*").eq("va_nummer", va).order("last_seen_at", { ascending: false }),
      supabaseAdmin
        .from("startverbod")
        .select("id,va_nummer,naam,naam_bron,soort,ingang,einde,is_actueel,koppel_methode,eerste_gezien_op,laatst_gezien_op,laatste_run_id")
        .eq("va_nummer", va)
        .order("is_actueel", { ascending: false })
        .order("ingang", { ascending: false }),
      supabaseAdmin
        .from("fighter_startverbod_history")
        .select("*")
        .eq("va_nummer", va),
      supabaseAdmin.from("fightpassport_licenses").select("*").eq("va_nummer", va).order("geldig_tot", { ascending: false }),
      supabaseAdmin.from("fightpassport_sync_items").select("*, fightpassport_sync_runs(start_va,end_va,started_at,status)").eq("va_nummer", va).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("doping_fighters").select("*").eq("va_nummer", va).maybeSingle(),

      // Centrale sportschoolkoppeling uit de aparte VECHTERS-Excel tabel.
      supabaseAdmin
        .from("fightpassport_school_fighters")
        .select("sportschool_id")
        .eq("va_nummer", va)
        .eq("actief", true),
    ]);
    if (fighter.error) throw fighter.error;
    if (!fighter.data) return NextResponse.json({ error: "Vechter niet gevonden." }, { status: 404 });
    if (fighterSchools.error) throw fighterSchools.error;
    if (startverbod.error) throw startverbod.error;
    if (startverbodHistory.error) throw startverbodHistory.error;

    const normalizeStartverbodRow = (row: any, source: "startverbod" | "history") => {
      const ingang =
        row?.ingang ??
        row?.startdatum ??
        row?.start_date ??
        row?.datum_van ??
        row?.van ??
        null;

      const einde =
        row?.einde ??
        row?.einddatum ??
        row?.end_date ??
        row?.datum_tot ??
        row?.tot ??
        null;

      const soort =
        row?.soort ??
        row?.type ??
        row?.reden ??
        row?.categorie ??
        row?.startverbod_type ??
        null;

      return {
        id: row?.id ?? null,
        va_nummer: row?.va_nummer ?? va,
        naam: row?.naam ?? row?.fighter_naam ?? null,
        naam_bron: row?.naam_bron ?? null,
        soort,
        ingang,
        einde,
        is_actueel: source === "startverbod" ? Boolean(row?.is_actueel) : false,
        koppel_methode: row?.koppel_methode ?? null,
        eerste_gezien_op:
          row?.eerste_gezien_op ??
          row?.first_seen_at ??
          row?.created_at ??
          null,
        laatst_gezien_op:
          row?.laatst_gezien_op ??
          row?.last_seen_at ??
          row?.updated_at ??
          row?.created_at ??
          null,
        laatste_run_id: row?.laatste_run_id ?? row?.run_id ?? null,
        bron: source,
      };
    };

    const startverbodMerged = [
      ...(startverbod.data ?? []).map((row: any) =>
        normalizeStartverbodRow(row, "startverbod"),
      ),
      ...(startverbodHistory.data ?? []).map((row: any) =>
        normalizeStartverbodRow(row, "history"),
      ),
    ];

    const seen = new Set<string>();
    const startverbodCombined = startverbodMerged.filter((row: any) => {
      const key = [
        String(row.va_nummer ?? "").trim().toUpperCase(),
        String(row.soort ?? "").trim().toLowerCase(),
        String(row.ingang ?? "").slice(0, 10),
        String(row.einde ?? "").slice(0, 10),
      ].join("|");

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const sportschoolIds = [
      ...new Set(
        (fighterSchools.data ?? [])
          .map((row: any) => Number(row.sportschool_id))
          .filter((id: number) => Number.isFinite(id))
      ),
    ];

    let sportscholen: any[] = [];

    if (sportschoolIds.length) {
      const schools = await supabaseAdmin
        .from("sportscholen")
        .select(
          "sportschool_id, naam, plaats, land, keurmerk_start, keurmerk_einde, last_team_sync_at, team_sync_status"
        )
        .in("sportschool_id", sportschoolIds)
        .order("naam", { ascending: true });

      if (schools.error) throw schools.error;
      sportscholen = schools.data ?? [];
    }

    return NextResponse.json({
      fighter: fighter.data,
      results: results.data ?? [],
      gyms: gyms.data ?? [],
      sportscholen,
      startverbod: startverbodCombined,
      licenses: licenses.data ?? [],
      syncItems: syncItems.data ?? [],
      doping: doping.data ?? null,
    });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("fp beheer fighter detail", err);
    return NextResponse.json({ error: err?.message || "Dossier kon niet worden geladen." }, { status: 500 });
  }
}
