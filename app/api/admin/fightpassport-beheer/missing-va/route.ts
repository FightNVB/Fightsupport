import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

const STATUSES = new Set(["pending_review", "confirmed_deleted", "retry_requested", "resolved"]);
const ACTIONS = new Set(["confirm_deleted", "retry", "restore", "resolve"]);

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "all").trim();
    const q = (url.searchParams.get("q") || "").trim().replace(/[%(),]/g, "");

    let query = supabaseAdmin
      .from("fightpassport_missing_va")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(1000);

    if (status !== "all" && STATUSES.has(status)) query = query.eq("status", status);
    if (q) query = query.ilike("va_number", `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const { data: allStatuses, error: statsError } = await supabaseAdmin
      .from("fightpassport_missing_va")
      .select("status");
    if (statsError) throw statsError;
    const stats = (allStatuses ?? []).reduce<Record<string, number>>((acc, row: any) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      items: rows,
      stats: {
        pending_review: stats.pending_review || 0,
        retry_requested: stats.retry_requested || 0,
        confirmed_deleted: stats.confirmed_deleted || 0,
        resolved: stats.resolved || 0,
        attention: (stats.pending_review || 0) + (stats.retry_requested || 0),
      },
    });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("fightpassport missing-va GET", err);
    return NextResponse.json({ error: err?.message || "Ontbrekende VA-nummers konden niet worden geladen." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireRole(req, ["admin", "superadmin"]);
    const body = await req.json().catch(() => ({}));
    const vaNumber = String(body.va_number || "").trim();
    const action = String(body.action || "").trim();
    const note = body.review_note == null ? undefined : String(body.review_note).trim().slice(0, 2000);

    if (!/^\d{1,8}$/.test(vaNumber)) {
      return NextResponse.json({ error: "Ongeldig VA-nummer." }, { status: 400 });
    }
    if (!ACTIONS.has(action)) {
      return NextResponse.json({ error: "Onbekende actie." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const userId = auth.userId;
    const patch: Record<string, any> = { updated_at: now };

    if (action === "confirm_deleted") {
      Object.assign(patch, { status: "confirmed_deleted", confirmed_at: now, confirmed_by: userId, resolved_at: null });
    } else if (action === "retry") {
      Object.assign(patch, { status: "retry_requested", confirmed_at: null, confirmed_by: null, resolved_at: null });
    } else if (action === "restore") {
      Object.assign(patch, { status: "pending_review", confirmed_at: null, confirmed_by: null, resolved_at: null });
    } else {
      Object.assign(patch, { status: "resolved", resolved_at: now, confirmed_at: null, confirmed_by: null });
    }
    if (note !== undefined) patch.review_note = note || null;

    const { data, error } = await supabaseAdmin
      .from("fightpassport_missing_va")
      .update(patch)
      .eq("va_number", vaNumber)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("fightpassport missing-va PATCH", err);
    return NextResponse.json({ error: err?.message || "Actie kon niet worden uitgevoerd." }, { status: 500 });
  }
}
