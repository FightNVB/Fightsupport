// lib/matchmaker/pairingIdentity.ts
// Matchmaker-owned helper. Intentionally not shared with Admin/Officials.
// A bout's cross-run identity is the unordered pair of VA numbers inside one matchmaking.
// partij_nr, corner order and technical bout UUID are explicitly NOT part of this identity.

function normalizeVa(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

export function matchmakerPairingIdentity(matchmakingId: unknown, vaA: unknown, vaB: unknown): string | null {
  const mm = String(matchmakingId ?? "").trim();
  const a = normalizeVa(vaA);
  const b = normalizeVa(vaB);
  if (!mm || !a || !b) return null;
  const [first, second] = [a, b].sort((x, y) => x.localeCompare(y, "en", { numeric: true }));
  return `${mm}|${first}|${second}`;
}

export function sameMatchmakerPairing(args: {
  matchmakingId: unknown;
  previousVaA: unknown;
  previousVaB: unknown;
  currentVaA: unknown;
  currentVaB: unknown;
}) {
  const previous = matchmakerPairingIdentity(args.matchmakingId, args.previousVaA, args.previousVaB);
  const current = matchmakerPairingIdentity(args.matchmakingId, args.currentVaA, args.currentVaB);
  return !!previous && previous === current;
}
