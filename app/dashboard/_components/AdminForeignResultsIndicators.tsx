"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = Record<string, any>;

function s(v: unknown) {
  return String(v ?? "").trim();
}

export default function AdminForeignResultsIndicators() {
  const path = usePathname() ?? "";
  const match = path.match(/^\/dashboard\/admin\/controle\/([^/]+)(?:\/partij\/(\d+))?\/?$/);
  const matchmakingId = match?.[1] ?? "";
  const currentPartijNr = match?.[2] ?? "";
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!matchmakingId) {
      setRows([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await authedFetch(
          `/api/matchmaker/buitenlandse-uitslagen?matchmaking_id=${encodeURIComponent(matchmakingId)}`,
          { cache: "no-store" },
        );
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setRows(Array.isArray(json?.uitslagen) ? json.uitslagen : []);
        }
      } catch {
        if (!cancelled) setRows([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchmakingId]);

  const counts = useMemo(() => {
    const map = new Map<string, { total: number; open: number }>();
    for (const row of rows) {
      const partijNr = s(row?.partij_nr);
      if (!partijNr) continue;
      const current = map.get(partijNr) ?? { total: 0, open: 0 };
      current.total += 1;
      const status = s(row?.status).toUpperCase();
      if (status !== "VERWERKT_IN_FIGHTPASSPORT" && status !== "AFGEWEZEN") {
        current.open += 1;
      }
      map.set(partijNr, current);
    }
    return map;
  }, [rows]);

  useEffect(() => {
    if (!matchmakingId) return;

    const apply = () => {
      // Op de detailpagina: de knop naast UITSLAGEN alleen tonen als er daadwerkelijk
      // een buitenlandse uitslag voor deze partij bestaat.
      if (currentPartijNr) {
        const hasRows = (counts.get(currentPartijNr)?.total ?? 0) > 0;
        document
          .querySelectorAll<HTMLElement>("[data-foreign-results-button='1']")
          .forEach((button) => {
            button.style.display = hasRows ? "" : "none";
          });
      }

      // Op het admin-overzicht: direct bij de partij-link tonen welke partijen
      // buitenlandse uitslagen hebben. Zo hoeft admin niet iedere partij te openen.
      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
        const href = link.getAttribute("href") ?? "";
        const escapedId = matchmakingId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const m = href.match(
          new RegExp(`/dashboard/admin/controle/${escapedId}/partij/(\\d+)`),
        );
        if (!m) return;

        const partijNr = m[1];
        const info = counts.get(partijNr);
        const existing = link.querySelector<HTMLElement>("[data-foreign-admin-badge='1']");

        if (!info?.total) {
          existing?.remove();
          return;
        }

        const badge = existing ?? document.createElement("span");
        badge.dataset.foreignAdminBadge = "1";
        badge.className =
          "ml-2 inline-flex items-center rounded border border-[#ff4d00] bg-[#ff4d00] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white";
        badge.textContent = info.open > 0
          ? `Buitenlands ${info.total} · ${info.open} open`
          : `Buitenlands ${info.total}`;
        badge.title = `${info.total} buitenlandse uitslag${info.total === 1 ? "" : "en"} gemeld`;
        if (!existing) link.appendChild(badge);
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document
        .querySelectorAll<HTMLElement>("[data-foreign-admin-badge='1']")
        .forEach((el) => el.remove());
      document
        .querySelectorAll<HTMLElement>("[data-foreign-results-button='1']")
        .forEach((button) => {
          button.style.display = "";
        });
    };
  }, [matchmakingId, currentPartijNr, counts]);

  return null;
}
