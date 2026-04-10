// lib/boutRulesEngine.ts

import dayjs from "dayjs";

export type RuleResultaat =
  | "OK"
  | "INFO"
  | "ACTIE"
  | "DISPENSATIE"
  | "AFKEUR"
  | "VERBOD";

export type Severity = "info" | "ok" | "warning" | "error";

export type BoutRuleHit = {
  rule: string;
  rule_code: string;
  resultaat: RuleResultaat;
  severity: Severity;
  boodschap: string;
  hoek?: "rood" | "blauw" | null;
};

export type FighterInput = {
  naam?: string | null;
  geboortedatum?: string | null;
  gewicht?: number | string | null;
  geslacht?: string | null;
  klasse?: string | null;
  partijen?: number | string | null;
  licentie?: any;
  startverbod?: any;
  keurmerk?: boolean | string | number | null;
  keurmerk_reden?: string | null;
  extra?: Record<string, any> | null;
};

export type BoutRulesInput = {
  rood: FighterInput;
  blauw: FighterInput;
  eventDate?: string | null;
  discipline?: string | null;
  sub_discipline?: string | null;
  klasse?: string | null;

  // runtime fallback keys uit popup/snapshot flows
  event_date?: string | null;
  evenement_datum?: string | null;
  datum?: string | null;
};

function s(v: any): string {
  return String(v ?? "").trim();
}

function normLower(v: any): string {
  return s(v).toLowerCase();
}

function toNum(v: any): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function parseIsoDateOnly(v: any): dayjs.Dayjs | null {
  if (!v) return null;
  const d = dayjs(String(v).trim());
  return d.isValid() ? d : null;
}

function ageOnReferenceDate(dob: dayjs.Dayjs | null, ref: dayjs.Dayjs | null): number | null {
  if (!dob || !ref) return null;
  if (!dob.isValid() || !ref.isValid()) return null;
  return ref.diff(dob, "year");
}

function ageOnEvent(dob?: string | null, eventDate?: string | null): number | null {
  return ageOnReferenceDate(parseIsoDateOnly(dob), parseIsoDateOnly(eventDate));
}

function parseGender(v: any): "M" | "V" | null {
  const x = normLower(v);
  if (!x) return null;
  if (x === "m" || x.includes("man") || x.includes("male")) return "M";
  if (x === "v" || x.includes("vrouw") || x.includes("female")) return "V";
  return null;
}

function asBoolLoose(v: any): boolean | null {
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "number") {
    if (v === 1) return true;
    if (v === 0) return false;
  }

  const x = normLower(v);
  if (!x) return null;

  if (
    ["ja", "j", "true", "1", "geldig", "ok", "actief", "active", "valid", "yes", "y"].includes(
      x
    )
  ) {
    return true;
  }

  if (
    ["nee", "n", "false", "0", "ongeldig", "invalid", "inactive", "verlopen", "no"].includes(x)
  ) {
    return false;
  }

  return null;
}

function resolveEventDate(input: BoutRulesInput): string | null {
  const raw =
    input?.eventDate ??
    (input as any)?.event_date ??
    (input as any)?.evenement_datum ??
    (input as any)?.datum ??
    null;

  const out = s(raw);
  return out || null;
}

function resolveLicenseValue(v: any): any {
  if (v == null) return null;

  if (typeof v !== "object") return v;

  return (
    v.geldig ??
    v.valid ??
    v.active ??
    v.actief ??
    v.licentie ??
    v.status ??
    v.value ??
    null
  );
}

function isValidLicense(v?: any): boolean {
  const resolved = resolveLicenseValue(v);
  const b = asBoolLoose(resolved);
  return b === true;
}

function hasStartverbod(v?: any): boolean {
  const resolved =
    v && typeof v === "object"
      ? v.startverbod ?? v.verbod ?? v.value ?? v.status ?? v.actief ?? v.active ?? v
      : v;

  const b = asBoolLoose(resolved);
  if (b === true) return true;

  const x = normLower(resolved);
  return ["verbod", "startverbod"].includes(x);
}

function resolveKeurmerkValue(v: any, extra?: Record<string, any> | null): boolean | null {
  const direct = asBoolLoose(v);
  if (direct != null) return direct;

  if (extra && typeof extra === "object") {
    const nested =
      extra.keurmerk ??
      extra.keurmerk_geldig ??
      extra.sportschool_keurmerk ??
      extra.geldig_keurmerk ??
      null;

    const nestedBool = asBoolLoose(nested);
    if (nestedBool != null) return nestedBool;
  }

  return null;
}

