"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";
import { authedDownload } from "@/lib/api/authedDownload";

export default function OfficialsMatchmakingLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ matchmakingId: string }>();
  const pathname = usePathname();
  const matchmakingId = String(params?.matchmakingId ?? "").trim();
  const [isVon, setIsVon] = useState(false);
  const isMainPage = pathname === `/dashboard/officials/controle/${matchmakingId}`;

  useEffect(() => {
    if (!matchmakingId || !isMainPage) return;
    let alive = true;
    (async () => {
      try {
        const response = await authedFetch(`/api/rapport/official-eindrapport?matchmaking_id=${encodeURIComponent(matchmakingId)}`, { cache: "no-store" });
        const json = await response.json();
        if (alive) setIsVon(response.ok && String(json?.event?.bondteam ?? "").trim().toUpperCase() === "VON");
      } catch {
        if (alive) setIsVon(false);
      }
    })();
    return () => { alive = false; };
  }, [matchmakingId, isMainPage]);

  return <>{children}{isMainPage && isVon ? <button type="button" onClick={() => authedDownload(`/api/rapport/sportdata-csv?matchmaking_id=${encodeURIComponent(matchmakingId)}`, "sportdata.csv")} className="fixed bottom-5 right-5 z-[80] border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-xs font-black uppercase text-black shadow-xl hover:brightness-110">Sportdata</button> : null}</>;
}
