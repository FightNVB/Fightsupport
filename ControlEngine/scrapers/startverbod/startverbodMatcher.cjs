function normalizeNameForFallback(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
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

module.exports = { buildFighterIndexes, matchFighter, normalizeNameForFallback };
