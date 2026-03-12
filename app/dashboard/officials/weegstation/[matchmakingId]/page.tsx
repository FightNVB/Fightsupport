"use client";

// app/dashboard/officials/weegstation/[matchmakingId]/page.tsx
// ✅ Professioneel weegstation NVB — registratie, validatie, dispensatie en status per partij

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";
import { useAuth } from "@/context/AuthContext";
import NvbDarkButton from "@/components/NvbDarkButton";
import NvbLightButton from "@/components/NvbLightButton";

// ─── Kleuren & Constanten ─────────────────────────────────────────────────────
const NVB_ORANGE = "#ff4d00";
const ROE_RED = "#dc2626";
const BLAUW_BLUE = "#2563eb";

// Gewicht invoer grenzen voor het weegformulier (kg)
const GEWICHT_MIN_KG = 20;
const GEWICHT_MAX_KG = 200;

// ─── Type Definition — exact afgestemd op weigh_in_bouts schema ──────────────
type WeighInBout = {
  id: string;
  matchmaking_id: string;
  upload_id: string | null;
  bout_context_id: string | null;
  partij_nr: number;
  bondteam: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  discipline: string | null;
  klasse_mm: string | null;
  max_gewicht: number | null;

  rood_naam: string | null;
  rood_gym: string | null;
  rood_va: string | null;
  rood_geboortedatum: string | null;
  rood_leeftijd_event: number | null;
  rood_doorgegeven_gewicht: number | null;
  rood_gewogen_gewicht: number | null;

  blauw_naam: string | null;
  blauw_gym: string | null;
  blauw_va: string | null;
  blauw_geboortedatum: string | null;
  blauw_leeftijd_event: number | null;
  blauw_doorgegeven_gewicht: number | null;
  blauw_gewogen_gewicht: number | null;

  gewicht_verschil: number | null;
  leeftijd_type: string;
  reglement_status: string;
  praktijk_status: string;
  eindstatus: string;

  dispensatie_nodig: boolean;
  dispensatie_verleend: boolean;
  dispensatie_reason: string | null;
  dispensatie_by: string | null;
  dispensatie_at: string | null;

  weging_notitie: string | null;
  laatste_bewerking_door: string | null;
  laatste_bewerking_op: string | null;
  created_at: string | null;
  updated_at: string | null;

  gewicht_strafpunt_rood: string | null;
  gewicht_strafpunt_blauw: string | null;
  admin_sanctie_nodig: string | null;
  admin_sanctie_reason: string | null;
};

// ─── Helper functies ──────────────────────────────────────────────────────────
function toNum(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function normalizeBoutRow(row: any): WeighInBout {
  return {
    ...row,
    upload_id: row?.upload_id ?? null,
    bout_context_id: row?.bout_context_id ?? null,
    max_gewicht: toNum(row?.max_gewicht),
    rood_doorgegeven_gewicht: toNum(row?.rood_doorgegeven_gewicht),
    blauw_doorgegeven_gewicht: toNum(row?.blauw_doorgegeven_gewicht),
    rood_gewogen_gewicht: toNum(row?.rood_gewogen_gewicht),
    blauw_gewogen_gewicht: toNum(row?.blauw_gewogen_gewicht),
    gewicht_verschil: toNum(row?.gewicht_verschil),
    rood_leeftijd_event: toNum(row?.rood_leeftijd_event),
    blauw_leeftijd_event: toNum(row?.blauw_leeftijd_event),
    dispensatie_nodig: !!row?.dispensatie_nodig,
    dispensatie_verleend: !!row?.dispensatie_verleend,
    dispensatie_reason: row?.dispensatie_reason ?? null,
    dispensatie_by: row?.dispensatie_by ?? null,
    dispensatie_at: row?.dispensatie_at ?? null,
    gewicht_strafpunt_rood: row?.gewicht_strafpunt_rood ?? null,
    gewicht_strafpunt_blauw: row?.gewicht_strafpunt_blauw ?? null,
    admin_sanctie_nodig: row?.admin_sanctie_nodig ?? null,
    admin_sanctie_reason: row?.admin_sanctie_reason ?? null,
  } as WeighInBout;
}

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString("nl-NL");
}

function fmt(v: number | null, decimals = 2) {
  if (v == null) return "-";
  return v.toFixed(decimals);
}

// ─── NVB Gewichtsberekening ───────────────────────────────────────────────────
type BerekenResult = {
  status: string;
  rOkKlasse: boolean | null;
  bOkKlasse: boolean | null;
  verschil: number | null;
  verschilOk: boolean | null;
  maxVerschil: number;
  maxVerschilDisp: number;
  offsetKlasse: number;
};

