"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { authedFetch } from "@/lib/api/authedFetch";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Save,
  ShieldAlert,
  Swords,
  XCircle,
} from "lucide-react";

const ORANGE = "#ff4d00";
const SHIELD = "/branding/fightsupport/vs-shield1.png";

type Fighter = Record<string, any>;
type ResultRow = Record<string, any>;
type Severity = "OK" | "LET OP" | "DISPENSATIE" | "AFKEUR" | "VERBOD";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function lower(v: unknown) {
  return s(v).toLowerCase();
}

function n(v: unknown) {
  const x = Number(
    String(v ?? "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(x) ? x : null;
}

function parseJson(v: unknown): any {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return {};
  }
}

function deep(f?: Fighter | null) {
  const extra = parseJson(f?.extra);
  return {
    extra,
    raw: extra?.raw ?? f?.raw ?? {},
    aanmelding: extra?.raw?.aanmelding ?? f?.aanmelding ?? {},
    fightersRaw: extra?.raw?.fighters_raw ?? f?.fighters_raw ?? {},
  };
}

function name(f?: Fighter | null) {
  if (!f) return "-";
  const d = deep(f);
  return (
    s(f.naam) ||
    s(f.fp_naam) ||
    s(d.fightersRaw?.naam) ||
    s(f.naam_input) ||
    [f.voornaam, f.achternaam].map(s).filter(Boolean).join(" ") ||
    [d.aanmelding?.voornaam, d.aanmelding?.achternaam]
      .map(s)
      .filter(Boolean)
      .join(" ") ||
    "Onbekend"
  );
}

function idOf(f?: Fighter | null) {
  if (!f) return "";
  return s(f.inschrijving_id || f.id || f.fighter_id || f.va_nummer || f.va);
}

function val(v: unknown) {
  return s(v) || "-";
}

function parseDate(v: unknown) {
  const raw = s(v);
  if (!raw) return null;

  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) return iso;

  const m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function formatDate(v: unknown) {
  const d = parseDate(v);
  if (!d) return val(v);
  return d.toLocaleDateString("nl-NL");
}

function birthDate(f?: Fighter | null) {
  const d = deep(f);
  return (
    f?.geboortedatum ??
    f?.fp_geboortedatum ??
    d.fightersRaw?.geboortedatum ??
    f?.geboortedatum_input ??
    d.aanmelding?.geboortedatum ??
    null
  );
}

function ageOnDate(birth: unknown, event: unknown) {
  const b = parseDate(birth);
  const e = parseDate(event);
  if (!b || !e) return null;

  let years = e.getFullYear() - b.getFullYear();
  const beforeBirthday =
    e.getMonth() < b.getMonth() ||
    (e.getMonth() === b.getMonth() && e.getDate() < b.getDate());

  if (beforeBirthday) years--;
  return years;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function diffYMD(a: unknown, b: unknown) {
  const d1 = parseDate(a);
  const d2 = parseDate(b);
  if (!d1 || !d2) return null;

  const start = d1 <= d2 ? new Date(d1) : new Date(d2);
  const end = d1 <= d2 ? new Date(d2) : new Date(d1);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = (end.getMonth() + 11) % 12;
    const prevYear =
      prevMonth === 11 ? end.getFullYear() - 1 : end.getFullYear();
    days += daysInMonth(prevYear, prevMonth);
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days, totalMonths: years * 12 + months };
}

function normalizeGender(v: unknown) {
  const x = lower(v);
  if (!x) return "";
  if (["m", "man", "male", "jongen", "jongens", "heer", "heren"].includes(x))
    return "man";
  if (
    ["v", "vrouw", "female", "meisje", "meisjes", "dame", "dames"].includes(x)
  )
    return "vrouw";
  return x;
}

function gender(f?: Fighter | null) {
  const d = deep(f);
  return normalizeGender(
    f?.geslacht ??
      f?.fp_geslacht ??
      d.fightersRaw?.geslacht ??
      d.aanmelding?.geslacht ??
      f?.gender,
  );
}

function klass(f?: Fighter | null) {
  const d = deep(f);
  return s(
    f?.klasse ??
      f?.fp_klasse ??
      f?.klasse_fp ??
      f?.nulmeting_klasse ??
      d.fightersRaw?.nulmeting_klasse ??
      d.aanmelding?.klasse,
  );
}

function discipline(f?: Fighter | null) {
  const d = deep(f);
  return s(f?.discipline ?? f?.fp_discipline ?? d.aanmelding?.discipline);
}

function gym(f?: Fighter | null) {
  const d = deep(f);
  return s(
    f?.sportschool ??
      f?.gym_input ??
      f?.fp_gym ??
      f?.gym ??
      d.fightersRaw?.gym ??
      d.aanmelding?.gym,
  );
}

function weight(f?: Fighter | null) {
  const d = deep(f);
  return n(
    f?.gewicht ?? f?.gewicht_input ?? f?.fp_gewicht ?? d.aanmelding?.gewicht,
  );
}

function isYouthValue(v: unknown) {
  const x = lower(v);
  return (
    x.includes("jeugd") ||
    x.includes("youth") ||
    x.includes("junior") ||
    /^j[\s+-]*/i.test(s(v))
  );
}

function isMmaMatch(rood?: Fighter | null, blauw?: Fighter | null) {
  const d = `${discipline(rood)} ${discipline(blauw)}`.toLowerCase();
  return d.includes("mma") || d.includes("mixed martial");
}

function roundUpHalf(v: number) {
  return Math.ceil(v * 2) / 2;
}

function fmtKg(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "";
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
}

function suggestedMaxWeight(
  rood?: Fighter | null,
  blauw?: Fighter | null,
  youth = false,
) {
  const rw = weight(rood);
  const bw = weight(blauw);
  if (rw == null || bw == null) return null;

  const heavier = Math.max(rw, bw);
  const diff = Math.abs(rw - bw);
  const limit = youth ? 2 : isMmaMatch(rood, blauw) ? 4 : 3;

  if (diff >= limit) return roundUpHalf(heavier);
  if (diff === 0) return roundUpHalf(heavier + 1);
  return roundUpHalf(heavier + 0.5);
}

function weightLimitText(
  rood?: Fighter | null,
  blauw?: Fighter | null,
  youth = false,
) {
  if (youth) return "Jeugd: maximaal 2 kg verschil";
  if (isMmaMatch(rood, blauw)) return "MMA: maximaal 4 kg verschil";
  return "18 jaar en ouder: maximaal 3 kg verschil";
}

function isYouthMatch(
  rood?: Fighter | null,
  blauw?: Fighter | null,
  eventDate?: string,
) {
  const ra = ageOnDate(birthDate(rood), eventDate);
  const ba = ageOnDate(birthDate(blauw), eventDate);

  return (
    isYouthValue(klass(rood)) ||
    isYouthValue(klass(blauw)) ||
    (ra != null && ra < 18) ||
    (ba != null && ba < 18)
  );
}

function readYesNo(...values: unknown[]) {
  const found = values.find((v) => s(v) !== "");
  const x = lower(found);

  if (["ja", "yes", "true", "1", "geldig", "ok"].includes(x)) return "JA";
  if (["nee", "no", "false", "0", "geen", "ongeldig"].includes(x)) return "NEE";

  if (x.includes("geen") || x.includes("ongeldig")) return "NEE";
  if (x.includes("ja") || x.includes("geldig")) return "JA";
  if (x.includes("nee")) return "NEE";

  return "ONBEKEND";
}

function licenseStatus(f?: Fighter | null) {
  const d = deep(f);
  return readYesNo(
    f?.licentie,
    d.fightersRaw?.licentie,
    f?.licentie_ok,
    f?.licentie_status,
    f?.fp_licentie,
    f?.raw?.licentie,
  );
}

function startverbodStatus(f?: Fighter | null) {
  const d = deep(f);
  return readYesNo(
    f?.heeft_startverbod,
    d.fightersRaw?.heeft_startverbod,
    f?.startverbod,
    f?.startverbod_status,
    f?.raw?.startverbod,
  );
}

function fightStats(f?: Fighter | null) {
  const d = deep(f);

  const fpTotal =
    n(f?.totaal_wedstrijden) ??
    n(d.fightersRaw?.totaal_wedstrijden) ??
    n(f?.uitslagen_count);

  const w =
    n(f?.record_w) ??
    n(f?.gewonnen) ??
    n(d.fightersRaw?.gewonnen) ??
    n(d.aanmelding?.win);

  const l =
    n(f?.record_l) ??
    n(f?.verloren) ??
    n(d.fightersRaw?.verloren) ??
    n(d.aanmelding?.loss);

  const draw =
    n(f?.record_d) ??
    n(f?.draw) ??
    n(f?.gelijk) ??
    n(d.fightersRaw?.gelijk) ??
    n(d.aanmelding?.draw);

  const demo =
    n(f?.demo) ??
    n(f?.demo_count) ??
    n(d.fightersRaw?.demo) ??
    n(d.aanmelding?.demo);

  const computedOfficial = [w, l, draw].some((x) => x != null)
    ? (w ?? 0) + (l ?? 0) + (draw ?? 0)
    : null;

  const official = fpTotal ?? computedOfficial ?? 0;

  return {
    official,
    demo: demo ?? 0,
    w: w ?? null,
    l: l ?? null,
    draw: draw ?? null,
  };
}

function recordLabel(f?: Fighter | null) {
  const stats = fightStats(f);
  const hasRecord = stats.w != null || stats.l != null || stats.draw != null;

  if (hasRecord) {
    return `${stats.w ?? 0}-${stats.l ?? 0}-${stats.draw ?? 0} (${stats.official})`;
  }

  return `${stats.official}`;
}

function partyDifferenceInfo(
  rood?: Fighter | null,
  blauw?: Fighter | null,
  youth = false,
) {
  const r = fightStats(rood);
  const b = fightStats(blauw);
  const diff = Math.abs((r.official ?? 0) - (b.official ?? 0));
  const demoDiff = Math.abs((r.demo ?? 0) - (b.demo ?? 0));

  let severity: Severity = "OK";
  let detail = `Officiële partijen: rood ${r.official}, blauw ${b.official}. Demo wordt apart gelezen en niet bij officiële partijen opgeteld.`;

  const minOfficial = Math.min(r.official ?? 0, b.official ?? 0);

  if (youth && minOfficial < 15 && diff > 4) {
    severity = "DISPENSATIE";
    detail = `Jeugdpartij met ${diff} officiële partijen verschil. Rood ${r.official}, blauw ${b.official}. Zolang één van beide minder dan 15 partijen heeft, is bij meer dan 4 partijen verschil DISPENSATIE nodig. Demo rood ${r.demo}, demo blauw ${b.demo}.`;
  } else if (!youth && diff >= 6) {
    severity = "LET OP";
    detail = `Volwassen partij met groot partijenverschil. Rood ${r.official}, blauw ${b.official}. Demo rood ${r.demo}, demo blauw ${b.demo}.`;
  } else if (demoDiff > 0) {
    detail = `Officiële partijen zijn binnen marge. Demo verschil: ${demoDiff}. Demo rood ${r.demo}, demo blauw ${b.demo}.`;
  }

  return {
    diff,
    demoDiff,
    rood: r,
    blauw: b,
    severity,
    detail,
  };
}

function keurmerkInfo(f?: Fighter | null) {
  const reason = s(f?.keurmerk_reden);
  const rawStatus = s(
    f?.heeft_keurmerk ?? f?.keurmerk_status ?? f?.keurmerk_ok,
  );
  const reasonLower = lower(reason);
  const statusLower = lower(rawStatus);

  const belgium =
    reasonLower.includes("belgië") ||
    reasonLower.includes("belgie") ||
    reasonLower.includes("belgisch") ||
    reasonLower.includes("bkbmo") ||
    statusLower.includes("belgië") ||
    statusLower.includes("belgie") ||
    statusLower.includes("bkbmo");

  if (belgium) {
    return {
      ok: null as boolean | null,
      label: "BELGIË CHECK",
      tone: "warn" as const,
      reason:
        reason ||
        "Belgische/BKBMO sportschool. Informatieve melding, geen afkeur.",
    };
  }

  const yn = readYesNo(rawStatus);

  if (yn === "JA") {
    return {
      ok: true,
      label: "Geldig",
      tone: "ok" as const,
      reason: reason || "Keurmerk match gevonden.",
    };
  }

  if (yn === "NEE") {
    return {
      ok: false,
      label: "Ongeldig",
      tone: "bad" as const,
      reason: reason || "Geen keurmerk match gevonden.",
    };
  }

  if (
    reasonLower.includes("geen match") ||
    reasonLower.includes("geen keurmerk")
  ) {
    return {
      ok: false,
      label: "Ongeldig",
      tone: "bad" as const,
      reason,
    };
  }

  return {
    ok: null,
    label: "Geen data",
    tone: "warn" as const,
    reason: reason || "Geen keurmerkinformatie ontvangen.",
  };
}

function analysisAgeIsMixed(roodAge: number | null, blauwAge: number | null) {
  if (roodAge == null || blauwAge == null) return false;
  return (roodAge < 18 && blauwAge >= 18) || (blauwAge < 18 && roodAge >= 18);
}

function resultSeverity(row: ResultRow): Severity {
  const x = lower(row?.severity ?? row?.resultaat ?? row?.original_resultaat);

  if (x.includes("verbod")) return "VERBOD";
  if (x.includes("dispensatie")) return "DISPENSATIE";
  if (x.includes("afkeur") || x.includes("afgekeurd")) return "AFKEUR";
  if (x.includes("let") || x.includes("actie") || x.includes("warn"))
    return "LET OP";
  return "OK";
}

function severityRank(x: Severity) {
  return { OK: 0, "LET OP": 1, DISPENSATIE: 2, AFKEUR: 3, VERBOD: 4 }[x];
}

function worst(items: { severity: Severity }[]) {
  return items.reduce<Severity>(
    (acc, item) =>
      severityRank(item.severity) > severityRank(acc) ? item.severity : acc,
    "OK",
  );
}

function normVa(v: unknown) {
  return s(v).replace(/[^0-9]/g, "");
}

function rowMatchesFighter(row: ResultRow, f?: Fighter | null) {
  if (!f) return false;
  const va = normVa(f.va_nummer);
  const inschrijvingId = s(f.inschrijving_id);
  return (
    (!!va && normVa(row.va_nummer) === va) ||
    (!!inschrijvingId && s(row.inschrijving_id) === inschrijvingId) ||
    (!!s(row.naam) && lower(row.naam) === lower(name(f)))
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "14px 18px 28px",
  color: "#f4f4f5",
  background:
    "radial-gradient(circle at top, rgba(255,77,0,.12), transparent 28%), linear-gradient(135deg,#050505,#18181b 52%,#050505)",
};

export default function NieuweMatchPage() {
  const params = useParams<{ matchmakingId: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const matchmakingId = String(params?.matchmakingId ?? "");
  const roodId = search.get("rood") || "";
  const blauwId = search.get("blauw") || "";

  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [mm, setMm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [dispensatieOpen, setDispensatieOpen] = useState(false);
  const [weightConfirmOpen, setWeightConfirmOpen] = useState(false);
  const [maxWeightInput, setMaxWeightInput] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/matchmaker/${matchmakingId}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || "Laden mislukt");

      setFighters(json?.fighters ?? json?.gecontroleerde_fighters ?? []);
      setMm(json?.matchmaking ?? null);

      const inlineResults =
        json?.resultaten ??
        json?.results ??
        json?.matchmaker_fighter_resultaten ??
        json?.fighter_resultaten ??
        [];

      if (Array.isArray(inlineResults) && inlineResults.length) {
        setResults(inlineResults);
      } else {
        try {
          const rr = await authedFetch(
            `/api/matchmaker/${matchmakingId}/resultaten`,
          );
          const rj = await rr.json().catch(() => ({}));
          if (rr.ok) {
            setResults(rj?.resultaten ?? rj?.results ?? []);
          }
        } catch {
          setResults([]);
        }
      }
    } catch (e: any) {
      setMsg(e?.message || "Laden mislukt");
    }
  }, [matchmakingId]);

  useEffect(() => {
    if (matchmakingId) load();
  }, [matchmakingId, load]);

  const rood = useMemo(
    () =>
      fighters.find(
        (f) =>
          idOf(f) === roodId ||
          s(f.va_nummer) === roodId ||
          s(f.fighter_id) === roodId ||
          s(f.inschrijving_id) === roodId,
      ),
    [fighters, roodId],
  );

  const blauw = useMemo(
    () =>
      fighters.find(
        (f) =>
          idOf(f) === blauwId ||
          s(f.va_nummer) === blauwId ||
          s(f.fighter_id) === blauwId ||
          s(f.inschrijving_id) === blauwId,
      ),
    [fighters, blauwId],
  );

  const roodResults = useMemo(
    () => results.filter((r) => rowMatchesFighter(r, rood)),
    [results, rood],
  );
  const blauwResults = useMemo(
    () => results.filter((r) => rowMatchesFighter(r, blauw)),
    [results, blauw],
  );

  const eventDate = s(
    mm?.datum ??
      mm?.event_datum ??
      mm?.evenement_datum ??
      mm?.date ??
      rood?.evenement_datum ??
      blauw?.evenement_datum ??
      mm?.created_at,
  );

  const analysis = useMemo(() => {
    const rw = weight(rood);
    const bw = weight(blauw);
    const weightDiff = rw != null && bw != null ? Math.abs(rw - bw) : null;
    const enteredMaxWeight = n(maxWeightInput);

    const roodAge = ageOnDate(birthDate(rood), eventDate);
    const blauwAge = ageOnDate(birthDate(blauw), eventDate);
    const ageDiff = diffYMD(birthDate(rood), birthDate(blauw));
    const youth = isYouthMatch(rood, blauw, eventDate);
    const maxWeightSuggestion = suggestedMaxWeight(rood, blauw, youth);
    const allowedWeightDiff = youth ? 2 : null;
    const partyDiff = partyDifferenceInfo(rood, blauw, youth);

    const roodLic = licenseStatus(rood);
    const blauwLic = licenseStatus(blauw);
    const roodStart = startverbodStatus(rood);
    const blauwStart = startverbodStatus(blauw);

    const items: {
      title: string;
      value: string;
      severity: Severity;
      detail: string;
      icon: ReactNode;
    }[] = [
      {
        title: "Partijverschil",
        value: `${partyDiff.diff} partijen`,
        severity: partyDiff.severity,
        detail: partyDiff.detail,
        icon: <BarChart3 size={16} />,
      },
    ];

    if (
      youth &&
      rw != null &&
      bw != null &&
      weightDiff != null &&
      weightDiff > 2
    ) {
      items.push({
        title: "Gewichtsverschil jeugd",
        value: "DISPENSATIE",
        severity: "DISPENSATIE",
        detail: `Jeugdpartij met meer dan 2 kg verschil. Rood ${fmtKg(rw)} kg, blauw ${fmtKg(bw)} kg: verschil ${fmtKg(weightDiff)} kg. DISPENSATIE nodig.`,
        icon: <ShieldAlert size={16} />,
      });
    }

    if (enteredMaxWeight != null && rw != null && bw != null) {
      const heavier = Math.max(rw, bw);
      if (enteredMaxWeight < heavier) {
        items.push({
          title: "Max gewicht",
          value: "VERBOD",
          severity: "VERBOD",
          detail: `Max gewicht -${fmtKg(enteredMaxWeight)} kg ligt onder het opgegeven gewicht van een vechter (${fmtKg(heavier)} kg).`,
          icon: <ShieldAlert size={16} />,
        });
      } else if (enteredMaxWeight <= heavier + 0.05) {
        items.push({
          title: "Max gewicht",
          value: "LET OP",
          severity: "LET OP",
          detail: `Max gewicht -${fmtKg(enteredMaxWeight)} kg is heel krap, omdat een vechter met ${fmtKg(heavier)} kg is opgegeven. Die vechter moet eigenlijk iets onder ${fmtKg(enteredMaxWeight)} kg wegen.`,
          icon: <ShieldAlert size={16} />,
        });
      }
    }

    const roodGender = lower(gender(rood));
    const blauwGender = lower(gender(blauw));

    if (
      rood &&
      blauw &&
      roodGender &&
      blauwGender &&
      roodGender !== blauwGender
    ) {
      items.push({
        title: "Geslacht",
        value: "VERBOD",
        severity: "VERBOD",
        detail: `Geslacht komt niet overeen: rood ${val(gender(rood))}, blauw ${val(gender(blauw))}. Deze match mag niet worden opgeslagen.`,
        icon: <ShieldAlert size={16} />,
      });
    }

    if (rood && blauw && analysisAgeIsMixed(roodAge, blauwAge)) {
      items.push({
        title: "Leeftijd",
        value: "VERBOD",
        severity: "VERBOD",
        detail: "Jeugd en volwassenen mogen niet tegen elkaar gematcht worden.",
        icon: <ShieldAlert size={16} />,
      });
    }

    if (youth && ageDiff && ageDiff.totalMonths > 24) {
      items.push({
        title: "Leeftijdsverschil jeugd",
        value: "VERBOD",
        severity: "VERBOD",
        detail: `Jeugdpartij met ${ageDiff.totalMonths} maanden en ${ageDiff.days} dagen verschil. Boven 24 maanden is VERBOD.`,
        icon: <ShieldAlert size={16} />,
      });
    } else if (youth && ageDiff && ageDiff.totalMonths > 18) {
      items.push({
        title: "Leeftijdsverschil jeugd",
        value: "DISPENSATIE",
        severity: "DISPENSATIE",
        detail: `Jeugdpartij met ${ageDiff.totalMonths} maanden en ${ageDiff.days} dagen verschil. Boven 18 maanden vereist DISPENSATIE.`,
        icon: <ShieldAlert size={16} />,
      });
    }

    if (roodLic !== "JA") {
      items.push({
        title: "Licentie rood",
        value: roodLic,
        severity: "AFKEUR",
        detail: "Licentie moet JA zijn.",
        icon: <ShieldAlert size={16} />,
      });
    }

    if (blauwLic !== "JA") {
      items.push({
        title: "Licentie blauw",
        value: blauwLic,
        severity: "AFKEUR",
        detail: "Licentie moet JA zijn.",
        icon: <ShieldAlert size={16} />,
      });
    }

    if (roodStart === "JA") {
      items.push({
        title: "Startverbod rood",
        value: "JA",
        severity: "VERBOD",
        detail: "Startverbod JA betekent dat deze vechter niet mag starten.",
        icon: <ShieldAlert size={16} />,
      });
    }

    if (blauwStart === "JA") {
      items.push({
        title: "Startverbod blauw",
        value: "JA",
        severity: "VERBOD",
        detail: "Startverbod JA betekent dat deze vechter niet mag starten.",
        icon: <ShieldAlert size={16} />,
      });
    }

    const resultItems = [...roodResults, ...blauwResults]
      .filter((r) => resultSeverity(r) !== "OK")
      .map((r) => ({
        title: s(r.rule_code ?? r.rule) || "Melding",
        value: resultSeverity(r),
        severity: resultSeverity(r),
        detail: s(r.boodschap) || "Controle melding.",
        icon: <ShieldAlert size={16} />,
      }));

    const allItems = [...items, ...resultItems];

    return {
      youth,
      roodAge,
      blauwAge,
      ageDiff,
      weightDiff,
      allowedWeightDiff,
      maxWeightSuggestion,
      enteredMaxWeight,
      partyDiff,
      roodKeur: keurmerkInfo(rood),
      blauwKeur: keurmerkInfo(blauw),
      items: allItems,
      worst: worst(allItems),
    };
  }, [rood, blauw, eventDate, roodResults, blauwResults, maxWeightInput]);

  useEffect(() => {
    if (!rood || !blauw || maxWeightInput) return;
    const suggestion = suggestedMaxWeight(rood, blauw, analysis.youth);
    if (suggestion != null) setMaxWeightInput(fmtKg(suggestion));
  }, [rood, blauw, analysis.youth, maxWeightInput]);

  async function doSave() {
    setBusy(true);
    setMsg("");

    try {
      const res = await authedFetch("/api/matchmaker/create-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          rood_inschrijving_id: rood?.inschrijving_id ?? rood?.id ?? null,
          blauw_inschrijving_id: blauw?.inschrijving_id ?? blauw?.id ?? null,
          rood_fighter_id: rood?.fighter_id || rood?.va_nummer || null,
          blauw_fighter_id: blauw?.fighter_id || blauw?.va_nummer || null,
          max_gewicht: analysis.enteredMaxWeight,
          afgesproken_max_gewicht: analysis.enteredMaxWeight,
          gewicht: analysis.enteredMaxWeight,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Opslaan mislukt");

      router.push(`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`);
    } catch (e: any) {
      setMsg(e?.message || "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  }

  async function save(forceDispensatie = false) {
    if (!rood || !blauw) {
      setMsg("Kies eerst rood en blauw.");
      return;
    }

    const verboden = analysis.items.filter(
      (item) => item.severity === "VERBOD",
    );
    if (verboden.length > 0) {
      setMsg(
        `Deze match mag niet worden opgeslagen:\n${verboden
          .map((item) => `• ${item.title}: ${item.detail}`)
          .join("\n")}`,
      );
      return;
    }

    const dispensaties = analysis.items.filter(
      (item) => item.severity === "DISPENSATIE",
    );

    if (!forceDispensatie && dispensaties.length > 0) {
      setDispensatieOpen(true);
      return;
    }

    if (!maxWeightInput && analysis.maxWeightSuggestion != null) {
      setMaxWeightInput(fmtKg(analysis.maxWeightSuggestion));
    }
    setWeightConfirmOpen(true);
  }

  function confirmWeightAndSave() {
    const rw = weight(rood);
    const bw = weight(blauw);
    const entered = n(maxWeightInput);

    if (entered == null) {
      setMsg("Vul het maximale wedstrijdgewicht in.");
      return;
    }

    if (rw != null && bw != null) {
      const heavier = Math.max(rw, bw);
      if (entered < heavier) {
        setMsg(
          `Max gewicht -${fmtKg(entered)} kg ligt onder het opgegeven gewicht van een vechter (${fmtKg(heavier)} kg).`,
        );
        return;
      }
    }

    setWeightConfirmOpen(false);
    doSave();
  }

  return (
    <main style={page}>
      <div className="fs-shell">
        <header className="fs-page-head">
          <Link
            className="fs-back"
            href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`}
          >
            <ArrowLeft size={16} />
            Terug
          </Link>

          <div className="fs-head-title">
            <span>FIGHTSUPPORT</span>
            <b>Nieuwe match</b>
            <small>
              {val(mm?.naam ?? mm?.event_naam ?? mm?.titel)} •{" "}
              {formatDate(eventDate)}
            </small>
          </div>

          <StatusPill severity={analysis.worst} />
        </header>

        {msg && <div className="fs-message">{msg}</div>}

        <section className="fs-matchplate">
          <FighterPanel
            corner="red"
            title="RODE HOEK"
            matchmakingId={matchmakingId}
            f={rood}
            age={analysis.roodAge}
            keur={analysis.roodKeur}
          />

          <div className="fs-center">
            <div className="fs-logo-box">
              <Image
                src={SHIELD}
                alt="FightSupport Vechter info"
                width={100}
                height={50}
                priority
                className="fs-logo"
              />
            </div>

            <div className="fs-details">
              <div className="fs-details-head">
                <Swords size={15} />
                WEDSTRIJDDETAILS
              </div>
              <InfoLine
                label="Discipline"
                value={val(discipline(rood) || discipline(blauw))}
                dark
              />
              <InfoLine
                label="Klasse"
                value={val(klass(rood) || klass(blauw))}
                dark
              />
              <InfoLine
                label="Leeftijdsverschil"
                value={
                  analysis.ageDiff
                    ? analysis.youth
                      ? `${analysis.ageDiff.totalMonths} mnd ${analysis.ageDiff.days} dgn`
                      : `${analysis.ageDiff.years} jaar`
                    : "-"
                }
                dark
              />
              <InfoLine
                label="Gewichtsverschil"
                value={
                  analysis.weightDiff == null
                    ? "-"
                    : `${fmtKg(analysis.weightDiff)} kg`
                }
                dark
              />
              <InfoLine
                label="Voorstel max gewicht"
                value={
                  analysis.maxWeightSuggestion == null
                    ? "-"
                    : `-${fmtKg(analysis.maxWeightSuggestion)} kg`
                }
                dark
              />
              <InfoLine
                label="Recordverschil"
                value={`${analysis.partyDiff.diff} partijen`}
                dark
              />
            </div>

            <button
              className="fs-save"
              disabled={busy || !rood || !blauw}
              onClick={() => save()}
            >
              <Save size={16} />
              {busy ? "Opslaan..." : "Match opslaan"}
            </button>
          </div>

          <FighterPanel
            corner="blue"
            title="BLAUWE HOEK"
            matchmakingId={matchmakingId}
            f={blauw}
            age={analysis.blauwAge}
            keur={analysis.blauwKeur}
          />
        </section>
      </div>

      {weightConfirmOpen && (
        <div className="fs-modal-overlay">
          <div className="fs-modal-card fs-weight-modal-card">
            <div className="fs-modal-head">
              <div>
                <div className="fs-modal-kicker">
                  FightSupport wedstrijdgewicht
                </div>
                <div className="fs-modal-title">Max gewicht vastzetten</div>
              </div>
              <div className="fs-modal-badge">kg</div>
            </div>

            <div className="fs-modal-body">
              <p className="fs-modal-intro">
                Controleer de opgegeven gewichten en zet het maximale
                wedstrijdgewicht vast. Dit wordt opgeslagen als{" "}
                <b>max_gewicht</b> in de partij.
              </p>

              <div className="fs-weight-summary">
                <div>
                  <span>Rode hoek</span>
                  <b>{fmtKg(weight(rood)) || "-"} kg</b>
                  <small>{name(rood)}</small>
                </div>
                <div>
                  <span>Blauwe hoek</span>
                  <b>{fmtKg(weight(blauw)) || "-"} kg</b>
                  <small>{name(blauw)}</small>
                </div>
                <div className="proposal">
                  <span>Voorstel</span>
                  <b>-{fmtKg(analysis.maxWeightSuggestion)} kg</b>
                  <small>{weightLimitText(rood, blauw, analysis.youth)}</small>
                </div>
              </div>

              <div className="fs-weight-confirm-field">
                <label htmlFor="max-weight-confirm">
                  Max gewicht wedstrijd
                </label>
                <div className="fs-weight-input-row">
                  <span>-</span>
                  <input
                    id="max-weight-confirm"
                    value={maxWeightInput}
                    onChange={(e) => setMaxWeightInput(e.target.value)}
                    inputMode="decimal"
                    placeholder={
                      analysis.maxWeightSuggestion == null
                        ? "bijv. 72,5"
                        : fmtKg(analysis.maxWeightSuggestion)
                    }
                    autoFocus
                  />
                  <span>kg</span>
                </div>
                <small>
                  Typ het voorstel over of pas het bewust aan. Beide vechters
                  moeten zich aan dit maximum houden.
                </small>
              </div>

              <div className="fs-modal-actions">
                <button
                  type="button"
                  className="fs-modal-cancel"
                  onClick={() => setWeightConfirmOpen(false)}
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  className="fs-modal-confirm"
                  onClick={confirmWeightAndSave}
                >
                  Bevestigen en opslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dispensatieOpen && (
        <div className="fs-modal-overlay">
          <div className="fs-modal-card">
            <div className="fs-modal-head">
              <div>
                <div className="fs-modal-kicker">FightSupport controle</div>
                <div className="fs-modal-title">Dispensatie vereist</div>
              </div>
              <div className="fs-modal-badge">!</div>
            </div>

            <div className="fs-modal-body">
              <p className="fs-modal-intro">
                Voor deze match is dispensatie nodig. De matchmaker moet dit
                bewust bevestigen.
              </p>

              <div className="fs-modal-list">
                {analysis.items
                  .filter((item) => item.severity === "DISPENSATIE")
                  .map((item, idx) => (
                    <div className="fs-modal-rule" key={`${item.title}-${idx}`}>
                      <div className="fs-modal-rule-title">{item.title}</div>
                      <div className="fs-modal-rule-detail">{item.detail}</div>
                    </div>
                  ))}
              </div>

              <div className="fs-modal-question">
                Weet je zeker dat je deze partij met dispensatie wilt opslaan?
              </div>

              <div className="fs-modal-actions">
                <button
                  type="button"
                  className="fs-modal-cancel"
                  onClick={() => setDispensatieOpen(false)}
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  className="fs-modal-confirm"
                  onClick={() => {
                    setDispensatieOpen(false);
                    save(true);
                  }}
                >
                  Ja, opslaan met dispensatie
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div className="fs-wait-overlay">
          <div className="fs-wait-card">
            <div className="fs-wait-ring">FS</div>
            <div>
              <div className="fs-wait-title">Match wordt opgeslagen</div>
              <div className="fs-wait-text">
                FightSupport werkt de partij bij. Je gaat zo terug naar matchen.
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .fs-shell {
          max-width: 1540px;
          margin: 0 auto;
        }

        .fs-page-head {
          min-height: 92px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background:
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.18),
              rgba(255, 255, 255, 0.04) 18%,
              rgba(255, 255, 255, 0.1) 50%,
              rgba(255, 255, 255, 0.04) 82%,
              rgba(255, 255, 255, 0.18)
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.055) 0 1px,
              transparent 1px 8px
            ),
            linear-gradient(180deg, #6b6b70, #202124 38%, #111214 100%);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.35),
            inset 0 -3px 0 rgba(255, 77, 0, 0.65),
            0 24px 70px rgba(0, 0, 0, 0.52);
          display: grid;
          grid-template-columns: 170px 1fr 140px;
          gap: 18px;
          align-items: center;
          padding: 14px 22px;
        }

        .fs-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #f4f4f5;
          text-decoration: none;
          border-radius: 999px;
          padding: 9px 14px;
          font-weight: 950;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.2),
            rgba(0, 0, 0, 0.28)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .fs-head-title {
          text-align: center;
        }

        .fs-head-title span {
          display: block;
          color: #f4f4f5;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.18em;
        }

        .fs-head-title b {
          display: block;
          color: ${ORANGE};
          font-size: 30px;
          line-height: 1;
          margin-top: 2px;
          text-transform: uppercase;
        }

        .fs-head-title small {
          display: block;
          color: #fff;
          font-weight: 900;
          margin-top: 5px;
        }

        .fs-message {
          margin-top: 14px;
          border-radius: 16px;
          padding: 12px 14px;
          color: #ffd1bf;
          border: 1px solid rgba(255, 77, 0, 0.5);
          background: rgba(255, 77, 0, 0.11);
          font-weight: 850;
        }

        .fs-matchplate {
          margin-top: 18px;
          border-radius: 30px;
          padding: 22px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background:
            radial-gradient(
              circle at center,
              rgba(255, 255, 255, 0.75),
              rgba(180, 180, 185, 0.42) 22%,
              rgba(70, 70, 74, 0.34) 58%,
              rgba(8, 8, 10, 0.95) 100%
            ),
            linear-gradient(180deg, #f4f4f5, #6b6b70 45%, #171719);
          box-shadow:
            inset 0 3px 0 rgba(255, 255, 255, 0.6),
            inset 0 -2px 0 rgba(0, 0, 0, 0.75),
            0 26px 80px rgba(0, 0, 0, 0.55);
          display: grid;
          grid-template-columns: minmax(390px, 1fr) 260px minmax(390px, 1fr);
          gap: 12px;
          align-items: start;
        }

        .fs-fighter {
          min-height: 410px;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.05),
              rgba(255, 255, 255, 0.015)
            ),
            linear-gradient(135deg, #111215, #050506);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 18px 45px rgba(0, 0, 0, 0.55);
        }

        .fs-fighter-title {
          height: 58px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 18px;
          color: white;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -2px 0 rgba(0, 0, 0, 0.34);
        }

        .fs-fighter.red .fs-fighter-title {
          background: linear-gradient(180deg, #ff6b6b, #991b1b 55%, #450a0a);
        }

        .fs-fighter.blue .fs-fighter-title {
          background: linear-gradient(180deg, #60a5fa, #1d4ed8 55%, #0b1f54);
        }

        .fs-fighter-body {
          padding: 18px;
        }

        .fs-fighter-name {
          margin: 0;
          color: ${ORANGE};
          font-size: 30px;
          line-height: 0.98;
          letter-spacing: -0.03em;
          text-transform: uppercase;
        }

        .fs-gym {
          margin-top: 5px;
          color: #d4d4d8;
          font-size: 15px;
          font-weight: 900;
        }

        .fs-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin: 14px 0;
        }

        .mini-badge {
          display: inline-flex;
          gap: 7px;
          align-items: center;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 1000;
          border: 1px solid rgba(255, 255, 255, 0.13);
          background: rgba(255, 255, 255, 0.07);
          color: #fff;
        }

        .mini-badge.ok {
          background: rgba(22, 163, 74, 0.8);
        }

        .mini-badge.bad {
          background: rgba(185, 28, 28, 0.8);
        }

        .mini-badge.warn {
          background: rgba(180, 83, 9, 0.8);
        }

        .fs-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 18px;
        }

        .fs-info-line {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          color: #e4e4e7;
          font-size: 14px;
        }

        .fs-info-line span {
          color: #b8b8bf;
          font-weight: 850;
        }

        .fs-info-line b {
          text-align: right;
        }

        .fs-info-line.dark {
          color: #f8fafc;
          border-bottom: 1px solid rgba(255, 255, 255, 0.11);
        }

        .fs-info-line.dark span {
          color: #cbd5e1;
        }

        .fs-info-line.dark b {
          color: #ffffff;
        }

        .fs-keur {
          margin-top: 14px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.13);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.08),
            rgba(255, 255, 255, 0.025)
          );
        }

        .fs-subhead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 9px 12px;
          color: white;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          background: linear-gradient(180deg, #292a2d, #070708);
          box-shadow: inset 0 -2px 0 rgba(255, 77, 0, 0.45);
        }

        .fs-whitebox {
          padding: 12px;
          background: white;
          color: #18181b;
          white-space: pre-wrap;
          font-weight: 750;
          font-size: 13px;
        }

        .fs-center {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: stretch;
          position: relative;
          z-index: 2;
        }

        .fs-logo-box {
          position: relative;
          height: 148px;
          margin: 0 auto 12px;
          width: calc(100% - 12px);
          border-radius: 28px;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(
              circle at center,
              rgba(255, 160, 60, 0.18) 0%,
              rgba(255, 120, 0, 0.08) 28%,
              rgba(10, 10, 12, 0.96) 72%
            ),
            linear-gradient(180deg, #3b3b3d 0%, #111112 12%, #050506 100%);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            inset 0 -2px 0 rgba(0, 0, 0, 0.55),
            0 12px 24px rgba(0, 0, 0, 0.42);
        }

        .fs-logo-box::before {
          content: "";
          position: absolute;
          top: 0;
          left: 18px;
          right: 18px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.5),
            transparent
          );
        }

        .fs-logo {
          width: min(380px, 100%);
          height: auto;
          object-fit: contain;
          transform: scale(0.96);
          filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.68)) contrast(1.04);
        }

        .fs-details {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(
            180deg,
            rgba(32, 33, 36, 0.98),
            rgba(8, 8, 10, 0.98)
          );
          color: #fff;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            0 16px 35px rgba(0, 0, 0, 0.34);
        }

        .fs-details-head,
        .fs-block-head {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 14px;
          color: #fff;
          font-weight: 1000;
          letter-spacing: 0.08em;
          background: linear-gradient(180deg, #292a2d, #070708);
          box-shadow: inset 0 -2px 0 rgba(255, 77, 0, 0.55);
        }

        .fs-weight-field,
        .fs-weight-confirm-field {
          padding: 12px 14px 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.11);
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.12),
            rgba(255, 255, 255, 0.03)
          );
        }

        .fs-weight-field label,
        .fs-weight-confirm-field label {
          display: block;
          color: #fff;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .fs-weight-input-row {
          display: grid;
          grid-template-columns: 28px 1fr 34px;
          align-items: center;
          gap: 8px;
        }

        .fs-weight-input-row span {
          color: ${ORANGE};
          font-size: 22px;
          font-weight: 1000;
          text-align: center;
        }

        .fs-weight-input-row input {
          width: 100%;
          height: 46px;
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          outline: none;
          padding: 0 13px;
          color: #fff;
          font-size: 20px;
          font-weight: 1000;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.12),
            rgba(0, 0, 0, 0.34)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        .fs-weight-field small,
        .fs-weight-confirm-field small {
          display: block;
          margin-top: 8px;
          color: #e4e4e7;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.35;
        }

        .fs-save {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 12px;
          padding: 12px 14px;
          color: white;
          font-weight: 1000;
          cursor: pointer;
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 1),
            rgba(136, 30, 0, 1)
          );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.35),
            0 12px 25px rgba(0, 0, 0, 0.35);
        }

        .fs-save:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .fs-checks {
          margin-top: 18px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.1),
              rgba(255, 255, 255, 0.035)
            ),
            linear-gradient(135deg, #18191c, #070708);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 20px 55px rgba(0, 0, 0, 0.45);
          overflow: hidden;
        }

        .dot {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          background: ${ORANGE};
        }

        .fs-check-grid {
          padding: 16px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 12px;
        }

        .fs-check-card {
          border-radius: 16px;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.055);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .fs-check-card.top {
          border-color: rgba(220, 38, 38, 0.65);
          background: rgba(220, 38, 38, 0.13);
        }

        .fs-check-card.mid {
          border-color: rgba(255, 77, 0, 0.55);
          background: rgba(255, 77, 0, 0.1);
        }

        .fs-check-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .fs-check-title b {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .fs-check-value {
          font-size: 22px;
          font-weight: 1000;
          color: #fff;
        }

        .fs-check-detail {
          margin-top: 4px;
          color: #c9c9d1;
          font-size: 13px;
          font-weight: 750;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 1000;
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #fff;
        }

        .status-pill.ok {
          background: rgba(22, 163, 74, 0.85);
        }

        .status-pill.warn {
          background: rgba(180, 83, 9, 0.9);
        }

        .status-pill.bad {
          background: rgba(234, 88, 12, 0.9);
        }

        .status-pill.stop {
          background: rgba(185, 28, 28, 0.92);
        }

        .fs-fighter-title {
          justify-content: space-between;
        }

        .fs-header-detail {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          color: #fff;
          text-decoration: none;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          border: 1px solid rgba(255, 255, 255, 0.26);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.22),
            rgba(0, 0, 0, 0.28)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .fs-header-detail:hover {
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.95),
            rgba(120, 28, 0, 0.95)
          );
        }

        .status-pill.disp {
          background: rgba(255, 77, 0, 0.95);
        }

        .fs-modal-overlay,
        .fs-wait-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: radial-gradient(
            circle at center,
            rgba(255, 77, 0, 0.16),
            rgba(0, 0, 0, 0.82) 54%,
            rgba(0, 0, 0, 0.92)
          );
          backdrop-filter: blur(10px);
        }

        .fs-modal-card,
        .fs-wait-card {
          width: min(760px, 100%);
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.04) 0 1px,
              transparent 1px 8px
            ),
            linear-gradient(180deg, #6b6b70 0%, #202124 34%, #0b0c0f 100%);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.35),
            inset 0 -3px 0 rgba(255, 77, 0, 0.65),
            0 34px 90px rgba(0, 0, 0, 0.72),
            0 0 48px rgba(255, 77, 0, 0.18);
        }

        .fs-weight-modal-card {
          width: min(820px, 100%);
        }

        .fs-weight-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0;
        }

        .fs-weight-summary > div {
          min-height: 112px;
          border-radius: 18px;
          padding: 15px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            rgba(0, 0, 0, 0.24)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .fs-weight-summary .proposal {
          border-color: rgba(255, 77, 0, 0.5);
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.2),
            rgba(0, 0, 0, 0.24)
          );
        }

        .fs-weight-summary span {
          display: block;
          color: #d4d4d8;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .fs-weight-summary b {
          display: block;
          margin-top: 8px;
          color: #fff;
          font-size: 30px;
          line-height: 1;
        }

        .fs-weight-summary small {
          display: block;
          margin-top: 10px;
          color: #f4f4f5;
          font-weight: 800;
          line-height: 1.35;
        }

        .fs-weight-confirm-field {
          margin-top: 16px;
          border-radius: 20px;
          border: 1px solid rgba(255, 77, 0, 0.42);
        }

        .fs-modal-head {
          padding: 22px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.14),
            rgba(0, 0, 0, 0.18)
          );
        }

        .fs-modal-kicker {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .fs-modal-title {
          margin-top: 4px;
          color: #fff;
          font-size: 32px;
          font-weight: 1000;
          text-transform: uppercase;
        }

        .fs-modal-badge {
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          color: #fff;
          font-size: 30px;
          font-weight: 1000;
          background: linear-gradient(180deg, #ff8a00, #ff4d00);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.38),
            0 0 30px rgba(255, 77, 0, 0.35);
        }

        .fs-modal-body {
          padding: 24px;
        }

        .fs-modal-intro,
        .fs-modal-question {
          margin: 0 0 16px;
          color: #f4f4f5;
          font-weight: 850;
        }

        .fs-modal-list {
          display: grid;
          gap: 12px;
        }

        .fs-modal-rule {
          border-radius: 18px;
          padding: 16px;
          border: 1px solid rgba(255, 77, 0, 0.4);
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.16),
            rgba(0, 0, 0, 0.18)
          );
        }

        .fs-modal-rule-title {
          color: #ffb089;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .fs-modal-rule-detail {
          margin-top: 6px;
          color: #fff;
          font-weight: 800;
          line-height: 1.5;
        }

        .fs-modal-question {
          margin-top: 22px;
          padding: 14px 16px;
          border-radius: 16px;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.06);
        }

        .fs-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 22px;
        }

        .fs-modal-cancel,
        .fs-modal-confirm {
          height: 50px;
          border-radius: 14px;
          padding: 0 22px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          cursor: pointer;
          font-weight: 1000;
        }

        .fs-modal-cancel {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.16),
            rgba(0, 0, 0, 0.3)
          );
        }

        .fs-modal-confirm {
          background: linear-gradient(180deg, #ff7b00, #ff4d00 54%, #7c1f00);
          box-shadow: 0 0 28px rgba(255, 77, 0, 0.35);
        }

        .fs-weight-modal-card {
          width: min(820px, 100%);
        }

        .fs-weight-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0;
        }

        .fs-weight-summary > div {
          min-height: 112px;
          border-radius: 18px;
          padding: 15px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            rgba(0, 0, 0, 0.24)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .fs-weight-summary .proposal {
          border-color: rgba(255, 77, 0, 0.5);
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.2),
            rgba(0, 0, 0, 0.24)
          );
        }

        .fs-weight-summary span {
          display: block;
          color: #d4d4d8;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .fs-weight-summary b {
          display: block;
          margin-top: 8px;
          color: #fff;
          font-size: 30px;
          line-height: 1;
        }

        .fs-weight-summary small {
          display: block;
          margin-top: 10px;
          color: #f4f4f5;
          font-weight: 800;
          line-height: 1.35;
        }

        .fs-weight-confirm-field {
          margin-top: 16px;
          border-radius: 20px;
          border: 1px solid rgba(255, 77, 0, 0.42);
        }

        .fs-wait-card {
          width: min(540px, 100%);
          padding: 26px;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .fs-wait-ring {
          width: 72px;
          height: 72px;
          flex: 0 0 auto;
          border-radius: 22px;
          display: grid;
          place-items: center;
          color: #fff;
          font-weight: 1000;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: radial-gradient(
            circle,
            rgba(255, 77, 0, 0.95),
            rgba(90, 20, 0, 0.95)
          );
          box-shadow: 0 0 34px rgba(255, 77, 0, 0.34);
          animation: fsPulse 1.1s ease-in-out infinite alternate;
        }

        .fs-wait-title {
          color: #fff;
          font-size: 24px;
          font-weight: 1000;
          text-transform: uppercase;
        }

        .fs-wait-text {
          margin-top: 5px;
          color: #d4d4d8;
          font-weight: 800;
        }

        @keyframes fsPulse {
          from {
            transform: scale(0.96);
            filter: brightness(0.9);
          }
          to {
            transform: scale(1.04);
            filter: brightness(1.18);
          }
        }

        @media (max-width: 1220px) {
          .fs-page-head {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .fs-matchplate {
            grid-template-columns: 1fr;
          }

          .fs-center {
            order: -1;
          }
        }

        @media (max-width: 680px) {
          .fs-weight-summary {
            grid-template-columns: 1fr;
          }
          main {
            padding: 12px !important;
          }

          .fs-info-grid {
            grid-template-columns: 1fr;
          }

          .fs-logo-box {
            height: 185px;
            margin: 0;
          }

          .fs-logo {
            width: 280px;
            max-width: 96%;
          }
        }
      `}</style>
    </main>
  );
}

function FighterPanel({
  corner,
  title,
  matchmakingId,
  f,
  age,
  keur,
}: {
  corner: "red" | "blue";
  title: string;
  matchmakingId: string;
  f?: Fighter | null;
  age: number | null;
  keur: {
    ok: boolean | null;
    label: string;
    tone: "ok" | "bad" | "warn";
    reason: string;
  };
}) {
  const licentie = licenseStatus(f);
  const startverbod = startverbodStatus(f);

  return (
    <article className={`fs-fighter ${corner}`}>
      <div className="fs-fighter-title">
        <span>{title}</span>
        {f && (
          <Link
            href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${String(f?.id || f?.fighter_id || f?.inschrijving_id || "")}`}
            className="fs-header-detail"
          >
            Details
          </Link>
        )}
      </div>

      <div className="fs-fighter-body">
        <h2 className="fs-fighter-name">{name(f)}</h2>
        <div className="fs-gym">{val(gym(f))}</div>

        <div className="fs-badges">
          <MiniBadge
            label={`Licentie: ${licentie}`}
            state={licentie === "JA" ? "ok" : "bad"}
          />
          <MiniBadge
            label={`Startverbod: ${startverbod}`}
            state={
              startverbod === "JA"
                ? "bad"
                : startverbod === "NEE"
                  ? "ok"
                  : "warn"
            }
          />
        </div>

        <div className="fs-info-grid">
          <InfoLine
            label="VA"
            value={val(f?.va_nummer || f?.va || f?.fighter_id)}
          />
          <InfoLine label="Geboren" value={formatDate(birthDate(f))} />
          <InfoLine
            label="Leeftijd"
            value={age == null ? "-" : `${age} jaar`}
          />
          <InfoLine label="Geslacht" value={val(gender(f))} />
          <InfoLine label="Discipline" value={val(discipline(f))} />
          <InfoLine label="Klasse" value={val(klass(f))} />
          <InfoLine
            label="Gewicht"
            value={weight(f) == null ? "-" : `${weight(f)?.toFixed(1)} kg`}
          />
          <InfoLine label="Record" value={recordLabel(f)} />
        </div>

        <div className="fs-keur">
          <div className="fs-subhead">
            <span>KEURMERK</span>
            <MiniBadge label={keur.label} state={keur.tone} />
          </div>
          <div className="fs-whitebox">{keur.reason}</div>
        </div>
      </div>
    </article>
  );
}

function InfoLine({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div className={`fs-info-line ${dark ? "dark" : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function MiniBadge({
  label,
  state,
}: {
  label: string;
  state: "ok" | "bad" | "warn";
}) {
  return <span className={`mini-badge ${state}`}>{label}</span>;
}

function StatusPill({ severity }: { severity: Severity }) {
  const cls =
    severity === "VERBOD"
      ? "stop"
      : severity === "DISPENSATIE"
        ? "disp"
        : severity === "AFKEUR"
          ? "bad"
          : severity === "LET OP"
            ? "warn"
            : "ok";

  return (
    <span className={`status-pill ${cls}`}>
      {severity === "OK" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {severity}
    </span>
  );
}
