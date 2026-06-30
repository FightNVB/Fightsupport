"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Database,
  History,
  RefreshCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";

const ORANGE = "#ff4d00";
const logoSrc = "/branding/fightsupport/excel-logo.png";

type AuditRow = {
  id: string;
  created_at: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  matchmaking_id: string | null;
  partij_nr: number | null;
  old_value: any;
  new_value: any;
  meta: any;
};

type UserProfileRow = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type MatchmakingMetaRow = {
  matchmaking_id: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
};

type UserNameMap = Record<string, string>;
type EventMap = Record<
  string,
  {
    evenement_naam: string;
    evenement_datum: string | null;
  }
>;


type ControleResultaatRow = {
  id?: string | null;
  matchmaking_id?: string | null;
  controle_run_id?: string | null;
  bout_id?: string | null;
  partij_nr?: number | null;
  toernooi_code?: string | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
  rule?: string | null;
  rule_code?: string | null;
  resultaat?: string | null;
  original_resultaat?: string | null;
  severity?: string | null;
  boodschap?: string | null;
  hoek?: string | null;
  review_status?: string | null;
  review_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  aantekeningen?: string | null;
};

type BoutContextRow = {
  matchmaking_id?: string | null;
  bout_id?: string | null;
  partij_nr?: number | null;
  rood_naam_mm?: string | null;
  blauw_naam_mm?: string | null;
  rood_gym_mm?: string | null;
  blauw_gym_mm?: string | null;
  rood_va_mm?: string | null;
  blauw_va_mm?: string | null;
  klasse_mm?: string | null;
  discipline?: string | null;
  evenement_naam?: string | null;
  evenement_datum?: string | null;
};

type ToernooiContextRow = {
  matchmaking_id?: string | null;
  toernooi_code?: string | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
  naam?: string | null;
  naam_mm?: string | null;
  naam_fp?: string | null;
  sportschool?: string | null;
  sportschool_mm?: string | null;
  klasse?: string | null;
  klasse_mm?: string | null;
  discipline?: string | null;
  evenement_naam?: string | null;
  evenement_datum?: string | null;
};

type WeighInBoutRow = {
  id?: string | null;
  matchmaking_id?: string | null;
  bout_context_id?: string | null;
  controle_run_id?: string | null;
  partij_nr?: number | null;
  original_partij_nr?: number | null;
  rood_naam?: string | null;
  blauw_naam?: string | null;
  rood_gym?: string | null;
  blauw_gym?: string | null;
  rood_va?: string | null;
  blauw_va?: string | null;
  rood_gewogen_gewicht?: string | number | null;
  blauw_gewogen_gewicht?: string | number | null;
  gewicht_strafpunt_rood?: string | number | null;
  gewicht_strafpunt_blauw?: string | number | null;
  klasse_mm?: string | null;
  discipline?: string | null;
  max_gewicht_notatie?: string | null;
  reglement_status?: string | null;
  praktijk_status?: string | null;
  eindstatus?: string | null;
  evenement_naam?: string | null;
  evenement_datum?: string | null;
};

type ApprovalInfo = {
  controle?: ControleResultaatRow | null;
  bout?: BoutContextRow | null;
  toernooi?: ToernooiContextRow | null;
  weighIn?: WeighInBoutRow | null;
};

type ApprovalMap = Record<string, ApprovalInfo>;

const ACTION_OPTIONS = [
  { value: "", label: "Alle acties" },
  { value: "update", label: "Update" },
  { value: "snapshot_created", label: "Snapshot" },
  { value: "insert", label: "Insert" },
  { value: "delete", label: "Delete" },
];

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeKey(v: unknown) {
  return safeText(v).toLowerCase();
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL");
}

function fmtEventDate(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("nl-NL");
}

function shortText(v: unknown, max = 80) {
  const s = safeText(v);
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function emailFallback(email?: string | null) {
  const s = safeText(email);
  if (!s) return "Onbekend";
  const local = s.split("@")[0]?.trim();
  return local || s;
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function displayValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Ja" : "Nee";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    const s = v.trim();
    return s || "—";
  }
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : "[]";
  if (isPlainObject(v)) return JSON.stringify(v);
  return String(v);
}

