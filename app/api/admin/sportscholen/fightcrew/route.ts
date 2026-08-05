// app/api/admin/sportscholen/fightcrew/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

function normalizeKey(raw: unknown) {
  const key = String(raw ?? "")
    .trim()
    .replace(/\D/g, "")
    .replace(/^0+/, "");
  return key || null;
}

function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (env) return env;
  throw new Error("NEXT_PUBLIC_SUPABASE_URL ontbreekt");
}

function getServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt");
  return key;
}

function normalizeStatus(raw: unknown, fighterCount: number) {
  const s = String(raw ?? "").trim().toLowerCase();

  // Belangrijk: als de VA-enrich later faalt, mogen de gevonden Fightcrew-rijen
  // niet verdwijnen uit de pagina. Zodra er rows zijn is de Fightcrew opgehaald.
  if (fighterCount > 0 && (!s || s === "mislukt" || s === "error" || s === "failed")) {
    return "klaar";
  }

  if (!s) return fighterCount > 0 ? "klaar" : null;
  return s;
}

function sortFighters(rows: AnyRow[]) {
  return [...rows].sort((a, b) => {
    const an = String(a.naam ?? `${a.voornaam ?? ""} ${a.achternaam ?? ""}`).trim().toLowerCase();
    const bn = String(b.naam ?? `${b.voornaam ?? ""} ${b.achternaam ?? ""}`).trim().toLowerCase();
    return an.localeCompare(bn, "nl") || String(a.va_nummer ?? "").localeCompare(String(b.va_nummer ?? ""), "nl");
  });
}

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  try {
    const url = new URL(req.url);

    const sportschoolKey = normalizeKey(
      url.searchParams.get("sportschool_id") ??
        url.searchParams.get("sportschoolKey") ??
        url.searchParams.get("key") ??
        url.searchParams.get("")
    );

    if (!sportschoolKey) {
      return NextResponse.json({ error: "sportschool_id ontbreekt" }, { status: 400 });
    }

    const admin = createClient(getBaseUrl(), getServiceKey(), {
      auth: { persistSession: false },
    });

    // Eerst fighters ophalen. Deze tabel bestaat bij jou en bepaalt of de Fightcrew
    // daadwerkelijk binnen is, los van de latere VA-scrape/status.
    const { data: fighterRows, error: fighterErr } = await admin
      .from("sportschool_fighters")
      .select("*")
      .eq("sportschool_id", Number(sportschoolKey))
      .order("naam", { ascending: true })
      .limit(1000);

    if (fighterErr) {
      return NextResponse.json(
        { error: `Fightcrew rows laden mislukt: ${fighterErr.message}` },
        { status: 500 }
      );
    }

    const fighters = sortFighters(fighterRows ?? []);
    const fighterCount = fighters.length;

    // Bewust alleen kolommen die in jouw project al stabiel gebruikt worden.
    // team_sync_started_at / team_sync_finished_at geven 500 als ze niet bestaan.
    const { data: school, error: schoolErr } = await admin
      .from("sportscholen")
      .select("sportschool_id, naam, plaats, land, last_team_sync_at, team_sync_status, team_sync_error, updated_at")
      .eq("sportschool_id", Number(sportschoolKey))
      .maybeSingle();

    if (schoolErr) {
      return NextResponse.json({ error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
    }

    if (!school) {
      return NextResponse.json({ error: "Sportschool niet gevonden" }, { status: 404 });
    }

    const fixedStatus = normalizeStatus(school.team_sync_status, fighterCount);
    const fixedSchool = {
      ...school,
      team_sync_status: fixedStatus,
      fighter_count: fighterCount,
    };

    return NextResponse.json({
      ok: true,
      sportschool: fixedSchool,
      rows: fighters,
      fighters,
      fighter_count: fighterCount,
      // pagina mag dit tonen, maar niet als harde fout behandelen
      fighters_error: null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "De aanvraag kon niet worden verwerkt." },
      { status: 500 }
    );
  }
}
