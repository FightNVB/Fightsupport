import { NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

function isCronAllowed(req: Request) {
  const secret = process.env.SPORTSCHOOL_SYNC_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const h = req.headers.get("authorization") || "";
  return h === `Bearer ${secret}` || req.headers.get("x-cron-secret") === secret;
}

async function requireAdminOrCron(req: Request) {
  if (isCronAllowed(req)) return;
  await requireAdmin(req);
}

function clean(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export async function POST(req: Request) {
  await requireAdminOrCron(req);

  try {
    const body = await req.json().catch(() => ({}));
    const forceSportschoolId = clean(body.sportschool_id);
    const source = clean(body.source) ?? "nightly";

    let q = supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id, naam, plaats")
      .order("naam", { ascending: true });

    if (forceSportschoolId) q = q.eq("sportschool_id", forceSportschoolId);

    const { data: schools, error: schoolErr } = await q;
    if (schoolErr) throw schoolErr;

    const rows = (schools ?? [])
      .map((s: any) => ({
        sportschool_id: clean(s.sportschool_id),
        sportschool_naam: clean(s.naam),
        status: "nieuw",
        bron: source,
        payload: { sportschool_id: clean(s.sportschool_id), sportschool_naam: clean(s.naam), plaats: clean(s.plaats) },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
      .filter((r: any) => r.sportschool_id && r.sportschool_naam);

    if (!rows.length) return NextResponse.json({ ok: true, created: 0 });

    const { data, error } = await supabaseAdmin
      .from("sportschool_sync_jobs")
      .insert(rows)
      .select("id, sportschool_id, sportschool_naam, status");
    if (error) throw error;

    return NextResponse.json({ ok: true, created: data?.length ?? 0, jobs: data ?? [] });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
