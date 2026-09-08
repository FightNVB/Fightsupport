"use client";

import { useEffect, type ReactNode } from "react";

export default function EindrapportLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const applyLabels = () => {
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
      if (subtitle) subtitle.textContent = "Samenvatting van de laatste eindcontrole";
    };

    applyLabels();
    const observer = new MutationObserver(applyLabels);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return children;
}
