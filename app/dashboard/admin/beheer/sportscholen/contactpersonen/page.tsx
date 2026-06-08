"use client";

import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  KeyRound,
  Link2,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

type School = {
  sportschool_id: string | number;
  naam?: string | null;
  plaats?: string | null;
  land?: string | null;
  keurmerk_start?: string | null;
  keurmerk_einde?: string | null;
  last_team_sync_at?: string | null;
  team_sync_status?: string | null;
  team_sync_error?: string | null;
  fighter_count?: number | null;
};

type Contact = {
  id: string;
  sportschool_id?: string | number | null;
  sportschool_key?: string | number | null;
  sportschoolId?: string | number | null;
  school_id?: string | number | null;
  user_id?: string | null;
  naam?: string | null;
  email?: string | null;
  rol?: string | null;
  actief?: boolean;
  login_verstuurd_at?: string | null;
  sportschool?: School | null;
};

type ExistingTrainerUser = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  roles?: string[] | null;
  bondteam?: string | null;
  active_sportschool_id?: string | number | null;
  meekijk_sportschool_id?: string | number | null;
};

function contactSchoolId(c: Contact): string {
  const direct =
    c.sportschool_id ??
    c.sportschool_key ??
    c.sportschoolId ??
    c.school_id;
  const nested = c.sportschool?.sportschool_id;
  return String(direct ?? nested ?? "").trim();
}

function schoolId(s?: School | null): string {
  return String(s?.sportschool_id ?? "").trim();
}

type Fighter = {
  id?: string | number;
  sportschool_id: string | number;
  va_nummer: string;
  naam?: string | null;
  geslacht?: string | null;
  vervaldatum?: string | null;
  scrape_status?: string | null;
  scraped_at?: string | null;
  licentie?: string | null;
  heeft_startverbod?: string | null;
  updated_at?: string | null;
};

const ORANGE = "#ff4d00";
const LOGO_SRC = "/branding/fightsupport/excel-logo.png";

function clean(v: unknown, fallback = "—") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function normalizeRoleValue(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function userHasTrainerOrSportschoolRole(u: ExistingTrainerUser) {
  const directRole = normalizeRoleValue(u.role);
  const roles = Array.isArray(u.roles) ? u.roles.map(normalizeRoleValue) : [];
  return (
    directRole === "trainer" ||
    directRole === "sportschool" ||
    roles.includes("trainer") ||
    roles.includes("sportschool")
  );
}

function userIsNotLinkedToSportschool(u: ExistingTrainerUser) {
  return !String(u.active_sportschool_id ?? "").trim();
}

function contactRoleForUser(u: ExistingTrainerUser) {
  const roles = Array.isArray(u.roles) ? u.roles.map(normalizeRoleValue) : [];
  const directRole = normalizeRoleValue(u.role);
  if (roles.includes("sportschool") || directRole === "sportschool") return "sportschool";
  return "trainer";
}

function trainerUserLabel(u: ExistingTrainerUser) {
  const name = String(u.full_name ?? "").trim();
  const email = String(u.email ?? "").trim();
  if (name && email) return `${name} • ${email}`;
  return name || email || u.id;
}

function fmtDateTime(v?: string | null) {
  if (!v) return "Nog niet";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function syncLabel(status?: string | null) {
  const s = String(status ?? "").toLowerCase();
  if (!s) return "Nog niet opgehaald";
  if (["bezig", "running", "syncing"].includes(s)) return "Fightcrew ophalen";
  if (["klaar", "ok", "done"].includes(s)) return "Fightcrew klaar";
  if (["mislukt", "error", "failed"].includes(s)) return "Mislukt";
  return status ?? "Onbekend";
}

function statusTone(status?: string | null) {
  const s = String(status ?? "").toLowerCase();
  if (["klaar", "ok", "done", "actief", "gescrapt", "verrijkt"].includes(s))
    return "good";
  if (["bezig", "running", "syncing", "nieuw"].includes(s)) return "busy";
  if (["mislukt", "error", "failed", "inactief"].includes(s)) return "bad";
  return "neutral";
}

const bg: CSSProperties = {
  minHeight: "100vh",
  color: "#fff",
  background:
    "radial-gradient(circle at 50% -4%, rgba(255,255,255,.22), transparent 18%), radial-gradient(circle at 8% 8%, rgba(255,77,0,.16), transparent 24%), radial-gradient(circle at 92% 10%, rgba(255,255,255,.10), transparent 20%), linear-gradient(180deg,#d7d9dc 0%,#777b80 2%,#111417 9%,#050607 42%,#000 100%)",
};

const wrap: CSSProperties = {
  maxWidth: 1680,
  margin: "0 auto",
  padding: "14px 16px 26px",
};

const metalCard: CSSProperties = {
  border: "1px solid rgba(255,255,255,.42)",
  borderRadius: 4,
  background:
    "linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.025) 12%,rgba(0,0,0,.30)), linear-gradient(180deg,#151719 0%,#080909 100%)",
  boxShadow:
    "0 18px 42px rgba(0,0,0,.68), inset 0 1px 0 rgba(255,255,255,.32), inset 0 -1px 0 rgba(0,0,0,.86)",
  overflow: "hidden",
};

const lightMetal: CSSProperties = {
  border: "1px solid rgba(255,255,255,.30)",
  borderRadius: 3,
  background:
    "linear-gradient(180deg,#2d3034 0%,#141618 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 10px 22px rgba(0,0,0,.42)",
};

const buttonBase: CSSProperties = {
  border: "1px solid rgba(255,255,255,.60)",
  borderRadius: 2,
  background:
    "linear-gradient(180deg,#ffffff 0%,#d5d7da 42%,#8a8e94 72%,#2c3036 100%)",
  color: "#050607",
  fontWeight: 1000,
  padding: "10px 14px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  textTransform: "uppercase",
  letterSpacing: .3,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.95), inset 0 -1px 0 rgba(0,0,0,.55), 0 8px 18px rgba(0,0,0,.44)",
};

const orangeButton: CSSProperties = {
  ...buttonBase,
  border: `1px solid ${ORANGE}`,
  background: `linear-gradient(180deg,#ff7a2b 0%,${ORANGE} 52%,#9e2600 100%)`,
  color: "#110400",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,.35), inset 0 -1px 0 rgba(0,0,0,.48), 0 10px 24px rgba(255,77,0,.24)",
};

