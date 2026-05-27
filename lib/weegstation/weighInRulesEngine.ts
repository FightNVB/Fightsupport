export type WeighEindStatus =
  | "WACHT_OP_WEGEN"
  | "DEELS_GEWOGEN"
  | "OK"
  | "DISPENSATIE_NODIG"
  | "GOEDGEKEURD_MET_DISPENSATIE"
  | "AFKEUR"
  | "HANDMATIGE_BEOORDELING";

export type WeighEvalResult = {
  leeftijdType: "jeugd" | "volwassene" | "onbekend";
  diff: number | null;
  reglementStatus: string;
  praktijkStatus: string;
  eindStatus: WeighEindStatus;
  dispensatieNodig: boolean;
  dispensatieMogelijk: boolean;
  messages: string[];

  effectiveMaxGewicht: number | null;
  minToelaatbaarGewicht: number | null;
  maxToelaatbaarGewicht: number | null;
  maxSource: "tabel" | "klasse" | "doorgegeven" | "mma-klasse" | "onbekend";

  withinRangeRood: boolean;
  withinRangeBlauw: boolean;
  nietOpGewichtRood: boolean;
  nietOpGewichtBlauw: boolean;
  teLichtRood: boolean;
  teLichtBlauw: boolean;
  teZwaarRood: boolean;
  teZwaarBlauw: boolean;

  hasAnyOffWeight: boolean;
  canProceedWithPenalty: boolean;
  adminSanctieNodig: boolean;
  adminSanctieReason: string | null;
  isHeavyweightOpen: boolean;
  isMma: boolean;
};

const YOUTH_LOWER_OFFSET = 2.0;
const ADULT_LOWER_OFFSET = 3.0;
const UPPER_TOLERANCE = 0.2;
const HEAVY_OPEN_MIN = 95.0;

const MMA_LIMITS: Array<{ match: RegExp; max: number | null; openMin?: number }> = [
  { match: /super\s*heavy/i, max: null, openMin: 120.2 },
  { match: /straw/i, max: 52.2 },
  { match: /fly/i, max: 56.7 },
  { match: /bantam/i, max: 61.2 },
  { match: /feather/i, max: 65.8 },
  { match: /super\s*light/i, max: 74.8 },
  { match: /lightweight/i, max: 70.3 },
  { match: /super\s*welter/i, max: 79.4 },
  { match: /welter/i, max: 77.1 },
  { match: /super\s*middle/i, max: 88.5 },
  { match: /middleweight/i, max: 83.9 },
  { match: /light\s*heavy/i, max: 93.0 },
  { match: /cruiser/i, max: 102.1 },
  { match: /heavyweight/i, max: 120.2 },
];

const KB_TM_MUAYTHAI_LIMITS: Array<{ match: RegExp; max: number | null; openMin?: number }> = [
  { match: /super\s*heavy/i, max: null, openMin: 95.0 },
  { match: /junior\s*bantam/i, max: 52.16 },
  { match: /bantam/i, max: 53.52 },
  { match: /junior\s*feather/i, max: 55.34 },
  { match: /feather/i, max: 57.15 },
  { match: /junior\s*lightweight/i, max: 58.97 },
  { match: /lightweight/i, max: 61.23 },
  { match: /junior\s*welter/i, max: 63.50 },
  { match: /welter/i, max: 66.68 },
  { match: /junior\s*middle/i, max: 69.85 },
  { match: /super\s*light\s*heavy/i, max: 82.55 },
  { match: /light\s*heavy/i, max: 79.38 },
  { match: /middleweight\s*76(?:[.,]20)?/i, max: 76.20 },
  { match: /middleweight/i, max: 72.57 },
  { match: /cruiser/i, max: 86.18 },
  { match: /heavyweight/i, max: 95.00 },
];

export type WeighInEngineInput = {
  discipline: string | null;
  klasse_mm: string | null;
  leeftijd_type: string | null;
  max_gewicht: number | null;
  max_gewicht_notatie?: string | null;
  rood_doorgegeven_gewicht?: number | null;
  blauw_doorgegeven_gewicht?: number | null;
  rood_gewogen_gewicht: number | null;
  blauw_gewogen_gewicht: number | null;
  dispensatie_verleend?: boolean;
};

