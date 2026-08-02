"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Ban,
  Download,
  Eye,
  Globe2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Trophy,
  Unlink,
  Users,
} from "lucide-react";

const ORANGE = "#ff4d00";
const LOGO = "/branding/fightsupport/excel-logo.png";

type Fighter = Record<string, any>;
type ResultRow = Record<string, any>;
type FilterKey = "all" | "no_license" | "no_keurmerk" | "afgemeld";

function s(v: unknown) {
  return String(v ?? "").trim();
}
function lower(v: unknown) {
  return s(v).toLowerCase();
}
function val(v: unknown) {
  return s(v) || "-";
}
function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return "";
}
function onlyDigits(v: any) {
  return String(v ?? "")
    .replace(/[^\d]/g, "")
    .trim();
}
function name(f: Fighter) {
  return (
    s(f.aanmelding_naam) ||
    s(f.naam) ||
    "Onbekend"
  );
}
function rowKeyOf(f: Fighter) {
  return s(
    pickFirst(
      f.inschrijving_id,
      f.id,
      f.context_id,
      f.va_nummer,
      f.va,
      f.fighter_id,
    ),
  );
}
function inschrijvingIdOf(f: Fighter) {
  return s(pickFirst(f.inschrijving_id, f.id));
}
function detailIdOf(f: Fighter) {
  // Het dossier is het centrale FightPassport-dossier van de vechter.
  // De matchmaking in de URL is alleen context voor de terugknop.
  return vaOf(f) || onlyDigits(f.fighter_id);
}
function vaOf(f: Fighter) {
  return onlyDigits(
    pickFirst(
      f.aanmelding_va_nummer,
      f.va_nummer,
      f.va,
    ),
  );
}
function gymOf(f: Fighter) {
  return val(
    pickFirst(
      f.aanmelding_sportschool,
      f.aanmelding_gym,
      f.sportschool,
      f.gym,
    ),
  );
}
function normalizeClassLabel(v: unknown) {
  const raw = s(v);
  if (!raw || raw === "-") return "-";

  const token = normalizeClassToken(raw);
  const labels: Record<string, string> = {
    j: "J",
    "j+": "J+",
    r: "R",
    n: "N",
    c: "C",
    b: "B",
    a: "A",
    amateur: "Amateur",
    pro: "Pro",
  };

  return labels[token] || raw;
}

function opgegevenKlasseOf(f: Fighter) {
  return normalizeClassLabel(
    pickFirst(
      f.aanmelding_klasse,
      f.klasse_input,
      f.klasse_mm,
      f.klasse,
      getPath(f, "aanmelding.klasse"),
      getPath(f, "extra.aanmelding.klasse"),
      getPath(f, "extra.raw.aanmelding.klasse"),
      getPath(f, "raw.aanmelding.klasse"),
    ),
  );
}

function klasseOf(f: Fighter) {
  // Voor de indeling op de matchpagina is de klasse van opgave leidend.
  // FighterRules controleert afzonderlijk of die klasse overeenkomt met de
  // berekende klasse en de uitslagenhistorie.
  const opgegeven = opgegevenKlasseOf(f);
  if (opgegeven !== "-") return opgegeven;

  return normalizeClassLabel(
    pickFirst(
      f.berekende_klasse,
      f.mma_level,
      f.nulmeting_klasse,
    ),
  );
}
function disciplineOf(f: Fighter) {
  // Voor matchmaking is de discipline van de aanmelding leidend.
  return val(
    pickFirst(
      f.aanmelding_discipline,
      f.discipline,
      getPath(f, "aanmelding.discipline"),
      f.nulmeting_discipline,
      f.primary_discipline,
    ),
  );
}
function geslachtOf(f: Fighter) {
  const g = lower(f.geslacht);

  if (
    ["m", "man", "male", "heer", "heren", "jongen", "jongens", "mannelijk"].includes(g)
  )
    return "Man";

  if (
    ["v", "vrouw", "female", "dame", "dames", "meisje", "meisjes", "vrouwelijk"].includes(g)
  )
    return "Vrouw";

  return "Onbekend";
}
function klasseTabOf(f: Fighter) {
  const k = lower(klasseOf(f));
  const discipline = lower(disciplineOf(f));
  const isMma = discipline.includes("mma") || discipline.includes("mixed martial");
  const leeftijd = leeftijdSortValue(f);
  const isVolwassen = Number.isFinite(leeftijd) && leeftijd >= 18;

  // Vanaf 18 jaar mag iemand nooit meer in een jeugdtab worden geplaatst.
  // Bij een ongeldige jeugd-opgave gebruiken we alleen voor de zichtbare tab
  // de berekende volwassen klasse als veilige terugval; fighterRules meldt de fout.
  if (
    k.includes("jeugd") ||
    k === "j" ||
    k === "j+" ||
    k.includes("talentstatus") ||
    k.includes("youth")
  ) {
    if (isVolwassen) {
      const volwassenFallback = lower(
        normalizeClassLabel(
          pickFirst(f.berekende_klasse, f.mma_level, f.nulmeting_klasse),
        ),
      );
      if (volwassenFallback && volwassenFallback !== k) {
        if (volwassenFallback.includes("nieuweling") || volwassenFallback === "n") return "N";
        if (volwassenFallback === "r" || volwassenFallback.includes("r-klasse") || volwassenFallback.includes("r klasse")) return "R";
        if (volwassenFallback === "c" || volwassenFallback.includes("c-klasse") || volwassenFallback.includes("c klasse")) return "C";
        if (volwassenFallback === "b" || volwassenFallback.includes("b-klasse") || volwassenFallback.includes("b klasse")) return "B";
        if (volwassenFallback === "a" || volwassenFallback.includes("a-klasse") || volwassenFallback.includes("a klasse")) return "A";
        if (volwassenFallback.includes("amateur") || volwassenFallback.includes("ama")) return "MMA Amateur";
        if (volwassenFallback.includes("pro")) return "MMA Pro";
      }
      return "Onbekend";
    }
    return isMma ? "MMA Youth" : "Jeugd";
  }
  if (
    k.includes("nieuweling") ||
    k === "n" ||
    k.includes("n-klasse") ||
    k.includes("n klasse")
  )
    return "N";
  if (k.includes("r-klasse") || k.includes("r klasse") || k === "r") return "R";
  if (k.includes("c-klasse") || k.includes("c klasse") || k === "c") return "C";
  if (k.includes("b-klasse") || k.includes("b klasse") || k === "b") return "B";
  if (k.includes("a-klasse") || k.includes("a klasse") || k === "a") return "A";
  if (k.includes("amateur") || k.includes("ama")) return "MMA Amateur";
  if (k.includes("pro")) return "MMA Pro";
  return "Onbekend";
}
function geslachtTabOf(f: Fighter) {
  const g = lower(geslachtOf(f));
  if (g.includes("vrouw") || g.includes("dame") || g.includes("meis"))
    return "Vrouw";
  if (g.includes("man") || g.includes("heer") || g.includes("jong"))
    return "Man";
  return "Onbekend";
}
function tabKeyOf(f: Fighter) {
  const k = klasseTabOf(f);
  const g = geslachtTabOf(f);
  const female = g === "Vrouw";

  if (k === "Jeugd") return female ? "jeugd-meisje" : "jeugd-jongen";
  if (k === "MMA Youth") return female ? "mma-youth-meisje" : "mma-youth-jongen";
  if (k === "MMA Amateur") return female ? "mma-amateur-dame" : "mma-amateur-heer";
  if (k === "MMA Pro") return female ? "mma-pro-dame" : "mma-pro-heer";
  if (["R", "N", "C", "B", "A"].includes(k))
    return `${k.toLowerCase()}-${female ? "dame" : "heer"}`;

  return `onbekend-${female ? "vrouw" : g === "Man" ? "man" : "onbekend"}`;
}

function classSelectLabel(key: string) {
  const labels: Record<string, string> = {
    "jeugd-jongen": "J - Jongen",
    "jeugd-meisje": "J - Meisje",
    "mma-youth-jongen": "MMA Youth - Jongen",
    "mma-youth-meisje": "MMA Youth - Meisje",
    "r-heer": "R - Heer",
    "r-dame": "R - Dame",
    "n-heer": "N - Heer",
    "n-dame": "N - Dame",
    "c-heer": "C - Heer",
    "c-dame": "C - Dame",
    "b-heer": "B - Heer",
    "b-dame": "B - Dame",
    "a-heer": "A - Heer",
    "a-dame": "A - Dame",
    "mma-amateur-heer": "MMA Amateur - Heer",
    "mma-amateur-dame": "MMA Amateur - Dame",
    "mma-pro-heer": "MMA Pro - Heer",
    "mma-pro-dame": "MMA Pro - Dame",
  };
  return labels[key] || "Onbekende klasse";
}
function parseWeightClassValue(raw: any): { value: number | null; isMaxClass: boolean; isOpenAbove: boolean } {
  const txt = s(raw);
  if (!txt) return { value: null, isMaxClass: false, isOpenAbove: false };

  const normalized = txt
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // -49, - 49, ≤49, <=49, tot 49 en onder 49 betekenen allemaal:
  // max/tot 49 kg. Dit is dus géén negatief gewicht.
  const isMaxClass =
    /^-\s*\d/.test(normalized) ||
    /^(≤|<=|<)\s*\d/.test(normalized) ||
    /\b(tot|onder|max|t\/m|tm)\b/.test(normalized);

  // 95+ is de open heavyweight klasse: vanaf 95 kg, zonder max.
  // Voor sortering hoort hij op 95 te staan, maar in beeld moet de + blijven staan.
  const isOpenAbove = /\d+(?:\.\d+)?\s*\+/.test(normalized) || /\b(vanaf|minimaal|min)\b/.test(normalized);

  const numberMatch = normalized.match(/\d+(?:\.\d+)?/);
  if (!numberMatch) return { value: null, isMaxClass, isOpenAbove };

  const value = Number(numberMatch[0]);
  return { value: Number.isFinite(value) ? value : null, isMaxClass, isOpenAbove };
}

function gewichtOf(f: Fighter) {
  // Voor matchmaking is het opgegeven gewicht leidend.
  const raw = pickFirst(
    f.aanmelding_gewicht,
    f.gewicht,
  );
  const txt = s(raw);
  if (!txt) return "-";

  const parsed = parseWeightClassValue(raw);
  if (parsed.value === null) return /kg/i.test(txt) ? txt : `${txt} kg`;

  const formatted = Number.isInteger(parsed.value)
    ? `${parsed.value}`
    : `${String(parsed.value).replace(".", ",")}`;

  if (parsed.isOpenAbove) return `${formatted}+ kg`;
  if (parsed.isMaxClass) return `-${formatted} kg`;
  return `${formatted} kg`;
}
function gewichtSortValue(f: Fighter) {
  const raw = pickFirst(
    f.aanmelding_gewicht,
    f.gewicht,
  );
  const parsed = parseWeightClassValue(raw);
  return parsed.value !== null ? parsed.value : Number.POSITIVE_INFINITY;
}
function parseDateOnly(v: any): Date | null {
  if (!v) return null;
  const txt = String(v).trim();
  const ymd = txt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd)
    return new Date(
      Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12),
    );
  const dmy = txt.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy)
    return new Date(
      Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12),
    );
  const d = new Date(txt);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12),
  );
}
function calcAge(dob: any, ref: any) {
  const birth = parseDateOnly(dob);
  const date = parseDateOnly(ref) || new Date();
  if (!birth) return "";
  let age = date.getUTCFullYear() - birth.getUTCFullYear();
  const m = date.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && date.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? `${age}` : "";
}
function fighterBirthDate(f: Fighter) {
  // Voor de leeftijd op het evenement is de gecontroleerde FightPassport-datum
  // leidend. Daarna volgen de normale en de oorspronkelijke invoerwaarde.
  return pickFirst(
    f.fp_geboortedatum,
    f.geboortedatum,
    f.geboortedatum_input,
    f.aanmelding_geboortedatum,
    getPath(f, "extra.raw.aanmelding.geboortedatum"),
  );
}

function fighterEventDate(f: Fighter) {
  return pickFirst(
    f.evenement_datum,
    f.event_datum,
    f.event_date,
    f.matchmaking_datum,
    f.datum,
  );
}

function leeftijdOf(f: Fighter) {
  return calcAge(fighterBirthDate(f), fighterEventDate(f)) || "-";
}

function leeftijdSortValue(f: Fighter) {
  const age = Number(calcAge(fighterBirthDate(f), fighterEventDate(f)));
  return Number.isFinite(age) && age >= 0 ? age : Number.POSITIVE_INFINITY;
}

function normVa(v: unknown) {
  return s(v).replace(/[^0-9]/g, "");
}

function rowMatchesFighter(row: ResultRow, f?: Fighter | null) {
  if (!f) return false;
  const va = vaOf(f);
  return !!va && onlyDigits(row.va_nummer) === va;
}

function getResultKind(v: unknown): "win" | "loss" | "draw" | "other" {
  const x = lower(v)
    .replace(/\s+/g, " ")
    .trim();

  // matchmaker_uitslagen_raw.uitslag is leidend.
  // Exacte betekenis:
  // - alles met "wint" = winst
  // - alles met "verliest" of "verlies" = verlies
  // - onbeslist/gelijk/draw = onbeslist
  // - demo/no contest = overige
  if (!x) return "other";
  if (x.includes("demo") || x.includes("no contest") || x.includes("nocontest") || x === "nc") return "other";
  if (x.includes("onbeslist") || x.includes("gelijk") || x.includes("draw")) return "draw";
  if (x.includes("verliest") || x.includes("verlies") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("wint") || x.includes("winst") || x.includes("gewonnen") || x === "win" || x === "w") return "win";

  return "other";
}

