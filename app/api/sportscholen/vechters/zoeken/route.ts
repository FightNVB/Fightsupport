import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanVa(v: unknown) {
  const s = String(v ?? "").replace(/\D/g, "");
  return s || null;
}

function ageFromBirthdate(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const birth = new Date(raw);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const month = now.getUTCMonth() - birth.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export async function GET(req: Request) {
  try {
    await requireAnyRole(req, ["trainer", "admin", "superadmin"] as any);
    const q = String(new URL(req.url).searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ ok: true, candidates: [] });

    const safeQ = q.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
    const digits = cleanVa(q);
    let builder = supabaseAdmin.from("fightpassport_fighters").select("va_nummer,naam,geboortedatum").limit(25);
    builder = digits && digits.length >= 3
      ? builder.or(`va_nummer.eq.${digits},naam.ilike.%${safeQ}%`)
      : builder.ilike("naam", `%${safeQ}%`);

    const { data, error } = await builder.order("naam", { ascending: true });
    if (error) throw error;
    const vaList = (data ?? []).map((x: any) => cleanVa(x.va_nummer)).filter(Boolean) as string[];

    // Dit is de bron die de sportscholen-scraper vult via VECHTERS -> Excel.
    const { data: links, error: linkError } = vaList.length
      ? await supabaseAdmin
          .from("fightpassport_school_fighters")
          .select("va_nummer,sportschool_id,actief,last_seen_at,updated_at")
          .in("va_nummer", vaList)
          .order("actief", { ascending: false })
          .order("last_seen_at", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
      : { data: [], error: null };
    if (linkError) throw linkError;

    const schoolIds = Array.from(new Set((links ?? []).map((row: any) => Number(row.sportschool_id)).filter(Number.isFinite)));
    const { data: schools, error: schoolError } = schoolIds.length
      ? await supabaseAdmin.from("sportscholen").select("sportschool_id,naam,plaats").in("sportschool_id", schoolIds)
      : { data: [], error: null };
    if (schoolError) throw schoolError;

    const schoolById = new Map<number, any>((schools ?? []).map((school: any) => [Number(school.sportschool_id), school]));
    const currentGym = new Map<string, string>();
    const lastGym = new Map<string, string>();

    for (const row of links ?? []) {
      const va = cleanVa((row as any).va_nummer);
      const school = schoolById.get(Number((row as any).sportschool_id));
      const name = String(school?.naam ?? "").trim();
      if (!va || !name) continue;
      const label = school?.plaats ? `${name} (${school.plaats})` : name;
      if (!lastGym.has(va)) lastGym.set(va, label);
      if ((row as any).actief === true && !currentGym.has(va)) currentGym.set(va, label);
    }

    return NextResponse.json({
      ok: true,
      candidates: (data ?? []).map((fighter: any) => {
        const va = cleanVa(fighter.va_nummer) ?? "";
        return {
          va_nummer: va,
          naam: fighter.naam ?? null,
          leeftijd: ageFromBirthdate(fighter.geboortedatum),
          huidige_sportschool: currentGym.get(va) ?? lastGym.get(va) ?? null,
        };
      }),
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("[sportscholen/vechters/zoeken]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Zoeken in FightPassport mislukt" }, { status: 500 });
  }
}
