"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AccountRequest = {
  id: string;
  name?: string | null;
  email?: string | null;
  requested_role?: string | null;
  team?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type UserProfile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  bondteam?: string | null;
  created_at?: string | null;
};

const ORANGE = "#ff4d00";
const BORDER = "#2b2b2b";
const PAGE_BG =
  "radial-gradient(900px 520px at 18% 0%, rgba(255,77,0,0.14), transparent 56%), radial-gradient(780px 520px at 82% 18%, rgba(255,255,255,0.80), transparent 62%), linear-gradient(180deg,#f6f6f6 0%, #e7e7e7 55%, #d4d4d4 100%)";
const PANEL_BG = "linear-gradient(180deg,#ffffff 0%, #f2f2f2 55%, #e7e7e7 100%)";
const PANEL_BG_SOFT = "linear-gradient(180deg,#fbfbfb 0%, #efefef 55%, #e2e2e2 100%)";
const PANEL_SHADOW = "0 12px 28px rgba(0,0,0,0.16), inset 0 0 0 2px rgba(255,255,255,0.70)";

function prettyDate(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL");
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-6" style={{ background: PAGE_BG }}>
      <div className="mx-auto w-full max-w-6xl">
        <div
          className="rounded-[36px] p-[10px]"
          style={{
            background: "linear-gradient(180deg,#f8f8f8 0%, #d6d6d6 55%, #bdbdbd 100%)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="rounded-[28px] overflow-hidden"
            style={{
              border: `4px solid ${BORDER}`,
              background: "linear-gradient(180deg,#fbfbfb 0%, #f1f1f1 50%, #e7e7e7 100%)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

function Header({ onBack, onDashboard }: { onBack: () => void; onDashboard: () => void }) {
  return (
    <div
      className="relative px-6 py-6"
      style={{
        background: "linear-gradient(180deg,#3a3a3a 0%, #1f1f1f 55%, #141414 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 26px rgba(0,0,0,0.35)",
        borderBottom: "3px solid rgba(255,77,0,0.35)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,77,0,0.18) 35%, rgba(255,77,0,0.05) 65%, transparent 100%)",
        }}
      />
      <div className="flex items-center justify-between gap-4">
        <div>
          <div style={{ color: ORANGE, letterSpacing: "0.14em", fontWeight: 800 }}>FIGHTSUPPORT</div>
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>Vechtsport ondersteuning</div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="rounded-[22px] p-[6px]" style={{ background: "linear-gradient(180deg,#fefefe,#cfcfcf)", boxShadow: "0 10px 24px rgba(0,0,0,0.55)" }}>
            <div className="rounded-[18px] p-[6px]" style={{ border: `3px solid ${BORDER}`, background: "linear-gradient(180deg,#111,#000)" }}>
              <Image src="/branding/fightsupport/logo-dark.png" width={84} height={84} alt="FightSupport" priority />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg px-4 py-2 font-bold"
            style={{ background: "linear-gradient(180deg,#4b4b4b,#2f2f2f)", color: "#fff", border: "2px solid rgba(255,255,255,0.22)" }}
          >
            Terug
          </button>
          <button
            onClick={onDashboard}
            className="rounded-lg px-5 py-2 font-extrabold"
            style={{
              background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)",
              color: "#000",
              border: `3px solid ${BORDER}`,
              boxShadow:
                "0 10px 22px rgba(0,0,0,0.22), inset 0 0 0 2px rgba(255,255,255,0.75), inset 0 -10px 18px rgba(0,0,0,0.08)",
            }}
          >
            Naar dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsBeheerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"requests" | "users">("requests");
  const [filter, setFilter] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // handmatig toevoegen
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Matchmaker");
  const [newBondteam, setNewBondteam] = useState("");

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
    setUsers(jUsers.users || []);
  }

  useEffect(() => {
    loadAll().catch((e) => setToast(String(e?.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRequests = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      `${r.name ?? ""} ${r.email ?? ""} ${r.requested_role ?? ""} ${r.team ?? ""}`.toLowerCase().includes(q)
    );
  }, [requests, filter]);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.full_name ?? ""} ${u.email ?? ""} ${u.role ?? ""} ${u.bondteam ?? ""}`.toLowerCase().includes(q)
    );
  }, [users, filter]);

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

      setToast(action === "approve" ? "✔ Request goedgekeurd." : "✔ Request afgekeurd.");
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function saveUser(u: UserProfile) {
    setBusy(true);
    setToast("");
    try {
      const res = await authedFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: u.id,
          full_name: u.full_name ?? null,
          role: u.role ?? null,
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
    const yes = window.confirm("Gebruiker verwijderen? (dit verwijdert ook de Supabase Auth user)");
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
      if (!newEmail.trim()) throw new Error("Email is verplicht");
      if (!newRole.trim()) throw new Error("Role is verplicht");

      const res = await authedFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          full_name: newName.trim(),
          role: newRole.trim(),
          bondteam: newBondteam.trim() || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Aanmaken mislukt");

      setToast("✔ Gebruiker aangemaakt.");
      setNewEmail("");
      setNewName("");
      setNewBondteam("");
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <Header onBack={() => router.back()} onDashboard={() => router.push("/dashboard/admin")} />

      <div className="px-6 py-8">
        <div className="text-center">
          <div className="text-4xl font-extrabold" style={{ color: ORANGE }}>
            Accounts beheer
          </div>
          <div className="mt-1" style={{ color: "#555" }}>
            Requests beoordelen • gebruikers beheren • handmatig users toevoegen
          </div>
        </div>

        {/* toast */}
        {toast && (
          <div
            className="mt-6 rounded-2xl px-4 py-3"
            style={{
              border: `3px solid ${BORDER}`,
              background: toast.startsWith("✔") ? "#e9ffe9" : "#ffe8e8",
              color: toast.startsWith("✔") ? "#0b5b0b" : "#7a0000",
            }}
          >
            {toast}
          </div>
        )}

        {/* tabs + filter */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("requests")}
              className="rounded-xl px-4 py-2 font-extrabold"
              style={{
                background: tab === "requests" ? ORANGE : "#f2f2f2",
                color: tab === "requests" ? "#fff" : "#111",
                border: `2px solid ${BORDER}`,
              }}
            >
              Requests ({requests.length})
            </button>
            <button
              onClick={() => setTab("users")}
              className="rounded-xl px-4 py-2 font-extrabold"
              style={{
                background: tab === "users" ? ORANGE : "#f2f2f2",
                color: tab === "users" ? "#fff" : "#111",
                border: `2px solid ${BORDER}`,
              }}
            >
              Gebruikers ({users.length})
            </button>
          </div>

          <div className="w-full md:w-[420px]">
            <div className="text-sm font-bold mb-1" style={{ color: "#222" }}>
              Filter
            </div>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-xl px-3 py-2"
              style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
              placeholder="zoek op naam/email/rol/bondteam…"
            />
          </div>
        </div>

        {tab === "users" && (
          <div
            className="mt-6 rounded-2xl p-5"
            style={{ background: PANEL_BG_SOFT, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}
          >
            <div className="text-lg font-extrabold" style={{ color: "#111" }}>
              Handmatig gebruiker toevoegen
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Email *">
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                  placeholder="naam@club.nl"
                />
              </Field>
              <Field label="Naam">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                  placeholder="Voornaam Achternaam"
                />
              </Field>
              <Field label="Rol *">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                >
                  <option>Superadmin</option>
                  <option>Admin</option>
                  <option>Official</option>
                  <option>Matchmaker</option>
                  <option>Promotor</option>
                  <option>Sportschool</option>
                </select>
              </Field>
              <Field label="Bondteam">
                <input
                  value={newBondteam}
                  onChange={(e) => setNewBondteam(e.target.value)}
                  className="w-full rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                  placeholder="bijv. IRO"
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                disabled={busy}
                onClick={createUserInvite}
                className="rounded-xl px-6 py-3 font-extrabold disabled:opacity-60"
                style={{ background: ORANGE, color: "#fff", border: `3px solid ${BORDER}` }}
              >
                Gebruiker aanmaken
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          {tab === "requests" ? (
            <RequestsTable rows={filteredRequests} busy={busy} onAct={actOnRequest} />
          ) : (
            <UsersTable rows={filteredUsers} busy={busy} onSave={saveUser} onDelete={deleteUser} />
          )}
        </div>

        <div className="mt-8 text-center text-xs" style={{ color: "#666" }}>
          © 2026 FightSupport
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-bold mb-1" style={{ color: "#222" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function RequestsTable({
  rows,
  busy,
  onAct,
}: {
  rows: AccountRequest[];
  busy: boolean;
  onAct: (id: string, action: "approve" | "reject") => void;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: PANEL_BG, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}>
      <div className="text-lg font-extrabold" style={{ color: "#111" }}>
        Requests
      </div>

      <div
        className="mt-3 overflow-x-auto rounded-2xl"
        style={{
          border: `3px solid ${BORDER}`,
          background: "linear-gradient(180deg,#ffffff 0%, #f4f4f4 60%, #e9e9e9 100%)",
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.70)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: ORANGE, color: "#fff" }}>
              <th className="text-left px-4 py-3">Naam</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Team</th>
              <th className="text-left px-4 py-3">Aangevraagd</th>
              <th className="text-left px-4 py-3">Actie</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4" colSpan={6} style={{ color: "#666" }}>
                  Geen requests.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={r.id} style={{ background: idx % 2 === 0 ? "#fff" : "#efefef" }}>
                  <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
                    <div className="font-bold">{r.name ?? "—"}</div>
                    {r.notes ? <div className="text-xs" style={{ color: "#666" }}>{r.notes}</div> : null}
                  </td>
                  <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
                    {r.email ?? "—"}
                  </td>
                  <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
                    {r.requested_role ?? "—"}
                  </td>
                  <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
                    {r.team ?? "—"}
                  </td>
                  <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
                    {prettyDate(r.created_at)}
                  </td>
                  <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => onAct(r.id, "approve")}
                        className="rounded-xl px-4 py-2 font-extrabold disabled:opacity-60"
                        style={{ background: ORANGE, color: "#fff", border: `2px solid ${BORDER}` }}
                      >
                        Goedkeuren
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => onAct(r.id, "reject")}
                        className="rounded-xl px-4 py-2 font-extrabold disabled:opacity-60"
                        style={{ background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)", color: "#000", border: `2px solid ${BORDER}` }}
                      >
                        Afkeur
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTable({
  rows,
  busy,
  onSave,
  onDelete,
}: {
  rows: UserProfile[];
  busy: boolean;
  onSave: (u: UserProfile) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: PANEL_BG, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}>
      <div className="text-lg font-extrabold" style={{ color: "#111" }}>
        Gebruikers
      </div>

      <div
        className="mt-3 overflow-x-auto rounded-2xl"
        style={{
          border: `3px solid ${BORDER}`,
          background: "linear-gradient(180deg,#ffffff 0%, #f4f4f4 60%, #e9e9e9 100%)",
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.70)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: ORANGE, color: "#fff" }}>
              <th className="text-left px-4 py-3">Naam</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Bondteam</th>
              <th className="text-left px-4 py-3">Aangemaakt</th>
              <th className="text-left px-4 py-3">Acties</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4" colSpan={6} style={{ color: "#666" }}>
                  Geen gebruikers gevonden.
                </td>
              </tr>
            ) : (
              rows.map((u, idx) => (
                <UserRow key={u.id} u={u} idx={idx} busy={busy} onSave={onSave} onDelete={onDelete} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({
  u,
  idx,
  busy,
  onSave,
  onDelete,
}: {
  u: UserProfile;
  idx: number;
  busy: boolean;
  onSave: (u: UserProfile) => void;
  onDelete: (id: string) => void;
}) {
  const [edit, setEdit] = useState<UserProfile>(u);

  useEffect(() => setEdit(u), [u]);

  return (
    <tr style={{ background: idx % 2 === 0 ? "#fff" : "#efefef" }}>
      <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
        <input
          value={edit.full_name ?? ""}
          onChange={(e) => setEdit({ ...edit, full_name: e.target.value })}
          className="w-full rounded-xl px-3 py-2"
          style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
        />
      </td>
      <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
        {u.email ?? "-"}
      </td>
      <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
        <select
          value={edit.role ?? ""}
          onChange={(e) => setEdit({ ...edit, role: e.target.value })}
          className="w-full rounded-xl px-3 py-2"
          style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
        >
          <option value="">(geen)</option>
          <option>Superadmin</option>
          <option>Admin</option>
          <option>Official</option>
          <option>Matchmaker</option>
          <option>Promotor</option>
          <option>Sportschool</option>
        </select>
      </td>
      <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
        <input
          value={edit.bondteam ?? ""}
          onChange={(e) => setEdit({ ...edit, bondteam: e.target.value })}
          className="w-full rounded-xl px-3 py-2"
          style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
        />
      </td>
      <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
        {prettyDate(u.created_at)}
      </td>
      <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => onSave(edit)}
            className="rounded-xl px-4 py-2 font-extrabold disabled:opacity-60"
            style={{ background: ORANGE, color: "#fff", border: `2px solid ${BORDER}` }}
          >
            Opslaan
          </button>
          <button
            disabled={busy}
            onClick={() => onDelete(u.id)}
            className="rounded-xl px-4 py-2 font-extrabold disabled:opacity-60"
            style={{ background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)", color: "#000", border: `2px solid ${BORDER}` }}
          >
            Verwijder
          </button>
        </div>
      </td>
    </tr>
  );
}
