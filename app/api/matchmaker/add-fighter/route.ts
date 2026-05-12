import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const runtime = "nodejs";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown) {
  const x = Number(String(v ?? "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : null;
}

async function getUser(req: Request) {
  const a = req.headers.get("authorization") || "";
  const t = a.startsWith("Bearer ") ? a.slice(7).trim() : "";

  if (!t) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(t);

  if (error || !data.user) {
    throw new Error(error?.message || "Niet ingelogd.");
  }

  return data.user;
}

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    const body = await req.json().catch(() => ({}));

    const matchmaking_id = s(body?.matchmaking_id);

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    const { data: matchmaking, error: matchmakingError } = await supabaseAdmin
      .from("matchmakings")
      .select(`
        id,
        bron_type,
        maker_user_id,
        matchmaker_id,
        uploaded_by
      `)
      .eq("id", matchmaking_id)
      .maybeSingle();

    if (matchmakingError) throw matchmakingError;

    if (!matchmaking) {
      return NextResponse.json(
        { error: "Matchmaking niet gevonden." },
        { status: 404 }
      );
    }

    const bronType = s(matchmaking.bron_type).toLowerCase();

    const isAdminUpload = bronType === "admin_upload";

    const isVanDezeMatchmaker =
      matchmaking.maker_user_id === user.id ||
      matchmaking.matchmaker_id === user.id ||
      matchmaking.uploaded_by === user.id;

    if (isAdminUpload || !isVanDezeMatchmaker) {
      return NextResponse.json(
        {
          error:
            "Je kunt alleen vechters toevoegen aan een eigen matchmaking die in de app is gemaakt.",
        },
        { status: 403 }
      );
    }

    const voornaam = s(body?.voornaam);
    const achternaam = s(body?.achternaam);
    const naam =
      s(body?.naam) || [voornaam, achternaam].filter(Boolean).join(" ");

    if (!naam) {
      return NextResponse.json(
        { error: "Naam of voornaam/achternaam is verplicht." },
        { status: 400 }
      );
    }

    const row = {
      matchmaking_id,
      row_nr: null,

      discipline: s(body?.discipline) || null,
      klasse: s(body?.klasse) || null,
      geslacht: s(body?.geslacht) || null,

      voornaam: voornaam || null,
      achternaam: achternaam || null,
      naam: naam || null,

      email: s(body?.email) || null,
      telefoon: s(body?.telefoon) || null,

      gym: s(body?.gym) || s(body?.gym) || null,
      

      va_nummer: s(body?.va_nummer) || null,
      gewicht: n(body?.gewicht),

      win: n(body?.win),
      loss: n(body?.loss),
      draw: n(body?.draw),
      demo: n(body?.demo),

      opmerkingen: s(body?.opmerkingen) || null,

      raw: {
        handmatig_toegevoegd: true,
        toegevoegd_door: user.id,
        toegevoegd_op: new Date().toISOString(),
      },

      uploaded_by: user.id,
    };

    const { data, error } = await supabaseAdmin
      .from("aanmeldingen")
      .insert(row)
      .select("*")
      .single();

    if (error) throw error;

    await supabaseAdmin
      .from("matchmakings")
      .update({
        last_updated_at: new Date().toISOString(),
        last_updated_by: user.id,
      })
      .eq("id", matchmaking_id);

    return NextResponse.json({
      ok: true,
      fighter: data,
    });
  } catch (err: any) {
    console.error("[matchmaker/add-fighter] error:", err);

    return NextResponse.json(
      { error: err?.message || "Handmatig toevoegen mislukt." },
      { status: 500 }
    );
  }
}