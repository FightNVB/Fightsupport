"use client";

import { authedFetch } from "@/lib/api/authedFetch";

import Link from "next/link";
import Image from "next/image";
import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Profile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  active_role?: string | null;
  bondteam?: string | null;
};

type Matchmaking = {
  id: string;
  naam?: string | null;
  datum?: string | null;
  locatie?: string | null;
  status?: string | null;
  stadium?: string | null;
  final_status?: string | null;
  bron_type?: string | null;
  created_at?: string | null;
  sent_at?: string | null;
  last_updated_at?: string | null;

  matchmaker_id?: string | null;
  maker_type?: string | null;
  maker_user_id?: string | null;
  uploaded_by?: string | null;
  huidige_eigenaar_type?: string | null;
  huidige_eigenaar_user_id?: string | null;
  huidige_eigenaar_bondteam?: string | null;
  bondteam?: string | null;

  is_actief?: boolean | null;
  locked_for_editing?: boolean | null;
  is_archived?: boolean | null;

  matchmaker_profiel?: Profile | null;
  eigenaar_profiel?: Profile | null;
  maker_profiel?: Profile | null;
  last_updated_by_profiel?: Profile | null;

  [key: string]: any;
};

const STADIA = [
  "bouwen_matchmaking",
  "concept_matchmaking",
  "ingediend_admin",
  "in_controle_admin",
  "review",
  "klaar_voor_weegstation",
  "in_weegstation",
  "weegstation_verwerkt",
  "definitieve_lineup",
  "klaar_voor_uitslagen",
  "uitslagen_in_bewerking",
  "uitslagen_definitief",
  "gearchiveerd",
];

const EIGENAARS = [
  "admin",
  "matchmaker",
  "official",
  "hoofdofficial",
  "bondteam",
];

const BONDTEAMS = ["", "NVB", "NKF", "WPKL", "VON"];

function metalFrameStyle(): CSSProperties {
  return {
    background:
      "linear-gradient(145deg,#ffffff 0%,#cfcfcf 9%,#606060 18%,#f8f8f8 32%,#9a9a9a 48%,#3d3d3d 62%,#f5f5f5 78%,#b8b8b8 100%)",
    border: "1px solid rgba(255,255,255,0.70)",
    boxShadow:
      "0 22px 58px rgba(0,0,0,0.58), inset 0 2px 1px rgba(255,255,255,0.90), inset 0 -2px 2px rgba(0,0,0,0.72)",
  };
}

function contentPanelStyle(): CSSProperties {
  return {
    background:
      "radial-gradient(circle at 12% 0%, rgba(255,77,0,0.12), transparent 28%), linear-gradient(180deg,#15191f 0%,#07090d 100%)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.85)",
  };
}

const pageBg =
  "radial-gradient(circle at 50% -10%, rgba(255,255,255,.16), transparent 22%), radial-gradient(circle at 10% 4%, rgba(255,77,0,.18), transparent 26%), radial-gradient(circle at 92% 12%, rgba(255,255,255,.10), transparent 23%), linear-gradient(180deg,#030405 0%,#090c10 42%,#010203 100%)";
const silverBtn =
  "inline-flex items-center justify-center gap-2 rounded-none border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#ededed_18%,#bfc3c8_50%,#737b84_78%,#f5f5f5_100%)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] !text-black shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_10px_24px_rgba(0,0,0,.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const orangeBtn =
  "inline-flex items-center justify-center gap-2 rounded-none border border-[#ffb18b] bg-[linear-gradient(180deg,#ff8a45_0%,#ff4d00_48%,#8f2600_100%)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_0_22px_rgba(255,77,0,.26)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const darkInput =
  "min-h-11 rounded-none border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.34))] px-4 text-sm font-bold text-white outline-none placeholder:text-zinc-500 focus:border-[#ff4d00]";

function fmtDate(v?: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("nl-NL");
}

function fmtDateTime(v?: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleString("nl-NL");
}

