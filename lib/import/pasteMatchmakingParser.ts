// lib/import/pasteMatchmakingParser.ts
// ---------------------------------------------------------
// MATCHCONTROL – PASTE IMPORT PARSER (TSV/CSV) – v1.6
// ✅ VA herkent "va nr rood/blauw" + "va rood nr" etc.
// ✅ Gym == sportschool
// ✅ max_gewicht herkent "max kg" / "max gewicht"
// ✅ gewicht per vechter herkent "gewicht rood/blauw" of "kg rood/blauw"
// ✅ NIEUW: Toernooi/2-blokken Excel (Rode hoek / Blauwe hoek) met:
//    - Voornaam + Achternaam -> 1 naamveld
//    - Dubbele headers (Voornaam komt 2x) -> split in rood/blauw blok
//    - Max KG komt 2x -> max_gewicht = hoogste van de twee
// ---------------------------------------------------------

export type PasteRow = {
  partij_nr: number | null;

  discipline: string | null;
  klasse: string | null;

  rood_naam: string | null;
  rood_gym: string | null;
  rood_va: string | null;
  rood_gewicht: number | null;

  blauw_naam: string | null;
  blauw_gym: string | null;
  blauw_va: string | null;
  blauw_gewicht: number | null;

  max_gewicht: number | null;
};

export type PasteIssue = {
  rowIndex: number;
  partij_nr: number | null;
  field: string;
  severity: "blocking" | "warning" | "info";
  message: string;
};

export type ParseResult = {
  delimiter: "\t" | ";" | "," | "|";
  hasHeader: boolean;
  headerRowIndex: number;
  headerMap: Record<string, string>;
  rows: PasteRow[];
  issues: PasteIssue[];
  stats: { total: number; blocking: number; warning: number; info: number };
};

function norm(s: any) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9à-ÿ\s.]/gi, " ") // laat punt toe voor bv "VA nr."
    .replace(/\s+/g, " ")
    .trim();
}

function chooseDelimiter(text: string): "\t" | ";" | "," | "|" {
  if (text.includes("\t")) return "\t";
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5);

  const counts = { ";": 0, ",": 0, "|": 0 };
  for (const l of lines) {
    counts[";"] += (l.match(/;/g) || []).length;
    counts[","] += (l.match(/,/g) || []).length;
    counts["|"] += (l.match(/\|/g) || []).length;
  }

  const best = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ";") as ";" | "," | "|";
  return best;
}

