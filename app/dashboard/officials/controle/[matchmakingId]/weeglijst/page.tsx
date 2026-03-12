"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["500", "600", "700"] });
const NVB_ORANGE = "#ff4d00";

// ─── Types ───────────────────────────────────────────────────────────────────

type BoutRow = {
  partij_nr: number;
  discipline: string | null;
  klasse: string | null;
  rood_naam: string | null;
  rood_gym: string | null;
  rood_gewicht: number | null;
  blauw_naam: string | null;
  blauw_gym: string | null;
  blauw_gewicht: number | null;
  max_gewicht: number | null;
  // from controle_bout_context (optional enrichment)
  rood_leeftijd_event?: number | null;
  blauw_leeftijd_event?: number | null;
  rood_naam_fp?: string | null;
  blauw_naam_fp?: string | null;
};

type FighterEntry = {
  partij_nr: number;
  hoek: "rood" | "blauw";
  naam: string;
  gym: string | null;
  gewicht_mm: number | null; // matchmaking weight
  max_gewicht: number | null;
  leeftijd: number | null;
  discipline: string | null;
  klasse: string | null;
};

type WegingEntry = {
  id?: string;
  matchmaking_id: string;
  partij_nr: number;
  hoek: "rood" | "blauw";
  gewicht_gemeten: number | null;
  dispensatie: boolean;
  strafpunten: number;
  opmerking: string;
  afkeur: boolean;
};

type WegingResult = "ok" | "tolerantie" | "dispensatie" | "afkeur" | "leeg";

// ─── Styling ──────────────────────────────────────────────────────────────────

function metalFrameStyle(): CSSProperties {
  const brushed =
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 4px)";
  const sheen =
    "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 48%, rgba(255,255,255,0.10) 70%, rgba(255,255,255,0) 100%)";
  const accentGlow =
    "radial-gradient(640px 320px at 50% 0%, rgba(255,77,0,0.18), transparent 62%)";

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

function darkPanelStyle(): CSSProperties {
  return {
    border: "2px solid rgba(0,0,0,0.45)",
    borderRadius: 14,
    background:
      "radial-gradient(circle at 20% 0%, rgba(255,77,0,0.12), transparent 55%), linear-gradient(180deg, #1f2228 0%, #0f1014 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -14px 22px rgba(0,0,0,0.55), 0 16px 38px rgba(0,0,0,0.25)",
  };
}

// ─── Weigh logic ──────────────────────────────────────────────────────────────

/** Weegschaal tolerantie (drempelwaarde voor de weegschaal zelf) */
const WEEG_TOLERANTIE = 0.3;

function evaluateBout(
  gewicht: number,
  maxGewicht: number
): { result: WegingResult; verschil: number; boodschap: string } {
  const verschil = gewicht - maxGewicht;

  if (verschil <= 0) {
    return { result: "ok", verschil, boodschap: `✅ Gewicht OK (${gewicht} kg / max ${maxGewicht} kg)` };
  }

  if (verschil <= WEEG_TOLERANTIE) {
    return {
      result: "tolerantie",
      verschil,
      boodschap: `⚠️ Weegschaal tolerantie (+${verschil.toFixed(2)} kg — binnen ${WEEG_TOLERANTIE} kg marge)`,
    };
  }

  // Dispensatie mogelijk (hoofd official beslist)
  return {
    result: "dispensatie",
    verschil,
    boodschap: `🟡 Te zwaar: +${verschil.toFixed(2)} kg boven max — dispensatie vereist`,
  };
}

function resultColor(result: WegingResult): string {
  if (result === "ok") return "#22c55e";
  if (result === "tolerantie") return "#f59e0b";
  if (result === "dispensatie") return NVB_ORANGE;
  if (result === "afkeur") return "#ef4444";
  return "#94a3b8";
}

