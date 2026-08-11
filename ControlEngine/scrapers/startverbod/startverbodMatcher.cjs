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

  for (const fighter of fighters) {
    const sourceName = String(fighter.naam ?? "");
    addToIndex(literal, sourceName, fighter);
  }

  return { literal };
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

  return { status: "not_found", candidates: [], method: "literal" };
}

function findCandidateFighters(naam, indexes, confirmedDeletedVaNumbers = new Set()) {
  const sourceName = String(naam ?? "");
  const literal = uniqueByVa(indexes.literal.get(sourceName) ?? []);

  return literal.filter(
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
      method: "fightpassport_profielsamenvatting_startverbod",
    };
  }

  return {
    status: verified.length > 1 ? "duplicate_startverbod" : "not_verified_in_fightpassport",
    candidates,
    verifications,
    method: "fightpassport_profielsamenvatting_startverbod",
  };
}

module.exports = {
  buildFighterIndexes,
  findCandidateFighters,
  matchFighter,
  resolveVerifiedCandidates,
};
