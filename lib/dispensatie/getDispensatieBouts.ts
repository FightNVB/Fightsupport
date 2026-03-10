import { supabase } from "@/lib/supabaseClient";
import { DispensatieBoutRow } from "./types";

export async function getDispensatieBouts(): Promise<DispensatieBoutRow[]> {
  const { data, error } = await supabase
    .from("controle_bout_context")
    .select(`
      bout_uid,
      matchmaking_id,
      partij_nr,
      rood_naam,
      blauw_naam,
      rood_va,
      blauw_va,
      controle_resultaten (
        rule_code,
        rule,
        boodschap,
        resultaat
      ),
      dispensatie_requests (
        status,
        dispensatie_votes ( vote )
      )
    `)
    .eq("controle_resultaten.resultaat", "DISPENSATIE");

  if (error) throw error;
  if (!data) return [];

  return data.map((row: any) => {
    const rules = (row.controle_resultaten ?? []).map((r: any) => ({
      rule_code: r.rule_code,
      rule: r.rule,
      boodschap: r.boodschap,
    }));

    const req = row.dispensatie_requests?.[0] ?? null;
    const votes = req?.dispensatie_votes ?? [];

    return {
      bout_uid: row.bout_uid,
      matchmaking_id: row.matchmaking_id,
      partij_nr: row.partij_nr,

      rood_naam: row.rood_naam,
      blauw_naam: row.blauw_naam,
      rood_va: row.rood_va,
      blauw_va: row.blauw_va,

      status: req?.status ?? "open",
      rules,

      votes_total: votes.length,
      votes_approve: votes.filter((v: any) => v.vote === true).length,
    };
  });
}
