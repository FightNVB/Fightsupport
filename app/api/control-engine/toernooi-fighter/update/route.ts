// app/api/control-engine/toernooi-fighter/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown) {
  const raw = s(v).replace(",", ".");
  if (!raw) return null;
  const x = Number(raw);
  return Number.isFinite(x) ? x : null;
}

function va(v: unknown) {
  const d = s(v).replace(/\D/g, "");
  return d || null;
}

function has(body: Record<string, any>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function firstString(body: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (has(body, key)) return s(body[key]);
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, any>;

    const matchmaking_id = s(body.matchmaking_id);
    const toernooi_code = s(body.toernooi_code);

    // old_va bepaalt welke bestaande rij wordt gevonden.
    // new_va is de nieuwe waarde die opgeslagen mag worden.
    const old_va = va(body.old_va_nummer ?? body.va_old ?? body.old_fighter_id ?? body.fighter_id);
    const new_va = va(body.va_nummer ?? body.new_va_nummer ?? body.new_fighter_id ?? body.fighter_id);

    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }
    if (!toernooi_code) {
      return NextResponse.json({ error: "toernooi_code ontbreekt" }, { status: 400 });
    }
    if (!old_va && !new_va) {
      return NextResponse.json({ error: "fighter_id/va_nummer ontbreekt" }, { status: 400 });
    }

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // Alleen kolommen gebruiken die in controle_toernooi_context bestaan.
    // Dus géén gym/gym_input/laatste_bewerking_op/trainer_* etc.
    const updateRow: Record<string, any> = {
      updated_at: new Date().toISOString(),
      bijgewerkt_op: new Date().toISOString().slice(0, 10),
    };

    if (new_va) {
      updateRow.fighter_id = new_va;
      updateRow.va_nummer = new_va;
    }

    const naam = firstString(body, ["naam_input", "naam", "naam_mm"]);
    if (naam !== undefined) {
      updateRow.naam = naam || null;
      updateRow.naam_mm = naam || null;
    }

    const sportschool = firstString(body, ["sportschool_input", "sportschool", "sportschool_mm", "gym_input", "gym"]);
    if (sportschool !== undefined) {
      updateRow.sportschool = sportschool || null;
      updateRow.sportschool_mm = sportschool || null;
    }

    const geboortedatum = firstString(body, ["geboortedatum_input", "geboortedatum"]);
    if (geboortedatum !== undefined) {
      updateRow.geboortedatum = geboortedatum || null;
    }

    const geslacht = firstString(body, ["geslacht_input", "geslacht"]);
    if (geslacht !== undefined) {
      updateRow.geslacht = geslacht || null;
    }

    if (has(body, "gewicht_input") || has(body, "gewicht")) {
      const rawGewicht = has(body, "gewicht_input") ? body.gewicht_input : body.gewicht;
      updateRow.gewicht = n(rawGewicht);
    }

    const discipline = firstString(body, ["discipline_input", "discipline"]);
    if (discipline !== undefined) {
      updateRow.discipline = discipline || null;
    }

    const klasse = firstString(body, ["klasse_input", "klasse", "klasse_mm"]);
    if (klasse !== undefined) {
      updateRow.klasse = klasse || null;
      updateRow.klasse_mm = klasse || null;
    }

    const email = firstString(body, ["email_input", "email"]);
    if (email !== undefined) {
      updateRow.email = email || null;
    }

    let query = supabase
      .from("controle_toernooi_context")
      .update(updateRow)
      .eq("matchmaking_id", matchmaking_id)
      .eq("toernooi_code", toernooi_code);

    const lookupVa = old_va || new_va;
    query = query.or(`fighter_id.eq.${lookupVa},va_nummer.eq.${lookupVa}`);

    const { data, error } = await query.select("*").limit(1);

    if (error) throw error;

    if (!data?.length) {
      return NextResponse.json({ error: "Geen toernooi context gevonden" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, row: data[0] });
  } catch (err: any) {
    console.error("[toernooi-fighter/update]", err);
    return NextResponse.json(
      { error: err?.message ?? "Opslaan toernooi-vechter mislukt" },
      { status: 500 }
    );
  }
}
