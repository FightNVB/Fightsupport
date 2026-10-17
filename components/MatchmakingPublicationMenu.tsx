"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe2, QrCode, Copy, ExternalLink } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Publication = {
  is_enabled?: boolean;
  public_token?: string | null;
  trainer_token?: string | null;
  trainer_is_published?: boolean;
};

export default function MatchmakingPublicationMenu({ matchmakingId, disabled = false }: {
  matchmakingId: string;
  disabled?: boolean;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [open, setOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!matchmakingId) return;
    let cancelled = false;
    void authedFetch(`/api/matchmaker/public-matchmaking?matchmakingId=${encodeURIComponent(matchmakingId)}`)
      .then(async response => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Publicatiestatus laden mislukt");
        if (!cancelled) setPublication(json.publication ?? null);
      })
      .catch(e => { if (!cancelled) setError(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, [matchmakingId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQrOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQrOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const urlFor = (token: string | null | undefined) =>
    token ? `${window.location.origin}/openbare-matchmaking/${encodeURIComponent(token)}` : "";
  const publicUrl = publication?.is_enabled ? urlFor(publication.public_token) : "";
  const trainerUrl = publication?.trainer_is_published ? urlFor(publication.trainer_token) : "";

  async function act(action: "publish_live" | "publish_trainers" | "offline") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await authedFetch("/api/matchmaker/public-matchmaking", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmakingId, action }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Publiceren mislukt");
      setPublication(json.publication ?? null);
      if (action === "offline") {
        setQrOpen(false);
        setNotice("Publicatie offline gezet");
      } else {
        setNotice(action === "publish_live" ? "Openbare line-up gepubliceerd" : "Trainerssnapshot gepubliceerd");
      }
    } catch (e: any) { setError(e?.message ?? "Publiceren mislukt"); }
    finally { setBusy(false); }
  }

  async function copyLink(url: string) {
    try { await navigator.clipboard.writeText(url); setNotice("Link gekopieerd"); }
    catch { setError("Kopiëren mislukt. Open de link en kopieer hem vanuit de adresbalk."); }
  }

  function printQrPoster() {
    if (!publicUrl) return;
    const qrSrc = `${window.location.origin}/api/public/qr-code?url=${encodeURIComponent(publicUrl)}`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Pop-up geblokkeerd. Sta pop-ups toe om de QR-poster af te drukken.");
      return;
    }
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char
    );
    printWindow.document.write(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>NVB openbare line-up QR-code</title>
      <style>@page{size:A4;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;color:#202020;margin:0;text-align:center}
      .poster{min-height:255mm;display:flex;flex-direction:column;align-items:center;justify-content:center;border:5px solid #ff4d00;box-sizing:border-box;padding:20mm 12mm}
      .hero{width:100%;height:65mm;object-fit:cover;object-position:center 53%;margin-bottom:16mm}h2{font-size:26px;margin:0 0 25px}
      img{width:110mm;height:110mm;object-fit:contain;image-rendering:pixelated}
      p{font-size:18px;margin:26px 0 10px}small{font-size:11px;overflow-wrap:anywhere;max-width:100%}
      @media print{.poster{break-inside:avoid}}</style></head><body>
      <div class="poster"><img class="hero" src="/branding/fightsupport/matchmaking.png" alt="Boksring"><h2>BEKIJK DE ACTUELE LINE-UP</h2>
      <img id="qr" alt="QR-code openbare line-up" src="${escapeHtml(qrSrc)}">
      <p>Scan deze QR-code met je telefoon</p><small>${escapeHtml(publicUrl)}</small></div>
      <script>const qr=document.getElementById('qr');qr.onload=()=>{setTimeout(()=>window.print(),200)};qr.onerror=()=>{document.body.insertAdjacentHTML('beforeend','<p>QR-code kon niet worden geladen. Probeer opnieuw.</p>')};</script>
      </body></html>`);
    printWindow.document.close();
  }

  const itemClass = "flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white hover:bg-white/10 disabled:opacity-40";
  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button type="button" onClick={() => { setOpen(v => !v); setQrOpen(false); }} disabled={disabled || busy}
        aria-expanded={open} className="inline-flex items-center gap-2 rounded border border-orange-500/50 bg-orange-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
        <Globe2 size={15} /> Publiceren <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded border border-white/20 bg-zinc-900 p-1 shadow-2xl">
          <button className={itemClass} disabled={busy} onClick={() => void act("publish_live")}>
            <Globe2 size={15} /> {publication?.is_enabled ? "Openbare line-up bijwerken" : "Line-up online zetten"}
          </button>
          <button className={itemClass} disabled={busy} onClick={() => void act("publish_trainers")}>Trainerssnapshot publiceren</button>
          <button className={itemClass} disabled={!publicUrl} onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}>
            <ExternalLink size={15} /> Openbare line-up openen
          </button>
          <button className={itemClass} disabled={!publicUrl} onClick={() => void copyLink(publicUrl)}>
            <Copy size={15} /> Openbare link kopiëren
          </button>
          <button className={itemClass} disabled={!publicUrl} onClick={() => setQrOpen(v => !v)}>
            <QrCode size={15} /> {qrOpen ? "QR-code verbergen" : "QR-code tonen"}
          </button>
          <button className={itemClass} disabled={!publicUrl} onClick={printQrPoster}>
            <QrCode size={15} /> QR-code afdrukken (A4)
          </button>
          {qrOpen && publicUrl && (
            <div className="mx-2 my-2 rounded bg-white p-3 text-center">
              <img alt="QR-code voor openbare matchmaking" width={200} height={200} className="mx-auto"
                src={`/api/public/qr-code?url=${encodeURIComponent(publicUrl)}`} />
              <p className="mt-2 break-all text-[10px] text-zinc-700">{publicUrl}</p>
            </div>
          )}
          {trainerUrl && <button className={itemClass} onClick={() => void copyLink(trainerUrl)}><Copy size={15} /> Trainerslink kopiëren</button>}
          <div className="my-1 border-t border-white/15" />
          <button className={itemClass} disabled={busy || (!publication?.is_enabled && !publication?.trainer_is_published)}
            onClick={() => void act("offline")}>Publicatie offline zetten</button>
          {notice && <p className="px-3 py-2 text-xs text-emerald-300">{notice}</p>}
          {error && <p role="alert" className="px-3 py-2 text-xs text-red-300">{error}</p>}
        </div>
      )}
    </div>
  );
}
