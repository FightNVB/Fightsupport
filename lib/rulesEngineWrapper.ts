// Centrale guard vóór de bestaande rulesEngine.
// Een TBA/lege hoek is geen vechter en mag daarom geen persoonsregels krijgen.
// De bestaande engine bepaalt aanwezigheid o.a. aan de hand van VA-velden; null
// kon daarbij als de tekst "null" worden gezien. Hier normaliseren we alle VA-
// kandidaten eerst naar een echt numeriek VA of een lege string.

import { rulesEngine as baseRulesEngine } from "./rulesEngine";

function validVa(value: any): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : "";
}

function normalizeRow(row: any) {
  if (!row || typeof row !== "object") return row;
  const next = { ...row };

  for (const side of ["rood", "blauw"] as const) {
    const mmKey = `${side}_va_mm`;
    const plainKey = side === "rood" ? "va_rood" : "va_blauw";
    const legacyKey = `${side}_va`;
    const fpKey = `${side}_va_fp`;
    const scrapeKey = `${side}_va_scrape`;
    const fighterKey = `${side}_fighter_id`;

    next[mmKey] = validVa(next[mmKey]);
    next[plainKey] = validVa(next[plainKey]);
    next[legacyKey] = validVa(next[legacyKey]);
    next[fpKey] = validVa(next[fpKey]);
    next[scrapeKey] = validVa(next[scrapeKey]);
    next[fighterKey] = validVa(next[fighterKey]);
  }

  return next;
}

export async function rulesEngine(opts: Parameters<typeof baseRulesEngine>[0]) {
  const ctxRows = Array.isArray((opts as any)?.ctxRows)
    ? (opts as any).ctxRows.map(normalizeRow)
    : (opts as any)?.ctxRows
      ? [normalizeRow((opts as any).ctxRows)]
      : [];

  return baseRulesEngine({ ...(opts as any), ctxRows });
}
