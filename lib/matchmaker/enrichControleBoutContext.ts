// lib/matchmaker/enrichControleBoutContext.ts
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
  const s = normLand(v);
  return s === "nl" || s === "nederland" || s === "the netherlands" || s === "netherlands";
}

function isBE(v: any) {
  const s = normLand(v);
  return s === "be" || s === "belgie" || s === "belgië" || s === "belgium";
}

function isDE(v: any) {
  const s = normLand(v);
  return s === "de" || s === "duitsland" || s === "germany" || s === "deutschland";
}

function isFR(v: any) {
  const s = normLand(v);
  return s === "fr" || s === "frankrijk" || s === "france";
}

function isES(v: any) {
  const s = normLand(v);
  return s === "es" || s === "spanje" || s === "spain" || s === "españa" || s === "espana";
}

function isUK(v: any) {
  const s = normLand(v);
  return (
    s === "uk" ||
    s === "gb" ||
    s === "groot brittannie" ||
    s === "groot-brittannie" ||
    s === "groot brittannië" ||
    s === "groot-brittannië" ||
    s === "verenigd koninkrijk" ||
    s === "united kingdom" ||
    s === "engeland" ||
    s === "england"
  );
}

function isTR(v: any) {
  const s = normLand(v);
  return s === "tr" || s === "turkije" || s === "turkey" || s === "türkiye" || s === "turkiye";
}

type LandHint =
  | "NL" | "AT" | "BE" | "BG" | "HR" | "CY" | "CZ" | "DK" | "EE" | "FI"
  | "FR" | "DE" | "GR" | "HU" | "IE" | "IT" | "LV" | "LT" | "LU" | "MT"
  | "PL" | "PT" | "RO" | "SK" | "SI" | "ES" | "SE"
  | "UK" | "TR" | "FOREIGN";

function normalizeCountryCodeOrName(raw: string): LandHint | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
  if (!s) return null;

  const euCodes: Record<string, LandHint> = {
    nl: "NL", at: "AT", be: "BE", bg: "BG", hr: "HR", cy: "CY", cz: "CZ",
    dk: "DK", ee: "EE", fi: "FI", fr: "FR", de: "DE", gr: "GR", hu: "HU",
    ie: "IE", it: "IT", lv: "LV", lt: "LT", lu: "LU", mt: "MT", pl: "PL",
    pt: "PT", ro: "RO", sk: "SK", si: "SI", es: "ES", se: "SE",
  };
  if (euCodes[s]) return euCodes[s];

  if (["nederland", "netherlands", "the netherlands"].includes(s)) return "NL";
  if (["belgie", "belgië", "belgium"].includes(s)) return "BE";
  if (["duitsland", "deutschland", "germany"].includes(s)) return "DE";
  if (["frankrijk", "france"].includes(s)) return "FR";
  if (["spanje", "spain", "españa", "espana"].includes(s)) return "ES";
  if (["uk", "gb", "eng", "groot brittannie", "groot-brittannie", "groot brittannië", "groot-brittannië", "verenigd koninkrijk", "united kingdom", "engeland", "england"].includes(s)) return "UK";
  if (["tr", "turkije", "turkey", "türkiye", "turkiye"].includes(s)) return "TR";

  // Overige 2-lettercodes worden als buitenland behandeld.
  if (/^[a-z]{2}$/.test(s)) return "FOREIGN";

  return null;
}

function detectLandHintFromGymText(rawGym: string): LandHint | null {
  const raw = String(rawGym ?? "").trim();
  if (!raw) return null;

  const s = raw.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  const lower = s.toLowerCase();

  // Hoogste prioriteit: landcode/landnaam tussen haakjes, bv. Sportschool (BE).
  const parenMatches = [...s.matchAll(/\(([^)]+)\)/g)];
  for (const m of parenMatches) {
    const inside = String(m[1] ?? "").trim();
    const hint = normalizeCountryCodeOrName(inside);
    if (hint) return hint;
  }

  // Fallback: expliciete landnamen achter/in de sportschoolnaam.
  if (lower.includes("belgie") || lower.includes("belgië") || lower.includes("belgium")) return "BE";
  if (lower.includes("duitsland") || lower.includes("deutschland") || lower.includes("germany")) return "DE";
  if (lower.includes("nederland") || lower.includes("the netherlands") || lower.includes("netherlands")) return "NL";
  if (lower.includes("frankrijk") || lower.includes("france")) return "FR";
  if (lower.includes("spanje") || lower.includes("spain") || lower.includes("españa") || lower.includes("espana")) return "ES";
  if (lower.includes("united kingdom") || lower.includes("verenigd koninkrijk") || lower.includes("engeland") || lower.includes("england")) return "UK";
  if (lower.includes("turkije") || lower.includes("turkey") || lower.includes("türkiye") || lower.includes("turkiye")) return "TR";

  return null;
}