function berekenGewichtsStatus(
  bout: WeighInBout,
  rGewOverride?: number | null,
  bGewOverride?: number | null
): BerekenResult {
  const rGew = rGewOverride !== undefined ? rGewOverride : bout.rood_gewogen_gewicht;
  const bGew = bGewOverride !== undefined ? bGewOverride : bout.blauw_gewogen_gewicht;
  const maxGew = bout.max_gewicht;
  const isJeugd = bout.leeftijd_type?.toLowerCase().includes("jeugd");

  const offsetKlasse = isJeugd ? 2.0 : 3.0;
  const maxVerschil = isJeugd ? 2.5 : 3.0;
  const maxVerschilDisp = isJeugd ? 4.0 : 7.0;

  const adminSanctie = !!(bout.admin_sanctie_nodig && bout.admin_sanctie_nodig !== "0");

  if (adminSanctie) {
    return {
      status: "HANDMATIGE_BEOORDELING",
      rOkKlasse: null, bOkKlasse: null, verschil: null,
      verschilOk: null, maxVerschil, maxVerschilDisp, offsetKlasse,
    };
  }

  if (bout.dispensatie_verleend) {
    const verschil = rGew != null && bGew != null ? Math.abs(rGew - bGew) : null;
    return {
      status: "GOEDGEKEURD_MET_DISPENSATIE",
      rOkKlasse: null, bOkKlasse: null, verschil,
      verschilOk: null, maxVerschil, maxVerschilDisp, offsetKlasse,
    };
  }

  if (rGew == null && bGew == null) {
    return {
      status: "WACHT_OP_WEGEN",
      rOkKlasse: null, bOkKlasse: null, verschil: null,
      verschilOk: null, maxVerschil, maxVerschilDisp, offsetKlasse,
    };
  }

  if (rGew == null || bGew == null) {
    return {
      status: "DEELS_GEWOGEN",
      rOkKlasse: null, bOkKlasse: null, verschil: null,
      verschilOk: null, maxVerschil, maxVerschilDisp, offsetKlasse,
    };
  }

  let rOkKlasse: boolean | null = null;
  let bOkKlasse: boolean | null = null;

  if (maxGew != null) {
    const minGew = maxGew - offsetKlasse;
    rOkKlasse = rGew >= minGew && rGew <= maxGew;
    bOkKlasse = bGew >= minGew && bGew <= maxGew;
  }

  const verschil = Math.abs(rGew - bGew);
  const verschilOk = verschil <= maxVerschil;
  const verschilDispensatie = verschil <= maxVerschilDisp;

  const klasseOk = rOkKlasse !== false && bOkKlasse !== false;

  if (klasseOk && verschilOk) {
    return { status: "OK", rOkKlasse, bOkKlasse, verschil, verschilOk, maxVerschil, maxVerschilDisp, offsetKlasse };
  }

  if (verschilDispensatie) {
    return { status: "DISPENSATIE_NODIG", rOkKlasse, bOkKlasse, verschil, verschilOk: false, maxVerschil, maxVerschilDisp, offsetKlasse };
  }

  return { status: "AFKEUR", rOkKlasse, bOkKlasse, verschil, verschilOk: false, maxVerschil, maxVerschilDisp, offsetKlasse };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; emoji: string }> = {
  WACHT_OP_WEGEN: { label: "Wacht op wegen", bg: "#f3f4f6", color: "#374151", emoji: "⏳" },
  DEELS_GEWOGEN: { label: "Deels gewogen", bg: "#fef3c7", color: "#92400e", emoji: "⚖️" },
  OK: { label: "OK", bg: "#dcfce7", color: "#166534", emoji: "✅" },
  DISPENSATIE_NODIG: { label: "Dispensatie nodig", bg: "#fef9c3", color: "#713f12", emoji: "⚠️" },
  GOEDGEKEURD_MET_DISPENSATIE: { label: "Goedgekeurd (disp.)", bg: "#d1fae5", color: "#065f46", emoji: "✅" },
  AFKEUR: { label: "Afkeur", bg: "#fee2e2", color: "#991b1b", emoji: "❌" },
  HANDMATIGE_BEOORDELING: { label: "Handmatige beoordeling", bg: "#e0e7ff", color: "#3730a3", emoji: "🔍" },
  ACTIE: { label: "Actie vereist", bg: "#fef3c7", color: "#92400e", emoji: "⚡" },
};

function StatusBadge({ status, size = "sm" }: { status: string; size?: "sm" | "lg" }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "#f3f4f6", color: "#374151", emoji: "❓" };
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 6,
        fontWeight: 700,
        fontSize: size === "lg" ? 14 : 11,
        padding: size === "lg" ? "6px 12px" : "2px 8px",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ─── Stijl helpers ────────────────────────────────────────────────────────────
