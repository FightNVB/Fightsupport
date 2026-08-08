import fs from "fs";
import path from "path";

describe("operationele grens tussen actuele sync en dossierhistorie", () => {
  const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");
  const historical = read("ControlEngine/scrapers/historical_startverbod/scraper_historical_startverbod.js");
  const current = read("ControlEngine/scrapers/startverbod/scraper_startverbod.js");
  const total = read("ControlEngine/scrapers/fp_total/scraper_fp_total.js");

  test("historische scraper schrijft uitsluitend naar historische tabellen", () => {
    const writeTables = [...historical.matchAll(/\.from\("([^"]+)"\)/g)].map((match) => match[1]);
    expect(new Set(writeTables)).toEqual(new Set([
      "fighter_startverbod_history",
      "fighter_startverbod_history_items",
      "fighter_startverbod_history_runs",
    ]));
    expect(historical).not.toContain('.from("fightpassport_fighters")');
    expect(historical).not.toContain('.from("startverbod")');
  });

  test("actuele sync en Total bewaren elk hun operationele bronstatus", () => {
    expect(current).toContain("syncOperationalStartverbodStatus");
    expect(current).toContain("heeft_startverbod_actuele_sync: false");
    expect(current).toContain("heeft_startverbod_actuele_sync: true");
    expect(total).toContain("const totalStartverbod = !!all.summary.heeft_startverbod");
    expect(total).toContain("heeft_startverbod_total: totalStartverbod");
    expect(total).toContain('startverbod_status_source: actualSyncIsRecent ? "actuele_excel_sync" : "total_profielsamenvatting"');
  });

  test("actuele vlag wordt niet herbouwd wanneer er koppelfouten zijn", () => {
    expect(current).toContain("if (errors.length === 0)");
  });
});
