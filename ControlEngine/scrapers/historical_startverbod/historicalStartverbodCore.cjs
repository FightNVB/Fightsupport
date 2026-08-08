const crypto = require("crypto");

function clean(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseNlDate(value) {
  const text = clean(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!match) return null;
  let year = match[3];
  if (year.length === 2) year = Number(year) < 30 ? `20${year}` : `19${year}`;
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function parseHistoricalRows(rows) {
  return (rows ?? []).filter((row) => !row.filler).map((row) => {
    const columns = (row.columns ?? []).map(clean);
    const soort = columns[0];
    if (!["Startverbod", "Schorsing"].includes(soort)) return null;
    return {
      soort,
      ingang: parseNlDate(columns[1]),
      einde: parseNlDate(columns[2]),
      door: columns[3] || null,
      reden: columns[4] || null,
      evenement: columns[5] || null,
      eventdatum: parseNlDate(columns[6]),
    };
  }).filter((row) => row?.ingang);
}

function historyFingerprint(vaNummer, row) {
  return crypto.createHash("sha256").update([
    clean(vaNummer), clean(row.soort), row.ingang ?? "", row.einde ?? "",
    clean(row.door), clean(row.reden), clean(row.evenement), row.eventdatum ?? "",
  ].join("|")).digest("hex");
}

function mergeHistoryRecord(base, details = {}) {
  return {
    ...base,
    reden: details.reden || base.reden || null,
    opmerkingen: details.opmerkingen || null,
    aangemaakt_op: parseNlDate(details.aangemaakt_op),
    aangemaakt_door: details.aangemaakt_door || null,
    gewijzigd_op: parseNlDate(details.gewijzigd_op),
    gewijzigd_door: details.gewijzigd_door || null,
  };
}

module.exports = { historyFingerprint, mergeHistoryRecord, parseHistoricalRows, parseNlDate };
