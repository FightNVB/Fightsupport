import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function pick(...vals: unknown[]) {
  for (const v of vals) {
    const s = clean(v);
    if (s) return v;
  }
  return null;
}

function normalizeVa(v: unknown) {
  const raw = clean(v).replace(/^VA/i, "");
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  return digits || raw;
}

function mapDiscipline(v: unknown) {
  const raw = clean(v);
  const s = raw.toLowerCase();
  if (s.includes("kick")) return "Kickboksen/Kickboxing";
  if (s.includes("thai") || s.includes("muay")) return "Thaiboksen/Muay Thai";
  if (s.includes("mma")) return "MMA/MMA";
  if (s === "boksen" || s === "boxing" || s.includes("boxing")) return "Boksen/Boxing";
  return raw || "Kickboksen/Kickboxing";
}

function isBoksenDiscipline(v: unknown) {
  const s = clean(v).toLowerCase();
  if (!s) return false;
  return s === "boksen" || s === "boxing" || s.includes("boksen") || s.includes("boxing");
}

function mapKlasse(v: unknown) {
  const raw = clean(v);
  const s = raw.toLowerCase();
  if (s.includes("jeugd") || s.includes("youth") || s === "j" || s === "j+") return "Jeugd/Youth";
  if (s.includes("nieuw") || s.includes("newcomer") || s === "n") return "Nieuweling/Newcomer";
  if (s.includes("mma amateur") || s === "ama" || s === "amateur") return "MMA Amateur";
  if (s.includes("mma professional") || s === "pro" || s === "professional") return "MMA Professional";
  if (s.includes("veteraan") || s.includes("veteran")) return "Veteraan/Veteran";
  if (s === "r" || s.includes("r-klasse") || s.includes("r-class")) return "R-Klasse/R-Class";
  if (s === "c" || s.includes("c-klasse") || s.includes("c-class")) return "C-Klasse/C-Class";
  if (s === "b" || s.includes("b-klasse") || s.includes("b-class")) return "B-Klasse/B-Class";
  if (s === "a" || s.includes("a-klasse") || s.includes("a-class")) return "A-Klasse/A-Class";
  return raw || "Nieuweling/Newcomer";
}

