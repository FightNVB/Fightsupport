// app/api/control-engine/review/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type Decision = "approve" | "reject";

function nowIso() {
  return new Date().toISOString();
}

function normalizeResultaat(v: any): "ok" | "actie" | "afgekeurd" | "dispensatie" {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "ok") return "ok";
  if (s === "dispensatie") return "dispensatie";
  if (s === "afkeur" || s === "afgekeurd" || s === "afkeuren") return "afgekeurd";
  return "actie";
}

function normalizeVa(v: any): string | null {
  const digits = String(v ?? "").replace(/\D+/g, "").replace(/^0+/, "");
  return digits || null;
}

function cleanText(v: any): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

async function resolveControleResultaatRow(body: any) {
  const controle_resultaat_id = cleanText(body?.controle_resultaat_id ?? body?.id);

  if (controle_resultaat_id) {
    const { data, error } = await supabase
      .from("controle_resultaten")
      .select("*")
      .eq("id", controle_resultaat_id)
      .single();

    if (error || !data) return { row: null, error: "Controle-regel niet gevonden" };
    return { row: data, error: null };
  }

  const matchmaking_id = cleanText(body?.matchmaking_id);
  const controle_run_id = cleanText(body?.controle_run_id);
  const toernooi_code = cleanText(body?.toernooi_code ?? body?.toernooiCode)?.toUpperCase() ?? null;
  const va = normalizeVa(body?.toernooi_va_nummer ?? body?.va_nummer ?? body?.fighter_id ?? body?.fighterId ?? body?.va);
  const rule_code = cleanText(body?.rule_code);
  const rule = cleanText(body?.rule);
  const boodschap = cleanText(body?.boodschap);

  if (!matchmaking_id) {
    return { row: null, error: "controle_resultaat_id of matchmaking_id ontbreekt" };
  }

  if (!toernooi_code || !va) {
    return {
      row: null,
      error: "controle_resultaat_id ontbreekt. Gebruik anders matchmaking_id + toernooi_code + va_nummer.",
    };
  }

  let q = supabase
    .from("controle_resultaten")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("toernooi_code", toernooi_code)
    .eq("toernooi_va_nummer", va)
    .order("created_at", { ascending: false })
    .limit(2);

  if (controle_run_id) q = q.eq("controle_run_id", controle_run_id);
  if (rule_code) q = q.eq("rule_code", rule_code);
  if (rule) q = q.eq("rule", rule);
  if (boodschap) q = q.eq("boodschap", boodschap);

  const { data, error } = await q;
  if (error) throw error;

  if (!data?.length) {
    return { row: null, error: "Controle-regel niet gevonden op toernooi_code + VA" };
  }

  if (data.length > 1 && !rule_code && !rule && !boodschap) {
    return {
      row: null,
      error: "Meerdere meldingen gevonden. Stuur controle_resultaat_id of rule_code mee.",
    };
  }

  return { row: data[0], error: null };
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);

    const body = await req.json().catch(() => ({}));
    const decision = String(body?.decision ?? "").trim() as Decision;
    const note = String(body?.note ?? "").trim() || null;

    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json({ error: "Ongeldige decision (gebruik approve/reject)" }, { status: 400 });
    }

    const resolved = await resolveControleResultaatRow(body);
    if (resolved.error || !resolved.row) {
      return NextResponse.json({ error: resolved.error || "Controle-regel niet gevonden" }, { status: 404 });
    }

    const row: any = resolved.row;
    const huidig = normalizeResultaat(row.resultaat);

    const code = String(row?.rule_code ?? "").toLowerCase();
    const ruleName = String(row?.rule ?? "").toLowerCase();
    const msg = String(row?.boodschap ?? "").toLowerCase();
    const hay = `${code} ${ruleName} ${msg}`;

    const isLicentieOfKeurmerk =
      hay.includes("licentie") || hay.includes("keurmerk");

    // DISPENSATIE: normaal via dispensatie-module,
    // maar superadmin mag direct goed/afkeuren vanuit de controle-detailpagina.
    if (huidig === "dispensatie" && role !== "superadmin") {
      return NextResponse.json(
        { error: "Dispensatie kan niet via review API (gebruik dispensatie-module)." },
        { status: 400 }
      );
    }

    if (decision === "reject" && !note) {
      return NextResponse.json({ error: "Aantekeningen verplicht bij afkeuren." }, { status: 400 });
    }

    const reviewed_at = nowIso();

    const mmId = String(row?.matchmaking_id ?? body?.matchmaking_id ?? "").trim();
    if (mmId) {
      await assertCanAccessMatchmaking({ matchmaking_id: mmId, userId, role });
    } else if (!(role === "admin" || role === "superadmin")) {
      return NextResponse.json({ error: "Geen rechten" }, { status: 403 });
    }

    if (role === "matchmaker") {
      if (decision !== "approve") {
        return NextResponse.json({ error: "Matchmakers kunnen alleen goedkeuren." }, { status: 403 });
      }

      const denied =
        hay.includes("licentie") ||
        hay.includes("keurmerk") ||
        hay.includes("startverbod");

      if (denied) {
        return NextResponse.json({ error: "Matchmakers mogen deze melding niet overrulen." }, { status: 403 });
      }

      const allowed =
        hay.includes("belg") ||
        hay.includes("buitenland") ||
        hay.includes("40") ||
        hay.includes("ouder") ||
        (hay.includes("naam") && hay.includes("mismatch")) ||
        hay.includes("ontbreek") ||
        hay.includes("missing") ||
        hay.includes("onbekend") ||
        hay.includes("geen va");

      if (!allowed) {
        return NextResponse.json({
          error:
            "Matchmakers mogen alleen INFO/ACTIE meldingen goedkeuren (België/40+/naam mismatch/missende gegevens).",
        }, { status: 403 });
      }
    }

    if (decision === "approve" && huidig === "afgekeurd" && isLicentieOfKeurmerk) {
      if (role !== "superadmin") {
        return NextResponse.json(
          { error: "Alleen superadmin mag AFKEUR op licentie of keurmerk overrulen." },
          { status: 403 }
        );
      }
    }

    if (decision === "approve") {
      const update = {
        resultaat: "ok",
        review_status: "goedgekeurd",
        reviewed_by: userId,
        reviewed_at,
        original_resultaat: row.original_resultaat ?? row.resultaat,
        aantekeningen: note ?? row.aantekeningen,
      };

      const { error: updErr } = await supabase
        .from("controle_resultaten")
        .update(update)
        .eq("id", row.id);

      if (updErr) throw updErr;

      return NextResponse.json({ ok: true, row: { ...row, ...update } });
    }

    const update = {
      resultaat: "afgekeurd",
      review_status: "afgekeurd",
      reviewed_by: userId,
      reviewed_at,
      original_resultaat: row.original_resultaat ?? row.resultaat,
      aantekeningen: note,
    };

    const { error: updErr } = await supabase
      .from("controle_resultaten")
      .update(update)
      .eq("id", row.id);

    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, row: { ...row, ...update } });
  } catch (e: any) {
    console.error("[review API]", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