function resultLabel(result: WegingResult): string {
  if (result === "ok") return "OK";
  if (result === "tolerantie") return "TOLERANTIE";
  if (result === "dispensatie") return "DISPENSATIE";
  if (result === "afkeur") return "AFKEUR";
  return "NIET GEWOGEN";
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function safeStr(v: any): string {
  const s = String(v ?? "").trim();
  return s;
}

function safeNum(v: any): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WeeglijstPage() {
  const params = useParams();
  const router = useRouter();
  const matchmakingId = params?.matchmakingId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [evenementNaam, setEvenementNaam] = useState<string | null>(null);
  const [evenementDatum, setEvenementDatum] = useState<string | null>(null);

  const [fighters, setFighters] = useState<FighterEntry[]>([]);
  const [wegingen, setWegingen] = useState<WegingEntry[]>([]);

  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // "partijNr-hoek"

  // Weight input state for selected fighter
  const [inputGewicht, setInputGewicht] = useState("");
  const [inputDispensatie, setInputDispensatie] = useState(false);
  const [inputStrafpunten, setInputStrafpunten] = useState(0);
  const [inputOpmerking, setInputOpmerking] = useState("");
  const [inputAfkeur, setInputAfkeur] = useState(false);

  const saveMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Derived state ───────────────────────────────────────────────────────

  const selectedFighter = useMemo(() => {
    if (!selectedKey) return null;
    return fighters.find((f) => `${f.partij_nr}-${f.hoek}` === selectedKey) ?? null;
  }, [fighters, selectedKey]);

  const existingWeging = useMemo(() => {
    if (!selectedKey) return null;
    const [pnStr, hoek] = selectedKey.split("-");
    const pn = Number(pnStr);
    return wegingen.find((w) => w.partij_nr === pn && w.hoek === hoek) ?? null;
  }, [wegingen, selectedKey]);

  const evaluation = useMemo(() => {
    const gewicht = safeNum(inputGewicht.replace(",", "."));
    const fighter = selectedFighter;
    if (gewicht == null || fighter == null || fighter.max_gewicht == null) return null;
    return evaluateBout(gewicht, fighter.max_gewicht);
  }, [inputGewicht, selectedFighter]);

  const wegingByKey = useMemo(() => {
    const m: Record<string, WegingEntry> = {};
    for (const w of wegingen) {
      m[`${w.partij_nr}-${w.hoek}`] = w;
    }
    return m;
  }, [wegingen]);

  const filteredFighters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fighters;
    return fighters.filter(
      (f) =>
        safeStr(f.naam).toLowerCase().includes(q) ||
        safeStr(f.gym).toLowerCase().includes(q) ||
        String(f.partij_nr).includes(q)
    );
  }, [fighters, search]);

  // ─── Load ────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // 1. Event info
      const { data: ups } = await supabase
        .from("matchmaking_uploads")
        .select("evenement_naam, evenement_datum, event_id")
        .eq("matchmaking_id", matchmakingId)
        .order("uploaded_at", { ascending: false })
        .limit(1);

      const up = (ups ?? [])[0] as any;
      let naam = safeStr(up?.evenement_naam) || null;
      let datum = safeStr(up?.evenement_datum) || null;
      const eventId = safeStr(up?.event_id) || null;

      if (eventId && (!naam || !datum)) {
        const { data: ev } = await supabase
          .from("events")
          .select("naam, datum")
          .eq("id", eventId)
          .maybeSingle();
        if (!naam) naam = safeStr((ev as any)?.naam) || null;
        if (!datum) datum = safeStr((ev as any)?.datum) || null;
      }

      setEvenementNaam(naam);
      setEvenementDatum(datum);

      // 2. Bouts from matchmaking_bouts_raw
      const { data: bouts, error: bErr } = await supabase
        .from("matchmaking_bouts_raw")
        .select(
          "partij_nr, discipline, klasse, rood_naam, rood_gym, rood_gewicht, blauw_naam, blauw_gym, blauw_gewicht, max_gewicht"
        )
        .eq("matchmaking_id", matchmakingId)
        .order("partij_nr", { ascending: true });

      if (bErr) throw bErr;

      // 3. Try to enrich with age from controle_bout_context
      let ageByPn: Record<number, { rood?: number | null; blauw?: number | null }> = {};
      let namesByPn: Record<number, { rood?: string | null; blauw?: string | null }> = {};
      try {
        const { data: ctxRows } = await supabase
          .from("controle_bout_context")
          .select("partij_nr, rood_leeftijd_event, blauw_leeftijd_event, rood_naam_fp, blauw_naam_fp")
          .eq("matchmaking_id", matchmakingId)
          .order("created_at", { ascending: false });

        // dedupe: keep only first (latest run) per partij_nr
        const seen = new Set<number>();
        for (const r of (ctxRows ?? []) as any[]) {
          const pn = Number(r.partij_nr);
          if (!Number.isFinite(pn) || seen.has(pn)) continue;
          seen.add(pn);
          ageByPn[pn] = {
            rood: safeNum(r.rood_leeftijd_event),
            blauw: safeNum(r.blauw_leeftijd_event),
          };
          namesByPn[pn] = {
            rood: safeStr(r.rood_naam_fp) || null,
            blauw: safeStr(r.blauw_naam_fp) || null,
          };
        }
      } catch {
        // optional enrichment — ignore errors
      }

      // 4. Build fighters list
      const list: FighterEntry[] = [];
      for (const b of (bouts ?? []) as any[]) {
        const pn = Number(b.partij_nr);
        if (!Number.isFinite(pn)) continue;
        const roodNaam =
          namesByPn[pn]?.rood || safeStr(b.rood_naam) || `Rood partij ${pn}`;
        const blauwNaam =
          namesByPn[pn]?.blauw || safeStr(b.blauw_naam) || `Blauw partij ${pn}`;

        list.push({
          partij_nr: pn,
          hoek: "rood",
          naam: roodNaam,
          gym: safeStr(b.rood_gym) || null,
          gewicht_mm: safeNum(b.rood_gewicht),
          max_gewicht: safeNum(b.max_gewicht),
          leeftijd: ageByPn[pn]?.rood ?? null,
          discipline: safeStr(b.discipline) || null,
          klasse: safeStr(b.klasse) || null,
        });

        if (safeStr(b.blauw_naam)) {
          list.push({
            partij_nr: pn,
            hoek: "blauw",
            naam: blauwNaam,
            gym: safeStr(b.blauw_gym) || null,
            gewicht_mm: safeNum(b.blauw_gewicht),
            max_gewicht: safeNum(b.max_gewicht),
            leeftijd: ageByPn[pn]?.blauw ?? null,
            discipline: safeStr(b.discipline) || null,
            klasse: safeStr(b.klasse) || null,
          });
        }
      }
      setFighters(list);

      // 5. Load existing weigh-in entries
      await loadWegingen(matchmakingId);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadWegingen(mmId: string) {
    try {
      const { data, error: wErr } = await supabase
        .from("weeglijst_entries")
        .select("*")
        .eq("matchmaking_id", mmId);

      if (wErr) {
        // Table might not exist yet — silently continue
        console.warn("weeglijst_entries:", wErr.message);
        setWegingen([]);
        return;
      }
      setWegingen((data ?? []) as WegingEntry[]);
    } catch {
      setWegingen([]);
    }
  }

  useEffect(() => {
    if (matchmakingId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingId]);

  // ─── Select fighter ───────────────────────────────────────────────────────

  function selectFighter(key: string) {
    setSelectedKey(key);
    setSaveMsg(null);
    setError(null);

    // Pre-fill from existing weging if any
    const [pnStr, hoek] = key.split("-");
    const pn = Number(pnStr);
    const existing = wegingen.find(
      (w) => w.partij_nr === pn && w.hoek === (hoek as "rood" | "blauw")
    );

    if (existing) {
      setInputGewicht(
        existing.gewicht_gemeten != null ? String(existing.gewicht_gemeten) : ""
      );
      setInputDispensatie(existing.dispensatie);
      setInputStrafpunten(existing.strafpunten ?? 0);
      setInputOpmerking(existing.opmerking ?? "");
      setInputAfkeur(existing.afkeur ?? false);
    } else {
      setInputGewicht("");
      setInputDispensatie(false);
      setInputStrafpunten(0);
      setInputOpmerking("");
      setInputAfkeur(false);
    }
  }

  // ─── Save weging ──────────────────────────────────────────────────────────

  async function saveWeging() {
    if (!selectedFighter) return;
    setSaving(true);
    setError(null);
    setSaveMsg(null);

    try {
      const gewicht = safeNum(inputGewicht.replace(",", "."));

      const entry: Omit<WegingEntry, "id"> = {
        matchmaking_id: matchmakingId,
        partij_nr: selectedFighter.partij_nr,
        hoek: selectedFighter.hoek,
        gewicht_gemeten: gewicht,
        dispensatie: inputDispensatie,
        strafpunten: inputStrafpunten,
        opmerking: inputOpmerking.trim(),
        afkeur: inputAfkeur,
      };

      const { error: upsErr } = await supabase
        .from("weeglijst_entries")
        .upsert(entry, { onConflict: "matchmaking_id,partij_nr,hoek" });

      if (upsErr) throw upsErr;

      // Refresh wegingen
      await loadWegingen(matchmakingId);

      setSaveMsg("✅ Weging opgeslagen");
      if (saveMsgTimer.current) clearTimeout(saveMsgTimer.current);
      saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  // ─── Overview table data ──────────────────────────────────────────────────

  const bouts = useMemo(() => {
    const map: Record<number, { rood?: FighterEntry; blauw?: FighterEntry }> = {};
    for (const f of fighters) {
      if (!map[f.partij_nr]) map[f.partij_nr] = {};
      map[f.partij_nr][f.hoek] = f;
    }
    return Object.entries(map)
      .map(([pn, sides]) => ({ partij_nr: Number(pn), ...sides }))
      .sort((a, b) => a.partij_nr - b.partij_nr);
  }, [fighters]);

  const stats = useMemo(() => {
    const total = fighters.length;
    const gewogen = fighters.filter(
      (f) => wegingByKey[`${f.partij_nr}-${f.hoek}`]?.gewicht_gemeten != null
    ).length;
    const afkeur = fighters.filter(
      (f) => wegingByKey[`${f.partij_nr}-${f.hoek}`]?.afkeur
    ).length;
    const dispensatie = fighters.filter(
      (f) => wegingByKey[`${f.partij_nr}-${f.hoek}`]?.dispensatie
    ).length;
    return { total, gewogen, afkeur, dispensatie };
  }, [fighters, wegingByKey]);

  // ─── Subtitle ─────────────────────────────────────────────────────────────

  const subtitle = useMemo(() => {
    const naam = (evenementNaam ?? "").trim();
    const datum = (evenementDatum ?? "").trim();
    if (naam && datum) return `${naam}  •  ${datum}`;
    if (naam) return naam;
    if (datum) return datum;
    return matchmakingId ?? "";
  }, [evenementNaam, evenementDatum, matchmakingId]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className={`${inter.className} min-h-screen flex items-center justify-center`}
        style={{ background: "#0a0b0e" }}
      >
        <div
          className="text-center"
          style={{ color: "rgba(255,255,255,0.55)", fontSize: 15 }}
        >
          Weeglijst laden…
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${inter.className} min-h-screen`}
      style={{ background: "#111216" }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 py-6">
        <div style={metalFrameStyle()} className="p-3 md:p-4">
          <div style={metalInnerStyle()} className="p-4 md:p-5 space-y-5">

            {/* ── HEADER ───────────────────────────────────────────────── */}
            <div
              className="flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4"
              style={{
                background: "linear-gradient(180deg, #2e3039 0%, #1a1c22 100%)",
                border: "2px solid rgba(63,63,70,0.55)",
                boxShadow: "0 14px 30px rgba(0,0,0,0.30)",
                color: "#fff",
              }}
            >
              {/* Logo */}
              <div
                className="rounded-[20px] p-[4px] shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #f5f5f5 0%, #bdbdbd 28%, #8e8e8e 55%, #f0f0f0 72%, #6f6f6f 100%)",
                  boxShadow:
                    "0 0 0 2px rgba(255,255,255,0.45), 0 0 0 6px rgba(120,120,120,0.22), 0 14px 30px rgba(0,0,0,0.55), 0 0 28px rgba(220,220,220,0.22)",
                }}
              >
                <div
                  className="rounded-[16px] px-3 py-2"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.38) 100%)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <Image
                    src="/branding/fightsupport/logo-dark.png"
                    width={72}
                    height={72}
                    alt="FightSupport"
                    priority
                  />
                </div>
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    color: NVB_ORANGE,
                    letterSpacing: "0.14em",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  FIGHTSUPPORT — WEEGLIJST
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1.2,
                  }}
                >
                  Weeg Station
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.60)",
                    marginTop: 3,
                  }}
                >
                  {subtitle}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-2 shrink-0">
                {[
                  { label: "Totaal", val: stats.total, color: "rgba(255,255,255,0.55)" },
                  { label: "Gewogen", val: stats.gewogen, color: "#22c55e" },
                  { label: "Dispensatie", val: stats.dispensatie, color: NVB_ORANGE },
                  { label: "Afkeur", val: stats.afkeur, color: "#ef4444" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="text-center px-3 py-2 rounded-xl"
                    style={{
                      background: "rgba(0,0,0,0.30)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      minWidth: 68,
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>
                      {s.val}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                      {s.label.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Back button */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/officials/controle/${encodeURIComponent(matchmakingId)}`
                  )
                }
                className="shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition hover:opacity-90"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                ← Controle
              </button>
            </div>

            {/* ── ERROR / MSG ───────────────────────────────────────────── */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-semibold"
                style={{
                  background: "rgba(239,68,68,0.14)",
                  border: "1px solid rgba(239,68,68,0.50)",
                  color: "#fca5a5",
                }}
              >
                ❌ {error}
              </div>
            )}

            {/* ── MAIN TWO-PANEL LAYOUT ─────────────────────────────────── */}
            <div className="flex gap-4" style={{ minHeight: 460 }}>

              {/* LEFT PANEL — Fighter list */}
              <div
                className="flex flex-col shrink-0"
                style={{ width: 300, minWidth: 240 }}
              >
                <div style={darkPanelStyle()} className="flex flex-col h-full p-3">
                  <div
                    className="mb-2 text-xs font-extrabold tracking-widest"
                    style={{ color: NVB_ORANGE }}
                  >
                    VECHTERS ({fighters.length})
                  </div>

                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Zoeken op naam / sportschool…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full mb-2 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "#fff",
                    }}
                  />

                  {/* Fighters */}
                  <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: 400 }}>
                    {filteredFighters.length === 0 && (
                      <div
                        className="text-center py-8 text-xs"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        Geen vechters gevonden
                      </div>
                    )}
                    {filteredFighters.map((f) => {
                      const key = `${f.partij_nr}-${f.hoek}`;
                      const weging = wegingByKey[key];
                      const isSelected = selectedKey === key;
                      const isGewogen = weging?.gewicht_gemeten != null;

                      let statusDot = "#94a3b8"; // grey = not weighed
                      if (isGewogen) {
                        if (weging!.afkeur) {
                          statusDot = "#ef4444";
                        } else if (weging!.dispensatie) {
                          statusDot = NVB_ORANGE;
                        } else {
                          const evalResult = evaluateBout(
                            weging!.gewicht_gemeten!,
                            f.max_gewicht ?? 999
                          );
                          statusDot = resultColor(evalResult.result);
                        }
                      }

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectFighter(key)}
                          className="w-full text-left rounded-xl px-3 py-2 transition"
                          style={{
                            background: isSelected
                              ? `rgba(255,77,0,0.22)`
                              : "rgba(255,255,255,0.04)",
                            border: isSelected
                              ? `1.5px solid ${NVB_ORANGE}`
                              : "1.5px solid rgba(255,255,255,0.08)",
                            color: "#fff",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {/* Corner badge */}
                            <span
                              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                              style={{
                                background:
                                  f.hoek === "rood"
                                    ? "rgba(220,38,38,0.35)"
                                    : "rgba(37,99,235,0.35)",
                                color: f.hoek === "rood" ? "#fca5a5" : "#93c5fd",
                                border: `1px solid ${f.hoek === "rood" ? "rgba(220,38,38,0.5)" : "rgba(37,99,235,0.5)"}`,
                              }}
                            >
                              {f.hoek === "rood" ? "R" : "B"}
                            </span>

                            {/* Fighter name */}
                            <span className="flex-1 min-w-0 text-sm font-semibold truncate">
                              {f.naam}
                            </span>

                            {/* Status dot */}
                            <span
                              className="shrink-0 rounded-full"
                              style={{
                                width: 10,
                                height: 10,
                                background: statusDot,
                                boxShadow: isGewogen ? `0 0 6px ${statusDot}` : undefined,
                              }}
                            />
                          </div>

                          {/* Partij + weight */}
                          <div
                            className="mt-0.5 text-[11px] flex gap-2"
                            style={{ color: "rgba(255,255,255,0.45)" }}
                          >
                            <span>#{f.partij_nr}</span>
                            {f.max_gewicht && <span>max {f.max_gewicht} kg</span>}
                            {isGewogen && weging!.gewicht_gemeten != null && (
                              <span style={{ color: statusDot }}>
                                → {weging!.gewicht_gemeten} kg
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL — Weight input */}
              <div className="flex-1 min-w-0">
                {!selectedFighter ? (
                  <div
                    className="flex flex-col items-center justify-center h-full rounded-2xl"
                    style={{
                      ...darkPanelStyle(),
                      minHeight: 300,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 48,
                        opacity: 0.18,
                        marginBottom: 12,
                      }}
                    >
                      ⚖️
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.35)",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Selecteer een vechter uit de lijst
                    </div>
                  </div>
                ) : (
                  <div style={darkPanelStyle()} className="p-5 space-y-5">

                    {/* Fighter header */}
                    <div className="flex items-start gap-4">
                      <div
                        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-extrabold"
                        style={{
                          background:
                            selectedFighter.hoek === "rood"
                              ? "rgba(220,38,38,0.30)"
                              : "rgba(37,99,235,0.30)",
                          border:
                            selectedFighter.hoek === "rood"
                              ? "2px solid rgba(220,38,38,0.60)"
                              : "2px solid rgba(37,99,235,0.60)",
                          color:
                            selectedFighter.hoek === "rood" ? "#fca5a5" : "#93c5fd",
                        }}
                      >
                        {selectedFighter.hoek === "rood" ? "R" : "B"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xl font-bold truncate"
                          style={{ color: "#fff" }}
                        >
                          {selectedFighter.naam}
                        </div>
                        <div
                          className="text-sm mt-0.5"
                          style={{ color: "rgba(255,255,255,0.55)" }}
                        >
                          {selectedFighter.gym && <span>{selectedFighter.gym} • </span>}
                          Partij #{selectedFighter.partij_nr} •{" "}
                          {selectedFighter.hoek === "rood" ? "Rood" : "Blauw"} hoek
                          {selectedFighter.leeftijd != null && (
                            <span> • {selectedFighter.leeftijd} jaar</span>
                          )}
                        </div>
                        {(selectedFighter.discipline || selectedFighter.klasse) && (
                          <div
                            className="text-xs mt-1"
                            style={{ color: "rgba(255,255,255,0.40)" }}
                          >
                            {[selectedFighter.discipline, selectedFighter.klasse]
                              .filter(Boolean)
                              .join(" — ")}
                          </div>
                        )}
                      </div>

                      {/* MM weight + max */}
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                          MM gewicht
                        </div>
                        <div className="text-2xl font-bold" style={{ color: "#fff" }}>
                          {selectedFighter.gewicht_mm != null
                            ? `${selectedFighter.gewicht_mm} kg`
                            : "—"}
                        </div>
                        {selectedFighter.max_gewicht != null && (
                          <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>
                            max {selectedFighter.max_gewicht} kg
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Separator */}
                    <div
                      style={{
                        height: 1,
                        background:
                          "linear-gradient(to right, transparent, rgba(255,255,255,0.14), transparent)",
                      }}
                    />

                    {/* Weight input + result */}
                    <div className="flex flex-wrap gap-4 items-start">
                      <div style={{ minWidth: 200 }}>
                        <label className="block">
                          <div
                            className="text-xs font-extrabold mb-2 tracking-wider"
                            style={{ color: NVB_ORANGE }}
                          >
                            GEMETEN GEWICHT (KG)
                          </div>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="200"
                            placeholder="bijv. 70.5"
                            value={inputGewicht}
                            onChange={(e) => setInputGewicht(e.target.value)}
                            className="w-full rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none"
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              border: `2px solid ${
                                evaluation
                                  ? resultColor(evaluation.result)
                                  : "rgba(255,255,255,0.18)"
                              }`,
                              color: "#fff",
                              boxShadow: evaluation
                                ? `0 0 12px ${resultColor(evaluation.result)}44`
                                : undefined,
                            }}
                          />
                        </label>
                      </div>

                      {/* Evaluation badge */}
                      {evaluation && (
                        <div
                          className="flex-1 rounded-xl p-4 flex flex-col justify-center"
                          style={{
                            background: `${resultColor(evaluation.result)}18`,
                            border: `2px solid ${resultColor(evaluation.result)}55`,
                          }}
                        >
                          <div
                            className="text-lg font-extrabold mb-1"
                            style={{ color: resultColor(evaluation.result) }}
                          >
                            {resultLabel(evaluation.result)}
                          </div>
                          <div
                            className="text-sm"
                            style={{ color: "rgba(255,255,255,0.75)" }}
                          >
                            {evaluation.boodschap}
                          </div>
                          {evaluation.verschil > 0 && (
                            <div
                              className="text-xs mt-1"
                              style={{ color: "rgba(255,255,255,0.45)" }}
                            >
                              Tolerantie grens: {WEEG_TOLERANTIE} kg
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Dispensatie */}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div
                          className="relative shrink-0"
                          onClick={() => setInputDispensatie((v) => !v)}
                        >
                          <div
                            className="w-12 h-6 rounded-full transition-colors"
                            style={{
                              background: inputDispensatie
                                ? NVB_ORANGE
                                : "rgba(255,255,255,0.15)",
                              border: `1px solid ${inputDispensatie ? NVB_ORANGE : "rgba(255,255,255,0.25)"}`,
                            }}
                          />
                          <div
                            className="absolute top-1 rounded-full transition-transform"
                            style={{
                              width: 16,
                              height: 16,
                              background: "#fff",
                              left: inputDispensatie ? "calc(100% - 20px)" : "3px",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
                            }}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "#fff" }}>
                            Dispensatie
                          </div>
                          <div className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
                            Hoofdofficial goedkeuring
                          </div>
                        </div>
                      </label>

                      {/* Strafpunten */}
                      <div>
                        <div className="text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                          Strafpunten
                        </div>
                        <div className="flex gap-1.5">
                          {[0, 1, 2, 3].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setInputStrafpunten(n)}
                              className="w-9 h-9 rounded-lg font-bold text-sm transition"
                              style={{
                                background:
                                  inputStrafpunten === n
                                    ? n === 0
                                      ? "#22c55e"
                                      : n === 1
                                      ? "#f59e0b"
                                      : n === 2
                                      ? NVB_ORANGE
                                      : "#ef4444"
                                    : "rgba(255,255,255,0.08)",
                                color: inputStrafpunten === n ? "#000" : "rgba(255,255,255,0.60)",
                                border: `1px solid ${
                                  inputStrafpunten === n
                                    ? "transparent"
                                    : "rgba(255,255,255,0.14)"
                                }`,
                              }}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Afkeur */}
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div
                          className="relative shrink-0"
                          onClick={() => setInputAfkeur((v) => !v)}
                        >
                          <div
                            className="w-12 h-6 rounded-full transition-colors"
                            style={{
                              background: inputAfkeur
                                ? "#ef4444"
                                : "rgba(255,255,255,0.15)",
                              border: `1px solid ${inputAfkeur ? "#ef4444" : "rgba(255,255,255,0.25)"}`,
                            }}
                          />
                          <div
                            className="absolute top-1 rounded-full transition-transform"
                            style={{
                              width: 16,
                              height: 16,
                              background: "#fff",
                              left: inputAfkeur ? "calc(100% - 20px)" : "3px",
                              boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
                            }}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "#fff" }}>
                            Afkeur
                          </div>
                          <div className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
                            Partij afgekeurd
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Opmerking */}
                    <div>
                      <div className="text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                        Opmerking
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Eventuele opmerkingen…"
                        value={inputOpmerking}
                        onChange={(e) => setInputOpmerking(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          color: "#fff",
                        }}
                      />
                    </div>

                    {/* Save */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={saveWeging}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl font-extrabold text-sm transition"
                        style={{
                          background: saving
                            ? "rgba(255,77,0,0.40)"
                            : "rgba(255,77,0,0.85)",
                          border: "1px solid rgba(255,77,0,0.90)",
                          color: saving ? "rgba(255,255,255,0.55)" : "#fff",
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                      >
                        {saving ? "Opslaan…" : "⚖️ Weging opslaan"}
                      </button>

                      {saveMsg && (
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "#22c55e" }}
                        >
                          {saveMsg}
                        </span>
                      )}
                    </div>

                    {/* Previously weighed info */}
                    {existingWeging && (
                      <div
                        className="rounded-xl px-4 py-3 text-sm"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.55)",
                        }}
                      >
                        <span className="font-semibold">Eerder gewogen:</span>{" "}
                        {existingWeging.gewicht_gemeten != null
                          ? `${existingWeging.gewicht_gemeten} kg`
                          : "geen gewicht"}
                        {existingWeging.dispensatie && " • Dispensatie"}
                        {existingWeging.afkeur && " • Afgekeurd"}
                        {existingWeging.strafpunten > 0 &&
                          ` • ${existingWeging.strafpunten} strafpunt(en)`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── OVERVIEW TABLE ─────────────────────────────────────────── */}
            <div>
              <div
                className="mb-3 text-xs font-extrabold tracking-widest"
                style={{ color: NVB_ORANGE }}
              >
                WEEG OVERZICHT — ALLE PARTIJEN
              </div>
              <div className="overflow-x-auto rounded-xl">
                <table
                  className="w-full text-sm"
                  style={{
                    borderCollapse: "separate",
                    borderSpacing: 0,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background:
                          "linear-gradient(180deg, #2e3039 0%, #1e2028 100%)",
                        color: "rgba(255,255,255,0.65)",
                      }}
                    >
                      {[
                        "#",
                        "Discipline / Klasse",
                        "Rood — naam",
                        "Rood — gewogen",
                        "Status",
                        "Blauw — naam",
                        "Blauw — gewogen",
                        "Status",
                        "Max kg",
                        "Disp / Straf",
                      ].map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2.5 text-left text-xs font-extrabold tracking-wide whitespace-nowrap"
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.10)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bouts.map((bout, idx) => {
                      const rKey = `${bout.partij_nr}-rood`;
                      const bKey = `${bout.partij_nr}-blauw`;
                      const rWeging = wegingByKey[rKey];
                      const bWeging = wegingByKey[bKey];
                      const rFighter = bout.rood;
                      const bFighter = bout.blauw;

                      const getEval = (
                        fighter: FighterEntry | undefined,
                        weging: WegingEntry | undefined
                      ) => {
                        if (!fighter || !weging || weging.gewicht_gemeten == null)
                          return null;
                        if (weging.afkeur) return { result: "afkeur" as WegingResult };
                        return evaluateBout(
                          weging.gewicht_gemeten,
                          fighter.max_gewicht ?? 999
                        );
                      };

                      const rEval = getEval(rFighter, rWeging);
                      const bEval = getEval(bFighter, bWeging);

                      const hasDisp =
                        rWeging?.dispensatie || bWeging?.dispensatie;
                      const totalStraf =
                        (rWeging?.strafpunten ?? 0) + (bWeging?.strafpunten ?? 0);

                      const bgBase = idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent";

                      return (
                        <tr
                          key={bout.partij_nr}
                          style={{ background: bgBase, color: "#fff" }}
                        >
                          <td
                            className="px-3 py-2 font-bold"
                            style={{
                              color: NVB_ORANGE,
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {bout.partij_nr}
                          </td>
                          <td
                            className="px-3 py-2"
                            style={{
                              color: "rgba(255,255,255,0.60)",
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              maxWidth: 120,
                            }}
                          >
                            <div className="text-xs truncate">
                              {rFighter?.discipline ?? bFighter?.discipline ?? "—"}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "rgba(255,255,255,0.35)" }}
                            >
                              {rFighter?.klasse ?? bFighter?.klasse ?? ""}
                            </div>
                          </td>

                          {/* Rood naam */}
                          <td
                            className="px-3 py-2"
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              maxWidth: 140,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => selectFighter(rKey)}
                              className="text-left hover:underline truncate block"
                              style={{ color: "#fca5a5", maxWidth: 130 }}
                            >
                              {rFighter?.naam ?? "—"}
                            </button>
                            {rFighter?.gym && (
                              <div
                                className="text-xs truncate"
                                style={{ color: "rgba(255,255,255,0.35)" }}
                              >
                                {rFighter.gym}
                              </div>
                            )}
                          </td>

                          {/* Rood gewogen */}
                          <td
                            className="px-3 py-2 font-semibold"
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              color: rEval ? resultColor(rEval.result) : "rgba(255,255,255,0.30)",
                            }}
                          >
                            {rWeging?.gewicht_gemeten != null
                              ? `${rWeging.gewicht_gemeten} kg`
                              : "—"}
                          </td>

                          {/* Rood status */}
                          <td
                            className="px-3 py-2"
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {rEval ? (
                              <span
                                className="text-[11px] font-extrabold px-2 py-0.5 rounded"
                                style={{
                                  background: `${resultColor(rEval.result)}22`,
                                  color: resultColor(rEval.result),
                                  border: `1px solid ${resultColor(rEval.result)}55`,
                                }}
                              >
                                {resultLabel(rEval.result)}
                              </span>
                            ) : (
                              <span
                                className="text-[11px]"
                                style={{ color: "rgba(255,255,255,0.25)" }}
                              >
                                —
                              </span>
                            )}
                          </td>

                          {/* Blauw naam */}
                          <td
                            className="px-3 py-2"
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              maxWidth: 140,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => selectFighter(bKey)}
                              className="text-left hover:underline truncate block"
                              style={{ color: "#93c5fd", maxWidth: 130 }}
                            >
                              {bFighter?.naam ?? "—"}
                            </button>
                            {bFighter?.gym && (
                              <div
                                className="text-xs truncate"
                                style={{ color: "rgba(255,255,255,0.35)" }}
                              >
                                {bFighter.gym}
                              </div>
                            )}
                          </td>

                          {/* Blauw gewogen */}
                          <td
                            className="px-3 py-2 font-semibold"
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              color: bEval ? resultColor(bEval.result) : "rgba(255,255,255,0.30)",
                            }}
                          >
                            {bWeging?.gewicht_gemeten != null
                              ? `${bWeging.gewicht_gemeten} kg`
                              : "—"}
                          </td>

                          {/* Blauw status */}
                          <td
                            className="px-3 py-2"
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {bEval ? (
                              <span
                                className="text-[11px] font-extrabold px-2 py-0.5 rounded"
                                style={{
                                  background: `${resultColor(bEval.result)}22`,
                                  color: resultColor(bEval.result),
                                  border: `1px solid ${resultColor(bEval.result)}55`,
                                }}
                              >
                                {resultLabel(bEval.result)}
                              </span>
                            ) : (
                              <span
                                className="text-[11px]"
                                style={{ color: "rgba(255,255,255,0.25)" }}
                              >
                                —
                              </span>
                            )}
                          </td>

                          {/* Max kg */}
                          <td
                            className="px-3 py-2 font-semibold"
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                              color: "rgba(255,255,255,0.55)",
                            }}
                          >
                            {rFighter?.max_gewicht ?? bFighter?.max_gewicht ?? "—"}
                          </td>

                          {/* Disp / Straf */}
                          <td
                            className="px-3 py-2"
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <div className="flex flex-wrap gap-1">
                              {hasDisp && (
                                <span
                                  className="text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                                  style={{
                                    background: `${NVB_ORANGE}22`,
                                    color: NVB_ORANGE,
                                    border: `1px solid ${NVB_ORANGE}55`,
                                  }}
                                >
                                  DISP
                                </span>
                              )}
                              {totalStraf > 0 && (
                                <span
                                  className="text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                                  style={{
                                    background: "rgba(239,68,68,0.18)",
                                    color: "#fca5a5",
                                    border: "1px solid rgba(239,68,68,0.40)",
                                  }}
                                >
                                  {totalStraf}pt
                                </span>
                              )}
                              {!hasDisp && totalStraf === 0 && (
                                <span style={{ color: "rgba(255,255,255,0.20)", fontSize: 11 }}>
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {bouts.length === 0 && (
                  <div
                    className="text-center py-10 text-sm"
                    style={{ color: "rgba(255,255,255,0.35)", background: "rgba(0,0,0,0.15)" }}
                  >
                    Geen partijen gevonden voor dit evenement
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
