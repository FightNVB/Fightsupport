import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type AnyRow = Record<string, any>;

function onlyDigits(v: any) {
  return String(v ?? "").replace(/[^\d]/g, "").trim();
}

function uniq(arr: unknown) {
  if (!Array.isArray(arr)) return [];
  return Array.from(new Set(arr.map(onlyDigits).filter(Boolean)));
}

function uniqText(arr: unknown) {
  if (!Array.isArray(arr)) return [];
  return Array.from(new Set(arr.map((v) => String(v ?? "").trim()).filter(Boolean)));
}

function isMissingColumnError(error: any) {
  const msg = String(error?.message || "");
  const code = String(error?.code || "");

  return (
    code === "PGRST204" ||
    msg.includes("Could not find") ||
    msg.includes("schema cache") ||
    msg.includes("column")
  );
}

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error(error?.message || "Niet ingelogd.");
  }

  return { user: data.user, token };
}

async function updateAanmeldingenStatusBySelection(args: {
  matchmakingId: string;
  vaNummers: string[];
  aanmeldingIds: string[];
  patch: AnyRow;
}) {
  const { matchmakingId, vaNummers, aanmeldingIds, patch } = args;

  if (aanmeldingIds.length) {
    const { error } = await supabaseAdmin
      .from("aanmeldingen")
      .update(patch)
      .eq("matchmaking_id", matchmakingId)
      .in("id", aanmeldingIds);

    if (error && !isMissingColumnError(error)) throw error;
  }

  if (vaNummers.length) {
    const possibleVaColumns = ["va_nummer", "va", "fighter_id"];

    for (const col of possibleVaColumns) {
      const { error } = await supabaseAdmin
        .from("aanmeldingen")
        .update(patch)
        .eq("matchmaking_id", matchmakingId)
        .in(col, vaNummers);

      if (!error) return;
      if (isMissingColumnError(error)) continue;
      throw error;
    }
  }
}


async function resolveAanmeldingIdsFromVa(args: {
  matchmakingId: string;
  vaNummers: string[];
}) {
  const { matchmakingId, vaNummers } = args;
  if (!vaNummers.length) return [] as string[];

  const found = new Set<string>();
  const possibleVaColumns = ["va_nummer", "va", "va_nr", "vanummer", "fighter_id"];

  for (const col of possibleVaColumns) {
    const { data, error } = await supabaseAdmin
      .from("aanmeldingen")
      .select("id")
      .eq("matchmaking_id", matchmakingId)
      .in(col, vaNummers);

    if (!error) {
      for (const row of data ?? []) {
        const id = String((row as any)?.id ?? "").trim();
        if (id) found.add(id);
      }
      continue;
    }

    if (isMissingColumnError(error)) continue;
    throw error;
  }

  return [...found];
}

async function resolveVaFromAanmeldingIds(args: {
  matchmakingId: string;
  aanmeldingIds: string[];
}) {
  const { matchmakingId, aanmeldingIds } = args;
  if (!aanmeldingIds.length) return [] as string[];

  const found = new Set<string>();
  const possibleVaColumns = ["va_nummer", "va", "va_nr", "vanummer", "fighter_id"];

  for (const col of possibleVaColumns) {
    const { data, error } = await supabaseAdmin
      .from("aanmeldingen")
      .select(`id,${col}`)
      .eq("matchmaking_id", matchmakingId)
      .in("id", aanmeldingIds);

    if (!error) {
      for (const row of data ?? []) {
        const va = onlyDigits((row as any)?.[col]);
        if (va) found.add(va);
      }
      continue;
    }

    if (isMissingColumnError(error)) continue;
    throw error;
  }

  return [...found];
}


