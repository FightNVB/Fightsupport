// lib/control/enrichControleBoutContext.ts
// ✅ Verrijkt controle_bout_context met KEURMERK
// ❌ Doet GEEN inserts / GEEN upserts

import dayjs from "dayjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * ============================================================
 * 🔎 NORMALISATIE & MATCHING HELPERS — SPORTSCHOOL ZOEKER
 * ============================================================
 */

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

function normPlaats(s: any) {
  const x = String(s ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9à-ÿ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return x;
}

function compactNorm(s: any) {
  return String(s ?? "").replace(/\s+/g, "").trim();
}

function normLand(v: any) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "");
}

function isNL(v: any) {
  const s = normLand(v);
  return s === "nl" || s === "nederland" || s === "the netherlands";
}

function isBE(v: any) {
  const s = normLand(v);
  return s === "be" || s === "belgie" || s === "belgië" || s === "belgium";
}

function isDE(v: any) {
  const s = normLand(v);
  return s === "de" || s === "duitsland" || s === "germany" || s === "deutschland";
}

function detectLandHintFromGymText(rawGym: string): "BE" | "DE" | "NL" | null {
  const s = String(rawGym ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9à-ÿ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (s.includes("belgie") || s.includes("belgië") || s.includes("belgium") || /\bbe\b/.test(s)) return "BE";
  if (s.includes("duitsland") || s.includes("germany") || s.includes("deutschland") || /\bde\b/.test(s)) return "DE";
  if (s.includes("nederland") || /\bnl\b/.test(s)) return "NL";
  return null;
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

function findGymMatch(sportscholen: any[], gymNaam: string, aliasMaps?: AliasMaps): GymMatch {
  const gRaw = String(gymNaam ?? "").trim();
  const g = norm(gRaw);
  if (!g) return { row: null, reason: "Lege/ongeldige sportschoolnaam." };

  const list = sportscholen ?? [];
  const inputPlaatsHint = normPlaats(gRaw);

  if (aliasMaps) {
    const gNorm = g;
    const gCompact = compactNorm(gNorm);

    const id1 = aliasMaps.aliasNormToId.get(gNorm);
    const id2 = aliasMaps.aliasCompactToId.get(gCompact);
    const sid = id1 ?? id2;

    if (sid) {
      const hit = findSportschoolBySportschoolId(list, sid);
      if (hit) return { row: hit, reason: null };

      return {
        row: null,
        reason: `Alias gevonden maar sportschool_id ${String(
          sid
        )} bestaat niet in sportscholen.sportschool_id (controleer data).`,
      };
    }
  }

  const toks = g.split(" ").filter(Boolean).sort((a, b) => b.length - a.length);
  const key = toks[0] ?? "";

  const exactHits = list.filter((x) => norm(x?.naam) === g);
  if (exactHits.length === 1) return { row: exactHits[0], reason: null };
  if (exactHits.length > 1) {
    const withPlaats = exactHits.filter((x) => {
      const p = normPlaats(x?.plaats ?? x?.stad ?? "");
      return p && inputPlaatsHint.includes(p);
    });
    if (withPlaats.length === 1) return { row: withPlaats[0], reason: null };

    const nl = exactHits.find((x) => isNL(x?.land ?? x?.country));
    return { row: nl ?? exactHits[0], reason: null };
  }

  const gCompact = compactNorm(g);
  const exactCompactHits = list.filter((x) => compactNorm(norm(x?.naam)) === gCompact);
  if (exactCompactHits.length === 1) return { row: exactCompactHits[0], reason: null };
  if (exactCompactHits.length > 1) {
    const nl = exactCompactHits.find((x) => isNL(x?.land ?? x?.country));
    return { row: nl ?? exactCompactHits[0], reason: null };
  }

  const subsetHits = list.filter((x) => {
    const n = norm(x?.naam);
    if (!n) return false;

    const ok = isTokenSubset(n, g) || isTokenSubset(g, n);
    if (!ok) return false;

    const gTokCount = tokenSet(g).size;
    if (gTokCount >= 2) {
      const inter = intersectionCount(g, n);
      if (inter < 2) return false;
    }

    if (tokenSet(g).size === 1 && !inputPlaatsHint) return false;
    return true;
  });

  if (subsetHits.length === 1) return { row: subsetHits[0], reason: null };
  if (subsetHits.length > 1) {
    const nl = subsetHits.find((x) => isNL(x?.land ?? x?.country));
    return { row: nl ?? subsetHits[0], reason: null };
  }

  let best: any = null;
  let bestScore = -1;
  let bestSecond: any = null;
  let bestSecondScore = -1;

  for (const x of list) {
    const nameN = norm(x?.naam);
    if (!nameN) continue;

    const ov = overlapScore(g, nameN);
    const d = levenshtein(compactNorm(g), compactNorm(nameN));
    const len = Math.max(1, Math.max(compactNorm(g).length, compactNorm(nameN).length));
    const distScore = 1 - Math.min(1, d / len);

    let score = ov * 0.75 + distScore * 0.25;

    const p = normPlaats(x?.plaats ?? x?.stad ?? "");
    if (p && inputPlaatsHint.includes(p)) score += 0.12;
    if (key && nameN.includes(key)) score += 0.06;

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

  if (best && bestScore >= 0.68) {
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

export async function enrichControleBoutContext(matchmaking_id: string, controle_run_id: string) {
  if (!matchmaking_id) throw new Error("matchmaking_id ontbreekt");
  if (!controle_run_id) throw new Error("controle_run_id ontbreekt");

  const { data: ctxRows, error: cErr } = await supabaseAdmin
    .from("controle_bout_context")
    .select("bout_id, rood_gym_mm, blauw_gym_mm, evenement_datum")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);

  if (cErr) throw cErr;
  if (!ctxRows || ctxRows.length === 0) return;

  const sportscholen = await fetchAllSportscholen();

  const aliases = await fetchAllSportschoolAliases();
  const aliasNormToId = new Map<string, string>();
  const aliasCompactToId = new Map<string, string>();

  for (const a of aliases ?? []) {
    const raw = String((a as any)?.alias_text ?? "").trim();
    const sid = (a as any)?.sportschool_id;
    if (!raw || sid == null) continue;

    const n = norm(raw);
    if (!n) continue;
    const c = compactNorm(n);

    if (!aliasNormToId.has(n)) aliasNormToId.set(n, String(sid));
    if (!aliasCompactToId.has(c)) aliasCompactToId.set(c, String(sid));
  }

  const aliasMaps: AliasMaps = { aliasNormToId, aliasCompactToId };
  console.log("[enrichControleBoutContext] sportscholen loaded:", sportscholen.length);
  console.log("[enrichControleBoutContext] aliases loaded:", aliases.length);
  console.log("[enrichControleBoutContext] alias keys:", aliasNormToId.size);

  for (const row of ctxRows) {
    const bout_id = unwrapUuid((row as any).bout_id);
    if (!bout_id) continue;

    const roodGym = String((row as any).rood_gym_mm ?? "").trim();
    const blauwGym = String((row as any).blauw_gym_mm ?? "").trim();

    const roodMatch = roodGym ? findGymMatch(sportscholen, roodGym, aliasMaps) : { row: null, reason: null };
    const blauwMatch = blauwGym ? findGymMatch(sportscholen, blauwGym, aliasMaps) : { row: null, reason: null };

    const rood = roodMatch.row;
    const blauw = blauwMatch.row;

    const patch: any = {};

    // ✅ altijd MM sportschool in tekst, met marker om in UI oranje te maken
    const mmLine = (gym: string) => (gym ? `↳ [MM sportschool:] "${gym}"` : `↳ [MM sportschool:] -`);

    // ---- ROOD ----
    if (!rood) {
      patch.keurmerk_rood = null;
      patch.keurmerk_reden_rood = roodGym
        ? `${mmLine(roodGym)}\nGeen match in sportscholen. ${roodMatch.reason ?? ""}`.trim()
        : `${mmLine("")}\nGeen sportschool opgegeven.`.trim();
    } else {
      const hint = detectLandHintFromGymText(roodGym);

      const landDb = rood?.land ?? rood?.country ?? null;
      const land =
        landDb ??
        (hint === "BE" ? "België" : hint === "DE" ? "Duitsland" : hint === "NL" ? "Nederland" : null);

      const eindeIso = toIsoDateOnly(rood?.keurmerk_eind ?? rood?.keurmerk_einde ?? rood?.einde_keurmerk);

      const matchInfo =
        `${mmLine(roodGym)}\n` +
        `↳ gematcht met "${rood.naam}" (${rood.plaats ?? rood.stad ?? "?"}, ${land ?? "?"})`;

      const isForeign = (land && !isNL(land)) || hint === "BE" || hint === "DE";

      if (isForeign) {
        patch.keurmerk_rood = true;

        const be = (land && isBE(land)) || hint === "BE";
        if (be) {
          patch.keurmerk_reden_rood =
            `⚠️ België — controleer sportschool op BKMO/BKBMO site + boksboekje. Land: ${land ?? "België"}.\n` +
            matchInfo;
        } else {
          patch.keurmerk_reden_rood = `✅ Buitenland (${land ?? "onbekend"}) — NL keurmerk niet vereist.\n` + matchInfo;
        }
      } else {
        const eventDate = toIsoDateOnly((row as any).evenement_datum);

        if (!eindeIso) {
          patch.keurmerk_rood = false;
          patch.keurmerk_reden_rood = `❌ Geen keurmerk data.\n${matchInfo}`;
        } else if (!eventDate) {
          patch.keurmerk_rood = false;
          patch.keurmerk_reden_rood =
            `❌ Geen evenement datum bekend om keurmerk te valideren. Keurmerk eindigt op ${eindeIso}.\n${matchInfo}`;
        } else if (dayjs(eindeIso).isBefore(dayjs(eventDate), "day")) {
          patch.keurmerk_rood = false;
          patch.keurmerk_reden_rood =
            `❌ Geen geldig keurmerk op evenement (einde ${eindeIso}, event ${eventDate}).\n${matchInfo}`;
        } else {
          patch.keurmerk_rood = true;
          patch.keurmerk_reden_rood =
            `✅ Geldig keurmerk op evenement (einde ${eindeIso}, event ${eventDate}).\n${matchInfo}`;
        }
      }
    }

    // ---- BLAUW ----
    if (!blauw) {
      patch.keurmerk_blauw = null;
      patch.keurmerk_reden_blauw = blauwGym
        ? `${mmLine(blauwGym)}\nGeen match in sportscholen. ${blauwMatch.reason ?? ""}`.trim()
        : `${mmLine("")}\nGeen sportschool opgegeven.`.trim();
    } else {
      const hint = detectLandHintFromGymText(blauwGym);

      const landDb = blauw?.land ?? blauw?.country ?? null;
      const land =
        landDb ??
        (hint === "BE" ? "België" : hint === "DE" ? "Duitsland" : hint === "NL" ? "Nederland" : null);

      const eindeIso = toIsoDateOnly(blauw?.keurmerk_eind ?? blauw?.keurmerk_einde ?? blauw?.einde_keurmerk);

      const matchInfo =
        `${mmLine(blauwGym)}\n` +
        `↳ gematcht met "${blauw.naam}" (${blauw.plaats ?? blauw.stad ?? "?"}, ${land ?? "?"})`;

      const isForeign = (land && !isNL(land)) || hint === "BE" || hint === "DE";

      if (isForeign) {
        patch.keurmerk_blauw = true;

        const be = (land && isBE(land)) || hint === "BE";
        if (be) {
          patch.keurmerk_reden_blauw =
            `⚠️ België — controleer sportschool op BKBMO site + boksboekje. Land: ${land ?? "België"}.\n` +
            matchInfo;
        } else {
          patch.keurmerk_reden_blauw = `✅ Buitenland (${land ?? "onbekend"}) — NL keurmerk niet vereist.\n` + matchInfo;
        }
      } else {
        const eventDate = toIsoDateOnly((row as any).evenement_datum);

        if (!eindeIso) {
          patch.keurmerk_blauw = false;
          patch.keurmerk_reden_blauw = `❌ Geen keurmerk data.\n${matchInfo}`;
        } else if (!eventDate) {
          patch.keurmerk_blauw = false;
          patch.keurmerk_reden_blauw =
            `❌ Geen evenement datum bekend om keurmerk te valideren. Keurmerk eindigt op ${eindeIso}.\n${matchInfo}`;
        } else if (dayjs(eindeIso).isBefore(dayjs(eventDate), "day")) {
          patch.keurmerk_blauw = false;
          patch.keurmerk_reden_blauw =
            `❌ Geen geldig keurmerk op evenement (einde ${eindeIso}, event ${eventDate}).\n${matchInfo}`;
        } else {
          patch.keurmerk_blauw = true;
          patch.keurmerk_reden_blauw =
            `✅ Geldig keurmerk op evenement (einde ${eindeIso}, event ${eventDate}).\n${matchInfo}`;
        }
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
}