/**
 * Houd deze helper voorlopig aan voor oudere imports,
 * maar in buildControleBoutContext gebruiken we hem niet meer.
 */
export function makeBoutId(bout_uid: any): string | null {
  const id = String(bout_uid ?? "").trim();
  return id || null;
}