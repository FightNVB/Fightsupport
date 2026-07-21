import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";
import { isCurrentMandatoryDopingTarget, normalizeDopingClass, normalizeDopingDiscipline } from "@/lib/doping";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const url = new URL(req.url);
    const disciplineFilter = String(url.searchParams.get("discipline") || "ALL").toUpperCase();
    const classFilter = String(url.searchParams.get("klasse") || "ALL").toUpperCase();
    const statusFilter = String(url.searchParams.get("status") || "ALL").toLowerCase();
    const q = String(url.searchParams.get("q") || "").trim().toLowerCase();

    const { data: fighters, error } = await supabaseAdmin
      .from("fightpassport_fighters")
      .select("va_nummer,naam,email,geboortedatum,geslacht,licentie_actief,heeft_startverbod,fit_to_fight,nulmeting_discipline,nulmeting_klasse,berekende_klasse,mma_level,primary_discipline,last_scraped_at")
      .order("naam", { ascending: true })
      .limit(20000);
    if (error) throw error;

    const vaList = (fighters ?? []).map((x: any) => String(x.va_nummer));
    const workflow = new Map<string, any>();
    for (let i = 0; i < vaList.length; i += 500) {
      const { data } = await supabaseAdmin.from("doping_fighters").select("*").in("va_nummer", vaList.slice(i, i + 500));
      for (const row of data ?? []) workflow.set(String((row as any).va_nummer), row);
    }

    const rows = (fighters ?? []).map((f: any) => {
      const discipline = normalizeDopingDiscipline(f.primary_discipline ?? f.nulmeting_discipline ?? (f.mma_level ? "MMA" : null));
      const klasse = discipline === "MMA"
        ? normalizeDopingClass(f.mma_level ?? f.berekende_klasse ?? f.nulmeting_klasse)
        : normalizeDopingClass(f.berekende_klasse ?? f.nulmeting_klasse);
      const wf = workflow.get(String(f.va_nummer)) ?? null;
      return {
        ...f,
        discipline,
        klasse,
        mandatory_now: isCurrentMandatoryDopingTarget(discipline, klasse),
        workflow_status: wf?.workflow_status ?? "niet_uitgenodigd",
        certificate_status: wf?.certificate_status ?? "niet_ontvangen",
        fightpassport_status: wf?.fightpassport_status ?? "niet_verwerkt",
        last_invited_at: wf?.last_invited_at ?? null,
      };
    }).filter((r: any) => {
      if (disciplineFilter !== "ALL" && String(r.discipline ?? "").toUpperCase() !== disciplineFilter) return false;
      if (classFilter !== "ALL" && String(r.klasse ?? "").toUpperCase() !== classFilter) return false;
      if (statusFilter !== "all" && String(r.workflow_status).toLowerCase() !== statusFilter) return false;
      if (q && !`${r.va_nummer} ${r.naam ?? ""} ${r.email ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });

    const summary = {
      totaal: rows.length,
      verplicht_nu: rows.filter((r: any) => r.mandatory_now).length,
      niet_gemaild: rows.filter((r: any) => r.workflow_status === "niet_uitgenodigd").length,
      gemaild: rows.filter((r: any) => ["uitgenodigd", "herinnerd"].includes(r.workflow_status)).length,
      ontvangen: rows.filter((r: any) => r.certificate_status === "ontvangen").length,
      goedgekeurd: rows.filter((r: any) => r.certificate_status === "goedgekeurd").length,
    };
    return NextResponse.json({ fighters: rows, summary });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error(err);
    return NextResponse.json({ error: "Vechters konden niet worden geladen." }, { status: 500 });
  }
}
