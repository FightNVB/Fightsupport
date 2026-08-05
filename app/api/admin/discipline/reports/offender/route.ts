import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { esc, formatDate, reportHtml } from "../_helpers";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  try {
    const url = new URL(req.url);
    const betrokkeneType = url.searchParams.get("betrokkene_type") || "";
    const naam = url.searchParams.get("naam") || "";
    const vaNummer = url.searchParams.get("va_nummer") || "";

    let query = supabase
      .from("discipline_case_summary")
      .select("*")
      .order("datum_overtreding", { ascending: false, nullsFirst: false })
      .order("aangemaakt_op", { ascending: false });

    if (betrokkeneType) query = query.eq("betrokkene_type", betrokkeneType);
    if (vaNummer) query = query.eq("va_nummer", Number(String(vaNummer).replace(/\D/g, "")));
    else if (naam) query = query.ilike("naam", naam);

    const { data: dossiers, error } = await query;
    if (error) throw error;

    const caseIds = (dossiers ?? []).map((d) => d.id);
    let actions: any[] = [];
    if (caseIds.length > 0) {
      const { data, error: actionsError } = await supabase
        .from("discipline_actions")
        .select("*")
        .in("case_id", caseIds)
        .order("aangemaakt_op", { ascending: false });
      if (actionsError) throw actionsError;
      actions = data ?? [];
    }

    const rows = (dossiers ?? []).map((d) => {
      const count = actions.filter((a) => a.case_id === d.id).length;
      return `<tr><td>${formatDate(d.datum_overtreding || d.aangemaakt_op)}</td><td>${esc(d.categorie)}</td><td>${esc(d.status)}</td><td>${esc(d.ernst)}</td><td>${esc(d.punten_totaal ?? 0)}</td><td>${count}</td><td>${esc(d.omschrijving)}</td></tr>`;
    }).join("");

    const body = `
      <section class="header"><h1>Rapport overtreder</h1><div class="meta">${esc(naam || vaNummer || "Onbekend")} · ${esc(betrokkeneType || "alle typen")}</div></section>
      <section class="card grid">
        <div><div class="label">Dossiers</div><div class="value orange">${(dossiers ?? []).length}</div></div>
        <div><div class="label">Vervolgstappen</div><div class="value">${actions.length}</div></div>
        <div><div class="label">Totaal minpunten</div><div class="value">${(dossiers ?? []).reduce((s, d) => s + Number(d.punten_totaal || 0), 0)}</div></div>
      </section>
      <h2>Dossiers</h2>
      <table><thead><tr><th>Datum</th><th>Categorie</th><th>Status</th><th>Ernst</th><th>Punten</th><th>Acties</th><th>Omschrijving</th></tr></thead><tbody>${rows || `<tr><td colspan="7">Geen dossiers gevonden.</td></tr>`}</tbody></table>
    `;

    return new NextResponse(reportHtml(`Rapport overtreder ${naam || vaNummer}`, body), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}
