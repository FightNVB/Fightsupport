import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function cleanVa(value: unknown) {
  return String(value ?? "")
    .replace(/^VA/i, "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
}

export async function GET(req: Request, ctx: { params: Promise<{ vaNummer: string }> }) {
  await requireAdmin(req);
  const { vaNummer } = await ctx.params;
  const va = cleanVa(vaNummer);

  const { data: dossiers, error } = await supabaseAdmin
    .from("jeugd_talentstatus_dossiers")
    .select("*")
    .eq("va_nummer", va)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });

  const { data: partijen, error: partijenError } = await supabaseAdmin
    .from("jeugd_talentstatus_partijen")
    .select("*")
    .or(`vechter_va.eq.${va},tegenstander_va.eq.${va},va_nummer.eq.${va}`)
    .order("evenement_datum", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (partijenError) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dossiers: dossiers ?? [], partijen: partijen ?? [] });
}
