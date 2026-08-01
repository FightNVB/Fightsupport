import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

const ALLOWED_SORTS: Record<string, string> = {
  va_nummer: "va_nummer_sort",
  naam: "naam",
  discipline: "primary_discipline",
  klasse: "berekende_klasse",
  licentie: "licentie_actief",
  status: "heeft_startverbod",
  email: "email",
};

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const licentie = url.searchParams.get("licentie") || "all";
    const startverbod = url.searchParams.get("startverbod") || "all";
    const discipline = url.searchParams.get("discipline") || "all";
    const klasse = url.searchParams.get("klasse") || "all";

    const page = Math.max(Number(url.searchParams.get("page") || 1), 1);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize") || 75), 1), 250);
    const sortKey = url.searchParams.get("sortKey") || "va_nummer";
    const sortDir = url.searchParams.get("sortDir") === "desc" ? "desc" : "asc";
    const sortColumn = ALLOWED_SORTS[sortKey] || "va_nummer";

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("fightpassport_fighters")
      .select("*", { count: "exact" });

    if (q) {
      const safeQ = q.replace(/[%(),]/g, "");

      if (/^\d+$/.test(safeQ)) {
        query = query.or(
          `naam.ilike.%${safeQ}%,va_nummer.eq.${Number(safeQ)}`
        );
      } else {
        query = query.ilike("naam", `%${safeQ}%`);
      }
    }

    if (licentie === "yes") query = query.eq("licentie_actief", true);
    if (licentie === "no") query = query.eq("licentie_actief", false);
    if (startverbod === "yes") query = query.eq("heeft_startverbod", true);
    if (startverbod === "no") query = query.eq("heeft_startverbod", false);

    if (discipline === "kbtb") {
      query = query.or(
        "primary_discipline.ilike.%kick%,primary_discipline.ilike.%thai%,nulmeting_discipline.ilike.%kick%,nulmeting_discipline.ilike.%thai%"
      );
    }

    if (discipline === "mma") {
      query = query.or(
        "primary_discipline.ilike.%mma%,nulmeting_discipline.ilike.%mma%"
      );
    }

    if (klasse !== "all") {
      if (klasse === "AMATEUR" || klasse === "PRO") query = query.eq("mma_level", klasse);
      else query = query.eq("berekende_klasse", klasse);
    }

    const { data, error, count } = await query
      .order(sortColumn, { ascending: sortDir === "asc", nullsFirst: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      fighters: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("fp beheer fighters", err);
    return NextResponse.json(
      { error: err?.message || "Vechters konden niet worden geladen." },
      { status: 500 }
    );
  }
}
