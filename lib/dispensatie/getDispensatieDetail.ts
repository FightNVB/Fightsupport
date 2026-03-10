import { supabase } from "@/lib/supabaseClient";

export async function getDispensatieDetail(bout_uid: string) {
  const { data, error } = await supabase
    .from("controle_bout_context")
    .select(`
      *,
      controle_resultaten (
        rule_code,
        rule,
        boodschap,
        resultaat
      ),
      dispensatie_requests (
        status,
        decision_note,
        dispensatie_votes (
          voter_id,
          vote,
          note
        )
      )
    `)
    .eq("bout_uid", bout_uid)
    .single();

  if (error) throw error;
  return data;
}
