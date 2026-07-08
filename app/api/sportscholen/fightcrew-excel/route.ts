import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type Fighter = {
  id?: string | number | null;
  sportschool_id?: string | number | null;
  va_nummer?: string | number | null;
  naam?: string | null;
  fp_naam?: string | null;
  geboortedatum?: string | null;
  fp_geboortedatum?: string | null;
  geslacht?: string | null;
  discipline?: string | null;
  klasse?: string | null;
  gewicht?: string | number | null;
  licentie?: string | boolean | null;
  licentie_status?: string | boolean | null;
  heeft_licentie?: string | boolean | null;
  heeft_startverbod?: string | boolean | null;
  startverbod?: string | boolean | null;
  totaal_wedstrijden?: number | null;
  gewonnen?: number | null;
  verloren?: number | null;
  onbeslist?: number | null;
  nulmeting_klasse?: string | null;
  nulmeting_totaal?: number | null;
  nulmeting_opmerking?: string | null;
  scrape_status?: string | null;
  status?: string | null;
  scrape_error?: string | null;
  scraped_at?: string | null;
  raw?: any;
};

type Uitslag = {
  id?: string | number | null;
  va_nummer?: string | number | null;
  sportschool_id?: string | number | null;
  datum?: string | null;
  evenement?: string | null;
  tegenstander?: string | null;
  uitslag?: string | null;
  discipline?: string | null;
  klasse?: string | null;
  gewicht?: string | number | null;
  sportschool?: string | null;
};

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function safe(v: unknown, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function parseRaw(raw: any) {
  if (!raw) return {} as any;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {} as any;
  }
}

function yes(v: unknown) {
  const s = String(v ?? "").trim().toLowerCase();
  return v === true || ["ja", "yes", "true", "1", "ok", "geldig", "actief"].includes(s);
}

function normalizeVa(v: unknown) {
  return String(v ?? "").replace(/[^0-9]/g, "");
}

function normalizeSportschoolId(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

function formatDate(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("nl-NL");
}

function calculateAge(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "-";

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "-";

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
    age--;
  }

  return String(age);
}


function statusValue(f: Fighter) {
  return String(f.scrape_status ?? f.status ?? "").trim().toLowerCase();
}

function checked(f: Fighter) {
  return ["klaar", "gescrapt", "gescraped", "gecontroleerd"].includes(statusValue(f));
}

function failed(f: Fighter) {
  return ["mislukt", "failed", "scrape_mislukt", "fout"].includes(statusValue(f));
}

function statusLabel(f: Fighter) {
  const s = statusValue(f);
  if (!s) return "Niet gestart";
  if (checked(f)) return "Gecontroleerd";
  if (["bezig", "running", "controle_bezig"].includes(s)) return "Bezig";
  if (failed(f)) return "Mislukt";
  return safe(f.scrape_status ?? f.status);
}

function fighterName(f: Fighter) {
  return safe(f.fp_naam ?? f.naam, "Onbekende vechter");
}

function dob(f: Fighter) {
  return safe(f.fp_geboortedatum ?? f.geboortedatum);
}

function licenseValue(f: Fighter) {
  const raw = parseRaw(f.raw);
  return f.licentie ?? f.licentie_status ?? f.heeft_licentie ?? raw?.details?.licentie ?? null;
}

function hasStartverbod(f: Fighter) {
  const raw = parseRaw(f.raw);
  return yes(f.heeft_startverbod) || yes(f.startverbod) || yes(raw?.details?.heeft_startverbod);
}

function getResultKind(v?: string | null): "win" | "loss" | "draw" | "other" {
  const x = String(v ?? "").trim().toLowerCase();
  if (x.includes("onbeslist") || x.includes("draw") || x.includes("gelijk")) return "draw";
  if (x.includes("verlies") || x.includes("verliest") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("winst") || x.includes("wint") || x.includes("gewonnen") || x === "win" || x === "w") return "win";
  return "other";
}

function normalizeClassToken(v?: string | null) {
  const x = String(v ?? "").trim().toLowerCase();
  if (!x) return "";
  if (x.includes("jeugd") || x.includes("youth") || /^j(\b|\s|\/|-)/i.test(x) || x === "j") return "j";
  if (x.includes("recreant") || /^r(\b|\s|\/|-)/i.test(x) || x === "r") return "r";
  if (x.includes("nieuweling") || /^n(\b|\s|\/|-)/i.test(x) || x === "n") return "n";
  if (x.includes("c-klasse") || x.includes("c klasse") || /^c(\b|\s|\/|-)/i.test(x) || x === "c") return "c";
  if (x.includes("b-klasse") || x.includes("b klasse") || /^b(\b|\s|\/|-)/i.test(x) || x === "b") return "b";
  if (x.includes("a-klasse") || x.includes("a klasse") || x.includes("elite") || /^a(\b|\s|\/|-)/i.test(x) || x === "a") return "a";
  return x.replace(/[^a-z0-9+]/g, "");
}

