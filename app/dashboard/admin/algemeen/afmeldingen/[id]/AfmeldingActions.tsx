"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authedFetch } from "@/lib/api/authedFetch";

export default function AfmeldingActions({
  id,
  status,
}: {
  id: string | number;
  status?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"goedkeuren" | "afkeuren" | null>(null);
  const [msg, setMsg] = useState("");
  const closed = ["goedgekeurd", "afgekeurd"].includes(String(status || "").toLowerCase());

  async function submit(action: "goedkeuren" | "afkeuren") {
    if (closed) return;
    const opmerking = window.prompt(
      action === "goedkeuren"
        ? "Opmerking bij goedkeuren (optioneel)"
        : "Waarom keur je deze afmelding af? (optioneel)",
    );

    setBusy(action);
    setMsg("");
    try {
      const res = await authedFetch(`/api/admin/algemeen/afmeldingen/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          afmelding_id: id,
          beoordelings_opmerking: opmerking || null,
          herstel_status: "gescrapt",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Verwerken mislukt");
      setMsg(action === "goedkeuren" ? "Afmelding goedgekeurd." : "Afmelding afgekeurd en vechter teruggezet.");
      router.refresh();
    } catch (e: any) {
      setMsg(e?.message || "Verwerken mislukt");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/20 bg-black/45 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff4d00]">Admin besluit</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={closed || !!busy}
          onClick={() => submit("goedkeuren")}
          className="rounded-2xl border border-emerald-300 bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_0_20px_rgba(16,185,129,0.25)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy === "goedkeuren" ? "Bezig..." : "Afmelding goedkeuren"}
        </button>
        <button
          type="button"
          disabled={closed || !!busy}
          onClick={() => submit("afkeuren")}
          className="rounded-2xl border border-red-300 bg-red-500 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_0_20px_rgba(239,68,68,0.25)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy === "afkeuren" ? "Bezig..." : "Afmelding afkeuren"}
        </button>
      </div>
      {closed && <p className="mt-3 text-sm font-bold text-zinc-300">Deze afmelding is al beoordeeld.</p>}
      {msg && <p className="mt-3 text-sm font-bold text-white">{msg}</p>}
    </div>
  );
}
