import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";
import { secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const norm = (v: unknown) => String(v ?? "").normalize("NFKC").toLocaleLowerCase("nl-NL").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");

export async function POST(req: Request) {
  try {
    const { matchmaking_id, controle_run_id, partij_nr } = await req.json();
    if (!matchmaking_id || !controle_run_id || !Number.isInteger(Number(partij_nr)) || Number(partij_nr) < 1) {
      return NextResponse.json({ error: "Ongeldige partij" }, { status: 400 });
    }
    const auth = await requireUserWithRole(req, ["matchmaker", "official", "hoofdofficial", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id, userId: auth.userId, role: auth.role });
    const { data: ctx, error } = await db.from("controle_bout_context").select("discipline,rood_naam_mm,blauw_naam_mm,rood_va_mm,blauw_va_mm,rood_geboortedatum_fp,blauw_geboortedatum_fp").eq("matchmaking_id", matchmaking_id).eq("controle_run_id", controle_run_id).eq("partij_nr", Number(partij_nr)).maybeSingle();
    if (error) throw error;
    if (!ctx || !["boksen", "r boksen"].includes(norm(ctx.discipline))) return NextResponse.json({ rood: null, blauw: null });
    const { data: dates, error: datesError } = await db.from("boksen_upload_geboortedata").select("naam,geboortedatum");
    if (datesError) throw datesError;
    const result: Record<string, string | null> = { rood: null, blauw: null };
    for (const side of ["rood", "blauw"] as const) {
      if (String(ctx[`${side}_va_mm`] ?? "").trim() || ctx[`${side}_geboortedatum_fp`]) continue;
      const matches = (dates ?? []).filter((d) => norm(d.naam) === norm(ctx[`${side}_naam_mm`]));
      if (matches.length && matches.every((d) => d.geboortedatum === matches[0].geboortedatum)) result[side] = matches[0].geboortedatum;
    }
    return NextResponse.json(result);
  } catch (e) {
    return secureError(e, "Geboortedatum kon niet worden opgehaald.");
  }
}
