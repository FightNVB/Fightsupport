"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const NVB_ORANGE = "#ff4d00";

type RequestRow = {
  id: string;
  status: string | null;
  matchmaking_id: string | null;
  partij_nr: number | null;
  bout_id: string | null;
  rule_code: string | null;
  controle_run_id: string | null;
  decision: string | null;
  decision_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type UploadRow = {
  matchmaking_id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  promotor?: string | null;
  matchmaker?: string | null;
  hoofdofficial?: string | null;
};

type VoteRow = {
  id: string;
  request_id: string;
  user_id: string;
  vote: "approve" | "reject" | string;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type MsgRow = {
  id: string;
  request_id: string;
  user_id: string;
  message: string;
  created_at: string | null;
};

type AttachmentRow = {
  id: string;
  request_id: string;
  storage_path: string;
  original_filename: string | null;
  content_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
};

function normStatus(s: any) {
  const x = String(s ?? "").trim().toLowerCase();
  if (!x) return "open";
  if (["open", "pending", "approved", "rejected", "tied", "closed"].includes(x)) return x;
  return x;
}

function statusLabel(s: any) {
  const x = normStatus(s);
  if (x === "open") return "NIEUW";
  if (x === "pending") return "PENDING";
  if (x === "approved") return "GOEDGEKEURD";
  if (x === "rejected") return "AFGEKEURD";
  if (x === "closed") return "GESLOTEN";
  return x.toUpperCase();
}

function fmtDateNL(d: string | null | undefined, withTime = false) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

const pageBg: CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #2b2b2b 0%, #202020 100%)",
  color: "#fff",
};

const topShell: CSSProperties = {
  border: "1px solid rgba(205,205,215,0.35)",
  borderRadius: 0,
  overflow: "hidden",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
  boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
};

const darkHeader: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(44,46,53,0.98) 0%, rgba(61,63,72,0.96) 26%, rgba(36,38,45,0.98) 50%, rgba(61,63,72,0.96) 74%, rgba(44,46,53,0.98) 100%)",
  borderBottom: `2px solid ${NVB_ORANGE}`,
};

const silverButton: CSSProperties = {
  background:
    "linear-gradient(180deg, #f7f7f8 0%, #cacbd0 18%, #f2f2f3 48%, #9c9ea6 78%, #d8d9dd 100%)",
  border: "1px solid rgba(88,91,100,0.9)",
  color: "#16181d",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 3px 8px rgba(0,0,0,0.18)",
};

const orangeButton: CSSProperties = {
  background: "linear-gradient(180deg, #ff6a00 0%, #ff4d00 58%, #bc3800 100%)",
  border: "1px solid rgba(255,200,160,0.35)",
  color: "#fff",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 14px rgba(255,77,0,0.22)",
};

const contentShell: CSSProperties = {
  marginTop: 14,
  borderRadius: 0,
  overflow: "hidden",
  background: "#121212",
  border: "1px solid rgba(115,118,128,0.6)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.75)",
};

const lightHeaderCard: CSSProperties = {
  borderRadius: 0,
  border: "1px solid rgba(122,124,132,0.45)",
  background: "#1c1c1c",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.78)",
};

const darkCard: CSSProperties = {
  borderRadius: 0,
  background: "linear-gradient(180deg, #10161d 0%, #060a10 100%)",
  border: "1px solid rgba(176,180,190,0.14)",
  boxShadow: "0 10px 22px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05)",
  color: "#fff",
};

const slimSilverFrame: CSSProperties = {
  border: "1px solid rgba(125,128,138,0.82)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 10px rgba(0,0,0,0.10)",
};

const inputStyle: CSSProperties = {
  background: "rgba(255,255,255,0.97)",
  border: "1px solid rgba(178,180,188,0.95)",
  color: "#111",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92)",
};

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section style={darkCard} className={`p-4 md:p-5 ${className}`}>
      {children}
    </section>
  );
}