function resolveDateValue(v?: string | null, extra?: Record<string, any> | null): string | null {
  const out =
    s(v) ||
    s(extra?.geboortedatum) ||
    s(extra?.fp_geboortedatum) ||
    s(extra?.dob) ||
    null;

  return out || null;
}

function resolveLicenseDisplay(v?: any): string {
  if (v == null) return "leeg";
  if (typeof v === "object") {
    const resolved = resolveLicenseValue(v);
    return s(resolved) || "leeg";
  }
  return s(v) || "leeg";
}

function splitTokens(v: any): string[] {
  const x = String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!x) return [];

  return x
    .split(" ")
    .map((p) => p.trim())
    .filter((p) => p.length >= 2)
    .filter((p) => !["el", "al", "de", "van"].includes(p));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const n = b.length;
  const dp = new Array(n + 1);

  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;

    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }

  return dp[n];
}

function tokenSimilarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen ? 1 - dist / maxLen : 1;
}

function nameSimilar(aRaw: any, bRaw: any): boolean {
  const aTokens = splitTokens(aRaw);
  const bTokens = splitTokens(bRaw);

  if (!aTokens.length || !bTokens.length) return true;

  const aLast = aTokens[aTokens.length - 1];
  const bLast = bTokens[bTokens.length - 1];
  if (tokenSimilarity(aLast, bLast) < 0.78) return false;

  const aFirsts = aTokens.slice(0, -1);
  const bFirsts = bTokens.slice(0, -1);
  if (!aFirsts.length || !bFirsts.length) return true;

  let bestFirst = 0;
  for (const af of aFirsts) {
    for (const bf of bFirsts) {
      bestFirst = Math.max(bestFirst, tokenSimilarity(af, bf));
    }
  }

  return bestFirst >= 0.72;
}

function leeftijdsVerschilJeugd(dobR?: string | null, dobB?: string | null) {
  const rood = parseIsoDateOnly(dobR);
  const blauw = parseIsoDateOnly(dobB);

  if (!rood || !blauw) {
    return {
      type: "ACTIE" as const,
      diffMonths: null as number | null,
      diffDaysRemainder: null as number | null,
    };
  }

  const older = rood.isBefore(blauw) ? rood : blauw;
  const younger = rood.isBefore(blauw) ? blauw : rood;

  const diffMonths = Math.abs(younger.diff(older, "month"));
  const afterMonths = older.add(diffMonths, "month");
  const diffDaysRemainder = Math.abs(younger.diff(afterMonths, "day"));

  const dispThreshold = older.add(18, "month").add(1, "day");
  const verbodThreshold = older.add(24, "month");

  const isVerbod =
    younger.isSame(verbodThreshold, "day") || younger.isAfter(verbodThreshold, "day");
  const isDisp = younger.isAfter(dispThreshold, "day") && !isVerbod;

  if (isVerbod) {
    return {
      type: "VERBOD" as const,
      diffMonths,
      diffDaysRemainder,
    };
  }

  if (isDisp) {
    return {
      type: "DISPENSATIE" as const,
      diffMonths,
      diffDaysRemainder,
    };
  }

  return {
    type: "OK" as const,
    diffMonths,
    diffDaysRemainder,
  };
}

function isMmaBout(input: BoutRulesInput): boolean {
  const d = String(input?.discipline ?? "").toUpperCase();
  const sd = String(input?.sub_discipline ?? "").toUpperCase();
  const km = String(input?.klasse ?? "").toUpperCase();
  const mmaToken = km === "P" || km === "PRO" || km === "AMA" || km === "AMATEUR";

  return d.includes("MMA") || sd.includes("MMA") || km.includes("MMA") || mmaToken;
}

const MMA_JEUGD_AGE_BANDS: Array<{ min: number; max: number; label: string }> = [
  { min: 0, max: 11, label: "TE JONG" },
  { min: 12, max: 13, label: "CAT-13" },
  { min: 14, max: 15, label: "CAT-15" },
  { min: 16, max: 17, label: "CAT-17" },
];

function mmaJeugdAgeBand(age: number | null) {
  if (typeof age !== "number") return null;
  for (const b of MMA_JEUGD_AGE_BANDS) {
    if (age >= b.min && age <= b.max) return b;
  }
  return null;
}

function pushUnique(hits: BoutRuleHit[], hit: BoutRuleHit) {
  const exists = hits.some((h) => h.rule_code === hit.rule_code && h.hoek === hit.hoek);
  if (!exists) hits.push(hit);
}

