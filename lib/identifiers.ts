export const FP_COL = "fp_nummer" as const;

// Voor UX (kan je later aanpassen)
export const FP_INPUT_LABEL = "VA-nummer (Fightpaspoortnummer / FP)" as const;

export function normalizeId(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s) return null;

  // optioneel: spaties en rare tekens minimaliseren
  return s.replace(/\s+/g, "");
}

// handig voor queries: haal id uit verschillende payload-vormen
export function pickFpFromPayload(payload: any): string | null {
  return (
    normalizeId(payload?.fp_nummer) ??
    normalizeId(payload?.va_nummer) ??
    normalizeId(payload?.va) ??
    normalizeId(payload?.nvb_nummer) ??
    null
  );
}
