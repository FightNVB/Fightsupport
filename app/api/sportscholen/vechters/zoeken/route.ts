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

    // De teamlijst kan een vechter historisch bij meerdere sportscholen bevatten.
    // last_seen_at is alleen het scrape-moment en mag daarom NIET bepalen welke gym actueel is.
    // De meest recente FightPassport-uitslag bevat de sportschool waaronder de vechter het laatst uitkwam.
    const [{ data: results, error: resultError }, { data: links, error: linkError }] = vaList.length
      ? await Promise.all([
          supabaseAdmin
            .from("fightpassport_results")
            .select("va_nummer,datum,sportschool")
            .in("va_nummer", vaList)
            .not("sportschool", "is", null)
            .order("datum", { ascending: false, nullsFirst: false }),
          supabaseAdmin
            .from("fightpassport_school_fighters")
            .select("va_nummer,sportschool_id,actief,last_seen_at,updated_at")
            .in("va_nummer", vaList)
            .order("actief", { ascending: false })
            .order("last_seen_at", { ascending: false, nullsFirst: false }),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    if (resultError) throw resultError;
    if (linkError) throw linkError;

    const latestResultGym = new Map<string, string>();
    for (const row of results ?? []) {
      const va = cleanVa((row as any).va_nummer);
      const gym = String((row as any).sportschool ?? "").trim();
      if (va && gym && !latestResultGym.has(va)) latestResultGym.set(va, gym);
    }

    // Fallback voor debutanten zonder uitslag: gebruik de door de sportscholen-scraper
    // gevonden teamkoppeling. Dit is alleen fallback, nooit sterker dan een recente uitslag.
    const schoolIds = Array.from(new Set((links ?? []).map((row: any) => Number(row.sportschool_id)).filter(Number.isFinite)));
    const { data: schools, error: schoolError } = schoolIds.length
      ? await supabaseAdmin.from("sportscholen").select("sportschool_id,naam,plaats").in("sportschool_id", schoolIds)
      : { data: [], error: null };
    if (schoolError) throw schoolError;

    const schoolById = new Map<number, any>((schools ?? []).map((school: any) => [Number(school.sportschool_id), school]));
    const fallbackGym = new Map<string, string>();
    for (const row of links ?? []) {
      const va = cleanVa((row as any).va_nummer);
      if (!va || fallbackGym.has(va)) continue;
      const school = schoolById.get(Number((row as any).sportschool_id));
      const name = String(school?.naam ?? "").trim();
      if (!name) continue;
      fallbackGym.set(va, school?.plaats ? `${name} (${school.plaats})` : name);
    }

    return NextResponse.json({
      ok: true,
      candidates: (data ?? []).map((fighter: any) => {
        const va = cleanVa(fighter.va_nummer) ?? "";
        return {
          va_nummer: va,
          naam: fighter.naam ?? null,
          leeftijd: ageFromBirthdate(fighter.geboortedatum),
          huidige_sportschool: latestResultGym.get(va) ?? fallbackGym.get(va) ?? null,
        };
      }),
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("[sportscholen/vechters/zoeken]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Zoeken in FightPassport mislukt" }, { status: 500 });
  }
}
