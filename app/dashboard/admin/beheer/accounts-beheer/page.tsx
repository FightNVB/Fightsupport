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
const PANEL_BG =
  "linear-gradient(180deg,#ffffff 0%, #f2f2f2 55%, #e7e7e7 100%)";
const PANEL_BG_SOFT =
  "linear-gradient(180deg,#fbfbfb 0%, #efefef 55%, #e2e2e2 100%)";
const PANEL_SHADOW =
  "0 12px 28px rgba(0,0,0,0.16), inset 0 0 0 2px rgba(255,255,255,0.70)";

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
      <div className="mx-auto w-full max-w-7xl">
        <div
          className="rounded-[36px] p-[10px]"
          style={{
            background:
              "linear-gradient(180deg,#f8f8f8 0%, #d6d6d6 55%, #bdbdbd 100%)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="rounded-[28px] overflow-hidden"
            style={{
              border: `4px solid ${BORDER}`,
              background:
                "linear-gradient(180deg,#fbfbfb 0%, #f1f1f1 50%, #e7e7e7 100%)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

function Header({
  onBack,
  onDashboard,
}: {
  onBack: () => void;
  onDashboard: () => void;
}) {
  return (
    <div
      className="relative px-6 py-6"
      style={{
        background:
          "linear-gradient(180deg,#3a3a3a 0%, #1f1f1f 55%, #141414 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 26px rgba(0,0,0,0.35)",
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
          <div
            style={{ color: ORANGE, letterSpacing: "0.14em", fontWeight: 800 }}
          >
            FIGHTSUPPORT
          </div>
          <div
            className="text-sm"
            style={{ color: "rgba(255,255,255,0.70)" }}
          >
            Gebruikers uitnodigen en beheren
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2">
          <div
            className="rounded-[22px] p-[6px]"
            style={{
              background: "linear-gradient(180deg,#fefefe,#cfcfcf)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
            }}
          >
            <div
              className="rounded-[18px] p-[6px]"
              style={{
                border: `3px solid ${BORDER}`,
                background: "linear-gradient(180deg,#111,#000)",
              }}
            >
              <Image
                src="/branding/fightsupport/logo-dark.png"
                width={84}
                height={84}
                alt="FightSupport"
                priority
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg px-4 py-2 font-bold"
            style={{
              background: "linear-gradient(180deg,#4b4b4b,#2f2f2f)",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.22)",
            }}
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-4 py-3 text-sm font-extrabold"
      style={{
        background: active
          ? `linear-gradient(180deg, ${ORANGE} 0%, #d93d00 100%)`
          : "linear-gradient(180deg,#ffffff 0%, #dddddd 100%)",
        color: active ? "#fff" : "#000",
        border: `3px solid ${BORDER}`,
        boxShadow: active
          ? "0 10px 22px rgba(0,0,0,0.18), inset 0 0 0 2px rgba(255,255,255,0.14)"
          : "0 10px 20px rgba(0,0,0,0.10), inset 0 0 0 2px rgba(255,255,255,0.70)",
      }}
    >
      {children}
    </button>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3 py-3 text-sm"
      style={{
        background: "#fff",
        border: "2px solid #cfcfcf",
        color: "#000",
        outline: "none",
      }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl px-3 py-3 text-sm"
      style={{
        background: "#fff",
        border: "2px solid #cfcfcf",
        color: "#000",
        outline: "none",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
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
  }, []);

  const filteredRequests = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      `${r.name ?? ""} ${r.email ?? ""} ${r.requested_role ?? ""} ${r.team ?? ""} ${r.notes ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [requests, filter]);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.full_name ?? ""} ${u.email ?? ""} ${u.role ?? ""} ${u.bondteam ?? ""}`
        .toLowerCase()
        .includes(q)
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

      setToast(
        action === "approve"
          ? "✔ Request goedgekeurd en uitnodiging verzonden."
          : "✔ Request afgekeurd."
      );
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
    const yes = window.confirm(
      "Gebruiker verwijderen? (dit verwijdert ook de Supabase Auth user)"
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
      const role = newRole.trim();
      const bondteam = newBondteam.trim();

      if (!email) throw new Error("Email is verplicht");
      if (!role) throw new Error("Rol is verplicht");

      const res = await authedFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          full_name,
          role,
          bondteam: bondteam || null,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Uitnodigen mislukt");

      setToast("✔ Uitnodiging verzonden.");
      setNewEmail("");
      setNewName("");
      setNewRole("Matchmaker");
      setNewBondteam("");
      await loadAll();
      setTab("users");
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <Header
        onBack={() => router.back()}
        onDashboard={() => router.push("/dashboard")}
      />

      <div className="px-5 py-5 md:px-6 md:py-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1
              className="text-2xl font-black md:text-3xl"
              style={{ color: "#111" }}
            >
              Accounts beheer
            </h1>
            <p className="text-sm" style={{ color: "#555" }}>
              Requests beoordelen, gebruikers uitnodigen en gebruikers beheren.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <TabButton
              active={tab === "requests"}
              onClick={() => setTab("requests")}
            >
              Account requests
            </TabButton>
            <TabButton active={tab === "users"} onClick={() => setTab("users")}>
              Gebruikers & uitnodigen
            </TabButton>
          </div>
        </div>

        {toast ? (
          <div
            className="mb-5 rounded-2xl px-4 py-3 text-sm font-semibold"
            style={{
              background: "linear-gradient(180deg,#fff7f3 0%, #ffe9df 100%)",
              border: "2px solid rgba(255,77,0,0.35)",
              color: "#6b2b12",
              boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
            }}
          >
            {toast}
          </div>
        ) : null}

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1.8fr]">
          <section
            className="rounded-[28px] p-5"
            style={{ background: PANEL_BG, boxShadow: PANEL_SHADOW }}
          >
            <div className="mb-4">
              <div
                className="text-xs font-black uppercase tracking-[0.18em]"
                style={{ color: ORANGE }}
              >
                Admin
              </div>
              <h2 className="text-xl font-black text-black">
                Handmatig gebruiker uitnodigen
              </h2>
              <p className="mt-1 text-sm text-black/60">
                De gebruiker ontvangt een e-mailuitnodiging en stelt daarna zelf
                een wachtwoord in.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-black/70">
                  Volledige naam
                </label>
                <Input
                  value={newName}
                  onChange={setNewName}
                  placeholder="Naam gebruiker"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-black/70">
                  E-mailadres
                </label>
                <Input
                  value={newEmail}
                  onChange={setNewEmail}
                  placeholder="naam@voorbeeld.nl"
                  type="email"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-black/70">
                  Rol
                </label>
                <Select
                  value={newRole}
                  onChange={setNewRole}
                  options={[
                    "Matchmaker",
                    "Official",
                    "Hoofdofficial",
                    "Admin",
                    "Promotor",
                    "Sportschool",
                    "Superadmin",
                  ]}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-black/70">
                  Bond/team
                </label>
                <Input
                  value={newBondteam}
                  onChange={setNewBondteam}
                  placeholder="Optioneel"
                />
              </div>

              <button
                disabled={busy}
                onClick={createUserInvite}
                className="mt-2 rounded-xl px-4 py-3 font-extrabold text-white disabled:opacity-60"
                style={{
                  background: ORANGE,
                  border: `3px solid ${BORDER}`,
                  boxShadow:
                    "0 10px 22px rgba(0,0,0,0.20), inset 0 0 0 2px rgba(255,255,255,0.18), inset 0 -10px 18px rgba(0,0,0,0.18)",
                }}
              >
                {busy ? "Bezig..." : "Gebruiker uitnodigen"}
              </button>
            </div>
          </section>

          <section
            className="rounded-[28px] p-5"
            style={{ background: PANEL_BG_SOFT, boxShadow: PANEL_SHADOW }}
          >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div
                  className="text-xs font-black uppercase tracking-[0.18em]"
                  style={{ color: ORANGE }}
                >
                  Overzicht
                </div>
                <h2 className="text-xl font-black text-black">
                  {tab === "requests"
                    ? "Open account requests"
                    : "Bestaande gebruikers"}
                </h2>
              </div>

              <div className="w-full md:max-w-[340px]">
                <label className="mb-1 block text-xs font-bold text-black/70">
                  Zoeken
                </label>
                <Input
                  value={filter}
                  onChange={setFilter}
                  placeholder="Naam, e-mail, rol of team"
                />
              </div>
            </div>

            {tab === "requests" ? (
              <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                  <div
                    className="rounded-2xl px-4 py-4 text-sm"
                    style={{
                      background: "#fff",
                      border: "2px dashed #d4d4d4",
                      color: "#666",
                    }}
                  >
                    Geen open requests gevonden.
                  </div>
                ) : (
                  filteredRequests.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl p-4"
                      style={{
                        background: "#fff",
                        border: "2px solid #dddddd",
                        boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr_auto] md:items-start">
                        <div>
                          <div className="text-base font-black text-black">
                            {r.name || "Onbekende naam"}
                          </div>
                          <div className="text-sm text-black/70">
                            {r.email || "Geen e-mail"}
                          </div>
                          <div className="mt-2 text-xs text-black/55">
                            Aangevraagd: {prettyDate(r.created_at)}
                          </div>
                        </div>

                        <div className="text-sm text-black/75">
                          <div>
                            <span className="font-bold">Rol:</span>{" "}
                            {r.requested_role || "-"}
                          </div>
                          <div>
                            <span className="font-bold">Team:</span>{" "}
                            {r.team || "-"}
                          </div>
                          {r.notes ? (
                            <div className="mt-2">
                              <span className="font-bold">Notities:</span>{" "}
                              {r.notes}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <button
                            disabled={busy}
                            onClick={() => actOnRequest(r.id, "approve")}
                            className="rounded-lg px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
                            style={{
                              background: ORANGE,
                              border: `2px solid ${BORDER}`,
                            }}
                          >
                            Goedkeuren + uitnodigen
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => actOnRequest(r.id, "reject")}
                            className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-60"
                            style={{
                              background:
                                "linear-gradient(180deg,#f6f6f6,#d4d4d4)",
                              color: "#111",
                              border: `2px solid ${BORDER}`,
                            }}
                          >
                            Afkeuren
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div
                    className="rounded-2xl px-4 py-4 text-sm"
                    style={{
                      background: "#fff",
                      border: "2px dashed #d4d4d4",
                      color: "#666",
                    }}
                  >
                    Geen gebruikers gevonden.
                  </div>
                ) : (
                  filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="rounded-2xl p-4"
                      style={{
                        background: "#fff",
                        border: "2px solid #dddddd",
                        boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.9fr_0.9fr_auto] xl:items-end">
                        <div>
                          <div className="mb-1 text-xs font-bold text-black/65">
                            E-mail
                          </div>
                          <div className="text-sm font-semibold text-black">
                            {u.email || "-"}
                          </div>
                          <div className="mt-2 text-xs text-black/50">
                            Aangemaakt: {prettyDate(u.created_at)}
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 text-xs font-bold text-black/65">
                            Naam
                          </div>
                          <Input
                            value={u.full_name ?? ""}
                            onChange={(v) =>
                              setUsers((prev) =>
                                prev.map((x) =>
                                  x.id === u.id ? { ...x, full_name: v } : x
                                )
                              )
                            }
                            placeholder="Naam"
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
                          <div>
                            <div className="mb-1 text-xs font-bold text-black/65">
                              Rol
                            </div>
                            <Select
                              value={u.role ?? "Matchmaker"}
                              onChange={(v) =>
                                setUsers((prev) =>
                                  prev.map((x) =>
                                    x.id === u.id ? { ...x, role: v } : x
                                  )
                                )
                              }
                              options={[
                                "Matchmaker",
                                "Official",
                                "Hoofdofficial",
                                "Admin",
                                "Promotor",
                                "Sportschool",
                                "Superadmin",
                              ]}
                            />
                          </div>

                          <div>
                            <div className="mb-1 text-xs font-bold text-black/65">
                              Bond/team
                            </div>
                            <Input
                              value={u.bondteam ?? ""}
                              onChange={(v) =>
                                setUsers((prev) =>
                                  prev.map((x) =>
                                    x.id === u.id ? { ...x, bondteam: v } : x
                                  )
                                )
                              }
                              placeholder="Team"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <button
                            disabled={busy}
                            onClick={() => saveUser(u)}
                            className="rounded-lg px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
                            style={{
                              background: ORANGE,
                              border: `2px solid ${BORDER}`,
                            }}
                          >
                            Opslaan
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => deleteUser(u.id)}
                            className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-60"
                            style={{
                              background:
                                "linear-gradient(180deg,#f6f6f6,#d4d4d4)",
                              color: "#111",
                              border: `2px solid ${BORDER}`,
                            }}
                          >
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}