const darkButton: CSSProperties = {
  ...buttonBase,
  color: "#f8fbff",
  border: "1px solid rgba(255,255,255,.38)",
  background: "linear-gradient(180deg,#34383d 0%,#16191d 48%,#090a0c 100%)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 2,
  border: "1px solid rgba(255,255,255,.32)",
  background: "linear-gradient(180deg,#111315,#050606)",
  color: "#fff",
  padding: "12px 14px",
  outline: "none",
  fontWeight: 800,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.10)",
};

const waitOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "grid",
  placeItems: "center",
  padding: 24,
  background:
    "radial-gradient(circle at 50% 18%, rgba(255,77,0,.22), transparent 30%), radial-gradient(circle at 50% 56%, rgba(255,255,255,.12), transparent 28%), rgba(1,3,6,.86)",
  backdropFilter: "blur(10px)",
};

const waitBox: CSSProperties = {
  width: "min(560px, 100%)",
  borderRadius: 30,
  border: "1px solid rgba(255,255,255,.28)",
  background:
    "linear-gradient(135deg,rgba(255,255,255,.20),rgba(255,255,255,.06) 36%,rgba(0,0,0,.38)), linear-gradient(180deg,#171d25 0%,#05070a 100%)",
  boxShadow:
    "0 34px 90px rgba(0,0,0,.72), inset 0 1px 0 rgba(255,255,255,.28), 0 0 42px rgba(255,77,0,.18)",
  padding: 28,
  textAlign: "center",
};

const spinKeyframes = `
@keyframes fsSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

const labelStyle: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.6,
  color: "rgba(255,255,255,.64)",
  fontWeight: 1000,
  marginBottom: 7,
};

const th: CSSProperties = {
  padding: "14px 16px",
  textAlign: "left",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: .8,
  color: "#ffffff",
  textShadow: "0 1px 0 rgba(0,0,0,.95)",
  whiteSpace: "nowrap",
  borderRight: "1px solid rgba(255,255,255,.24)",
};

const td: CSSProperties = {
  padding: "14px 16px",
  borderTop: "1px solid rgba(255,255,255,.16)",
  borderRight: "1px solid rgba(255,255,255,.13)",
  verticalAlign: "middle",
  color: "#ffffff",
  fontWeight: 900,
  textShadow: "0 1px 0 rgba(0,0,0,.85)",
};

const primaryTd: CSSProperties = {
  ...td,
  color: ORANGE,
  fontWeight: 1000,
  textTransform: "uppercase",
  letterSpacing: 0.25,
};

const tableHeadRow: CSSProperties = {
  background:
    "linear-gradient(180deg,#f7f7f7 0%,#c7c9cc 18%,#666a70 52%,#1b1d20 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.92), inset 0 -1px 0 rgba(0,0,0,.82)",
};

const tableRow: CSSProperties = {
  background: "linear-gradient(180deg,#141719 0%,#0b0d0e 100%)",
};

function Badge({ value }: { value?: string | null }) {
  const tone = statusTone(value);
  const color =
    tone === "good"
      ? "#86efac"
      : tone === "bad"
        ? "#fecaca"
        : tone === "busy"
          ? "#fed7aa"
          : "#dbeafe";
  const border =
    tone === "good"
      ? "rgba(34,197,94,.35)"
      : tone === "bad"
        ? "rgba(239,68,68,.42)"
        : tone === "busy"
          ? "rgba(255,77,0,.42)"
          : "rgba(255,255,255,.20)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: `1px solid ${border}`,
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 11,
        fontWeight: 1000,
        color,
        background:
          "linear-gradient(180deg,rgba(255,255,255,.09),rgba(0,0,0,.22))",
        textTransform: "uppercase",
        letterSpacing: 0.7,
        whiteSpace: "nowrap",
      }}
    >
      {tone === "good" ? (
        <CheckCircle2 size={13} />
      ) : tone === "bad" ? (
        <XCircle size={13} />
      ) : (
        <Clock3 size={13} />
      )}
      {clean(value, "nieuw")}
    </span>
  );
}

function StepCard({
  nr,
  title,
  text,
  active,
  done,
}: {
  nr: string;
  title: string;
  text: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div
      style={{
        ...lightMetal,
        padding: 14,
        minHeight: 108,
        opacity: active || done ? 1 : 0.68,
        outline: active ? `2px solid ${ORANGE}` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            fontWeight: 1000,
            color: done ? "#07120b" : "#180700",
            background: done
              ? "linear-gradient(180deg,#dcfce7,#22c55e)"
              : `linear-gradient(180deg,#fff4ef,${ORANGE})`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.7)",
          }}
        >
          {done ? <CheckCircle2 size={18} /> : nr}
        </div>
        <b style={{ fontSize: 15 }}>{title}</b>
      </div>
      <p
        style={{
          margin: "10px 0 0",
          color: "rgba(255,255,255,.68)",
          lineHeight: 1.45,
          fontSize: 13,
        }}
      >
        {text}
      </p>
    </div>
  );
}

