import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluateWeighInBout } from "@/lib/weegstation/weighInRulesEngine";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const x = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(x) ? Number(x.toFixed(2)) : null;
}

function toPenalty(v: unknown): 0 | 1 {
  return Number(String(v ?? "0").trim()) === 1 ? 1 : 0;
}

function normalizeStatus(v: unknown): string {
  const raw = s(v).toUpperCase();
  if (!raw) return "WACHT_OP_WEGEN";
  if (raw.includes("AFKEUR")) return "AFKEUR";
  if (raw.includes("DISPENSATIE")) return "DISPENSATIE_NODIG";
  if (raw.includes("NIET_VERSCHENEN")) return "NIET_VERSCHENEN";
  if (raw.includes("HANDMATIG")) return "HANDMATIGE_BEOORDELING";
  if (raw === "OK") return "OK";
  return raw;
}

async function getUserFromBearer(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) return { user: null, error: "Geen bearer token ontvangen." };

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data, error } = await supabaseUser.auth.getUser();
  if (error || !data?.user) {
    return { user: null, error: error?.message ?? "Niet ingelogd." };
  }

  return { user: data.user, error: null };
}

async function getRolesForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) throw error;

  return Array.from(
    new Set(
      (data ?? [])
        .map((r: any) => String(r?.roles?.name ?? "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUserFromBearer(req);
    if (!user) {
      return NextResponse.json(
        { error: authErr ?? "Niet ingelogd." },
        { status: 401 }
      );
    }

    const roles = await getRolesForUser(user.id);
    const canComplete =
      roles.includes("hoofdofficial") || roles.includes("superadmin");

    if (!canComplete) {
      return NextResponse.json(
        { error: "Alleen hoofdofficial of superadmin mag de weging afsluiten." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmakingId);
    const absentStatus = s(body?.mark_absent_as || "NIET_VERSCHENEN").toUpperCase();

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmakingId ontbreekt." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: weighRows, error: weighErr } = await supabaseAdmin
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("partij_nr", { ascending: true });

    if (weighErr) throw weighErr;

    if (!weighRows?.length) {
      return NextResponse.json(
        { error: "Geen weigh_in_bouts gevonden voor deze matchmaking." },
        { status: 404 }
      );
    }

    for (const row of weighRows as any[]) {
      const roodGewogen = toNum(row.rood_gewogen_gewicht);
      const blauwGewogen = toNum(row.blauw_gewogen_gewicht);
      const sourceId = s(row.id) || null;

      let eindstatus = absentStatus;
      let praktijkStatus = absentStatus;
      let reglementStatus = absentStatus;
      let gewichtVerschil: number | null = null;
      let dispensatieNodig = false;
      let adminSanctieNodig = false;
      let adminSanctieReason: string | null = null;

      if (roodGewogen != null && blauwGewogen != null) {
        const evalResult = evaluateWeighInBout({
          discipline: row.discipline,
          klasse_mm: row.klasse_mm,
          leeftijd_type: row.leeftijd_type,
          max_gewicht: row.max_gewicht,
          rood_doorgegeven_gewicht: row.rood_doorgegeven_gewicht,
          blauw_doorgegeven_gewicht: row.blauw_doorgegeven_gewicht,
          rood_gewogen_gewicht: roodGewogen,
          blauw_gewogen_gewicht: blauwGewogen,
          dispensatie_verleend: !!row.dispensatie_verleend,
        });

        eindstatus = normalizeStatus(evalResult?.eindStatus);
        praktijkStatus = eindstatus;
        reglementStatus = eindstatus;
        gewichtVerschil = toNum(evalResult?.diff);
        dispensatieNodig =
          !!row.dispensatie_nodig || eindstatus === "DISPENSATIE_NODIG";
        adminSanctieNodig =
          !!evalResult?.adminSanctieNodig || !!row.admin_sanctie_nodig;
        adminSanctieReason =
          s(row.admin_sanctie_reason) || s(evalResult?.adminSanctieReason) || null;

        if (row.dispensatie_verleend) {
          eindstatus = "OK";
          praktijkStatus = "OK";
          reglementStatus = "OK";
        }

        if (s(row.dispensatie_reason).toUpperCase() === "AFGEWEZEN") {
          eindstatus = "AFKEUR";
          praktijkStatus = "AFKEUR";
          reglementStatus = "AFKEUR";
        }
      }

      const rawUpdate = {
        eindstatus,
        praktijk_status: praktijkStatus,
        reglement_status: reglementStatus,
        rood_gewogen_gewicht: roodGewogen,
        blauw_gewogen_gewicht: blauwGewogen,
        gewicht_verschil: gewichtVerschil,
        dispensatie_nodig: dispensatieNodig,
        dispensatie_verleend: !!row.dispensatie_verleend,
        dispensatie_reason: row.dispensatie_reason ?? null,
        gewicht_strafpunt_rood: toPenalty(row.gewicht_strafpunt_rood),
        gewicht_strafpunt_blauw: toPenalty(row.gewicht_strafpunt_blauw),
        weging_notitie: row.weging_notitie ?? null,
        laatste_bewerking_op: nowIso,
      };

      const { error: rawErr } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .update(rawUpdate)
        .eq("matchmaking_id", matchmakingId)
        .eq("partij_nr", row.partij_nr);

      if (rawErr) throw rawErr;

      const { error: ctxErr } = await supabaseAdmin
        .from("controle_bout_context")
        .update({
          ...rawUpdate,
          admin_sanctie_nodig: adminSanctieNodig,
          admin_sanctie_reason: adminSanctieReason,
          updated_at: nowIso,
        })
        .eq("matchmaking_id", matchmakingId)
        .eq("partij_nr", row.partij_nr);

      if (ctxErr) {
        const msg = String(ctxErr.message || "").toLowerCase();
        if (
          !msg.includes("admin_sanctie_nodig") &&
          !msg.includes("admin_sanctie_reason") &&
          !msg.includes("admin_sanctie")
        ) {
          throw ctxErr;
        }
      }

      const { error: delErr } = await supabaseAdmin
        .from("controle_resultaten")
        .delete()
        .eq("matchmaking_id", matchmakingId)
        .eq("partij_nr", row.partij_nr)
        .in("rule", [
          "weegstation_status",
          "weegstation_dispensatie",
          "weegstation_minpunt",
        ]);

      if (delErr) throw delErr;

      const insertRows: any[] = [
        {
          matchmaking_id: matchmakingId,
          partij_nr: row.partij_nr,
          hoek: null,
          resultaat:
            eindstatus === "OK"
              ? "ok"
              : eindstatus === "AFKEUR"
              ? "afgekeurd"
              : "actie",
          rule: "weegstation_status",
          rule_code: eindstatus,
          boodschap: `Weegstation afgesloten met status ${eindstatus}.`,
          review_status: "definitief",
          source_table: "weigh_in_bouts",
          source_id: sourceId,
          created_at: nowIso,
        },
      ];

      if (toPenalty(row.gewicht_strafpunt_rood) === 1) {
        insertRows.push({
          matchmaking_id: matchmakingId,
          partij_nr: row.partij_nr,
          hoek: "rood",
          resultaat: "actie",
          rule: "weegstation_minpunt",
          rule_code: "MINPUNT_ROOD",
          boodschap: "Minpunt eerste ronde rood.",
          review_status: "definitief",
          source_table: "weigh_in_bouts",
          source_id: sourceId,
          created_at: nowIso,
        });
      }

      if (toPenalty(row.gewicht_strafpunt_blauw) === 1) {
        insertRows.push({
          matchmaking_id: matchmakingId,
          partij_nr: row.partij_nr,
          hoek: "blauw",
          resultaat: "actie",
          rule: "weegstation_minpunt",
          rule_code: "MINPUNT_BLAUW",
          boodschap: "Minpunt eerste ronde blauw.",
          review_status: "definitief",
          source_table: "weigh_in_bouts",
          source_id: sourceId,
          created_at: nowIso,
        });
      }

      if (dispensatieNodig || row.dispensatie_verleend) {
        insertRows.push({
          matchmaking_id: matchmakingId,
          partij_nr: row.partij_nr,
          hoek: null,
          resultaat: row.dispensatie_verleend ? "ok" : "dispensatie",
          rule: "weegstation_dispensatie",
          rule_code: row.dispensatie_verleend ? "VERLEEND" : "NODIG",
          boodschap: row.dispensatie_verleend
            ? "Dispensatie verleend."
            : "Dispensatie nodig op basis van weging.",
          review_status: "definitief",
          source_table: "weigh_in_bouts",
          source_id: sourceId,
          created_at: nowIso,
        });
      }

      const { error: insErr } = await supabaseAdmin
        .from("controle_resultaten")
        .insert(insertRows);

      if (insErr) throw insErr;

      const { error: weighUpdErr } = await supabaseAdmin
        .from("weigh_in_bouts")
        .update({
          ...rawUpdate,
          admin_sanctie_nodig: adminSanctieNodig,
          admin_sanctie_reason: adminSanctieReason,
          laatste_bewerking_op: nowIso,
        })
        .eq("id", row.id);

      if (weighUpdErr) throw weighUpdErr;
    }

    const { error: uploadErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .update({
        flow_status: "weging_afgesloten",
        weging_afgesloten_op: nowIso,
      })
      .eq("matchmaking_id", matchmakingId);

    if (uploadErr) {
      const msg = String(uploadErr.message || "").toLowerCase();
      if (!msg.includes("weging_afgesloten_op")) throw uploadErr;
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      updated_bouts: weighRows.length,
      message:
        "Weging afgesloten. Resultaten zijn teruggezet naar matchmaking_bouts_raw, controle_bout_context en controle_resultaten.",
      open_url: `/dashboard/officials/controle/${matchmakingId}`,
    });
  } catch (err: any) {
    console.error("weegstation/complete POST error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Weging afsluiten mislukt." },
      { status: 500 }
    );
  }
}