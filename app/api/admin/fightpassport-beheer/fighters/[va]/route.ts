import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function GET(req: Request, { params }: { params: Promise<{ va: string }> }) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const { va } = await params;
    const [fighter, results, gyms, bans, licenses, syncItems, doping, fighterSchools] = await Promise.all([
      supabaseAdmin.from("fightpassport_fighters").select("*").eq("va_nummer", va).maybeSingle(),
      supabaseAdmin.from("fightpassport_results").select("*").eq("va_nummer", va).order("datum", { ascending: false }),
      supabaseAdmin.from("fightpassport_fighter_gyms").select("*").eq("va_nummer", va).order("last_seen_at", { ascending: false }),
      supabaseAdmin.from("fightpassport_startbans").select("*").eq("va_nummer", va).order("ingang", { ascending: false }),
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
      startbans: bans.data ?? [],
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
