"use client";

import { useEffect } from "react";

const BONDTEAMS = ["IRO", "FOG", "MMAAN", "MON", "NKF", "UMC", "VON", "WMTA", "WPKL"];
const BONDTEAM_SET = new Set(BONDTEAMS);

function looksLikeBondteamSelect(select: HTMLSelectElement) {
  const values = Array.from(select.options)
    .map((option) => String(option.value || option.textContent || "").trim().toUpperCase())
    .filter(Boolean);

  return values.filter((value) => BONDTEAM_SET.has(value)).length >= 3;
}

function syncSelect(select: HTMLSelectElement) {
  if (!looksLikeBondteamSelect(select)) return;

  const current = String(select.value || "").trim().toUpperCase();
  const emptyOption = Array.from(select.options).find((option) => !String(option.value || "").trim());
  const emptyLabel = emptyOption?.textContent || "Kies bondteam";

  const fragment = document.createDocumentFragment();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = emptyLabel;
  fragment.appendChild(placeholder);

  for (const bondteam of BONDTEAMS) {
    const option = document.createElement("option");
    option.value = bondteam;
    option.textContent = bondteam;
    fragment.appendChild(option);
  }

  select.replaceChildren(fragment);
  if (current && BONDTEAM_SET.has(current)) select.value = current;
}

function syncAll() {
  const path = window.location.pathname.toLowerCase();
  if (!path.includes("/upload") && !path.includes("/matchmaking")) return;

  document.querySelectorAll("select").forEach((node) => syncSelect(node as HTMLSelectElement));
}

export default function BondteamOptionsSync() {
  useEffect(() => {
    syncAll();

    const observer = new MutationObserver(syncAll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
