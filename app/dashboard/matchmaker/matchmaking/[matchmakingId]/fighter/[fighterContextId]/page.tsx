"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Inter, Bebas_Neue } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

const NVB_ORANGE = "#ff4d00";

type AnyRow = Record<string, any>;

type FighterContextRow = {
  id: string;
  matchmaking_id: string;
  controle_run_id: string | null;
  row_nr: number | null;
  va_nummer: string | number | null;
  naam: string | null;
  geboortedatum: string | null;
  geslacht: string | null;
  licentie: string | null;
  heeft_startverbod: string | null;
  totaal_wedstrijden: number | null;
  gewonnen: number | null;
  nulmeting_totaal: number | null;
  nulmeting_opmerking: string | null;
  nulmeting_klasse: string | null;
  updated_at: string | null;
  scraped_at: string | null;
};

type SignupRow = {
  id: string | number;
  row_nr: number | null;
  matchmaking_id: string;
  discipline: string | null;
  klasse: string | null;
  geslacht: string | null;
  voornaam: string | null;
  achternaam: string | null;
  email: string | null;
  telefoon: string | null;
  gym: string | null;
  va_nummer: string | null;
  geboortedatum: string | null;
  gewicht: string | number | null;
  opmerkingen: string | null;
  trainer_naam: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
};

type BoutLinkRow = {
  partij_nr: number | null;
  discipline: string | null;
  klasse_mm: string | null;
  rood_naam_mm: string | null;
  blauw_naam_mm: string | null;
  rood_va_mm: string | null;
  blauw_va_mm: string | null;
  rood_gym_mm: string | null;
  blauw_gym_mm: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
};

type ControleResultaatRow = {
  id: string;
  partij_nr: number | null;
  rule: string | null;
  rule_code: string | null;
  resultaat: string | null;
  boodschap: string | null;
  created_at: string | null;
  hoek: string | null;
  review_status: string | null;
  aantekeningen: string | null;
  severity: string | null;
};

function pageBg(): CSSProperties {
  return {
    background:
      "radial-gradient(1100px 600px at 15% 0%, rgba(255,77,0,0.16), transparent 55%), radial-gradient(900px 520px at 85% 10%, rgba(255,255,255,0.12), transparent 52%), linear-gradient(180deg, #202225 0%, #0f1012 100%)",
  };
}

