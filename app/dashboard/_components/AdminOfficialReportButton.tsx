"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const BUTTON_ID = "fs-admin-official-report-button";

export default function AdminOfficialReportButton() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/admin\/controle\/([^/]+)\/?$/);
    if (!match) return;

    const matchmakingId = decodeURIComponent(match[1]);

    const mount = () => {
      if (document.getElementById(BUTTON_ID)) return;

      const buttons = Array.from(document.querySelectorAll("button"));
      const rapportButton = buttons.find(
        (button) => String(button.textContent ?? "").trim().toLowerCase() === "rapport",
      );

      if (!rapportButton?.parentElement) return;

      const button = document.createElement("button");
      button.id = BUTTON_ID;
      button.type = "button";
      button.className = rapportButton.className;
      button.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:.45rem">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <path d="M14 2v6h6"></path>
            <path d="M16 13H8"></path>
            <path d="M16 17H8"></path>
          </svg>
          <span>Eindrapport</span>
        </span>`;
      button.title = "Open het beknopte eindrapport met de actuele eventstatus uit de laatste afgeronde admincontrole.";
      button.addEventListener("click", () => {
        router.push(
          `/dashboard/admin/controle/${encodeURIComponent(matchmakingId)}/official-rapport`,
        );
      });

      rapportButton.insertAdjacentElement("afterend", button);
    };

    mount();

    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.getElementById(BUTTON_ID)?.remove();
    };
  }, [pathname, router]);

  return null;
}
