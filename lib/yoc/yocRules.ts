// lib/yoc/yocRules.ts
// Backwards-compatible helper voor bestaande /api/yoc/[yocId]/rules route.

import { type AnyRow } from "./yocUtils";
import { runYocFighterRules } from "./yocFighterRules";

export function buildYocResults(ctx: AnyRow) {
  return runYocFighterRules({
    ...ctx,
    // Resultaten worden gekoppeld via fighter_raw_id en va_nummer.
    // yoc_resultaten heeft bewust geen yoc_fighter_id kolom.
  }).filter((hit) => hit.resultaat !== "ok");
}

export { runYocFighterRules };
