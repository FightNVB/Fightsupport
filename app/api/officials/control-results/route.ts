import { NextRequest } from "next/server";
import { assertCanAccessMatchmaking, requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

const roles = ["official", "hoofdofficial", "admin", "superadmin"] as const;
const clean = (value: unknown) => String(value ?? "").trim();

async function authorize(req: NextRequest, matchmakingId: string) {
  const auth = await requireUserWithRole(req, [...roles]);
  await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: auth.userId, role: auth.role });
  return auth;
}

export async function GET(req: NextRequest) {
  try {
    const matchmakingId = clean(req.nextUrl.searchParams.get("matchmaking_id"));
    const partijNr = Number(req.nextUrl.searchParams.get("partij_nr"));
    if (!matchmakingId || !Number.isInteger(partijNr) || partijNr < 1) return privateJson({ error: "Ongeldige selectie." }, 400);
    await authorize(req, matchmakingId);
    const result = await supabaseAdmin
      .from("controle_resultaten")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("partij_nr", partijNr)
      .order("created_at", { ascending: true });
    if (result.error) throw result.error;
    return privateJson({ rows: result.data ?? [] });
  } catch (error) {
    return secureError(error, "Controleresultaten konden niet worden geladen.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = clean(body?.matchmaking_id);
    const partijNr = Number(body?.partij_nr);
    if (!matchmakingId || !Number.isInteger(partijNr) || partijNr < 1) return privateJson({ error: "Ongeldige selectie." }, 400);
    const auth = await authorize(req, matchmakingId);

    const payload = {
      controle_run_id: clean(body?.controle_run_id) || null,
      run_id: clean(body?.run_id) || null,
      matchmaking_id: matchmakingId,
      partij_nr: partijNr,
      bout_id: clean(body?.bout_id) || null,
      rule: clean(body?.rule) || "Handmatige melding",
      rule_code: "HANDMATIGE_MELDING",
      resultaat: clean(body?.resultaat) || "waarschuwing",
      original_resultaat: clean(body?.original_resultaat) || null,
      boodschap: clean(body?.boodschap),
      aantekeningen: clean(body?.aantekeningen) || null,
      severity: clean(body?.severity) || null,
      review_status: "open",
      hoek: null,
      actor_user_id: auth.userId,
    };
    if (!payload.boodschap) return privateJson({ error: "Melding ontbreekt." }, 400);
    const result = await supabaseAdmin.from("controle_resultaten").insert(payload).select("id").single();
    if (result.error) throw result.error;
    return privateJson({ ok: true, id: result.data?.id }, 201);
  } catch (error) {
    return secureError(error, "Controleresultaat kon niet worden toegevoegd.");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = clean(body?.matchmaking_id);
    const resultId = clean(body?.id);
    if (!matchmakingId || !resultId) return privateJson({ error: "Ongeldige selectie." }, 400);
    await authorize(req, matchmakingId);
    const result = await supabaseAdmin
      .from("controle_resultaten")
      .update({ aantekeningen: clean(body?.aantekeningen) })
      .eq("id", resultId)
      .eq("matchmaking_id", matchmakingId)
      .select("id")
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return privateJson({ error: "Controleresultaat niet gevonden." }, 404);
    return privateJson({ ok: true });
  } catch (error) {
    return secureError(error, "Aantekening kon niet worden opgeslagen.");
  }
}
