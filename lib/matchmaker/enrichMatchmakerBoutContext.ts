// lib/matchmaker/enrichMatchmakerBoutContext.ts
// Verrijkt matchmaker_fighter_context met KEURMERK-info per fighter
// Werkt op gym_input / fp_gym en schrijft terug naar:
// - heeft_keurmerk
// - extra.keurmerk

import dayjs from "dayjs";
import { supabaseAdmin } from "@/lib/matchmaker/access";

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

type LandHint = "NL" | "BE" | "DE" | "FR" | "ES";

function normalizeCountryCodeOrName(raw: string): LandHint | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;

  if (["nl", "nederland", "netherlands", "the netherlands"].includes(s)) return "NL";
  if (["be", "belgie", "belgië", "belgium"].includes(s)) return "BE";
  if (["de", "duitsland", "deutschland", "germany"].includes(s)) return "DE";
  if (["fr", "frankrijk", "france"].includes(s)) return "FR";
  if (["es", "spanje", "spain", "españa", "espana"].includes(s)) return "ES";

  return null;
}

function detectLandHintFromGymText(rawGym: string): LandHint | null {
  const raw = String(rawGym ?? "").trim();
  if (!raw) return null;

  const s = raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const lower = s.toLowerCase();

  const parenMatches = [...s.matchAll(/\(([^)]+)\)/g)];
  for (const m of parenMatches) {
    const inside = String(m[1] ?? "").trim();
    const hint = normalizeCountryCodeOrName(inside);
    if (hint) return hint;
  }

  const upperTokens = s.match(/\b[A-Z]{2}\b/g) ?? [];
  for (const tok of upperTokens) {
    const hint = normalizeCountryCodeOrName(tok);
    if (hint) return hint;
  }

  if (lower.includes("belgie") || lower.includes("belgië") || lower.includes("belgium")) return "BE";
  if (lower.includes("duitsland") || lower.includes("deutschland") || lower.includes("germany")) return "DE";
  if (lower.includes("nederland") || lower.includes("the netherlands") || lower.includes("netherlands")) return "NL";
  if (lower.includes("frankrijk") || lower.includes("france")) return "FR";
  if (lower.includes("spanje") || lower.includes("spain") || lower.includes("españa") || lower.includes("espana")) {
    return "ES";
  }

  return null;
}

function landHintToLabel(hint: LandHint | null): string | null {
  if (hint === "NL") return "Nederland";
  if (hint === "BE") return "België";
  if (hint === "DE") return "Duitsland";
  if (hint === "FR") return "Frankrijk";
  if (hint === "ES") return "Spanje";
  return null;
}

function landMatchesHint(landValue: any, hint: LandHint | null) {
  if (!hint) return false;
  if (hint === "NL") return isNL(landValue);
  if (hint === "BE") return isBE(landValue);
  if (hint === "DE") return isDE(landValue);
  if (hint === "FR") return isFR(landValue);
  if (hint === "ES") return isES(landValue);
  return false;
}

function toIsoDateOnly(d: any): string | null {
  if (!d) return null;
  const x = dayjs(d);
  return x.isValid() ? x.format("YYYY-MM-DD") : null;
}

