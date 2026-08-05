import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const EDITABLE_CASE_FIELDS = [
  "type",
  "status",
  "betrokkene_type",
  "naam",
  "va_nummer",
  "categorie",
  "ernst",
  "omschrijving",
  "interne_notitie",
  "datum_overtreding",
  "matchmaking_id",
  "event_id",
  "bout_id",
] as const;

function normalizeNullable(value: unknown) {
  if (value === "") return null;
  return value;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  await requireAdmin(req);
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

    const { data: targets, error: targetsError } = await supabase
      .from("discipline_case_targets")
      .select("*")
      .eq("case_id", caseId)
      .order("aangemaakt_op", { ascending: true });

    if (targetsError) throw targetsError;

    let relatedCases: any[] = [];
    if (dossier) {
      let relatedQuery = supabase
        .from("discipline_case_summary")
        .select("*")
        .eq("betrokkene_type", dossier.betrokkene_type)
        .neq("id", caseId)
        .order("datum_overtreding", { ascending: false, nullsFirst: false })
        .order("aangemaakt_op", { ascending: false })
        .limit(25);

      if (dossier.va_nummer) {
        relatedQuery = relatedQuery.eq("va_nummer", dossier.va_nummer);
      } else if (dossier.naam) {
        relatedQuery = relatedQuery.ilike("naam", dossier.naam);
      }

      const { data: relatedData, error: relatedError } = await relatedQuery;
      if (relatedError) throw relatedError;
      relatedCases = relatedData ?? [];
    }


    return NextResponse.json({
      ok: true,
      dossier,
      actions: actions ?? [],
      targets: targets ?? [],
      related_cases: relatedCases,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "De aanvraag kon niet worden verwerkt." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  await requireAdmin(req);
  try {
    const { caseId } = await ctx.params;
    const body = await req.json();

    const patch: Record<string, any> = {};

    for (const key of EDITABLE_CASE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        patch[key] = normalizeNullable(body[key]);
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Geen velden ontvangen om aan te passen." },
        { status: 400 }
      );
    }

    if ("va_nummer" in patch && patch.va_nummer != null) {
      const digits = String(patch.va_nummer).replace(/\D/g, "");
      patch.va_nummer = digits ? Number(digits) : null;
    }

    if (patch.status === "afgerond") {
      patch.afgerond_op = new Date().toISOString();
    }

    if ("status" in patch && patch.status !== "afgerond") {
      patch.afgerond_op = null;
    }

    const { data, error } = await supabase
      .from("discipline_cases")
      .update(patch)
      .eq("id", caseId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      dossier: data,
      case: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "De aanvraag kon niet worden verwerkt." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  await requireAdmin(req);
  try {
    const { caseId } = await ctx.params;

    const { error } = await supabase
      .from("discipline_cases")
      .delete()
      .eq("id", caseId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "De aanvraag kon niet worden verwerkt." },
      { status: 500 }
    );
  }
}
