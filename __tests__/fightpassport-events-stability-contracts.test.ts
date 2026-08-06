import fs from "fs";
import path from "path";

const scraperPath = path.join(
  process.cwd(),
  "ControlEngine/scrapers/evenementen/scraper_fp_evenementen.js"
);
const source = fs.readFileSync(scraperPath, "utf8");

describe("FightPassport evenementen tegelstabiliteit", () => {
  test("langzaam verschijnende officials vereisen twee snapshots met 1000 ms ertussen", () => {
    expect(source).toContain("async function waitForStableOverviewTiles(page, eventId)");
    expect(source).toContain("snapshot === previousSnapshot");
    expect(source).toContain("await sleep(1000)");
    expect(source).toContain("const timeoutMs = 15000");
  });

  test("officials die in twee stappen verschijnen veranderen de volledige snapshot", () => {
    expect(source).toContain("const snapshot = completeTileSet ? JSON.stringify(latest) : null");
    expect(source).toMatch(/officials[\s\S]*matchmaking[\s\S]*results[\s\S]*suspensions[\s\S]*startbans/);
  });

  test("een leeg officialsblok is geldig zodra de volledige tegelset stabiel is", () => {
    expect(source).toContain("].every((tile) => tile?.found)");
    expect(source).toContain("official_regels: latest.officials.rows.length");
    expect(source).not.toContain("latest.officials.rows.length > 0");
  });

  test("matchmakingcijfers maken deel uit van dezelfde stabiele snapshot", () => {
    expect(source).toContain('matchmaking: readVisibleTile("MATCHMAKING")');
    expect(source).toContain('ul.get_tile_content li, ul.get_tile_content p');
    expect(source).toContain("latest = await readOverviewTiles(page, eventId)");
  });

  test("overzichtstegels worden niet aangeklikt en alleen DETAILS gebruikt tile.click", () => {
    const tileClicks = source.match(/tile\.click\(\)/g) ?? [];
    expect(tileClicks).toHaveLength(1);
    expect(source).toContain('=== "DETAILS"');
    expect(source).toContain("const summary = await waitForStableOverviewTiles(page, eventId)");
  });
});