function splitLine(line: string, delim: string): string[] {
  const parts = line.split(delim).map((x) => x.trim());
  return parts.map((x) => x.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim());
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (!s) return null;

  s = s.replace(/kg/gi, "").trim();

  if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");

  s = s.replace(/[^\d.\-]/g, "");
  if (!s) return null;

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function extractVa(raw: any, allowBareNumber: boolean): string | null {
  const s0 = String(raw ?? "").trim();
  if (!s0) return null;

  const compact = s0.replace(/\s+/g, "");

  if (allowBareNumber && /^\d{4,7}$/.test(compact)) return compact;

  const m =
    s0.match(/(?:\bva\b|\bv a\b|\bfightpassport\b|\bfight passport\b|\bfp\b|\bpaspoort\b|\bpassport\b)\s*[:\-]?\s*(\d{4,7})/i) ||
    s0.match(/(?:\bva\b|\bv a\b|\bfightpassport\b|\bfight passport\b|\bfp\b|\bpaspoort\b|\bpassport\b)\s*\((\d{4,7})\)/i);

  if (m?.[1]) return m[1];

  // "VA nr." / "VA nr" / "VA nummer"
  const m2 = s0.match(/va\s*(?:nr|nummer)\.?\s*[:\-]?\s*(\d{4,7})/i);
  if (m2?.[1]) return m2[1];

  return null;
}

function isProbablyHeaderRow(cells: string[]): boolean {
  const joined = norm(cells.join(" "));
  const hints = [
    "rood",
    "blauw",
    "rode hoek",
    "blauwe hoek",
    "voornaam",
    "achternaam",
    "va",
    "fp",
    "fightpassport",
    "discipline",
    "stijl",
    "klasse",
    "partij",
    "max",
    "kg",
    "gewicht",
    "gym",
    "sportschool",
  ];
  return hints.some((h) => joined.includes(h));
}

function headerHasVaHint(headers: string[]): boolean {
  const joined = norm(headers.join(" "));
  return ["va", "v a", "va nr", "va nummer", "fightpassport", "fight passport", "fp", "paspoort", "passport"].some((k) =>
    joined.includes(k)
  );
}

type CanonField = keyof PasteRow;

// interne velden (niet in output, alleen om te combineren)
type ExtraField =
  | "rood_voornaam"
  | "rood_achternaam"
  | "blauw_voornaam"
  | "blauw_achternaam"
  | "rood_maxkg"
  | "blauw_maxkg";

type AnyField = CanonField | ExtraField;

const FIELD_SYNONYMS: Record<CanonField, string[]> = {
  partij_nr: ["partij", "partij nr", "partij nummer", "partijnr", "nr", "bout", "bout nr"],

  discipline: ["discipline", "sport", "stijl"],
  klasse: ["klasse", "class", "niveau"],

  rood_naam: ["naam rood", "rood naam", "rode naam", "rode hoek naam"],
  rood_gym: ["sportschool rood", "rood sportschool", "gym rood", "rood gym", "team rood"],
  rood_va: [
    "va nr rood",
    "va nummer rood",
    "va rood",
    "va rood nr",
    "va rood nummer",
    "rood va",
    "rood va nr",
    "rood va nummer",
    "fightpassport rood",
    "fp rood",
  ],
  rood_gewicht: ["gewicht rood", "rood gewicht", "kg rood", "rood kg"],

  blauw_naam: ["naam blauw", "blauw naam", "blauwe naam", "blauwe hoek naam"],
  blauw_gym: ["sportschool blauw", "blauw sportschool", "gym blauw", "blauw gym", "team blauw"],
  blauw_va: [
    "va nr blauw",
    "va nummer blauw",
    "va blauw",
    "va blauw nr",
    "va blauw nummer",
    "blauw va",
    "blauw va nr",
    "blauw va nummer",
    "fightpassport blauw",
    "fp blauw",
  ],
  blauw_gewicht: ["gewicht blauw", "blauw gewicht", "kg blauw", "blauw kg"],

  max_gewicht: ["max kg", "max gewicht", "maximum gewicht", "max weight", "max"],
};

function getCell(cells: string[], idx: number | undefined): string {
  if (idx === undefined) return "";
  return String(cells[idx] ?? "").trim();
}

function joinName(a: string, b: string): string | null {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  const both = [x, y].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return both ? both : null;
}

function detectTournamentTwoBlock(headers: string[]) {
  // Herken "Voornaam" 2x, "Achternaam" 2x, "Gym" 2x, "VA nr" 2x, "Max KG" 2x
  const hn = headers.map((h) => norm(h));

  const idxs = (needle: string) => hn.map((h, i) => (h === needle || h.includes(needle) ? i : -1)).filter((i) => i >= 0);

  const voornamen = idxs("voornaam");
  const achternamen = idxs("achternaam");
  const gyms = idxs("gym").concat(idxs("sportschool"));
  const vas = idxs("va nr").concat(idxs("va nr.")).concat(idxs("va nummer")).concat(idxs("va"));
  const maxkgs = idxs("max kg").concat(idxs("maxkg")).concat(idxs("max"));

  if (voornamen.length < 2 || achternamen.length < 2) return null;

  // blokken: neem 1e als rood, 2e als blauw
  const redStart = voornamen[0];
  const blueStart = voornamen[1];

  // helper: pak eerste index >= start en < end
  const pickInRange = (arr: number[], start: number, end: number) => arr.find((i) => i >= start && i < end);

  const rood_voornaam = redStart;
  const rood_achternaam = pickInRange(achternamen, redStart, blueStart);
  const rood_gym = pickInRange(gyms, redStart, blueStart);
  const rood_va = pickInRange(vas, redStart, blueStart);
  const rood_maxkg = pickInRange(maxkgs, redStart, blueStart);

  const blauw_voornaam = blueStart;
  const blauw_achternaam = pickInRange(achternamen, blueStart, hn.length + 1);
  const blauw_gym = pickInRange(gyms, blueStart, hn.length + 1);
  const blauw_va = pickInRange(vas, blueStart, hn.length + 1);
  const blauw_maxkg = pickInRange(maxkgs, blueStart, hn.length + 1);

  // extra: klasse/stijl staan vaak achteraan
  const klasse = hn.findIndex((h) => h === "klasse" || h.includes("klasse"));
  const discipline = hn.findIndex((h) => h === "stijl" || h.includes("discipline") || h.includes("stijl"));

  const chosen: Partial<Record<AnyField, number>> = {};
  const headerMap: Record<string, string> = {};

  chosen.rood_voornaam = rood_voornaam;
  if (rood_achternaam !== undefined) chosen.rood_achternaam = rood_achternaam;
  if (rood_gym !== undefined) (chosen as any).rood_gym = rood_gym;
  if (rood_va !== undefined) (chosen as any).rood_va = rood_va;
  if (rood_maxkg !== undefined) chosen.rood_maxkg = rood_maxkg;

  chosen.blauw_voornaam = blauw_voornaam;
  if (blauw_achternaam !== undefined) chosen.blauw_achternaam = blauw_achternaam;
  if (blauw_gym !== undefined) (chosen as any).blauw_gym = blauw_gym;
  if (blauw_va !== undefined) (chosen as any).blauw_va = blauw_va;
  if (blauw_maxkg !== undefined) chosen.blauw_maxkg = blauw_maxkg;

  if (klasse >= 0) (chosen as any).klasse = klasse;
  if (discipline >= 0) (chosen as any).discipline = discipline;

  // headerMap (voor debug in UI)
  for (const [k, idx] of Object.entries(chosen)) {
    headerMap[k] = headers[idx as number] ?? "";
  }

  // score: we hebben in elk geval voornaam/achternaam + va?
  let score = 0;
  score += 6; // rood naam (via voornaam)
  score += 6; // blauw naam
  if ((chosen as any).rood_va !== undefined) score += 3;
  if ((chosen as any).blauw_va !== undefined) score += 3;
  if ((chosen as any).rood_gym !== undefined) score += 1;
  if ((chosen as any).blauw_gym !== undefined) score += 1;
  if ((chosen as any).klasse !== undefined) score += 1;
  if ((chosen as any).discipline !== undefined) score += 1;

  return { chosen, headerMap, score };
}

function detectHeaderMap(headers: string[]) {
  const hasHeader = isProbablyHeaderRow(headers);
  const chosen: Partial<Record<AnyField, number>> = {};
  const headerMap: Record<string, string> = {};
  if (!hasHeader) return { hasHeader: false as const, chosen, headerMap, score: -1 };

  // 1) eerst: normale mapping via synonyms
  const hn = headers.map((h) => norm(h));
  for (const field of Object.keys(FIELD_SYNONYMS) as CanonField[]) {
    const syns = FIELD_SYNONYMS[field].map(norm);
    let bestIdx: number | null = null;

    for (let i = 0; i < hn.length; i++) {
      const h = hn[i];
      if (!h) continue;
      if (syns.some((s) => h === s || h.includes(s) || s.includes(h))) {
        bestIdx = i;
        break;
      }
    }

    if (bestIdx !== null) {
      (chosen as any)[field] = bestIdx;
      headerMap[field] = headers[bestIdx] ?? "";
    }
  }

  // score normale mapping
  const scoreNormal = scoreHeaderCandidate(chosen as any);

  // 2) toernooi/2-blokken mapping (Voornaam/Achternaam 2x)
  const tour = detectTournamentTwoBlock(headers);
  if (tour && tour.score > scoreNormal) {
    return { hasHeader: true as const, chosen: tour.chosen, headerMap: tour.headerMap, score: tour.score };
  }

  return { hasHeader: true as const, chosen, headerMap, score: scoreNormal };
}

function scoreHeaderCandidate(chosen: Partial<Record<AnyField, number>>): number {
  let score = 0;
  if ((chosen as any).rood_va !== undefined) score += 6;
  if ((chosen as any).blauw_va !== undefined) score += 6;
  if ((chosen as any).rood_naam !== undefined) score += 2;
  if ((chosen as any).blauw_naam !== undefined) score += 2;
  if ((chosen as any).rood_gym !== undefined) score += 1;
  if ((chosen as any).blauw_gym !== undefined) score += 1;
  if ((chosen as any).partij_nr !== undefined) score += 1;
  if ((chosen as any).discipline !== undefined) score += 1;
  if ((chosen as any).klasse !== undefined) score += 1;
  if ((chosen as any).max_gewicht !== undefined) score += 1;

  // extra fields tellen ook mee (toernooi layout)
  if ((chosen as any).rood_voornaam !== undefined) score += 2;
  if ((chosen as any).blauw_voornaam !== undefined) score += 2;
  if ((chosen as any).rood_achternaam !== undefined) score += 1;
  if ((chosen as any).blauw_achternaam !== undefined) score += 1;
  if ((chosen as any).rood_maxkg !== undefined) score += 1;
  if ((chosen as any).blauw_maxkg !== undefined) score += 1;

  return score;
}

export function parsePastedMatchmaking(textRaw: string): ParseResult {
  const text = String(textRaw ?? "").replace(/\r/g, "\n").trim();
  const delimiter = chooseDelimiter(text);

  const rawLines = text
    .split(/\n/)
    .map((l) => l.replace(/\s+$/g, ""))
    .filter((l) => l.trim().length > 0);

  if (rawLines.length === 0) {
    return {
      delimiter,
      hasHeader: false,
      headerRowIndex: 0,
      headerMap: {},
      rows: [],
      issues: [{ rowIndex: 0, partij_nr: null, field: "unknown", severity: "blocking", message: "Geen data gevonden." }],
      stats: { total: 0, blocking: 1, warning: 0, info: 0 },
    };
  }

  const maxScan = Math.min(30, rawLines.length);
  let best = {
    score: -1,
    headerRowIndex: 0,
    chosen: {} as Partial<Record<AnyField, number>>,
    headerMap: {} as Record<string, string>,
    hasHeader: false,
    hasVaHint: false,
  };

  for (let i = 0; i < maxScan; i++) {
    const cells = splitLine(rawLines[i], delimiter);
    const det = detectHeaderMap(cells);
    const vaHint = headerHasVaHint(cells);
    const score = det.hasHeader ? det.score + (vaHint ? 1 : 0) : -1;

    if (score > best.score) {
      best = {
        score,
        headerRowIndex: i,
        chosen: det.chosen,
        headerMap: det.headerMap,
        hasHeader: det.hasHeader,
        hasVaHint: vaHint,
      };
    }
  }

  const hasHeader = best.hasHeader && best.score >= 3;
  const headerRowIndex = hasHeader ? best.headerRowIndex : 0;

  const getIdx = (field: AnyField) => (hasHeader ? (best.chosen as any)[field] : undefined);
  const dataLines = hasHeader ? rawLines.slice(headerRowIndex + 1) : rawLines.slice(0);
  const allowBareVa = hasHeader ? best.hasVaHint : true;

  const rows: PasteRow[] = [];
  const issues: PasteIssue[] = [];

  for (let r = 0; r < dataLines.length; r++) {
    const cells = splitLine(dataLines[r], delimiter);

    const partijRaw = getCell(cells, getIdx("partij_nr"));
    const partijNr = partijRaw ? Number(String(partijRaw).replace(/[^\d]/g, "")) : null;

    // === Naam: direct of via voornaam+achternaam
    const roodNaamDirect = getCell(cells, getIdx("rood_naam"));
    const blauwNaamDirect = getCell(cells, getIdx("blauw_naam"));

    const roodVoor = getCell(cells, getIdx("rood_voornaam"));
    const roodAchter = getCell(cells, getIdx("rood_achternaam"));
    const blauwVoor = getCell(cells, getIdx("blauw_voornaam"));
    const blauwAchter = getCell(cells, getIdx("blauw_achternaam"));

    const rood_naam = (roodNaamDirect || "").trim()
      ? roodNaamDirect.trim()
      : joinName(roodVoor, roodAchter);
    const blauw_naam = (blauwNaamDirect || "").trim()
      ? blauwNaamDirect.trim()
      : joinName(blauwVoor, blauwAchter);

    const rood_gym = getCell(cells, getIdx("rood_gym")) || null;
    const rood_va = extractVa(getCell(cells, getIdx("rood_va")), allowBareVa);
    const rood_gewicht = toNum(getCell(cells, getIdx("rood_gewicht")));

    const blauw_gym = getCell(cells, getIdx("blauw_gym")) || null;
    const blauw_va = extractVa(getCell(cells, getIdx("blauw_va")), allowBareVa);
    const blauw_gewicht = toNum(getCell(cells, getIdx("blauw_gewicht")));

    // max_gewicht: of via echte max_gewicht kolom, of via rood/blauw Max KG (toernooi layout)
    const max_gewicht_direct = toNum(getCell(cells, getIdx("max_gewicht")));
    const rood_maxkg = toNum(getCell(cells, getIdx("rood_maxkg")));
    const blauw_maxkg = toNum(getCell(cells, getIdx("blauw_maxkg")));
    const max_gewicht =
      max_gewicht_direct ??
      (rood_maxkg !== null && blauw_maxkg !== null ? Math.max(rood_maxkg, blauw_maxkg) : rood_maxkg ?? blauw_maxkg ?? null);

    const discipline = (getCell(cells, getIdx("discipline")) || "").trim() || null;
    const klasse = (getCell(cells, getIdx("klasse")) || "").trim() || null;

    // skip lege rijen (bijv. toernooi: onderaan notes)
    const hasAnything =
      Boolean(partijNr) ||
      Boolean(rood_naam) ||
      Boolean(blauw_naam) ||
      Boolean(rood_va) ||
      Boolean(blauw_va) ||
      Boolean(rood_gym) ||
      Boolean(blauw_gym) ||
      Boolean(discipline) ||
      Boolean(klasse);

    if (!hasAnything) continue;

    rows.push({
      partij_nr: Number.isFinite(partijNr as any) ? (partijNr as number) : null,
      discipline,
      klasse,

      rood_naam: rood_naam ?? null,
      rood_gym,
      rood_va: rood_va ?? null,
      rood_gewicht,

      blauw_naam: blauw_naam ?? null,
      blauw_gym,
      blauw_va: blauw_va ?? null,
      blauw_gewicht,

      max_gewicht,
    });

    if (!rood_va) issues.push({ rowIndex: r, partij_nr: partijNr ?? null, field: "rood_va", severity: "warning", message: "Rood: FightPassport (VA) ontbreekt." });
    if (!blauw_va) issues.push({ rowIndex: r, partij_nr: partijNr ?? null, field: "blauw_va", severity: "warning", message: "Blauw: FightPassport (VA) ontbreekt." });

    // extra: naam ontbreekt is meestal echt fout bij toernooi lijsten
    if (!rood_naam) issues.push({ rowIndex: r, partij_nr: partijNr ?? null, field: "rood_naam", severity: "warning", message: "Rood: naam ontbreekt (voornaam/achternaam niet gevonden)." });
    if (!blauw_naam) issues.push({ rowIndex: r, partij_nr: partijNr ?? null, field: "blauw_naam", severity: "warning", message: "Blauw: naam ontbreekt (voornaam/achternaam niet gevonden)." });
  }

  const stats = {
    total: rows.length,
    blocking: issues.filter((x) => x.severity === "blocking").length,
    warning: issues.filter((x) => x.severity === "warning").length,
    info: issues.filter((x) => x.severity === "info").length,
  };

  return {
    delimiter,
    hasHeader,
    headerRowIndex,
    headerMap: hasHeader ? best.headerMap : {},
    rows,
    issues,
    stats,
  };
}