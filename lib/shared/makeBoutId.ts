// lib/shared/makeBoutId.ts

/**
 * Bout-ID (stabiel / immutable) op basis van bout_uid (uuid).
 *
 * Waarom:
 * - partij_nr kan wijzigen (hernummering)
 * - dispensatie status moet aan dezelfde bout-slot blijven hangen
 * - VA-paar kan wijzigen door vervanging en kan botsen bij rematch/toernooi
 *
 * Daarom is bout_uid (uuid) in matchmaking_bouts_raw de waarheid.
 */
export function makeBoutId(bout_uid: any): string | null {
  const id = String(bout_uid ?? "").trim();
  if (!id) return null;

  // simpele uuid-check (laat ook bestaande strings toe)
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  // Als het geen uuid lijkt: toch teruggeven (soms gebruik je tijdelijk een andere sleutel)
  // Wil je dit strict maken? vervang de return door: return uuidLike ? id : null;
  return uuidLike ? id : id;
}
