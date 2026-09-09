// Matchmaker eindcontrole: geen full/Total scrape meer.
//
// De laatste matchmakercontrole heeft alleen actuele FightPassport-data nodig voor:
// - licentie
// - Fit to fight / startverbod
// - huidige sportschool + keurmerk
//
// Die lichte scrape draait direct hierna via scraper_fp_matchmaker_school.js,
// die dezelfde bewezen scraper-engine gebruikt als Officials. Deze entrypoint
// blijft bewust bestaan zodat de bestaande eindcontrole-route niet breekt.

console.log("[fp-matchmaker] lichte eindcontrole: full/Total scrape overgeslagen; licentie/startverbod/keurmerk volgt in lichte pass.");