function fmtKg(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "-";
  return `${Number(v).toFixed(1)} kg`;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function parseKlasseMaxGewicht(label: string | null | undefined): number | null {
  const s = String(label ?? "").trim().toLowerCase();
  if (!s) return null;

  if (isHeavyweightOpenClass(label)) {
    return null;
  }

  const cleaned = s.replace(/\s/g, "");
  const match =
    cleaned.match(/(?:tot|max|onder|t\/m|\-)(\d+(?:[.,]\d+)?)(?:kg)?/) ||
    cleaned.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)(?:kg)?/) ||
    cleaned.match(/(\d+(?:[.,]\d+)?)(?:kg)/);

  if (!match) return null;
  const raw = match[2] ?? match[1];
  if (!raw) return null;

  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function isYouthClassCode(v: string | null | undefined): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "j" || s === "j+" || s.includes("jeugd") || s.includes("junior");
}

function inferLeeftijdType(
  leeftijdType: string | null | undefined,
  klasse: string | null | undefined
): "jeugd" | "volwassene" {
  // J en J+ zijn jeugd. Alle andere klassen/codes (N, R, A, C, B, A enz.)
  // vallen voor de weegmarge onder volwassenen: max - 3 kg t/m max + 0.2 kg.
  if (isYouthClassCode(leeftijdType) || isYouthClassCode(klasse)) return "jeugd";
  return "volwassene";
}

function getNamedClassLimit(
  klasse: string | null | undefined,
  limits: Array<{ match: RegExp; max: number | null; openMin?: number }>
): { max: number | null; openMin?: number } | null {
  const s = String(klasse ?? "").trim();
  if (!s) return null;

  for (const row of limits) {
    if (row.match.test(s)) return { max: row.max, openMin: row.openMin };
  }
  return null;
}

function getMmaClassLimit(klasse: string | null | undefined) {
  return getNamedClassLimit(klasse, MMA_LIMITS);
}

function getKbTmMuaythaiClassLimit(klasse: string | null | undefined) {
  return getNamedClassLimit(klasse, KB_TM_MUAYTHAI_LIMITS);
}

function isHeavyweightOpenClass(label: string | null | undefined): boolean {
  const s = String(label ?? "").trim().toLowerCase();
  if (!s) return false;

  return (
    /(?:^|\D)95(?:[.,]0+)?\s*\+(?:\D|$)/i.test(s) ||
    /super\s*heavy/i.test(s) ||
    /superzwaar/i.test(s) ||
    /open\s*(klasse|class)/i.test(s)
  );
}

function getOpenWeightMinimum(input: WeighInEngineInput, isMma: boolean): number {
  if (isMma) {
    const mmaLimit = getMmaClassLimit(input.klasse_mm);
    if (mmaLimit?.max == null && mmaLimit?.openMin != null) return mmaLimit.openMin;
  }

  const kbLimit = getKbTmMuaythaiClassLimit(input.klasse_mm);
  if (kbLimit?.max == null && kbLimit?.openMin != null) return kbLimit.openMin;

  return HEAVY_OPEN_MIN;
}

function getAllowedWeightRange(params: {
  leeftijdType: "jeugd" | "volwassene" | "onbekend";
  effectiveMaxGewicht: number | null;
  isMma: boolean;
  isHeavyweightOpen: boolean;
  openMin?: number;
}) {
  const { leeftijdType, effectiveMaxGewicht, isMma, isHeavyweightOpen, openMin } = params;

  if (isHeavyweightOpen) {
    return { min: openMin ?? HEAVY_OPEN_MIN, max: null };
  }

  if (effectiveMaxGewicht == null) {
    return { min: null, max: null };
  }

  const max = Number((effectiveMaxGewicht + UPPER_TOLERANCE).toFixed(2));

  if (isMma) {
    return {
      min: null,
      max,
    };
  }

  if (leeftijdType === "jeugd") {
    return {
      min: Number((effectiveMaxGewicht - YOUTH_LOWER_OFFSET).toFixed(2)),
      max,
    };
  }

  if (leeftijdType === "volwassene") {
    return {
      min: Number((effectiveMaxGewicht - ADULT_LOWER_OFFSET).toFixed(2)),
      max,
    };
  }

  return {
    min: null,
    max,
  };
}

