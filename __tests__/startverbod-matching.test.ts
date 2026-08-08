const { buildFighterIndexes, matchFighter } = require(
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
    const result = match("  O NEIL - ISA  ", [{ va_nummer: 42, naam: "O'Neil, Isa" }]);
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
      { va_nummer: 784, naam: "Kucin-Isa" },
    ]);
    expect(result.status).toBe("duplicate");
    expect(result.candidates.map((fighter: Fighter) => fighter.naam)).toEqual([
      "Kucin, Isa",
      "Kucin-Isa",
    ]);
  });
});
