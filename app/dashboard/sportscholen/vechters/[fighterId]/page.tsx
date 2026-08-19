"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Uitslag = {
  id?: string;
  datum?: string | null;
  evenement?: string | null;
  tegenstander?: string | null;
  uitslag?: string | null;
  discipline?: string | null;
  klasse?: string | null;
  gewicht?: string | number | null;
  sportschool?: string | null;
};

type Sportschool = {
  sportschool_id?: string | number | null;
  naam?: string | null;
  plaats?: string | null;
  land?: string | null;
  keurmerk_start?: string | null;
  keurmerk_einde?: string | null;
};

function safe(v: unknown, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function parseRaw(raw: any) {
  if (!raw) return {} as any;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {} as any;
  }
}

function fmt(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? safe(v) : d.toLocaleString("nl-NL");
}

function fmtDate(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? safe(v) : d.toLocaleDateString("nl-NL");
}

function calcAge(v: any) {
  const birth = v ? new Date(v) : null;
  if (!birth || Number.isNaN(birth.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}

function yes(value: any, positiveWords = ["ja", "yes", "true", "ok", "geldig", "actief"]) {
  const s = String(value ?? "").trim().toLowerCase();
  return value === true || positiveWords.some((w) => s === w || s.includes(w));
}

function fighterName(fighter: any) {
  return safe(fighter?.fp_naam ?? fighter?.naam, "Onbekende vechter");
}

function licenseValue(fighter: any) {
  const raw = parseRaw(fighter?.raw);
  return (
    fighter?.licentie_actief ??
    fighter?.licentie ??
    fighter?.licentie_status ??
    fighter?.heeft_licentie ??
    raw?.details?.licentie ??
    null
  );
}

function hasStartverbod(fighter: any) {
  const raw = parseRaw(fighter?.raw);
  return (
    yes(fighter?.heeft_startverbod, ["ja", "yes", "true"]) ||
    yes(fighter?.startverbod, ["ja", "yes", "true"]) ||
    yes(raw?.details?.heeft_startverbod, ["ja", "yes", "true"])
  );
}

function resultKind(v?: string | null): "win" | "loss" | "draw" | "other" {
  const x = String(v ?? "").trim().toLowerCase();
  if (x.includes("onbeslist") || x.includes("draw") || x.includes("gelijk")) return "draw";
  if (x.includes("verlies") || x.includes("verliest") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("winst") || x.includes("wint") || x.includes("gewonnen") || x === "win" || x === "w") return "win";
  return "other";
}

function resultLabel(v?: string | null) {
  const kind = resultKind(v);
  if (kind === "win") return "Winst";
  if (kind === "loss") return "Verlies";
  if (kind === "draw") return "Onbeslist";
  const x = String(v ?? "").trim().toLowerCase();
  if (x.includes("demo")) return "Demo";
  if (x.includes("no contest") || x.includes("nocontest") || x === "nc") return "No contest";
  return safe(v);
}

function daysUntil(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  d.setHours(23, 59, 59, 999);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function talentstatusFromFighter(f: any) {
  const text = String(f?.nulmeting_opmerking ?? "").replace(/\u00a0/g, " ").trim();
  const hasTalent = /\btalent\s*status\b|\btalentstatus\b/i.test(text);
  const klasse = String(f?.nulmeting_klasse ?? f?.berekende_klasse ?? "").trim().toUpperCase();
  const birth = f?.geboortedatum ? new Date(f.geboortedatum) : null;
  let leeftijd: number | null = null;

  if (birth && !Number.isNaN(birth.getTime())) {
    const today = new Date();
    leeftijd = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) {
      leeftijd--;
    }
  }

  const jeugd = klasse === "J" || klasse === "J+" || (leeftijd !== null && leeftijd < 18);
  return { jeugd, actief: jeugd && hasTalent };
}

export default function SportschoolFighterDetailPage() {
  const params = useParams<{ fighterId: string }>();
  const router = useRouter();
  const fighterId = String(params?.fighterId ?? "").trim();

  const [fighter, setFighter] = useState<any>(null);
  const [sportschool, setSportschool] = useState<Sportschool | null>(null);
  const [uitslagen, setUitslagen] = useState<Uitslag[]>([]);
  const [doping, setDoping] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [meldingType, setMeldingType] = useState("traint_niet_meer_bij_ons");
  const [meldingText, setMeldingText] = useState("");
  const [meldingSaving, setMeldingSaving] = useState(false);
  const [meldingMsg, setMeldingMsg] = useState("");
  const [meldingOpen, setMeldingOpen] = useState(false);

  useEffect(() => {
    if (fighterId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fighterId]);

  async function readJsonSafe(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: text || "Ongeldige server response" };
    }
  }

  async function loadUitslagenFallback(nextFighter: any, apiUitslagen: Uitslag[], nextSportschool: Sportschool | null) {
    if (apiUitslagen.length) return apiUitslagen;

    const va = String(nextFighter?.va_nummer ?? "").trim();
    const sportschoolId = nextFighter?.sportschool_id ?? nextSportschool?.sportschool_id;
    if (!va || !sportschoolId) return [];

    const { data, error: uitslagenError } = await supabase
      .from("sportschool_fighter_uitslagen_raw")
      .select("id,sportschool_id,va_nummer,datum,evenement,tegenstander,uitslag,discipline,klasse,gewicht,sportschool")
      .eq("sportschool_id", Number(sportschoolId))
      .eq("va_nummer", va)
      .order("datum", { ascending: false });

    if (uitslagenError) {
      console.warn("Uitslagen fallback laden mislukt", uitslagenError);
      return [];
    }

    return Array.isArray(data) ? data : [];
  }

  async function load() {
    try {
      setLoading(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch(
        `/api/sportscholen/vechters/${encodeURIComponent(fighterId)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        },
      );

      const json = await readJsonSafe(res);
      if (!res.ok) {
        throw new Error(json?.error || `Vechter laden mislukt (${res.status})`);
      }

      const nextFighter = json?.fighter || null;
      const nextSportschool = json?.sportschool || null;
      const apiUitslagen = Array.isArray(json?.uitslagen) ? json.uitslagen : [];
      const completeUitslagen = await loadUitslagenFallback(
        nextFighter,
        apiUitslagen,
        nextSportschool,
      );

      setFighter(nextFighter);
      setSportschool(nextSportschool);
      setUitslagen(completeUitslagen);
      setDoping(json?.doping ?? null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Vechter laden mislukt");
      setFighter(null);
      setSportschool(null);
      setUitslagen([]);
      setDoping(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitMelding() {
    if (!fighter) return;

    const tekst = meldingText.trim();
    if (!tekst) {
      setMeldingMsg("Vul eerst een korte toelichting in.");
      return;
    }

    try {
      setMeldingSaving(true);
      setMeldingMsg("");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch("/api/sportscholen/vechter-melding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fighter_id: fighter.id,
          sportschool_id: fighter.sportschool_id ?? sportschool?.sportschool_id ?? null,
          sportschool_naam: sportschool?.naam ?? null,
          va_nummer: fighter.va_nummer ?? null,
          naam: fighterName(fighter),
          type: meldingType,
          melding: tekst,
          snapshot: {
            fighter,
            sportschool,
            uitslagen_count: uitslagen.length,
          },
        }),
      });

      const json = await readJsonSafe(res);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Melding versturen mislukt");
      }

      setMeldingText("");
      setMeldingType("traint_niet_meer_bij_ons");
      setMeldingMsg("Wijzigingsverzoek is verstuurd naar admin.");
    } catch (e: any) {
      setMeldingMsg(e?.message || "Melding versturen mislukt");
    } finally {
      setMeldingSaving(false);
    }
  }

  const raw = useMemo(() => parseRaw(fighter?.raw), [fighter?.raw]);

  const record = useMemo(() => {
    const directW = Number(fighter?.gewonnen);
    const directL = Number(fighter?.verloren);
    const directD = Number(fighter?.onbeslist);
    const hasDirect =
      Number.isFinite(directW) &&
      Number.isFinite(directL) &&
      Number.isFinite(directD) &&
      (directW + directL + directD > 0 || Number(fighter?.totaal_wedstrijden ?? 0) > 0);

    if (hasDirect) {
      return {
        w: directW || 0,
        l: directL || 0,
        d: directD || 0,
        total: Number(fighter?.totaal_wedstrijden ?? directW + directL + directD) || 0,
      };
    }

    const fromResults = uitslagen.reduce(
      (acc, row) => {
        const kind = resultKind(row.uitslag);
        if (kind === "win") acc.w++;
        else if (kind === "loss") acc.l++;
        else if (kind === "draw") acc.d++;
        acc.total++;
        return acc;
      },
      { w: 0, l: 0, d: 0, total: 0 },
    );

    return fromResults;
  }, [fighter, uitslagen]);

  const hasLicense = yes(licenseValue(fighter));
  const startverbod = hasStartverbod(fighter);
  const talentstatus = talentstatusFromFighter(fighter);

  const klasse =
    fighter?.mma_level ??
    fighter?.berekende_klasse ??
    fighter?.nulmeting_klasse ??
    fighter?.klasse ??
    raw?.nulmeting?.klasse ??
    "-";

  const discipline =
    fighter?.primary_discipline ??
    fighter?.nulmeting_discipline ??
    fighter?.discipline ??
    raw?.nulmeting?.discipline ??
    "-";

  const keurmerkDays = daysUntil(sportschool?.keurmerk_einde);
  const keurmerkSoon = keurmerkDays !== null && keurmerkDays >= 0 && keurmerkDays <= 62;
  const keurmerkExpired = keurmerkDays !== null && keurmerkDays < 0;

  if (loading) {
    return (
      <main style={s.page}>
        <div style={s.loadingBox}>
          <RefreshCw className="animate-spin" size={28} />
          <b>Vechterdossier laden...</b>
        </div>
      </main>
    );
  }

  if (error || !fighter) {
    return (
      <main style={s.page}>
        <div style={s.wrap}>
          <button style={s.silver} onClick={() => router.back()}>
            <ArrowLeft size={16} /> Terug
          </button>
          <div style={s.errorBox}>{error || "Vechter niet gevonden."}</div>
        </div>
      </main>
    );
  }

  return (
    <main style={s.page} className="fighter-dossier-page">
      <style>{`
        .fighter-mobile-summary { display:none; }
        .fighter-white-field { background:#f1f2f3 !important; color:#111 !important; border-color:#c8cdd1 !important; }
        .fighter-white-field .fighter-field-label { color:#60676d !important; }
        .fighter-data-table thead th { background:#111 !important; color:#fff !important; border-bottom:2px solid #ff4d00 !important; }
        .fighter-data-table tbody td { background:#fff !important; color:#111 !important; border-bottom:1px solid #d3d6d9 !important; }
        .fighter-data-table tbody tr:nth-child(even) td { background:#f3f0ed !important; }
        .fighter-data-table tbody tr:hover td { background:#ffe1d2 !important; }
        .fighter-action-drawer select option{background:#fff;color:#111;}
        @media (min-width:761px) and (max-width:1100px){
          .fighter-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}
          .fighter-dossier-hero{min-height:560px !important;}
        }
        @media (max-width:760px){
          .fighter-dossier-page{padding:0 !important;background:linear-gradient(180deg,#202428 0%,#2b3035 50%,#1b1e21 100%) !important;}
          .fighter-dossier-wrap{width:100% !important;max-width:100% !important;}
          .fighter-dossier-hero{min-height:0 !important;max-height:none !important;aspect-ratio:auto !important;margin-bottom:0 !important;border-left:0 !important;border-right:0 !important;}
          .fighter-dossier-hero-image{position:relative !important;inset:auto !important;width:100% !important;height:auto !important;display:block !important;object-fit:contain !important;}
          .fighter-desktop-overlay{display:none !important;}
          .fighter-dossier-toolbar{top:8px !important;right:8px !important;left:8px !important;justify-content:space-between !important;gap:8px !important;}
          .fighter-dossier-toolbar button{height:34px !important;padding:0 10px !important;font-size:11px !important;background:rgba(10,12,14,.86) !important;}
          .fighter-mobile-summary{display:block !important;margin:0 10px 12px !important;padding:14px !important;background:linear-gradient(145deg,#33383d,#262b2f) !important;border:1px solid #555d64 !important;border-top:3px solid #ff4d00 !important;}
          .fighter-mobile-name{margin:0 !important;color:#fff !important;font-size:26px !important;line-height:1 !important;font-weight:950 !important;text-transform:uppercase !important;}
          .fighter-mobile-gym{margin-top:7px !important;color:#ff6a2a !important;font-size:12px !important;font-weight:900 !important;letter-spacing:.8px !important;text-transform:uppercase !important;}
          .fighter-mobile-identity{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:8px !important;margin-top:14px !important;}
          .fighter-mobile-identity>div,.fighter-mobile-status{min-width:0 !important;padding:10px !important;background:#3a4045 !important;border:1px solid #596168 !important;}
          .fighter-mobile-label{display:block !important;color:#aeb6bd !important;font-size:9px !important;font-weight:850 !important;letter-spacing:.8px !important;text-transform:uppercase !important;margin-bottom:4px !important;}
          .fighter-mobile-value{display:block !important;color:#fff !important;font-size:13px !important;font-weight:900 !important;word-break:break-word !important;}
          .fighter-mobile-status-grid{display:grid !important;grid-template-columns:1fr !important;gap:8px !important;margin-top:8px !important;}
          .fighter-mobile-status{display:grid !important;grid-template-columns:32px minmax(0,1fr) !important;align-items:center !important;gap:10px !important;}
          .fighter-mobile-status-icon{color:#ff5a16 !important;display:grid !important;place-items:center !important;}
          .fighter-dossier-page section{margin-left:10px !important;margin-right:10px !important;padding:12px !important;}
          .fighter-grid{grid-template-columns:1fr !important;}
          .fighter-dossier-page table{min-width:760px !important;font-size:12px !important;}
          .fighter-dossier-page th,.fighter-dossier-page td{padding:8px !important;}
          .fighter-action-drawer{margin-left:10px !important;margin-right:10px !important;}
        }
      `}</style>

      <div style={s.wrap} className="fighter-dossier-wrap">
        <header style={s.hero} className="fighter-dossier-hero">
          <img
            src="/branding/fightsupport/fighter-hero.png"
            alt=""
            aria-hidden="true"
            style={s.heroImage}
            className="fighter-dossier-hero-image"
          />
          <div style={s.heroShade} />

          <div style={s.heroToolbar} className="fighter-dossier-toolbar">
            <button style={s.glassButton} onClick={() => router.push("/dashboard/sportscholen")}>
              <ArrowLeft size={16} /> Fightcrew
            </button>
            <button
              style={{ ...s.glassButton, borderColor: "#ff4d00" }}
              onClick={() => setMeldingOpen((v) => !v)}
            >
              <MessageSquare size={16} />
              {meldingOpen ? "Sluiten" : "Wijziging doorgeven"}
            </button>
          </div>

          <div style={s.fighterNameBlock} className="fighter-desktop-overlay">
            <div style={s.fighterName}>{fighterName(fighter)}</div>
            <div style={s.fighterGym}>{safe(sportschool?.naam, "Sportschool")}</div>
          </div>

          <div style={s.heroIdentityValues} className="fighter-desktop-overlay">
            <div>{safe(fighter.va_nummer)}</div>
            <div>{safe(discipline)}</div>
            <div>{safe(klasse)}</div>
            <div>{safe(fighter.geslacht)}</div>
          </div>

          <div style={s.heroStatusGrid} className="fighter-desktop-overlay">
            <HeroStatus
              title={startverbod ? "STARTVERBOD" : "FIT TO FIGHT"}
              value={startverbod ? "Actief startverbod" : "Geen actief startverbod"}
              tone={startverbod ? "danger" : "ok"}
            />
            <HeroStatus
              title="LICENTIE"
              value={hasLicense ? "Geldig" : "Geen geldige licentie"}
              tone={hasLicense ? "ok" : "danger"}
            />
            <HeroStatus
              title={talentstatus.jeugd ? "TALENTSTATUS" : "DOPINGCERTIFICAAT"}
              value={
                talentstatus.jeugd
                  ? talentstatus.actief
                    ? "Talentstatus verdiend"
                    : "Niet gevonden"
                  : doping?.certificate_status || doping?.status || "Geen certificaatstatus"
              }
              tone={talentstatus.actief ? "ok" : "info"}
            />
            <HeroStatus
              title="LAATSTE UPDATE"
              value={fmt(fighter.updated_at ?? fighter.last_scraped_at)}
              tone="neutral"
            />
          </div>
        </header>

        <div className="fighter-mobile-summary">
          <h1 className="fighter-mobile-name">{fighterName(fighter)}</h1>
          <div className="fighter-mobile-gym">{safe(sportschool?.naam, "Sportschool")}</div>
          <div className="fighter-mobile-identity">
            <div><span className="fighter-mobile-label">VA-nummer</span><span className="fighter-mobile-value">{safe(fighter.va_nummer)}</span></div>
            <div><span className="fighter-mobile-label">Discipline</span><span className="fighter-mobile-value">{safe(discipline)}</span></div>
            <div><span className="fighter-mobile-label">Klasse</span><span className="fighter-mobile-value">{safe(klasse)}</span></div>
            <div><span className="fighter-mobile-label">Geslacht</span><span className="fighter-mobile-value">{safe(fighter.geslacht)}</span></div>
          </div>
          <div className="fighter-mobile-status-grid">
            <MobileStatus icon={<CalendarDays size={21} />} title={startverbod ? "Startverbod" : "Fit to fight"} value={startverbod ? "Actief startverbod" : "Geen actief startverbod"} />
            <MobileStatus icon={<ShieldCheck size={21} />} title="Licentie" value={hasLicense ? "Geldig" : "Geen geldige licentie"} />
            <MobileStatus icon={talentstatus.jeugd ? <Trophy size={21} /> : <Users size={21} />} title={talentstatus.jeugd ? "Talentstatus" : "Dopingcertificaat"} value={talentstatus.jeugd ? (talentstatus.actief ? "Talentstatus verdiend" : "Niet gevonden") : (doping?.certificate_status || doping?.status || "Geen certificaatstatus")} />
            <MobileStatus icon={<RefreshCw size={21} />} title="Laatste update" value={fmt(fighter.updated_at ?? fighter.last_scraped_at)} />
          </div>
        </div>

        {meldingOpen && (
          <section style={s.actionDrawer} className="fighter-action-drawer">
            <div style={s.actionHeader}>
              <div>
                <div style={s.actionEyebrow}>Sportschoolactie</div>
                <h2 style={s.actionTitle}>Wijziging of correctie doorgeven</h2>
                <p style={s.actionText}>
                  Geef alleen door wat admin moet controleren. De huidige vechtergegevens worden automatisch als context meegestuurd.
                </p>
              </div>
              <div style={s.vaPill}>VA {safe(fighter.va_nummer)}</div>
            </div>

            <div style={s.actionGrid}>
              <label style={s.label}>
                Type verzoek
                <select
                  value={meldingType}
                  onChange={(e) => setMeldingType(e.target.value)}
                  style={s.input}
                >
                  <option value="traint_niet_meer_bij_ons">Traint niet meer bij ons</option>
                  <option value="gegevens_wijzigen">Gegevens wijzigen</option>
                  <option value="uitslag_klopt_niet">Uitslag klopt niet</option>
                  <option value="licentie_klopt_niet">Licentie klopt niet</option>
                  <option value="startverbod_klopt_niet">Startverbod klopt niet</option>
                  <option value="sportschool_klopt_niet">Sportschool klopt niet</option>
                  <option value="anders">Anders</option>
                </select>
              </label>

              <label style={s.label}>
                Toelichting
                <textarea
                  value={meldingText}
                  onChange={(e) => setMeldingText(e.target.value)}
                  rows={3}
                  placeholder="Wat moet admin controleren of aanpassen?"
                  style={{ ...s.input, resize: "vertical", minHeight: 86 }}
                />
              </label>

              <button
                type="button"
                onClick={submitMelding}
                disabled={meldingSaving || !meldingText.trim()}
                style={{
                  ...s.orangeButton,
                  opacity: meldingSaving || !meldingText.trim() ? 0.55 : 1,
                }}
              >
                {meldingSaving ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                Verstuur
              </button>
            </div>

            {meldingMsg && <div style={s.feedback}>{meldingMsg}</div>}
          </section>
        )}

        {(keurmerkExpired || keurmerkSoon) && (
          <div
            style={{
              ...s.notice,
              ...(keurmerkExpired ? s.noticeDanger : s.noticeWarn),
            }}
          >
            <AlertTriangle size={18} />
            <span>
              {keurmerkExpired
                ? "Het keurmerk van de sportschool is verlopen. Vraag verlenging aan."
                : "Het keurmerk van de sportschool verloopt binnen 2 maanden. Vraag tijdig verlenging aan."}
            </span>
          </div>
        )}

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Profiel</h2>
          <Grid
            rows={[
              ["Naam", fighterName(fighter)],
              ["VA-nummer", fighter.va_nummer],
              ["Geboortedatum", fmtDate(fighter.geboortedatum ?? fighter.fp_geboortedatum)],
              ["Leeftijd", `${calcAge(fighter.geboortedatum ?? fighter.fp_geboortedatum)} jaar`],
              ["Geslacht", fighter.geslacht],
              ["E-mail", fighter.email ?? raw?.details?.email],
              ["Discipline", discipline],
              ["Klasse", klasse],
            ]}
          />
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Nulmeting & wedstrijdoverzicht</h2>
          <Grid
            rows={[
              ["Nulmeting discipline", fighter.nulmeting_discipline ?? raw?.nulmeting?.discipline],
              ["Nulmeting klasse", fighter.nulmeting_klasse ?? raw?.nulmeting?.klasse],
              ["Nulmeting gewicht", fighter.nulmeting_gewicht ?? raw?.nulmeting?.gewicht],
              ["Nulmeting wedstrijden", fighter.nulmeting_totaal ?? raw?.nulmeting?.totaal ?? 0],
              ["Record W-V-O", `${record.w}-${record.l}-${record.d}`],
              ["Totaal wedstrijden", record.total],
              ["KO's", fighter.kos ?? raw?.nulmeting?.kos ?? 0],
              ["Opmerking", fighter.nulmeting_opmerking ?? raw?.nulmeting?.opmerking, "full"],
            ]}
          />
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Sportschool</h2>
          <Grid
            rows={[
              ["Naam", sportschool?.naam],
              ["Plaats", sportschool?.plaats],
              ["Land", sportschool?.land],
              ["Sportschool ID", sportschool?.sportschool_id],
              ["Keurmerk start", fmtDate(sportschool?.keurmerk_start)],
              ["Keurmerk einde", fmtDate(sportschool?.keurmerk_einde)],
            ]}
          />
        </section>

        <section style={s.section}>
          <div style={s.sectionHeaderRow}>
            <div>
              <h2 style={{ ...s.sectionTitle, marginBottom: 3 }}>Wedstrijdhistorie</h2>
              <div style={s.sectionSub}>Alle beschikbare wedstrijden voor VA {safe(fighter.va_nummer)}.</div>
            </div>
            <div style={s.countPill}>{uitslagen.length}</div>
          </div>
          <Table
            headers={["Datum", "Evenement", "Discipline", "Klasse", "Tegenstander", "Sportschool", "Uitslag"]}
            rows={uitslagen.map((r) => [
              fmtDate(r.datum),
              r.evenement,
              r.discipline,
              r.klasse,
              r.tegenstander,
              r.sportschool,
              resultLabel(r.uitslag),
            ])}
          />
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Dopingeducatie</h2>
          <Grid
            rows={[
              ["Status", doping?.status || "Niet gestart"],
              ["Uitgenodigd", fmt(doping?.invited_at)],
              ["Certificaat", doping?.certificate_status || "Niet ontvangen"],
              ["FightPassport verwerkt", doping?.fightpassport_processed ? "Ja" : "Nee"],
            ]}
          />
        </section>
      </div>
    </main>
  );
}

function HeroStatus({ title, value, tone = "neutral" }: any) {
  const color =
    tone === "danger"
      ? "#ff6b57"
      : tone === "ok"
        ? "#a8e0b5"
        : tone === "info"
          ? "#ffd0ad"
          : "#f1f3f5";

  return (
    <div style={s.heroStatusCard}>
      <div style={{ minWidth: 0 }}>
        <div style={s.heroStatusTitle}>{title}</div>
        <div style={{ ...s.heroStatusValue, color }}>{value || "-"}</div>
      </div>
    </div>
  );
}

function MobileStatus({ icon, title, value }: any) {
  return (
    <div className="fighter-mobile-status">
      <div className="fighter-mobile-status-icon">{icon}</div>
      <div>
        <span className="fighter-mobile-label">{title}</span>
        <span className="fighter-mobile-value">{value || "-"}</span>
      </div>
    </div>
  );
}

function Grid({ rows }: any) {
  return (
    <div style={s.grid} className="fighter-grid">
      {rows.map((r: any, i: number) => (
        <div
          key={i}
          className="fighter-white-field"
          style={{
            ...s.field,
            ...(r[2] === "wide" ? s.fieldWide : {}),
            ...(r[2] === "full" ? s.fieldFull : {}),
          }}
        >
          <span className="fighter-field-label" style={s.muted}>{r[0]}</span>
          <b style={{ wordBreak: "break-word", lineHeight: 1.35 }}>{r[1] ?? "-"}</b>
        </div>
      ))}
    </div>
  );
}

function Table({ headers, rows }: any) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #c8cdd1" }}>
      <table style={s.table} className="fighter-data-table">
        <thead>
          <tr>
            {headers.map((h: any) => <th key={h} style={s.th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr key={i}>
              {r.map((v: any, j: number) => <td key={j} style={s.td}>{v ?? "-"}</td>)}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td style={s.td} colSpan={headers.length}>Geen gegevens.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const s: any = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#24282c 0%,#30353a 45%,#1d2023 100%)",
    color: "#f3f4f5",
    padding: 18,
  },
  wrap: { maxWidth: 1560, margin: "0 auto" },
  hero: {
    position: "relative",
    overflow: "hidden",
    aspectRatio: "16 / 10",
    minHeight: 650,
    maxHeight: 940,
    marginBottom: 18,
    border: "1px solid #9da3a8",
    background: "#111",
    boxShadow: "0 18px 42px rgba(20,24,28,.24),0 2px 8px rgba(0,0,0,.18)",
  },
  heroImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
  },
  heroShade: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "linear-gradient(180deg,rgba(0,0,0,.08),transparent 28%,transparent 72%,rgba(0,0,0,.18))",
  },
  heroToolbar: {
    position: "absolute",
    zIndex: 4,
    top: 18,
    right: 20,
    display: "flex",
    gap: 9,
  },
  glassButton: {
    display: "inline-flex",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    padding: "0 13px",
    color: "#fff",
    background: "rgba(10,12,14,.72)",
    border: "1px solid rgba(255,255,255,.42)",
    backdropFilter: "blur(8px)",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 5px 16px rgba(0,0,0,.3)",
  },
  fighterNameBlock: {
    position: "absolute",
    zIndex: 3,
    left: "4.2%",
    top: "31%",
    width: "41%",
    textShadow: "0 4px 14px #000",
  },
  fighterName: {
    color: "#fff",
    fontSize: "clamp(30px,3.25vw,58px)",
    lineHeight: 0.98,
    fontWeight: 950,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  fighterGym: {
    marginTop: 10,
    color: "#ff641f",
    fontSize: "clamp(13px,1.15vw,20px)",
    fontWeight: 900,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroIdentityValues: {
    position: "absolute",
    zIndex: 3,
    left: "6.8%",
    bottom: "27.2%",
    width: "45.5%",
    display: "grid",
    gridTemplateColumns: "1.08fr 1.28fr .9fr .95fr",
    gap: 10,
    color: "#fff",
    fontSize: "clamp(11px,.92vw,16px)",
    fontWeight: 900,
    textTransform: "uppercase",
    textShadow: "0 2px 7px #000",
  },
  heroStatusGrid: {
    position: "absolute",
    zIndex: 3,
    left: "3.35%",
    right: "5.2%",
    bottom: "9.6%",
    height: "13.8%",
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: "1.35%",
  },
  heroStatusCard: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    padding: "10px 12px 10px 76px",
    background: "transparent",
    border: "none",
    boxShadow: "none",
  },
  heroStatusTitle: {
    color: "#fff",
    fontSize: "clamp(9px,.75vw,12px)",
    fontWeight: 950,
    letterSpacing: 1.1,
    textShadow: "0 2px 5px #000",
  },
  heroStatusValue: {
    marginTop: 4,
    fontSize: "clamp(10px,.82vw,13px)",
    lineHeight: 1.25,
    fontWeight: 850,
    overflow: "hidden",
    textOverflow: "ellipsis",
    textShadow: "0 2px 5px #000",
  },
  section: {
    border: "1px solid #555c62",
    borderLeft: "4px solid #ff4d00",
    background: "linear-gradient(135deg,#34393e 0%,#292e33 100%)",
    padding: 16,
    marginBottom: 14,
    boxShadow: "0 8px 22px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.04)",
  },
  sectionTitle: {
    margin: "0 0 14px",
    color: "#ff7440",
    fontSize: 20,
    fontWeight: 900,
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  sectionSub: { color: "#c3c8cc", fontSize: 12 },
  countPill: {
    minWidth: 36,
    height: 28,
    padding: "0 10px",
    display: "grid",
    placeItems: "center",
    border: "1px solid #ff4d00",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 9,
  },
  field: {
    display: "grid",
    gap: 4,
    padding: "9px 10px",
    background: "#f1f2f3",
    border: "1px solid #c8cdd1",
    minHeight: 54,
    color: "#111",
  },
  fieldWide: { gridColumn: "span 2", minHeight: 72 },
  fieldFull: { gridColumn: "1 / -1", minHeight: 72 },
  muted: {
    fontSize: 10,
    color: "#60676d",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "9px 10px",
    borderBottom: "2px solid #ff4d00",
    background: "#111",
    color: "#fff",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "9px 10px",
    borderBottom: "1px solid #d3d6d9",
    verticalAlign: "top",
    background: "#fff",
    color: "#111",
  },
  actionDrawer: {
    border: "1px solid #727980",
    borderLeft: "4px solid #ff4d00",
    background: "linear-gradient(135deg,#2f3439,#212529)",
    padding: 16,
    marginBottom: 14,
    boxShadow: "0 10px 26px rgba(0,0,0,.35)",
  },
  actionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 16,
    marginBottom: 14,
  },
  actionEyebrow: {
    color: "#ff6a2a",
    fontSize: 10,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  actionTitle: { margin: "4px 0 3px", fontSize: 19, color: "#fff" },
  actionText: { margin: 0, maxWidth: 760, color: "#c5cbd0", fontSize: 13 },
  vaPill: {
    border: "1px solid #ff4d00",
    background: "#111",
    color: "#fff",
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 900,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px,.8fr) minmax(320px,2fr) auto",
    gap: 10,
    alignItems: "end",
  },
  label: {
    display: "grid",
    gap: 6,
    color: "#e8eaec",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  input: {
    width: "100%",
    border: "1px solid #646b71",
    background: "#111",
    color: "#fff",
    padding: "10px 11px",
    outline: "none",
    fontSize: 13,
    fontWeight: 700,
  },
  orangeButton: {
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid #ff4d00",
    background: "linear-gradient(180deg,#ff7a2f,#ff4d00 52%,#9a2d00)",
    color: "#111",
    padding: "0 16px",
    fontWeight: 950,
    cursor: "pointer",
  },
  feedback: {
    marginTop: 12,
    padding: "10px 12px",
    border: "1px solid #d28a59",
    background: "#fff2e9",
    color: "#7a3513",
    fontWeight: 750,
  },
  notice: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 14,
    padding: "11px 13px",
    border: "1px solid",
    fontWeight: 800,
    fontSize: 13,
  },
  noticeWarn: {
    borderColor: "#ff7a3d",
    background: "#2a1c14",
    color: "#ffd2bd",
  },
  noticeDanger: {
    borderColor: "#ef4444",
    background: "#2a1111",
    color: "#fecaca",
  },
  silver: {
    display: "inline-flex",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    padding: "0 13px",
    background: "linear-gradient(#fff,#d4d7da)",
    color: "#111",
    border: "1px solid #a7adb2",
    fontWeight: 900,
    cursor: "pointer",
  },
  loadingBox: {
    margin: "80px auto",
    width: "min(420px,90vw)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    border: "1px solid #6b737a",
    background: "#2c3136",
    color: "#fff",
  },
  errorBox: {
    marginTop: 16,
    padding: 14,
    border: "1px solid #ef4444",
    background: "#2a1111",
    color: "#fecaca",
  },
};
