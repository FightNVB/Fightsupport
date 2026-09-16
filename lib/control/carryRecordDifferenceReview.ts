// Admin review carry: alleen de direct voorgaande afgeronde Admin-controle.
import { adminPairingIdentity } from "@/lib/control/pairingIdentity";
import { carryReviewDecisions } from "@/lib/control/carryReviewDecisions";

const ADMIN_RUN_TYPES = ["control-engine-admin-total"];

export async function carryApprovedAdminRecordDifferenceReviews(args: {
  supabase: any;
  matchmakingId: string;
  runId: string;
  currentContextRows: any[];
}): Promise<number> {
  return carryReviewDecisions({
    ...args,
    runTypes: ADMIN_RUN_TYPES,
    pairingIdentity: adminPairingIdentity,
  });
}
