"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Inter } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";

const inter = Inter({ subsets: ["latin"], weight: ["500", "600", "700"] });

const NVB_ORANGE = "#ff4d00";

/** ===== Weegschaal tolerantie ===== */
const WEEGSCHAAL_TOLERANTIE = 0.3; // kg — alleen boven 0.3 kg vereist dispensatie

// ===== Styling helpers =====
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

function metalText(): CSSProperties {
  return {
    background: "linear-gradient(180deg, #ffffff 0%, #d6d6d6 45%, #9a9a9a 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
}

// ===== Types =====
type WeegStatus = "ok" | "tolerantie" | "te_zwaar" | "dispensatie" | "leeg";

type Fighter = {
  partij_nr: number;
  naam: string;
  hoek: "rood" | "blauw";
  gym: string;
  va: string;
  gewicht_mm: number | null; // geregistreerd gewicht MM
  max_gewicht: number | null; // max klasse gewicht
  discipline: string;
  klasse: string;
};

type WeegRecord = {
  id?: string;
  naam: string;
  hoek: "rood" | "blauw";
  partij_nr: number;
  gewicht: number | null; // daadwerkelijk gewogen gewicht
  max_gewicht: number | null;
  dispensatie: boolean;
  boete: boolean;
  opmerking: string;
  event_id: string | null;
  matchmaking_id: string;
};

// ===== Weight evaluation =====
function berekenWeegStatus(
  gewicht: number | null,
  maxGewicht: number | null,
  dispensatie: boolean
): WeegStatus {
  if (gewicht == null || maxGewicht == null) return "leeg";
  const verschil = gewicht - maxGewicht;
  if (verschil <= 0) return "ok";
  if (verschil <= WEEGSCHAAL_TOLERANTIE) return "tolerantie"; // weegschaal tolerantie — OK
  if (dispensatie) return "dispensatie";
  return "te_zwaar";
}

function statusLabel(status: WeegStatus): { text: string; color: string } {
  switch (status) {
    case "ok":
      return { text: "✅ Goedgekeurd", color: "#22c55e" };
    case "tolerantie":
      return { text: `✅ OK (binnen ${WEEGSCHAAL_TOLERANTIE} kg tolerantie)`, color: "#86efac" };
    case "dispensatie":
      return { text: "🟡 Dispensatie verleend", color: NVB_ORANGE };
    case "te_zwaar":
      return { text: "❌ Te zwaar — dispensatie vereist", color: "#ef4444" };
    case "leeg":
      return { text: "— Nog niet gewogen", color: "#6b7280" };
  }
}

// ===== Logo Component =====
function FightSupportLogo() {
  return (
    <div className="flex justify-center mb-6">
      <div style={{ ...metalFrameStyle("none"), padding: "10px 20px", display: "inline-block" }}>
        <Image
          src="/branding/fightsupport/logo-dark.png"
          alt="FightSupport"
          width={180}
          height={48}
          style={{ objectFit: "contain", display: "block" }}
          priority
        />
      </div>
    </div>
  );
}

// ===== Fighter list item =====
function FighterListItem({
  fighter,
  isSelected,
  isWeighed,
  onClick,
}: {
  fighter: Fighter;
  isSelected: boolean;
  isWeighed: boolean;
  onClick: () => void;
}) {
  const hoekColor = fighter.hoek === "rood" ? "#ef4444" : "#3b82f6";
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg transition mb-1"
      style={{
        background: isSelected
          ? "rgba(255,77,0,0.18)"
          : "rgba(255,255,255,0.04)",
        border: isSelected
          ? `1px solid ${NVB_ORANGE}`
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0"
            style={{ background: hoekColor, color: "#fff" }}
          >
            #{fighter.partij_nr} {fighter.hoek.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-white text-sm font-semibold truncate">
            {fighter.naam || "—"}
          </span>
        </div>
        {isWeighed && (
          <span className="text-green-400 text-xs shrink-0">✓</span>
        )}
      </div>
      {fighter.gym && (
        <div className="text-gray-400 text-xs mt-0.5 pl-1 truncate">{fighter.gym}</div>
      )}
    </button>
  );
}

// ===== Main Component =====
export default function WeegstationPage() {
  const params = useParams();
  const router = useRouter();
  const matchmakingId = params?.matchmakingId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Event info
  const [eventId, setEventId] = useState<string | null>(null);
  const [evenementNaam, setEvenementNaam] = useState<string | null>(null);

  // Fighter data (from controle_bout_context)
  const [fighters, setFighters] = useState<Fighter[]>([]);

  // Existing weeg records (from weeglijst_resultaten)
  const [weegRecords, setWeegRecords] = useState<Record<string, WeegRecord>>({});

  // Selection & form state
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form fields for selected fighter
  const [fGewicht, setFGewicht] = useState("");
  const [fDispensatie, setFDispensatie] = useState(false);
  const [fBoete, setFBoete] = useState(false);
  const [fOpmerking, setFOpmerking] = useState("");

  function fighterKey(partij_nr: number, hoek: "rood" | "blauw") {
    return `${partij_nr}_${hoek}`;
  }

  // Load fighters from controle_bout_context
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch event info
      const { data: uploads } = await supabase
        .from("matchmaking_uploads")
        .select("evenement_naam, event_id")
        .eq("matchmaking_id", matchmakingId)
        .order("uploaded_at", { ascending: false })
        .limit(1);

      const upload = (uploads ?? [])[0] as any;
      const eid = String(upload?.event_id ?? "").trim() || null;
      const naam = String(upload?.evenement_naam ?? "").trim() || null;
      setEventId(eid);
      setEvenementNaam(naam);

      // Fetch fighters from controle_bout_context
      const { data: ctxRows, error: ctxErr } = await supabase
        .from("controle_bout_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .order("partij_nr", { ascending: true });

      if (ctxErr) throw ctxErr;

      const list: Fighter[] = [];
      for (const row of (ctxRows ?? []) as any[]) {
        const pn = Number(row.partij_nr);
        if (!Number.isFinite(pn) || pn <= 0) continue;
        const maxKg = toNum(row.max_gewicht ?? row.gewicht_max);

        const roodNaam = String(row.rood_naam_fp ?? row.rood_naam_mm ?? row.rood_naam ?? "").trim();
        if (roodNaam) {
          list.push({
            partij_nr: pn,
            naam: roodNaam,
            hoek: "rood",
            gym: String(row.rood_gym_fp ?? row.rood_gym_mm ?? row.rood_gym ?? "").trim(),
            va: String(row.rood_va_mm ?? row.va_rood ?? "").trim(),
            gewicht_mm: toNum(row.rood_gewicht_mm ?? row.rood_gewicht),
            max_gewicht: maxKg,
            discipline: String(row.discipline ?? "").trim(),
            klasse: String(row.klasse ?? "").trim(),
          });
        }

        const blauwNaam = String(row.blauw_naam_fp ?? row.blauw_naam_mm ?? row.blauw_naam ?? "").trim();
        if (blauwNaam) {
          list.push({
            partij_nr: pn,
            naam: blauwNaam,
            hoek: "blauw",
            gym: String(row.blauw_gym_fp ?? row.blauw_gym_mm ?? row.blauw_gym ?? "").trim(),
            va: String(row.blauw_va_mm ?? row.va_blauw ?? "").trim(),
            gewicht_mm: toNum(row.blauw_gewicht_mm ?? row.blauw_gewicht),
            max_gewicht: maxKg,
            discipline: String(row.discipline ?? "").trim(),
            klasse: String(row.klasse ?? "").trim(),
          });
        }
      }
      setFighters(list);

      // Load existing weigh-in records
      await loadWeegRecords(eid, list);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadWeegRecords(eid: string | null, fighterList: Fighter[]) {
    try {
      // Try to load by matchmaking_id first, then fallback to event_id
      let rows: any[] = [];

      const { data: byMM } = await supabase
        .from("weeglijst_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId);

      if (byMM && byMM.length > 0) {
        rows = byMM;
      } else if (eid) {
        const { data: byEvent } = await supabase
          .from("weeglijst_resultaten")
          .select("*")
          .eq("event_id", eid);
        rows = byEvent ?? [];
      }

      const map: Record<string, WeegRecord> = {};
      for (const r of rows) {
        const key = fighterKey(Number(r.partij_nr ?? 0), r.hoek);
        map[key] = {
          id: r.id,
          naam: r.naam,
          hoek: r.hoek,
          partij_nr: Number(r.partij_nr),
          gewicht: r.gewicht != null ? Number(r.gewicht) : null,
          max_gewicht: r.max_gewicht != null ? Number(r.max_gewicht) : null,
          dispensatie: !!r.dispensatie,
          boete: !!r.boete,
          opmerking: r.opmerking ?? "",
          event_id: r.event_id ?? null,
          matchmaking_id: r.matchmaking_id ?? matchmakingId,
        };
      }

      // Also initialize missing fighters without records
      for (const f of fighterList) {
        const key = fighterKey(f.partij_nr, f.hoek);
        if (!map[key]) {
          map[key] = {
            naam: f.naam,
            hoek: f.hoek,
            partij_nr: f.partij_nr,
            gewicht: null,
            max_gewicht: f.max_gewicht,
            dispensatie: false,
            boete: false,
            opmerking: "",
            event_id: eid,
            matchmaking_id: matchmakingId,
          };
        }
      }

      setWeegRecords(map);
    } catch (e) {
      // weeg records are optional — log for debugging but don't block the UI
      console.error("loadWeegRecords fout:", e);
    }
  }

  useEffect(() => {
    if (matchmakingId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingId]);

  // When a fighter is selected, populate the form
  useEffect(() => {
    if (!selectedKey) return;
    const rec = weegRecords[selectedKey];
    if (rec) {
      setFGewicht(rec.gewicht != null ? String(rec.gewicht) : "");
      setFDispensatie(rec.dispensatie);
      setFBoete(rec.boete);
      setFOpmerking(rec.opmerking ?? "");
    } else {
      setFGewicht("");
      setFDispensatie(false);
      setFBoete(false);
      setFOpmerking("");
    }
    setMelding(null);
  }, [selectedKey, weegRecords]);

  function toNum(v: any): number | null {
    if (v == null) return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function saveWeging() {
    if (!selectedKey) return;
    setIsSaving(true);
    setMelding(null);

    const fighter = fighters.find(
      (f) => fighterKey(f.partij_nr, f.hoek) === selectedKey
    );
    if (!fighter) {
      setIsSaving(false);
      return;
    }

    const gewichtNum = toNum(fGewicht);
    const maxGewicht = fighter.max_gewicht;

    const payload: Record<string, any> = {
      naam: fighter.naam,
      hoek: fighter.hoek,
      partij_nr: fighter.partij_nr,
      gewicht: gewichtNum,
      max_gewicht: maxGewicht,
      dispensatie: fDispensatie,
      boete: fBoete,
      opmerking: fOpmerking,
      event_id: eventId,
      matchmaking_id: matchmakingId,
    };

    try {
      const existingId = weegRecords[selectedKey]?.id;
      if (existingId) {
        const { error } = await supabase
          .from("weeglijst_resultaten")
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("weeglijst_resultaten")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          payload.id = (data as any).id;
        }
      }

      // Update local state
      setWeegRecords((prev) => ({
        ...prev,
        [selectedKey]: {
          ...prev[selectedKey],
          ...payload,
          id: payload.id ?? prev[selectedKey]?.id,
          gewicht: gewichtNum,
          dispensatie: fDispensatie,
          boete: fBoete,
          opmerking: fOpmerking,
        },
      }));

      setMelding("✅ Opgeslagen.");
    } catch (e: any) {
      setMelding(`❌ ${e?.message ?? "Opslaan mislukt"}`);
    } finally {
      setIsSaving(false);
    }
  }

  // ===== Derived data =====
  const filteredFighters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fighters;
    return fighters.filter(
      (f) =>
        f.naam.toLowerCase().includes(q) ||
        f.gym.toLowerCase().includes(q) ||
        f.va.toLowerCase().includes(q) ||
        String(f.partij_nr).includes(q)
    );
  }, [fighters, search]);

  const selectedFighter = useMemo(
    () => fighters.find((f) => fighterKey(f.partij_nr, f.hoek) === selectedKey) ?? null,
    [fighters, selectedKey]
  );

  const currentRecord = selectedKey ? weegRecords[selectedKey] ?? null : null;
  const gewichtNum = toNum(fGewicht);
  const weegStatus = berekenWeegStatus(gewichtNum, selectedFighter?.max_gewicht ?? null, fDispensatie);
  const statusInfo = statusLabel(weegStatus);

  const weighedCount = Object.values(weegRecords).filter(
    (r) => r.gewicht != null
  ).length;

  const separator: CSSProperties = {
    height: "1px",
    background: "linear-gradient(to right, transparent, rgba(220,220,220,0.22), transparent)",
  };

  return (
    <div
      className={`min-h-screen bg-black text-white ${inter.className}`}
      style={{ padding: "24px 16px" }}
    >
      {/* Logo */}
      <FightSupportLogo />

      {/* Title */}
      <div className="text-center mb-6">
        <h1
          className="text-3xl font-extrabold tracking-widest uppercase"
          style={metalText()}
        >
          Weegstation
        </h1>
        {evenementNaam && (
          <p className="text-sm mt-1" style={{ color: NVB_ORANGE }}>
            {evenementNaam}
          </p>
        )}
        <p className="text-gray-500 text-xs mt-1">
          {weighedCount} / {fighters.length} vechters gewogen
          &nbsp;·&nbsp;Weegschaal tolerantie: {WEEGSCHAAL_TOLERANTIE} kg
        </p>
      </div>

      {error && (
        <div className="mb-4 text-center text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 mt-12">Laden…</div>
      ) : (
        <div
          className="flex gap-4 mx-auto"
          style={{ maxWidth: 1100 }}
        >
          {/* ===== LEFT PANEL: Fighter list ===== */}
          <div
            style={{ ...metalFrameStyle("none"), width: 280, minWidth: 240, padding: 16, flexShrink: 0 }}
          >
            <div className="mb-3">
              <h2
                className="text-sm font-extrabold uppercase tracking-wider mb-2"
                style={{ color: NVB_ORANGE }}
              >
                Vechters
              </h2>
              <input
                type="text"
                placeholder="Zoek naam, gym, VA…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded px-2 py-1.5 text-sm bg-black/40 text-white border focus:outline-none"
                style={{ borderColor: "rgba(255,255,255,0.15)" }}
              />
            </div>

            <div style={separator} className="mb-3" />

            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {filteredFighters.length === 0 && (
                <p className="text-gray-500 text-xs text-center py-4">
                  {fighters.length === 0 ? "Geen vechters gevonden in matchmaking." : "Geen resultaten."}
                </p>
              )}
              {filteredFighters.map((f) => {
                const key = fighterKey(f.partij_nr, f.hoek);
                const rec = weegRecords[key];
                return (
                  <FighterListItem
                    key={key}
                    fighter={f}
                    isSelected={selectedKey === key}
                    isWeighed={rec?.gewicht != null}
                    onClick={() => setSelectedKey(key)}
                  />
                );
              })}
            </div>
          </div>

          {/* ===== RIGHT PANEL: Weeg form ===== */}
          <div style={{ ...metalFrameStyle("orange"), flex: 1, padding: 24 }}>
            {!selectedFighter ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3">
                <span className="text-5xl opacity-30">⚖️</span>
                <p className="text-gray-400 text-sm">
                  Selecteer een vechter in het linker paneel om te wegen.
                </p>
              </div>
            ) : (
              <div>
                {/* Fighter header */}
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className="text-xs font-extrabold px-2 py-1 rounded uppercase"
                    style={{
                      background: selectedFighter.hoek === "rood" ? "#ef4444" : "#3b82f6",
                      color: "#fff",
                    }}
                  >
                    Partij {selectedFighter.partij_nr} — {selectedFighter.hoek === "rood" ? "Rood" : "Blauw"}
                  </span>
                  <h2
                    className="text-xl font-extrabold"
                    style={metalText()}
                  >
                    {selectedFighter.naam}
                  </h2>
                </div>

                {/* Fighter info card */}
                <div style={{ ...metalInnerStyle(), padding: 16, marginBottom: 20 }}>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {selectedFighter.gym && (
                      <>
                        <span className="text-zinc-500 font-semibold">Sportschool</span>
                        <span className="text-zinc-900 font-semibold">{selectedFighter.gym}</span>
                      </>
                    )}
                    {selectedFighter.va && (
                      <>
                        <span className="text-zinc-500 font-semibold">VA-nummer</span>
                        <span className="text-zinc-900 font-mono">{selectedFighter.va}</span>
                      </>
                    )}
                    {selectedFighter.discipline && (
                      <>
                        <span className="text-zinc-500 font-semibold">Discipline / Klasse</span>
                        <span className="text-zinc-900">{selectedFighter.discipline}{selectedFighter.klasse ? ` / ${selectedFighter.klasse}` : ""}</span>
                      </>
                    )}
                    {selectedFighter.gewicht_mm != null && (
                      <>
                        <span className="text-zinc-500 font-semibold">Ingeschreven gewicht</span>
                        <span className="text-zinc-900 font-bold">{selectedFighter.gewicht_mm.toFixed(1)} kg</span>
                      </>
                    )}
                    {selectedFighter.max_gewicht != null && (
                      <>
                        <span className="text-zinc-500 font-semibold">Max klasse gewicht</span>
                        <span className="text-zinc-900 font-bold">{selectedFighter.max_gewicht.toFixed(1)} kg</span>
                      </>
                    )}
                    <span className="text-zinc-500 font-semibold">Tolerantie weegschaal</span>
                    <span className="text-zinc-600">{WEEGSCHAAL_TOLERANTIE} kg</span>
                  </div>
                </div>

                {/* Weight input section */}
                <div className="mb-5">
                  <label className="block">
                    <span
                      className="text-xs font-extrabold uppercase tracking-wider block mb-2"
                      style={{ color: NVB_ORANGE }}
                    >
                      Gewogen gewicht (kg)
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="bijv. 71.8"
                      value={fGewicht}
                      onChange={(e) => setFGewicht(e.target.value)}
                      className="w-full rounded-lg px-4 py-3 text-lg font-bold bg-black/50 text-white border focus:outline-none focus:border-orange-500 transition"
                      style={{ borderColor: "rgba(255,255,255,0.20)" }}
                    />
                  </label>
                </div>

                {/* Weight status */}
                {gewichtNum != null && selectedFighter.max_gewicht != null && (
                  <div
                    className="rounded-lg px-4 py-3 mb-5 text-sm font-bold"
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      border: `1px solid ${statusInfo.color}`,
                      color: statusInfo.color,
                    }}
                  >
                    <div>{statusInfo.text}</div>
                    {gewichtNum > selectedFighter.max_gewicht && (
                      <div className="text-xs font-normal mt-1 opacity-80">
                        Verschil: +{(gewichtNum - selectedFighter.max_gewicht).toFixed(2)} kg
                        {gewichtNum - selectedFighter.max_gewicht <= WEEGSCHAAL_TOLERANTIE
                          ? ` (binnen ${WEEGSCHAAL_TOLERANTIE} kg tolerantie)`
                          : ` (boven ${WEEGSCHAAL_TOLERANTIE} kg tolerantie — dispensatie vereist)`}
                      </div>
                    )}
                  </div>
                )}

                {/* Dispensatie / Boete */}
                <div style={separator} className="mb-4" />

                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fDispensatie}
                      onChange={(e) => setFDispensatie(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: NVB_ORANGE }}
                    />
                    <span className="text-sm font-semibold text-white">
                      Dispensatie verleend
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fBoete}
                      onChange={(e) => setFBoete(e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: "#ef4444" }}
                    />
                    <span className="text-sm font-semibold text-white">
                      Boete
                    </span>
                  </label>
                </div>

                {/* Opmerking */}
                <div className="mb-5">
                  <label className="block">
                    <span
                      className="text-xs font-extrabold uppercase tracking-wider block mb-2"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      Opmerking
                    </span>
                    <textarea
                      rows={2}
                      placeholder="Optionele opmerking…"
                      value={fOpmerking}
                      onChange={(e) => setFOpmerking(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm bg-black/50 text-white border focus:outline-none resize-none"
                      style={{ borderColor: "rgba(255,255,255,0.15)" }}
                    />
                  </label>
                </div>

                {/* Melding */}
                {melding && (
                  <p
                    className={`text-sm mb-3 ${
                      melding.startsWith("✅") ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {melding}
                  </p>
                )}

                {/* Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={saveWeging}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-lg font-extrabold text-sm transition"
                    style={{
                      background: isSaving ? "rgba(255,77,0,0.4)" : NVB_ORANGE,
                      color: "#fff",
                      border: `1px solid ${NVB_ORANGE}`,
                      opacity: isSaving ? 0.7 : 1,
                    }}
                  >
                    {isSaving ? "Opslaan…" : "Opslaan"}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-5 py-2 rounded-lg font-semibold text-sm transition"
                    style={{
                      background: "transparent",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.20)",
                    }}
                  >
                    ← Terug
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