function landHintToLabel(hint: LandHint | null): string | null {
  const labels: Partial<Record<LandHint, string>> = {
    NL: "Nederland", AT: "Oostenrijk", BE: "België", BG: "Bulgarije", HR: "Kroatië",
    CY: "Cyprus", CZ: "Tsjechië", DK: "Denemarken", EE: "Estland", FI: "Finland",
    FR: "Frankrijk", DE: "Duitsland", GR: "Griekenland", HU: "Hongarije", IE: "Ierland",
    IT: "Italië", LV: "Letland", LT: "Litouwen", LU: "Luxemburg", MT: "Malta",
    PL: "Polen", PT: "Portugal", RO: "Roemenië", SK: "Slowakije", SI: "Slovenië",
    ES: "Spanje", SE: "Zweden", UK: "United Kingdom", TR: "Turkije", FOREIGN: "Buitenland",
  };
  return hint ? labels[hint] ?? null : null;
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
  if (hint === "NL") return isNL(landValue);
  if (hint === "BE") return isBE(landValue);
  if (hint === "DE") return isDE(landValue);
  if (hint === "FR") return isFR(landValue);
  if (hint === "ES") return isES(landValue);
  if (hint === "UK") return isUK(landValue);
  if (hint === "TR") return isTR(landValue);
  if (hint === "FOREIGN") return isForeignNonNL(landValue);

  // Overige EU-codes: accepteer de ISO alpha-2 code rechtstreeks uit de DB.
  // Bij een expliciete niet-NL EU-code blijft het in elk geval buitenland.
  const dbLand = normLand(landValue);
  return dbLand === hint.toLowerCase();
}

