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

function onlyDigits(v: unknown) {
  return s(v).replace(/[^\d]/g, "");
}

function num(v: unknown) {
  const n = Number(
    s(v)
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(n) ? n : null;
}

function boolish(v: unknown) {
  if (typeof v === "boolean") return v;
  const x = s(v).toLowerCase();
  if (["ja", "yes", "true", "1", "ok", "geldig"].includes(x)) return true;
  if (["nee", "no", "false", "0", "ongeldig"].includes(x)) return false;
  return null;
}

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v !== null && v !== undefined && s(v) !== "") return v;
  }
  return null;
}

function missingColumn(message: string) {
  return (
    message.match(/'([^']+)' column/)?.[1] ||
    message.match(/column "([^"]+)"/)?.[1] ||
    message.match(/Could not find the ([^\s]+) column/)?.[1] ||
    ""
  );
}

async function safeInsert(table: string, row: Record<string, any>) {
  let payload = { ...row };
  const dropped: string[] = [];

  for (let i = 0; i < 12; i++) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .insert(payload)
      .select("*")
      .single();

    if (!error) return { data, dropped };

    const col = missingColumn(error.message || "");
    if (
      (error.code === "PGRST204" || error.code === "42703") &&
      col &&
      col in payload
    ) {
      delete payload[col];
      dropped.push(col);
      continue;
    }

    throw error;
  }

  throw new Error(`Insert ${table} mislukt: te veel onbekende kolommen.`);
}

async function safeUpdateByColumn(
  table: string,
  column: string,
  values: string[],
  patch: Record<string, any>,
) {
  if (!values.length) return { count: 0, dropped: [] as string[] };

  let payload = { ...patch };
  const dropped: string[] = [];

  for (let i = 0; i < 8; i++) {
    const { error, count } = await supabaseAdmin
      .from(table)
      .update(payload, { count: "exact" })
      .in(column, values);

    if (!error) return { count: count ?? 0, dropped };

    const col = missingColumn(error.message || "");
    if (
      (error.code === "PGRST204" || error.code === "42703") &&
      col &&
      col in payload
    ) {
      delete payload[col];
      dropped.push(col);
      continue;
    }

    throw error;
  }

  throw new Error(`Update ${table} mislukt: te veel onbekende kolommen.`);
}

async function safeUpdateByIds(
  table: string,
  ids: string[],
  patch: Record<string, any>,
) {
  return safeUpdateByColumn(table, "id", ids, patch);
}


