// Dezelfde galaduurberekening als het FightSupport-officialrapport.
type AnyRow = Record<string, any>;
const KLASSE_MINUTEN: Record<string, number> = {
  "a titel": 31,
  a: 21,
  b: 14,
  c: 13,
  n: 11.5,
  "16/17": 10.5,
  jeugd: 8.5,
  "jeugd 16+": 10.5,
  talentstatus: 10.5,
  jplus: 10.5,
  r: 8.5,
  recreant: 8.5,
  demo: 6,
  boksen: 10,
  "mma pro": 17,
  "mma amateur": 17,
  "mma jeugd": 17,
};

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function normalizeVa(v: any) {
  return String(v ?? "").replace(/\D/g, "").trim();
}

function norm(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function formatDate(v: any) {
  if (!v) return "-";
  const d = new Date(String(v).length === 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime()) ? safe(v) : d.toLocaleDateString("nl-NL");
}

function formatDuration(mins: number) {
  if (!Number.isFinite(mins)) return "-";
  const rounded = Math.round(mins * 10) / 10;
  const h = Math.floor(rounded / 60);
  const m = Math.round((rounded - h * 60) * 10) / 10;
  const mt = Number.isInteger(m) ? String(m) : String(m).replace(".", ",");
  if (!h) return `${mt} min`;
  return m ? `${h} uur ${mt} min` : `${h} uur`;
}

function ageOnEvent(row: AnyRow, side: "rood" | "blauw", eventDate: any): number | null {
  const dob = row?.[`${side}_geboortedatum_fp`] ?? row?.[`${side}_geboortedatum_mm`] ?? row?.[`${side}_geboortedatum`];
  if (!dob || !eventDate) return null;
  const b = new Date(String(dob).length === 10 ? `${dob}T12:00:00` : dob);
  const e = new Date(String(eventDate).length === 10 ? `${eventDate}T12:00:00` : eventDate);
  if (Number.isNaN(b.getTime()) || Number.isNaN(e.getTime())) return null;
  let years = e.getFullYear() - b.getFullYear();
  if (e.getMonth() < b.getMonth() || (e.getMonth() === b.getMonth() && e.getDate() < b.getDate())) years--;
  return years >= 0 ? years : null;
}

function normalizeClass(v: any) {
  return norm(v)
    .replace(/\+/g, " plus ")
    .replace(/[._/\\-]+/g, " ")
    .replace(/\bklasse\b|\bclass\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasToken(text: string, token: string) {
  return new RegExp(`(^|\\s)${token}(\\s|$)`, "i").test(text);
}

function classMinutes(row: AnyRow, eventDate: any): number | null {
  const rawClass = row?.klasse_mm ?? row?.klasse ?? "";
  const k = normalizeClass(rawClass);
  const d = normalizeClass(row?.discipline ?? row?.discipline_mm ?? "");
  const both16 = ["rood", "blauw"].every((side) => {
    const age = ageOnEvent(row, side as "rood" | "blauw", eventDate);
    return age != null && age >= 16;
  });

  if (k.includes("mma") || d.includes("mma")) {
    if (k.includes("pro") || d.includes("pro")) return KLASSE_MINUTEN["mma pro"];
    if (k.includes("jeugd") || k.includes("youth") || d.includes("jeugd")) return KLASSE_MINUTEN["mma jeugd"];
    return KLASSE_MINUTEN["mma amateur"];
  }
  if (["boksen", "boxing", "boxen"].includes(d) || k.includes("boksen")) return KLASSE_MINUTEN.boksen;
  if (`${k} ${d}`.includes("titel")) return KLASSE_MINUTEN["a titel"];
  if (k.includes("talent") || norm(rawClass).includes("j+")) return KLASSE_MINUTEN.talentstatus;
  if (/16\s*17/.test(k) || /16\s*\/\s*17/.test(norm(rawClass))) return KLASSE_MINUTEN["16/17"];
  if (hasToken(k, "j") || k.includes("jeugd") || k.includes("youth") || k.includes("junior")) return both16 ? KLASSE_MINUTEN["jeugd 16+"] : KLASSE_MINUTEN.jeugd;
  if (hasToken(k, "r") || k.includes("recreant")) return KLASSE_MINUTEN.r;
  if (hasToken(k, "n") || k.includes("nieuweling") || k.includes("novice")) return KLASSE_MINUTEN.n;
  if (hasToken(k, "c")) return KLASSE_MINUTEN.c;
  if (hasToken(k, "b")) return KLASSE_MINUTEN.b;
  if (hasToken(k, "a")) return KLASSE_MINUTEN.a;
  if (k.includes("demo")) return KLASSE_MINUTEN.demo;
  return null;
}

function parseRawJsonSafe(v: any): AnyRow | null {
  if (!v) return null;
  if (typeof v === "object") return v as AnyRow;
  try { return JSON.parse(String(v)); } catch { return null; }
}

function isToernooi(row: AnyRow) {
  const candidates = [row?.toernooi_code,row?.toernooi_id,row?.toernooi_nummer,row?.toernooi,row?.t_nummer,row?.t_code,row?.tournament_code];
  for (const c of candidates) {
    const x = String(c ?? "").trim().toUpperCase();
    if (x && /^T\d+$/.test(x)) return true;
  }
  const raw = parseRawJsonSafe(row?.raw_json);
  for (const c of [raw?.toernooi_code,raw?.toernooi_id,raw?.toernooi_nummer,raw?.toernooi,raw?.t_nummer,raw?.t_code,raw?.tournament_code]) {
    const x = String(c ?? "").trim().toUpperCase();
    if (x && /^T\d+$/.test(x)) return true;
  }
  const v = norm(row?.is_toernooi);
  return v === "true" || v === "1" || v === "ja";
}

function tournamentCode(row: AnyRow) {
  const direct = String(row?.toernooi_code ?? row?.toernooi_id ?? row?.toernooi_nummer ?? row?.toernooi ?? row?.t_nummer ?? row?.t_code ?? row?.tournament_code ?? "").trim().toUpperCase();
  if (direct) return direct;
  const raw = parseRawJsonSafe(row?.raw_json);
  return String(raw?.toernooi_code ?? "").trim().toUpperCase() || (isToernooi(row) ? "TOERNOOI" : "");
}

function tournamentFighterKey(row: AnyRow, side: "rood" | "blauw") {
  const va = normalizeVa(row?.[`${side}_va_mm`] ?? row?.[side === "rood" ? "va_rood" : "va_blauw"] ?? row?.[`${side}_va`] ?? row?.[`${side}_fighter_id`]);
  if (va) return `va:${va}`;
  const naam = norm(row?.[`${side}_naam_fp`] ?? row?.[`${side}_naam_mm`] ?? row?.[`${side}_naam`]);
  const gym = norm(row?.[`${side}_gym_mm`] ?? row?.[`${side}_gym_fp`] ?? row?.[`${side}_gym`] ?? row?.[`${side}_sportschool`]);
  return naam || gym ? `fallback:${naam}__${gym}` : null;
}

function calcGalaMinutes(rows: AnyRow[], eventDate: any) {
  let total = 0;
  const unknown = new Set<string>();
  const gewoneRows = rows.filter((r) => !isToernooi(r));
  for (const row of gewoneRows) {
    const m = classMinutes(row, eventDate);
    if (m == null) unknown.add(safe(row?.klasse_mm ?? row?.klasse, "Onbekende klasse"));
    else total += m;
  }

  const groups = new Map<string, AnyRow[]>();
  for (const row of rows.filter(isToernooi)) {
    const code = tournamentCode(row) || "TOERNOOI";
    const arr = groups.get(code) ?? [];
    arr.push(row); groups.set(code, arr);
  }

  for (const [code, groupRows] of groups) {
    const fighters = new Set<string>();
    const pairingMinutes: number[] = [];
    for (const row of groupRows) {
      for (const side of ["rood","blauw"] as const) {
        const key = tournamentFighterKey(row, side); if (key) fighters.add(key);
      }
      const m = classMinutes(row, eventDate);
      if (m == null) unknown.add(`Toernooi ${code} (${safe(row?.klasse_mm ?? row?.klasse, "klasse onbekend")})`);
      else { total += m; pairingMinutes.push(m); }
    }
    const expectedBouts = fighters.size >= 2 ? fighters.size - 1 : groupRows.length;
    const missingBouts = Math.max(0, expectedBouts - groupRows.length);
    if (missingBouts > 0) {
      const fallback = pairingMinutes.length ? Math.max(...pairingMinutes) : classMinutes(groupRows[0] ?? {}, eventDate);
      if (fallback == null) unknown.add(`Toernooi ${code} - nog te bepalen ronde`);
      else total += fallback * missingBouts;
    }
  }
  return { total, unknown: unknown.size, unknownLabels: [...unknown] };
}


export { calcGalaMinutes, formatDuration };
