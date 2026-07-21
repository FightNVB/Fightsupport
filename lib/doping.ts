export function normalizeDopingDiscipline(value: unknown): "KB/TB" | "MMA" | null {
  const s = String(value ?? "").toLowerCase();
  if (!s) return null;
  if (s.includes("mma")) return "MMA";
  if (s.includes("kick") || s.includes("k1") || s.includes("muay") || s.includes("thai") || s === "kb/tb") return "KB/TB";
  return null;
}

export function normalizeDopingClass(value: unknown): string | null {
  const s = String(value ?? "").trim().toUpperCase();
  if (!s) return null;
  if (s === "PRO" || s.includes("PROFESSIONAL")) return "PRO";
  if (s === "AMATEUR" || s === "AMA" || s.includes("AMATEUR")) return "AMATEUR";
  if (s.includes("J+") || s.includes("JEUGD") || s.includes("YOUTH") || s === "J") return "J";
  for (const k of ["A", "B", "C", "N", "R"]) {
    if (s === k || s.includes(`${k}-KLASSE`) || s.includes(`${k} KLASSE`) || s.includes(`${k} CLASS`)) return k;
  }
  return s;
}

export function isCurrentMandatoryDopingTarget(discipline: string | null, klasse: string | null) {
  return (discipline === "KB/TB" && (klasse === "A" || klasse === "B")) ||
    (discipline === "MMA" && klasse === "PRO");
}
