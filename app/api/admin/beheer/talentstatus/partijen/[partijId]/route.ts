import { NextRequest, NextResponse } from "next/server";
import { cleanVa, supabaseAdmin } from "@/lib/talentstatusAdmin";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

async function countTalentstatusPartijenForFighter(fighter: any) {
  const fighterId = fighter?.id;
  const fighterVa = cleanVa(fighter?.va_nummer);

  if (!fighterId && !fighterVa) return 0;

  const manualParts: string[] = [];
  if (fighterId) manualParts.push(`vechter_id.eq.${fighterId}`, `tegenstander_id.eq.${fighterId}`);
  if (fighterVa) manualParts.push(`vechter_va.eq.${fighterVa}`, `tegenstander_va.eq.${fighterVa}`);

  const { count: manualCount } = await supabaseAdmin
    .from("talentstatus_partijen")
    .select("id", { count: "exact", head: true })
    .or(manualParts.join(","));

  let uitslagenCount = 0;
  if (fighterVa) {
    const { count } = await supabaseAdmin
      .from("uitslagen_bouts")
      .select("id", { count: "exact", head: true })
      .eq("klasse", "J+")
      .eq("verwijderd", false)
      .or(`rood_va.eq.${fighterVa},blauw_va.eq.${fighterVa}`);
    uitslagenCount = count ?? 0;
  }

  return (manualCount ?? 0) + uitslagenCount;
}

async function updateEvaluatieStatusForFighter(fighterId: string | null) {
  if (!fighterId) return;

  const { data: fighter } = await supabaseAdmin
    .from("talentstatus_vechters")
    .select("id,va_nummer,status,talent_status,max_proef_partijen")
    .eq("id", fighterId)
    .maybeSingle();

  if (!fighter) return;

  const max = Number(fighter.max_proef_partijen || 3);
  const totaal = await countTalentstatusPartijenForFighter(fighter);

  // Als een handmatige partij is verwijderd en de vechter komt weer onder de evaluatiegrens,
  // zet alleen de automatische evaluatiestatus terug. Definitief/afgewezen blijven ongemoeid.
  if (totaal < max && fighter.status === "evaluatie_nodig" && fighter.talent_status === "voorlopig") {
    await supabaseAdmin
      .from("talentstatus_vechters")
      .update({ status: "actief", updated_at: new Date().toISOString() })
      .eq("id", fighterId);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ partijId: string }> }) {
  await requireAdmin(req);
  const { partijId } = await params;

  if (!partijId) {
    return NextResponse.json({ ok: false, error: "Partij ID ontbreekt." }, { status: 400 });
  }

  const { data: partij, error: getError } = await supabaseAdmin
    .from("talentstatus_partijen")
    .select("id,vechter_id,tegenstander_id")
    .eq("id", partijId)
    .maybeSingle();

  if (getError) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  if (!partij) return NextResponse.json({ ok: false, error: "Partij niet gevonden." }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("talentstatus_partijen")
    .delete()
    .eq("id", partijId);

  if (error) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });

  await updateEvaluatieStatusForFighter(partij.vechter_id);
  await updateEvaluatieStatusForFighter(partij.tegenstander_id);

  return NextResponse.json({ ok: true });
}
