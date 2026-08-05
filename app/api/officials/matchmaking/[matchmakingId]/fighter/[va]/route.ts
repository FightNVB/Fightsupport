import { GET as getFighterDossier } from "@/app/api/matchmaker/matchmaking/[matchmakingId]/fighter/[va]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Parameters<typeof getFighterDossier>[0],
  context: Parameters<typeof getFighterDossier>[1],
) {
  return getFighterDossier(req, context);
}
