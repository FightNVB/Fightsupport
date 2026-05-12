"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

const ORANGE = "#ff4d00";
const LOGO_SRC = "/branding/fightsupport/toernooi.png";

type Fighter = {
  id?: string | number | null;
  fighter_id: string;
  va_nummer?: string | null;
  naam: string | null;
  naam_fp?: string | null;
  sportschool: string | null;
  sportschool_fp?: string | null;
  gewicht: number | string | null;
  leeftijd: number | string | null;
  geslacht: string | null;
  licentie?: string | boolean | null;
  heeft_startverbod?: string | boolean | null;
  keurmerk?: string | boolean | null;
  toernooi_code: string | null;
};

type Melding = {
  id: string;
  fighter_id: string | null;
  toernooi_code: string | null;
  toernooi_va_nummer?: string | null;
  resultaat: string | null;
  severity: string | null;
  rule: string | null;
  rule_code: string | null;
  boodschap: string | null;
  review_status?: string | null;
  actie_status?: string | null;
  aantekeningen?: string | null;
  created_at?: string | null;
};

type MeldingCategorie = "licentie" | "startverbod" | "keurmerk" | "vechter";

type MeldingBlock = {
  key: MeldingCategorie;
  title: string;
  subtitle: string;
  empty: string;
  meldingen: Melding[];
};

