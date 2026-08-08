function normalizeNameForFallback(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´.,-]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g)?.sort().join("") ?? "";
}

function uniqueByVa(rows) {
  return [...new Map(rows.map((row) => [String(row.va_nummer), row])).values()];
}

function addToIndex(index, key, fighter) {
  if (!key) return;
  const rows = index.get(key) ?? [];
  rows.push(fighter);
  index.set(key, rows);
}

function buildFighterIndexes(fighters) {
  const literal = new Map();
  const fallback = new Map();

  for (const fighter of fighters) {
    const sourceName = String(fighter.naam ?? "");
    addToIndex(literal, sourceName, fighter);
    addToIndex(fallback, normalizeNameForFallback(sourceName), fighter);
  }

  return { literal, fallback };
}

function resolveCandidates(candidates, method, confirmedDeletedVaNumbers) {
  const allCandidates = uniqueByVa(candidates);
  const activeCandidates = allCandidates.filter(
    (fighter) => !confirmedDeletedVaNumbers.has(String(fighter.va_nummer))
  );

  if (activeCandidates.length === 1) {
    return { status: "matched", fighters: activeCandidates, candidates: allCandidates, method };
  }

  if (activeCandidates.length > 1) {
    return {
      status: "duplicate",
      candidates: activeCandidates,
      all_candidates: allCandidates,
      method,
    };
  }

  return {
    status: allCandidates.length ? "duplicate" : "not_found",
    candidates: allCandidates,
    method,
  };
}

function matchFighter(naam, indexes, confirmedDeletedVaNumbers = new Set()) {
  const sourceName = String(naam ?? "");
  const literalMatches = uniqueByVa(indexes.literal.get(sourceName) ?? []);
  if (literalMatches.length) {
    return resolveCandidates(literalMatches, "literal", confirmedDeletedVaNumbers);
  }

  const fallbackMatches = uniqueByVa(
    indexes.fallback.get(normalizeNameForFallback(sourceName)) ?? []
  );
  if (fallbackMatches.length) {
    return resolveCandidates(fallbackMatches, "normalized", confirmedDeletedVaNumbers);
  }

  return { status: "not_found", candidates: [], method: null };
}

function findCandidateFighters(naam, indexes, confirmedDeletedVaNumbers = new Set()) {
  const sourceName = String(naam ?? "");
  const literal = uniqueByVa(indexes.literal.get(sourceName) ?? []);
  const selected = literal.length
    ? literal
    : uniqueByVa(indexes.fallback.get(normalizeNameForFallback(sourceName)) ?? []);
  return selected.filter(
    (fighter) => !confirmedDeletedVaNumbers.has(String(fighter.va_nummer))
  );
}

function resolveVerifiedCandidates(candidates, verifications) {
  const verified = verifications.filter((result) => result?.verified === true);
  if (verified.length === 1) {
    return {
      status: "matched",
      fighters: [verified[0].fighter],
      verification: verified[0],
      candidates,
      method: "fightpassport_startverbod",
    };
  }
  return {
    status: verified.length > 1 ? "duplicate" : "not_verified_in_fightpassport",
    candidates,
    verifications,
    method: "fightpassport_startverbod",
  };
}

function parseDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!match) return null;
  let year = match[3];
  if (year.length === 2) year = Number(year) < 30 ? `20${year}` : `19${year}`;
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function samePersonName(left, right) {
  const tokens = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g)?.sort() ?? [];
  const a = tokens(left);
  const b = tokens(right);
  return a.length > 0 && a.length === b.length && a.every((token, index) => token === b[index]);
}

function detailsMatchExcel(excelRow, profileName, detail) {
  if (!samePersonName(excelRow.naam_bron, profileName)) return false;
  if (String(excelRow.soort ?? "").trim().toLowerCase() !==
      String(detail.soort ?? "").trim().toLowerCase()) return false;
  if (parseDate(excelRow.ingang) !== parseDate(detail.ingang)) return false;
  const excelEnd = parseDate(excelRow.einde);
  const detailEnd = parseDate(detail.einde);
  if (excelEnd && excelEnd !== detailEnd) return false;
  return true;
}

module.exports = {
  buildFighterIndexes,
  findCandidateFighters,
  detailsMatchExcel,
  matchFighter,
  normalizeNameForFallback,
  resolveVerifiedCandidates,
  samePersonName,
};
