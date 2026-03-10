"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";

import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const NVB_ORANGE = "#ff4d00";

interface ControleRun {
  id: string;
  matchmaking_id: string;
  status: string;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
}

interface UploadRow {
  id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;

  matchmaking_id: string | null;

  matchmaker: string | null;
  promotor: string | null;
  hoofdofficial: string | null;

  uploaded_at?: string | null;
  uploaded_by?: string | null;

  laatste_run: ControleRun | null;
}

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("nl-NL");
}

function Small({
  children,
  origin = "left center",
}: {
  children: React.ReactNode;
  origin?: string;
}) {
  return (
    <div style={{ transform: "scale(0.85)", transformOrigin: origin }}>
      {children}
    </div>
  );
}

function isSuperadminRole(role: any) {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "superadmin" || r === "super admin" || r === "super_admin";
}

export default function ControleOverzichtMatchmakerPage() {
  const { user } = useAuth();

  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [sportsBusy, setSportsBusy] = useState(false);
  const [sportsMsg, setSportsMsg] = useState<string>("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editMatchmaker, setEditMatchmaker] = useState("");
  const [editPromotor, setEditPromotor] = useState("");
  const [editHoofdofficial, setEditHoofdofficial] = useState("");
  const [saveMsg, setSaveMsg] = useState<string>("");

  const [profileRole, setProfileRole] = useState<string | null>(null);

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function boot() {
    setLoading(true);
    setRows([]);
    setProfileRole(null);

    if (!user?.id) {
      setLoading(false);
      return;
    }

    // ✅ nodig voor superadmin bypass
    const { data: prof, error: profErr } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) console.warn("profile load error:", profErr);

    const role = (prof as any)?.role ?? null;
    setProfileRole(role);

    await load(role);
  }

  async function load(roleMaybe: any) {
    setLoading(true);
    setSaveMsg("");
    setSportsMsg("");

    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }

    const isSuper = isSuperadminRole(roleMaybe);

    // ✅ Matchmaker ziet alleen eigen uploads, superadmin ziet alles
    let q = supabase
      .from("matchmaking_uploads")
      .select(
        `
        id,
        uploaded_at,
        uploaded_by,
        evenement_naam,
        evenement_datum,
        locatie,
        matchmaking_id,
        matchmaker,
        promotor,
        hoofdofficial
      `
      )
      .order("uploaded_at", { ascending: false });

    if (!isSuper) {
      q = q.eq("uploaded_by", user.id);
    }

    const { data: uploads, error: uploadError } = await q;

    if (uploadError) {
      console.error("Fout bij laden uploads:", uploadError);
      setRows([]);
      setLoading(false);
      return;
    }

    const matchmakingIds = (uploads ?? [])
      .map((u: any) => u.matchmaking_id)
      .filter(Boolean) as string[];

    const { data: runs } = matchmakingIds.length
      ? await supabase
          .from("controle_runs")
          .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
          .in("matchmaking_id", matchmakingIds)
      : { data: [] as any[] };

    const runMap = new Map<string, ControleRun>();
    (runs ?? []).forEach((r: ControleRun) => {
      const existing = runMap.get(r.matchmaking_id);
      if (
        !existing ||
        new Date(r.gestart_op ?? 0) > new Date(existing.gestart_op ?? 0)
      ) {
        runMap.set(r.matchmaking_id, r);
      }
    });

    const merged: UploadRow[] = (uploads ?? []).map((u: any) => ({
      ...u,
      laatste_run: u.matchmaking_id ? runMap.get(u.matchmaking_id) ?? null : null,
    }));

    setRows(merged);
    setLoading(false);
  }

  async function runSportscholen() {
    try {
      setSportsMsg("");
      setSportsBusy(true);

      const res = await authedFetch("/api/control-engine/sportscholen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Sportscholen run failed:", res.status, t);
        setSportsMsg(`❌ Sportscholen sync mislukt (${res.status}).`);
        return;
      }

      setSportsMsg("✅ Sportscholen sync gestart/afgerond.");
      await load(profileRole);
    } catch (e) {
      console.error(e);
      setSportsMsg("❌ Onverwachte fout bij sportscholen sync.");
    } finally {
      setSportsBusy(false);
    }
  }

  async function startControle(matchmakingId: string) {
    try {
      setIsBusy(true);
      setBusyId(matchmakingId);

      const res = await authedFetch("/api/control-engine/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          do_scrape: true,
          scrape_mode: "auto",
          reset_before_run: true,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Start controle failed:", res.status, t);
        alert("Start controle mislukt. Check console/logs.");
        return;
      }

      await load(profileRole);
    } finally {
      setBusyId(null);
      setIsBusy(false);
    }
  }

  async function deleteMatchmaking(matchmaking_id: string) {
    const ok2 = window.confirm(
      "Weet je zeker dat je deze matchmaking + alle controle data wilt verwijderen?\n\nDit kan niet ongedaan gemaakt worden."
    );
    if (!ok2) return;

    try {
      setBusyId(matchmaking_id);

      const res = await authedFetch("/api/control-engine/delete-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Delete failed:", res.status, t);
        alert("Verwijderen mislukt. Check console/logs.");
        return;
      }

      await load(profileRole);
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(r: UploadRow) {
    setSaveMsg("");
    setEditId(r.id);
    setEditMatchmaker(r.matchmaker ?? "");
    setEditPromotor(r.promotor ?? "");
    setEditHoofdofficial(r.hoofdofficial ?? "");
  }

  function closeEdit() {
    setEditId(null);
    setEditMatchmaker("");
    setEditPromotor("");
    setEditHoofdofficial("");
  }

  async function saveEdit(uploadId: string) {
    try {
      setSaveMsg("");
      if (!editMatchmaker.trim()) {
        setSaveMsg("⚠️ Matchmaker is verplicht.");
        return;
      }

      const { error } = await supabase
        .from("matchmaking_uploads")
        .update({
          matchmaker: editMatchmaker.trim(),
          promotor: editPromotor.trim() || null,
          hoofdofficial: editHoofdofficial.trim() || null,
        })
        .eq("id", uploadId);

      if (error) {
        console.error("Update upload meta error:", error);
        setSaveMsg("❌ Opslaan mislukt.");
        return;
      }

      setSaveMsg("✅ Opgeslagen.");
      await load(profileRole);
      closeEdit();
    } catch (e) {
      console.error(e);
      setSaveMsg("❌ Onverwachte fout bij opslaan.");
    }
  }

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "#eef0f3" }}>
      <div className="mx-auto w-full max-w-[1500px]">
        <div
          className="rounded-[32px] p-[6px]"
          style={{
            background:
              "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.7),
              0 22px 70px rgba(0,0,0,0.9)
            `,
          }}
        >
          <div
            className="relative rounded-[28px]"
            style={{
              background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
              border: "3px solid rgba(63,63,70,0.35)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <div
              className="px-6 py-5 rounded-t-[28px]"
              style={{
                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                borderBottom: "3px solid rgba(255,77,0,0.55)",
              }}
            >
              <div className="grid grid-cols-3 items-center gap-4">
                <div className="justify-self-start leading-tight">
                  <div
                    className="font-extrabold tracking-[0.20em]"
                    style={{
                      color: NVB_ORANGE,
                      fontSize: 14,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                    }}
                  >
                    FIGHTSUPPORT
                  </div>
                  <div className="text-xs text-white/70">Matchmaker menu — mijn uploads</div>

                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <Small origin="left center">
                      <NvbLightButton
                        label="← Terug"
                        onClick={() => (window.location.href = "/dashboard/matchmaker")}
                      />
                    </Small>

                    <Small origin="left center">
                      <NvbDarkButton
                        label="Upload MM"
                        onClick={() => (window.location.href = "/dashboard/matchmaker/upload")}
                      />
                    </Small>
                  </div>
                </div>

                <div className="justify-self-center">
                  <div
                    className="rounded-[28px] p-[6px]"
                    style={{
                      background:
                        "linear-gradient(180deg, #f5f5f5 0%, #cfcfcf 35%, #8f8f8f 65%, #f0f0f0 100%)",
                      boxShadow: `
                        0 0 0 1px rgba(255,255,255,0.70),
                        0 12px 28px rgba(0,0,0,0.70)
                      `,
                    }}
                  >
                    <div
                      className="rounded-[22px] p-3"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(4,4,4,0.96))",
                        border: "3px solid rgba(220,220,220,0.50)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                      }}
                    >
                      <Image
                        src="/branding/fightsupport/logo-dark.png"
                        alt="FightSupport"
                        width={110}
                        height={110}
                        priority
                      />
                    </div>
                  </div>
                </div>

                <div className="justify-self-end flex flex-col items-end gap-2">
                  <button
                    onClick={runSportscholen}
                    disabled={sportsBusy}
                    className="px-3 py-2 text-sm bg-[#2f2f33] border border-[var(--brand-orange)] text-white rounded hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                    title="Update sportscholen tabel (keurmerk data)"
                  >
                    {sportsBusy ? "Sportscholen…" : "Sportscholen sync"}
                  </button>
                  {sportsMsg ? (
                    <span className="text-xs" style={{ color: "var(--brand-orange)" }}>
                      {sportsMsg}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="px-6 py-7">
              <div className="mt-2 text-center">
                <h1 className="text-4xl font-extrabold" style={{ color: NVB_ORANGE }}>
                  Controle Overzicht
                </h1>
                <p className="mt-1 text-sm text-zinc-700">
                  {isSuperadminRole(profileRole)
                    ? "Superadmin — alle matchmakings zichtbaar"
                    : "Alleen matchmakings die jij hebt geüpload"}
                </p>
              </div>

              <>
                {loading ? (
                  <p className="text-gray-400 mt-6">Laden…</p>
                ) : (
                  <div
                    className="mt-6 overflow-hidden rounded-2xl"
                    style={{
                      border: "2px solid rgba(230,230,230,0.28)",
                      background: "rgba(0,0,0,0.20)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="h-[3px]" style={{ background: "rgba(255,77,0,0.75)" }} />

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead
                          style={{
                            background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                            color: "#fff",
                            borderBottom: "2px solid rgba(255,77,0,0.55)",
                          }}
                        >
                          <tr>
                            <th className="py-3 px-4 text-left">Datum</th>
                            <th className="py-3 px-4 text-left">Evenement</th>
                            <th className="py-3 px-4 text-left">Locatie</th>
                            <th className="py-3 px-4 text-left">Matchmaker</th>
                            <th className="py-3 px-4 text-left">Promotor</th>
                            <th className="py-3 px-4 text-left">Hoofdofficial</th>
                            <th className="py-3 px-4 text-left">Status</th>
                            <th className="py-3 px-4 text-left">Acties</th>
                          </tr>
                        </thead>

                        <tbody>
                          {rows.map((r, i) => {
                            const zebra = i % 2 === 0;
                            const run = r.laatste_run;

                            const hasMatchmaking = !!r.matchmaking_id;
                            const canView = hasMatchmaking && run?.status === "klaar";

                            const isEditing = editId === r.id;
                            const mmId = r.matchmaking_id ?? "";
                            const rowBusy = busyId === mmId;

                            return (
                              <tr
                                key={r.id}
                                style={{
                                  backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                                  color: zebra ? "#000" : "#fff",
                                }}
                              >
                                <td className="py-3 px-4">{formatDate(r.evenement_datum)}</td>
                                <td className="py-3 px-4 font-semibold">{r.evenement_naam ?? "-"}</td>
                                <td className="py-3 px-4">{r.locatie ?? "-"}</td>

                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <input
                                      className="w-full orange-input h-9"
                                      value={editMatchmaker}
                                      onChange={(e) => setEditMatchmaker(e.target.value)}
                                      placeholder="Matchmaker *"
                                    />
                                  ) : (
                                    r.matchmaker ?? "-"
                                  )}
                                </td>

                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <input
                                      className="w-full orange-input h-9"
                                      value={editPromotor}
                                      onChange={(e) => setEditPromotor(e.target.value)}
                                      placeholder="Promotor (optioneel)"
                                    />
                                  ) : (
                                    r.promotor ?? "-"
                                  )}
                                </td>

                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <input
                                      className="w-full orange-input h-9"
                                      value={editHoofdofficial}
                                      onChange={(e) => setEditHoofdofficial(e.target.value)}
                                      placeholder="Hoofdofficial (optioneel)"
                                    />
                                  ) : (
                                    r.hoofdofficial ?? "-"
                                  )}
                                </td>

                                <td className="py-3 px-4 italic">
                                  {run?.status ?? "nog niet gecontroleerd"}
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex flex-wrap gap-3 items-center">
                                    <Link
                                      href={hasMatchmaking ? `/dashboard/matchmaker/controle/${r.matchmaking_id}` : "#"}
                                      className={[
                                        "px-3 py-1 text-sm rounded border",
                                        canView
                                          ? "bg-[#2f2f33] border-[var(--brand-orange)] text-white hover:bg-[var(--brand-orange)] hover:text-black"
                                          : "bg-zinc-200 border-zinc-300 text-zinc-400 cursor-not-allowed pointer-events-none",
                                      ].join(" ")}
                                      aria-disabled={!canView}
                                      tabIndex={canView ? 0 : -1}
                                    >
                                      Matchmaking
                                    </Link>

                                    {hasMatchmaking && (
                                      <button
                                        onClick={() => startControle(r.matchmaking_id!)}
                                        disabled={rowBusy || isBusy}
                                        className="px-3 py-1 text-sm bg-[#2f2f33] border border-[var(--brand-orange)] text-white rounded hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                                      >
                                        {rowBusy ? "Bezig…" : "Start controle"}
                                      </button>
                                    )}

                                    {!isEditing ? (
                                      <button
                                        onClick={() => openEdit(r)}
                                        className="px-3 py-1 text-sm bg-[#2f2f33] border border-zinc-300 text-white rounded hover:bg-white hover:text-black"
                                      >
                                        Bewerken
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => saveEdit(r.id)}
                                          className="px-3 py-1 text-sm bg-[#2f2f33] border border-[var(--brand-orange)] text-white rounded hover:bg-[var(--brand-orange)] hover:text-black"
                                        >
                                          Opslaan
                                        </button>
                                        <button
                                          onClick={closeEdit}
                                          className="px-3 py-1 text-sm bg-[#2f2f33] border border-zinc-300 text-white rounded hover:bg-white hover:text-black"
                                        >
                                          Annuleren
                                        </button>
                                      </>
                                    )}

                                    {hasMatchmaking && (
                                      <button
                                        onClick={() => deleteMatchmaking(r.matchmaking_id!)}
                                        disabled={rowBusy || isBusy}
                                        className="px-3 py-1 text-sm bg-[#2f2f33] border border-red-600 text-red-200 rounded hover:bg-red-600 hover:text-white disabled:opacity-60"
                                      >
                                        {rowBusy ? "Bezig…" : "Verwijderen"}
                                      </button>
                                    )}

                                    {isEditing && saveMsg && (
                                      <span
                                        className="text-xs"
                                        style={{ color: zebra ? "var(--brand-orange)" : "#ffb38a" }}
                                      >
                                        {saveMsg}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>

              <p className="mt-7 text-xs text-center text-zinc-500">© FightSupport</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}