async function resolveSelectionFromMatchmakerTables(args: {
  matchmakingId: string;
  vaNummers: string[];
  aanmeldingIds: string[];
}) {
  const { matchmakingId } = args;
  const vaSet = new Set(args.vaNummers.map(onlyDigits).filter(Boolean));
  const idSet = new Set(args.aanmeldingIds.map((v) => String(v ?? "").trim()).filter(Boolean));

  async function collectByVa(table: string) {
    const vaColumns = ["va_nummer", "va", "fighter_id"];
    const idColumns = ["aanmelding_id", "inschrijving_id", "id"];

    for (const vaCol of vaColumns) {
      if (!vaSet.size) break;

      const selectCols = Array.from(new Set([vaCol, ...idColumns])).join(",");
      const { data, error } = await supabaseAdmin
        .from(table)
        .select(selectCols)
        .eq("matchmaking_id", matchmakingId)
        .in(vaCol, [...vaSet]);

      if (error) {
        if (isMissingColumnError(error)) continue;
        throw error;
      }

      for (const row of data ?? []) {
        for (const idCol of idColumns) {
          const id = String((row as any)?.[idCol] ?? "").trim();
          if (id) idSet.add(id);
        }
      }
    }
  }

  async function collectVaById(table: string) {
    const idColumns = ["aanmelding_id", "inschrijving_id", "id"];
    const vaColumns = ["va_nummer", "va", "fighter_id"];

    for (const idCol of idColumns) {
      if (!idSet.size) break;

      const selectCols = Array.from(new Set([idCol, ...vaColumns])).join(",");
      const { data, error } = await supabaseAdmin
        .from(table)
        .select(selectCols)
        .eq("matchmaking_id", matchmakingId)
        .in(idCol, [...idSet]);

      if (error) {
        if (isMissingColumnError(error)) continue;
        throw error;
      }

      for (const row of data ?? []) {
        for (const vaCol of vaColumns) {
          const va = onlyDigits((row as any)?.[vaCol]);
          if (va) vaSet.add(va);
        }
      }
    }
  }

  for (const table of ["aanmeldingen", "matchmaker_fighter_context", "matchmaker_fighters_raw"]) {
    await collectByVa(table).catch((err) => {
      if (!isMissingColumnError(err)) throw err;
    });
  }

  for (const table of ["aanmeldingen", "matchmaker_fighter_context", "matchmaker_fighters_raw"]) {
    await collectVaById(table).catch((err) => {
      if (!isMissingColumnError(err)) throw err;
    });
  }

  return {
    vaNummers: [...vaSet],
    aanmeldingIds: [...idSet],
  };
}


async function deleteWhereVa(
  table: string,
  matchmakingId: string,
  vaNummers: string[],
) {
  if (!vaNummers.length) return;

  const possibleVaColumns = [
    "va_nummer",
    "va",
    "fighter_id",
    "rood_va_mm",
    "blauw_va_mm",
  ];

  for (const col of possibleVaColumns) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .in(col, vaNummers);

    if (!error) return;
    if (isMissingColumnError(error)) continue;
    throw error;
  }
}

async function deleteOldSelectedData(
  matchmakingId: string,
  vaNummers: string[],
) {
  await deleteWhereVa("matchmaker_fighter_resultaten", matchmakingId, vaNummers).catch(() => undefined);
  await deleteWhereVa("matchmaker_fighter_rules", matchmakingId, vaNummers).catch(() => undefined);
  await deleteWhereVa("matchmaker_fighter_context", matchmakingId, vaNummers).catch(() => undefined);
  await deleteWhereVa("matchmaker_uitslagen_raw", matchmakingId, vaNummers).catch(() => undefined);
  await deleteWhereVa("matchmaker_fighters_raw", matchmakingId, vaNummers).catch(() => undefined);
}

