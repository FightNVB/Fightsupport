import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "superadmin"];

export async function GET(req: Request) {
  try {
    await requireRole(req, ALLOWED_ROLES);

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") || 50)));
    const search = String(url.searchParams.get("q") || "").trim();
    const year = String(url.searchParams.get("year") || "").trim();
    const from = (page - 1) * pageSize;

    let query = supabaseAdmin.from("fightpassport_events").select("*", { count: "exact" });

    if (search) {
      if (/^#?\d+$/.test(search)) {
        query = query.eq("event_id", Number(search.replace("#", "")));
      } else {
        // Verwijder tekens die de PostgREST .or()-filter kunnen openbreken.
        const safeSearch = search.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
        if (safeSearch) {
          query = query.or(
            `evenement_naam.ilike.%${safeSearch}%,promotor.ilike.%${safeSearch}%,plaats.ilike.%${safeSearch}%,bond_naam.ilike.%${safeSearch}%`,
          );
        }
      }
    }

    if (/^\d{4}$/.test(year)) {
      query = query.gte("evenement_datum", `${year}-01-01`).lte("evenement_datum", `${year}-12-31`);
    }

    const { data, count, error } = await query
      .order("evenement_datum", { ascending: false, nullsFirst: false })
      .order("event_id", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    return NextResponse.json({ events: data ?? [], page, pageSize, total: count ?? 0 });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("[fightpassport-evenementen/events] laden mislukt:", err);
    return NextResponse.json(
      { error: err?.message || "Evenementen konden niet worden geladen." },
      { status: 500 },
    );
  }
}
