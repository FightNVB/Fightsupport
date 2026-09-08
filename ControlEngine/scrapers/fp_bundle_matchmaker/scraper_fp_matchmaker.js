// Matchmaker FULL scraper entrypoint.
//
// Bewust een eigen scraperbestand/bundle voor de matchmaker-eindcontrole.
// De volledige scrape-engine is dezelfde bewezen Total-engine; deze entrypoint
// houdt de matchmaker los van admin/official zodat de route en defaults per rol
// afzonderlijk kunnen worden aangepast zonder de official gameday-scraper te raken.
//
// Scope wordt uitsluitend via FP_TOTAL_VA_LIST aangeleverd door
// /api/matchmaker/eindcontrole/start.

process.env.FP_TOTAL_RUN_KIND = process.env.FP_TOTAL_RUN_KIND || "retry";
process.env.FP_TOTAL_RESULTS = process.env.FP_TOTAL_RESULTS || "true";
process.env.FP_SKIP_RUN_TERMINATOR = process.env.FP_SKIP_RUN_TERMINATOR || "true";

await import("../fp_total/scraper_fp_total.js");
