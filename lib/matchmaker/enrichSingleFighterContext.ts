// lib/matchmaker/enrichSingleFighterContext.ts
// Single-fighter verrijking vanuit dezelfde gedachte als lib/control/enrichControleBoutContext:
// sportschool/keurmerk matchen via sportscholen + aliases, maar zonder rood/blauw/bout-logica.
// ✅ Keurmerk wordt ALTIJD tegen evenement_datum gecontroleerd.

import {
  type AnyRow,
  type SupabaseLike,
  s,
  normLower,
  toNumberOrNull,
  normalizeKlasse,
} from "./singleFighterUtils";

type AliasMaps = {
  aliasNormToId: Map<string, string>;
  aliasCompactToId: Map<string, string>;
  aliasRows: { alias_text: string; sportschool_id: string }[];
};

type GymMatch = {
  row: AnyRow | null;
  reason: string | null;
};

function norm(value: any) {
  let x = String(value ?? "")
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

  let tokens = x
    .split(" ")
    .filter(Boolean)
    .filter((t) => !stop.has(t))
    .filter((t) => t !== "s");

  tokens = tokens.map((t) => {
    if (t.length >= 6 && t.endsWith("s")) return t.slice(0, -1);
    return t;
  });

  return tokens.join(" ").trim();
}

