import { NextResponse } from "next/server";
import { cleanVa, supabaseAdmin } from "@/lib/talentstatusAdmin";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await requireAdmin(req);
  const { data: regels, error } = await supabaseAdmin
    .from("controle_resultaten")
    .select("*")
    .or("rule.ilike.%talentstatus%,boodschap.ilike.%talentstatus%,rule_code.ilike.%TALENT%")
    .eq("resultaat", "AKKOORD")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });

  let inserted = 0;
  for (const r of regels ?? []) {
    const va = cleanVa(r.va_nummer);
    if (!va) continue;
    const naam = r.naam || r.vechter_naam || r.fighter_name || `VA ${va}`;
    const { error: upErr } = await supabaseAdmin.from("talentstatus_vechters").upsert({
      va_nummer: va,
      naam,
      land: "NL",
      klasse: "J+",
      talent_status: "voorlopig",
      status: "wacht_op_bevestiging",
      admin_bevestigd: false,
      opmerkingen: `Automatisch uit controle_resultaten: ${r.boodschap || r.rule || "talentstatus akkoord"}`,
    }, { onConflict: "va_nummer" });
    if (!upErr) inserted++;
  }

  return NextResponse.json({ ok: true, verwerkt: inserted });
}
