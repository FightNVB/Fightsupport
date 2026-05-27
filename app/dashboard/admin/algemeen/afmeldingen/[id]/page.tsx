import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import AfmeldingActions from "./AfmeldingActions";

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
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
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

function statusLabel(status: unknown) {
  const x = s(status).toLowerCase();
  if (x === "goedgekeurd") return "Goedgekeurd";
  if (x === "afgekeurd") return "Afgekeurd";
  return "Open";
}

function statusClass(status: unknown) {
  const x = s(status).toLowerCase();
  if (x === "goedgekeurd") return "border-emerald-300 bg-emerald-100 text-emerald-900";
  if (x === "afgekeurd") return "border-red-300 bg-red-100 text-red-900";
  return "border-[#ff4d00]/50 bg-[#ff4d00]/15 text-[#ff4d00]";
}

function naam(row: AnyRow) {
  return first(row.naam, row.naam_input, row.fp_naam) || [row.voornaam, row.achternaam].map(s).filter(Boolean).join(" ") || "Onbekend";
}

function reden(row: AnyRow) {
  return first(row.reden, row.opmerking, row.raw?.afmelding?.reden, row.raw?.afmelding_reden) || "—";
}

async function loadAfmelding(id: string) {
  const { data: row, error } = await supabase.from("afmeldingen").select("*").eq("id", id).maybeSingle();
  if (error || !row) return null;

  const va = s(row.va_nummer);
  const inschrijvingId = s(row.inschrijving_id);
  const orParts = [va ? `va_nummer.eq.${va}` : "", inschrijvingId ? `inschrijving_id.eq.${inschrijvingId}` : ""].filter(Boolean);

  const { data: historie } = orParts.length
    ? await supabase
        .from("afmeldingen")
        .select("id, status, naam, sportschool, va_nummer, reden, afgemeld_at, event_naam, event_datum, klasse, discipline, matchmaker_naam, matchmaker_email")
        .or(orParts.join(","))
        .order("afgemeld_at", { ascending: false })
    : { data: [] as AnyRow[] };

  return { ...row, historie: historie ?? [] };
}

function InfoCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(0,0,0,0.42))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff4d00]">{label}</p>
      <p className="mt-2 whitespace-nowrap text-base font-bold text-white">{s(value) || "—"}</p>
    </div>
  );
}

export default async function AfmeldingDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await params;
  const row = await loadAfmelding(resolvedParams.id);
  if (!row) notFound();

  const historie = Array.isArray(row.historie) ? row.historie : [];
  const eerdereAfmeldingen = historie.filter((item: AnyRow) => item.id !== row.id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,77,0,0.18),transparent_34%),linear-gradient(135deg,#f7f7f7_0%,#d8d8d8_14%,#101010_42%,#050505_100%)] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto max-w-[1500px] space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.20),rgba(115,115,115,0.10)_34%,rgba(0,0,0,0.82)_100%)] p-[1px] shadow-[0_0_55px_rgba(255,77,0,0.24)]">
          <div className="relative rounded-[29px] bg-[linear-gradient(135deg,#f2f2f2_0%,#9b9b9b_18%,#202020_43%,#060606_100%)] p-5 sm:p-6">
            <img src="/branding/fightsupport/excel-logo.png" alt="FightSupport" className="mx-auto mb-4 h-24 w-auto object-contain" />

            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="text-center lg:text-left">
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#ff4d00]">Admin algemeen</p>
                <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-5xl">Afmelding detail</h1>
                <p className="mt-2 text-sm font-medium text-zinc-200">
                  {first(row.event_naam)} · {fmtDate(row.event_datum)}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-end">
                <Link href="/dashboard/admin/algemeen/afmeldingen" className="inline-flex items-center justify-center rounded-2xl border border-white/55 bg-[linear-gradient(135deg,#ffffff,#e9e9e9_45%,#bdbdbd)] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                  ← Terug naar afmeldingen
                </Link>
                <Link href="/dashboard/admin" className="inline-flex items-center justify-center rounded-2xl border border-[#ff4d00]/65 bg-[#ff4d00] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[0_0_20px_rgba(255,77,0,0.30)]">
                  Terug naar admin
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/25 bg-black/75 p-5 shadow-2xl ring-1 ring-[#ff4d00]/20">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff4d00]">Afmelding</p>
              <h2 className="mt-1 text-2xl font-black uppercase text-white">{naam(row)}</h2>
            </div>
            <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${statusClass(row.status)}`}>{statusLabel(row.status)}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Naam" value={naam(row)} />
            <InfoCard label="Sportschool" value={row.sportschool} />
            <InfoCard label="VA nummer" value={row.va_nummer} />
            <InfoCard label="Afgemeld op" value={fmtDateTime(row.afgemeld_at ?? row.created_at)} />
            <InfoCard label="Evenement" value={row.event_naam} />
            <InfoCard label="Evenementdatum" value={fmtDate(row.event_datum)} />
            <InfoCard label="Matchmaker" value={first(row.matchmaker_naam, row.matchmaker_email, row.matchmaker_user_id)} />
            <InfoCard label="Klasse" value={row.klasse} />
            <InfoCard label="Discipline" value={row.discipline} />
            <InfoCard label="Geslacht" value={row.geslacht} />
            <InfoCard label="Gewicht" value={row.gewicht} />
            <InfoCard label="Geboortedatum" value={fmtDate(row.geboortedatum)} />
          </div>

          <div className="mt-5 rounded-2xl border border-[#ff4d00]/35 bg-[#ff4d00]/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff4d00]">Reden afmelding</p>
            <p className="mt-2 whitespace-pre-line text-lg font-semibold text-white">{reden(row)}</p>
          </div>

          <AfmeldingActions id={row.id} status={row.status} />
        </div>

        <div className="rounded-[24px] border border-white/25 bg-white p-5 text-zinc-950 shadow-2xl ring-1 ring-[#ff4d00]/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff4d00]">Historie</p>
              <h2 className="text-2xl font-black uppercase">Vaker afgemeld</h2>
            </div>
            <span className="rounded-full border border-zinc-300 bg-zinc-100 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-800">
              {eerdereAfmeldingen.length ? `${eerdereAfmeldingen.length} eerdere` : "Geen eerdere"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1350px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-zinc-950 text-white">
                  {[
                    "Wanneer",
                    "Status",
                    "Naam",
                    "Sportschool",
                    "VA",
                    "Discipline",
                    "Klasse",
                    "Reden",
                    "Evenement",
                    "Datum",
                    "Matchmaker",
                  ].map((head) => (
                    <th key={head} className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase tracking-[0.14em] first:rounded-l-xl last:rounded-r-xl">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historie.map((item: AnyRow) => (
                  <tr key={item.id} className="odd:bg-zinc-100 even:bg-white">
                    <td className="whitespace-nowrap px-4 py-3 font-bold">{fmtDateTime(item.afgemeld_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 font-black">{naam(item)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{first(item.sportschool)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold">{first(item.va_nummer)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{first(item.discipline)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{first(item.klasse)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{reden(item)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{first(item.event_naam)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{fmtDate(item.event_datum)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{first(item.matchmaker_naam, item.matchmaker_email)}</td>
                  </tr>
                ))}
                {!historie.length && (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center font-bold text-zinc-500">Geen afmeldhistorie gevonden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
