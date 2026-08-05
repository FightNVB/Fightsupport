"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authedDownload } from "@/lib/api/authedDownload";

const EXCLUDED_AFKEUR_RULES = new Set([
  "YOC_GEEN_LICENTIE",
  "YOC_STARTVERBOD",
  "YOC_GEEN_KEURMERK",
]);

function isNo(v: unknown) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return ["nee", "no", "false", "0", "geen", "niet"].includes(s);
}

function isYes(v: unknown) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return ["ja", "yes", "true", "1", "actief", "geldig", "ok"].includes(s);
}

function boolLabel(v: unknown) {
  if (v === true || isYes(v)) return "Ja";
  if (v === false || isNo(v)) return "Nee";
  return "Onbekend";
}

function normalizeVa(v: unknown) {
  const digits = String(v ?? "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
  return /^\d{3,6}$/.test(digits) ? digits : "";
}

function Badge({
  children,
  type = "default",
}: {
  children: React.ReactNode;
  type?: string;
}) {
  const cls =
    type === "ok"
      ? "border-green-500/50 bg-green-500/10 text-green-300 print:text-green-900"
      : type === "bad"
        ? "border-red-500/50 bg-red-500/10 text-red-300 print:text-red-900"
        : type === "warn"
          ? "border-[#ff4d00]/70 bg-[#ff4d00]/10 text-[#ff7a33] print:text-orange-900"
          : "border-zinc-600 bg-[#242424] text-zinc-200 print:text-zinc-900";

  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-black uppercase tracking-wide print:bg-white ${cls}`}
    >
      {children}
    </span>
  );
}

function SmallBadge({
  children,
  type = "default",
}: {
  children: React.ReactNode;
  type?: string;
}) {
  const cls =
    type === "bad"
      ? "border-red-500/60 bg-red-500/15 text-red-300 print:text-red-900"
      : type === "warn"
        ? "border-[#ff4d00]/70 bg-[#ff4d00]/10 text-[#ff7a33] print:text-orange-900"
        : type === "ok"
          ? "border-green-500/50 bg-green-500/10 text-green-300 print:text-green-900"
          : "border-zinc-600 bg-zinc-800 text-zinc-200 print:text-zinc-900";

  return (
    <span
      className={`inline-flex border px-2 py-0.5 text-[11px] font-black uppercase print:bg-white ${cls}`}
    >
      {children}
    </span>
  );
}

function SilverButton({
  children,
  onClick,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110 print:hidden";

  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function OrangeButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:bg-orange-400 print:hidden"
    >
      {children}
    </button>
  );
}

type OverviewItem = {
  fighter: any;
  context: any;
  rows: any[];
  vaChanged?: {
    from: string;
    to: string;
  } | null;
};

export default function YocRapportPage({
  params,
}: {
  params: Promise<{ yocId: string }>;
}) {
  const { yocId } = use(params);
  const [fighters, setFighters] = useState<any[]>([]);
  const [contexts, setContexts] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const excelPath = useMemo(
    () => `/api/yoc/${encodeURIComponent(yocId)}/excel`,
    [yocId],
  );
  const backPath = useMemo(
    () => `/dashboard/admin/controle/yoc/${encodeURIComponent(yocId)}`,
    [yocId],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const [{ data: f }, { data: c }, { data: r }] = await Promise.all([
        supabase
          .from("yoc_fighters")
          .select("*")
          .eq("yoc_event_id", yocId)
          .order("row_index"),
        supabase
          .from("yoc_fighter_context")
          .select("*")
          .eq("yoc_event_id", yocId),
        supabase.from("yoc_resultaten").select("*").eq("yoc_event_id", yocId),
      ]);

      if (!cancelled) {
        setFighters(f || []);
        setContexts(c || []);
        setResults(r || []);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [yocId]);

  const contextByFighter = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of contexts) {
      if (c.yoc_fighter_id) m.set(String(c.yoc_fighter_id), c);
      if (c.fighter_raw_id) m.set(String(c.fighter_raw_id), c);
      if (c.va_nummer) m.set(`va:${String(c.va_nummer)}`, c);
      if (c.va_nummer_fp) m.set(`va:${String(c.va_nummer_fp)}`, c);
    }
    return m;
  }, [contexts]);

  const byFighter = useMemo(() => {
    const m = new Map<string, any[]>();

    for (const r of results) {
      const keys = [
        r.fighter_raw_id,
        r.yoc_fighter_id,
        r.va_nummer ? `va:${String(r.va_nummer)}` : null,
      ].filter(Boolean);

      for (const key of keys) {
        const k = String(key);
        m.set(k, [...(m.get(k) || []), r]);
      }
    }

    return m;
  }, [results]);

  function contextFor(f: any) {
    const va = normalizeVa(f.va_nummer_mm ?? f.va_nummer ?? f.va);

    return (
      contextByFighter.get(String(f.id)) ||
      (va ? contextByFighter.get(`va:${va}`) : null) ||
      null
    );
  }

  function resultRowsFor(f: any) {
    const ctx = contextFor(f);
    const va = normalizeVa(f.va_nummer_mm ?? f.va_nummer ?? f.va);

    return (
      byFighter.get(String(f.id)) ||
      (ctx?.fighter_raw_id
        ? byFighter.get(String(ctx.fighter_raw_id))
        : null) ||
      (va ? byFighter.get(`va:${va}`) : null) ||
      []
    );
  }

  function statusFor(f: any) {
    const rows = resultRowsFor(f);
    if (!rows.length) return "ok";
    if (rows.some((x) => x.resultaat === "afgekeurd")) return "afgekeurd";
    if (rows.some((x) => x.resultaat === "actie")) return "actie";
    return "ok";
  }

  function hasLicentieOk(f: any) {
    const c = contextFor(f);
    return c?.licentie_ok === true || isYes(c?.licentie);
  }

  function hasStartverbod(f: any) {
    const c = contextFor(f);
    const rows = resultRowsFor(f);
    return (
      isYes(c?.heeft_startverbod) ||
      isYes(c?.startverbod) ||
      rows.some(
        (r) => String(r.rule_code ?? r.rule ?? "") === "YOC_STARTVERBOD",
      )
    );
  }

  function hasKeurmerkOk(f: any) {
    const c = contextFor(f);
    return (
      c?.keurmerk_ok === true ||
      c?.heeft_keurmerk === true ||
      c?.keurmerk === true ||
      c?.keurmerk_status === "buitenland"
    );
  }

  function hasGeenLicentie(f: any) {
    const rows = resultRowsFor(f);
    return (
      !hasLicentieOk(f) ||
      rows.some(
        (r) => String(r.rule_code ?? r.rule ?? "") === "YOC_GEEN_LICENTIE",
      )
    );
  }

  function hasGeenKeurmerk(f: any) {
    const rows = resultRowsFor(f);
    return (
      !hasKeurmerkOk(f) ||
      rows.some(
        (r) => String(r.rule_code ?? r.rule ?? "") === "YOC_GEEN_KEURMERK",
      )
    );
  }

  function overigeAfkeurRows(f: any) {
    return resultRowsFor(f).filter((r) => {
      const ruleCode = String(r.rule_code ?? r.rule ?? "");
      return (
        r.resultaat === "afgekeurd" && !EXCLUDED_AFKEUR_RULES.has(ruleCode)
      );
    });
  }

  function ruleRows(f: any, ruleCode: string) {
    return resultRowsFor(f).filter(
      (r) => String(r.rule_code ?? r.rule ?? "") === ruleCode,
    );
  }

  function vaChanged(f: any) {
    const c = contextFor(f);
    const rows = resultRowsFor(f);
    const from = normalizeVa(f.va_nummer_mm ?? f.va_nummer ?? f.va);
    const possibleTo = [
      c?.va_nummer_fp,
      c?.va_nummer,
      c?.fp_va_nummer,
      c?.fightpassport_va,
      c?.va,
    ]
      .map(normalizeVa)
      .find((v) => v && v !== from);

    const hasVaRule = rows.some((r) => {
      const code = String(r.rule_code ?? r.rule ?? "").toUpperCase();
      const msg = String(r.boodschap ?? "").toUpperCase();
      return (
        code.includes("VA") &&
        (code.includes("WIJZIG") ||
          code.includes("MISMATCH") ||
          (msg.includes("VA") && msg.includes("WIJZIG")))
      );
    });

    if (from && possibleTo && from !== possibleTo) {
      return { from, to: possibleTo };
    }

    if (hasVaRule) {
      return { from: from || "-", to: possibleTo || "zie melding" };
    }

    return null;
  }

  const counts = fighters.reduce(
    (acc, f) => {
      const st = statusFor(f);
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  function makeItems(
    filter: (f: any) => boolean,
    rowsFor: (f: any) => any[] = resultRowsFor,
  ): OverviewItem[] {
    return fighters.filter(filter).map((fighter) => ({
      fighter,
      context: contextFor(fighter),
      rows: rowsFor(fighter),
      vaChanged: vaChanged(fighter),
    }));
  }

  const overview = {
    afkeur: makeItems(
      (f) => overigeAfkeurRows(f).length > 0,
      overigeAfkeurRows,
    ),
    geenLicentie: makeItems(hasGeenLicentie, (f) =>
      ruleRows(f, "YOC_GEEN_LICENTIE"),
    ),
    startverbod: makeItems(hasStartverbod, (f) =>
      ruleRows(f, "YOC_STARTVERBOD"),
    ),
    geenKeurmerk: makeItems(hasGeenKeurmerk, (f) =>
      ruleRows(f, "YOC_GEEN_KEURMERK"),
    ),
    vaGewijzigd: makeItems((f) => vaChanged(f) !== null),
  };

  function renderIssueList(
    title: string,
    subtitle: string,
    items: OverviewItem[],
    type: "bad" | "warn" | "default" = "warn",
  ) {
    return (
      <section className="break-inside-avoid border-b border-zinc-700 p-4 print:border-zinc-400 print:p-3">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-black uppercase text-[#ff4d00] print:text-black">
              {title}
            </h2>
            <p className="text-xs uppercase tracking-wide text-zinc-400 print:text-zinc-700">
              {subtitle}
            </p>
          </div>
          <Badge type={items.length ? type : "ok"}>{items.length}</Badge>
        </div>

        {items.length === 0 ? (
          <div className="border border-zinc-700 bg-[#1c1c1c] p-3 text-sm text-zinc-300 print:bg-white print:text-black">
            Geen deelnemers in dit overzicht.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(
              ({ fighter, context, rows, vaChanged: changed }, index) => {
                const licentieOk = hasLicentieOk(fighter);
                const startverbod = hasStartverbod(fighter);
                const keurmerkOk = hasKeurmerkOk(fighter);
                const st = statusFor(fighter);

                return (
                  <div
                    key={`${title}-${fighter.id || fighter.row_index}-${index}`}
                    className="border border-zinc-700 bg-[#1c1c1c] p-3 print:border-zinc-400 print:bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-[#ff4d00]">
                          #{fighter.row_index ?? "-"} {fighter.naam_mm || "-"}
                        </div>
                        <div className="mt-1 text-xs text-zinc-300 print:text-zinc-700">
                          VA: <b>{fighter.va_nummer_mm || "-"}</b> ·{" "}
                          {fighter.geslacht_mm || "-"} ·{" "}
                          {fighter.gewicht_mm || "-"} kg ·{" "}
                          {fighter.sportschool_mm || "-"}
                        </div>
                        {context?.sportschool_match_naam && (
                          <div className="mt-1 text-xs text-zinc-400 print:text-zinc-700">
                            Match sportschool: {context.sportschool_match_naam}
                          </div>
                        )}
                        {changed && (
                          <div className="mt-1 text-xs font-black text-red-300 print:text-red-900">
                            VA gewijzigd: {changed.from} → {changed.to}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <SmallBadge
                          type={
                            st === "ok"
                              ? "ok"
                              : st === "afgekeurd"
                                ? "bad"
                                : "warn"
                          }
                        >
                          {st}
                        </SmallBadge>
                        <SmallBadge type={licentieOk ? "ok" : "bad"}>
                          Licentie{" "}
                          {context
                            ? boolLabel(context.licentie_ok ?? context.licentie)
                            : "Onbekend"}
                        </SmallBadge>
                        {startverbod && (
                          <SmallBadge type="bad">Startverbod</SmallBadge>
                        )}
                        <SmallBadge type={keurmerkOk ? "ok" : "warn"}>
                          Keurmerk{" "}
                          {context
                            ? boolLabel(
                                context.keurmerk_ok ??
                                  context.heeft_keurmerk ??
                                  context.keurmerk,
                              )
                            : "Onbekend"}
                        </SmallBadge>
                      </div>
                    </div>

                    {rows.length > 0 && (
                      <div className="mt-2 space-y-1 text-xs text-zinc-200 print:text-black">
                        {rows.map((r, i) => (
                          <div key={`${r.id || r.rule_code || i}-${i}`}>
                            <span className="font-black text-[#ff4d00] print:text-black">
                              {String(r.rule_code ?? r.rule ?? "Melding")}
                            </span>
                            {r.boodschap ? (
                              <span className="ml-1">
                                {String(r.boodschap)}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white print:bg-white print:p-0 print:text-black">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            background: #ffffff !important;
          }

          .print-hide {
            display: none !important;
          }

          .print-card {
            box-shadow: none !important;
            border-color: #555 !important;
          }

          .print-row-white {
            background: #ffffff !important;
            color: #000000 !important;
          }

          .print-row-dark {
            background: #f1f1f1 !important;
            color: #000000 !important;
          }
        }
      `}</style>

      <section className="print-card mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl print:max-w-none print:bg-white">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5 print:bg-white print:text-black">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / YOC
              </p>
              <h1 className="text-2xl font-black uppercase">YOC rapport</h1>
              <p className="mt-1 text-sm text-zinc-300 print:text-zinc-700">
                Vast rapport met alle probleemoverzichten boven het volledige
                deelnemersoverzicht.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <OrangeButton onClick={() => window.print()}>
                Print / PDF
              </OrangeButton>
              <SilverButton onClick={() => void authedDownload(excelPath, `yoc-controle-${yocId}.xlsx`)}>Download Excel</SilverButton>
              <SilverButton href={backPath}>Terug</SilverButton>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-5 print:grid-cols-5 print:border-zinc-400">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3 print:bg-white">
            <b className="text-xl text-[#ff4d00]">{fighters.length}</b>
            <p className="text-xs uppercase text-zinc-400 print:text-zinc-700">
              Totaal deelnemers
            </p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3 print:bg-white">
            <b className="text-xl text-green-300 print:text-green-900">
              {counts.ok || 0}
            </b>
            <p className="text-xs uppercase text-zinc-400 print:text-zinc-700">
              OK
            </p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3 print:bg-white">
            <b className="text-xl text-[#ff4d00]">{counts.actie || 0}</b>
            <p className="text-xs uppercase text-zinc-400 print:text-zinc-700">
              Actie
            </p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3 print:bg-white">
            <b className="text-xl text-red-300 print:text-red-900">
              {counts.afgekeurd || 0}
            </b>
            <p className="text-xs uppercase text-zinc-400 print:text-zinc-700">
              Afkeur totaal
            </p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3 print:bg-white">
            <b className="text-xl text-zinc-200 print:text-zinc-900">
              {contexts.length}
            </b>
            <p className="text-xs uppercase text-zinc-400 print:text-zinc-700">
              Gecontroleerd
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-zinc-300 print:text-black">
            Rapport laden...
          </div>
        ) : (
          <>
            {renderIssueList(
              "Afkeur overige regels",
              "Alle afgekeurde meldingen behalve keurmerk, startverbod en licentie.",
              overview.afkeur,
              "bad",
            )}
            {renderIssueList(
              "Geen licentie",
              "Deelnemers zonder geldige licentie of met YOC_GEEN_LICENTIE melding.",
              overview.geenLicentie,
              "bad",
            )}
            {renderIssueList(
              "Startverbod",
              "Deelnemers met startverbod of YOC_STARTVERBOD melding.",
              overview.startverbod,
              "bad",
            )}
            {renderIssueList(
              "Geen keurmerk",
              "Sportscholen zonder geldig keurmerk of met YOC_GEEN_KEURMERK melding.",
              overview.geenKeurmerk,
              "warn",
            )}
            {renderIssueList(
              "VA nummers gewijzigd",
              "Deelnemers waarbij het VA-nummer uit de lijst afwijkt van FightPassport of waarbij een VA-wijziging is gemeld.",
              overview.vaGewijzigd,
              "warn",
            )}
          </>
        )}

        <section className="p-4 print:p-0">
          <div className="mb-3">
            <h2 className="text-lg font-black uppercase text-[#ff4d00] print:text-black">
              Volledig deelnemersoverzicht
            </h2>
            <p className="text-xs uppercase tracking-wide text-zinc-400 print:text-zinc-700">
              Alle vechters met status, licentie, startverbod, keurmerk en
              meldingen.
            </p>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse text-sm print:text-[10px]">
              <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300 print:bg-zinc-200 print:text-black">
                <tr>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    #
                  </th>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    Status
                  </th>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    VA
                  </th>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    Naam
                  </th>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    Geslacht
                  </th>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    KG
                  </th>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    Sportschool
                  </th>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    Licentie
                  </th>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    Keurmerk
                  </th>
                  <th className="border border-zinc-700 p-2 print:border-zinc-500">
                    Meldingen
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr className="bg-[#171717] print:bg-white">
                    <td
                      colSpan={10}
                      className="border border-zinc-800 p-4 text-zinc-300 print:text-black"
                    >
                      Rapport laden...
                    </td>
                  </tr>
                ) : fighters.length === 0 ? (
                  <tr className="bg-[#171717] print:bg-white">
                    <td
                      colSpan={10}
                      className="border border-zinc-800 p-4 text-zinc-300 print:text-black"
                    >
                      Geen deelnemers gevonden.
                    </td>
                  </tr>
                ) : (
                  fighters.map((f, index) => {
                    const st = statusFor(f);
                    const c = contextFor(f);
                    const licentieOk = hasLicentieOk(f);
                    const startverbod = hasStartverbod(f);
                    const keurmerkOk = hasKeurmerkOk(f);
                    const rows = resultRowsFor(f);
                    const changed = vaChanged(f);
                    const zebraWhite = index % 2 === 0;

                    return (
                      <tr
                        key={f.id}
                        className={
                          zebraWhite ? "print-row-white" : "print-row-dark"
                        }
                        style={{
                          backgroundColor: zebraWhite ? "#ffffff" : "#171717",
                          color: zebraWhite ? "#000000" : "#ffffff",
                        }}
                      >
                        <td className="border border-zinc-800 p-2 print:border-zinc-500">
                          {f.row_index}
                        </td>
                        <td className="border border-zinc-800 p-2 print:border-zinc-500">
                          <Badge
                            type={
                              st === "ok"
                                ? "ok"
                                : st === "afgekeurd"
                                  ? "bad"
                                  : st === "actie"
                                    ? "warn"
                                    : "default"
                            }
                          >
                            {st.replaceAll("_", " ")}
                          </Badge>
                        </td>
                        <td className="border border-zinc-800 p-2 font-bold print:border-zinc-500">
                          <div>{f.va_nummer_mm || "-"}</div>
                          {changed && (
                            <div className="mt-1 text-[10px] font-black text-red-300 print:text-red-900">
                              gewijzigd: {changed.from} → {changed.to}
                            </div>
                          )}
                        </td>
                        <td className="border border-zinc-800 p-2 font-black text-[#ff4d00] print:border-zinc-500">
                          {f.naam_mm || "-"}
                        </td>
                        <td className="border border-zinc-800 p-2 print:border-zinc-500">
                          {f.geslacht_mm || "-"}
                        </td>
                        <td className="border border-zinc-800 p-2 font-bold print:border-zinc-500">
                          {f.gewicht_mm || "-"}
                        </td>
                        <td className="border border-zinc-800 p-2 print:border-zinc-500">
                          <div className="font-bold">
                            {f.sportschool_mm || "-"}
                          </div>
                          {c?.sportschool_match_naam && (
                            <div className="mt-1 text-xs opacity-80">
                              Match: {c.sportschool_match_naam}
                            </div>
                          )}
                        </td>
                        <td className="border border-zinc-800 p-2 print:border-zinc-500">
                          <div className="flex flex-wrap gap-1">
                            <SmallBadge type={licentieOk ? "ok" : "bad"}>
                              {c
                                ? boolLabel(c.licentie_ok ?? c.licentie)
                                : "Onbekend"}
                            </SmallBadge>
                            {startverbod && (
                              <SmallBadge type="bad">Startverbod</SmallBadge>
                            )}
                          </div>
                        </td>
                        <td className="border border-zinc-800 p-2 print:border-zinc-500">
                          <div className="flex flex-wrap gap-1">
                            <SmallBadge type={keurmerkOk ? "ok" : "warn"}>
                              {c
                                ? boolLabel(
                                    c.keurmerk_ok ??
                                      c.heeft_keurmerk ??
                                      c.keurmerk,
                                  )
                                : "Onbekend"}
                            </SmallBadge>
                            {c?.keurmerk_status && (
                              <SmallBadge type={keurmerkOk ? "ok" : "warn"}>
                                {c.keurmerk_status}
                              </SmallBadge>
                            )}
                          </div>
                          {c?.keurmerk_reden && (
                            <div className="mt-1 text-xs opacity-80">
                              {c.keurmerk_reden}
                            </div>
                          )}
                        </td>
                        <td className="border border-zinc-800 p-2 print:border-zinc-500">
                          {rows.length === 0 ? (
                            <span className="text-zinc-500">-</span>
                          ) : (
                            <div className="space-y-1">
                              {rows.map((r, i) => (
                                <div key={`${r.id || r.rule_code || i}-${i}`}>
                                  <span className="font-black text-[#ff4d00] print:text-black">
                                    {String(r.rule_code ?? r.rule ?? "Melding")}
                                  </span>
                                  {r.boodschap ? (
                                    <span className="ml-1">
                                      {String(r.boodschap)}
                                    </span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
