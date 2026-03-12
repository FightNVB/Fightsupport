"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const NVB_ORANGE = "#ff4d00";

// ─── Metal frame helpers (matches the professional controle page style) ───────

function metalFrameStyle(accent: "none" | "orange" = "orange"): CSSProperties {
  const accentGlow =
    accent === "orange"
      ? "radial-gradient(640px 320px at 50% 0%, rgba(255,77,0,0.18), transparent 62%)"
      : "radial-gradient(640px 320px at 50% 0%, rgba(255,255,255,0.06), transparent 62%)";
  const brushed =
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 4px)";
  const sheen =
    "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 48%, rgba(255,255,255,0.10) 70%, rgba(255,255,255,0) 100%)";
  return {
    border: "5px solid rgba(10,10,12,0.92)",
    borderRadius: 22,
    background: `${accentGlow}, ${sheen}, ${brushed}, linear-gradient(180deg, #3a3d44 0%, #1f2025 52%, #0a0b0e 100%)`,
    boxShadow:
      "0 26px 70px rgba(0,0,0,0.70)," +
      " inset 0 0 0 2px rgba(255,255,255,0.14)," +
      " inset 0 0 0 4px rgba(180,180,190,0.18)," +
      " inset 0 0 0 7px rgba(0,0,0,0.55)," +
      " inset 0 1px 0 rgba(255,255,255,0.22)," +
      " inset 0 -18px 24px rgba(0,0,0,0.65)",
  };
}

function metalInnerStyle(): CSSProperties {
  return {
    border: "3px solid rgba(0,0,0,0.45)",
    borderRadius: 16,
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(255,255,255,0.025) 1px, rgba(255,255,255,0.025) 6px)," +
      " linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(233,236,240,0.98) 100%)",
    boxShadow:
      "inset 0 0 0 2px rgba(255,255,255,0.70)," +
      " inset 0 0 0 6px rgba(0,0,0,0.10)," +
      " inset 0 -12px 22px rgba(0,0,0,0.12)",
  };
}

const silverBackplate: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type BoutRow = {
  partij_nr: number;
  discipline?: string | null;
  klasse_mm?: string | null;
  rood_naam_fp?: string | null;
  rood_naam_mm?: string | null;
  rood_gym_fp?: string | null;
  rood_gym_mm?: string | null;
  rood_va_mm?: string | null;
  rood_gewicht?: number | null;
  blauw_naam_fp?: string | null;
  blauw_naam_mm?: string | null;
  blauw_gym_fp?: string | null;
  blauw_gym_mm?: string | null;
  blauw_va_mm?: string | null;
  blauw_gewicht?: number | null;
  max_gewicht?: number | null;
};

type WeegRecord = {
  id?: string;
  matchmaking_id: string;
  partij_nr: number;
  hoek: "rood" | "blauw";
  naam: string;
  va_nr: string;
  max_gewicht: number | null;
  gewogen_gewicht: number | null;
  dispensatie: boolean;
  dispensatie_reden: string;
  boete: boolean;
  opmerking: string;
};

type WeegStatus = "niet_gewogen" | "ok" | "ok_tolerantie" | "dispensatie_nodig" | "afgekeurd";

type FighterItem = {
  partij_nr: number;
  hoek: "rood" | "blauw";
  naam: string;
  gym: string;
  va_nr: string;
  geregistreerd_gewicht: number | null;
  max_gewicht: number | null;
  discipline: string;
  klasse: string;
};

// ─── Core evaluation function ─────────────────────────────────────────────────

