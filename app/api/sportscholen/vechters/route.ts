import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

function cleanId(v: unknown) { const s = String(v ?? "").trim(); return s.length ? s : null; }
function cleanVa(v: unknown) { const s = String(v ?? "").replace(/\D/g, ""); return s || null; }
function jsonError(message: string, status = 500) { return NextResponse.json({ ok: false, error: message }, { status }); }
async function jsonFromResponse(e: Response) { try { const text = await e.text(); if (!text) return {}; try { return JSON.parse(text); } catch { return { error: text }; } } catch { return {}; } }

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin.from("user_profiles").select("id, role, email, full_name, meekijk_sportschool_id, active_sportschool_id").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as any;
}

async function getSportschool(sportschoolId: string) {
  const { data, error } = await supabaseAdmin.from("sportscholen").select("sportschool_id, naam, plaats, land, keurmerk_start, keurmerk_einde").eq("sportschool_id", sportschoolId).maybeSingle();
  if (error) throw error;
  return data as any;
}

async function resolveAccess(req: Request) {
  const { userId } = await requireAnyRole(req, ["trainer", "admin", "superadmin"] as any);
  const profile = await getProfile(userId);
  const sportschoolId = cleanId(profile?.meekijk_sportschool_id ?? profile?.active_sportschool_id);
  return { userId, profile, sportschoolId };
}

async function searchExistingFighters(query: string, sportschoolId: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  const digits = cleanVa(q);
  let builder = supabaseAdmin.from("fightpassport_fighters").select("va_nummer,naam,geboortedatum,geslacht,primary_discipline,nulmeting_klasse,totaal_wedstrijden").limit(20);
  builder = digits && digits.length >= 3 ? builder.or(`va_nummer.eq.${digits},naam.ilike.%${q.replace(/[%_,()]/g, " ")}%`) : builder.ilike("naam", `%${q.replace(/[%_,()]/g, " ")}%`);
  const { data, error } = await builder.order("naam", { ascending: true });
  if (error) throw error;
  const vaList = (data ?? []).map((x: any) => cleanVa(x.va_nummer)).filter(Boolean) as string[];
  if (!vaList.length) return [];
  const nr = Number(sportschoolId);
  const schoolValue: string | number = Number.isFinite(nr) ? nr : sportschoolId;
  const { data: existing, error: linkError } = await supabaseAdmin.from("fightpassport_school_fighters").select("va_nummer").eq("sportschool_id", schoolValue).eq("actief", true).in("va_nummer", vaList);
  if (linkError) throw linkError;
  const linked = new Set((existing ?? []).map((x: any) => cleanVa(x.va_nummer)).filter(Boolean));
  return (data ?? []).map((x: any) => ({ ...x, va_nummer: cleanVa(x.va_nummer), al_gekoppeld: linked.has(cleanVa(x.va_nummer)) }));
}

async function getFighters(sportschoolId: string) {
  const nr = Number(sportschoolId);
  const schoolValue: string | number = Number.isFinite(nr) ? nr : sportschoolId;
  const { data: links, error: linkError } = await supabaseAdmin.from("fightpassport_school_fighters").select("id,sportschool_id,va_nummer,naam,geslacht,actief,updated_at").eq("sportschool_id", schoolValue).eq("actief", true).order("naam", { ascending: true });
  if (linkError) throw linkError;
  const vaNummers = Array.from(new Set((links ?? []).map((row: any) => cleanVa(row.va_nummer)).filter(Boolean))) as string[];
  if (!vaNummers.length) return [];
  const { data: fighterRows, error: fighterError } = await supabaseAdmin.from("fightpassport_fighters").select(["va_nummer","naam","geboortedatum","geslacht","fit_to_fight","licentie_actief","heeft_startverbod","totaal_wedstrijden","gewonnen","kos","nulmeting_gewicht","nulmeting_discipline","nulmeting_klasse","nulmeting_totaal","primary_discipline","updated_at"].join(",")).in("va_nummer", vaNummers);
  if (fighterError) throw fighterError;
  const { data: resultRows, error: resultsError } = await supabaseAdmin.from("fightpassport_results").select("va_nummer,uitslag").in("va_nummer", vaNummers);
  if (resultsError) throw resultsError;
  const recordByVa = new Map<string,{ gewonnen:number; verloren:number; onbeslist:number }>();
  for (const row of resultRows ?? []) {
    const va = cleanVa((row as any).va_nummer); if (!va) continue;
    const record = recordByVa.get(va) ?? { gewonnen:0, verloren:0, onbeslist:0 };
    const uitslag = String((row as any).uitslag ?? "").trim().toLowerCase();
    if (/win|winst|gewonnen|wint/.test(uitslag)) record.gewonnen += 1;
    else if (/loss|verlies|verloren|verliest/.test(uitslag)) record.verloren += 1;
    else if (/draw|onbeslist|gelijk/.test(uitslag)) record.onbeslist += 1;
    recordByVa.set(va, record);
  }
  const byVa = new Map((fighterRows ?? []).map((fighter:any) => [cleanVa(fighter.va_nummer), fighter]));
  return (links ?? []).map((link:any) => {
    const va = cleanVa(link.va_nummer) ?? ""; const fighter:any = byVa.get(va) ?? {};
    return { id:link.id, sportschool_id:link.sportschool_id, va_nummer:va, naam:fighter.naam ?? link.naam ?? null, fp_naam:fighter.naam ?? null, geboortedatum:fighter.geboortedatum ?? null, fp_geboortedatum:fighter.geboortedatum ?? null, geslacht:fighter.geslacht ?? link.geslacht ?? null, discipline:fighter.primary_discipline ?? fighter.nulmeting_discipline ?? null, klasse:fighter.nulmeting_klasse ?? null, gewicht:fighter.nulmeting_gewicht ?? null, licentie_actief:fighter.licentie_actief ?? false, heeft_licentie:fighter.licentie_actief ?? false, licentie:fighter.licentie_actief ? "actief":"niet actief", licentie_status:fighter.licentie_actief ? "actief":"niet actief", fit_to_fight:fighter.fit_to_fight ?? null, heeft_startverbod:fighter.heeft_startverbod ?? false, startverbod:fighter.heeft_startverbod ?? false, totaal_wedstrijden:fighter.totaal_wedstrijden ?? 0, gewonnen:recordByVa.get(va)?.gewonnen ?? fighter.gewonnen ?? 0, verloren:recordByVa.get(va)?.verloren ?? 0, onbeslist:recordByVa.get(va)?.onbeslist ?? 0, kos:fighter.kos ?? 0, nulmeting_klasse:fighter.nulmeting_klasse ?? null, nulmeting_totaal:fighter.nulmeting_totaal ?? 0, nulmeting_gewicht:fighter.nulmeting_gewicht ?? null, nulmeting_discipline:fighter.nulmeting_discipline ?? null, updated_at:fighter.updated_at ?? link.updated_at ?? null };
  }).sort((a:any,b:any) => String(a.naam ?? "").localeCompare(String(b.naam ?? ""), "nl"));
}

