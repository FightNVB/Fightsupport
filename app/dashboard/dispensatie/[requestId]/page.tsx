"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  return x.toUpperCase();
}

function fmtDateNL(d: string | null | undefined) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const mmId = reqRow?.matchmaking_id ?? null;
  const partijNr = reqRow?.partij_nr ?? null;
  const controlDetailHref = mmId && partijNr != null ? `/dashboard/admin/controle/${mmId}/${partijNr}` : "#";

  return (
    <main
      className="min-h-screen px-4 py-6"
      style={{
        background:
          "radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.90), rgba(235,235,235,0.96) 55%, rgba(225,225,225,1) 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-[1200px]">
        {/* OUTER FRAME */}
        <div
          className="rounded-[32px] p-[6px]"
          style={{
            background: "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.7), 0 22px 70px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="relative rounded-[28px]"
            style={{
              background: "linear-gradient(180deg, #f2f2f2 0%, #e6e6e6 100%)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            {/* TOPBAR */}
            <div
              className="px-6 py-5 rounded-t-[28px]"
              style={{
                background: "linear-gradient(180deg, #3b3b3b 0%, #2f2f2f 100%)",
                borderBottom: "2px solid rgba(0,0,0,0.25)",
              }}
            >
              <div className="grid grid-cols-3 items-center gap-4">
                <div className="justify-self-start leading-tight">
                  <div className="font-extrabold tracking-[0.22em]" style={{ color: NVB_ORANGE, fontSize: 14 }}>
                    FIGHTSUPPORT
                  </div>
                  <div className="text-xs text-white/70">Vechtsport ondersteuning</div>
                </div>

                <div className="justify-self-center">
                  <div
                    className="rounded-[28px] p-[6px]"
                    style={{
                      background:
                        "linear-gradient(180deg, #f5f5f5 0%, #cfcfcf 35%, #8f8f8f 65%, #f0f0f0 100%)",
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.70), 0 12px 28px rgba(0,0,0,0.50)",
                    }}
                  >
                    <div
                      className="rounded-[22px] p-3"
                      style={{
                        background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(4,4,4,0.96))",
                        border: "3px solid rgba(220,220,220,0.50)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                      }}
                    >
                      <Image src="/branding/fightsupport/logo-dark.png" alt="FightSupport" width={120} height={120} priority />
                    </div>
                  </div>
                </div>

                <div className="justify-self-end flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/dispensatie")}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                  >
                    ← Overzicht
                  </button>

                  {mmId && partijNr != null ? (
                    <Link
                      href={controlDetailHref}
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                    >
                      Controle detail
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
                      Controle detail
                    </span>
                  )}

                  <span className="ml-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white">
                    Rol: {myRole ?? "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="px-6 py-7">
              <div className="mt-2 text-center">
                <div className="text-3xl font-extrabold" style={{ color: NVB_ORANGE }}>
                  Dispensatie detail
                </div>
                <div className="mt-1 text-xs text-black/55">{requestId ? `Request: ${requestId}` : "—"}</div>
              </div>

              <div className="mt-6 space-y-3">
        {err ? (
          <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">{err}</div>
        ) : null}

        {/* Compact top row */}
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Status block */}
          <div className="lg:col-span-4 rounded-lg border border-black/15 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-black">Status</div>
              <span
                className="rounded px-2 py-1 text-xs font-bold text-white"
                style={{ background: "linear-gradient(180deg, #3a3a3a, #2e2e2e)", border: "1px solid rgba(0,0,0,0.35)" }}
              >
                {statusLabel(reqRow?.status)}
              </span>
            </div>

            <div className="mt-2 space-y-1 text-xs text-black/75">
              <div>
                <span className="text-black/50">matchmaking_id:</span>{" "}
                <span className="font-mono text-black/90">{reqRow?.matchmaking_id ?? "-"}</span>
              </div>
              <div className="flex gap-3">
                <div>
                  <span className="text-black/50">partij_nr:</span>{" "}
                  <span className="font-mono text-black/90">{reqRow?.partij_nr ?? "-"}</span>
                </div>
                <div>
                  <span className="text-black/50">rule:</span>{" "}
                  <span className="font-mono text-black/90">{reqRow?.rule_code ?? "-"}</span>
                </div>
              </div>
              <div>
                <span className="text-black/50">bout_id:</span>{" "}
                <span className="font-mono text-black/90">{reqRow?.bout_id ?? "-"}</span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded border border-black/15 bg-white/55 px-2 py-1">Votes: {voteCounts.total}</span>
              <span className="rounded border border-black/15 bg-white/55 px-2 py-1">Akkoord: {voteCounts.approve}</span>
              <span className="rounded border border-black/15 bg-white/55 px-2 py-1">Afkeur: {voteCounts.reject}</span>
            </div>
          </div>

          {/* Event block */}
          <div className="lg:col-span-5 rounded-lg border border-black/15 bg-white/70 p-3">
            <div className="text-sm font-semibold text-black">Evenement</div>

            <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-black/85">
              <div className="flex items-center gap-2">
                <span className="w-16 text-black/50">Naam:</span>
                <span className="text-black">{uploadRow?.evenement_naam ?? "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-black/50">Datum:</span>
                <span className="text-black">{fmtDateNL(uploadRow?.evenement_datum)}</span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-3 text-xs text-black/80">
              <div>
                <span className="text-black/50">Matchmaker:</span>{" "}
                {(uploadRow as any)?.matchmaker ?? "-"}
              </div>
              <div>
                <span className="text-black/50">Promotor:</span>{" "}
                {(uploadRow as any)?.promotor ?? "-"}
              </div>
              <div>
                <span className="text-black/50">Hoofdofficial:</span>{" "}
                {(uploadRow as any)?.hoofdofficial ?? "-"}
              </div>
            </div>

            <div className="mt-2 text-[11px] text-black/45">
              upload: {fmtDateNL(uploadRow?.uploaded_at)} • uploaded_by:{" "}
              <span className="font-mono">{uploadRow?.uploaded_by ?? "-"}</span>
            </div>
          </div>

          {/* PDF block */}
          <div className="lg:col-span-3 rounded-lg border border-black/15 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-black">PDF</div>
                <div className="text-[11px] text-black/55">Bijlage voor beoordeling</div>
              </div>

              <label
                className="inline-flex cursor-pointer items-center rounded px-2.5 py-1 text-xs font-bold text-white hover:opacity-95"
                style={{ background: "linear-gradient(#ff7a1a, #e45d00)", border: "1px solid rgba(196,77,0,0.85)" }}
              >
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

            {attachments.length === 0 ? (
              <div className="mt-2 text-xs text-black/60">Geen bijlagen.</div>
            ) : (
              <div className="mt-2 space-y-2">
                {attachments.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => openAttachment(a)}
                    className="w-full rounded border border-black/15 bg-white/75 px-2 py-2 text-left text-xs text-black/85 hover:bg-white"
                    title={a.original_filename ?? a.storage_path}
                  >
                    <div className="truncate font-semibold">
                      {a.original_filename ?? a.storage_path.split("/").pop() ?? "PDF"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-black/45">{fmtDateNL(a.uploaded_at)}</div>
                  </button>
                ))}

                {attachments.length > 3 ? (
                  <div className="text-[11px] text-black/45">+ {attachments.length - 3} meer…</div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Lower row */}
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Discussie */}
          <div className="rounded-lg border border-black/15 bg-white/70 p-3">
            <div className="text-sm font-semibold text-black">Discussie</div>

            <div className="mt-2 space-y-2 max-h-[260px] overflow-auto pr-1">
              {messages.length === 0 ? (
                <div className="text-xs text-black/60">Nog geen berichten.</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="rounded border border-black/15 bg-white/75 p-2">
                    <div className="text-[11px] text-black/50 font-mono">{m.user_id}</div>
                    <div className="text-sm text-black">{m.message}</div>
                    <div className="mt-1 text-[11px] text-black/45">{fmtDateNL(m.created_at)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Typ bericht..."
                className="w-full rounded border border-black/15 bg-white/80 px-3 py-2 text-sm text-black placeholder:text-black/35 outline-none focus:border-black/25"
              />
              <button
                type="button"
                onClick={postMessage}
                className="rounded px-4 py-2 text-sm font-bold text-white hover:opacity-95"
                style={{ background: "linear-gradient(#ff7a1a, #e45d00)", border: "1px solid rgba(196,77,0,0.85)" }}
              >
                Plaats
              </button>
            </div>
          </div>

          {/* Stemmen */}
          <div className="rounded-lg border border-black/15 bg-white/70 p-3">
            <div className="text-sm font-semibold text-black">Stemmen</div>

            <div className="mt-2">
              <div className="text-xs text-black/60 mb-1">Notitie (optioneel)</div>
              <textarea
                value={voteNote}
                onChange={(e) => setVoteNote(e.target.value)}
                className="w-full rounded border border-black/15 bg-white/80 px-3 py-2 text-sm text-black placeholder:text-black/35 outline-none focus:border-black/25"
                rows={3}
                placeholder="Bijv. reden / toelichting..."
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => vote("approve")}
                className="rounded bg-green-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                Stem akkoord
              </button>
              <button
                type="button"
                onClick={() => vote("reject")}
                className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                Stem afkeur
              </button>
              <div className="ml-auto text-xs text-black/55 self-center">
                status wordt <b>pending</b> na stem
              </div>
            </div>

            {/* Superadmin besluit compact */}
            <div className="mt-3 border-t border-black/10 pt-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-black">Superadmin besluit</div>
                {reqRow?.decision ? (
                  <span className="rounded border border-black/15 bg-white/55 px-2 py-1 text-xs text-black">
                    {String(reqRow.decision).toUpperCase()}
                  </span>
                ) : null}
              </div>

              <textarea
                value={decideReason}
                onChange={(e) => setDecideReason(e.target.value)}
                className="mt-2 w-full rounded border border-black/15 bg-white/80 px-3 py-2 text-sm text-black placeholder:text-black/35 outline-none focus:border-black/25"
                rows={2}
                placeholder="Reden (verplicht)..."
              />

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => decide("approved")}
                  disabled={!isSuperadmin}
                  className={
                    isSuperadmin
                      ? "rounded px-4 py-2 text-sm font-bold text-white hover:opacity-95"
                      : "rounded border border-black/10 bg-white/40 px-4 py-2 text-sm font-bold text-black/35"
                  }
                  style={
                    isSuperadmin
                      ? { background: "linear-gradient(#ff7a1a, #e45d00)", border: "1px solid rgba(196,77,0,0.85)" }
                      : undefined
                  }
                >
                  Definitief goed
                </button>

                <button
                  type="button"
                  onClick={() => decide("rejected")}
                  disabled={!isSuperadmin}
                  className={
                    isSuperadmin
                      ? "rounded border border-black/20 bg-white/65 px-4 py-2 text-sm font-bold text-black hover:bg-white"
                      : "rounded border border-black/10 bg-white/40 px-4 py-2 text-sm font-bold text-black/35"
                  }
                >
                  Definitief afkeur
                </button>

                <button
                  type="button"
                  onClick={() => loadAll()}
                  className="ml-auto inline-flex items-center rounded border border-black/20 bg-white/65 px-3 py-2 text-xs font-semibold text-black hover:bg-white"
                >
                  Refresh
                </button>
              </div>

              {reqRow?.decision ? (
                <div className="mt-2 text-xs text-black/60">
                  <span className="text-black/50">Reden:</span> {reqRow.decision_reason ?? "-"}{" "}
                  <span className="text-black/45">
                    • {fmtDateNL(reqRow.decided_at)} • {reqRow.decided_by ?? "-"}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-black/45">
          <div>{loading ? "Laden..." : ""}</div>
          <div>{reqRow?.updated_at ? `Laatste update: ${fmtDateNL(reqRow.updated_at)}` : ""}</div>
        </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
