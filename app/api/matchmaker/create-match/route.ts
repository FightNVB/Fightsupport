import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown) {
  const x = Number(String(v ?? "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : null;
}

function va(v: unknown) {
  const x = s(v).replace(/[^\d]/g, "");
  return x || null;
}

function fullName(row: any) {
  return (
    s(row?.naam) ||
    s(row?.fp_naam) ||
    s(row?.naam_input) ||
    [row?.voornaam, row?.achternaam].map(s).filter(Boolean).join(" ") ||
    null
  );
}

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Niet ingelogd.");

  return data.user;
}

async function getFighter(matchmakingId: string, inschrijvingId: any, fighterId: any) {
  let q = supabaseAdmin
    .from("matchmaker_fighter_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .limit(1);

  if (inschrijvingId) {
    q = q.eq("inschrijving_id", inschrijvingId);
  } else if (fighterId) {
    q = q.eq("va_nummer", va(fighterId));
  } else {
    return null;
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw error;

  return data;
}

async function nextPartijNr(matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("partij_nr")
    .eq("matchmaking_id", matchmakingId);

  if (error) throw error;

  const nums = (data ?? [])
    .map((r: any) => Number(r.partij_nr))
    .filter((x: number) => Number.isFinite(x));

  return nums.length ? Math.max(...nums) + 1 : 1;
}

function isMissingColumnError(error: any) {
  const msg = String(error?.message || "");
  const code = String(error?.code || "");

  return (
    code === "PGRST204" ||
    code === "42703" ||
    msg.includes("Could not find the") ||
    msg.includes("column") ||
    msg.includes("schema cache")
  );
}

async function safeUpdateAanmeldingenMatched(matchmakingId: string, ids: any[], partijNr: number) {
  const cleanIds = Array.from(new Set(ids.map((id) => s(id)).filter(Boolean)));
  if (!cleanIds.length) return;

  const payloads = [
    { status: "gematcht", updated_at: new Date().toISOString() },
    { status: "gematcht" },
  ];

  for (const payload of payloads) {
    const { error } = await supabaseAdmin
      .from("aanmeldingen")
      .update(payload)
      .eq("matchmaking_id", matchmakingId)
      .in("id", cleanIds);

    if (!error) return;
    if (!isMissingColumnError(error)) throw error;
  }

  console.warn("aanmeldingen gematcht update overgeslagen: status/updated_at kolom niet beschikbaar", {
    matchmakingId,
    ids: cleanIds,
    partijNr,
  });
}

async function markContextMatched(matchmakingId: string, ids: any[], partijNr: number) {
  const cleanIds = Array.from(new Set(ids.map((id) => s(id)).filter(Boolean)));
  if (!cleanIds.length) return;

  const { data: rows, error: readError } = await supabaseAdmin
    .from("matchmaker_fighter_context")
    .select("id, inschrijving_id, extra")
    .eq("matchmaking_id", matchmakingId)
    .in("inschrijving_id", cleanIds);

  if (readError) {
    console.warn("matchmaker_fighter_context lezen voor gematcht markering mislukt", readError);
    return;
  }

  for (const row of rows ?? []) {
    const currentExtra = row?.extra && typeof row.extra === "object" ? row.extra : {};
    const nextExtra = {
      ...currentExtra,
      gematcht: true,
      matchmaker_match: {
        ...(currentExtra as any)?.matchmaker_match,
        gematcht: true,
        partij_nr: partijNr,
      },
    };

    const { error } = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .update({ extra: nextExtra, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (error) {
      const fallback = await supabaseAdmin
        .from("matchmaker_fighter_context")
        .update({ extra: nextExtra })
        .eq("id", row.id);

      if (fallback.error) {
        console.warn("matchmaker_fighter_context gematcht markeren mislukt", fallback.error);
      }
    }
  }
}

async function setMatchmakingControlLock(matchmakingId: string, locked: boolean) {
  const now = new Date().toISOString();

  const payloads = locked
    ? [
        { locked_for_editing: true, control_engine_busy: true, control_engine_started_at: now },
        { locked_for_editing: true, control_engine_busy: true },
        { locked_for_editing: true },
      ]
    : [
        { locked_for_editing: false, control_engine_busy: false, control_engine_finished_at: now },
        { locked_for_editing: false, control_engine_busy: false },
        { locked_for_editing: false },
      ];

  for (const payload of payloads) {
    const { error } = await supabaseAdmin
      .from("matchmakings")
      .update(payload)
      .eq("id", matchmakingId);

    if (!error) return;
    if (!isMissingColumnError(error)) {
      console.warn("matchmaking lock update mislukt", error);
      return;
    }
  }
}

function startControlEngineFireAndForget(req: Request, matchmakingId: string, partijNr: number) {
  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  fetch(`${origin}/api/control-engine/matchmaker/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: req.headers.get("authorization") || "",
    },
    body: JSON.stringify({
      matchmaking_id: matchmakingId,
      scope: "selected",
      partij_nrs: [partijNr],
    }),
  })
    .then(async (controlResponse) => {
      if (!controlResponse.ok) {
        const controlText = await controlResponse.text().catch(() => "");
        console.error("control-engine/matchmaker/start gaf fout", controlResponse.status, controlText);
      }
    })
    .catch((e) => console.error("control-engine/matchmaker/start fout", e))
    .finally(() => {
      void setMatchmakingControlLock(matchmakingId, false);
    });
}

export async function POST(req: Request) {
  try {
    await getUser(req);

    const body = await req.json().catch(() => ({}));

    const matchmakingId = s(body.matchmaking_id);
    const roodInschrijvingId = body.rood_inschrijving_id ?? body.rood_id ?? null;
    const blauwInschrijvingId = body.blauw_inschrijving_id ?? body.blauw_id ?? null;

    const roodFighterId = body.rood_fighter_id ?? body.rood_va ?? null;
    const blauwFighterId = body.blauw_fighter_id ?? body.blauw_va ?? null;

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 },
      );
    }

    if (!roodInschrijvingId && !roodFighterId) {
      return NextResponse.json(
        { error: "Rode vechter ontbreekt." },
        { status: 400 },
      );
    }

    if (!blauwInschrijvingId && !blauwFighterId) {
      return NextResponse.json(
        { error: "Blauwe vechter ontbreekt." },
        { status: 400 },
      );
    }

    const rood = await getFighter(matchmakingId, roodInschrijvingId, roodFighterId);
    const blauw = await getFighter(matchmakingId, blauwInschrijvingId, blauwFighterId);

    if (!rood || !blauw) {
      return NextResponse.json(
        { error: "Rode of blauwe vechter niet gevonden in matchmaker_fighter_context." },
        { status: 404 },
      );
    }

    const partijNr = await nextPartijNr(matchmakingId);

    const insertRow = {
      matchmaking_id: matchmakingId,
      partij_nr: partijNr,

      discipline: s(rood.discipline || blauw.discipline) || null,
      klasse: s(rood.klasse || blauw.klasse) || null,
      geslacht: s(rood.geslacht || blauw.geslacht) || null,

      rood_naam: fullName(rood),
      rood_gym: s(rood.sportschool || rood.gym_input || rood.fp_gym) || null,
      rood_gewicht: n(rood.gewicht),
      va_rood: va(rood.va_nummer),

      blauw_naam: fullName(blauw),
      blauw_gym: s(blauw.sportschool || blauw.gym_input || blauw.fp_gym) || null,
      blauw_gewicht: n(blauw.gewicht),
      va_blauw: va(blauw.va_nummer),

      is_toernooi: false,
      raw_json: {
        source: "matchmaker_match_nieuw",
        rood_inschrijving_id: rood.inschrijving_id ?? null,
        blauw_inschrijving_id: blauw.inschrijving_id ?? null,
      },
    };

    const { data, error } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) throw error;

    const matchedIds = [rood.inschrijving_id, blauw.inschrijving_id].filter(Boolean);
    await safeUpdateAanmeldingenMatched(matchmakingId, matchedIds, partijNr);
    await markContextMatched(matchmakingId, matchedIds, partijNr);

    await setMatchmakingControlLock(matchmakingId, true);
    startControlEngineFireAndForget(req, matchmakingId, partijNr);

    return NextResponse.json({
      ok: true,
      partij_nr: partijNr,
      bout: data,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Match opslaan mislukt.",
        code: e?.code ?? null,
        details: e?.details ?? null,
      },
      { status: 500 },
    );
  }
}