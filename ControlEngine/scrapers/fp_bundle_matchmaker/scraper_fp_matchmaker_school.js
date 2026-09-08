// Matchmaker sportschool-bewijspass.
//
// Deze pass hoort ALLEEN bij de matchmaker-eindcontrole en wordt na de full
// scrape gedraaid om de actuele SPORTSCHOLEN-tegel uit FightPassport te lezen.
// De uitkomst komt in controle_fighter_actueel en is alleen een aanwijzing voor
// enrich; de sportschool uit de matchmaking blijft de harde waarheid waarvan
// het keurmerk op de eventdatum moet worden gevonden.
//
// We hergebruiken bewust de stabiele tile-reader/session-flow van fp_mm zolang
// die dezelfde SPORTSCHOLEN-implementatie heeft als de official scraper.

await import("../fp_mm/scraper_fp_mm.js");
