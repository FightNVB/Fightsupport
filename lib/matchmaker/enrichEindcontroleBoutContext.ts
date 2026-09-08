// Matchmaker eindcontrole-enrich.
//
// De gewone matchmaker-flow blijft zijn bestaande enrich gebruiken.
// Alleen de EINDCONTROLE heeft na de full scrape ook een verse SPORTSCHOLEN-
// tegel per VA. Daarom combineren we hier beide lagen:
// 1) matchmaker enrich: MM-naam + aliases + VA-koppelingen + laatste uitslag;
// 2) control enrich: actuele SPORTSCHOLEN-tegel als extra bewijs.
//
// De sportschool uit de matchmaking blijft altijd het doel/de harde waarheid.
// Live FP-sportschool en laatste uitslag mogen alleen helpen om precies die
// MM-sportschool betrouwbaar in de sportscholen/keurmerkdata te identificeren.

import { enrichControleBoutContext as enrichMatchmaker } from "@/lib/matchmaker/enrichControleBoutContext";
import { enrichControleBoutContext as enrichWithLiveSportschool } from "@/lib/control/enrichControleBoutContext";

export async function enrichEindcontroleBoutContext(
  matchmaking_id: string,
  controle_run_id: string,
  opts?: { partij_nr?: number | null; bout_id?: string | null },
) {
  // Eerst alle matchmaker-aanwijzingen (incl. laatste uitslag) laten meewegen.
  await enrichMatchmaker(matchmaking_id, controle_run_id, opts);

  // Daarna de verse SPORTSCHOLEN-tegel als extra/actuelere aanwijzing.
  // De control-enrich accepteert live alleen als die duidelijk bij de
  // MM-sportschool hoort; hij vervangt dus nooit blind de MM-sportschool.
  await enrichWithLiveSportschool(matchmaking_id, controle_run_id, opts);
}