function buildForeignKeurmerkReason(opts: { gym: string; land: string | null; matchInfo?: string | null }) {
  const land = opts.land ?? "Buitenland";
  const basis = opts.matchInfo ?? (opts.gym ? `↳ [MM sportschool:] "${opts.gym}"` : `↳ [MM sportschool:] -`);

  if (land === "België") {
    return `⚠️ België — geen NVB keurmerk vereist. Controleer sportschool op BKBMO site + boksboekje. Land: ${land}.
${basis}`;
  }

  return `ℹ️ Buitenland — geen NVB keurmerk vereist. Controleer boksboekje handmatig. Land: ${land}.
${basis}`;
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

  s = s.replace(/\(([A-Z]{2}|ENG)\)/gi, " ");
  s = s.replace(
    /\((Nederland|België|Belgie|Duitsland|Deutschland|Germany|Frankrijk|France|Spanje|Spain|Espana|España|United Kingdom|Verenigd Koninkrijk|Engeland|England|Turkije|Turkey|Türkiye|Turkiye)\)/gi,
    " "
  );
  s = s.replace(/\b(NL|AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|PL|PT|RO|SK|SI|ES|SE|UK|GB|ENG|TR)\b/gi, " ");
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
  knownPlaces: string[]
): GymMatch | null {
  if (!aliasMaps) return null;

  // Eerst een exacte vergelijking waarbij alleen spaties/punctuatie verschillen.
  // Zo matcht "Fightteam TMS" ook met alias "Fight Team TMS" voordat een
  // algemene naam/fuzzy-match de losse sportschool "TMS" kan kiezen.
  const inputStrictCompact = compactStrictName(gymNaam);
  if (inputStrictCompact) {
    for (const a of aliasMaps.aliasRows ?? []) {
      const aliasRaw = String(a?.alias_text ?? "").trim();
      if (!aliasRaw || compactStrictName(aliasRaw) !== inputStrictCompact) continue;

      const hit = findSportschoolBySportschoolId(sportscholen, a?.sportschool_id);
      if (hit) return { row: hit, reason: null };
    }
  }

  const variants = buildAliasLookupVariants(gymNaam, knownPlaces);

  for (const key of variants) {
    if (key.startsWith("__compact__:")) {
      const c = key.replace("__compact__:", "");
      const sid = aliasMaps.aliasCompactToId.get(c);
      if (sid) {
        const hit = findSportschoolBySportschoolId(sportscholen, sid);
        if (hit) return { row: hit, reason: null };
      }
    } else {
      const sid = aliasMaps.aliasNormToId.get(key);
      if (sid) {
        const hit = findSportschoolBySportschoolId(sportscholen, sid);
        if (hit) return { row: hit, reason: null };
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


function looseGymNameCompatible(aRaw: string, bRaw: string) {
  const a = compactNorm(norm(aRaw));
  const b = compactNorm(norm(bRaw));
  if (!a || !b) return false;
  if (a === b) return true;
  const minLen = Math.min(a.length, b.length);
  return minLen >= 5 && (a.includes(b) || b.includes(a));
}

type FightPassportResultGym = {
  id?: number | null;
  va_nummer: string;
  datum?: string | null;
  sportschool: string | null;
  last_seen_at?: string | null;
};

async function fetchLatestResultGymsByVa(vaNummers: string[]) {
  const unique = Array.from(new Set((vaNummers ?? []).map((v) => String(v ?? "").trim()).filter(Boolean)));
  const map = new Map<string, FightPassportResultGym>();
  if (unique.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("fightpassport_results")
    .select("id,va_nummer,datum,sportschool,last_seen_at")
    .in("va_nummer", unique)
    .order("datum", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) throw error;

  for (const row of (data ?? []) as FightPassportResultGym[]) {
    const va = String(row?.va_nummer ?? "").trim();
    const gym = String(row?.sportschool ?? "").trim();
    if (!va || !gym || map.has(va)) continue;
    map.set(va, row);
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
  if (looseGymNameCompatible(mm, canonical)) return true;

  const sid = String(school?.sportschool_id ?? "").trim();
  if (!sid) return false;

  const mmNorm = norm(mm);
  const mmCompact = compactNorm(mmNorm);
  const mmStrictCompact = compactStrictName(mm);

  return (aliasMaps.aliasRows ?? []).some((a) => {
    if (String(a?.sportschool_id ?? "").trim() !== sid) return false;

    const aliasRaw = String(a?.alias_text ?? "").trim();
    const aliasNorm = norm(aliasRaw);
    if (!aliasRaw) return false;

    // Belangrijk voor aliases als "Fight Team TMS" versus MM "Fightteam TMS".
    // norm() verwijdert losse woorden "fight" en "team", maar niet het
    // aaneengeschreven woord "fightteam". De strict-compact vergelijking
    // maakt beide vormen gelijk zonder meteen fuzzy te gaan matchen.
    if (compactStrictName(aliasRaw) === mmStrictCompact) return true;

    return !!aliasNorm && (aliasNorm === mmNorm || compactNorm(aliasNorm) === mmCompact);
  });
}

function findGymMatchFromLatestResult(opts: {
  sportscholen: any[];
  gymNaam: string;
  vaNummer: string;
  latestResultGymByVa: Map<string, FightPassportResultGym>;
  aliasMaps: AliasMaps;
}): GymMatch {
  const { sportscholen, gymNaam, vaNummer, latestResultGymByVa, aliasMaps } = opts;
  const va = String(vaNummer ?? "").trim();
  if (!va) return { row: null, reason: "Geen VA-nummer voor laatste FightPassport-uitslag." };

  const latest = latestResultGymByVa.get(va);
  const resultGym = String(latest?.sportschool ?? "").trim();
  if (!resultGym) return { row: null, reason: "Geen sportschool in laatste FightPassport-uitslag." };

  // Resolve eerst de sportschool uit de laatste FightPassport-uitslag. Daarna controleren
  // we of de MM-naam de canonieke naam OF een alias van precies DIE sportschool is.
  // Dit voorkomt dat bijvoorbeeld "Fightteam TMS" naar een andere sportschool "TMS" valt,
  // terwijl de uitslag van deze vechter naar "Theo Meijer Sport Leusden" wijst en
  // "Fightteam TMS" daar als alias geregistreerd staat.
  const match = findGymMatch(sportscholen, resultGym, aliasMaps);
  if (!match.row) return match;

  if (!mmNameMatchesSchoolOrAlias(gymNaam, match.row, aliasMaps)) {
    return {
      row: null,
      reason: `Laatste FightPassport-uitslag noemt "${resultGym}", maar de MM-naam "${gymNaam}" is geen naam/alias van die sportschool.`,
    };
  }

  // Zonder expliciete buitenlandse landhint in de matchmaking mag een historische naam
  // niet alsnog een buitenlandse sportschool afdwingen.
  const mmHint = detectLandHintFromGymText(gymNaam);
  const landDb = match.row?.land ?? match.row?.country ?? null;
  if (!isForeignHint(mmHint) && isForeignNonNL(landDb)) {
    return { row: null, reason: "Laatste FightPassport-uitslag leidde alleen naar een buitenlandse sportschool zonder buitenlandse MM-landhint." };
  }

  return match;
}

type SchoolFighterLink = {
  va_nummer: string;
  sportschool_id: any;
  actief: boolean | null;
  last_seen_at?: string | null;
};

async function fetchSchoolFighterLinksByVa(vaNummers: string[]) {
  const unique = Array.from(new Set((vaNummers ?? []).map((v) => String(v ?? "").trim()).filter(Boolean)));
  const map = new Map<string, SchoolFighterLink[]>();
  if (unique.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("fightpassport_school_fighters")
    .select("va_nummer,sportschool_id,actief,last_seen_at")
    .in("va_nummer", unique)
    .order("last_seen_at", { ascending: false });

  if (error) throw error;

  for (const row of (data ?? []) as SchoolFighterLink[]) {
    const va = String(row?.va_nummer ?? "").trim();
    if (!va || row?.sportschool_id == null) continue;
    const arr = map.get(va) ?? [];
    arr.push(row);
    map.set(va, arr);
  }

  return map;
}

function findGymMatchFromVaLinksOnly(opts: {
  sportscholen: any[];
  gymNaam: string;
  vaNummer: string;
  schoolLinksByVa: Map<string, SchoolFighterLink[]>;
  aliasMaps: AliasMaps;
}): GymMatch {
  const { sportscholen, gymNaam, vaNummer, schoolLinksByVa, aliasMaps } = opts;
  const va = String(vaNummer ?? "").trim();
  if (!va) return { row: null, reason: "Geen VA-nummer voor sportschoolkoppeling." };

  const allLinks = schoolLinksByVa.get(va) ?? [];
  const activeLinks = allLinks.filter((x) => x?.actief !== false);
  const links = activeLinks.length > 0 ? activeLinks : allLinks;

  const seen = new Set<string>();
  const candidates: any[] = [];
  for (const link of links) {
    const sid = String(link?.sportschool_id ?? "").trim();
    if (!sid || seen.has(sid)) continue;
    seen.add(sid);
    const school = findSportschoolBySportschoolId(sportscholen, sid);
    if (school) candidates.push(school);
  }

  if (candidates.length === 0) {
    return { row: null, reason: "Geen gekoppelde sportschool voor deze VA." };
  }

  // Eerst de MM-naam alleen binnen de sportscholen gebruiken waar deze VA
  // volgens FightPassport daadwerkelijk aan gekoppeld staat.
  const compatible = candidates.filter((x) => mmNameMatchesSchoolOrAlias(gymNaam, x, aliasMaps));
  if (compatible.length === 1) return { row: compatible[0], reason: null };

  const restricted = findGymMatch(candidates, gymNaam, aliasMaps);
  if (restricted.row) return restricted;

  // Een enkele VA-koppeling is NIET genoeg: vechters kunnen van sportschool
  // wisselen. Alleen naamcompatibele koppelingen mogen worden gebruikt.
  return {
    row: null,
    reason:
      restricted.reason ??
      "De gekoppelde sportschool van deze VA komt niet overeen met de sportschool uit de matchmaking.",
  };
}

function teamConsensusKey(gymNaam: string) {
  return compactNorm(norm(gymNaam));
}

function findGymMatchForFighter(opts: {
  sportscholen: any[];
  gymNaam: string;
  vaNummer: string;
  schoolLinksByVa: Map<string, SchoolFighterLink[]>;
  latestResultGymByVa: Map<string, FightPassportResultGym>;
  aliasMaps: AliasMaps;
  teamConsensusByGym?: Map<string, string>;
}): GymMatch {
  const { sportscholen, gymNaam, vaNummer, schoolLinksByVa, latestResultGymByVa, aliasMaps, teamConsensusByGym } = opts;

  const explicitLandHint = detectLandHintFromGymText(gymNaam);

  // 1) Staat er in de matchmaking expliciet een landcode/landnaam, dan is die leidend.
  //    Voorbeeld: "No Mercy Gym (DE)" mag rechtstreeks naar Duitsland zoeken.
  if (explicitLandHint) {
    const explicit = findGymMatch(sportscholen, gymNaam, aliasMaps);
    if (explicit.row) return explicit;
  }

  // 2) Zonder expliciete buitenlandse hint: kijk eerst naar de LAATSTE uitslag van deze VA
  //    in fightpassport_results. Dit is de sterkste historische aanwijzing voor de gym.
  const latestResult = findGymMatchFromLatestResult({
    sportscholen,
    gymNaam,
    vaNummer,
    latestResultGymByVa,
    aliasMaps,
  });
  if (latestResult.row) return latestResult;

  // 3) Daarna de huidige/actieve koppeling in fightpassport_school_fighters, maar alleen
  //    wanneer de gekoppelde sportschoolnaam ook inhoudelijk bij de MM-sportschool past.
  const linked = findGymMatchFromVaLinksOnly({
    sportscholen,
    gymNaam,
    vaNummer,
    schoolLinksByVa,
    aliasMaps,
  });
  if (
    linked.row &&
    mmNameMatchesSchoolOrAlias(gymNaam, linked.row, aliasMaps)
  ) {
    return linked;
  }

  // 4) Teamfallback: alleen binnen DEZE matchmaking en alleen wanneer de
  // consensus-school óók naamtechnisch bij de MM-sportschool past.
  const key = teamConsensusKey(gymNaam);
  const consensusSid = key ? teamConsensusByGym?.get(key) : null;
  if (consensusSid) {
    const school = findSportschoolBySportschoolId(sportscholen, consensusSid);
    if (
      school &&
      mmNameMatchesSchoolOrAlias(gymNaam, school, aliasMaps)
    ) {
      return { row: school, reason: null };
    }
  }

  // 5) Pas als laatste de algemene naam/alias/fuzzy matching gebruiken.
  // Zonder expliciete buitenlandse landhint accepteren we hier GEEN buitenlandse match.
  const general = findGymMatch(sportscholen, gymNaam, aliasMaps);
  if (general.row) {
    const landDb = general.row?.land ?? general.row?.country ?? null;
    if (!explicitLandHint && isForeignNonNL(landDb)) {
      return {
        row: null,
        reason:
          `Naam-match kwam uit op buitenlandse sportschool "${general.row?.naam ?? "?"}" (${general.row?.plaats ?? general.row?.stad ?? "?"}), ` +
          "maar de matchmaking bevat geen buitenlandse landcode/landnaam.",
      };
    }
  }

  return general;
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
  const aliasHit = tryAliasMatch(list, gRaw, aliasMaps, knownPlaces);
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
      patch[reasonKey] = buildForeignKeurmerkReason({ gym: gymValue, land });
      return patch;
    }

    patch[valueKey] = null;
    patch[reasonKey] = gymValue
      ? `${mmLine(gymValue)}
Geen landcode/landnaam gevonden, dus behandeld als Nederlandse sportschool. Geen betrouwbare match in sportscholen. ${match.reason ?? "Maak alias aan als deze sportschool Nederlands is."}`.trim()
      : `${mmLine("")}
Geen sportschool opgegeven.`.trim();
    return patch;
  }

  const landDb = found?.land ?? found?.country ?? null;
  const land = landLabelForMatch(landDb, hint);
  const eindeIso = toIsoDateOnly(found?.keurmerk_eind ?? found?.keurmerk_einde ?? found?.einde_keurmerk);
  const matchInfo =
    `${mmLine(gymValue)}
` +
    `↳ gematcht met "${found.naam}" (${found.plaats ?? found.stad ?? "?"}, ${land ?? "?"})`;

  const isForeign = landDb ? isForeignNonNL(landDb) : hint !== null && hint !== "NL";

  if (isForeign) {
    patch[valueKey] = true;

    if (landDb ? isBE(landDb) : hint === "BE") {
      patch[reasonKey] =
        buildForeignKeurmerkReason({ gym: gymValue, land: land ?? "België", matchInfo });
    } else if (landDb ? isDE(landDb) : hint === "DE") {
      patch[reasonKey] =
        buildForeignKeurmerkReason({ gym: gymValue, land: land ?? "Buitenland", matchInfo });
    } else {
      patch[reasonKey] =
        buildForeignKeurmerkReason({ gym: gymValue, land: land ?? "Buitenland", matchInfo });
    }

    return patch;
  }

  const geldig = !!eindeIso && eindeIso >= String(evenement_datum ?? "");
  patch[valueKey] = geldig;
  patch[reasonKey] = geldig
    ? `${matchInfo}
Keurmerk geldig t/m ${eindeIso}.`
    : `${matchInfo}
Geen geldig keurmerk op eventdatum. Keurmerk eindigt/eindigde op ${eindeIso ?? "-"}.`;

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

    aliasRows.push({
      alias_text: raw,
      sportschool_id: String(sid),
    });
  }

  const aliasMaps: AliasMaps = { aliasNormToId, aliasCompactToId, aliasRows };

  const ctxVaNummers = (ctxRows ?? []).flatMap((row: any) => [
    String(row?.rood_va_mm ?? "").trim(),
    String(row?.blauw_va_mm ?? "").trim(),
  ]).filter(Boolean);
  const schoolLinksByVa = await fetchSchoolFighterLinksByVa(ctxVaNummers);
  const latestResultGymByVa = await fetchLatestResultGymsByVa(ctxVaNummers);

  const teamConsensusVotes = new Map<string, Map<string, number>>();
  for (const row of ctxRows ?? []) {
    const sides = [
      { gym: String((row as any)?.rood_gym_mm ?? "").trim(), va: String((row as any)?.rood_va_mm ?? "").trim() },
      { gym: String((row as any)?.blauw_gym_mm ?? "").trim(), va: String((row as any)?.blauw_va_mm ?? "").trim() },
    ];

    for (const side of sides) {
      if (!side.gym || !side.va) continue;
      const reliable = findGymMatchFromVaLinksOnly({
        sportscholen,
        gymNaam: side.gym,
        vaNummer: side.va,
        schoolLinksByVa,
        aliasMaps,
      });
      const reliableName = String(reliable.row?.naam ?? "");
      const sid =
        reliable.row && looseGymNameCompatible(side.gym, reliableName)
          ? String(reliable.row?.sportschool_id ?? "").trim()
          : "";
      const key = teamConsensusKey(side.gym);
      if (!sid || !key) continue;

      const votes = teamConsensusVotes.get(key) ?? new Map<string, number>();
      votes.set(sid, (votes.get(sid) ?? 0) + 1);
      teamConsensusVotes.set(key, votes);
    }
  }

  const teamConsensusByGym = new Map<string, string>();
  for (const [key, votes] of teamConsensusVotes.entries()) {
    // Geen conflict: één sportschool_id onder de betrouwbaar gekoppelde teamgenoten.
    // Eén betrouwbare andere vechter is genoeg; bij verschillende IDs wordt niets gekozen.
    if (votes.size === 1) {
      const sid = Array.from(votes.keys())[0];
      if (sid) teamConsensusByGym.set(key, sid);
    }
  }

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

    const roodVa = String((row as any).rood_va_mm ?? "").trim();
    const blauwVa = String((row as any).blauw_va_mm ?? "").trim();

    const roodMatch = roodGym
      ? findGymMatchForFighter({ sportscholen, gymNaam: roodGym, vaNummer: roodVa, schoolLinksByVa, latestResultGymByVa, aliasMaps, teamConsensusByGym })
      : { row: null, reason: null };
    const blauwMatch = blauwGym
      ? findGymMatchForFighter({ sportscholen, gymNaam: blauwGym, vaNummer: blauwVa, schoolLinksByVa, latestResultGymByVa, aliasMaps, teamConsensusByGym })
      : { row: null, reason: null };

    const rood = roodMatch.row;
    const blauw = blauwMatch.row;

    const patch: any = {};
    const mmLine = (gym: string) => (gym ? `↳ [MM sportschool:] "${gym}"` : `↳ [MM sportschool:] -`);
    const roodHint = detectLandHintFromGymText(roodGym);
    const blauwHint = detectLandHintFromGymText(blauwGym);

    if (!rood) {
      if (isForeignHint(roodHint)) {
        patch.keurmerk_rood = true;
        patch.keurmerk_reden_rood = buildForeignKeurmerkReason({ gym: roodGym, land: landHintToLabel(roodHint) });
      } else {
        patch.keurmerk_rood = null;
        patch.keurmerk_reden_rood = roodGym
          ? `${mmLine(roodGym)}
Geen landcode/landnaam gevonden, dus behandeld als Nederlandse sportschool. Geen betrouwbare match in sportscholen. ${roodMatch.reason ?? "Maak alias aan als deze sportschool Nederlands is."}`.trim()
          : `${mmLine("")}
Geen sportschool opgegeven.`.trim();
      }
    } else {
      const hint = roodHint;
      const landDb = rood?.land ?? rood?.country ?? null;
      const land = landLabelForMatch(landDb, hint);
      const eindeIso = toIsoDateOnly(rood?.keurmerk_eind ?? rood?.keurmerk_einde ?? rood?.einde_keurmerk);

      const matchInfo =
        `${mmLine(roodGym)}
` +
        `↳ gematcht met "${rood.naam}" (${rood.plaats ?? rood.stad ?? "?"}, ${land ?? "?"})`;

      const isForeign = landDb ? isForeignNonNL(landDb) : isForeignHint(hint);

      if (isForeign) {
        patch.keurmerk_rood = true;
        patch.keurmerk_reden_rood = buildForeignKeurmerkReason({
          gym: roodGym,
          land: land ?? (landDb ? "Buitenland" : landHintToLabel(hint)),
          matchInfo,
        });
      } else {
        const geldig = !!eindeIso && eindeIso >= String((row as any)?.evenement_datum ?? "");
        patch.keurmerk_rood = geldig;
        patch.keurmerk_reden_rood = geldig
          ? `${matchInfo}
Keurmerk geldig t/m ${eindeIso}.`
          : `${matchInfo}
Geen geldig keurmerk op eventdatum. Keurmerk eindigt/eindigde op ${eindeIso ?? "-"}.`;
      }
    }

    if (!blauw) {
      if (isForeignHint(blauwHint)) {
        patch.keurmerk_blauw = true;
        patch.keurmerk_reden_blauw = buildForeignKeurmerkReason({ gym: blauwGym, land: landHintToLabel(blauwHint) });
      } else {
        patch.keurmerk_blauw = null;
        patch.keurmerk_reden_blauw = blauwGym
          ? `${mmLine(blauwGym)}
Geen landcode/landnaam gevonden, dus behandeld als Nederlandse sportschool. Geen betrouwbare match in sportscholen. ${blauwMatch.reason ?? "Maak alias aan als deze sportschool Nederlands is."}`.trim()
          : `${mmLine("")}
Geen sportschool opgegeven.`.trim();
      }
    } else {
      const hint = blauwHint;
      const landDb = blauw?.land ?? blauw?.country ?? null;
      const land = landLabelForMatch(landDb, hint);
      const eindeIso = toIsoDateOnly(blauw?.keurmerk_eind ?? blauw?.keurmerk_einde ?? blauw?.einde_keurmerk);

      const matchInfo =
        `${mmLine(blauwGym)}
` +
        `↳ gematcht met "${blauw.naam}" (${blauw.plaats ?? blauw.stad ?? "?"}, ${land ?? "?"})`;

      const isForeign = landDb ? isForeignNonNL(landDb) : isForeignHint(hint);

      if (isForeign) {
        patch.keurmerk_blauw = true;
        patch.keurmerk_reden_blauw = buildForeignKeurmerkReason({
          gym: blauwGym,
          land: land ?? (landDb ? "Buitenland" : landHintToLabel(hint)),
          matchInfo,
        });
      } else {
        const geldig = !!eindeIso && eindeIso >= String((row as any)?.evenement_datum ?? "");
        patch.keurmerk_blauw = geldig;
        patch.keurmerk_reden_blauw = geldig
          ? `${matchInfo}
Keurmerk geldig t/m ${eindeIso}.`
          : `${matchInfo}
Geen geldig keurmerk op eventdatum. Keurmerk eindigt/eindigde op ${eindeIso ?? "-"}.`;
      }
    }

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

  const tournamentVaNummers = (tournamentRows ?? []).map((row: any) =>
    String(row?.va_nummer ?? row?.fighter_id ?? "").trim()
  ).filter(Boolean);
  const tournamentSchoolLinksByVa = await fetchSchoolFighterLinksByVa(tournamentVaNummers);
  const tournamentLatestResultGymByVa = await fetchLatestResultGymsByVa(tournamentVaNummers);

  for (const row of tournamentRows ?? []) {
    const rowId = unwrapUuid((row as any).id) ?? String((row as any).id ?? "").trim();
    if (!rowId) continue;

    const gym = String((row as any).sportschool_mm ?? (row as any).sportschool ?? "").trim();
    const va = String((row as any).va_nummer ?? (row as any).fighter_id ?? "").trim();
    const tournamentMatch = gym
      ? findGymMatchForFighter({
          sportscholen,
          gymNaam: gym,
          vaNummer: va,
          schoolLinksByVa: tournamentSchoolLinksByVa,
          latestResultGymByVa: tournamentLatestResultGymByVa,
          aliasMaps,
        })
      : { row: null, reason: null };

    let patch: any;
    if (tournamentMatch.row) {
      const found = tournamentMatch.row;
      const hint = detectLandHintFromGymText(gym);
      const landDb = found?.land ?? found?.country ?? null;
      const land = landLabelForMatch(landDb, hint);
      const eindeIso = toIsoDateOnly(found?.keurmerk_eind ?? found?.keurmerk_einde ?? found?.einde_keurmerk);
      const matchInfo = `↳ [MM sportschool:] "${gym || "-"}"\n↳ gematcht met "${found.naam}" (${found.plaats ?? found.stad ?? "?"}, ${land ?? "?"})`;
      const isForeign = landDb ? isForeignNonNL(landDb) : isForeignHint(hint);

      if (isForeign) {
        patch = {
          heeft_keurmerk: true,
          keurmerk_reason: buildForeignKeurmerkReason({ gym, land: land ?? "Buitenland", matchInfo }),
        };
      } else {
        const geldig = !!eindeIso && eindeIso >= String((row as any).evenement_datum ?? "");
        patch = {
          heeft_keurmerk: geldig,
          keurmerk_reason: geldig
            ? `${matchInfo}\nKeurmerk geldig t/m ${eindeIso}.`
            : `${matchInfo}\nGeen geldig keurmerk op eventdatum. Keurmerk eindigt/eindigde op ${eindeIso ?? "-"}.`,
        };
      }
    } else {
      patch = buildKeurmerkPatchForGym({
        gym,
        evenement_datum: String((row as any).evenement_datum ?? "").trim() || null,
        sportscholen,
        aliasMaps,
        valueKey: "heeft_keurmerk",
        reasonKey: "keurmerk_reason",
      });
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
