import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type AnyRow = Record<string, any>;

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown) {
  const x = Number(
    String(v ?? "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(x) ? x : null;
}

function va(v: unknown) {
  const x = s(v).replace(/[^\d]/g, "");
  return x || null;
}

function isUuid(v: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s(v),
  );
}

function isNumericId(v: unknown) {
  return /^\d+$/.test(s(v));
}

function isMissingSchemaError(error: any) {
  const msg = String(error?.message || "");
  const code = String(error?.code || "");

  return (
    code === "PGRST204" ||
    code === "42703" ||
    code === "42P01" ||
    msg.includes("Could not find") ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("column") ||
    msg.includes("relationship")
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

async function getUserProfileForAuth(user: any) {
  const ids = [s(user?.id)].filter(Boolean);
  const email = s(user?.email).toLowerCase();

  for (const id of ids) {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, role, rol, type, bondteam")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return data as AnyRow;
  }

  if (email) {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, role, rol, type, bondteam")
      .ilike("email", email)
      .maybeSingle();

    if (!error && data) return data as AnyRow;
  }

  return null;
}

function roleOf(user: any, profile: AnyRow | null) {
  return s(profile?.role ?? profile?.rol ?? profile?.type ?? user?.app_metadata?.role).toLowerCase();
}

function isAdminRole(role: string) {
  return role === "admin" || role === "superadmin" || role.includes("admin");
}

async function assertCanManageOwnMatchmaking(matchmakingId: string, user: any) {
  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select("id, matchmaker_id, maker_user_id, uploaded_by, huidige_eigenaar_type, huidige_eigenaar_user_id, status, stadium")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Matchmaking niet gevonden.");

  const profile = await getUserProfileForAuth(user);
  const role = roleOf(user, profile);

  if (isAdminRole(role)) return data as AnyRow;

  const actorIds = Array.from(
    new Set([s(user?.id), s(profile?.id), s(user?.email).toLowerCase(), s(profile?.email).toLowerCase()].filter(Boolean)),
  );

  const ownerIds = [
    (data as AnyRow).matchmaker_id,
    (data as AnyRow).maker_user_id,
    (data as AnyRow).uploaded_by,
    (data as AnyRow).huidige_eigenaar_user_id,
  ]
    .map((x) => s(x).toLowerCase())
    .filter(Boolean);

  const isOwner = actorIds.some((id) => ownerIds.includes(id.toLowerCase()));

  if (!isOwner) {
    throw new Error("Geen rechten om deze partij te verwijderen.");
  }

  // Bewust géén stadium/status beperking: dit is de MM van de matchmaker.
  // Een matchmaker mag partijen beheren zolang hij eigenaar/toegang heeft;
  // alleen NVB-beslissingen zoals dispensatie/afkeur/verbod goedkeuren blijven verboden.
  return data as AnyRow;
}

async function readBody(req: Request): Promise<AnyRow> {
  const url = new URL(req.url);
  const fromQuery: AnyRow = Object.fromEntries(url.searchParams.entries());
  const fromJson = await req.json().catch(() => ({}));
  return {
    ...fromQuery,
    ...(fromJson && typeof fromJson === "object" ? fromJson : {}),
  };
}

function getMatchmakingId(body: AnyRow) {
  return s(
    body.matchmaking_id ??
      body.matchmakingId ??
      body.mm_id ??
      body.mmid ??
      body.event_matchmaking_id,
  );
}

function getPartijNr(body: AnyRow) {
  return n(
    body.partij_nr ??
      body.partijNr ??
      body.partijNummer ??
      body.match_partij_nr,
  );
}

function getBoutUid(body: AnyRow) {
  return s(body.bout_uid ?? body.boutUid ?? body.match_uid ?? body.uid) || null;
}

function getRawBoutId(body: AnyRow) {
  return (
    body.bout_id ??
    body.boutId ??
    body.match_id ??
    body.matchId ??
    body.id ??
    null
  );
}

function rowVaList(rows: AnyRow[]) {
  return Array.from(
    new Set(
      rows
        .flatMap((r) => [
          r?.va_rood,
          r?.va_blauw,
          r?.rood_va,
          r?.blauw_va,
          r?.rood_fighter_va,
          r?.blauw_fighter_va,
          r?.raw_json?.va_rood,
          r?.raw_json?.va_blauw,
          r?.raw?.va_rood,
          r?.raw?.va_blauw,
          r?.extra?.va_rood,
          r?.extra?.va_blauw,
        ])
        .map(va)
        .filter(Boolean) as string[],
    ),
  );
}

function rowInschrijvingIds(rows: AnyRow[]) {
  return Array.from(
    new Set(
      rows
        .flatMap((r) => [
          r?.rood_inschrijving_id,
          r?.blauw_inschrijving_id,
          r?.inschrijving_id_rood,
          r?.inschrijving_id_blauw,
          r?.rood_aanmelding_id,
          r?.blauw_aanmelding_id,
          r?.aanmelding_id_rood,
          r?.aanmelding_id_blauw,
          r?.raw_json?.rood_inschrijving_id,
          r?.raw_json?.blauw_inschrijving_id,
          r?.raw_json?.inschrijving_id_rood,
          r?.raw_json?.inschrijving_id_blauw,
          r?.raw?.rood_inschrijving_id,
          r?.raw?.blauw_inschrijving_id,
          r?.raw?.inschrijving_id_rood,
          r?.raw?.inschrijving_id_blauw,
          r?.extra?.rood_inschrijving_id,
          r?.extra?.blauw_inschrijving_id,
        ])
        .map(s)
        .filter(Boolean),
    ),
  );
}

async function findBoutRows(matchmakingId: string, body: AnyRow) {
  const partijNr = getPartijNr(body);
  const boutUid = getBoutUid(body);
  const rawBoutId = getRawBoutId(body);
  const roodVa = va(
    body.va_rood ??
      body.rood_va ??
      body.rood_fighter_id ??
      body.rood_fighter_va,
  );
  const blauwVa = va(
    body.va_blauw ??
      body.blauw_va ??
      body.blauw_fighter_id ??
      body.blauw_fighter_va,
  );

  const tryQuery = async (build: (q: any) => any) => {
    const { data, error } = await build(
      supabaseAdmin
        .from("matchmaking_bouts_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .limit(50),
    );
    if (error) {
      if (isMissingSchemaError(error)) return [];
      throw error;
    }
    return data ?? [];
  };

  if (partijNr !== null) return tryQuery((q) => q.eq("partij_nr", partijNr));
  if (boutUid) return tryQuery((q) => q.eq("bout_uid", boutUid));

  if (rawBoutId && s(rawBoutId) !== matchmakingId && isNumericId(rawBoutId)) {
    return tryQuery((q) => q.eq("id", Number(rawBoutId)));
  }

  if (rawBoutId && s(rawBoutId) !== matchmakingId && isUuid(rawBoutId)) {
    // Als de UI een UUID meegeeft, is dat meestal bout_uid en niet bigint id.
    const byBoutUid = await tryQuery((q) => q.eq("bout_uid", s(rawBoutId)));
    if (byBoutUid.length) return byBoutUid;
  }

  if (roodVa && blauwVa) {
    const direct = await tryQuery((q) =>
      q.eq("va_rood", roodVa).eq("va_blauw", blauwVa),
    );
    if (direct.length) return direct;

    // Soms rood/blauw omgedraaid in UI of tabel.
    const reversed = await tryQuery((q) =>
      q.eq("va_rood", blauwVa).eq("va_blauw", roodVa),
    );
    if (reversed.length) return reversed;
  }

  return [];
}

async function bestEffortDelete(table: string, build: (q: any) => any) {
  try {
    const q = build(supabaseAdmin.from(table).delete());
    const { error } = await q;
    if (error && !isMissingSchemaError(error)) {
      console.warn(`${table} opschonen gaf fout`, error);
    }
  } catch (e) {
    console.warn(`${table} opschonen overgeslagen`, e);
  }
}

async function deleteBoutRows(
  matchmakingId: string,
  rows: AnyRow[],
  body: AnyRow,
) {
  const partijNrs = Array.from(
    new Set(
      rows.map((r) => n(r.partij_nr)).filter((x): x is number => x !== null),
    ),
  );
  const boutUids = Array.from(
    new Set(rows.map((r) => s(r.bout_uid)).filter(Boolean)),
  );
  const numericIds = Array.from(
    new Set(rows.map((r) => s(r.id)).filter((x) => /^\d+$/.test(x))),
  );
  const vaList = rowVaList(rows);

  // Verwijder bewust via meerdere sleutels. Daardoor blijft de partij niet hangen
  // als de detailpagina een andere sleutel gebruikt dan de knop meegeeft.
  if (partijNrs.length) {
    await bestEffortDelete("matchmaking_bouts_raw", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("partij_nr", partijNrs),
    );
  }

  if (boutUids.length) {
    await bestEffortDelete("matchmaking_bouts_raw", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("bout_uid", boutUids),
    );
  }

  if (numericIds.length) {
    await bestEffortDelete("matchmaking_bouts_raw", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("id", numericIds.map(Number)),
    );
  }

  if (vaList.length >= 2) {
    const [a, b] = vaList;
    await bestEffortDelete("matchmaking_bouts_raw", (q) =>
      q.eq("matchmaking_id", matchmakingId).eq("va_rood", a).eq("va_blauw", b),
    );
    await bestEffortDelete("matchmaking_bouts_raw", (q) =>
      q.eq("matchmaking_id", matchmakingId).eq("va_rood", b).eq("va_blauw", a),
    );
  }

  const partijNr = getPartijNr(body);
  if (partijNr !== null) {
    await bestEffortDelete("matchmaking_bouts_raw", (q) =>
      q.eq("matchmaking_id", matchmakingId).eq("partij_nr", partijNr),
    );
  }
}

async function cleanupControlContext(matchmakingId: string, rows: AnyRow[]) {
  const partijNrs = Array.from(
    new Set(
      rows.map((r) => n(r.partij_nr)).filter((x): x is number => x !== null),
    ),
  );

  // VA-nummers zijn NOOIT UUID's. Daarom mogen va_rood/va_blauw/9348 enz.
  // nooit richting uuid-kolommen zoals controle_resultaten.bout_id of bout_uid.
  const uuidBoutUids = Array.from(
    new Set(rows.map((r) => s(r.bout_uid)).filter((x) => isUuid(x))),
  );
  const uuidBoutIds = Array.from(
    new Set(
      rows
        .flatMap((r) => [r?.bout_id, r?.match_id, r?.controle_bout_id])
        .map(s)
        .filter((x) => isUuid(x)),
    ),
  );
  const vaList = rowVaList(rows);

  // Belangrijk voor de matchmakingId detailpagina: oude control-regels/context mogen niet blijven hangen.
  // Veiligste sleutel is matchmaking_id + partij_nr. Dat raakt de partij en gebruikt geen VA als UUID.
  if (partijNrs.length) {
    await bestEffortDelete("controle_resultaten", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("partij_nr", partijNrs),
    );
    // De matchmaking-detailpagina leest uit controle_bout_context (enkelvoud).
    // Deze moet dus echt leeg, anders blijft de verwijderde partij zichtbaar.
    await bestEffortDelete("controle_bout_context", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("partij_nr", partijNrs),
    );

    // Oude/alternatieve tabelnamen laten we best-effort staan voor schema-varianten.
    await bestEffortDelete("controle_bouts_context", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("partij_nr", partijNrs),
    );
    await bestEffortDelete("controle_partijen_context", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("partij_nr", partijNrs),
    );
  }

  // Alleen echte UUID's gebruiken op bout_uid.
  if (uuidBoutUids.length) {
    await bestEffortDelete("controle_resultaten", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("bout_uid", uuidBoutUids),
    );
    await bestEffortDelete("controle_bout_context", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("bout_uid", uuidBoutUids),
    );
    await bestEffortDelete("controle_bouts_context", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("bout_uid", uuidBoutUids),
    );
    await bestEffortDelete("controle_partijen_context", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("bout_uid", uuidBoutUids),
    );
  }

  // Alleen echte UUID's gebruiken op bout_id. Numeric ids uit matchmaking_bouts_raw zijn geen controle_resultaten.bout_id.
  if (uuidBoutIds.length) {
    await bestEffortDelete("controle_resultaten", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("bout_id", uuidBoutIds),
    );
    await bestEffortDelete("controle_bout_context", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("bout_id", uuidBoutIds),
    );
    await bestEffortDelete("controle_bouts_context", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("bout_id", uuidBoutIds),
    );
  }

  // Dit is fighter-resultaat per VA; daar is va_nummer juist wél de goede kolom.
  if (vaList.length) {
    await bestEffortDelete("matchmaker_fighter_resultaten", (q) =>
      q.eq("matchmaking_id", matchmakingId).in("va_nummer", vaList),
    );
  }
}

async function updateAanmeldingenByIds(
  matchmakingId: string,
  inschrijvingIds: string[],
) {
  if (!inschrijvingIds.length) return { count: 0, error: null as any };

  const { error } = await supabaseAdmin
    .from("aanmeldingen")
    .update({ status: "gescrapt", updated_at: new Date().toISOString() })
    .eq("matchmaking_id", matchmakingId)
    .in("id", inschrijvingIds);

  if (!error) return { count: inschrijvingIds.length, error: null };

  if (isMissingSchemaError(error)) {
    const fallback = await supabaseAdmin
      .from("aanmeldingen")
      .update({ status: "gescrapt" })
      .eq("matchmaking_id", matchmakingId)
      .in("id", inschrijvingIds);
    return {
      count: fallback.error ? 0 : inschrijvingIds.length,
      error: fallback.error,
    };
  }

  return { count: 0, error };
}

async function updateAanmeldingenByVa(matchmakingId: string, vaList: string[]) {
  if (!vaList.length) return { count: 0, error: null as any };

  const { error } = await supabaseAdmin
    .from("aanmeldingen")
    .update({ status: "gescrapt", updated_at: new Date().toISOString() })
    .eq("matchmaking_id", matchmakingId)
    .in("va_nummer", vaList);

  if (!error) return { count: vaList.length, error: null };

  if (isMissingSchemaError(error)) {
    const fallback = await supabaseAdmin
      .from("aanmeldingen")
      .update({ status: "gescrapt" })
      .eq("matchmaking_id", matchmakingId)
      .in("va_nummer", vaList);
    return { count: fallback.error ? 0 : vaList.length, error: fallback.error };
  }

  return { count: 0, error };
}

async function unmarkContextMatched(
  matchmakingId: string,
  inschrijvingIds: string[],
  vaList: string[],
) {
  const filters: Array<(q: any) => any> = [];
  if (inschrijvingIds.length)
    filters.push((q) => q.in("inschrijving_id", inschrijvingIds));
  if (vaList.length) filters.push((q) => q.in("va_nummer", vaList));

  const seen = new Set<string>();

  for (const filter of filters) {
    const { data, error } = await filter(
      supabaseAdmin
        .from("matchmaker_fighter_context")
        .select("id, extra")
        .eq("matchmaking_id", matchmakingId),
    );

    if (error) {
      if (!isMissingSchemaError(error))
        console.warn(
          "matchmaker_fighter_context lezen voor unmatch mislukt",
          error,
        );
      continue;
    }

    for (const row of data ?? []) {
      const id = s(row?.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const extra =
        row?.extra && typeof row.extra === "object" ? { ...row.extra } : {};
      delete (extra as AnyRow).gematcht;
      delete (extra as AnyRow).matchmaker_match;
      delete (extra as AnyRow).matched;
      delete (extra as AnyRow).match_status;

      if (
        (extra as AnyRow).raw?.aanmelding &&
        typeof (extra as AnyRow).raw.aanmelding === "object"
      ) {
        (extra as AnyRow).raw = {
          ...(extra as AnyRow).raw,
          aanmelding: {
            ...(extra as AnyRow).raw.aanmelding,
            status: "gescrapt",
          },
        };
      }

      if (
        (extra as AnyRow).aanmelding &&
        typeof (extra as AnyRow).aanmelding === "object"
      ) {
        (extra as AnyRow).aanmelding = {
          ...(extra as AnyRow).aanmelding,
          status: "gescrapt",
        };
      }

      const contextPayloads = [
        { extra, status: "gescrapt", updated_at: new Date().toISOString() },
        { extra, status: "gescrapt" },
        { extra, updated_at: new Date().toISOString() },
        { extra },
      ];

      let updated = false;
      for (const payload of contextPayloads) {
        const result = await supabaseAdmin
          .from("matchmaker_fighter_context")
          .update(payload)
          .eq("id", row.id);

        if (!result.error) {
          updated = true;
          break;
        }

        if (!isMissingSchemaError(result.error)) {
          console.warn("matchmaker_fighter_context unmatch mislukt", result.error);
          updated = true;
          break;
        }
      }

      if (!updated) {
        console.warn("matchmaker_fighter_context unmatch overgeslagen: schema ondersteunt geen payload");
      }
    }
  }
}

async function unmarkMatched(matchmakingId: string, rows: AnyRow[]) {
  const inschrijvingIds = rowInschrijvingIds(rows);
  const vaList = rowVaList(rows);

  let updatedByIds = 0;
  let updatedByVa = 0;

  const byIds = await updateAanmeldingenByIds(matchmakingId, inschrijvingIds);
  updatedByIds = byIds.count;
  if (byIds.error && !isMissingSchemaError(byIds.error)) {
    console.warn("aanmeldingen terugzetten op id mislukt", byIds.error);
  }

  // Belangrijk: als de partij geen rood/blauw_inschrijving_id heeft opgeslagen,
  // zetten we terug via VA-nummer. Dit is meestal wat de aanmeldpagina ook toont.
  const byVa = await updateAanmeldingenByVa(matchmakingId, vaList);
  updatedByVa = byVa.count;
  if (byVa.error && !isMissingSchemaError(byVa.error)) {
    console.warn("aanmeldingen terugzetten op VA mislukt", byVa.error);
  }

  await unmarkContextMatched(matchmakingId, inschrijvingIds, vaList);

  return { inschrijvingIds, vaList, updatedByIds, updatedByVa };
}

async function verifyDeleted(matchmakingId: string, rows: AnyRow[]) {
  const partijNrs = Array.from(
    new Set(
      rows.map((r) => n(r.partij_nr)).filter((x): x is number => x !== null),
    ),
  );
  const boutUids = Array.from(
    new Set(rows.map((r) => s(r.bout_uid)).filter(Boolean)),
  );
  const numericIds = Array.from(
    new Set(rows.map((r) => s(r.id)).filter((x) => /^\d+$/.test(x))),
  );

  const checks: Array<{ key: string; values: any[] }> = [];

  if (partijNrs.length) checks.push({ key: "partij_nr", values: partijNrs });
  if (boutUids.length) checks.push({ key: "bout_uid", values: boutUids });
  if (numericIds.length)
    checks.push({ key: "id", values: numericIds.map(Number) });

  for (const check of checks) {
    const query: any = supabaseAdmin
      .from("matchmaking_bouts_raw")
      .select("id, partij_nr, bout_uid")
      .eq("matchmaking_id", matchmakingId)
      .in(check.key, check.values)
      .limit(10);
    const { data, error } = await query;

    if (error) {
      if (!isMissingSchemaError(error))
        console.warn("delete verificatie mislukt", error);
      continue;
    }

    if (data?.length) return data;
  }

  return [];
}

export async function DELETE(req: Request) {
  try {
    const user = await getUser(req);

    const body = await readBody(req);
    const matchmakingId = getMatchmakingId(body);

    if (!matchmakingId) {
      return NextResponse.json(
        { ok: false, error: "matchmaking_id ontbreekt." },
        { status: 400 },
      );
    }

    await assertCanManageOwnMatchmaking(matchmakingId, user);

    const rows = await findBoutRows(matchmakingId, body);

    if (!rows.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Partij niet gevonden in matchmaking_bouts_raw.",
          hint: "Stuur minimaal matchmaking_id + partij_nr mee, of matchmaking_id + bout_uid.",
        },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    await deleteBoutRows(matchmakingId, rows, body);
    await cleanupControlContext(matchmakingId, rows);
    const reset = await unmarkMatched(matchmakingId, rows);
    const stillThere = await verifyDeleted(matchmakingId, rows);

    if (stillThere.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Partij kon niet volledig verwijderd worden uit matchmaking_bouts_raw.",
          still_there: stillThere,
          matchmaking_id: matchmakingId,
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        deleted: rows.length,
        deleted_partij_nrs: rows
          .map((r: AnyRow) => r.partij_nr)
          .filter((v: any) => v !== null && v !== undefined),
        reset_inschrijving_ids: reset.inschrijvingIds,
        reset_va_nummers: reset.vaList,
        reset_by_ids: reset.updatedByIds,
        reset_by_va: reset.updatedByVa,
        matchmaking_id: matchmakingId,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Match verwijderen mislukt.",
        code: e?.code ?? null,
        details: e?.details ?? null,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

// Veel UI-knoppen gebruiken fetch(..., { method: "POST" }).
// Daarom laten we POST exact dezelfde delete uitvoeren, zonder dubbele POST-declaratie.
export { DELETE as POST };
