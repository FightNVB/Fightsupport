import { supabaseAdmin } from "@/lib/supabaseAdmin";

type AnyRow = Record<string, any>;

type RecordStats = {
  w: number;
  l: number;
  draw: number;
  other: number;
  demo: number;
  previousClassOfficial: number;
  currentOfficial: number;
  official: number;
  inclusive: number;
  highestClass: string;
  hasRows: boolean;
};

export function s(v: unknown) { return String(v ?? "").trim(); }
function first(...values: unknown[]) { for (const v of values) if (s(v)) return v; return null; }
function obj(v: unknown): AnyRow { if (!v) return {}; if (typeof v === "object" && !Array.isArray(v)) return v as AnyRow; try { const p = JSON.parse(String(v)); return p && typeof p === "object" ? p : {}; } catch { return {}; } }
function digits(v: unknown) { return s(v).replace(/\D/g, ""); }
function regId(v: unknown) { return s(v); }
function num(v: unknown): number | null { const x = Number(String(v ?? "").replace(",", ".").replace(/[^0-9.-]/g, "")); return Number.isFinite(x) ? x : null; }
function lower(v: unknown) { return s(v).toLowerCase(); }

function boolish(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  const x = s(v).toLowerCase();
  if (!x) return null;
  if (["true","1","ja","yes","geldig","ok","actief"].includes(x)) return true;
  if (["false","0","nee","no","ongeldig","verlopen","geen"].includes(x)) return false;
  if (x.includes("geen geldig") || x.includes("verlopen") || x.includes("ongeldig")) return false;
  if (x.includes("geldig")) return true;
  return null;
}

function activeStartverbod(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const x = s(v).toLowerCase();
  if (!x) return false;
  if (["false","0","nee","geen","geen startverbod","niet actief"].includes(x)) return false;
  if (x.includes("geen startverbod") || x.includes("geen actief startverbod") || x.includes("niet van toepassing") || x.includes("startverbod: nee")) return false;
  return x === "true" || x === "1" || x === "ja" || x.includes("actief") || x.includes("startverbod");
}

function normalizeGym(v: unknown) { return s(v).replace(/\s+/g, " ").toLowerCase(); }
function displayGym(v: unknown) { return s(v).replace(/\s+/g, " ") || "Onbekende sportschool"; }

function parseDate(v: unknown): Date | null {
  const raw = s(v);
  if (!raw) return null;
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  const dmy = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ageOnDate(birth: unknown, event: unknown) {
  const b = parseDate(birth), e = parseDate(event);
  if (!b || !e) return null;
  let years = e.getFullYear() - b.getFullYear();
  const beforeBirthday = e.getMonth() < b.getMonth() || (e.getMonth() === b.getMonth() && e.getDate() < b.getDate());
  if (beforeBirthday) years--;
  return years >= 0 ? years : null;
}

function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function ymdDiff(aRaw: unknown, bRaw: unknown) {
  const d1 = parseDate(aRaw), d2 = parseDate(bRaw);
  if (!d1 || !d2) return null;
  const start = d1 <= d2 ? new Date(d1) : new Date(d2);
  const end = d1 <= d2 ? new Date(d2) : new Date(d1);
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months--;
    const prevMonth = (end.getMonth() + 11) % 12;
    const prevYear = prevMonth === 11 ? end.getFullYear() - 1 : end.getFullYear();
    days += daysInMonth(prevYear, prevMonth);
  }
  if (months < 0) { years--; months += 12; }
  return { years, months, days, totalMonths: years * 12 + months };
}

