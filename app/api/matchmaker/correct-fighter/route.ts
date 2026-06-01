import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function normalizeText(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  return s ? s : null;
}

function normalizeVa(input: unknown): string | null {
  const s = String(input ?? "").replace(/[^0-9]/g, "").replace(/^0+/, "");
  return s || null;
}

function normalizeNumber(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(String(input).replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function splitName(fullName: string | null) {
  const name = String(fullName ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { voornaam: null as string | null, achternaam: null as string | null };
  const parts = name.split(" ");
  if (parts.length === 1) return { voornaam: parts[0], achternaam: null as string | null };
  return {
    voornaam: parts[0],
    achternaam: parts.slice(1).join(" "),
  };
}

function safeJson(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

function duplicateKey(naam: string | null, va: string | null) {
  const n = String(naam ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const v = String(va ?? "").trim();
  if (n && v) return `name-va:${n}|${v}`;
  if (v) return `va:${v}`;
  if (n) return `name:${n}`;
  return null;
}

async function findAanmelding(args: {
  matchmaking_id: string;
  inschrijving_id?: string | number | null;
  old_va_nummer?: string | null;
}) {
  const { matchmaking_id } = args;
  const inschrijvingId = String(args.inschrijving_id ?? "").trim();
  const oldVa = normalizeVa(args.old_va_nummer);

  if (inschrijvingId) {
    const { data, error } = await supabase
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("id", inschrijvingId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (oldVa) {
    const { data, error } = await supabase
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("va_nummer", oldVa)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  return null;
}

async function bestEffortUpdateContext(args: {
  matchmaking_id: string;
  inschrijving_id: string | number | null;
  old_va_nummer: string | null;
  patch: Record<string, any>;
}) {
  const { matchmaking_id, inschrijving_id, old_va_nummer, patch } = args;

  const contextPatch: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.va_nummer !== undefined) contextPatch.va_nummer = patch.va_nummer;
  if (patch.naam !== undefined) contextPatch.naam = patch.naam;
  if (patch.gym !== undefined) {
    contextPatch.gym_input = patch.gym;
    contextPatch.gym = patch.gym;
  }
  if (patch.discipline !== undefined) contextPatch.discipline = patch.discipline;
  if (patch.klasse !== undefined) contextPatch.klasse = patch.klasse;
  if (patch.geslacht !== undefined) contextPatch.geslacht = patch.geslacht;
  if (patch.geboortedatum !== undefined) {
    contextPatch.geboortedatum_input = patch.geboortedatum;
    contextPatch.geboortedatum = patch.geboortedatum;
  }
  if (patch.gewicht !== undefined) contextPatch.gewicht = patch.gewicht;
  if (patch.email !== undefined) contextPatch.email = patch.email;
  if (patch.telefoon !== undefined) contextPatch.telefoon = patch.telefoon;

  try {
    let q = supabase.from("matchmaker_fighter_context").update(contextPatch).eq("matchmaking_id", matchmaking_id);

    const filters: string[] = [];
    if (old_va_nummer) filters.push(`va_nummer.eq.${old_va_nummer}`);
    if (patch.va_nummer) filters.push(`va_nummer.eq.${patch.va_nummer}`);
    if (inschrijving_id) filters.push(`inschrijving_id.eq.${inschrijving_id}`);

    if (filters.length) q = q.or(filters.join(","));

    const { error } = await q;
    if (error) console.warn("[matchmaker/correct-fighter] context update overgeslagen:", error.message);
  } catch (e: any) {
    console.warn("[matchmaker/correct-fighter] context update overgeslagen:", e?.message ?? e);
  }
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req, [
      "matchmaker",
      "admin",
      "superadmin",
    ]);

    const body = await req.json().catch(() => ({}));
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();

    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const aanmelding = await findAanmelding({
      matchmaking_id,
      inschrijving_id: body?.inschrijving_id,
      old_va_nummer: body?.old_va_nummer ?? body?.va_nummer,
    });

    if (!aanmelding) {
      return NextResponse.json(
        { error: "Aanmelding niet gevonden voor deze matchmaking/vechter." },
        { status: 404 }
      );
    }

    const newVa = normalizeVa(body?.new_va_nummer ?? body?.va_nummer ?? aanmelding.va_nummer);
    const naam = normalizeText(body?.naam ?? aanmelding.naam);
    const { voornaam, achternaam } = splitName(naam);

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (newVa !== null) patch.va_nummer = newVa;
    if (naam !== null) patch.naam = naam;
    if (voornaam !== null) patch.voornaam = voornaam;
    if (achternaam !== null) patch.achternaam = achternaam;

    if (body?.gym !== undefined) patch.gym = normalizeText(body.gym);
    if (body?.discipline !== undefined) patch.discipline = normalizeText(body.discipline);
    if (body?.klasse !== undefined) patch.klasse = normalizeText(body.klasse);
    if (body?.geslacht !== undefined) patch.geslacht = normalizeText(body.geslacht);
    if (body?.geboortedatum !== undefined) patch.geboortedatum = normalizeText(body.geboortedatum);
    if (body?.gewicht !== undefined) patch.gewicht = normalizeNumber(body.gewicht);
    if (body?.email !== undefined) patch.email = normalizeText(body.email);
    if (body?.telefoon !== undefined) patch.telefoon = normalizeText(body.telefoon);
    if (body?.win !== undefined) patch.win = normalizeNumber(body.win) ?? 0;
    if (body?.loss !== undefined) patch.loss = normalizeNumber(body.loss) ?? 0;
    if (body?.draw !== undefined) patch.draw = normalizeNumber(body.draw) ?? 0;

    patch.duplicate_key = duplicateKey(patch.naam ?? aanmelding.naam, patch.va_nummer ?? aanmelding.va_nummer);

    const raw = safeJson(aanmelding.raw);
    patch.raw = {
      ...raw,
      corrected_at: new Date().toISOString(),
      corrected_by: userId ?? null,
      corrected_via: "matchmaker_correct_fighter",
      parsed_naam: patch.naam ?? raw.parsed_naam ?? aanmelding.naam ?? null,
      corrected_values: {
        va_nummer: patch.va_nummer ?? aanmelding.va_nummer ?? null,
        naam: patch.naam ?? aanmelding.naam ?? null,
        gym: patch.gym ?? aanmelding.gym ?? null,
        discipline: patch.discipline ?? aanmelding.discipline ?? null,
        klasse: patch.klasse ?? aanmelding.klasse ?? null,
        geslacht: patch.geslacht ?? aanmelding.geslacht ?? null,
        geboortedatum: patch.geboortedatum ?? aanmelding.geboortedatum ?? null,
        gewicht: patch.gewicht ?? aanmelding.gewicht ?? null,
        email: patch.email ?? aanmelding.email ?? null,
        telefoon: patch.telefoon ?? aanmelding.telefoon ?? null,
        win: patch.win ?? aanmelding.win ?? null,
        loss: patch.loss ?? aanmelding.loss ?? null,
        draw: patch.draw ?? aanmelding.draw ?? null,
      },
    };

    const { data: updated, error: updateError } = await supabase
      .from("aanmeldingen")
      .update(patch)
      .eq("id", aanmelding.id)
      .select("id, matchmaking_id, naam, va_nummer, gym, discipline, klasse, geslacht, geboortedatum, gewicht, email, telefoon, win, loss, draw")
      .single();

    if (updateError) throw updateError;

    await bestEffortUpdateContext({
      matchmaking_id,
      inschrijving_id: aanmelding.id,
      old_va_nummer: normalizeVa(aanmelding.va_nummer),
      patch,
    });

    return NextResponse.json({
      ok: true,
      message: "Aanmelding bijgewerkt.",
      matchmaking_id,
      old_va_nummer: normalizeVa(aanmelding.va_nummer),
      new_va_nummer: newVa,
      aanmelding: updated,
    });
  } catch (e: any) {
    console.error("[matchmaker/correct-fighter] fout:", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout bij correctie van aanmelding." },
      { status: 500 }
    );
  }
}
