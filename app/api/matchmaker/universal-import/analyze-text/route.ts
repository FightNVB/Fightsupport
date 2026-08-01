import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseUniversalText } from "@/lib/matchmaker/universal-import/parseText";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const runtime = "nodejs";

const s = (v: unknown) => String(v ?? "").trim();
const normName = (v: unknown) =>
  s(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function numberValue(value: unknown) {
  const n = Number(s(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : null;
}

function cleanName(value: string) {
  return value
    .replace(/^(?:jeugd|vechter|naam)\s+/i, "")
    .replace(/\s*\((?:man|vrouw|m|v)\)\s*$/i, "")
    .replace(/[,:;-]+$/g, "")
    .trim();
}

function parseDate(block: string) {
  const numeric = block.match(/\b(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})\b/);
  if (numeric) {
    return `${numeric[1].padStart(2, "0")}-${numeric[2].padStart(2, "0")}-${numeric[3]}`;
  }

  const iso = block.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return `${iso[3].padStart(2, "0")}-${iso[2].padStart(2, "0")}-${iso[1]}`;
  }

  const monthNames: Record<string, string> = {
    jan: "01", januari: "01", feb: "02", februari: "02", mrt: "03", maart: "03",
    apr: "04", april: "04", mei: "05", jun: "06", juni: "06", jul: "07", juli: "07",
    aug: "08", augustus: "08", sep: "09", september: "09", okt: "10", oktober: "10",
    nov: "11", november: "11", dec: "12", december: "12",
  };
  const written = block.match(/\b(\d{1,2})\s*([A-Za-zÀ-ÖØ-öø-ÿ]+)\s*(\d{4})\b/i);
  if (written) {
    const month = monthNames[written[2].toLocaleLowerCase("nl-NL")];
    if (month) return `${written[1].padStart(2, "0")}-${month}-${written[3]}`;
  }

  return "";
}

function parseVa(block: string) {
  return (
    block.match(/\bVA(?:\s*(?:nummer|nr\.?))?\s*:?\s*(\d{3,})\b/i)?.[1] || ""
  ).replace(/^0+(?=\d)/, "");
}

type ParsedWeight = {
  value: number | null;
  text: string;
  mode: "exact" | "maximum" | "heavyweight" | "range" | "";
};

function parseWeight(block: string): ParsedWeight {
  const range = block.match(/\b(\d{2,3}(?:[.,]\d+)?)\s*\/\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilo)\b/i);
  if (range) {
    const upper = numberValue(range[2]);
    return {
      value: upper,
      text: upper == null ? "" : `${numberValue(range[1])}/${upper}`,
      mode: "range",
    };
  }

  // 95+ = zwaargewicht: de vechter moet boven 95 kg wegen.
  const heavyweight = block.match(/(?:\bgewicht\s*:\s*)?\b(\d{2,3}(?:[.,]\d+)?)\s*\+\s*(?:kg|kilo)?\b/i);
  if (heavyweight) {
    const value = numberValue(heavyweight[1]);
    return { value, text: value == null ? "" : `${value}+`, mode: "heavyweight" };
  }

  // -95 = maximaal/tot en met 95 kg.
  const maximum = block.match(/(?:\bgewicht\s*:\s*)?-\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilo)?\b/i);
  if (maximum) {
    const value = numberValue(maximum[1]);
    return { value, text: value == null ? "" : `-${value}`, mode: "maximum" };
  }

  // Zonder + of - is het gewoon het opgegeven actuele gewicht.
  const exact = block.match(/(?:\bgewicht\s*:\s*)?\b(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilo)\b/i);
  if (exact) {
    const value = numberValue(exact[1]);
    return { value, text: value == null ? "" : String(value), mode: "exact" };
  }

  return { value: null, text: "", mode: "" };
}

function parseGender(block: string) {
  if (/\b(?:vrouw|female)\b/i.test(block)) return "VROUW";
  if (/\b(?:man|male)\b/i.test(block)) return "MAN";
  return "";
}

function parseClass(block: string) {
  if (/\bjeugd\b/i.test(block)) return "JEUGD";
  if (/\b(?:nieuweling|1e\s*weds(?:trijd)?|eerste\s*wedstrijd)\b/i.test(block)) return "N";
  return block.match(/\b([NRCBA])\s*[- ]?klasse\b/i)?.[1]?.toUpperCase()
    || block.match(/\b\d+\s*x?\s*([NRCBA])\b/i)?.[1]?.toUpperCase()
    || "";
}

