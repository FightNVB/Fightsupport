"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  ClipboardList,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type AccountRequest = {
  id: string;
  name?: string | null;
  email?: string | null;
  requested_role?: string | null;
  team?: string | null;
  notes?: string | null;
  created_at?: string | null;
  auth_status?: "active" | "invited" | null;
  last_sign_in_at?: string | null;
  invited_at?: string | null;
  email_confirmed_at?: string | null;
};

type UserProfile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  roles?: string[] | null;
  active_role?: string | null;
  bondteam?: string | null;
  active_sportschool_id?: string | number | null;
  meekijk_sportschool_id?: string | number | null;
  auth_status?: "active" | "invited" | null;
  last_sign_in_at?: string | null;
  invited_at?: string | null;
  email_confirmed_at?: string | null;
  created_at?: string | null;
};

const ROLE_OPTIONS = [
  "Superadmin",
  "Admin",
  "Promotor",
  "Matchmaker",
  "Official",
  "Hoofdofficial",
  "Dispensatie admin",
  "Trainer",
  "Sportschool",
] as const;

const ORANGE = "#ff4d00";

function getRoleKey(value?: string | null) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");

  if (v === "dispensatieadmin") return "dispensatie_admin";
  return v;
}

function normalizeRole(value?: string | null) {
  const key = getRoleKey(value);
  switch (key) {
    case "superadmin":
      return "Superadmin";
    case "admin":
      return "Admin";
    case "promotor":
      return "Promotor";
    case "matchmaker":
      return "Matchmaker";
    case "official":
      return "Official";
    case "hoofdofficial":
      return "Hoofdofficial";
    case "dispensatie_admin":
      return "Dispensatie admin";
    case "trainer":
      return "Trainer";
    case "sportschool":
      return "Sportschool";
    default:
      return String(value ?? "").trim() || "Matchmaker";
  }
}

function apiRole(value?: string | null) {
  return getRoleKey(value);
}

function normalizeRoles(values: unknown, fallback?: string | null): string[] {
  const raw = Array.isArray(values) ? values : [];
  const normalized = raw
    .map((v) => normalizeRole(String(v ?? "")))
    .filter(Boolean);
  const withFallback =
    normalized.length > 0 ? normalized : [normalizeRole(fallback)];
  return Array.from(new Set(withFallback.filter(Boolean)));
}

function prettyDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function roleBadgeType(role: string) {
  const key = apiRole(role);
  if (key === "superadmin" || key === "admin") return "warn";
  if (key === "official" || key === "hoofdofficial") return "ok";
  if (key === "trainer" || key === "sportschool") return "trainer";
  return "default";
}

function Badge({
  children,
  type = "default",
}: {
  children: React.ReactNode;
  type?: string;
}) {
  const cls =
    type === "ok"
      ? "border-green-500/50 bg-green-500/10 text-green-300"
      : type === "bad"
        ? "border-red-500/50 bg-red-500/10 text-red-300"
        : type === "warn"
          ? "border-[#ff4d00]/70 bg-[#ff4d00]/10 text-[#ff7a33]"
          : type === "trainer"
            ? "border-blue-400/50 bg-blue-500/10 text-blue-200"
            : "border-zinc-600 bg-[#242424] text-zinc-200";

  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

function SilverButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function OrangeButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function DarkButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 border border-zinc-600 bg-[#242424] px-3 py-2 text-xs font-black uppercase text-zinc-100 transition hover:border-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-zinc-700 bg-[#171717] px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#ff4d00]"
    />
  );
}

