import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type AnyRow = Record<string, any>;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function obj(value: unknown): AnyRow {
  if (!value) return {};
  if (typeof value === "object") return value as AnyRow;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function first(...values: unknown[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && s(value)) return value;
  }
  return "";
}

function digits(value: unknown) {
  return s(value).replace(/\D/g, "");
}

function bool(value: unknown) {
  return value === true || s(value) === "1" || s(value).toLowerCase() === "true";
}

function normalizeStatus(value: unknown) {
  const raw = s(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (raw.includes("tegenstander") || raw.includes("opponent")) return "tegenstander_gezocht";
  if (raw.includes("voorbehoud") || raw.includes("pending")) return "onder_voorbehoud";
  if (raw.includes("bevest") || raw.includes("confirm") || raw === "akkoord") return "bevestigd";
  return "concept";
}

/**
 * Gebruik de officiële matchmaking-notatie. Niet opnieuw rekenen uit de
 * individuele gewichten: -95 betekent maximaal 95 kg, 95+ betekent boven 95 kg.
 */
function displayMaxWeight(row: AnyRow, raw: AnyRow) {
  const notation = s(first(row.max_gewicht_notatie, raw.max_gewicht_notatie));
  if (notation) return /kg/i.test(notation) ? notation.toUpperCase() : `${notation} KG`;

  const value = s(first(row.max_gewicht, raw.max_gewicht));
  if (!value) return "—";

  const type = s(first(row.max_gewicht_type, raw.max_gewicht_type)).toLowerCase();
  if (value.includes("+") || type === "plus" || type === "above" || type === "over") {
    return `${value.replace(/[^0-9.,]/g, "")}+ KG`;
  }

  if (value.startsWith("-")) return `${value} KG`;
  return `-${value} KG`;
}

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function recordValues(row?: AnyRow | null) {
  if (!row) return { wins: 0, losses: 0, draws: 0, total: 0 };

  const extra = obj(row.extra);
  const aanmelding = obj(extra?.raw?.aanmelding ?? extra?.aanmelding);

  return {
    wins: numberOrZero(first(row.record_w, aanmelding.win, aanmelding.wins)),
    losses: numberOrZero(first(row.record_l, aanmelding.loss, aanmelding.losses)),
    draws: numberOrZero(first(row.record_d, aanmelding.draw, aanmelding.draws)),
    total: numberOrZero(
      first(row.uitslagen_count, row.totaal_wedstrijden, aanmelding.totaal_wedstrijden),
    ),
  };
}

function recordFromContext(row?: AnyRow | null, includeClass = true) {
  if (!row) return "—";
  const { wins, losses, draws, total } = recordValues(row);
  const klasse = includeClass
    ? s(first(row.klasse, row.fp_klasse, row.nulmeting_klasse))
    : "";
  const prefix = klasse ? `${klasse} ` : "";
  return `${prefix}${wins}-${losses}-${draws}${total ? ` (${total})` : ""}`;
}

function parseDate(value: unknown): Date | null {
  const raw = s(value);
  if (!raw) return null;
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12));
  }
  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmy) {
    return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12));
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageOnDate(birthValue: unknown, eventValue: unknown): number | null {
  const birth = parseDate(birthValue);
  const event = parseDate(eventValue);
  if (!birth || !event) return null;

  let age = event.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = event.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && event.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

function genderLabel(value: unknown) {
  const raw = s(value).toLowerCase();
  if (["m", "man", "male", "heer", "jongen", "mannelijk"].includes(raw)) return "M";
  if (["v", "vrouw", "female", "dame", "meisje", "vrouwelijk"].includes(raw)) return "V";
  return "—";
}

function weightLabel(value: unknown) {
  const raw = s(value).replace(/\s*kg\s*$/i, "");
  if (!raw) return "—";
  return `${raw.replace(".", ",")} kg`;
}

function classRank(value: unknown) {
  const raw = s(value).toLowerCase().replace(/klasse|class|clas|\s|-/g, "");
  if (raw === "a" || raw.startsWith("a")) return 1;
  if (raw === "b" || raw.startsWith("b")) return 2;
  if (raw === "c" || raw.startsWith("c")) return 3;
  if (raw === "n" || raw.includes("nieuweling")) return 4;
  if (raw.includes("j+") || raw.includes("talentstatus")) return 5;
  if (raw === "r" || raw.startsWith("r")) return 6;
  if (raw === "j" || raw.includes("jeugd") || raw.includes("youth")) return 7;
  return 99;
}

function weightSortValue(value: unknown) {
  const match = s(value).replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return Number.POSITIVE_INFINITY;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const cleanToken = s(token);
    if (!cleanToken) return NextResponse.json({ error: "Ongeldige link" }, { status: 400 });

    const { data: publication, error: pubError } = await supabaseAdmin
      .from("matchmaking_public_pages")
      .select("*")
      .eq("public_token", cleanToken)
      .eq("is_enabled", true)
      .maybeSingle();

    if (pubError) throw pubError;
    if (!publication) {
      return NextResponse.json(
        { error: "Deze openbare matchmaking is niet beschikbaar" },
        { status: 404 },
      );
    }

    const matchmakingId = s(publication.matchmaking_id);
    const [mmRes, boutsRes, contextsRes] = await Promise.all([
      supabaseAdmin.from("matchmakings").select("*").eq("id", matchmakingId).single(),
      supabaseAdmin
        .from("matchmaking_bouts_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .order("partij_nr", { ascending: true }),
      supabaseAdmin
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId),
    ]);

    if (mmRes.error) throw mmRes.error;
    if (boutsRes.error) throw boutsRes.error;
    if (contextsRes.error) throw contextsRes.error;

    const contextByVa = new Map<string, AnyRow>();
    for (const context of contextsRes.data ?? []) {
      const va = digits(context.va_nummer);
      if (va && !contextByVa.has(va)) contextByVa.set(va, context);
    }

    const activeRows = (boutsRes.data ?? []).filter((row: AnyRow) => {
      const raw = obj(row.raw_json);
      return !bool(row.verwijderd) && (s(row.partij_nr) || s(raw.partij_nr));
    });

    const matchedVas = new Set<string>();
    for (const row of activeRows) {
      const raw = obj(row.raw_json);
      const red = obj(raw.rood);
      const blue = obj(raw.blauw);
      const redVa = digits(first(row.va_rood, row.rood_va, red.va_nummer, red.va));
      const blueVa = digits(first(row.va_blauw, row.blauw_va, blue.va_nummer, blue.va));
      if (redVa) matchedVas.add(redVa);
      if (blueVa) matchedVas.add(blueVa);
    }

    const mm = mmRes.data ?? {};
    const eventDate = s(first(mm.event_datum, mm.datum, mm.evenement_datum));

    const bouts = activeRows
      .map((row: AnyRow) => {
        const raw = obj(row.raw_json);
        const red = obj(raw.rood);
        const blue = obj(raw.blauw);

        const redVa = digits(first(row.va_rood, row.rood_va, red.va_nummer, red.va));
        const blueVa = digits(first(row.va_blauw, row.blauw_va, blue.va_nummer, blue.va));
        const redContext = contextByVa.get(redVa);
        const blueContext = contextByVa.get(blueVa);
        const status = normalizeStatus(first(row.status, row.partij_status, row.bout_status, raw.status));

        return {
          id: s(row.id),
          partijNr: Number(first(row.partij_nr, raw.partij_nr)) || null,
          klasse: s(first(row.klasse, row.klasse_mm, raw.klasse, redContext?.klasse, blueContext?.klasse)) || "—",
          geslacht: genderLabel(first(row.geslacht, raw.geslacht, redContext?.geslacht, blueContext?.geslacht)),
          discipline: s(first(row.discipline, raw.discipline, redContext?.discipline, blueContext?.discipline)) || "—",
          maxGewicht: displayMaxWeight(row, raw),
          status,
          sortAge: Math.min(
            ...[
              ageOnDate(
                first(redContext?.geboortedatum, redContext?.fp_geboortedatum, redContext?.geboortedatum_input),
                first(redContext?.evenement_datum, eventDate),
              ),
              ageOnDate(
                first(blueContext?.geboortedatum, blueContext?.fp_geboortedatum, blueContext?.geboortedatum_input),
                first(blueContext?.evenement_datum, eventDate),
              ),
            ].filter((value): value is number => value !== null),
          ),
          red: {
            naam: s(first(row.rood_naam, raw.rood_naam, red.naam)) || "Tegenstander gezocht",
            sportschool: s(first(row.rood_gym, red.sportschool, red.gym, redContext?.gym_input, redContext?.fp_gym)) || "—",
            record: recordFromContext(redContext),
          },
          blue: {
            naam: s(first(row.blauw_naam, raw.blauw_naam, blue.naam)) || "Tegenstander gezocht",
            sportschool: s(first(row.blauw_gym, blue.sportschool, blue.gym, blueContext?.gym_input, blueContext?.fp_gym)) || "—",
            record: recordFromContext(blueContext),
          },
        };
      })
      .filter((bout: AnyRow) => {
        if (bout.status === "onder_voorbehoud" && publication.show_pending === false) return false;
        return bout.status !== "tegenstander_gezocht";
      })
      .sort((a: AnyRow, b: AnyRow) => {
        const klasseDiff = classRank(a.klasse) - classRank(b.klasse);
        if (klasseDiff !== 0) return klasseDiff;

        const ageA = Number.isFinite(a.sortAge) ? a.sortAge : Number.POSITIVE_INFINITY;
        const ageB = Number.isFinite(b.sortAge) ? b.sortAge : Number.POSITIVE_INFINITY;
        if (ageA !== ageB) return ageA - ageB;

        const gewichtDiff = weightSortValue(a.maxGewicht) - weightSortValue(b.maxGewicht);
        if (gewichtDiff !== 0) return gewichtDiff;

        const partijA = Number.isFinite(a.partijNr) ? a.partijNr : Number.POSITIVE_INFINITY;
        const partijB = Number.isFinite(b.partijNr) ? b.partijNr : Number.POSITIVE_INFINITY;
        return partijA - partijB;
      });

    const searching = publication.show_opponent_search === false
      ? []
      : (contextsRes.data ?? [])
          .filter((context: AnyRow) => s(context.status).toLowerCase() === "open")
          .filter((context: AnyRow) => {
            const va = digits(context.va_nummer);
            return !va || !matchedVas.has(va);
          })
          .map((context: AnyRow) => {
            const contextEventDate = first(context.evenement_datum, eventDate);
            const birthDate = first(
              context.geboortedatum,
              context.fp_geboortedatum,
              context.geboortedatum_input,
            );

            return {
              id: s(first(context.id, context.inschrijving_id, context.va_nummer)),
              naam: s(first(context.naam, context.fp_naam, context.naam_input)) || "Onbekend",
              sportschool: s(first(context.gym_input, context.fp_gym)) || "—",
              record: recordFromContext(context, false),
              klasse: s(first(context.klasse, context.fp_klasse, context.nulmeting_klasse)) || "—",
              geslacht: genderLabel(first(context.geslacht, context.fp_geslacht)),
              leeftijd: ageOnDate(birthDate, contextEventDate),
              gewicht: weightLabel(context.gewicht),
            };
          })
          .sort((a: AnyRow, b: AnyRow) => {
            const klasse = classRank(a.klasse) - classRank(b.klasse);
            if (klasse !== 0) return klasse;
            const ageA = a.leeftijd ?? Number.POSITIVE_INFINITY;
            const ageB = b.leeftijd ?? Number.POSITIVE_INFINITY;
            if (ageA !== ageB) return ageA - ageB;
            const weightA = Number(String(a.gewicht).replace(/[^0-9.,]/g, "").replace(",", "."));
            const weightB = Number(String(b.gewicht).replace(/[^0-9.,]/g, "").replace(",", "."));
            if (Number.isFinite(weightA) && Number.isFinite(weightB) && weightA !== weightB) {
              return weightA - weightB;
            }
            return a.naam.localeCompare(b.naam, "nl");
          });

    const updatedAt = [...(boutsRes.data ?? []), ...(contextsRes.data ?? [])].reduce(
      (latest: string, row: AnyRow) => {
        const candidate = s(first(row.laatste_bewerking_op, row.updated_at, row.created_at));
        return !latest || (candidate && candidate > latest) ? candidate : latest;
      },
      s(first(publication.updated_at, publication.created_at)),
    ) || new Date().toISOString();

    return NextResponse.json(
      {
        ok: true,
        event: {
          title: s(publication.public_title) || s(first(mm.event_naam, mm.naam, mm.titel)) || "Matchmaking",
          date: eventDate,
          location: s(publication.public_location) || s(first(mm.event_locatie, mm.locatie, mm.plaats, mm.stadium)),
          disciplines: s(publication.public_disciplines) || s(first(mm.discipline, mm.disciplines)),
          phase: "Voorlopige matchmaking",
          updatedAt,
        },
        counts: {
          total: bouts.length,
          confirmed: bouts.filter((b: AnyRow) => b.status === "bevestigd").length,
          pending: bouts.filter((b: AnyRow) => b.status === "onder_voorbehoud").length,
          searching: searching.length,
        },
        bouts,
        searching,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: s(error?.message) || "Openbare matchmaking laden mislukt" },
      { status: 500 },
    );
  }
}