export default function ContactpersonenFightcrewPage() {
  const router = useRouter();
  const { user, roles, loading } = useAuth();

  const [schools, setSchools] = useState<School[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [trainerUsers, setTrainerUsers] = useState<ExistingTrainerUser[]>([]);
  const [selectedTrainerUserId, setSelectedTrainerUserId] = useState("");
  const [schoolQ, setSchoolQ] = useState("");
  const [contactQ, setContactQ] = useState("");
  const [selected, setSelected] = useState<School | null>(null);
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("trainer");
  const [melding, setMelding] = useState("");
  const [busy, setBusy] = useState(false);
  const [waitMessage, setWaitMessage] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const [syncingKey, setSyncingKey] = useState<string | number | null>(null);
  const [enrichingKey, setEnrichingKey] = useState<string | number | null>(
    null,
  );
  const [loginKey, setLoginKey] = useState<string | number | null>(null);
  const [meekijkSportschoolId, setMeekijkSportschoolId] = useState<string | null>(null);
  const [meekijkBusyKey, setMeekijkBusyKey] = useState<string | number | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editNaam, setEditNaam] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRol, setEditRol] = useState("trainer");
  const [editActief, setEditActief] = useState(true);
  const [editBusy, setEditBusy] = useState(false);

  const canAdmin = useMemo(
    () => (roles ?? []).some((r) => r === "admin" || r === "superadmin"),
    [roles],
  );

  const selectedId = schoolId(selected);
  const hasSelectedSchool = Boolean(selected && selectedId);

  const selectedContacts = useMemo(() => {
    const id = selectedId;

    // Zonder gekozen sportschool tonen we NOOIT contactpersonen.
    // Ook als de API per ongeluk alle contactpersonen terugstuurt,
    // filteren we hier nogmaals hard op de geselecteerde sportschool-key.
    if (!hasSelectedSchool || !id) return [];

    return contacts.filter((c) => contactSchoolId(c) === id);
  }, [contacts, hasSelectedSchool, selectedId]);

  const selectedContact = useMemo(
    () => selectedContacts.find((c) => c.actief !== false),
    [selectedContacts],
  );
  const selectedContactHasExistingLogin = Boolean(selectedContact?.user_id);
  const selectedHasCrew =
    fighters.length > 0 || Number(selected?.fighter_count ?? 0) > 0;
  const selectedSynced = ["klaar", "ok", "done"].includes(
    String(selected?.team_sync_status ?? "").toLowerCase(),
  );
  const selectedReadyForLogin = Boolean(
    selectedContact &&
      !selectedContactHasExistingLogin &&
      (selectedHasCrew || selectedSynced),
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !canAdmin) router.replace("/dashboard");
  }, [loading, user, canAdmin, router]);

  async function tokenHeaders(): Promise<HeadersInit> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {};
  }

  async function loadMeekijkSportschool() {
    const res = await fetch(`/api/admin/sportscholen/meekijken`, {
      headers: await tokenHeaders(),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setMeekijkSportschoolId(json.sportschool_id ? String(json.sportschool_id) : null);
  }

  async function loadExistingTrainerUsers() {
    const res = await fetch(`/api/admin/users`, {
      headers: await tokenHeaders(),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setTrainerUsers([]);
      return;
    }

    const rows = Array.isArray(json.users) ? json.users : [];
    setTrainerUsers(
      rows
        .filter(userHasTrainerOrSportschoolRole)
        .filter(userIsNotLinkedToSportschool)
        .sort((a: ExistingTrainerUser, b: ExistingTrainerUser) =>
          trainerUserLabel(a).localeCompare(trainerUserLabel(b), "nl"),
        ),
    );
  }

  async function toggleMeekijkSportschool(sportschoolId: string | number) {
    const id = String(sportschoolId);
    setMelding("");
    setMeekijkBusyKey(sportschoolId);

    try {
      const nextId = meekijkSportschoolId === id ? null : id;
      const res = await fetch(`/api/admin/sportscholen/meekijken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await tokenHeaders()),
        },
        body: JSON.stringify({ sportschool_id: nextId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Meekijken instellen mislukt");

      setMeekijkSportschoolId(json.sportschool_id ? String(json.sportschool_id) : null);
      setMelding(
        json.sportschool_id
          ? `Meekijken staat nu actief voor ${clean(selected?.naam, `sportschool ${json.sportschool_id}`)}.`
          : "Meekijken is uitgezet.",
      );
    } catch (e: any) {
      setMelding(e?.message ?? "Meekijken instellen mislukt");
    } finally {
      setMeekijkBusyKey(null);
    }
  }

  async function searchSchools(nextQ = schoolQ) {
    setMelding("");
    const res = await fetch(
      `/api/admin/sportscholen?q=${encodeURIComponent(nextQ)}`,
      {
        headers: await tokenHeaders(),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMelding(json.error ?? "Sportscholen laden mislukt");
      return;
    }
    setSchools(json.rows ?? []);
  }

  async function loadContacts(
    sportschoolId: string | number | null = null,
    nextQ = contactQ,
  ) {
    const activeId = String(sportschoolId ?? selectedId ?? "").trim();

    // Geen geselecteerde sportschool = nooit contactpersonen tonen of ophalen.
    if (!activeId || (!sportschoolId && !hasSelectedSchool)) {
      setContacts([]);
      return [];
    }

    const params = new URLSearchParams();
    params.set("sportschool_id", activeId);
    if (nextQ.trim()) params.set("q", nextQ.trim());

    const res = await fetch(
      `/api/admin/sportscholen/contactpersonen?${params.toString()}`,
      {
        headers: await tokenHeaders(),
        cache: "no-store",
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setContacts([]);
      setMelding(json.error ?? "Contactpersonen laden mislukt");
      return [];
    }

    const rows = (json.rows ?? []).filter(
      (c: Contact) => contactSchoolId(c) === activeId,
    );

    // Deze state bevat altijd alleen contacten van de expliciet gekozen sportschool.
    // Zonder sportschool wordt bovenaan al direct geleegd.
    setContacts(rows);

    return rows;
  }

  async function loadFighters(sportschoolId: string | number) {
    const res = await fetch(
      `/api/admin/sportscholen/fightcrew?sportschool_id=${encodeURIComponent(String(sportschoolId))}`,
      {
        headers: await tokenHeaders(),
        cache: "no-store",
      },
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setFighters([]);
      setMelding(json.error ?? "Fightcrew laden mislukt");
      return [];
    }

    const nextRows = json.rows ?? json.fighters ?? [];
    setFighters(nextRows);

    // Houd de geselecteerde sportschool lokaal gelijk met de GET-response.
    // Daardoor blijft de pagina niet hangen op “vechters niet opgehaald”
    // als de start-route later “mislukt” zet door de VA-scrape.
    if (json.sportschool) {
      setSelected((prev) => {
        if (!prev || String(prev.sportschool_id) !== String(sportschoolId))
          return prev;
        return {
          ...prev,
          ...json.sportschool,
          fighter_count: json.fighter_count ?? nextRows.length,
          team_sync_status:
            nextRows.length > 0 ? "klaar" : json.sportschool.team_sync_status,
        };
      });

      setSchools((prev) =>
        prev.map((s) =>
          String(s.sportschool_id) === String(sportschoolId)
            ? {
                ...s,
                ...json.sportschool,
                fighter_count: json.fighter_count ?? nextRows.length,
                team_sync_status:
                  nextRows.length > 0
                    ? "klaar"
                    : json.sportschool.team_sync_status,
              }
            : s,
        ),
      );
    }

    return nextRows;
  }

  async function chooseSchool(school: School) {
    // Eerst oude context leegmaken, anders blijft er kort een contactpersoon
    // van de vorige sportschool zichtbaar.
    setContacts([]);
    setContactQ("");
    setSelected(school);
    setContacts([]);
    setContactQ("");
    setFighters([]);
    setMelding("");
    await Promise.all([
      loadFighters(school.sportschool_id),
      loadContacts(school.sportschool_id, ""),
    ]);
  }

  async function startFightcrewSync(sportschoolId: string | number) {
    setMelding("");
    setSyncingKey(sportschoolId);
    setWaitMessage({
      title: "Fightcrew ophalen",
      text: "De scraper opent FightPassport, haalt de Excel op en zet de vechters in de database. Dit scherm blijft staan tot de route klaar is.",
    });

    try {
      const res = await fetch(`/api/admin/sportscholen/fightcrew/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await tokenHeaders()),
        },
        body: JSON.stringify({ sportschool_id: sportschoolId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Fightcrew ophalen mislukt");

      setMelding(
        `Fightcrew is bijgewerkt voor ${clean(selected?.naam, String(sportschoolId))}.`,
      );
      await loadFighters(sportschoolId);
      await searchSchools();
      router.refresh();
      return json;
    } catch (e: any) {
      setMelding(e?.message ?? "Fightcrew ophalen mislukt");
      return null;
    } finally {
      setSyncingKey(null);
      setWaitMessage(null);
    }
  }

  async function enrichFightcrew(sportschoolId: string | number) {
    setMelding("");
    setEnrichingKey(sportschoolId);
    setWaitMessage({
      title: "Vechters beperkt scrapen",
      text: "De gevonden VA-nummers worden nu één voor één bijgewerkt. Zodra dit klaar is, verversen we de tabel automatisch.",
    });

    try {
      const res = await fetch(`/api/admin/sportscholen/fightcrew/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await tokenHeaders()),
        },
        body: JSON.stringify({ sportschool_id: sportschoolId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Team verrijken mislukt");

      setMelding("Team verrijken is klaar. De tabel is opnieuw geladen.");
      await loadFighters(sportschoolId);
      router.refresh();
      return json;
    } catch (e: any) {
      setMelding(e?.message ?? "Team verrijken mislukt");
      return null;
    } finally {
      setEnrichingKey(null);
      setWaitMessage(null);
    }
  }

  async function sendTrainerLogin(contact: Contact) {
    setLoginKey(contact.sportschool_id ?? null);
    try {
      const res = await fetch(
        `/api/admin/sportscholen/contactpersonen/login-versturen`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await tokenHeaders()),
          },
          body: JSON.stringify({
            contactpersoon_id: contact.id,
            sportschool_id: contact.sportschool_id,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json.error ?? "Trainer-login versturen mislukt");
      setMelding(`Trainer-login verstuurd naar ${clean(contact.email)}.`);
      await loadContacts(contact.sportschool_id);
    } finally {
      setLoginKey(null);
    }
  }

  async function saveContact() {
    setMelding("");
    if (!selected) return setMelding("Kies eerst een sportschool.");
    if (!email.trim())
      return setMelding(
        "Vul het e-mailadres van de trainer/contactpersoon in.",
      );

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sportscholen/contactpersonen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await tokenHeaders()),
        },
        body: JSON.stringify({
          sportschool_id: selected.sportschool_id,
          naam: naam.trim() || null,
          email: email.trim(),
          rol,
          actief: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json.error ?? "Contactpersoon koppelen mislukt");

      await loadContacts(selected.sportschool_id);
      setMelding(
        "Contactpersoon gekoppeld. Je kunt nu de Fightcrew ophalen of bijwerken.",
      );
      setNaam("");
      setEmail("");
      setRol("trainer");
    } catch (e: any) {
      setMelding(e?.message ?? "Contactpersoon koppelen mislukt");
    } finally {
      setBusy(false);
    }
  }


  async function saveExistingTrainerUserContact() {
    setMelding("");
    if (!selected) return setMelding("Kies eerst een sportschool.");
    if (!selectedTrainerUserId) return setMelding("Kies eerst een bestaande trainer-gebruiker.");

    const trainerUser = trainerUsers.find((u) => u.id === selectedTrainerUserId);
    if (!trainerUser) return setMelding("Trainer-gebruiker niet gevonden.");
    if (!trainerUser.email) return setMelding("Deze trainer-gebruiker heeft geen e-mailadres.");

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sportscholen/contactpersonen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await tokenHeaders()),
        },
        body: JSON.stringify({
          sportschool_id: selected.sportschool_id,
          user_id: trainerUser.id,
          naam: trainerUser.full_name?.trim() || trainerUser.email,
          email: trainerUser.email.trim(),
          rol: contactRoleForUser(trainerUser),
          actief: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json.error ?? "Bestaande gebruiker koppelen mislukt");

      const profileRes = await fetch(`/api/admin/users`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await tokenHeaders()),
        },
        body: JSON.stringify({
          id: trainerUser.id,
          active_sportschool_id: String(selected.sportschool_id),
        }),
      });
      const profileJson = await profileRes.json().catch(() => ({}));
      if (!profileRes.ok) {
        throw new Error(
          profileJson.error ??
            "Contactpersoon gekoppeld, maar user_profiles.active_sportschool_id bijwerken mislukt",
        );
      }

      await loadContacts(selected.sportschool_id);
      await loadExistingTrainerUsers();
      setSelectedTrainerUserId("");
      setMelding("Bestaande trainer/sportschool-gebruiker is gekoppeld. Er hoeft geen nieuwe login verstuurd te worden.");
    } catch (e: any) {
      setMelding(e?.message ?? "Bestaande gebruiker koppelen mislukt");
    } finally {
      setBusy(false);
    }
  }

  function openEditContact(contact: Contact) {
    setEditContact(contact);
    setEditNaam(String(contact.naam ?? ""));
    setEditEmail(String(contact.email ?? ""));
    setEditRol(String(contact.rol ?? "trainer"));
    setEditActief(contact.actief !== false);
    setMelding("");
  }

  async function saveContactEdit() {
    if (!editContact) return;
    if (!editEmail.trim()) {
      setMelding("E-mail is verplicht.");
      return;
    }

    setEditBusy(true);
    setMelding("");
    try {
      const res = await fetch(`/api/admin/sportscholen/contactpersonen/${editContact.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await tokenHeaders()),
        },
        body: JSON.stringify({
          naam: editNaam.trim() || null,
          email: editEmail.trim(),
          rol: editRol,
          actief: editActief,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Contactpersoon bewerken mislukt");

      if (selected) await loadContacts(selected.sportschool_id);
      setEditContact(null);
      setMelding("Contactpersoon is bijgewerkt.");
    } catch (e: any) {
      setMelding(e?.message ?? "Contactpersoon bewerken mislukt");
    } finally {
      setEditBusy(false);
    }
  }

  async function removeContact(id: string) {
    setMelding("");
    const res = await fetch(`/api/admin/sportscholen/contactpersonen/${id}`, {
      method: "DELETE",
      headers: await tokenHeaders(),
    });
    if (!res.ok) {
      setMelding("Contactpersoon verwijderen mislukt");
      return;
    }
    if (selected) await loadContacts(selected.sportschool_id);
  }

  useEffect(() => {
    if (user && canAdmin) {
      searchSchools();
      loadMeekijkSportschool();
      loadExistingTrainerUsers();
      setContacts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canAdmin]);

  const selectedBusy =
    selected && String(syncingKey ?? "") === String(selected.sportschool_id);
  const selectedEnriching =
    selected && String(enrichingKey ?? "") === String(selected.sportschool_id);
  const selectedLoginBusy =
    selected && String(loginKey ?? "") === String(selected.sportschool_id);

  return (
    <main style={bg}>
      <style>{`${spinKeyframes}
input[type="checkbox"]{accent-color:#ff4d00;} option{background:#fff;color:#111827;}`}</style>
      {waitMessage ? (
        <div style={waitOverlay}>
          <div style={waitBox}>
            <div
              style={{
                width: 92,
                height: 92,
                margin: "0 auto 18px",
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,.32)",
                background:
                  "linear-gradient(135deg,#ffffff 0%,#cfd5dc 32%,#636b74 62%,#151a21 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,.86), 0 0 34px rgba(255,77,0,.22)",
              }}
            >
              <RefreshCw
                size={42}
                color={ORANGE}
                style={{ animation: "fsSpin 1s linear infinite" }}
              />
            </div>
            <div
              style={{
                color: ORANGE,
                fontSize: 12,
                fontWeight: 1000,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              FightSupport controle
            </div>
            <h2 style={{ margin: "9px 0 9px", fontSize: 30 }}>
              {waitMessage.title}
            </h2>
            <p
              style={{
                margin: "0 auto",
                maxWidth: 440,
                color: "rgba(255,255,255,.72)",
                lineHeight: 1.55,
              }}
            >
              {waitMessage.text}
            </p>
            <div
              style={{
                marginTop: 18,
                color: "rgba(255,255,255,.54)",
                fontSize: 13,
              }}
            >
              Je hoeft niet opnieuw te klikken. De pagina ververst zodra de
              scraper klaar is.
            </div>
          </div>
        </div>
      ) : null}
      {editContact ? (
        <div style={waitOverlay}>
          <div style={{ ...waitBox, textAlign: "left", maxWidth: 560 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ color: ORANGE, fontSize: 12, fontWeight: 1000, letterSpacing: 2, textTransform: "uppercase" }}>
                  Contactpersoon bewerken
                </div>
                <h2 style={{ margin: "7px 0 0", fontSize: 26 }}>
                  {clean(editContact.naam || editContact.email)}
                </h2>
              </div>
              <button style={darkButton} onClick={() => setEditContact(null)} disabled={editBusy}>
                Sluiten
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <div>
                <div style={labelStyle}>Naam</div>
                <input style={inputStyle} value={editNaam} onChange={(e) => setEditNaam(e.target.value)} />
              </div>
              <div>
                <div style={labelStyle}>E-mail</div>
                <input style={inputStyle} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div>
                <div style={labelStyle}>Rol</div>
                <select style={inputStyle} value={editRol} onChange={(e) => setEditRol(e.target.value)}>
                  <option value="trainer">Trainer</option>
                  <option value="hoofdtrainer">Hoofdtrainer</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.82)", fontWeight: 900 }}>
                <input type="checkbox" checked={editActief} onChange={(e) => setEditActief(e.target.checked)} />
                Contactpersoon actief
              </label>
              <button style={orangeButton} onClick={saveContactEdit} disabled={editBusy}>
                <CheckCircle2 size={16} /> {editBusy ? "Opslaan…" : "Wijzigingen opslaan"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div style={wrap}>
        <section
          style={{
            ...metalCard,
            marginBottom: 14,
            padding: 10,
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 14,
            background:
              "linear-gradient(180deg,#dfe1e3 0%,#8d9298 8%,#24282d 28%,#08090a 100%)",
          }}
        >
          <button
            style={buttonBase}
            onClick={() => router.push("/dashboard/admin/beheer")}
          >
            <ArrowLeft size={17} /> Terug naar beheer
          </button>

          <img
            src={LOGO_SRC}
            alt="FightSupport"
            style={{
              width: 330,
              maxWidth: "42vw",
              height: "auto",
              justifySelf: "center",
              objectFit: "contain",
              filter: "drop-shadow(0 14px 18px rgba(0,0,0,.75))",
            }}
          />

          <button style={buttonBase} onClick={() => selected ? loadFighters(selected.sportschool_id) : searchSchools()}>
            <RefreshCw size={17} /> Ververs
          </button>
        </section>

        <section
          style={{
            ...metalCard,
            marginBottom: 14,
            padding: 16,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div>
            <div
              style={{
                color: ORANGE,
                fontSize: 12,
                fontWeight: 1000,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Admin • trainer toegang • Fightcrew
            </div>
            <h1
              style={{
                margin: "7px 0 4px",
                fontSize: 36,
                letterSpacing: -0.7,
                lineHeight: 1,
              }}
            >
              Sportschool contactpersonen
            </h1>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,.70)",
                maxWidth: 610,
                lineHeight: 1.45,
              }}
            >
              Koppel eerst een bestaande trainer-gebruiker of handmatige contactpersoon aan de echte FightPassport
              sportschool-key. Daarna haal je de Fightcrew op, verrijk je de
              gevonden VA-nummers beperkt en verstuur je pas de trainer-login.
            </p>
          </div>

          <div style={{ justifySelf: "end", textAlign: "right" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                ...lightMetal,
                padding: "10px 12px",
              }}
            >
              <Sparkles size={17} color={ORANGE} />
              <b>Beperkte trainerinformatie</b>
            </div>
            <div
              style={{
                marginTop: 10,
                color: "rgba(255,255,255,.62)",
                fontSize: 13,
              }}
            >
              Geen aliases op deze pagina. Alleen koppeling, team ophalen,
              verrijken en login.
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <StepCard
            nr="1"
            title="Contactpersoon koppelen"
            text="Trainer of hoofdtrainer wordt aan één echte sportschool-key gekoppeld."
            active={!selectedContact}
            done={!!selectedContact}
          />
          <StepCard
            nr="2"
            title="Fightcrew ophalen"
            text="De scraper opent organisation/key, klikt VECHTERS en haalt de Excel op."
            active={!!selectedContact && !selectedHasCrew}
            done={selectedHasCrew || selectedSynced}
          />
          <StepCard
            nr="3"
            title="Vechters verrijken"
            text="Alleen beperkte basisinformatie per VA, geen volledige match-control flow."
            active={selectedHasCrew && !fighters.some((f) => f.scraped_at)}
            done={fighters.some((f) => f.scraped_at)}
          />
          <StepCard
            nr="4"
            title="Login versturen"
            text="Pas versturen als de trainer aan de juiste sportschool en Fightcrew gekoppeld is."
            active={selectedReadyForLogin}
            done={selectedContactHasExistingLogin || !!selectedContact?.login_verstuurd_at}
          />
        </section>

        {melding ? (
          <div
            style={{
              ...metalCard,
              padding: 14,
              marginBottom: 18,
              color: /mislukt|kies|vul|fout/i.test(melding)
                ? "#fecaca"
                : "#bbf7d0",
              borderColor: /mislukt|kies|vul|fout/i.test(melding)
                ? "rgba(239,68,68,.36)"
                : "rgba(34,197,94,.28)",
            }}
          >
            {melding}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(390px,.95fr) minmax(0,1.35fr)",
            gap: 18,
          }}
        >
          <section style={metalCard}>
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid rgba(255,255,255,.10)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <b
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <ShieldCheck size={19} color={ORANGE} /> Sportschool zoeken
                </b>
                <Badge
                  value={
                    selected
                      ? `key ${selected.sportschool_id}`
                      : "geen selectie"
                  }
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  marginTop: 13,
                }}
              >
                <input
                  style={inputStyle}
                  value={schoolQ}
                  onChange={(e) => setSchoolQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchSchools();
                  }}
                  placeholder="Zoek sportschool, plaats of key"
                />
                <button style={buttonBase} onClick={() => searchSchools()}>
                  <Search size={16} /> Zoek
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 612, overflow: "auto" }}>
              {schools.map((s) => {
                const active =
                  String(selected?.sportschool_id ?? "") ===
                  String(s.sportschool_id);
                const isSyncing =
                  String(syncingKey ?? "") === String(s.sportschool_id);
                return (
                  <button
                    key={String(s.sportschool_id)}
                    onClick={() => chooseSchool(s)}
                    style={{
                      width: "100%",
                      border: 0,
                      color: "#fff",
                      textAlign: "left",
                      cursor: "pointer",
                      padding: 14,
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 10,
                      alignItems: "center",
                      borderTop: "1px solid rgba(255,255,255,.075)",
                      background: active
                        ? "linear-gradient(90deg,rgba(255,77,0,.24),rgba(255,255,255,.07))"
                        : "linear-gradient(90deg,rgba(255,255,255,.025),rgba(0,0,0,.10))",
                    }}
                  >
                    <span>
                      <b style={{ fontSize: 15 }}>{clean(s.naam)}</b>
                      <span
                        style={{
                          display: "block",
                          color: "rgba(255,255,255,.62)",
                          fontSize: 12,
                          marginTop: 3,
                        }}
                      >
                        {clean(s.plaats)} • {clean(s.land, "Nederland")} • key{" "}
                        {s.sportschool_id}
                      </span>
                      <span
                        style={{
                          display: "block",
                          color: "rgba(255,255,255,.48)",
                          fontSize: 11,
                          marginTop: 4,
                        }}
                      >
                        Laatste team-sync: {fmtDateTime(s.last_team_sync_at)}
                      </span>
                    </span>
                    <span
                      style={{ display: "grid", justifyItems: "end", gap: 7 }}
                    >
                      <Badge
                        value={
                          isSyncing ? "bezig" : syncLabel(s.team_sync_status)
                        }
                      />
                      {s.team_sync_error ? (
                        <span style={{ color: "#fecaca", fontSize: 11 }}>
                          sync fout
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ display: "grid", gap: 18 }}>
            <div style={{ ...metalCard, padding: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 14,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={labelStyle}>Gekozen sportschool</div>
                  <h2 style={{ margin: 0, fontSize: 27, lineHeight: 1.1 }}>
                    {selected
                      ? clean(selected.naam)
                      : "Nog geen sportschool gekozen"}
                  </h2>
                  <div style={{ color: "rgba(255,255,255,.62)", marginTop: 8 }}>
                    {selected
                      ? `${clean(selected.plaats)} • key ${selected.sportschool_id}`
                      : "Zoek links eerst de juiste sportschool."}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <Badge
                    value={
                      selectedContact ? "contact gekoppeld" : "geen contact"
                    }
                  />
                  <Badge value={syncLabel(selected?.team_sync_status)} />
                  {selected && meekijkSportschoolId === String(selected.sportschool_id) ? (
                    <Badge value="meekijken actief" />
                  ) : null}
                </div>
              </div>

              {selected?.team_sync_error ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(239,68,68,.35)",
                    color: "#fecaca",
                    background: "rgba(127,29,29,.18)",
                  }}
                >
                  {selected.team_sync_error}
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <div style={{ ...lightMetal, padding: 13 }}>
                  <div style={labelStyle}>Contactpersoon</div>
                  <b>
                    {selectedContact
                      ? clean(selectedContact.naam || selectedContact.email)
                      : "Nog niet gekoppeld"}
                  </b>
                  <div
                    style={{
                      color: "rgba(255,255,255,.58)",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {clean(selectedContact?.email, "—")}
                  </div>
                </div>
                <div style={{ ...lightMetal, padding: 13 }}>
                  <div style={labelStyle}>Fightcrew</div>
                  <b>
                    {fighters.length || selected?.fighter_count || 0} vechters
                  </b>
                  <div
                    style={{
                      color: "rgba(255,255,255,.58)",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    Laatst: {fmtDateTime(selected?.last_team_sync_at)}
                  </div>
                </div>
                <div style={{ ...lightMetal, padding: 13 }}>
                  <div style={labelStyle}>Trainer-login</div>
                  <b>
                    {selectedContactHasExistingLogin
                      ? "Bestaand account"
                      : selectedContact?.login_verstuurd_at
                        ? "Verstuurd"
                        : "Nog niet verstuurd"}
                  </b>
                  <div
                    style={{
                      color: "rgba(255,255,255,.58)",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {selectedContactHasExistingLogin
                      ? "Niet opnieuw nodig"
                      : fmtDateTime(selectedContact?.login_verstuurd_at)}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 18,
              }}
            >
              <section style={{ ...metalCard, padding: 16 }}>
                <b
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <UserPlus size={18} color={ORANGE} /> 1. Contactpersoon
                  koppelen
                </b>
                <div style={{ display: "grid", gap: 10, marginTop: 13 }}>
                  <div>
                    <div style={labelStyle}>Bestaande trainer/sportschool-gebruiker zonder gym</div>
                    <select
                      style={inputStyle}
                      value={selectedTrainerUserId}
                      onChange={(e) => setSelectedTrainerUserId(e.target.value)}
                      disabled={!selected || busy}
                    >
                      <option
                        value=""
                        style={{ background: "#ffffff", color: "#111827" }}
                      >
                        {trainerUsers.length
                          ? "Kies bestaande gebruiker met rol trainer/sportschool"
                          : "Geen vrije trainer/sportschool-gebruikers gevonden"}
                      </option>
                      {trainerUsers.map((u) => (
                        <option
                          key={u.id}
                          value={u.id}
                          style={{ background: "#ffffff", color: "#111827" }}
                        >
                          {trainerUserLabel(u)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    style={buttonBase}
                    onClick={saveExistingTrainerUserContact}
                    disabled={busy || !selected || !selectedTrainerUserId}
                  >
                    <Link2 size={16} /> Bestaande gebruiker koppelen
                  </button>
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,.10)",
                      margin: "4px 0",
                    }}
                  />
                  <div>
                    <div style={labelStyle}>Naam handmatig contact</div>
                    <input
                      style={inputStyle}
                      value={naam}
                      onChange={(e) => setNaam(e.target.value)}
                      placeholder="Naam trainer/contactpersoon"
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>E-mail</div>
                    <input
                      style={inputStyle}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trainer@sportschool.nl"
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>Rol</div>
                    <select
                      style={inputStyle}
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                    >
                      <option value="trainer">Trainer</option>
                      <option value="hoofdtrainer">Hoofdtrainer</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                  <button
                    style={orangeButton}
                    onClick={saveContact}
                    disabled={busy || !selected}
                  >
                    <Link2 size={16} />{" "}
                    {busy ? "Koppelen…" : "Contactpersoon koppelen"}
                  </button>
                </div>
              </section>

              <section style={{ ...metalCard, padding: 16 }}>
                <b
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Users size={18} color={ORANGE} /> 2 t/m 4. Team klaarzetten
                </b>
                <div style={{ display: "grid", gap: 10, marginTop: 13 }}>
                  <button
                    style={buttonBase}
                    onClick={() =>
                      selected && startFightcrewSync(selected.sportschool_id)
                    }
                    disabled={!selected || !selectedContact || !!selectedBusy}
                  >
                    <RefreshCw size={16} />{" "}
                    {selectedBusy ? "Fightcrew ophalen…" : "Fightcrew ophalen"}
                  </button>
                  <button
                    style={buttonBase}
                    onClick={() =>
                      selected && enrichFightcrew(selected.sportschool_id)
                    }
                    disabled={
                      !selected || !selectedHasCrew || !!selectedEnriching
                    }
                  >
                    <ShieldCheck size={16} />{" "}
                    {selectedEnriching
                      ? "Team verrijken…"
                      : "Vechters beperkt scrapen"}
                  </button>
                  <button
                    style={selectedContactHasExistingLogin ? darkButton : orangeButton}
                    onClick={() =>
                      selectedContact && sendTrainerLogin(selectedContact)
                    }
                    disabled={
                      selectedContactHasExistingLogin ||
                      !selectedReadyForLogin ||
                      !!selectedLoginBusy
                    }
                  >
                    <Mail size={16} />{" "}
                    {selectedContactHasExistingLogin
                      ? "Account bestaat al"
                      : selectedLoginBusy
                        ? "Login versturen…"
                        : "Trainer-login versturen"}
                  </button>
                  <button
                    style={
                      selected && meekijkSportschoolId === String(selected.sportschool_id)
                        ? orangeButton
                        : darkButton
                    }
                    onClick={() => selected && toggleMeekijkSportschool(selected.sportschool_id)}
                    disabled={!selected || !!meekijkBusyKey}
                  >
                    <CheckCircle2 size={16} />{" "}
                    {selected && meekijkSportschoolId === String(selected.sportschool_id)
                      ? "Meekijken uitzetten"
                      : "Meekijken als deze sportschool"}
                  </button>
                  <div
                    style={{
                      color: "rgba(255,255,255,.60)",
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    De login-knop blijft bewust later in de flow. Kies je een
                    bestaande trainer/sportschool-gebruiker, dan heeft die al
                    toegang en sturen we geen nieuwe login.
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>

        {hasSelectedSchool ? (
        <section style={{ ...metalCard, marginTop: 18 }}>
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid rgba(255,255,255,.10)",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div>
              <b
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <KeyRound size={18} color={ORANGE} /> Gekoppelde contactpersonen
                van geselecteerde sportschool
              </b>
              <div
                style={{
                  color: "rgba(255,255,255,.55)",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {selected
                  ? `${clean(selected.naam)} • key ${selected.sportschool_id}`
                  : "Kies eerst links een sportschool. Tot die tijd blijft dit overzicht leeg."}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(250px,1fr) auto",
                gap: 10,
              }}
            >
              <input
                style={inputStyle}
                value={contactQ}
                onChange={(e) => setContactQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadContacts();
                }}
                placeholder={
                  selected
                    ? "Zoek contactpersoon binnen deze sportschool"
                    : "Kies eerst een sportschool"
                }
                disabled={!hasSelectedSchool}
              />
              <button
                style={buttonBase}
                onClick={() => loadContacts()}
                disabled={!hasSelectedSchool}
              >
                <Search size={16} /> Zoek
              </button>
            </div>
          </div>
          {!hasSelectedSchool ? null : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 980,
                }}
              >
                <thead>
                  <tr style={tableHeadRow}>
                    <th style={th}>Sportschool</th>
                    <th style={th}>Contact</th>
                    <th style={th}>Email</th>
                    <th style={th}>Rol</th>
                    <th style={th}>Login</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: "right" }}>Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedContacts.length ? (
                    selectedContacts.map((c, i) => (
                      <tr
                        key={c.id}
                        style={tableRow}
                      >
                        <td style={primaryTd}>
                          {clean(
                            c.sportschool?.naam,
                            selected?.naam || String(c.sportschool_id ?? ""),
                          )}
                        </td>
                        <td style={td}>{clean(c.naam)}</td>
                        <td style={td}>{clean(c.email)}</td>
                        <td style={td}>{clean(c.rol, "trainer")}</td>
                        <td style={td}>{c.user_id ? "Bestaand account" : fmtDateTime(c.login_verstuurd_at)}</td>
                        <td style={td}>
                          <Badge
                            value={c.actief === false ? "inactief" : "actief"}
                          />
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button style={darkButton} onClick={() => openEditContact(c)}>
                              <Pencil size={16} /> Bewerk
                            </button>
                            <button style={darkButton} onClick={() => removeContact(c.id)}>
                              <Trash2 size={16} /> Verwijder
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        style={{
                          ...td,
                          color: "rgba(255,255,255,.58)",
                          textAlign: "center",
                          padding: 28,
                        }}
                        colSpan={7}
                      >
                        Nog geen contactpersoon gekoppeld aan deze sportschool.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        ) : null}

        <section style={{ ...metalCard, marginTop: 18 }}>
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid rgba(255,255,255,.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <b
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Users size={18} color={ORANGE} /> Fightcrew van geselecteerde
                sportschool
              </b>
              <div
                style={{
                  color: "rgba(255,255,255,.55)",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {selected
                  ? `${clean(selected.naam)} • key ${selected.sportschool_id}`
                  : "Kies eerst een sportschool."}
              </div>
            </div>
            {selected ? (
              <button
                style={darkButton}
                onClick={() => loadFighters(selected.sportschool_id)}
              >
                <RefreshCw size={16} /> Ververs tabel
              </button>
            ) : null}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 980,
              }}
            >
              <thead>
                <tr style={tableHeadRow}>
                  <th style={th}>Naam</th>
                  <th style={th}>VA</th>
                  <th style={th}>Geslacht</th>
                  <th style={th}>Licentie/vervaldatum</th>
                  <th style={th}>Startverbod</th>
                  <th style={th}>Status</th>
                  <th style={th}>Bijgewerkt</th>
                </tr>
              </thead>
              <tbody>
                {!selectedId ? (
                  <tr>
                    <td
                      style={{
                        ...td,
                        color: "rgba(255,255,255,.58)",
                        textAlign: "center",
                        padding: 28,
                      }}
                      colSpan={7}
                    >
                      Kies eerst een sportschool. Dan tonen we hier pas de
                      Fightcrew.
                    </td>
                  </tr>
                ) : fighters.length ? (
                  fighters.map((f, i) => (
                    <tr
                      key={`${f.va_nummer}-${i}`}
                      style={tableRow}
                    >
                      <td style={primaryTd}>
                        {clean(f.naam)}
                      </td>
                      <td style={td}>{clean(f.va_nummer)}</td>
                      <td style={td}>{clean(f.geslacht)}</td>
                      <td style={td}>{clean(f.licentie || f.vervaldatum)}</td>
                      <td style={td}>{clean(f.heeft_startverbod)}</td>
                      <td style={td}>
                        <Badge
                          value={
                            f.scrape_status ||
                            (f.scraped_at ? "verrijkt" : "nieuw")
                          }
                        />
                      </td>
                      <td style={td}>
                        {fmtDateTime(f.scraped_at || f.updated_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      style={{
                        ...td,
                        color: "rgba(255,255,255,.58)",
                        textAlign: "center",
                        padding: 28,
                      }}
                      colSpan={7}
                    >
                      Nog geen Fightcrew geladen voor deze sportschool.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