function norm(v: unknown) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function normCode(v: unknown) {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

function safe(v: unknown, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function isTruthyValue(v: unknown) {
  const s = norm(v);
  return v === true || ["ja", "yes", "true", "1", "actief"].includes(s);
}

function isFalsyValue(v: unknown) {
  const s = norm(v);
  return (
    v === false ||
    ["nee", "no", "false", "0", "geen", "niet", "n.v.t."].includes(s)
  );
}

function normResultaat(
  v: unknown,
): "ok" | "actie" | "afkeur" | "dispensatie" | "verbod" {
  const s = norm(v);
  if (s === "ok" || s === "goedgekeurd") return "ok";
  if (s === "dispensatie") return "dispensatie";
  if (s === "verbod") return "verbod";
  if (s === "afkeur" || s === "afgekeurd") return "afkeur";
  return "actie";
}

function resultLabel(v: unknown) {
  const r = normResultaat(v);
  if (r === "ok") return "OK";
  if (r === "verbod") return "VERBOD";
  if (r === "afkeur") return "AFKEUR";
  if (r === "dispensatie") return "DISPENSATIE";
  return "ACTIE";
}

function resultRank(v: unknown) {
  const r = normResultaat(v);
  if (r === "verbod") return 5;
  if (r === "dispensatie") return 4;
  if (r === "afkeur") return 3;
  if (r === "actie") return 2;
  return 1;
}

function resultStyle(v: unknown) {
  const r = normResultaat(v);
  if (r === "verbod") {
    return {
      bg: "rgba(127,29,29,0.34)",
      border: "rgba(248,113,113,0.72)",
      text: "#fecaca",
    };
  }
  if (r === "afkeur") {
    return {
      bg: "rgba(220,38,38,0.16)",
      border: "rgba(248,113,113,0.55)",
      text: "#fecaca",
    };
  }
  if (r === "dispensatie") {
    return {
      bg: "rgba(147,51,234,0.16)",
      border: "rgba(216,180,254,0.58)",
      text: "#e9d5ff",
    };
  }
  if (r === "ok") {
    return {
      bg: "rgba(22,163,74,0.13)",
      border: "rgba(74,222,128,0.45)",
      text: "#bbf7d0",
    };
  }
  return {
    bg: "rgba(255,77,0,0.15)",
    border: "rgba(255,77,0,0.62)",
    text: "#fed7aa",
  };
}

function sameFighter(m: Melding, f: Fighter) {
  const mf = norm(m.fighter_id);
  const mtva = norm(m.toernooi_va_nummer);
  const ff = norm(f.fighter_id);
  const fv = norm(f.va_nummer);
  return (
    (!!mf && (mf === ff || mf === fv)) ||
    (!!mtva && (mtva === ff || mtva === fv))
  );
}

function fighterVa(f: Fighter) {
  return safe(f.va_nummer ?? f.fighter_id);
}

function fighterName(f: Fighter) {
  return safe(f.naam_fp ?? f.naam, "Onbekende deelnemer");
}

function fighterSchool(f: Fighter) {
  return safe(f.sportschool_fp ?? f.sportschool, "Sportschool onbekend");
}

function messageText(m: Melding) {
  return `${m.rule_code ?? ""} ${m.rule ?? ""} ${m.boodschap ?? ""}`.toLowerCase();
}

function meldingCategorie(m: Melding): MeldingCategorie {
  const t = messageText(m);
  if (t.includes("startverbod") || t.includes("start verbod"))
    return "startverbod";
  if (t.includes("licentie") || t.includes("license")) return "licentie";
  if (
    t.includes("keurmerk") ||
    t.includes("sportschool") ||
    t.includes("bkbmo") ||
    t.includes("belgi")
  )
    return "keurmerk";
  return "vechter";
}

function isOpenMelding(m: Melding) {
  const review = norm(m.review_status);
  const resultaat = normResultaat(m.resultaat);
  return resultaat !== "ok" && (!review || review === "open");
}

function dedupeMeldingen(list: Melding[]) {
  const seen = new Set<string>();
  return list.filter((m) => {
    const key = [
      norm(m.fighter_id),
      norm(m.toernooi_va_nummer),
      norm(m.rule_code),
      norm(m.boodschap),
      norm(m.resultaat),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ToernooiDetailPage() {
  const params = useParams();
  const router = useRouter();

  const matchmakingId = String(params?.matchmakingId ?? "");
  const toernooiCode = normCode(
    (params as any)?.toernooi_code ??
      (params as any)?.toernooicode ??
      (params as any)?.toernooiCode,
  );

  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!matchmakingId || !toernooiCode) return;
    setLoading(true);
    setError(null);

    try {
      const res = await authedFetch(
        `/api/control-engine/toernooi-fighter/get?matchmaking_id=${encodeURIComponent(
          matchmakingId,
        )}&toernooi_code=${encodeURIComponent(toernooiCode)}`,
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error ?? "Toernooi detail laden mislukt");

      setFighters(Array.isArray(json.fighters) ? json.fighters : []);
      setMeldingen(Array.isArray(json.meldingen) ? json.meldingen : []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setFighters([]);
      setMeldingen([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingId, toernooiCode]);

  const fighterMeldingen = useMemo(() => {
    const map = new Map<string, Melding[]>();
    for (const f of fighters) {
      map.set(
        fighterVa(f),
        dedupeMeldingen(meldingen.filter((m) => sameFighter(m, f))),
      );
    }
    return map;
  }, [fighters, meldingen]);

  const meldingBlocks = useMemo<MeldingBlock[]>(() => {
    const openMeldingen = dedupeMeldingen(meldingen.filter(isOpenMelding));
    const byCat: Record<MeldingCategorie, Melding[]> = {
      licentie: [],
      startverbod: [],
      keurmerk: [],
      vechter: [],
    };

    for (const m of openMeldingen) byCat[meldingCategorie(m)].push(m);

    const sortMeldingen = (list: Melding[]) =>
      [...list].sort(
        (a, b) => resultRank(b.resultaat) - resultRank(a.resultaat),
      );

    return [
      {
        key: "licentie",
        title: "Licentie meldingen",
        subtitle: "Licentieproblemen die direct aandacht nodig hebben.",
        empty: "Geen open licentie meldingen.",
        meldingen: sortMeldingen(byCat.licentie),
      },
      {
        key: "startverbod",
        title: "Startverbod",
        subtitle: "Startverboden binnen dit toernooi.",
        empty: "Geen open startverbod meldingen.",
        meldingen: sortMeldingen(byCat.startverbod),
      },
      {
        key: "keurmerk",
        title: "Keurmerk meldingen",
        subtitle: "Sportschool- en keurmerkcontroles.",
        empty: "Geen open keurmerk meldingen.",
        meldingen: sortMeldingen(byCat.keurmerk),
      },
      {
        key: "vechter",
        title: "Vechter meldingen",
        subtitle: "Klasse, leeftijd, gewicht en overige vechtercontroles.",
        empty: "Geen open vechter meldingen.",
        meldingen: sortMeldingen(byCat.vechter),
      },
    ];
  }, [meldingen]);

  const stats = useMemo(() => {
    const open = meldingen.filter(isOpenMelding);
    return {
      deelnemers: fighters.length,
      open: open.length,
      startverbod:
        meldingBlocks.find((b) => b.key === "startverbod")?.meldingen.length ??
        0,
      licentie:
        meldingBlocks.find((b) => b.key === "licentie")?.meldingen.length ?? 0,
      keurmerk:
        meldingBlocks.find((b) => b.key === "keurmerk")?.meldingen.length ?? 0,
      vechter:
        meldingBlocks.find((b) => b.key === "vechter")?.meldingen.length ?? 0,
    };
  }, [fighters.length, meldingen, meldingBlocks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 text-white">
        <div className="rounded-2xl border border-orange-500/50 bg-black/60 p-6 font-extrabold">
          Toernooi detail laden...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,77,0,0.20),transparent_30%),radial-gradient(circle_at_top_right,rgba(212,212,216,0.14),transparent_24%),linear-gradient(180deg,#2d2928_0%,#121214_36%,#050505_100%)] p-4 text-white md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header
          className="overflow-hidden rounded-[30px] border shadow-2xl"
          style={{
            borderColor: "rgba(255,77,0,0.58)",
            background:
              "linear-gradient(135deg,rgba(214,211,209,0.22),rgba(82,82,91,0.42) 36%,rgba(8,8,9,0.98)), repeating-linear-gradient(90deg, rgba(255,255,255,0.075) 0px, rgba(255,255,255,0.075) 1px, transparent 1px, transparent 6px)",
            boxShadow:
              "0 28px 90px rgba(0,0,0,0.82), inset 0 0 0 1px rgba(255,255,255,0.16), inset 0 0 58px rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-4 md:p-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-200/90">
                FightSupport toernooi controle
              </div>
              <h1 className="mt-1 text-2xl font-black md:text-3xl">
                Toernooi {toernooiCode}
              </h1>
            </div>

            <button
              onClick={() =>
                router.push(`/dashboard/admin/controle/${matchmakingId}`)
              }
              className="rounded-xl px-4 py-2 text-sm font-black uppercase tracking-wide shadow-lg transition hover:bg-orange-500/15"
              style={{
                border: `1px solid ${ORANGE}`,
                background: "rgba(0,0,0,0.48)",
                color: "#ffd5c2",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              }}
            >
              ← Terug naar controle
            </button>
          </div>

         <div className="relative px-4 py-5 md:px-8 md:py-7">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,77,0,0.18),transparent_50%)]" />

  <div
    className="relative mx-auto w-full rounded-[26px] border p-[2px]"
    style={{
      borderColor: "rgba(255,255,255,0.16)",
      background:
        "linear-gradient(135deg,rgba(255,77,0,0.60),rgba(214,211,209,0.40),rgba(255,77,0,0.42))",
      boxShadow:
        "0 24px 80px rgba(0,0,0,0.82), inset 0 0 0 1px rgba(255,255,255,0.18)",
    }}
  >
    <div className="rounded-[24px] bg-black/85 p-3 md:p-4">
      <img
        src={LOGO_SRC}
        alt="FightSupport Toernooi"
        className="block h-auto w-full object-contain drop-shadow-[0_18px_50px_rgba(0,0,0,0.85)]"
      />
    </div>
  </div>
</div>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-400/50 bg-red-950/35 p-3 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-6">
          <StatCard label="Deelnemers" value={stats.deelnemers} />
          <StatCard label="Open meldingen" value={stats.open} accent />
          <StatCard label="Licentie" value={stats.licentie} />
          <StatCard label="Startverbod" value={stats.startverbod} />
          <StatCard label="Keurmerk" value={stats.keurmerk} />
          <StatCard label="Vechter" value={stats.vechter} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <SectionTitle
              title="Deelnemers"
              subtitle="Naam en sportschool. Klik op een deelnemer voor de fighter detail pagina."
            />

            {fighters.length === 0 ? (
              <MetalEmpty>
                Geen toernooi-deelnemers gevonden voor toernooi {toernooiCode}.
              </MetalEmpty>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {fighters.map((f) => {
                  const va = fighterVa(f);
                  const fM = fighterMeldingen.get(va) ?? [];
                  const highest = [...fM].sort(
                    (a, b) => resultRank(b.resultaat) - resultRank(a.resultaat),
                  )[0];
                  const st = highest
                    ? resultStyle(highest.resultaat)
                    : resultStyle("ok");
                  const startverbod = isTruthyValue(f.heeft_startverbod);
                  const geenLicentie = isFalsyValue(f.licentie);
                  const geenKeurmerk = isFalsyValue(f.keurmerk);

                  return (
                    <Link
                      key={`${f.toernooi_code}-${f.fighter_id}-${va}`}
                      href={`/dashboard/admin/controle/${matchmakingId}/fighter/${encodeURIComponent(va)}`}
                      className="group overflow-hidden rounded-[22px] border p-4 shadow-xl transition hover:-translate-y-0.5 hover:border-orange-500/70"
                      style={{
                        borderColor: highest
                          ? st.border
                          : "rgba(255,255,255,0.15)",
                        background:
                          "linear-gradient(135deg,rgba(214,211,209,0.12),rgba(63,63,70,0.32),rgba(0,0,0,0.74))",
                        boxShadow:
                          "0 18px 45px rgba(0,0,0,0.52), inset 0 0 0 1px rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xl font-black text-white group-hover:text-orange-100">
                            {fighterName(f)}
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-zinc-300">
                            {fighterSchool(f)}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-xl border border-orange-500/45 bg-orange-500/10 px-3 py-2 text-right shadow-inner">
                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-200">
                            VA
                          </div>
                          <div className="font-black text-orange-100">{va}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {highest ? (
                          <Badge
                            label={resultLabel(highest.resultaat)}
                            style={st}
                          />
                        ) : (
                          <Badge
                            label="GEEN OPEN MELDING"
                            style={resultStyle("ok")}
                          />
                        )}
                        {startverbod ? (
                          <Badge
                            label="STARTVERBOD"
                            style={resultStyle("verbod")}
                          />
                        ) : null}
                        {geenLicentie ? (
                          <Badge
                            label="GEEN LICENTIE"
                            style={resultStyle("afkeur")}
                          />
                        ) : null}
                        {geenKeurmerk ? (
                          <Badge
                            label="GEEN KEURMERK"
                            style={resultStyle("actie")}
                          />
                        ) : null}
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <Info
                          label="Leeftijd"
                          value={
                            f.leeftijd == null ? "-" : `${f.leeftijd} jaar`
                          }
                        />
                        <Info
                          label="Gewicht"
                          value={f.gewicht == null ? "-" : `${f.gewicht} kg`}
                        />
                        <Info label="Geslacht" value={safe(f.geslacht)} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {meldingBlocks.map((block) => (
              <MeldingPanel key={block.key} block={block} fighters={fighters} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border px-4 py-3 font-black shadow-xl"
      style={{
        borderColor: accent ? "rgba(255,77,0,0.75)" : "rgba(255,255,255,0.15)",
        background: accent
          ? "linear-gradient(135deg,rgba(255,77,0,0.30),rgba(82,82,91,0.46),rgba(0,0,0,0.68))"
          : "linear-gradient(135deg,rgba(214,211,209,0.14),rgba(63,63,70,0.34),rgba(0,0,0,0.68))",
        boxShadow:
          "0 16px 40px rgba(0,0,0,0.48), inset 0 0 0 1px rgba(255,255,255,0.07)",
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-2xl text-white">{value}</div>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4 shadow-xl"
      style={{
        borderColor: "rgba(255,255,255,0.15)",
        background:
          "linear-gradient(135deg,rgba(214,211,209,0.13),rgba(63,63,70,0.42),rgba(0,0,0,0.68))",
        boxShadow:
          "0 18px 50px rgba(0,0,0,0.52), inset 0 0 0 1px rgba(255,255,255,0.07)",
      }}
    >
      <h2 className="text-lg font-black uppercase tracking-[0.14em] text-white">
        {title}
      </h2>
      <p className="mt-1 text-sm font-semibold text-zinc-400">{subtitle}</p>
    </div>
  );
}

function MeldingPanel({
  block,
  fighters,
}: {
  block: MeldingBlock;
  fighters: Fighter[];
}) {
  return (
    <section
      className="overflow-hidden rounded-[22px] border shadow-xl"
      style={{
        borderColor: "rgba(255,255,255,0.15)",
        background:
          "linear-gradient(135deg,rgba(214,211,209,0.11),rgba(39,39,42,0.38),rgba(0,0,0,0.74))",
        boxShadow:
          "0 18px 50px rgba(0,0,0,0.52), inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <div className="border-b border-white/10 bg-[linear-gradient(90deg,rgba(214,211,209,0.13),rgba(63,63,70,0.46),rgba(255,77,0,0.10))] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black uppercase tracking-[0.14em] text-white">
              {block.title}
            </h3>
            <p className="mt-1 text-sm font-semibold text-zinc-400">
              {block.subtitle}
            </p>
          </div>
          <span className="rounded-full border border-orange-500/45 bg-orange-500/10 px-3 py-1 text-sm font-black text-orange-100">
            {block.meldingen.length}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {block.meldingen.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-semibold text-zinc-500">
            {block.empty}
          </div>
        ) : (
          block.meldingen.map((m) => {
            const st = resultStyle(m.resultaat);
            const fighter = fighters.find((f) => sameFighter(m, f));
            return (
              <div
                key={m.id}
                className="rounded-2xl border p-3"
                style={{ background: st.bg, borderColor: st.border }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={resultLabel(m.resultaat)} style={st} />
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-zinc-400">
                    {safe(m.rule_code ?? m.rule)}
                  </span>
                </div>

                <div className="mt-2 text-sm font-black text-zinc-100">
                  {fighter
                    ? `${fighterName(fighter)} • ${fighterSchool(fighter)}`
                    : "Algemene toernooi melding"}
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-zinc-200">
                  {safe(m.boodschap)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function Badge({
  label,
  style,
}: {
  label: string;
  style: { bg: string; border: string; text: string };
}) {
  return (
    <span
      className="rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide"
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.text,
      }}
    >
      {label}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(214,211,209,0.08),rgba(0,0,0,0.34))] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 font-black text-zinc-100">{value}</div>
    </div>
  );
}

function MetalEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-6 text-zinc-200"
      style={{
        borderColor: "rgba(255,255,255,0.15)",
        background:
          "linear-gradient(135deg,rgba(214,211,209,0.10),rgba(39,39,42,0.38),rgba(0,0,0,0.70))",
      }}
    >
      {children}
    </div>
  );
}