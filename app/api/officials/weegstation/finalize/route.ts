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

async function getControleRunIdForWeighRow(row: any, matchmakingId: string): Promise<string | null> {
  const fromWeigh = s(row?.controle_run_id);
  if (fromWeigh) return fromWeigh;

  const partijNr = Number(row?.partij_nr);
  if (!Number.isFinite(partijNr)) return null;

  const { data, error } = await supabaseAdmin
    .from("controle_bout_context")
    .select("controle_run_id")
    .eq("matchmaking_id", matchmakingId)
    .eq("partij_nr", partijNr)
    .not("controle_run_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return s((data as any)?.controle_run_id) || null;
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
    const canFinalize =
      roles.includes("hoofdofficial") || roles.includes("superadmin");

    if (!canFinalize) {
      return NextResponse.json(
        { error: "Alleen hoofdofficial of superadmin mag de weging definitief afsluiten." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmakingId);
    const absentStatus = s(body?.mark_absent_as || "NIET_VERSCHENEN").toUpperCase();
    // Standaard is finalize een tussentijdse verwerking naar lineup.
    // Ongewogen/deels gewogen partijen worden dan NIET als niet verschenen gemarkeerd.
    // Stuur definitief: true mee als de weging echt helemaal klaar is.
    const definitiefAfsluiten = body?.definitief === true;

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

    const firstWeighRowBondteam = s((weighRows as any[])?.[0]?.bondteam);

    const { data: mmOwnerRow, error: mmOwnerErr } = await supabaseAdmin
      .from("matchmakings")
      .select("bondteam, huidige_eigenaar_bondteam")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmOwnerErr) throw mmOwnerErr;

    const targetBondteam =
      s((mmOwnerRow as any)?.huidige_eigenaar_bondteam) ||
      s((mmOwnerRow as any)?.bondteam) ||
      firstWeighRowBondteam ||
      null;

    if (!targetBondteam) {
      return NextResponse.json(
        { error: "Bondteam ontbreekt. Kan matchmaking niet zichtbaar houden in het official overzicht." },
        { status: 400 }
      );
    }

    for (const row of weighRows as any[]) {
      const roodGewogen = toNum(row.rood_gewogen_gewicht);
      const blauwGewogen = toNum(row.blauw_gewogen_gewicht);
      const sourceId = s(row.id) || null;
      const controleRunId = await getControleRunIdForWeighRow(row, matchmakingId);
      const volledigGewogen = roodGewogen != null && blauwGewogen != null;

      if (!volledigGewogen && !definitiefAfsluiten) {
        const wachtStatus =
          roodGewogen == null && blauwGewogen == null
            ? "WACHT_OP_WEGEN"
            : "DEELS_GEWOGEN";

        const { error: weighWaitErr } = await supabaseAdmin
          .from("weigh_in_bouts")
          .update({
            eindstatus: wachtStatus,
            praktijk_status: wachtStatus,
            reglement_status: wachtStatus,
            laatste_bewerking_op: nowIso,
          })
          .eq("id", row.id);

        if (weighWaitErr) throw weighWaitErr;

        continue;
      }

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
          ...(controleRunId ? { controle_run_id: controleRunId } : {}),
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

      let delQuery = supabaseAdmin
        .from("controle_resultaten")
        .delete()
        .eq("matchmaking_id", matchmakingId)
        .eq("partij_nr", row.partij_nr)
        .in("rule", [
          "weegstation_status",
          "weegstation_dispensatie",
          "weegstation_minpunt",
        ]);

      // Ruim de oude null-regels ook op. Nieuwe regels krijgen hieronder altijd
      // dezelfde controle_run_id als de oorspronkelijke controle_bout_context.
      if (controleRunId) {
        delQuery = delQuery.or(`controle_run_id.eq.${controleRunId},controle_run_id.is.null`);
      } else {
        delQuery = delQuery.is("controle_run_id", null);
      }

      const { error: delErr } = await delQuery;

      if (delErr) throw delErr;

      const insertRows: any[] = [
        {
          matchmaking_id: matchmakingId,
          controle_run_id: controleRunId,
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
          controle_run_id: controleRunId,
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
          controle_run_id: controleRunId,
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
          controle_run_id: controleRunId,
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
          ...(controleRunId ? { controle_run_id: controleRunId } : {}),
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

    const { error: mmErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "weegstation_verwerkt",
        status: "klaar_voor_definitieve_lineup",
        huidige_eigenaar_type: "bondteam",
        huidige_eigenaar_user_id: null,
        huidige_eigenaar_bondteam: targetBondteam,
        ready_for_results_at: nowIso,
        weegstation_processed_at: nowIso,
        last_updated_at: nowIso,
        last_updated_by: user.id,
      })
      .eq("id", matchmakingId);

    if (mmErr) throw mmErr;

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      updated_bouts: weighRows.length,
      stadium: "weegstation_verwerkt",
      message: definitiefAfsluiten
        ? "Weging definitief afgesloten. Niet gewogen partijen zijn verwerkt volgens mark_absent_as."
        : "Weging tussentijds verwerkt voor lineup. Ongewogen partijen zijn bewaard voor later wegen.",
      open_url: `/dashboard/officials/controle/${matchmakingId}`,
    });
  } catch (err: any) {
    console.error("weegstation/finalize POST error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Weging definitief afsluiten mislukt." },
      { status: 500 }
    );
  }
}