function evaluateBout(
  gewogenGewicht: number | null,
  maxGewicht: number | null
): { status: WeegStatus; label: string; color: string } {
  if (gewogenGewicht == null) {
    return { status: "niet_gewogen", label: "Niet gewogen", color: "#888" };
  }
  if (maxGewicht == null) {
    return { status: "ok", label: "✅ OK (geen max)", color: "#22c55e" };
  }

  const verschil = gewogenGewicht - maxGewicht;
  // Weegschaal tolerantie: tot 0.3 kg boven max is acceptabel
  const normalMax = 0.3;

  if (verschil <= 0) {
    return { status: "ok", label: "✅ Gewicht OK", color: "#22c55e" };
  }
  if (verschil <= normalMax) {
    return {
      status: "ok_tolerantie",
      label: `✅ OK (${verschil.toFixed(2)} kg tolerantie)`,
      color: "#22c55e",
    };
  }
  // More than 0.3 kg over the limit
  return {
    status: "dispensatie_nodig",
    label: `⚠️ Dispensatie (+${verschil.toFixed(2)} kg)`,
    color: NVB_ORANGE,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeText(v: unknown, fallback = "-"): string {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function toNum(s: string): number | null {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WeegstationPage() {
  const params = useParams();
  const router = useRouter();
  const matchmakingId = params?.matchmakingId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  const [evenementNaam, setEvenementNaam] = useState<string | null>(null);
  const [evenementDatum, setEvenementDatum] = useState<string | null>(null);

  const [bouts, setBouts] = useState<BoutRow[]>([]);
  const [weegData, setWeegData] = useState<Record<string, WeegRecord>>({});

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [zoek, setZoek] = useState("");

  // Right panel form state
  const [inputGewicht, setInputGewicht] = useState("");
  const [inputDispensatie, setInputDispensatie] = useState(false);
  const [inputDispensatieReden, setInputDispensatieReden] = useState("");
  const [inputBoete, setInputBoete] = useState(false);
  const [inputOpmerking, setInputOpmerking] = useState("");
  const [saving, setSaving] = useState(false);

  const separator = useMemo(
    () =>
      ({
        height: "1px",
        background:
          "linear-gradient(to right, transparent, rgba(220,220,220,0.22), transparent)",
      }) as CSSProperties,
    []
  );

  // Build unique key for fighter
  function fighterKey(partij_nr: number, hoek: "rood" | "blauw"): string {
    return `${partij_nr}_${hoek}`;
  }

  // ─── Load data ─────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Event info
      try {
        const { data: ups } = await supabase
          .from("matchmaking_uploads")
          .select("evenement_naam, evenement_datum, event_id")
          .eq("matchmaking_id", matchmakingId)
          .order("uploaded_at", { ascending: false })
          .limit(1);

        const up = (ups ?? [])[0] as Record<string, unknown> | undefined;
        let naam = String(up?.evenement_naam ?? "").trim() || null;
        let datum = String(up?.evenement_datum ?? "").trim() || null;
        const eventId = String(up?.event_id ?? "").trim() || null;

        if (eventId && (!naam || !datum)) {
          const { data: ev } = await supabase
            .from("events")
            .select("naam, datum")
            .eq("id", eventId)
            .maybeSingle();
          if (!naam) naam = String((ev as Record<string, unknown>)?.naam ?? "").trim() || null;
          if (!datum) datum = String((ev as Record<string, unknown>)?.datum ?? "").trim() || null;
        }

        setEvenementNaam(naam);
        setEvenementDatum(datum);
      } catch {
        /* silently ignore */
      }

      // Fetch latest controle run bouts
      const { data: lastCtx } = await supabase
        .from("controle_bout_context")
        .select("controle_run_id, created_at")
        .eq("matchmaking_id", matchmakingId)
        .order("created_at", { ascending: false })
        .limit(1);

      const latestRunId = lastCtx?.[0]?.controle_run_id
        ? String(lastCtx[0].controle_run_id)
        : null;

      let boutQuery = supabase
        .from("controle_bout_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId);
      if (latestRunId) boutQuery = boutQuery.eq("controle_run_id", latestRunId);

      const { data: ctxRows, error: ctxErr } = await boutQuery.order("partij_nr", {
        ascending: true,
      });
      if (ctxErr) throw ctxErr;

      setBouts((ctxRows ?? []) as BoutRow[]);

      // Fetch existing weigh-in records
      const { data: weegRows, error: weegErr } = await supabase
        .from("weeg_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId);

      if (weegErr && weegErr.code !== "42P01") {
        // table may not exist yet – ignore gracefully
        console.warn(`weeg_resultaten not available for matchmaking ${matchmakingId}:`, weegErr.message);
      }

      const map: Record<string, WeegRecord> = {};
      for (const row of (weegRows ?? []) as WeegRecord[]) {
        const k = fighterKey(row.partij_nr, row.hoek);
        map[k] = row;
      }
      setWeegData(map);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (matchmakingId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingId]);

  // ─── Derived fighter list ──────────────────────────────────────────────────

  const fighters = useMemo<FighterItem[]>(() => {
    const list: FighterItem[] = [];
    for (const b of bouts) {
      const pn = Number(b.partij_nr);
      if (!Number.isFinite(pn)) continue;

      const disc = safeText(b.discipline, "");
      const klasse = safeText(b.klasse_mm, "");

      const roodNaam =
        safeText(b.rood_naam_fp ?? b.rood_naam_mm, "").replace(/^-$/, "").trim() ||
        safeText(b.rood_naam_mm, "").replace(/^-$/, "").trim() ||
        "";
      const blauwNaam =
        safeText(b.blauw_naam_fp ?? b.blauw_naam_mm, "").replace(/^-$/, "").trim() ||
        safeText(b.blauw_naam_mm, "").replace(/^-$/, "").trim() ||
        "";

      if (roodNaam) {
        list.push({
          partij_nr: pn,
          hoek: "rood",
          naam: roodNaam,
          gym: safeText(b.rood_gym_fp ?? b.rood_gym_mm, "-"),
          va_nr: safeText(b.rood_va_mm, "-"),
          geregistreerd_gewicht:
            b.rood_gewicht != null ? Number(b.rood_gewicht) : null,
          max_gewicht: b.max_gewicht != null ? Number(b.max_gewicht) : null,
          discipline: disc,
          klasse,
        });
      }

      if (blauwNaam) {
        list.push({
          partij_nr: pn,
          hoek: "blauw",
          naam: blauwNaam,
          gym: safeText(b.blauw_gym_fp ?? b.blauw_gym_mm, "-"),
          va_nr: safeText(b.blauw_va_mm, "-"),
          geregistreerd_gewicht:
            b.blauw_gewicht != null ? Number(b.blauw_gewicht) : null,
          max_gewicht: b.max_gewicht != null ? Number(b.max_gewicht) : null,
          discipline: disc,
          klasse,
        });
      }
    }
    return list;
  }, [bouts]);

  const filteredFighters = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    if (!q) return fighters;
    return fighters.filter(
      (f) =>
        f.naam.toLowerCase().includes(q) ||
        f.gym.toLowerCase().includes(q) ||
        f.va_nr.toLowerCase().includes(q) ||
        String(f.partij_nr).includes(q)
    );
  }, [fighters, zoek]);

  // ─── Selected fighter ──────────────────────────────────────────────────────

  const selectedFighter = useMemo(
    () => fighters.find((f) => fighterKey(f.partij_nr, f.hoek) === selectedKey) ?? null,
    [fighters, selectedKey]
  );

  const selectedWeeg = selectedKey ? weegData[selectedKey] ?? null : null;

  function selectFighter(f: FighterItem) {
    const k = fighterKey(f.partij_nr, f.hoek);
    setSelectedKey(k);
    const rec = weegData[k];
    setInputGewicht(rec?.gewogen_gewicht != null ? String(rec.gewogen_gewicht) : "");
    setInputDispensatie(rec?.dispensatie ?? false);
    setInputDispensatieReden(rec?.dispensatie_reden ?? "");
    setInputBoete(rec?.boete ?? false);
    setInputOpmerking(rec?.opmerking ?? "");
    setMelding(null);
  }

  // ─── Save weigh-in ─────────────────────────────────────────────────────────

  async function saveWeging() {
    if (!selectedFighter || !matchmakingId) return;
    setSaving(true);
    setMelding(null);

    try {
      const gewogenGewicht = toNum(inputGewicht);

      const record = {
        matchmaking_id: matchmakingId,
        partij_nr: selectedFighter.partij_nr,
        hoek: selectedFighter.hoek,
        naam: selectedFighter.naam,
        va_nr: selectedFighter.va_nr,
        max_gewicht: selectedFighter.max_gewicht,
        gewogen_gewicht: gewogenGewicht,
        dispensatie: inputDispensatie,
        dispensatie_reden: inputDispensatieReden,
        boete: inputBoete,
        opmerking: inputOpmerking,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from("weeg_resultaten")
        .upsert(record, { onConflict: "matchmaking_id,partij_nr,hoek" });

      if (upsertErr) throw upsertErr;

      // Update local state
      const k = fighterKey(selectedFighter.partij_nr, selectedFighter.hoek);
      setWeegData((prev) => ({ ...prev, [k]: record as WeegRecord }));
      setMelding("✅ Opgeslagen!");
    } catch (e: unknown) {
      setMelding(`❌ Fout: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  // ─── Current evaluation ────────────────────────────────────────────────────

  const currentEval = useMemo(() => {
    if (!selectedFighter) return null;
    const gewogen = toNum(inputGewicht);
    return evaluateBout(gewogen, selectedFighter.max_gewicht);
  }, [selectedFighter, inputGewicht]);

  // ─── Bouts overview table ──────────────────────────────────────────────────

  const subtitle = useMemo(() => {
    const naam = (evenementNaam ?? "").trim();
    const datum = (evenementDatum ?? "").trim();
    if (naam && datum) return `${naam}  ${datum}`;
    if (naam) return naam;
    if (datum) return datum;
    return "-";
  }, [evenementNaam, evenementDatum]);

  // ─── Status helpers for table ──────────────────────────────────────────────

  function getFighterStatusBadge(partij_nr: number, hoek: "rood" | "blauw") {
    const k = fighterKey(partij_nr, hoek);
    const rec = weegData[k];
    if (!rec || rec.gewogen_gewicht == null) {
      return (
        <span className="px-2 py-1 rounded text-[11px] font-bold bg-gray-200 text-gray-700">
          Niet gewogen
        </span>
      );
    }
    const ev = evaluateBout(rec.gewogen_gewicht, rec.max_gewicht);
    const bgColor =
      ev.status === "ok" || ev.status === "ok_tolerantie"
        ? "#22c55e"
        : ev.status === "dispensatie_nodig"
        ? NVB_ORANGE
        : "#ef4444";
    return (
      <span
        className="px-2 py-1 rounded text-[11px] font-bold"
        style={{ background: bgColor, color: "#fff" }}
      >
        {rec.dispensatie ? "✅ Dispensatie" : ev.label}
      </span>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`${inter.className} min-h-screen bg-zinc-100 text-zinc-900`}>
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 py-6">
        <div style={metalFrameStyle("orange")} className="p-3 md:p-4">
          <div style={metalInnerStyle()} className="p-4 md:p-5">

            {/* ── TOP BAR ── */}
            <div
              className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                border: "2px solid rgba(63,63,70,0.55)",
                boxShadow: "0 14px 30px rgba(0,0,0,0.14)",
                color: "#fff",
              }}
            >
              {/* Left: back button */}
              <div className="min-w-[180px]">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/officials/controle/${encodeURIComponent(matchmakingId)}`
                    )
                  }
                  className="px-3 py-1.5 rounded font-extrabold text-sm transition hover:opacity-90"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "rgba(240,240,240,0.95)",
                  }}
                >
                  ← Terug
                </button>
              </div>

              {/* Center: logo */}
              <div className="flex-1 flex justify-center">
                <div
                  className="rounded-[22px] p-[4px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #f5f5f5 0%, #bdbdbd 28%, #8e8e8e 55%, #f0f0f0 72%, #6f6f6f 100%)",
                    boxShadow:
                      "0 0 0 2px rgba(255,255,255,0.45), 0 0 0 6px rgba(120,120,120,0.22), 0 14px 30px rgba(0,0,0,0.55), 0 0 28px rgba(220,220,220,0.22)",
                  }}
                >
                  <div
                    className="rounded-[18px] px-4 py-3"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.40) 100%)",
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <Image
                      src="/branding/fightsupport/logo-dark.png"
                      width={92}
                      height={92}
                      alt="FightSupport"
                      priority
                    />
                  </div>
                </div>
              </div>

              {/* Right: empty spacer for balance */}
              <div className="min-w-[180px]" />
            </div>

            <div className="my-3" style={separator} />

            {/* ── TITLE ── */}
            <div className="text-center">
              <div
                style={{
                  color: NVB_ORANGE,
                  fontSize: 46,
                  fontWeight: 900,
                  letterSpacing: "0.02em",
                }}
              >
                Weegstation
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 24,
                  fontWeight: 900,
                  letterSpacing: "0.02em",
                  color: "#1f1f23",
                  display: "inline-block",
                  padding: "8px 14px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.72)",
                  border: "2px solid rgba(42,42,46,0.25)",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                }}
              >
                {safeText(subtitle, "Onbekend evenement")}
              </div>
            </div>

            <div className="my-3" style={separator} />

            {/* ── CONTENT ── */}
            <div
              className="rounded-3xl border-2 border-zinc-500/60 p-4 md:p-5 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50"
              style={silverBackplate}
            >
              {loading ? (
                <div className="text-zinc-700 py-10 text-center">Laden…</div>
              ) : error ? (
                <div className="text-red-700 py-10 text-center">{error}</div>
              ) : (
                <>
                  {/* ── MAIN LAYOUT: left (fighter list) + right (weight entry) ── */}
                  <div className="flex gap-4 flex-wrap md:flex-nowrap">

                    {/* ── LEFT PANEL: Fighter list ── */}
                    <div
                      className="w-full md:w-80 shrink-0 rounded-2xl overflow-hidden"
                      style={{
                        border: "2px solid rgba(0,0,0,0.14)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                        background: "rgba(255,255,255,0.70)",
                      }}
                    >
                      {/* Search box */}
                      <div
                        className="px-3 py-2"
                        style={{
                          background:
                            "linear-gradient(180deg, #2a2a2e 0%, #1e1e22 100%)",
                          borderBottom: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Zoek vechter (naam, VA, gym)…"
                          value={zoek}
                          onChange={(e) => setZoek(e.target.value)}
                          className="w-full rounded-lg px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:border-orange-500 placeholder-zinc-400"
                        />
                      </div>

                      {/* Fighter list */}
                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: 480 }}
                      >
                        {filteredFighters.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-zinc-500 text-center">
                            Geen vechters gevonden
                          </div>
                        ) : (
                          filteredFighters.map((f) => {
                            const k = fighterKey(f.partij_nr, f.hoek);
                            const rec = weegData[k];
                            const isSelected = selectedKey === k;
                            const hasWeging = rec?.gewogen_gewicht != null;
                            const ev = hasWeging
                              ? evaluateBout(rec.gewogen_gewicht ?? null, rec.max_gewicht ?? null)
                              : null;
                            const isOk =
                              ev?.status === "ok" ||
                              ev?.status === "ok_tolerantie" ||
                              rec?.dispensatie;

                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() => selectFighter(f)}
                                className="w-full text-left px-3 py-3 border-b border-zinc-200 transition hover:bg-zinc-100"
                                style={{
                                  background: isSelected
                                    ? "rgba(255,77,0,0.10)"
                                    : undefined,
                                  borderLeft: isSelected
                                    ? `4px solid ${NVB_ORANGE}`
                                    : "4px solid transparent",
                                }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase"
                                        style={{
                                          background:
                                            f.hoek === "rood"
                                              ? "#ef4444"
                                              : "#3b82f6",
                                          color: "#fff",
                                        }}
                                      >
                                        {f.hoek}
                                      </span>
                                      <span className="text-xs text-zinc-500">
                                        #{f.partij_nr}
                                      </span>
                                    </div>
                                    <div className="text-sm font-semibold text-zinc-900 truncate mt-0.5">
                                      {f.naam}
                                    </div>
                                    <div className="text-xs text-zinc-500 truncate">
                                      {f.gym}
                                    </div>
                                  </div>
                                  <div className="shrink-0 flex flex-col items-end gap-1">
                                    {hasWeging ? (
                                      <span
                                        className="text-[11px] font-bold px-2 py-0.5 rounded"
                                        style={{
                                          background: isOk
                                            ? "#22c55e"
                                            : NVB_ORANGE,
                                          color: "#fff",
                                        }}
                                      >
                                        {rec?.gewogen_gewicht ?? 0} kg
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-zinc-400 italic">
                                        Niet gewogen
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* ── RIGHT PANEL: Weight entry ── */}
                    <div className="flex-1 min-w-0">
                      {!selectedFighter ? (
                        <div
                          className="flex items-center justify-center h-64 rounded-2xl text-zinc-500 text-sm"
                          style={{
                            border: "2px dashed rgba(0,0,0,0.15)",
                            background: "rgba(255,255,255,0.40)",
                          }}
                        >
                          ← Selecteer een vechter om te wegen
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Fighter details card */}
                          <div
                            className="rounded-2xl p-4"
                            style={{
                              background:
                                "linear-gradient(180deg, #2a2a2e 0%, #1e1e22 100%)",
                              border: "2px solid rgba(255,255,255,0.10)",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.30)",
                            }}
                          >
                            <div className="flex items-start gap-4 flex-wrap">
                              {/* Corner badge */}
                              <div
                                className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center font-extrabold text-white text-lg uppercase"
                                style={{
                                  background:
                                    selectedFighter.hoek === "rood"
                                      ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                                      : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                                  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
                                }}
                              >
                                {selectedFighter.hoek === "rood" ? "🔴" : "🔵"}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div
                                  className="text-xs font-bold uppercase tracking-widest mb-1"
                                  style={{ color: NVB_ORANGE }}
                                >
                                  Partij #{selectedFighter.partij_nr} ·{" "}
                                  {selectedFighter.hoek.toUpperCase()}
                                </div>
                                <div className="text-xl font-black text-white truncate">
                                  {selectedFighter.naam}
                                </div>
                                <div className="text-sm text-zinc-400 mt-0.5">
                                  {selectedFighter.gym}
                                </div>
                              </div>

                              <div className="text-right space-y-1 shrink-0">
                                <div className="text-xs text-zinc-400">VA</div>
                                <div className="text-sm font-semibold text-zinc-200">
                                  {selectedFighter.va_nr}
                                </div>
                                <div className="text-xs text-zinc-400 mt-1">
                                  {selectedFighter.discipline}
                                  {selectedFighter.klasse
                                    ? ` · ${selectedFighter.klasse}`
                                    : ""}
                                </div>
                              </div>
                            </div>

                            {/* Weight info row */}
                            <div
                              className="mt-3 pt-3 flex gap-6 flex-wrap"
                              style={{
                                borderTop: "1px solid rgba(255,255,255,0.08)",
                              }}
                            >
                              {selectedFighter.geregistreerd_gewicht != null && (
                                <div>
                                  <div className="text-xs text-zinc-500">
                                    Ingeschreven gewicht
                                  </div>
                                  <div className="text-base font-bold text-white">
                                    {selectedFighter.geregistreerd_gewicht} kg
                                  </div>
                                </div>
                              )}
                              {selectedFighter.max_gewicht != null && (
                                <div>
                                  <div className="text-xs text-zinc-500">
                                    Max gewicht klasse
                                  </div>
                                  <div className="text-base font-bold text-white">
                                    {selectedFighter.max_gewicht} kg
                                  </div>
                                </div>
                              )}
                              {selectedWeeg?.gewogen_gewicht != null && (
                                <div>
                                  <div className="text-xs text-zinc-500">
                                    Gewogen gewicht
                                  </div>
                                  <div
                                    className="text-base font-bold"
                                    style={{ color: "#22c55e" }}
                                  >
                                    {selectedWeeg.gewogen_gewicht} kg
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Weight input form */}
                          <div
                            className="rounded-2xl p-4 space-y-4"
                            style={{
                              background: "rgba(255,255,255,0.80)",
                              border: "2px solid rgba(0,0,0,0.12)",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                            }}
                          >
                            <div className="text-sm font-bold text-zinc-800 mb-2">
                              ⚖️ Gewicht invoeren
                            </div>

                            {/* Scale weight input */}
                            <div className="flex items-end gap-3 flex-wrap">
                              <label className="block flex-1 min-w-[160px]">
                                <div className="text-xs font-semibold text-zinc-700 mb-1">
                                  Gewogen gewicht (kg)
                                </div>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="bijv. 71.8"
                                  value={inputGewicht}
                                  onChange={(e) => setInputGewicht(e.target.value)}
                                  className="w-full rounded-lg px-3 py-2 bg-white text-zinc-900 border border-zinc-300 focus:outline-none focus:border-orange-500 text-lg font-bold"
                                />
                              </label>

                              {/* Live evaluation */}
                              {currentEval && inputGewicht && (
                                <div
                                  className="px-4 py-2 rounded-lg font-bold text-white text-sm shrink-0"
                                  style={{ background: currentEval.color }}
                                >
                                  {currentEval.label}
                                </div>
                              )}
                            </div>

                            {/* Tolerance note */}
                            <div className="text-xs text-zinc-500 -mt-1">
                              Tolerantie weegschaal: ±0.3 kg
                            </div>

                            {/* Dispensatie */}
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={inputDispensatie}
                                  onChange={(e) =>
                                    setInputDispensatie(e.target.checked)
                                  }
                                  className="w-4 h-4 accent-orange-500"
                                />
                                <span className="text-sm font-semibold text-zinc-800">
                                  Dispensatie verleend
                                </span>
                              </label>
                            </div>

                            {inputDispensatie && (
                              <label className="block">
                                <div className="text-xs font-semibold text-zinc-700 mb-1">
                                  Reden dispensatie
                                </div>
                                <input
                                  type="text"
                                  placeholder="Reden voor dispensatie…"
                                  value={inputDispensatieReden}
                                  onChange={(e) =>
                                    setInputDispensatieReden(e.target.value)
                                  }
                                  className="w-full rounded-lg px-3 py-2 bg-white text-zinc-900 border border-zinc-300 focus:outline-none focus:border-orange-500"
                                />
                              </label>
                            )}

                            {/* Boete */}
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={inputBoete}
                                  onChange={(e) =>
                                    setInputBoete(e.target.checked)
                                  }
                                  className="w-4 h-4 accent-red-500"
                                />
                                <span className="text-sm font-semibold text-zinc-800">
                                  Boete opleggen
                                </span>
                              </label>
                            </div>

                            {/* Opmerking */}
                            <label className="block">
                              <div className="text-xs font-semibold text-zinc-700 mb-1">
                                Opmerking
                              </div>
                              <textarea
                                rows={2}
                                placeholder="Optionele opmerking…"
                                value={inputOpmerking}
                                onChange={(e) =>
                                  setInputOpmerking(e.target.value)
                                }
                                className="w-full rounded-lg px-3 py-2 bg-white text-zinc-900 border border-zinc-300 focus:outline-none focus:border-orange-500 resize-none"
                              />
                            </label>

                            {/* Save button */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <button
                                type="button"
                                onClick={saveWeging}
                                disabled={saving}
                                className="px-5 py-2 rounded-lg font-extrabold text-white text-sm transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                  background: saving
                                    ? "#888"
                                    : "linear-gradient(135deg, #ff4d00 0%, #cc3d00 100%)",
                                  boxShadow: "0 4px 14px rgba(255,77,0,0.30)",
                                }}
                              >
                                {saving ? "Opslaan…" : "💾 Opslaan"}
                              </button>

                              {melding && (
                                <span
                                  className={`text-sm font-semibold ${
                                    melding.startsWith("✅")
                                      ? "text-green-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  {melding}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── BOUTS OVERVIEW TABLE ── */}
                  {bouts.length > 0 && (
                    <div className="mt-6">
                      <div className="my-3" style={separator} />
                      <div className="text-sm font-bold text-zinc-700 mb-3">
                        📋 Overzicht alle partijen
                      </div>
                      <div className="overflow-x-auto rounded-xl" style={{ border: "2px solid rgba(0,0,0,0.12)" }}>
                        <table className="w-full text-sm">
                          <thead>
                            <tr
                              style={{
                                background:
                                  "linear-gradient(180deg, #2a2a2e 0%, #1e1e22 100%)",
                                color: "rgba(255,255,255,0.90)",
                              }}
                            >
                              <th className="px-3 py-2 text-left font-semibold text-xs">
                                #
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-xs">
                                Klasse / Disc.
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-xs">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                  style={{ background: "#ef4444", color: "#fff" }}
                                >
                                  ROOD
                                </span>
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-xs">
                                Status rood
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-xs">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                  style={{ background: "#3b82f6", color: "#fff" }}
                                >
                                  BLAUW
                                </span>
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-xs">
                                Status blauw
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-xs">
                                Max kg
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {bouts.map((b) => {
                              const pn = Number(b.partij_nr);
                              const roodNaam = safeText(
                                b.rood_naam_fp ?? b.rood_naam_mm,
                                "-"
                              );
                              const blauwNaam = safeText(
                                b.blauw_naam_fp ?? b.blauw_naam_mm,
                                "-"
                              );
                              const roodK = fighterKey(pn, "rood");
                              const blauwK = fighterKey(pn, "blauw");
                              const isRoodSel = selectedKey === roodK;
                              const isBlauwSel = selectedKey === blauwK;

                              return (
                                <tr
                                  key={pn}
                                  className="border-t border-zinc-200 hover:bg-zinc-50 transition"
                                >
                                  <td className="px-3 py-2 text-zinc-600 font-semibold text-xs">
                                    {pn}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-zinc-600">
                                    <div>{safeText(b.discipline, "-")}</div>
                                    <div className="text-zinc-400">
                                      {safeText(b.klasse_mm, "")}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const f = fighters.find(
                                          (x) => x.partij_nr === pn && x.hoek === "rood"
                                        );
                                        if (f) selectFighter(f);
                                      }}
                                      className="text-left hover:underline transition"
                                      style={{
                                        color: isRoodSel ? NVB_ORANGE : undefined,
                                        fontWeight: isRoodSel ? 700 : undefined,
                                      }}
                                    >
                                      <div className="text-sm font-semibold">
                                        {roodNaam}
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        {safeText(b.rood_gym_fp ?? b.rood_gym_mm, "")}
                                      </div>
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {getFighterStatusBadge(pn, "rood")}
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const f = fighters.find(
                                          (x) =>
                                            x.partij_nr === pn && x.hoek === "blauw"
                                        );
                                        if (f) selectFighter(f);
                                      }}
                                      className="text-left hover:underline transition"
                                      style={{
                                        color: isBlauwSel ? NVB_ORANGE : undefined,
                                        fontWeight: isBlauwSel ? 700 : undefined,
                                      }}
                                    >
                                      <div className="text-sm font-semibold">
                                        {blauwNaam}
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        {safeText(
                                          b.blauw_gym_fp ?? b.blauw_gym_mm,
                                          ""
                                        )}
                                      </div>
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {getFighterStatusBadge(pn, "blauw")}
                                  </td>
                                  <td className="px-3 py-2 text-center text-xs font-semibold text-zinc-600">
                                    {b.max_gewicht != null
                                      ? `${b.max_gewicht} kg`
                                      : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