function parseRecord(block: string) {
  const wins = block.match(/\b(\d+)\s*(?:x\s*)?(?:winst|winsten|wins?|w)\b/i)?.[1] || "";
  const losses = block.match(/\b(\d+)\s*(?:x\s*)?(?:verlies|verliezen|loss(?:es)?|v)\b/i)?.[1] || "";
  const draws = block.match(/\b(\d+)\s*(?:x\s*)?(?:onbeslist|draws?|d)\b/i)?.[1] || "";
  const parties = block.match(/\b(\d+)\s*partijen?\b/i)?.[1] || "";
  const classExperience = block.match(/\b(\d+)\s*x?\s*[NRCBA]\b/i)?.[1] || "";

  if (/\b(?:nieuweling|1e\s*weds(?:trijd)?|eerste\s*wedstrijd)\b/i.test(block)) {
    return "0W 0V 0D";
  }
  if (!wins && !losses && !draws && !parties && !classExperience) return "";
  return `${wins || classExperience || parties || "0"}W ${losses || "0"}V ${draws || "0"}D`;
}

function parseSchool(block: string) {
  return s(
    block.match(/\b(?:gym|sportschool|school)\s*:\s*([^,.;\n]+?)(?=\s+(?:VA|gewicht|leeftijd|geboren|ervaring|record)\b|$)/i)?.[1],
  );
}

function normalizeNameForKey(value: string) {
  return normName(value).replace(/\s+/g, " ");
}

/**
 * Parser voor compacte WhatsApp-/mailtekst. Hij ondersteunt zowel "VA naam"
 * als "naam ... VA", datums met spaties, maandnamen, slash-namen en dubbele
 * vermeldingen van dezelfde vechter.
 */