function rankResultaat(r: RuleResultaat): number {
  if (r === "VERBOD") return 6;
  if (r === "AFKEUR") return 5;
  if (r === "DISPENSATIE") return 4;
  if (r === "ACTIE") return 3;
  if (r === "INFO") return 2;
  return 1;
}

export function summarizeBoutRuleHits(hits: BoutRuleHit[]) {
  const top = hits.reduce<RuleResultaat>(
    (best, h) => (rankResultaat(h.resultaat) > rankResultaat(best) ? h.resultaat : best),
    "OK"
  );

  return {
    resultaat: top,
    hasVerbod: hits.some((h) => h.resultaat === "VERBOD"),
    hasAfkeur: hits.some((h) => h.resultaat === "AFKEUR"),
    hasDispensatie: hits.some((h) => h.resultaat === "DISPENSATIE"),
    hasActie: hits.some((h) => h.resultaat === "ACTIE"),
    hasInfo: hits.some((h) => h.resultaat === "INFO"),
    count: hits.length,
  };
}

export function boutRulesEngine(input: BoutRulesInput): BoutRuleHit[] {
  const hits: BoutRuleHit[] = [];

  const eventDate = resolveEventDate(input);
  const mma = isMmaBout(input);

  const rood = input.rood ?? {};
  const blauw = input.blauw ?? {};

  const roodDob = resolveDateValue(rood.geboortedatum, rood.extra ?? null);
  const blauwDob = resolveDateValue(blauw.geboortedatum, blauw.extra ?? null);

  const roodKeurmerk = resolveKeurmerkValue(rood.keurmerk, rood.extra ?? null);
  const blauwKeurmerk = resolveKeurmerkValue(blauw.keurmerk, blauw.extra ?? null);

  const ageR = ageOnEvent(roodDob, eventDate);
  const ageB = ageOnEvent(blauwDob, eventDate);

  const jeugd =
    (typeof ageR === "number" && ageR < 18) ||
    (typeof ageB === "number" && ageB < 18) ||
    String(input?.klasse ?? "").toUpperCase().includes("JEUGD");

  const mmaJeugd = jeugd && mma;

  if (!eventDate) {
    pushUnique(hits, {
      rule: "Eventdatum ontbreekt",
      rule_code: "EVENTDATUM_ONTBREEKT",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap:
        "Geen eventdatum ontvangen. Leeftijd op wedstrijddatum kon niet volledig worden berekend.",
    });
  }

  if (hasStartverbod(rood.startverbod)) {
    pushUnique(hits, {
      rule: "Vechter heeft startverbod",
      rule_code: "STARTVERBOD_ROOD",
      resultaat: "VERBOD",
      severity: "error",
      boodschap: "Rood heeft een startverbod en mag niet deelnemen.",
      hoek: "rood",
    });
  }

  if (hasStartverbod(blauw.startverbod)) {
    pushUnique(hits, {
      rule: "Vechter heeft startverbod",
      rule_code: "STARTVERBOD_BLAUW",
      resultaat: "VERBOD",
      severity: "error",
      boodschap: "Blauw heeft een startverbod en mag niet deelnemen.",
      hoek: "blauw",
    });
  }

  if (!isValidLicense(rood.licentie)) {
    pushUnique(hits, {
      rule: "Licentie ontbreekt/ongeldig",
      rule_code: "LICENTIE_ONGELDIG_ROOD",
      resultaat: "AFKEUR",
      severity: "warning",
      boodschap: `Rood heeft geen geldige licentie (waarde: "${resolveLicenseDisplay(
        rood.licentie
      )}").`,
      hoek: "rood",
    });
  }

  if (!isValidLicense(blauw.licentie)) {
    pushUnique(hits, {
      rule: "Licentie ontbreekt/ongeldig",
      rule_code: "LICENTIE_ONGELDIG_BLAUW",
      resultaat: "AFKEUR",
      severity: "warning",
      boodschap: `Blauw heeft geen geldige licentie (waarde: "${resolveLicenseDisplay(
        blauw.licentie
      )}").`,
      hoek: "blauw",
    });
  }

  if (roodKeurmerk === false) {
    pushUnique(hits, {
      rule: "Keurmerk sportschool ongeldig",
      rule_code: "KEURMERK_ONGELDIG_ROOD",
      resultaat: "AFKEUR",
      severity: "warning",
      boodschap: s(rood.keurmerk_reden) || "Rood sportschool heeft geen geldig keurmerk.",
      hoek: "rood",
    });
  }

  if (blauwKeurmerk === false) {
    pushUnique(hits, {
      rule: "Keurmerk sportschool ongeldig",
      rule_code: "KEURMERK_ONGELDIG_BLAUW",
      resultaat: "AFKEUR",
      severity: "warning",
      boodschap: s(blauw.keurmerk_reden) || "Blauw sportschool heeft geen geldig keurmerk.",
      hoek: "blauw",
    });
  }

  const gR = parseGender(rood.geslacht);
  const gB = parseGender(blauw.geslacht);
  if (gR && gB && gR !== gB) {
    pushUnique(hits, {
      rule: "Man tegen vrouw niet toegestaan",
      rule_code: "GESLACHT_VERBOD",
      resultaat: "VERBOD",
      severity: "error",
      boodschap: `Rood is ${gR === "M" ? "man" : "vrouw"} en blauw is ${
        gB === "M" ? "man" : "vrouw"
      } — dit is niet toegestaan.`,
    });
  }

  if (typeof ageR === "number" && ageR >= 40) {
    pushUnique(hits, {
      rule: "Sportmedisch advies vereist 40+",
      rule_code: "SPORTMEDISCH_ADVIES_40PLUS_ROOD",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap: `Rood is op eventdatum ${ageR} jaar. Vanaf 40 jaar is sportmedisch advies nodig.`,
      hoek: "rood",
    });
  }

  if (typeof ageB === "number" && ageB >= 40) {
    pushUnique(hits, {
      rule: "Sportmedisch advies vereist 40+",
      rule_code: "SPORTMEDISCH_ADVIES_40PLUS_BLAUW",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap: `Blauw is op eventdatum ${ageB} jaar. Vanaf 40 jaar is sportmedisch advies nodig.`,
      hoek: "blauw",
    });
  }

  if (typeof ageR === "number" && typeof ageB === "number") {
    const mix = (ageR < 18 && ageB >= 18) || (ageB < 18 && ageR >= 18);
    if (mix) {
      pushUnique(hits, {
        rule: "Jeugd vs volwassen verboden",
        rule_code: "JEUGD_VS_VOLWASSEN_VERBOD",
        resultaat: "VERBOD",
        severity: "error",
        boodschap: `Rood leeftijd (event): ${ageR} • Blauw leeftijd (event): ${ageB} — mix jeugd/volwassen is niet toegestaan.`,
      });
    }
  } else if (jeugd) {
    pushUnique(hits, {
      rule: "Jeugd vs volwassen niet controleerbaar",
      rule_code: "JEUGD_VS_VOLWASSEN_GEEN_DATA",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap:
        "Geboortedatum en/of eventdatum ontbreekt — kan niet bepalen of dit een jeugd/volwassen partij is.",
    });
  }

  if (mma) {
    const minAge =
      typeof ageR === "number" && typeof ageB === "number"
        ? Math.min(ageR, ageB)
        : typeof ageR === "number"
        ? ageR
        : typeof ageB === "number"
        ? ageB
        : null;

    if (typeof minAge === "number" && minAge < 12) {
      pushUnique(hits, {
        rule: "MMA onder 12 jaar verboden",
        rule_code: "MMA_LEEFTIJD_VERBOD",
        resultaat: "VERBOD",
        severity: "error",
        boodschap: `Minimale leeftijd in de partij is ${minAge} — MMA wedstrijden zijn verboden onder 12 jaar.`,
      });
    }
  }

  if (jeugd) {
    if (mmaJeugd) {
      const bandR = mmaJeugdAgeBand(ageR);
      const bandB = mmaJeugdAgeBand(ageB);

      if (!bandR || !bandB) {
        pushUnique(hits, {
          rule: "MMA jeugd: leeftijdscategorie niet controleerbaar",
          rule_code: "MMA_JEUGD_GEEN_INFO",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap:
            "Geboortedatum en/of eventdatum ontbreekt — MMA jeugd leeftijdscategorie kan niet gecontroleerd worden.",
        });
      } else if (bandR.label !== bandB.label) {
        pushUnique(hits, {
          rule: "MMA jeugd: verschillende leeftijdscategorie",
          rule_code: "MMA_JEUGD_CAT_AFKEUR",
          resultaat: "AFKEUR",
          severity: "warning",
          boodschap: `Rood valt in categorie ${bandR.label} (leeftijd ${ageR}) en blauw in ${bandB.label} (leeftijd ${ageB}) — afkeur.`,
        });
      }
    } else {
      const lv = leeftijdsVerschilJeugd(roodDob, blauwDob);

      if (lv.type === "ACTIE") {
        pushUnique(hits, {
          rule: "Leeftijdsverschil niet controleerbaar (jeugd)",
          rule_code: "LEEFTIJDSVERSCHIL_JEUGD_GEEN_DATA",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap:
            "Geboortedatum ontbreekt bij rood en/of blauw — jeugd leeftijdsverschil kan niet gecontroleerd worden.",
        });
      } else if (lv.type === "DISPENSATIE") {
        pushUnique(hits, {
          rule: "Leeftijdsverschil 18-24 maanden (jeugd)",
          rule_code: "LEEFTIJD_VERSCHIL_JEUGD_DISPENSATIE",
          resultaat: "DISPENSATIE",
          severity: "warning",
          boodschap: `Leeftijdsverschil: ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen — vanaf 18 maanden verschil is dispensatie vereist.`,
        });
      } else if (lv.type === "VERBOD") {
        pushUnique(hits, {
          rule: "Leeftijdsverschil te groot (jeugd)",
          rule_code: "LEEFTIJD_VERSCHIL_JEUGD_VERBOD",
          resultaat: "VERBOD",
          severity: "error",
          boodschap: `Leeftijdsverschil: ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen — vanaf 24 maanden verschil is dit verboden.`,
        });
      }

      if (
        typeof ageR === "number" &&
        typeof ageB === "number" &&
        ((ageR === 14 && ageB <= 9) || (ageB === 14 && ageR <= 9))
      ) {
        pushUnique(hits, {
          rule: "Leeftijdsverschil extreme jeugd",
          rule_code: "LEEFTIJD_VERBOD_14_VS_9",
          resultaat: "VERBOD",
          severity: "error",
          boodschap: "Een match zoals 14 jaar tegen 9 jaar is niet toegestaan.",
        });
      }
    }

    const partijenR = toNum(rood.partijen) ?? 0;
    const partijenB = toNum(blauw.partijen) ?? 0;
    const verschil = Math.abs(partijenR - partijenB);
    const minPartijen = Math.min(partijenR, partijenB);

    if (minPartijen < 15 && verschil > 4) {
      pushUnique(hits, {
        rule: "Jeugd: partijverschil te groot",
        rule_code: "PARTIJVERSCHIL_DISPENSATIE",
        resultaat: "DISPENSATIE",
        severity: "warning",
        boodschap: `Jeugd partijverschil: Rood ${partijenR} partijen • Blauw ${partijenB} partijen • Verschil ${verschil}. Zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan.`,
      });
    }
  }

  const gewichtR = toNum(rood.gewicht);
  const gewichtB = toNum(blauw.gewicht);
  if (gewichtR != null && gewichtB != null) {
    const diff = Math.abs(gewichtR - gewichtB);
    if (jeugd) {
      if (diff >= 5) {
        pushUnique(hits, {
          rule: "Gewichtsverschil jeugd",
          rule_code: "GEWICHT_VERBOD_JEUGD",
          resultaat: "VERBOD",
          severity: "error",
          boodschap: `Gewichtsverschil van ${diff.toFixed(2)} kg is bij jeugd te groot.`,
        });
      } else if (diff >= 3) {
        pushUnique(hits, {
          rule: "Gewichtsverschil jeugd",
          rule_code: "GEWICHT_DISPENSATIE_JEUGD",
          resultaat: "DISPENSATIE",
          severity: "warning",
          boodschap: `Gewichtsverschil van ${diff.toFixed(2)} kg vereist extra aandacht bij jeugd.`,
        });
      }
    } else {
      if (diff >= 10) {
        pushUnique(hits, {
          rule: "Gewichtsverschil",
          rule_code: "GEWICHT_VERBOD",
          resultaat: "VERBOD",
          severity: "error",
          boodschap: `Gewichtsverschil van ${diff.toFixed(2)} kg is te groot.`,
        });
      } else if (diff >= 7) {
        pushUnique(hits, {
          rule: "Gewichtsverschil",
          rule_code: "GEWICHT_DISPENSATIE",
          resultaat: "DISPENSATIE",
          severity: "warning",
          boodschap: `Gewichtsverschil van ${diff.toFixed(2)} kg vereist extra aandacht.`,
        });
      }
    }
  }

  if (!nameSimilar(rood.naam, rood.naam)) {
    void 0;
  }

  if (hits.length === 0) {
    hits.push({
      rule: "Geen bijzonderheden",
      rule_code: "OK",
      resultaat: "OK",
      severity: "ok",
      boodschap: "De partij voldoet aan de basisvoorwaarden voor de popup-check.",
    });
  }

  return hits;
}