function getEffectiveMaxWeight(input: WeighInEngineInput, isMma: boolean): {
  value: number | null;
  source: "tabel" | "klasse" | "doorgegeven" | "mma-klasse" | "onbekend";
} {
  if (isMma) {
    const mmaLimit = getMmaClassLimit(input.klasse_mm);
    if (mmaLimit) {
      return { value: mmaLimit.max, source: "mma-klasse" };
    }
  } else {
    const kbTmLimit = getKbTmMuaythaiClassLimit(input.klasse_mm);
    if (kbTmLimit) {
      return { value: kbTmLimit.max, source: "klasse" };
    }
  }

  if (!isHeavyweightOpenClass(input.max_gewicht_notatie) && input.max_gewicht != null && Number.isFinite(input.max_gewicht)) {
    return { value: Number(Math.abs(input.max_gewicht).toFixed(2)), source: "tabel" };
  }

  const notatieMax = parseKlasseMaxGewicht(input.max_gewicht_notatie);
  if (notatieMax != null) {
    return { value: notatieMax, source: "tabel" };
  }

  const klasseMax = parseKlasseMaxGewicht(input.klasse_mm);
  if (klasseMax != null) {
    return { value: klasseMax, source: "klasse" };
  }

  const declared = [input.rood_doorgegeven_gewicht, input.blauw_doorgegeven_gewicht]
    .map(toNum)
    .filter((v): v is number => v != null);

  if (declared.length > 0) {
    return { value: Number(Math.max(...declared).toFixed(2)), source: "doorgegeven" };
  }

  return { value: null, source: "onbekend" };
}

