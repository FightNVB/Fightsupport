import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(v: unknown) {
  return String(v ?? "").trim();
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

function naam(row: AnyRow) {
  return (
    s(row.naam) ||
    [row.voornaam, row.achternaam].map(s).filter(Boolean).join(" ") ||
    s(row.raw?.naam) ||
    "Onbekend"
  );
}

function reden(row: AnyRow) {
  return (
    s(row.raw?.afmelding?.reden) ||
    s(row.raw?.afmelding_reden) ||
    s(row.opmerkingen).replace(/^Afmelding:\s*/i, "") ||
    "—"
  );
}

function afgemeldAt(row: AnyRow) {
  return s(row.raw?.afmelding?.afgemeld_at) || s(row.raw?.afgemeld_at) || s(row.updated_at) || s(row.created_at);
}

async function loadAfmeldingen() {
  const { data: rows, error } = await supabase
    .from("aanmeldingen")
    .select(
      "id, matchmaking_id, status, updated_at, created_at, raw, opmerkingen, naam, voornaam, achternaam, va_nummer, gym, discipline, klasse, geslacht, gewicht, raw_filename",
    )
    .eq("status", "afgemeld")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const list = rows ?? [];
  const matchmakingIds = Array.from(new Set(list.map((r) => s(r.matchmaking_id)).filter(Boolean)));

  let mmById = new Map<string, AnyRow>();
  if (matchmakingIds.length) {
    const { data: matchmakings } = await supabase
      .from("matchmakings")
      .select("id, naam, datum, event_datum")
      .in("id", matchmakingIds);

    mmById = new Map((matchmakings ?? []).map((m) => [s(m.id), m]));
  }

  return list.map((row) => ({ ...row, matchmaking: mmById.get(s(row.matchmaking_id)) ?? null }));
}

export default async function AdminAfmeldingenPage() {
  const rows = await loadAfmeldingen();

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-white/15 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-5 shadow-[0_0_45px_rgba(255,77,0,0.18)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#ff4d00]">Admin algemeen</p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
                Afmeldingen
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-300">
                Overzicht van vechters met status <span className="font-bold text-white">afgemeld</span>, inclusief reden en eventgegevens.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Totaal</p>
              <p className="text-3xl font-black text-[#ff4d00]">{rows.length}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/15 bg-zinc-950 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-zinc-200 via-white to-zinc-300 text-left text-xs font-black uppercase tracking-[0.18em] text-black">
                  <th className="px-4 py-4">Afgemeld</th>
                  <th className="px-4 py-4">Event</th>
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
                    <td colSpan={10} className="px-4 py-10 text-center text-zinc-400">
                      Geen afmeldingen gevonden.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const mm = row.matchmaking;
                    const eventNaam = s(mm?.naam) || "—";
                    const eventDatum = s(mm?.event_datum) || s(mm?.datum);

                    return (
                      <tr
                        key={row.id}
                        className={index % 2 === 0 ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-950"}
                      >
                        <td className="px-4 py-4 font-semibold">{fmtDateTime(afgemeldAt(row))}</td>
                        <td className="px-4 py-4 font-black">{eventNaam}</td>
                        <td className="px-4 py-4">{fmtDate(eventDatum)}</td>
                        <td className="px-4 py-4 font-black">{naam(row)}</td>
                        <td className="px-4 py-4">{s(row.gym) || "—"}</td>
                        <td className="px-4 py-4 font-mono">{s(row.va_nummer) || "—"}</td>
                        <td className="px-4 py-4">{[row.discipline, row.klasse, row.geslacht].map(s).filter(Boolean).join(" / ") || "—"}</td>
                        <td className="px-4 py-4">{s(row.gewicht) || "—"}</td>
                        <td className="max-w-[340px] px-4 py-4">
                          <span className="line-clamp-3 whitespace-pre-line">{reden(row)}</span>
                        </td>
                        <td className="px-4 py-4">
                          {s(row.matchmaking_id) ? (
                            <Link
                              href={`/dashboard/admin/matchmaking/${row.matchmaking_id}`}
                              className="inline-flex rounded-xl border border-[#ff4d00]/60 bg-[#ff4d00] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_0_18px_rgba(255,77,0,0.35)]"
                            >
                              Open
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