function normalizeClassToken(v: unknown) {
  const x = lower(v)
    .replace(/\b(?:klasse|class|clas)\b/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = x.replace(/[^a-z0-9+]/g, "");

  if (!compact || compact === "-") return "";

  // Bronnen kunnen dezelfde klasse tweetalig teruggeven, bijvoorbeeld:
  // "C-klasse/C-class", "B-klasse/B-class" of "A-klasse/A-class".
  // Na opschonen wordt dat respectievelijk "cc", "bb" of "aa".
  // Normaliseer dit altijd terug naar exact één klasseletter.
  const repeatedClass = compact.match(/^([jrncba])\1$/i);
  if (repeatedClass) return repeatedClass[1].toLowerCase();

  if (
    compact === "j+" ||
    compact.includes("j+") ||
    compact.includes("talentstatus")
  ) return "j+";
  if (compact === "j" || compact.startsWith("jeugd") || compact.includes("youth")) return "j";
  if (compact === "r" || compact.startsWith("rclas") || compact.startsWith("rclass") || compact.includes("recreant")) return "r";
  if (compact === "n" || compact.startsWith("nclas") || compact.startsWith("nclass") || compact.includes("nieuweling")) return "n";
  if (compact === "c" || compact.startsWith("cclas") || compact.startsWith("cclass")) return "c";
  if (compact === "b" || compact.startsWith("bclas") || compact.startsWith("bclass")) return "b";
  if (compact === "a" || compact.startsWith("aclas") || compact.startsWith("aclass") || compact.includes("elite")) return "a";
  if (compact.includes("amateur") || compact.includes("ama")) return "amateur";
  if (compact.includes("pro")) return "pro";

  return compact;
}

function cleanRecordClassLabel(value: unknown) {
  const raw = s(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw || raw === "-") return "-";
  if (raw.includes("AMATEUR")) return "Amateur";
  if (raw.includes("PRO")) return "Pro";
  if (raw.includes("JEUGD") || raw.includes("YOUTH") || raw === "J" || raw === "J+") return "J";
  if (raw.includes("NIEUWELING") || raw.includes("NEWCOMER")) return "N";

  // Ook waarden als "C-klasse/C-class" worden hierdoor exact "C".
  const match = raw.match(/\b(R|N|C|B|A)\b/);
  return match ? match[1] : "-";
}

function recordClassLabelOf(f: Fighter) {
  const candidates = [
    klasseTabOf(f),
    klasseOf(f),
    f.berekende_klasse,
    f.nulmeting_klasse,
    f.klasse,
    f.class,
  ];

  for (const candidate of candidates) {
    const raw = s(candidate);
    const token = normalizeClassToken(raw);

    if (token === "j" || token === "j+") return "J";
    if (token === "r") return "R";
    if (token === "n") return "N";
    if (token === "c") return "C";
    if (token === "b") return "B";
    if (token === "a") return "A";
    if (token === "amateur") return "Amateur";
    if (token === "pro") return "Pro";

    // Extra harde opvang voor bronwaarden zoals C-klasse/C-class.
    const explicit = raw.match(/(?:^|[^A-Z])([JRN CBA])(?:\s*[-/]?\s*(?:klasse|class|clas)|\b)/i);
    if (explicit) return explicit[1].toUpperCase();
  }

  return "-";
}

function normalizeRecordLabel(v: unknown) {
  const label = s(v)
    .trim()
    // Records uit de bron kunnen verschillende Unicode-streepjes bevatten.
    // Maak die eerst allemaal gelijk aan het normale minteken.
    .replace(/[‐‑‒–—−]/g, "-");

  // fighterRules kan bijvoorbeeld teruggeven:
  // "C-klasse/C-class 1-2-0 (1)", "AA 46-0-0 (10)" of "BClas 12-3-0".
  // Zoek daarom niet naar een specifieke klasseprefix, maar haal uitsluitend
  // het eerste echte W-L-D-record uit de tekst. De pagina plaatst daarna zelf
  // exact één genormaliseerde klasse vóór het record.
  const score = label.match(
    /(\d+)\s*-\s*(\d+)\s*-\s*(\d+)(?:\s*\((\d+)\))?/,
  );

  if (score) {
    const [, wins, losses, draws, overige] = score;
    return `${wins}-${losses}-${draws}${overige !== undefined ? ` (${overige})` : ""}`;
  }

  // Alleen als er helemaal geen numeriek record aanwezig is, verwijderen we
  // eventuele losse klasse-opmaak als veilige terugval.
  return label
    .replace(
      /^(?:(?:jeugd|nieuweling|[jrncb a])(?:\s*[-/]?\s*(?:klasse|class|clas))?\s*[/\s]*)+/i,
      "",
    )
    .trim();
}

function classRank(token: string) {
  // Volgorde voor stand-up record: J -> R optioneel -> N -> C -> B -> A.
  // Het record wordt altijd getoond in de hoogste klasse waarin een echte uitslag staat.
  const order: Record<string, number> = {
    j: 1,
    "j+": 1,
    r: 2,
    n: 3,
    c: 4,
    b: 5,
    a: 6,
    amateur: 3,
    pro: 6,
  };
  return order[token] ?? 0;
}

function getRowClass(row: ResultRow) {
  return normalizeClassToken(
    pickFirst(
      row?.klasse,
      row?.class,
      row?.wedstrijdklasse,
      row?.niveau,
      row?.fight_class,
    ),
  );
}

function highestRecordClassFromRows(rows: ResultRow[]) {
  let highest = "";
  let highestRank = 0;

  for (const row of rows) {
    const kind = getResultKind(pickFirst(row?.uitslag, row?.resultaat, row?.outcome));
    if (kind === "other") continue; // demo/no contest bepaalt nooit hoogste recordklasse

    const token = getRowClass(row);
    const rank = classRank(token);
    if (rank > highestRank) {
      highest = token;
      highestRank = rank;
    }
  }

  return highest;
}

function getUitslagenRows(f?: Fighter | null, allRows: ResultRow[] = []) {
  const inline = [
    f?.uitslagen,
    f?.uitslagen_raw,
    f?.matchmaker_uitslagen_raw,
    f?.raw?.uitslagen,
    f?.raw?.matchmaker_uitslagen_raw,
    f?.raw_json?.uitslagen,
    f?.raw_json?.matchmaker_uitslagen_raw,
    f?.extra?.uitslagen,
    f?.extra?.matchmaker_uitslagen_raw,
    f?.extra?.raw?.uitslagen,
    f?.extra?.raw?.matchmaker_uitslagen_raw,
  ];

  const rows: ResultRow[] = [];
  for (const list of inline) {
    if (Array.isArray(list)) rows.push(...list);
  }

  if (Array.isArray(allRows) && allRows.length) {
    rows.push(...allRows.filter((r) => rowMatchesFighter(r, f)));
  }

  // Voorkom dubbeltelling wanneer dezelfde uitslag zowel inline als uit matchmaker_uitslagen_raw komt.
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = s(
      pickFirst(
        row?.id,
        [row?.va_nummer, row?.datum, row?.evenement, row?.tegenstander, row?.uitslag, row?.klasse]
          .map((x) => s(x).toLowerCase())
          .join("|"),
      ),
    );
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function demoToPartijEquivalent(demo: number) {
  return Math.floor(Math.max(0, demo) / 3);
}

function effectiveTotalWithDemo(totalInclDemo: number, demo: number) {
  return Math.max(0, totalInclDemo - demo + demoToPartijEquivalent(demo));
}

function totaalPartijenSortValue(f: Fighter) {
  const direct = pickFirst(
    f.totaal_wedstrijden,
    f.totaal_partijen,
    f.aantal_partijen,
    f.total_fights,
    f.fights_total,
    f.uitslagen_count,
    f.partijen,
  );
  const directNumber = Number(String(direct ?? "").replace(/[^\d.-]/g, ""));
  if (Number.isFinite(directNumber)) return directNumber;

  const w = Number(
    String(pickFirst(f.win, f.wins, f.winst, f.record_w) || 0).replace(
      /[^\d.-]/g,
      "",
    ),
  );
  const l = Number(
    String(pickFirst(f.loss, f.losses, f.verlies, f.record_l) || 0).replace(
      /[^\d.-]/g,
      "",
    ),
  );
  const d = Number(
    String(pickFirst(f.draw, f.draws, f.onbeslist, f.record_d) || 0).replace(
      /[^\d.-]/g,
      "",
    ),
  );
  const total =
    (Number.isFinite(w) ? w : 0) +
    (Number.isFinite(l) ? l : 0) +
    (Number.isFinite(d) ? d : 0);
  return total > 0 ? total : Number.POSITIVE_INFINITY;
}
function sortFightersInTab(a: Fighter, b: Fighter) {
  const klasseVolgorde: Record<string, number> = {
    a: 0,
    b: 1,
    c: 2,
    n: 3,
    "j+": 4,
    j: 5,
  };

  const klasseA = normalizeClassToken(klasseOf(a));
  const klasseB = normalizeClassToken(klasseOf(b));
  const klasseDiff = (klasseVolgorde[klasseA] ?? 99) - (klasseVolgorde[klasseB] ?? 99);
  if (klasseDiff !== 0) return klasseDiff;

  const gewichtDiff = gewichtSortValue(a) - gewichtSortValue(b);
  if (gewichtDiff !== 0) return gewichtDiff;

  const leeftijdDiff = leeftijdSortValue(a) - leeftijdSortValue(b);
  if (leeftijdDiff !== 0) return leeftijdDiff;

  return name(a).localeCompare(name(b), "nl");
}
function recordClassDisplay(token: string) {
  const labels: Record<string, string> = {
    j: "J",
    "j+": "J",
    r: "R",
    n: "N",
    c: "C",
    b: "B",
    a: "A",
    amateur: "Amateur",
    pro: "Pro",
  };
  return labels[token] || "-";
}

function recordOf(f: Fighter, allRows: ResultRow[] = []) {
  // Het zichtbare record wordt rechtstreeks uit de uitslagen opgebouwd:
  // hoogste klasse met een echte W/L/D-uitslag, W-L-D binnen die klasse,
  // en alle overige partijen samen tussen haakjes.
  const rows = getUitslagenRows(f, allRows);
  const highestClass = highestRecordClassFromRows(rows);

  if (highestClass) {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let overige = 0;

    for (const row of rows) {
      const kind = getResultKind(
        pickFirst(row?.uitslag, row?.resultaat, row?.outcome),
      );
      const rowClass = getRowClass(row);

      if (rowClass === highestClass && kind === "win") wins += 1;
      else if (rowClass === highestClass && kind === "loss") losses += 1;
      else if (rowClass === highestClass && kind === "draw") draws += 1;
      else overige += 1;
    }

    return `${recordClassDisplay(highestClass)} ${wins}-${losses}-${draws} (${overige})`;
  }

  // Alleen voor oude contextregels zonder uitslagen blijft het door fighterRules
  // opgeslagen record beschikbaar als terugval.
  const ruleRecord = pickFirst(
    f.record_label,
    f.recordLabel,
    f.berekend_record,
    f.berekende_record,
    f.record_berekend,
    f.record,
    getPath(f, "fighterRules.recordLabel"),
    getPath(f, "fighterRules.record_label"),
    getPath(f, "fighter_rules.recordLabel"),
    getPath(f, "fighter_rules.record_label"),
    getPath(f, "rules.recordLabel"),
    getPath(f, "rules.record_label"),
    getPath(f, "rule_result.recordLabel"),
    getPath(f, "rule_result.record_label"),
    getPath(f, "rules_result.recordLabel"),
    getPath(f, "rules_result.record_label"),
    getPath(f, "extra.fighterRules.recordLabel"),
    getPath(f, "extra.fighter_rules.record_label"),
    getPath(f, "raw.fighterRules.recordLabel"),
    getPath(f, "raw.fighter_rules.record_label"),
  );

  if (s(ruleRecord)) {
    const cls = cleanRecordClassLabel(recordClassLabelOf(f));
    const normalized = normalizeRecordLabel(ruleRecord);
    if (normalized) return `${cls} ${normalized}`;
  }

  return `${cleanRecordClassLabel(recordClassLabelOf(f))} 0-0-0 (0)`;
}
function statusLic(f: Fighter) {
  const x = lower(
    pickFirst(f.licentie_status, f.licentie, f.licentie_ok, f.raw?.licentie),
  );
  if (["ja", "true", "geldig", "ok", "1", "valid", "yes", "y"].includes(x))
    return "ok";
  if (
    !x ||
    ["nee", "false", "ongeldig", "geen", "0", "invalid", "no", "n"].includes(
      x,
    ) ||
    x.includes("geen")
  )
    return "bad";
  return "unknown";
}
function statusKeur(f: Fighter) {
  const raw = pickFirst(
    f.heeft_keurmerk,
    f.keurmerk,
    f.keurmerk_status,
    f.keurmerk_ok,
    f.sportschool_keurmerk,
    f.gym_keurmerk,
    f.fp_keurmerk,
    f.extra?.heeft_keurmerk,
    f.extra?.keurmerk,
    f.raw?.keurmerk,
    f.raw?.heeft_keurmerk,
  );
  const x = lower(raw);
  if (
    ["ja", "true", "geldig", "ok", "1", "yes", "y"].includes(x) ||
    x.includes("keurmerk ja") ||
    x.includes("heeft keurmerk")
  )
    return "ok";
  if (
    !x ||
    ["nee", "false", "ongeldig", "geen", "0", "no", "n"].includes(x) ||
    x.includes("geen keurmerk") ||
    x.includes("zonder keurmerk") ||
    x.includes("niet erkend")
  )
    return "bad";
  return "unknown";
}
function obj(v: any) {
  if (!v) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;
  try {
    const parsed = JSON.parse(v);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function getPath(source: any, path: string) {
  let cur = source;
  for (const part of path.split(".")) {
    cur = obj(cur) ?? cur;
    if (!cur || typeof cur !== "object") return "";
    cur = cur?.[part];
  }
  return cur;
}
function normalizeStatus(raw: string) {
  const status = raw.toLowerCase().trim();

  if (
    [
      "gescrapt",
      "gescraped",
      "scraped",
      "gecontroleerd",
      "checked",
      "verwerkt",
      "processed",
      "klaar",
      "done",
    ].includes(status)
  )
    return "gescrapt";

  if (["scrape_mislukt", "mislukt", "failed", "error", "fout"].includes(status))
    return "scrape_mislukt";

  if (
    [
      "controle_bezig",
      "bezig",
      "running",
      "scraping",
      "processing",
      "in_progress",
    ].includes(status)
  )
    return "controle_bezig";

  if (["gematcht", "matched"].includes(status)) return "gematcht";
  if (["afgemeld", "cancelled", "canceled"].includes(status)) return "afgemeld";

  if (
    [
      "nieuw",
      "rauw",
      "raw",
      "open",
      "aangemeld",
      "uploaded",
      "upload",
      "",
    ].includes(status)
  )
    return "rauw";

  return status || "rauw";
}

function hasValue(v: unknown) {
  return s(v).length > 0;
}

function pickStatusValue(r: Fighter) {
  return pickFirst(
    r.__fs_aanmelding_status,
    r.__fs_status,
    r.__fs_gematcht ? "gematcht" : "",
    r.status,
    r.aanmelding_status,
    r.inschrijving_status,
    r.controle_status,
    r.scrape_status,
    r.fightpaspoort_status,
    getPath(r, "aanmelding.status"),
    getPath(r, "aanmelding.aanmelding_status"),
    getPath(r, "extra.aanmelding.status"),
    getPath(r, "extra.aanmelding.aanmelding_status"),
    getPath(r, "extra.raw.aanmelding.status"),
    getPath(r, "extra.raw.aanmelding.aanmelding_status"),
    getPath(r, "raw.aanmelding.status"),
    getPath(r, "raw.aanmelding.aanmelding_status"),
    getPath(r, "extra.raw.status"),
    getPath(r, "raw.status"),
  );
}

function statusOf(f: Fighter) {
  const normalized = normalizeStatus(String(pickStatusValue(f) ?? ""));

  const hasFailure =
    normalized === "scrape_mislukt" ||
    hasValue(f?.scrape_failed_at) ||
    hasValue(f?.scrape_error) ||
    hasValue(f?.error) ||
    hasValue(getPath(f, "aanmelding.scrape_failed_at")) ||
    hasValue(getPath(f, "extra.raw.aanmelding.scrape_failed_at")) ||
    hasValue(getPath(f, "raw.aanmelding.scrape_failed_at"));

  if (hasFailure) return "scrape_mislukt";

  // Exact dezelfde voorrang als op de aanmeldingenpagina:
  // gematcht en afgemeld mogen NIET overschreven worden door scraped_at/controle_run_id.
  if (normalized === "gematcht" || normalized === "afgemeld") return normalized;

  const isRunning =
    normalized === "controle_bezig" ||
    hasValue(f?.scrape_started_at) ||
    hasValue(f?.controle_started_at) ||
    hasValue(getPath(f, "aanmelding.scrape_started_at")) ||
    hasValue(getPath(f, "extra.raw.aanmelding.scrape_started_at")) ||
    hasValue(getPath(f, "raw.aanmelding.scrape_started_at"));

  const hasScrapeSignal =
    normalized === "gescrapt" ||
    hasValue(f?.scraped_at) ||
    hasValue(f?.controle_run_id) ||
    hasValue(f?.checked_at) ||
    hasValue(f?.fightpaspoort_checked_at) ||
    hasValue(getPath(f, "aanmelding.scraped_at")) ||
    hasValue(getPath(f, "extra.raw.aanmelding.scraped_at")) ||
    hasValue(getPath(f, "raw.aanmelding.scraped_at"));

  if (hasScrapeSignal) return "gescrapt";
  if (isRunning) return "controle_bezig";

  return normalized;
}

function isAfgemeld(f: Fighter) {
  return statusOf(f) === "afgemeld";
}

function isGematcht(f: Fighter) {
  return statusOf(f) === "gematcht";
}

function displayStatusOf(f: Fighter) {
  if (isGematcht(f)) return "Gematcht";
  if (isAfgemeld(f)) return "Afgemeld";
  return "Beschikbaar";
}

function displayStatusIconOf(f: Fighter) {
  if (isGematcht(f)) return "⚔️";
  if (isAfgemeld(f)) return "🚫";
  return "●";
}

function isBlockedFromMatching(f: Fighter) {
  return isAfgemeld(f) || isGematcht(f);
}

function isControlledFighter(f: Fighter) {
  const status = statusOf(f);

  // Deze pagina is "Gecontroleerde vechters": rauwe uploads, open aanmeldingen
  // en lopende checks horen hier nog niet thuis.
  return (
    status === "gescrapt" || status === "gematcht" || status === "afgemeld"
  );
}

function buildAanmeldingStatusMaps(aanmeldingen: Fighter[]) {
  const byId = new Map<string, string>();
  const byVa = new Map<string, string>();

  for (const a of aanmeldingen || []) {
    const status = statusOf(a);
    const id = s(pickFirst(a.id, a.aanmelding_id, a.inschrijving_id));
    const va = onlyDigits(pickFirst(a.va_nummer, a.va, a.fightpaspoort_nummer));

    if (id) byId.set(id, status);
    if (va) byVa.set(va, status);
  }

  return { byId, byVa };
}

function mergeAanmeldingStatusIntoFighters(
  fighters: Fighter[],
  aanmeldingen: Fighter[],
) {
  const { byId, byVa } = buildAanmeldingStatusMaps(aanmeldingen);

  return fighters.map((f) => {
    const id = inschrijvingIdOf(f);
    const va = vaOf(f);
    const aanmeldingStatus = (id && byId.get(id)) || (va && byVa.get(va)) || "";

    return aanmeldingStatus
      ? { ...f, __fs_aanmelding_status: aanmeldingStatus }
      : f;
  });
}

function aanmeldingAsMatchFighter(a: Fighter): Fighter {
  const id = s(pickFirst(a.id, a.aanmelding_id, a.inschrijving_id));
  const va = onlyDigits(
    pickFirst(a.va_nummer, a.va, a.fightpaspoort_nummer),
  );

  return {
    ...a,
    id,
    inschrijving_id: id,
    aanmelding_id: id,
    va_nummer: va || pickFirst(a.va_nummer, a.va),
    aanmelding_va_nummer: va || pickFirst(a.va_nummer, a.va),
    aanmelding_naam: pickFirst(a.naam, a.volledige_naam),
    aanmelding_sportschool: pickFirst(
      a.sportschool,
      a.gym,
      a.sportschool_naam,
    ),
    aanmelding_gym: pickFirst(a.gym, a.sportschool, a.sportschool_naam),
    aanmelding_gewicht: pickFirst(a.gewicht, a.gewicht_kg),
    aanmelding_klasse: pickFirst(a.klasse, a.klasse_mm),
    aanmelding_discipline: pickFirst(a.discipline, a.sport),
    __fs_aanmelding_status: statusOf(a),
    __fs_context_ontbreekt: true,
  };
}

function mergeAllAanmeldingenIntoFighters(
  contextFighters: Fighter[],
  aanmeldingen: Fighter[],
) {
  const merged = mergeAanmeldingStatusIntoFighters(
    contextFighters,
    aanmeldingen,
  );

  const contextIds = new Set(
    merged.map(inschrijvingIdOf).filter(Boolean),
  );

  const vaCounts = new Map<string, number>();
  for (const a of aanmeldingen) {
    const va = onlyDigits(
      pickFirst(a.va_nummer, a.va, a.fightpaspoort_nummer),
    );
    if (va) vaCounts.set(va, (vaCounts.get(va) ?? 0) + 1);
  }

  const contextVas = new Set(
    merged.map(vaOf).filter(Boolean),
  );

  for (const aanmelding of aanmeldingen) {
    const id = s(
      pickFirst(
        aanmelding.id,
        aanmelding.aanmelding_id,
        aanmelding.inschrijving_id,
      ),
    );
    const va = onlyDigits(
      pickFirst(
        aanmelding.va_nummer,
        aanmelding.va,
        aanmelding.fightpaspoort_nummer,
      ),
    );

    const alreadyPresentById = !!id && contextIds.has(id);
    const safelyPresentByVa =
      !id &&
      !!va &&
      vaCounts.get(va) === 1 &&
      contextVas.has(va);

    if (alreadyPresentById || safelyPresentByVa) continue;

    const fallback = aanmeldingAsMatchFighter(aanmelding);
    merged.push(fallback);
    if (id) contextIds.add(id);
    if (va) contextVas.add(va);
  }

  return merged;
}

function collectMatchedKeys(json: any) {
  const ids = new Set<string>();
  const vas = new Set<string>();
  const sourceLists = [
    json?.bouts,
    json?.partijen,
    json?.matches,
    json?.matchmaking_bouts_raw,
    json?.raw_bouts,
    json?.controle_toernooi_context,
    json?.toernooien,
    json?.tournaments,
  ].filter(Array.isArray);

  function addId(v: any) {
    const id = s(v);
    if (id) ids.add(id);
  }

  function addVa(v: any) {
    const va = onlyDigits(v);
    if (va) vas.add(va);
  }

  for (const list of sourceLists) {
    for (const b of list || []) {
      const status = lower(
        pickFirst(b?.status, b?.partij_status, b?.bout_status),
      );
      const verwijderd =
        b?.verwijderd === true ||
        String(b?.verwijderd ?? "").trim() === "1" ||
        lower(b?.verwijderd) === "true";
      if (verwijderd || status.includes("verwijderd") || status.includes("deleted"))
        continue;

      const raw = obj(b?.raw_json) || {};
      const deelnemer = obj(raw?.deelnemer) || {};
      const rawAanmelding =
        obj(deelnemer?.aanmelding) ||
        obj(deelnemer?.extra?.raw?.aanmelding) ||
        obj(deelnemer?.raw?.aanmelding) ||
        {};

      [
        b?.rood_inschrijving_id,
        b?.blauw_inschrijving_id,
        b?.red_inschrijving_id,
        b?.blue_inschrijving_id,
        b?.rood_aanmelding_id,
        b?.blauw_aanmelding_id,
        b?.red_aanmelding_id,
        b?.blue_aanmelding_id,
        b?.inschrijving_id,
        b?.aanmelding_id,
        deelnemer?.inschrijving_id,
        deelnemer?.aanmelding_id,
        deelnemer?.id,
        rawAanmelding?.inschrijving_id,
        rawAanmelding?.aanmelding_id,
        rawAanmelding?.id,
      ].forEach(addId);

      [
        b?.va_rood,
        b?.va_blauw,
        b?.rood_va,
        b?.blauw_va,
        b?.red_va,
        b?.blue_va,
        b?.va_nummer,
        b?.fighter_id,
        b?.rood_fighter_id,
        b?.blauw_fighter_id,
        deelnemer?.va_nummer,
        deelnemer?.va,
        deelnemer?.fighter_id,
        rawAanmelding?.va_nummer,
        rawAanmelding?.va,
        rawAanmelding?.fightpaspoort_nummer,
      ].forEach(addVa);
    }
  }

  return { ids, vas };
}

function markMatchedFromBouts(fighters: Fighter[], json: any) {
  const { ids, vas } = collectMatchedKeys(json);
  return fighters.map((f) => {
    const id = inschrijvingIdOf(f);
    const va = vaOf(f);
    const alreadyMatched =
      isGematcht(f) || (!!id && ids.has(id)) || (!!va && vas.has(va));
    return alreadyMatched
      ? { ...f, __fs_gematcht: true, __fs_status: "gematcht" }
      : f;
  });
}

function getActiveMatchRows(json: any) {
  const sources = [
    json?.bouts,
    json?.partijen,
    json?.matches,
    json?.matchmaking_bouts_raw,
    json?.raw_bouts,
  ].filter(Array.isArray);

  const rows: any[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    for (const row of source || []) {
      const status = lower(pickFirst(row?.status, row?.partij_status, row?.bout_status));
      const removed =
        row?.verwijderd === true ||
        String(row?.verwijderd ?? '').trim() === '1' ||
        lower(row?.verwijderd) === 'true' ||
        status.includes('verwijderd') ||
        status.includes('deleted');
      if (removed) continue;

      const partijNr = Number(pickFirst(row?.partij_nr, row?.partijNr, row?.bout_nr, row?.match_nr));
      const raw = obj(row?.raw_json) || {};
      const roodNaam = s(pickFirst(row?.rood_naam, row?.red_name, raw?.rood_naam, raw?.rood?.naam));
      const blauwNaam = s(pickFirst(row?.blauw_naam, row?.blue_name, raw?.blauw_naam, raw?.blauw?.naam));
      if (!Number.isFinite(partijNr) && !roodNaam && !blauwNaam) continue;

      const key = Number.isFinite(partijNr)
        ? `partij-${partijNr}`
        : s(row?.id) || `${roodNaam}|${blauwNaam}|${s(row?.toernooi_code)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
  }

  const klasseVolgorde: Record<string, number> = {
    a: 0,
    b: 1,
    c: 2,
    n: 3,
    "j+": 4,
    j: 5,
  };

  function boutKlasseToken(row: any) {
    return normalizeClassToken(
      pickFirst(
        row?.klasse,
        row?.klasse_mm,
        row?.wedstrijdklasse,
        row?.class,
        obj(row?.raw_json)?.klasse,
        obj(row?.raw_json)?.klasse_mm,
      ),
    );
  }

  function boutGewichtSortValue(row: any) {
    const raw = pickFirst(
      row?.max_gewicht_notatie,
      row?.max_gewicht,
      row?.gewicht,
      row?.gewichtsklasse,
      obj(row?.raw_json)?.max_gewicht_notatie,
      obj(row?.raw_json)?.max_gewicht,
      obj(row?.raw_json)?.gewicht,
    );
    const parsed = parseWeightClassValue(raw);
    return parsed.value ?? Number.POSITIVE_INFINITY;
  }

  return rows.sort((a, b) => {
    // Partijnummer is hier alleen een label. De matchmaking wordt inhoudelijk
    // gegroepeerd op klasse en daarbinnen van licht naar zwaar weergegeven.
    const klasseDiff =
      (klasseVolgorde[boutKlasseToken(a)] ?? 99) -
      (klasseVolgorde[boutKlasseToken(b)] ?? 99);
    if (klasseDiff !== 0) return klasseDiff;

    const gewichtDiff = boutGewichtSortValue(a) - boutGewichtSortValue(b);
    if (gewichtDiff !== 0) return gewichtDiff;

    // Alleen als klasse en gewicht gelijk zijn gebruiken we het bestaande
    // partijnummer als stabiele fallback. Het nummer zelf wordt niet gewijzigd.
    const an = Number(pickFirst(a?.partij_nr, a?.partijNr, a?.bout_nr, a?.match_nr));
    const bn = Number(pickFirst(b?.partij_nr, b?.partijNr, b?.bout_nr, b?.match_nr));
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    if (Number.isFinite(an)) return -1;
    if (Number.isFinite(bn)) return 1;
    return s(pickFirst(a?.toernooi_code, a?.toernooicode)).localeCompare(
      s(pickFirst(b?.toernooi_code, b?.toernooicode)),
      "nl",
      { numeric: true },
    );
  });
}

function boutRaw(row: any) {
  return obj(row?.raw_json) || {};
}

function boutField(row: any, ...keys: string[]) {
  const raw = boutRaw(row);
  for (const key of keys) {
    const value = pickFirst(row?.[key], raw?.[key]);
    if (s(value)) return value;
  }
  return '';
}

function boutPartyNr(row: any) {
  const nr = Number(pickFirst(row?.partij_nr, row?.partijNr, row?.bout_nr, row?.match_nr));
  return Number.isFinite(nr) ? nr : null;
}

function boutStatus(row: any) {
  const value = s(pickFirst(row?.status, row?.partij_status, row?.bout_status));
  return value || 'Concept';
}

function formatDurationExact(mins: number): string {
  // Toon de geschatte galaduur als een normale kloktijd, bijvoorbeeld 6:01 uur.
  // Halve minuten worden niet als decimalen weergegeven, maar naar beneden afgerond.
  const totalMinutes = Math.max(0, Math.floor(mins));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}:${String(minutes).padStart(2, "0")} uur`;
}

const KLASSE_MINUTEN: Record<string, number> = {
  "a titel": 31,
  a: 21,
  "a k1": 21,
  b: 14,
  c: 13,
  n: 11.5,
  "16/17": 10.5,
  jeugd: 8.5,
  "jeugd 16+": 10.5,
  talentstatus: 10.5,
  jplus: 10.5,
  r: 8.5,
  recreant: 8.5,
  demo: 6,
  boksen: 10,
  "mma pro": 17,
  "mma amateur": 17,
  "mma jeugd": 17,
};

function normalizeDuurKlasse(raw: unknown): string {
  return s(raw)
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[._/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bklas\b/g, " klasse ")
    .replace(/\bklasse\b/g, " ")
    .replace(/\bclass\b/g, " ")
    .replace(/\bpartij(en)?\b/g, " ")
    .replace(/\bmet\b/g, " ")
    .replace(/\b(heren?|dames?|jongens?|meisjes?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDuurKlasseToken(text: string, token: "a" | "b" | "c" | "j" | "n" | "r") {
  return new RegExp(`(^|\\s)${token}(\\s|$)`, "i").test(text);
}

function ageNumberOnEvent(row: any, side: "rood" | "blauw"): number | null {
  const birth = parseDateOnly(
    pickFirst(
      row?.[`${side}_geboortedatum_fp`],
      row?.[`${side}_geboortedatum_mm`],
      row?.[`${side}_geboortedatum`],
    ),
  );
  const eventDate = parseDateOnly(
    pickFirst(row?.evenement_datum, row?.event_datum, row?.event_date, row?.datum),
  );
  if (!birth || !eventDate) return null;

  let age = eventDate.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = eventDate.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && eventDate.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return Number.isFinite(age) && age >= 0 ? age : null;
}

function bothFightersAtLeastAge(row: any, minAge: number) {
  const red = ageNumberOnEvent(row, "rood");
  const blue = ageNumberOnEvent(row, "blauw");
  return red != null && blue != null && red >= minAge && blue >= minAge;
}

function isTournamentDurationRow(row: any): boolean {
  const raw = boutRaw(row);
  const candidates = [
    row?.toernooi_code,
    row?.toernooi_id,
    row?.toernooi_nummer,
    row?.toernooi,
    row?.t_nummer,
    row?.t_code,
    row?.tournament_code,
    raw?.toernooi_code,
    raw?.toernooi_id,
    raw?.toernooi_nummer,
    raw?.toernooi,
    raw?.t_nummer,
    raw?.t_code,
    raw?.tournament_code,
  ];

  if (candidates.some((value) => /^T\d+$/i.test(s(value)))) return true;
  return boolish(row?.is_toernooi) || boolish(raw?.is_toernooi);
}

function boolish(value: unknown) {
  return value === true || s(value) === "1" || lower(value) === "true";
}

function tournamentDurationKey(row: any): string {
  const raw = boutRaw(row);
  return (
    s(
      pickFirst(
        row?.toernooi_code,
        row?.toernooi_id,
        row?.toernooi_nummer,
        row?.t_nummer,
        row?.t_code,
        row?.tournament_code,
        raw?.toernooi_code,
        raw?.toernooi_id,
        raw?.toernooi_nummer,
        raw?.t_nummer,
        raw?.t_code,
        raw?.tournament_code,
      ),
    ).toUpperCase() || "TOERNOOI"
  );
}

function tournamentFighterDurationKey(row: any, side: "rood" | "blauw") {
  const raw = boutRaw(row);
  const sideRaw = obj(raw?.[side]);
  const va = onlyDigits(
    pickFirst(
      row?.[side === "rood" ? "va_rood" : "va_blauw"],
      row?.[`${side}_va_mm`],
      row?.[`${side}_va`],
      sideRaw?.va_nummer,
      sideRaw?.va,
    ),
  );
  if (va) return `va:${va}`;

  const fighterName = lower(
    pickFirst(
      row?.[`${side}_naam_fp`],
      row?.[`${side}_naam_mm`],
      row?.[`${side}_naam`],
      sideRaw?.naam,
    ),
  );
  const gym = lower(
    pickFirst(
      row?.[`${side}_gym_mm`],
      row?.[`${side}_gym_fp`],
      row?.[`${side}_gym`],
      sideRaw?.sportschool,
      sideRaw?.gym,
    ),
  );
  return fighterName ? `naam:${fighterName}|${gym}` : "";
}

function durationForClass(klasse: unknown, discipline: unknown, row?: any): number | null {
  const rawClass = lower(klasse);
  const normalizedClass = normalizeDuurKlasse(rawClass);
  const normalizedDiscipline = lower(discipline)
    .replace(/[._/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const haystack = `${normalizedClass} ${normalizedDiscipline}`.trim();

  if (!haystack) return null;

  if (normalizedClass.includes("mma") || normalizedDiscipline.includes("mma")) {
    if (normalizedClass.includes("pro") || normalizedDiscipline.includes("pro")) {
      return KLASSE_MINUTEN["mma pro"];
    }
    if (
      normalizedClass.includes("jeugd") ||
      normalizedClass.includes("youth") ||
      normalizedClass.includes("junior") ||
      normalizedDiscipline.includes("jeugd") ||
      normalizedDiscipline.includes("youth")
    ) {
      return KLASSE_MINUTEN["mma jeugd"];
    }
    return KLASSE_MINUTEN["mma amateur"];
  }

  if (
    ["boksen", "boxing", "boxen"].includes(normalizedDiscipline) ||
    normalizedClass.includes("boksen") ||
    normalizedClass.includes("boxing")
  ) {
    return KLASSE_MINUTEN.boksen;
  }

  if (haystack.includes("titel")) return KLASSE_MINUTEN["a titel"];

  if (
    rawClass.includes("j+") ||
    normalizedClass.includes("j plus") ||
    normalizedClass.includes("talentstatus") ||
    normalizedClass.includes("talent status")
  ) {
    return KLASSE_MINUTEN.talentstatus;
  }

  if (/16\s*17/.test(normalizedClass) || /16\s*\/\s*17/.test(rawClass)) {
    return KLASSE_MINUTEN["16/17"];
  }

  const isYouth =
    hasDuurKlasseToken(normalizedClass, "j") ||
    normalizedClass.includes("jeugd") ||
    normalizedClass.includes("youth") ||
    normalizedClass.includes("junior");

  if (isYouth) {
    return bothFightersAtLeastAge(row, 16)
      ? KLASSE_MINUTEN["jeugd 16+"]
      : KLASSE_MINUTEN.jeugd;
  }

  if (
    hasDuurKlasseToken(normalizedClass, "r") ||
    normalizedClass.includes("recreant") ||
    normalizedClass.includes("recreatief")
  ) return KLASSE_MINUTEN.r;

  if (
    hasDuurKlasseToken(normalizedClass, "n") ||
    normalizedClass.includes("nieuweling") ||
    normalizedClass.includes("novice") ||
    normalizedClass.includes("newcomer")
  ) return KLASSE_MINUTEN.n;

  if (hasDuurKlasseToken(normalizedClass, "c")) return KLASSE_MINUTEN.c;
  if (hasDuurKlasseToken(normalizedClass, "b")) return KLASSE_MINUTEN.b;
  if (hasDuurKlasseToken(normalizedClass, "a")) return KLASSE_MINUTEN.a;
  if (normalizedClass.includes("demo") || normalizedClass.includes("demonstratie")) {
    return KLASSE_MINUTEN.demo;
  }

  return null;
}

function calculateMatchmakingDuration(rows: any[]) {
  let totalMinutes = 0;
  const normalRows = rows.filter((row) => !isTournamentDurationRow(row));

  for (const row of normalRows) {
    const minutes = durationForClass(
      pickFirst(row?.klasse_mm, row?.klasse, boutField(row, "klasse")),
      pickFirst(row?.discipline, boutField(row, "discipline")),
      row,
    );
    if (minutes != null) totalMinutes += minutes;
  }

  const tournamentGroups = new Map<string, any[]>();
  for (const row of rows) {
    if (!isTournamentDurationRow(row)) continue;
    const key = tournamentDurationKey(row);
    const group = tournamentGroups.get(key) ?? [];
    group.push(row);
    tournamentGroups.set(key, group);
  }

  for (const groupRows of tournamentGroups.values()) {
    const fighters = new Set<string>();
    for (const row of groupRows) {
      const red = tournamentFighterDurationKey(row, "rood");
      const blue = tournamentFighterDurationKey(row, "blauw");
      if (red) fighters.add(red);
      if (blue) fighters.add(blue);
    }

    const calculatedBouts = fighters.size >= 2 ? fighters.size - 1 : 0;
    const boutCount = calculatedBouts > 0 ? calculatedBouts : groupRows.length;
    const example = groupRows.find((row) =>
      s(pickFirst(row?.klasse_mm, row?.klasse, boutField(row, "klasse"))),
    ) ?? groupRows[0];

    const minutes = durationForClass(
      pickFirst(example?.klasse_mm, example?.klasse, boutField(example, "klasse")),
      pickFirst(example?.discipline, boutField(example, "discipline")),
      example,
    );
    if (minutes != null) totalMinutes += minutes * boutCount;
  }

  return Math.round(totalMinutes * 10) / 10;
}

function nextTournamentCode(existing: any[]) {
  let max = 0;
  for (const t of existing || []) {
    const code = s(pickFirst(t.toernooi_code, t.toernooicode, t.code));
    const m = code.match(/^T(\d+)$/i);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `T${max + 1}`;
}

async function fetchMatchmakingLock(matchmakingId: string) {
  if (!matchmakingId) return false;

  const { data, error } = await supabase
    .from("matchmakings")
    .select("locked_for_editing")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) {
    console.warn("Matchmaking lock laden mislukt", error.message);
    return false;
  }

  return data?.locked_for_editing === true;
}

async function fetchMatchmakingTournamentBouts(matchmakingId: string) {
  if (!matchmakingId) return [] as any[];

  const columns =
    "id, matchmaking_id, upload_id, partij_nr, is_toernooi, toernooi_code, raw_json, va_rood, va_blauw, rood_naam, blauw_naam, rood_gym, blauw_gym, discipline, klasse, max_gewicht, verwijderd, source_type";

  const base = supabase
    .from("matchmaking_bouts_raw")
    .select(columns)
    .eq("matchmaking_id", matchmakingId);

  const { data, error } = await base.or(
    "is_toernooi.eq.true,toernooi_code.not.is.null",
  );

  if (error) {
    console.warn("Toernooi bouts laden mislukt", error.message);
    return [] as any[];
  }

  return (data || []).filter((row: any) => {
    const code = s(row?.toernooi_code);
    return row?.is_toernooi === true || /^T\d+$/i.test(code);
  });
}

async function fetchFightPassportResults(vaNumbers: string[]) {
  if (!vaNumbers.length) return [] as ResultRow[];

  const { data, error } = await supabase
    .from("fightpassport_results")
    .select(
      "id,va_nummer,datum,evenement,tegenstander,sportschool,discipline,klasse,gewicht,uitslag,last_seen_at,created_at",
    )
    .in("va_nummer", vaNumbers)
    .order("datum", { ascending: false });

  if (error) {
    throw new Error(`fightpassport_results laden mislukt: ${error.message}`);
  }

  return (data || []) as ResultRow[];
}

export default function FightersPage() {
  const params = useParams<{
    matchmakingId?: string;
    matchmakingid?: string;
  }>();
  const router = useRouter();
  const matchmakingId = String(
    params?.matchmakingId ?? params?.matchmakingid ?? "",
  );

  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [uitslagenRows, setUitslagenRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyText, setBusyText] = useState("");

  const openOrCreatePublicMatchmaking = useCallback(async () => {
    if (!matchmakingId) return;
    setBusyId("public-matchmaking");
    setBusyText("Openbare matchmaking wordt klaargezet...");
    try {
      const res = await authedFetch("/api/matchmaker/public-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmakingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Openbare matchmaking aanmaken mislukt");
      const token = s(json?.publication?.public_token);
      if (!token) throw new Error("De openbare link bevat geen token.");
      const url = `${window.location.origin}/openbare-matchmaking/${token}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      setMsg(error?.message || "Openbare matchmaking aanmaken mislukt");
    } finally {
      setBusyId(null);
      setBusyText("");
    }
  }, [matchmakingId]);

  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [activeTab, setActiveTab] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [matchRed, setMatchRed] = useState<string>("");
  const [tournamentMode, setTournamentMode] = useState(false);
  const [tournamentIds, setTournamentIds] = useState<string[]>([]);
  const [tournamentCode, setTournamentCode] = useState("T1");
  const [tournamentDiscipline, setTournamentDiscipline] = useState("");
  const [tournamentClass, setTournamentClass] = useState("");
  const [tournamentWeight, setTournamentWeight] = useState("");
  const [existingTournaments, setExistingTournaments] = useState<any[]>([]);
  const [matchRows, setMatchRows] = useState<any[]>([]);
  const [matchmakingMeta, setMatchmakingMeta] = useState<Record<string, any>>({});
  const [mainView, setMainView] = useState<"fighters" | "matches">("fighters");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setMsg("");
    try {
      const res = await authedFetch(`/api/matchmaker/${matchmakingId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Laden mislukt");

      const toernooiBoutsFromDb = await fetchMatchmakingTournamentBouts(matchmakingId);
      const jsonWithDbBouts = {
        ...json,
        matchmaking_bouts_raw: [
          ...(Array.isArray(json?.matchmaking_bouts_raw)
            ? json.matchmaking_bouts_raw
            : []),
          ...toernooiBoutsFromDb,
        ],
        bouts: [
          ...(Array.isArray(json?.bouts) ? json.bouts : []),
          ...toernooiBoutsFromDb,
        ],
      };

      // matchmaker_fighter_context is de enige samengestelde waarheid voor deze pagina.
      // De API koppelt alleen de actuele aanmelding-status eraan; deze client haalt
      // niet opnieuw losse FightPassport- of aanmeldingvelden op en mengt die niet.
      const contextFighters = Array.isArray(json?.fighters) ? json.fighters : [];
      const aanmeldingen = Array.isArray(json?.aanmeldingen)
        ? json.aanmeldingen
        : [];

      // Toon altijd iedere aanmelding. Wanneer de samengestelde context nog niet
      // bestaat of de verwerking daarvan is mislukt, blijft de aanmelding als
      // veilige fallback zichtbaar en kan de matchmaker ermee verder.
      const allRegisteredFighters = mergeAllAanmeldingenIntoFighters(
        contextFighters,
        aanmeldingen,
      );
      const loadedFighters = markMatchedFromBouts(
        allRegisteredFighters,
        jsonWithDbBouts,
      );
      const loadedTournaments = Array.isArray(jsonWithDbBouts?.toernooien)
        ? jsonWithDbBouts.toernooien
        : Array.isArray(jsonWithDbBouts?.tournaments)
          ? jsonWithDbBouts.tournaments
          : Array.isArray(jsonWithDbBouts?.controle_toernooi_context) &&
              jsonWithDbBouts.controle_toernooi_context.length
            ? jsonWithDbBouts.controle_toernooi_context
            : Array.isArray(jsonWithDbBouts?.bouts)
              ? jsonWithDbBouts.bouts.filter((b: any) =>
                  s(pickFirst(b?.toernooi_code, b?.toernooicode, b?.tournament_code)),
                )
              : [];

      const loadedMatchmakingMeta =
        obj(json?.matchmaking) ||
        obj(json?.event) ||
        obj(json?.matchmaking_meta) ||
        {};

      // De contextregels bevatten niet altijd zelf de evenementdatum. Geef de
      // datum van deze matchmaking daarom expliciet aan iedere vechter mee.
      // Zo gebruiken leeftijd, tabindeling en klassetoewijzing nooit de datum
      // van vandaag wanneer iemand vóór het gala 18 wordt.
      const matchmakingEventDate = pickFirst(
        loadedMatchmakingMeta?.evenement_datum,
        loadedMatchmakingMeta?.event_datum,
        loadedMatchmakingMeta?.event_date,
        loadedMatchmakingMeta?.datum,
        json?.evenement_datum,
        json?.event_datum,
        json?.event_date,
        json?.datum,
        loadedFighters[0]?.evenement_datum,
      );
      const fightersWithEventDate = loadedFighters.map((fighter: Fighter) => ({
        ...fighter,
        evenement_datum: pickFirst(
          fighter?.evenement_datum,
          fighter?.event_datum,
          fighter?.event_date,
          matchmakingEventDate,
        ),
      }));

      setMatchRows(getActiveMatchRows(jsonWithDbBouts));
      setMatchmakingMeta(loadedMatchmakingMeta);
      setFighters(fightersWithEventDate);
      const vaNumbers = Array.from(
        new Set(fightersWithEventDate.map(vaOf).filter(Boolean)),
      );
      const fightPassportResults = await fetchFightPassportResults(vaNumbers);
      setUitslagenRows(fightPassportResults);
      setExistingTournaments(loadedTournaments);
      setTournamentCode(nextTournamentCode(loadedTournaments));
      setSelected((cur) =>
        cur.filter((id) =>
          fightersWithEventDate.some(
            (f: Fighter) => rowKeyOf(f) === id && !isBlockedFromMatching(f),
          ),
        ),
      );
      setTournamentIds((cur) =>
        cur.filter((id) =>
          fightersWithEventDate.some(
            (f: Fighter) =>
              inschrijvingIdOf(f) === id && !isBlockedFromMatching(f),
          ),
        ),
      );
      setMatchRed((cur) =>
        cur &&
        fightersWithEventDate.some(
          (f: Fighter) =>
            inschrijvingIdOf(f) === cur && !isBlockedFromMatching(f),
        )
          ? cur
          : "",
      );
    } catch (e: any) {
      setMsg(e?.message || "Laden mislukt");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [matchmakingId]);

  useEffect(() => {
    if (matchmakingId) load();
  }, [matchmakingId, load]);

  const classOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of fighters) {
      if (isBlockedFromMatching(f)) continue;
      const key = tabKeyOf(f);
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    const order = [
      "jeugd-jongen",
      "jeugd-meisje",
      "mma-youth-jongen",
      "mma-youth-meisje",
      "r-heer",
      "r-dame",
      "n-heer",
      "n-dame",
      "c-heer",
      "c-dame",
      "b-heer",
      "b-dame",
      "a-heer",
      "a-dame",
      "mma-amateur-heer",
      "mma-amateur-dame",
      "mma-pro-heer",
      "mma-pro-dame",
    ];

    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return classSelectLabel(a).localeCompare(classSelectLabel(b), "nl");
      })
      .map(([key, count]) => ({ key, count, label: classSelectLabel(key) }));
  }, [fighters]);

  useEffect(() => {
    if (activeTab && !classOptions.some((option) => option.key === activeTab))
      setActiveTab("");
  }, [activeTab, classOptions]);

  const stats = useMemo(() => {
    const active = fighters.filter((f) => !isBlockedFromMatching(f));
    const afgemeld = fighters.filter(isAfgemeld).length;
    const gematcht = fighters.filter(isGematcht).length;
    return {
      total: active.length,
      licentie: active.filter((f) => statusLic(f) === "bad").length,
      keurmerk: active.filter((f) => statusKeur(f) === "bad").length,
      afgemeld,
      gematcht,
    };
  }, [fighters]);

  const estimatedGalaMinutes = useMemo(() => {
    const fighterByVa = new Map<string, Fighter>();
    for (const fighter of fighters) {
      const va = vaOf(fighter);
      if (va && !fighterByVa.has(va)) fighterByVa.set(va, fighter);
    }

    const enrichedRows = matchRows.map((row) => {
      const raw = boutRaw(row);
      const redRaw = obj(raw?.rood);
      const blueRaw = obj(raw?.blauw);
      const redVa = onlyDigits(
        pickFirst(row?.va_rood, row?.rood_va, redRaw?.va_nummer, redRaw?.va),
      );
      const blueVa = onlyDigits(
        pickFirst(row?.va_blauw, row?.blauw_va, blueRaw?.va_nummer, blueRaw?.va),
      );
      const red = fighterByVa.get(redVa);
      const blue = fighterByVa.get(blueVa);

      return {
        ...row,
        evenement_datum: pickFirst(
          row?.evenement_datum,
          row?.event_datum,
          matchmakingMeta?.evenement_datum,
          matchmakingMeta?.event_datum,
          matchmakingMeta?.datum,
          red?.evenement_datum,
          blue?.evenement_datum,
        ),
        rood_geboortedatum_fp: pickFirst(
          row?.rood_geboortedatum_fp,
          red?.fp_geboortedatum,
          red?.geboortedatum,
        ),
        blauw_geboortedatum_fp: pickFirst(
          row?.blauw_geboortedatum_fp,
          blue?.fp_geboortedatum,
          blue?.geboortedatum,
        ),
      };
    });

    return calculateMatchmakingDuration(enrichedRows);
  }, [matchRows, fighters, matchmakingMeta]);

  const visible = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return fighters
      .filter((f) => {
        const text = [
          name(f),
          vaOf(f),
          gymOf(f),
          klasseOf(f),
          disciplineOf(f),
          geslachtOf(f),
          recordOf(f, uitslagenRows),
        ]
          .map(s)
          .join(" ")
          .toLowerCase();
        if (needle && !text.includes(needle)) return false;

        if (filter === "afgemeld") return isAfgemeld(f);

        if (isBlockedFromMatching(f)) return false;
        if (activeTab && tabKeyOf(f) !== activeTab) return false;
        if (filter === "no_license" && statusLic(f) !== "bad") return false;
        if (filter === "no_keurmerk" && statusKeur(f) !== "bad") return false;
        return true;
      })
      .sort(sortFightersInTab);
  }, [fighters, q, filter, activeTab, uitslagenRows]);

  const visibleIds = useMemo(
    () => visible.map(rowKeyOf).filter(Boolean),
    [visible],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function toggle(id: string) {
    if (!id) return;
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function toggleAllVisible() {
    setSelected((cur) => {
      if (allVisibleSelected)
        return cur.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...cur, ...visibleIds]));
    });
  }

  function toggleTournament(f: Fighter) {
    const id = inschrijvingIdOf(f);
    if (!id || isBlockedFromMatching(f)) return;
    setTournamentIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
    if (!tournamentDiscipline)
      setTournamentDiscipline(disciplineOf(f) === "-" ? "" : disciplineOf(f));
    if (!tournamentClass)
      setTournamentClass(klasseOf(f) === "-" ? "" : klasseOf(f));
  }

  function openTournamentMode() {
    setTournamentMode(true);
    setTournamentIds([]);
    setTournamentCode(nextTournamentCode(existingTournaments));
    setMsg(
      "Kies discipline, klasse en max gewicht. Klik daarna de deelnemersnamen aan binnen het juiste tabblad.",
    );
  }

  async function startTournament() {
    if (
      !tournamentDiscipline.trim() ||
      !tournamentClass.trim() ||
      !tournamentWeight.trim()
    ) {
      setMsg("Vul discipline, klasse en max gewicht in voor het toernooi.");
      return;
    }
    if (![4, 8].includes(tournamentIds.length)) {
      setMsg("Selecteer precies 4 of 8 deelnemers voor een toernooi.");
      return;
    }

    setBusyId("toernooi");
    setBusyText(`${tournamentCode} aanmaken...`);
    setMsg("");
    try {
      const deelnemers = fighters
        .filter((f) => tournamentIds.includes(inschrijvingIdOf(f)))
        .map((f) => ({
          inschrijving_id: inschrijvingIdOf(f),
          id: inschrijvingIdOf(f),
          fighter_id: pickFirst(f.fighter_id, f.va_nummer, f.va),
          va_nummer: vaOf(f),
          va: vaOf(f),
          naam: name(f),
          voornaam: pickFirst(f.voornaam, f.first_name),
          achternaam: pickFirst(f.achternaam, f.last_name),
          sportschool: gymOf(f),
          gym: gymOf(f),
          upload_id: pickFirst(f.upload_id, f.upload_batch_id),
          geboortedatum: pickFirst(
            f.geboortedatum,
            f.fp_geboortedatum,
            f.geboortedatum_fp,
            f.dob,
          ),
          geslacht: geslachtOf(f),
          gewicht: pickFirst(f.gewicht, f.gewicht_input, f.fp_gewicht),
          discipline: disciplineOf(f),
          klasse: klasseOf(f),
          licentie: pickFirst(f.licentie, f.licentie_status),
          heeft_startverbod: pickFirst(f.heeft_startverbod, f.startverbod),
          heeft_keurmerk: pickFirst(f.heeft_keurmerk, f.keurmerk),
          keurmerk_reason: pickFirst(f.keurmerk_reason, f.keurmerk_reden),
          record_w: pickFirst(f.record_w, f.win, f.wins),
          record_l: pickFirst(f.record_l, f.loss, f.losses),
          record_d: pickFirst(f.record_d, f.draw, f.draws),
          totaal_wedstrijden: pickFirst(f.totaal_wedstrijden, f.uitslagen_count),
          leeftijd_event: leeftijdOf(f),
        }));

      const payload = {
        matchmaking_id: matchmakingId,
        toernooi_code: tournamentCode,
        toernooicode: tournamentCode,
        discipline: tournamentDiscipline.trim(),
        klasse: tournamentClass.trim(),
        max_gewicht: tournamentWeight.trim(),
        deelnemer_inschrijving_ids: tournamentIds,
        participant_inschrijving_ids: tournamentIds,
        deelnemers,
      };
      const res = await authedFetch(
        `/api/matchmaker/${matchmakingId}/create-toernooi`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Toernooi aanmaken mislukt");

      setMsg(
        `${tournamentCode} is aangemaakt met ${tournamentIds.length} deelnemer(s).`,
      );
      setTournamentMode(false);
      setTournamentIds([]);
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Toernooi aanmaken mislukt");
    } finally {
      setBusyId(null);
      setBusyText("");
    }
  }

  function handleRowMatch(f: Fighter) {
    const matchId = inschrijvingIdOf(f);
    if (!matchId || isBlockedFromMatching(f)) return;
    if (!matchRed) {
      setMatchRed(matchId);
      setMsg(
        `${name(f)} staat klaar als rood. Klik nu op Match bij de blauwe hoek.`,
      );
      return;
    }
    if (matchRed === matchId) {
      setMatchRed("");
      setMsg("Rode hoek gewist. Kies opnieuw een vechter.");
      return;
    }
    router.push(
      `/dashboard/matchmaker/matchmaking/${matchmakingId}/match/nieuw?rood=${encodeURIComponent(matchRed)}&blauw=${encodeURIComponent(matchId)}`,
    );
  }

  async function refreshAllFighterData() {
    if (!matchmakingId || busyId || loading) return;

    setBusyId("refresh-data");
    setBusyText("Vechterdata opnieuw berekenen...");
    setMsg("");

    try {
      const res = await authedFetch(
        "/api/matchmaker/fighter-context/refresh-all",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchmaking_id: matchmakingId }),
        },
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Vechterdata vernieuwen mislukt");
      }

      if (json?.refresh_page) {
        window.location.reload();
        return;
      }

      setMsg(`${Number(json?.processed ?? 0)} vechters opnieuw verwerkt.`);
    } catch (e: any) {
      setMsg(e?.message || "Vechterdata vernieuwen mislukt");
    } finally {
      setBusyId(null);
      setBusyText("");
    }
  }

  async function downloadCheckedExcel() {
    if (!matchmakingId || busyId) return;

    setBusyId("download-excel");
    setBusyText("Excel export maken...");
    setMsg("");
    try {
      const res = await authedFetch(
        `/api/rapport/matchmaker-gecontroleerde-aanmeldingen-excel?matchmakingId=${encodeURIComponent(matchmakingId)}`,
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Excel export maken mislukt");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const cd = res.headers.get("content-disposition") || "";
      const filenameMatch = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const filename = decodeURIComponent(
        filenameMatch?.[1] ||
          filenameMatch?.[2] ||
          `aanmeldingen-${matchmakingId}.xlsx`,
      );

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMsg("Excel export is gedownload.");
    } catch (e: any) {
      setMsg(e?.message || "Excel export maken mislukt");
    } finally {
      setBusyId(null);
      setBusyText("");
    }
  }


  async function ontbindMatch(row: any) {
    const partijNr = boutPartyNr(row);
    const boutId = s(pickFirst(row?.bout_uid, row?.bout_id));

    if (partijNr == null || busyId) return;

    const rood = val(boutField(row, "rood_naam", "red_name"));
    const blauw = val(boutField(row, "blauw_naam", "blue_name"));
    const akkoord = confirm(
      `Match ${partijNr} ontbinden?\n\n${rood} - ${blauw}\n\nBeide vechters komen terug bij Vechters.`,
    );

    if (!akkoord) return;

    setBusyId(`delete-match-${partijNr}`);
    setBusyText(`Match ${partijNr} ontbinden...`);
    setMsg("");

    try {
      const res = await authedFetch("/api/matchmaker/delete-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          partij_nr: partijNr,
          bout_id: boutId || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Match ontbinden mislukt");

      setMsg(`Match ${partijNr} is ontbonden. Beide vechters zijn weer beschikbaar.`);
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Match ontbinden mislukt");
    } finally {
      setBusyId(null);
      setBusyText("");
    }
  }

  async function afmelden(f: Fighter) {
    const id = inschrijvingIdOf(f);
    if (!id || isGematcht(f)) return;

    const reasonInput = prompt(`Reden afmelding voor ${name(f)}?`);

    // Bij Annuleren geeft prompt null terug. Dan NIET afmelden.
    if (reasonInput === null) {
      setMsg("Afmelden geannuleerd.");
      return;
    }

    const reason = reasonInput.trim() || "Afmelding vanuit matchmaker fighter-overzicht";

    setBusyId(id);
    setBusyText("Afmelding verwerken...");
    setMsg("");
    try {
      const res = await authedFetch("/api/matchmaker/afmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          inschrijving_id: id,
          fighter_id: f.fighter_id || null,
          reden: reason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Afmelden mislukt");
      setSelected((cur) => cur.filter((x) => x !== id));
      if (matchRed === id) setMatchRed("");
      setMsg("Vechter afgemeld.");
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Afmelden mislukt");
    } finally {
      setBusyId(null);
      setBusyText("");
    }
  }

  const showWait = loading || busyId === "refresh-data";

  return (
    <main style={pageBg} className="fs-page315">

      <style>{`
        .fs-page315, .fs-page315 * { box-sizing: border-box; }
        .fs-page315 {
          min-height: 100vh;
          background: #252525;
          color: #fff;
          padding: 16px;
        }
        .fs-page315 > div {
          width: min(1480px, 100%);
          margin: 0 auto;
          background: #111;
          border: 1px solid #454545;
          box-shadow: 0 18px 48px rgba(0,0,0,.42);
        }
        .fs-compact-header {
          min-height: 72px;
          padding: 12px 16px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid #3f3f46;
          background: linear-gradient(90deg,#171717,#262626,#171717);
        }
        .fs-header-left { display:flex; align-items:center; gap:12px; min-width:0; }
        .fs-back-icon {
          width: 36px; height: 36px; display:inline-flex; align-items:center; justify-content:center;
          border:1px solid #5b5b5f; background:#202020; color:#fff; text-decoration:none;
        }
        .fs-kicker { color:#ff4d00; font-size:10px; font-weight:950; letter-spacing:1.8px; }
        .fs-compact-header h1 { margin:2px 0 0; font-size:23px; line-height:1; text-transform:uppercase; }
        .fs-header-logo { height:48px; max-width:190px; object-fit:contain; }
        .fs-header-actions { display:flex; justify-content:flex-end; gap:8px; }
        .fs-action-btn {
          min-height:36px; padding:0 11px; display:inline-flex; align-items:center; justify-content:center; gap:7px;
          border:1px solid #5a5a60; background:#242424; color:#fff; font-weight:900; cursor:pointer;
        }
        .fs-action-btn:hover:not(:disabled) { border-color:#ff4d00; background:#2e2e2e; }
        .fs-action-primary { background:#ff4d00; border-color:#ff4d00; color:#111; }
        .fs-main-tabs {
          display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:10px 16px;
          border-bottom:1px solid #3f3f46; background:#111;
        }
        .fs-main-tab {
          min-height:48px; padding:0 18px; display:inline-flex; align-items:center; justify-content:center; gap:10px;
          border:1px solid #52525b; border-left:4px solid #71717a; background:#242424; color:#f4f4f5;
          font-size:15px; font-weight:950; text-transform:uppercase; letter-spacing:.4px; cursor:pointer;
        }
        .fs-main-tab:hover { border-color:#ff4d00; }
        .fs-main-tab span { min-width:28px; padding:3px 8px; background:#111; color:#fff; font-size:11px; }
        .fs-main-tab.active { color:#111; border-color:#ff4d00; border-left-color:#ff4d00; background:#ff4d00; }
        .fs-main-tab.active span { background:#111; color:#fff; }
        .fs-page315 section { border-radius:0 !important; }
        .fs-page315 input, .fs-page315 select, .fs-page315 textarea {
          border-radius:0 !important; border:1px solid #4b4b50 !important; background:#111 !important; color:#fff !important;
        }
        .fs-page315 table { border-collapse:collapse !important; background:#151515 !important; }
        .fs-page315 th { background:#282828 !important; color:#d4d4d8 !important; border:1px solid #3f3f46 !important; }
        .fs-page315 td { border:1px solid #29292d !important; color:#fff !important; }
        .fs-page315 tbody tr:nth-child(odd) { background:#151515 !important; }
        .fs-page315 tbody tr:nth-child(even) { background:#1c1c1c !important; }
        .fs-page315 tbody tr:hover { background:#242424 !important; }
        .fs-class-select-row {
          min-width:0; display:grid; grid-template-columns:68px minmax(150px, 1fr); align-items:center;
          gap:8px; margin:0; padding:9px 10px;
          border:1px solid #4b4b50; border-left:4px solid #ff4d00; background:#191919;
        }
        .fs-class-select-label {
          color:#d4d4d8; font-size:12px; font-weight:950; letter-spacing:.8px; text-transform:uppercase;
        }
        .fs-class-select-wrap { position:relative; }
        .fs-class-select-wrap::after {
          content:""; position:absolute; right:14px; top:50%; width:8px; height:8px;
          border-right:2px solid #ff4d00; border-bottom:2px solid #ff4d00;
          transform:translateY(-70%) rotate(45deg); pointer-events:none;
        }
        .fs-page315 .fs-class-select {
          width:100%; min-height:40px; padding:0 42px 0 12px !important;
          appearance:none; border:1px solid #626269 !important; background:#0f0f0f !important;
          color:#fff !important; font-size:13px; font-weight:900; cursor:pointer;
        }
        .fs-page315 .fs-class-select:focus {
          outline:none; border-color:#ff4d00 !important; box-shadow:0 0 0 1px #ff4d00;
        }
        .fs-page315 .fs-class-select:disabled { opacity:.55; cursor:not-allowed; }
        .fs-page315 .fs-filter {
          border-radius:0 !important; border:1px solid #4b4b50 !important; background:#242424 !important; color:#e4e4e7 !important;
          box-shadow:none !important; padding:8px 12px !important;
        }
        .fs-page315 .fs-filter.active { border-color:#ff4d00 !important; background:#ff4d00 !important; color:#111 !important; }
        .fs-page315 .fs-icon-btn { border-radius:0 !important; box-shadow:none !important; }
        .fs-page315 .fs-party-detail {
          border-radius:0 !important; min-height:30px; padding:0 10px; background:#e5e7eb; color:#111;
          border:1px solid #fff; text-decoration:none;
        }
        .fs-page315 .fs-party-detail:hover { background:#ff4d00; border-color:#ff4d00; }
        .fs-matchmaking-hero {
          position:relative; min-height:250px; overflow:hidden; isolation:isolate;
          display:flex; align-items:flex-end; justify-content:space-between;
          padding:34px 38px 30px; margin-bottom:14px; border:1px solid #39393d;
          background-image:
            linear-gradient(90deg, rgba(5,5,6,.96) 0%, rgba(5,5,6,.82) 38%, rgba(5,5,6,.28) 72%, rgba(5,5,6,.16) 100%),
            linear-gradient(0deg, rgba(5,5,6,.48) 0%, rgba(5,5,6,.04) 55%, rgba(5,5,6,.24) 100%),
            url('/branding/fightsupport/matchmaking.png');
          background-size:cover;
          background-position:center center;
          background-repeat:no-repeat;
          box-shadow:0 20px 55px rgba(0,0,0,.35), inset 0 -1px 0 rgba(255,77,0,.45);
        }
        .fs-matchmaking-hero:before {
          content:""; position:absolute; inset:0; z-index:-1;
          background:linear-gradient(90deg, rgba(0,0,0,.36) 0%, transparent 58%);
          pointer-events:none;
        }
        .fs-matchmaking-hero:after {
          content:""; position:absolute; left:0; bottom:0; width:160px; height:4px; background:#ff4d00;
          box-shadow:160px 0 0 rgba(255,77,0,.45), 320px 0 0 rgba(255,77,0,.16);
        }
        .fs-ring-watermark {
          position:absolute; right:4%; top:13%; width:43%; height:69%; z-index:-1;
          transform:perspective(520px) rotateX(58deg) rotateZ(-7deg); transform-origin:center;
          border:5px solid rgba(255,255,255,.15); box-shadow:0 0 0 8px rgba(255,77,0,.04), inset 0 0 32px rgba(255,255,255,.04);
          background:repeating-linear-gradient(0deg, transparent 0 22%, rgba(255,255,255,.13) 22% 24%, transparent 24% 31%);
        }
        .fs-ring-watermark:before, .fs-ring-watermark:after {
          content:""; position:absolute; inset:9%; border:2px solid rgba(255,255,255,.10);
        }
        .fs-ring-watermark:after { inset:18%; border-color:rgba(255,77,0,.15); }
        .fs-ring-post { position:absolute; width:10px; height:150%; top:-25%; background:linear-gradient(#85858b,#262629); box-shadow:0 0 18px rgba(0,0,0,.8); }
        .fs-ring-post-a { left:-7px; } .fs-ring-post-b { right:-7px; }
        .fs-ring-post-c { left:-7px; transform:translateY(54%); } .fs-ring-post-d { right:-7px; transform:translateY(54%); }
        .fs-hero-glow { position:absolute; right:10%; top:-55%; width:420px; height:420px; border-radius:50%; background:radial-gradient(circle, rgba(255,77,0,.18), transparent 67%); filter:blur(8px); z-index:-1; }
        .fs-hero-content { max-width:68%; position:relative; z-index:1; }
        .fs-hero-kicker { color:#ff4d00; font-size:11px; font-weight:950; letter-spacing:3.2px; margin-bottom:12px; }
        .fs-hero-title { margin:0; max-width:850px; color:#f5f5f6; font-size:clamp(38px,5vw,76px); line-height:.94; letter-spacing:-1.8px; text-transform:uppercase; font-weight:950; text-shadow:0 5px 30px rgba(0,0,0,.8); }
        .fs-hero-meta { display:flex; align-items:center; gap:12px; margin-top:18px; color:#b8b8bd; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.8px; }
        .fs-hero-meta i { width:4px; height:4px; background:#ff4d00; transform:rotate(45deg); }
        .fs-hero-badges { align-self:flex-start; display:flex; flex-direction:column; align-items:flex-end; gap:9px; position:relative; z-index:2; }
        .fs-hero-status { border:1px solid rgba(255,77,0,.72); color:#ff7b42; background:rgba(255,77,0,.08); padding:8px 13px; font-size:10px; font-weight:950; letter-spacing:2px; }
        .fs-hero-duration { display:flex; align-items:center; gap:9px; border:1px solid rgba(255,255,255,.24); color:#f5f5f6; background:rgba(8,8,10,.72); backdrop-filter:blur(8px); padding:9px 13px; box-shadow:0 10px 28px rgba(0,0,0,.28); }
        .fs-hero-duration-label { color:#a8a8ae; font-size:9px; font-weight:900; letter-spacing:1.35px; text-transform:uppercase; }
        .fs-hero-duration-value { color:#fff; font-size:13px; font-weight:950; white-space:nowrap; }
        @media (max-width: 900px) {
          .fs-page315 { padding:8px; }
          .fs-matchmaking-hero { min-height:210px; padding:26px 20px 22px; }
          .fs-hero-content { max-width:88%; }
          .fs-hero-title { font-size:clamp(34px,10vw,54px); }
          .fs-ring-watermark { width:72%; right:-20%; opacity:.72; }
          .fs-hero-badges { position:absolute; top:16px; right:16px; }
          .fs-hero-duration { padding:7px 10px; }
          .fs-hero-duration-label { display:none; }
          .fs-hero-meta { flex-wrap:wrap; gap:8px; }
          .fs-compact-header { grid-template-columns:1fr auto; }
          .fs-header-logo { display:none; }
          .fs-header-actions { grid-column:1 / -1; justify-content:flex-start; flex-wrap:wrap; }
          .fs-action-btn span { display:none; }
          .fs-main-tabs { padding:0; }
          .fs-main-tab { flex:1; justify-content:center; padding:0 8px; }
          .fs-class-select-row { grid-template-columns:60px minmax(150px,1fr); gap:7px; padding:8px; }
          .fs-class-select-wrap { width:100%; }
        }
        @media (max-width: 1150px) {
          .fs-page315 .fs-class-select-row { grid-column:1 / -1; }
        }
      `}</style>

      {showWait && (
        <WaitOverlay
          text={busyText || "FightPassport-gegevens laden..."}
        />
      )}

      <div style={shell}>
        <header className="fs-compact-header">
          <div className="fs-header-left">
            <Link href="/dashboard/matchmaker/matchmaking" className="fs-back-icon" title="Terug naar matchmakings">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="fs-kicker">MATCHMAKER</div>
              <h1>Vechters matchen</h1>
            </div>
          </div>

          <img src={LOGO} alt="FightSupport" className="fs-header-logo" />

          <div className="fs-header-actions">
            <button
              className="fs-action-btn fs-action-primary"
              onClick={openOrCreatePublicMatchmaking}
              disabled={!!busyId || loading || !matchRows.length}
              title="Open de live openbare matchmaking"
            >
              <Globe2 size={16} />
              <span>Openbare matchmaking</span>
            </button>
            <button
              className="fs-action-btn"
              onClick={downloadCheckedExcel}
              disabled={!!busyId || loading || !fighters.length}
              title="Download aanmeldingen als Excel"
            >
              <Download size={16} />
              <span>Excel</span>
            </button>
            <button
              className="fs-action-btn"
              onClick={refreshAllFighterData}
              disabled={!!busyId || loading}
              title="Vechterdata opnieuw verwerken"
            >
              <RefreshCw size={16} />
              <span>Refresh data</span>
            </button>
            <button className="fs-action-btn fs-action-primary" onClick={openTournamentMode} disabled={!!busyId}>
              <Trophy size={16} />
              <span>Toernooi</span>
            </button>
          </div>
        </header>

        <nav className="fs-main-tabs" aria-label="Matchmaking onderdelen">
          <button
            type="button"
            className={mainView === "fighters" ? "fs-main-tab active" : "fs-main-tab"}
            onClick={() => setMainView("fighters")}
          >
            <Users size={18} />
            Matchen
            <span>{stats.total}</span>
          </button>
          <button
            type="button"
            className={mainView === "matches" ? "fs-main-tab active" : "fs-main-tab"}
            onClick={() => setMainView("matches")}
          >
            <Swords size={18} />
            Matchmaking
            <span>{matchRows.length}</span>
          </button>
        </nav>

        {mainView === "fighters" && matchRed && (
          <div style={matchNotice}>
            <b>Rood geselecteerd:</b>{" "}
            {name(fighters.find((f) => inschrijvingIdOf(f) === matchRed) || {})}
            . Klik nu op <b>Match</b> bij de tegenstander voor blauw.
            <button className="fs-clear-btn" onClick={() => setMatchRed("")}>
              Wissen
            </button>
          </div>
        )}

        {msg && <div style={notice}>{msg}</div>}

        {mainView === "fighters" && tournamentMode && (
          <section style={tournamentPanel}>
            <div style={tournamentHead}>
              <div>
                <div style={eyebrowSmall}>TOERNOOI AANMAKEN</div>
                <h2 style={tournamentTitle}>{tournamentCode}</h2>
                <p style={tournamentText}>
                  Alle geselecteerde deelnemers worden gekoppeld aan dezelfde
                  toernooicode.
                </p>
              </div>
              <button
                className="fs-clear-btn"
                onClick={() => setTournamentMode(false)}
              >
                Sluiten
              </button>
            </div>

            <div style={tournamentForm}>
              <label style={fieldLabel}>
                Discipline
                <input
                  style={fieldInput}
                  value={tournamentDiscipline}
                  onChange={(e) => setTournamentDiscipline(e.target.value)}
                  placeholder="Kickboksen / MMA"
                />
              </label>
              <label style={fieldLabel}>
                Klasse
                <input
                  style={fieldInput}
                  value={tournamentClass}
                  onChange={(e) => setTournamentClass(e.target.value)}
                  placeholder="J / N / C / B / A / Amateur / Pro"
                />
              </label>
              <label style={fieldLabel}>
                Max gewicht
                <input
                  style={fieldInput}
                  value={tournamentWeight}
                  onChange={(e) => setTournamentWeight(e.target.value)}
                  placeholder="bijv. 70"
                />
              </label>
              <button
                className="fs-tournament-btn"
                onClick={startTournament}
                disabled={!!busyId || ![4, 8].includes(tournamentIds.length)}
              >
                <Trophy size={16} />
                Maak {tournamentCode} aan ({tournamentIds.length})
              </button>
            </div>

            <div style={tournamentHint}>
              Klik in de tabel op de naam van deelnemers die in {tournamentCode}{" "}
              horen. Een toernooi wordt aangemaakt met precies 4 of 8 deelnemers.
            </div>
          </section>
        )}

        {mainView === "fighters" && (
        <section style={metalPanel}>
          <div style={statGrid}>
            <Stat label="Matchbaar" value={stats.total} />
            <Stat label="Gematcht" value={stats.gematcht} />
            <Stat label="Geen licentie" value={stats.licentie} warning />
            <Stat label="Geen keurmerk" value={stats.keurmerk} warning />
            <Stat label="Afgemeld" value={stats.afgemeld} />

            <div className="fs-class-select-row">
              <label htmlFor="class-filter" className="fs-class-select-label">
                Klasse
              </label>
              <div className="fs-class-select-wrap">
                <select
                  id="class-filter"
                  className="fs-class-select"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  disabled={filter === "afgemeld"}
                >
                  <option value="">Alle klassen ({stats.total})</option>
                  {classOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={filterBar}>
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Actief
            </FilterButton>
            <FilterButton
              active={filter === "no_license"}
              onClick={() => setFilter("no_license")}
            >
              Geen licentie
            </FilterButton>
            <FilterButton
              active={filter === "no_keurmerk"}
              onClick={() => setFilter("no_keurmerk")}
            >
              Geen keurmerk
            </FilterButton>
            <FilterButton
              active={filter === "afgemeld"}
              onClick={() => {
                setFilter("afgemeld");
                setActiveTab("");
              }}
            >
              Afgemeld
            </FilterButton>
          </div>

          <div style={activeClassBanner}>
            <div style={activeClassEyebrow}>Je matcht nu in</div>
            <div style={activeClassMain}>
              <strong style={activeClassName}>
                {activeTab ? classSelectLabel(activeTab) : "Alle klassen"}
              </strong>
              <span style={activeClassCount}>
                {visible.length} {visible.length === 1 ? "vechter" : "vechters"} zichtbaar
              </span>
            </div>
          </div>

          <div style={tableCard}>
            <div style={tableHeader}>
              <div style={selectionCount}>
                <b>{selected.length}</b>
                <span>geselecteerd</span>
              </div>

              <div style={tableSearchWrap}>
                <Search size={18} style={tableSearchIcon} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Zoek op naam, VA-nummer of sportschool..."
                  style={tableSearchInput}
                  aria-label="Zoek vechter op naam, VA-nummer of sportschool"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    style={clearSearchButton}
                    title="Zoekopdracht wissen"
                    aria-label="Zoekopdracht wissen"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <colgroup>
                  <col style={{ width: 44 }} />
                  <col />
                  <col />
                  <col style={{ width: 68 }} />
                  <col style={{ width: 104 }} />
                  <col style={{ width: 48 }} />
                  <col style={{ width: 66 }} />
                  <col style={{ width: 42 }} />
                  <col style={{ width: 138 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thSelect}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        disabled={!visibleIds.length}
                        title="Selecteer alles zichtbaar"
                      />
                    </th>
                    {[
                      "Naam",
                      "Sportschool",
                      "VA",
                      "Record",
                      "Leeftijd",
                      "Gewicht",
                      "Status",
                      "Acties",
                    ].map((h) => (
                      <th style={th} key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visible.map((f) => {
                    const rowKey = rowKeyOf(f);
                    const matchId = inschrijvingIdOf(f);
                    const detailId = encodeURIComponent(detailIdOf(f));
                    const va = vaOf(f);
                    const checked = selected.includes(rowKey);
                    const disabled = !matchId || isBlockedFromMatching(f);
                    const isRed = matchRed === matchId;

                    return (
                      <tr
                        key={rowKey || matchId || JSON.stringify(f)}
                        style={isRed ? trRed : tr}
                      >
                        <td style={tdSelect}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(rowKey)}
                            disabled={!!busyId || !rowKey || isBlockedFromMatching(f)}
                            title="Selecteer alleen voor opnieuw controleren"
                          />
                        </td>
                        <td style={tdName}>
                          {tournamentMode ? (
                            <button
                              type="button"
                              className={
                                tournamentIds.includes(matchId)
                                  ? "fs-name-select active"
                                  : "fs-name-select"
                              }
                              onClick={() => toggleTournament(f)}
                              disabled={
                                !!busyId ||
                                !matchId ||
                                isBlockedFromMatching(f)
                              }
                              title={`Toevoegen/verwijderen aan ${tournamentCode}`}
                            >
                              {name(f)}
                            </button>
                          ) : (
                            <span>{name(f)}</span>
                          )}
                        </td>
                        <td style={td}>{gymOf(f)}</td>
                        <td style={tdVa}>{va || "-"}</td>
                        <td style={tdRecord}>{recordOf(f, uitslagenRows)}</td>
                        <td style={tdLeeftijd}>{leeftijdOf(f)}</td>
                        <td style={tdGewicht}>{gewichtOf(f)}</td>
                        <td style={tdStatusIcon} title={displayStatusOf(f)}>
                          {displayStatusIconOf(f)}
                        </td>
                        <td style={tdActions}>
                          <Link
                            className="fs-icon-btn"
                            href={
                              detailId
                                ? `/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${detailId}`
                                : `/dashboard/matchmaker/matchmaking/${matchmakingId}/match`
                            }
                            title="Detail"
                          >
                            <Eye size={15} />
                          </Link>
                          <button
                            className="fs-icon-btn"
                            disabled={
                              busyId === matchId || !matchId || isGematcht(f)
                            }
                            onClick={() => afmelden(f)}
                            title={
                              isGematcht(f)
                                ? "Deze vechter is al gematcht"
                                : "Afmelden"
                            }
                          >
                            <Ban size={15} />
                          </button>
                          <button
                            className={
                              isRed
                                ? "fs-icon-btn red"
                                : matchRed
                                  ? "fs-icon-btn blue"
                                  : "fs-icon-btn orange"
                            }
                            disabled={disabled}
                            onClick={() => handleRowMatch(f)}
                            title={
                              isRed
                                ? "Rode hoek wissen"
                                : matchRed
                                  ? "Gebruik als blauwe hoek"
                                  : "Gebruik als rode hoek"
                            }
                          >
                            <Swords size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && !visible.length && (
                    <tr>
                      <td style={emptyTd} colSpan={9}>
                        Geen gecontroleerde vechters gevonden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        )}

        {mainView === "matches" && (
        <section style={matchmakingSection}>
          <div className="fs-matchmaking-hero">
            <div className="fs-hero-content">
              <div className="fs-hero-kicker">LIVE MATCHMAKING</div>
              <h2 className="fs-hero-title">
                {val(
                  pickFirst(
                    matchmakingMeta?.evenement_naam,
                    matchmakingMeta?.event_name,
                    matchmakingMeta?.naam,
                    matchmakingMeta?.title,
                    matchRows[0]?.evenement_naam,
                    matchRows[0]?.event_name,
                    matchRows[0]?.event?.naam,
                    "FightSupport matchmaking",
                  ),
                )}
              </h2>
              <div className="fs-hero-meta">
                <span>{matchRows.length} partijen</span>
                <i />
                <span>Automatisch bijgewerkt</span>
              </div>
            </div>
            <div className="fs-hero-badges">
              <div className="fs-hero-status">CONCEPT</div>
              <div
                className="fs-hero-duration"
                title="De schatting wordt direct opnieuw berekend wanneer de matchmaking verandert."
              >
                <span className="fs-hero-duration-label">Geschatte galaduur</span>
                <span className="fs-hero-duration-value">
                  {formatDurationExact(estimatedGalaMinutes)}
                </span>
              </div>
            </div>
          </div>

          <div style={matchmakingHeader}>
            <div>
              <div style={eyebrowSmall}>MATCHMAKING</div>
              <h2 style={matchmakingTitle}>Opgebouwde partijen</h2>
              <p style={matchmakingText}>
                Iedere opgeslagen match verschijnt direct hieronder.
              </p>
            </div>
            <span style={matchmakingCount}>{matchRows.length} partijen</span>
          </div>

          <div style={matchmakingTableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={matchThNr}>Partij</th>
                  <th style={matchThCompact}>K</th>
                  <th style={matchThGender}>M/V</th>
                  <th style={matchThName}>Rode hoek</th>
                  <th style={matchThGym}>Sportschool</th>
                  <th style={matchThRecord}>Record</th>
                  <th style={matchThName}>Blauwe hoek</th>
                  <th style={matchThGym}>Sportschool</th>
                  <th style={matchThRecord}>Record</th>
                  <th style={matchThCompact}>Gewicht</th>
                  <th style={matchThCompact}>Status</th>
                  <th style={matchThAction}>Actie</th>
                </tr>
              </thead>
              <tbody>
                {matchRows.map((row, index) => {
                  const raw = boutRaw(row);
                  // Het opgeslagen partijnummer blijft nodig voor detail/ontbinden.
                  // In de Matchmaking-tabel nummeren we visueel van onder naar boven:
                  // onderste partij = 1, bovenste (main card) = hoogste nummer.
                  const partijNr = boutPartyNr(row);
                  const weergavePartijNr = matchRows.length - index;
                  const roodNaam = val(
                    pickFirst(
                      boutField(row, 'rood_naam', 'red_name'),
                      raw?.rood?.naam,
                    ),
                  );
                  const blauwNaam = val(
                    pickFirst(
                      boutField(row, 'blauw_naam', 'blue_name'),
                      raw?.blauw?.naam,
                    ),
                  );
                  const roodVa = onlyDigits(
                    pickFirst(
                      row?.va_rood,
                      row?.rood_va,
                      row?.red_va,
                      row?.rood_fighter_id,
                      row?.red_fighter_id,
                      raw?.va_rood,
                      raw?.rood_va,
                      raw?.red_va,
                      raw?.rood?.va_nummer,
                      raw?.rood?.va,
                      raw?.rood?.fighter_id,
                    ),
                  );
                  const blauwVa = onlyDigits(
                    pickFirst(
                      row?.va_blauw,
                      row?.blauw_va,
                      row?.blue_va,
                      row?.blauw_fighter_id,
                      row?.blue_fighter_id,
                      raw?.va_blauw,
                      raw?.blauw_va,
                      raw?.blue_va,
                      raw?.blauw?.va_nummer,
                      raw?.blauw?.va,
                      raw?.blauw?.fighter_id,
                    ),
                  );
                  const roodGym = val(
                    pickFirst(
                      boutField(row, 'rood_gym', 'red_gym'),
                      raw?.rood?.sportschool,
                      raw?.rood?.gym,
                    ),
                  );
                  const blauwGym = val(
                    pickFirst(
                      boutField(row, 'blauw_gym', 'blue_gym'),
                      raw?.blauw?.sportschool,
                      raw?.blauw?.gym,
                    ),
                  );
                  const klasse = normalizeClassLabel(boutField(row, 'klasse', 'klasse_mm', 'class'));
                  const maxGewicht = s(
                    boutField(row, 'max_gewicht_notatie', 'max_gewicht', 'gewicht'),
                  );
                  const code = s(pickFirst(row?.toernooi_code, row?.toernooicode));
                  const roodFighter = fighters.find((f) => vaOf(f) === roodVa);
                  const blauwFighter = fighters.find((f) => vaOf(f) === blauwVa);
                  const geslacht = roodFighter
                    ? geslachtOf(roodFighter)
                    : blauwFighter
                      ? geslachtOf(blauwFighter)
                      : "Onbekend";
                  const roodRecord = roodFighter
                    ? recordOf(roodFighter, uitslagenRows)
                    : "-";
                  const blauwRecord = blauwFighter
                    ? recordOf(blauwFighter, uitslagenRows)
                    : "-";

                  return (
                    <tr
                      key={s(row?.id) || `${partijNr ?? 'toernooi'}-${index}`}
                      style={index % 2 === 0 ? matchTrEven : matchTrOdd}
                    >
                      <td style={matchTdNr}>{weergavePartijNr}</td>
                      <td style={matchTdCompact}>{klasse}</td>
                      <td style={matchTdGender}>{geslacht === "Vrouw" ? "V" : geslacht === "Man" ? "M" : "-"}</td>
                      <td style={matchTdName}>
                        {roodVa ? (
                          <Link
                            href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${encodeURIComponent(roodVa)}`}
                            style={matchFighterLink}
                          >
                            {roodNaam}
                          </Link>
                        ) : (
                          <span style={matchFighterName}>{roodNaam}</span>
                        )}
                      </td>
                      <td style={matchTdGym}>{roodGym}</td>
                      <td style={matchTdRecord}>{roodRecord}</td>
                      <td style={matchTdName}>
                        {blauwVa ? (
                          <Link
                            href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${encodeURIComponent(blauwVa)}`}
                            style={matchFighterLink}
                          >
                            {blauwNaam}
                          </Link>
                        ) : (
                          <span style={matchFighterName}>{blauwNaam}</span>
                        )}
                      </td>
                      <td style={matchTdGym}>{blauwGym}</td>
                      <td style={matchTdRecord}>{blauwRecord}</td>
                      <td style={matchTdCompact}>
                        {maxGewicht
                          ? /kg|\+|-/i.test(maxGewicht)
                            ? maxGewicht
                            : `-${maxGewicht} kg`
                          : '-'}
                      </td>
                      <td style={matchTdCompact}>
                        <span style={matchStatusBadge}>{boutStatus(row)}</span>
                      </td>
                      <td style={matchTdAction}>
                        {partijNr != null ? (
                          <div style={matchActions}>
                            <Link
                              href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/partij/${partijNr}`}
                              className="fs-party-detail"
                            >
                              Detail
                            </Link>
                            <button
                              type="button"
                              className="fs-icon-btn red"
                              title={`Match ${partijNr} ontbinden`}
                              aria-label={`Match ${partijNr} ontbinden`}
                              disabled={busyId === `delete-match-${partijNr}`}
                              onClick={() => ontbindMatch(row)}
                            >
                              <Unlink size={15} />
                            </button>
                          </div>
                        ) : (
                          <span style={matchNoDetail}>Geen partijNr</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!loading && matchRows.length === 0 && (
                  <tr>
                    <td style={emptyTd} colSpan={12}>
                      Nog geen partijen aangemaakt.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}
      </div>

      <style jsx global>
        {globalCss}
      </style>
    </main>
  );
}

function Stat({
  label,
  value,
  warning,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div style={statCard}>
      <div
        style={{
          color: warning && value > 0 ? ORANGE : "#a8adb6",
          fontSize: 10,
          letterSpacing: 1.35,
          textTransform: "uppercase",
          fontWeight: 900,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 950, marginTop: 7 }}>{value}</div>
    </div>
  );
}
function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      className={active ? "fs-filter active" : "fs-filter"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Badge({ kind }: { kind: string }) {
  const ok = kind === "ok";
  const bad = kind === "bad";
  return (
    <span className={ok ? "fs-badge ok" : bad ? "fs-badge bad" : "fs-badge"}>
      {ok ? <ShieldCheck size={13} /> : bad ? <ShieldAlert size={13} /> : null}
      {ok ? "JA" : bad ? "NEE" : "?"}
    </span>
  );
}
function WaitOverlay({ text }: { text: string }) {
  return (
    <div style={overlay}>
      <div style={waitBox}>
        <div style={spinner} />
        <div
          style={{
            color: ORANGE,
            fontWeight: 950,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Even geduld
        </div>
        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>
          {text}
        </div>
      </div>
    </div>
  );
}

const pageBg: CSSProperties = {
  minHeight: "100vh",
  padding: "24px 18px 42px",
  color: "#f5f5f5",
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,.13), transparent 34%), linear-gradient(135deg,#15161a 0%,#27292f 45%,#0d0e11 100%)",
};
const shell: CSSProperties = {
  width: "min(1540px, calc(100vw - 36px))",
  margin: "0 auto",
  border: "6px solid rgba(255,255,255,.78)",
  borderRadius: 32,
  overflow: "hidden",
  boxShadow: "0 28px 80px rgba(0,0,0,.55)",
  background:
    "linear-gradient(180deg,#2d2e34 0%,#15161b 28%,#e8eaed 28%,#d8dadd 100%)",
};
const topBar: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: 24,
  alignItems: "center",
  padding: "24px 32px",
  borderBottom: `3px solid ${ORANGE}`,
  background: "linear-gradient(180deg,#34343a,#222329)",
};
const eyebrow: CSSProperties = {
  color: ORANGE,
  fontWeight: 950,
  letterSpacing: 4,
  fontSize: 20,
  textTransform: "uppercase",
};
const title: CSSProperties = {
  margin: "4px 0",
  fontSize: 30,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
};
const subtitle: CSSProperties = {
  margin: 0,
  color: "#e5e7eb",
  fontSize: 13,
  fontWeight: 650,
};
const logoWrap: CSSProperties = { display: "flex", justifyContent: "center" };
const logoImg: CSSProperties = {
  width: "min(420px, 32vw)",
  height: "auto",
  objectFit: "contain",
};
const navRail: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  margin: "24px 34px 0",
  padding: 14,
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(20,21,26,.94), rgba(8,8,10,.98))",
  border: "1px solid rgba(255,255,255,.16)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 18px 34px rgba(0,0,0,.28)",
};
const legendBar: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  margin: "12px 34px 0",
  padding: "10px 14px",
  borderRadius: 14,
  background: "linear-gradient(180deg,#e9ebef,#cfd3d9)",
  color: "#16171b",
  border: "1px solid rgba(0,0,0,.18)",
};
const legendItem: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 950,
};
const railGroup: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};
const railLabel: CSSProperties = {
  color: "#b7bcc6",
  textTransform: "uppercase",
  letterSpacing: 2,
  fontSize: 11,
  fontWeight: 950,
  marginRight: 4,
};
const notice: CSSProperties = {
  margin: "18px 34px 0",
  padding: 14,
  borderRadius: 14,
  color: "#ffe1d6",
  border: "1px solid rgba(255,77,0,.55)",
  background: "linear-gradient(180deg, rgba(255,77,0,.16), rgba(0,0,0,.58))",
};
const matchNotice: CSSProperties = {
  margin: "18px 34px 0",
  padding: 14,
  borderRadius: 14,
  color: "#ffe1d6",
  border: "1px solid rgba(220,38,38,.65)",
  background: "linear-gradient(180deg, rgba(220,38,38,.28), rgba(0,0,0,.62))",
};
const tournamentPanel: CSSProperties = {
  margin: "18px 34px 0",
  padding: 20,
  borderRadius: 22,
  color: "#f8fafc",
  background: "linear-gradient(135deg,#25272e 0%,#0b0c10 55%,#331104 100%)",
  border: "1px solid rgba(255,77,0,.45)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 18px 42px rgba(0,0,0,.28)",
};
const tournamentHead: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 14,
};
const eyebrowSmall: CSSProperties = {
  color: ORANGE,
  fontWeight: 950,
  letterSpacing: 3,
  fontSize: 12,
};
const tournamentTitle: CSSProperties = {
  margin: "2px 0",
  fontSize: 34,
  fontWeight: 950,
  lineHeight: 1,
};
const tournamentText: CSSProperties = {
  margin: 0,
  color: "#d8dce3",
  fontWeight: 700,
};
const tournamentForm: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
  gap: 12,
  alignItems: "end",
};
const fieldLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#f8fafc",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: 1.6,
  textTransform: "uppercase",
};
const fieldInput: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.28)",
  background: "rgba(255,255,255,.92)",
  color: "#111",
  padding: "10px 11px",
  fontWeight: 850,
  outline: "none",
};
const tournamentHint: CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,.08)",
  color: "#fff2ec",
  fontWeight: 850,
};
const metalPanel: CSSProperties = {
  margin: 16,
  padding: 16,
  borderRadius: 26,
  background: "linear-gradient(135deg,#f7f8fa 0%,#cdd0d4 45%,#f5f6f8 100%)",
  border: "2px solid rgba(80,82,88,.55)",
  boxShadow: "inset 0 1px 0 white, 0 22px 60px rgba(0,0,0,.22)",
  color: "#111217",
};
const statGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(105px, .72fr)) minmax(260px, 1.6fr)",
  gap: 8,
  marginBottom: 12,
};
const statCard: CSSProperties = {
  minHeight: 70,
  padding: "10px 12px",
  borderRadius: 0,
  color: "#f7f7f7",
  background: "linear-gradient(180deg,#2b2d34,#0b0c10)",
  border: "1px solid rgba(255,255,255,.18)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.22)",
};
const tabPanel: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 16,
  padding: 12,
  borderRadius: 16,
  background: "linear-gradient(180deg,#24262d,#111217)",
  border: "1px solid rgba(255,255,255,.18)",
};
const filterBar: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 16,
};
const searchWrap: CSSProperties = { position: "relative", flex: "1 1 320px" };
const searchIcon: CSSProperties = {
  position: "absolute",
  left: 12,
  top: 12,
  color: "#777",
};
const input: CSSProperties = {
  width: "100%",
  borderRadius: 13,
  border: "1px solid rgba(20,20,20,.24)",
  background: "rgba(255,255,255,.78)",
  color: "#111",
  padding: "11px 12px 11px 38px",
  outline: "none",
  fontWeight: 750,
};
const activeClassBanner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 12,
  padding: "13px 16px",
  background: "linear-gradient(180deg,#24262d,#0c0d11)",
  border: "2px solid #ff4d00",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.16), 0 8px 20px rgba(0,0,0,.18)",
  color: "#fff",
};
const activeClassEyebrow: CSSProperties = {
  flex: "0 0 auto",
  color: "#c9cbd0",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform: "uppercase",
};
const activeClassMain: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flex: 1,
  minWidth: 0,
};
const activeClassName: CSSProperties = {
  color: "#fff",
  fontSize: 22,
  lineHeight: 1.1,
  fontWeight: 950,
};
const activeClassCount: CSSProperties = {
  flex: "0 0 auto",
  padding: "7px 10px",
  background: "#ff4d00",
  color: "#fff",
  fontSize: 13,
  fontWeight: 950,
};
const tableCard: CSSProperties = {
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(0,0,0,.18)",
  background: "white",
};
const tableHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "11px 14px",
  color: "#111",
  borderBottom: "1px solid rgba(0,0,0,.12)",
  background: "linear-gradient(180deg,#fff,#e6e8eb)",
};

const selectionCount: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  flex: "0 0 auto",
  minWidth: 128,
};

const tableSearchWrap: CSSProperties = {
  position: "relative",
  flex: "1 1 560px",
  maxWidth: 720,
};

const tableSearchIcon: CSSProperties = {
  position: "absolute",
  left: 14,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#5d626b",
  pointerEvents: "none",
};

const tableSearchInput: CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid rgba(20,20,20,.24)",
  background: "#fff",
  color: "#111",
  padding: "0 42px 0 42px",
  outline: "none",
  fontWeight: 800,
  boxShadow: "inset 0 1px 2px rgba(0,0,0,.08)",
};

const clearSearchButton: CSSProperties = {
  position: "absolute",
  right: 7,
  top: "50%",
  transform: "translateY(-50%)",
  width: 28,
  height: 28,
  border: 0,
  borderRadius: 7,
  background: "#202226",
  color: "#fff",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: 1,
  fontWeight: 900,
};
const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  minWidth: 980,
};
const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  color: "white",
  background: ORANGE,
  fontSize: 12,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};
const thSelect: CSSProperties = { ...th, width: 44, textAlign: "center" };
const td: CSSProperties = {
  padding: "9px 8px",
  verticalAlign: "middle",
  borderTop: "1px solid rgba(0,0,0,.1)",
  color: "#ffffff",
  fontWeight: 750,
  fontSize: 13,
};

const tdVa: CSSProperties = {
  ...td,
  width: 68,
  minWidth: 68,
  maxWidth: 68,
  whiteSpace: "nowrap",
};

const tdRecord: CSSProperties = {
  ...td,
  width: 104,
  minWidth: 104,
  maxWidth: 104,
  whiteSpace: "nowrap",
};

const tdLeeftijd: CSSProperties = {
  ...td,
  width: 48,
  minWidth: 48,
  maxWidth: 48,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tdGewicht: CSSProperties = {
  ...td,
  width: 66,
  minWidth: 66,
  maxWidth: 66,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tdStatusIcon: CSSProperties = {
  ...td,
  width: 42,
  minWidth: 42,
  maxWidth: 42,
  padding: "4px",
  textAlign: "center",
  fontSize: 18,
  whiteSpace: "nowrap",
};

const tdName: CSSProperties = { ...td, minWidth: 0, overflow: "hidden" };
const tdActions: CSSProperties = {
  ...td,
  width: 138,
  minWidth: 138,
  maxWidth: 138,
  padding: "8px 6px",
  whiteSpace: "nowrap",
};
const tdSelect: CSSProperties = { ...td, width: 44, minWidth: 44, maxWidth: 44, textAlign: "center" };
const tr: CSSProperties = {
  background: "#171717",
};
const trRed: CSSProperties = {
  background: "#1f1717",
  boxShadow: "inset 5px 0 0 #dc2626",
};
const emptyTd: CSSProperties = {
  ...td,
  textAlign: "center",
  padding: 32,
  color: "#555",
};
const muted: CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 700,
};
const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,.72)",
  backdropFilter: "blur(5px)",
};
const waitBox: CSSProperties = {
  width: "min(520px, calc(100vw - 40px))",
  padding: 30,
  textAlign: "center",
  borderRadius: 24,
  color: "white",
  background: "linear-gradient(180deg,#2e3037,#08090c)",
  border: "2px solid rgba(255,255,255,.45)",
  boxShadow: "0 25px 80px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.22)",
};
const spinner: CSSProperties = {
  width: 54,
  height: 54,
  margin: "0 auto 18px",
  borderRadius: "50%",
  border: "5px solid rgba(255,255,255,.18)",
  borderTopColor: ORANGE,
  animation: "fs-spin .9s linear infinite",
};


const matchmakingSection: CSSProperties = {
  margin: "14px 16px 18px",
  border: "1px solid #4b4b4f",
  background: "#101010",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.05)",
};
const matchmakingHeader: CSSProperties = {
  minHeight: 70,
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  borderBottom: "1px solid #3f3f46",
  background: "linear-gradient(180deg,#2a2a2d,#171719)",
};
const matchmakingTitle: CSSProperties = { margin: "2px 0 0", fontSize: 20, fontWeight: 950, color: "#fff" };
const matchmakingText: CSSProperties = { margin: "3px 0 0", color: "#a1a1aa", fontSize: 12, fontWeight: 700 };
const matchmakingCount: CSSProperties = {
  padding: "7px 10px",
  border: "1px solid rgba(255,77,0,.75)",
  background: "#21130d",
  color: "#ff7a3d",
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};
const matchmakingTableWrap: CSSProperties = { width: "100%", overflowX: "auto" };
const matchFighterLink: CSSProperties = {
  color: ORANGE,
  fontWeight: 900,
  textDecoration: "none",
};
const matchFighterName: CSSProperties = {
  color: ORANGE,
  fontWeight: 900,
};
const matchThNr: CSSProperties = { ...th, width: 50, textAlign: "center" };
const matchThCompact: CSSProperties = { ...th, width: 48, minWidth: 48, maxWidth: 48, paddingLeft: 6, paddingRight: 6, textAlign: "center" };
const matchThGender: CSSProperties = { ...th, width: 72, textAlign: "center" };
const matchThName: CSSProperties = { ...th, width: 126 };
const matchThGym: CSSProperties = { ...th, width: 112 };
const matchThRecord: CSSProperties = { ...th, width: 104 };
const matchThAction: CSSProperties = { ...th, width: 116, textAlign: "center" };
const matchTd: CSSProperties = { ...td, padding: "7px 6px", fontSize: 11.5 };
const matchTdName: CSSProperties = { ...matchTd, color: "#fff", fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const matchTdGym: CSSProperties = { ...matchTd, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const matchTdRecord: CSSProperties = { ...matchTd, whiteSpace: "nowrap", fontWeight: 900 };
const matchTdGender: CSSProperties = { ...matchTd, width: 48, minWidth: 48, maxWidth: 48, paddingLeft: 6, paddingRight: 6, textAlign: "center", whiteSpace: "nowrap", fontWeight: 900 };
const matchTdNr: CSSProperties = { ...matchTd, textAlign: "center", color: ORANGE, fontSize: 14, fontWeight: 950 };
const matchTdCompact: CSSProperties = { ...matchTd, textAlign: "center", whiteSpace: "nowrap" };
const matchTdAction: CSSProperties = { ...matchTd, textAlign: "center", whiteSpace: "nowrap", padding: "5px" };
const matchActions: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
const matchTrEven: CSSProperties = { background: "#171717" };
const matchTrOdd: CSSProperties = { background: "#202020" };
const matchStatusBadge: CSSProperties = {
  display: "inline-flex",
  minHeight: 24,
  alignItems: "center",
  padding: "3px 7px",
  border: "1px solid #52525b",
  background: "#29292d",
  color: "#e4e4e7",
  fontSize: 10,
  fontWeight: 950,
  textTransform: "uppercase",
};
const matchNoDetail: CSSProperties = { color: "#71717a", fontSize: 10, fontWeight: 800 };

const globalCss = `
@keyframes fs-spin { to { transform: rotate(360deg); } }
.fs-mini-spinner{width:15px;height:15px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#ff4d00;animation:fs-spin .75s linear infinite;display:inline-block;flex:0 0 auto}
.fs-back-btn,.fs-dark-btn,.fs-orange-btn,.fs-filter,.fs-tab,.fs-icon-btn,.fs-clear-btn,.fs-tournament-btn,.fs-party-detail{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;text-decoration:none;font-weight:950;cursor:pointer;transition:.15s ease;border:1px solid rgba(255,255,255,.22);white-space:nowrap}.fs-back-btn {
  color: #000 !important;justify-self:end;color:#101114;padding:9px 13px;max-width:max-content;background:linear-gradient(180deg,#ffffff,#c5c8ce 55%,#f2f3f5);border-color:rgba(255,255,255,.85);box-shadow:inset 0 1px 0 #fff,0 7px 18px rgba(0,0,0,.35)}.fs-dark-btn{color:#fff;padding:10px 14px;background:linear-gradient(180deg,#2c2e35,#111217);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 8px 16px rgba(0,0,0,.24)}.fs-strong-btn{border-color:rgba(255,77,0,.72);box-shadow:inset 0 1px 0 rgba(255,255,255,.24),0 0 0 1px rgba(255,77,0,.22),0 10px 22px rgba(255,77,0,.18)}.fs-locked{color:#f9c7b7;border-color:rgba(255,77,0,.55);background:linear-gradient(180deg,#3a1d14,#151515)}.fs-orange-btn{color:#fff;padding:10px 14px;border-color:rgba(255,77,0,.85);background:linear-gradient(180deg,#ff5c15,#a22b00);box-shadow:0 0 0 1px rgba(255,255,255,.18) inset,0 0 22px rgba(255,77,0,.28)}.fs-tournament-btn{color:#fff;padding:10px 14px;border-color:rgba(255,77,0,.9);background:linear-gradient(180deg,#ff6a21,#822100);box-shadow:0 0 0 1px rgba(255,255,255,.18) inset,0 0 24px rgba(255,77,0,.32)}.fs-icon-btn{width:34px;height:34px;padding:0;color:#fff;border-radius:9px;background:linear-gradient(180deg,#2b2d34,#111217);box-shadow:inset 0 1px 0 rgba(255,255,255,.16);margin-right:5px}.fs-icon-btn.orange{background:linear-gradient(180deg,#ff5c15,#a22b00);border-color:rgba(255,77,0,.8)}.fs-icon-btn.red{background:linear-gradient(180deg,#ef4444,#991b1b);border-color:rgba(220,38,38,.9)}.fs-icon-btn.blue{background:linear-gradient(180deg,#3b82f6,#1d4ed8);border-color:rgba(37,99,235,.9)}.fs-clear-btn{margin-left:12px;padding:6px 10px;color:#111;background:linear-gradient(180deg,#fff,#d7d9de);border-color:rgba(0,0,0,.2)}.fs-filter{color:#111;padding:10px 13px;background:linear-gradient(180deg,#fff,#d7d9de);border-color:rgba(0,0,0,.2)}.fs-filter.active{color:#fff;border-color:rgba(255,77,0,.9);background:linear-gradient(180deg,#ff5c15,#b32f00)}.fs-tab{color:#fff;padding:9px 12px;background:linear-gradient(180deg,#ff6a21,#b43300);border-color:rgba(255,77,0,.95);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 8px 18px rgba(255,77,0,.16)}.fs-tab span{display:inline-flex;min-width:22px;height:22px;align-items:center;justify-content:center;padding:0 7px;border-radius:999px;color:#111;background:linear-gradient(180deg,#ffffff,#d8dbe0);font-size:12px}.fs-tab.active{color:#fff;background:linear-gradient(180deg,#ff4d00,#7f2200);border-color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 0 2px rgba(255,77,0,.38),0 0 26px rgba(255,77,0,.34)}.fs-tab:disabled{opacity:.45;cursor:not-allowed}.fs-name-select{border:0;padding:0;margin:0;background:transparent;color:#ff4d00;font-size:15px;font-weight:950;cursor:default;text-align:left}.fs-name-select:not(:disabled){cursor:pointer;text-decoration:underline;text-underline-offset:3px}.fs-name-select.active{display:inline-flex;padding:6px 9px;border-radius:999px;color:#fff;background:linear-gradient(180deg,#ff5c15,#9a2800);box-shadow:0 0 0 1px rgba(255,77,0,.75),0 0 18px rgba(255,77,0,.24)}.fs-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 8px;background:#eef0f3;border:1px solid #c9ccd1;color:#111;font-weight:950;font-size:11px}.fs-badge.ok{background:#dcfce7;border-color:#16a34a;color:#166534}.fs-badge.bad{background:#fee2e2;border-color:#dc2626;color:#991b1b}.fs-party-detail{height:28px;padding:0 9px;color:#fff;border-radius:4px;border:1px solid rgba(0,0,0,.45);background:linear-gradient(180deg,#3d434d 0%,#22262d 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.10);font-size:11px;font-weight:950}.fs-party-detail:hover{border-color:#ff4d00;color:#fff}button:disabled{opacity:.55;cursor:not-allowed}@media (max-width: 900px){.fs-back-btn{justify-self:start}}
`;


