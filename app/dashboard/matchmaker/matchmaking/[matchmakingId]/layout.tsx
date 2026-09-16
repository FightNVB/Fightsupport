"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

type RunStatus = {
  id?: string;
  status?: string | null;
  progress?: number | null;
  current_step?: string | null;
  foutmelding?: string | null;
};

export default function MatchmakingLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ matchmakingId: string }>();
  const matchmakingId = String(params?.matchmakingId ?? "").trim();
  const [run, setRun] = useState<RunStatus | null>(null);

  useEffect(() => {
    if (!matchmakingId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await authedFetch(
          `/api/matchmaker/eindcontrole/start?matchmaking_id=${encodeURIComponent(matchmakingId)}`,
          { method: "GET", cache: "no-store" },
        );
        const payload = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setRun(payload?.run ?? null);
      } catch {
        // Navigeren moet blijven werken als alleen de statuscheck tijdelijk faalt.
      }

      if (!cancelled) timer = setTimeout(poll, 3000);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [matchmakingId]);

  const status = String(run?.status ?? "").toLowerCase();
  const running = status === "running";
  const failed = ["failed", "fout", "error", "aborted"].includes(status);
  const progress = Math.max(0, Math.min(100, Number(run?.progress ?? 0)));

  return (
    <>
      {(running || failed) && (
        <div className="sticky top-0 z-[100] border-b border-black/20 bg-zinc-950 px-4 py-2 text-white shadow-lg">
          <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 text-sm">
            {running ? (
              <>
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff4d00]" />
                <strong>Matchmaker Eindcontrole draait</strong>
                <span className="text-zinc-300">{run?.current_step || "FightPassport wordt live gecontroleerd..."}</span>
                <span className="ml-auto tabular-nums font-bold">{progress}%</span>
              </>
            ) : (
              <>
                <strong className="text-red-300">Matchmaker Eindcontrole gestopt</strong>
                <span className="text-zinc-300">{run?.foutmelding || "De eindcontrole is niet volledig afgerond."}</span>
              </>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  );
}
