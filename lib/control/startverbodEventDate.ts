/** Een startverbod geldt tot en met de gescrapete einddatum. */
export function startverbodOnEventDate(
  rows: Array<{ ingang?: string | null; einde?: string | null; is_actueel?: boolean | null }>,
  eventDate: string | null,
  fallback: boolean | null,
): boolean | null {
  const date = eventDate?.slice(0, 10);
  if (!date || rows.length === 0) return fallback;
  return rows.some(row => {
    if (row.is_actueel === false) return false;
    const start = row.ingang?.slice(0, 10);
    const end = row.einde?.slice(0, 10);
    return !!start && start <= date && (!end || date <= end);
  });
}
