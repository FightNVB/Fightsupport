// Matchmaker-guard vóór de bestaande rulesEngine.
// TBA/lege hoeken zijn nog geen vechters. Alleen echte numerieke VA's blijven
// in de VA-kandidaten staan; een echte naam zonder VA blijft daarna bewust door
// de rulesEngine lopen zodat FIGHTPASPOORT_ONTBREEKT voor die vechter zichtbaar is.

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
