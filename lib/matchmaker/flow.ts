import { FighterContextRow, LeeftijdType, MatchAdvice } from "@/lib/matchmaker/types";

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getLeeftijdType(geboortedatum: unknown, eventDate: unknown): LeeftijdType {
  const dob = toDate(geboortedatum);
  const evt = toDate(eventDate);
  if (!dob || !evt) return "onbekend";

  let age = evt.getFullYear() - dob.getFullYear();
  const month = evt.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && evt.getDate() < dob.getDate())) age -= 1;
  return age < 18 ? "jeugd" : "volwassen";
}

export function diffDays(a: unknown, b: unknown): number | null {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return null;
  const ms = Math.abs(da.getTime() - db.getTime());
  return Math.round(ms / 86400000);
}

export function diffDaysLabel(days: number | null): string | null {
  if (days == null) return null;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const rest = days - years * 365 - months * 30;
  return `${years}j ${months}m ${rest}d`;
}

export function calcWeightDiff(a: unknown, b: unknown): number | null {
  const na = toNum(a);
  const nb = toNum(b);
  if (na == null || nb == null) return null;
  return Math.abs(Number((na - nb).toFixed(2)));
}

export function compareForDefaultSort(a: FighterContextRow, b: FighterContextRow, eventDate: string | null) {
  const gender = norm(a.geslacht).localeCompare(norm(b.geslacht));
  if (gender !== 0) return gender;

  const ageType = getLeeftijdType(a.geboortedatum_input, eventDate).localeCompare(
    getLeeftijdType(b.geboortedatum_input, eventDate)
  );
  if (ageType !== 0) return ageType;

  const discipline = norm(a.discipline).localeCompare(norm(b.discipline));
  if (discipline !== 0) return discipline;

  const klasse = norm(a.klasse).localeCompare(norm(b.klasse));
  if (klasse !== 0) return klasse;

  const dobA = toDate(a.geboortedatum_input)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const dobB = toDate(b.geboortedatum_input)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (dobA !== dobB) return dobA - dobB;

  return (toNum(a.gewicht) ?? 999) - (toNum(b.gewicht) ?? 999);
}

export function buildMatchAdvice(
  rood: FighterContextRow,
  blauw: FighterContextRow,
  eventDate: string | null
): MatchAdvice {
  const warnings: string[] = [];

  const disciplineOk = norm(rood.discipline) === norm(blauw.discipline);
  if (!disciplineOk) warnings.push("Discipline verschilt");

  const genderOk = norm(rood.geslacht) !== "" && norm(rood.geslacht) === norm(blauw.geslacht);
  if (!genderOk) warnings.push("Geslacht verschilt");

  const leeftijdTypeRood = getLeeftijdType(rood.geboortedatum_input, eventDate);
  const leeftijdTypeBlauw = getLeeftijdType(blauw.geboortedatum_input, eventDate);
  const leeftijdTypeOk = leeftijdTypeRood === leeftijdTypeBlauw;
  if (!leeftijdTypeOk) warnings.push("Jeugd en volwassenen gemengd");

  const klasseOk = norm(rood.klasse) !== "" && norm(rood.klasse) === norm(blauw.klasse);
  if (!klasseOk) warnings.push("Klasse verschilt");

  const leeftijdDiffDays = diffDays(rood.geboortedatum_input, blauw.geboortedatum_input);
  const leeftijdDiffLabel = diffDaysLabel(leeftijdDiffDays);
  const gewichtDiff = calcWeightDiff(rood.gewicht, blauw.gewicht);

  if (leeftijdTypeRood === "jeugd" && leeftijdDiffDays != null && leeftijdDiffDays > 730) {
    warnings.push("Jeugd leeftijdsverschil groter dan 2 jaar");
  }

  if (gewichtDiff != null) {
    if (leeftijdTypeRood === "jeugd" && gewichtDiff > 2.5) warnings.push("Jeugd gewichtsverschil groter dan 2.5 kg");
    if (leeftijdTypeRood === "volwassen" && gewichtDiff > 3) warnings.push("Gewichtsverschil groter dan 3 kg");
  } else {
    warnings.push("Gewicht ontbreekt bij één of beide vechters");
  }

  let advies: MatchAdvice["advies"] = "goed";
  if (!disciplineOk || !genderOk || !leeftijdTypeOk) advies = "afkeur";
  else if (warnings.length > 0) advies = "handmatig";

  return {
    discipline_ok: disciplineOk,
    gender_ok: genderOk,
    leeftijd_type_ok: leeftijdTypeOk,
    klasse_ok: klasseOk,
    leeftijd_diff_days: leeftijdDiffDays,
    leeftijd_diff_label: leeftijdDiffLabel,
    gewicht_diff: gewichtDiff,
    advies,
    warnings,
  };
}
