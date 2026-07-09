"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authedFetch } from "@/lib/api/authedFetch";

type Props = {
  afmeldingId: string;
  naam?: string;
};

export default function DeleteAfmeldingButton({ afmeldingId, naam }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function removeAfmelding() {
    if (!afmeldingId || busy) return;

    const label = naam?.trim() || "deze afmelding";
    const ok = window.confirm(
      `Weet je zeker dat je ${label} wilt verwijderen? De gekoppelde vechter wordt teruggezet naar gescrapt/matchbaar.`,
    );

    if (!ok) return;

    setBusy(true);

    try {
      const res = await authedFetch(
        `/api/admin/algemeen/afmeldingen/${encodeURIComponent(afmeldingId)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        },
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Afmelding verwijderen mislukt.");
      }

      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Afmelding verwijderen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={removeAfmelding}
      disabled={busy || !afmeldingId}
      className="inline-flex border border-red-500 bg-red-900 px-3 py-1 text-xs font-black uppercase !text-white disabled:cursor-not-allowed disabled:opacity-50"
      title="Afmelding verwijderen en vechter terugzetten"
    >
      {busy ? "Bezig..." : "Verwijder"}
    </button>
  );
}
