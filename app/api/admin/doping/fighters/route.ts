import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";
import {
  isCurrentMandatoryDopingTarget,
  normalizeDopingClass,
  normalizeDopingDiscipline,
} from "@/lib/doping";

const BATCH_SIZE = 1000;

type WorkflowRow = {
  va_nummer: string;
  workflow_status?: string | null;
  certificate_status?: string | null;
  fightpassport_status?: string | null;
  last_invited_at?: string | null;
};

type CertificateRow = {
  va_nummer: string;
  status?: string | null;
};

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function certificatePriority(status: string) {
  if (["goedgekeurd", "approved", "verified"].includes(status)) return 4;
  if (["ontvangen", "received", "pending", "in_beoordeling", "handmatig"].includes(status)) return 3;
  if (["afgekeurd", "rejected"].includes(status)) return 2;
  return status ? 1 : 0;
}

function publicCertificateStatus(status: string) {
  if (["goedgekeurd", "approved", "verified"].includes(status)) return "goedgekeurd";
  if (["afgekeurd", "rejected"].includes(status)) return "afgekeurd";
  return status ? "ontvangen" : "niet_ontvangen";
}

async function loadAllFighters(q: string) {
  const rows: any[] = [];
  const safeSearch = q.replace(/[,()%]/g, " ").trim();

  for (let from = 0; ; from += BATCH_SIZE) {
    let query = supabaseAdmin
      .from("fightpassport_fighters")
      .select(
        "va_nummer,naam,email,geboortedatum,geslacht,licentie_actief,heeft_startverbod,fit_to_fight,nulmeting_discipline,nulmeting_klasse,berekende_klasse,mma_level,primary_discipline,last_scraped_at"
      )
      .order("naam", { ascending: true })
      .range(from, from + BATCH_SIZE - 1);

    if (safeSearch) {
      query = query.or(
        `va_nummer.ilike.%${safeSearch}%,naam.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    rows.push(...(data ?? []));
    if (!data || data.length < BATCH_SIZE) break;
  }

  return rows;
}

async function loadAllWorkflow() {
  const rows: WorkflowRow[] = [];

  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("doping_fighters")
      .select(
        "va_nummer,workflow_status,certificate_status,fightpassport_status,last_invited_at"
      )
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw error;
    rows.push(...((data ?? []) as WorkflowRow[]));
    if (!data || data.length < BATCH_SIZE) break;
  }

  return rows;
}

async function loadAllCertificates() {
  const rows: CertificateRow[] = [];

  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("doping_certificates")
      .select("va_nummer,status")
      .range(from, from + BATCH_SIZE - 1);

    if (error) throw error;
    rows.push(...((data ?? []) as CertificateRow[]));
    if (!data || data.length < BATCH_SIZE) break;
  }

  return rows;
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    const url = new URL(req.url);
    const disciplineFilter = String(
      url.searchParams.get("discipline") || "ALL"
    ).toUpperCase();
    const classFilter = String(
      url.searchParams.get("klasse") || "ALL"
    ).toUpperCase();
    const statusFilter = normalizeStatus(url.searchParams.get("status") || "all");
    const q = String(url.searchParams.get("q") || "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(
      250,
      Math.max(25, Number(url.searchParams.get("pageSize") || 75))
    );

    // De drie onafhankelijke databronnen worden gelijktijdig geladen.
    const [fighters, workflowRows, certificateRows] = await Promise.all([
      loadAllFighters(q),
      loadAllWorkflow(),
      loadAllCertificates(),
    ]);

    const workflow = new Map<string, WorkflowRow>();
    for (const row of workflowRows) {
      workflow.set(String(row.va_nummer), row);
    }

    // Bepaal per VA de sterkste werkelijke certificaatstatus.
    const certificates = new Map<string, string>();
    for (const row of certificateRows) {
      const va = String(row.va_nummer);
      const next = normalizeStatus(row.status) || "ontvangen";
      const current = certificates.get(va) ?? "";

      if (certificatePriority(next) > certificatePriority(current)) {
        certificates.set(va, next);
      }
    }

    const filteredRows = fighters
      .map((fighter: any) => {
        const discipline = normalizeDopingDiscipline(
          fighter.primary_discipline ??
            fighter.nulmeting_discipline ??
            (fighter.mma_level ? "MMA" : null)
        );

        const klasse =
          discipline === "MMA"
            ? normalizeDopingClass(
                fighter.mma_level ??
                  fighter.berekende_klasse ??
                  fighter.nulmeting_klasse
              )
            : normalizeDopingClass(
                fighter.berekende_klasse ?? fighter.nulmeting_klasse
              );

        const wf = workflow.get(String(fighter.va_nummer)) ?? null;
        const certificateFromTable = certificates.get(String(fighter.va_nummer));
        const certificateStatus = certificateFromTable
          ? publicCertificateStatus(certificateFromTable)
          : publicCertificateStatus(normalizeStatus(wf?.certificate_status));
        const fightpassportStatus = normalizeStatus(wf?.fightpassport_status);

        return {
          ...fighter,
          discipline,
          klasse,
          mandatory_now: isCurrentMandatoryDopingTarget(discipline, klasse),
          workflow_status: normalizeStatus(wf?.workflow_status) || "niet_uitgenodigd",
          certificate_status: certificateStatus,
          fightpassport_status:
            fightpassportStatus === "verwerkt" ||
            fightpassportStatus === "written" ||
            fightpassportStatus === "already_present"
              ? "verwerkt"
              : "niet_verwerkt",
          last_invited_at: wf?.last_invited_at ?? null,
        };
      })
      .filter((row: any) => {
        if (
          disciplineFilter !== "ALL" &&
          String(row.discipline ?? "").toUpperCase() !== disciplineFilter
        ) {
          return false;
        }

        if (
          classFilter !== "ALL" &&
          String(row.klasse ?? "").toUpperCase() !== classFilter
        ) {
          return false;
        }

        if (statusFilter === "certificaat_ontvangen") {
          return ["ontvangen", "goedgekeurd"].includes(row.certificate_status);
        }

        if (statusFilter === "goedgekeurd") {
          return row.certificate_status === "goedgekeurd";
        }

        if (statusFilter === "afgekeurd") {
          return row.certificate_status === "afgekeurd";
        }

        if (statusFilter === "fightpassport_verwerkt") {
          return row.fightpassport_status === "verwerkt";
        }

        if (
          statusFilter !== "all" &&
          normalizeStatus(row.workflow_status) !== statusFilter
        ) {
          return false;
        }

        return true;
      });

    const total = filteredRows.length;
    const from = (page - 1) * pageSize;
    const pagedRows = filteredRows.slice(from, from + pageSize);

    const summary = {
      totaal: total,
      verplicht_nu: filteredRows.filter((row: any) => row.mandatory_now).length,
      niet_gemaild: filteredRows.filter(
        (row: any) => row.workflow_status === "niet_uitgenodigd"
      ).length,
      gemaild: filteredRows.filter((row: any) =>
        ["uitgenodigd", "herinnerd"].includes(row.workflow_status)
      ).length,
      ontvangen: filteredRows.filter((row: any) =>
        ["ontvangen", "goedgekeurd"].includes(row.certificate_status)
      ).length,
      goedgekeurd: filteredRows.filter(
        (row: any) => row.certificate_status === "goedgekeurd"
      ).length,
      fightpassport_verwerkt: filteredRows.filter(
        (row: any) => row.fightpassport_status === "verwerkt"
      ).length,
    };

    return NextResponse.json(
      {
        fighters: pagedRows,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        summary,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[doping/fighters] laden mislukt:", err);
    return NextResponse.json(
      { error: "Vechters konden niet worden geladen." },
      { status: 500 }
    );
  }
}