function normalizeClassToken(v: unknown) {
  const x = lower(v).replace(/\b(?:klasse|class|clas)\b/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  const compact = x.replace(/[^a-z0-9+]/g, "");
  if (!compact || compact === "-") return "";
  const repeatedClass = compact.match(/^([jrncba])\1$/i);
  if (repeatedClass) return repeatedClass[1].toLowerCase();
  if (compact === "j+" || compact.includes("j+") || compact.includes("talentstatus")) return "j+";
  if (compact === "j" || compact.startsWith("jeugd") || compact.includes("youth") || compact.includes("junior")) return "j";
  if (compact === "r" || compact.startsWith("rclas") || compact.startsWith("rclass") || compact.includes("recreant")) return "r";
  if (compact === "n" || compact.startsWith("nclas") || compact.startsWith("nclass") || compact.includes("nieuweling") || compact.includes("newcomer")) return "n";
  if (compact === "c" || compact.startsWith("cclas") || compact.startsWith("cclass")) return "c";
  if (compact === "b" || compact.startsWith("bclas") || compact.startsWith("bclass")) return "b";
  if (compact === "a" || compact.startsWith("aclas") || compact.startsWith("aclass") || compact.includes("elite")) return "a";
  if (compact.includes("amateur") || compact === "ama" || compact.includes("mmaama")) return "amateur";
  if (compact.includes("pro")) return "pro";
  return compact;
}

function classRank(token: string) {
  const order: Record<string, number> = { j: 1, "j+": 1, r: 2, n: 3, c: 4, b: 5, a: 6, amateur: 3, pro: 6 };
  return order[token] ?? 0;
}

function getResultKind(v: unknown): "win" | "loss" | "draw" | "other" {
  const x = lower(v).replace(/\s+/g, " ").trim();
  if (!x) return "other";
  if (x.includes("demo") || x.includes("no contest") || x.includes("nocontest") || x === "nc") return "other";
  if (x.includes("onbeslist") || x.includes("gelijk") || x.includes("draw")) return "draw";
  if (x.includes("verliest") || x.includes("verlies") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("wint") || x.includes("winst") || x.includes("gewonnen") || x === "win" || x === "w") return "win";
  return "other";
}

function resultClass(row: AnyRow) {
  const candidates = [row?.klasse,row?.class,row?.wedstrijdklasse,row?.wedstrijd_klasse,row?.fight_class,row?.fightClass,row?.bout_class,row?.boutClass,row?.niveau,row?.category];
  for (const candidate of candidates) {
    const token = normalizeClassToken(candidate);
    if (["j","j+","r","n","c","b","a","amateur","pro"].includes(token)) return token;
  }
  return "";
}

function highestRecordClassFromRows(rows: AnyRow[]) {
  let highest = "", highestRank = 0;
  for (const row of rows) {
    const kind = getResultKind(first(row?.uitslag,row?.resultaat,row?.outcome));
    if (kind === "other") continue;
    const token = resultClass(row), rank = classRank(token);
    if (rank > highestRank) { highest = token; highestRank = rank; }
  }
  return highest;
}

function recordFromUitslagen(rows: AnyRow[]): RecordStats {
  const highestClass = highestRecordClassFromRows(rows);
  let w = 0, l = 0, draw = 0, other = 0, previousClassOfficial = 0, demoNoContest = 0;
  for (const row of rows) {
    const kind = getResultKind(first(row?.uitslag,row?.resultaat,row?.outcome));
    const rowClass = resultClass(row);
    if (kind === "other") { other++; demoNoContest++; continue; }
    if (highestClass && rowClass && rowClass !== highestClass) { other++; previousClassOfficial++; continue; }
    if (kind === "win") w++;
    else if (kind === "loss") l++;
    else if (kind === "draw") draw++;
  }
  const currentOfficial = w + l + draw;
  const official = currentOfficial + previousClassOfficial;
  return { w,l,draw,other,demo:demoNoContest,previousClassOfficial,currentOfficial,official,inclusive:official+demoNoContest,highestClass,hasRows:rows.length>0 };
}

function recordFallback(c: AnyRow | undefined, d: { fr: AnyRow; aan: AnyRow }, snap: AnyRow) {
  const direct = s(first(c?.record,c?.record_string,c?.nulmeting_record,d.fr.record,d.aan.record,snap.record,snap.record_string));
  const score = direct.replace(/[‐‑‒–—−]/g, "-").match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)(?:\s*\((\d+)\))?/);
  if (score) return `${score[1]}-${score[2]}-${score[3]}${score[4] !== undefined ? ` (${score[4]})` : ""}`;
  const w = num(first(c?.record_w,c?.gewonnen,c?.wins,d.fr.record_w,d.fr.gewonnen,d.fr.wins,d.aan.win,d.aan.wins,snap.win,snap.wins));
  const l = num(first(c?.record_l,c?.verloren,c?.losses,d.fr.record_l,d.fr.verloren,d.fr.losses,d.aan.loss,d.aan.losses,snap.loss,snap.losses));
  const dr = num(first(c?.record_d,c?.gelijk,c?.draws,d.fr.record_d,d.fr.gelijk,d.fr.draws,d.aan.draw,d.aan.draws,snap.draw,snap.draws));
  const total = num(first(c?.totaal_wedstrijden,c?.nulmeting_totaal,d.fr.totaal_wedstrijden,d.fr.nulmeting_totaal,snap.totaal_wedstrijden));
  if (w !== null || l !== null || dr !== null) {
    const other = Math.max(0, (total ?? ((w ?? 0)+(l ?? 0)+(dr ?? 0))) - (w ?? 0) - (l ?? 0) - (dr ?? 0));
    return `${w ?? 0}-${l ?? 0}-${dr ?? 0} (${other})`;
  }
  return direct || null;
}

