"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

type RequestStatus = "open" | "approved" | "rejected";

type RequestRow = {
  id: string;
  matchmaking_upload_id: string;
  matchmaking_id: string | null;
  current_bondteam: string | null;
  requested_bondteam: string;
  reason: string;
  status: RequestStatus;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  reviewed_by: string | null;
  requested_by: string | null;
  matchmaking_uploads?: {
    evenement_naam?: string | null;
    evenement_datum?: string | null;
    locatie?: string | null;
    matchmaker?: string | null;
    promotor?: string | null;
    bondteam?: string | null;
  } | null;
};

const NVB_ORANGE = "#ff5a0a";

function safe(v: unknown) {
  return String(v ?? "").trim();
}

function roleNorm(v: unknown) {
  return safe(v).toLowerCase();
}

function isElevatedRole(role: string | null) {
  const r = roleNorm(role);
  return r === "admin" || r === "superadmin";
}

function fmtDate(v: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("nl-NL");
}

function fmtDateTime(v: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("nl-NL");
}

function statusText(status: RequestStatus) {
  if (status === "approved") return "GOEDGEKEURD";
  if (status === "rejected") return "AFGEWEZEN";
  return "OPEN";
}

function statusBadgeStyle(status: RequestStatus) {
  if (status === "approved") {
    return {
      background: "linear-gradient(180deg, #27b257 0%, #169346 100%)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.28)",
    };
  }
  if (status === "rejected") {
    return {
      background: "linear-gradient(180deg, #ef4c4c 0%, #d82626 100%)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.28)",
    };
  }
  return {
    background: "linear-gradient(180deg, #ff7a24 0%, #ff5a0a 100%)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.28)",
  };
}

export default function BondteamVerzoekenBeheerPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("open");
  const [search, setSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    setLoading(true);
    setMsg("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("auth getUser error", authError);
    }

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("user_profiles role error", profileError);
    }

    const nextRole = profile?.role ?? null;
    setRole(nextRole);

    if (!isElevatedRole(nextRole)) {
      setLoading(false);
      return;
    }

    await loadRequests();
  }

  async function loadRequests() {
    setLoading(true);
    setMsg("");

    const { data, error } = await supabase
      .from("matchmaking_change_requests")
      .select(`
        id,
        matchmaking_upload_id,
        matchmaking_id,
        current_bondteam,
        requested_bondteam,
        reason,
        status,
        review_note,
        reviewed_at,
        created_at,
        reviewed_by,
        requested_by,
        matchmaking_uploads:matchmaking_upload_id (
          evenement_naam,
          evenement_datum,
          locatie,
          matchmaker,
          promotor,
          bondteam
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadRequests error", error);
      setRows([]);
      setLoading(false);
      return;
    }

    const mapped = ((data ?? []) as any[]).map((r) => ({
      id: r.id,
      matchmaking_upload_id: r.matchmaking_upload_id,
      matchmaking_id: r.matchmaking_id,
      current_bondteam: r.current_bondteam,
      requested_bondteam: r.requested_bondteam,
      reason: r.reason,
      status: r.status,
      review_note: r.review_note,
      reviewed_at: r.reviewed_at,
      created_at: r.created_at,
      reviewed_by: r.reviewed_by,
      requested_by: r.requested_by,
      matchmaking_uploads: Array.isArray(r.matchmaking_uploads)
        ? r.matchmaking_uploads[0] ?? null
        : r.matchmaking_uploads ?? null,
    })) as RequestRow[];

    setRows(mapped);
    setLoading(false);
  }

  async function reviewRequest(requestId: string, action: "approved" | "rejected") {
    try {
      setBusyId(requestId);
      setMsg("");

      const res = await authedFetch("/api/matchmaking/review-bondteam-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: requestId,
          action,
          review_note: safe(reviewNotes[requestId]) || null,
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(payload?.error || `Actie mislukt (${res.status}).`);
        return;
      }

      setMsg(
        action === "approved"
          ? "✅ Bondteam-verzoek goedgekeurd."
          : "✅ Bondteam-verzoek afgewezen."
      );

      await loadRequests();
    } catch (err) {
      console.error("reviewRequest error", err);
      setMsg("❌ Onverwachte fout bij verwerken van verzoek.");
    } finally {
      setBusyId(null);
    }
  }

  const filteredRows = useMemo(() => {
    const term = safe(search).toLowerCase();

    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!term) return true;

      const ev = safe(r.matchmaking_uploads?.evenement_naam).toLowerCase();
      const loc = safe(r.matchmaking_uploads?.locatie).toLowerCase();
      const mm = safe(r.matchmaking_id).toLowerCase();
      const cur = safe(r.current_bondteam).toLowerCase();
      const req = safe(r.requested_bondteam).toLowerCase();
      const rea = safe(r.reason).toLowerCase();
      const matchmaker = safe(r.matchmaking_uploads?.matchmaker).toLowerCase();
      const promotor = safe(r.matchmaking_uploads?.promotor).toLowerCase();

      return (
        ev.includes(term) ||
        loc.includes(term) ||
        mm.includes(term) ||
        cur.includes(term) ||
        req.includes(term) ||
        rea.includes(term) ||
        matchmaker.includes(term) ||
        promotor.includes(term)
      );
    });
  }, [rows, statusFilter, search]);

  if (!loading && !isElevatedRole(role)) {
    return (
      <main
        className="min-h-screen px-4 py-5 md:px-6"
        style={{
          background:
            "linear-gradient(180deg, #ececed 0%, #dbdbdd 48%, #d2d2d5 100%)",
        }}
      >
        <div className="mx-auto max-w-[1400px]">
          <div
            className="rounded-[26px] p-[6px]"
            style={{
              background:
                "linear-gradient(180deg, #0f1012 0%, #d5d5d8 14%, #fafafa 24%, #96989e 40%, #1d1f24 100%)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.22)",
            }}
          >
            <div
              className="rounded-[22px] p-[14px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(216,216,219,0.94) 100%)",
              }}
            >
              <div
                className="rounded-[18px] p-8 text-center"
                style={{
                  background:
                    "linear-gradient(180deg, #f7f7f8 0%, #ececee 100%)",
                  border: "1px solid rgba(20,20,24,0.65)",
                }}
              >
                <h1
                  className="text-[34px] font-black md:text-[44px]"
                  style={{
                    color: NVB_ORANGE,
                    textShadow: "0 2px 0 rgba(255,255,255,0.5), 0 8px 18px rgba(0,0,0,0.12)",
                  }}
                >
                  Geen toegang
                </h1>
                <p className="mt-3 text-[17px] text-[#46484f]">
                  Alleen admin of superadmin mag deze pagina bekijken.
                </p>

                <div className="mt-6">
                  <Link
                    href="/dashboard/admin/beheer"
                    className="inline-flex items-center justify-center rounded-[14px] px-5 py-3 text-[16px] font-bold"
                    style={{
                      background:
                        "linear-gradient(180deg, #fcfcfc 0%, #e7e7e9 100%)",
                      color: "#17181c",
                      border: "1px solid rgba(20,20,24,0.75)",
                      boxShadow:
                        "0 8px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
                    }}
                  >
                    ← Terug naar Beheer
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen px-4 py-5 md:px-6"
      style={{
        background:
          "linear-gradient(180deg, #ececed 0%, #dbdbdd 48%, #d2d2d5 100%)",
      }}
    >
      <div className="mx-auto max-w-[1680px]">
        <div
          className="rounded-[28px] p-[6px]"
          style={{
            background:
              "linear-gradient(180deg, #0f1012 0%, #d7d7da 12%, #fafafa 20%, #a0a2a8 33%, #23252a 100%)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.24)",
          }}
        >
          <div
            className="rounded-[24px] p-[14px]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(217,217,220,0.96) 100%)",
            }}
          >
            <div
              className="overflow-hidden rounded-[20px]"
              style={{
                border: "1px solid rgba(18,18,22,0.82)",
                background:
                  "linear-gradient(180deg, #f7f7f8 0%, #ececee 24%, #d7d8db 100%)",
              }}
            >
              {/* Header */}
              <div
                className="px-5 py-5 md:px-8 md:py-6"
                style={{
                  background:
                    "linear-gradient(90deg, #3a3c43 0%, #2f3138 22%, #26282f 50%, #2f3138 78%, #3a3c43 100%)",
                }}
              >
                <div
                  className="rounded-[20px] px-5 py-4 md:px-6"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.16) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 28px rgba(0,0,0,0.22)",
                  }}
                >
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="min-w-0">
                      <div
                        className="text-[14px] font-black tracking-[0.18em] md:text-[15px]"
                        style={{ color: NVB_ORANGE }}
                      >
                        FIGHTSUPPORT
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-white/88 md:text-[14px]">
                        Bondteam wijzigingsverzoeken
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div
                        className="rounded-[22px] p-[7px]"
                        style={{
                          background:
                            "linear-gradient(180deg, #6d7078 0%, #d7d7da 16%, #f7f7f8 34%, #9c9ea4 58%, #4f5259 78%, #2b2d33 100%)",
                          boxShadow:
                            "0 12px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.28)",
                        }}
                      >
                        <div
                          className="rounded-[18px] p-2.5"
                          style={{
                            border: "1px solid rgba(255,255,255,0.18)",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.22) 100%)",
                          }}
                        >
                          <Image
                            src="/branding/fightsupport/logo-dark.png"
                            alt="FightSupport"
                            width={340}
                            height={92}
                            priority
                            className="h-auto w-[280px] object-contain md:w-[340px]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Link
                        href="/dashboard/admin/beheer"
                        className="inline-flex items-center justify-center rounded-[14px] px-5 py-3 text-[16px] font-bold"
                        style={{
                          background:
                            "linear-gradient(180deg, #fcfcfc 0%, #e8e8ea 20%, #d6d6d8 55%, #f5f5f5 100%)",
                          color: "#17181c",
                          border: "1px solid rgba(255,255,255,0.42)",
                          boxShadow:
                            "0 8px 18px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 0 0 1px rgba(0,0,0,0.12)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ← Terug naar Beheer
                      </Link>
                    </div>
                  </div>
                </div>

                <div
                  className="mt-4 h-[2px] w-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${NVB_ORANGE}, transparent)`,
                  }}
                />
              </div>

              {/* Content */}
              <section className="px-5 py-7 md:px-8 md:py-8">
                <div className="text-center">
                  <h1
                    className="text-[42px] font-black tracking-tight md:text-[56px]"
                    style={{
                      color: NVB_ORANGE,
                      textShadow:
                        "0 2px 0 rgba(255,255,255,0.56), 0 10px 18px rgba(0,0,0,0.12)",
                    }}
                  >
                    Bondteam Verzoeken
                  </h1>

                  <div
                    className="mx-auto mt-3 h-[4px] w-[190px] rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${NVB_ORANGE}, transparent)`,
                    }}
                  />

                  <p className="mx-auto mt-4 max-w-[860px] text-[17px] text-[#3f4249] md:text-[18px]">
                    Officials kunnen verzoeken indienen. Alleen admin of superadmin kan verwerken.
                  </p>
                </div>

                <div
                  className="mt-7 rounded-[24px] p-4 md:p-5"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(255,255,255,0.60) 15%, rgba(255,255,255,0.90) 50%, rgba(255,255,255,0.60) 85%, rgba(0,0,0,0.05) 100%)",
                    border: "1px solid rgba(86,88,95,0.38)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.72), 0 14px 28px rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "all" | RequestStatus)}
                        className="h-[50px] min-w-[180px] rounded-[14px] px-4 text-[15px] font-semibold outline-none"
                        style={{
                          background:
                            "linear-gradient(180deg, #fbfbfb 0%, #eeeeef 100%)",
                          color: "#17181c",
                          border: "1px solid rgba(20,20,24,0.60)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.90), 0 6px 14px rgba(0,0,0,0.06)",
                        }}
                      >
                        <option value="open">Open</option>
                        <option value="approved">Goedgekeurd</option>
                        <option value="rejected">Afgewezen</option>
                        <option value="all">Alles</option>
                      </select>

                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Zoek op evenement, matchmaking ID, bondteam, reden..."
                        className="h-[50px] min-w-[260px] flex-1 rounded-[14px] px-4 text-[15px] outline-none"
                        style={{
                          background:
                            "linear-gradient(180deg, #fbfbfb 0%, #eeeeef 100%)",
                          color: "#17181c",
                          border: "1px solid rgba(20,20,24,0.60)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.90), 0 6px 14px rgba(0,0,0,0.06)",
                        }}
                      />

                      <button
                        onClick={() => void loadRequests()}
                        className="h-[50px] rounded-[14px] px-5 text-[15px] font-extrabold"
                        style={{
                          background:
                            "linear-gradient(180deg, #ff6c1e 0%, #ff5a0a 55%, #df4b00 100%)",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.60)",
                          boxShadow:
                            "0 8px 18px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(0,0,0,0.12)",
                        }}
                      >
                        Vernieuwen
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[14px] font-semibold text-[#4a4d53]">
                      <span>
                        Totaal:{" "}
                        <span className="font-black text-[#17181c]">{rows.length}</span>
                      </span>
                      <span>
                        Zichtbaar:{" "}
                        <span className="font-black text-[#17181c]">{filteredRows.length}</span>
                      </span>
                      {msg ? <span style={{ color: NVB_ORANGE }}>{msg}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  {loading ? (
                    <div
                      className="rounded-[20px] px-6 py-10 text-center text-[17px] font-semibold text-[#5b5e65]"
                      style={{
                        background:
                          "linear-gradient(180deg, #fafafa 0%, #efeff0 100%)",
                        border: "1px dashed rgba(20,20,24,0.26)",
                      }}
                    >
                      Laden…
                    </div>
                  ) : filteredRows.length === 0 ? (
                    <div
                      className="rounded-[20px] px-6 py-10 text-center text-[17px] font-semibold text-[#5b5e65]"
                      style={{
                        background:
                          "linear-gradient(180deg, #fafafa 0%, #efeff0 100%)",
                        border: "1px dashed rgba(20,20,24,0.26)",
                      }}
                    >
                      Geen bondteam-verzoeken gevonden.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRows.map((r) => {
                        const upload = r.matchmaking_uploads ?? null;
                        const busy = busyId === r.id;
                        const isOpen = r.status === "open";
                        const badgeStyle = statusBadgeStyle(r.status);

                        return (
                          <div
                            key={r.id}
                            className="rounded-[22px] p-4 md:p-5"
                            style={{
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,242,243,0.98) 24%, rgba(225,225,228,0.98) 58%, rgba(248,248,249,0.98) 100%)",
                              border: "1px solid rgba(18,18,22,0.76)",
                              boxShadow:
                                "0 14px 28px rgba(0,0,0,0.10), inset 0 0 0 1px rgba(255,255,255,0.78)",
                            }}
                          >
                            <div className="grid gap-4 xl:grid-cols-[1.7fr_0.95fr]">
                              <div>
                                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                                  <span
                                    className="rounded-full px-3 py-1.5 text-[11px] font-black tracking-[0.08em]"
                                    style={badgeStyle}
                                  >
                                    {statusText(r.status)}
                                  </span>

                                  <span
                                    className="rounded-full px-3 py-1.5 text-[12px] font-bold"
                                    style={{
                                      background:
                                        "linear-gradient(180deg, #ffffff 0%, #ececee 100%)",
                                      color: "#17181c",
                                      border: "1px solid rgba(20,20,24,0.14)",
                                    }}
                                  >
                                    {safe(r.current_bondteam) || "-"} → {safe(r.requested_bondteam)}
                                  </span>

                                  <span className="text-[12px] font-medium text-[#666972]">
                                    Ingediend: {fmtDateTime(r.created_at)}
                                  </span>
                                </div>

                                <h2 className="text-[24px] font-black leading-tight text-[#17181c]">
                                  {upload?.evenement_naam || "Onbekend evenement"}
                                </h2>

                                <div className="mt-3 grid gap-x-5 gap-y-2 text-[14px] text-[#3f4249] md:grid-cols-2">
                                  <div>
                                    <span className="font-black text-[#17181c]">Datum:</span>{" "}
                                    {fmtDate(upload?.evenement_datum ?? null)}
                                  </div>
                                  <div>
                                    <span className="font-black text-[#17181c]">Locatie:</span>{" "}
                                    {upload?.locatie ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-black text-[#17181c]">Matchmaker:</span>{" "}
                                    {upload?.matchmaker ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-black text-[#17181c]">Promotor:</span>{" "}
                                    {upload?.promotor ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-black text-[#17181c]">Huidig bondteam:</span>{" "}
                                    {upload?.bondteam ?? r.current_bondteam ?? "-"}
                                  </div>
                                  <div>
                                    <span className="font-black text-[#17181c]">Gevraagd bondteam:</span>{" "}
                                    {r.requested_bondteam}
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="font-black text-[#17181c]">Matchmaking ID:</span>{" "}
                                    {r.matchmaking_id ?? "-"}
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="mb-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#17181c]">
                                    Reden van verzoek
                                  </div>
                                  <div
                                    className="rounded-[14px] px-4 py-3 text-[14px] text-[#2f3238]"
                                    style={{
                                      background:
                                        "linear-gradient(180deg, #ffffff 0%, #f2f2f3 100%)",
                                      border: "1px solid rgba(20,20,24,0.12)",
                                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)",
                                    }}
                                  >
                                    {r.reason}
                                  </div>
                                </div>

                                {r.review_note ? (
                                  <div className="mt-3">
                                    <div className="mb-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#17181c]">
                                      Review notitie
                                    </div>
                                    <div
                                      className="rounded-[14px] px-4 py-3 text-[14px] text-[#2f3238]"
                                      style={{
                                        background:
                                          "linear-gradient(180deg, rgba(255,90,10,0.09) 0%, rgba(255,255,255,0.82) 100%)",
                                        border: "1px solid rgba(255,90,10,0.18)",
                                      }}
                                    >
                                      {r.review_note}
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              <div
                                className="rounded-[18px] p-4"
                                style={{
                                  background:
                                    "linear-gradient(180deg, #2d3037 0%, #202229 45%, #15171b 100%)",
                                  border: "1px solid #0f1013",
                                  boxShadow:
                                    "0 14px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
                                }}
                              >
                                <div
                                  className="mb-3 h-[3px] w-full rounded-full"
                                  style={{
                                    background: `linear-gradient(90deg, ${NVB_ORANGE} 0%, rgba(255,90,10,0.18) 100%)`,
                                  }}
                                />
                                <div className="text-[19px] font-black text-white">
                                  Beoordeling
                                </div>

                                {isOpen ? (
                                  <>
                                    <textarea
                                      rows={6}
                                      value={reviewNotes[r.id] ?? ""}
                                      onChange={(e) =>
                                        setReviewNotes((prev) => ({
                                          ...prev,
                                          [r.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Optionele notitie bij goedkeuren of afwijzen"
                                      className="mt-3 w-full rounded-[14px] px-4 py-3 text-[14px] outline-none"
                                      style={{
                                        background:
                                          "linear-gradient(180deg, #fafafa 0%, #f0f0f1 100%)",
                                        color: "#17181c",
                                        border: "1px solid rgba(255,255,255,0.20)",
                                        boxShadow:
                                          "inset 0 1px 0 rgba(255,255,255,0.90), 0 6px 14px rgba(0,0,0,0.14)",
                                      }}
                                    />

                                    <div className="mt-4 flex flex-wrap gap-2.5">
                                      <button
                                        onClick={() => void reviewRequest(r.id, "approved")}
                                        disabled={busy}
                                        className="rounded-[12px] px-4 py-2.5 text-[14px] font-extrabold disabled:opacity-60"
                                        style={{
                                          background:
                                            "linear-gradient(180deg, #29b35a 0%, #169446 100%)",
                                          color: "#fff",
                                          border: "1px solid rgba(255,255,255,0.34)",
                                          boxShadow: "0 8px 16px rgba(0,0,0,0.20)",
                                        }}
                                      >
                                        {busy ? "Bezig…" : "Goedkeuren"}
                                      </button>

                                      <button
                                        onClick={() => void reviewRequest(r.id, "rejected")}
                                        disabled={busy}
                                        className="rounded-[12px] px-4 py-2.5 text-[14px] font-extrabold disabled:opacity-60"
                                        style={{
                                          background:
                                            "linear-gradient(180deg, #ef4d4d 0%, #d82626 100%)",
                                          color: "#fff",
                                          border: "1px solid rgba(255,255,255,0.34)",
                                          boxShadow: "0 8px 16px rgba(0,0,0,0.20)",
                                        }}
                                      >
                                        {busy ? "Bezig…" : "Afwijzen"}
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="mt-3 space-y-2.5 text-[14px] text-white/84">
                                    <div>
                                      Verwerkt op:{" "}
                                      <span className="font-bold text-white">
                                        {fmtDateTime(r.reviewed_at)}
                                      </span>
                                    </div>
                                    <div>
                                      Status:{" "}
                                      <span className="font-bold text-white">
                                        {statusText(r.status)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}