// Matchmaker review carry: alleen de direct voorgaande afgeronde Matchmaker-controle.
import { matchmakerPairingIdentity } from "@/lib/matchmaker/pairingIdentity";
import { carryReviewDecisions } from "@/lib/control/carryReviewDecisions";

const MATCHMAKER_RUN_TYPES = ["matchmaker_db_controle", "control-engine-matchmaker-total"];

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
