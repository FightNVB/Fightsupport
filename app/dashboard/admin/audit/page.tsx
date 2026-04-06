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

const pageBackground: CSSProperties = {
  minHeight: "100vh",
  color: "#fff",
  background: `
    radial-gradient(circle at 50% 0%, rgba(255,104,20,0.10) 0%, rgba(255,104,20,0.03) 10%, rgba(0,0,0,0) 22%),
    radial-gradient(circle at 50% 100%, rgba(255,104,20,0.08) 0%, rgba(255,104,20,0.02) 12%, rgba(0,0,0,0) 24%),
    radial-gradient(circle at 16% 20%, rgba(255,120,20,0.05) 0%, rgba(255,120,20,0) 16%),
    radial-gradient(circle at 84% 22%, rgba(255,120,20,0.05) 0%, rgba(255,120,20,0) 16%),
    linear-gradient(180deg, #010203 0%, #020406 16%, #000000 100%)
  `,
};

const sectionRule = (top = false): CSSProperties => ({
  position: "relative",
  borderTop: top ? "1px solid rgba(255,255,255,0.05)" : undefined,
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.04),
    inset 0 -1px 0 rgba(0,0,0,0.82)
  `,
});

const steelFrameOuter: CSSProperties = {
  position: "relative",
  padding: 6,
  background: `
    linear-gradient(145deg,
      #ffffff 0%,
      #d3d3d3 6%,
      #727272 12%,
      #fcfcfc 19%,
      #999999 27%,
      #424242 36%,
      #f0f0f0 47%,
      #a7a7a7 58%,
      #4a4a4a 69%,
      #ffffff 80%,
      #bfbfbf 90%,
      #f9f9f9 100%)
  `,
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: `
    0 8px 18px rgba(0,0,0,0.54),
    inset 0 2px 1px rgba(255,255,255,0.98),
    inset 0 -2px 2px rgba(0,0,0,0.86),
    inset 2px 0 2px rgba(255,255,255,0.48),
    inset -2px 0 2px rgba(0,0,0,0.58)
  `,
};

const steelFrameMid: CSSProperties = {
  position: "relative",
  padding: 3,
  background: `
    linear-gradient(135deg,
      rgba(255,255,255,0.98) 0%,
      rgba(218,218,218,0.96) 14%,
      rgba(70,70,70,0.98) 28%,
      rgba(248,248,248,0.95) 48%,
      rgba(100,100,100,0.98) 68%,
      rgba(238,238,238,0.97) 100%)
  `,
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.82),
    inset 0 -1px 0 rgba(0,0,0,0.62)
  `,
};

const steelFrameChannel: CSSProperties = {
  position: "relative",
  padding: 4,
  background: `
    linear-gradient(180deg,
      #2c2c2c 0%,
      #090909 18%,
      #525252 34%,
      #0d0d0d 52%,
      #474747 72%,
      #090909 100%)
  `,
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.18),
    inset 0 -1px 0 rgba(0,0,0,0.88)
  `,
};

const steelFrameInner: CSSProperties = {
  position: "relative",
  padding: 2,
  background: `
    linear-gradient(135deg,
      #fbfbfb 0%,
      #d8d8d8 10%,
      #6f6f6f 22%,
      #f5f5f5 34%,
      #b7b7b7 46%,
      #555555 60%,
      #fdfdfd 78%,
      #b7b7b7 100%)
  `,
  border: "1px solid rgba(255,255,255,0.20)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.70),
    inset 0 -1px 0 rgba(0,0,0,0.55)
  `,
};

const darkPlate: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  border: "1px solid #060606",
  background: `
    radial-gradient(circle at 14% 84%, rgba(255,110,0,0.08), transparent 14%),
    radial-gradient(circle at 86% 14%, rgba(255,255,255,0.04), transparent 12%),
    linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 15%, rgba(0,0,0,0.14) 100%),
    linear-gradient(135deg, #171b21 0%, #06090e 46%, #141920 100%)
  `,
  boxShadow: `
    inset 0 2px 4px rgba(0,0,0,0.94),
    inset 0 -2px 6px rgba(255,255,255,0.04),
    inset 0 0 20px rgba(255,120,0,0.03)
  `,
};

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [nameMap, setNameMap] = useState<UserNameMap>({});
  const [eventMap, setEventMap] = useState<EventMap>({});

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

      await Promise.all([loadUserNames(nextItems), loadEventNames(nextItems)]);
    } catch (err: any) {
      setError(err?.message || "Onbekende fout.");
      setItems([]);
      setNameMap({});
      setEventMap({});
    } finally {
      setLoading(false);
    }
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
        partijNr.includes(q);

      return matchesAction && matchesActor && matchesSearch;
    });
  }, [items, searchText, actorFilter, actionFilter, eventMap, nameMap]);

  const stats = useMemo(() => {
    return {
      totaal: filteredItems.length,
      updates: filteredItems.filter((x) => x.action === "update").length,
      snapshots: filteredItems.filter((x) => x.action === "snapshot_created").length,
      types: new Set(filteredItems.map((x) => x.entity_type || "").filter(Boolean)).size,
    };
  }, [filteredItems]);

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

      <div style={{ maxWidth: 1380, margin: "0 auto", padding: "12px 16px 16px" }}>
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
          ) : filteredItems.length === 0 ? (
            <MessagePanel text="Geen audit records gevonden." />
          ) : (
            filteredItems.map((row) => {
              const actorName = getActorName(row);
              const changedFields = getChangedFields(row);
              const hasSnapshot = rowHasSnapshot(row);
              const snapshotData = getSnapshotData(row);
              const isChangesOpen = !!openChanges[row.id];
              const isJsonOpen = !!openJson[row.id];

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
  return (
    <div
      style={{
        ...sectionRule(true),
        position: "relative",
        display: "flex",
        justifyContent: "center",
        paddingTop: 0,
        paddingBottom: 0,
        background: `
          radial-gradient(circle at 50% 50%, rgba(255,115,20,0.10) 0%, rgba(255,115,20,0.03) 16%, rgba(0,0,0,0) 34%),
          linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)
        `,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 1120,
          height: 86,
          maxWidth: "96vw",
          filter:
            "drop-shadow(0 10px 18px rgba(0,0,0,0.72)) drop-shadow(0 0 14px rgba(255,95,0,0.12))",
        }}
      >
        <Image
          src={logoSrc}
          alt="FightSupport"
          fill
          priority
          className="object-contain"
          style={{
            objectFit: "contain",
            transform: "scaleX(1.34)",
          }}
        />
      </div>
    </div>
  );
}

function TitleBand() {
  return (
    <div
      style={{
        ...sectionRule(),
        position: "relative",
        background: `
          linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 10%, rgba(0,0,0,0.04) 100%),
          linear-gradient(180deg, #171b21 0%, #0a0d12 50%, #161a20 100%)
        `,
      }}
    >
      <div
        className="title-row"
        style={{
          position: "relative",
          maxWidth: 1480,
          margin: "0 auto",
          padding: "8px 18px",
          minHeight: 72,
        }}
      >
        <div
          className="title-actions-wrap"
          style={{
            position: "absolute",
            right: 18,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <Link href="/dashboard/admin/beheer" style={{ textDecoration: "none" }}>
            <HeaderSilverButton
              label="Beheer"
              icon={<ArrowLeft size={14} strokeWidth={2.8} />}
            />
          </Link>
        </div>

        <div className="title-center" style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 1,
              lineHeight: 1,
              color: "#ececec",
              textTransform: "uppercase",
            }}
          >
            Audit / Logboek
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 9,
              letterSpacing: 2.2,
              color: ORANGE,
              textTransform: "uppercase",
            }}
          >
            Filters werken direct
          </div>
        </div>
      </div>
    </div>
  );
}

function SteelFrame({ children }: { children: ReactNode }) {
  return (
    <div>
      <div style={steelFrameOuter}>
        <div style={steelFrameMid}>
          <div style={steelFrameChannel}>
            <div style={steelFrameInner}>{children}</div>
          </div>
        </div>
      </div>
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