function classRank(token?: string | null) {
  const t = normalizeClassToken(token);
  const order: Record<string, number> = { j: 1, r: 2, n: 3, c: 4, b: 5, a: 6 };
  return order[t] ?? 0;
}

function highestRecordClass(rows: Uitslag[]) {
  let best = "";
  let bestRank = 0;
  for (const row of rows) {
    const token = normalizeClassToken(row.klasse);
    const rank = classRank(token);
    if (rank > bestRank) {
      best = token;
      bestRank = rank;
    }
  }
  return best;
}

function displayClassToken(v?: string | null) {
  const token = normalizeClassToken(v);
  const labels: Record<string, string> = {
    j: "J",
    r: "R",
    n: "N",
    c: "C",
    b: "B",
    a: "A",
  };
  return labels[token] ?? safe(v);
}

function firstFilled(...vals: unknown[]) {
  for (const val of vals) {
    const out = String(val ?? "").trim();
    if (out) return out;
  }
  return "";
}

function disciplineFromFighterAndUitslagen(f: Fighter, uitslagen: Uitslag[], raw: AnyRow) {
  const uitslagDisciplines = uitslagen
    .map((u) => String(u.discipline ?? "").trim())
    .filter(Boolean);

  // Als iemand MMA-uitslagen heeft, is de export-discipline MMA.
  const hasMma = uitslagDisciplines.some((d) => d.toLowerCase().includes("mma"));
  if (hasMma) return "MMA";

  return safe(
    firstFilled(
      f.discipline,
      raw?.discipline,
      raw?.details?.discipline,
      raw?.nulmeting?.discipline,
      uitslagDisciplines[0],
      "Kickboksen",
    ),
    "Kickboksen",
  );
}

function classFromFighterAndUitslagen(f: Fighter, uitslagen: Uitslag[], raw: AnyRow) {
  const hoogsteUitslagenKlasse = highestRecordClass(uitslagen);
  return highestRecordClass(uitslagen)
    ? displayClassToken(hoogsteUitslagenKlasse)
    : displayClassToken(firstFilled(f.nulmeting_klasse, raw?.nulmeting?.klasse, f.klasse, raw?.details?.klasse));
}

function recordLabelFromUitslagen(rows: Uitslag[]) {
  const hoogsteKlasse = highestRecordClass(rows);
  const r = rows.reduce(
    (acc, row) => {
      const kind = getResultKind(row.uitslag);
      const rowKlasse = normalizeClassToken(row.klasse);
      if (!hoogsteKlasse || rowKlasse !== hoogsteKlasse || kind === "other") {
        acc.other += 1;
        return acc;
      }
      if (kind === "win") acc.w += 1;
      else if (kind === "loss") acc.l += 1;
      else if (kind === "draw") acc.d += 1;
      else acc.other += 1;
      return acc;
    },
    { w: 0, l: 0, d: 0, other: 0 },
  );
  return `${r.w}-${r.l}-${r.d} (${r.other})`;
}