function steelCard(accent: "orange" | "red" | "blue" = "orange"): CSSProperties {
  const glow = accent === "red" ? "rgba(239,68,68,0.32)" : accent === "blue" ? "rgba(59,130,246,0.28)" : "rgba(255,77,0,0.30)";
  return {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(228,231,235,0.98) 52%, rgba(190,194,200,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: `0 18px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.65), 0 0 0 1px ${glow}`,
  };
}

function darkPanel(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, rgba(36,39,43,0.98) 0%, rgba(21,23,26,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 36px rgba(0,0,0,0.32)",
  };
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(d);
}

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function fullName(signup: SignupRow | null, ctx: FighterContextRow | null) {
  const fromSignup = [signup?.voornaam, signup?.achternaam].filter(Boolean).join(" ").trim();
  return fromSignup || String(ctx?.naam ?? "").trim() || "-";
}

function badgeTone(resultaat: string | null | undefined) {
  const r = norm(resultaat);
  if (r === "afgekeurd") return "bg-red-600 text-white";
  if (r === "dispensatie") return "bg-amber-500 text-black";
  if (r === "ok") return "bg-emerald-600 text-white";
  return "bg-[var(--brand-orange)] text-black";
}

export default function FighterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchmakingId = String(params?.matchmakingId ?? "");
  const rowNr = useMemo(() => {
    const raw = Number(params?.rowNr ?? params?.fighterRowNr ?? null);
    return Number.isFinite(raw) ? raw : null;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fighterCtx, setFighterCtx] = useState<FighterContextRow | null>(null);
  const [signup, setSignup] = useState<SignupRow | null>(null);
  const [bouts, setBouts] = useState<BoutLinkRow[]>([]);
  const [meldingen, setMeldingen] = useState<ControleResultaatRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!matchmakingId || !rowNr) {
        setError("Ongeldige parameters (matchmakingId / rowNr).");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [{ data: ctxRows, error: ctxErr }, { data: insRows, error: insErr }, { data: rawRows, error: rawErr }] = await Promise.all([
          supabase
            .from("matchmaker_fighter_context")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("row_nr", rowNr)
            .order("updated_at", { ascending: false })
            .limit(1),
          supabase
            .from("matchmaker_inschrijvingen")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("row_nr", rowNr)
            .limit(1),
          supabase
            .from("matchmaker_uitslagen_raw")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("row_nr", rowNr)
            .limit(1),
        ]);

        if (ctxErr) throw ctxErr;
        if (insErr) throw insErr;
        if (rawErr) throw rawErr;

        const ctxRow = (ctxRows?.[0] ?? null) as FighterContextRow | null;
        const signupRow = ((insRows?.[0] ?? rawRows?.[0]) ?? null) as SignupRow | null;

        setFighterCtx(ctxRow);
        setSignup(signupRow);

        const va = String(ctxRow?.va_nummer ?? signupRow?.va_nummer ?? "").trim();
        const naam = fullName(signupRow, ctxRow);
        const runId = String(ctxRow?.controle_run_id ?? "").trim() || null;

        let boutRows: BoutLinkRow[] = [];
        if (runId) {
          const { data: linkedBouts, error: boutErr } = await supabase
            .from("controle_bout_context")
            .select("partij_nr, discipline, klasse_mm, rood_naam_mm, blauw_naam_mm, rood_va_mm, blauw_va_mm, rood_gym_mm, blauw_gym_mm, evenement_naam, evenement_datum")
            .eq("matchmaking_id", matchmakingId)
            .eq("controle_run_id", runId)
            .or([
              va ? `rood_va_mm.eq.${va}` : null,
              va ? `blauw_va_mm.eq.${va}` : null,
              naam && naam !== "-" ? `rood_naam_mm.ilike.%${naam.replace(/,/g, "")}%` : null,
              naam && naam !== "-" ? `blauw_naam_mm.ilike.%${naam.replace(/,/g, "")}%` : null,
            ].filter(Boolean).join(","))
            .order("partij_nr", { ascending: true });

          if (boutErr) throw boutErr;
          boutRows = (linkedBouts ?? []) as BoutLinkRow[];
        }
        setBouts(boutRows);

        const partijNrs = Array.from(new Set(boutRows.map((b) => Number(b.partij_nr)).filter((n) => Number.isFinite(n) && n > 0)));
        if (runId && partijNrs.length > 0) {
          const { data: meldingRows, error: meldErr } = await supabase
            .from("controle_resultaten")
            .select("id, partij_nr, rule, rule_code, resultaat, boodschap, created_at, hoek, review_status, aantekeningen, severity")
            .eq("controle_run_id", runId)
            .in("partij_nr", partijNrs)
            .order("partij_nr", { ascending: true })
            .order("created_at", { ascending: true });

          if (meldErr) throw meldErr;

          const filtered = ((meldingRows ?? []) as ControleResultaatRow[]).filter((row) => {
            const partij = Number(row.partij_nr ?? 0);
            const bout = boutRows.find((b) => Number(b.partij_nr ?? 0) === partij);
            if (!bout) return false;
            const hoek = norm(row.hoek);
            if (!hoek) return true;
            if (hoek === "rood") {
              return norm(bout.rood_va_mm) === norm(va) || norm(bout.rood_naam_mm) === norm(naam);
            }
            if (hoek === "blauw") {
              return norm(bout.blauw_va_mm) === norm(va) || norm(bout.blauw_naam_mm) === norm(naam);
            }
            return true;
          });

          setMeldingen(filtered);
        } else {
          setMeldingen([]);
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [matchmakingId, rowNr]);

  const name = fullName(signup, fighterCtx);
  const vaNummer = String(fighterCtx?.va_nummer ?? signup?.va_nummer ?? "-");

  return (
    <div className={`${inter.className} min-h-screen text-zinc-100`} style={{ ...pageBg(), ["--brand-orange" as any]: NVB_ORANGE }}>
      <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-white/15 bg-black/30 px-4 py-2 text-sm font-semibold text-white hover:bg-black/40"
          >
            ← Terug
          </button>
          <div className="rounded-full bg-[var(--brand-orange)]/15 px-3 py-1 text-xs font-extrabold tracking-[0.22em] text-[var(--brand-orange)]">
            FIGHTER DETAIL
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px]" style={darkPanel()}>
          <div className="grid gap-5 p-5 md:grid-cols-[260px_minmax(0,1fr)] md:p-6">
            <div className="rounded-[24px] p-4" style={steelCard("orange")}>
              <div className="relative mx-auto aspect-square w-full max-w-[210px] overflow-hidden rounded-[22px] border border-zinc-300 bg-white/60">
                <Image
                  src="/branding/fightsupport/fight-shield.png"
                  alt="FightSupport shield"
                  fill
                  className="object-contain p-3"
                  unoptimized
                />
              </div>
              <div className="mt-4 text-center">
                <div className={`${bebas.className} text-4xl tracking-[0.12em] text-zinc-900`}>FIGHTSUPPORT</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.28em] text-zinc-600">Vechter detailpagina</div>
              </div>
            </div>

            <div className="rounded-[24px] p-5" style={steelCard("orange")}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.28em] text-zinc-500">Vechter</div>
                  <h1 className="mt-2 text-3xl font-black text-zinc-950 md:text-4xl">{name}</h1>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-zinc-900 px-3 py-1 font-bold text-white">VA {vaNummer}</span>
                    <span className="rounded-full bg-zinc-200 px-3 py-1 font-semibold text-zinc-800">Row {rowNr ?? "-"}</span>
                    <span className="rounded-full bg-zinc-200 px-3 py-1 font-semibold text-zinc-800">{signup?.discipline ?? "-"}</span>
                    <span className="rounded-full bg-zinc-200 px-3 py-1 font-semibold text-zinc-800">{signup?.klasse ?? "-"}</span>
                  </div>
                </div>
                <div className="min-w-[220px] rounded-2xl border border-zinc-300 bg-white/70 p-4 text-sm text-zinc-800">
                  <div className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Evenement</div>
                  <div className="mt-2 font-bold text-zinc-950">{signup?.evenement_naam ?? bouts?.[0]?.evenement_naam ?? "-"}</div>
                  <div className="mt-1">{fmtDate(signup?.evenement_datum ?? bouts?.[0]?.evenement_datum ?? null)}</div>
                  <div className="mt-3 text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Laatste context update</div>
                  <div className="mt-1">{fmtDate(fighterCtx?.updated_at ?? fighterCtx?.scraped_at ?? null)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
        ) : null}

        {loading ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-200">Laden…</div>
        ) : null}

        {!loading ? (
          <>
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <section className="rounded-[24px] p-4" style={steelCard("orange")}>
                <div className="mb-3 text-sm font-extrabold tracking-[0.18em] text-zinc-800">CONTACT</div>
                <div className="space-y-3 text-sm text-zinc-900">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">E-mail</div>
                    <div className="mt-1 break-all font-semibold">{signup?.email ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Telefoon</div>
                    <div className="mt-1 font-semibold">{signup?.telefoon ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Gym</div>
                    <div className="mt-1 font-semibold">{signup?.gym ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Trainer</div>
                    <div className="mt-1 font-semibold">{signup?.trainer_naam ?? "-"}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] p-4" style={steelCard("orange")}>
                <div className="mb-3 text-sm font-extrabold tracking-[0.18em] text-zinc-800">VECHTERINFO</div>
                <div className="grid grid-cols-2 gap-3 text-sm text-zinc-900">
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Geboortedatum</div>
                    <div className="mt-1 font-semibold">{fmtDate(fighterCtx?.geboortedatum ?? signup?.geboortedatum ?? null)}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Geslacht</div>
                    <div className="mt-1 font-semibold">{fighterCtx?.geslacht ?? signup?.geslacht ?? "-"}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Gewicht</div>
                    <div className="mt-1 font-semibold">{signup?.gewicht ? `${signup.gewicht}` : "-"}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Licentie</div>
                    <div className="mt-1 font-semibold">{fighterCtx?.licentie ?? "-"}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Startverbod</div>
                    <div className="mt-1 font-semibold">{fighterCtx?.heeft_startverbod ?? "-"}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Nulmeting klasse</div>
                    <div className="mt-1 font-semibold">{fighterCtx?.nulmeting_klasse ?? "-"}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] p-4" style={steelCard("orange")}>
                <div className="mb-3 text-sm font-extrabold tracking-[0.18em] text-zinc-800">EXTRA CONTEXT</div>
                <div className="space-y-3 text-sm text-zinc-900">
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Totaal wedstrijden</div>
                    <div className="mt-1 text-xl font-black">{fighterCtx?.totaal_wedstrijden ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Gewonnen</div>
                    <div className="mt-1 text-xl font-black">{fighterCtx?.gewonnen ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Nulmeting totaal</div>
                    <div className="mt-1 text-xl font-black">{fighterCtx?.nulmeting_totaal ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-zinc-300 bg-white/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Nulmeting opmerking</div>
                    <div className="mt-1 font-semibold">{fighterCtx?.nulmeting_opmerking ?? signup?.opmerkingen ?? "-"}</div>
                  </div>
                </div>
              </section>
            </div>

            <section className="mt-5 overflow-hidden rounded-[24px]" style={darkPanel()}>
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-extrabold tracking-[0.22em] text-[var(--brand-orange)]">GEKOPPELDE PARTIJEN</div>
              </div>
              <div className="overflow-auto p-4">
                {bouts.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">Nog geen gekoppelde partij gevonden voor deze vechter.</div>
                ) : (
                  <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead className="bg-zinc-800 text-white">
                      <tr>
                        <th className="px-3 py-2 text-left">Partij</th>
                        <th className="px-3 py-2 text-left">Discipline</th>
                        <th className="px-3 py-2 text-left">Klasse</th>
                        <th className="px-3 py-2 text-left">Rood</th>
                        <th className="px-3 py-2 text-left">Blauw</th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(odd)]:text-zinc-900 [&>tr:nth-child(even)]:bg-zinc-700 [&>tr:nth-child(even)]:text-white">
                      {bouts.map((b) => (
                        <tr key={`${b.partij_nr}-${b.rood_va_mm}-${b.blauw_va_mm}`}>
                          <td className="px-3 py-2 font-extrabold">{b.partij_nr ?? "-"}</td>
                          <td className="px-3 py-2">{b.discipline ?? "-"}</td>
                          <td className="px-3 py-2">{b.klasse_mm ?? "-"}</td>
                          <td className="px-3 py-2">{b.rood_naam_mm ?? "-"}</td>
                          <td className="px-3 py-2">{b.blauw_naam_mm ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="mt-5 overflow-hidden rounded-[24px]" style={darkPanel()}>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div className="text-sm font-extrabold tracking-[0.22em] text-[var(--brand-orange)]">MELDINGEN VAN DEZE VECHTER</div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-200">{meldingen.length} meldingen</div>
              </div>
              <div className="overflow-auto p-4">
                {meldingen.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">Geen gekoppelde meldingen gevonden.</div>
                ) : (
                  <table className="w-full min-w-[920px] border-collapse text-sm">
                    <thead className="bg-zinc-800 text-white">
                      <tr>
                        <th className="px-3 py-2 text-left">Partij</th>
                        <th className="px-3 py-2 text-left">Resultaat</th>
                        <th className="px-3 py-2 text-left">Regel</th>
                        <th className="px-3 py-2 text-left">Melding</th>
                        <th className="px-3 py-2 text-left">Aantekeningen</th>
                      </tr>
                    </thead>
                    <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(odd)]:text-zinc-900 [&>tr:nth-child(even)]:bg-zinc-700 [&>tr:nth-child(even)]:text-white">
                      {meldingen.map((m) => (
                        <tr key={m.id}>
                          <td className="px-3 py-2 font-extrabold">{m.partij_nr ?? "-"}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${badgeTone(m.resultaat)}`}>
                              {String(m.resultaat ?? "-").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{m.rule_code ?? m.rule ?? "-"}</td>
                          <td className="px-3 py-2">{m.boodschap ?? "-"}</td>
                          <td className="px-3 py-2">{m.aantekeningen ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
