// Matchmaker review carry: Matchmaker-controles delen besluiten zolang dezelfde melding aanwezig blijft.
import { matchmakerPairingIdentity } from "@/lib/matchmaker/pairingIdentity";
import { carryReviewDecisions } from "@/lib/control/carryReviewDecisions";

// Inclusief bestaande eindcontrole-runs zodat reeds gegeven besluiten niet verloren gaan.
const MATCHMAKER_RUN_TYPES = [
  "matchmaker_db_controle",
  "matchmaker_eindcontrole",
  "control-engine-matchmaker-total",
];

export async function carryApprovedRecordDifferenceReviews(args: {
  supabase: any;
  matchmakingId: string;
  runId: string;
  currentContextRows: any[];
}): Promise<number> {
  return carryReviewDecisions({
    ...args,
    runTypes: MATCHMAKER_RUN_TYPES,
    pairingIdentity: matchmakerPairingIdentity,
  });
}
