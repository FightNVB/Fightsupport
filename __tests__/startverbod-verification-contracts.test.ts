import fs from "fs";
import path from "path";

describe("startverbod Fightpaspoort-verificatiecontract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "ControlEngine/scrapers/startverbod/startverbodVerification.js"),
    "utf8"
  );

  test("controleert tegel en dialoogkoppen", () => {
    expect(source).toContain('.tileHeader.enabled');
    expect(source).toContain('"STARTVERBODEN"');
    expect(source).toContain('.dialog_header .koptekst1');
    expect(source).toContain('Startverboden lijst');
    expect(source).toContain('.dialog_header .koptekst2');
  });

  test("selecteert Startverbod-regels met dubbelklik en niet blind de eerste", () => {
    expect(source).toContain('width:110px');
    expect(source).toContain('"Schorsing"');
    expect(source).toContain('MouseEvent("dblclick"');
    expect(source).toContain('for (let index = 0; index < rowCount; index++)');
  });

  test("leest detailvelden op CSS-class en geselecteerde redentekst", () => {
    for (const selector of [
      "dddiscstartblokkade",
      "dddisceindblokkade",
      "dvomsdiscblokkade",
      "dvdiscblokkadeopm",
      "ddaangemaakt",
      "dvaanmakerfriendlyname",
      "ddmutatie",
      "dvmuteerderfriendlyname",
      "selectedOptions",
    ]) expect(source).toContain(selector);
  });
});
