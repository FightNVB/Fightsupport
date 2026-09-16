// Admin review carry: Admin-controles delen besluiten zolang dezelfde melding aanwezig blijft.
import { adminPairingIdentity } from "@/lib/control/pairingIdentity";
import { carryReviewDecisions } from "@/lib/control/carryReviewDecisions";

// control-engine is de bestaande/legacy Admin-controle; admin-total is de full scraper-flow.
const ADMIN_RUN_TYPES = ["control-engine", "control-engine-admin-total"];

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