function parseDenseFighterText(
  text: string,
  senderName: string,
  sourceType: string,
  fallbackSchool: string,
) {
  const compact = text.replace(/\r/g, " ").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  const datePattern = /\b(?:\d{1,2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s*[A-Za-zÀ-ÖØ-öø-ÿ]+\s*\d{4})\b/gi;
  const dates = [...compact.matchAll(datePattern)];

  if (!dates.length) return { trainer_school: "", drafts: [] as any[] };

  const globalSchool =
    s(compact.match(/\b(?:van|namens)\s+(?:sportschool|gym)\s+([^,.;]+)/i)?.[1]) ||
    fallbackSchool;
  const vaPattern = /\bVA(?:\s*(?:nummer|nr\.?))?\s*:?\s*(\d{3,})\b/gi;
  const stopWords = new Set([
    "va", "nummer", "nr", "gewicht", "kg", "kilo", "nieuweling", "partij", "partijen",
    "weds", "wedstrijd", "wedstrijden", "winst", "winsten", "verlies", "verliezen",
    "onbeslist", "man", "vrouw", "leeftijd", "jaar", "jr", "ervaring", "record",
  ]);

  const drafts: any[] = [];

  for (let index = 0; index < dates.length; index++) {
    const dateMatch = dates[index];
    const dateStart = dateMatch.index ?? 0;
    const dateEnd = dateStart + dateMatch[0].length;
    const previousDateEnd = index === 0
      ? 0
      : (dates[index - 1].index ?? 0) + dates[index - 1][0].length;
    const nextDateStart = index + 1 < dates.length
      ? (dates[index + 1].index ?? compact.length)
      : compact.length;

    const beforeDate = compact.slice(previousDateEnd, dateStart);
    const candidatePattern = /(?:[A-Za-zÀ-ÖØ-öø-ÿÇçĞğİıŞş][A-Za-zÀ-ÖØ-öø-ÿÇçĞğİıŞş'’./-]*)(?:\s+[A-Za-zÀ-ÖØ-öø-ÿÇçĞğİıŞş][A-Za-zÀ-ÖØ-öø-ÿÇçĞğİıŞş'’./-]*){1,4}/g;
    const candidates = [...beforeDate.matchAll(candidatePattern)]
      .map((match) => {
        const words = match[0]
          .split(/\s+/)
          .filter((word) => !stopWords.has(word.toLocaleLowerCase("nl-NL")));
        return {
          name: cleanName(words.slice(-4).join(" ")),
          start: previousDateEnd + (match.index ?? 0),
          end: previousDateEnd + (match.index ?? 0) + match[0].length,
        };
      })
      .filter((candidate) => candidate.name.split(/\s+/).length >= 2)
      .filter((candidate) => !/^(?:Goedemorgen Renate|Sportmani Almere|Kickboksevent|Fightmasters|Ik heb|klasse vechters|volgende vechters|geef ik|de volgende|Voor het)$/i.test(candidate.name));

    const nameCandidate = candidates.at(-1);
    if (!nameCandidate) continue;

    const contextStart = Math.max(previousDateEnd, nameCandidate.start - 80);
    const contextEnd = Math.min(nextDateStart, dateEnd + 120);
    const context = compact.slice(contextStart, contextEnd);
    const vaMatches = [...context.matchAll(vaPattern)].map((match) => ({
      va: match[1].replace(/^0+(?=\d)/, ""),
      start: contextStart + (match.index ?? 0),
      end: contextStart + (match.index ?? 0) + match[0].length,
    }));

    const nearestVa = vaMatches
      .map((match) => ({
        ...match,
        distance: match.end <= nameCandidate.start
          ? nameCandidate.start - match.end
          : match.start >= nameCandidate.end
            ? match.start - nameCandidate.end
            : 0,
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    const rawBlock = compact.slice(nameCandidate.start, nextDateStart).trim();
    const enrichedBlock = nearestVa
      ? `${compact.slice(nearestVa.start, nearestVa.end)} ${rawBlock}`
      : rawBlock;
    const weightPart = compact.slice(dateEnd, nextDateStart);
    const weight = parseWeight(weightPart);

    drafts.push({
      source_name: nameCandidate.name,
      source_va: nearestVa?.va || "",
      source_birth_date: parseDate(dateMatch[0]),
      source_gender: parseGender(enrichedBlock),
      source_discipline: /kickboks/i.test(compact) ? "KICKBOKSEN" : "",
      source_class: parseClass(enrichedBlock),
      source_record: parseRecord(enrichedBlock),
      source_email: "",
      trainer_weight: weight.value,
      trainer_weight_text: weight.text,
      trainer_weight_mode: weight.mode,
      trainer_school: parseSchool(enrichedBlock) || globalSchool || fallbackSchool,
      raw_block: enrichedBlock,
      source_notes: [],
      sender_name: senderName || "",
      source_type: sourceType || "tekst",
    });
  }

  const unique = new Map<string, any>();
  for (const draft of drafts) {
    const key = draft.source_va
      ? `va:${draft.source_va}`
      : `name:${normalizeNameForKey(draft.source_name)}:${draft.source_birth_date}`;
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, draft);
      continue;
    }

    unique.set(key, {
      ...existing,
      source_birth_date: existing.source_birth_date || draft.source_birth_date,
      source_gender: existing.source_gender || draft.source_gender,
      source_class: existing.source_class || draft.source_class,
      source_record: existing.source_record || draft.source_record,
      trainer_weight: existing.trainer_weight ?? draft.trainer_weight,
      trainer_weight_text: existing.trainer_weight_text || draft.trainer_weight_text,
      trainer_weight_mode: existing.trainer_weight_mode || draft.trainer_weight_mode,
      trainer_school: existing.trainer_school || draft.trainer_school,
      raw_block: `${existing.raw_block} | ${draft.raw_block}`,
    });
  }

  return { trainer_school: globalSchool, drafts: [...unique.values()] };
}

async function user(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Niet ingelogd.");
  return data.user;
}

export async function POST(req: Request) {
  try {
    await user(req);

    const body = await req.json();
    const text = s(body.text);
    const senderName = s(body.sender_name);
    const sourceType = s(body.source_type);
    // De sportschool wordt op de pagina gekozen en is daarom leidend wanneer
    // de losse WhatsApp-/mailtekst zelf geen sportschool bevat.
    const fallbackSchool = s(
      body.trainer_school || body.sportschool || body.gym || body.school_name,
    );

    const standardParsed = parseUniversalText({
      text,
      sender_name: senderName,
      source_type: sourceType,
    });

    const denseParsed = parseDenseFighterText(
      text,
      senderName,
      sourceType,
      fallbackSchool,
    );
    const completenessScore = (result: any) =>
      result.drafts.reduce((score: number, draft: any) =>
        score
        + (draft.source_name ? 2 : 0)
        + (draft.source_va ? 2 : 0)
        + (draft.source_birth_date ? 1 : 0)
        + (draft.trainer_weight != null && draft.trainer_weight !== "" ? 3 : 0)
        + (draft.trainer_school ? 1 : 0), 0);

    // Niet alleen het aantal rijen telt. Bij een gelijk aantal kiezen we de
    // parser die de meeste bruikbare velden, met name gewicht, heeft gevonden.
    const parsed =
      denseParsed.drafts.length > standardParsed.drafts.length ||
      (denseParsed.drafts.length === standardParsed.drafts.length &&
        completenessScore(denseParsed) > completenessScore(standardParsed))
        ? denseParsed
        : standardParsed;

    // Ook de standaardparser krijgt altijd de op de pagina gekozen gym als
    // fallback. Zo ontstaat nooit meer "gym onbekend" alleen omdat de gym
    // niet nogmaals in de geplakte tekst staat.
    parsed.trainer_school = s(parsed.trainer_school) || fallbackSchool;
    parsed.drafts = parsed.drafts.map((draft: any) => ({
      ...draft,
      trainer_school: s(draft.trainer_school) || fallbackSchool,
    }));

    const vas = [
      ...new Set(
        parsed.drafts
          .map((draft: any) => s(draft.source_va).replace(/\D/g, "").replace(/^0+(?=\d)/, ""))
          .filter(Boolean),
      ),
    ] as string[];

    const { data: fighters, error } = vas.length
      ? await supabase
          .from("fightpassport_fighters")
          .select("*")
          .in("va_nummer", vas)
      : ({ data: [], error: null } as any);

    if (error) throw error;

    const byVa = new Map(
      (fighters ?? []).map((fighter: any) => [
        String(fighter.va_nummer).replace(/\D/g, "").replace(/^0+(?=\d)/, ""),
        fighter,
      ]),
    );

    // Zoek ook op naam wanneer er wél een VA-nummer staat. In rommelige tekst
    // kan een VA direct vóór of na de verkeerde naam terechtkomen. Een unieke
    // exacte naamsmatch mag zo'n duidelijke verkeerde koppeling herstellen.
    const lookupNames = [...new Set(
      parsed.drafts
        .map((draft: any) => s(draft.source_name))
        .filter(Boolean),
    )];

    const nameLookups = await Promise.all(
      lookupNames.map(async (name) => {
        const { data, error: nameError } = await supabase
          .from("fightpassport_fighters")
          .select("*")
          .ilike("naam", name)
          .limit(3);
        if (nameError) throw nameError;
        return [normName(name), data ?? []] as const;
      }),
    );
    const byName = new Map(nameLookups);

    const rows = parsed.drafts.map((draft: any) => {
      const normalizedVa = s(draft.source_va)
        .replace(/\D/g, "")
        .replace(/^0+(?=\d)/, "");
      const exactNameMatches = (byName.get(normName(draft.source_name)) ?? []).filter(
        (candidate: any) => normName(candidate.naam) === normName(draft.source_name),
      );
      const fighterByVa: any = normalizedVa ? byVa.get(normalizedVa) : null;
      const uniqueNameFighter: any = exactNameMatches.length === 1
        ? exactNameMatches[0]
        : null;
      const vaNameMismatch =
        !!fighterByVa &&
        !!draft.source_name &&
        normName(fighterByVa.naam) !== normName(draft.source_name);

      const fighter: any = vaNameMismatch && uniqueNameFighter
        ? uniqueNameFighter
        : fighterByVa || uniqueNameFighter;
      const resolvedVa = fighter
        ? String(fighter.va_nummer).replace(/\D/g, "").replace(/^0+(?=\d)/, "")
        : normalizedVa;
      const warnings: string[] = [];

      if (!normalizedVa && exactNameMatches.length === 0) warnings.push("VA-nummer ontbreekt en naam niet gevonden in FightPassport");
      else if (!normalizedVa && exactNameMatches.length > 1) warnings.push("VA-nummer ontbreekt en naam geeft meerdere FightPassport-matches");
      else if (!fighter) warnings.push("VA-nummer niet gevonden in FightPassport");

      if (vaNameMismatch && uniqueNameFighter) {
        warnings.push(
          `VA ${normalizedVa} hoorde volgens FightPassport bij '${fighterByVa.naam}'. Op basis van de unieke naam is VA ${resolvedVa} gebruikt.`,
        );
      }

      if (
        fighter &&
        draft.source_name &&
        normName(fighter.naam) !== normName(draft.source_name)
      ) {
        warnings.push(
          `Naam wijkt af: bron '${draft.source_name}', database '${fighter.naam}'`,
        );
      }

      if (draft.trainer_weight == null || draft.trainer_weight === "") warnings.push("Actueel trainergewicht ontbreekt");
      if (!draft.trainer_school) warnings.push("Actuele trainersportschool ontbreekt");

      return {
        ...draft,
        source_va: resolvedVa,
        matched: !!fighter,
        fighter,
        warnings,
        selected_discipline: s(
          fighter?.primary_discipline ||
            fighter?.nulmeting_discipline ||
            draft.source_discipline,
        ),
        selected_class: s(
          fighter?.berekende_klasse ||
            fighter?.nulmeting_klasse ||
            draft.source_class,
        ),
        selected_max_weight: draft.trainer_weight,
        import_ready:
          !!fighter && draft.trainer_weight != null && draft.trainer_weight !== "" && !!draft.trainer_school,
      };
    });

    return NextResponse.json({
      ok: true,
      trainer_school: parsed.trainer_school,
      parser: parsed === denseParsed ? "dense_fallback" : "standard",
      rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Tekst analyseren mislukt." },
      { status: 400 },
    );
  }
}
