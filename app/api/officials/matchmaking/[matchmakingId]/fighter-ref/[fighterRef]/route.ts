import { NextRequest } from "next/server";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
  supabaseAdmin,
} from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ matchmakingId: string; fighterRef: string }> },
) {
  try {
    const { matchmakingId: rawMatchmakingId, fighterRef: rawRef } = await context.params;
    const matchmakingId = String(rawMatchmakingId ?? "").trim();
    const fighterRef = String(rawRef ?? "").trim();
    if (!matchmakingId || !fighterRef) return privateJson({ error: "Ongeldige vechterselectie." }, 400);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fighterRef);
    const isNumeric = /^\d+$/.test(fighterRef);
    if (!isUuid && !isNumeric) return privateJson({ error: "Ongeldige vechterselectie." }, 400);

    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: auth.userId, role: auth.role });

    const numericVa = fighterRef.replace(/\D/g, "");
    if (isNumeric && numericVa) return privateJson({ va: numericVa });

    const contextRow = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .select("va_nummer")
      .eq("matchmaking_id", matchmakingId)
      .or(`fighter_id.eq.${fighterRef},inschrijving_id.eq.${fighterRef},id.eq.${fighterRef}`)
      .limit(1)
      .maybeSingle();
    if (contextRow.error) throw contextRow.error;

    let va = String((contextRow.data as any)?.va_nummer ?? "").replace(/\D/g, "");
    if (!va) {
      const registration = await supabaseAdmin
        .from("aanmeldingen")
        .select("va_nummer")
        .eq("matchmaking_id", matchmakingId)
        .eq("id", fighterRef)
        .maybeSingle();
      if (registration.error) throw registration.error;
      va = String((registration.data as any)?.va_nummer ?? "").replace(/\D/g, "");
    }

    if (!va) return privateJson({ error: "Vechter niet gevonden binnen deze matchmaking." }, 404);
    return privateJson({ va });
  } catch (error) {
    return secureError(error, "Vechter kon niet worden opgezocht.");
  }
}
