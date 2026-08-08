const {
  historyFingerprint,
  mergeHistoryRecord,
  parseHistoricalRows,
} = require("../ControlEngine/scrapers/historical_startverbod/historicalStartverbodCore.cjs");

describe("historische Startverbod/Schorsing-synchronisatie", () => {
  test("leest Startverbod en Schorsing en negeert filler rows", () => {
    const rows = parseHistoricalRows([
      { filler: false, columns: ["Startverbod", "29-06-2024", "10-08-2024", "Alam, A", "Overige", "", ""] },
      { filler: true, columns: ["", "", "", "", "", "", ""] },
      { filler: false, columns: ["Schorsing", "01-08-2026", "", "Bond", "Administratief", "Gala", ""] },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((row: any) => row.soort)).toEqual(["Startverbod", "Schorsing"]);
    expect(rows[1].einde).toBeNull();
    expect(rows[0].evenement).toBeNull();
    expect(rows[1].eventdatum).toBeNull();
  });

  test("fingerprint dedupliceert een herhaalde scrape", () => {
    const row = { soort: "Startverbod", ingang: "2024-06-29", einde: null, door: "Alam, A", reden: "Overige", evenement: null, eventdatum: null };
    expect(historyFingerprint(6757, row)).toBe(historyFingerprint(6757, { ...row }));
    expect(historyFingerprint(6757, row)).not.toBe(historyFingerprint(784, row));
  });

  test("latere details werken dezelfde basisregel bij zonder fingerprint te wijzigen", () => {
    const row = { soort: "Schorsing", ingang: "2026-08-01", einde: null, door: "Bond", reden: null, evenement: null, eventdatum: null };
    const fingerprint = historyFingerprint(42, row);
    const merged = mergeHistoryRecord(row, {
      reden: "Overige", opmerkingen: "Historische toelichting",
      aangemaakt_op: "01-08-2026", aangemaakt_door: "Beheerder",
      gewijzigd_op: "02-08-2026", gewijzigd_door: "Controleur",
    });
    expect(merged.opmerkingen).toBe("Historische toelichting");
    expect(merged.aangemaakt_door).toBe("Beheerder");
    expect(merged.gewijzigd_door).toBe("Controleur");
    expect(historyFingerprint(42, row)).toBe(fingerprint);
  });
});
