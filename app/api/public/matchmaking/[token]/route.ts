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

function normalizeRecordClass(value: unknown) {
  const raw = s(value)
    .toLowerCase()
    .replace(/\b(?:klasse|class|clas)\b/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = raw.replace(/[^a-z0-9+]/g, "");

  const repeated = compact.match(/^([jrncba])\1$/i);
  if (repeated) return repeated[1].toLowerCase();
  if (compact === "j+" || compact.includes("j+") || compact.includes("talentstatus")) return "j+";
  if (compact === "j" || compact.startsWith("jeugd") || compact.includes("youth")) return "j";
  if (compact === "r" || compact.startsWith("rclas") || compact.startsWith("rclass") || compact.includes("recreant")) return "r";
  if (compact === "n" || compact.startsWith("nclas") || compact.startsWith("nclass") || compact.includes("nieuweling")) return "n";
  if (compact === "c" || compact.startsWith("cclas") || compact.startsWith("cclass")) return "c";
  if (compact === "b" || compact.startsWith("bclas") || compact.startsWith("bclass")) return "b";
  if (compact === "a" || compact.startsWith("aclas") || compact.startsWith("aclass") || compact.includes("elite")) return "a";
  if (compact.includes("amateur") || compact.includes("ama")) return "amateur";
  if (compact.includes("pro")) return "pro";
  return compact;
}

function resultKind(value: unknown): "win" | "loss" | "draw" | "other" {
  const raw = s(value).toLowerCase().replace(/\s+/g, " ").trim();
  if (!raw) return "other";
  if (raw.includes("demo") || raw.includes("no contest") || raw.includes("nocontest") || raw === "nc") return "other";
  if (raw.includes("onbeslist") || raw.includes("gelijk") || raw.includes("draw")) return "draw";
  if (raw.includes("verliest") || raw.includes("verlies") || raw.includes("verloren") || raw.includes("loss") || raw === "l") return "loss";
  if (raw.includes("wint") || raw.includes("winst") || raw.includes("gewonnen") || raw === "win" || raw === "w") return "win";
  return "other";
}

function recordClassRank(token: string) {
  return ({ j: 1, "j+": 1, r: 2, n: 3, c: 4, b: 5, a: 6, amateur: 3, pro: 6 } as Record<string, number>)[token] ?? 0;
}

function recordClassDisplay(token: string) {
  return ({ j: "J", "j+": "J", r: "R", n: "N", c: "C", b: "B", a: "A", amateur: "Amateur", pro: "Pro" } as Record<string, string>)[token] || "—";
}

function resultRowsForContext(context: AnyRow | undefined, allRows: AnyRow[]) {
  if (!context) return [];
  const va = digits(first(context.va_nummer, context.va, context.fighter_id));
  if (!va) return [];

  const rows = allRows.filter((row) =>
    digits(first(row.va_nummer, row.bron_va_nummer, row.va, row.fighter_id)) === va
  );

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = s(first(
      row.id,
      [
        row.va_nummer,
        row.datum,
        row.evenement,
        row.tegenstander,
        row.uitslag,
        row.klasse,
      ].map((value) => s(value).toLowerCase()).join("|"),
    ));
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recordFromResults(
  context: AnyRow | undefined,
  allRows: AnyRow[],
  includeClass = true,
) {
  if (!context) return "—";
  const rows = resultRowsForContext(context, allRows);

  let highestClass = "";
  let highestRank = 0;
  for (const row of rows) {
    if (resultKind(first(row.uitslag, row.resultaat, row.outcome)) === "other") continue;
    const token = normalizeRecordClass(first(
      row.klasse,
      row.class,
      row.wedstrijdklasse,
      row.niveau,
      row.fight_class,
    ));
    const rank = recordClassRank(token);
    if (rank > highestRank) {
      highestClass = token;
      highestRank = rank;
    }
  }

  if (!highestClass) return recordFromContext(context, includeClass);

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let other = 0;

  for (const row of rows) {
    const kind = resultKind(first(row.uitslag, row.resultaat, row.outcome));
    const token = normalizeRecordClass(first(
      row.klasse,
      row.class,
      row.wedstrijdklasse,
      row.niveau,
      row.fight_class,
    ));

    if (token === highestClass && kind === "win") wins += 1;
    else if (token === highestClass && kind === "loss") losses += 1;
    else if (token === highestClass && kind === "draw") draws += 1;
    else other += 1;
  }

  const prefix = includeClass ? `${recordClassDisplay(highestClass)} ` : "";
  return `${prefix}${wins}-${losses}-${draws} (${other})`;
}


function contextName(row?: AnyRow | null) {
  return s(first(
    row?.naam,
    row?.fp_naam,
    row?.naam_input,
    row?.naam_matchmaker,
  ));
}

function contextGym(row?: AnyRow | null) {
  return s(first(
    row?.gym_input,
    row?.sportschool_input,
    row?.fp_gym,
    row?.gym,
    row?.sportschool,
  ));
}

function contextClass(row?: AnyRow | null) {
  return s(first(
    row?.klasse,
    row?.fp_klasse,
    row?.berekende_klasse,
    row?.nulmeting_klasse,
  ));
}

function contextDiscipline(row?: AnyRow | null) {
  return s(first(
    row?.discipline,
    row?.primary_discipline,
    row?.nulmeting_discipline,
  ));
}

function registrationId(value: unknown) {
  return s(value);
}

function fighterView(
  context: AnyRow | undefined,
  snapshot: AnyRow,
  row: AnyRow,
  corner: "rood" | "blauw",
  resultRows: AnyRow[],
) {
  const rowName = corner === "rood" ? row.rood_naam : row.blauw_naam;
  const rowGym = corner === "rood" ? row.rood_gym : row.blauw_gym;

  return {
    // Terminator-ready: actuele fighter-context is de waarheid.
    // De bout-snapshot blijft uitsluitend fallback voor oude of incomplete data.
    naam: contextName(context) || s(first(rowName, snapshot.naam, snapshot.naam_input)) || "Tegenstander gezocht",
    sportschool: contextGym(context) || s(first(rowGym, snapshot.sportschool, snapshot.gym)) || "—",
    record: context ? recordFromResults(context, resultRows) : s(first(snapshot.record, snapshot.record_string)) || "—",
  };
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

    const { data: promoterPublication, error: promoterError } = await supabaseAdmin
      .from("matchmaking_public_pages")
      .select("*")
      .eq("public_token", cleanToken)
      .eq("is_enabled", true)
      .maybeSingle();

    if (promoterError) throw promoterError;

    let publication = promoterPublication;
    let audience: "promoter" | "trainers" = "promoter";

    if (!publication) {
      const { data: trainerPublication, error: trainerError } = await supabaseAdmin
        .from("matchmaking_public_pages")
        .select("*")
        .eq("trainer_token", cleanToken)
        .eq("is_enabled", true)
        .maybeSingle();
      if (trainerError) throw trainerError;
      publication = trainerPublication;
      audience = "trainers";
    }

    if (!publication) {
      return NextResponse.json(
        { error: "Deze matchmakinglink is niet beschikbaar" },
        { status: 404 },
      );
    }

    if (audience === "trainers") {
      if (!publication.trainer_snapshot) {
        return NextResponse.json(
          { error: "Er is nog geen update voor trainers gepubliceerd" },
          { status: 404 },
        );
      }
      return NextResponse.json(publication.trainer_snapshot, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
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

    // Exact dezelfde recordbron als tab Matchmaking: de centrale
    // FightPassport-uitslagenhistorie, niet matchmaker_uitslagen_raw.
    const contextVaNumbers = Array.from(
      new Set(
        (contextsRes.data ?? [])
          .map((context: AnyRow) => digits(first(context.va_nummer, context.va, context.fighter_id)))
          .filter(Boolean),
      ),
    );

    let resultRows: AnyRow[] = [];
    if (contextVaNumbers.length) {
      const { data: fightPassportResults, error: resultsError } = await supabaseAdmin
        .from("fightpassport_results")
        .select("*")
        .in("va_nummer", contextVaNumbers)
        .order("datum", { ascending: false });

      if (resultsError) throw resultsError;
      resultRows = (fightPassportResults ?? []) as AnyRow[];
    }

    const contextByVa = new Map<string, AnyRow>();
    const contextByRegistrationId = new Map<string, AnyRow>();
    for (const context of contextsRes.data ?? []) {
      const va = digits(context.va_nummer);
      const aanmeldingId = registrationId(first(context.inschrijving_id, context.aanmelding_id));
      if (va && !contextByVa.has(va)) contextByVa.set(va, context);
      if (aanmeldingId && !contextByRegistrationId.has(aanmeldingId)) {
        contextByRegistrationId.set(aanmeldingId, context);
      }
    }

    function contextForCorner(row: AnyRow, raw: AnyRow, corner: "rood" | "blauw") {
      const snapshot = obj(raw[corner]);

      // Een bout verwijst naar een concrete aanmelding. Die sleutel is altijd
      // specifieker dan VA, omdat hetzelfde VA binnen één matchmaking vaker kan
      // voorkomen. Alleen bij oude bouts zonder inschrijving-ID vallen we terug op VA.
      const aanmeldingId = registrationId(first(
        row[`${corner}_aanmelding_id`],
        row[`${corner}_inschrijving_id`],
        snapshot.aanmelding_id,
        snapshot.inschrijving_id,
        snapshot.id,
      ));
      if (aanmeldingId && contextByRegistrationId.has(aanmeldingId)) {
        return contextByRegistrationId.get(aanmeldingId);
      }

      const va = digits(first(
        row[`va_${corner}`],
        row[`${corner}_va`],
        row[`${corner}_va_nummer`],
        snapshot.va_nummer,
        snapshot.va,
      ));
      return va && contextByVa.has(va) ? contextByVa.get(va) : undefined;
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

        const redContext = contextForCorner(row, raw, "rood");
        const blueContext = contextForCorner(row, raw, "blauw");
        const status = normalizeStatus(first(row.status, row.partij_status, row.bout_status, raw.status));

        return {
          id: s(row.id),
          partijNr: Number(first(row.partij_nr, raw.partij_nr)) || null,
          // De gekoppelde context is actueel na iedere Terminator-run.
          // Boutvelden blijven fallback voor partij-specifieke of oudere gegevens.
          klasse: s(first(
            contextClass(redContext),
            contextClass(blueContext),
            row.klasse,
            row.klasse_mm,
            raw.klasse,
          )) || "—",
          geslacht: genderLabel(first(
            redContext?.geslacht,
            redContext?.fp_geslacht,
            blueContext?.geslacht,
            blueContext?.fp_geslacht,
            row.geslacht,
            raw.geslacht,
          )),
          discipline: s(first(
            contextDiscipline(redContext),
            contextDiscipline(blueContext),
            row.discipline,
            raw.discipline,
          )) || "—",
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
          red: fighterView(redContext, red, row, "rood", resultRows),
          blue: fighterView(blueContext, blue, row, "blauw", resultRows),
        };
      })
      .filter((bout: AnyRow) => {
        if (bout.status === "onder_voorbehoud" && publication.show_pending === false) return false;
        return bout.status !== "tegenstander_gezocht";
      })
      .sort((a: AnyRow, b: AnyRow) => {
        // Zelfde zichtbare volgorde als tab Matchmaking:
        // A -> B -> C -> N -> J+ -> R -> J.
        const klasseDiff = classRank(a.klasse) - classRank(b.klasse);
        if (klasseDiff !== 0) return klasseDiff;

        // Binnen iedere klasse: lichtste maximale gewicht bovenaan.
        const gewichtDiff = weightSortValue(a.maxGewicht) - weightSortValue(b.maxGewicht);
        if (gewichtDiff !== 0) return gewichtDiff;

        // Bij gelijk gewicht: jongste partij eerst.
        const ageA = Number.isFinite(a.sortAge) ? a.sortAge : Number.POSITIVE_INFINITY;
        const ageB = Number.isFinite(b.sortAge) ? b.sortAge : Number.POSITIVE_INFINITY;
        if (ageA !== ageB) return ageA - ageB;

        // Alleen als stabiele laatste terugval; bepaalt niet de zichtbare nummering.
        const partijA = Number.isFinite(a.partijNr) ? a.partijNr : Number.POSITIVE_INFINITY;
        const partijB = Number.isFinite(b.partijNr) ? b.partijNr : Number.POSITIVE_INFINITY;
        return partijA - partijB;
      })
      .map((bout: AnyRow, index: number, sorted: AnyRow[]) => ({
        ...bout,
        // Bovenaan staat de main card en die wordt als laatste gevochten.
        // Daarom krijgt de bovenste partij het hoogste nummer en de onderste jeugdpartij nummer 1.
        partijNr: sorted.length - index,
      }));

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
              record: recordFromResults(context, resultRows, false),
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
        audience: "promoter",
        event: {
          title: s(publication.public_title) || s(first(mm.event_naam, mm.naam, mm.titel)) || "Matchmaking",
          date: eventDate,
          location: s(publication.public_location) || s(first(mm.event_locatie, mm.locatie, mm.plaats, mm.stadium)),
          disciplines: s(publication.public_disciplines) || s(first(mm.discipline, mm.disciplines)),
          phase: "Live meekijken voor promotor",
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
