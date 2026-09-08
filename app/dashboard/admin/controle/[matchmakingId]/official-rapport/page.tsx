"use client";

import { useEffect, type MouseEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import EindrapportPage from "@/app/dashboard/matchmaker/matchmaking/[matchmakingId]/official-rapport/page";

export default function AdminEindrapportPage() {
  const router = useRouter();
  const params = useParams<{ matchmakingId: string }>();
  const matchmakingId = String(params?.matchmakingId ?? "").trim();

  useEffect(() => {
    const applyAdminLabels = () => {
      const headings = Array.from(document.querySelectorAll<HTMLHeadingElement>("h1"));
      const heading = headings.find((el) =>
        String(el.textContent ?? "").toLowerCase().includes("eindrapport officials"),
      );
      if (heading) heading.textContent = "Eindrapport";

      const subtitle = Array.from(document.querySelectorAll<HTMLElement>("div, p, span")).find(
        (el) =>
          String(el.textContent ?? "").trim() ===
          "Laatste eindcontrole voor de dienstdoende hoofdofficial",
      );
      if (subtitle) subtitle.textContent = "Samenvatting van de laatste afgeronde admincontrole";
    };

    applyAdminLabels();
    const observer = new MutationObserver(applyAdminLabels);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function interceptBack(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const button = target?.closest("button");
    if (!button) return;

    const text = String(button.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    if (text !== "← terug" && text !== "terug" && !text.startsWith("← terug")) return;

    event.preventDefault();
    event.stopPropagation();
    if (matchmakingId) {
      router.push(`/dashboard/admin/controle/${encodeURIComponent(matchmakingId)}`);
    } else {
      router.push("/dashboard/admin/controle");
    }
  }

  return (
    <div onClickCapture={interceptBack}>
      <EindrapportPage />
    </div>
  );
}