function valuesEqual(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function getChangedFields(row: AuditRow) {
  const oldObj = isPlainObject(row.old_value) ? row.old_value : {};
  const newObj = isPlainObject(row.new_value) ? row.new_value : {};
  const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

  return keys
    .filter((key) => !valuesEqual(oldObj[key], newObj[key]))
    .map((key) => ({
      key,
      oldValue: oldObj[key],
      newValue: newObj[key],
    }));
}

function getPossibleActorIds(row: AuditRow) {
  const ids = [
    row.actor_user_id,
    row.meta?.reviewed_by,
    row.meta?.updated_by,
    row.meta?.changed_by,
    row.new_value?.reviewed_by,
    row.new_value?.updated_by,
    row.new_value?.changed_by,
    row.old_value?.reviewed_by,
    row.old_value?.updated_by,
    row.old_value?.changed_by,
  ]
    .map((v) => normalizeKey(v))
    .filter(Boolean);

  return Array.from(new Set(ids));
}

function getPossibleActorEmails(row: AuditRow) {
  const emails = [
    row.actor_email,
    row.meta?.reviewed_by_email,
    row.meta?.updated_by_email,
    row.new_value?.reviewed_by_email,
    row.new_value?.updated_by_email,
    row.old_value?.reviewed_by_email,
    row.old_value?.updated_by_email,
  ]
    .map((v) => normalizeKey(v))
    .filter(Boolean);

  return Array.from(new Set(emails));
}

function rowHasSnapshot(row: AuditRow) {
  return (
    row.action === "snapshot_created" ||
    !!row.meta?.snapshot ||
    !!row.new_value?.snapshot ||
    !!row.old_value?.snapshot
  );
}

function getSnapshotData(row: AuditRow) {
  return (
    row.meta?.snapshot ??
    row.new_value?.snapshot ??
    row.old_value?.snapshot ??
    row.new_value ??
    row.meta ??
    null
  );
}


function isGoedgekeurdValue(v: unknown) {
  return normalizeKey(v) === "goedgekeurd";
}

function getAuditValue(row: AuditRow, key: string) {
  return row.new_value?.[key] ?? row.meta?.[key] ?? row.old_value?.[key] ?? null;
}

function toNullableNumber(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getControleResultaatId(row: AuditRow) {
  const candidates = [
    row.entity_type === "controle_resultaten" ? row.entity_id : null,
    getAuditValue(row, "controle_resultaat_id"),
    getAuditValue(row, "resultaat_id"),
    getAuditValue(row, "id"),
  ];

  return safeText(candidates.find((v) => safeText(v)) || "");
}

function getWeighInBoutId(row: AuditRow) {
  const candidates = [
    row.entity_type === "weigh_in_bouts" ? row.entity_id : null,
    getAuditValue(row, "weigh_in_bout_id"),
    getAuditValue(row, "weighInBoutId"),
    getAuditValue(row, "id"),
  ];

  return safeText(candidates.find((v) => safeText(v)) || "");
}

function getApprovalKey(row: AuditRow) {
  return row.id;
}

function getApprovalSearchText(info?: ApprovalInfo | null) {
  if (!info) return "";
  const c = info.controle;
  const b = info.bout;
  const t = info.toernooi;
  const w = info.weighIn;
  return normalizeKey([
    c?.rule,
    c?.rule_code,
    c?.boodschap,
    c?.review_status,
    c?.original_resultaat,
    b?.rood_naam_mm,
    b?.blauw_naam_mm,
    b?.rood_gym_mm,
    b?.blauw_gym_mm,
    b?.rood_va_mm,
    b?.blauw_va_mm,
    t?.naam,
    t?.naam_mm,
    t?.naam_fp,
    t?.sportschool,
    t?.sportschool_mm,
    t?.va_nummer,
    w?.rood_naam,
    w?.blauw_naam,
    w?.rood_gym,
    w?.blauw_gym,
    w?.rood_va,
    w?.blauw_va,
    w?.reglement_status,
    w?.praktijk_status,
    w?.eindstatus,
  ].filter(Boolean).join(" "));
}

function hasApprovalChange(row: AuditRow) {
  return (
    isGoedgekeurdValue(row.new_value?.review_status) ||
    isGoedgekeurdValue(row.meta?.review_status) ||
    isGoedgekeurdValue(row.old_value?.review_status) ||
    isGoedgekeurdValue(row.new_value?.actie_status) ||
    isGoedgekeurdValue(row.meta?.actie_status)
  );
}

const APPROVAL_TECH_FIELDS = new Set([
  "review_status",
  "reviewed_by",
  "reviewed_at",
  "review_note",
  "actie_status",
  "actie",
  "aantekeningen",
  "resultaat",
]);

function getDisplayChangedFields(row: AuditRow) {
  const fields = getChangedFields(row);

  if (!hasApprovalChange(row)) return fields;

  const technicalApprovalFields = fields.filter((change) => APPROVAL_TECH_FIELDS.has(change.key));
  const otherFields = fields.filter((change) => !APPROVAL_TECH_FIELDS.has(change.key));

  if (!technicalApprovalFields.length) return fields;

  const oldStatus =
    row.old_value?.review_status ??
    row.old_value?.actie_status ??
    row.old_value?.resultaat ??
    row.old_value?.original_resultaat ??
    row.meta?.original_resultaat ??
    "Open";

  const newStatus =
    row.new_value?.review_status ??
    row.meta?.review_status ??
    row.new_value?.actie_status ??
    "goedgekeurd";

  return [
    {
      key: "Goedkeuring",
      oldValue: oldStatus,
      newValue: newStatus,
    },
    ...otherFields,
  ];
}

function getAuditDedupeKey(row: AuditRow) {
  const controleId = getControleResultaatId(row);
  if ((hasApprovalChange(row) || row.entity_type === "controle_resultaten") && controleId) {
    return `controle_resultaten:${controleId}`;
  }

  const weighInId = getWeighInBoutId(row);
  if ((hasApprovalChange(row) || row.entity_type === "weigh_in_bouts") && weighInId) {
    return `weigh_in_bouts:${weighInId}`;
  }

  return `audit:${row.id}`;
}

function dedupeAuditRows(rows: AuditRow[]) {
  const seen = new Set<string>();
  const result: AuditRow[] = [];

  for (const row of rows) {
    const key = getAuditDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }

  return result;
}

const pageBackground: CSSProperties = {
  minHeight: "100vh",
  color: "#fff",
  background: "#2b2b2b",
};

const sectionRule = (_top = false): CSSProperties => ({
  borderBottom: "1px solid #52525b",
  background: "linear-gradient(90deg,#1d1d1d,#303030,#151515)",
});

const steelFrameOuter: CSSProperties = {
  border: "1px solid #71717a",
  background: "#121212",
  boxShadow: "0 24px 60px rgba(0,0,0,.45)",
};

const steelFrameMid: CSSProperties = {
  background: "transparent",
};

const steelFrameChannel: CSSProperties = {
  background: "transparent",
};

const steelFrameInner: CSSProperties = {
  background: "transparent",
};

const darkPlate: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  border: "1px solid #3f3f46",
  background: "#1c1c1c",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
};

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [nameMap, setNameMap] = useState<UserNameMap>({});
  const [eventMap, setEventMap] = useState<EventMap>({});
  const [approvalMap, setApprovalMap] = useState<ApprovalMap>({});

  const [searchText, setSearchText] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");

  const [openChanges, setOpenChanges] = useState<Record<string, boolean>>({});
  const [openJson, setOpenJson] = useState<Record<string, boolean>>({});

  async function loadBase() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("limit", "150");

      const res = await authedFetch(`/api/admin/beheer/audit?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Kon audit log niet laden.");
      }

      const nextItems = Array.isArray(json?.items) ? json.items : [];
      setItems(nextItems);

      await Promise.all([loadUserNames(nextItems), loadEventNames(nextItems), loadApprovalInfo(nextItems)]);
    } catch (err: any) {
      setError(err?.message || "Onbekende fout.");
      setItems([]);
      setNameMap({});
      setEventMap({});
      setApprovalMap({});
    } finally {
      setLoading(false);
    }
  }

  async function loadApprovalInfo(rows: AuditRow[]) {
    if (!rows.length) {
      setApprovalMap({});
      return;
    }

    const resultMap: ApprovalMap = {};
    const controleIds = Array.from(
      new Set(rows.map((row) => getControleResultaatId(row)).filter(Boolean))
    );
    const weighInIds = Array.from(
      new Set(rows.map((row) => getWeighInBoutId(row)).filter(Boolean))
    );

    const rowMatcher = (row: AuditRow, c?: ControleResultaatRow | null) => {
      if (!c) return false;
      const id = safeText(c.id);
      if (id && getControleResultaatId(row) === id) return true;
      const mm = safeText(c.matchmaking_id);
      const partij = c.partij_nr ?? null;
      const rowMm = safeText(row.matchmaking_id || getAuditValue(row, "matchmaking_id"));
      const rowPartij = toNullableNumber(row.partij_nr ?? getAuditValue(row, "partij_nr"));
      return !!mm && !!rowMm && mm === rowMm && partij !== null && rowPartij !== null && rowPartij === partij;
    };

    const weighRowMatcher = (row: AuditRow, w?: WeighInBoutRow | null) => {
      if (!w) return false;
      const id = safeText(w.id);
      if (id && getWeighInBoutId(row) === id) return true;
      const mm = safeText(w.matchmaking_id);
      const partij = w.partij_nr ?? w.original_partij_nr ?? null;
      const rowMm = safeText(row.matchmaking_id || getAuditValue(row, "matchmaking_id"));
      const rowPartij = toNullableNumber(row.partij_nr ?? getAuditValue(row, "partij_nr"));
      return !!mm && !!rowMm && mm === rowMm && partij !== null && rowPartij !== null && rowPartij === partij;
    };

    let controleRows: ControleResultaatRow[] = [];
    let weighRows: WeighInBoutRow[] = [];

    try {
      if (controleIds.length) {
        const res = await supabase
          .from("controle_resultaten")
          .select("id,matchmaking_id,controle_run_id,bout_id,partij_nr,toernooi_code,fighter_id,va_nummer,rule,rule_code,resultaat,original_resultaat,severity,boodschap,hoek,review_status,review_note,reviewed_by,reviewed_at,aantekeningen")
          .in("id", controleIds);

        if (res.error) console.warn("[audit] controle_resultaten by id error:", res.error);
        if (Array.isArray(res.data)) controleRows = res.data as ControleResultaatRow[];
      }
    } catch (err) {
      console.warn("[audit] controle_resultaten fetch failed:", err);
    }

    try {
      const directRows: ControleResultaatRow[] = rows
        .filter((row) => hasApprovalChange(row) || row.entity_type === "controle_resultaten")
        .map((row) => ({
          id: safeText(getControleResultaatId(row)) || null,
          matchmaking_id: safeText(row.matchmaking_id || getAuditValue(row, "matchmaking_id")) || null,
          controle_run_id: safeText(getAuditValue(row, "controle_run_id")) || null,
          bout_id: safeText(getAuditValue(row, "bout_id")) || null,
          partij_nr: toNullableNumber(row.partij_nr ?? getAuditValue(row, "partij_nr")),
          toernooi_code: safeText(getAuditValue(row, "toernooi_code")) || null,
          fighter_id: safeText(getAuditValue(row, "fighter_id")) || null,
          va_nummer: safeText(getAuditValue(row, "va_nummer")) || null,
          rule: safeText(getAuditValue(row, "rule")) || null,
          rule_code: safeText(getAuditValue(row, "rule_code")) || null,
          resultaat: safeText(getAuditValue(row, "resultaat")) || null,
          original_resultaat: safeText(getAuditValue(row, "original_resultaat")) || null,
          severity: safeText(getAuditValue(row, "severity")) || null,
          boodschap: safeText(getAuditValue(row, "boodschap")) || null,
          hoek: safeText(getAuditValue(row, "hoek")) || null,
          review_status: safeText(getAuditValue(row, "review_status")) || null,
          review_note: safeText(getAuditValue(row, "review_note")) || null,
          reviewed_by: safeText(getAuditValue(row, "reviewed_by")) || null,
          reviewed_at: safeText(getAuditValue(row, "reviewed_at")) || null,
          aantekeningen: safeText(getAuditValue(row, "aantekeningen")) || null,
        }))
        .filter((x) => x.matchmaking_id || x.id || x.bout_id);

      for (const direct of directRows) {
        const already = controleRows.some((x) => safeText(x.id) && safeText(x.id) === safeText(direct.id));
        if (!already) controleRows.push(direct);
      }
    } catch (err) {
      console.warn("[audit] controle_resultaten direct parse failed:", err);
    }

    const boutIds = Array.from(new Set(controleRows.map((x) => safeText(x.bout_id)).filter(Boolean)));
    const mmIds = Array.from(
      new Set(
        [
          ...controleRows.map((x) => safeText(x.matchmaking_id)),
          ...rows.map((row) => safeText(row.matchmaking_id || getAuditValue(row, "matchmaking_id"))),
        ].filter(Boolean)
      )
    );

    let boutRows: BoutContextRow[] = [];
    let toernooiRows: ToernooiContextRow[] = [];

    try {
      if (boutIds.length) {
        const res = await supabase
          .from("controle_bout_context")
          .select("matchmaking_id,bout_id,partij_nr,rood_naam_mm,blauw_naam_mm,rood_gym_mm,blauw_gym_mm,rood_va_mm,blauw_va_mm,klasse_mm,discipline,evenement_naam,evenement_datum")
          .in("bout_id", boutIds);

        if (res.error) console.warn("[audit] controle_bout_context by bout error:", res.error);
        if (Array.isArray(res.data)) boutRows = res.data as BoutContextRow[];
      }
    } catch (err) {
      console.warn("[audit] controle_bout_context by bout fetch failed:", err);
    }

    try {
      if (mmIds.length) {
        const res = await supabase
          .from("controle_bout_context")
          .select("matchmaking_id,bout_id,partij_nr,rood_naam_mm,blauw_naam_mm,rood_gym_mm,blauw_gym_mm,rood_va_mm,blauw_va_mm,klasse_mm,discipline,evenement_naam,evenement_datum")
          .in("matchmaking_id", mmIds);

        if (res.error) console.warn("[audit] controle_bout_context by mm error:", res.error);
        if (Array.isArray(res.data)) {
          for (const item of res.data as BoutContextRow[]) {
            const exists = boutRows.some(
              (x) => safeText(x.bout_id) && safeText(x.bout_id) === safeText(item.bout_id)
            );
            if (!exists) boutRows.push(item);
          }
        }
      }
    } catch (err) {
      console.warn("[audit] controle_bout_context by mm fetch failed:", err);
    }

    try {
      if (mmIds.length) {
        const res = await supabase
          .from("controle_toernooi_context")
          .select("matchmaking_id,toernooi_code,fighter_id,va_nummer,naam,naam_mm,naam_fp,sportschool,sportschool_mm,klasse,klasse_mm,discipline,evenement_naam,evenement_datum")
          .in("matchmaking_id", mmIds);

        if (res.error) console.warn("[audit] controle_toernooi_context error:", res.error);
        if (Array.isArray(res.data)) toernooiRows = res.data as ToernooiContextRow[];
      }
    } catch (err) {
      console.warn("[audit] controle_toernooi_context fetch failed:", err);
    }

    try {
      if (weighInIds.length) {
        const res = await supabase
          .from("weigh_in_bouts")
          .select("id,matchmaking_id,bout_context_id,controle_run_id,partij_nr,original_partij_nr,rood_naam,blauw_naam,rood_gym,blauw_gym,rood_va,blauw_va,rood_gewogen_gewicht,blauw_gewogen_gewicht,gewicht_strafpunt_rood,gewicht_strafpunt_blauw,klasse_mm,discipline,max_gewicht_notatie,reglement_status,praktijk_status,eindstatus,evenement_naam,evenement_datum")
          .in("id", weighInIds);

        if (res.error) console.warn("[audit] weigh_in_bouts by id error:", res.error);
        if (Array.isArray(res.data)) weighRows = res.data as WeighInBoutRow[];
      }
    } catch (err) {
      console.warn("[audit] weigh_in_bouts by id fetch failed:", err);
    }

    try {
      if (mmIds.length) {
        const res = await supabase
          .from("weigh_in_bouts")
          .select("id,matchmaking_id,bout_context_id,controle_run_id,partij_nr,original_partij_nr,rood_naam,blauw_naam,rood_gym,blauw_gym,rood_va,blauw_va,rood_gewogen_gewicht,blauw_gewogen_gewicht,gewicht_strafpunt_rood,gewicht_strafpunt_blauw,klasse_mm,discipline,max_gewicht_notatie,reglement_status,praktijk_status,eindstatus,evenement_naam,evenement_datum")
          .in("matchmaking_id", mmIds);

        if (res.error) console.warn("[audit] weigh_in_bouts by mm error:", res.error);
        if (Array.isArray(res.data)) {
          for (const item of res.data as WeighInBoutRow[]) {
            const exists = weighRows.some((x) => safeText(x.id) && safeText(x.id) === safeText(item.id));
            if (!exists) weighRows.push(item);
          }
        }
      }
    } catch (err) {
      console.warn("[audit] weigh_in_bouts by mm fetch failed:", err);
    }

    for (const row of rows) {
      const key = getApprovalKey(row);
      const controle = controleRows.find((c) => rowMatcher(row, c)) || null;
      const rowMm = safeText(row.matchmaking_id || getAuditValue(row, "matchmaking_id"));
      const rowPartij = toNullableNumber(row.partij_nr ?? getAuditValue(row, "partij_nr"));
      const bout =
        boutRows.find((b) => controle?.bout_id && safeText(b.bout_id) === safeText(controle.bout_id)) ||
        boutRows.find(
          (b) =>
            rowMm &&
            safeText(b.matchmaking_id) === rowMm &&
            b.partij_nr !== null &&
            b.partij_nr !== undefined &&
            rowPartij !== null && Number(b.partij_nr) === rowPartij
        ) ||
        null;

      const toernooi =
        toernooiRows.find(
          (t) =>
            rowMm &&
            safeText(t.matchmaking_id) === rowMm &&
            ((controle?.toernooi_code && safeText(t.toernooi_code) === safeText(controle.toernooi_code)) ||
              (controle?.fighter_id && safeText(t.fighter_id) === safeText(controle.fighter_id)) ||
              (controle?.va_nummer && safeText(t.va_nummer) === safeText(controle.va_nummer)))
        ) || null;

      const weighIn =
        weighRows.find((w) => weighRowMatcher(row, w)) ||
        weighRows.find(
          (w) =>
            rowMm &&
            safeText(w.matchmaking_id) === rowMm &&
            (rowPartij !== null && (Number(w.partij_nr) === rowPartij || Number(w.original_partij_nr) === rowPartij))
        ) ||
        null;

      if (controle || bout || toernooi || weighIn) {
        resultMap[key] = { controle, bout, toernooi, weighIn };
      }
    }

    setApprovalMap(resultMap);
  }

  async function loadUserNames(rows: AuditRow[]) {
    const ids = Array.from(new Set(rows.flatMap((row) => getPossibleActorIds(row))));
    const emails = Array.from(new Set(rows.flatMap((row) => getPossibleActorEmails(row))));

    if (!ids.length && !emails.length) {
      setNameMap({});
      return;
    }

    const resultMap: UserNameMap = {};
    const selectCols = "id,full_name,email";

    try {
      if (ids.length) {
        const byId = await supabase.from("user_profiles").select(selectCols).in("id", ids);
        if (byId.error) console.warn("[audit] user_profiles by id error:", byId.error);

        if (Array.isArray(byId.data)) {
          for (const row of byId.data as UserProfileRow[]) {
            const name = safeText(row.full_name);
            if (!name) continue;
            const idKey = normalizeKey(row.id);
            const emailKey = normalizeKey(row.email);
            if (idKey) resultMap[idKey] = name;
            if (emailKey) resultMap[emailKey] = name;
          }
        }
      }
    } catch (err) {
      console.warn("[audit] user_profiles by id fetch failed:", err);
    }

    try {
      const missingEmails = emails.filter((email) => !resultMap[email]);
      if (missingEmails.length) {
        const byEmail = await supabase
          .from("user_profiles")
          .select(selectCols)
          .in("email", missingEmails);

        if (byEmail.error) console.warn("[audit] user_profiles by email error:", byEmail.error);

        if (Array.isArray(byEmail.data)) {
          for (const row of byEmail.data as UserProfileRow[]) {
            const name = safeText(row.full_name);
            if (!name) continue;
            const idKey = normalizeKey(row.id);
            const emailKey = normalizeKey(row.email);
            if (idKey) resultMap[idKey] = name;
            if (emailKey) resultMap[emailKey] = name;
          }
        }
      }
    } catch (err) {
      console.warn("[audit] user_profiles by email fetch failed:", err);
    }

    setNameMap(resultMap);
  }

  async function loadEventNames(rows: AuditRow[]) {
    const ids = Array.from(
      new Set(rows.map((row) => safeText(row.matchmaking_id)).filter(Boolean))
    );

    if (!ids.length) {
      setEventMap({});
      return;
    }

    const resultMap: EventMap = {};

    try {
      const res = await supabase
        .from("matchmaking_uploads")
        .select("matchmaking_id, evenement_naam, evenement_datum")
        .in("matchmaking_id", ids);

      if (res.error) console.warn("[audit] matchmaking_uploads error:", res.error);

      if (Array.isArray(res.data)) {
        for (const row of res.data as MatchmakingMetaRow[]) {
          const id = safeText(row.matchmaking_id);
          if (!id) continue;

          resultMap[id] = {
            evenement_naam: safeText(row.evenement_naam) || "Onbekend event",
            evenement_datum: row.evenement_datum || null,
          };
        }
      }
    } catch (err) {
      console.warn("[audit] matchmaking_uploads fetch failed:", err);
    }

    setEventMap(resultMap);
  }

  useEffect(() => {
    loadBase();
  }, []);

  function getActorName(row: AuditRow) {
    const possibleIds = getPossibleActorIds(row);
    const possibleEmails = getPossibleActorEmails(row);

    for (const id of possibleIds) {
      if (nameMap[id]) return nameMap[id];
    }
    for (const email of possibleEmails) {
      if (nameMap[email]) return nameMap[email];
    }

    return emailFallback(row.actor_email);
  }

  function getActorEmail(row: AuditRow) {
    return (
      safeText(row.actor_email) ||
      safeText(row.meta?.reviewed_by_email) ||
      safeText(row.new_value?.reviewed_by_email) ||
      safeText(row.old_value?.reviewed_by_email) ||
      "—"
    );
  }

  function getActorRole(row: AuditRow) {
    return (
      safeText(row.actor_role) ||
      safeText(row.meta?.reviewed_role) ||
      safeText(row.new_value?.reviewed_role) ||
      safeText(row.old_value?.reviewed_role) ||
      "—"
    );
  }

  function getEventLabel(row: AuditRow) {
    const mmId = safeText(row.matchmaking_id);
    if (!mmId) return "Onbekend event";

    const meta = eventMap[mmId];
    if (!meta) return shortText(mmId, 24);

    const date = fmtEventDate(meta.evenement_datum);
    return date ? `${meta.evenement_naam} ${date}` : meta.evenement_naam;
  }

  const filteredItems = useMemo(() => {
    const q = normalizeKey(searchText);
    const actorQ = normalizeKey(actorFilter);

    return items.filter((row) => {
      const actorName = normalizeKey(getActorName(row));
      const actorEmail = normalizeKey(getActorEmail(row));
      const actorRole = normalizeKey(getActorRole(row));
      const eventLabel = normalizeKey(getEventLabel(row));
      const actionText = normalizeKey(row.action);
      const entityType = normalizeKey(row.entity_type);
      const entityId = normalizeKey(row.entity_id);
      const matchmakingId = normalizeKey(row.matchmaking_id);
      const partijNr = normalizeKey(row.partij_nr);
      const approvalText = getApprovalSearchText(approvalMap[getApprovalKey(row)]);

      const matchesAction = !actionFilter || actionText === normalizeKey(actionFilter);

      const matchesActor =
        !actorQ ||
        actorName.includes(actorQ) ||
        actorEmail.includes(actorQ) ||
        actorRole.includes(actorQ);

      const matchesSearch =
        !q ||
        actorName.includes(q) ||
        actorEmail.includes(q) ||
        actorRole.includes(q) ||
        eventLabel.includes(q) ||
        actionText.includes(q) ||
        entityType.includes(q) ||
        entityId.includes(q) ||
        matchmakingId.includes(q) ||
        partijNr.includes(q) ||
        approvalText.includes(q);

      return matchesAction && matchesActor && matchesSearch;
    });
  }, [items, searchText, actorFilter, actionFilter, eventMap, nameMap, approvalMap]);

  const visibleItems = useMemo(() => dedupeAuditRows(filteredItems), [filteredItems]);

  const stats = useMemo(() => {
    return {
      totaal: visibleItems.length,
      updates: visibleItems.filter((x) => x.action === "update").length,
      snapshots: visibleItems.filter((x) => x.action === "snapshot_created").length,
      types: new Set(visibleItems.map((x) => x.entity_type || "").filter(Boolean)).size,
    };
  }, [visibleItems]);

  function toggleChanges(id: string) {
    setOpenChanges((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleJson(id: string) {
    setOpenJson((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <main style={pageBackground}>
      <style jsx>{`
        .fs-metal-button {
          transition: transform 90ms ease, box-shadow 120ms ease, filter 120ms ease;
        }

        .fs-metal-button:hover {
          filter: brightness(1.02);
          box-shadow:
            inset 0 2px 1px rgba(255,255,255,1),
            inset 0 -3px 2px rgba(0,0,0,0.6),
            0 8px 18px rgba(0,0,0,0.46),
            0 0 10px rgba(255,77,0,0.08);
        }

        @media (max-width: 1220px) {
          .audit-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 980px) {
          .audit-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .compact-row {
            grid-template-columns: 1fr !important;
          }

          .compact-details-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          .audit-stats-grid,
          .audit-filter-grid,
          .compact-summary-grid,
          .compact-change-head,
          .compact-change-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <TopLogoBand />
      <TitleBand />

      <div style={{ maxWidth: 1380, margin: "0 auto", padding: "14px 16px 24px" }}>
        <div
          className="audit-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <SmallStatCard icon={<History size={16} strokeWidth={2.4} />} label="Totaal" value={String(stats.totaal)} />
          <SmallStatCard icon={<RefreshCcw size={16} strokeWidth={2.4} />} label="Updates" value={String(stats.updates)} />
          <SmallStatCard icon={<ShieldCheck size={16} strokeWidth={2.4} />} label="Snapshots" value={String(stats.snapshots)} />
          <SmallStatCard icon={<Database size={16} strokeWidth={2.4} />} label="Types" value={String(stats.types)} />
        </div>

        <SteelFrame>
          <div style={{ ...darkPlate, padding: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <IconPlate small>
                <Search size={17} strokeWidth={2.4} />
              </IconPlate>

              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    color: "#f1f1f1",
                    lineHeight: 1,
                    textShadow: "0 3px 8px rgba(0,0,0,0.75)",
                  }}
                >
                  Audit zoeken
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 9,
                    letterSpacing: 1.7,
                    textTransform: "uppercase",
                    color: ORANGE,
                  }}
                >
                  Alles filtert direct
                </div>
              </div>
            </div>

            <div
              className="audit-filter-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1.7fr 1fr 1fr",
                gap: 8,
              }}
            >
              <Field label="Zoeken">
                <FieldInput
                  icon={<Search size={14} strokeWidth={2.3} />}
                  value={searchText}
                  onChange={setSearchText}
                  placeholder="event, partij, entity, matchmaking id..."
                />
              </Field>

              <Field label="Actie">
                <SelectInput
                  value={actionFilter}
                  onChange={setActionFilter}
                  options={ACTION_OPTIONS}
                />
              </Field>

              <Field label="Gebruiker">
                <PlainInput
                  value={actorFilter}
                  onChange={setActorFilter}
                  placeholder="naam, e-mail of rol"
                />
              </Field>
            </div>

            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <SteelButton
                label="Opnieuw laden"
                icon={<RefreshCcw size={14} strokeWidth={2.4} />}
                onClick={loadBase}
                accent
              />
              <SteelButton
                label="Filters wissen"
                onClick={() => {
                  setSearchText("");
                  setActionFilter("");
                  setActorFilter("");
                }}
              />
            </div>
          </div>
        </SteelFrame>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {loading ? (
            <MessagePanel text="Laden..." />
          ) : error ? (
            <MessagePanel text={error} error />
          ) : visibleItems.length === 0 ? (
            <MessagePanel text="Geen audit records gevonden." />
          ) : (
            visibleItems.map((row) => {
              const actorName = getActorName(row);
              const changedFields = getDisplayChangedFields(row);
              const hasSnapshot = rowHasSnapshot(row);
              const snapshotData = getSnapshotData(row);
              const isChangesOpen = !!openChanges[row.id];
              const isJsonOpen = !!openJson[row.id];
              const approvalInfo = approvalMap[getApprovalKey(row)] || null;

              return (
                <SteelFrame key={row.id}>
                  <div style={{ ...darkPlate, padding: "8px 10px" }}>
                    <div
                      className="compact-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div
                        className="compact-summary-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto auto auto minmax(160px,1fr) auto auto",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <TagPill strong>{row.action || "actie"}</TagPill>
                        <TagPill>{row.entity_type || "entity"}</TagPill>
                        <TagPill>
                          {row.partij_nr === null || row.partij_nr === undefined
                            ? "Partij —"
                            : `Partij ${row.partij_nr}`}
                        </TagPill>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 900,
                              color: "#f1f1f1",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={getEventLabel(row)}
                          >
                            {getEventLabel(row)}
                          </div>
                          <div
                            style={{
                              marginTop: 1,
                              fontSize: 11,
                              color: "rgba(255,255,255,0.56)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={actorName}
                          >
                            {actorName}
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.66)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtDate(row.created_at)}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: changedFields.length ? "#fff" : "rgba(255,255,255,0.55)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {changedFields.length} wijziging{changedFields.length === 1 ? "" : "en"}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                        <MiniButton
                          label={isChangesOpen ? "Verberg wijzigingen" : "Wijzigingen"}
                          icon={isChangesOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          onClick={() => toggleChanges(row.id)}
                        />
                        <MiniButton
                          label={
                            hasSnapshot
                              ? isJsonOpen
                                ? "Verberg snapshot"
                                : "Snapshot"
                              : isJsonOpen
                                ? "Verberg JSON"
                                : "JSON"
                          }
                          icon={isJsonOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          onClick={() => toggleJson(row.id)}
                        />
                      </div>
                    </div>

                    {approvalInfo ? <ApprovalInfoPanel info={approvalInfo} actorName={actorName} auditRow={row} /> : null}

                    {(isChangesOpen || isJsonOpen) && (
                      <div
                        className="compact-details-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            isChangesOpen && isJsonOpen ? "1.15fr 0.85fr" : "1fr",
                          gap: 10,
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {isChangesOpen && (
                          <div
                            style={{
                              border: "1px solid rgba(255,255,255,0.10)",
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(0,0,0,0.18))",
                              padding: 10,
                            }}
                          >
                            <div
                              style={{
                                marginBottom: 8,
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: 1.2,
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.50)",
                              }}
                            >
                              Wat is gewijzigd
                            </div>

                            <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                              <CompactInfoLine label="Door" value={actorName} />
                              <CompactInfoLine label="E-mail" value={getActorEmail(row)} />
                              <CompactInfoLine label="Rol" value={getActorRole(row)} />
                              <CompactInfoLine label="Event" value={getEventLabel(row)} />
                              <CompactInfoLine label="MM id" value={shortText(row.matchmaking_id, 42)} />
                            </div>

                            {changedFields.length ? (
                              <>
                                <div
                                  className="compact-change-head"
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "180px minmax(0,1fr) minmax(0,1fr)",
                                    gap: 10,
                                    paddingBottom: 6,
                                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                                  }}
                                >
                                  <ChangeHead>Veld</ChangeHead>
                                  <ChangeHead>Oud</ChangeHead>
                                  <ChangeHead accent>Nieuw</ChangeHead>
                                </div>

                                <div style={{ display: "grid" }}>
                                  {changedFields.map((change) => (
                                    <div
                                      key={change.key}
                                      className="compact-change-row"
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                          "180px minmax(0,1fr) minmax(0,1fr)",
                                        gap: 10,
                                        padding: "8px 0",
                                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 800,
                                          color: "#f1f1f1",
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        {change.key}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 12,
                                          color: "rgba(255,255,255,0.76)",
                                          wordBreak: "break-word",
                                          lineHeight: 1.35,
                                        }}
                                      >
                                        {displayValue(change.oldValue)}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 800,
                                          color: "#fff",
                                          wordBreak: "break-word",
                                          lineHeight: 1.35,
                                        }}
                                      >
                                        {displayValue(change.newValue)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
                                Geen concrete veldwijzigingen gevonden.
                              </div>
                            )}
                          </div>
                        )}

                        {isJsonOpen && (
                          <div
                            style={{
                              border: "1px solid rgba(255,255,255,0.10)",
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(0,0,0,0.18))",
                              padding: 10,
                            }}
                          >
                            <div
                              style={{
                                marginBottom: 8,
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: 1.2,
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.50)",
                              }}
                            >
                              {hasSnapshot ? "Snapshot" : "JSON / debug"}
                            </div>

                            {hasSnapshot ? (
                              <JsonMiniBlock title="Snapshot data" data={snapshotData} />
                            ) : (
                              <div style={{ display: "grid", gap: 8 }}>
                                <JsonMiniBlock title="Oude waarde" data={row.old_value} />
                                <JsonMiniBlock title="Nieuwe waarde" data={row.new_value} />
                                {row.meta ? <JsonMiniBlock title="Meta" data={row.meta} /> : null}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </SteelFrame>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}

function TopLogoBand() {
  return null;
}


function TitleBand() {
  return (
    <header
      style={{
        maxWidth: 1380,
        margin: "0 auto",
        border: "1px solid #71717a",
        borderBottom: "1px solid #52525b",
        background: "linear-gradient(90deg,#1d1d1d,#303030,#151515)",
        padding: 20,
        boxShadow: "0 24px 60px rgba(0,0,0,.45)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              color: ORANGE,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            FightSupport Admin / Beheer
          </div>
          <h1 style={{ margin: "6px 0 2px", fontSize: 26, fontWeight: 1000, textTransform: "uppercase" }}>
            Audit / Logboek
          </h1>
          <p style={{ margin: 0, color: "#d4d4d8", fontSize: 14 }}>
            Compact overzicht van wijzigingen, snapshots en handelingen.
          </p>
        </div>
        <Link href="/dashboard/admin/beheer" style={{ textDecoration: "none" }}>
          <HeaderSilverButton
            label="Terug naar beheer"
            icon={<ArrowLeft size={14} strokeWidth={2.8} />}
          />
        </Link>
      </div>
    </header>
  );
}


function SteelFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #71717a",
        background: "#121212",
        boxShadow: "0 18px 42px rgba(0,0,0,.40)",
      }}
    >
      {children}
    </div>
  );
}


function SmallStatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <SteelFrame>
      <div style={{ ...darkPlate, minHeight: 58, padding: "7px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconPlate tiny>{icon}</IconPlate>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.56)",
              }}
            >
              {label}
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: 18,
                lineHeight: 1,
                fontWeight: 900,
                color: "#f5f5f5",
              }}
            >
              {value}
            </div>
          </div>
        </div>
      </div>
    </SteelFrame>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          marginBottom: 5,
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 1.3,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function FieldInput({
  icon,
  value,
  onChange,
  placeholder,
}: {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        minHeight: 36,
        padding: "0 11px",
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.22))",
        color: "#fff",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.50)" }}>{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "transparent",
          border: 0,
          outline: "none",
          color: "#fff",
          fontSize: 12,
        }}
      />
    </div>
  );
}

function PlainInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        minHeight: 36,
        padding: "0 11px",
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.22))",
        color: "#fff",
        fontSize: 12,
        outline: "none",
      }}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        minHeight: 36,
        padding: "0 11px",
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.22))",
        color: "#fff",
        fontSize: 12,
        outline: "none",
      }}
    >
      {options.map((option) => (
        <option key={option.value || "all"} value={option.value} style={{ color: "#111" }}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function MessagePanel({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <SteelFrame>
      <div
        style={{
          ...darkPlate,
          padding: "18px 14px",
          textAlign: "center",
          fontWeight: 800,
          color: error ? "#fca5a5" : "rgba(255,255,255,0.70)",
        }}
      >
        {text}
      </div>
    </SteelFrame>
  );
}

function IconPlate({
  children,
  small = false,
  tiny = false,
}: {
  children: ReactNode;
  small?: boolean;
  tiny?: boolean;
}) {
  const width = tiny ? 38 : small ? 52 : 86;
  const height = tiny ? 30 : small ? 42 : 68;

  return (
    <div
      style={{
        width,
        height,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        border: "1px solid #7b2500",
        background: "linear-gradient(180deg, #ff4d00 0%, #e04400 50%, #8a2600 100%)",
      }}
    >
      {children}
    </div>
  );
}

function SteelButton({
  label,
  onClick,
  icon,
  accent = false,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fs-metal-button"
      style={{
        minWidth: 112,
        height: 34,
        border: accent ? "1px solid #7b2500" : "1px solid rgba(185,185,185,0.95)",
        background: accent
          ? `
            linear-gradient(180deg,
              #ff7c3b 0%,
              #ff5d14 18%,
              #ff4d00 42%,
              #b33600 74%,
              #7d2300 100%)
          `
          : `
            linear-gradient(180deg,
              #ffffff 0%,
              #f3f3f3 10%,
              #d7d7d7 24%,
              #fcfcfc 42%,
              #bcbcbc 72%,
              #efefef 100%)
          `,
        color: accent ? "#fff" : "#121212",
        fontSize: 12,
        fontWeight: 900,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "0 14px",
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function MiniButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fs-metal-button"
      style={{
        height: 30,
        border: "1px solid rgba(185,185,185,0.32)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0.18) 100%)",
        color: "#f2f2f2",
        fontSize: 11,
        fontWeight: 900,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "0 10px",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function HeaderSilverButton({
  label,
  icon,
}: {
  label: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className="fs-metal-button"
      style={{
        minWidth: 132,
        height: 36,
        border: "1px solid rgba(185,185,185,0.95)",
        background: `
          linear-gradient(180deg,
            #ffffff 0%,
            #f3f3f3 10%,
            #d7d7d7 24%,
            #fcfcfc 42%,
            #bcbcbc 72%,
            #efefef 100%)
        `,
        color: "#121212",
        fontSize: 13,
        fontWeight: 900,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 18px",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function TagPill({
  children,
  strong = false,
}: {
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 9px",
        borderRadius: 999,
        border: strong ? "1px solid #7b2500" : "1px solid rgba(255,255,255,0.14)",
        background: strong
          ? "linear-gradient(180deg, #ff6720 0%, #ff4d00 40%, #ad3100 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.22))",
        color: "#fff",
        fontSize: 10,
        fontWeight: 900,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function CompactInfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "88px minmax(0,1fr)",
        gap: 8,
        alignItems: "start",
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.46)",
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#f1f1f1",
          wordBreak: "break-word",
          lineHeight: 1.35,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ChangeHead({
  children,
  accent = false,
}: {
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: accent ? ORANGE : "rgba(255,255,255,0.48)",
      }}
    >
      {children}
    </div>
  );
}

function formatWeight(v: unknown) {
  const s = safeText(v);
  if (!s) return "—";
  return `${s} kg`;
}

function formatPenalty(v: unknown) {
  const s = safeText(v);
  if (!s) return "0";
  return s;
}

function ApprovalInfoPanel({
  info,
  actorName,
  auditRow,
}: {
  info: ApprovalInfo;
  actorName: string;
  auditRow: AuditRow;
}) {
  const c = info.controle;
  const b = info.bout;
  const t = info.toernooi;
  const w = info.weighIn;

  const isToernooi = !!t || !!c?.toernooi_code || c?.partij_nr === 0;
  const partijLabel = isToernooi
    ? `Toernooi ${safeText(c?.toernooi_code || t?.toernooi_code) || "—"}`
    : `Partij ${c?.partij_nr ?? b?.partij_nr ?? w?.partij_nr ?? "—"}`;

  const roodNaam = safeText(b?.rood_naam_mm) || safeText(w?.rood_naam);
  const blauwNaam = safeText(b?.blauw_naam_mm) || safeText(w?.blauw_naam);
  const roodGym = safeText(b?.rood_gym_mm) || safeText(w?.rood_gym);
  const blauwGym = safeText(b?.blauw_gym_mm) || safeText(w?.blauw_gym);
  const roodVa = safeText(b?.rood_va_mm) || safeText(w?.rood_va);
  const blauwVa = safeText(b?.blauw_va_mm) || safeText(w?.blauw_va);

  const eventName =
    safeText(b?.evenement_naam) || safeText(w?.evenement_naam) || safeText(t?.evenement_naam);
  const eventDate = b?.evenement_datum || w?.evenement_datum || t?.evenement_datum || null;
  const klasse = safeText(b?.klasse_mm) || safeText(w?.klasse_mm) || safeText(t?.klasse_mm) || safeText(t?.klasse);
  const discipline = safeText(b?.discipline) || safeText(w?.discipline) || safeText(t?.discipline);

  const loggedRuleCode =
    safeText(c?.rule_code) ||
    safeText(getAuditValue(auditRow, "rule_code")) ||
    safeText(c?.rule) ||
    safeText(getAuditValue(auditRow, "rule")) ||
    "—";

  const loggedRule =
    safeText(c?.rule) ||
    safeText(getAuditValue(auditRow, "rule")) ||
    safeText(c?.rule_code) ||
    safeText(getAuditValue(auditRow, "rule_code")) ||
    "—";

  const loggedOriginal =
    safeText(c?.original_resultaat) ||
    safeText(getAuditValue(auditRow, "original_resultaat")) ||
    safeText(c?.resultaat) ||
    safeText(getAuditValue(auditRow, "resultaat")) ||
    "—";

  const loggedDecision =
    safeText(c?.review_status) ||
    safeText(getAuditValue(auditRow, "review_status")) ||
    safeText(getAuditValue(auditRow, "actie_status")) ||
    "goedgekeurd";

  const loggedMessage =
    safeText(c?.boodschap) ||
    safeText(getAuditValue(auditRow, "boodschap")) ||
    "—";

  const loggedNote =
    safeText(c?.review_note) ||
    safeText(getAuditValue(auditRow, "review_note")) ||
    safeText(c?.aantekeningen) ||
    safeText(getAuditValue(auditRow, "aantekeningen")) ||
    "—";

  const loggedAt =
    c?.reviewed_at ||
    safeText(getAuditValue(auditRow, "reviewed_at")) ||
    auditRow.created_at;

  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        border: "1px solid rgba(255,77,0,0.42)",
        background:
          "linear-gradient(180deg, rgba(255,77,0,0.13), rgba(0,0,0,0.18))",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 9,
        }}
      >
        <TagPill strong>{safeText(c?.review_status) || "goedgekeurd"}</TagPill>
        <TagPill>{partijLabel}</TagPill>
        {klasse ? <TagPill>{klasse}</TagPill> : null}
        {discipline ? <TagPill>{discipline}</TagPill> : null}
        {w ? <TagPill>Weegstation</TagPill> : null}
      </div>

      {eventName ? (
        <div
          style={{
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 900,
            color: "#f1f1f1",
          }}
        >
          {eventName} {fmtEventDate(eventDate)}
        </div>
      ) : null}

      {isToernooi ? (
        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          <FighterLine corner="TOERNOOI" name={safeText(t?.naam_mm) || safeText(t?.naam) || safeText(t?.naam_fp) || "Onbekende vechter"} gym={safeText(t?.sportschool_mm) || safeText(t?.sportschool)} va={safeText(t?.va_nummer)} />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <FighterLine corner="ROOD" name={roodNaam || "Rood onbekend"} gym={roodGym} va={roodVa} />
          <div style={{ fontSize: 10, fontWeight: 1000, color: ORANGE }}>VS</div>
          <FighterLine corner="BLAUW" name={blauwNaam || "Blauw onbekend"} gym={blauwGym} va={blauwVa} />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <ApprovalMini label="Regelcode" value={loggedRuleCode} />
        <ApprovalMini label="Regel" value={loggedRule} />
        <ApprovalMini label="Oorspronkelijk" value={loggedOriginal} />
        <ApprovalMini label="Beslissing" value={loggedDecision} />
        <ApprovalMini label="Door" value={actorName || "—"} />
        <ApprovalMini label="Goedgekeurd op" value={fmtDate(loggedAt)} />
        <ApprovalMini label="Audit actie" value={safeText(auditRow.action) || "—"} />
        <ApprovalMini label="Audit tabel" value={safeText(auditRow.entity_type) || "—"} />
      </div>

      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
        <ApprovalMini label="Melding / waarom regel afging" value={loggedMessage} wide />
        <ApprovalMini label="Review opmerking / reden goedkeuring" value={loggedNote} wide />
      </div>

      {w ? (
        <div
          style={{
            marginTop: 8,
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <ApprovalMini label="Rood gewicht" value={formatWeight(w.rood_gewogen_gewicht)} />
          <ApprovalMini label="Blauw gewicht" value={formatWeight(w.blauw_gewogen_gewicht)} />
          <ApprovalMini label="Minpunten rood" value={formatPenalty(w.gewicht_strafpunt_rood)} />
          <ApprovalMini label="Minpunten blauw" value={formatPenalty(w.gewicht_strafpunt_blauw)} />
          <ApprovalMini label="Max gewicht" value={safeText(w.max_gewicht_notatie) || "—"} />
          <ApprovalMini label="Reglement" value={safeText(w.reglement_status) || "—"} />
          <ApprovalMini label="Praktijk" value={safeText(w.praktijk_status) || "—"} />
          <ApprovalMini label="Eindstatus" value={safeText(w.eindstatus) || "—"} />
        </div>
      ) : null}
    </div>
  );
}

function FighterLine({
  corner,
  name,
  gym,
  va,
}: {
  corner: string;
  name: string;
  gym?: string;
  va?: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.18)",
        padding: 8,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 1000,
          letterSpacing: 1.2,
          color: ORANGE,
        }}
      >
        {corner}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 13,
          fontWeight: 1000,
          color: "#fff",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={name}
      >
        {name}
      </div>
      <div
        style={{
          marginTop: 2,
          fontSize: 11,
          color: "rgba(255,255,255,0.66)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={gym || ""}
      >
        {gym || "—"}{va ? ` · VA ${va}` : ""}
      </div>
    </div>
  );
}

function ApprovalMini({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        gridColumn: wide ? "1 / -1" : undefined,
        border: "1px solid rgba(255,255,255,0.09)",
        background: "rgba(0,0,0,0.16)",
        padding: 8,
      }}
    >
      <div
        style={{
          marginBottom: 4,
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.48)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1.35,
          color: "#f1f1f1",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function JsonMiniBlock({
  title,
  data,
}: {
  title: string;
  data: any;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.22))",
        padding: 8,
      }}
    >
      <div
        style={{
          marginBottom: 6,
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.48)",
        }}
      >
        {title}
      </div>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: 260,
          overflow: "auto",
          fontSize: 10,
          lineHeight: 1.4,
          color: "#e8e8e8",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}