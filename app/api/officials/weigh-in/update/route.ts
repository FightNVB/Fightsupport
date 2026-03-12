// app/api/officials/weigh-in/update/route.ts
// ✅ API route for updating weigh_in_bouts records
// Allowed roles: official, hoofdofficial, admin, superadmin

import { NextResponse } from "next/server";
import { requireUserFromAuthHeader, hasAnyRoleFromReq } from "@/lib/api/requireRole";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ALLOWED_ROLES = ["official", "hoofdofficial", "admin", "superadmin"];

function toNum(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function berekenEindstatus(params: {
  rGew: number | null;
  bGew: number | null;
  maxGew: number | null;
  leeftijdType: string;
  dispensatieVerleend: boolean;
  dispensatieNodig: boolean;
  adminSanctieNodig: boolean;
}): { eindstatus: string; praktijkStatus: string; dispensatieNodig: boolean } {
  const { rGew, bGew, maxGew, leeftijdType, dispensatieVerleend, adminSanctieNodig } = params;

  const isJeugd = leeftijdType?.toLowerCase().includes("jeugd");

  if (adminSanctieNodig) {
    return {
      eindstatus: "HANDMATIGE_BEOORDELING",
      praktijkStatus: "HANDMATIGE_BEOORDELING",
      dispensatieNodig: params.dispensatieNodig,
    };
  }

  if (dispensatieVerleend) {
    return {
      eindstatus: "GOEDGEKEURD_MET_DISPENSATIE",
      praktijkStatus: "GOEDGEKEURD_MET_DISPENSATIE",
      dispensatieNodig: true,
    };
  }

  if (rGew == null && bGew == null) {
    return {
      eindstatus: "WACHT_OP_WEGEN",
      praktijkStatus: "WACHT_OP_WEGEN",
      dispensatieNodig: false,
    };
  }

  if (rGew == null || bGew == null) {
    return {
      eindstatus: "DEELS_GEWOGEN",
      praktijkStatus: "DEELS_GEWOGEN",
      dispensatieNodig: false,
    };
  }

  // Both fighters weighed
  const offsetKlasse = isJeugd ? 2.0 : 3.0;
  const maxVerschil = isJeugd ? 2.5 : 3.0;
  const maxVerschilDisp = isJeugd ? 4.0 : 7.0;

  let rOkKlasse = true;
  let bOkKlasse = true;
  if (maxGew != null) {
    const minGew = maxGew - offsetKlasse;
    rOkKlasse = rGew >= minGew && rGew <= maxGew;
    bOkKlasse = bGew >= minGew && bGew <= maxGew;
  }

  const verschil = Math.abs(rGew - bGew);
  const verschilOk = verschil <= maxVerschil;
  const verschilDispensatie = verschil <= maxVerschilDisp;

  if (rOkKlasse && bOkKlasse && verschilOk) {
    return { eindstatus: "OK", praktijkStatus: "OK", dispensatieNodig: false };
  }

  if (verschilDispensatie) {
    return {
      eindstatus: "DISPENSATIE_NODIG",
      praktijkStatus: "DISPENSATIE_NODIG",
      dispensatieNodig: true,
    };
  }

  return { eindstatus: "AFKEUR", praktijkStatus: "AFKEUR", dispensatieNodig: false };
}

export async function POST(req: Request) {
  try {
    const { user } = await requireUserFromAuthHeader(req);
    const ok = await hasAnyRoleFromReq(req, ALLOWED_ROLES);
    if (!ok) {
      return NextResponse.json(
        { error: "Geen toegang. Vereiste rol: official of hoger." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "bout id ontbreekt." }, { status: 400 });
    }

    // Fetch current record for recalculation
    const { data: huidig, error: fetchErr } = await supabaseAdmin
      .from("weigh_in_bouts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !huidig) {
      return NextResponse.json({ error: "Partij niet gevonden." }, { status: 404 });
    }

    // Build update payload from body
    const updates: Record<string, any> = {};

    if ("rood_gewogen_gewicht" in body) {
      updates.rood_gewogen_gewicht = toNum(body.rood_gewogen_gewicht);
    }
    if ("blauw_gewogen_gewicht" in body) {
      updates.blauw_gewogen_gewicht = toNum(body.blauw_gewogen_gewicht);
    }
    if ("gewicht_strafpunt_rood" in body) {
      updates.gewicht_strafpunt_rood =
        body.gewicht_strafpunt_rood != null ? String(body.gewicht_strafpunt_rood) : null;
    }
    if ("gewicht_strafpunt_blauw" in body) {
      updates.gewicht_strafpunt_blauw =
        body.gewicht_strafpunt_blauw != null ? String(body.gewicht_strafpunt_blauw) : null;
    }
    if ("dispensatie_nodig" in body) {
      updates.dispensatie_nodig = !!body.dispensatie_nodig;
    }
    if ("dispensatie_verleend" in body) {
      updates.dispensatie_verleend = !!body.dispensatie_verleend;
    }
    if ("dispensatie_reason" in body) {
      updates.dispensatie_reason = body.dispensatie_reason ?? null;
    }
    if ("dispensatie_by" in body) {
      updates.dispensatie_by = body.dispensatie_by ?? null;
    }
    if ("dispensatie_at" in body) {
      updates.dispensatie_at = body.dispensatie_at ?? null;
    }
    if ("admin_sanctie_nodig" in body) {
      updates.admin_sanctie_nodig =
        body.admin_sanctie_nodig != null ? String(body.admin_sanctie_nodig) : null;
    }
    if ("admin_sanctie_reason" in body) {
      updates.admin_sanctie_reason = body.admin_sanctie_reason ?? null;
    }
    if ("weging_notitie" in body) {
      updates.weging_notitie = body.weging_notitie ?? null;
    }

    // Merge with current to compute new gewicht_verschil and status
    const rGew =
      "rood_gewogen_gewicht" in updates
        ? updates.rood_gewogen_gewicht
        : toNum(huidig.rood_gewogen_gewicht);
    const bGew =
      "blauw_gewogen_gewicht" in updates
        ? updates.blauw_gewogen_gewicht
        : toNum(huidig.blauw_gewogen_gewicht);
    const maxGew = toNum(huidig.max_gewicht);
    const leeftijdType = String(huidig.leeftijd_type ?? "volwassene");

    const dispVerleend =
      "dispensatie_verleend" in updates
        ? !!updates.dispensatie_verleend
        : !!huidig.dispensatie_verleend;
    const dispNodig =
      "dispensatie_nodig" in updates
        ? !!updates.dispensatie_nodig
        : !!huidig.dispensatie_nodig;
    const adminSanctie =
      "admin_sanctie_nodig" in updates
        ? !!(updates.admin_sanctie_nodig && updates.admin_sanctie_nodig !== "0")
        : !!(huidig.admin_sanctie_nodig && huidig.admin_sanctie_nodig !== "0");

    // Calculate gewicht_verschil
    if (rGew != null && bGew != null) {
      updates.gewicht_verschil = Math.abs(rGew - bGew);
    } else {
      updates.gewicht_verschil = null;
    }

    // Recalculate status
    const { eindstatus, praktijkStatus, dispensatieNodig: newDispNodig } = berekenEindstatus({
      rGew,
      bGew,
      maxGew,
      leeftijdType,
      dispensatieVerleend: dispVerleend,
      dispensatieNodig: dispNodig,
      adminSanctieNodig: adminSanctie,
    });

    updates.eindstatus = eindstatus;
    updates.praktijk_status = praktijkStatus;
    updates.dispensatie_nodig = newDispNodig;

    // Dispensatie grant: auto-set dispensatie_by and dispensatie_at
    if ("dispensatie_verleend" in body && body.dispensatie_verleend && !huidig.dispensatie_verleend) {
      updates.dispensatie_by = user.id;
      updates.dispensatie_at = new Date().toISOString();
    }

    updates.laatste_bewerking_door = user.id;
    updates.laatste_bewerking_op = new Date().toISOString();
    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("weigh_in_bouts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true, bout: updated });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("[weigh-in/update]", e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
