import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const licentie = url.searchParams.get("licentie") || "all";
    const startverbod = url.searchParams.get("startverbod") || "all";
    const discipline = url.searchParams.get("discipline") || "all";
    const klasse = url.searchParams.get("klasse") || "all";
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 250), 1), 1000);

    let query = supabaseAdmin.from("fightpassport_fighters").select("*").order("naam", { ascending: true }).limit(limit);
    if (q) query = query.or(`naam.ilike.%${q.replace(/[%(),]/g, "")}%,va_nummer.ilike.%${q.replace(/[%(),]/g, "")}%`);
    if (licentie === "yes") query = query.eq("licentie_actief", true);
    if (licentie === "no") query = query.eq("licentie_actief", false);
    if (startverbod === "yes") query = query.eq("heeft_startverbod", true);
    if (startverbod === "no") query = query.eq("heeft_startverbod", false);
    if (discipline === "kbtb") query = query.or("primary_discipline.ilike.%kick%,primary_discipline.ilike.%thai%,nulmeting_discipline.ilike.%kick%,nulmeting_discipline.ilike.%thai%");
    if (discipline === "mma") query = query.or("primary_discipline.ilike.%mma%,nulmeting_discipline.ilike.%mma%");
    if (klasse !== "all") {
      if (klasse === "AMATEUR" || klasse === "PRO") query = query.eq("mma_level", klasse);
      else query = query.eq("berekende_klasse", klasse);
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ fighters: data ?? [] });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("fp beheer fighters", err);
    return NextResponse.json({ error: err?.message || "Vechters konden niet worden geladen." }, { status: 500 });
  }
}