function slugify(v: unknown) {
  const s = String(v ?? "fightcrew")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  return s || "fightcrew";
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Supabase env vars ontbreken");
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getProfile(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, userId: string, email?: string | null) {
  const clauses = [`id.eq.${userId}`];
  if (email) clauses.push(`email.eq.${email}`);

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id,email,full_name,role,bondteam,active_sportschool_id,meekijk_sportschool_id")
    .or(clauses.join(","))
    .maybeSingle();

  if (error) throw error;
  return data as AnyRow | null;
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const auth = await requireAnyRole(req, ["sportschool", "admin", "superadmin"]);

    const profile = await getProfile(supabaseAdmin, auth.userId, auth.email);
    if (!profile) return jsonError("Gebruikersprofiel niet gevonden", 404);

    const url = new URL(req.url);
    const requestedSportschoolId = normalizeSportschoolId(url.searchParams.get("sportschool_id"));
    const ownSportschoolId = normalizeSportschoolId(profile.active_sportschool_id ?? profile.meekijk_sportschool_id);
    const role = String(auth.role ?? "").toLowerCase();
    const bondteam = String(profile.bondteam ?? "").toUpperCase();

    const mayChooseSportschool = ["superadmin", "admin"].includes(role) || (role === "superadmin" && bondteam === "NVB");
    const sportschoolId = requestedSportschoolId && mayChooseSportschool ? requestedSportschoolId : ownSportschoolId;

    if (!sportschoolId) return jsonError("Geen sportschool gekoppeld aan dit account", 403);

    const sportschoolIdNumber = Number(sportschoolId);
    const sportschoolFilterValue = Number.isFinite(sportschoolIdNumber) ? sportschoolIdNumber : sportschoolId;

    const { data: sportschool, error: sportschoolError } = await supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id,naam,plaats,land,keurmerk_start,keurmerk_einde")
      .eq("sportschool_id", sportschoolFilterValue)
      .maybeSingle();

    if (sportschoolError) throw sportschoolError;

    const { data: fightersData, error: fightersError } = await supabaseAdmin
      .from("sportschool_fighters")
      .select("*")
      .eq("sportschool_id", sportschoolFilterValue)
      .order("fp_naam", { ascending: true, nullsFirst: false })
      .order("naam", { ascending: true, nullsFirst: false });

    if (fightersError) throw fightersError;

    const fighters = ((fightersData ?? []) as Fighter[]).sort((a, b) =>
      fighterName(a).localeCompare(fighterName(b), "nl"),
    );

    const vaNummers = Array.from(new Set(fighters.map((f) => normalizeVa(f.va_nummer)).filter(Boolean)));
    const uitslagenByVa: Record<string, Uitslag[]> = {};

    for (const vaChunk of chunk(vaNummers, 250)) {
      const { data: uitslagen, error: uitslagenError } = await supabaseAdmin
        .from("sportschool_fighter_uitslagen_raw")
        .select("id,sportschool_id,va_nummer,datum,evenement,tegenstander,uitslag,discipline,klasse,gewicht,sportschool")
        .eq("sportschool_id", sportschoolFilterValue)
        .in("va_nummer", vaChunk)
        .order("datum", { ascending: false });

      if (uitslagenError) throw uitslagenError;

      for (const row of (uitslagen ?? []) as Uitslag[]) {
        const va = normalizeVa(row.va_nummer);
        if (!va) continue;
        if (!uitslagenByVa[va]) uitslagenByVa[va] = [];
        uitslagenByVa[va].push(row);
      }
    }

    const rows = fighters.map((f) => {
      const raw = parseRaw(f.raw);
      const va = normalizeVa(f.va_nummer);
      const uitslagen = uitslagenByVa[va] ?? [];
      const discipline = disciplineFromFighterAndUitslagen(f, uitslagen, raw);
      const klasse = classFromFighterAndUitslagen(f, uitslagen, raw);

      return {
        Naam: fighterName(f),
        VA: safe(f.va_nummer),
        Leeftijd: calculateAge(dob(f)),
        Geslacht: safe(f.geslacht),
        Discipline: discipline,
        Klasse: klasse,
        Gewicht: safe(f.gewicht),
        "Fightpaspoort klasse": safe(f.nulmeting_klasse ?? raw?.nulmeting?.klasse),
        Record: recordLabelFromUitslagen(uitslagen),
        Licentie: yes(licenseValue(f)) ? "OK" : "Geen licentie",
        Startverbod: hasStartverbod(f) ? "JA" : "NEE",
        "Laatst gecontroleerd": formatDate(f.scraped_at),
      };
    });

    const infoRows = [
      ["Sportschool", safe((sportschool as AnyRow | null)?.naam, `Sportschool ${sportschoolId}`)],
      ["Plaats", safe((sportschool as AnyRow | null)?.plaats, "")],
      ["Land", safe((sportschool as AnyRow | null)?.land, "")],
      ["Keurmerk start", formatDate((sportschool as AnyRow | null)?.keurmerk_start)],
      ["Keurmerk einde", formatDate((sportschool as AnyRow | null)?.keurmerk_einde)],
      ["Export datum", new Date().toLocaleString("nl-NL")],
      ["Aantal vechters", String(fighters.length)],
    ];

    const workbook = XLSX.utils.book_new();
    const infoSheet = XLSX.utils.aoa_to_sheet(infoRows);
    infoSheet["!cols"] = [{ wch: 22 }, { wch: 42 }];
    XLSX.utils.book_append_sheet(workbook, infoSheet, "Sportschool");

    const fighterSheet = XLSX.utils.json_to_sheet(rows);
    fighterSheet["!cols"] = [
      { wch: 28 }, // Naam
      { wch: 12 }, // VA
      { wch: 10 }, // Leeftijd
      { wch: 12 }, // Geslacht
      { wch: 16 }, // Discipline
      { wch: 12 }, // Klasse
      { wch: 10 }, // Gewicht
      { wch: 20 }, // Fightpaspoort klasse
      { wch: 13 }, // Record
      { wch: 16 }, // Licentie
      { wch: 13 }, // Startverbod
      { wch: 18 }, // Laatst gecontroleerd
    ];
    XLSX.utils.book_append_sheet(workbook, fighterSheet, "Fightcrew");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const fileBase = slugify((sportschool as AnyRow | null)?.naam ?? `sportschool_${sportschoolId}`);
    const filename = `${fileBase}_fightcrew.xlsx`;

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("Fightcrew Excel export mislukt", e);
    return jsonError(e?.message || "Fightcrew Excel export mislukt", 500);
  }
}
