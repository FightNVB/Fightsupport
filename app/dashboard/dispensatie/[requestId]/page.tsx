"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  RefreshCcw,
  ShieldCheck,
  FileText,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Gavel,
  Upload,
  ClipboardList,
} from "lucide-react";

const NVB_ORANGE = "#ff4d00";
const logoSrc = "/branding/fightsupport/excel-logo.png";

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
  return dt.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const pageBackground: CSSProperties = {
  minHeight: "100vh",
  color: "#fff",
  background: `
    radial-gradient(circle at 50% 0%, rgba(255,104,20,0.11) 0%, rgba(255,104,20,0.03) 10%, rgba(0,0,0,0) 22%),
    radial-gradient(circle at 50% 100%, rgba(255,104,20,0.09) 0%, rgba(255,104,20,0.02) 12%, rgba(0,0,0,0) 24%),
    radial-gradient(circle at 16% 20%, rgba(255,120,20,0.06) 0%, rgba(255,120,20,0) 16%),
    radial-gradient(circle at 84% 22%, rgba(255,120,20,0.06) 0%, rgba(255,120,20,0) 16%),
    linear-gradient(180deg, #030405 0%, #06080b 18%, #010203 100%)
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
  padding: 8,
  background: `
    linear-gradient(145deg,
      #ffffff 0%,
      #cfcfcf 6%,
      #6a6a6a 12%,
      #fafafa 19%,
      #8d8d8d 27%,
      #3f3f3f 36%,
      #ededed 47%,
      #9f9f9f 58%,
      #4b4b4b 69%,
      #ffffff 80%,
      #b8b8b8 90%,
      #f7f7f7 100%)
  `,
  border: "1px solid rgba(255,255,255,0.60)",
  boxShadow: `
    0 12px 22px rgba(0,0,0,0.60),
    inset 0 2px 1px rgba(255,255,255,0.96),
    inset 0 -2px 2px rgba(0,0,0,0.82),
    inset 2px 0 2px rgba(255,255,255,0.44),
    inset -2px 0 2px rgba(0,0,0,0.54)
  `,
};

const steelFrameMid: CSSProperties = {
  position: "relative",
  padding: 3,
  background: `
    linear-gradient(135deg,
      rgba(255,255,255,0.95) 0%,
      rgba(216,216,216,0.95) 14%,
      rgba(64,64,64,0.96) 28%,
      rgba(248,248,248,0.94) 48%,
      rgba(98,98,98,0.96) 68%,
      rgba(236,236,236,0.96) 100%)
  `,
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.78),
    inset 0 -1px 0 rgba(0,0,0,0.58)
  `,
};

const steelFrameChannel: CSSProperties = {
  position: "relative",
  padding: 4,
  background: `
    linear-gradient(180deg,
      #2a2a2a 0%,
      #080808 18%,
      #505050 34%,
      #0c0c0c 52%,
      #424242 72%,
      #090909 100%)
  `,
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.16),
    inset 0 -1px 0 rgba(0,0,0,0.84)
  `,
};

const steelFrameInner: CSSProperties = {
  position: "relative",
  padding: 2,
  background: `
    linear-gradient(135deg,
      #fbfbfb 0%,
      #d2d2d2 10%,
      #6f6f6f 22%,
      #f3f3f3 34%,
      #b4b4b4 46%,
      #545454 60%,
      #fafafa 78%,
      #b2b2b2 100%)
  `,
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.66),
    inset 0 -1px 0 rgba(0,0,0,0.50)
  `,
};

const darkPlate: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  border: "1px solid #080808",
  background: `
    radial-gradient(circle at 14% 84%, rgba(255,110,0,0.09), transparent 16%),
    radial-gradient(circle at 86% 14%, rgba(255,255,255,0.05), transparent 14%),
    linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.012) 15%, rgba(0,0,0,0.16) 100%),
    linear-gradient(135deg, #1a1d22 0%, #070a0f 46%, #15181d 100%)
  `,
  boxShadow: `
    inset 0 2px 4px rgba(0,0,0,0.92),
    inset 0 -2px 6px rgba(255,255,255,0.05),
    inset 0 0 30px rgba(255,120,0,0.05)
  `,
};

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

      const { data: ur, error: urErr } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", uid);
      if (urErr) throw urErr;

      const roleIds = (ur ?? [])
        .map((r: any) => Number(r.role_id))
        .filter((n) => Number.isFinite(n));
      if (!roleIds.length) return setMyRole(null);

      const { data: roles, error: rErr } = await supabase
        .from("roles")
        .select("id,name")
        .in("id", roleIds);
      if (rErr) throw rErr;

      const names = (roles ?? []).map((r: any) =>
        String(r.name ?? "").toLowerCase()
      );
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

      const mmId = (r as any)?.matchmaking_id
        ? String((r as any).matchmaking_id)
        : null;

      if (mmId) {
        const { data: ups, error: uErr } = await supabase
          .from("matchmaking_uploads")
          .select(
            "matchmaking_id,evenement_naam,evenement_datum,uploaded_by,uploaded_at,promotor,matchmaker,hoofdofficial"
          )
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
        .select(
          "id,request_id,storage_path,original_filename,content_type,uploaded_by,uploaded_at"
        )
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

      await callApi("/api/dispensatie/message", {
        request_id: requestId,
        message: text,
      });

      setMsgText("");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  async function vote(v: "approve" | "reject") {
    try {
      setErr(null);
      await callApi("/api/dispensatie/vote", {
        request_id: requestId,
        vote: v,
        note: voteNote || null,
      });
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

      await callApi("/api/dispensatie/decide", {
        request_id: requestId,
        decision,
        reason,
      });

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

      if (file.type !== "application/pdf") {
        throw new Error("Alleen PDF toegestaan.");
      }

      const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
      const path = `${requestId}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("dispensatie")
        .upload(path, file, {
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
      const { data, error } = await supabase.storage
        .from("dispensatie")
        .createSignedUrl(a.storage_path, 60 * 10);

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
  const controlDetailHref =
    mmId && partijNr != null
      ? `/dashboard/admin/controle/${mmId}/${partijNr}`
      : "#";

  return (
    <main style={pageBackground}>
      <SharedStyles />

      <TopLogoBand />
      <TitleBand
        title="Dispensatie Detail"
        subtitle="Beoordeling, discussie en definitieve beslissing"
        actionLabel="Overzicht"
        actionIcon={<ArrowLeft size={15} strokeWidth={2.8} />}
        onAction={() => router.push("/dashboard/dispensatie")}
      />

      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "22px 24px 14px",
        }}
      >
        <div
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <StatCard
            icon={<ClipboardList size={28} strokeWidth={2.4} />}
            label="Status"
            value={statusLabel(reqRow?.status)}
          />
          <StatCard
            icon={<CheckCircle2 size={28} strokeWidth={2.4} />}
            label="Akkoord"
            value={voteCounts.approve}
          />
          <StatCard
            icon={<XCircle size={28} strokeWidth={2.4} />}
            label="Afkeur"
            value={voteCounts.reject}
          />
          <StatCard
            icon={<ShieldCheck size={28} strokeWidth={2.4} />}
            label="Rol"
            value={myRole ?? "-"}
          />
        </div>

        {err ? (
          <div style={{ marginTop: 20 }}>
            <SteelFrame>
              <div
                style={{
                  ...darkPlate,
                  padding: "16px 18px",
                  color: "#ffb3b3",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {err}
              </div>
            </SteelFrame>
          </div>
        ) : null}

        <div
          className="detail-top-grid"
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "1.15fr 1.3fr 0.95fr",
            gap: 20,
          }}
        >
          <SteelFrame>
            <PanelCard
              icon={<ShieldCheck size={34} strokeWidth={2.4} />}
              title="Request info"
              subtitle="Status en partijdetails"
            >
              <InfoRow label="Status">
                <StatusPill status={normStatus(reqRow?.status)}>
                  {statusLabel(reqRow?.status)}
                </StatusPill>
              </InfoRow>

              <InfoRow label="matchmaking_id">
                <CodeText>{reqRow?.matchmaking_id ?? "-"}</CodeText>
              </InfoRow>

              <InfoRow label="partij_nr">
                <CodeText>{reqRow?.partij_nr ?? "-"}</CodeText>
              </InfoRow>

              <InfoRow label="rule">
                <CodeText>{reqRow?.rule_code ?? "-"}</CodeText>
              </InfoRow>

              <InfoRow label="bout_id">
                <CodeText>{reqRow?.bout_id ?? "-"}</CodeText>
              </InfoRow>

              <InfoRow label="request_id">
                <CodeText>{requestId || "-"}</CodeText>
              </InfoRow>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <TinyStat label="Votes" value={voteCounts.total} />
                <TinyStat label="Akkoord" value={voteCounts.approve} />
                <TinyStat label="Afkeur" value={voteCounts.reject} />
              </div>
            </PanelCard>
          </SteelFrame>

          <SteelFrame>
            <PanelCard
              icon={<FileText size={34} strokeWidth={2.4} />}
              title="Evenement"
              subtitle="Upload en betrokken rollen"
            >
              <InfoRow label="Naam">{uploadRow?.evenement_naam ?? "-"}</InfoRow>
              <InfoRow label="Datum">{fmtDateNL(uploadRow?.evenement_datum)}</InfoRow>
              <InfoRow label="Matchmaker">{uploadRow?.matchmaker ?? "-"}</InfoRow>
              <InfoRow label="Promotor">{uploadRow?.promotor ?? "-"}</InfoRow>
              <InfoRow label="Hoofdofficial">{uploadRow?.hoofdofficial ?? "-"}</InfoRow>
              <InfoRow label="Upload datum">{fmtDateNL(uploadRow?.uploaded_at)}</InfoRow>
              <InfoRow label="uploaded_by">
                <CodeText>{uploadRow?.uploaded_by ?? "-"}</CodeText>
              </InfoRow>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {mmId && partijNr != null ? (
                  <MiniLinkButton
                    href={controlDetailHref}
                    label="Controle detail"
                  />
                ) : (
                  <MiniDisabledButton label="Controle detail" />
                )}

                <MiniActionButton
                  label="Refresh"
                  icon={<RefreshCcw size={14} strokeWidth={2.5} />}
                  onClick={() => loadAll()}
                />
              </div>
            </PanelCard>
          </SteelFrame>

          <SteelFrame>
            <PanelCard
              icon={<Upload size={34} strokeWidth={2.4} />}
              title="PDF bijlagen"
              subtitle="Documenten voor beoordeling"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 12,
                }}
              >
                <label
                  className="fs-metal-button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 36,
                    padding: "0 14px",
                    border: "1px solid rgba(196,77,0,0.85)",
                    background:
                      "linear-gradient(180deg, #ff7a1a 0%, #e45d00 55%, #9b3500 100%)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 900,
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 12px rgba(255,77,0,0.14)",
                    cursor: uploading ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Upload size={14} strokeWidth={2.5} />
                  {uploading ? "Uploaden..." : "Upload PDF"}
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
                <div
                  style={{
                    padding: "12px 0",
                    color: "rgba(255,255,255,0.64)",
                    fontSize: 13,
                  }}
                >
                  Geen bijlagen.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {attachments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => openAttachment(a)}
                      className="fs-metal-button"
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        border: "1px solid rgba(255,255,255,0.10)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))",
                        color: "#f1f1f1",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 10px rgba(0,0,0,0.24)",
                      }}
                      title={a.original_filename ?? a.storage_path}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {a.original_filename ?? a.storage_path.split("/").pop() ?? "PDF"}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: "rgba(255,255,255,0.54)",
                        }}
                      >
                        {fmtDateNL(a.uploaded_at)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </PanelCard>
          </SteelFrame>
        </div>

        <div
          className="detail-bottom-grid"
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <SteelFrame>
            <PanelCard
              icon={<MessageSquare size={34} strokeWidth={2.4} />}
              title="Discussie"
              subtitle="Berichten rondom deze aanvraag"
            >
              <div
                style={{
                  maxHeight: 340,
                  overflow: "auto",
                  paddingRight: 4,
                  display: "grid",
                  gap: 10,
                }}
              >
                {messages.length === 0 ? (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.64)",
                      fontSize: 13,
                    }}
                  >
                    Nog geen berichten.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        border: "1px solid rgba(255,255,255,0.10)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03))",
                        padding: "10px 12px",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 10px rgba(0,0,0,0.22)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.55)",
                          fontFamily: "monospace",
                          marginBottom: 6,
                          wordBreak: "break-all",
                        }}
                      >
                        {m.user_id}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#f1f1f1",
                          lineHeight: 1.45,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.message}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: "rgba(255,255,255,0.40)",
                        }}
                      >
                        {fmtDateNL(m.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 14,
                  alignItems: "stretch",
                }}
              >
                <input
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Typ bericht..."
                  style={{
                    flex: 1,
                    height: 40,
                    padding: "0 14px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
                    color: "#fff",
                    outline: "none",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 2px 4px rgba(0,0,0,0.45)",
                  }}
                />
                <OrangeActionButton label="Plaats" onClick={postMessage} />
              </div>
            </PanelCard>
          </SteelFrame>

          <SteelFrame>
            <PanelCard
              icon={<Gavel size={34} strokeWidth={2.4} />}
              title="Stemmen en besluit"
              subtitle="Vote en superadmin-afhandeling"
            >
              <LabelText>Notitie bij stem (optioneel)</LabelText>
              <textarea
                value={voteNote}
                onChange={(e) => setVoteNote(e.target.value)}
                rows={3}
                placeholder="Bijv. reden / toelichting..."
                style={textareaStyle}
              />

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 12,
                  alignItems: "center",
                }}
              >
                <GreenActionButton
                  label="Stem akkoord"
                  icon={<CheckCircle2 size={15} strokeWidth={2.5} />}
                  onClick={() => vote("approve")}
                />
                <RedActionButton
                  label="Stem afkeur"
                  icon={<XCircle size={15} strokeWidth={2.5} />}
                  onClick={() => vote("reject")}
                />

                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.58)",
                  }}
                >
                  status wordt <b>pending</b> na stem
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  paddingTop: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: "#f1f1f1",
                    }}
                  >
                    Superadmin besluit
                  </div>

                  {reqRow?.decision ? (
                    <StatusPill
                      status={String(reqRow.decision).toLowerCase()}
                    >
                      {String(reqRow.decision).toUpperCase()}
                    </StatusPill>
                  ) : null}
                </div>

                <LabelText style={{ marginTop: 12 }}>Reden (verplicht)</LabelText>
                <textarea
                  value={decideReason}
                  onChange={(e) => setDecideReason(e.target.value)}
                  rows={3}
                  placeholder="Reden..."
                  style={textareaStyle}
                />

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 12,
                    alignItems: "center",
                  }}
                >
                  <OrangeActionButton
                    label="Definitief goed"
                    icon={<CheckCircle2 size={15} strokeWidth={2.5} />}
                    onClick={() => decide("approved")}
                    disabled={!isSuperadmin}
                  />

                  <SilverActionButton
                    label="Definitief afkeur"
                    icon={<XCircle size={15} strokeWidth={2.5} />}
                    onClick={() => decide("rejected")}
                    disabled={!isSuperadmin}
                  />

                  <MiniActionButton
                    label="Refresh"
                    icon={<RefreshCcw size={14} strokeWidth={2.5} />}
                    onClick={() => loadAll()}
                  />
                </div>

                {reqRow?.decision ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                      color: "#f1f1f1",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <div>
                      <span style={{ color: "rgba(255,255,255,0.56)" }}>Reden:</span>{" "}
                      {reqRow.decision_reason ?? "-"}
                    </div>
                    <div style={{ marginTop: 4, color: "rgba(255,255,255,0.46)" }}>
                      {fmtDateNL(reqRow.decided_at)} • {reqRow.decided_by ?? "-"}
                    </div>
                  </div>
                ) : null}
              </div>
            </PanelCard>
          </SteelFrame>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 11,
            color: "rgba(255,255,255,0.42)",
          }}
        >
          <div>{loading ? "Laden..." : ""}</div>
          <div>
            {reqRow?.updated_at ? `Laatste update: ${fmtDateNL(reqRow.updated_at)}` : ""}
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 9,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.30)",
          }}
        >
          © FIGHTSUPPORT
        </div>
      </div>
    </main>
  );
}

const textareaStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
  color: "#fff",
  outline: "none",
  resize: "vertical",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 2px 4px rgba(0,0,0,0.45)",
};

function SharedStyles() {
  return (
    <style jsx>{`
      @keyframes fsPulseGlow {
        0%,
        100% {
          opacity: 0.78;
          transform: scaleX(1) scaleY(1);
        }
        50% {
          opacity: 1;
          transform: scaleX(1.08) scaleY(1.12);
        }
      }

      .fs-card-hover {
        transition: transform 180ms ease, filter 180ms ease, box-shadow 180ms ease;
      }

      .fs-card-hover:hover {
        transform: translateY(-2px);
        filter: drop-shadow(0 0 12px rgba(255, 77, 0, 0.08));
      }

      .fs-card-hover:hover .fs-card-glow {
        opacity: 1;
      }

      .fs-card-hover:hover .fs-card-outer {
        box-shadow:
          0 16px 28px rgba(0, 0, 0, 0.68),
          0 0 18px rgba(255, 77, 0, 0.08),
          inset 0 2px 1px rgba(255, 255, 255, 0.96),
          inset 0 -2px 2px rgba(0, 0, 0, 0.82),
          inset 2px 0 2px rgba(255, 255, 255, 0.44),
          inset -2px 0 2px rgba(0, 0, 0, 0.54);
      }

      .fs-hotspot {
        animation: fsPulseGlow 2.8s ease-in-out infinite;
        transform-origin: center center;
      }

      .fs-hotspot-2 {
        animation-delay: 0.7s;
      }

      .fs-hotspot-3 {
        animation-delay: 1.3s;
      }

      .fs-metal-button {
        transition: transform 90ms ease, box-shadow 120ms ease, filter 120ms ease;
      }

      .fs-metal-button:hover {
        filter: brightness(1.02);
        box-shadow:
          inset 0 2px 1px rgba(255, 255, 255, 1),
          inset 0 -3px 2px rgba(0, 0, 0, 0.6),
          0 8px 18px rgba(0, 0, 0, 0.46),
          0 0 10px rgba(255, 77, 0, 0.08);
      }

      .fs-metal-button:active {
        transform: translateY(2px);
        box-shadow:
          inset 0 2px 2px rgba(0, 0, 0, 0.18),
          inset 0 -1px 1px rgba(255, 255, 255, 0.28),
          0 2px 6px rgba(0, 0, 0, 0.35);
      }

      @media (max-width: 1180px) {
        .stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .detail-top-grid {
          grid-template-columns: 1fr !important;
        }

        .detail-bottom-grid {
          grid-template-columns: 1fr !important;
        }
      }

      @media (max-width: 860px) {
        .stats-grid {
          grid-template-columns: 1fr !important;
        }

        .title-row {
          padding-top: 12px !important;
          padding-bottom: 12px !important;
          padding-left: 14px !important;
          padding-right: 14px !important;
        }

        .title-actions-wrap {
          position: static !important;
          transform: none !important;
          justify-content: center !important;
          margin-bottom: 10px !important;
        }

        .title-center {
          padding-top: 0 !important;
        }
      }
    `}</style>
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
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(circle at 50% 96%, rgba(255,95,0,0.30), transparent 8%),
            radial-gradient(circle at 18% 26%, rgba(255,110,20,0.05), transparent 15%),
            radial-gradient(circle at 82% 24%, rgba(255,110,20,0.05), transparent 15%)
          `,
        }}
      />

      <div
        style={{
          position: "relative",
          width: 1160,
          height: 96,
          maxWidth: "96vw",
          filter:
            "drop-shadow(0 10px 18px rgba(0,0,0,0.70)) drop-shadow(0 0 16px rgba(255,95,0,0.12))",
          boxShadow: `
            inset 0 -10px 24px rgba(0,0,0,0.42),
            inset 0 5px 14px rgba(255,255,255,0.04)
          `,
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

function TitleBand({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionIcon?: ReactNode;
  onAction: () => void | Promise<void>;
}) {
  return (
    <div
      style={{
        ...sectionRule(),
        position: "relative",
        background: `
          linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 10%, rgba(0,0,0,0.04) 100%),
          linear-gradient(180deg, #171b21 0%, #0a0d12 50%, #161a20 100%)
        `,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.06),
          inset 0 -1px 0 rgba(255,255,255,0.03),
          0 8px 14px rgba(0,0,0,0.34)
        `,
      }}
    >
      <div
        className="fs-hotspot"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: -4,
          width: 160,
          height: 8,
          background:
            "radial-gradient(circle, rgba(255,98,0,1) 0%, rgba(255,98,0,0.55) 34%, rgba(255,98,0,0) 72%)",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="title-row"
        style={{
          position: "relative",
          maxWidth: 1400,
          margin: "0 auto",
          padding: "11px 18px 10px",
          minHeight: 92,
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
          <HeaderSilverButton
            label={actionLabel}
            icon={actionIcon}
            onClick={onAction}
          />
        </div>

        <div
          className="title-center"
          style={{
            textAlign: "center",
            paddingTop: 0,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 1,
              lineHeight: 1,
              color: "#ececec",
              textTransform: "uppercase",
              textShadow:
                "0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(0,0,0,0.82)",
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 7,
              fontSize: 9,
              letterSpacing: 2.5,
              color: NVB_ORANGE,
              textTransform: "uppercase",
              textShadow: "0 0 8px rgba(255,106,0,0.28)",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}

function SteelFrame({
  children,
  hover = false,
}: {
  children: ReactNode;
  hover?: boolean;
}) {
  return (
    <div className={hover ? "fs-card-hover" : undefined}>
      <div style={steelFrameOuter} className={hover ? "fs-card-outer" : undefined}>
        <div
          className={hover ? "fs-card-glow" : undefined}
          style={{
            position: "absolute",
            inset: -2,
            opacity: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,77,0,0.10) 0%, rgba(255,77,0,0.04) 34%, rgba(255,77,0,0) 70%)",
            transition: "opacity 180ms ease",
            filter: "blur(8px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `
              linear-gradient(120deg, rgba(255,255,255,0.46) 0%, rgba(255,255,255,0.10) 12%, transparent 23%),
              linear-gradient(300deg, rgba(255,255,255,0.20) 0%, transparent 22%),
              linear-gradient(180deg, rgba(0,0,0,0.26), transparent 40%)
            `,
            mixBlendMode: "screen",
          }}
        />

        <div style={steelFrameMid}>
          <div style={steelFrameChannel}>
            <div style={steelFrameInner}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        ...darkPlate,
        padding: "14px 14px 16px",
        minHeight: 220,
      }}
    >
      <OrangeHotspot left={18} bottom={10} width={56} />
      <OrangeHotspot right={34} top={10} width={40} small variant={2} />
      <CardChromeOverlay />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <IconPlate>{icon}</IconPlate>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              lineHeight: 1,
              color: "#f1f1f1",
              textShadow: "0 3px 5px rgba(0,0,0,0.8)",
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 7,
              fontSize: 13,
              color: "#d7d7d7",
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <SteelFrame hover>
      <div
        style={{
          ...darkPlate,
          minHeight: 116,
          padding: "14px 14px 12px",
        }}
      >
        <OrangeHotspot left={14} bottom={8} width={46} />
        <OrangeHotspot right={24} top={9} width={30} small variant={2} />
        <CardChromeOverlay />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconPlate compact>{icon}</IconPlate>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.72)",
                fontWeight: 800,
              }}
            >
              {label}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 28,
                lineHeight: 1,
                fontWeight: 900,
                color: "#ffffff",
                textShadow: "0 4px 10px rgba(0,0,0,0.8)",
                wordBreak: "break-word",
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

function IconPlate({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        width: compact ? 68 : 92,
        height: compact ? 56 : 72,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        border: "1px solid #7b2500",
        background:
          "linear-gradient(180deg, #ff4d00 0%, #e04400 50%, #8a2600 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 12px rgba(255,77,0,0.14)",
      }}
    >
      {children}
    </div>
  );
}

function HeaderSilverButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fs-metal-button"
      style={{
        minWidth: 162,
        height: 42,
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
        fontSize: 15,
        fontWeight: 900,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,1),
          inset 0 -2px 2px rgba(0,0,0,0.40),
          0 4px 10px rgba(0,0,0,0.28)
        `,
        cursor: "pointer",
        textShadow: "0 1px 0 rgba(255,255,255,0.55)",
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
    </button>
  );
}

function MiniLinkButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 34,
        padding: "0 14px",
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
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,1),
          inset 0 -2px 2px rgba(0,0,0,0.40),
          0 4px 10px rgba(0,0,0,0.24)
        `,
        textShadow: "0 1px 0 rgba(255,255,255,0.55)",
        whiteSpace: "nowrap",
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}

function MiniDisabledButton({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 34,
        padding: "0 14px",
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        color: "rgba(255,255,255,0.40)",
        fontSize: 13,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function MiniActionButton({
  label,
  onClick,
  icon,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fs-metal-button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        height: 34,
        padding: "0 14px",
        border: danger
          ? "1px solid rgba(180,70,70,0.75)"
          : "1px solid rgba(185,185,185,0.95)",
        background: disabled
          ? "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))"
          : danger
          ? `
            linear-gradient(180deg,
              #ffe7e7 0%,
              #ffcfcf 18%,
              #ffb8b8 40%,
              #f19a9a 72%,
              #ffd9d9 100%)
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
        color: disabled ? "rgba(255,255,255,0.38)" : danger ? "#661414" : "#121212",
        fontSize: 13,
        fontWeight: 900,
        boxShadow: disabled
          ? "inset 0 1px 0 rgba(255,255,255,0.05)"
          : `
          inset 0 1px 0 rgba(255,255,255,1),
          inset 0 -2px 2px rgba(0,0,0,0.40),
          0 4px 10px rgba(0,0,0,0.24)
        `,
        cursor: disabled ? "default" : "pointer",
        textShadow: disabled ? "none" : "0 1px 0 rgba(255,255,255,0.55)",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function OrangeActionButton({
  label,
  onClick,
  icon,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fs-metal-button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 38,
        padding: "0 16px",
        border: "1px solid rgba(196,77,0,0.85)",
        background: disabled
          ? "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))"
          : "linear-gradient(180deg, #ff7a1a 0%, #e45d00 55%, #9b3500 100%)",
        color: disabled ? "rgba(255,255,255,0.38)" : "#fff",
        fontSize: 13,
        fontWeight: 900,
        boxShadow: disabled
          ? "inset 0 1px 0 rgba(255,255,255,0.05)"
          : "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 12px rgba(255,77,0,0.14)",
        cursor: disabled ? "default" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function SilverActionButton({
  label,
  onClick,
  icon,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <MiniActionButton
      label={label}
      icon={icon}
      onClick={onClick}
      disabled={disabled}
    />
  );
}

function GreenActionButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fs-metal-button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 38,
        padding: "0 16px",
        border: "1px solid rgba(90,180,120,0.50)",
        background:
          "linear-gradient(180deg, #2ebd66 0%, #17944b 55%, #0e5d30 100%)",
        color: "#fff",
        fontSize: 13,
        fontWeight: 900,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 10px rgba(46,189,102,0.12)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function RedActionButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fs-metal-button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 38,
        padding: "0 16px",
        border: "1px solid rgba(190,80,80,0.50)",
        background:
          "linear-gradient(180deg, #cf4b4b 0%, #a92d2d 55%, #6d1818 100%)",
        color: "#fff",
        fontSize: 13,
        fontWeight: 900,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 10px rgba(207,75,75,0.12)",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusPill({
  status,
  children,
}: {
  status: string;
  children: ReactNode;
}) {
  const x = String(status ?? "").toLowerCase();

  let bg =
    "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.10))";
  let color = "#ffffff";
  let border = "1px solid rgba(255,255,255,0.20)";

  if (x === "nieuw" || x === "open") {
    bg =
      "linear-gradient(180deg, rgba(255,120,20,0.35), rgba(255,77,0,0.18))";
    border = "1px solid rgba(255,120,20,0.45)";
    color = "#fff3eb";
  } else if (x === "pending") {
    bg =
      "linear-gradient(180deg, rgba(255,220,120,0.28), rgba(180,130,20,0.16))";
    border = "1px solid rgba(255,220,120,0.36)";
    color = "#fff7da";
  } else if (x === "approved") {
    bg =
      "linear-gradient(180deg, rgba(110,220,150,0.28), rgba(40,120,70,0.16))";
    border = "1px solid rgba(110,220,150,0.36)";
    color = "#eafff0";
  } else if (x === "rejected") {
    bg =
      "linear-gradient(180deg, rgba(220,110,110,0.28), rgba(120,40,40,0.16))";
    border = "1px solid rgba(220,110,110,0.36)";
    color = "#fff0f0";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 28,
        padding: "0 10px",
        border,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.20)",
      }}
    >
      {children}
    </span>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 10,
        alignItems: "start",
        padding: "7px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.52)",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#f1f1f1",
          minWidth: 0,
          wordBreak: "break-word",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TinyStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        padding: "10px 8px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.56)",
          textTransform: "uppercase",
          letterSpacing: 1,
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 20,
          fontWeight: 900,
          color: "#fff",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CodeText({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "monospace",
        color: "rgba(255,255,255,0.88)",
        fontSize: 13,
        wordBreak: "break-all",
      }}
    >
      {children}
    </span>
  );
}

function LabelText({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 12,
        color: "rgba(255,255,255,0.56)",
        fontWeight: 800,
        marginBottom: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function OrangeHotspot({
  left,
  right,
  top,
  bottom,
  width,
  small = false,
  variant = 1,
}: {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  width: number;
  small?: boolean;
  variant?: 1 | 2 | 3;
}) {
  const extraClass =
    variant === 2
      ? "fs-hotspot fs-hotspot-2"
      : variant === 3
      ? "fs-hotspot fs-hotspot-3"
      : "fs-hotspot";

  return (
    <div
      className={extraClass}
      style={{
        position: "absolute",
        left,
        right,
        top,
        bottom,
        width,
        height: small ? 8 : 10,
        background:
          "radial-gradient(circle, rgba(255,98,0,1) 0%, rgba(255,98,0,0.55) 34%, rgba(255,98,0,0) 72%)",
        filter: "blur(1.5px)",
        pointerEvents: "none",
      }}
    />
  );
}

function CardChromeOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `
          linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.015) 15%, transparent 26%),
          linear-gradient(315deg, rgba(255,255,255,0.03) 0%, transparent 22%)
        `,
      }}
    />
  );
}