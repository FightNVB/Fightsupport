import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { AuthenticatedDownloadButton } from "@/app/dashboard/_components/AuthenticatedDownloadButton";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type MinPuntArchiveRow = {
  id: string;
  va_nummer: string;
  naam: string | null;
  sportschool: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  partij_nr: number | null;
  hoek: "rood" | "blauw" | string;
  bondteam: string | null;
  discipline: string | null;
  klasse: string | null;
  doorgegeven_gewicht: number | string | null;
  gewogen_gewicht: number | string | null;
  gewicht_strafpunt: number | string | null;
  reden: string | null;
  tegenstander_naam: string | null;
  created_at: string | null;
};

type VechterSummary = {
  va: string;
  naam: string;
  sportschool: string;
  totaal: number;
  events: Set<string>;
  eersteDatum: string;
  laatsteDatum: string;
  gemiddeldeDagen: number | null;
  laatsteRows: MinPuntArchiveRow[];
};

type EventGroup = {
  key: string;
  naam: string;
  datum: string;
  rows: MinPuntArchiveRow[];
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function deleteAfmeldingFromPage(formData: FormData) {
  "use server";

  const id = String(formData.get("afmelding_id") ?? "").trim();
  if (!id) return;

  const { data: afmelding, error: loadError } = await supabase
    .from("afmeldingen")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !afmelding) {
    console.error("[afmeldingen] verwijderen: afmelding laden mislukt", loadError);
    revalidatePath("/dashboard/admin/algemeen/afmeldingen");
    return;
  }

  const now = new Date().toISOString();

  if (afmelding.inschrijving_id && afmelding.matchmaking_id) {
    const raw =
      afmelding.raw && typeof afmelding.raw === "object" && !Array.isArray(afmelding.raw)
        ? afmelding.raw
        : {};

    const { error: aanmeldingError } = await supabase
      .from("aanmeldingen")
      .update({
        status: "gescrapt",
        raw: {
          ...raw,
          afmelding_verwijderd: true,
          afmelding_verwijderd_at: now,
          verwijderde_afmelding_id: id,
        },
        updated_at: now,
      })
      .eq("id", afmelding.inschrijving_id)
      .eq("matchmaking_id", afmelding.matchmaking_id);

    if (aanmeldingError) {
      console.error("[afmeldingen] aanmelding herstellen mislukt", aanmeldingError);
    }
  }

  if (afmelding.fighter_context_id) {
    const { data: ctx } = await supabase
      .from("matchmaker_fighter_context")
      .select("id, extra")
      .eq("id", afmelding.fighter_context_id)
      .maybeSingle();

    const extra =
      ctx?.extra && typeof ctx.extra === "object" && !Array.isArray(ctx.extra)
        ? ctx.extra
        : {};

    const { error: contextError } = await supabase
      .from("matchmaker_fighter_context")
      .update({
        status: "gescrapt",
        afgemeld: false,
        beschikbaar: true,
        extra: {
          ...extra,
          afmelding_verwijderd: true,
          afmelding_verwijderd_at: now,
          verwijderde_afmelding_id: id,
          afgemeld: false,
          beschikbaar: true,
        },
        updated_at: now,
      })
      .eq("id", afmelding.fighter_context_id);

    if (contextError) {
      console.error("[afmeldingen] fighter context herstellen mislukt", contextError);
    }
  }

  const { error: deleteError } = await supabase
    .from("afmeldingen")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[afmeldingen] verwijderen mislukt", deleteError);
  }

  revalidatePath("/dashboard/admin/algemeen/afmeldingen");
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

function first(...values: unknown[]) {
  for (const value of values) {
    const out = s(value);
    if (out) return out;
  }
  return "";
}

