"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AdminRapportLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ matchmakingId: string }>();
  const router = useRouter();
  const matchmakingId = String(params?.matchmakingId ?? "").trim();

  useEffect(() => {
    if (!matchmakingId) return;

    const wrongHref = `/dashboard/matchmaker/matchmaking/${matchmakingId}`;
    const adminHref = `/dashboard/admin/controle/${matchmakingId}`;

    const fixBackLink = () => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
      for (const link of links) {
        if (link.getAttribute("href") === wrongHref) link.setAttribute("href", adminHref);
      }
    };

    const interceptWrongBackLink = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href");
      if (href !== wrongHref && href !== adminHref) return;
      if (!String(link.textContent ?? "").toLowerCase().includes("terug")) return;
      event.preventDefault();
      event.stopPropagation();
      router.push(adminHref);
    };

    fixBackLink();
    const observer = new MutationObserver(fixBackLink);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    document.addEventListener("click", interceptWrongBackLink, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", interceptWrongBackLink, true);
    };
  }, [matchmakingId, router]);

  return children;
}
