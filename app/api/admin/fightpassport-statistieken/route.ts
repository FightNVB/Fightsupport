import { NextResponse } from "next/server";
import { requireUserWithRole } from "@/app/api/_utils/authz";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;
type AgeGroup = "jeugd" | "volwassen" | "onbekend";

const PAGE_SIZE = 1000;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function digits(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function cleanName(value: unknown) {
  return text(value)
    .toLocaleLowerCase("nl-NL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "nl"))
    .join(" ");
}

function cleanEvent(value: unknown) {
  return text(value)
    .toLocaleLowerCase("nl-NL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ymd(value: unknown) {
  const raw = text(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function resultKind(value: unknown): "win" | "loss" | "draw" | "other" {
  const v = text(value).toLocaleLowerCase("nl-NL");
  if (!v) return "other";
  if (/\b(onbeslist|gelijk|draw)\b/.test(v)) return "draw";
  if (/\b(verliest|verlies|verloren|lost|loss)\b/.test(v)) return "loss";
  if (/\b(wint|winst|gewonnen|win)\b/.test(v)) return "win";
  return "other";
}

function isKoTkoWin(value: unknown) {
  const v = text(value).toLocaleLowerCase("nl-NL");
  if (resultKind(v) !== "win") return false;
  return /\b(tko|technisch(?:e)?\s+ko|technische\s+knock[\s-]?out|knock[\s-]?out|ko)\b/.test(v);
}

function calcAge(birthValue: unknown, fightDateValue: unknown): number | null {
  const birthRaw = ymd(birthValue);
  const fightRaw = ymd(fightDateValue);
  if (!birthRaw || !fightRaw) return null;

  const birth = new Date(`${birthRaw}T12:00:00Z`);
  const fight = new Date(`${fightRaw}T12:00:00Z`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(fight.getTime())) return null;

  let age = fight.getUTCFullYear() - birth.getUTCFullYear();
  const month = fight.getUTCMonth() - birth.getUTCMonth();
  if (month < 0 || (month === 0 && fight.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

function ageGroup(birthValue: unknown, fightDateValue: unknown): AgeGroup {
  const age = calcAge(birthValue, fightDateValue);
  if (age == null) return "onbekend";
  return age < 18 ? "jeugd" : "volwassen";
}

function eventKey(date: unknown, event: unknown) {
  return `${ymd(date)}|${cleanEvent(event)}`;
}

function fightKey(row: AnyRow, fighterName: string) {
  const left = cleanName(fighterName || row.va_nummer);
  const right = cleanName(row.tegenstander);
  const pair = [left, right].filter(Boolean).sort((a, b) => a.localeCompare(b, "nl")).join("::");

  return [
    ymd(row.datum),
    cleanEvent(row.evenement),
    pair,
    text(row.discipline).toLocaleLowerCase("nl-NL"),
    text(row.klasse).toLocaleLowerCase("nl-NL"),
  ].join("|");
}

async function fetchAll(
  table: string,
  select: string,
  applyFilters?: (query: any) => any,
): Promise<AnyRow[]> {
  const out: AnyRow[] = [];
  let from = 0;

  while (true) {
    let query: any = supabaseAdmin.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (applyFilters) query = applyFilters(query);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as AnyRow[];
    out.push(...rows);

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return out;
}

function asDateFilter(value: string | null) {
  const v = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function top<T extends Record<string, any>>(rows: T[], key: keyof T, limit = 10) {
  return [...rows]
    .sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0))
    .slice(0, limit);
}

export async function GET(req: Request) {
  try {
    await requireUserWithRole(req, [
      "admin",
      "superadmin",
      "matchmaker",
      "official",
      "hoofdofficial",
    ]);

    const url = new URL(req.url);
    const from = asDateFilter(url.searchParams.get("from"));
    const to = asDateFilter(url.searchParams.get("to"));

    const resultFilter = (query: any) => {
      let q = query.order("datum", { ascending: true });
      if (from) q = q.gte("datum", from);
      if (to) q = q.lte("datum", to);
      return q;
    };

    const eventFilter = (query: any) => {
      let q = query
        .eq("exists_in_fightpassport", true)
        .order("evenement_datum", { ascending: true });
      if (from) q = q.gte("evenement_datum", from);
      if (to) q = q.lte("evenement_datum", to);
      return q;
    };

    const [results, events, fighters, schoolsMaster] = await Promise.all([
      fetchAll(
        "fightpassport_results",
        "id,va_nummer,datum,evenement,tegenstander,sportschool,discipline,klasse,gewicht,uitslag",
        resultFilter,
      ),
      fetchAll(
        "fightpassport_events",
        "event_id,bond_naam,evenement_naam,evenement_datum,plaats,promotor,exists_in_fightpassport,officials_count,last_scraped_at",
        eventFilter,
      ),
      fetchAll(
        "fightpassport_fighters",
        "va_nummer,naam,geboortedatum,geslacht,totaal_wedstrijden,gewonnen,kos,primary_discipline,last_scraped_at",
      ),
      fetchAll(
        "sportscholen",
        "sportschool_id,naam,plaats,land",
      ),
    ]);

    const fighterByVa = new Map<string, AnyRow>();
    for (const fighter of fighters) {
      const va = digits(fighter.va_nummer);
      if (va) fighterByVa.set(va, fighter);
    }

    const uniqueFightKeys = new Set<string>();
    const eventFightKeys = new Map<string, Set<string>>();

    const fighterStats = new Map<string, any>();
    const schoolStats = new Map<string, any>();

    for (const row of results) {
      const va = digits(row.va_nummer);
      if (!va) continue;

      const fighter = fighterByVa.get(va);
      const fighterName = text(fighter?.naam) || `VA ${va}`;
      const group = ageGroup(fighter?.geboortedatum, row.datum);
      const kind = resultKind(row.uitslag);
      const key = fightKey(row, fighterName);
      const eKey = eventKey(row.datum, row.evenement);

      if (key) {
        uniqueFightKeys.add(key);
        if (!eventFightKeys.has(eKey)) eventFightKeys.set(eKey, new Set());
        eventFightKeys.get(eKey)!.add(key);
      }

      let fs = fighterStats.get(va);
      if (!fs) {
        fs = {
          va_nummer: va,
          naam: fighterName,
          geslacht: fighter?.geslacht ?? null,
          partijen: 0,
          winst: 0,
          verlies: 0,
          onbeslist: 0,
          overig: 0,
          ko_tko_winst: 0,
          winstpercentage: 0,
        };
        fighterStats.set(va, fs);
      }

      fs.partijen += 1;
      if (kind === "win") fs.winst += 1;
      else if (kind === "loss") fs.verlies += 1;
      else if (kind === "draw") fs.onbeslist += 1;
      else fs.overig += 1;
      if (isKoTkoWin(row.uitslag)) fs.ko_tko_winst += 1;

      fs[`partijen_${group}`] = Number(fs[`partijen_${group}`] ?? 0) + 1;
      fs[`winst_${group}`] = Number(fs[`winst_${group}`] ?? 0) + (kind === "win" ? 1 : 0);
      fs[`ko_tko_${group}`] = Number(fs[`ko_tko_${group}`] ?? 0) + (isKoTkoWin(row.uitslag) ? 1 : 0);

      const schoolName = text(row.sportschool);
      if (schoolName) {
        const schoolKey = schoolName.toLocaleLowerCase("nl-NL");
        let ss = schoolStats.get(schoolKey);
        if (!ss) {
          ss = {
            sportschool: schoolName,
            fighters: new Set<string>(),
            fights: new Set<string>(),
            winst: 0,
            verlies: 0,
            onbeslist: 0,
            overig: 0,
            ko_tko_winst: 0,
            jeugd: new Set<string>(),
            volwassenen: new Set<string>(),
          };
          schoolStats.set(schoolKey, ss);
        }

        ss.fighters.add(va);
        if (key) ss.fights.add(key);
        if (kind === "win") ss.winst += 1;
        else if (kind === "loss") ss.verlies += 1;
        else if (kind === "draw") ss.onbeslist += 1;
        else ss.overig += 1;
        if (isKoTkoWin(row.uitslag)) ss.ko_tko_winst += 1;
        if (group === "jeugd") ss.jeugd.add(va);
        if (group === "volwassen") ss.volwassenen.add(va);
      }
    }

    const fighterRows = [...fighterStats.values()].map((row) => {
      const decisions = row.winst + row.verlies + row.onbeslist;
      return {
        ...row,
        winstpercentage: decisions > 0 ? Math.round((row.winst / decisions) * 1000) / 10 : 0,
      };
    });

    function groupLeaderboard(group: "jeugd" | "volwassen", metric: "partijen" | "winst" | "ko_tko") {
      const groupField = `${metric}_${group}`;
      return fighterRows
        .map((row: any) => ({
          va_nummer: row.va_nummer,
          naam: row.naam,
          geslacht: row.geslacht,
          waarde: Number(row[groupField] ?? 0),
          partijen: Number(row[`partijen_${group}`] ?? 0),
          winst: Number(row[`winst_${group}`] ?? 0),
          ko_tko_winst: Number(row[`ko_tko_${group}`] ?? 0),
        }))
        .filter((row) => row.partijen > 0)
        .sort((a, b) => b.waarde - a.waarde || b.partijen - a.partijen || a.naam.localeCompare(b.naam, "nl"))
        .slice(0, 10);
    }

    const schoolRows = [...schoolStats.values()].map((row) => {
      const decisions = row.winst + row.verlies + row.onbeslist;
      return {
        sportschool: row.sportschool,
        actieve_vechters: row.fighters.size,
        partijen: row.fights.size,
        winst: row.winst,
        verlies: row.verlies,
        onbeslist: row.onbeslist,
        overig: row.overig,
        ko_tko_winst: row.ko_tko_winst,
        jeugdvechters: row.jeugd.size,
        volwassen_vechters: row.volwassenen.size,
        winstpercentage: decisions > 0 ? Math.round((row.winst / decisions) * 1000) / 10 : 0,
      };
    });

    const eventRows = events.map((event) => {
      const key = eventKey(event.evenement_datum, event.evenement_naam);
      return {
        event_id: event.event_id,
        evenement_naam: event.evenement_naam,
        evenement_datum: event.evenement_datum,
        plaats: event.plaats,
        promotor: event.promotor,
        bond_naam: text(event.bond_naam) || "Onbekend",
        partijen: eventFightKeys.get(key)?.size ?? 0,
        officials_count: Number(event.officials_count ?? 0),
      };
    });

    const eventIds = eventRows.map((event) => Number(event.event_id)).filter(Number.isFinite);
    const officials: AnyRow[] = [];

    for (let i = 0; i < eventIds.length; i += 500) {
      const batch = eventIds.slice(i, i + 500);
      const part = await fetchAll(
        "fightpassport_event_officials",
        "id,event_id,functie,naam,volgorde,last_seen_at",
        (q) => q.in("event_id", batch),
      );
      officials.push(...part);
    }

    const eventById = new Map<number, any>();
    for (const event of eventRows) eventById.set(Number(event.event_id), event);

    const bondMap = new Map<string, any>();
    for (const event of eventRows) {
      const bond = text(event.bond_naam) || "Onbekend";
      const key = bond.toLocaleLowerCase("nl-NL");
      let row = bondMap.get(key);
      if (!row) {
        row = { bondteam: bond, events: new Set<number>(), partijen: 0, officials: new Set<string>() };
        bondMap.set(key, row);
      }
      row.events.add(Number(event.event_id));
      row.partijen += Number(event.partijen ?? 0);
    }

    const officialMap = new Map<string, any>();
    for (const official of officials) {
      const naam = text(official.naam);
      if (!naam) continue;

      const event = eventById.get(Number(official.event_id));
      if (!event) continue;

      const officialKey = naam.toLocaleLowerCase("nl-NL");
      let row = officialMap.get(officialKey);
      if (!row) {
        row = {
          naam,
          functies: new Set<string>(),
          events: new Set<number>(),
          partijen: 0,
          bondteams: new Set<string>(),
        };
        officialMap.set(officialKey, row);
      }

      row.functies.add(text(official.functie) || "Onbekend");
      if (!row.events.has(Number(official.event_id))) {
        row.events.add(Number(official.event_id));
        row.partijen += Number(event.partijen ?? 0);
      }
      row.bondteams.add(text(event.bond_naam) || "Onbekend");

      const bondKey = (text(event.bond_naam) || "Onbekend").toLocaleLowerCase("nl-NL");
      const bondRow = bondMap.get(bondKey);
      if (bondRow) bondRow.officials.add(officialKey);
    }

    const bondRows = [...bondMap.values()]
      .map((row) => ({
        bondteam: row.bondteam,
        evenementen: row.events.size,
        partijen: row.partijen,
        officials: row.officials.size,
      }))
      .sort((a, b) => b.partijen - a.partijen || b.evenementen - a.evenementen);

    const officialRows = [...officialMap.values()]
      .map((row) => ({
        naam: row.naam,
        functies: [...row.functies].sort((a, b) => a.localeCompare(b, "nl")),
        evenementen: row.events.size,
        partijen: row.partijen,
        bondteams: [...row.bondteams].sort((a, b) => a.localeCompare(b, "nl")),
      }))
      .sort((a, b) => b.partijen - a.partijen || b.evenementen - a.evenementen);

    const eventWithFights = eventRows.filter((event) => event.partijen > 0);
    const biggest = [...eventWithFights].sort((a, b) => b.partijen - a.partijen)[0] ?? null;
    const smallest = [...eventWithFights].sort((a, b) => a.partijen - b.partijen)[0] ?? null;

    const uniqueFighterVas = new Set(results.map((row) => digits(row.va_nummer)).filter(Boolean));
    const uniqueSchools = new Set(results.map((row) => text(row.sportschool).toLocaleLowerCase("nl-NL")).filter(Boolean));

    const dutchSchoolNames = new Set(
      schoolsMaster
        .filter((row) => text(row.land).toLocaleLowerCase("nl-NL") === "nederland")
        .map((row) => text(row.naam).toLocaleLowerCase("nl-NL"))
        .filter(Boolean),
    );
    const dutchParticipatingSchools = new Set(
      [...uniqueSchools].filter((school) => dutchSchoolNames.has(school)),
    );

    const latestScrape = [fighters, events]
      .flat()
      .map((row) => text(row.last_scraped_at))
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    return NextResponse.json(
      {
        filter: { from, to },
        totals: {
          evenementen: eventRows.length,
          partijen: uniqueFightKeys.size,
          wedstrijdvechters: uniqueFighterVas.size,
          sportscholen: uniqueSchools.size,
          nederlandse_sportscholen: dutchParticipatingSchools.size,
          bondteams: new Set(eventRows.map((row) => text(row.bond_naam).toLocaleLowerCase("nl-NL")).filter(Boolean)).size,
          officials: officialRows.length,
          grootste_gala: biggest,
          kleinste_gala: smallest,
          laatste_sync: latestScrape,
        },
        fighters: {
          meeste_partijen: top(fighterRows, "partijen"),
          meeste_winst: top(fighterRows, "winst"),
          meeste_ko_tko: top(fighterRows, "ko_tko_winst"),
          hoogste_winstpercentage: fighterRows
            .filter((row) => row.partijen >= 10)
            .sort((a, b) => b.winstpercentage - a.winstpercentage || b.partijen - a.partijen)
            .slice(0, 10),
          jeugd: {
            meeste_partijen: groupLeaderboard("jeugd", "partijen"),
            meeste_winst: groupLeaderboard("jeugd", "winst"),
            meeste_ko_tko: groupLeaderboard("jeugd", "ko_tko"),
          },
          volwassenen: {
            meeste_partijen: groupLeaderboard("volwassen", "partijen"),
            meeste_winst: groupLeaderboard("volwassen", "winst"),
            meeste_ko_tko: groupLeaderboard("volwassen", "ko_tko"),
          },
        },
        schools: {
          meeste_actieve_vechters: [...schoolRows]
            .sort((a, b) => b.actieve_vechters - a.actieve_vechters || b.partijen - a.partijen)
            .slice(0, 10),
          meeste_partijen: [...schoolRows]
            .sort((a, b) => b.partijen - a.partijen || b.actieve_vechters - a.actieve_vechters)
            .slice(0, 10),
          hoogste_winstpercentage: [...schoolRows]
            .filter((row) => row.partijen >= 10)
            .sort((a, b) => b.winstpercentage - a.winstpercentage || b.partijen - a.partijen)
            .slice(0, 10),
          alle: schoolRows,
        },
        bonds: bondRows,
        officials: officialRows.slice(0, 50),
        events: {
          grootste: biggest,
          kleinste: smallest,
          alle: [...eventRows].sort((a, b) => b.partijen - a.partijen),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return secureError(error, "FightPassport-statistieken konden niet worden geladen.");
  }
}
