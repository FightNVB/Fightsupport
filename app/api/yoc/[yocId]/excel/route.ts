import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ yocId: string }> };

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

function normalizeVa(v: unknown) {
  const digits = String(v ?? "").replace(/\D/g, "").replace(/^0+/, "");
  return digits;
}

function normText(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function isYes(v: unknown) {
  const s = normText(v);
  return ["ja", "yes", "true", "1", "actief", "geldig", "ok"].includes(s) || v === true;
}

function isNo(v: unknown) {
  const s = normText(v);
  return ["nee", "no", "false", "0", "geen", "niet", "ongeldig"].includes(s) || v === false;
}

function jaNee(v: unknown) {
  if (isYes(v)) return "Ja";
  if (isNo(v)) return "Nee";
  return "Onbekend";
}

function weight(v: unknown) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 9999;
}

function contextFor(f: any, byId: Map<string, any>, byVa: Map<string, any>) {
  const va = normalizeVa(f.va_nummer_mm ?? f.va_nummer ?? f.va);
  return byId.get(String(f.id)) || (va ? byVa.get(va) : null) || null;
}

function resultRowsFor(f: any, c: any, resultsByFighter: Map<string, any[]>, resultsByRaw: Map<string, any[]>, resultsByVa: Map<string, any[]>) {
  const va = normalizeVa(f.va_nummer_mm ?? f.va_nummer ?? f.va ?? c?.va_nummer);
  return resultsByFighter.get(String(f.id)) || (c?.fighter_raw_id ? resultsByRaw.get(String(c.fighter_raw_id)) : null) || (va ? resultsByVa.get(va) : null) || [];
}

function statusFor(rows: any[]) {
  const meldingen = rows.filter((r) => { const s = String(r.resultaat || "").toLowerCase(); return s && s !== "ok" && s !== "info" && s !== "goedgekeurd"; });
  if (!meldingen.length) return "OK";
  if (meldingen.some((r) => r.resultaat === "afgekeurd")) return "AFKEUR";
  if (meldingen.some((r) => r.resultaat === "actie")) return "ACTIE";
  return "OK";
}

function getChecks(c: any) {
  const licentie = c?.licentie_ok ?? c?.licentie;
  const startverbodRaw = c?.heeft_startverbod ?? c?.startverbod;
  const keurmerk = c?.keurmerk_ok ?? c?.heeft_keurmerk ?? c?.keurmerk;
  return {
    licentie: jaNee(licentie),
    startverbod: isYes(startverbodRaw) ? "Ja" : isNo(startverbodRaw) ? "Nee" : "Onbekend",
    keurmerk: jaNee(keurmerk),
  };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { yocId } = await params;
    if (!yocId || yocId === "undefined") {
      return NextResponse.json({ ok: false, error: "Ongeldig YOC-id." }, { status: 400 });
    }

    const supabase = adminClient();
    const [{ data: event }, { data: fighters, error: fErr }, { data: contexts }, { data: results }] = await Promise.all([
      supabase.from("yoc_events").select("*").eq("id", yocId).maybeSingle(),
      supabase.from("yoc_fighters").select("*").eq("yoc_event_id", yocId),
      supabase.from("yoc_fighter_context").select("*").eq("yoc_event_id", yocId),
      supabase.from("yoc_resultaten").select("*").eq("yoc_event_id", yocId),
    ]);

    if (fErr) throw fErr;

    const byId = new Map<string, any>();
    const byVa = new Map<string, any>();
    for (const c of contexts || []) {
      if (c.yoc_fighter_id) byId.set(String(c.yoc_fighter_id), c);
      const va = normalizeVa(c.va_nummer ?? c.va ?? c.fighter_id);
      if (va) byVa.set(va, c);
    }

    const resultsByFighter = new Map<string, any[]>();
    const resultsByRaw = new Map<string, any[]>();
    const resultsByVa = new Map<string, any[]>();
    for (const r of results || []) {
      if (r.yoc_fighter_id) resultsByFighter.set(String(r.yoc_fighter_id), [...(resultsByFighter.get(String(r.yoc_fighter_id)) || []), r]);
      if (r.fighter_raw_id) resultsByRaw.set(String(r.fighter_raw_id), [...(resultsByRaw.get(String(r.fighter_raw_id)) || []), r]);
      const va = normalizeVa(r.va_nummer ?? r.fighter_id ?? r.toernooi_va_nummer);
      if (va) resultsByVa.set(va, [...(resultsByVa.get(va) || []), r]);
    }

    const sorted = [...(fighters || [])].sort((a, b) => weight(a.gewicht_mm ?? a.gewicht) - weight(b.gewicht_mm ?? b.gewicht));
    const rows = sorted.map((f) => {
      const c = contextFor(f, byId, byVa);
      const rr = resultRowsFor(f, c, resultsByFighter, resultsByRaw, resultsByVa);
      const checks = getChecks(c);
      return {
        "Totaal partijen": sorted.length,
        "Event Name": f.event_name ?? event?.naam ?? event?.event_name ?? "",
        Geslacht: f.geslacht_mm ?? f.geslacht ?? "",
        "Naam vechter ": f.naam_mm ?? f.naam ?? "",
        Sportschool: f.sportschool_mm ?? f.sportschool ?? "",
        "VA nummer ": f.va_nummer_mm ?? f.va_nummer ?? "",
        KG: f.gewicht_mm ?? f.gewicht ?? "",
        "Naam Trainer": f.naam_trainer ?? "",
        Emailadres: f.emailadres ?? "",
        Telefoonnummer: f.telefoonnummer ?? "",
        Licentie: checks.licentie,
        Startverbod: checks.startverbod,
        Keurmerk: checks.keurmerk,
        Status: statusFor(rr),
        Meldingen: rr.filter((r) => String(r.resultaat || "").toLowerCase() !== "ok").map((r) => r.boodschap || r.rule_code || r.rule).filter(Boolean).join(" | "),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["Totaal partijen", "Event Name", "Geslacht", "Naam vechter ", "Sportschool", "VA nummer ", "KG", "Naam Trainer", "Emailadres", "Telefoonnummer", "Licentie", "Startverbod", "Keurmerk", "Status", "Meldingen"],
    });
    ws["!cols"] = [14, 18, 10, 24, 24, 14, 8, 18, 30, 16, 12, 14, 12, 12, 70].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    const summaryWs = XLSX.utils.json_to_sheet([{
      "Event": event?.naam ?? event?.event_name ?? "",
      "Datum": event?.event_datum ?? event?.datum ?? "",
      "Totaal partijen": sorted.length,
    }]);
    summaryWs["!cols"] = [30, 14, 16].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, summaryWs, "Samenvatting");
    XLSX.utils.book_append_sheet(wb, ws, "YOC controle");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="yoc-controle-${yocId}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
