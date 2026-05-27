import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
  tegenstander_va: string | null;
  tegenstander_naam: string | null;
  tegenstander_sportschool: string | null;
  matchmaking_id: string | null;
  weigh_in_bout_id: string | null;
  created_at: string | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

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

function minDaysBetween(rows: MinPuntArchiveRow[]) {
  const dates = rows
    .map((r) => s(r.evenement_datum || r.created_at))
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (dates.length < 2) return null;

  let min: number | null = null;
  for (let i = 1; i < dates.length; i++) {
    const d = diffDays(dates[i - 1], dates[i]);
    if (d === null) continue;
    min = min === null ? d : Math.min(min, d);
  }
  return min;
}

function uniqueEvents(rows: MinPuntArchiveRow[]) {
  return new Set(rows.map((r) => `${s(r.evenement_datum)}::${s(r.evenement_naam)}`)).size;
}

function inLastDays(rows: MinPuntArchiveRow[], days: number) {
  const now = Date.now();
  const maxMs = days * 86_400_000;
  return rows.filter((r) => {
    const raw = s(r.evenement_datum || r.created_at);
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) return false;
    return now - t <= maxMs;
  });
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

async function loadMinPuntenForVechter(va: string) {
  const cleanVa = decodeURIComponent(va).replace(/\D/g, "") || decodeURIComponent(va);

  const { data, error } = await supabase
    .from("min_punten_overzicht")
    .select("*")
    .eq("va_nummer", cleanVa)
    .order("evenement_datum", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as MinPuntArchiveRow[];
}

function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-black/65 p-5 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#ff4d00]">{value}</p>
      {note ? <p className="mt-1 text-xs font-semibold text-zinc-300">{note}</p> : null}
    </div>
  );
}