export default function DispensatieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = String((params as any)?.requestId ?? "").trim();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reqRow, setReqRow] = useState<RequestRow | null>(null);
  const [uploadRow, setUploadRow] = useState<UploadRow | null>(null);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [msgText, setMsgText] = useState("");
  const [voteNote, setVoteNote] = useState("");
  const [decideReason, setDecideReason] = useState("");
  const [uploading, setUploading] = useState(false);

  const isSuperadmin = myRole === "superadmin";

  async function getUserRole() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      if (!uid) return setMyRole(null);

      const { data: ur, error: urErr } = await supabase.from("user_roles").select("role_id").eq("user_id", uid);
      if (urErr) throw urErr;

      const roleIds = (ur ?? []).map((r: any) => Number(r.role_id)).filter((n) => Number.isFinite(n));
      if (!roleIds.length) return setMyRole(null);

      const { data: roles, error: rErr } = await supabase.from("roles").select("id,name").in("id", roleIds);
      if (rErr) throw rErr;

      const names = (roles ?? []).map((r: any) => String(r.name ?? "").toLowerCase());
      if (names.includes("superadmin")) return setMyRole("superadmin");
      if (names.includes("dispensatie_admin")) return setMyRole("dispensatie_admin");
      if (names.includes("admin")) return setMyRole("admin");
      return setMyRole(names[0] ?? null);
    } catch {
      setMyRole(null);
    }
  }

  async function loadAll() {
    if (!requestId) return;
    try {
      setLoading(true);
      setErr(null);

      const { data: r, error: rErr } = await supabase
        .from("dispensatie_requests")
        .select(
          "id,status,matchmaking_id,partij_nr,bout_id,rule_code,controle_run_id,decision,decision_reason,decided_by,decided_at,created_at,updated_at"
        )
        .eq("id", requestId)
        .single();
      if (rErr) throw rErr;
      setReqRow(r as any);

      const mmId = (r as any)?.matchmaking_id ? String((r as any).matchmaking_id) : null;
      if (mmId) {
        const { data: ups, error: uErr } = await supabase
          .from("matchmaking_uploads")
          .select("matchmaking_id,evenement_naam,evenement_datum,uploaded_by,uploaded_at,promotor,matchmaker,hoofdofficial")
          .eq("matchmaking_id", mmId)
          .order("uploaded_at", { ascending: false })
          .limit(1);
        if (uErr) throw uErr;
        setUploadRow((ups?.[0] ?? null) as any);
      } else {
        setUploadRow(null);
      }

      const { data: v, error: vErr } = await supabase
        .from("dispensatie_votes")
        .select("id,request_id,user_id,vote,note,created_at,updated_at")
        .eq("request_id", requestId)
        .order("updated_at", { ascending: false });
      if (vErr) throw vErr;
      setVotes((v ?? []) as any);

      const { data: m, error: mErr } = await supabase
        .from("dispensatie_messages")
        .select("id,request_id,user_id,message,created_at")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (mErr) throw mErr;
      setMessages((m ?? []) as any);

      const { data: a, error: aErr } = await supabase
        .from("dispensatie_attachments")
        .select("id,request_id,storage_path,original_filename,content_type,uploaded_by,uploaded_at")
        .eq("request_id", requestId)
        .order("uploaded_at", { ascending: false });
      if (aErr) throw aErr;
      setAttachments((a ?? []) as any);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setReqRow(null);
      setUploadRow(null);
      setVotes([]);
      setMessages([]);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }

  async function callApi(path: string, body: any) {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token ?? null;
    if (!token) throw new Error("Niet ingelogd.");

    const r = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error ?? "API fout");
    return j;
  }

  async function postMessage() {
    try {
      setErr(null);
      const text = msgText.trim();
      if (!text) return;
      await callApi("/api/dispensatie/message", { request_id: requestId, message: text });
      setMsgText("");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  async function vote(v: "approve" | "reject") {
    try {
      setErr(null);
      await callApi("/api/dispensatie/vote", { request_id: requestId, vote: v, note: voteNote || null });
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  async function decide(decision: "approved" | "rejected") {
    try {
      setErr(null);
      if (!isSuperadmin) throw new Error("Alleen superadmin kan definitief beslissen.");
      const reason = decideReason.trim();
      if (!reason) throw new Error("Reden is verplicht.");
      await callApi("/api/dispensatie/decide", { request_id: requestId, decision, reason });
      setDecideReason("");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  async function uploadPdf(file: File) {
    try {
      setErr(null);
      setUploading(true);
      if (file.type !== "application/pdf") throw new Error("Alleen PDF toegestaan.");

      const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
      const path = `${requestId}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage.from("dispensatie").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;

      await callApi("/api/dispensatie/attachment-register", {
        request_id: requestId,
        storage_path: path,
        original_filename: file.name,
        content_type: "application/pdf",
      });

      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  async function openAttachment(a: AttachmentRow) {
    try {
      setErr(null);
      const { data, error } = await supabase.storage.from("dispensatie").createSignedUrl(a.storage_path, 60 * 10);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Geen signed url.");
      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  const voteCounts = useMemo(() => {
    let approve = 0;
    let reject = 0;
    for (const v of votes) {
      if (v.vote === "approve") approve++;
      if (v.vote === "reject") reject++;
    }
    return { total: votes.length, approve, reject };
  }, [votes]);

  useEffect(() => {
    getUserRole();
  }, []);

  useEffect(() => {
    loadAll();
  }, [requestId]);

  const mmId = reqRow?.matchmaking_id ?? null;
  const partijNr = reqRow?.partij_nr ?? null;
  const partijDetailHref = mmId && partijNr != null ? `/dashboard/matchmaker/matchmaking/${mmId}/partij/${partijNr}` : "#";
  const controleHref = mmId ? `/dashboard/admin/controle/${mmId}` : "#";

  return (
    <main style={pageBg}><style>{`.disp-silver-btn, .disp-silver-btn *{color:#000!important;}`}</style>
      <div className="mx-auto max-w-[1600px] px-4 py-3 md:px-5 md:py-4">
        <div style={topShell}>
          <div style={darkHeader} className="px-4 py-4 md:px-6 md:py-5">
            <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/dispensatie")}
                  className="disp-silver-btn inline-flex h-[38px] items-center border border-zinc-300 px-4 text-sm font-black uppercase !text-black"
                  style={silverButton}
                >
                  ← Overzicht
                </button>
                {mmId && partijNr != null ? (
                  <Link href={partijDetailHref} className="disp-silver-btn inline-flex h-[38px] items-center border border-zinc-300 px-4 text-sm font-black uppercase !text-black" style={silverButton}>
                    Partij detail
                  </Link>
                ) : null}
                {mmId ? (
                  <Link href={controleHref} className="disp-silver-btn inline-flex h-[38px] items-center border border-zinc-300 px-4 text-sm font-black uppercase !text-black" style={silverButton}>
                    Controle
                  </Link>
                ) : null}
              </div>

              <div className="flex justify-center">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-[#ff4d00]">FightSupport Admin</div>
              </div>

              <div className="flex items-center justify-start gap-3 md:justify-end">
                <span className="disp-silver-btn inline-flex h-[38px] items-center border border-zinc-300 px-4 text-sm font-black uppercase !text-black" style={silverButton}>
                  Rol: {myRole ?? "-"}
                </span>
              </div>
            </div>
          </div>

          <div style={contentShell}>
            <div className="p-4 md:p-5">
              <div style={lightHeaderCard} className="px-4 py-4 md:px-5 md:py-5">
                <div className="grid items-center gap-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <h1 className="text-2xl font-extrabold md:text-4xl" style={{ color: NVB_ORANGE }}>
                      Dispensatie Detail
                    </h1>
                    <div className="mt-1 text-sm text-[#334155]">Aanvraag, stemmen en besluit</div>
                    <div className="mt-1 text-xs text-[#64748b] break-all">{requestId || "-"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SmallStat label="Status" value={statusLabel(reqRow?.status)} status={normStatus(reqRow?.status)} />
                    <SmallStat label="Votes" value={voteCounts.total} />
                    <SmallStat label="Akkoord" value={voteCounts.approve} />
                    <SmallStat label="Afkeur" value={voteCounts.reject} />
                  </div>
                </div>
              </div>

              {err ? (
                <div className="mt-4  border border-red-200/60 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
                  {err}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 xl:grid-cols-12">
                <Panel className="xl:col-span-4">
                  <CardTitle title="Aanvraag" />
                  <div className="mt-3 space-y-2 text-sm text-white/88">
                    <InfoRow label="partijnr" value={reqRow?.partij_nr ?? "-"} />
                    <InfoRow label="rule" value={reqRow?.rule_code ?? "-"} />
                    <InfoRow label="bout_id" value={reqRow?.bout_id ?? "-"} mono />
                    <InfoRow label="matchmaking_id" value={reqRow?.matchmaking_id ?? "-"} mono />
                  </div>
                </Panel>

                <Panel className="xl:col-span-5">
                  <CardTitle title="Evenement" />
                  <div className="mt-3 grid gap-2 text-sm text-white/88 md:grid-cols-2">
                    <InfoRow label="evenement" value={uploadRow?.evenement_naam ?? "-"} />
                    <InfoRow label="datum" value={fmtDateNL(uploadRow?.evenement_datum)} />
                    <InfoRow label="matchmaker" value={uploadRow?.matchmaker ?? "-"} />
                    <InfoRow label="promotor" value={uploadRow?.promotor ?? "-"} />
                    <InfoRow label="hoofdofficial" value={uploadRow?.hoofdofficial ?? "-"} />
                    <InfoRow label="upload" value={fmtDateNL(uploadRow?.uploaded_at, true)} />
                  </div>
                </Panel>

                <Panel className="xl:col-span-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle title="PDF" />
                    <label className="inline-flex cursor-pointer items-center  px-3 py-2 text-sm font-bold" style={orangeButton}>
                      {uploading ? "..." : "Upload"}
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          e.currentTarget.value = "";
                          if (f) uploadPdf(f);
                        }}
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  <div className="mt-3 space-y-2">
                    {attachments.length === 0 ? (
                      <div className="text-sm text-white/55">Geen bijlagen.</div>
                    ) : (
                      attachments.slice(0, 4).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => openAttachment(a)}
                          className="block w-full  px-3 py-2 text-left text-sm font-semibold text-black hover:brightness-105"
                          style={{ ...silverButton, ...slimSilverFrame }}
                          title={a.original_filename ?? a.storage_path}
                        >
                          <div className="truncate">{a.original_filename ?? a.storage_path.split("/").pop() ?? "PDF"}</div>
                          <div className="mt-1 text-xs text-black/55">{fmtDateNL(a.uploaded_at, true)}</div>
                        </button>
                      ))
                    )}
                  </div>
                </Panel>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2 items-stretch">
                <Panel className="h-full flex flex-col min-h-[320px]">
                  <CardTitle title="Discussie" />
                  <div className="mt-3 flex-1 overflow-auto space-y-2 pr-1">
                    {messages.length === 0 ? (
                      <div className=" border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/55">
                        Nog geen berichten.
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div key={m.id} className=" border border-white/10 bg-white/5 px-3 py-2">
                          <div className="text-[11px] text-white/40">{m.user_id}</div>
                          <div className="mt-1 text-sm font-medium text-white">{m.message}</div>
                          <div className="mt-1 text-[11px] text-white/40">{fmtDateNL(m.created_at, true)}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      placeholder="Typ bericht..."
                      className="min-w-0 flex-1  px-3 py-2 text-sm outline-none"
                      style={inputStyle}
                    />
                    <button type="button" onClick={postMessage} className=" px-4 py-2 text-sm font-bold" style={orangeButton}>
                      Plaats
                    </button>
                  </div>
                </Panel>

                <Panel className="h-full flex flex-col min-h-[320px]">
                  <CardTitle title="Stemmen" />
                  <div className="mt-3 text-sm text-white/72">Notitie (optioneel)</div>
                  <textarea
                    value={voteNote}
                    onChange={(e) => setVoteNote(e.target.value)}
                    className="mt-2 w-full  px-3 py-2 text-sm outline-none"
                    rows={4}
                    placeholder="Bijv. reden / toelichting..."
                    style={inputStyle}
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => vote("approve")}
                      className=" px-4 py-2 text-sm font-bold text-white"
                      style={{
                        background: "linear-gradient(180deg, #22c55e 0%, #16a34a 58%, #0c7a34 100%)",
                        border: "1px solid rgba(170,255,200,0.28)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 6px 14px rgba(22,163,74,0.20)",
                      }}
                    >
                      Stem akkoord
                    </button>
                    <button
                      type="button"
                      onClick={() => vote("reject")}
                      className=" px-4 py-2 text-sm font-bold text-white"
                      style={{
                        background: "linear-gradient(180deg, #ef4444 0%, #dc2626 58%, #a31313 100%)",
                        border: "1px solid rgba(255,190,190,0.24)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 6px 14px rgba(220,38,38,0.20)",
                      }}
                    >
                      Stem afkeur
                    </button>
                    <div className="ml-auto text-xs text-white/56">status wordt <b className="text-white/80">pending</b></div>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle title="Superadmin besluit" />
                      {reqRow?.decision ? <StatusBadge status={String(reqRow.decision).toLowerCase()}>{String(reqRow.decision).toUpperCase()}</StatusBadge> : null}
                    </div>
                    <textarea
                      value={decideReason}
                      onChange={(e) => setDecideReason(e.target.value)}
                      className="mt-3 w-full  px-3 py-2 text-sm outline-none"
                      rows={3}
                      placeholder="Reden (verplicht)..."
                      style={inputStyle}
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => decide("approved")}
                        disabled={!isSuperadmin}
                        className=" px-4 py-2 text-sm font-bold"
                        style={isSuperadmin ? orangeButton : { ...silverButton, opacity: 0.5 }}
                      >
                        Definitief goed
                      </button>
                      <button
                        type="button"
                        onClick={() => decide("rejected")}
                        disabled={!isSuperadmin}
                        className=" px-4 py-2 text-sm font-bold"
                        style={isSuperadmin ? { ...silverButton, ...slimSilverFrame } : { ...silverButton, opacity: 0.5 }}
                      >
                        Definitief afkeur
                      </button>
                      <button
                        type="button"
                        onClick={() => loadAll()}
                        className="ml-auto  px-4 py-2 text-sm font-bold"
                        style={{ ...silverButton, ...slimSilverFrame }}
                      >
                        Refresh
                      </button>
                    </div>

                    {reqRow?.decision ? (
                      <div className="mt-3 text-xs text-white/60">
                        {reqRow.decision_reason ?? "-"} • {fmtDateNL(reqRow.decided_at, true)} • {reqRow.decided_by ?? "-"}
                      </div>
                    ) : null}
                  </div>
                </Panel>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-[#475569]">
                <div>{loading ? "Laden..." : ""}</div>
                <div>{reqRow?.updated_at ? `Laatste update: ${fmtDateNL(reqRow.updated_at, true)}` : ""}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function CardTitle({ title }: { title: string }) {
  return <h2 className="text-xl font-extrabold leading-none md:text-2xl">{title}</h2>;
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-[110px] shrink-0 text-white/50">{label}:</span>
      <span className={`${mono ? "font-mono text-[13px]" : ""} break-all text-white`}>{value}</span>
    </div>
  );
}

function SmallStat({ label, value, status }: { label: string; value: React.ReactNode; status?: string }) {
  return (
    <div className=" border border-[#aeb2bb] bg-white px-3 py-2 text-right shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b]">{label}</div>
      <div className="mt-1 flex justify-end">{status ? <StatusBadge status={status}>{value}</StatusBadge> : <span className="text-base font-extrabold text-[#111827]">{value}</span>}</div>
    </div>
  );
}

function StatusBadge({ status, children }: { status: string; children: React.ReactNode }) {
  let style: CSSProperties = {
    background: "#eceff3",
    border: "1px solid #c4c9d1",
    color: "#334155",
  };

  if (status === "open" || status === "nieuw") {
    style = { background: "#ffedd5", border: "1px solid #fdba74", color: "#c2410c" };
  } else if (status === "pending") {
    style = { background: "#fef3c7", border: "1px solid #fcd34d", color: "#92400e" };
  } else if (status === "approved") {
    style = { background: "#dcfce7", border: "1px solid #86efac", color: "#166534" };
  } else if (status === "rejected") {
    style = { background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b" };
  }

  return (
    <span className="inline-flex min-h-[24px] items-center border px-2 text-xs font-black uppercase tracking-[0.08em]" style={style}>
      {children}
    </span>
  );
}
