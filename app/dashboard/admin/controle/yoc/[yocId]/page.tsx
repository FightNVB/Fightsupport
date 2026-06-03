"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FilterTab = "all" | "afkeur" | "geen_licentie" | "geen_keurmerk" | "startverbod";

function Badge({
  children,
  type = "default",
}: {
  children: React.ReactNode;
  type?: string;
}) {
  const cls =
    type === "ok"
      ? "border-green-500/50 bg-green-500/10 text-green-300"
      : type === "bad"
        ? "border-red-500/50 bg-red-500/10 text-red-300"
        : type === "warn"
          ? "border-[#ff4d00]/70 bg-[#ff4d00]/10 text-[#ff7a33]"
          : "border-zinc-600 bg-[#242424] text-zinc-200";

  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-black uppercase tracking-wide ${cls}`}
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
      ? "border-red-500/60 bg-red-500/15 text-red-300"
      : type === "warn"
        ? "border-[#ff4d00]/70 bg-[#ff4d00]/10 text-[#ff7a33]"
        : type === "ok"
          ? "border-green-500/50 bg-green-500/10 text-green-300"
          : "border-zinc-600 bg-zinc-800 text-zinc-200";

  return (
    <span
      className={`inline-flex border px-2 py-0.5 text-[11px] font-black uppercase ${cls}`}
    >
      {children}
    </span>
  );
}

function SilverButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function OrangeButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

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

function isRunningStatus(status?: string | null) {
  const s = String(status || "").toLowerCase();
  return [
    "queued",
    "running",
    "scraping",
    "building",
    "rules",
    "saving",
    "rescraping",
  ].includes(s);
}

export default function YocDetailPage({
  params,
}: {
  params: Promise<{ yocId: string }>;
}) {
  const { yocId } = use(params);
  const [fighters, setFighters] = useState<any[]>([]);
  const [contexts, setContexts] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [busyFighterId, setBusyFighterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const pollRef = useRef<number | null>(null);

  async function load() {
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

    setFighters(f || []);
    setContexts(c || []);
    setResults(r || []);
  }

  async function pollStatus(runId: string) {
    if (pollRef.current) window.clearInterval(pollRef.current);

    const tick = async () => {
      const res = await fetch(
        `/api/yoc/${yocId}/scrape/status?run_id=${runId}&t=${Date.now()}`,
      );
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        setBusy(`Autocheck status fout: ${json?.error || res.statusText}`);
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setActiveRunId(null);
        setBusyFighterId(null);
        await load();
        return;
      }

      const counts = json.counts || {};
      setBusy(
        `YOC scraper draait nog: ${json.status}. FP: ${counts.raw_count ?? 0}/${counts.fighters_count ?? 0}, context: ${counts.context_count ?? 0}, meldingen: ${counts.results_count ?? 0}`,
      );

      if (json.done) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setActiveRunId(null);
        setBusyFighterId(null);
        setBusy(
          json.failed
            ? `Autocheck fout: ${json.error || "onbekende fout"}`
            : "Autocheck klaar. De tabel is vernieuwd.",
        );
        await load();
      }
    };

    await tick();
    pollRef.current = window.setInterval(tick, 2500);
  }

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yocId]);

  const contextByFighter = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of contexts) {
      if (c.yoc_fighter_id) m.set(String(c.yoc_fighter_id), c);
      if (c.fighter_raw_id) m.set(String(c.fighter_raw_id), c);
      if (c.va_nummer) m.set(`va:${String(c.va_nummer)}`, c);
    }
    return m;
  }, [contexts]);

  const byFighter = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of results) {
      if (r.fighter_raw_id)
        m.set(String(r.fighter_raw_id), [
          ...(m.get(String(r.fighter_raw_id)) || []),
          r,
        ]);
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
    return (
      byFighter.get(String(f.id)) ||
      (ctx?.fighter_raw_id
        ? byFighter.get(String(ctx.fighter_raw_id))
        : null) ||
      []
    );
  }

  function statusFor(f: any) {
    const r = resultRowsFor(f);
    // Geen meldingen betekent dat deze vechter OK is.
    if (!r.length) return "ok";
    if (r.some((x) => x.resultaat === "afgekeurd")) return "afgekeurd";
    if (r.some((x) => x.resultaat === "actie")) return "actie";
    return "ok";
  }

  async function runScrape() {
    setBusy("YOC autocheck wordt gestart...");
    const res = await fetch(`/api/yoc/${yocId}/scrape/start`, {
      method: "POST",
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      setBusy(`Autocheck fout: ${json?.error || res.statusText}`);
      return;
    }

    setActiveRunId(json.yoc_run_id);
    await pollStatus(json.yoc_run_id);
  }

  async function rescrapeFighter(f: any) {
    const va = normalizeVa(f.va_nummer_mm ?? f.va_nummer ?? f.va);
    if (!f.id && !va) {
      setBusy("Herscrape fout: geen vechter-id of VA nummer gevonden.");
      return;
    }

    setBusyFighterId(String(f.id));
    setBusy(`Herscrape gestart voor ${f.naam_mm || f.naam || va}...`);

    const res = await fetch(`/api/yoc/${yocId}/scrape/fighter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yoc_fighter_id: f.id, va_nummer: va }),
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      setBusyFighterId(null);
      setBusy(`Herscrape fout: ${json?.error || res.statusText}`);
      return;
    }

    setActiveRunId(json.yoc_run_id);
    await pollStatus(json.yoc_run_id);
  }

  function openReport() {
    window.open(`/dashboard/admin/controle/yoc/${yocId}/rapport`, "_blank");
  }

  function downloadExcel() {
    window.location.href = `/api/yoc/${yocId}/excel`;
  }

  function hasLicentieOk(f: any) {
    const c = contextFor(f);
    return c?.licentie_ok === true || isYes(c?.licentie);
  }

  function hasStartverbod(f: any) {
    const c = contextFor(f);
    return isYes(c?.heeft_startverbod) || isYes(c?.startverbod);
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

  function hasOnlyRealAfkeur(f: any) {
    const excludedRuleCodes = new Set([
      "YOC_GEEN_LICENTIE",
      "YOC_STARTVERBOD",
      "YOC_GEEN_KEURMERK",
    ]);

    return resultRowsFor(f).some((r) => {
      const ruleCode = String(r.rule_code ?? r.rule ?? "").trim().toUpperCase();
      return r.resultaat === "afgekeurd" && !excludedRuleCodes.has(ruleCode);
    });
  }

  const counts = fighters.reduce(
    (acc, f) => {
      const st = statusFor(f);
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const tabCounts = {
    all: fighters.length,
    afkeur: fighters.filter((f) => hasOnlyRealAfkeur(f)).length,
    geen_licentie: fighters.filter((f) => !hasLicentieOk(f)).length,
    geen_keurmerk: fighters.filter((f) => !hasKeurmerkOk(f)).length,
    startverbod: fighters.filter((f) => hasStartverbod(f)).length,
  };

  const filteredFighters = fighters.filter((f) => {
    if (activeTab === "afkeur") return hasOnlyRealAfkeur(f);
    if (activeTab === "geen_licentie") return !hasLicentieOk(f);
    if (activeTab === "geen_keurmerk") return !hasKeurmerkOk(f);
    if (activeTab === "startverbod") return hasStartverbod(f);
    return true;
  });

  const busyIsError = busy.toLowerCase().includes("fout");
  const isBusy =
    Boolean(activeRunId) || isRunningStatus(busy) || Boolean(busyFighterId);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      {isBusy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6">
          <div className="max-w-xl border border-[#ff4d00] bg-[#121212] p-6 text-center shadow-2xl shadow-black">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-[#ff4d00]" />
            <h2 className="text-xl font-black uppercase text-[#ff4d00]">
              YOC controle draait
            </h2>
            <p className="mt-2 text-sm text-zinc-200">
              {busy || "Wachten op scraper..."}
            </p>
            <p className="mt-3 text-xs text-zinc-400">
              Dit scherm sluit pas als de scraper/pipeline klaar of fout is.
            </p>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / YOC
              </p>
              <h1 className="text-2xl font-black uppercase">
                YOC deelnemerslijst
              </h1>
              <p className="mt-1 text-sm text-zinc-300">
                Controleer deelnemers, draai daarna de YOC controle.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <OrangeButton onClick={runScrape} disabled={isBusy}>
                Start YOC controle
              </OrangeButton>
              <SilverButton onClick={openReport}>Rapport</SilverButton>
              <SilverButton onClick={downloadExcel}>
                Excel download
              </SilverButton>
              <SilverButton
                onClick={() =>
                  (window.location.href = "/dashboard/admin/controle/yoc")
                }
              >
                YOC overzicht
              </SilverButton>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-5">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{fighters.length}</b>
            <p className="text-xs uppercase text-zinc-400">Totaal deelnemers</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-green-300">{counts.ok || 0}</b>
            <p className="text-xs uppercase text-zinc-400">OK</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{counts.actie || 0}</b>
            <p className="text-xs uppercase text-zinc-400">Actie</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-red-300">{counts.afgekeurd || 0}</b>
            <p className="text-xs uppercase text-zinc-400">Afkeur</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-zinc-200">{contexts.length}</b>
            <p className="text-xs uppercase text-zinc-400">Gecontroleerd</p>
          </div>
        </div>

        <div className="border-b border-zinc-700 bg-[#171717] p-4">
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: "all" as FilterTab,
                label: "Alle deelnemers",
                count: tabCounts.all,
                cls: "border-zinc-500 text-zinc-100",
              },
              {
                key: "afkeur" as FilterTab,
                label: "Afkeur",
                count: tabCounts.afkeur,
                cls: "border-red-500 text-red-300",
              },
              {
                key: "geen_licentie" as FilterTab,
                label: "Geen licentie",
                count: tabCounts.geen_licentie,
                cls: "border-[#ff4d00] text-[#ff7a33]",
              },
              {
                key: "geen_keurmerk" as FilterTab,
                label: "Geen keurmerk",
                count: tabCounts.geen_keurmerk,
                cls: "border-yellow-500 text-yellow-300",
              },
              {
                key: "startverbod" as FilterTab,
                label: "Startverbod",
                count: tabCounts.startverbod,
                cls: "border-red-500 text-red-300",
              },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`border px-4 py-2 text-sm font-black uppercase tracking-wide transition hover:brightness-110 ${tab.cls} ${
                    active
                      ? "bg-[#2a2a2a] shadow-lg shadow-black/30"
                      : "bg-[#111111] opacity-75"
                  }`}
                >
                  {tab.label} <span className="ml-2 text-lg">{tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {busy && !isBusy && (
          <div
            className={`m-4 border p-3 text-sm font-bold ${busyIsError ? "border-red-500 bg-red-950/60 text-red-200" : "border-[#ff4d00]/60 bg-[#ff4d00]/10 text-orange-200"}`}
          >
            {busy}
          </div>
        )}

        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
              <tr>
                <th className="border border-zinc-700 p-2">#</th>
                <th className="border border-zinc-700 p-2">Status</th>
                <th className="border border-zinc-700 p-2">VA</th>
                <th className="border border-zinc-700 p-2">Naam</th>
                <th className="border border-zinc-700 p-2">Geslacht</th>
                <th className="border border-zinc-700 p-2">KG</th>
                <th className="border border-zinc-700 p-2">Sportschool</th>
                <th className="border border-zinc-700 p-2">Licentie</th>
                <th className="border border-zinc-700 p-2">Keurmerk</th>
                <th className="border border-zinc-700 p-2 text-right">Actie</th>
              </tr>
            </thead>

            <tbody>
              {filteredFighters.length === 0 ? (
                <tr className="bg-[#171717]">
                  <td
                    colSpan={10}
                    className="border border-zinc-800 p-4 text-zinc-300"
                  >
                    Geen deelnemers gevonden voor dit filter.
                  </td>
                </tr>
              ) : (
                filteredFighters.map((f, index) => {
                  const st = statusFor(f);
                  const c = contextFor(f);
                  const licentieOk = hasLicentieOk(f);
                  const startverbod = hasStartverbod(f);
                  const keurmerkOk = hasKeurmerkOk(f);
                  const zebraWhite = index % 2 === 0;

                  return (
                    <tr
                      key={f.id}
                      style={{
                        backgroundColor: zebraWhite ? "#ffffff" : "#171717",
                        color: zebraWhite ? "#000000" : "#ffffff",
                      }}
                    >
                      <td className="border border-zinc-800 p-2">
                        {f.row_index}
                      </td>
                      <td className="border border-zinc-800 p-2">
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
                      <td className="border border-zinc-800 p-2 font-bold">
                        {f.va_nummer_mm || "-"}
                      </td>
                      <td className="border border-zinc-800 p-2">
                        <a
                          href={`/dashboard/admin/controle/yoc/${yocId}/fighter/${f.id}`}
                          className="font-black underline decoration-[#ff4d00]/50 underline-offset-4"
                          style={{ color: "#ff4d00" }}
                        >
                          {f.naam_mm || "-"}
                        </a>
                      </td>
                      <td className="border border-zinc-800 p-2">
                        {f.geslacht_mm || "-"}
                      </td>
                      <td className="border border-zinc-800 p-2 font-bold">
                        {f.gewicht_mm || "-"}
                      </td>
                      <td className="border border-zinc-800 p-2">
                        <div className="font-bold">
                          {f.sportschool_mm || "-"}
                        </div>
                        {c?.sportschool_match_naam && (
                          <div className="mt-1 text-xs opacity-80">
                            Match: {c.sportschool_match_naam}
                          </div>
                        )}
                      </td>
                      <td className="border border-zinc-800 p-2">
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
                      <td className="border border-zinc-800 p-2">
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
                      <td className="border border-zinc-800 p-2 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            className="inline-block border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black uppercase !text-black"
                            href={`/dashboard/admin/controle/yoc/${yocId}/fighter/${f.id}`}
                          >
                            Detail
                          </a>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => rescrapeFighter(f)}
                            className="border border-[#ff4d00] bg-[#ff4d00] px-3 py-1 text-xs font-black uppercase !text-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Herscrape
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