export default async function MinPuntenVechterDetailPage({ params }: { params: Promise<{ va: string }> | { va: string } }) {
  const resolvedParams = await params;
  const rows = await loadMinPuntenForVechter(resolvedParams.va);

  const sortedAsc = [...rows].sort(
    (a, b) => new Date(s(a.evenement_datum || a.created_at)).getTime() - new Date(s(b.evenement_datum || b.created_at)).getTime(),
  );
  const sortedDesc = [...sortedAsc].reverse();
  const firstRow = sortedAsc[0];
  const lastRow = sortedDesc[0];

  const va = decodeURIComponent(resolvedParams.va).replace(/\D/g, "") || decodeURIComponent(resolvedParams.va);
  const naam = first(lastRow?.naam, firstRow?.naam) || "Onbekend";
  const sportschool = first(lastRow?.sportschool, firstRow?.sportschool) || "—";
  const totaalPunten = rows.reduce((sum, r) => sum + Math.max(1, Number(r.gewicht_strafpunt || 1)), 0);
  const avgDays = avgDaysBetween(sortedAsc);
  const minDays = minDaysBetween(sortedAsc);
  const laatste90 = inLastDays(rows, 90).length;
  const laatste180 = inLastDays(rows, 180).length;
  const laatste365 = inLastDays(rows, 365).length;
  const waarschuwingen = [
    laatste90 >= 2 ? "2 of meer minpunten binnen 90 dagen" : "",
    laatste180 >= 3 ? "3 of meer minpunten binnen 180 dagen" : "",
    totaalPunten >= 5 ? "5 of meer minpunten totaal" : "",
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,77,0,0.18),transparent_34%),linear-gradient(135deg,#f7f7f7_0%,#d8d8d8_14%,#101010_42%,#050505_100%)] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.20),rgba(115,115,115,0.10)_34%,rgba(0,0,0,0.82)_100%)] p-[1px] shadow-[0_0_55px_rgba(255,77,0,0.24)]">
          <div className="rounded-[29px] bg-[linear-gradient(135deg,#f2f2f2_0%,#9b9b9b_18%,#202020_43%,#060606_100%)] p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="text-center lg:text-left">
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#ff4d00] drop-shadow-[0_0_8px_rgba(255,77,0,0.55)]">
                  Min punten detail
                </p>
                <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-5xl">
                  {naam}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-200">
                  VA {va} · {sportschool}
                </p>
              </div>

              <img src="/branding/fightsupport/excel-logo.png" alt="FightSupport" className="mx-auto h-28 w-auto shrink-0 object-contain" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
                <Link href="/dashboard/admin/algemeen/afmeldingen?tab=minpunten" className="inline-flex items-center justify-center rounded-2xl border border-white/55 bg-[linear-gradient(135deg,#ffffff,#e9e9e9_45%,#bdbdbd)] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_0_20px_rgba(255,255,255,0.20)] transition hover:scale-[1.01]">
                  ← Terug naar min punten
                </Link>

                <div className="rounded-2xl border border-[#ff4d00]/45 bg-black/45 px-5 py-3 text-right shadow-[0_0_22px_rgba(255,77,0,0.22)]">
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-300">Totaal</p>
                  <p className="text-3xl font-black text-[#ff4d00]">{totaalPunten}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-[24px] border border-white/25 bg-black/75 p-10 text-center text-zinc-300 shadow-2xl ring-1 ring-[#ff4d00]/20">
            Geen minpunten gevonden voor VA {va}.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Totaal minpunten" value={totaalPunten} />
              <StatCard label="Evenementen" value={uniqueEvents(rows)} />
              <StatCard label="Eerste minpunt" value={fmtDate(firstRow?.evenement_datum || firstRow?.created_at)} />
              <StatCard label="Laatste minpunt" value={fmtDate(lastRow?.evenement_datum || lastRow?.created_at)} />
              <StatCard label="Gemiddelde tussenruimte" value={avgDays === null ? "—" : `${avgDays} dagen`} />
              <StatCard label="Kortste tussenruimte" value={minDays === null ? "—" : `${minDays} dagen`} />
              <StatCard label="Laatste 90 dagen" value={laatste90} />
              <StatCard label="Laatste 12 maanden" value={laatste365} />
            </div>

            {waarschuwingen.length ? (
              <div className="rounded-[24px] border border-[#ff4d00]/60 bg-[#ff4d00]/15 p-5 shadow-[0_0_28px_rgba(255,77,0,0.20)]">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ff4d00]">Signaal</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {waarschuwingen.map((w) => (
                    <span key={w} className="rounded-xl bg-[#ff4d00] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[24px] border border-white/25 bg-black/75 shadow-2xl ring-1 ring-[#ff4d00]/20">
              <div className="border-b border-white/15 bg-[linear-gradient(90deg,rgba(255,255,255,0.18),rgba(255,77,0,0.16),rgba(255,255,255,0.08))] px-5 py-3">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-100">Historie per evenement</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-[linear-gradient(135deg,#ffffff,#d6d6d6_44%,#9a9a9a)] text-left text-xs font-black uppercase tracking-[0.16em] text-black">
                      <th className="px-4 py-4">Datum</th>
                      <th className="px-4 py-4">Evenement</th>
                      <th className="px-4 py-4">Partij</th>
                      <th className="px-4 py-4">Hoek</th>
                      <th className="px-4 py-4">Discipline / klasse</th>
                      <th className="px-4 py-4">Gewicht</th>
                      <th className="px-4 py-4">Min punt</th>
                      <th className="px-4 py-4">Bondteam</th>
                      <th className="px-4 py-4">Reden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDesc.map((row, index) => (
                      <tr key={row.id} className={index % 2 === 0 ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-950"}>
                        <td className="border-t border-white/10 px-4 py-4 font-semibold">{fmtDate(row.evenement_datum || row.created_at)}</td>
                        <td className="border-t border-white/10 px-4 py-4 font-black">{row.evenement_naam || "—"}</td>
                        <td className="border-t border-white/10 px-4 py-4 font-black">{row.partij_nr ?? "—"}</td>
                        <td className="border-t border-white/10 px-4 py-4">{s(row.hoek) || "—"}</td>
                        <td className="border-t border-white/10 px-4 py-4">{[row.discipline, row.klasse].map(s).filter(Boolean).join(" / ") || "—"}</td>
                        <td className="border-t border-white/10 px-4 py-4">{gewichtLabel(row)}</td>
                        <td className="border-t border-white/10 px-4 py-4 font-black text-[#ff4d00]">{minPuntLabel(row)}</td>
                        <td className="border-t border-white/10 px-4 py-4 font-black">{row.bondteam || "—"}</td>
                        <td className="max-w-[340px] border-t border-white/10 px-4 py-4"><span className="line-clamp-3 whitespace-pre-line">{row.reden || "—"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
