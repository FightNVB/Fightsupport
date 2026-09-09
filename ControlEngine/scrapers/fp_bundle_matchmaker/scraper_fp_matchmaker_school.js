// Matchmaker lichte eindcontrole.
//
// De matchmaker heeft in de laatste controle dezelfde actuele FightPassport-checks
// nodig als Officials:
// - licentie Ja/Nee
// - Fit to fight / startverbod
// - huidige sportschool + keurmerk
//
// De route geeft al matchmaking_id, controle_run_id en de VA-nummers mee.
// Daarom hergebruiken we hier rechtstreeks de stabiele Officials-scraper.
// De verwerking daarna blijft volledig matchmaker-eigen via lib/matchmaker/*.

await import("../fp_bundle_officials/scraper_fp_officials.js");
