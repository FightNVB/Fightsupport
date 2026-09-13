"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function AdminRapportLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ matchmakingId: string }>();
  const matchmakingId = String(params?.matchmakingId ?? "").trim();

  useEffect(() => {
    if (!matchmakingId) return;

    const wrongHref = `/dashboard/matchmaker/matchmaking/${matchmakingId}`;
    const adminHref = `/dashboard/admin/controle/${matchmakingId}`;

    const fixBackLink = () => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
      for (const link of links) {
        if (link.getAttribute("href") === wrongHref) {
          link.setAttribute("href", adminHref);
        }
      }
    };

    fixBackLink();

    const observer = new MutationObserver(fixBackLink);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [matchmakingId]);

  return children;
}