function metalFrameStyle(): CSSProperties {
  const accentGlow =
    "radial-gradient(640px 320px at 50% 0%, rgba(255,77,0,0.18), transparent 62%)";
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

function darkInsetStyle(accent?: "rood" | "blauw" | "none"): CSSProperties {
  const borderColor =
    accent === "rood"
      ? "rgba(220,38,38,0.45)"
      : accent === "blauw"
      ? "rgba(37,99,235,0.45)"
      : "rgba(255,255,255,0.08)";
  return {
    background: "rgba(0,0,0,0.28)",
    border: `1.5px solid ${borderColor}`,
    borderRadius: 12,
  };
}

function silverPlateStyle(): CSSProperties {
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

// ─── Hoofd component ──────────────────────────────────────────────────────────
export default function WeegstationPage() {
  const { matchmakingId } = useParams<{ matchmakingId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [bouts, setBouts] = useState<WeighInBout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WeighInBout | null>(null);
  const [melding, setMelding] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [opslaan, setOpslaan] = useState(false);

  // Zoekveld en filter
  const [zoek, setZoek] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Bewerkingsvelden voor geselecteerde partij
  const [roodGewicht, setRoodGewicht] = useState("");
  const [blauwGewicht, setBlauwGewicht] = useState("");
  const [strafpuntRood, setStrafpuntRood] = useState(false);
  const [strafpuntBlauw, setStrafpuntBlauw] = useState(false);
  const [dispVerleend, setDispVerleend] = useState(false);
  const [dispReden, setDispReden] = useState("");
  const [adminSanctie, setAdminSanctie] = useState(false);
  const [adminSanctieReden, setAdminSanctieReden] = useState("");
  const [notitie, setNotitie] = useState("");

  const meldingenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roodInputRef = useRef<HTMLInputElement>(null);

  const eventInfo = useMemo(() => bouts[0] ?? null, [bouts]);

  // ─── Data laden ──────────────────────────────────────────────────────────────
  const selectedIdRef = useRef<string | null>(null);

  const loadBouts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("partij_nr", { ascending: true });

    if (error) {
      setMelding({ type: "err", text: "❌ Fout bij laden: " + error.message });
      setLoading(false);
      return;
    }
    const normalized = (data ?? []).map(normalizeBoutRow);
    setBouts(normalized);

    // Update geselecteerde partij als die al open stond (via ref om stale closure te vermijden)
    const currentSelectedId = selectedIdRef.current;
    if (currentSelectedId) {
      const updated = normalized.find((b) => b.id === currentSelectedId);
      if (updated) applySelectedBout(updated);
    }
    setLoading(false);
  }, [matchmakingId]);

  useEffect(() => {
    if (!user) return;
    loadBouts();
  }, [user, loadBouts]);

  // ─── Geselecteerde partij ─────────────────────────────────────────────────────
  function applySelectedBout(bout: WeighInBout) {
    setSelected(bout);
    selectedIdRef.current = bout.id;
    setRoodGewicht(bout.rood_gewogen_gewicht != null ? String(bout.rood_gewogen_gewicht) : "");
    setBlauwGewicht(bout.blauw_gewogen_gewicht != null ? String(bout.blauw_gewogen_gewicht) : "");
    setStrafpuntRood(bout.gewicht_strafpunt_rood === "1");
    setStrafpuntBlauw(bout.gewicht_strafpunt_blauw === "1");
    setDispVerleend(bout.dispensatie_verleend);
    setDispReden(bout.dispensatie_reason ?? "");
    setAdminSanctie(!!(bout.admin_sanctie_nodig && bout.admin_sanctie_nodig !== "0"));
    setAdminSanctieReden(bout.admin_sanctie_reason ?? "");
    setNotitie(bout.weging_notitie ?? "");
  }

  function selectBout(bout: WeighInBout) {
    setMelding(null);
    applySelectedBout(bout);
    // Focus rood gewicht input
    setTimeout(() => roodInputRef.current?.focus(), 50);
  }

  // ─── Live preview status ──────────────────────────────────────────────────────
  const previewStatus = useMemo((): BerekenResult | null => {
    if (!selected) return null;
    const tempBout: WeighInBout = {
      ...selected,
      dispensatie_verleend: dispVerleend,
      admin_sanctie_nodig: adminSanctie ? "1" : null,
    };
    return berekenGewichtsStatus(tempBout, toNum(roodGewicht), toNum(blauwGewicht));
  }, [selected, roodGewicht, blauwGewicht, dispVerleend, adminSanctie]);

  // ─── Opslaan ──────────────────────────────────────────────────────────────────
  async function handleOpslaan() {
    if (!selected || !user) return;
    setOpslaan(true);
    setMelding(null);

    const payload: Record<string, any> = {
      id: selected.id,
      rood_gewogen_gewicht: toNum(roodGewicht),
      blauw_gewogen_gewicht: toNum(blauwGewicht),
      gewicht_strafpunt_rood: strafpuntRood ? "1" : "0",
      gewicht_strafpunt_blauw: strafpuntBlauw ? "1" : "0",
      dispensatie_verleend: dispVerleend,
      dispensatie_reason: dispReden.trim() || null,
      admin_sanctie_nodig: adminSanctie ? "1" : null,
      admin_sanctie_reason: adminSanctieReden.trim() || null,
      weging_notitie: notitie.trim() || null,
    };

    if (dispVerleend && !selected.dispensatie_verleend) {
      payload.dispensatie_by = user.id;
      payload.dispensatie_at = new Date().toISOString();
    }

    try {
      const res = await authedFetch("/api/officials/weigh-in/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        setMelding({ type: "err", text: "❌ " + (data?.error ?? "Opslaan mislukt") });
        setOpslaan(false);
        return;
      }

      // Update lokale state
      const updatedBout = normalizeBoutRow(data.bout);
      setBouts((prev) => prev.map((b) => (b.id === updatedBout.id ? updatedBout : b)));
      applySelectedBout(updatedBout);
      setMelding({ type: "ok", text: "✅ Gewicht opgeslagen!" });
      planMeldingClear();
    } catch (e: any) {
      setMelding({ type: "err", text: "❌ Fout: " + (e?.message ?? String(e)) });
    }
    setOpslaan(false);
  }

  function planMeldingClear() {
    if (meldingenTimer.current) clearTimeout(meldingenTimer.current);
    meldingenTimer.current = setTimeout(() => setMelding(null), 5000);
  }

  // ─── Dispensatie verlenen / weigeren ─────────────────────────────────────────
  async function handleDispensatieToggle(verlenen: boolean) {
    if (!dispReden.trim() && verlenen) {
      setMelding({ type: "err", text: "⚠️ Vul eerst een reden in voor de dispensatie." });
      return;
    }
    setDispVerleend(verlenen);
  }

  // ─── Statistieken ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = bouts.length;
    const gewogen = bouts.filter((b) => b.rood_gewogen_gewicht != null && b.blauw_gewogen_gewicht != null).length;
    const ok = bouts.filter((b) => b.eindstatus === "OK" || b.eindstatus === "GOEDGEKEURD_MET_DISPENSATIE").length;
    const dispNodig = bouts.filter((b) => b.eindstatus === "DISPENSATIE_NODIG").length;
    const afkeur = bouts.filter((b) => b.eindstatus === "AFKEUR").length;
    const handmatig = bouts.filter((b) => b.eindstatus === "HANDMATIGE_BEOORDELING").length;
    return { total, gewogen, ok, dispNodig, afkeur, handmatig };
  }, [bouts]);

  // ─── Gefilterde partijen ──────────────────────────────────────────────────────
  const filteredBouts = useMemo(() => {
    const q = zoek.toLowerCase().trim();
    return bouts.filter((b) => {
      // Status filter
      if (filterStatus !== "all") {
        if (filterStatus === "ok" && b.eindstatus !== "OK" && b.eindstatus !== "GOEDGEKEURD_MET_DISPENSATIE") return false;
        if (filterStatus === "dispensatie" && b.eindstatus !== "DISPENSATIE_NODIG") return false;
        if (filterStatus === "afkeur" && b.eindstatus !== "AFKEUR") return false;
        if (filterStatus === "niet_gewogen" && b.rood_gewogen_gewicht != null && b.blauw_gewogen_gewicht != null) return false;
        if (filterStatus === "handmatig" && b.eindstatus !== "HANDMATIGE_BEOORDELING") return false;
      }
      // Zoek filter
      if (!q) return true;
      const zoekVelden = [
        b.rood_naam, b.blauw_naam,
        b.rood_gym, b.blauw_gym,
        b.rood_va, b.blauw_va,
        String(b.partij_nr),
      ].map((v) => (v ?? "").toLowerCase());
      return zoekVelden.some((v) => v.includes(q));
    });
  }, [bouts, zoek, filterStatus]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0d" }}>
        <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 700, fontSize: 18 }}>
          ⚖️ Weegstation laden…
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen p-3"
      style={{ background: "#0a0a0d" }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* ── Buitenste metalen frame ── */}
        <div style={metalFrameStyle()} className="p-4">

          {/* ── Header ── */}
          <div className="mb-4 py-3 px-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{ background: "linear-gradient(180deg, rgba(255,77,0,0.22), rgba(0,0,0,0))", border: "1px solid rgba(255,77,0,0.28)" }}>
            <div>
              <div style={{ color: NVB_ORANGE, fontWeight: 800, fontSize: 20, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                ⚖️ WEEGSTATION — {eventInfo?.evenement_naam ?? "…"}
              </div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>
                {formatDate(eventInfo?.evenement_datum)} &nbsp;·&nbsp;
                {eventInfo?.bondteam ?? "-"} &nbsp;·&nbsp;
                {eventInfo?.discipline ?? "-"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadBouts}
                style={{ color: NVB_ORANGE, fontSize: 13, fontWeight: 600, background: "none", border: "1px solid rgba(255,77,0,0.35)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}
              >
                ↺ Vernieuwen
              </button>
              <button
                onClick={() => router.push("/dashboard/officials/weegstation")}
                style={{ color: "rgba(255,255,255,0.60)", fontSize: 13, fontWeight: 500, background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}
              >
                ← Terug
              </button>
            </div>
          </div>

          {/* ── Statistieken balk ── */}
          <div className="mb-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: "Totaal", value: stats.total, color: "#64748b" },
              { label: "Gewogen", value: stats.gewogen, color: "#2563eb" },
              { label: "✅ OK", value: stats.ok, color: "#16a34a" },
              { label: "⚠️ Disp.", value: stats.dispNodig, color: "#ca8a04" },
              { label: "❌ Afkeur", value: stats.afkeur, color: "#dc2626" },
              { label: "🔍 Handmatig", value: stats.handmatig, color: "#7c3aed" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: s.color, fontWeight: 800, fontSize: 22 }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Melding ── */}
          {melding && (
            <div className="mb-3 p-3 rounded-xl text-sm font-semibold" style={{
              background: melding.type === "ok" ? "rgba(22,163,74,0.20)" : "rgba(220,38,38,0.20)",
              border: `1px solid ${melding.type === "ok" ? "rgba(22,163,74,0.40)" : "rgba(220,38,38,0.40)"}`,
              color: melding.type === "ok" ? "#bbf7d0" : "#fecaca",
            }}>
              {melding.text}
            </div>
          )}

          {/* ── Hoofd split layout ── */}
          <div className="flex gap-3" style={{ minHeight: 600 }}>

            {/* ─── LINKS: Zoekpanel ─── */}
            <div
              className="flex flex-col"
              style={{ width: "38%", minWidth: 280, maxWidth: 440 }}
            >
              <div style={darkInsetStyle()} className="flex flex-col h-full p-3">
                {/* Zoekveld */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="🔍 Zoek op naam, gym, VA, partij nr…"
                    value={zoek}
                    onChange={(e) => setZoek(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      fontSize: 15,
                      fontWeight: 500,
                      background: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255,255,255,0.14)",
                      borderRadius: 10,
                      color: "#fff",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Status filter knoppen */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {[
                    { key: "all", label: "Alles" },
                    { key: "niet_gewogen", label: "Te wegen" },
                    { key: "ok", label: "✅ OK" },
                    { key: "dispensatie", label: "⚠️ Disp." },
                    { key: "afkeur", label: "❌ Afkeur" },
                    { key: "handmatig", label: "🔍 Handm." },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilterStatus(f.key)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 6,
                        cursor: "pointer",
                        background: filterStatus === f.key ? NVB_ORANGE : "rgba(255,255,255,0.08)",
                        color: filterStatus === f.key ? "#fff" : "rgba(255,255,255,0.65)",
                        border: filterStatus === f.key ? `1px solid ${NVB_ORANGE}` : "1px solid rgba(255,255,255,0.10)",
                        transition: "all 0.15s",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Partijen lijst */}
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: 520 }}>
                  {filteredBouts.length === 0 ? (
                    <div className="text-center py-8" style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
                      Geen partijen gevonden
                    </div>
                  ) : (
                    filteredBouts.map((bout) => {
                      const isSelected = selected?.id === bout.id;
                      const status = bout.eindstatus;
                      const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.WACHT_OP_WEGEN;

                      return (
                        <button
                          key={bout.id}
                          onClick={() => selectBout(bout)}
                          className="w-full text-left mb-2 rounded-xl p-3 transition-all"
                          style={{
                            background: isSelected
                              ? "rgba(255,77,0,0.18)"
                              : "rgba(255,255,255,0.04)",
                            border: isSelected
                              ? `1.5px solid ${NVB_ORANGE}`
                              : "1.5px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
                                PARTIJ #{bout.partij_nr} &nbsp;·&nbsp; {bout.discipline ?? "-"} &nbsp;·&nbsp; {bout.klasse_mm ?? "-"}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                                <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13 }}>
                                  {bout.rood_naam ?? "?"}
                                </span>
                                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>vs</span>
                                <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 13 }}>
                                  {bout.blauw_naam ?? "?"}
                                </span>
                              </div>
                              <div style={{ color: "rgba(255,255,255,0.40)", fontSize: 11, marginTop: 2 }}>
                                {bout.rood_gym ?? "-"} vs {bout.blauw_gym ?? "-"}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div style={{
                                background: cfg.bg,
                                color: cfg.color,
                                borderRadius: 5,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 6px",
                              }}>
                                {cfg.emoji} {cfg.label.split(" ")[0]}
                              </div>
                              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 4 }}>
                                {bout.rood_gewogen_gewicht != null ? `${fmt(bout.rood_gewogen_gewicht, 1)}` : "–"} /
                                {bout.blauw_gewogen_gewicht != null ? ` ${fmt(bout.blauw_gewogen_gewicht, 1)}` : " –"} kg
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ─── RECHTS: Detail / Wegen ─── */}
            <div className="flex-1 min-w-0">
              {!selected ? (
                <div
                  className="h-full flex items-center justify-center rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1.5px dashed rgba(255,255,255,0.08)" }}
                >
                  <div className="text-center">
                    <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 16 }}>
                      Selecteer een partij links om te wegen
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 6 }}>
                      Klik op een partij uit de lijst
                    </div>
                  </div>
                </div>
              ) : (
                <div style={silverPlateStyle()} className="p-4 h-full overflow-y-auto">

                  {/* Partij info header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: "#111", letterSpacing: "0.03em" }}>
                        Partij #{selected.partij_nr}
                      </div>
                      <div style={{ color: "rgba(0,0,0,0.50)", fontSize: 13, marginTop: 2 }}>
                        {selected.discipline ?? "-"} &nbsp;·&nbsp;
                        {selected.klasse_mm ?? "-"} &nbsp;·&nbsp;
                        {selected.leeftijd_type} &nbsp;·&nbsp;
                        Max: {selected.max_gewicht != null ? `${selected.max_gewicht} kg` : "geen"}
                      </div>
                    </div>
                    {previewStatus && (
                      <StatusBadge status={previewStatus.status} size="lg" />
                    )}
                  </div>

                  {/* Gewicht invoer: rood + blauw */}
                  <div className="grid grid-cols-2 gap-4 mb-4">

                    {/* ROOD */}
                    <div className="rounded-2xl p-4" style={{
                      background: "linear-gradient(180deg, rgba(220,38,38,0.08), rgba(220,38,38,0.03))",
                      border: "2px solid rgba(220,38,38,0.25)",
                    }}>
                      <div style={{ color: ROE_RED, fontWeight: 800, fontSize: 13, letterSpacing: "0.08em", marginBottom: 8, textTransform: "uppercase" }}>
                        🔴 ROOD HOEK
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: "#111", marginBottom: 2 }}>
                        {selected.rood_naam ?? "–"}
                      </div>
                      <div style={{ color: "rgba(0,0,0,0.50)", fontSize: 13, marginBottom: 4 }}>
                        {selected.rood_gym ?? "-"} &nbsp;·&nbsp; VA: {selected.rood_va ?? "-"} &nbsp;·&nbsp; {selected.rood_leeftijd_event != null ? `${selected.rood_leeftijd_event} jr` : "-"}
                      </div>
                      {selected.rood_doorgegeven_gewicht != null && (
                        <div style={{ color: "rgba(0,0,0,0.40)", fontSize: 12, marginBottom: 8 }}>
                          Opgegeven: {fmt(selected.rood_doorgegeven_gewicht, 1)} kg
                        </div>
                      )}

                      {/* Gewicht input — groot voor digibeet-proof gebruik */}
                      <label style={{ fontWeight: 600, fontSize: 13, color: "#333", display: "block", marginBottom: 4 }}>
                        Gewogen gewicht (kg)
                      </label>
                      <input
                        ref={roodInputRef}
                        type="number"
                        step="0.1"
                        min={GEWICHT_MIN_KG}
                        max={GEWICHT_MAX_KG}
                        placeholder="bijv. 69.8"
                        value={roodGewicht}
                        onChange={(e) => setRoodGewicht(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "16px 14px",
                          fontSize: 28,
                          fontWeight: 800,
                          textAlign: "center",
                          background: "rgba(255,255,255,0.90)",
                          border: "2.5px solid rgba(220,38,38,0.40)",
                          borderRadius: 12,
                          color: "#111",
                          outline: "none",
                          letterSpacing: "0.05em",
                        }}
                      />

                      {/* Klasse status indicator */}
                      {previewStatus && previewStatus.rOkKlasse !== null && (
                        <div className="mt-2 text-center text-sm font-semibold" style={{ color: previewStatus.rOkKlasse ? "#16a34a" : "#dc2626" }}>
                          {previewStatus.rOkKlasse ? "✓ Binnen klasse" : `✗ Buiten klasse (max ${selected.max_gewicht} kg)`}
                        </div>
                      )}

                      {/* Strafpunt */}
                      <label className="flex items-center gap-3 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={strafpuntRood}
                          onChange={(e) => setStrafpuntRood(e.target.checked)}
                          style={{ width: 22, height: 22, cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>
                          Strafpunt 1e ronde (rood)
                        </span>
                      </label>
                    </div>

                    {/* BLAUW */}
                    <div className="rounded-2xl p-4" style={{
                      background: "linear-gradient(180deg, rgba(37,99,235,0.08), rgba(37,99,235,0.03))",
                      border: "2px solid rgba(37,99,235,0.25)",
                    }}>
                      <div style={{ color: BLAUW_BLUE, fontWeight: 800, fontSize: 13, letterSpacing: "0.08em", marginBottom: 8, textTransform: "uppercase" }}>
                        🔵 BLAUW HOEK
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: "#111", marginBottom: 2 }}>
                        {selected.blauw_naam ?? "–"}
                      </div>
                      <div style={{ color: "rgba(0,0,0,0.50)", fontSize: 13, marginBottom: 4 }}>
                        {selected.blauw_gym ?? "-"} &nbsp;·&nbsp; VA: {selected.blauw_va ?? "-"} &nbsp;·&nbsp; {selected.blauw_leeftijd_event != null ? `${selected.blauw_leeftijd_event} jr` : "-"}
                      </div>
                      {selected.blauw_doorgegeven_gewicht != null && (
                        <div style={{ color: "rgba(0,0,0,0.40)", fontSize: 12, marginBottom: 8 }}>
                          Opgegeven: {fmt(selected.blauw_doorgegeven_gewicht, 1)} kg
                        </div>
                      )}

                      {/* Gewicht input — groot voor digibeet-proof gebruik */}
                      <label style={{ fontWeight: 600, fontSize: 13, color: "#333", display: "block", marginBottom: 4 }}>
                        Gewogen gewicht (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={GEWICHT_MIN_KG}
                        max={GEWICHT_MAX_KG}
                        placeholder="bijv. 68.4"
                        value={blauwGewicht}
                        onChange={(e) => setBlauwGewicht(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "16px 14px",
                          fontSize: 28,
                          fontWeight: 800,
                          textAlign: "center",
                          background: "rgba(255,255,255,0.90)",
                          border: "2.5px solid rgba(37,99,235,0.40)",
                          borderRadius: 12,
                          color: "#111",
                          outline: "none",
                          letterSpacing: "0.05em",
                        }}
                      />

                      {/* Klasse status indicator */}
                      {previewStatus && previewStatus.bOkKlasse !== null && (
                        <div className="mt-2 text-center text-sm font-semibold" style={{ color: previewStatus.bOkKlasse ? "#16a34a" : "#dc2626" }}>
                          {previewStatus.bOkKlasse ? "✓ Binnen klasse" : `✗ Buiten klasse (max ${selected.max_gewicht} kg)`}
                        </div>
                      )}

                      {/* Strafpunt */}
                      <label className="flex items-center gap-3 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={strafpuntBlauw}
                          onChange={(e) => setStrafpuntBlauw(e.target.checked)}
                          style={{ width: 22, height: 22, cursor: "pointer" }}
                        />
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>
                          Strafpunt 1e ronde (blauw)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Gewicht verschil indicator */}
                  {previewStatus?.verschil != null && (
                    <div className="mb-4 rounded-xl p-3 text-center" style={{
                      background: previewStatus.verschilOk ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                      border: `1.5px solid ${previewStatus.verschilOk ? "rgba(22,163,74,0.30)" : "rgba(220,38,38,0.30)"}`,
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: previewStatus.verschilOk ? "#166534" : "#991b1b" }}>
                        Verschil: {fmt(previewStatus.verschil, 1)} kg
                        &nbsp;
                        {previewStatus.verschilOk ? "✓" : "✗"}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.50)", marginTop: 2 }}>
                        Max toegestaan: {previewStatus.maxVerschil} kg &nbsp;|&nbsp;
                        Met dispensatie: {previewStatus.maxVerschilDisp} kg
                      </div>
                    </div>
                  )}

                  {/* NVB Gewichtsregels info */}
                  {previewStatus && (
                    <div className="mb-4 rounded-xl px-4 py-2 flex items-center gap-2" style={{
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}>
                      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.45)" }}>
                        NVB regels ({selected.leeftijd_type}):
                        klasse offset {previewStatus.offsetKlasse} kg &nbsp;·&nbsp;
                        normaal verschil ≤ {previewStatus.maxVerschil} kg &nbsp;·&nbsp;
                        dispensatie ≤ {previewStatus.maxVerschilDisp} kg
                      </span>
                    </div>
                  )}

                  {/* Dispensatie sectie (toon als nodig) */}
                  {(previewStatus?.status === "DISPENSATIE_NODIG" || dispVerleend) && (
                    <div className="mb-4 rounded-2xl p-4" style={{
                      background: "linear-gradient(180deg, rgba(234,179,8,0.08), rgba(234,179,8,0.03))",
                      border: "2px solid rgba(234,179,8,0.35)",
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#713f12", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        ⚠️ Dispensatie
                      </div>

                      <label style={{ fontWeight: 600, fontSize: 13, color: "#422006", display: "block", marginBottom: 6 }}>
                        Reden dispensatie
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Vul de reden in voor dispensatie verlenen/weigeren…"
                        value={dispReden}
                        onChange={(e) => setDispReden(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px",
                          fontSize: 14,
                          fontWeight: 500,
                          background: "rgba(255,255,255,0.85)",
                          border: "1.5px solid rgba(234,179,8,0.45)",
                          borderRadius: 10,
                          color: "#111",
                          outline: "none",
                          resize: "vertical",
                          marginBottom: 10,
                        }}
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleDispensatieToggle(true)}
                          disabled={dispVerleend}
                          style={{
                            flex: 1,
                            padding: "12px",
                            fontSize: 14,
                            fontWeight: 700,
                            borderRadius: 10,
                            cursor: dispVerleend ? "default" : "pointer",
                            background: dispVerleend ? "#dcfce7" : "#16a34a",
                            color: dispVerleend ? "#166534" : "#fff",
                            border: `2px solid ${dispVerleend ? "#86efac" : "#15803d"}`,
                          }}
                        >
                          {dispVerleend ? "✅ Dispensatie verleend" : "✅ Dispensatie verlenen"}
                        </button>
                        <button
                          onClick={() => handleDispensatieToggle(false)}
                          disabled={!dispVerleend}
                          style={{
                            flex: 1,
                            padding: "12px",
                            fontSize: 14,
                            fontWeight: 700,
                            borderRadius: 10,
                            cursor: !dispVerleend ? "default" : "pointer",
                            background: !dispVerleend ? "#f3f4f6" : "#fee2e2",
                            color: !dispVerleend ? "#9ca3af" : "#991b1b",
                            border: `2px solid ${!dispVerleend ? "#e5e7eb" : "#fca5a5"}`,
                          }}
                        >
                          ❌ Dispensatie intrekken
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Admin sanctie sectie */}
                  <div className="mb-4 rounded-2xl p-4" style={{
                    background: adminSanctie
                      ? "linear-gradient(180deg, rgba(124,58,237,0.10), rgba(124,58,237,0.04))"
                      : "rgba(0,0,0,0.03)",
                    border: `2px solid ${adminSanctie ? "rgba(124,58,237,0.40)" : "rgba(0,0,0,0.08)"}`,
                  }}>
                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={adminSanctie}
                        onChange={(e) => setAdminSanctie(e.target.checked)}
                        style={{ width: 22, height: 22, cursor: "pointer" }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 14, color: adminSanctie ? "#4c1d95" : "#333" }}>
                        🔍 Admin sanctie / Handmatige beoordeling nodig
                      </span>
                    </label>

                    {adminSanctie && (
                      <>
                        <label style={{ fontWeight: 600, fontSize: 13, color: "#4c1d95", display: "block", marginBottom: 6 }}>
                          Reden admin sanctie
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Beschrijf waarom admin beoordeling nodig is…"
                          value={adminSanctieReden}
                          onChange={(e) => setAdminSanctieReden(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            fontSize: 14,
                            fontWeight: 500,
                            background: "rgba(255,255,255,0.85)",
                            border: "1.5px solid rgba(124,58,237,0.35)",
                            borderRadius: 10,
                            color: "#111",
                            outline: "none",
                            resize: "vertical",
                          }}
                        />
                      </>
                    )}
                  </div>

                  {/* Notitie */}
                  <div className="mb-4">
                    <label style={{ fontWeight: 600, fontSize: 13, color: "#333", display: "block", marginBottom: 6 }}>
                      📝 Weegnotitie (optioneel)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Extra aantekeningen bij deze weging…"
                      value={notitie}
                      onChange={(e) => setNotitie(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: 14,
                        fontWeight: 500,
                        background: "rgba(255,255,255,0.85)",
                        border: "1.5px solid rgba(0,0,0,0.14)",
                        borderRadius: 10,
                        color: "#111",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Huidige DB-status */}
                  <div className="mb-4 rounded-xl px-4 py-3" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                      Huidige status in database
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={selected.eindstatus} />
                      {selected.dispensatie_verleend && (
                        <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: 5, fontSize: 11, fontWeight: 700, padding: "2px 8px" }}>
                          Dispensatie verleend
                        </span>
                      )}
                      {selected.gewicht_strafpunt_rood === "1" && (
                        <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 5, fontSize: 11, fontWeight: 700, padding: "2px 8px" }}>
                          Strafpunt Rood
                        </span>
                      )}
                      {selected.gewicht_strafpunt_blauw === "1" && (
                        <span style={{ background: "#dbeafe", color: "#1e40af", borderRadius: 5, fontSize: 11, fontWeight: 700, padding: "2px 8px" }}>
                          Strafpunt Blauw
                        </span>
                      )}
                    </div>
                    {selected.laatste_bewerking_op && (
                      <div style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", marginTop: 6 }}>
                        Laatste wijziging: {new Date(selected.laatste_bewerking_op).toLocaleString("nl-NL")}
                      </div>
                    )}
                  </div>

                  {/* Opslaan knop */}
                  <NvbDarkButton
                    label={opslaan ? "⏳ Opslaan…" : "💾 Gewicht opslaan"}
                    onClick={handleOpslaan}
                    disabled={opslaan}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Partijentabel overzicht ── */}
          <div className="mt-4" style={darkInsetStyle()}>
            <div className="px-4 pt-4 pb-2">
              <div style={{ color: NVB_ORANGE, fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                📋 Alle partijen — overzicht
              </div>
            </div>
            <div className="overflow-x-auto px-4 pb-4">
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Nr", "Discipline", "Klasse", "Rood", "Blauw", "R.gew.", "B.gew.", "Verschil", "Max", "Status", "Strafpunt", "Dispensatie"].map((h) => (
                      <th key={h} style={{ padding: "6px 10px", color: "rgba(255,255,255,0.50)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "left" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bouts.map((bout) => {
                    const isSelected = selected?.id === bout.id;
                    const cfg = STATUS_CONFIG[bout.eindstatus] ?? STATUS_CONFIG.WACHT_OP_WEGEN;
                    return (
                      <tr
                        key={bout.id}
                        onClick={() => selectBout(bout)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "rgba(255,77,0,0.14)" : "rgba(255,255,255,0.04)",
                          borderRadius: 8,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.07)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.04)";
                        }}
                      >
                        <td style={{ padding: "8px 10px", color: NVB_ORANGE, fontWeight: 700 }}>#{bout.partij_nr}</td>
                        <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.70)" }}>{bout.discipline ?? "-"}</td>
                        <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.70)" }}>{bout.klasse_mm ?? "-"}</td>
                        <td style={{ padding: "8px 10px", color: "#ef4444", fontWeight: 600 }}>{bout.rood_naam ?? "?"}</td>
                        <td style={{ padding: "8px 10px", color: "#60a5fa", fontWeight: 600 }}>{bout.blauw_naam ?? "?"}</td>
                        <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.80)", fontWeight: 700 }}>
                          {bout.rood_gewogen_gewicht != null ? `${fmt(bout.rood_gewogen_gewicht, 1)} kg` : <span style={{ color: "rgba(255,255,255,0.25)" }}>–</span>}
                        </td>
                        <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.80)", fontWeight: 700 }}>
                          {bout.blauw_gewogen_gewicht != null ? `${fmt(bout.blauw_gewogen_gewicht, 1)} kg` : <span style={{ color: "rgba(255,255,255,0.25)" }}>–</span>}
                        </td>
                        <td style={{ padding: "8px 10px", color: bout.gewicht_verschil != null ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.25)", fontWeight: 600 }}>
                          {bout.gewicht_verschil != null ? `${fmt(bout.gewicht_verschil, 1)} kg` : "–"}
                        </td>
                        <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.55)" }}>
                          {bout.max_gewicht != null ? `${bout.max_gewicht} kg` : "–"}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 7px" }}>
                            {cfg.emoji} {cfg.label}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
                          {bout.gewicht_strafpunt_rood === "1" && <span style={{ color: "#ef4444" }}>R</span>}
                          {bout.gewicht_strafpunt_blauw === "1" && <span style={{ color: "#60a5fa" }}>{bout.gewicht_strafpunt_rood === "1" ? " " : ""}B</span>}
                          {bout.gewicht_strafpunt_rood !== "1" && bout.gewicht_strafpunt_blauw !== "1" && <span style={{ color: "rgba(255,255,255,0.20)" }}>–</span>}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {bout.dispensatie_verleend
                            ? <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>✅ Verleend</span>
                            : bout.dispensatie_nodig
                            ? <span style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700 }}>⚠️ Nodig</span>
                            : <span style={{ color: "rgba(255,255,255,0.20)", fontSize: 11 }}>–</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
