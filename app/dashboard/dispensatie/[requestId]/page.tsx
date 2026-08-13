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
  const x = String(s ?? "")
    .trim()
    .toLowerCase();
  if (!x) return "open";
  if (["open", "pending", "approved", "rejected", "tied", "closed"].includes(x))
    return x;
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

function shortId(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  if (s.length <= 12) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
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
          : "border-zinc-600 bg-[#242424] text-zinc-200";

  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-black uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

function statusType(status: string) {
  if (status === "approved") return "ok";
  if (status === "rejected") return "bad";
  if (status === "pending" || status === "open") return "warn";
  return "default";
}

function SilverButton({
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
      className="border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function OrangeButton({
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
      className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function DarkPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-zinc-600 bg-[#171717] p-4 ${className}`}>
      {children}
    </section>
  );
}

const inputStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid rgba(160,160,170,0.95)",
  color: "#111827",
  outline: "none",
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
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token ?? null;
      if (!token) return setMyRole(null);

      const r = await fetch("/api/me/profile", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? "Rol laden mislukt");

      const names = [j?.role, j?.active_role, ...(Array.isArray(j?.available_roles) ? j.available_roles : [])]
        .map((x: any) => String(x ?? "").trim().toLowerCase())
        .filter(Boolean);
      if (names.includes("superadmin")) return setMyRole("superadmin");
      if (names.includes("dispensatie_admin")) return setMyRole("dispensatie_admin");
      if (names.includes("admin")) return setMyRole("admin");
      setMyRole(names[0] ?? null);
    } catch { setMyRole(null); }
  }

  async function loadAll() {
    if (!requestId) return;
    try {
      setLoading(true);
      setErr(null);

      const { data: r, error: rErr } = await supabase
        .from("dispensatie_requests")
        .select(
          "id,status,matchmaking_id,partij_nr,bout_id,rule_code,controle_run_id,decision,decision_reason,decided_by,decided_at,created_at,updated_at",
        )
        .eq("id", requestId)
        .single();
      if (rErr) throw rErr;
      setReqRow(r as any);

      const mmId = (r as any)?.matchmaking_id
        ? String((r as any).matchmaking_id)
        : null;
      if (mmId) {
        const { data: mm } = await supabase
          .from("matchmakings")
          .select("id,naam,datum,event_id")
          .eq("id", mmId)
          .maybeSingle();
        let mmNaam = mm?.naam ?? null;
        let mmDatum = mm?.datum ?? null;
        if (mm?.event_id && (!mmNaam || !mmDatum)) {
          const { data: ev } = await supabase.from("events").select("naam,datum").eq("id", mm.event_id).maybeSingle();
          if (!mmNaam) mmNaam = ev?.naam ?? null;
          if (!mmDatum) mmDatum = ev?.datum ?? null;
        }
        if (mmNaam || mmDatum) {
          setUploadRow({ matchmaking_id: mmId, evenement_naam: mmNaam, evenement_datum: mmDatum, uploaded_by: null, uploaded_at: null } as any);
        } else {
        const { data: ups, error: uErr } = await supabase
          .from("matchmaking_uploads")
          .select(
            "matchmaking_id,evenement_naam,evenement_datum,uploaded_by,uploaded_at,promotor,matchmaker,hoofdofficial",
          )
          .eq("matchmaking_id", mmId)
          .order("uploaded_at", { ascending: false })
          .limit(1);
        if (uErr) throw uErr;
        setUploadRow((ups?.[0] ?? null) as any);
        }
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
          "id,request_id,storage_path,original_filename,content_type,uploaded_by,uploaded_at",
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
      if (!isSuperadmin)
        throw new Error("Alleen superadmin kan definitief beslissen.");
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
      if (file.type !== "application/pdf")
        throw new Error("Alleen PDF toegestaan.");

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
  const partijDetailHref =
    reqRow?.matchmaking_id && reqRow?.partij_nr != null
      ? `/dashboard/dispensatie/${requestId}/partij/${encodeURIComponent(String(reqRow.matchmaking_id))}/${encodeURIComponent(String(reqRow.partij_nr))}`
      : "#";
  const controleHref = mmId ? `/dashboard/admin/controle/${mmId}` : "#";
  const currentStatus = normStatus(reqRow?.status);
  const decisionStatus = normStatus(reqRow?.decision);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / Dispensatie
              </p>
              <h1 className="text-2xl font-black uppercase">
                Dispensatie detail
              </h1>
              <p className="mt-1 break-all text-sm text-zinc-300">
                {requestId || "-"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <SilverButton
                onClick={() => router.push("/dashboard/dispensatie")}
              >
                ← Overzicht
              </SilverButton>
              {reqRow && partijNr != null ? (
                <LinkButton href={partijDetailHref}>Partij detail</LinkButton>
              ) : null}
              {mmId ? (
                <LinkButton href={controleHref}>Controle</LinkButton>
              ) : null}
              <OrangeButton onClick={loadAll} disabled={loading}>
                {loading ? "Laden..." : "Refresh"}
              </OrangeButton>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-5">
          <Stat
            title="Status"
            value={
              <Badge type={statusType(currentStatus)}>
                {statusLabel(reqRow?.status)}
              </Badge>
            }
          />
          <Stat title="Votes" value={voteCounts.total} />
          <Stat title="Akkoord" value={voteCounts.approve} tone="ok" />
          <Stat title="Afkeur" value={voteCounts.reject} tone="bad" />
          <Stat title="Rol" value={myRole ?? "-"} />
        </div>

        {err && (
          <div className="m-4 border border-red-500 bg-red-950/60 p-3 text-sm font-bold text-red-200">
            {err}
          </div>
        )}

        <div className="grid gap-4 p-4 xl:grid-cols-12">
          <DarkPanel className="xl:col-span-4">
            <PanelTitle title="Aanvraag" />
            <div className="mt-3 space-y-2 text-sm text-zinc-100">
              <InfoRow label="Partijnr" value={reqRow?.partij_nr ?? "-"} />
              <InfoRow label="Rule" value={reqRow?.rule_code ?? "-"} />
              <InfoRow label="Bout ID" value={reqRow?.bout_id ?? "-"} mono />
              <InfoRow
                label="Matchmaking"
                value={reqRow?.matchmaking_id ?? "-"}
                mono
              />
              <InfoRow
                label="Laatste update"
                value={fmtDateNL(reqRow?.updated_at, true)}
              />
            </div>
          </DarkPanel>

          <DarkPanel className="xl:col-span-5">
            <PanelTitle title="Evenement" />
            <div className="mt-3 grid gap-2 text-sm text-zinc-100 md:grid-cols-2">
              <InfoRow
                label="Evenement"
                value={uploadRow?.evenement_naam ?? "-"}
              />
              <InfoRow
                label="Datum"
                value={fmtDateNL(uploadRow?.evenement_datum)}
              />
              <InfoRow
                label="Matchmaker"
                value={uploadRow?.matchmaker ?? "-"}
              />
              <InfoRow label="Promotor" value={uploadRow?.promotor ?? "-"} />
              <InfoRow
                label="Hoofdofficial"
                value={uploadRow?.hoofdofficial ?? "-"}
              />
              <InfoRow
                label="Upload"
                value={fmtDateNL(uploadRow?.uploaded_at, true)}
              />
            </div>
          </DarkPanel>

          <DarkPanel className="xl:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <PanelTitle title="PDF" />
              <label className="cursor-pointer border border-[#ff4d00] bg-[#ff4d00] px-3 py-2 text-sm font-black uppercase !text-black">
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
                <div className="text-sm text-zinc-400">Geen bijlagen.</div>
              ) : (
                attachments.slice(0, 5).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => openAttachment(a)}
                    className="block w-full border border-zinc-300 bg-white px-3 py-2 text-left text-sm font-bold !text-black hover:brightness-105"
                    title={a.original_filename ?? a.storage_path}
                  >
                    <div className="truncate">
                      {a.original_filename ??
                        a.storage_path.split("/").pop() ??
                        "PDF"}
                    </div>
                    <div className="mt-1 text-xs text-black/55">
                      {fmtDateNL(a.uploaded_at, true)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </DarkPanel>
        </div>

        <div className="grid gap-4 p-4 pt-0 xl:grid-cols-2">
          <DarkPanel className="flex min-h-[340px] flex-col">
            <PanelTitle title="Discussie" />
            <div className="mt-3 flex-1 space-y-2 overflow-auto pr-1">
              {messages.length === 0 ? (
                <div className="border border-zinc-700 bg-[#202020] px-3 py-3 text-sm text-zinc-400">
                  Nog geen berichten.
                </div>
              ) : (
                messages.map((m, index) => (
                  <div
                    key={m.id}
                    className="border px-3 py-2"
                    style={{
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#0f0f0f",
                      color: index % 2 === 0 ? "#000000" : "#ffffff",
                      borderColor: index % 2 === 0 ? "#d4d4d8" : "#3f3f46",
                    }}
                  >
                    <div className="text-[11px] opacity-60">
                      {shortId(m.user_id)}
                    </div>
                    <div className="mt-1 text-sm font-medium">{m.message}</div>
                    <div className="mt-1 text-[11px] opacity-60">
                      {fmtDateNL(m.created_at, true)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Typ bericht..."
                className="min-w-0 flex-1 px-3 py-2 text-sm"
                style={inputStyle}
              />
              <OrangeButton onClick={postMessage}>Plaats</OrangeButton>
            </div>
          </DarkPanel>

          <DarkPanel className="min-h-[340px]">
            <PanelTitle title="Stemmen" />
            <div className="mt-3 text-sm text-zinc-300">Notitie optioneel</div>
            <textarea
              value={voteNote}
              onChange={(e) => setVoteNote(e.target.value)}
              className="mt-2 w-full px-3 py-2 text-sm"
              rows={4}
              placeholder="Bijv. reden / toelichting..."
              style={inputStyle}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => vote("approve")}
                className="border border-green-400 bg-green-700 px-4 py-2 text-sm font-black uppercase text-white"
              >
                Stem akkoord
              </button>
              <button
                type="button"
                onClick={() => vote("reject")}
                className="border border-red-400 bg-red-800 px-4 py-2 text-sm font-black uppercase text-white"
              >
                Stem afkeur
              </button>
              <div className="ml-auto text-xs text-zinc-400">
                Status wordt <b className="text-white">pending</b>
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-700 pt-4">
              <div className="flex items-center justify-between gap-2">
                <PanelTitle title="Superadmin besluit" />
                {reqRow?.decision ? (
                  <Badge type={statusType(decisionStatus)}>
                    {String(reqRow.decision).toUpperCase()}
                  </Badge>
                ) : null}
              </div>

              <textarea
                value={decideReason}
                onChange={(e) => setDecideReason(e.target.value)}
                className="mt-3 w-full px-3 py-2 text-sm"
                rows={3}
                placeholder="Reden verplicht..."
                style={inputStyle}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <OrangeButton
                  onClick={() => decide("approved")}
                  disabled={!isSuperadmin}
                >
                  Definitief goed
                </OrangeButton>
                <SilverButton
                  onClick={() => decide("rejected")}
                  disabled={!isSuperadmin}
                >
                  Definitief afkeur
                </SilverButton>
                <SilverButton onClick={loadAll}>Refresh</SilverButton>
              </div>

              {reqRow?.decision ? (
                <div className="mt-3 text-xs text-zinc-400">
                  {reqRow.decision_reason ?? "-"} •{" "}
                  {fmtDateNL(reqRow.decided_at, true)} •{" "}
                  {shortId(reqRow.decided_by)}
                </div>
              ) : null}
            </div>
          </DarkPanel>
        </div>

        <div className="px-4 pb-4 text-right text-xs text-zinc-500">
          {loading
            ? "Laden..."
            : reqRow?.updated_at
              ? `Laatste update: ${fmtDateNL(reqRow.updated_at, true)}`
              : ""}
        </div>
      </section>
    </main>
  );
}

function LinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110"
    >
      {children}
    </Link>
  );
}

function PanelTitle({ title }: { title: string }) {
  return (
    <h2 className="text-xl font-black uppercase leading-none text-[#ff4d00]">
      {title}
    </h2>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="w-[112px] shrink-0 text-zinc-400">{label}:</span>
      <span
        className={`${mono ? "font-mono text-[13px]" : ""} break-all text-white`}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: React.ReactNode;
  tone?: "ok" | "bad" | "default";
}) {
  const color =
    tone === "ok"
      ? "text-green-300"
      : tone === "bad"
        ? "text-red-300"
        : "text-zinc-200";
  return (
    <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
      <div className={`truncate text-xl font-black ${color}`}>{value}</div>
      <p className="text-xs uppercase text-zinc-400">{title}</p>
    </div>
  );
}
