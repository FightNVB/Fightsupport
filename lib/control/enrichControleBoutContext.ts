// lib/control/enrichControleBoutContext.ts
// ✅ Verrijkt controle_bout_context met KEURMERK
// ❌ Doet GEEN inserts / GEEN upserts

import dayjs from "dayjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function norm(s: any) {
  let x = String(s ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\(.*?\)/g, " ")
    .replace(/['’`]/g, " ")
    .replace(/[^a-z0-9à-ÿ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const stop = new Set([
    "kvs",
    "kv",
    "k",
    "team",
    "gym",
    "sport",
    "sports",
    "sportschool",
    "academy",
    "club",
    "center",
    "centre",
    "training",
    "trainings",
    "fight",
    "fighting",
    "fighters",
    "kickboxing",
    "kickbox",
    "kb",
    "muaythai",
    "muay",
    "thai",
    "boxing",
    "box",
    "mma",
    "martial",
    "arts",
    "the",
    "de",
    "het",
    "van",
    "der",
    "den",
    "en",
    "a",
    "an",
    "of",
  ]);

  let toks = x
    .split(" ")
    .filter(Boolean)
    .filter((t) => !stop.has(t))
    .filter((t) => t !== "s");

  toks = toks.map((t) => {
    if (t.length >= 6 && t.endsWith("s")) return t.slice(0, -1);
    return t;
  });

  return toks.join(" ").trim();
}

function normStrictName(s: any) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/['’`]/g, "'")
    .replace(/[()]/g, " ")
    .replace(/[\/|,-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactStrictName(s: any) {
  return normStrictName(s).replace(/\s+/g, "");
}

function normPlaats(s: any) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9à-ÿ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactNorm(s: any) {
  return String(s ?? "").replace(/\s+/g, "").trim();
}

function normLand(v: any) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function isNL(v: any) {
  return normalizeCountryCodeOrName(String(v ?? "")) === "NL";
}

function isBE(v: any) {
  return normalizeCountryCodeOrName(String(v ?? "")) === "BE";
}

function isDE(v: any) {
  return normalizeCountryCodeOrName(String(v ?? "")) === "DE";
}

type EuLandHint =
  | "AT" | "BE" | "BG" | "HR" | "CY" | "CZ" | "DE" | "DK" | "EE"
  | "ES" | "FI" | "FR" | "GR" | "HU" | "IE" | "IT" | "LT" | "LU"
  | "LV" | "MT" | "NL" | "PL" | "PT" | "RO" | "SE" | "SI" | "SK";

type LandHint = EuLandHint | "UK" | "TR" | "FOREIGN";

const COUNTRY_ALIASES: Record<string, LandHint> = {
  at: "AT", oostenrijk: "AT", austria: "AT",
  be: "BE", belgie: "BE", "belgië": "BE", belgium: "BE",
  bg: "BG", bulgarije: "BG", bulgaria: "BG",
  hr: "HR", kroatie: "HR", "kroatië": "HR", croatia: "HR",
  cy: "CY", cyprus: "CY",
  cz: "CZ", tsjechie: "CZ", "tsjechië": "CZ", czechia: "CZ", "czech republic": "CZ",
  de: "DE", duitsland: "DE", deutschland: "DE", germany: "DE",
  dk: "DK", denemarken: "DK", denmark: "DK",
  ee: "EE", estland: "EE", estonia: "EE",
  es: "ES", spanje: "ES", spain: "ES", "españa": "ES", espana: "ES",
  fi: "FI", finland: "FI",
  fr: "FR", frankrijk: "FR", france: "FR",
  gr: "GR", el: "GR", griekenland: "GR", greece: "GR",
  hu: "HU", hongarije: "HU", hungary: "HU",
  ie: "IE", ierland: "IE", ireland: "IE",
  it: "IT", italie: "IT", "italië": "IT", italy: "IT",
  lt: "LT", litouwen: "LT", lithuania: "LT",
  lu: "LU", luxemburg: "LU", luxembourg: "LU",
  lv: "LV", letland: "LV", latvia: "LV",
  mt: "MT", malta: "MT",
  nl: "NL", nederland: "NL", netherlands: "NL", "the netherlands": "NL",
  pl: "PL", polen: "PL", poland: "PL",
  pt: "PT", portugal: "PT",
  ro: "RO", roemenie: "RO", "roemenië": "RO", romania: "RO",
  se: "SE", zweden: "SE", sweden: "SE",
  si: "SI", slovenie: "SI", "slovenië": "SI", slovenia: "SI",
  sk: "SK", slowakije: "SK", slovakia: "SK",
  uk: "UK", gb: "UK", eng: "UK", engeland: "UK", england: "UK",
  "groot brittannie": "UK", "groot-brittannie": "UK", "groot brittannië": "UK",
  "groot-brittannië": "UK", "verenigd koninkrijk": "UK", "united kingdom": "UK",
  tr: "TR", turkije: "TR", turkey: "TR", "türkiye": "TR", turkiye: "TR",
};

const COUNTRY_LABELS: Record<Exclude<LandHint, "FOREIGN">, string> = {
  AT: "Oostenrijk", BE: "België", BG: "Bulgarije", HR: "Kroatië", CY: "Cyprus",
  CZ: "Tsjechië", DE: "Duitsland", DK: "Denemarken", EE: "Estland", ES: "Spanje",
  FI: "Finland", FR: "Frankrijk", GR: "Griekenland", HU: "Hongarije", IE: "Ierland",
  IT: "Italië", LT: "Litouwen", LU: "Luxemburg", LV: "Letland", MT: "Malta",
  NL: "Nederland", PL: "Polen", PT: "Portugal", RO: "Roemenië", SE: "Zweden",
  SI: "Slovenië", SK: "Slowakije", UK: "United Kingdom", TR: "Turkije",
};

function normalizeCountryCodeOrName(raw: string): LandHint | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
  if (!s) return null;

  const known = COUNTRY_ALIASES[s];
  if (known) return known;

  // Onbekende tweeletttercode tussen haakjes = buitenland. NL is hierboven expliciet.
  if (/^[a-z]{2}$/.test(s)) return "FOREIGN";
  return null;
}

function detectLandHintFromGymText(rawGym: string): LandHint | null {
  const raw = String(rawGym ?? "").trim();
  if (!raw) return null;

  const s = raw.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  const lower = s.toLowerCase();

  // Hard leidend: landcode/landnaam tussen haakjes, bv. (DE), (UK), legacy (eng).
  for (const m of [...s.matchAll(/\(([^)]+)\)/g)]) {
    const hint = normalizeCountryCodeOrName(String(m[1] ?? "").trim());
    if (hint) return hint;
  }

  // Fallback voor bestaande data met losse code/landnaam zonder haakjes.
  for (const [alias, hint] of Object.entries(COUNTRY_ALIASES)) {
    if (alias.length === 2 || alias === "eng") {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|\\s)${escaped}($|\\s)`, "i").test(s)) return hint;
    } else if (lower.includes(alias)) {
      return hint;
    }
  }
  return null;
}

function landHintToLabel(hint: LandHint | null): string | null {
  if (!hint) return null;
  if (hint === "FOREIGN") return "Buitenland";
  return COUNTRY_LABELS[hint] ?? hint;
}

function isForeignHint(hint: LandHint | null) {
  return !!hint && hint !== "NL";
}

function defaultLandHintForMatching(hint: LandHint | null): LandHint {
  // Geen landcode/landnaam betekent: eerst behandelen als Nederlandse sportschool.
  // Alleen expliciete buitenlandse hint (bv. (BE), België, Duitsland) maakt hem buitenland.
  return hint ?? "NL";
}

function landLabelForMatch(landDb: any, hint: LandHint | null) {
  return landDb ?? landHintToLabel(defaultLandHintForMatching(hint));
}


function landMatchesHint(landValue: any, hint: LandHint | null) {
  if (!hint) return false;
  if (hint === "FOREIGN") return isForeignNonNL(landValue);

  const normalizedLand = normalizeCountryCodeOrName(String(landValue ?? ""));
  return normalizedLand === hint;
}

function buildForeignKeurmerkReason(opts: { gym: string; land: string | null; matchInfo?: string | null }) {
  const land = opts.land ?? "Buitenland";

  if (land === "België") {
    return "België: geen NVB-keurmerk vereist. Controleer BKBMO + boksboekje.";
  }

  return `${land}: geen NVB-keurmerk vereist. Controleer boksboekje.`;
}

function toIsoDateOnly(d: any): string | null {
  if (!d) return null;
  const x = dayjs(d);
  return x.isValid() ? x.format("YYYY-MM-DD") : null;
}

async function fetchAllSportscholen() {
  const all: any[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabaseAdmin.from("sportscholen").select("*").range(from, to);
    if (error) throw error;

    const chunk = data ?? [];
    all.push(...chunk);

    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function fetchAllSportschoolAliases() {
  const all: any[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabaseAdmin
      .from("sportschool_aliases")
      .select("alias_text, sportschool_id")
      .range(from, to);

    if (error) throw error;

    const chunk = data ?? [];
    all.push(...chunk);

    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return all;
}


type FightPassportResultGym = {
  va_nummer: string;
  sportschool: string;
  datum?: string | null;
  id?: any;
};

type SchoolFighterLink = {
  va_nummer: string;
  sportschool_id: any;
  actief: boolean | null;
  last_seen_at?: string | null;
};

async function fetchLatestResultGymsByVa(vaNummers: string[]) {
  const unique = Array.from(
    new Set((vaNummers ?? []).map((v) => String(v ?? "").trim()).filter(Boolean))
  );
  const map = new Map<string, FightPassportResultGym>();
  if (unique.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("fightpassport_results")
    .select("id,va_nummer,sportschool,datum")
    .in("va_nummer", unique)
    .order("datum", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;

  for (const row of data ?? []) {
    const va = String((row as any)?.va_nummer ?? "").trim();
    const gym = String((row as any)?.sportschool ?? "").trim();
    if (!va || !gym || map.has(va)) continue;
    map.set(va, {
      va_nummer: va,
      sportschool: gym,
      datum: (row as any)?.datum ?? null,
      id: (row as any)?.id ?? null,
    });
  }

  return map;
}

async function fetchSchoolFighterLinksByVa(vaNummers: string[]) {
  const unique = Array.from(
    new Set((vaNummers ?? []).map((v) => String(v ?? "").trim()).filter(Boolean))
  );
  const map = new Map<string, SchoolFighterLink[]>();
  if (unique.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("fightpassport_school_fighters")
    .select("va_nummer,sportschool_id,actief,last_seen_at")
    .in("va_nummer", unique)
    .order("last_seen_at", { ascending: false });

  if (error) throw error;

  for (const row of data ?? []) {
    const va = String((row as any)?.va_nummer ?? "").trim();
    if (!va || (row as any)?.sportschool_id == null) continue;
    const arr = map.get(va) ?? [];
    arr.push(row as SchoolFighterLink);
    map.set(va, arr);
  }

  return map;
}

function mmNameMatchesSchoolOrAlias(
  gymNaam: string,
  school: any,
  aliasMaps: AliasMaps
) {
  const mm = String(gymNaam ?? "").trim();
  if (!mm || !school) return false;

  const canonical = String(school?.naam ?? "").trim();
  if (namesClearlyCompatibleForLive(mm, canonical)) return true;

  const sid = String(school?.sportschool_id ?? "").trim();
  if (!sid) return false;

  const mmStrictCompact = compactStrictName(mm);
  const mmNorm = norm(mm);
  const mmCompact = compactNorm(mmNorm);

  return (aliasMaps.aliasRows ?? []).some((a) => {
    if (String(a?.sportschool_id ?? "").trim() !== sid) return false;
    const aliasRaw = String(a?.alias_text ?? "").trim();
    if (!aliasRaw) return false;

    if (compactStrictName(aliasRaw) === mmStrictCompact) return true;

    const aliasNorm = norm(aliasRaw);
    return !!aliasNorm && (
      aliasNorm === mmNorm ||
      compactNorm(aliasNorm) === mmCompact
    );
  });
}

function findGymMatchFromStoredFighterData(opts: {
  sportscholen: any[];
  gymNaam: string;
  vaNummer: string;
  latestResultGymByVa: Map<string, FightPassportResultGym>;
  schoolLinksByVa: Map<string, SchoolFighterLink[]>;
  aliasMaps: AliasMaps;
}): GymMatch {
  const {
    sportscholen,
    gymNaam,
    vaNummer,
    latestResultGymByVa,
    schoolLinksByVa,
    aliasMaps,
  } = opts;

  const va = String(vaNummer ?? "").trim();
  if (!va) return { row: null, reason: "Geen VA-nummer voor opgeslagen FightPassport-data." };

  // 1) Laatste resultaat is de sterkste opgeslagen historische bron.
  const latest = latestResultGymByVa.get(va);
  const resultGym = String(latest?.sportschool ?? "").trim();
  if (resultGym) {
    const resultMatch =
      findExactSportschoolByName(sportscholen, resultGym) ??
      findGymMatch(sportscholen, resultGym, aliasMaps).row;

    if (resultMatch && mmNameMatchesSchoolOrAlias(gymNaam, resultMatch, aliasMaps)) {
      return { row: resultMatch, reason: null };
    }
  }

  // 2) Daarna actieve/huidige koppeling uit fightpassport_school_fighters.
  const links = schoolLinksByVa.get(va) ?? [];
  const ordered = [
    ...links.filter((x) => x?.actief === true),
    ...links.filter((x) => x?.actief !== true),
  ];

  for (const link of ordered) {
    const school = findSportschoolBySportschoolId(sportscholen, link?.sportschool_id);
    if (school && mmNameMatchesSchoolOrAlias(gymNaam, school, aliasMaps)) {
      return { row: school, reason: null };
    }
  }

  return { row: null, reason: "Geen passende sportschool gevonden via opgeslagen FightPassport-data." };
}

function buildKeurmerkPatchForResolvedSchool(opts: {
  mmGym: string;
  found: any;
  evenement_datum?: string | null;
  valueKey: string;
  reasonKey: string;
}) {
  const { mmGym, found, evenement_datum, valueKey, reasonKey } = opts;
  const patch: any = {};
  const hint = detectLandHintFromGymText(mmGym);
  const landDb = found?.land ?? found?.country ?? null;
  const land = landLabelForMatch(landDb, hint);
  const eindeIso = toIsoDateOnly(
    found?.keurmerk_eind ??
    found?.keurmerk_einde ??
    found?.einde_keurmerk
  );

  if (landDb ? isForeignNonNL(landDb) : isForeignHint(hint)) {
    patch[valueKey] = true;
    patch[reasonKey] =
      `${buildForeignKeurmerkReason({ gym: mmGym, land: land ?? "Buitenland" })} · ${dbMatchInfo(mmGym, found)}`;
    return patch;
  }

  const geldig = !!eindeIso && eindeIso >= String(evenement_datum ?? "");
  patch[valueKey] = geldig;
  patch[reasonKey] = keurmerkDbReason({
    geldig,
    aanmelding: mmGym,
    found,
    eindeIso,
  });
  return patch;
}

function aliasAcronym(raw: any): string | null {
  const words = normStrictName(raw)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9à-ÿ]/gi, ""))
    .filter(Boolean);

  if (words.length < 2) return null;

  // Bewust ook korte verbindingswoorden meenemen:
  // "House of Champions" => HOC.
  const acronym = words.map((w) => w[0]).join("").toLowerCase();
  return acronym.length >= 2 ? acronym : null;
}

type AliasMaps = {
  aliasNormToId: Map<string, string>;
  aliasCompactToId: Map<string, string>;
  aliasRows: { alias_text: string; sportschool_id: string }[];
};

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

function tokenSet(s: string) {
  return new Set(String(s ?? "").split(" ").filter(Boolean));
}

function intersectionCount(a: string, b: string) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  let c = 0;
  for (const t of A) if (B.has(t)) c++;
  return c;
}

function overlapScore(a: string, b: string) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  const inter = intersectionCount(a, b);
  const denom = Math.max(1, Math.min(A.size, B.size));
  return inter / denom;
}

function isTokenSubset(a: string, b: string) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0) return false;
  for (const t of A) if (!B.has(t)) return false;
  return true;
}

type GymMatch = {
  row: any | null;
  reason: string | null;
  viaFpHint?: boolean;
};

function findSportschoolBySportschoolId(list: any[], sid: any) {
  const s = String(sid ?? "").trim();
  if (!s) return null;
  return list.find((x) => String(x?.sportschool_id) === s) ?? null;
}

function hasPlaatsHint(gRaw: string, plaatsValue: any) {
  const input = normPlaats(gRaw);
  const p = normPlaats(plaatsValue);
  return !!p && !!input && input.includes(p);
}

function extractKnownPlaces(sportscholen: any[]) {
  const set = new Set<string>();
  for (const s of sportscholen ?? []) {
    const p1 = normPlaats(s?.plaats ?? "");
    const p2 = normPlaats(s?.stad ?? "");
    if (p1) set.add(p1);
    if (p2) set.add(p2);
  }
  return Array.from(set).sort((a, b) => b.length - a.length);
}

function escapeRegex(s: string) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripCountryHintsFromRaw(raw: string) {
  let s = String(raw ?? "").trim();
  if (!s) return s;

  s = s.replace(/\(([A-Z]{2})\)/g, " ");
  s = s.replace(
    /\((Nederland|België|Belgie|Duitsland|Deutschland|Germany|Frankrijk|France|Spanje|Spain|Espana|España|United Kingdom|Verenigd Koninkrijk|Engeland|England|Turkije|Turkey|Türkiye|Turkiye)\)/gi,
    " "
  );
  s = s.replace(/\b(NL|BE|DE|FR|ES|UK|GB|TR)\b/g, " ");
  s = s.replace(
    /\b(Nederland|België|Belgie|Duitsland|Deutschland|Germany|Frankrijk|France|Spanje|Spain|Espana|España|United Kingdom|Verenigd Koninkrijk|Engeland|England|Turkije|Turkey|Türkiye|Turkiye)\b/gi,
    " "
  );
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

function stripKnownPlaceSuffixes(raw: string, knownPlaces: string[]) {
  let s = String(raw ?? "").trim();
  if (!s) return s;

  let changed = true;
  while (changed) {
    changed = false;

    for (const place of knownPlaces) {
      if (!place) continue;

      const patterns = [
        new RegExp(`\\b${escapeRegex(place)}\\b$`, "i"),
        new RegExp(`[\\-/,]\\s*${escapeRegex(place)}$`, "i"),
      ];

      for (const rx of patterns) {
        if (rx.test(s)) {
          s = s.replace(rx, " ").replace(/\s+/g, " ").trim();
          changed = true;
        }
      }
    }
  }

  return s.trim();
}

function buildAliasLookupVariants(rawGym: string, knownPlaces: string[]) {
  const raw = String(rawGym ?? "").trim();
  const out = new Set<string>();

  const addVariant = (v: string) => {
    const n = norm(v);
    if (n) out.add(n);
    const c = compactNorm(n);
    if (c) out.add(`__compact__:${c}`);
  };

  if (!raw) return out;

  const noCountry = stripCountryHintsFromRaw(raw);
  const noPlace = stripKnownPlaceSuffixes(noCountry, knownPlaces);

  addVariant(raw);
  addVariant(noCountry);
  addVariant(noPlace);

  const slashParts = noPlace
    .split(/[\/|,-]/g)
    .map((x) => x.trim())
    .filter(Boolean);

  for (const part of slashParts) addVariant(part);

  const words = noPlace.split(/\s+/).filter(Boolean);
  for (let i = words.length; i >= 2; i--) {
    addVariant(words.slice(0, i).join(" "));
  }

  return out;
}

function tryAliasMatch(
  sportscholen: any[],
  gymNaam: string,
  aliasMaps: AliasMaps | undefined,
  knownPlaces: string[],
  landHint: LandHint | null
): GymMatch | null {
  if (!aliasMaps) return null;

  const variants = buildAliasLookupVariants(gymNaam, knownPlaces);

  const acceptAliasHit = (hit: any) => {
    if (!hit) return null;
    const hitLand = hit?.land ?? hit?.country ?? null;

    // Landhint uit matchmaking is leidend.
    // Dus "No Mercy NL" mag nooit via een alias op een Duitse/Belgische/etc. school landen.
    if (landHint && !landMatchesHint(hitLand, landHint)) return null;

    return { row: hit, reason: null } as GymMatch;
  };

  for (const key of variants) {
    if (key.startsWith("__compact__:")) {
      const c = key.replace("__compact__:", "");
      const sid = aliasMaps.aliasCompactToId.get(c);
      if (sid) {
        const hit = findSportschoolBySportschoolId(sportscholen, sid);
        const accepted = acceptAliasHit(hit);
        if (accepted) return accepted;
      }
    } else {
      const sid = aliasMaps.aliasNormToId.get(key);
      if (sid) {
        const hit = findSportschoolBySportschoolId(sportscholen, sid);
        const accepted = acceptAliasHit(hit);
        if (accepted) return accepted;
      }
    }
  }

  return null;
}

function scoreCandidate(x: any, g: string, gRaw: string, key: string, landHint: LandHint | null) {
  const nameN = norm(x?.naam);
  if (!nameN) return -1;

  const ov = overlapScore(g, nameN);
  const d = levenshtein(compactNorm(g), compactNorm(nameN));
  const len = Math.max(1, Math.max(compactNorm(g).length, compactNorm(nameN).length));
  const distScore = 1 - Math.min(1, d / len);

  let score = ov * 0.72 + distScore * 0.28;

  const plaats = x?.plaats ?? x?.stad ?? "";
  if (hasPlaatsHint(gRaw, plaats)) score += 0.22;

  const land = x?.land ?? x?.country ?? null;
  if (landMatchesHint(land, landHint)) score += 0.18;

  if (key && nameN.includes(key)) score += 0.06;

  return score;
}

function chooseBestFromCandidates(
  candidates: any[],
  g: string,
  gRaw: string,
  key: string,
  landHint: LandHint | null
): GymMatch {
  if (candidates.length === 0) return { row: null, reason: "Geen match gevonden." };
  if (candidates.length === 1) return { row: candidates[0], reason: null };

  const withPlaats = candidates.filter((x) => hasPlaatsHint(gRaw, x?.plaats ?? x?.stad ?? ""));
  if (withPlaats.length === 1) return { row: withPlaats[0], reason: null };

  const withLand = candidates.filter((x) => landMatchesHint(x?.land ?? x?.country, landHint));
  if (withLand.length === 1) return { row: withLand[0], reason: null };

  if (withPlaats.length > 1) {
    const withPlaatsAndLand = withPlaats.filter((x) => landMatchesHint(x?.land ?? x?.country, landHint));
    if (withPlaatsAndLand.length === 1) return { row: withPlaatsAndLand[0], reason: null };
  }

  let best: any = null;
  let bestScore = -1;
  let secondScore = -1;

  for (const x of candidates) {
    const score = scoreCandidate(x, g, gRaw, key, landHint);
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = x;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (best && bestScore >= 0.72 && bestScore - secondScore >= 0.04) {
    return { row: best, reason: null };
  }

  return { row: null, reason: "Meerdere matches (ambigue) — maak alias aan." };
}

function findGymMatch(sportscholen: any[], gymNaam: string, aliasMaps?: AliasMaps): GymMatch {
  const gRaw = String(gymNaam ?? "").trim();
  if (!gRaw) return { row: null, reason: "Lege/ongeldige sportschoolnaam." };

  const list = sportscholen ?? [];
  const explicitLandHint = detectLandHintFromGymText(gRaw);
  const landHint = defaultLandHintForMatching(explicitLandHint);
  const knownPlaces = extractKnownPlaces(list);

  // 1) ECHTE letterlijke/raw-strict match eerst
  const rawStrict = normStrictName(gRaw);
  const rawCompactStrict = compactStrictName(gRaw);

  const rawExactHits = list.filter((x) => normStrictName(x?.naam) === rawStrict);
  if (rawExactHits.length > 0) {
    const gLoose = norm(gRaw);
    const key = gLoose.split(" ").filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? "";
    return chooseBestFromCandidates(rawExactHits, gLoose || rawStrict, gRaw, key, landHint);
  }

  const rawCompactHits = list.filter((x) => compactStrictName(x?.naam) === rawCompactStrict);
  if (rawCompactHits.length > 0) {
    const gLoose = norm(gRaw);
    const key = gLoose.split(" ").filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? "";
    return chooseBestFromCandidates(rawCompactHits, gLoose || rawStrict, gRaw, key, landHint);
  }

  // 2) Alias lookup op hele string en basisvarianten
  const aliasHit = tryAliasMatch(list, gRaw, aliasMaps, knownPlaces, landHint);
  if (aliasHit?.row) return aliasHit;

  // 3) Loose normalisatie pas daarna
  const g = norm(gRaw);
  if (!g) return { row: null, reason: "Lege/ongeldige sportschoolnaam." };

  const inputPlaatsHint = normPlaats(gRaw);
  const toks = g.split(" ").filter(Boolean).sort((a, b) => b.length - a.length);
  const key = toks[0] ?? "";

  // 4) Loose exact
  const exactHits = list.filter((x) => norm(x?.naam) === g);
  if (exactHits.length > 0) return chooseBestFromCandidates(exactHits, g, gRaw, key, landHint);

  const gCompact = compactNorm(g);
  const exactCompactHits = list.filter((x) => compactNorm(norm(x?.naam)) === gCompact);
  if (exactCompactHits.length > 0) return chooseBestFromCandidates(exactCompactHits, g, gRaw, key, landHint);

  // 5) Basisnaam zonder plaats/land suffixes
  const strippedRaw = stripKnownPlaceSuffixes(stripCountryHintsFromRaw(gRaw), knownPlaces);
  const strippedStrict = normStrictName(strippedRaw);
  const strippedCompactStrict = compactStrictName(strippedRaw);
  const strippedNorm = norm(strippedRaw);
  const strippedCompact = compactNorm(strippedNorm);

  if (strippedStrict && strippedStrict !== rawStrict) {
    const strictBaseHits = list.filter((x) => normStrictName(x?.naam) === strippedStrict);
    if (strictBaseHits.length > 0) {
      return chooseBestFromCandidates(strictBaseHits, strippedNorm || strippedStrict, gRaw, key, landHint);
    }

    const strictBaseCompactHits = list.filter((x) => compactStrictName(x?.naam) === strippedCompactStrict);
    if (strictBaseCompactHits.length > 0) {
      return chooseBestFromCandidates(strictBaseCompactHits, strippedNorm || strippedStrict, gRaw, key, landHint);
    }
  }

  if (strippedNorm && strippedNorm !== g) {
    const exactBaseHits = list.filter((x) => norm(x?.naam) === strippedNorm);
    if (exactBaseHits.length > 0) {
      return chooseBestFromCandidates(exactBaseHits, strippedNorm, gRaw, key, landHint);
    }

    const compactBaseHits = list.filter((x) => compactNorm(norm(x?.naam)) === strippedCompact);
    if (compactBaseHits.length > 0) {
      return chooseBestFromCandidates(compactBaseHits, strippedNorm, gRaw, key, landHint);
    }
  }

  // 6) Subset
  const subsetHits = list.filter((x) => {
    const n = norm(x?.naam);
    if (!n) return false;

    const ok =
      isTokenSubset(n, g) ||
      isTokenSubset(g, n) ||
      (strippedNorm ? isTokenSubset(n, strippedNorm) || isTokenSubset(strippedNorm, n) : false);

    if (!ok) return false;

    const gTokCount = tokenSet(g).size;
    const sTokCount = strippedNorm ? tokenSet(strippedNorm).size : 0;
    const tokCount = Math.max(gTokCount, sTokCount);

    if (tokCount >= 2) {
      const inter = Math.max(intersectionCount(g, n), strippedNorm ? intersectionCount(strippedNorm, n) : 0);
      if (inter < 2) return false;
    }

    if (tokenSet(g).size === 1 && !inputPlaatsHint) return false;
    return true;
  });

  if (subsetHits.length > 0) {
    const chosen = chooseBestFromCandidates(subsetHits, strippedNorm || g, gRaw, key, landHint);
    if (chosen.row) return chosen;
  }

  // 7) Fuzzy fallback
  let best: any = null;
  let bestScore = -1;
  let bestSecond: any = null;
  let bestSecondScore = -1;

  const scoreBase = strippedNorm || g;

  for (const x of list) {
    const score = scoreCandidate(x, scoreBase, gRaw, key, landHint);
    if (score < 0) continue;

    if (score > bestScore) {
      bestSecond = best;
      bestSecondScore = bestScore;
      best = x;
      bestScore = score;
    } else if (score > bestSecondScore) {
      bestSecond = x;
      bestSecondScore = score;
    }
  }

  if (best && bestScore >= 0.7) {
    if (bestSecond && bestSecondScore >= bestScore - 0.03) {
      return { row: null, reason: "Meerdere matches (ambigue) — maak alias aan." };
    }
    return { row: best, reason: null };
  }

  return { row: null, reason: "Geen match gevonden." };
}

function unwrapUuid(v: any): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s || s === "[object Object]") return null;
    return s;
  }
  if (typeof v === "object") {
    const cand =
      (typeof (v as any).id === "string" && (v as any).id) ||
      (typeof (v as any).bout_id === "string" && (v as any).bout_id) ||
      (typeof (v as any).bout_uid === "string" && (v as any).bout_uid) ||
      null;
    return cand ? String(cand).trim() : null;
  }
  return null;
}



function dbMatchInfo(mmGym: string, found: any | null): string {
  const mm = String(mmGym ?? "").trim() || "-";
  if (!found) return `MM: "${mm}" · DB-match: GEEN`;

  const naam = String(found?.naam ?? "-").trim() || "-";
  const land = String(found?.land ?? found?.country ?? "").trim();
  const plaats = String(found?.plaats ?? found?.stad ?? "").trim();
  const extra = [plaats, land].filter(Boolean).join(", ");

  return `MM: "${mm}" · DB-match: "${naam}"${extra ? ` (${extra})` : ""}`;
}



function keurmerkDbReason(opts: {
  geldig: boolean;
  aanmelding: string;
  found: any | null;
  eindeIso: string | null;
}) {
  const aanmelding = String(opts.aanmelding ?? "").trim() || "-";
  const naam = String(opts.found?.naam ?? "").trim() || "GEEN";
  const plaats = String(opts.found?.plaats ?? opts.found?.stad ?? "").trim();
  const db = `"${naam}"${plaats ? ` (${plaats})` : ""}`;

  if (opts.geldig) {
    return `Keurmerk: JA · Aanmelding: "${aanmelding}" · DB-match: ${db} · geldig t/m ${opts.eindeIso ?? "-"}`;
  }

  return `Keurmerk: NEE · Aanmelding: "${aanmelding}" · DB-match: ${db} · einddatum: ${opts.eindeIso ?? "-"}`;
}

function fpMatchInfo(mmGym: string, live: any | null): string {
  const mm = String(mmGym ?? "").trim() || "-";
  if (!live) return `MM: "${mm}" · FightPassport-match: GEEN`;

  const naam = String(live?.sportschool ?? "-").trim() || "-";
  const land = String(live?.land ?? "").trim();
  return `MM: "${mm}" · FightPassport-match: "${naam}"${land ? ` (${land})` : ""}`;
}

function namesClearlyCompatibleForLive(mmGym: string, fpGym: string): boolean {
  const mm = norm(mmGym);
  const fp = norm(fpGym);
  if (!mm || !fp) return false;

  if (mm === fp) return true;

  const mmCompact = compactNorm(mm);
  const fpCompact = compactNorm(fp);

  if (mmCompact === fpCompact) return true;

  // FightPassport kan woorden anders schrijven dan de matchmaking, bijvoorbeeld:
  // MM: "Team Nomercy" -> "nomercy"
  // FP: "No Mercy Gym Never Give Up" -> "nomercynevergiveup"
  // Als de betekenisvolle compacte naam duidelijk in de andere naam zit,
  // beschouwen we dit als dezelfde sportschool. Daarna wordt voor het keurmerk
  // juist de EXACTE FightPassport-naam in sportscholen opgezocht voor de einddatum.
  if (
    Math.min(mmCompact.length, fpCompact.length) >= 6 &&
    (mmCompact.includes(fpCompact) || fpCompact.includes(mmCompact))
  ) {
    return true;
  }

  // Voorbeeld: "No Mercy Gym" -> "no mercy" en
  // "No Mercy Gym Never Give Up" -> "no mercy never give up".
  if (isTokenSubset(mm, fp) || isTokenSubset(fp, mm)) return true;

  const inter = intersectionCount(mm, fp);
  return inter >= 2 && overlapScore(mm, fp) >= 0.66;
}

function liveSportschoolMatchesMatchmaking(
  mmGym: string,
  live: any | null,
  sportscholen?: any[],
  aliasMaps?: AliasMaps,
): boolean {
  const mm = String(mmGym ?? "").trim();
  const fp = String(live?.sportschool ?? "").trim();
  if (!mm || !fp) return false;

  let sameSchool = namesClearlyCompatibleForLive(mm, fp);

  // Als de zichtbare namen niet genoeg op elkaar lijken, gebruik dan de
  // sportschool-aliases als identiteit. Bijvoorbeeld:
  // MM "hoc" -> alias "House of Champions" -> sportschool_id 1898, terwijl
  // FightPassport "Sportcentre Westervoort / House of Champions" teruggeeft.
  if (!sameSchool && sportscholen && aliasMaps) {
    const mmResolved = findGymMatch(sportscholen, mm, aliasMaps).row;
    const fpResolved =
      findExactSportschoolByName(sportscholen, fp) ??
      findGymMatch(sportscholen, fp, aliasMaps).row;

    const mmId = String(mmResolved?.sportschool_id ?? "").trim();
    const fpId = String(fpResolved?.sportschool_id ?? "").trim();

    if (mmId && fpId && mmId === fpId) sameSchool = true;
  }

  if (!sameSchool) return false;

  // Alleen een EXPLICIETE landhint in de matchmaking is hard leidend.
  const explicitMmLand = detectLandHintFromGymText(mm);
  if (explicitMmLand) {
    const fpLand = live?.land ?? null;
    if (!landMatchesHint(fpLand, explicitMmLand)) return false;
  }

  return true;
}

function liveForeignLandLabel(mmGym: string, live: any): string | null {
  const explicitMmLand = detectLandHintFromGymText(mmGym);

  // Expliciete MM-landcode is leidend. (NL) blijft keurmerkplichtig.
  if (isForeignHint(explicitMmLand)) {
    return landHintToLabel(explicitMmLand) ?? "Buitenland";
  }
  if (explicitMmLand === "NL") return null;

  // Als de live FightPassport-sportschool duidelijk dezelfde sportschool is,
  // is ook het live FP-land voldoende om buitenland vast te stellen.
  // Voorbeeld: London Shootfighters -> United Kingdom.
  const fpLand = String(live?.land ?? "").trim();
  if (fpLand && isForeignNonNL(fpLand)) return fpLand;

  return null;
}

function liveKeurmerkValue(mmGym: string, live: any): boolean | null {
  // Buitenlandse sportschool: geen NVB-keurmerk vereist.
  if (liveForeignLandLabel(mmGym, live)) return true;

  // NL / geen aantoonbaar buitenland: gebruik het live FightPassport-schild.
  return typeof live?.keurmerk_schild_gevonden === "boolean"
    ? live.keurmerk_schild_gevonden
    : null;
}


function findExactSportschoolByName(sportscholen: any[], gymNaam: string) {
  const raw = String(gymNaam ?? "").trim();
  if (!raw) return null;
  const strict = normStrictName(raw);
  const compact = compactStrictName(raw);

  return (
    sportscholen.find((x) => normStrictName(x?.naam) === strict) ??
    sportscholen.find((x) => compactStrictName(x?.naam) === compact) ??
    null
  );
}

function buildLiveEventDateKeurmerkPatch(opts: {
  mmGym: string;
  live: any;
  evenement_datum?: string | null;
  sportscholen: any[];
  valueKey: string;
  reasonKey: string;
}) {
  const { mmGym, live, evenement_datum, sportscholen, valueKey, reasonKey } = opts;
  const patch: any = {};
  const fpGym = String(live?.sportschool ?? "").trim();
  const matchInfo = fpMatchInfo(mmGym, live);
  const foreignLand = liveForeignLandLabel(mmGym, live);

  if (foreignLand) {
    patch[valueKey] = true;
    patch[reasonKey] = `${buildForeignKeurmerkReason({ gym: mmGym, land: foreignLand })} · ${matchInfo}`;
    return patch;
  }

  const exactDbSchool = findExactSportschoolByName(sportscholen, fpGym);
  if (exactDbSchool) {
    const eindeIso = toIsoDateOnly(
      exactDbSchool?.keurmerk_eind ??
      exactDbSchool?.keurmerk_einde ??
      exactDbSchool?.einde_keurmerk
    );
    const eventIso = String(evenement_datum ?? "").trim();
    const geldigOpEventdatum = !!eindeIso && !!eventIso && eindeIso >= eventIso;

    patch[valueKey] = geldigOpEventdatum;
    patch[reasonKey] = keurmerkDbReason({
      geldig: geldigOpEventdatum,
      aanmelding: mmGym,
      found: exactDbSchool,
      eindeIso,
    });
    return patch;
  }

  // Alleen als de exacte live FightPassport-naam niet in de DB staat,
  // vallen we terug op de actuele schildstatus.
  const value = liveKeurmerkValue(mmGym, live);
  patch[valueKey] = value;
  patch[reasonKey] = value === true
    ? `Keurmerk live bevestigd via FightPassport-schild; exacte FP-sportschool niet in sportscholen-DB gevonden. · ${matchInfo}`
    : value === false
      ? `Geen FightPassport-keurmerkschild gevonden; exacte FP-sportschool niet in sportscholen-DB gevonden. · ${matchInfo}`
      : `FightPassport-sportschool matcht, maar keurmerkstatus is niet leesbaar en exacte FP-sportschool staat niet in de DB. · ${matchInfo}`;
  return patch;
}
function buildKeurmerkPatchForGym(opts: {
  gym: string;
  evenement_datum?: string | null;
  sportscholen: any[];
  aliasMaps: AliasMaps;
  valueKey: string;
  reasonKey: string;
}) {
  const { gym, evenement_datum, sportscholen, aliasMaps, valueKey, reasonKey } = opts;
  const gymValue = String(gym ?? "").trim();
  const patch: any = {};
  const mmLine = (value: string) =>
    value ? `↳ [MM sportschool:] "${value}"` : `↳ [MM sportschool:] -`;
  const hint = detectLandHintFromGymText(gymValue);

  const match = gymValue
    ? findGymMatch(sportscholen, gymValue, aliasMaps)
    : { row: null, reason: null };
  const found = match.row;

  if (!found) {
    if (isForeignHint(hint)) {
      const land = landHintToLabel(hint);
      patch[valueKey] = true;
      patch[reasonKey] = `${buildForeignKeurmerkReason({ gym: gymValue, land })} · ${dbMatchInfo(gymValue, null)}`;
      return patch;
    }

    patch[valueKey] = null;
    patch[reasonKey] = gymValue
      ? `Sportschool niet betrouwbaar herkend: "${gymValue}". · ${dbMatchInfo(gymValue, null)}`
      : `Geen sportschool opgegeven. · ${dbMatchInfo(gymValue, null)}`;
    return patch;
  }

  const landDb = found?.land ?? found?.country ?? null;
  const land = landLabelForMatch(landDb, hint);
  const eindeIso = toIsoDateOnly(found?.keurmerk_eind ?? found?.keurmerk_einde ?? found?.einde_keurmerk);
  const matchInfo = `Sportschool: ${found.naam}`;

  const isForeign = landDb ? isForeignNonNL(landDb) : hint !== null && hint !== "NL";

  if (isForeign) {
    patch[valueKey] = true;

    if (landDb ? isBE(landDb) : hint === "BE") {
      patch[reasonKey] =
        `${buildForeignKeurmerkReason({ gym: gymValue, land: land ?? "België", matchInfo })} · ${dbMatchInfo(gymValue, found)}`;
    } else if (landDb ? isDE(landDb) : hint === "DE") {
      patch[reasonKey] =
        `${buildForeignKeurmerkReason({ gym: gymValue, land: land ?? "Buitenland", matchInfo })} · ${dbMatchInfo(gymValue, found)}`;
    } else {
      patch[reasonKey] =
        `${buildForeignKeurmerkReason({ gym: gymValue, land: land ?? "Buitenland", matchInfo })} · ${dbMatchInfo(gymValue, found)}`;
    }

    return patch;
  }

  const geldig = !!eindeIso && eindeIso >= String(evenement_datum ?? "");
  patch[valueKey] = geldig;
  patch[reasonKey] = keurmerkDbReason({
    geldig,
    aanmelding: gymValue,
    found,
    eindeIso,
  });

  return patch;
}

function isForeignNonNL(landValue: any) {
  if (!landValue) return false;
  return !isNL(landValue);
}

export async function enrichControleBoutContext(
  matchmaking_id: string,
  controle_run_id: string,
  opts?: { partij_nr?: number | null; bout_id?: string | null }
) {
  if (!matchmaking_id) throw new Error("matchmaking_id ontbreekt");
  if (!controle_run_id) throw new Error("controle_run_id ontbreekt");

  const scopedPartijNr =
    opts?.partij_nr != null && Number.isFinite(Number(opts.partij_nr))
      ? Number(opts.partij_nr)
      : null;
  const scopedBoutId = unwrapUuid(opts?.bout_id);

  let ctxQ = supabaseAdmin
    .from("controle_bout_context")
    .select("partij_nr, bout_id, rood_va_mm, blauw_va_mm, rood_gym_mm, blauw_gym_mm, evenement_datum")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);

  if (scopedPartijNr != null) ctxQ = ctxQ.eq("partij_nr", scopedPartijNr);
  if (scopedBoutId) ctxQ = ctxQ.eq("bout_id", scopedBoutId);

  const { data: ctxRows, error: cErr } = await ctxQ;
  if (cErr) throw cErr;
  if (!ctxRows || ctxRows.length === 0) return;

  const sportscholen = await fetchAllSportscholen();

  const aliases = await fetchAllSportschoolAliases();
  const aliasNormToId = new Map<string, string>();
  const aliasCompactToId = new Map<string, string>();
  const aliasRows: { alias_text: string; sportschool_id: string }[] = [];

  for (const a of aliases ?? []) {
    const raw = String((a as any)?.alias_text ?? "").trim();
    const sid = (a as any)?.sportschool_id;
    if (!raw || sid == null) continue;

    const n = norm(raw);
    if (!n) continue;
    const c = compactNorm(n);

    if (!aliasNormToId.has(n)) aliasNormToId.set(n, String(sid));
    if (!aliasCompactToId.has(c)) aliasCompactToId.set(c, String(sid));

    // Ook initialen van een bekende alias accepteren.
    // Voorbeeld: alias "House of Champions" => "HOC".
    const acronym = aliasAcronym(raw);
    if (acronym) {
      if (!aliasNormToId.has(acronym)) aliasNormToId.set(acronym, String(sid));
      if (!aliasCompactToId.has(acronym)) aliasCompactToId.set(acronym, String(sid));
    }

    aliasRows.push({
      alias_text: raw,
      sportschool_id: String(sid),
    });
  }

  const aliasMaps: AliasMaps = { aliasNormToId, aliasCompactToId, aliasRows };

  // Gebruik de actuele FightPassport-sportschool zodra die duidelijk bij de MM-sportschool hoort.
  // Voor de keurmerkdatum wordt daarna de EXACTE FightPassport-sportschoolnaam in de DB opgezocht.
  // Alleen als MM en FP echt niet bij dezelfde sportschool horen, vallen we terug op de MM-naam.
  const { data: liveRows, error: liveErr } = await supabaseAdmin
    .from("controle_fighter_actueel")
    .select("va_nummer,sportschool,land,keurmerk_schild_gevonden,error_message,checked_at")
    .eq("matchmaking_id", matchmaking_id)
    .order("checked_at", { ascending: false });

  if (liveErr) throw liveErr;

  const liveByVa = new Map<string, any>();
  for (const live of liveRows ?? []) {
    const va = String((live as any)?.va_nummer ?? "").trim();
    if (!va || liveByVa.has(va) || (live as any)?.error_message) continue;
    liveByVa.set(va, live);
  }

  // Extra bron voor control: naast de actuele scraperuitkomst ook altijd
  // de centraal opgeslagen FightPassport-data gebruiken. Daardoor blijft
  // Opslaan/control correct werken als de scraper niet zojuist is gedraaid.
  const ctxVaNummers = (ctxRows ?? [])
    .flatMap((row: any) => [
      String(row?.rood_va_mm ?? "").trim(),
      String(row?.blauw_va_mm ?? "").trim(),
    ])
    .filter(Boolean);

  const latestResultGymByVa = await fetchLatestResultGymsByVa(ctxVaNummers);
  const schoolLinksByVa = await fetchSchoolFighterLinksByVa(ctxVaNummers);

  console.log("[enrichControleBoutContext] sportscholen loaded:", sportscholen.length);
  console.log("[enrichControleBoutContext] aliases loaded:", aliases.length);
  console.log("[enrichControleBoutContext] alias keys:", aliasNormToId.size);
  console.log("[enrichControleBoutContext] scope", {
    matchmaking_id,
    controle_run_id,
    partij_nr: scopedPartijNr,
    bout_id: scopedBoutId,
    rows: ctxRows.length,
  });

  for (const row of ctxRows) {
    const bout_id = unwrapUuid((row as any).bout_id);
    if (!bout_id) continue;

    const roodGym = String((row as any).rood_gym_mm ?? "").trim();
    const blauwGym = String((row as any).blauw_gym_mm ?? "").trim();

    const roodVa = String((row as any)?.rood_va_mm ?? "").trim();
    const blauwVa = String((row as any)?.blauw_va_mm ?? "").trim();
    const liveRood = roodVa ? liveByVa.get(roodVa) : null;
    const liveBlauw = blauwVa ? liveByVa.get(blauwVa) : null;

    const patch: any = {};

    const applySide = (
      side: "rood" | "blauw",
      mmGym: string,
      live: any | null,
    ) => {
      const valueKey = side === "rood" ? "keurmerk_rood" : "keurmerk_blauw";
      const reasonKey = side === "rood" ? "keurmerk_reden_rood" : "keurmerk_reden_blauw";

      // 1) MM en actuele FightPassport-sportschool horen duidelijk bij elkaar.
      // Gebruik dan de FightPassport-sportschool als identiteit en zoek DIE exacte naam
      // in sportscholen op om de keurmerk-einddatum tegen de eventdatum te controleren.
      if (liveSportschoolMatchesMatchmaking(mmGym, live, sportscholen, aliasMaps)) {
        Object.assign(
          patch,
          buildLiveEventDateKeurmerkPatch({
            mmGym,
            live,
            evenement_datum: String((row as any)?.evenement_datum ?? "").trim() || null,
            sportscholen,
            valueKey,
            reasonKey,
          }),
        );
        return;
      }

      // 2) Geen bruikbare actuele scraperuitkomst? Gebruik dan de centraal
      // opgeslagen FightPassport-data voor precies deze VA:
      // laatste fightpassport_results -> fightpassport_school_fighters.
      const vaNummer = side === "rood" ? roodVa : blauwVa;
      const storedMatch = findGymMatchFromStoredFighterData({
        sportscholen,
        gymNaam: mmGym,
        vaNummer,
        latestResultGymByVa,
        schoolLinksByVa,
        aliasMaps,
      });

      if (storedMatch.row) {
        Object.assign(
          patch,
          buildKeurmerkPatchForResolvedSchool({
            mmGym,
            found: storedMatch.row,
            evenement_datum: String((row as any)?.evenement_datum ?? "").trim() || null,
            valueKey,
            reasonKey,
          }),
        );
        return;
      }

      // 3) Pas als allerlaatste algemene MM-naam/alias/fuzzy fallback.
      const fallback = buildKeurmerkPatchForGym({
        gym: mmGym,
        evenement_datum: String((row as any)?.evenement_datum ?? "").trim() || null,
        sportscholen,
        aliasMaps,
        valueKey,
        reasonKey,
      });

      Object.assign(patch, fallback);

      // Zichtbare keurmerkmelding blijft compact: aanmelding + DB-match + geldigheid.
    };

    applySide("rood", roodGym, liveRood);
    applySide("blauw", blauwGym, liveBlauw);

    const { error: uErr } = await supabaseAdmin
      .from("controle_bout_context")
      .update(patch)
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .eq("bout_id", bout_id);

    if (uErr) throw uErr;
  }

  let tCtxQ = supabaseAdmin
    .from("controle_toernooi_context")
    .select("id, fighter_id, va_nummer, sportschool_mm, sportschool, evenement_datum")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);

  if (scopedPartijNr != null) tCtxQ = tCtxQ.eq("partij_nr", scopedPartijNr);

  const { data: tournamentRows, error: tErr } = await tCtxQ;
  if (tErr) throw tErr;

  for (const row of tournamentRows ?? []) {
    const rowId = unwrapUuid((row as any).id) ?? String((row as any).id ?? "").trim();
    if (!rowId) continue;

    const gym = String((row as any).sportschool_mm ?? (row as any).sportschool ?? "").trim();
    const va = String((row as any)?.va_nummer ?? (row as any)?.fighter_id ?? "").trim();
    const live = va ? liveByVa.get(va) : null;

    let patch: any;
    if (liveSportschoolMatchesMatchmaking(gym, live, sportscholen, aliasMaps)) {
      patch = buildLiveEventDateKeurmerkPatch({
        mmGym: gym,
        live,
        evenement_datum: String((row as any).evenement_datum ?? "").trim() || null,
        sportscholen,
        valueKey: "heeft_keurmerk",
        reasonKey: "keurmerk_reason",
      });
    } else {
      patch = buildKeurmerkPatchForGym({
        gym,
        evenement_datum: String((row as any).evenement_datum ?? "").trim() || null,
        sportscholen,
        aliasMaps,
        valueKey: "heeft_keurmerk",
        reasonKey: "keurmerk_reason",
      });
      // Geen technische FP/MM-fallbacktekst in de zichtbare keurmerkmelding.
    }

    const { error: tuErr } = await supabaseAdmin
      .from("controle_toernooi_context")
      .update(patch)
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .eq("id", rowId);

    if (tuErr) throw tuErr;
  }

}