function toRedPerspective(winnerCorner: unknown, method: unknown) {
  const hoek = clean(winnerCorner).toLowerCase();
  const m = clean(method);
  const ml = m.toLowerCase();

  if (hoek === "onbeslist" || ml === "onbeslist") return "Onbeslist";
  if (hoek === "no_contest" || hoek === "no contest" || ml === "no contest") return "No contest";
  if (hoek === "demo" || ml === "demo") return "Demo";

  if (hoek === "rood" || hoek === "red") {
    if (ml.startsWith("wint")) return m;
    if (ml.startsWith("verliest")) return m.replace(/^verliest/i, "Wint");
    return `Wint ${m}`.replace(/\s+/g, " ");
  }

  if (hoek === "blauw" || hoek === "blue") {
    if (ml.startsWith("wint")) return m.replace(/^wint/i, "Verliest");
    if (ml.startsWith("verliest")) return m;
    return `Verliest ${m}`.replace(/\s+/g, " ");
  }

  return m;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env mist: NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getMatchmakingId(req: NextRequest) {
  const fromQuery = clean(req.nextUrl.searchParams.get("matchmaking_id"));
  if (fromQuery) return fromQuery;
  const body = await req.json().catch(() => ({}));
  return clean(body?.matchmaking_id);
}

async function getEventMeta(supabase: ReturnType<typeof supabaseAdmin>, matchmakingId: string) {
  const { data: upload } = await supabase
    .from("matchmaking_uploads")
    .select("evenement_naam, evenement_datum, bondteam")
    .eq("matchmaking_id", matchmakingId)
    .maybeSingle();

  if (upload) return upload as AnyRow;

  const { data: mm } = await supabase
    .from("matchmakings")
    .select("naam, datum, huidige_eigenaar_bondteam")
    .eq("id", matchmakingId)
    .maybeSingle();

  return {
    evenement_naam: (mm as AnyRow | null)?.naam ?? null,
    evenement_datum: (mm as AnyRow | null)?.datum ?? null,
    bondteam: (mm as AnyRow | null)?.huidige_eigenaar_bondteam ?? null,
  };
}

async function handleExport(req: NextRequest) {
  try {
    const matchmakingId = await getMatchmakingId(req);
    if (!matchmakingId) {
      return NextResponse.json({ ok: false, error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "FormatImportMatchmakingInclUitslagen (updated).xlsx"
    );

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ ok: false, error: `Template niet gevonden: ${templatePath}` }, { status: 500 });
    }

    const supabase = supabaseAdmin();

    const [{ data: bouts, error: boutsErr }, { data: results, error: resultsErr }] = await Promise.all([
      supabase
        .from("uitslagen_bouts")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .order("partij_nr", { ascending: true }),
      supabase
        .from("uitslagen_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId),
    ]);

    if (boutsErr) throw boutsErr;
    if (resultsErr) throw resultsErr;

    const resultByBoutId = new Map<string, AnyRow>();
    const resultByPartij = new Map<string, AnyRow>();

    for (const r of (results ?? []) as AnyRow[]) {
      const boutId = clean(pick(r.uitslagen_bout_id, r.bout_id));
      if (boutId) resultByBoutId.set(boutId, r);
      const partij = clean(r.partij_nr);
      if (partij) resultByPartij.set(partij, r);
    }

    const exportRows = ((bouts ?? []) as AnyRow[])
      .map((b, index) => {
        const result = resultByBoutId.get(clean(b.id)) ?? resultByPartij.get(clean(b.partij_nr));
        if (!result) return null;
        if (clean(result.uitslag_status).toLowerCase() === "concept") return null;

        const disciplineValue = pick(b.discipline, result.discipline);
        if (isBoksenDiscipline(disciplineValue)) return null;

        return {
          partij_nr: Number(b.partij_nr ?? result.partij_nr ?? index + 1),
          discipline: mapDiscipline(disciplineValue),
          klasse: mapKlasse(pick(b.klasse, result.klasse)),
          rood_va: normalizeVa(pick(b.rood_va, b.rood_va_nummer, b.va_rood, b.rood_va_mm)),
          rood_naam: clean(pick(b.rood_naam, b.rood_volledige_naam, b.rood_fighter_naam)),
          uitslag_rood: toRedPerspective(result.winnaar_hoek, result.methode),
          blauw_va: normalizeVa(pick(b.blauw_va, b.blauw_va_nummer, b.va_blauw, b.blauw_va_mm)),
          blauw_naam: clean(pick(b.blauw_naam, b.blauw_volledige_naam, b.blauw_fighter_naam)),
        };
      })
      .filter(Boolean) as AnyRow[];

    if (exportRows.length === 0) {
      return NextResponse.json({ ok: false, error: "Geen definitieve niet-boksen uitslagen gevonden voor deze matchmaking." }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const sheet = workbook.getWorksheet("Excelformat") ?? workbook.worksheets[0];
    if (!sheet) throw new Error("Werkblad Excelformat niet gevonden in template.");

    const lastRow = Math.max(sheet.rowCount, 300);
    for (let r = 2; r <= lastRow; r += 1) {
      const row = sheet.getRow(r);
      for (let c = 1; c <= 8; c += 1) row.getCell(c).value = null;
      row.commit();
    }

    exportRows.forEach((item, index) => {
      const row = sheet.getRow(index + 2);
      row.getCell(1).value = item.partij_nr || index + 1;
      row.getCell(2).value = item.discipline;
      row.getCell(3).value = item.klasse;
      row.getCell(4).value = item.rood_va;
      row.getCell(5).value = item.rood_naam;
      row.getCell(6).value = item.uitslag_rood;
      row.getCell(7).value = item.blauw_va;
      row.getCell(8).value = item.blauw_naam;
      row.commit();
    });

    sheet.getColumn(1).width = 8;
    sheet.getColumn(2).width = 26;
    sheet.getColumn(3).width = 24;
    sheet.getColumn(4).width = 14;
    sheet.getColumn(5).width = 28;
    sheet.getColumn(6).width = 36;
    sheet.getColumn(7).width = 14;
    sheet.getColumn(8).width = 28;

    const meta = await getEventMeta(supabase, matchmakingId);
    const eventName = clean(meta.evenement_naam) || "uitslagen";
    const eventDate = clean(meta.evenement_datum);
    const safeName = `${eventDate ? `${eventDate}_` : ""}${eventName}`
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 90);

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}_FightPassport_uitslagen.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[officials/uitslagen/export]", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Export mislukt" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleExport(req);
}

export async function POST(req: NextRequest) {
  return handleExport(req);
}
