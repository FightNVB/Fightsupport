import fs from "fs";
import path from "path";

describe("historische scraper- en dashboardcontracten", () => {
  const pageSource = fs.readFileSync(path.join(process.cwd(), "ControlEngine/scrapers/historical_startverbod/scrapeHistoricalStartverbodPage.js"), "utf8");
  const dashboardSource = fs.readFileSync(path.join(process.cwd(), "app/dashboard/admin/fightpassport-beheer/page.tsx"), "utf8");

  test("opent details opnieuw via een stabiele rij-identiteit en sluit de overview", () => {
    expect(pageSource).toContain('tr.flexlist_row:not(.filler)');
    expect(pageSource).toContain('MouseEvent("dblclick"');
    expect(pageSource).toContain('button.sluit_scherm.overview.hover.general_image');
    expect(pageSource).toContain('for (const base of rows)');
    expect(pageSource).toContain('openStableRow(page, base)');
  });

  test("leest opmerkingen en auditvelden via CSS-klassen", () => {
    for (const selector of ["dvdiscblokkadeopm", "ddaangemaakt", "dvaanmakerfriendlyname", "ddmutatie", "dvmuteerderfriendlyname", "selectedOptions"]) {
      expect(pageSource).toContain(selector);
    }
  });

  test("dashboard onderscheidt actuele en historische synchronisatie", () => {
    expect(dashboardSource).toContain("Actuele startverboden & schorsingen");
    expect(dashboardSource).toContain("Historische startverboden &amp; schorsingen");
    expect(dashboardSource).toContain("Volledige historische synchronisatie");
    expect(dashboardSource).toContain("Foutdetails historische synchronisatie");
  });
});