function recordForFighter(
  va: string | null,
  c: AnyRow | undefined,
  d: { fr: AnyRow; aan: AnyRow },
  snap: AnyRow,
  allResults: AnyRow[],
  fp?: AnyRow,
) {
  const rows = va ? allResults.filter((r) => digits(r?.va_nummer) === va) : [];

  const nulW = num(first(
    fp?.nulmeting_gewonnen,
    c?.nulmeting_gewonnen,
    d.fr.nulmeting_gewonnen,
  )) ?? 0;
  const nulL = num(first(
    fp?.nulmeting_verloren,
    c?.nulmeting_verloren,
    d.fr.nulmeting_verloren,
  )) ?? 0;
  const nulD = num(first(
    fp?.nulmeting_onbeslist,
    c?.nulmeting_onbeslist,
    d.fr.nulmeting_onbeslist,
  )) ?? 0;
  const nulTotal = num(first(
    fp?.nulmeting_totaal,
    c?.nulmeting_totaal,
    d.fr.nulmeting_totaal,
  )) ?? 0;

  // Totaal nulmeting wordt NIET nogmaals bij W/L/D opgeteld.
  // Alleen het niet uitgesplitste restant hoort bij overige.
  const nulOther = Math.max(0, nulTotal - nulW - nulL - nulD);

  if (rows.length) {
    const stats = recordFromUitslagen(rows);
    return `${stats.w + nulW}-${stats.l + nulL}-${stats.draw + nulD} (${stats.other + nulOther})`;
  }

  // Ook zonder nieuwe uitslagen moet de trainer altijd een bruikbaar record zien.
  if (nulTotal > 0 || nulW > 0 || nulL > 0 || nulD > 0) {
    return `${nulW}-${nulL}-${nulD} (${nulOther})`;
  }

  return recordFallback(c,d,snap) || "0-0-0 (0)";
}

