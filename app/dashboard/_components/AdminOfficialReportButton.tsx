"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const BUTTON_ID = "fs-admin-eindrapport-button";

function labelOf(button: HTMLButtonElement) {
  return String(button.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function AdminOfficialReportButton() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Het gewone admin-rapport bevat historisch nog een teruglink naar de
    // matchmaker-route. Corrigeer die op de admin-route naar de admincontrole.
    const reportMatch = pathname.match(
      /^\/dashboard\/admin\/controle\/([^/]+)\/rapport\/?$/,
    );

    if (reportMatch) {
      const matchmakingId = decodeURIComponent(reportMatch[1]);
      const adminHref = `/dashboard/admin/controle/${encodeURIComponent(matchmakingId)}`;

      const fixBackLink = () => {
        const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"));
        const backLink = links.find((link) => {
          const label = String(link.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
          const href = link.getAttribute("href") ?? "";
          return (
            label === "← terug" &&
            href.includes(`/dashboard/matchmaker/matchmaking/${matchmakingId}`)
          );
        });

        if (backLink) backLink.setAttribute("href", adminHref);
      };

      fixBackLink();
      const observer = new MutationObserver(fixBackLink);
      observer.observe(document.body, { childList: true, subtree: true });

      return () => observer.disconnect();
    }

    const match = pathname.match(/^\/dashboard\/admin\/controle\/([^/]+)\/?$/);
    if (!match) return;

    const matchmakingId = decodeURIComponent(match[1]);

    const mount = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));

      // Sportdata hoort niet meer in de admin matchmakingId/control toolbar.
      for (const button of buttons) {
        if (labelOf(button) === "sportdata") {
          button.style.display = "none";
          button.setAttribute("aria-hidden", "true");
          button.tabIndex = -1;
        }
      }

      if (document.getElementById(BUTTON_ID)) return;

      const rapportButton = buttons.find((button) => labelOf(button) === "rapport");
      if (!rapportButton?.parentElement) return;

      // Clone de bestaande Rapport-knop zodat Eindrapport exact dezelfde styling,
      // afmetingen en hover states gebruikt als de overige toolbar-knoppen.
      const button = rapportButton.cloneNode(true) as HTMLButtonElement;
      button.id = BUTTON_ID;
      button.type = "button";
      button.textContent = "Eindrapport";
      button.title = "Open het eindrapport van de laatste afgeronde admincontrole.";
      button.removeAttribute("disabled");
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        router.push(
          `/dashboard/admin/controle/${encodeURIComponent(matchmakingId)}/eindrapport`,
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