function person(p?: Profile | null, fallback?: string | null) {
  if (p?.full_name) return p.full_name;
  if (p?.email) return p.email;
  return fallback || "-";
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function resolvedBondteam(item: Matchmaking) {
  return (
    clean(item.huidige_eigenaar_bondteam) ||
    clean(item.bondteam) ||
    clean(item.eigenaar_profiel?.bondteam) ||
    clean(item.maker_profiel?.bondteam) ||
    clean(item.matchmaker_profiel?.bondteam)
  ).toUpperCase();
}

function isMatchmakerMade(item: Matchmaking) {
  const bron = clean(item.bron_type).toLowerCase();
  const makerType = clean(item.maker_type).toLowerCase();
  return bron.includes("matchmaker") || makerType === "matchmaker";
}

function makerLabel(item: Matchmaking) {
  if (isMatchmakerMade(item)) return "Matchmaker";
  if (
    clean(item.maker_type).toLowerCase() === "admin" ||
    clean(item.bron_type).toLowerCase() === "admin_upload"
  ) {
    return "Admin upload";
  }
  if (clean(item.bron_type)) return clean(item.bron_type).replaceAll("_", " ");
  return "Maker";
}

function makerName(item: Matchmaking) {
  if (isMatchmakerMade(item)) {
    return person(item.matchmaker_profiel, item.matchmaker_id);
  }
  return person(
    item.maker_profiel,
    item.maker_user_id || item.uploaded_by || item.matchmaker_id,
  );
}

export default function AdminMatchmakingsPage() {
  const [items, setItems] = useState<Matchmaking[]>([]);
  const [q, setQ] = useState("");
  const [stadium, setStadium] = useState("alles");
  const [eigenaar, setEigenaar] = useState("alles");
  const [archived, setArchived] = useState("actief");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      q,
      stadium,
      eigenaar,
      archived,
    });

    const res = await authedFetch(
      `/api/admin/algemeen/matchmakings?${params.toString()}`,
      {
        cache: "no-store",
      },
    );

    const json = await res.json();
    setLoading(false);

    if (!json.ok) {
      setError(json.error || "Laden mislukt");
      return;
    }

    setItems(json.items || []);
  }

  async function patch(id: string, field: string, value: any) {
    setSavingId(id);
    setError("");

    const res = await authedFetch("/api/admin/algemeen/matchmakings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });

    const json = await res.json();
    setSavingId("");

    if (!json.ok) {
      setError(json.error || "Opslaan mislukt");
      return;
    }

    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stadium, eigenaar, archived]);

  const counts = useMemo(() => {
    return {
      totaal: items.length,
      actief: items.filter((i) => i.is_actief && !i.is_archived).length,
      archief: items.filter((i) => i.is_archived).length,
      locked: items.filter((i) => i.locked_for_editing).length,
    };
  }, [items]);

  return (
    <main
      className="min-h-screen px-4 py-5 text-white"
      style={{ background: pageBg }}
    >
      <style>{`.silver-btn, .silver-btn *{color:#000!important;}`}</style>

      <div className="mx-auto w-full max-w-[1600px]">
        <div className="p-[6px]" style={metalFrameStyle()}>
          <div className="overflow-hidden border border-black bg-[linear-gradient(180deg,#151a21_0%,#07090d_100%)] shadow-2xl">
            <header className="border-b border-[#ff4d00]/55 bg-[linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.14))] px-5 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="flex flex-wrap items-center gap-2 md:justify-self-start">
                  <Link className={silverBtn} href="/dashboard/admin/administratie">
                    ← Administratie
                  </Link>

                  <button type="button" onClick={load} className={orangeBtn}>
                    ↺ Ververs
                  </button>
                </div>

                <div className="flex justify-center">
                  <Image
                    src="/branding/fightsupport/excel-logo.png"
                    alt="FightSupport"
                    width={340}
                    height={96}
                    priority
                    style={{
                      width: "auto",
                      height: "72px",
                      objectFit: "contain",
                      filter: "drop-shadow(0 16px 22px rgba(0,0,0,.58))",
                    }}
                  />
                </div>

                <div className="text-left md:text-right md:justify-self-end">
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff4d00]">
                    NVB Superadmin • beheer
                  </div>
                  <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
                    Alle matchmakings
                  </h1>
                  <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
                    Eigenaar • stadium • bondteam • lifecycle
                  </div>
                </div>
              </div>
            </header>

            <section className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-4">
              <Stat label="In selectie" value={counts.totaal} />
              <Stat label="Actief" value={counts.actief} />
              <Stat label="Locked" value={counts.locked} />
              <Stat label="Archief" value={counts.archief} accent />
            </section>

            <div className="p-4 md:p-5">
              <div className="p-[5px]" style={metalFrameStyle()}>
                <div className="p-4 md:p-5" style={contentPanelStyle()}>
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff4d00]">
                        Matchmaking overzicht
                      </div>
                      <h2 className="mt-1 text-3xl font-black uppercase tracking-[0.06em] text-white md:text-[38px]">
                        Status & eigenaar
                      </h2>
                      <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-zinc-300">
                        Overzicht van alle matchmakings uit de app met huidige
                        eigenaar, bondteam, stadium, status en technische
                        lifecycle informatie.
                      </p>
                    </div>
                    <div className="border border-white/15 bg-black/30 px-4 py-3 text-right shadow-xl">
                      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                        Status
                      </div>
                      <div className="text-2xl font-black text-[#ff4d00]">
                        {loading ? "Laden" : `${items.length} items`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 lg:grid-cols-[170px_170px_170px_1fr]">
                    <select
                      value={stadium}
                      onChange={(e) => setStadium(e.target.value)}
                      className={darkInput}
                    >
                      <option value="alles">Alle stadia</option>
                      {STADIA.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>

                    <select
                      value={eigenaar}
                      onChange={(e) => setEigenaar(e.target.value)}
                      className={darkInput}
                    >
                      <option value="alles">Alle eigenaren</option>
                      {EIGENAARS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <select
                      value={archived}
                      onChange={(e) => setArchived(e.target.value)}
                      className={darkInput}
                    >
                      <option value="actief">Alleen actief</option>
                      <option value="archief">Alleen archief</option>
                      <option value="alles">Alles</option>
                    </select>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        load();
                      }}
                      className="grid gap-2 md:grid-cols-[1fr_auto]"
                    >
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Zoek naam, id, gebruiker, bondteam, stadium"
                        className={darkInput}
                      />
                      <button type="submit" className={silverBtn}>
                        Zoek
                      </button>
                    </form>
                  </div>

                  {error ? (
                    <div className="mt-4 border border-red-500/45 bg-red-950/40 px-4 py-3 text-sm font-bold text-red-200">
                      {error}
                    </div>
                  ) : null}

                  <div className="mt-5 overflow-hidden border border-zinc-700 bg-black/45 shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1320px] table-fixed border-collapse text-[12px]">
                        <thead className="bg-[#252525] text-left text-[10px] uppercase tracking-[0.10em] text-zinc-300">
                          <tr>
                            <th className="w-[23%] border border-zinc-700 px-2 py-2">
                              Matchmaking
                            </th>
                            <th className="w-[8%] border border-zinc-700 px-2 py-2">
                              Datum
                            </th>
                            <th className="w-[10%] border border-zinc-700 px-2 py-2">
                              Eigenaar
                            </th>
                            <th className="w-[17%] border border-zinc-700 px-2 py-2">
                              Gebruiker
                            </th>
                            <th className="w-[9%] border border-zinc-700 px-2 py-2">
                              Bondteam
                            </th>
                            <th className="w-[13%] border border-zinc-700 px-2 py-2">
                              Stadium
                            </th>
                            <th className="w-[11%] border border-zinc-700 px-2 py-2">
                              Status
                            </th>
                            <th className="w-[15%] border border-zinc-700 px-2 py-2">
                              Info
                            </th>
                            <th className="w-[8%] border border-zinc-700 px-2 py-2 text-right">
                              Actie
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {loading ? (
                            <tr>
                              <td
                                colSpan={9}
                                className="border border-zinc-800 px-4 py-10 text-center text-sm font-bold text-zinc-300"
                              >
                                Laden…
                              </td>
                            </tr>
                          ) : items.length === 0 ? (
                            <tr>
                              <td
                                colSpan={9}
                                className="border border-zinc-800 px-4 py-10 text-center text-sm font-bold text-zinc-300"
                              >
                                Geen matchmakings gevonden.
                              </td>
                            </tr>
                          ) : (
                            items.map((item, index) => {
                              const isLightRow = index % 2 === 1;
                              const rowBg = isLightRow
                                ? "bg-zinc-100 hover:bg-white"
                                : "bg-[#171717] hover:bg-[#242424]";
                              const border = isLightRow
                                ? "border-zinc-300"
                                : "border-zinc-800";
                              const mainText = isLightRow
                                ? "text-black"
                                : "text-white";
                              const subText = isLightRow
                                ? "text-zinc-700"
                                : "text-zinc-400";
                              const fieldClass = isLightRow
                                ? "border border-zinc-400 bg-white px-2 py-1 text-xs font-bold text-black outline-none"
                                : "border border-zinc-600 bg-[#111] px-2 py-1 text-xs font-bold text-white outline-none";
                              const bondteamValue = resolvedBondteam(item);
                              const bondOptions =
                                bondteamValue &&
                                !BONDTEAMS.includes(bondteamValue)
                                  ? [...BONDTEAMS, bondteamValue]
                                  : BONDTEAMS;

                              return (
                                <Fragment key={item.id}>
                                  <tr className={rowBg}>
                                    <td
                                      className={`border ${border} px-2 py-2 align-middle`}
                                    >
                                      <div
                                        className="truncate font-black uppercase tracking-[0.02em] text-[#ff4d00]"
                                        title={item.naam || "Zonder naam"}
                                      >
                                        {item.naam || "Zonder naam"}
                                      </div>
                                      <div
                                        className={`mt-0.5 truncate text-[10px] font-semibold ${subText}`}
                                        title={item.id}
                                      >
                                        {item.id}
                                      </div>
                                      <div
                                        className={`mt-0.5 truncate text-[10px] font-semibold ${subText}`}
                                        title={item.locatie || "-"}
                                      >
                                        {item.locatie || "-"}
                                      </div>
                                    </td>

                                    <td
                                      className={`border ${border} whitespace-nowrap px-2 py-2 align-middle font-black ${mainText}`}
                                    >
                                      {fmtDate(item.datum)}
                                    </td>

                                    <td
                                      className={`border ${border} px-2 py-2`}
                                    >
                                      <select
                                        value={item.huidige_eigenaar_type || ""}
                                        onChange={(e) =>
                                          patch(
                                            item.id,
                                            "huidige_eigenaar_type",
                                            e.target.value,
                                          )
                                        }
                                        className={`w-full ${fieldClass}`}
                                      >
                                        <option value="">-</option>
                                        {EIGENAARS.map((s) => (
                                          <option key={s} value={s}>
                                            {s}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    <td
                                      className={`border ${border} px-2 py-2 align-middle ${mainText}`}
                                    >
                                      <div className="truncate font-black">
                                        {person(
                                          item.eigenaar_profiel,
                                          item.huidige_eigenaar_user_id,
                                        )}
                                      </div>
                                      <div
                                        className={`mt-0.5 truncate text-[10px] font-semibold ${subText}`}
                                        title={`${makerLabel(item)}: ${makerName(item)}`}
                                      >
                                        {makerLabel(item)}: {makerName(item)}
                                      </div>
                                    </td>

                                    <td
                                      className={`border ${border} px-2 py-2`}
                                    >
                                      <select
                                        value={bondteamValue}
                                        onChange={(e) => {
                                          patch(
                                            item.id,
                                            "huidige_eigenaar_bondteam",
                                            e.target.value,
                                          );
                                          patch(
                                            item.id,
                                            "bondteam",
                                            e.target.value,
                                          );
                                        }}
                                        className={`w-full ${fieldClass}`}
                                      >
                                        {bondOptions.map((s) => (
                                          <option key={s || "leeg"} value={s}>
                                            {s || "-"}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    <td
                                      className={`border ${border} px-2 py-2`}
                                    >
                                      <select
                                        value={item.stadium || ""}
                                        onChange={(e) => {
                                          patch(
                                            item.id,
                                            "stadium",
                                            e.target.value,
                                          );
                                          patch(
                                            item.id,
                                            "status",
                                            e.target.value,
                                          );
                                        }}
                                        className={`w-full ${fieldClass}`}
                                      >
                                        <option value="">-</option>
                                        {STADIA.map((s) => (
                                          <option key={s} value={s}>
                                            {s}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    <td
                                      className={`border ${border} px-2 py-2 align-middle`}
                                    >
                                      <span className="inline-flex max-w-full border border-[#ff4d00] px-2 py-1 text-[10px] font-black uppercase text-[#ff4d00]">
                                        <span className="truncate">
                                          {item.status || "-"}
                                        </span>
                                      </span>
                                      <div
                                        className={`mt-1 truncate text-[10px] font-semibold ${subText}`}
                                      >
                                        Final: {item.final_status || "-"}
                                      </div>
                                    </td>

                                    <td
                                      className={`border ${border} px-2 py-2 align-middle text-[10px] font-semibold ${subText}`}
                                    >
                                      <div className="truncate">
                                        Aangemaakt:{" "}
                                        {fmtDateTime(item.created_at)}
                                      </div>
                                      <div className="truncate">
                                        Verzonden: {fmtDateTime(item.sent_at)}
                                      </div>
                                      <div className="truncate">
                                        Laatst:{" "}
                                        {fmtDateTime(item.last_updated_at)}
                                      </div>
                                      <div
                                        className={`truncate font-black ${mainText}`}
                                      >
                                        {item.is_archived
                                          ? "Archief"
                                          : "Niet archief"}{" "}
                                        /{" "}
                                        {item.locked_for_editing
                                          ? "Locked"
                                          : "Open"}
                                      </div>
                                    </td>

                                    <td
                                      className={`border ${border} px-2 py-2 align-middle text-right`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOpenId(
                                            openId === item.id ? "" : item.id,
                                          )
                                        }
                                        className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-2 py-1 text-[10px] font-black uppercase !text-black"
                                      >
                                        {openId === item.id ? "Sluit" : "Info"}
                                      </button>

                                      {savingId === item.id ? (
                                        <div className="mt-2 text-[10px] font-black text-[#ff4d00]">
                                          Opslaan…
                                        </div>
                                      ) : null}
                                    </td>
                                  </tr>

                                  {openId === item.id ? (
                                    <tr className="bg-[#101010] text-white">
                                      <td
                                        colSpan={9}
                                        className="border border-zinc-800 p-3"
                                      >
                                        <div className="grid gap-3 md:grid-cols-3">
                                          <InfoCard title="Eigenaarschap">
                                            <p>
                                              Eigenaar type:{" "}
                                              {item.huidige_eigenaar_type ||
                                                "-"}
                                            </p>
                                            <p>
                                              Eigenaar user:{" "}
                                              {person(
                                                item.eigenaar_profiel,
                                                item.huidige_eigenaar_user_id,
                                              )}
                                            </p>
                                            <p>
                                              Eigenaar bondteam:{" "}
                                              {resolvedBondteam(item) || "-"}
                                            </p>
                                            <p>
                                              Bondteam database:{" "}
                                              {item.bondteam || "-"}
                                            </p>
                                            <p>
                                              Maker: {makerLabel(item)} /{" "}
                                              {makerName(item)}
                                            </p>
                                            {isMatchmakerMade(item) ? (
                                              <p>
                                                Matchmaker:{" "}
                                                {person(
                                                  item.matchmaker_profiel,
                                                  item.matchmaker_id,
                                                )}
                                              </p>
                                            ) : null}
                                          </InfoCard>

                                          <InfoCard title="Lifecycle">
                                            <p>
                                              submitted_to_admin_at:{" "}
                                              {fmtDateTime(
                                                item.submitted_to_admin_at,
                                              )}
                                            </p>
                                            <p>
                                              entered_control_at:{" "}
                                              {fmtDateTime(
                                                item.entered_control_at,
                                              )}
                                            </p>
                                            <p>
                                              sent_to_officials_at:{" "}
                                              {fmtDateTime(
                                                item.sent_to_officials_at,
                                              )}
                                            </p>
                                            <p>
                                              entered_weegstation_at:{" "}
                                              {fmtDateTime(
                                                item.entered_weegstation_at,
                                              )}
                                            </p>
                                            <p>
                                              results_finalized_at:{" "}
                                              {fmtDateTime(
                                                item.results_finalized_at,
                                              )}
                                            </p>
                                            <p>
                                              archived_at:{" "}
                                              {fmtDateTime(item.archived_at)}
                                            </p>
                                          </InfoCard>

                                          <InfoCard title="Technisch">
                                            <p>
                                              event_id: {item.event_id || "-"}
                                            </p>
                                            <p>
                                              upload_id:{" "}
                                              {item.matchmaking_upload_id ||
                                                "-"}
                                            </p>
                                            <p>
                                              bron_type: {item.bron_type || "-"}
                                            </p>
                                            <p>
                                              archive_record_id:{" "}
                                              {item.archive_record_id || "-"}
                                            </p>
                                            <p>
                                              last_updated_by:{" "}
                                              {person(
                                                item.last_updated_by_profiel,
                                                item.last_updated_by,
                                              )}
                                            </p>
                                          </InfoCard>
                                        </div>

                                        <details className="mt-3 border border-zinc-700 bg-[#080808] p-3">
                                          <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.16em] text-[#ff4d00]">
                                            Ruwe database regel
                                          </summary>
                                          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-zinc-300">
                                            {JSON.stringify(item, null, 2)}
                                          </pre>
                                        </details>
                                      </td>
                                    </tr>
                                  ) : null}
                                </Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "border border-[#ff4d00]/35 bg-[linear-gradient(180deg,rgba(255,77,0,.14),rgba(0,0,0,.20))] p-3 shadow-xl"
          : "border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.24))] p-3 shadow-xl"
      }
    >
      <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black leading-none text-white">
        {value}
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-zinc-700 bg-[#181818] p-3 text-xs font-semibold leading-relaxed text-zinc-300">
      <b className="text-[#ff4d00]">{title}</b>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}
