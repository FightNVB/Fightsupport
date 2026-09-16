// lib/control/pairingIdentity.ts
// Admin-owned helper. Intentionally duplicated instead of shared with Matchmaker/Officials.
// A bout's cross-run identity is the unordered pair of VA numbers inside one matchmaking.
// partij_nr, corner order and technical bout UUID are explicitly NOT part of this identity.

function normalizeVa(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

export function adminPairingIdentity(matchmakingId: unknown, vaA: unknown, vaB: unknown): string | null {
  const mm = String(matchmakingId ?? "").trim();
  const a = normalizeVa(vaA);
  const b = normalizeVa(vaB);
  if (!mm || !a || !b) return null;
  const [first, second] = [a, b].sort((x, y) => x.localeCompare(y, "en", { numeric: true }));
  return `${mm}|${first}|${second}`;
}

export function sameAdminPairing(args: {
  matchmakingId: unknown;
  previousVaA: unknown;
  previousVaB: unknown;
  currentVaA: unknown;
  currentVaB: unknown;
}) {
  const previous = adminPairingIdentity(args.matchmakingId, args.previousVaA, args.previousVaB);
  const current = adminPairingIdentity(args.matchmakingId, args.currentVaA, args.currentVaB);
  return !!previous && previous === current;
}
