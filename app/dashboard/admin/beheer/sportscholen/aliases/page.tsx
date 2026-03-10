"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const ORANGE = "#ff4d00";
const BORDER = "#2b2b2b";
const PAGE_BG =
  "radial-gradient(900px 520px at 18% 0%, rgba(255,77,0,0.14), transparent 56%), radial-gradient(780px 520px at 82% 18%, rgba(255,255,255,0.80), transparent 62%), linear-gradient(180deg,#f6f6f6 0%, #e7e7e7 55%, #d4d4d4 100%)";
const PANEL_BG = "linear-gradient(180deg,#ffffff 0%, #f2f2f2 55%, #e7e7e7 100%)";
const PANEL_BG_SOFT = "linear-gradient(180deg,#fbfbfb 0%, #efefef 55%, #e2e2e2 100%)";
const PANEL_SHADOW = "0 12px 28px rgba(0,0,0,0.16), inset 0 0 0 2px rgba(255,255,255,0.70)";
const PAGE_SIZE = 50;

type Sportschool = {
  sportschool_id: number;
  naam: string | null;
  plaats: string | null;
  land: string | null;
};

type AliasRow = {
  id: string;
  alias_text: string;
  sportschool_id: number;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};

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
            style={{
              background: "linear-gradient(180deg,#4b4b4b,#2f2f2f)",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.22)",
              boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.25)",
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