async function callScrapeStart(args: {
  req: Request;
  matchmakingId: string;
  token: string;
  vaNummers: string[];
  aanmeldingIds: string[];
  scrapeRunId: string;
}) {
  const { req, matchmakingId, token, vaNummers, aanmeldingIds, scrapeRunId } = args;

  // Op de VPS kan server-side fetch naar de publieke origin falen.
  // Gebruik daarom bij voorkeur de interne Next server.
  const origin =
    process.env.INTERNAL_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://127.0.0.1:3000";

  const res = await fetch(`${origin}/api/matchmaker/scrape/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      matchmaking_id: matchmakingId,
      matchmakingId,
      scrape_run_id: scrapeRunId,
      mode: "selected",
      scope: "selected",
      herscrape: true,
      force: true,
      only_open: false,
      onlyOpen: false,
      selected_ids: aanmeldingIds,
      aanmelding_ids: aanmeldingIds,
      aanmeldingIds,
      va_nummers: vaNummers,
      vaNummers,
      run_steps: ["scrape", "build", "enrich", "rules", "save"],
      refresh_tables: [
        "matchmaker_fighters_raw",
        "matchmaker_fighter_context",
        "matchmaker_fighter_resultaten",
      ],
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      json?.error || json?.message || `${res.status} ${res.statusText}`,
    );
  }

  return json;
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params:
      | Promise<{ matchmakingId?: string; matchmakingid?: string }>
      | { matchmakingId?: string; matchmakingid?: string };
  },
) {
  const scrapeRunId = randomUUID();
  let cleanMatchmakingId = "";
  let vaNummers: string[] = [];
  let aanmeldingIds: string[] = [];

  try {
    const resolvedParams = await params;
    const body = await req.json().catch(() => ({}));

    cleanMatchmakingId = String(
      resolvedParams?.matchmakingId ||
        resolvedParams?.matchmakingid ||
        body?.matchmaking_id ||
        body?.matchmakingId ||
        "",
    ).trim();

    if (!cleanMatchmakingId) {
      return NextResponse.json(
        { error: "matchmakingId ontbreekt." },
        { status: 400 },
      );
    }

    const { user, token } = await getUser(req);

    vaNummers = uniq([
      ...(Array.isArray(body?.va_nummers) ? body.va_nummers : []),
      ...(Array.isArray(body?.vaNummers) ? body.vaNummers : []),
      ...(Array.isArray(body?.fighter_ids) ? body.fighter_ids : []),
      ...(Array.isArray(body?.fighterIds) ? body.fighterIds : []),
      body?.va_nummer,
      body?.vaNummer,
      body?.fighter_id,
      body?.fighterId,
      body?.va,
    ]);

    aanmeldingIds = uniqText([
      ...(Array.isArray(body?.aanmelding_ids) ? body.aanmelding_ids : []),
      ...(Array.isArray(body?.aanmeldingIds) ? body.aanmeldingIds : []),
      ...(Array.isArray(body?.inschrijving_ids) ? body.inschrijving_ids : []),
      ...(Array.isArray(body?.inschrijvingIds) ? body.inschrijvingIds : []),
      ...(Array.isArray(body?.selected_ids) ? body.selected_ids : []),
      ...(Array.isArray(body?.selectedIds) ? body.selectedIds : []),
      body?.aanmelding_id,
      body?.aanmeldingId,
      body?.inschrijving_id,
      body?.inschrijvingId,
      body?.selected_id,
      body?.selectedId,
    ]);

    if (!vaNummers.length && !aanmeldingIds.length) {
      return NextResponse.json(
        { error: "Geen geselecteerde vechters ontvangen." },
        { status: 400 },
      );
    }

    // De frontend stuurt niet altijd dezelfde selectievelden.
    // Vul daarom VA's en aanmelding/inschrijving IDs aan vanuit zowel aanmeldingen
    // als de matchmaker-tabellen. Zo werkt herscrape ook als alleen een VA of
    // alleen een matchmaker-context ID wordt meegegeven.
    if (vaNummers.length) {
      const idsFromVa = await resolveAanmeldingIdsFromVa({
        matchmakingId: cleanMatchmakingId,
        vaNummers,
      });

      aanmeldingIds = Array.from(new Set([...aanmeldingIds, ...idsFromVa]));
    }

    if (aanmeldingIds.length) {
      const vaFromIds = await resolveVaFromAanmeldingIds({
        matchmakingId: cleanMatchmakingId,
        aanmeldingIds,
      }).catch(() => [] as string[]);

      vaNummers = Array.from(new Set([...vaNummers, ...vaFromIds]));
    }

    const resolvedSelection = await resolveSelectionFromMatchmakerTables({
      matchmakingId: cleanMatchmakingId,
      vaNummers,
      aanmeldingIds,
    });

    vaNummers = resolvedSelection.vaNummers;
    aanmeldingIds = resolvedSelection.aanmeldingIds;

    if (!vaNummers.length && !aanmeldingIds.length) {
      return NextResponse.json(
        {
          error:
            "Geen matchmaker-vechter gevonden voor de selectie. Stuur een VA-nummer, fighter_id of aanmelding_id mee.",
          matchmaking_id: cleanMatchmakingId,
        },
        { status: 404 },
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id, role, rol, type, bondteam")
      .eq("id", user.id)
      .maybeSingle();

    const role = String(
      profile?.role || profile?.rol || profile?.type || "",
    ).toLowerCase();

    const { data: mm, error: mmError } = await supabaseAdmin
      .from("matchmakings")
      .select("id, maker_type, matchmaker_id, uploaded_by, huidige_eigenaar_user_id")
      .eq("id", cleanMatchmakingId)
      .maybeSingle();

    if (mmError) throw mmError;

    if (!mm) {
      return NextResponse.json(
        { error: "Matchmaking niet gevonden." },
        { status: 404 },
      );
    }

    const isOwner =
      mm.matchmaker_id === user.id ||
      mm.uploaded_by === user.id ||
      mm.huidige_eigenaar_user_id === user.id;

    const isAdminLike = ["superadmin", "admin", "hoofdofficial"].includes(role);

    if (!isOwner && !isAdminLike) {
      return NextResponse.json(
        { error: "Geen toegang tot deze matchmaking." },
        { status: 403 },
      );
    }

    await updateAanmeldingenStatusBySelection({
      matchmakingId: cleanMatchmakingId,
      vaNummers,
      aanmeldingIds,
      patch: {
        status: "controle_bezig",
        scrape_run_id: scrapeRunId,
        scrape_started_at: new Date().toISOString(),
        scrape_failed_at: null,
        scrape_error: null,
      },
    });

    await deleteOldSelectedData(cleanMatchmakingId, vaNummers);

    const result = await callScrapeStart({
      req,
      matchmakingId: cleanMatchmakingId,
      token,
      vaNummers,
      aanmeldingIds,
      scrapeRunId,
    });

    // /api/matchmaker/scrape/start heeft hier al alles gedaan:
    // Puppeteer, raw insert, context bouwen, rules schrijven en status bijwerken.
    // Niet nog een keer rules/statussen draaien, want dat veroorzaakte de rode 500
    // nadat de scraper zelf al succesvol klaar was.
    return NextResponse.json({
      ok: true,
      matchmaking_id: cleanMatchmakingId,
      scrape_run_id: scrapeRunId,
      va_nummers: vaNummers,
      aanmelding_ids: aanmeldingIds,
      result,
    });
  } catch (e: any) {
    if (cleanMatchmakingId && (vaNummers.length || aanmeldingIds.length)) {
      await updateAanmeldingenStatusBySelection({
        matchmakingId: cleanMatchmakingId,
        vaNummers,
        aanmeldingIds,
        patch: {
          status: "scrape_mislukt",
          scrape_failed_at: new Date().toISOString(),
          scrape_error: e?.message || "Herscrape mislukt.",
        },
      }).catch(() => undefined);
    }

    return NextResponse.json(
      { error: e?.message || "Herscrape mislukt." },
      { status: 500 },
    );
  }
}
