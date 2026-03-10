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

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);

    const body = await req.json().catch(() => ({}));
    const controle_resultaat_id = String(body?.controle_resultaat_id ?? "").trim();
    const decision = String(body?.decision ?? "").trim() as Decision;
    const note = String(body?.note ?? "").trim() || null;

    if (!controle_resultaat_id) {
      return NextResponse.json({ error: "controle_resultaat_id ontbreekt" }, { status: 400 });
    }

    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json({ error: "Ongeldige decision (gebruik approve/reject)" }, { status: 400 });
    }

    const { data: row, error: rowErr } = await supabase
      .from("controle_resultaten")
      .select("*")
      .eq("id", controle_resultaat_id)
      .single();

    if (rowErr || !row) {
      return NextResponse.json({ error: "Controle-regel niet gevonden" }, { status: 404 });
    }

    const huidig = normalizeResultaat(row.resultaat);

    // ✅ DISPENSATIE: normaal via dispensatie-module,
    // maar superadmin mag (op verzoek) direct goed/afkeuren vanuit de controle-detailpagina.
    if (huidig === "dispensatie") {
      if (role !== "superadmin") {
        return NextResponse.json({ error: "Dispensatie kan niet via review API (gebruik dispensatie-module)." }, { status: 400 });
      }
      // superadmin: toegestaan (gaat verder in dezelfde approve/reject flow)
    }

    // reject: reden verplicht
    if (decision === "reject" && !note) {
      return NextResponse.json({ error: "Aantekeningen verplicht bij afkeuren." }, { status: 400 });
    }

    const reviewed_at = nowIso();

    // ✅ Ownership check (matchmaker must own the matchmaking)
    const mmId = String((row as any)?.matchmaking_id ?? "").trim();
    if (mmId) {
      await assertCanAccessMatchmaking({ matchmaking_id: mmId, userId, role });
    } else {
      // if row has no matchmaking_id, only admin/superadmin may review it
      if (!(role === "admin" || role === "superadmin")) {
        return NextResponse.json({ error: "Geen rechten" }, { status: 403 });
      }
    }

    // 🔒 Matchmaker restrictions:
    // - matchmaker may ONLY approve (no reject)
    // - matchmaker may ONLY approve a small allow-list (Belgium checks, 40+ info, name mismatch, missing data)
    // - never approve license/keurmerk/startverbod or general combat rules overrides
    if (role === "matchmaker") {
      if (decision !== "approve") {
        return NextResponse.json({ error: "Matchmakers kunnen alleen goedkeuren." }, { status: 403 });
      }

      const code = String((row as any)?.rule_code ?? "").toLowerCase();
      const ruleName = String((row as any)?.rule ?? "").toLowerCase();
      const msg = String((row as any)?.boodschap ?? "").toLowerCase();
      const hay = `${code} ${ruleName} ${msg}`;

      // Hard blocks: never allow matchmakers to overrule these
      const denied = hay.includes("licentie") || hay.includes("keurmerk") || hay.includes("startverbod");

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
        return NextResponse.json({ error: "Matchmakers mogen alleen INFO/ACTIE meldingen goedkeuren (Belgë/40+/naam mismatch/missende gegevens)." }, { status: 403 });
      }
    }

    if (decision === "approve") {
      // ✅ voldoet aan DB constraint: review_status = 'goedgekeurd'
      const update = {
        resultaat: "ok",
        review_status: "goedgekeurd",
        reviewed_by: userId,
        reviewed_at,
        original_resultaat: row.original_resultaat ?? row.resultaat,
        aantekeningen: note ?? row.aantekeningen,
      };

      const { error: updErr } = await supabase.from("controle_resultaten").update(update).eq("id", controle_resultaat_id);
      if (updErr) throw updErr;

      return NextResponse.json({ ok: true, row: { ...row, ...update } });
    }

    // decision === "reject"
    const update = {
      resultaat: "afgekeurd",
      review_status: "afgekeurd", // ✅ voldoet aan constraint
      reviewed_by: userId,
      reviewed_at,
      original_resultaat: row.original_resultaat ?? row.resultaat,
      aantekeningen: note,
    };

    const { error: updErr } = await supabase.from("controle_resultaten").update(update).eq("id", controle_resultaat_id);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, row: { ...row, ...update } });
  } catch (e: any) {
    console.error("[review API]", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
