import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuidStrict(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "[object Object]") return null;
  if (!UUID_RE.test(s)) return null;
  return s;
}

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function parseKlasseMaxGewicht(label: string | null | undefined): number | null {
  const s = String(label ?? "").trim().toLowerCase();
  if (!s) return null;

  const cleaned = s.replace(/\s/g, "");
  const match =
    cleaned.match(/(?:tot|max|onder|t\/m)(\d+(?:[.,]\d+)?)(?:kg)?/) ||
    cleaned.match(/(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)(?:kg)?/) ||
    cleaned.match(/(\d+(?:[.,]\d+)?)(?:kg)/);

  if (!match) return null;

  const raw = match[2] ?? match[1];
  if (!raw) return null;

  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function inferLeeftijdType(row: any): "jeugd" | "volwassene" | "onbekend" {
  const ages = [row?.rood_leeftijd_event, row?.blauw_leeftijd_event]
    .map((v) => toNum(v))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  if (ages.length === 0) return "onbekend";
  if (Math.max(...ages) < 18) return "jeugd";
  return "volwassene";
}

function getEffectiveMaxWeight(row: any): number | null {
  const directMax = toNum(row?.max_gewicht);
  if (directMax != null) return directMax;

  const declaredWeights = [row?.rood_doorgegeven_gewicht, row?.blauw_doorgegeven_gewicht]
    .map((v) => toNum(v))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  if (declaredWeights.length > 0) {
    return Number(Math.max(...declaredWeights).toFixed(2));
  }

  return parseKlasseMaxGewicht(row?.klasse_mm);
}

function isWeightDispensationCandidate(row: any): boolean {
  const rood = toNum(row?.rood_gewogen_gewicht);
  const blauw = toNum(row?.blauw_gewogen_gewicht);

  if (rood == null || blauw == null) return false;

  const leeftijdType = inferLeeftijdType(row);
  if (leeftijdType === "onbekend") return false;

  const diff = Number(Math.abs(rood - blauw).toFixed(2));
  const normalMax = leeftijdType === "jeugd" ? 2.5 : 3.0;
  const dispMax = leeftijdType === "jeugd" ? 4.0 : 7.0;

  if (diff > dispMax) return false;

  const effectiveMax = getEffectiveMaxWeight(row);
  const overMax =
    effectiveMax != null ? rood > effectiveMax || blauw > effectiveMax : false;

  if (overMax) return true;
  if (diff > normalMax && diff <= dispMax) return true;

  return false;
}

export async function POST(req: Request) {
  try {
    const { user } = await requireUserFromAuthHeader(req);

    const ok = await hasAnyRoleFromReq(req, [
      "hoofdofficial",
      "superadmin",
      "dispensatie_admin",
    ]);

    if (!ok) {
      return NextResponse.json(
        { error: "Alleen hoofdofficial, dispensatie_admin of superadmin." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const matchmaking_id = asUuidStrict(body?.matchmaking_id);
    const bout_id = asUuidStrict(body?.bout_id);
    const partij_nr = Number.isFinite(Number(body?.partij_nr)) ? Number(body.partij_nr) : null;
    const decision = norm(body?.decision).toLowerCase(); // approved | rejected
    const reason = norm(body?.reason);

    if (!matchmaking_id || !bout_id) {
      return NextResponse.json(
        { error: "matchmaking_id en bout_id zijn verplicht en moeten uuid zijn." },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { error: "decision moet approved of rejected zijn." },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json({ error: "Reden is verplicht." }, { status: 400 });
    }

    const { data: weighRow, error: weighErr } = await supabaseAdmin
      .from("weigh_in_bouts")
      .select("*")
      .eq("id", bout_id)
      .eq("matchmaking_id", matchmaking_id)
      .single();

    if (weighErr || !weighRow) {
      return NextResponse.json({ error: "Weegpartij niet gevonden." }, { status: 404 });
    }

    if (!isWeightDispensationCandidate(weighRow) && !weighRow.dispensatie_nodig) {
      return NextResponse.json(
        { error: "Voor deze partij is geen gewicht-dispensatiepad beschikbaar." },
        { status: 400 }
      );
    }

    const { data: runs, error: runErr } = await supabaseAdmin
      .from("controle_runs")
      .select("id")
      .eq("matchmaking_id", matchmaking_id)
      .order("gestart_op", { ascending: false })
      .limit(1);

    if (runErr) throw runErr;

    const controle_run_id = runs?.[0]?.id ?? null;

    const { data: existingReq, error: existingErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .select("id")
      .eq("matchmaking_id", matchmaking_id)
      .eq("bout_id", bout_id)
      .eq("rule_code", "WEGING")
      .limit(1);

    if (existingErr) throw existingErr;

    let requestId: string;

    if (existingReq?.[0]?.id) {
      requestId = String(existingReq[0].id);

      const { error: updReqErr } = await supabaseAdmin
        .from("dispensatie_requests")
        .update({
          partij_nr,
          controle_run_id: controle_run_id ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updReqErr) throw updReqErr;
    } else {
      const insertRow = {
        status: "open",
        matchmaking_id,
        bout_id,
        partij_nr,
        rule_code: "WEGING",
        controle_run_id: controle_run_id ?? null,
        created_by: user.id,
      };

      const { data: insReq, error: insReqErr } = await supabaseAdmin
        .from("dispensatie_requests")
        .insert(insertRow)
        .select("id")
        .single();

      if (insReqErr || !insReq?.id) throw insReqErr ?? new Error("Dispensatie request kon niet worden aangemaakt.");

      requestId = String(insReq.id);
    }

    const { error: closeReqErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .update({
        status: "closed",
        decision,
        decision_reason: reason,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        controle_run_id: controle_run_id ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (closeReqErr) throw closeReqErr;

    const weighPayload =
      decision === "approved"
        ? {
            reglement_status: "OK",
            praktijk_status: "OK",
            eindstatus: "OK",
            dispensatie_nodig: false,
            dispensatie_verleend: true,
            dispensatie_reason: reason,
            dispensatie_by: user.id,
            dispensatie_at: new Date().toISOString(),
            laatste_bewerking_door: user.id,
            laatste_bewerking_op: new Date().toISOString(),
          }
        : {
            reglement_status: "AFKEUR",
            praktijk_status: "AFKEUR",
            eindstatus: "AFKEUR",
            dispensatie_nodig: false,
            dispensatie_verleend: false,
            dispensatie_reason: reason,
            dispensatie_by: user.id,
            dispensatie_at: new Date().toISOString(),
            laatste_bewerking_door: user.id,
            laatste_bewerking_op: new Date().toISOString(),
          };

    const { data: updatedWeigh, error: weighUpdErr } = await supabaseAdmin
      .from("weigh_in_bouts")
      .update(weighPayload)
      .eq("id", bout_id)
      .select("*")
      .single();

    if (weighUpdErr) throw weighUpdErr;

    return NextResponse.json({
      ok: true,
      request_id: requestId,
      decision,
      weigh_in_bout: updatedWeigh,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}