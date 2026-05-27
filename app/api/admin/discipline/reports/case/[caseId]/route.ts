import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { esc, formatDate, reportHtml } from "../../_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(_req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await ctx.params;

    const { data: dossier, error: dossierError } = await supabase
      .from("discipline_case_summary")
      .select("*")
      .eq("id", caseId)
      .single();
    if (dossierError) throw dossierError;

    const { data: actions, error: actionsError } = await supabase
      .from("discipline_actions")
      .select("*")
      .eq("case_id", caseId)
      .order("start_datum", { ascending: false, nullsFirst: false })
      .order("aangemaakt_op", { ascending: false });
    if (actionsError) throw actionsError;

    const rows = (actions ?? []).map((a) => `
      <tr>
        <td>${esc(a.actie_type)}</td><td>${esc(a.status)}</td><td>${formatDate(a.start_datum)}</td><td>${formatDate(a.eind_datum)}</td><td>${esc(a.punten ?? 0)}</td><td>${esc(a.omschrijving)}</td>
      </tr>`).join("");

    const body = `
      <section class="header">
        <h1>Rapport dossier</h1>
        <div class="meta">FightSupport Discipline · gegenereerd ${formatDate(new Date().toISOString())}</div>
      </section>
      <section class="card grid">
        <div><div class="label">Naam</div><div class="value orange">${esc(dossier.naam)}</div></div>
        <div><div class="label">Betrokkene</div><div class="value">${esc(dossier.betrokkene_type)}</div></div>
        <div><div class="label">VA nummer</div><div class="value">${esc(dossier.va_nummer || "-")}</div></div>
        <div><div class="label">Status dossier</div><div class="value">${esc(dossier.status)}</div></div>
        <div><div class="label">Ernst</div><div class="value">${esc(dossier.ernst)}</div></div>
        <div><div class="label">Datum overtreding</div><div class="value">${formatDate(dossier.datum_overtreding || dossier.aangemaakt_op)}</div></div>
      </section>
      <section class="card">
        <h2>Categorie</h2><p>${esc(dossier.categorie)}</p>
        <h2>Omschrijving</h2><p>${esc(dossier.omschrijving)}</p>
        <h2>Interne notitie</h2><p>${esc(dossier.interne_notitie || "Geen interne notitie.")}</p>
      </section>
      <h2>Sancties & vervolgstappen</h2>
      <table><thead><tr><th>Actie</th><th>Status</th><th>Start</th><th>Einde</th><th>Punten</th><th>Omschrijving</th></tr></thead><tbody>${rows || `<tr><td colspan="6">Geen vervolgstappen.</td></tr>`}</tbody></table>
    `;

    return new NextResponse(reportHtml(`Rapport dossier ${dossier.naam}`, body), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
