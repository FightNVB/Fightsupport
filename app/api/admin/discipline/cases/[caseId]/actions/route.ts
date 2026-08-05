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

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ caseId: string }> }) {
  await requireAdmin(req);
  try {
    const { caseId } = await ctx.params;
    const body = await req.json();

    const actionStatus = cleanText(body.status) || "open";

    const payload = {
      case_id: caseId,
      actie_type: cleanText(body.actie_type),
      status: actionStatus,
      start_datum: body.start_datum || null,
      eind_datum: body.eind_datum || null,
      punten: body.punten ? Number(body.punten) : 0,
      omschrijving: cleanText(body.omschrijving),
      aangemaakt_door: body.aangemaakt_door || null,
      afgerond_op: actionStatus === "afgerond" ? new Date().toISOString() : null,
    };

    if (!payload.actie_type || !payload.omschrijving) {
      return NextResponse.json({ ok: false, error: "Actietype en omschrijving zijn verplicht." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("discipline_actions")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;

    // Een vervolgactie mag een dossier nooit automatisch afsluiten.
    // Alleen open dossiers worden naar "in behandeling" gezet; afsluiten gebeurt bewust via de aparte afrond-knop.
    await supabase
      .from("discipline_cases")
      .update({ status: "in_behandeling" })
      .eq("id", caseId)
      .eq("status", "open");

    return NextResponse.json({ ok: true, action: data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}
