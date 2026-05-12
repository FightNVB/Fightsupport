// app/api/rapport/jury-lineup-excel/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: any) {
  return String(v ?? "").trim();
}

function parseRawJson(v: any): any {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return {};
  }
}

function isTitelpartij(b: any): boolean {
  const raw = parseRawJson(b.raw_json);
  const text = [
    b.titelpartij,
    b.is_titelpartij,
    b.titel_partij,
    b.title_fight,
    b.opmerking,
    b.bijzonderheden,
    raw.titelpartij,
    raw.is_titelpartij,
    raw.titel_partij,
    raw.title_fight,
    raw.opmerking,
    raw.bijzonderheden,
  ]
    .map(s)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("titel") ||
    text.includes("title fight") ||
    text.includes("championship")
  );
}

function getRondeTijden({
  discipline,
  klasse,
  rood_leeftijd,
  blauw_leeftijd,
  titelpartij,
}: any): string {
  const d = s(discipline).toUpperCase();
  const k = s(klasse).toUpperCase();

  const rAge = Number(rood_leeftijd ?? 0);
  const bAge = Number(blauw_leeftijd ?? 0);

  if (d.includes("MMA")) {
    if (k.includes("JEUGD") || k.includes("J")) return "2x3 min";
    if (k.includes("PRO")) return titelpartij ? "5x5 min" : "3x5 min";
    return titelpartij ? "5x3 min" : "3x3 min";
  }

  if (titelpartij) return "5 rondes";

  if (k.includes("J")) {
    if (rAge >= 16 && bAge >= 16) return "3x1.5 min";
    return "3x1 min";
  }

  if (k.includes("R")) return "3x1.5 min";
  if (k.includes("N") || k.includes("NIEUWELING") || k.includes("NEWCOMER")) {
    return "3x1.5 min";
  }

  if (k.includes("C")) return "3x2 min";
  if (k.includes("B")) return "3x3 min";
  if (k.includes("A")) return "3x3 min";

  return "";
}

function isToernooiBout(b: any): boolean {
  const raw = parseRawJson(b.raw_json);
  return Boolean(
    b.is_toernooi ||
      b.toernooi_code ||
      raw.toernooi_code ||
      s(b.partij_nr).toUpperCase().startsWith("T")
  );
}

function getToernooiCode(b: any): string {
  const raw = parseRawJson(b.raw_json);
  return s(b.toernooi_code || raw.toernooi_code || b.partij_nr);
}

function toernooiFighterKey(toernooiCode: string, naam: any, gym: any, va: any): string {
  const vaClean = s(va).replace(/\D/g, "");
  if (vaClean) return `${s(toernooiCode).toUpperCase()}::VA::${vaClean}`;

  return `${s(toernooiCode).toUpperCase()}::NAME::${s(naam).toLowerCase()}::${s(gym).toLowerCase()}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchmaking_id = searchParams.get("matchmaking_id");

  if (!matchmaking_id) {
    return NextResponse.json(
      { error: "matchmaking_id ontbreekt" },
      { status: 400 }
    );
  }

  const { data: bouts, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasTitelpartij = (bouts || []).some((b) => isTitelpartij(b));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jury lineup");

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "Partij", key: "partij_nr", width: 12 },
    { header: "Discipline", key: "discipline", width: 18 },
    { header: "Klasse", key: "klasse", width: 16 },

    { header: "Rood naam", key: "rood_naam", width: 28 },
    { header: "Rood sportschool", key: "rood_gym", width: 28 },
    { header: "Rood VA", key: "rood_va", width: 14 },

    { header: "Blauw naam", key: "blauw_naam", width: 28 },
    { header: "Blauw sportschool", key: "blauw_gym", width: 28 },
    { header: "Blauw VA", key: "blauw_va", width: 14 },
  ];

  if (hasTitelpartij) {
    columns.push({ header: "Titelpartij", key: "titelpartij", width: 14 });
  }

  columns.push({ header: "Ronde tijden", key: "rondes", width: 18 });

  ws.columns = columns;

  ws.views = [{ state: "frozen", ySplit: 1 }];

  const header = ws.getRow(1);
  header.height = 24;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle", horizontal: "center" };

  header.eachCell((cell, colNumber) => {
    const key = ws.getColumn(colNumber).key;

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    if (["rood_naam", "rood_gym", "rood_va"].includes(String(key))) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC00000" },
      };
      return;
    }

    if (["blauw_naam", "blauw_gym", "blauw_va"].includes(String(key))) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E79" },
      };
      return;
    }

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF555555" },
    };
  });

  const seenToernooiFighters = new Set<string>();

  for (const b of bouts || []) {
    const titelpartij = isTitelpartij(b);
    const rondes = getRondeTijden({
      discipline: b.discipline,
      klasse: b.klasse,
      rood_leeftijd: b.rood_leeftijd,
      blauw_leeftijd: b.blauw_leeftijd,
      titelpartij,
    });

    if (isToernooiBout(b)) {
      const toernooiCode = getToernooiCode(b);

      const toernooiFighters = [
        { naam: b.rood_naam, gym: b.rood_gym, va: b.va_rood },
        { naam: b.blauw_naam, gym: b.blauw_gym, va: b.va_blauw },
      ];

      for (const fighter of toernooiFighters) {
        const key = toernooiFighterKey(
          toernooiCode,
          fighter.naam,
          fighter.gym,
          fighter.va
        );

        if (seenToernooiFighters.has(key)) continue;
        seenToernooiFighters.add(key);

        ws.addRow({
          partij_nr: toernooiCode,
          discipline: b.discipline,
          klasse: b.klasse,
          rood_naam: fighter.naam,
          rood_gym: fighter.gym,
          rood_va: fighter.va,
          blauw_naam: "",
          blauw_gym: "",
          blauw_va: "",
          ...(hasTitelpartij ? { titelpartij: titelpartij ? "Ja" : "" } : {}),
          rondes,
        });
      }

      continue;
    }

    ws.addRow({
      partij_nr: b.partij_nr,
      discipline: b.discipline,
      klasse: b.klasse,

      rood_naam: b.rood_naam,
      rood_gym: b.rood_gym,
      rood_va: b.va_rood,

      blauw_naam: b.blauw_naam,
      blauw_gym: b.blauw_gym,
      blauw_va: b.va_blauw,

      ...(hasTitelpartij ? { titelpartij: titelpartij ? "Ja" : "" } : {}),
      rondes,
    });
  }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    row.alignment = { vertical: "middle" };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=jury-lineup.xlsx`,
    },
  });
}