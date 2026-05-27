import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/talentstatusAdmin";

export const runtime = "nodejs";

async function updateEvaluatieStatusForFighter(fighterId: string | null) {
  if (!fighterId) return;

  const { data: fighter } = await supabaseAdmin
    .from("talentstatus_vechters")
    .select("id,status,talent_status,max_proef_partijen")
    .eq("id", fighterId)
    .maybeSingle();

  if (!fighter) return;

  const { count } = await supabaseAdmin
    .from("talentstatus_partijen")
    .select("id", { count: "exact", head: true })
    .or(`vechter_id.eq.${fighterId},tegenstander_id.eq.${fighterId}`);

  const max = Number(fighter.max_proef_partijen || 3);
  const totaal = count ?? 0;

  // Als een partij is verwijderd en de vechter komt weer onder de evaluatiegrens,
  // zet alleen de automatische evaluatiestatus terug. Definitief/afgewezen blijven ongemoeid.
  if (totaal < max && fighter.status === "evaluatie_nodig" && fighter.talent_status === "voorlopig") {
    await supabaseAdmin
      .from("talentstatus_vechters")
      .update({ status: "actief", updated_at: new Date().toISOString() })
      .eq("id", fighterId);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ partijId: string }> }) {
  const { partijId } = await params;

  if (!partijId) {
    return NextResponse.json({ ok: false, error: "Partij ID ontbreekt." }, { status: 400 });
  }

  const { data: partij, error: getError } = await supabaseAdmin
    .from("talentstatus_partijen")
    .select("id,vechter_id,tegenstander_id")
    .eq("id", partijId)
    .maybeSingle();

  if (getError) return NextResponse.json({ ok: false, error: getError.message }, { status: 500 });
  if (!partij) return NextResponse.json({ ok: false, error: "Partij niet gevonden." }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("talentstatus_partijen")
    .delete()
    .eq("id", partijId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await updateEvaluatieStatusForFighter(partij.vechter_id);
  await updateEvaluatieStatusForFighter(partij.tegenstander_id);

  return NextResponse.json({ ok: true });
}
