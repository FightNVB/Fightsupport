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
    const scope = url.searchParams.get("scope") || "open_actief";

    let query = supabase
      .from("discipline_case_summary")
      .select("*")
      .order("datum_overtreding", { ascending: false, nullsFirst: false })
      .order("aangemaakt_op", { ascending: false });

    if (scope === "vervallen") {
      query = query.or("status.eq.afgerond,status.eq.vervallen");
    } else {
      query = query.or("status.eq.open,status.eq.in_behandeling,actieve_acties.gt.0");
    }

    const { data: dossiers, error } = await query;
    if (error) throw error;

    const dossierRows = dossiers ?? [];
    const caseIds = dossierRows.map((d: any) => d.id).filter(Boolean);
    const openActionsByCase = new Map<string, any>();

    if (caseIds.length > 0) {
      const { data: openActions, error: actionsError } = await supabase
        .from("discipline_actions")
        .select("id, case_id, actie_type, status, omschrijving, start_datum, eind_datum, aangemaakt_op")
        .in("case_id", caseIds)
        .in("status", ["open", "actief"])
        .order("aangemaakt_op", { ascending: false });

      if (actionsError) throw actionsError;

      for (const action of openActions ?? []) {
        if (!openActionsByCase.has(action.case_id)) openActionsByCase.set(action.case_id, action);
      }
    }

    const title = scope === "vervallen" ? "Vervallen / afgeronde dossiers" : "Open / actieve dossiers";
    const isVervallen = scope === "vervallen";

    const rows = dossierRows.map((d: any) => {
      const openAction = openActionsByCase.get(d.id);
      const openActionLabel = openAction
        ? `${openAction.actie_type || "Vervolgstap"} (${openAction.status || "open"})${openAction.omschrijving ? ` - ${openAction.omschrijving}` : ""}`
        : "-";

      if (isVervallen) {
        return `<tr><td>${formatDate(d.datum_overtreding || d.aangemaakt_op)}</td><td>${esc(d.naam)}</td><td>${esc(d.betrokkene_type)}</td><td>${esc(d.categorie)}</td><td>${esc(d.status)}</td><td>${esc(d.ernst)}</td><td>${formatDate(d.afgerond_op)}</td><td>${esc(d.punten_totaal ?? 0)}</td></tr>`;
      }

      return `<tr><td>${formatDate(d.datum_overtreding || d.aangemaakt_op)}</td><td>${esc(d.naam)}</td><td>${esc(d.betrokkene_type)}</td><td>${esc(d.categorie)}</td><td>${esc(d.status)}</td><td>${esc(d.ernst)}</td><td>${esc(d.actieve_acties ?? 0)}</td><td>${esc(openActionLabel)}</td><td>${esc(d.punten_totaal ?? 0)}</td></tr>`;
    }).join("");

    const tableHeader = isVervallen
      ? `<tr><th>Datum</th><th>Naam</th><th>Type</th><th>Categorie</th><th>Status</th><th>Ernst</th><th>Datum afgerond</th><th>Punten</th></tr>`
      : `<tr><th>Datum</th><th>Naam</th><th>Type</th><th>Categorie</th><th>Status</th><th>Ernst</th><th>Actief</th><th>Open actie</th><th>Punten</th></tr>`;
    const colspan = isVervallen ? 8 : 9;

    const body = `
      <section class="header"><h1>Rapport ${esc(title)}</h1><div class="meta">FightSupport Discipline · gegenereerd ${formatDate(new Date().toISOString())}</div></section>
      <section class="card grid">
        <div><div class="label">Aantal dossiers</div><div class="value orange">${dossierRows.length}</div></div>
        <div><div class="label">${isVervallen ? "Afgeronde dossiers" : "Actieve vervolgstappen"}</div><div class="value">${isVervallen ? dossierRows.filter((d: any) => d.status === "afgerond" || d.afgerond_op).length : dossierRows.reduce((s: number, d: any) => s + Number(d.actieve_acties || 0), 0)}</div></div>
        <div><div class="label">Minpunten totaal</div><div class="value">${dossierRows.reduce((s: number, d: any) => s + Number(d.punten_totaal || 0), 0)}</div></div>
      </section>
      <table><thead>${tableHeader}</thead><tbody>${rows || `<tr><td colspan="${colspan}">Geen dossiers gevonden.</td></tr>`}</tbody></table>
    `;

    return new NextResponse(reportHtml(`Rapport ${title}`, body), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}