export async function GET(req: Request) {
  try {
    const { sportschoolId } = await resolveAccess(req);
    if (!sportschoolId) return NextResponse.json({ ok:true, sportschool:null, fighters:[], message:"Geen sportschool gekoppeld." });
    const url = new URL(req.url); const q = String(url.searchParams.get("q") ?? "").trim();
    if (q) return NextResponse.json({ ok:true, candidates: await searchExistingFighters(q, sportschoolId) });
    const [sportschool, fighters] = await Promise.all([getSportschool(sportschoolId), getFighters(sportschoolId)]);
    return NextResponse.json({ ok:true, sportschool_id:sportschoolId, sportschool, fighters });
  } catch (e:any) {
    if (e instanceof Response) { const body = await jsonFromResponse(e); return jsonError(body?.error || body?.message || (e.status === 401 ? "Niet ingelogd of sessie verlopen":"Geen toegang"), e.status || 401); }
    console.error("[api/sportscholen/vechters] GET error", e); return jsonError(e?.message || "Vechters laden mislukt", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { userId, sportschoolId } = await resolveAccess(req);
    if (!sportschoolId) return jsonError("Geen sportschool gekoppeld.", 400);
    const body = await req.json().catch(() => ({})); const va = cleanVa(body?.va_nummer ?? body?.vaNummer);
    if (!va) return jsonError("VA-nummer ontbreekt.", 400);
    const { data:fighter, error:fighterError } = await supabaseAdmin.from("fightpassport_fighters").select("va_nummer,naam,geslacht,geboortedatum").eq("va_nummer", va).maybeSingle();
    if (fighterError) throw fighterError; if (!fighter) return jsonError("Vechter niet gevonden in FightPassport database.", 404);
    const school = await getSportschool(sportschoolId); if (!school) return jsonError("Sportschool niet gevonden.", 404);
    const nr = Number(sportschoolId); const schoolValue:string|number = Number.isFinite(nr) ? nr : sportschoolId;
    const { data:existing, error:existingError } = await supabaseAdmin.from("fightpassport_school_fighters").select("id,actief").eq("sportschool_id", schoolValue).eq("va_nummer", va).maybeSingle();
    if (existingError) throw existingError;
    if (existing?.id) {
      const { error } = await supabaseAdmin.from("fightpassport_school_fighters").update({ actief:true, naam:fighter.naam ?? null, geslacht:fighter.geslacht ?? null, updated_at:new Date().toISOString() }).eq("id", existing.id); if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("fightpassport_school_fighters").insert({ sportschool_id:schoolValue, va_nummer:va, naam:fighter.naam ?? null, geslacht:fighter.geslacht ?? null, actief:true, updated_at:new Date().toISOString() }); if (error) throw error;
    }
    const melding = `Sportschool ${school.naam ?? sportschoolId} heeft ${fighter.naam ?? va} (VA ${va}) toegevoegd aan de fightcrew. Zet de sportschoolkoppeling ook om in FightPassport.`;
    const { error:meldingError } = await supabaseAdmin.from("sportschool_vechter_meldingen").insert({ status:"open", fighter_id:va, sportschool_id:String(sportschoolId), sportschool_naam:school.naam ?? null, va_nummer:va, naam:fighter.naam ?? null, type:"sportschool_klopt_niet", melding, created_by:userId, raw:{ actie:"vechter_toegevoegd_uit_database", bron:"sportschool_dashboard", oude_koppeling_onbekend:true, sportschool_id:sportschoolId, va_nummer:va } });
    if (meldingError) throw meldingError;
    return NextResponse.json({ ok:true, message:"Vechter toegevoegd. Admin heeft een melding gekregen om de koppeling in FightPassport over te nemen." });
  } catch (e:any) {
    if (e instanceof Response) { const body = await jsonFromResponse(e); return jsonError(body?.error || body?.message || "Geen toegang", e.status || 401); }
    console.error("[api/sportscholen/vechters] POST error", e); return jsonError(e?.message || "Vechter toevoegen mislukt", 500);
  }
}