async function triggerToernooiFighterAutocheck(req: Request, args: {
  matchmakingId: string;
  toernooiCode: string;
  vaNummers: string[];
}) {
  const origin = new URL(req.url).origin;
  const authorization = req.headers.get("authorization") || "";
  const uniqueVa = Array.from(new Set(args.vaNummers.map(onlyDigits).filter(Boolean)));
  const results: Array<{ va_nummer: string; ok: boolean; error?: string }> = [];

  for (const va_nummer of uniqueVa) {
    try {
      const res = await fetch(`${origin}/api/control-engine/toernooi-fighter/autocheck`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authorization ? { authorization } : {}),
        },
        body: JSON.stringify({
          matchmaking_id: args.matchmakingId,
          toernooi_code: args.toernooiCode,
          va_nummer,
          fighter_id: va_nummer,
          source: "create-toernooi",
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        results.push({
          va_nummer,
          ok: false,
          error: json?.error || `HTTP ${res.status}`,
        });
      } else {
        results.push({ va_nummer, ok: true });
      }
    } catch (e: any) {
      results.push({ va_nummer, ok: false, error: e?.message || String(e) });
    }
  }

  return {
    attempted: uniqueVa.length,
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

async function getUser(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user ?? null;
}

function nameOf(row: any) {
  return s(
    pickFirst(
      row?.naam,
      row?.naam_fp,
      row?.fp_naam,
      row?.naam_mm,
      row?.naam_input,
      [row?.voornaam, row?.achternaam].map(s).filter(Boolean).join(" "),
    ),
  );
}

function gymOf(row: any) {
  return s(
    pickFirst(
      row?.sportschool,
      row?.sportschool_mm,
      row?.gym_input,
      row?.gym,
      row?.fp_gym,
    ),
  );
}

function klasseOf(row: any, fallback: string) {
  return s(
    pickFirst(
      row?.klasse,
      row?.klasse_mm,
      row?.klasse_input,
      row?.fp_klasse,
      fallback,
    ),
  );
}

function disciplineOf(row: any, fallback: string) {
  return s(pickFirst(row?.discipline, row?.discipline_input, fallback));
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ matchmakingid?: string; matchmakingId?: string }> },
) {
  try {
    const params = await ctx.params;
    const matchmakingId = s(params?.matchmakingid || params?.matchmakingId);
    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 },
      );
    }

    const user = await getUser(req);
    if (!user)
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const toernooiCode = s(
      pickFirst(body?.toernooi_code, body?.toernooicode, body?.tournament_code),
    ).toUpperCase();
    const discipline = s(body?.discipline).toUpperCase();
    const klasse = s(body?.klasse).toUpperCase();
    const maxGewicht = num(body?.max_gewicht ?? body?.maxGewicht);
    const deelnemerIds: string[] = Array.from(
      new Set<string>(
        (
          body?.deelnemer_inschrijving_ids ||
          body?.participant_inschrijving_ids ||
          []
        )
          .map((x: any) => s(x))
          .filter(Boolean),
      ),
    );
    const snapshotDeelnemers = Array.isArray(body?.deelnemers)
      ? body.deelnemers
      : [];

    if (!/^T\d+$/i.test(toernooiCode)) {
      return NextResponse.json(
        { error: "Toernooicode moet T1, T2, T3 enz. zijn." },
        { status: 400 },
      );
    }
    if (!discipline || !klasse || maxGewicht === null) {
      return NextResponse.json(
        { error: "Discipline, klasse en max gewicht zijn verplicht." },
        { status: 400 },
      );
    }
    if (![4, 8].includes(deelnemerIds.length)) {
      return NextResponse.json(
        { error: "Een toernooi moet 4 of 8 deelnemers hebben." },
        { status: 400 },
      );
    }

    // Als een eerdere poging de toernooi-deelnemers al heeft aangemaakt maar de status-update
    // niet meer heeft gehaald, dan niet opnieuw blokkeren. Zet dan alsnog de deelnemers
    // op gematcht en start de losse toernooi-autocheck opnieuw.
    const { data: existingTournamentRows, error: existingTournamentError } =
      await supabaseAdmin
        .from("matchmaker_toernooi_fighters")
        .select("id, aanmelding_id, fighter_id, va_nummer, toernooi_code")
        .eq("matchmaking_id", matchmakingId)
        .eq("toernooi_code", toernooiCode);

    if (existingTournamentError) throw existingTournamentError;

    if ((existingTournamentRows || []).length > 0) {
      const now = new Date().toISOString();
      const existingIds: string[] = Array.from(
        new Set<string>(
          [
            ...deelnemerIds,
            ...(existingTournamentRows || []).map((row: any) => s(row?.aanmelding_id)),
          ].filter(Boolean),
        ),
      );

      await safeUpdateByIds("aanmeldingen", existingIds, {
        status: "gematcht",
        updated_at: now,
      });

      await safeUpdateByColumn(
        "matchmaker_fighter_context",
        "inschrijving_id",
        existingIds,
        {
          status: "gematcht",
          updated_at: now,
        },
      ).catch((err: any) => {
        if (!["PGRST116", "42P01", "PGRST205"].includes(err?.code)) throw err;
      });

      const existingVaNummers = Array.from(
        new Set<string>(
          (existingTournamentRows || [])
            .flatMap((row: any) => [row?.va_nummer, row?.fighter_id])
            .map(onlyDigits)
            .filter(Boolean),
        ),
      );

      const autocheck = await triggerToernooiFighterAutocheck(req, {
        matchmakingId,
        toernooiCode,
        vaNummers: existingVaNummers,
      });

      return NextResponse.json({
        ok: true,
        already_existed: true,
        toernooi_code: toernooiCode,
        deelnemers: existingIds.length,
        autocheck,
        message: `${toernooiCode} bestond al. Status van deelnemers is alsnog op gematcht gezet en de toernooi-controle is opnieuw gestart.`,
      });
    }

    const { data: matchmaking } = await supabaseAdmin
      .from("matchmakings")
      .select(
        "id, naam, event_naam, evenement_naam, datum, event_datum, evenement_datum, locatie, upload_id",
      )
      .eq("id", matchmakingId)
      .maybeSingle();

    const { data: contextRows, error: contextError } = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .in("inschrijving_id", deelnemerIds);

    if (contextError) throw contextError;

    const byId = new Map<string, any>();
    for (const row of contextRows || []) byId.set(s(row.inschrijving_id), row);
    for (const row of snapshotDeelnemers) {
      const id = s(row?.inschrijving_id || row?.id);
      if (id && !byId.has(id)) byId.set(id, row);
      if (id && byId.has(id)) byId.set(id, { ...row, ...byId.get(id) });
    }

    const deelnemers = deelnemerIds.map((id) => ({
      inschrijving_id: id,
      ...(byId.get(id) || {}),
    }));
    const missing = deelnemers.filter(
      (d) =>
        !nameOf(d) && !onlyDigits(pickFirst(d.va_nummer, d.va, d.fighter_id)),
    );
    if (missing.length) {
      return NextResponse.json(
        { error: "Niet alle deelnemers konden worden geladen." },
        { status: 400 },
      );
    }

    // Voor een handmatig aangemaakt toernooi gebruiken we bewust geen upload_id.
    // matchmaking_bouts_raw.upload_id heeft een FK (fk_bouts_upload); waarden uit
    // aanmeldingen/upload_batch_id verwijzen niet altijd naar die FK-tabel en veroorzaken
    // dan: insert/update violates foreign key constraint fk_bouts_upload.
    // De bronkoppeling van het toernooi is matchmaking_id + toernooi_code.
    const uploadId = null;
    const eventName = s(
      pickFirst(
        matchmaking?.evenement_naam,
        matchmaking?.event_naam,
        matchmaking?.naam,
      ),
    );
    const eventDate = s(
      pickFirst(
        matchmaking?.evenement_datum,
        matchmaking?.event_datum,
        matchmaking?.datum,
      ),
    );

    const createdToernooiFighters: any[] = [];
    // Nieuwe bron voor matchmaker-toernooien:
    // vóór admin-controle zijn dit losse deelnemers, geen nep-bouts.
    // controle_toernooi_context wordt later pas door de control-engine/admin build gevuld.

    for (const deelnemer of deelnemers) {
      const va = onlyDigits(
        pickFirst(deelnemer?.va_nummer, deelnemer?.va, deelnemer?.fighter_id),
      );
      const gewicht =
        num(pickFirst(deelnemer?.gewicht, deelnemer?.gewicht_input)) ??
        maxGewicht;

      const fighterInsert = await safeInsert("matchmaker_toernooi_fighters", {
        matchmaking_id: matchmakingId,
        toernooi_code: toernooiCode,
        aanmelding_id: deelnemer?.inschrijving_id ?? deelnemer?.id ?? null,
        fighter_id: va || s(deelnemer?.fighter_id) || null,
        va_nummer: va || null,
        naam: nameOf(deelnemer) || null,
        sportschool: gymOf(deelnemer) || null,
        discipline,
        klasse,
        gewicht,
        created_by_user_id: user.id,
        created_by_role: "matchmaker",
        raw_json: {
          type: "matchmaker_toernooi_deelnemer",
          toernooi_code: toernooiCode,
          max_gewicht: maxGewicht,
          event_naam: eventName || null,
          event_datum: eventDate || null,
          deelnemer,
        },
      });

      createdToernooiFighters.push(fighterInsert.data);
    }

    const now = new Date().toISOString();

    await safeUpdateByIds("aanmeldingen", deelnemerIds, {
      status: "gematcht",
      updated_at: now,
    });

    // Extra sync voor pagina's die uit matchmaker_fighter_context lezen. Als kolommen
    // ontbreken wordt dit veilig overgeslagen/uitgekleed; aanmeldingen blijft leidend.
    await safeUpdateByColumn(
      "matchmaker_fighter_context",
      "inschrijving_id",
      deelnemerIds,
      {
        status: "gematcht",
        updated_at: now,
      },
    ).catch((err: any) => {
      if (!["PGRST116", "42P01", "PGRST205"].includes(err?.code)) throw err;
    });

    const vaNummers = deelnemers
      .map((d: any) => onlyDigits(pickFirst(d?.va_nummer, d?.va, d?.fighter_id)))
      .filter(Boolean);

    const autocheck = await triggerToernooiFighterAutocheck(req, {
      matchmakingId,
      toernooiCode,
      vaNummers,
    });

    return NextResponse.json({
      ok: true,
      toernooi_code: toernooiCode,
      deelnemers: deelnemers.length,
      toernooi_fighters: createdToernooiFighters,
      autocheck,
    });
  } catch (e: any) {
    console.error("create-toernooi error", e);
    return NextResponse.json(
      { error: e?.message || "Toernooi aanmaken mislukt." },
      { status: 500 },
    );
  }
}
