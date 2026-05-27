import { NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

function clean(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

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

function toNum(v: any) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Wordt gebruikt door de sportscholen scraper nadat de Excel is gelezen.
// Verwacht: { sportschool_id, rows: [{ va_nummer, naam, ... }] }
export async function POST(req: Request) {
  await requireAdminOrCron(req);
  try {
    const body = await req.json().catch(() => ({}));
    const sportschool_id = clean(body.sportschool_id);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!sportschool_id) return NextResponse.json({ error: "sportschool_id ontbreekt" }, { status: 400 });
    if (rows.length === 0) return NextResponse.json({ error: "Geen vechters meegegeven" }, { status: 400 });

    const now = new Date().toISOString();
    const payload = rows
      .map((r: any) => {
        const va = clean(r.va_nummer ?? r.va ?? r.VA ?? r["VA nummer"]);
        if (!va) return null;
        const naam = clean(r.naam ?? r.name ?? r.Naam) ?? [clean(r.voornaam), clean(r.achternaam)].filter(Boolean).join(" ");
        return {
          sportschool_id,
          va_nummer: va,
          naam: clean(naam),
          voornaam: clean(r.voornaam),
          achternaam: clean(r.achternaam),
          geboortedatum: clean(r.geboortedatum ?? r.geboorte_datum),
          geslacht: clean(r.geslacht),
          discipline: clean(r.discipline),
          klasse: clean(r.klasse),
          gewicht: toNum(r.gewicht),
          licentie_status: clean(r.licentie_status ?? r.licentie),
          keurmerk_status: clean(r.keurmerk_status ?? r.keurmerk),
          heeft_keurmerk: typeof r.heeft_keurmerk === "boolean" ? r.heeft_keurmerk : null,
          startverbod: Boolean(r.startverbod),
          status: clean(r.status) ?? "actief",
          raw: r,
          scraped_at: now,
          updated_at: now,
        };
      })
      .filter(Boolean);

    const { data, error } = await supabaseAdmin
      .from("sportschool_fighters")
      .upsert(payload, { onConflict: "sportschool_id,va_nummer" })
      .select("id, va_nummer, naam");
    if (error) throw error;

    const jobId = clean(body.job_id ?? req.headers.get("x-sportschool-sync-job-id"));
    if (jobId) {
      await supabaseAdmin
        .from("sportschool_sync_jobs")
        .update({ imported_count: data?.length ?? 0, updated_at: now })
        .eq("id", jobId);
    }

    await supabaseAdmin
      .from("sportscholen")
      .update({ last_team_sync_at: now, team_sync_status: "gereed", team_sync_error: null })
      .eq("sportschool_id", sportschool_id);

    return NextResponse.json({ ok: true, count: data?.length ?? 0, rows: data ?? [] });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