function asId(v: any): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function asInt(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function safeObj(v: any): Record<string, any> {
  if (!v) return {};
  if (typeof v === "object" && !Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }
  return {};
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
  return list.find((x) => String(x?.sportschool_id) === s || String(x?.id) === s) ?? null;
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

  s = s.replace(/\((NL|BE|DE|FR|ES)\)/gi, " ");
  s = s.replace(
    /\((Nederland|België|Belgie|Duitsland|Deutschland|Germany|Frankrijk|France|Spanje|Spain|Espana|España)\)/gi,
    " "
  );
  s = s.replace(/\b(NL|BE|DE|FR|ES)\b/g, " ");
  s = s.replace(
    /\b(Nederland|België|Belgie|Duitsland|Deutschland|Germany|Frankrijk|France|Spanje|Spain|Espana|España)\b/gi,
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

function findGymMatch(sportscholen: any[], gymNaam: string, aliasMaps?: AliasMaps): GymMatch {
  const gRaw = String(gymNaam ?? "").trim();
  if (!gRaw) return { row: null, reason: "Lege/ongeldige sportschoolnaam." };

  const list = sportscholen ?? [];
  const landHint = detectLandHintFromGymText(gRaw);
  const knownPlaces = extractKnownPlaces(list);

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

  const aliasHit = tryAliasMatch(list, gRaw, aliasMaps, knownPlaces);
  if (aliasHit?.row) return aliasHit;

  const g = norm(gRaw);
  if (!g) return { row: null, reason: "Lege/ongeldige sportschoolnaam." };

  const inputPlaatsHint = normPlaats(gRaw);
  const toks = g.split(" ").filter(Boolean).sort((a, b) => b.length - a.length);
  const key = toks[0] ?? "";

  const exactHits = list.filter((x) => norm(x?.naam) === g);
  if (exactHits.length > 0) return chooseBestFromCandidates(exactHits, g, gRaw, key, landHint);

  const gCompact = compactNorm(g);
  const exactCompactHits = list.filter((x) => compactNorm(norm(x?.naam)) === gCompact);
  if (exactCompactHits.length > 0) return chooseBestFromCandidates(exactCompactHits, g, gRaw, key, landHint);

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

function isForeignNonNL(landValue: any) {
  if (!landValue) return false;
  return !isNL(landValue);
}

function pickGymName(row: any) {
  return String(row?.gym_input ?? row?.fp_gym ?? "").trim();
}

function resolveReferenceDate(extra: Record<string, any>) {
  return (
    toIsoDateOnly(extra?.evenement_datum) ??
    toIsoDateOnly(extra?.event_date) ??
    toIsoDateOnly(extra?.datum) ??
    dayjs().format("YYYY-MM-DD")
  );
}

export async function enrichMatchmakerBoutContext(
  matchmaking_id: string,
  controle_run_id?: string | null,
  opts?: { row_nr?: number | null; inschrijving_id?: string | null; fighter_context_id?: string | null }
) {
  if (!matchmaking_id) throw new Error("matchmaking_id ontbreekt");

  const scopedRowNr =
    opts?.row_nr != null && Number.isFinite(Number(opts.row_nr))
      ? Number(opts.row_nr)
      : null;

  const scopedInschrijvingId = asId(opts?.inschrijving_id);
  const scopedFighterContextId = asId(opts?.fighter_context_id);
  const runId = asId(controle_run_id);

  let ctxQ = supabaseAdmin
    .from("matchmaker_fighter_context")
    .select("id, matchmaking_id, inschrijving_id, row_nr, gym_input, fp_gym, heeft_keurmerk, extra")
    .eq("matchmaking_id", matchmaking_id);

  if (scopedRowNr != null) ctxQ = ctxQ.eq("row_nr", scopedRowNr);
  if (scopedInschrijvingId) ctxQ = ctxQ.eq("inschrijving_id", scopedInschrijvingId);
  if (scopedFighterContextId) ctxQ = ctxQ.eq("id", scopedFighterContextId);

  const { data: ctxRows, error: cErr } = await ctxQ;
  if (cErr) throw cErr;
  if (!ctxRows || ctxRows.length === 0) return { count: 0 };

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

  console.log("[enrichMatchmakerBoutContext] sportscholen loaded:", sportscholen.length);
  console.log("[enrichMatchmakerBoutContext] aliases loaded:", aliases.length);
  console.log("[enrichMatchmakerBoutContext] alias keys:", aliasNormToId.size);
  console.log("[enrichMatchmakerBoutContext] scope", {
    matchmaking_id,
    controle_run_id: runId,
    row_nr: scopedRowNr,
    inschrijving_id: scopedInschrijvingId,
    fighter_context_id: scopedFighterContextId,
    rows: ctxRows.length,
  });

  let updated = 0;

  for (const row of ctxRows) {
    const rowId = asId((row as any).id);
    if (!rowId) continue;

    const prevExtra = safeObj((row as any).extra);
    const gymNaam = pickGymName(row);
    const match = gymNaam
      ? findGymMatch(sportscholen, gymNaam, aliasMaps)
      : { row: null, reason: "Geen sportschool opgegeven." };

    const hit = match.row;
    const referentieDatum = resolveReferenceDate(prevExtra);

    let heeft_keurmerk: string | null = null;
    let keurmerk_reason = "";
    let keurmerk_payload: Record<string, any> = {
      controle_run_id: runId,
      bron_gym: gymNaam || null,
      sportschool_match: null,
      reason: null,
      referentie_datum: referentieDatum,
    };

    if (!gymNaam) {
      heeft_keurmerk = null;
      keurmerk_reason = "Geen sportschool opgegeven.";
      keurmerk_payload.reason = keurmerk_reason;
    } else if (!hit) {
      heeft_keurmerk = null;
      keurmerk_reason = `Geen match in sportscholen. ${match.reason ?? ""}`.trim();
      keurmerk_payload.reason = keurmerk_reason;
    } else {
      const hint = detectLandHintFromGymText(gymNaam);
      const landDb = hit?.land ?? hit?.country ?? null;
      const land = landDb ?? landHintToLabel(hint);
      const eindeIso = toIsoDateOnly(hit?.keurmerk_eind ?? hit?.keurmerk_einde ?? hit?.einde_keurmerk);

      keurmerk_payload.sportschool_match = {
        id: hit?.id ?? hit?.sportschool_id ?? null,
        naam: hit?.naam ?? null,
        plaats: hit?.plaats ?? hit?.stad ?? null,
        land: land ?? null,
        keurmerk_eind: eindeIso,
      };

      const matchInfo =
        `↳ [MM sportschool:] "${gymNaam}"\n` +
        `↳ gematcht met "${hit?.naam ?? "-"}" (${hit?.plaats ?? hit?.stad ?? "?"}, ${land ?? "?"})`;

      const isForeign = landDb ? isForeignNonNL(landDb) : hint !== null && hint !== "NL";

      if (isForeign) {
        heeft_keurmerk = "true";

        if (landDb ? isBE(landDb) : hint === "BE") {
          keurmerk_reason =
            `⚠️ België — controleer sportschool op BKBMO site + boksboekje. Land: ${land ?? "België"}.\n${matchInfo}`;
        } else if (landDb ? isDE(landDb) : hint === "DE") {
          keurmerk_reason =
            `ℹ️ Buitenland (Duitsland) — geen NVB keurmerk vereist. Controleer bond/boekje handmatig.\n${matchInfo}`;
        } else {
          keurmerk_reason =
            `ℹ️ Buitenland — geen NVB keurmerk vereist. Controleer bond/boekje handmatig.\n${matchInfo}`;
        }

        keurmerk_payload.reason = keurmerk_reason;
        keurmerk_payload.is_foreign = true;
      } else {
        const geldig = !!eindeIso && eindeIso >= referentieDatum;
        heeft_keurmerk = geldig ? "true" : "false";
        keurmerk_reason = geldig
          ? `${matchInfo}\nKeurmerk geldig t/m ${eindeIso}.`
          : `${matchInfo}\nGeen geldig keurmerk op referentiedatum ${referentieDatum}. Keurmerk eindigt/eindigde op ${eindeIso ?? "-"}.`;

        keurmerk_payload.reason = keurmerk_reason;
        keurmerk_payload.is_foreign = false;
        keurmerk_payload.geldig = geldig;
      }
    }

    const nextExtra = {
      ...prevExtra,
      controle_run_id: runId ?? prevExtra?.controle_run_id ?? null,
      keurmerk: keurmerk_payload,
      keurmerk_reason,
      laatste_keurmerk_check_op: new Date().toISOString(),
    };

    const { error: uErr } = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .update({
        heeft_keurmerk,
        extra: nextExtra,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rowId)
      .eq("matchmaking_id", matchmaking_id);

    if (uErr) throw uErr;
    updated += 1;
  }

  return { count: updated };
}