function normStrictName(value: any) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/['’`]/g, "'")
    .replace(/[()]/g, " ")
    .replace(/[\/|,-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactStrictName(value: any) {
  return normStrictName(value).replace(/\s+/g, "");
}

function normPlaats(value: any) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9à-ÿ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactNorm(value: any) {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

function normLand(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function isNL(value: any) {
  const x = normLand(value);
  return x === "nl" || x === "nederland" || x === "the netherlands" || x === "netherlands";
}

function isBE(value: any) {
  const x = normLand(value);
  return x === "be" || x === "belgie" || x === "belgië" || x === "belgium";
}

function isDE(value: any) {
  const x = normLand(value);
  return x === "de" || x === "duitsland" || x === "germany" || x === "deutschland";
}

function isFR(value: any) {
  const x = normLand(value);
  return x === "fr" || x === "frankrijk" || x === "france";
}

function isES(value: any) {
  const s = normLand(value);
  return s === "es" || s === "spanje" || s === "spain" || s === "españa" || s === "espana";
}

function isUK(value: any) {
  const s = normLand(value);
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

function isTR(value: any) {
  const s = normLand(value);
  return s === "tr" || s === "turkije" || s === "turkey" || s === "türkiye" || s === "turkiye";
}

type LandHint = "NL" | "BE" | "DE" | "FR" | "ES" | "UK" | "TR" | "FOREIGN";

function normalizeCountryCodeOrName(raw: string): LandHint | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
  if (!s) return null;

  if (["nl", "nederland", "netherlands", "the netherlands"].includes(s)) return "NL";
  if (["be", "belgie", "belgië", "belgium"].includes(s)) return "BE";
  if (["de", "duitsland", "deutschland", "germany"].includes(s)) return "DE";
  if (["fr", "frankrijk", "france"].includes(s)) return "FR";
  if (["es", "spanje", "spain", "españa", "espana"].includes(s)) return "ES";
  if (["uk", "gb", "groot brittannie", "groot-brittannie", "groot brittannië", "groot-brittannië", "verenigd koninkrijk", "united kingdom", "engeland", "england"].includes(s)) return "UK";
  if (["tr", "turkije", "turkey", "türkiye", "turkiye"].includes(s)) return "TR";

  // Landcodes zet je tussen haakjes, bv. (BE). Alles anders dan NL is buitenland.
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
  if (hint === "NL") return "Nederland";
  if (hint === "BE") return "België";
  if (hint === "DE") return "Duitsland";
  if (hint === "FR") return "Frankrijk";
  if (hint === "ES") return "Spanje";
  if (hint === "UK") return "United Kingdom";
  if (hint === "TR") return "Turkije";
  if (hint === "FOREIGN") return "Buitenland";
  return null;
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
  return false;
}


function isForeignNonNL(landValue: any) {
  if (!landValue) return false;
  return !isNL(landValue);
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

function toIsoDateOnly(value: any): string | null {
  if (!value) return null;

  const raw = String(value ?? "").trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

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

function tokenSet(value: string) {
  return new Set(String(value ?? "").split(" ").filter(Boolean));
}

function intersectionCount(a: string, b: string) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  let count = 0;
  for (const token of A) if (B.has(token)) count++;
  return count;
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
  for (const token of A) if (!B.has(token)) return false;
  return true;
}

function findSportschoolBySportschoolId(list: AnyRow[], sid: any) {
  const id = String(sid ?? "").trim();
  if (!id) return null;
  return (
    list.find((row) => String(row?.sportschool_id ?? "").trim() === id) ??
    list.find((row) => String(row?.id ?? "").trim() === id) ??
    null
  );
}

function hasPlaatsHint(rawGym: string, plaatsValue: any) {
  const input = normPlaats(rawGym);
  const plaats = normPlaats(plaatsValue);
  return !!plaats && !!input && input.includes(plaats);
}

function extractKnownPlaces(sportscholen: AnyRow[]) {
  const set = new Set<string>();
  for (const row of sportscholen ?? []) {
    const plaats = normPlaats(row?.plaats ?? "");
    const stad = normPlaats(row?.stad ?? "");
    if (plaats) set.add(plaats);
    if (stad) set.add(stad);
  }
  return Array.from(set).sort((a, b) => b.length - a.length);
}

function escapeRegex(value: string) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripCountryHintsFromRaw(raw: string) {
  let out = String(raw ?? "").trim();
  if (!out) return out;

  out = out.replace(/\(([A-Z]{2})\)/g, " ");
  out = out.replace(
    /\((Nederland|België|Belgie|Duitsland|Deutschland|Germany|Frankrijk|France|Spanje|Spain|Espana|España|United Kingdom|Verenigd Koninkrijk|Engeland|England|Turkije|Turkey|Türkiye|Turkiye)\)/gi,
    " "
  );
  out = out.replace(/\b(NL|BE|DE|FR|ES|UK|GB|TR)\b/g, " ");
  out = out.replace(
    /\b(Nederland|België|Belgie|Duitsland|Deutschland|Germany|Frankrijk|France|Spanje|Spain|Espana|España|United Kingdom|Verenigd Koninkrijk|Engeland|England|Turkije|Turkey|Türkiye|Turkiye)\b/gi,
    " "
  );
  out = out.replace(/\s+/g, " ").trim();

  return out;
}

function stripKnownPlaceSuffixes(raw: string, knownPlaces: string[]) {
  let out = String(raw ?? "").trim();
  if (!out) return out;

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
        if (rx.test(out)) {
          out = out.replace(rx, " ").replace(/\s+/g, " ").trim();
          changed = true;
        }
      }
    }
  }

  return out.trim();
}

function buildAliasLookupVariants(rawGym: string, knownPlaces: string[]) {
  const raw = String(rawGym ?? "").trim();
  const out = new Set<string>();

  const addVariant = (value: string) => {
    const n = norm(value);
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
  sportscholen: AnyRow[],
  gymNaam: string,
  aliasMaps: AliasMaps | undefined,
  knownPlaces: string[]
): GymMatch | null {
  if (!aliasMaps) return null;

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

function scoreCandidate(row: AnyRow, g: string, gRaw: string, key: string, landHint: LandHint | null) {
  const nameN = norm(row?.naam ?? row?.name ?? row?.sportschool);
  if (!nameN) return -1;

  const ov = overlapScore(g, nameN);
  const d = levenshtein(compactNorm(g), compactNorm(nameN));
  const len = Math.max(1, Math.max(compactNorm(g).length, compactNorm(nameN).length));
  const distScore = 1 - Math.min(1, d / len);

  let score = ov * 0.72 + distScore * 0.28;

  const plaats = row?.plaats ?? row?.stad ?? "";
  if (hasPlaatsHint(gRaw, plaats)) score += 0.22;

  const land = row?.land ?? row?.country ?? null;
  if (landMatchesHint(land, landHint)) score += 0.18;

  if (key && nameN.includes(key)) score += 0.06;

  return score;
}

function chooseBestFromCandidates(
  candidates: AnyRow[],
  g: string,
  gRaw: string,
  key: string,
  landHint: LandHint | null
): GymMatch {
  if (candidates.length === 0) return { row: null, reason: "Geen match gevonden." };
  if (candidates.length === 1) return { row: candidates[0], reason: null };

  const withPlaats = candidates.filter((row) => hasPlaatsHint(gRaw, row?.plaats ?? row?.stad ?? ""));
  if (withPlaats.length === 1) return { row: withPlaats[0], reason: null };

  const withLand = candidates.filter((row) => landMatchesHint(row?.land ?? row?.country, landHint));
  if (withLand.length === 1) return { row: withLand[0], reason: null };

  if (withPlaats.length > 1) {
    const withPlaatsAndLand = withPlaats.filter((row) => landMatchesHint(row?.land ?? row?.country, landHint));
    if (withPlaatsAndLand.length === 1) return { row: withPlaatsAndLand[0], reason: null };
  }

  let best: AnyRow | null = null;
  let bestScore = -1;
  let secondScore = -1;

  for (const row of candidates) {
    const score = scoreCandidate(row, g, gRaw, key, landHint);
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      best = row;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (best && bestScore >= 0.72 && bestScore - secondScore >= 0.04) {
    return { row: best, reason: null };
  }

  return { row: null, reason: "Meerdere matches (ambigue) — maak alias aan." };
}

function findGymMatch(sportscholen: AnyRow[], gymNaam: string, aliasMaps?: AliasMaps): GymMatch {
  const gRaw = String(gymNaam ?? "").trim();
  if (!gRaw) return { row: null, reason: "Lege/ongeldige sportschoolnaam." };

  const list = sportscholen ?? [];
  const explicitLandHint = detectLandHintFromGymText(gRaw);
  const landHint = defaultLandHintForMatching(explicitLandHint);
  const knownPlaces = extractKnownPlaces(list);

  const rawStrict = normStrictName(gRaw);
  const rawCompactStrict = compactStrictName(gRaw);

  const rawExactHits = list.filter((row) => normStrictName(row?.naam ?? row?.name ?? row?.sportschool) === rawStrict);
  if (rawExactHits.length > 0) {
    const gLoose = norm(gRaw);
    const key = gLoose.split(" ").filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? "";
    return chooseBestFromCandidates(rawExactHits, gLoose || rawStrict, gRaw, key, landHint);
  }

  const rawCompactHits = list.filter(
    (row) => compactStrictName(row?.naam ?? row?.name ?? row?.sportschool) === rawCompactStrict
  );
  if (rawCompactHits.length > 0) {
    const gLoose = norm(gRaw);
    const key = gLoose.split(" ").filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? "";
    return chooseBestFromCandidates(rawCompactHits, gLoose || rawStrict, gRaw, key, landHint);
  }

  const aliasHit = tryAliasMatch(list, gRaw, aliasMaps, knownPlaces);
  if (aliasHit?.row) return aliasHit;

  const g = norm(gRaw);
  if (!g) return { row: null, reason: "Lege/ongeldige sportschoolnaam." };

  const inputPlaatsHint = normPlaats(gRaw);
  const toks = g.split(" ").filter(Boolean).sort((a, b) => b.length - a.length);
  const key = toks[0] ?? "";

  const exactHits = list.filter((row) => norm(row?.naam ?? row?.name ?? row?.sportschool) === g);
  if (exactHits.length > 0) return chooseBestFromCandidates(exactHits, g, gRaw, key, landHint);

  const gCompact = compactNorm(g);
  const exactCompactHits = list.filter((row) => compactNorm(norm(row?.naam ?? row?.name ?? row?.sportschool)) === gCompact);
  if (exactCompactHits.length > 0) return chooseBestFromCandidates(exactCompactHits, g, gRaw, key, landHint);

  const strippedRaw = stripKnownPlaceSuffixes(stripCountryHintsFromRaw(gRaw), knownPlaces);
  const strippedStrict = normStrictName(strippedRaw);
  const strippedCompactStrict = compactStrictName(strippedRaw);
  const strippedNorm = norm(strippedRaw);
  const strippedCompact = compactNorm(strippedNorm);

  if (strippedStrict && strippedStrict !== rawStrict) {
    const strictBaseHits = list.filter((row) => normStrictName(row?.naam ?? row?.name ?? row?.sportschool) === strippedStrict);
    if (strictBaseHits.length > 0) {
      return chooseBestFromCandidates(strictBaseHits, strippedNorm || strippedStrict, gRaw, key, landHint);
    }

    const strictBaseCompactHits = list.filter(
      (row) => compactStrictName(row?.naam ?? row?.name ?? row?.sportschool) === strippedCompactStrict
    );
    if (strictBaseCompactHits.length > 0) {
      return chooseBestFromCandidates(strictBaseCompactHits, strippedNorm || strippedStrict, gRaw, key, landHint);
    }
  }

  if (strippedNorm && strippedNorm !== g) {
    const exactBaseHits = list.filter((row) => norm(row?.naam ?? row?.name ?? row?.sportschool) === strippedNorm);
    if (exactBaseHits.length > 0) {
      return chooseBestFromCandidates(exactBaseHits, strippedNorm, gRaw, key, landHint);
    }

    const compactBaseHits = list.filter((row) => compactNorm(norm(row?.naam ?? row?.name ?? row?.sportschool)) === strippedCompact);
    if (compactBaseHits.length > 0) {
      return chooseBestFromCandidates(compactBaseHits, strippedNorm, gRaw, key, landHint);
    }
  }

  const subsetHits = list.filter((row) => {
    const n = norm(row?.naam ?? row?.name ?? row?.sportschool);
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

  let best: AnyRow | null = null;
  let bestScore = -1;
  let second: AnyRow | null = null;
  let secondScore = -1;
  const scoreBase = strippedNorm || g;

  for (const row of list) {
    const score = scoreCandidate(row, scoreBase, gRaw, key, landHint);
    if (score < 0) continue;

    if (score > bestScore) {
      second = best;
      secondScore = bestScore;
      best = row;
      bestScore = score;
    } else if (score > secondScore) {
      second = row;
      secondScore = score;
    }
  }

  if (best && bestScore >= 0.7) {
    if (second && secondScore >= bestScore - 0.03) {
      return { row: null, reason: "Meerdere matches (ambigue) — maak alias aan." };
    }
    return { row: best, reason: null };
  }

  return { row: null, reason: "Geen match gevonden." };
}

async function fetchAll(supabase: SupabaseLike, table: string) {
  const all: AnyRow[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select("*").range(from, to);

    if (error) {
      console.warn(`[enrichSingleFighterContext] ${table} niet geladen:`, error.message);
      return all;
    }

    const chunk = (data ?? []) as AnyRow[];
    all.push(...chunk);

    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

function buildKeurmerkPatchForGym(opts: {
  gym: string;
  evenement_datum?: string | null;
  sportscholen: AnyRow[];
  aliasMaps: AliasMaps;
}) {
  const { gym, evenement_datum, sportscholen, aliasMaps } = opts;
  const gymValue = s(gym);
  const patch: AnyRow = {};
  const mmLine = (value: string) => (value ? `↳ [MM sportschool:] "${value}"` : `↳ [MM sportschool:] -`);

  const eventIso = toIsoDateOnly(evenement_datum);
  const hint = detectLandHintFromGymText(gymValue);
  const match = gymValue ? findGymMatch(sportscholen, gymValue, aliasMaps) : { row: null, reason: null };
  const found = match.row;

  if (!found) {
    patch.sportschool_match_land = landHintToLabel(defaultLandHintForMatching(hint));
    patch.keurmerk_einddatum = null;

    if (isForeignHint(hint)) {
      patch.keurmerk = true;
      patch.heeft_keurmerk = true;
      patch.keurmerk_status = hint === "BE" ? "belgie_check" : "buitenland";
      patch.keurmerk_reden = buildForeignKeurmerkReason({ gym: gymValue, land: landHintToLabel(hint) });
      return patch;
    }

    patch.keurmerk = null;
    patch.heeft_keurmerk = null;
    patch.keurmerk_status = "geen_match";
    patch.keurmerk_reden = gymValue
      ? `${mmLine(gymValue)}
Geen landcode/landnaam gevonden, dus behandeld als Nederlandse sportschool. Geen betrouwbare match in sportscholen. ${match.reason ?? "Maak alias aan als deze sportschool Nederlands is."}`.trim()
      : `${mmLine("")}
Geen sportschool opgegeven.`.trim();
    return patch;
  }

  const landDb = found?.land ?? found?.country ?? null;
  const land = landLabelForMatch(landDb, hint);
  const eindeIso = toIsoDateOnly(found?.keurmerk_eind ?? found?.keurmerk_einde ?? found?.einde_keurmerk);
  const naam = found.naam ?? found.name ?? found.sportschool ?? "?";

  const matchInfo =
    `${mmLine(gymValue)}
` +
    `↳ gematcht met "${naam}" (${found.plaats ?? found.stad ?? "?"}, ${land ?? "?"})`;

  patch.sportschool_id = found.id ?? found.sportschool_id ?? null;
  patch.sportschool_match_naam = naam;
  patch.sportschool_match_plaats = found.plaats ?? found.stad ?? null;
  patch.sportschool_match_land = land ?? null;
  patch.keurmerk_einddatum = eindeIso;

  const isForeign = landDb ? isForeignNonNL(landDb) : isForeignHint(hint);

  if (isForeign) {
    patch.keurmerk = true;
    patch.heeft_keurmerk = true;

    if (landDb ? isBE(landDb) : hint === "BE") {
      patch.keurmerk_status = "belgie_check";
      patch.keurmerk_reden = buildForeignKeurmerkReason({ gym: gymValue, land: land ?? "België", matchInfo });
    } else {
      patch.keurmerk_status = "buitenland";
      patch.keurmerk_reden = buildForeignKeurmerkReason({ gym: gymValue, land: land ?? "Buitenland", matchInfo });
    }

    return patch;
  }

  if (!eventIso) {
    patch.keurmerk = null;
    patch.heeft_keurmerk = null;
    patch.keurmerk_status = "eventdatum_ontbreekt";
    patch.keurmerk_reden = `${matchInfo}
Eventdatum ontbreekt, dus keurmerk kan niet betrouwbaar op eventdatum worden gecontroleerd.`;
    return patch;
  }

  const geldig = !!eindeIso && eindeIso >= eventIso;

  patch.keurmerk = geldig;
  patch.heeft_keurmerk = geldig;
  patch.keurmerk_status = geldig ? "geldig" : "ongeldig";
  patch.keurmerk_reden = geldig
    ? `${matchInfo}
Keurmerk geldig op eventdatum ${eventIso}. Keurmerk geldig t/m ${eindeIso}.`
    : `${matchInfo}
Geen geldig keurmerk op eventdatum ${eventIso}. Keurmerk eindigt/eindigde op ${eindeIso ?? "-"}.`;

  return patch;
}


export async function enrichSingleFighterContext(params: {
  supabase: SupabaseLike;
  context: AnyRow;
}) {
  const { supabase, context } = params;

  const [sportscholen, aliases] = await Promise.all([
    fetchAll(supabase, "sportscholen"),
    fetchAll(supabase, "sportschool_aliases"),
  ]);

  const aliasNormToId = new Map<string, string>();
  const aliasCompactToId = new Map<string, string>();
  const aliasRows: { alias_text: string; sportschool_id: string }[] = [];

  for (const alias of aliases ?? []) {
    const raw = s(alias?.alias_text ?? alias?.alias ?? alias?.naam);
    const sid = alias?.sportschool_id;
    if (!raw || sid == null) continue;

    const n = norm(raw);
    if (!n) continue;
    const c = compactNorm(n);

    if (!aliasNormToId.has(n)) aliasNormToId.set(n, String(sid));
    if (!aliasCompactToId.has(c)) aliasCompactToId.set(c, String(sid));
    aliasRows.push({ alias_text: raw, sportschool_id: String(sid) });
  }

  const aliasMaps: AliasMaps = { aliasNormToId, aliasCompactToId, aliasRows };
  const gym = s(context.sportschool_mm ?? context.gym_input ?? context.sportschool ?? context.gym);
  const evenement_datum =
    toIsoDateOnly(context.evenement_datum) ??
    toIsoDateOnly(context.event_datum) ??
    toIsoDateOnly(context.event_date) ??
    null;

  const keurmerkPatch = buildKeurmerkPatchForGym({
    gym,
    evenement_datum,
    sportscholen,
    aliasMaps,
  });

  const mergedContext: AnyRow = {
    ...context,
    evenement_datum,
    ...keurmerkPatch,
  };

  const klasseAdvies = deriveKlasseAdvies(mergedContext);

  return {
    ...mergedContext,
    klasse_norm: normalizeKlasse(mergedContext.klasse ?? mergedContext.klasse_mm ?? mergedContext.nulmeting_klasse),
    klasse_advies: klasseAdvies.klasse_advies,
    klasse_advies_reden: klasseAdvies.klasse_advies_reden,
    matchmaker_score_basis: buildMatchmakerScoreBasis({
      ...mergedContext,
      klasse_advies: klasseAdvies.klasse_advies,
    }),
    enriched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}


function getSingleFighterUitslagen(context: AnyRow): AnyRow[] {
  const candidates = [
    context.uitslagen,
    context.uitslagen_raw,
    context.matchmaker_uitslagen_raw,
    context.raw?.matchmaker_uitslagen_raw,
    context.raw_json?.matchmaker_uitslagen_raw,
    context.extra?.uitslagen,
    context.extra?.matchmaker_uitslagen_raw,
    context.extra?.raw?.matchmaker_uitslagen_raw,
    context.extra?.raw?.uitslagen,
  ];

  for (const list of candidates) {
    if (Array.isArray(list)) return list;
  }

  return [];
}

type AdultKlasse = "R" | "N" | "C" | "B" | "A";
const ADULT_KLASSES: AdultKlasse[] = ["R", "N", "C", "B", "A"];

function isAdultKlasseValue(v: any): v is AdultKlasse {
  return v === "R" || v === "N" || v === "C" || v === "B" || v === "A";
}

function klasseIdx(k: AdultKlasse) {
  return ADULT_KLASSES.indexOf(k);
}

function normalizeUitslagKlasse(v: any): AdultKlasse | null {
  const k = normalizeKlasse(v);
  return isAdultKlasseValue(k) ? k : null;
}

function isKbMtUitslag(row: AnyRow) {
  const d = normLower(row?.discipline ?? row?.sport ?? row?.vechtsport);
  return d.includes("kick") || d.includes("k1") || d.includes("muay") || d.includes("thai");
}

function isWinUitslag(row: AnyRow) {
  const x = normLower(row?.uitslag ?? row?.resultaat ?? row?.outcome);
  return x.includes("wint") || x.includes("gewonnen") || x.includes("winst") || x === "win" || x === "w";
}

function isOfficialUitslag(row: AnyRow) {
  const x = normLower(row?.uitslag ?? row?.resultaat ?? row?.outcome);
  if (!x) return false;
  if (x.includes("demo") || x.includes("no contest") || x.includes("nocontest")) return false;
  return true;
}

function minimumAfterAdultClass(klasse: AdultKlasse, wins: number, total: number): AdultKlasse {
  if (klasse === "R") return wins >= 2 || total >= 3 ? "N" : "R";
  if (klasse === "N") return wins >= 4 || total >= 6 ? "C" : "N";
  if (klasse === "C") return wins >= 6 || total >= 8 ? "B" : "C";
  if (klasse === "B") return wins >= 8 || total >= 10 ? "A" : "B";
  return "A";
}

function deriveVolwassenKlasseAdviesFromUitslagen(context: AnyRow, fallbackKlasse: any) {
  const rows = getSingleFighterUitslagen(context).filter(isKbMtUitslag);
  const perKlasse: Record<AdultKlasse, { wins: number; total: number }> = {
    R: { wins: 0, total: 0 },
    N: { wins: 0, total: 0 },
    C: { wins: 0, total: 0 },
    B: { wins: 0, total: 0 },
    A: { wins: 0, total: 0 },
  };

  for (const row of rows) {
    const klasse = normalizeUitslagKlasse(row?.klasse ?? row?.wedstrijdklasse ?? row?.class ?? row?.niveau);

    // Cruciaal: jeugd/unknown telt niet mee voor volwassen R/N/C/B/A-promotie.
    if (!klasse) continue;

    if (isOfficialUitslag(row)) perKlasse[klasse].total += 1;
    if (isWinUitslag(row)) perKlasse[klasse].wins += 1;
  }

  let highestWithAdultResult: AdultKlasse | null = null;
  for (const klasse of ADULT_KLASSES) {
    if (perKlasse[klasse].total > 0) highestWithAdultResult = klasse;
  }

  const base = highestWithAdultResult ?? (isAdultKlasseValue(fallbackKlasse) ? fallbackKlasse : "N");
  let advies: AdultKlasse = base === "R" ? minimumAfterAdultClass("R", perKlasse.R.wins, perKlasse.R.total) : base;

  for (const klasse of ADULT_KLASSES) {
    if (klasseIdx(klasse) < klasseIdx(advies)) continue;
    const next = minimumAfterAdultClass(klasse, perKlasse[klasse].wins, perKlasse[klasse].total);
    if (klasseIdx(next) > klasseIdx(advies)) advies = next;
  }

  const totalAdult = ADULT_KLASSES.reduce((sum, klasse) => sum + perKlasse[klasse].total, 0);
  const details = ADULT_KLASSES
    .map((klasse) => `${klasse}: ${perKlasse[klasse].wins} winst / ${perKlasse[klasse].total} totaal`)
    .join(", ");

  return { advies, base, totalAdult, details };
}

function deriveKlasseAdvies(context: AnyRow) {
  const klasse = normalizeKlasse(context.klasse ?? context.klasse_mm ?? context.nulmeting_klasse);

  if (!klasse) {
    return { klasse_advies: null, klasse_advies_reden: "Geen klasse bekend." };
  }

  // Jeugd, MMA en onbekend blijven uit deze volwassen kickboks/MT-promotielogica.
  // Veel jeugdpartijen mogen nooit automatisch C/B/A/A veroorzaken.
  if (!isAdultKlasseValue(klasse)) {
    return {
      klasse_advies: klasse,
      klasse_advies_reden: `Klasse blijft ${klasse}. Jeugd/MMA valt buiten volwassen R/N/C/B/A-promotie.`,
    };
  }

  const advies = deriveVolwassenKlasseAdviesFromUitslagen(context, klasse);

  return {
    klasse_advies: advies.advies,
    klasse_advies_reden:
      advies.totalAdult > 0
        ? `Volwassen klasseadvies op basis van uitslagen per klasse (${advies.details}). Jeugdpartijen tellen niet mee voor volwassen promotie.`
        : `Geen volwassen R/N/C/B/A-uitslagen gevonden. Fallback op nulmeting/opgegeven klasse ${klasse}. Jeugdpartijen tellen niet mee voor volwassen promotie.`,
  };
}

function buildMatchmakerScoreBasis(context: AnyRow) {
  return {
    leeftijd: toNumberOrNull(context.leeftijd_event ?? context.leeftijd),
    gewicht: toNumberOrNull(context.gewicht),
    klasse: normalizeKlasse(context.klasse_advies ?? context.klasse ?? context.klasse_mm ?? context.nulmeting_klasse),
    totaal_wedstrijden: toNumberOrNull(context.totaal_wedstrijden),
    gewonnen: toNumberOrNull(context.gewonnen ?? context.record_w),
    verloren: toNumberOrNull(context.verloren ?? context.record_l),
    geslacht: normLower(context.geslacht),
    discipline: normLower(context.discipline),
    licentie_ok: context.licentie_ok,
    keurmerk: context.keurmerk ?? context.heeft_keurmerk,
    startverbod: context.heeft_startverbod ?? context.startverbod,
  };
}
