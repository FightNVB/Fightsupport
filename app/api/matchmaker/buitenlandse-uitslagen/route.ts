import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
const clean = (v: unknown) => String(v ?? "").trim();

export async function GET(req: Request) {
  try {
    await requireRole(req, ["matchmaker", "admin", "superadmin"]);
    const url = new URL(req.url);
    const matchmakingId = clean(url.searchParams.get("matchmaking_id"));
    const va = clean(url.searchParams.get("va_nummer"));
    let q = supabaseAdmin.from("matchmaker_buitenlandse_uitslagen").select("*").order("ingediend_op", { ascending: false });
    if (matchmakingId) q = q.eq("matchmaking_id", matchmakingId);
    if (va) q = q.eq("va_nummer", va);
    const { data, error } = await q.limit(200);
    if (error) throw error;
    return NextResponse.json({ uitslagen: data ?? [] });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "Laden mislukt." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireRole(req, ["matchmaker", "admin", "superadmin"]);
    const b = await req.json();
    const matchmaking_id = clean(b.matchmaking_id);
    const va_nummer = clean(b.va_nummer);
    const uitslag = clean(b.uitslag).toUpperCase();
    if (!matchmaking_id || !va_nummer || !uitslag) return NextResponse.json({ error: "Matchmaking, VA-nummer en uitslag zijn verplicht." }, { status: 400 });
    if (!["W", "V", "G", "NC"].includes(uitslag)) return NextResponse.json({ error: "Uitslag moet W, V, G of NC zijn." }, { status: 400 });
    const row = {
      matchmaking_id,
      partij_nr: Number.isFinite(Number(b.partij_nr)) ? Number(b.partij_nr) : null,
      va_nummer,
      vechter_naam: clean(b.vechter_naam) || null,
      datum: clean(b.datum) || null,
      discipline: clean(b.discipline) || null,
      klasse: clean(b.klasse) || null,
      tegenstander: clean(b.tegenstander) || null,
      uitslag,
      evenement: clean(b.evenement) || null,
      organisatie: clean(b.organisatie) || null,
      land: clean(b.land) || null,
      bewijs_opmerking: clean(b.bewijs_opmerking) || null,
      status: "INGEDIEND",
      ingediend_door: userId,
    };
    const { data, error } = await supabaseAdmin.from("matchmaker_buitenlandse_uitslagen").insert(row).select("*").single();
    if (error) throw error;
    return NextResponse.json({ uitslag: data });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "Opslaan mislukt." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireRole(req, ["admin", "superadmin"]);
    const b = await req.json();
    const id = clean(b.id);
    const status = clean(b.status).toUpperCase();
    if (!id || !["GOEDGEKEURD", "AFGEWEZEN", "VERWERKT_IN_FIGHTPASSPORT"].includes(status)) return NextResponse.json({ error: "Ongeldige statuswijziging." }, { status: 400 });
    const patch: any = { status, beoordeeld_door: userId, beoordeeld_op: new Date().toISOString(), beoordeling_opmerking: clean(b.beoordeling_opmerking) || null };
    if (status === "VERWERKT_IN_FIGHTPASSPORT") patch.verwerkt_op = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from("matchmaker_buitenlandse_uitslagen").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ uitslag: data });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "Bijwerken mislukt." }, { status: 500 });
  }
}
