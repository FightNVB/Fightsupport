import { NextResponse } from "next/server";
import { PRIVATE_NO_STORE, requireMatchmakingAccess, secureError } from "@/lib/api/secureRoute";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function safe(v: any) {
  const s = String(v ?? "").trim();
  return s;
}

function splitName(full: string): { first: string; last: string } {
  const s = safe(full);
  if (!s) return { first: "", last: "" };
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function pickWeight(row: any, side: "rood" | "blauw"): string {
  // pak wat je hebt (pas keys gerust aan)
  const candidates = [
    row?.[`${side}_gewicht_mm`],
    row?.[`${side}_gewicht_fp`],
    row?.[`${side}_gewicht`],
    row?.[`${side}_weeggewicht`],
  ];
  for (const c of candidates) {
    const s = safe(c);
    if (s) return s;
  }
  return "";
}

function pickBirth(row: any, side: "rood" | "blauw"): string {
  const candidates = [row?.[`${side}_geboortedatum_fp`], row?.[`${side}_geboortedatum_mm`]];
  for (const c of candidates) {
    const s = safe(c);
    if (s) return s.length >= 10 ? s.slice(0, 10) : s;
  }
  return "";
}

function pickGender(row: any, side: "rood" | "blauw"): string {
  // sportdata voorbeeld: m/v (klein)
  const s = safe(row?.[`${side}_geslacht`] ?? "");
  if (!s) return "";
  const low = s.toLowerCase();
  if (low.startsWith("m")) return "m";
  if (low.startsWith("v") || low.startsWith("f")) return "v";
  return low.slice(0, 1);
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  // semicolon CSV: quote als nodig
  if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const matchmaking_id = searchParams.get("matchmaking_id");
    if (!matchmaking_id) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    await requireMatchmakingAccess(req, matchmaking_id);

    // pak nieuwste run via context (zelfde aanpak als je page)
    const { data: lastCtxRows, error: lastErr } = await supabaseAdmin
      .from("controle_bout_context")
      .select("controle_run_id, created_at")
      .eq("matchmaking_id", matchmaking_id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastErr) throw lastErr;
    const runId = lastCtxRows?.[0]?.controle_run_id ? String(lastCtxRows[0].controle_run_id) : null;

    let q = supabaseAdmin.from("controle_bout_context").select("*").eq("matchmaking_id", matchmaking_id);
    if (runId) q = q.eq("controle_run_id", runId);

    const { data: rows, error } = await q.order("partij_nr", { ascending: true });
    if (error) throw error;

    const header = [
      "Clubnaam",
      "Korte Clubnaam",
      "Land code",
      "Voornaam",
      "Achternaam",
      "Geslacht",
      "Geboortedatum",
      "Categorie (Partij)",
      "Geslacht categorie",
      "min leeftijd",
      "te oud leeftijd",
      "Int. ID",
      "Nat. ID(Vanr.)",
      "gewicht",
      "lengte",
      "kleur band",
      "Dan graad",
      "link foto",
      "Email",
      "opmerking",
      "passport ID",
      "Plaatsing",
    ];

    const lines: string[] = [];
    lines.push(header.map(csvEscape).join(";"));

    for (const r of rows ?? []) {
      const pn = Number((r as any)?.partij_nr);
      const cat = Number.isFinite(pn) ? `Fight ${String(pn).padStart(3, "0")}` : "";

      for (const side of ["rood", "blauw"] as const) {
        const fullName = safe((r as any)?.[`${side}_naam_fp`] ?? (r as any)?.[`${side}_naam_mm`] ?? "");
        const { first, last } = splitName(fullName);

        const club = safe((r as any)?.[`${side}_gym_mm`] ?? "");
        const va = safe((r as any)?.[`${side}_va_mm`] ?? "");

        // als kant leeg is: skip (voorkomt “lege tegenstander” als rij)
        if (!fullName && !va && !club) continue;

        const gender = pickGender(r, side);
        const birth = pickBirth(r, side);
        const weight = pickWeight(r, side);

        const rowOut = [
          club, // Clubnaam
          club, // Korte Clubnaam
          "NED", // Land code (pas aan als je land in context hebt)
          first,
          last,
          gender,
          birth,
          cat,
          gender, // Geslacht categorie
          "", // min leeftijd
          "", // te oud leeftijd
          "", // Int. ID
          va, // Nat. ID(Vanr.)
          weight, // gewicht
          "", // lengte
          "", // kleur band
          "", // Dan graad
          "", // link foto
          "", // Email
          "", // opmerking
          "", // passport ID
          "", // Plaatsing
        ];

        lines.push(rowOut.map(csvEscape).join(";"));
      }
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sportdata_${matchmaking_id}.csv"`,
        "Cache-Control": PRIVATE_NO_STORE,
      },
    });
  } catch (e: any) {
    return secureError(e, "CSV-export kon niet worden gemaakt.");
  }
}