function contextGym(c?: AnyRow) {
  const extra=obj(c?.extra), raw=obj(extra.raw), aan=obj(raw.aanmelding), fr=obj(raw.fighters_raw);
  return s(first(c?.sportschool,c?.gym_input,c?.fp_gym,c?.gym,fr.gym,fr.sportschool,aan.gym,aan.sportschool));
}
function contextName(c?: AnyRow, snap?: AnyRow, row?: AnyRow, corner?: "rood"|"blauw") {
  const extra=obj(c?.extra), raw=obj(extra.raw), aan=obj(raw.aanmelding), fr=obj(raw.fighters_raw);
  return s(first(c?.naam,c?.fp_naam,c?.naam_input,fr.naam,aan.naam, corner ? row?.[`${corner}_naam`] : null,snap?.naam,snap?.naam_input)) || "Onbekend";
}
function contextVa(c?: AnyRow, snap?: AnyRow, row?: AnyRow, corner?: "rood"|"blauw") {
  const extra=obj(c?.extra), raw=obj(extra.raw), aan=obj(raw.aanmelding), fr=obj(raw.fighters_raw);
  return digits(first(c?.va_nummer,c?.va,c?.fp_va_nummer,fr.va_nummer,aan.va_nummer, corner ? row?.[`va_${corner}`] : null, corner ? row?.[`${corner}_va`] : null,snap?.va_nummer,snap?.va));
}
function deepValues(c?: AnyRow) { const extra=obj(c?.extra), raw=obj(extra.raw), aan=obj(raw.aanmelding), fr=obj(raw.fighters_raw); return {extra,raw,aan,fr}; }
function parseTalentstatusStatus(opmerking: unknown) {
  const text=s(opmerking).replace(/\u00a0/g," ");
  const talentRx=/\btalent\s*status\b|\btalentstatus\b/i;
  if(!talentRx.test(text)) return {actief:false,datum:null,maxPartijen:null};

  const toIso=(value:string)=>{
    let m=value.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
    if(m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
    m=value.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
    return m?`${m[3]}-${String(m[2]).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`:null;
  };
  const maxFrom=(value:string)=>{
    const m=value.match(/\b(?:voor|max(?:imaal)?|geldig\s+voor)\s*(\d{1,2})\s*(?:wedstrijden|partijen)\b/i)
      || value.match(/\b(\d{1,2})\s*(?:wedstrijden|partijen)\b/i);
    return m?Number(m[1]):null;
  };

  const segments=text.split(/\r?\n|(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
  for(const segment of segments){
    if(!talentRx.test(segment)) continue;
    const datum=toIso(segment);
    if(datum) return {actief:true,datum,maxPartijen:maxFrom(segment)??3};
  }

  const hit=talentRx.exec(text);
  if(hit){
    const window=text.slice(Math.max(0,hit.index-80),Math.min(text.length,hit.index+hit[0].length+120));
    const datum=toIso(window);
    if(datum) return {actief:true,datum,maxPartijen:maxFrom(window)??3};
  }
  return {actief:false,datum:null,maxPartijen:null};
}

function fighterView(c: AnyRow|undefined, snap: AnyRow, row: AnyRow, corner: "rood"|"blauw", eventDate: unknown, allResults: AnyRow[], fp?: AnyRow) {
  const d=deepValues(c);
  const licenseRaw=first(c?.licentie,c?.licentie_ok,c?.licentie_status,c?.fp_licentie,d.fr.licentie,d.aan.licentie);
  const startRaw=first(c?.heeft_startverbod,c?.startverbod,c?.startverbod_status,d.fr.heeft_startverbod,d.fr.startverbod,d.aan.heeft_startverbod);
  const keurmerkRaw=first(c?.heeft_keurmerk,c?.keurmerk_ok,c?.keurmerk_status,c?.keurmerk,d.fr.heeft_keurmerk,d.fr.keurmerk_ok,d.fr.keurmerk_status,d.aan.heeft_keurmerk,d.aan.keurmerk_status);
  const keurmerkReason=s(first(c?.keurmerk_reden,c?.keurmerk_reason,d.fr.keurmerk_reden,d.fr.keurmerk_reason,d.aan.keurmerk_reden));
  const geboorte=first(c?.geboortedatum,c?.fp_geboortedatum,c?.geboortedatum_input,d.fr.geboortedatum,d.aan.geboortedatum);
  const va = contextVa(c,snap,row,corner) || null;
  return {
    naam: contextName(c,snap,row,corner),
    sportschool: contextGym(c) || displayGym(first(row?.[`${corner}_gym`],snap.sportschool,snap.gym)),
    vaNummer: va,
    geboortedatum: s(geboorte) || null,
    leeftijd: ageOnDate(geboorte, first(c?.evenement_datum,eventDate)),
    gewicht: num(first(c?.gewicht,c?.gewicht_input,c?.fp_gewicht,d.aan.gewicht,snap.gewicht)),
    klasse: s(first(c?.klasse,c?.fp_klasse,c?.nulmeting_klasse,d.fr.nulmeting_klasse,d.aan.klasse,row.klasse,snap.klasse)) || null,
    record: recordForFighter(va,c,d,snap,allResults,fp),
    totaal_wedstrijden: num(first(fp?.totaal_wedstrijden,c?.totaal_wedstrijden,d.fr.totaal_wedstrijden)),
    totaalWedstrijden: num(first(fp?.totaal_wedstrijden,c?.totaal_wedstrijden,d.fr.totaal_wedstrijden)),
    nulmeting_totaal: num(first(fp?.nulmeting_totaal,c?.nulmeting_totaal,d.fr.nulmeting_totaal)),
    nulmeting_gewonnen: num(first(fp?.nulmeting_gewonnen,c?.nulmeting_gewonnen,d.fr.nulmeting_gewonnen)),
    nulmeting_verloren: num(first(fp?.nulmeting_verloren,c?.nulmeting_verloren,d.fr.nulmeting_verloren)),
    nulmeting_onbeslist: num(first(fp?.nulmeting_onbeslist,c?.nulmeting_onbeslist,d.fr.nulmeting_onbeslist)),
    kos: num(first(fp?.kos,c?.kos,d.fr.kos)),
    licentie: { ok: boolish(licenseRaw), tekst: s(licenseRaw) || null },
    startverbod: { actief: activeStartverbod(startRaw), tekst: s(startRaw) || null },
    keurmerk: { ok: boolish(keurmerkRaw), reden: keurmerkReason || null },
    talentstatus: parseTalentstatusStatus(first(fp?.nulmeting_opmerking,c?.nulmeting_opmerking,d.fr.nulmeting_opmerking)),
  };
}

function contextForCorner(row: AnyRow, contextByVa: Map<string,AnyRow>, contextByReg: Map<string,AnyRow>, corner:"rood"|"blauw") {
  const raw=obj(row.raw_json), snap=obj(raw[corner]);
  const rid=regId(first(row[`${corner}_aanmelding_id`],row[`${corner}_inschrijving_id`],snap.aanmelding_id,snap.inschrijving_id,snap.id));
  if (rid && contextByReg.has(rid)) return contextByReg.get(rid);
  const va=digits(first(row[`va_${corner}`],row[`${corner}_va`],row[`${corner}_va_nummer`],snap.va_nummer,snap.va));
  return va ? contextByVa.get(va) : undefined;
}

function isYouthValue(v: unknown) {
  const x = lower(v);
  return x.includes("jeugd") || x.includes("youth") || x.includes("junior") || /^j[\s+-]*/i.test(s(v));
}
function isMmaMatch(red: AnyRow, blue: AnyRow, discipline: unknown) {
  const d = `${s(discipline)} ${s(red?.discipline)} ${s(blue?.discipline)}`.toLowerCase();
  return d.includes("mma") || d.includes("mixed martial");
}
function roundUpHalf(v: number) { return Math.ceil(v * 2) / 2; }
function suggestedMaxWeight(red: AnyRow, blue: AnyRow, youth: boolean, discipline: unknown) {
  const rw = num(red?.gewicht), bw = num(blue?.gewicht);
  if (rw == null || bw == null) return null;
  const heavier = Math.max(rw,bw), diff = Math.abs(rw-bw);
  const limit = youth ? 2 : isMmaMatch(red,blue,discipline) ? 4 : 3;
  if (diff >= limit) return roundUpHalf(heavier);
  if (diff === 0) return roundUpHalf(heavier + 1);
  return roundUpHalf(heavier + 0.5);
}

function hitResult(h: AnyRow) { return s(first(h.resultaat,h.severity,h.status)).toUpperCase(); }

function cornerToken(v: unknown): "rood"|"blauw"|null {
  const x=s(v).toLowerCase();
  if (["rood","red"].includes(x)) return "rood";
  if (["blauw","blue"].includes(x)) return "blauw";
  return null;
}
function fighterTotalParties(f: AnyRow) {
  return num(first(f?.totaal_wedstrijden,f?.totaalWedstrijden,f?.totaalPartijen)) ?? null;
}
function consentCornerForDispensation(hit: AnyRow, red: AnyRow, blue: AnyRow): "rood"|"blauw"|null {
  const text=`${s(hit?.rule_code)} ${s(hit?.rule)} ${s(hit?.boodschap)}`.toLowerCase();

  // Bij partijen-/ervaringsverschil moet uitsluitend de trainer van de
  // vechter met de minste partijen nadrukkelijk toestemming geven.
  if (
    text.includes("partij") ||
    text.includes("partijen") ||
    text.includes("wedstrijd") ||
    text.includes("ervaring") ||
    text.includes("record")
  ) {
    const rt=fighterTotalParties(red), bt=fighterTotalParties(blue);
    if (rt!=null && bt!=null && rt!==bt) return rt<bt?"rood":"blauw";
  }

  // Als de ControlEngine zelf een hoek aanwijst, is die hoek leidend.
  return cornerToken(hit?.hoek);
}
function isDispensation(h: AnyRow) { const r=hitResult(h); const txt=`${s(h.rule_code)} ${s(h.rule)} ${s(h.boodschap)}`.toLowerCase(); return r.includes("DISP") || txt.includes("dispensatie"); }
function isStartverbodHit(h: AnyRow) { const txt=`${s(h.rule_code)} ${s(h.rule)} ${s(h.boodschap)}`.toLowerCase(); if (txt.includes("geen startverbod") || txt.includes("geen actief startverbod")) return false; return txt.includes("startverbod") || txt.includes("start verbod"); }
function isDopingInfoHit(h: AnyRow) {
  const r=hitResult(h);
  const txt=`${s(h.rule_code)} ${s(h.rule)} ${s(h.boodschap)}`.toLowerCase();
  return r==="INFO" && (txt.includes("dopingcertificaat") || txt.includes("doping certificaat"));
}
function isRelevantHit(h: AnyRow) {
  const r=hitResult(h);
  if(!s(h.boodschap) || r==="OK") return false;
  if(r==="INFO") return isDopingInfoHit(h); // geen andere INFO naar trainercontrole
  return true;
}

export async function buildTrainerReviewData(matchmakingId: string) {
  const [mmRes,boutsRes,contextsRes,runRes] = await Promise.all([
    supabaseAdmin.from("matchmakings").select("*").eq("id",matchmakingId).single(),
    supabaseAdmin.from("matchmaking_bouts_raw").select("*").eq("matchmaking_id",matchmakingId).order("partij_nr",{ascending:true}),
    supabaseAdmin.from("matchmaker_fighter_context").select("*").eq("matchmaking_id",matchmakingId),
    supabaseAdmin.from("controle_runs").select("id,created_at").eq("matchmaking_id",matchmakingId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  if(mmRes.error) throw mmRes.error; if(boutsRes.error) throw boutsRes.error; if(contextsRes.error) throw contextsRes.error;
  const runId=s(runRes.data?.id);
  let hits:AnyRow[]=[];
  if(runId){ const hr=await supabaseAdmin.from("controle_resultaten").select("*").eq("matchmaking_id",matchmakingId).eq("controle_run_id",runId); if(hr.error) throw hr.error; hits=(hr.data??[]) as AnyRow[]; }

  const byVa=new Map<string,AnyRow>(), byReg=new Map<string,AnyRow>();
  for(const c of contextsRes.data??[]){ const va=digits(c.va_nummer); const rid=regId(first(c.inschrijving_id,c.aanmelding_id)); if(va&&!byVa.has(va))byVa.set(va,c); if(rid&&!byReg.has(rid))byReg.set(rid,c); }
  const allVaNumbers = new Set<string>(byVa.keys());
  for (const row of boutsRes.data ?? []) {
    const raw = obj((row as AnyRow).raw_json);
    for (const va of [
      (row as AnyRow).va_rood,
      (row as AnyRow).rood_va,
      raw?.rood?.va_nummer,
      raw?.rood?.va,
      (row as AnyRow).va_blauw,
      (row as AnyRow).blauw_va,
      raw?.blauw?.va_nummer,
      raw?.blauw?.va,
    ]) {
      const normalized = digits(va);
      if (normalized) allVaNumbers.add(normalized);
    }
  }

  const vaNumbers=[...allVaNumbers];
  let fightPassportResults: AnyRow[] = [];
  const fightPassportFightersByVa = new Map<string, AnyRow>();

  for (let start = 0; start < vaNumbers.length; start += 50) {
    const batch = vaNumbers.slice(start, start + 50);
    const [resultRes, fighterRes] = await Promise.all([
      supabaseAdmin
        .from("fightpassport_results")
        .select("id,va_nummer,datum,evenement,tegenstander,sportschool,discipline,klasse,gewicht,uitslag,last_seen_at")
        .in("va_nummer",batch)
        .order("datum",{ascending:false}),
      supabaseAdmin
        .from("fightpassport_fighters")
        .select("va_nummer,totaal_wedstrijden,gewonnen,kos,nulmeting_totaal,nulmeting_gewonnen,nulmeting_verloren,nulmeting_onbeslist,nulmeting_kos,nulmeting_klasse,nulmeting_opmerking,berekende_klasse")
        .in("va_nummer",batch),
    ]);

    if (resultRes.error) throw resultRes.error;
    if (fighterRes.error) throw fighterRes.error;

    fightPassportResults.push(...((resultRes.data ?? []) as AnyRow[]));
    for (const fighter of (fighterRes.data ?? []) as AnyRow[]) {
      const va = digits(fighter?.va_nummer);
      if (va) fightPassportFightersByVa.set(va, fighter);
    }
  }

  const eventDate=first(mmRes.data?.event_datum,mmRes.data?.datum,mmRes.data?.evenement_datum);
  const hitByBout=new Map<string,AnyRow[]>(), hitByPartij=new Map<string,AnyRow[]>();
  for(const h of hits){ if(s(h.bout_id)){ const a=hitByBout.get(s(h.bout_id))??[]; a.push(h); hitByBout.set(s(h.bout_id),a); } if(h.partij_nr!=null){ const k=String(h.partij_nr); const a=hitByPartij.get(k)??[]; a.push(h); hitByPartij.set(k,a); } }

  const bouts=(boutsRes.data??[]).filter((r:AnyRow)=>!r.verwijderd && (r.partij_nr!=null || s(obj(r.raw_json).partij_nr))).map((row:AnyRow)=>{
    const raw=obj(row.raw_json), rs=obj(raw.rood), bs=obj(raw.blauw);
    const rc=contextForCorner(row,byVa,byReg,"rood"), bc=contextForCorner(row,byVa,byReg,"blauw");
    const discipline=s(first(rc?.discipline,bc?.discipline,row.discipline,raw.discipline))||null;
    const redVa = contextVa(rc,rs,row,"rood");
    const blueVa = contextVa(bc,bs,row,"blauw");
    const redFp = redVa ? fightPassportFightersByVa.get(redVa) : undefined;
    const blueFp = blueVa ? fightPassportFightersByVa.get(blueVa) : undefined;
    const red=fighterView(rc,rs,row,"rood",eventDate,fightPassportResults,redFp), blue=fighterView(bc,bs,row,"blauw",eventDate,fightPassportResults,blueFp);
    const youth = isYouthValue(first(row.klasse,raw.klasse,red.klasse,blue.klasse)) || ((red.leeftijd??99)<18 && (blue.leeftijd??99)<18);
    const boutHits=(hitByBout.get(s(row.id))??hitByPartij.get(String(first(row.partij_nr,raw.partij_nr)))??[]).filter(isRelevantHit);
    const dispensaties=boutHits.filter(isDispensation).map(h=>{
      const consentCorner=consentCornerForDispensation(h,red,blue);
      return {
        code:s(h.rule_code)||s(h.rule),
        reden:s(h.boodschap),
        hoek:s(h.hoek)||null,
        consentCorner,
      };
    });
    const dispensatieConsentCorners=[...new Set(dispensaties.map((d:any)=>d.consentCorner).filter(Boolean))];
    const startverbod=red.startverbod.actief||blue.startverbod.actief||boutHits.some(isStartverbodHit);
    const storedMax = num(first(row.max_gewicht,row.max_gewicht_notatie,row.maxGewicht,raw.max_gewicht,raw.max_gewicht_notatie));
    return {
      id:s(row.id), partijNr:Number(first(row.partij_nr,raw.partij_nr))||null,
      discipline,
      klasse:s(first(rc?.klasse,bc?.klasse,row.klasse,raw.klasse))||null,
      maxGewicht: storedMax ?? suggestedMaxWeight(red,blue,youth,discipline),
      jeugd: youth,
      leeftijdVerschil: ymdDiff(red.geboortedatum,blue.geboortedatum),
      gewichtsVerschil: (()=>{ const a=num(red.gewicht),b=num(blue.gewicht); return a!==null&&b!==null?Math.abs(a-b):null; })(),
      red,blue, dispensaties, dispensatieConsentCorners, startverbod,
      bijzonderheden:boutHits.map(h=>({resultaat:hitResult(h),code:s(h.rule_code)||s(h.rule),boodschap:s(h.boodschap),hoek:s(h.hoek)||null})),
    };
  });

  const gyms=new Map<string,{key:string;naam:string;bouts:any[];keurmerkOk:boolean|null;keurmerkReden:string|null}>();
  for(const bout of bouts){
    for(const f of [bout.red,bout.blue]){ const key=normalizeGym(f.sportschool); if(!key)continue; if(!gyms.has(key)) gyms.set(key,{key,naam:displayGym(f.sportschool),bouts:[],keurmerkOk:f.keurmerk.ok,keurmerkReden:f.keurmerk.reden}); const g=gyms.get(key)!; if(!g.bouts.some(b=>b.id===bout.id))g.bouts.push(bout); if(g.keurmerkOk===null && f.keurmerk.ok!==null)g.keurmerkOk=f.keurmerk.ok; if(!g.keurmerkReden&&f.keurmerk.reden)g.keurmerkReden=f.keurmerk.reden; }
  }
  return { event:{id:matchmakingId,title:s(first(mmRes.data?.event_naam,mmRes.data?.naam,mmRes.data?.titel))||"Matchmaking",date:s(eventDate)||null,location:s(first(mmRes.data?.event_locatie,mmRes.data?.locatie))||null}, gyms:[...gyms.values()].sort((a,b)=>a.naam.localeCompare(b.naam,"nl")), bouts };
}

export function gymKey(name: unknown){ return normalizeGym(name); }
