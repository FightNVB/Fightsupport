// Matchmaker lichte eindcontrole.
//
// De eindcontrole gebruikt dezelfde actuele FightPassport-checks als Officials:
// - licentie Ja/Nee
// - Fit to fight / startverbod
// - huidige sportschool + keurmerk
//
// De eindcontrole-route geeft matchmaking_id, controle_run_id en alle VA-nummers
// als argv mee. De verwerking na de scrape blijft in de gewone lib/control-keten.

await import("../fp_bundle_officials/scraper_fp_officials.js");
