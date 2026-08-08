const {
  buildFighterIndexes,
  detailsMatchExcel,
  findCandidateFighters,
  matchFighter,
  resolveVerifiedCandidates,
} = require(
  "../ControlEngine/scrapers/startverbod/startverbodMatcher.cjs"
);

type Fighter = { va_nummer: number; naam: string; heeft_startverbod?: boolean };

function match(name: string, fighters: Fighter[], deleted: string[] = []) {
  return matchFighter(name, buildFighterIndexes(fighters), new Set(deleted));
}

describe("startverbod Fightpaspoortnaam-koppeling", () => {
  test("Kucin, Isa wint letterlijk van Kucin, I", () => {
    const result = match("Kucin, Isa", [
      { va_nummer: 6757, naam: "Kucin, Isa" },
      { va_nummer: 784, naam: "Kucin, I" },
    ]);
    expect(result.status).toBe("matched");
    expect(result.method).toBe("literal");
    expect(result.fighters.map((fighter: Fighter) => fighter.va_nummer)).toEqual([6757]);
  });

  test("dezelfde letterlijke naam op twee VA-nummers blijft duplicate", () => {
    const result = match("Kucin, Isa", [
      { va_nummer: 6757, naam: "Kucin, Isa", heeft_startverbod: true },
      { va_nummer: 784, naam: "Kucin, Isa", heeft_startverbod: false },
    ]);
    expect(result.status).toBe("duplicate");
    expect(result.candidates).toHaveLength(2);
  });

  test("koppelt één veilige genormaliseerde match als letterlijk niets past", () => {
    const result = match("  KUCIN,   ISA ", [{ va_nummer: 6757, naam: "Kucin, Isa" }]);
    expect(result.status).toBe("matched");
    expect(result.method).toBe("normalized");
    expect(result.fighters[0].va_nummer).toBe(6757);
  });

  test("een initiaal wordt niet gelijkgesteld aan een volledige voornaam", () => {
    expect(match("Kucin, Isa", [{ va_nummer: 784, naam: "Kucin, I" }]).status).toBe(
      "not_found"
    );
  });

  test("hoofdletters, spaties en leestekens kunnen via fallback matchen", () => {
    const result = match("  O'NEIL - ISA  ", [{ va_nummer: 42, naam: "O'Neil, Isa" }]);
    expect(result.status).toBe("matched");
    expect(result.method).toBe("normalized");
  });

  test("bevestigd verwijderde kandidaat verstoort opgeloste koppeling niet", () => {
    const result = match(
      "Bestaand, Opgelost",
      [
        { va_nummer: 10, naam: "Bestaand, Opgelost" },
        { va_nummer: 11, naam: "Bestaand, Opgelost" },
      ],
      ["11"]
    );
    expect(result.status).toBe("matched");
    expect(result.fighters[0].va_nummer).toBe(10);
  });

  test("duplicate-kandidaten behouden hun werkelijke interne namen", () => {
    const result = match("KUCIN ISA", [
      { va_nummer: 6757, naam: "Kucin, Isa" },
      { va_nummer: 784, naam: "Kucin Isa" },
    ]);
    expect(result.status).toBe("duplicate");
    expect(result.candidates.map((fighter: Fighter) => fighter.naam)).toEqual([
      "Kucin, Isa",
      "Kucin Isa",
    ]);
  });

  test("Fightpaspoort-details kiezen uniek de Kucin-kandidaat met juiste ingangsdatum", () => {
    const fighters = [
      { va_nummer: 6757, naam: "Kucin, Isa" },
      { va_nummer: 784, naam: "Kucin, Isa" },
    ];
    const result = resolveVerifiedCandidates(fighters, [
      { verified: true, fighter: fighters[0], profileName: "Isa Kucin", detail: { ingang: "23-09-2017" } },
      { verified: false, fighter: fighters[1], reason: "no_matching_startverbod" },
    ]);
    expect(result.status).toBe("matched");
    expect(result.fighters[0].va_nummer).toBe(6757);
    expect(result.method).toBe("fightpassport_startverbod");
  });

  test("twee werkelijk bevestigde kandidaten blijven duplicate", () => {
    const fighters = [
      { va_nummer: 1, naam: "Dubbel, Dee" },
      { va_nummer: 2, naam: "Dubbel, Dee" },
    ];
    expect(resolveVerifiedCandidates(fighters, fighters.map((fighter) => ({
      verified: true, fighter,
    }))).status).toBe("duplicate");
  });

  test.each([
    "startverboden_tile_missing",
    "navigation_timeout",
    "no_matching_startverbod",
  ])("niet-bevestigde kandidaat (%s) wordt geen koppeling", (reason) => {
    const fighter = { va_nummer: 1, naam: "Test, Tina" };
    const result = resolveVerifiedCandidates([fighter], [{ verified: false, fighter, reason }]);
    expect(result.status).toBe("not_verified_in_fightpassport");
  });

  test("meerdere details onderscheiden op ingangsdatum en accepteren een lege einddatum", () => {
    const excel = { naam_bron: "Isa Kucin", soort: "Startverbod", ingang: "2017-09-23", einde: null };
    expect(detailsMatchExcel(excel, "Isa Kucin", { soort: "Startverbod", ingang: "22-09-2017", einde: "" })).toBe(false);
    expect(detailsMatchExcel(excel, "Isa Kucin", { soort: "Startverbod", ingang: "23-09-2017", einde: "" })).toBe(true);
  });

  test("initiaal blijft ook bij profielnaamverificatie verschillend van volledige voornaam", () => {
    expect(detailsMatchExcel(
      { naam_bron: "Isa Kucin", soort: "Startverbod", ingang: "2017-09-23" },
      "I Kucin",
      { soort: "Startverbod", ingang: "23-09-2017" }
    )).toBe(false);
  });

  test("Startverbod en Schorsing worden binnen dezelfde lijst op soort onderscheiden", () => {
    const excel = { naam_bron: "Isa Kucin", soort: "Schorsing", ingang: "2017-09-23" };
    expect(detailsMatchExcel(excel, "Isa Kucin", {
      soort: "Startverbod", ingang: "23-09-2017",
    })).toBe(false);
    expect(detailsMatchExcel(excel, "Isa Kucin", {
      soort: "Schorsing", ingang: "23-09-2017",
    })).toBe(true);
  });

  test("kandidaatselectie gebruikt oorspronkelijke Fightpaspoortnamen", () => {
    const fighters = [
      { va_nummer: 1, naam: "Kucin, Isa" },
      { va_nummer: 2, naam: "Kucin, I" },
    ];
    expect(findCandidateFighters("Kucin, Isa", buildFighterIndexes(fighters)).map(
      (fighter: Fighter) => fighter.naam
    )).toEqual(["Kucin, Isa"]);
  });

  test("omgekeerde weergavevolgorde levert kandidaten maar geen nieuwe identiteit", () => {
    const fighters = [
      { va_nummer: 6757, naam: "Kucin, Isa" },
      { va_nummer: 784, naam: "Kucin, I" },
    ];
    expect(findCandidateFighters("Isa Kucin", buildFighterIndexes(fighters)).map(
      (fighter: Fighter) => fighter.va_nummer
    )).toEqual([6757]);
  });
});