export default function SportschoolAliasesPage() {
  const router = useRouter();
  const { user, roles, loading } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("superadmin");

  const [err, setErr] = useState<string | null>(null);

  // Sportschool search + paging
  const [sportschoolQuery, setSportschoolQuery] = useState("");
  const [sportscholen, setSportscholen] = useState<Sportschool[]>([]);
  const [sportsLoading, setSportsLoading] = useState(false);
  const [sportsPage, setSportsPage] = useState(0);
  const [sportsHasMore, setSportsHasMore] = useState(true);
  const [sportsCount, setSportsCount] = useState<number | null>(null);

  // Selected sportschool
  const [selected, setSelected] = useState<Sportschool | null>(null);

  // Aliases for selected
  const [aliases, setAliases] = useState<AliasRow[]>([]);
  const [aliasesLoading, setAliasesLoading] = useState(false);
  const [aliasFilter, setAliasFilter] = useState("");

  // Add alias
  const [newAlias, setNewAlias] = useState("");

  // Guard
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/dashboard");
    }
  }, [loading, user, isAdmin, router]);

  async function loadSportscholenPage(reset: boolean) {
    try {
      setErr(null);
      setSportsLoading(true);

      const q = sportschoolQuery.trim();
      const page = reset ? 0 : sportsPage;

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("sportscholen")
        .select("sportschool_id, naam, plaats, land", { count: "exact" })
        .order("naam", { ascending: true })
        .range(from, to);

      if (q) {
        const like = `%${q}%`;
        query = query.or(`naam.ilike.${like},plaats.ilike.${like},land.ilike.${like}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const rows = (data ?? []) as Sportschool[];

      if (reset) {
        setSportscholen(rows);
        setSportsPage(1);
      } else {
        setSportscholen((prev) => [...prev, ...rows]);
        setSportsPage((prev) => prev + 1);
      }

      setSportsCount(typeof count === "number" ? count : null);

      const loaded = (reset ? 0 : page * PAGE_SIZE) + rows.length;
      const total = typeof count === "number" ? count : loaded;
      setSportsHasMore(loaded < total);
    } catch (e: any) {
      setErr(e?.message ?? "sportscholen_load_failed");
    } finally {
      setSportsLoading(false);
    }
  }

  async function loadAliases(sportschool_id: number) {
    try {
      setErr(null);
      setAliasesLoading(true);

      const { data, error } = await supabase
        .from("sportschool_aliases")
        .select("id, alias_text, sportschool_id, note, created_at, updated_at")
        .eq("sportschool_id", sportschool_id)
        .order("alias_text", { ascending: true });

      if (error) throw error;
      setAliases((data ?? []) as AliasRow[]);
    } catch (e: any) {
      setErr(e?.message ?? "aliases_load_failed");
    } finally {
      setAliasesLoading(false);
    }
  }

  async function addAlias() {
    try {
      setErr(null);
      if (!selected) throw new Error("Kies eerst een sportschool.");
      const alias = newAlias.trim();
      if (!alias) throw new Error("Vul een alias in.");

      const { error } = await supabase.from("sportschool_aliases").insert({
        alias_text: alias,
        sportschool_id: selected.sportschool_id,
        note: null,
      });

      if (error) {
        const msg = String((error as any).message ?? "");
        if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
          throw new Error("Deze alias bestaat al (case-insensitive).");
        }
        throw error;
      }

      setNewAlias("");
      await loadAliases(selected.sportschool_id);
    } catch (e: any) {
      setErr(e?.message ?? "save_failed");
    }
  }

  async function removeAlias(row: AliasRow) {
    try {
      setErr(null);
      if (!selected) return;
      const ok = confirm(`Alias verwijderen?\n\n${row.alias_text}`);
      if (!ok) return;

      const { error } = await supabase.from("sportschool_aliases").delete().eq("id", row.id);
      if (error) throw error;

      await loadAliases(selected.sportschool_id);
    } catch (e: any) {
      setErr(e?.message ?? "delete_failed");
    }
  }

  // Init
  useEffect(() => {
    if (!loading && user && isAdmin) {
      setSelected(null);
      setAliases([]);
      setSportsPage(0);
      setSportsHasMore(true);
      setSportsCount(null);
      loadSportscholenPage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isAdmin]);

  // Search debounce
  useEffect(() => {
    if (!user || !isAdmin) return;

    const t = setTimeout(() => {
      setSportsPage(0);
      setSportsHasMore(true);
      setSportsCount(null);
      loadSportscholenPage(true);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportschoolQuery]);

  const filteredAliases = useMemo(() => {
    const q = aliasFilter.trim().toLowerCase();
    if (!q) return aliases;
    return aliases.filter((a) => (a.alias_text ?? "").toLowerCase().includes(q));
  }, [aliases, aliasFilter]);

  if (!user || !isAdmin) return null;

  return (
    <Shell>
      <Header onBack={() => router.back()} onDashboard={() => router.push("/dashboard/admin")} />

      <div className="px-6 py-8">
        <div className="text-center">
          <div className="text-4xl font-extrabold" style={{ color: ORANGE }}>
            Sportschool Aliassen
          </div>
          <div className="mt-1" style={{ color: "#555" }}>
            Voeg aliassen toe zodat matching (scraper/controle) stabiel blijft.
          </div>
        </div>

        {err && (
          <div className="mt-6 rounded-2xl px-4 py-3" style={{ border: `3px solid ${BORDER}`, background: "#ffe8e8", color: "#7a0000" }}>
            {err}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: sportscholen */}
          <div className="rounded-2xl p-5" style={{ background: PANEL_BG, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}>
            <div className="mb-4 h-[4px] w-full rounded-full" style={{ background: "linear-gradient(90deg,#ff4d00, rgba(255,77,0,0.10))" }} />
            <div className="text-lg font-extrabold" style={{ color: "#111" }}>
              1) Zoek sportschool
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={sportschoolQuery}
                onChange={(e) => setSportschoolQuery(e.target.value)}
                placeholder="Zoek op naam / plaats / land…"
                className="w-full rounded-xl px-3 py-2"
                style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
              />
              <button
                onClick={() => loadSportscholenPage(true)}
                className="rounded-xl px-4 py-2 font-extrabold"
                style={{ background: ORANGE, color: "#fff", border: `2px solid ${BORDER}` }}
              >
                Zoek
              </button>
            </div>

            <div className="mt-3 text-xs" style={{ color: "#666" }}>
              {sportsCount != null ? `${sportsCount} totaal` : ""}
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl" style={{ border: `3px solid ${BORDER}`, background: "#fff" }}>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: ORANGE, color: "#fff" }}>
                      <th className="text-left px-4 py-3">Sportschool</th>
                      <th className="text-left px-4 py-3">Plaats</th>
                      <th className="text-left px-4 py-3">Land</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sportscholen.map((s, idx) => {
                      const active = selected?.sportschool_id === s.sportschool_id;
                      return (
                        <tr
                          key={s.sportschool_id}
                          onClick={() => {
                            setSelected(s);
                            setAliasFilter("");
                            loadAliases(s.sportschool_id);
                          }}
                          style={{
                            cursor: "pointer",
                            background: active ? "#ffe6db" : idx % 2 === 0 ? "#fff" : "#efefef",
                          }}
                        >
                          <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
                            <div className="font-bold" style={{ color: "#111" }}>{s.naam ?? "—"}</div>
                            <div className="text-xs" style={{ color: "#666" }}>#{s.sportschool_id}</div>
                          </td>
                          <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
                            {s.plaats ?? "—"}
                          </td>
                          <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
                            {s.land ?? "—"}
                          </td>
                        </tr>
                      );
                    })}

                    {sportscholen.length === 0 && (
                      <tr>
                        <td className="px-4 py-4" colSpan={3} style={{ color: "#666" }}>
                          Geen sportscholen gevonden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm" style={{ color: "#666" }}>
                {sportsLoading ? "Laden…" : ""}
              </div>
              <button
                disabled={!sportsHasMore || sportsLoading}
                onClick={() => loadSportscholenPage(false)}
                className="rounded-xl px-4 py-2 font-extrabold disabled:opacity-60"
                style={{ background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)", color: "#000", border: `2px solid ${BORDER}` }}
              >
                Meer laden
              </button>
            </div>
          </div>

          {/* RIGHT: aliases */}
          <div className="rounded-2xl p-5" style={{ background: PANEL_BG_SOFT, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}>
            <div className="mb-4 h-[4px] w-full rounded-full" style={{ background: "linear-gradient(90deg, rgba(255,77,0,0.12), rgba(0,0,0,0.10))" }} />
            <div className="text-lg font-extrabold" style={{ color: "#111" }}>
              2) Aliassen
            </div>

            {!selected ? (
              <div
                className="mt-4 rounded-2xl p-4"
                style={{
                  background: "linear-gradient(180deg,#ffffff 0%, #f1f1f1 60%, #e7e7e7 100%)",
                  border: `3px solid ${BORDER}`,
                  color: "#333",
                  boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.70)",
                }}
              >
                Kies links een sportschool om aliassen te bekijken/toe te voegen.
              </div>
            ) : (
              <>
                <div
                  className="mt-3 rounded-2xl p-4"
                  style={{
                    background: "linear-gradient(180deg,#ffffff 0%, #f1f1f1 60%, #e7e7e7 100%)",
                    border: `3px solid ${BORDER}`,
                    boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.70)",
                  }}
                >
                  <div className="font-extrabold" style={{ color: "#111" }}>{selected.naam ?? "—"}</div>
                  <div className="text-sm" style={{ color: "#666" }}>
                    {selected.plaats ?? "—"} {selected.land ? `• ${selected.land}` : ""} • #{selected.sportschool_id}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-bold mb-1" style={{ color: "#222" }}>Filter alias</div>
                    <input
                      value={aliasFilter}
                      onChange={(e) => setAliasFilter(e.target.value)}
                      className="w-full rounded-xl px-3 py-2"
                      style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                      placeholder="zoek in aliassen…"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-1" style={{ color: "#222" }}>Nieuwe alias</div>
                    <div className="flex gap-2">
                      <input
                        value={newAlias}
                        onChange={(e) => setNewAlias(e.target.value)}
                        className="w-full rounded-xl px-3 py-2"
                        style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                        placeholder="bijv. Team Suboxer"
                      />
                      <button
                        onClick={addAlias}
                        className="rounded-xl px-4 py-2 font-extrabold"
                        style={{ background: ORANGE, color: "#fff", border: `2px solid ${BORDER}` }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl" style={{ border: `3px solid ${BORDER}`, background: "#fff" }}>
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: ORANGE, color: "#fff" }}>
                          <th className="text-left px-4 py-3">Alias</th>
                          <th className="text-left px-4 py-3">Actie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aliasesLoading ? (
                          <tr>
                            <td className="px-4 py-4" colSpan={2} style={{ color: "#666" }}>
                              Laden…
                            </td>
                          </tr>
                        ) : filteredAliases.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4" colSpan={2} style={{ color: "#666" }}>
                              Geen aliassen.
                            </td>
                          </tr>
                        ) : (
                          filteredAliases.map((a, idx) => (
                            <tr key={a.id} style={{ background: idx % 2 === 0 ? "#fff" : "#efefef" }}>
                              <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
                                <span className="font-bold">{a.alias_text}</span>
                              </td>
                              <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
                                <button
                                  onClick={() => removeAlias(a)}
                                  className="rounded-xl px-4 py-2 font-extrabold"
                                  style={{ background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)", color: "#000", border: `2px solid ${BORDER}` }}
                                >
                                  Verwijder
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-xs" style={{ color: "#666" }}>
          © 2026 FightSupport
        </div>
      </div>
    </Shell>
  );
}