function RoleCheckboxGroup({
  value,
  onChange,
  compact = false,
}: {
  value: string[];
  onChange: (roles: string[]) => void;
  compact?: boolean;
}) {
  const current = normalizeRoles(value);

  function toggle(role: string) {
    const exists = current.includes(role);
    const next = exists
      ? current.filter((r) => r !== role)
      : [...current, role];
    onChange(next.length > 0 ? next : [role]);
  }

  return (
    <div
      className={`grid gap-2 ${compact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}
    >
      {ROLE_OPTIONS.map((role) => {
        const checked = current.includes(role);
        return (
          <label
            key={role}
            className={`flex cursor-pointer select-none items-center gap-2 border px-2.5 py-2 text-xs font-black uppercase transition ${
              checked
                ? "border-[#ff4d00] bg-[#ff4d00]/15 text-orange-200"
                : "border-zinc-700 bg-[#181818] text-zinc-300 hover:border-zinc-500"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(role)}
              style={{ accentColor: ORANGE }}
            />
            {role}
          </label>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  const color =
    tone === "orange"
      ? "text-[#ff4d00]"
      : tone === "green"
        ? "text-green-300"
        : "text-zinc-100";
  return (
    <div className="border border-zinc-600 bg-[#1c1c1c] p-3 shadow-inner shadow-black/50">
      <b className={`text-2xl font-black ${color}`}>{value}</b>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
    </div>
  );
}

function UserEditPanel({
  user,
  busy,
  onClose,
  onChange,
  onSave,
  onDelete,
  onResend,
}: {
  user: UserProfile | null;
  busy: boolean;
  onClose: () => void;
  onChange: (next: UserProfile) => void;
  onSave: () => void;
  onDelete: () => void;
  onResend: () => void;
}) {
  if (!user) {
    return (
      <aside className="border border-zinc-700 bg-[#151515] p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff4d00]">
          Bewerken
        </p>
        <h2 className="mt-2 text-xl font-black uppercase">
          Kies een gebruiker
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Klik in de tabel op een gebruiker om naam, bondteam en rollen te
          wijzigen.
        </p>
      </aside>
    );
  }

  const roles = normalizeRoles(user.roles, user.role);

  return (
    <aside className="border border-zinc-600 bg-[#151515] shadow-2xl shadow-black/40">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-700 bg-[#202020] p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff4d00]">
            Gebruiker bewerken
          </p>
          <h2 className="mt-1 text-xl font-black uppercase leading-tight text-white">
            {user.full_name || user.email || "Gebruiker"}
          </h2>
          <p className="mt-1 break-all text-xs text-zinc-400">{user.email}</p>
        </div>
        <button
          onClick={onClose}
          className="border border-zinc-600 bg-zinc-900 p-2 text-zinc-200 hover:border-zinc-300"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid gap-4 p-4">
        <Field label="Naam">
          <Input
            value={user.full_name ?? ""}
            onChange={(v) => onChange({ ...user, full_name: v })}
            placeholder="Naam"
          />
        </Field>

        <Field label="Bond / team">
          <Input
            value={user.bondteam ?? ""}
            onChange={(v) => onChange({ ...user, bondteam: v })}
            placeholder="Bijv. NVB"
          />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
              Rollen
            </span>
            <span className="text-[11px] font-bold text-zinc-500">
              Hoofdrol: {roles[0] ?? "-"}
            </span>
          </div>
          <RoleCheckboxGroup
            value={roles}
            onChange={(nextRoles) =>
              onChange({ ...user, roles: nextRoles, role: nextRoles[0] })
            }
          />
        </div>

        <div className="grid gap-2 border border-zinc-700 bg-[#101010] p-3 text-xs text-zinc-400">
          <div className="flex justify-between gap-3">
            <span>Actieve rol</span>
            <b className="text-zinc-200">
              {normalizeRole(user.active_role || user.role)}
            </b>
          </div>
          <div className="flex justify-between gap-3">
            <span>Sportschool</span>
            <b className="text-zinc-200">
              {String(user.active_sportschool_id ?? "-")}
            </b>
          </div>
          <div className="flex justify-between gap-3">
            <span>Status</span>
            <b
              className={
                user.auth_status === "active"
                  ? "text-green-300"
                  : "text-orange-300"
              }
            >
              {user.auth_status === "active" ? "Actief" : "Uitgenodigd"}
            </b>
          </div>
          <div className="flex justify-between gap-3">
            <span>Laatste login</span>
            <b className="text-zinc-200">{prettyDate(user.last_sign_in_at)}</b>
          </div>
          <div className="flex justify-between gap-3">
            <span>Aangemaakt</span>
            <b className="text-zinc-200">{prettyDate(user.created_at)}</b>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <OrangeButton onClick={onSave} disabled={busy}>
            <Save size={16} /> Opslaan
          </OrangeButton>
          {user.auth_status !== "active" ? (
            <SilverButton onClick={onResend} disabled={busy}>
              <Mail size={16} /> Opnieuw sturen
            </SilverButton>
          ) : (
            <SilverButton onClick={onDelete} disabled={busy}>
              <Trash2 size={16} /> Verwijder
            </SilverButton>
          )}
        </div>
        {user.auth_status !== "active" && (
          <SilverButton onClick={onDelete} disabled={busy}>
            <Trash2 size={16} /> Gebruiker verwijderen
          </SilverButton>
        )}
      </div>
    </aside>
  );
}

export default function AccountsBeheerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"users" | "requests">("users");
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("alle");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRoles, setNewRoles] = useState<string[]>(["Matchmaker"]);
  const [newBondteam, setNewBondteam] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  async function authedFetch(url: string, init?: RequestInit) {
    const token = await getAccessToken();
    if (!token) throw new Error("Geen sessie token (niet ingelogd?)");

    return fetch(url, {
      ...(init ?? {}),
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  }

  async function loadAll() {
    setToast("");

    const [rReq, rUsers] = await Promise.all([
      authedFetch("/api/admin/account-requests", { method: "GET" }),
      authedFetch("/api/admin/users", { method: "GET" }),
    ]);

    const jReq = await rReq.json().catch(() => ({}));
    const jUsers = await rUsers.json().catch(() => ({}));

    if (!rReq.ok) throw new Error(jReq.error || "Fout bij laden requests");
    if (!rUsers.ok) throw new Error(jUsers.error || "Fout bij laden users");

    setRequests(jReq.rows || []);
    setUsers(
      (jUsers.users || []).map((u: UserProfile) => ({
        ...u,
        role: normalizeRole(u.role),
        roles: normalizeRoles((u as any).roles, u.role),
        active_role: normalizeRole(u.active_role || u.role),
      })),
    );
  }

  useEffect(() => {
    loadAll().catch((e) => setToast(String(e?.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rf = roleFilter.toLowerCase();

    return users.filter((u) => {
      const roles = normalizeRoles(u.roles, u.role);
      const haystack =
        `${u.full_name ?? ""} ${u.email ?? ""} ${roles.join(" ")} ${u.bondteam ?? ""} ${u.active_sportschool_id ?? ""}`.toLowerCase();
      const matchesText = !q || haystack.includes(q);
      const matchesRole = rf === "alle" || roles.some((r) => apiRole(r) === rf);
      return matchesText && matchesRole;
    });
  }, [users, filter, roleFilter]);

  const filteredRequests = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      `${r.name ?? ""} ${r.email ?? ""} ${r.requested_role ?? ""} ${r.team ?? ""} ${r.notes ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [requests, filter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      for (const r of normalizeRoles(u.roles, u.role))
        counts[apiRole(r)] = (counts[apiRole(r)] || 0) + 1;
    }
    return counts;
  }, [users]);

  function patchUserLocal(id: string, patch: Partial<UserProfile>) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function saveUser(u: UserProfile | null) {
    if (!u) return;
    setBusy(true);
    setToast("");
    try {
      const roles = normalizeRoles(u.roles, u.role);
      const res = await authedFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: u.id,
          full_name: u.full_name ?? null,
          role: roles[0] ?? null,
          roles,
          bondteam: u.bondteam ?? null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Opslaan mislukt");

      setToast("✔ Gebruiker bijgewerkt.");
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string) {
    const yes = window.confirm(
      "Gebruiker verwijderen? Dit verwijdert user_roles, user_profiles en de Supabase Auth user.",
    );
    if (!yes) return;

    setBusy(true);
    setToast("");
    try {
      const res = await authedFetch("/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Verwijderen mislukt");

      setToast("✔ Gebruiker verwijderd.");
      setSelectedUserId(null);
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function resendInvite(id: string) {
    setBusy(true);
    setToast("");
    try {
      const res = await authedFetch("/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({ id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Opnieuw verzenden mislukt");

      setToast(
        `✔ Nieuwe loginlink verzonden naar ${j.email || "de gebruiker"}.`,
      );
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function createUserInvite() {
    setBusy(true);
    setToast("");
    try {
      const email = newEmail.trim().toLowerCase();
      const full_name = newName.trim();
      const roles = normalizeRoles(newRoles);
      const role = roles[0] ?? "Matchmaker";
      const bondteam = newBondteam.trim();

      if (!email) throw new Error("Email is verplicht");
      if (!role) throw new Error("Rol is verplicht");

      const res = await authedFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          full_name,
          role,
          roles,
          bondteam: bondteam || null,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Uitnodigen mislukt");

      setToast("✔ Uitnodiging verzonden.");
      setNewEmail("");
      setNewName("");
      setNewRoles(["Matchmaker"]);
      setNewBondteam("");
      setInviteOpen(false);
      setTab("users");
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function actOnRequest(id: string, action: "approve" | "reject") {
    setBusy(true);
    setToast("");
    try {
      const res = await authedFetch(`/api/admin/account-requests/${id}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Actie mislukt");

      setToast(
        action === "approve"
          ? "✔ Request goedgekeurd en uitnodiging verzonden."
          : "✔ Request afgekeurd.",
      );
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin
              </p>
              <h1 className="text-2xl font-black uppercase">
                Gebruikersbeheer
              </h1>
              <p className="mt-1 text-sm text-zinc-300">
                Beheer accounts, meerdere rollen, bondteam en uitnodigingen
                overzichtelijk vanuit één scherm.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <OrangeButton onClick={() => setInviteOpen((v) => !v)}>
                <UserPlus size={16} /> Nieuwe gebruiker
              </OrangeButton>
              <SilverButton onClick={() => loadAll()} disabled={busy}>
                <RefreshCw size={16} /> Ververs
              </SilverButton>
              <SilverButton onClick={() => router.push("/dashboard/admin/")}>
                <ArrowLeft size={16} /> Admin
              </SilverButton>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-5">
          <StatCard label="Gebruikers" value={users.length} tone="orange" />
          <StatCard label="Open requests" value={requests.length} />
          <StatCard
            label="Admins"
            value={(roleCounts.superadmin || 0) + (roleCounts.admin || 0)}
          />
          <StatCard
            label="Officials"
            value={(roleCounts.official || 0) + (roleCounts.hoofdofficial || 0)}
            tone="green"
          />
          <StatCard
            label="Trainers / sportscholen"
            value={(roleCounts.trainer || 0) + (roleCounts.sportschool || 0)}
          />
        </div>

        {toast && (
          <div
            className={`m-4 border p-3 text-sm font-bold ${
              /mislukt|fout|error|verplicht/i.test(toast)
                ? "border-red-500 bg-red-950/60 text-red-200"
                : "border-[#ff4d00]/60 bg-[#ff4d00]/10 text-orange-200"
            }`}
          >
            {toast}
          </div>
        )}

        {inviteOpen && (
          <div className="border-b border-zinc-700 bg-[#181818] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff4d00]">
                  Uitnodigen
                </p>
                <h2 className="text-lg font-black uppercase">
                  Nieuwe gebruiker
                </h2>
              </div>
              <button
                onClick={() => setInviteOpen(false)}
                className="border border-zinc-600 bg-zinc-900 p-2 text-zinc-200 hover:border-zinc-300"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_2fr_auto] lg:items-end">
              <Field label="Naam">
                <Input
                  value={newName}
                  onChange={setNewName}
                  placeholder="Naam gebruiker"
                />
              </Field>
              <Field label="E-mail">
                <Input
                  value={newEmail}
                  onChange={setNewEmail}
                  placeholder="naam@voorbeeld.nl"
                  type="email"
                />
              </Field>
              <Field label="Bond/team">
                <Input
                  value={newBondteam}
                  onChange={setNewBondteam}
                  placeholder="Bijv. NVB"
                />
              </Field>
              <div>
                <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  Rollen
                </p>
                <RoleCheckboxGroup
                  value={newRoles}
                  onChange={setNewRoles}
                  compact
                />
              </div>
              <OrangeButton onClick={createUserInvite} disabled={busy}>
                <Mail size={16} /> Uitnodigen
              </OrangeButton>
            </div>
          </div>
        )}

        <div className="border-b border-zinc-700 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto] lg:items-end">
            <Field label="Zoeken">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={16}
                />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Naam, e-mail, rol, team of sportschool-id"
                  className="w-full border border-zinc-700 bg-[#171717] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#ff4d00]"
                />
              </div>
            </Field>

            <Field label="Rol filter">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full border border-zinc-700 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus:border-[#ff4d00]"
              >
                <option value="alle" className="bg-[#171717] text-white">
                  Alle rollen
                </option>
                {ROLE_OPTIONS.map((role) => (
                  <option
                    key={role}
                    value={apiRole(role)}
                    className="bg-[#171717] text-white"
                  >
                    {role}
                  </option>
                ))}
              </select>
            </Field>

            <OrangeButton
              onClick={() => setTab("users")}
              disabled={tab === "users"}
            >
              <Users size={16} /> Gebruikers
            </OrangeButton>
            <SilverButton
              onClick={() => setTab("requests")}
              disabled={tab === "requests"}
            >
              <ClipboardList size={16} /> Requests
            </SilverButton>
          </div>
        </div>

        {tab === "users" ? (
          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
                  <tr>
                    <th className="border border-zinc-700 p-2">Gebruiker</th>
                    <th className="border border-zinc-700 p-2">Rollen</th>
                    <th className="border border-zinc-700 p-2">Actieve rol</th>
                    <th className="border border-zinc-700 p-2">Status</th>
                    <th className="border border-zinc-700 p-2">Bond/team</th>
                    <th className="border border-zinc-700 p-2">Gym</th>
                    <th className="border border-zinc-700 p-2 text-right">
                      Actie
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr className="bg-[#171717]">
                      <td
                        colSpan={7}
                        className="border border-zinc-800 p-4 text-zinc-300"
                      >
                        Geen gebruikers gevonden.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, index) => {
                      const roles = normalizeRoles(u.roles, u.role);
                      const selected = selectedUserId === u.id;
                      const light = index % 2 === 0;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          style={{
                            backgroundColor: selected
                              ? "rgba(255,77,0,.18)"
                              : light
                                ? "#ffffff"
                                : "#171717",
                            color: selected
                              ? "#ffffff"
                              : light
                                ? "#000000"
                                : "#ffffff",
                            cursor: "pointer",
                          }}
                        >
                          <td className="border border-zinc-800 p-2 align-top">
                            <b style={{ color: ORANGE }}>
                              {u.full_name || "Naam ontbreekt"}
                            </b>
                            <div
                              className={`mt-1 break-all text-xs ${light && !selected ? "text-zinc-700" : "text-zinc-300"}`}
                            >
                              {u.email || "-"}
                            </div>
                            <div
                              className={`mt-1 text-[11px] ${light && !selected ? "text-zinc-600" : "text-zinc-500"}`}
                            >
                              Sinds {prettyDate(u.created_at)}
                            </div>
                          </td>
                          <td className="border border-zinc-800 p-2 align-top">
                            <div className="flex flex-wrap gap-1">
                              {roles.map((role) => (
                                <Badge key={role} type={roleBadgeType(role)}>
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="border border-zinc-800 p-2 align-top font-bold">
                            {normalizeRole(u.active_role || u.role)}
                          </td>
                          <td className="border border-zinc-800 p-2 align-top">
                            <Badge
                              type={u.auth_status === "active" ? "ok" : "warn"}
                            >
                              {u.auth_status === "active"
                                ? "Actief"
                                : "Uitgenodigd"}
                            </Badge>
                          </td>
                          <td className="border border-zinc-800 p-2 align-top">
                            {u.bondteam || "-"}
                          </td>
                          <td className="border border-zinc-800 p-2 align-top">
                            {String(u.active_sportschool_id ?? "-")}
                          </td>
                          <td className="border border-zinc-800 p-2 text-right align-top">
                            <DarkButton onClick={() => setSelectedUserId(u.id)}>
                              Bewerken
                            </DarkButton>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <UserEditPanel
              user={selectedUser}
              busy={busy}
              onClose={() => setSelectedUserId(null)}
              onChange={(next) => patchUserLocal(next.id, next)}
              onSave={() => saveUser(selectedUser)}
              onDelete={() => selectedUser && deleteUser(selectedUser.id)}
              onResend={() => selectedUser && resendInvite(selectedUser.id)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
                <tr>
                  <th className="border border-zinc-700 p-2">Naam</th>
                  <th className="border border-zinc-700 p-2">E-mail</th>
                  <th className="border border-zinc-700 p-2">
                    Aangevraagde rol
                  </th>
                  <th className="border border-zinc-700 p-2">Team</th>
                  <th className="border border-zinc-700 p-2">Notities</th>
                  <th className="border border-zinc-700 p-2">Datum</th>
                  <th className="border border-zinc-700 p-2 text-right">
                    Actie
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr className="bg-[#171717]">
                    <td
                      colSpan={7}
                      className="border border-zinc-800 p-4 text-zinc-300"
                    >
                      Geen account requests gevonden.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r, index) => {
                    const light = index % 2 === 0;
                    return (
                      <tr
                        key={r.id}
                        style={{
                          backgroundColor: light ? "#ffffff" : "#171717",
                          color: light ? "#000000" : "#ffffff",
                        }}
                      >
                        <td className="border border-zinc-800 p-2">
                          <b style={{ color: ORANGE }}>
                            {r.name || "Onbekend"}
                          </b>
                        </td>
                        <td className="border border-zinc-800 p-2">
                          {r.email || "-"}
                        </td>
                        <td className="border border-zinc-800 p-2">
                          <Badge type="warn">{r.requested_role || "-"}</Badge>
                        </td>
                        <td className="border border-zinc-800 p-2">
                          {r.team || "-"}
                        </td>
                        <td className="border border-zinc-800 p-2">
                          {r.notes || "-"}
                        </td>
                        <td className="border border-zinc-800 p-2">
                          {prettyDate(r.created_at)}
                        </td>
                        <td className="border border-zinc-800 p-2 text-right">
                          <div className="flex justify-end gap-2">
                            <OrangeButton
                              onClick={() => actOnRequest(r.id, "approve")}
                              disabled={busy}
                            >
                              <ShieldCheck size={16} /> Goedkeuren
                            </OrangeButton>
                            <SilverButton
                              onClick={() => actOnRequest(r.id, "reject")}
                              disabled={busy}
                            >
                              <Trash2 size={16} /> Afkeuren
                            </SilverButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
