export const EXCEL_HEADERS = [
  "Nr.",
  "Discipline*",
  "Klasse*",
  "VAnr.*",
  "Naam",
  "Uitslag (uitgaande van rode hoek)",
  "VAnr.*",
  "Naam",
] as const;

export const EXCEL_DISCIPLINES = [
  "Kickboksen/Kickboxing",
  "Thaiboksen/Muay Thai",
  "MMA/MMA",
  "Boksen/Boxing",
] as const;

export const EXCEL_KLASSES = [
  "Jeugd/Youth",
  "Nieuweling/Newcomer",
  "C-Klasse/C-Class",
  "B-Klasse/B-Class",
  "A-Klasse/A-Class",
  "Veteraan/Veteran",
  "MMA Amateur",
  "MMA Professional",
  "R-Klasse/R-Class",
] as const;

export const EXCEL_UITSLAGEN = [
  "Wint op punten",
  "Verliest op punten",
  "Onbeslist",
  "Wint op KO",
  "Verliest op KO",
  "Wint op Technisch KO",
  "Verliest op Technisch KO",
  "Wint d.m.v. medische interventie",
  "Verliest d.m.v. medische interventie",
  "Wint d.m.v. opgave",
  "Verliest d.m.v. opgave",
  "No contest",
  "Wint d.m.v. submission",
  "Verliest d.m.v. submission",
  "Wint d.m.v. diskwalificatie",
  "Verliest d.m.v. diskwalificatie",
  "Wint d.m.v. RSC",
  "Verliest d.m.v. RSC",
  "Demo",
] as const;

export type BoutResultType =
  | "red_win"
  | "blue_win"
  | "draw"
  | "no_contest"
  | "demo";

export type DecisionCode =
  | "punten"
  | "ko"
  | "tko"
  | "medisch"
  | "opgave"
  | "submission"
  | "dq"
  | "rsc"
  | null;

export function assertAllowedExcelValue<T extends readonly string[]>(
  value: string,
  allowed: T,
  fieldName: string
): string {
  if (!allowed.includes(value)) {
    throw new Error(`${fieldName} heeft ongeldige exportwaarde: "${value}"`);
  }
  return value;
}

export function mapDisciplineToExcel(input: unknown): string {
  const raw = String(input ?? "").trim().toLowerCase();

  if (["kickboksen", "kickboxing", "kickboksen/kickboxing"].includes(raw)) {
    return "Kickboksen/Kickboxing";
  }
  if (["thaiboksen", "muay thai", "muaythai", "thaiboksen/muay thai"].includes(raw)) {
    return "Thaiboksen/Muay Thai";
  }
  if (["mma", "mma/mma"].includes(raw)) {
    return "MMA/MMA";
  }
  if (["boksen", "boxing", "boksen/boxing"].includes(raw)) {
    return "Boksen/Boxing";
  }

  throw new Error(`Onbekende discipline voor export: "${input}"`);
}

export function mapKlasseToExcel(input: unknown): string {
  const raw = String(input ?? "").trim().toLowerCase();

  if (["jeugd", "jeugd klasse", "youth", "jeugd/youth"].includes(raw)) {
    return "Jeugd/Youth";
  }
  if (["nieuweling", "newcomer", "nieuweling/newcomer"].includes(raw)) {
    return "Nieuweling/Newcomer";
  }
  if (["c", "c-klasse", "c klasse", "c-class", "c class"].includes(raw)) {
    return "C-Klasse/C-Class";
  }
  if (["b", "b-klasse", "b klasse", "b-class", "b class"].includes(raw)) {
    return "B-Klasse/B-Class";
  }
  if (["a", "a-klasse", "a klasse", "a-class", "a class"].includes(raw)) {
    return "A-Klasse/A-Class";
  }
  if (["veteraan", "veteran", "veteraan/veteran"].includes(raw)) {
    return "Veteraan/Veteran";
  }
  if (["mma amateur"].includes(raw)) {
    return "MMA Amateur";
  }
  if (["mma professional", "mma prof", "professional mma"].includes(raw)) {
    return "MMA Professional";
  }
  if (["r", "r-klasse", "r klasse", "r-class", "r class"].includes(raw)) {
    return "R-Klasse/R-Class";
  }

  throw new Error(`Onbekende klasse voor export: "${input}"`);
}

export function mapBoutResultToExcel(
  resultType: BoutResultType,
  decisionCode: DecisionCode
): string {
  if (resultType === "draw") return "Onbeslist";
  if (resultType === "no_contest") return "No contest";
  if (resultType === "demo") return "Demo";

  if (!decisionCode) {
    throw new Error("Wijze van winst ontbreekt.");
  }

  const map = {
    punten: {
      red_win: "Wint op punten",
      blue_win: "Verliest op punten",
    },
    ko: {
      red_win: "Wint op KO",
      blue_win: "Verliest op KO",
    },
    tko: {
      red_win: "Wint op Technisch KO",
      blue_win: "Verliest op Technisch KO",
    },
    medisch: {
      red_win: "Wint d.m.v. medische interventie",
      blue_win: "Verliest d.m.v. medische interventie",
    },
    opgave: {
      red_win: "Wint d.m.v. opgave",
      blue_win: "Verliest d.m.v. opgave",
    },
    submission: {
      red_win: "Wint d.m.v. submission",
      blue_win: "Verliest d.m.v. submission",
    },
    dq: {
      red_win: "Wint d.m.v. diskwalificatie",
      blue_win: "Verliest d.m.v. diskwalificatie",
    },
    rsc: {
      red_win: "Wint d.m.v. RSC",
      blue_win: "Verliest d.m.v. RSC",
    },
  } as const;

  return map[decisionCode][resultType];
}

export const RESULT_OPTIONS = [
  { value: "red_win", label: "Rood wint" },
  { value: "blue_win", label: "Blauw wint" },
  { value: "draw", label: "Onbeslist" },
  { value: "no_contest", label: "No contest" },
  { value: "demo", label: "Demo" },
] as const;

export const DECISION_OPTIONS = [
  { value: "punten", label: "Op punten" },
  { value: "ko", label: "KO" },
  { value: "tko", label: "Technisch KO" },
  { value: "medisch", label: "Medische interventie" },
  { value: "opgave", label: "Opgave" },
  { value: "submission", label: "Submission" },
  { value: "dq", label: "Diskwalificatie" },
  { value: "rsc", label: "RSC" },
] as const;