export function evaluateWeighInBout(input: WeighInEngineInput): WeighEvalResult {
  const messages: string[] = [];
  const rood = toNum(input.rood_gewogen_gewicht);
  const blauw = toNum(input.blauw_gewogen_gewicht);
  const leeftijdType = inferLeeftijdType(input.leeftijd_type, input.klasse_mm);
  const dispVerleend = !!input.dispensatie_verleend;
  const discipline = String(input.discipline ?? "").toLowerCase();
  const isMma = discipline.includes("mma");
  const initialIsHeavyweightOpen =
    isHeavyweightOpenClass(input.klasse_mm) || isHeavyweightOpenClass(input.max_gewicht_notatie);

  if (rood == null && blauw == null) {
    return {
      leeftijdType,
      diff: null,
      reglementStatus: "WACHT_OP_WEGEN",
      praktijkStatus: "WACHT_OP_WEGEN",
      eindStatus: "WACHT_OP_WEGEN",
      dispensatieNodig: false,
      dispensatieMogelijk: false,
      messages: ["Nog geen van beide vechters gewogen."],
      effectiveMaxGewicht: null,
      minToelaatbaarGewicht: null,
      maxToelaatbaarGewicht: null,
      maxSource: "onbekend",
      withinRangeRood: false,
      withinRangeBlauw: false,
      nietOpGewichtRood: false,
      nietOpGewichtBlauw: false,
      teLichtRood: false,
      teLichtBlauw: false,
      teZwaarRood: false,
      teZwaarBlauw: false,
      hasAnyOffWeight: false,
      canProceedWithPenalty: false,
      adminSanctieNodig: false,
      adminSanctieReason: null,
      isHeavyweightOpen: initialIsHeavyweightOpen,
      isMma,
    };
  }

  if (rood == null || blauw == null) {
    return {
      leeftijdType,
      diff: null,
      reglementStatus: "DEELS_GEWOGEN",
      praktijkStatus: "DEELS_GEWOGEN",
      eindStatus: "DEELS_GEWOGEN",
      dispensatieNodig: false,
      dispensatieMogelijk: false,
      messages: ["Nog niet beide vechters gewogen."],
      effectiveMaxGewicht: null,
      minToelaatbaarGewicht: null,
      maxToelaatbaarGewicht: null,
      maxSource: "onbekend",
      withinRangeRood: false,
      withinRangeBlauw: false,
      nietOpGewichtRood: false,
      nietOpGewichtBlauw: false,
      teLichtRood: false,
      teLichtBlauw: false,
      teZwaarRood: false,
      teZwaarBlauw: false,
      hasAnyOffWeight: false,
      canProceedWithPenalty: false,
      adminSanctieNodig: false,
      adminSanctieReason: null,
      isHeavyweightOpen: initialIsHeavyweightOpen,
      isMma,
    };
  }

  const diff = Number(Math.abs(rood - blauw).toFixed(2));
  const effectiveMaxInfo = getEffectiveMaxWeight(input, isMma);
  const heavyByClass = isHeavyweightOpenClass(input.klasse_mm);
  const heavyByNotation = isHeavyweightOpenClass(input.max_gewicht_notatie);
  const isHeavyweightOpen = heavyByClass || heavyByNotation || effectiveMaxInfo.value == null && getMmaClassLimit(input.klasse_mm)?.openMin != null;
  const openMin = getOpenWeightMinimum(input, isMma);

  const allowedRange = getAllowedWeightRange({
    leeftijdType,
    effectiveMaxGewicht: effectiveMaxInfo.value,
    isMma,
    isHeavyweightOpen,
    openMin,
  });

  const minToelaatbaarGewicht = allowedRange.min;
  const maxToelaatbaarGewicht = allowedRange.max;
  const hasKnownWeightRange = isHeavyweightOpen || effectiveMaxInfo.value != null;

  const teLichtRood =
    minToelaatbaarGewicht != null ? rood < minToelaatbaarGewicht : false;
  const teLichtBlauw =
    minToelaatbaarGewicht != null ? blauw < minToelaatbaarGewicht : false;

  const teZwaarRood =
    maxToelaatbaarGewicht != null ? rood > maxToelaatbaarGewicht : false;
  const teZwaarBlauw =
    maxToelaatbaarGewicht != null ? blauw > maxToelaatbaarGewicht : false;

  const withinRangeRood =
    hasKnownWeightRange &&
    (minToelaatbaarGewicht == null || rood >= minToelaatbaarGewicht) &&
    (maxToelaatbaarGewicht == null || rood <= maxToelaatbaarGewicht);

  const withinRangeBlauw =
    hasKnownWeightRange &&
    (minToelaatbaarGewicht == null || blauw >= minToelaatbaarGewicht) &&
    (maxToelaatbaarGewicht == null || blauw <= maxToelaatbaarGewicht);

  const nietOpGewichtRood = hasKnownWeightRange ? teLichtRood || teZwaarRood : false;
  const nietOpGewichtBlauw = hasKnownWeightRange ? teLichtBlauw || teZwaarBlauw : false;
  const hasAnyOffWeight = nietOpGewichtRood || nietOpGewichtBlauw;

  if (!hasKnownWeightRange) {
    messages.push(
      "Geen bruikbare bovengrens gevonden; verschilregels zijn wel toegepast, maar niet-op-gewicht kon niet automatisch worden beoordeeld."
    );
  } else if (isHeavyweightOpen) {
    messages.push(
      `95+ klasse: beide vechters moeten minimaal ${fmtKg(minToelaatbaarGewicht ?? openMin)} wegen. Daarboven geldt geen bovengrens en maakt onderling gewichtsverschil niet meer uit.`
    );
  } else if (minToelaatbaarGewicht != null && maxToelaatbaarGewicht != null) {
    messages.push(
      `Toegestaan gewicht ${fmtKg(minToelaatbaarGewicht)} t/m ${fmtKg(maxToelaatbaarGewicht)}.`
    );
  } else if (maxToelaatbaarGewicht != null) {
    messages.push(`Maximaal toegestaan gewicht: ${fmtKg(maxToelaatbaarGewicht)}.`);
  }

  if (teLichtRood) messages.push("Rood is te licht voor de afgesproken partij.");
  if (teZwaarRood) messages.push("Rood is te zwaar voor de afgesproken partij.");
  if (teLichtBlauw) messages.push("Blauw is te licht voor de afgesproken partij.");
  if (teZwaarBlauw) messages.push("Blauw is te zwaar voor de afgesproken partij.");

  if (isMma) {
    if (diff <= 4.0) {
      return {
        leeftijdType,
        diff,
        reglementStatus: hasAnyOffWeight ? "AFWIJKING_GEWICHT" : "OK",
        praktijkStatus: "OK",
        eindStatus: "OK",
        dispensatieNodig: false,
        dispensatieMogelijk: false,
        messages: hasAnyOffWeight
          ? [...messages, "MMA: verschil is toegestaan, maar minimaal één vechter zit buiten klasse."]
          : [...messages, "MMA: verschil binnen 4.0 kg."],
        effectiveMaxGewicht: effectiveMaxInfo.value,
        minToelaatbaarGewicht,
        maxToelaatbaarGewicht,
        maxSource: effectiveMaxInfo.source,
        withinRangeRood,
        withinRangeBlauw,
        nietOpGewichtRood,
        nietOpGewichtBlauw,
        teLichtRood,
        teLichtBlauw,
        teZwaarRood,
        teZwaarBlauw,
        hasAnyOffWeight,
        canProceedWithPenalty: hasAnyOffWeight,
        adminSanctieNodig: false,
        adminSanctieReason: null,
        isHeavyweightOpen,
        isMma,
      };
    }

    return {
      leeftijdType,
      diff,
      reglementStatus: "AFKEUR",
      praktijkStatus: "AFKEUR",
      eindStatus: "AFKEUR",
      dispensatieNodig: false,
      dispensatieMogelijk: false,
      messages: [...messages, "MMA: verschil groter dan 4.0 kg, partij kan niet doorgaan."],
      effectiveMaxGewicht: effectiveMaxInfo.value,
      minToelaatbaarGewicht,
      maxToelaatbaarGewicht,
      maxSource: effectiveMaxInfo.source,
      withinRangeRood,
      withinRangeBlauw,
      nietOpGewichtRood,
      nietOpGewichtBlauw,
      teLichtRood,
      teLichtBlauw,
      teZwaarRood,
      teZwaarBlauw,
      hasAnyOffWeight,
      canProceedWithPenalty: false,
      adminSanctieNodig: true,
      adminSanctieReason: "MMA-gewichtsverschil te groot.",
      isHeavyweightOpen,
      isMma,
    };
  }

  const okMax = leeftijdType === "jeugd" ? 2.5 : 3.5;
  const dispMax = leeftijdType === "jeugd" ? 3.9 : 6.9;
  const rejectFrom = leeftijdType === "jeugd" ? 4.0 : 7.0;

  if (isHeavyweightOpen) {
    return {
      leeftijdType,
      diff,
      reglementStatus: hasAnyOffWeight ? "AFWIJKING_GEWICHT" : "OK",
      praktijkStatus: hasAnyOffWeight ? "AFKEUR" : "OK",
      eindStatus: hasAnyOffWeight ? "AFKEUR" : "OK",
      dispensatieNodig: false,
      dispensatieMogelijk: false,
      messages: hasAnyOffWeight
        ? [...messages, "95+ klasse: minimaal één vechter weegt onder het minimumgewicht en valt dus buiten de klasse."]
        : [...messages, "95+ klasse toegestaan. Onderling gewichtsverschil speelt hier geen rol."],
      effectiveMaxGewicht: effectiveMaxInfo.value,
      minToelaatbaarGewicht,
      maxToelaatbaarGewicht,
      maxSource: effectiveMaxInfo.source,
      withinRangeRood,
      withinRangeBlauw,
      nietOpGewichtRood,
      nietOpGewichtBlauw,
      teLichtRood,
      teLichtBlauw,
      teZwaarRood,
      teZwaarBlauw,
      hasAnyOffWeight,
      canProceedWithPenalty: false,
      adminSanctieNodig: false,
      adminSanctieReason: null,
      isHeavyweightOpen,
      isMma,
    };
  }

  if (diff >= rejectFrom) {
    const adminSanctieReason =
      "Partij kan niet doorgaan: gewichtsverschil te groot. Admin moet administratieve sanctie beoordelen.";

    return {
      leeftijdType,
      diff,
      reglementStatus: "AFKEUR",
      praktijkStatus: "AFKEUR",
      eindStatus: "AFKEUR",
      dispensatieNodig: false,
      dispensatieMogelijk: false,
      messages: [...messages, adminSanctieReason],
      effectiveMaxGewicht: effectiveMaxInfo.value,
      minToelaatbaarGewicht,
      maxToelaatbaarGewicht,
      maxSource: effectiveMaxInfo.source,
      withinRangeRood,
      withinRangeBlauw,
      nietOpGewichtRood,
      nietOpGewichtBlauw,
      teLichtRood,
      teLichtBlauw,
      teZwaarRood,
      teZwaarBlauw,
      hasAnyOffWeight,
      canProceedWithPenalty: false,
      adminSanctieNodig: true,
      adminSanctieReason,
      isHeavyweightOpen,
      isMma,
    };
  }

  if (diff <= okMax) {
    return {
      leeftijdType,
      diff,
      reglementStatus: hasAnyOffWeight ? "AFWIJKING_GEWICHT" : "OK",
      praktijkStatus: "OK",
      eindStatus: "OK",
      dispensatieNodig: false,
      dispensatieMogelijk: false,
      messages: hasAnyOffWeight
        ? [...messages, "Verschil is toegestaan. Niet-op-gewicht kan een minpunt opleveren."]
        : [...messages, `Verschil binnen normale marge (${okMax.toFixed(1)} kg).`],
      effectiveMaxGewicht: effectiveMaxInfo.value,
      minToelaatbaarGewicht,
      maxToelaatbaarGewicht,
      maxSource: effectiveMaxInfo.source,
      withinRangeRood,
      withinRangeBlauw,
      nietOpGewichtRood,
      nietOpGewichtBlauw,
      teLichtRood,
      teLichtBlauw,
      teZwaarRood,
      teZwaarBlauw,
      hasAnyOffWeight,
      canProceedWithPenalty: hasAnyOffWeight,
      adminSanctieNodig: false,
      adminSanctieReason: null,
      isHeavyweightOpen,
      isMma,
    };
  }

  if (diff <= dispMax) {
    return {
      leeftijdType,
      diff,
      reglementStatus: hasAnyOffWeight ? "AFWIJKING_GEWICHT" : "AFWIJKING_DIFF",
      praktijkStatus: "DISPENSATIE_NODIG",
      eindStatus: dispVerleend ? "GOEDGEKEURD_MET_DISPENSATIE" : "DISPENSATIE_NODIG",
      dispensatieNodig: true,
      dispensatieMogelijk: true,
      messages: [
        ...messages,
        `Gewichtsverschil vraagt dispensatie (${okMax.toFixed(1)} t/m ${dispMax.toFixed(1)} kg).`,
        ...(hasAnyOffWeight ? ["Niet-op-gewicht kan daarnaast ook een minpunt opleveren."] : []),
      ],
      effectiveMaxGewicht: effectiveMaxInfo.value,
      minToelaatbaarGewicht,
      maxToelaatbaarGewicht,
      maxSource: effectiveMaxInfo.source,
      withinRangeRood,
      withinRangeBlauw,
      nietOpGewichtRood,
      nietOpGewichtBlauw,
      teLichtRood,
      teLichtBlauw,
      teZwaarRood,
      teZwaarBlauw,
      hasAnyOffWeight,
      canProceedWithPenalty: hasAnyOffWeight,
      adminSanctieNodig: false,
      adminSanctieReason: null,
      isHeavyweightOpen,
      isMma,
    };
  }

  return {
    leeftijdType,
    diff,
    reglementStatus: "HANDMATIGE_BEOORDELING",
    praktijkStatus: "HANDMATIGE_BEOORDELING",
    eindStatus: "HANDMATIGE_BEOORDELING",
    dispensatieNodig: false,
    dispensatieMogelijk: false,
    messages: [...messages, "Partij valt buiten automatische beoordeling."],
    effectiveMaxGewicht: effectiveMaxInfo.value,
    minToelaatbaarGewicht,
    maxToelaatbaarGewicht,
    maxSource: effectiveMaxInfo.source,
    withinRangeRood,
    withinRangeBlauw,
    nietOpGewichtRood,
    nietOpGewichtBlauw,
    teLichtRood,
    teLichtBlauw,
    teZwaarRood,
    teZwaarBlauw,
    hasAnyOffWeight,
    canProceedWithPenalty: false,
    adminSanctieNodig: false,
    adminSanctieReason: null,
    isHeavyweightOpen,
    isMma,
  };
}