function fmtDate(v: unknown) {
  const raw = s(v);
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function fmtDateTime(v: unknown) {
  const raw = s(v);
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function diffDays(a: string, b: string) {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round(Math.abs(db - da) / 86_400_000);
}

function avgDaysBetween(rows: MinPuntArchiveRow[]) {
  const dates = rows
    .map((r) => s(r.evenement_datum || r.created_at))
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (dates.length < 2) return null;

  const diffs: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const d = diffDays(dates[i - 1], dates[i]);
    if (d !== null) diffs.push(d);
  }

  if (!diffs.length) return null;
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}

function naam(row: AnyRow) {
  return (
    first(
      row.naam,
      row.naam_input,
      row.fp_naam,
      row.display_naam,
      row.raw?.naam_input,
      row.raw?.fp_naam,
    ) ||
    [row.voornaam, row.achternaam].map(s).filter(Boolean).join(" ") ||
    [row.raw?.voornaam, row.raw?.achternaam].map(s).filter(Boolean).join(" ") ||
    "Onbekend"
  );
}

function reden(row: AnyRow) {
  return (
    first(
      row.reden,
      row.opmerking,
      row.beoordelings_opmerking,
      row.raw?.afmelding?.reden,
      row.raw?.afmelding_reden,
      row.raw?.reden_afmelding,
      row.raw?.reden,
    ) ||
    s(row.opmerkingen).replace(/^Afmelding:\s*/i, "") ||
    "—"
  );
}

function afgemeldAt(row: AnyRow) {
  return first(
    row.afgemeld_at,
    row.raw?.afmelding?.afgemeld_at,
    row.raw?.afgemeld_at,
    row.updated_at,
    row.created_at,
  );
}

function eventNaam(row: AnyRow) {
  return (
    first(
      row.event_naam,
      row.evenement_naam,
      row.display_event,
      row.raw?.event?.naam,
      row.raw?.event?.event_naam,
      row.raw?.evenement?.naam,
      row.raw?.evenement_naam,
      row.raw?.event_naam,
      row.raw?.wedstrijd_naam,
    ) || "—"
  );
}

function eventDatum(row: AnyRow) {
  return first(
    row.event_datum,
    row.evenement_datum,
    row.display_event_datum,
    row.raw?.event?.datum,
    row.raw?.event?.event_datum,
    row.raw?.evenement?.datum,
    row.raw?.evenement_datum,
    row.raw?.event_datum,
    row.raw?.wedstrijd_datum,
  );
}

function minPuntLabel(row: MinPuntArchiveRow) {
  const punten = Number(row.gewicht_strafpunt || 1);
  const hoek = s(row.hoek).toLowerCase() === "blauw" ? "Blauw" : "Rood";
  return `${hoek} -${punten > 0 ? punten : 1}`;
}

function gewichtLabel(row: MinPuntArchiveRow) {
  const doorgegeven = s(row.doorgegeven_gewicht);
  const gewogen = s(row.gewogen_gewicht);
  if (doorgegeven && gewogen) return `${doorgegeven} → ${gewogen}`;
  if (gewogen) return gewogen;
  if (doorgegeven) return doorgegeven;
  return "—";
}

function norm(v: unknown) {
  return s(v).toLowerCase();
}

function rowMatchesAfmelding(row: AnyRow, query: string) {
  const q = norm(query);
  if (!q) return true;

  const haystack = [
    naam(row),
    eventNaam(row),
    eventDatum(row),
    afgemeldAt(row),
    first(
      row.sportschool,
      row.gym,
      row.gym_input,
      row.fp_gym,
      row.raw?.gym,
      row.raw?.sportschool,
    ),
    first(row.va_nummer, row.raw?.va_nummer, row.raw?.va),
    row.discipline,
    row.klasse,
    row.geslacht,
    first(row.gewicht, row.raw?.gewicht),
    reden(row),
  ]
    .map(norm)
    .join(" | ");

  return haystack.includes(q);
}

function rowMatchesMinPunt(row: MinPuntArchiveRow, query: string) {
  const q = norm(query);
  if (!q) return true;

  const haystack = [
    row.evenement_naam,
    row.evenement_datum,
    row.va_nummer,
    row.naam,
    row.sportschool,
    row.partij_nr,
    row.hoek,
    row.discipline,
    row.klasse,
    row.doorgegeven_gewicht,
    row.gewogen_gewicht,
    row.gewicht_strafpunt,
    row.reden,
    row.bondteam,
    row.created_at,
  ]
    .map(norm)
    .join(" | ");

  return haystack.includes(q);
}

function SearchBox({
  activeTab,
  query,
}: {
  activeTab: "afmeldingen" | "minpunten";
  query: string;
}) {
  return (
    <form
      action="/dashboard/admin/algemeen/afmeldingen"
      className="border border-zinc-600 bg-[#121212] p-4 shadow-2xl"
    >
      {activeTab === "minpunten" ? (
        <input type="hidden" name="tab" value="minpunten" />
      ) : null}
      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
        Zoeken / filteren
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="q"
          defaultValue={query}
          placeholder={
            activeTab === "minpunten"
              ? "Zoek op evenement, naam, sportschool, VA, bondteam, gewicht..."
              : "Zoek op evenement, naam, sportschool, VA, klasse, gewicht, reden..."
          }
          className="min-h-11 flex-1 border border-zinc-600 bg-[#111] px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-zinc-500 focus:border-[#ff4d00]"
        />
        <button
          type="submit"
          className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:bg-orange-400"
        >
          Filter
        </button>
        {query ? (
          <Link
            href={
              activeTab === "minpunten"
                ? "/dashboard/admin/algemeen/afmeldingen?tab=minpunten"
                : "/dashboard/admin/algemeen/afmeldingen"
            }
            className="inline-flex items-center justify-center border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110"
          >
            Wissen
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function ExportButtons({
  activeTab,
  query,
}: {
  activeTab: "afmeldingen" | "minpunten";
  query: string;
}) {
  const q = query ? `&q=${encodeURIComponent(query)}` : "";
  const minpuntenExcel = `/api/admin/algemeen/minpunten-analyse?format=xlsx${q}`;
  const minpuntenPdf = `/api/admin/algemeen/minpunten-analyse?format=pdf${q}`;
  const afmeldingenExcel = `/api/admin/algemeen/afmeldingen-rapport?format=xlsx${q}`;
  const afmeldingenPdf = `/api/admin/algemeen/afmeldingen-rapport?format=pdf${q}`;
  const links =
    activeTab === "minpunten"
      ? [
          { href: minpuntenExcel, label: "Download minpunten" },
          { href: minpuntenPdf, label: "Download analyse" },
        ]
      : [
          { href: afmeldingenExcel, label: "Download afmeldingen" },
          { href: afmeldingenPdf, label: "Download analyse" },
        ];

  return (
    <div className="flex flex-wrap gap-3 border border-zinc-600 bg-[#121212] p-4 shadow-2xl">
      <div className="mr-auto min-w-[220px]">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
          Rapportage
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          {query
            ? "Download gebruikt hetzelfde zoekfilter."
            : "Download alle regels in dit tabblad."}
        </p>
      </div>
      {links.map((link) => (
        <AuthenticatedDownloadButton
          key={link.href}
          href={link.href}
          filename={link.href.includes("format=pdf") ? "rapport.pdf" : "rapport.xlsx"}
          className="inline-flex items-center justify-center border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110"
        >
          {link.label}
        </AuthenticatedDownloadButton>
      ))}
    </div>
  );
}

async function loadAfmeldingen() {
  const { data: rows, error } = await supabase
    .from("afmeldingen")
    .select("*")
    .order("afgemeld_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return rows ?? [];
}

async function loadMinPunten() {
  const { data, error } = await supabase
    .from("min_punten_overzicht")
    .select("*")
    .order("evenement_datum", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(10000);

  if (error) throw new Error(error.message);
  return (data ?? []) as MinPuntArchiveRow[];
}

function buildVechterSummaries(rows: MinPuntArchiveRow[]) {
  const map = new Map<string, MinPuntArchiveRow[]>();

  for (const row of rows) {
    const va = s(row.va_nummer);
    if (!va) continue;
    const list = map.get(va) ?? [];
    list.push(row);
    map.set(va, list);
  }

  const summaries: VechterSummary[] = [];

  for (const [va, list] of map.entries()) {
    const sortedAsc = [...list].sort(
      (a, b) =>
        new Date(s(a.evenement_datum || a.created_at)).getTime() -
        new Date(s(b.evenement_datum || b.created_at)).getTime(),
    );
    const sortedDesc = [...sortedAsc].reverse();
    const firstRow = sortedAsc[0];
    const lastRow = sortedDesc[0];

    summaries.push({
      va,
      naam: first(lastRow?.naam, firstRow?.naam) || "Onbekend",
      sportschool: first(lastRow?.sportschool, firstRow?.sportschool) || "—",
      totaal: list.reduce(
        (sum, r) => sum + Math.max(1, Number(r.gewicht_strafpunt || 1)),
        0,
      ),
      events: new Set(
        list.map((r) => `${s(r.evenement_datum)}::${s(r.evenement_naam)}`),
      ),
      eersteDatum: s(firstRow?.evenement_datum || firstRow?.created_at),
      laatsteDatum: s(lastRow?.evenement_datum || lastRow?.created_at),
      gemiddeldeDagen: avgDaysBetween(sortedAsc),
      laatsteRows: sortedDesc.slice(0, 5),
    });
  }

  return summaries.sort((a, b) => {
    if (b.totaal !== a.totaal) return b.totaal - a.totaal;
    return (
      new Date(b.laatsteDatum).getTime() - new Date(a.laatsteDatum).getTime()
    );
  });
}

function buildEventGroups(rows: MinPuntArchiveRow[]) {
  const map = new Map<string, EventGroup>();

  for (const row of rows) {
    const datum = s(row.evenement_datum);
    const naam = s(row.evenement_naam) || "Onbekend evenement";
    const key = `${datum || "geen-datum"}::${naam}`;
    const existing = map.get(key) ?? { key, naam, datum, rows: [] };
    existing.rows.push(row);
    map.set(key, existing);
  }

  return [...map.values()].sort(
    (a, b) =>
      new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime(),
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center border px-3 py-2 text-xs font-black uppercase transition",
        active
          ? "border-[#ff4d00] bg-[#ff4d00] !text-black"
          : "border-zinc-500 bg-[#242424] text-white hover:border-[#ff4d00]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function AfmeldingenTable({ rows }: { rows: AnyRow[] }) {
  return (
    <div className="overflow-hidden border border-zinc-500 bg-[#121212] shadow-2xl">
      <div className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] px-5 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-300">
          Afgemelde deelnemers
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
              <th className="px-4 py-4">Afgemeld</th>
              <th className="px-4 py-4">Evenement</th>
              <th className="px-4 py-4">Datum</th>
              <th className="px-4 py-4">Naam</th>
              <th className="px-4 py-4">Sportschool</th>
              <th className="px-4 py-4">VA</th>
              <th className="px-4 py-4">Klasse</th>
              <th className="px-4 py-4">Gewicht</th>
              <th className="px-4 py-4">Reden</th>
              <th className="px-4 py-4">Actie</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-zinc-300"
                >
                  Geen afmeldingen gevonden.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const dark = index % 2 === 0;
                return (
                  <tr
                    key={row.id}
                    className={
                      dark
                        ? "bg-[#171717] text-white"
                        : "bg-white text-black"
                    }
                  >
                    <td className="border border-zinc-800 px-4 py-3 font-semibold">
                      {fmtDateTime(afgemeldAt(row))}
                    </td>
                    <td className="border border-zinc-800 px-4 py-3 font-black text-[#ff4d00]">
                      {eventNaam(row)}
                    </td>
                    <td className="border border-zinc-800 px-4 py-3">
                      {fmtDate(eventDatum(row))}
                    </td>
                    <td className="border border-zinc-800 px-4 py-3 font-black text-[#ff4d00]">
                      {naam(row)}
                    </td>
                    <td className="border border-zinc-800 px-4 py-3">
                      {first(
                        row.sportschool,
                        row.gym,
                        row.gym_input,
                        row.fp_gym,
                        row.raw?.gym,
                        row.raw?.sportschool,
                      ) || "—"}
                    </td>
                    <td className="border border-zinc-800 px-4 py-3 font-mono">
                      {first(row.va_nummer, row.raw?.va_nummer, row.raw?.va) ||
                        "—"}
                    </td>
                    <td className="border border-zinc-800 px-4 py-3">
                      {[row.discipline, row.klasse, row.geslacht]
                        .map(s)
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </td>
                    <td className="border border-zinc-800 px-4 py-3">
                      {first(row.gewicht, row.raw?.gewicht) || "—"}
                    </td>
                    <td className="max-w-[340px] border border-zinc-800 px-4 py-3">
                      <span className="line-clamp-3 whitespace-pre-line">
                        {reden(row)}
                      </span>
                    </td>
                    <td className="border border-zinc-800 px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {s(row.matchmaking_id) ? (
                          <Link
                            href={`/dashboard/admin/algemeen/afmeldingen/${row.id}`}
                            className="inline-flex border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black uppercase !text-black"
                          >
                            Open
                          </Link>
                        ) : null}

                        <form action={deleteAfmeldingFromPage}>
                          <input type="hidden" name="afmelding_id" value={s(row.id)} />
                          <button
                            type="submit"
                            className="inline-flex border border-red-500 bg-red-700 px-3 py-1 text-xs font-black uppercase !text-white"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MinPuntenPanel({ rows }: { rows: MinPuntArchiveRow[] }) {
  const eventGroups = buildEventGroups(rows);
  const vechters = buildVechterSummaries(rows);
  const totaalPunten = rows.reduce(
    (sum, r) => sum + Math.max(1, Number(r.gewicht_strafpunt || 1)),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
          <p className="text-xs uppercase text-zinc-400">Totaal minpunten</p>
          <p className="mt-1 text-2xl font-black text-[#ff4d00]">
            {totaalPunten}
          </p>
        </div>
        <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
          <p className="text-xs uppercase text-zinc-400">Vechters</p>
          <p className="mt-1 text-2xl font-black text-[#ff4d00]">
            {vechters.length}
          </p>
        </div>
        <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
          <p className="text-xs uppercase text-zinc-400">Evenementen</p>
          <p className="mt-1 text-2xl font-black text-[#ff4d00]">
            {eventGroups.length}
          </p>
        </div>
        <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
          <p className="text-xs uppercase text-zinc-400">Signaal</p>
          <p className="mt-1 text-sm text-zinc-300">
            Download de analyse om veelplegers en patronen te beoordelen.
          </p>
        </div>
      </div>

      <div className="overflow-hidden border border-zinc-500 bg-[#121212] shadow-2xl">
        <div className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-300">
            Per evenement
          </p>
        </div>
        <div className="divide-y divide-zinc-700">
          {eventGroups.length === 0 ? (
            <div className="px-4 py-12 text-center text-zinc-300">
              Geen evenementen met minpunten gevonden.
            </div>
          ) : (
            eventGroups.map((group) => (
              <div key={group.key} className="p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                      {fmtDate(group.datum)}
                    </p>
                    <h2 className="text-2xl font-black uppercase text-white">
                      {group.naam}
                    </h2>
                  </div>
                  <p className="border border-zinc-500 bg-[#242424] px-3 py-2 text-xs font-black uppercase text-zinc-100">
                    {group.rows.length} minpunt
                    {group.rows.length === 1 ? "" : "en"}
                  </p>
                </div>
                <div className="overflow-x-auto border border-zinc-700">
                  <table className="w-full min-w-[980px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
                        <th className="px-4 py-3">Partij</th>
                        <th className="px-4 py-3">Hoek</th>
                        <th className="px-4 py-3">VA</th>
                        <th className="px-4 py-3">Naam</th>
                        <th className="px-4 py-3">Sportschool</th>
                        <th className="px-4 py-3">Gewicht</th>
                        <th className="px-4 py-3">Min punt</th>
                        <th className="px-4 py-3">Bondteam</th>
                        <th className="px-4 py-3">Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row, index) => (
                        <tr
                          key={row.id}
                          className={
                            index % 2 === 0
                              ? "bg-[#171717] text-white"
                              : "bg-white text-black"
                          }
                        >
                          <td className="border border-zinc-800 px-4 py-2 font-black text-[#ff4d00]">
                            {row.partij_nr ?? "—"}
                          </td>
                          <td className="border border-zinc-800 px-4 py-2 font-black text-[#ff4d00]">
                            {s(row.hoek) || "—"}
                          </td>
                          <td className="border border-zinc-800 px-4 py-2 font-mono">
                            {row.va_nummer}
                          </td>
                          <td className="border border-zinc-800 px-4 py-2 font-black text-[#ff4d00]">
                            {row.naam || "Onbekend"}
                          </td>
                          <td className="border border-zinc-800 px-4 py-2">
                            {row.sportschool || "—"}
                          </td>
                          <td className="border border-zinc-800 px-4 py-2">
                            {gewichtLabel(row)}
                          </td>
                          <td className="border border-zinc-800 px-4 py-2 font-black text-[#ff4d00]">
                            {minPuntLabel(row)}
                          </td>
                          <td className="border border-zinc-800 px-4 py-2 font-black text-[#ff4d00]">
                            {row.bondteam || "—"}
                          </td>
                          <td className="border border-zinc-800 px-4 py-2">
                            <Link
                              href={`/dashboard/admin/algemeen/afmeldingen/minpunten/${encodeURIComponent(s(row.va_nummer))}`}
                              className="inline-flex border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black uppercase !text-black"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default async function AdminAfmeldingenPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ tab?: string; q?: string }>
    | { tab?: string; q?: string };
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const activeTab =
    resolvedSearchParams?.tab === "minpunten" ? "minpunten" : "afmeldingen";
  const query = s(resolvedSearchParams?.q);
  const [rows, minPunten] = await Promise.all([
    loadAfmeldingen(),
    loadMinPunten(),
  ]);
  const filteredRows = query
    ? rows.filter((row) => rowMatchesAfmelding(row, query))
    : rows;
  const filteredMinPunten = query
    ? minPunten.filter((row) => rowMatchesMinPunt(row, query))
    : minPunten;

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / Algemeen
              </p>
              <h1 className="text-2xl font-black uppercase">Afmeldingen</h1>
              <p className="text-sm text-zinc-300">
                Overzicht van afgemelde vechters en minpunten vanuit de weging.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/admin/administratie"
                className="border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110"
              >
                Terug naar administratie
              </Link>
              <div className="border border-zinc-600 bg-[#1c1c1c] px-4 py-2 text-right">
                <p className="text-xs uppercase text-zinc-400">
                  {activeTab === "minpunten" ? "Minpunten" : "Totaal"}
                </p>
                <p className="text-xl font-black text-[#ff4d00]">
                  {activeTab === "minpunten"
                    ? filteredMinPunten.length
                    : filteredRows.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 p-4 pb-0">
          <TabLink
            href="/dashboard/admin/algemeen/afmeldingen"
            active={activeTab === "afmeldingen"}
          >
            Afmeldingen
          </TabLink>
          <TabLink
            href="/dashboard/admin/algemeen/afmeldingen?tab=minpunten"
            active={activeTab === "minpunten"}
          >
            Min punten
          </TabLink>
        </div>

        <div className="p-4">
          <SearchBox activeTab={activeTab} query={query} />
        </div>
        <div className="px-4 pb-4">
          <ExportButtons activeTab={activeTab} query={query} />
        </div>

        <div className="p-4 pt-0">
          {activeTab === "minpunten" ? (
            <MinPuntenPanel rows={filteredMinPunten} />
          ) : (
            <AfmeldingenTable rows={filteredRows} />
          )}
        </div>
      </section>
    </main>
  );
}
