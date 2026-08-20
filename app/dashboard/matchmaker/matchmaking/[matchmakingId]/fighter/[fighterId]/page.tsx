"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, Pencil, RefreshCw, Save, ShieldCheck, Trophy, Users, X, XCircle } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

export default function FighterDossierPage() {
  const params = useParams<{ matchmakingId?: string; fighterId?: string }>();
  const fighterId = String(params?.fighterId ?? "").trim();
  const matchmakingId = String(params?.matchmakingId ?? "").trim();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [aanmelding, setAanmelding] = useState<any>(null);
  const [fighterRuleMeldingen, setFighterRuleMeldingen] = useState<any[]>([]);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fpUpdateStatus, setFpUpdateStatus] = useState<"idle" | "queued" | "processing" | "done" | "error">("idle");
  const [notice, setNotice] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    naam: "",
    sportschool: "",
    discipline: "",
    klasse: "",
    geslacht: "",
    gewicht: "",
    va_nummer: "",
    email: "",
    telefoon: "",
  });

  async function load() {
    if (!fighterId) {
      setError("Vechter ontbreekt.");
      return;
    }

    setError("");
    const resolvedVa = fighterId.replace(/\D/g, "");
    if (!resolvedVa) {
      setError("Geen geldig VA-nummer gevonden.");
      return;
    }

    if (!matchmakingId) {
      setError("Matchmaking ontbreekt.");
      return;
    }

    const response = await authedFetch(
      `/api/matchmaker/matchmaking/${encodeURIComponent(matchmakingId)}/fighter/${encodeURIComponent(resolvedVa)}`,
      { cache: "no-store" },
    );
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error || "Dossier laden mislukt");
      return;
    }
    setData(json);
    setEventDate(json?.eventDate ?? null);
    const currentAanmelding = json?.aanmelding ?? null;
    setAanmelding(currentAanmelding);
    setEditForm({
      naam: String(currentAanmelding?.naam ?? ""),
      sportschool: String(currentAanmelding?.gym ?? ""),
      discipline: String(currentAanmelding?.discipline ?? ""),
      klasse: String(currentAanmelding?.klasse ?? ""),
      geslacht: String(currentAanmelding?.geslacht ?? ""),
      gewicht: String(currentAanmelding?.gewicht ?? ""),
      va_nummer: String(currentAanmelding?.va_nummer ?? ""),
      email: String(currentAanmelding?.email ?? ""),
      telefoon: String(currentAanmelding?.telefoon ?? ""),
    });

    setFighterRuleMeldingen(
        (json?.fighterRuleMeldingen ?? []).map((row: any) => ({
          ...row,
          soort: row?.rule ?? row?.rule_code ?? "Matchmakerregel",
          type: "matchmaker_fighter",
          melding: row?.boodschap,
          status: row?.resultaat ?? "-",
          evenement: row?.event_id ?? null,
          bron_melding: "fighter_rules",
        })),
      );
  }


  async function loadFightPassportUpdateStatus() {
    const va = String(fighterId || "")
      .replace(/\D/g, "");

    if (!va) return;

    try {
      const response = await authedFetch(
        `/api/admin/fightpassport-beheer/fighters/${encodeURIComponent(va)}/rescrape`,
        { cache: "no-store" },
      );

      const json = await response.json().catch(() => ({}));
      if (!response.ok) return;

      const status = String(json?.item?.status ?? "").toLowerCase();

      if (status === "pending") setFpUpdateStatus("queued");
      else if (status === "processing") setFpUpdateStatus("processing");
      else if (status === "done") setFpUpdateStatus("done");
      else if (status === "error") setFpUpdateStatus("error");
      else setFpUpdateStatus("idle");
    } catch {
      // Statuscontrole mag het dossier zelf nooit blokkeren.
    }
  }

  useEffect(() => {
    void load();
    void loadFightPassportUpdateStatus();
  }, [fighterId, matchmakingId]);

  async function updateFromFightPassport() {
    const va = String(fighterId || aanmelding?.va_nummer || data?.fighter?.va_nummer || "")
      .replace(/\D/g, "");

    if (!va) {
      setNotice("Geen geldig VA-nummer gevonden voor FightPassport update.");
      return;
    }

    setBusy(true);
    setFpUpdateStatus("queued");
    setNotice("");

    try {
      const response = await authedFetch(
        `/api/admin/fightpassport-beheer/fighters/${encodeURIComponent(va)}/rescrape`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchmaking_id: matchmakingId || null,
            aanmelding_id: aanmelding?.id || null,
          }),
        },
      );

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || "FightPassport update aanvragen mislukt.");
      }

      setFpUpdateStatus("queued");
      setNotice(
        json.already_queued
          ? `VA ${va} stond al in de FightPassport updatewachtrij.`
          : `VA ${va} is toegevoegd aan de FightPassport updatewachtrij.`,
      );

      // Volg het verzoek. De aparte refresh-worker zet de regel pas op done
      // nadat de scrape én Terminator voor deze VA klaar zijn.
      for (let attempt = 0; attempt < 240; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));

        const statusResponse = await authedFetch(
          `/api/admin/fightpassport-beheer/fighters/${encodeURIComponent(va)}/rescrape`,
          { cache: "no-store" },
        );

        const statusJson = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok) {
          throw new Error(statusJson.error || "Update-status laden mislukt.");
        }

        const status = String(statusJson?.item?.status ?? "").toLowerCase();

        if (status === "processing") {
          setFpUpdateStatus("processing");
          setNotice(`VA ${va} wordt nu opnieuw uit FightPassport opgehaald…`);
        }

        if (status === "done") {
          setFpUpdateStatus("done");
          await load();
          router.refresh();
          setNotice(
            `FightPassport is bijgewerkt voor VA ${va}. De vechtercontext en eventuele match zijn opnieuw opgebouwd.`,
          );
          return;
        }

        if (status === "error") {
          throw new Error(
            statusJson?.item?.error_message ||
              `FightPassport update voor VA ${va} is mislukt.`,
          );
        }
      }

      setNotice(
        `De FightPassport update voor VA ${va} staat nog in de wachtrij. De pagina kan later opnieuw worden geopend.`,
      );
    } catch (e: any) {
      setFpUpdateStatus("error");
      setNotice(e?.message || "FightPassport update mislukt.");
    } finally {
      setBusy(false);
    }
  }


  async function saveCorrection() {
    if (!aanmelding?.id || !matchmakingId) return;

    setBusy(true);
    setNotice("");
    try {
      const response = await authedFetch("/api/matchmaker/aanmeldingen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          aanmelding_id: aanmelding.id,
          naam: editForm.naam,
          sportschool: editForm.sportschool,
          gym: editForm.sportschool,
          discipline: editForm.discipline,
          klasse: editForm.klasse,
          geslacht: editForm.geslacht,
          gewicht: editForm.gewicht,
          va_nummer: editForm.va_nummer,
          email: editForm.email,
          telefoon: editForm.telefoon,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Correctie opslaan mislukt.");
      setEditOpen(false);
      await load();
      router.refresh();
      setNotice("De opgave is gecorrigeerd en alleen deze vechter is opnieuw opgebouwd en geladen.");
    } catch (e: any) {
      setNotice(e?.message || "Correctie opslaan mislukt.");
    } finally {
      setBusy(false);
    }
  }


  async function reviewRule(row: any, action: "approve" | "reject" | "dismiss") {
    const id = String(row?.id ?? "").trim();
    if (!id) {
      setNotice("Deze melding heeft geen geldig ID.");
      return;
    }

    setReviewBusyId(id);
    setNotice("");
    try {
      const response = await authedFetch("/api/matchmaker/fighter-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          matchmaking_id: matchmakingId,
          action,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Melding beoordelen mislukt.");

      await load();
      setNotice(
        action === "approve"
          ? "Melding goedgekeurd."
          : action === "reject"
            ? "Melding afgewezen."
            : "Melding gesloten.",
      );
    } catch (e: any) {
      setNotice(e?.message || "Melding beoordelen mislukt.");
    } finally {
      setReviewBusyId(null);
    }
  }

  if (error) {
    return (
      <main style={s.page} className="fighter-dossier-page">
        <button style={s.silver} onClick={() => router.back()}>Terug</button>
        <p>{error}</p>
      </main>
    );
  }
  if (!data) return <main style={s.page}>Dossier laden...</main>;

  const f = data.fighter;
  const resultRows = Array.isArray(data.results) ? data.results : [];
  const meldingen = [
    ...fighterRuleMeldingen,
    ...(Array.isArray(data.meldingen) ? data.meldingen : []),
    ...(Array.isArray(data.overtredingen) ? data.overtredingen : []),
    ...(Array.isArray(data.incidents) ? data.incidents : []),
    ...(Array.isArray(data.warnings) ? data.warnings : []),
  ].filter((row: any, index: number, list: any[]) => {
    const key = String(
      row?.id ?? `${row?.datum ?? ""}|${row?.type ?? row?.soort ?? ""}|${row?.melding ?? row?.reden ?? row?.omschrijving ?? ""}`,
    );
    return list.findIndex((candidate: any) => String(
      candidate?.id ?? `${candidate?.datum ?? ""}|${candidate?.type ?? candidate?.soort ?? ""}|${candidate?.melding ?? candidate?.reden ?? candidate?.omschrijving ?? ""}`,
    ) === key) === index;
  });

  const bron = String(aanmelding?.bron ?? aanmelding?.source_type ?? aanmelding?.source ?? "").toLowerCase();
  const isExcel = bron.includes("excel") || bron.includes("upload") || !!aanmelding?.upload_id || !!aanmelding?.upload_batch_id;
  const record = calculateHighestClassRecord(resultRows, f);
  const extraResults = calculateExtraResultCounts(resultRows);
  const controleInfoMeldingen = Array.isArray(data?.controleInfoMeldingen) ? data.controleInfoMeldingen : [];
  const talentstatus = controleInfoMeldingen.some((row: any) => {
    const txt = `${row?.rule_code ?? ""} ${row?.rule ?? ""} ${row?.boodschap ?? ""}`.toLowerCase();
    return String(row?.resultaat ?? "").toUpperCase() === "INFO" &&
      (txt.includes("talentstatus") || txt.includes("talent status"));
  });
  const trainerInfoMeldingen = controleInfoMeldingen.filter((row: any) => {
    const txt = `${row?.rule_code ?? ""} ${row?.rule ?? ""} ${row?.boodschap ?? ""}`.toLowerCase();
    return txt.includes("dopingcertificaat") || txt.includes("doping certificaat") ||
      txt.includes("talentstatus") || txt.includes("talent status");
  });

  const dopingMeldingen = controleInfoMeldingen.filter((row: any) => {
    const txt = `${row?.rule_code ?? ""} ${row?.rule ?? ""} ${row?.boodschap ?? ""}`.toLowerCase();
    return txt.includes("dopingcertificaat") || txt.includes("doping certificaat");
  });
  const dopingOk = dopingMeldingen.some((row: any) => {
    const result = String(row?.resultaat ?? row?.status ?? "").toUpperCase();
    const txt = String(row?.boodschap ?? "").toLowerCase();
    return result === "OK" || result === "GOED" || result === "GELDIG" || txt.includes("geldig") || txt.includes("aanwezig");
  });
  const dopingValue = dopingMeldingen.length
    ? (dopingOk ? "Certificaat geldig" : String(dopingMeldingen[0]?.boodschap ?? "Certificaatstatus bekend"))
    : "Geen certificaatstatus";
  const lastUpdate = f.updated_at ?? f.last_scraped_at ?? aanmelding?.updated_at ?? aanmelding?.created_at;

  return (
    <main style={s.page}>
      <style>{`
        .fighter-mobile-summary { display: none; }

        .fighter-white-field {
          background: #f1f2f3 !important;
          color: #111111 !important;
          border-color: #c8cdd1 !important;
        }

        .fighter-white-field .fighter-field-label {
          color: #60676d !important;
        }

        .fighter-data-table thead th {
          background: #111111 !important;
          color: #ffffff !important;
          border-bottom: 2px solid #ff4d00 !important;
        }

        .fighter-data-table tbody td {
          background: #ffffff !important;
          color: #111111 !important;
          border-bottom: 1px solid #d3d6d9 !important;
        }

        .fighter-data-table tbody tr:nth-child(even) td {
          background: #f3f0ed !important;
        }

        .fighter-data-table tbody tr {
          transition: background-color .14s ease;
        }

        .fighter-data-table tbody tr:hover td {
          background: #ffe1d2 !important;
        }

        @media (min-width: 761px) and (max-width: 1100px) {
          .fighter-grid {
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
          }
          .fighter-compact-stats {
            grid-template-columns: repeat(3,minmax(0,1fr)) !important;
          }
          .fighter-info-grid {
            grid-template-columns: 1fr !important;
          }
          .fighter-dossier-hero {
            min-height: 560px !important;
          }
        }

        @media (max-width: 760px) {
          .fighter-dossier-page {
            padding: 0 !important;
            background: linear-gradient(180deg,#202428 0%,#2b3035 50%,#1b1e21 100%) !important;
          }

          .fighter-dossier-wrap {
            width: 100% !important;
            max-width: 100% !important;
          }

          .fighter-dossier-hero {
            min-height: 0 !important;
            max-height: none !important;
            aspect-ratio: auto !important;
            margin-bottom: 0 !important;
            border-left: 0 !important;
            border-right: 0 !important;
            box-shadow: 0 10px 28px rgba(0,0,0,.32) !important;
          }

          .fighter-dossier-hero-image {
            position: relative !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            object-fit: contain !important;
          }

          .fighter-desktop-overlay {
            display: none !important;
          }

          .fighter-dossier-toolbar {
            top: 8px !important;
            right: 8px !important;
            left: 8px !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }

          .fighter-dossier-toolbar button {
            height: 34px !important;
            padding: 0 10px !important;
            font-size: 12px !important;
            background: rgba(10,12,14,.84) !important;
          }

          .fighter-mobile-summary {
            display: block !important;
            margin: 0 10px 12px !important;
            padding: 14px !important;
            background: linear-gradient(145deg,#33383d,#262b2f) !important;
            border: 1px solid #555d64 !important;
            border-top: 3px solid #ff4d00 !important;
            box-shadow: 0 8px 24px rgba(0,0,0,.26) !important;
          }

          .fighter-mobile-name {
            margin: 0 !important;
            color: #fff !important;
            font-size: 26px !important;
            line-height: 1 !important;
            font-weight: 950 !important;
            text-transform: uppercase !important;
          }

          .fighter-mobile-gym {
            margin-top: 7px !important;
            color: #ff6a2a !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            letter-spacing: .8px !important;
            text-transform: uppercase !important;
          }

          .fighter-mobile-identity {
            display: grid !important;
            grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            gap: 8px !important;
            margin-top: 14px !important;
          }

          .fighter-mobile-identity > div,
          .fighter-mobile-status {
            min-width: 0 !important;
            padding: 10px !important;
            background: #3a4045 !important;
            border: 1px solid #596168 !important;
          }

          .fighter-mobile-label {
            display: block !important;
            color: #aeb6bd !important;
            font-size: 9px !important;
            font-weight: 850 !important;
            letter-spacing: .8px !important;
            text-transform: uppercase !important;
            margin-bottom: 4px !important;
          }

          .fighter-mobile-value {
            display: block !important;
            color: #fff !important;
            font-size: 13px !important;
            font-weight: 900 !important;
            word-break: break-word !important;
          }

          .fighter-mobile-status-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 8px !important;
            margin-top: 8px !important;
          }

          .fighter-mobile-status {
            display: grid !important;
            grid-template-columns: 32px minmax(0,1fr) !important;
            align-items: center !important;
            gap: 10px !important;
          }

          .fighter-mobile-status-icon {
            color: #ff5a16 !important;
            display: grid !important;
            place-items: center !important;
          }

          .fighter-dossier-page section {
            margin-left: 10px !important;
            margin-right: 10px !important;
            padding: 12px !important;
          }

          .fighter-dossier-page section > h2 {
            font-size: 18px !important;
            margin-bottom: 10px !important;
          }

          .fighter-grid,
          .fighter-compact-stats,
          .fighter-info-grid,
          .fighter-form-grid {
            grid-template-columns: 1fr !important;
          }

          .fighter-form-grid label {
            grid-column: auto !important;
          }

          .fighter-dossier-page table {
            min-width: 760px !important;
            font-size: 12px !important;
          }

          .fighter-dossier-page th,
          .fighter-dossier-page td {
            padding: 8px !important;
          }
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
            <button
              style={s.glassButton}
              onClick={() =>
                router.push(
                  `/dashboard/matchmaker/matchmaking/${matchmakingId}/aanmeldingen`,
                )
              }
            >
              <ArrowLeft size={16} /> Terug naar aanmeldingen
            </button>
            <button
              style={s.glassButton}
              onClick={() =>
                router.push(`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`)
              }
            >
              Matchmaking
            </button>
            <button
              style={s.glassButton}
              disabled={busy}
              onClick={updateFromFightPassport}
              title="Haal de nieuwste gegevens van deze vechter opnieuw op uit FightPassport"
            >
              <RefreshCw size={16} />{" "}
              {fpUpdateStatus === "queued"
                ? "In wachtrij…"
                : fpUpdateStatus === "processing"
                  ? "FightPassport bijwerken…"
                  : fpUpdateStatus === "done"
                    ? "FightPassport bijgewerkt"
                    : fpUpdateStatus === "error"
                      ? "Update opnieuw proberen"
                      : "Update FightPassport"}
            </button>
          </div>

          <div style={s.fighterNameBlock} className="fighter-desktop-overlay">
            <div style={s.fighterName}>{f.naam || "Onbekende vechter"}</div>
            <div style={s.fighterGym}>{aanmelding?.gym || (data.sportscholen || data.gyms || [])[0]?.naam || ""}</div>
          </div>

          <div style={s.heroIdentityValues} className="fighter-desktop-overlay">
            <div>{f.va_nummer || aanmelding?.va_nummer || "-"}</div>
            <div>{f.primary_discipline || f.nulmeting_discipline || aanmelding?.discipline || "-"}</div>
            <div>{f.mma_level || f.berekende_klasse || f.nulmeting_klasse || aanmelding?.klasse || "-"}</div>
            <div>{f.geslacht || aanmelding?.geslacht || "-"}</div>
          </div>

          <div style={s.heroStatusGrid} className="fighter-desktop-overlay">
            <HeroStatus
              title={f.heeft_startverbod ? "STARTVERBOD" : "FIT TO FIGHT"}
              value={f.heeft_startverbod ? "Actief startverbod" : "Geen actief startverbod"}
              tone={f.heeft_startverbod ? "danger" : "ok"}
            />
            <HeroStatus
              title="LICENTIE"
              value={f.licentie_actief ? "Geldig" : "Geen geldige licentie"}
              tone={f.licentie_actief ? "ok" : "danger"}
            />
            <HeroStatus
              title={talentstatus ? "TALENTSTATUS" : "DOPINGCERTIFICAAT"}
              value={talentstatus ? "Talentstatus van toepassing" : dopingValue}
              tone={talentstatus || dopingOk ? "ok" : "info"}
            />
            <HeroStatus
              title="LAATSTE UPDATE"
              value={fmt(lastUpdate)}
              tone="neutral"
            />
          </div>
        </header>

        <div className="fighter-mobile-summary">
          <h1 className="fighter-mobile-name">{f.naam || "Onbekende vechter"}</h1>
          <div className="fighter-mobile-gym">
            {aanmelding?.gym || (data.sportscholen || data.gyms || [])[0]?.naam || ""}
          </div>

          <div className="fighter-mobile-identity">
            <div>
              <span className="fighter-mobile-label">VA-nummer</span>
              <span className="fighter-mobile-value">{f.va_nummer || aanmelding?.va_nummer || "-"}</span>
            </div>
            <div>
              <span className="fighter-mobile-label">Discipline</span>
              <span className="fighter-mobile-value">{f.primary_discipline || f.nulmeting_discipline || aanmelding?.discipline || "-"}</span>
            </div>
            <div>
              <span className="fighter-mobile-label">Klasse</span>
              <span className="fighter-mobile-value">{f.mma_level || f.berekende_klasse || f.nulmeting_klasse || aanmelding?.klasse || "-"}</span>
            </div>
            <div>
              <span className="fighter-mobile-label">Geslacht</span>
              <span className="fighter-mobile-value">{f.geslacht || aanmelding?.geslacht || "-"}</span>
            </div>
          </div>

          <div className="fighter-mobile-status-grid">
            <div className="fighter-mobile-status">
              <div className="fighter-mobile-status-icon"><CalendarDays size={21} /></div>
              <div>
                <span className="fighter-mobile-label">{f.heeft_startverbod ? "Startverbod" : "Fit to fight"}</span>
                <span className="fighter-mobile-value" style={{ color: f.heeft_startverbod ? "#ff7663" : "#a8e0b5" }}>
                  {f.heeft_startverbod ? "Actief startverbod" : "Geen actief startverbod"}
                </span>
              </div>
            </div>

            <div className="fighter-mobile-status">
              <div className="fighter-mobile-status-icon"><ShieldCheck size={21} /></div>
              <div>
                <span className="fighter-mobile-label">Licentie</span>
                <span className="fighter-mobile-value" style={{ color: f.licentie_actief ? "#a8e0b5" : "#ff7663" }}>
                  {f.licentie_actief ? "Geldig" : "Geen geldige licentie"}
                </span>
              </div>
            </div>

            <div className="fighter-mobile-status">
              <div className="fighter-mobile-status-icon">{talentstatus ? <Trophy size={21} /> : <Users size={21} />}</div>
              <div>
                <span className="fighter-mobile-label">{talentstatus ? "Talentstatus" : "Dopingcertificaat"}</span>
                <span className="fighter-mobile-value">
                  {talentstatus ? "Talentstatus van toepassing" : dopingValue}
                </span>
              </div>
            </div>

            <div className="fighter-mobile-status">
              <div className="fighter-mobile-status-icon"><RefreshCw size={21} /></div>
              <div>
                <span className="fighter-mobile-label">Laatste update</span>
                <span className="fighter-mobile-value">{fmt(lastUpdate)}</span>
              </div>
            </div>
          </div>
        </div>

        {notice && <div style={s.feedback}>{notice}</div>}

        <Section title="Profiel & contact">
          <Grid rows={[["Naam", f.naam], ["E-mail", f.email], ["Geboortedatum", fmtDateOnly(f.geboortedatum)], ["Geslacht", f.geslacht]]} />
        </Section>

        <Section title="Nulmeting & klasse">
          <Grid rows={[
            ["Discipline", f.nulmeting_discipline], ["Nulmeting klasse", f.nulmeting_klasse],
            ["Berekende klasse", f.berekende_klasse], ["MMA niveau", f.mma_level],
          ]} />
          <div style={s.compactStatsGrid} className="fighter-compact-stats">
            <CompactField title="Leeftijd" value={calcAge(f.geboortedatum, eventDate)} />
            <CompactField title="Gewicht" value={f.nulmeting_gewicht} />
            <CompactField title="Totaal partijen" value={f.totaal_wedstrijden ?? resultRows.length} />
            <CompactField title="Winst op KO" value={f.kos ?? 0} />
            <CompactField title="Record" value={`${record.klasse ?? "-"} ${record.w}-${record.v}-${record.o} (${record.overige})`} wide />
          </div>
          {f.nulmeting_opmerking && (
            <div className="fighter-white-field" style={{ ...s.field, ...s.fieldFull, marginTop: 9 }}>
              <span className="fighter-field-label" style={s.muted}>Opmerking</span>
              <b style={{ wordBreak: "break-word", lineHeight: 1.35 }}>{f.nulmeting_opmerking}</b>
            </div>
          )}
        </Section>

        <Section title="Opgave voor deze matchmaking">
          <div style={s.notice}>
            <div><b>{isExcel ? "Excel-opgave" : "Aanmelding uit database"}</b></div>
            <div style={s.noticeText}>
              Een correctie wordt alleen in de aanmelding opgeslagen. De centrale FightPassport-vechter blijft ongewijzigd.
            </div>
            {aanmelding && (
              <button style={s.silver} disabled={busy} onClick={() => setEditOpen(true)}>
                <Pencil size={15} /> Opgave corrigeren
              </button>
            )}
          </div>
          <Grid rows={[
            ["Naam opgegeven", aanmelding?.naam],
            ["Sportschool opgegeven", aanmelding?.gym],
            ["Discipline opgegeven", aanmelding?.discipline],
            ["Klasse opgegeven", aanmelding?.klasse],
            ["Geslacht opgegeven", aanmelding?.geslacht],
            ["Gewicht opgegeven", aanmelding?.gewicht],
            ["VA-nummer", aanmelding?.va_nummer],
            ["Bron", isExcel ? "Excel-upload" : "Database"],
          ]} />
        </Section>

        <Section title={`Sportscholen (${(data.sportscholen || data.gyms || []).length})`}>
          <Table headers={["Sportschool", "Plaats", "Land", "Sportschool ID", "Laatste synchronisatie"]} rows={(data.sportscholen || data.gyms || []).map((row: any) => [row.naam || row.organisatie_naam, row.plaats, row.land, row.sportschool_id || row.organisatie_id || "-", fmt(row.last_team_sync_at || row.last_seen_at)])} />
        </Section>
        <Section title={`Wedstrijdhistorie (${data.results.length})`}>
          <Table headers={["Datum", "Evenement", "Discipline", "Klasse", "Tegenstander", "Sportschool", "Uitslag"]} rows={data.results.map((row: any) => [row.datum, row.evenement, row.discipline, row.klasse, row.tegenstander, row.sportschool, row.uitslag])} />
        </Section>
        {trainerInfoMeldingen.length > 0 && (
          <Section title="Controle-informatie">
            <div style={s.infoStatusGrid} className="fighter-info-grid">
              {trainerInfoMeldingen.map((row: any, index: number) => {
                const txt = `${row?.rule_code ?? ""} ${row?.rule ?? ""} ${row?.boodschap ?? ""}`.toLowerCase();
                const isTalent = txt.includes("talentstatus") || txt.includes("talent status");
                return (
                  <div key={row?.id ?? index} style={{ ...s.infoStatusCard, ...(isTalent ? s.talentInfoCard : {}) }}>
                    <div style={s.infoStatusIcon}>{isTalent ? <Trophy size={20} /> : "ℹ"}</div>
                    <div>
                      <b>{isTalent ? "Talentstatus verdiend" : "Dopingcertificaat"}</b>
                      <div style={s.infoStatusText}>{row?.boodschap ?? "-"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
        <Section title={`Meldingen (${meldingen.length})`}>
          <ReviewTable
            rows={meldingen}
            busyId={reviewBusyId}
            onReview={reviewRule}
          />
        </Section>
        {Array.isArray(data.startbans) && data.startbans.length > 0 && (
          <Section title={`Startverboden (${data.startbans.length})`}>
            <Table headers={["Soort", "Ingang", "Einde", "Actief", "Reden", "Evenement"]} rows={data.startbans.map((row: any) => [row.soort, row.ingang, row.einde, row.actief ? "Ja" : "Nee", row.reden, row.evenement])} />
          </Section>
        )}
      </div>

      {editOpen && (
        <div style={s.modalBackdrop} onMouseDown={() => !busy && setEditOpen(false)}>
          <div style={s.modal} onMouseDown={(event) => event.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.eyebrow}>AANMELDING</div>
                <h2 style={s.modalTitle}>Opgave corrigeren</h2>
              </div>
              <button style={s.iconButton} disabled={busy} onClick={() => setEditOpen(false)}><X size={18} /></button>
            </div>
            <div style={s.formGrid} className="fighter-form-grid">
              <label style={s.label}>Naam
                <input style={s.input} value={editForm.naam} onChange={(event) => setEditForm((current) => ({ ...current, naam: event.target.value }))} />
              </label>
              <label style={s.label}>VA-nummer
                <input style={s.input} inputMode="numeric" value={editForm.va_nummer} onChange={(event) => setEditForm((current) => ({ ...current, va_nummer: event.target.value }))} />
              </label>
              <label style={s.label}>Sportschool
                <input style={s.input} value={editForm.sportschool} onChange={(event) => setEditForm((current) => ({ ...current, sportschool: event.target.value }))} />
              </label>
              <label style={s.label}>Gewicht
                <input style={s.input} inputMode="decimal" value={editForm.gewicht} onChange={(event) => setEditForm((current) => ({ ...current, gewicht: event.target.value }))} />
              </label>
              <label style={s.label}>Discipline
                <input style={s.input} value={editForm.discipline} onChange={(event) => setEditForm((current) => ({ ...current, discipline: event.target.value }))} />
              </label>
              <label style={s.label}>Klasse
                <input style={s.input} value={editForm.klasse} onChange={(event) => setEditForm((current) => ({ ...current, klasse: event.target.value }))} />
              </label>
              <label style={s.label}>Geslacht
                <input style={s.input} value={editForm.geslacht} onChange={(event) => setEditForm((current) => ({ ...current, geslacht: event.target.value }))} />
              </label>
              <label style={s.label}>E-mail
                <input style={s.input} value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>Telefoon
                <input style={s.input} value={editForm.telefoon} onChange={(event) => setEditForm((current) => ({ ...current, telefoon: event.target.value }))} />
              </label>
            </div>
            <div style={s.modalActions}>
              <button style={s.darkButton} disabled={busy} onClick={() => setEditOpen(false)}>Annuleren</button>
              <button style={s.silver} disabled={busy} onClick={saveCorrection}><Save size={16} /> {busy ? "Opslaan..." : "Opslaan"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function HeroStatus({ title, value, tone = "neutral" }: any) {
  const valueColor =
    tone === "danger" ? "#ff6b57" :
    tone === "ok" ? "#a8e0b5" :
    tone === "info" ? "#ffd0ad" :
    "#f1f3f5";

  return (
    <div style={s.heroStatusCard}>
      <div style={{ minWidth: 0 }}>
        <div style={s.heroStatusTitle}>{title}</div>
        <div style={{ ...s.heroStatusValue, color: valueColor }}>{value || "-"}</div>
      </div>
    </div>
  );
}

function Card({ title, value, danger }: any) { return <div style={s.card}><div style={s.cardTitle}>{title}</div><div style={{ fontSize: 18, fontWeight: 900, color: danger ? "#ff654d" : "#eee" }}>{value}</div></div>; }
function Section({ title, children }: any) { return <section style={s.section}><h2 style={{ margin: "0 0 14px", color: "#ff7440" }}>{title}</h2>{children}</section>; }
function Grid({ rows }: any) { return <div style={s.grid} className="fighter-grid">{rows.map((row: any, index: number) => <div key={index} className="fighter-white-field" style={{ ...s.field, ...(row[2] === "wide" ? s.fieldWide : {}), ...(row[2] === "full" ? s.fieldFull : {}) }}><span className="fighter-field-label" style={s.muted}>{row[0]}</span><b style={{ wordBreak: "break-word", lineHeight: 1.35 }}>{row[1] ?? "-"}</b></div>)}</div>; }
function CompactField({ title, value, wide = false }: any) { return <div className="fighter-white-field" style={{ ...s.field, ...(wide ? s.compactRecordField : {}) }}><span className="fighter-field-label" style={s.muted}>{title}</span><b style={{ wordBreak: "break-word", lineHeight: 1.35 }}>{value ?? "-"}</b></div>; }
function Table({ headers, rows }: any) { return <div style={{ overflowX: "auto", border: "1px solid #c8cdd1" }}><table style={s.table} className="fighter-data-table"><thead><tr>{headers.map((header: any) => <th key={header} style={s.th}>{header}</th>)}</tr></thead><tbody>{rows.map((row: any, index: number) => <tr key={index}>{row.map((value: any, cellIndex: number) => <td key={cellIndex} style={s.td}>{value ?? "-"}</td>)}</tr>)}{!rows.length && <tr><td style={s.td} colSpan={headers.length}>Geen gegevens.</td></tr>}</tbody></table></div>; }

function ReviewTable({ rows, busyId, onReview }: any) {
  const headers = ["Datum", "Soort", "Melding", "Status", "Evenement", "Beoordeling"];
  return (
    <div style={{ overflowX: "auto", border: "1px solid #c8cdd1" }}>
      <table style={s.table} className="fighter-data-table">
        <thead><tr>{headers.map((header) => <th key={header} style={s.th}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row: any, index: number) => {
            const isRule = row?.bron_melding === "fighter_rules" && !!row?.id;
            const reviewed = !!row?.review_status;
            const status = row?.review_status
              ? `${row.review_status} (${row.resultaat ?? row.status ?? "-"})`
              : row?.resultaat ?? row?.status ?? (row?.actief === true ? "Actief" : row?.actief === false ? "Afgesloten" : "-");
            const id = String(row?.id ?? index);
            return (
              <tr key={id}>
                <td style={s.td}>{fmt(row?.datum ?? row?.created_at ?? row?.meldingsdatum)}</td>
                <td style={s.td}>{row?.soort ?? row?.type ?? row?.categorie ?? "Melding"}</td>
                <td style={s.td}>{row?.melding ?? row?.omschrijving ?? row?.reden ?? row?.notitie ?? row?.description ?? "-"}</td>
                <td style={s.td}>{status}</td>
                <td style={s.td}>{row?.evenement ?? row?.event_naam ?? row?.event ?? "-"}</td>
                <td style={{ ...s.td, minWidth: 260 }}>
                  {isRule && !reviewed ? (
                    <div style={s.reviewActions}>
                      <button style={s.approveButton} disabled={busyId === id} onClick={() => onReview(row, "approve")}><Check size={14} /> Goedkeuren</button>
                      <button style={s.rejectButton} disabled={busyId === id} onClick={() => onReview(row, "reject")}><XCircle size={14} /> Afwijzen</button>
                      <button style={s.closeButton} disabled={busyId === id} onClick={() => onReview(row, "dismiss")}><X size={14} /> Wegklikken</button>
                    </div>
                  ) : reviewed ? (
                    <span>{row.reviewed_at ? `Beoordeeld ${fmt(row.reviewed_at)}` : "Beoordeeld"}</span>
                  ) : "-"}
                </td>
              </tr>
            );
          })}
          {!rows.length && <tr><td style={s.td} colSpan={headers.length}>Geen gegevens.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function normalizeAdultClass(value: any): "R" | "N" | "C" | "B" | "A" | null {
  const raw = String(value ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw || raw.includes("MMA")) return null;
  if (raw.includes("VETERAAN") || raw.includes("VETERAN") || raw.includes("NIEUWELING") || raw.includes("NEWCOMER")) return "N";
  if (raw.includes("JEUGD") || raw.includes("YOUTH") || raw === "J" || raw === "J+") return null;
  const match = raw.match(/\b(R|N|C|B|A)\b/);
  return match ? match[1] as "R" | "N" | "C" | "B" | "A" : null;
}

function isRelevantStandingDiscipline(value: any): boolean {
  const discipline = String(value ?? "").toLowerCase();
  return discipline.includes("kick") || discipline.includes("k1") || discipline.includes("muay") || discipline.includes("thai");
}

function isYouthClass(value: any): boolean {
  const klasse = String(value ?? "").toUpperCase();
  return klasse.includes("JEUGD") || klasse.includes("YOUTH") || klasse.trim() === "J" || klasse.trim() === "J+";
}

function resultType(value: any): "WIN" | "LOSS" | "DRAW" | "DEMO" | "NO_CONTEST" | "OTHER" {
  const result = String(value ?? "").trim().toLowerCase();
  if (result.includes("no contest") || result.includes("nocontest") || result.includes("no-contest")) return "NO_CONTEST";
  if (result.includes("demo") || result.includes("demonstr")) return "DEMO";
  if (/onbeslist|gelijk|draw/.test(result)) return "DRAW";
  if (/verliest|verlies|verloren|lost|loss/.test(result)) return "LOSS";
  if (/wint|winst|gewonnen|win/.test(result)) return "WIN";
  return "OTHER";
}

function classRank(value: "R" | "N" | "C" | "B" | "A" | null) {
  return value ? ({ R: 1, N: 2, C: 3, B: 4, A: 5 } as const)[value] : 0;
}

function calculateHighestClassRecord(rows: any[], fighter?: any) {
  const nulW = Number(fighter?.nulmeting_gewonnen ?? 0) || 0;
  const nulL = Number(fighter?.nulmeting_verloren ?? 0) || 0;
  const nulD = Number(fighter?.nulmeting_onbeslist ?? 0) || 0;
  const nulTotal = Number(fighter?.nulmeting_totaal ?? 0) || 0;

  // Alleen het deel van de nulmeting dat niet als W/L/D is uitgesplitst,
  // gaat naar "overige". KO telt nooit als extra partij.
  const nulOther = Math.max(0, nulTotal - nulW - nulL - nulD);

  // Demo en No Contest uit de uitslagen horen ook onder "overige".
  const extraRows = (rows ?? []).reduce((count, row) => {
    const result = resultType(row?.uitslag);
    return count + (result === "DEMO" || result === "NO_CONTEST" ? 1 : 0);
  }, 0);

  const standingRows = (rows ?? []).filter((row) => {
    if (!isRelevantStandingDiscipline(row?.discipline)) return false;
    const result = resultType(row?.uitslag);
    return result === "WIN" || result === "LOSS" || result === "DRAW";
  });

  const youthRows = standingRows.filter((row) => isYouthClass(row?.klasse));
  const adultRows = standingRows.filter((row) => {
    if (isYouthClass(row?.klasse)) return false;
    return !!normalizeAdultClass(row?.klasse);
  });

  // Zolang er geen volwassen resultaat is, tonen we het volledige jeugdrecord als J.
  if (!adultRows.length && youthRows.length) {
    let w = 0;
    let v = 0;
    let o = 0;

    for (const row of youthRows) {
      const result = resultType(row?.uitslag);
      if (result === "WIN") w += 1;
      else if (result === "LOSS") v += 1;
      else if (result === "DRAW") o += 1;
    }

    return { klasse: "J", w: w + nulW, v: v + nulL, o: o + nulD, overige: nulOther + extraRows };
  }

  let highestClass: "R" | "N" | "C" | "B" | "A" | null = null;
  for (const row of adultRows) {
    const rowClass = normalizeAdultClass(row?.klasse);
    if (classRank(rowClass) > classRank(highestClass)) highestClass = rowClass;
  }

  let w = 0;
  let v = 0;
  let o = 0;
  let overige = youthRows.length;

  for (const row of adultRows) {
    const rowClass = normalizeAdultClass(row?.klasse);
    const result = resultType(row?.uitslag);

    if (rowClass !== highestClass) {
      overige += 1;
      continue;
    }

    if (result === "WIN") w += 1;
    else if (result === "LOSS") v += 1;
    else if (result === "DRAW") o += 1;
  }

  return { klasse: highestClass, w: w + nulW, v: v + nulL, o: o + nulD, overige: overige + nulOther + extraRows };
}

function calculateExtraResultCounts(rows: any[]) {
  return (rows ?? []).reduce((acc, row) => {
    const result = resultType(row?.uitslag);
    if (result === "DEMO") acc.demo += 1;
    if (result === "NO_CONTEST") acc.noContest += 1;
    return acc;
  }, { demo: 0, noContest: 0 });
}

function fmtDateOnly(value: any) {
  if (!value) return "-";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("nl-NL");
}

function fmt(value: any) { return value ? new Date(value).toLocaleString("nl-NL") : "-"; }
function calcAge(value: any, at: any) { const birth = new Date(value); const event = new Date(at); if (!value || !at || Number.isNaN(birth.getTime()) || Number.isNaN(event.getTime())) return "-"; let age = event.getFullYear() - birth.getFullYear(); const month = event.getMonth() - birth.getMonth(); if (month < 0 || (month === 0 && event.getDate() < birth.getDate())) age--; return age; }




const s: any = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#24282c 0%,#30353a 45%,#1d2023 100%)", color: "#f3f4f5", padding: 18 },
  wrap: { maxWidth: 1560, margin: "0 auto" },
  hero: { position: "relative", overflow: "hidden", aspectRatio: "16 / 10", minHeight: 650, maxHeight: 940, marginBottom: 18, border: "1px solid #9da3a8", background: "#111", boxShadow: "0 18px 42px rgba(20,24,28,.24),0 2px 8px rgba(0,0,0,.18)" },
  heroImage: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" },
  heroShade: { position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg,rgba(0,0,0,.08),transparent 28%,transparent 72%,rgba(0,0,0,.18))" },
  heroToolbar: { position: "absolute", zIndex: 4, top: 18, right: 20, display: "flex", gap: 9 },
  glassButton: { display: "inline-flex", gap: 7, alignItems: "center", justifyContent: "center", height: 38, padding: "0 13px", color: "#fff", background: "rgba(10,12,14,.72)", border: "1px solid rgba(255,255,255,.42)", backdropFilter: "blur(8px)", fontWeight: 900, cursor: "pointer", boxShadow: "0 5px 16px rgba(0,0,0,.3)" },
  fighterNameBlock: { position: "absolute", zIndex: 3, left: "4.2%", top: "31%", width: "41%", textShadow: "0 4px 14px #000" },
  fighterName: { color: "#fff", fontSize: "clamp(30px,3.25vw,58px)", lineHeight: .98, fontWeight: 950, letterSpacing: .3, textTransform: "uppercase" },
  fighterGym: { marginTop: 10, color: "#ff641f", fontSize: "clamp(13px,1.15vw,20px)", fontWeight: 900, letterSpacing: 1.4, textTransform: "uppercase" },
  heroIdentityValues: { position: "absolute", zIndex: 3, left: "6.8%", bottom: "27.2%", width: "45.5%", display: "grid", gridTemplateColumns: "1.08fr 1.28fr .9fr .95fr", gap: 10, color: "#fff", fontSize: "clamp(11px,.92vw,16px)", fontWeight: 900, textTransform: "uppercase", textShadow: "0 2px 7px #000" },
  heroStatusGrid: { position: "absolute", zIndex: 3, left: "3.35%", right: "5.2%", bottom: "9.6%", height: "13.8%", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "1.35%" },
  heroStatusCard: { minWidth: 0, display: "flex", alignItems: "center", padding: "10px 12px 10px 76px", background: "transparent", border: "none", boxShadow: "none" },
  heroStatusIcon: { width: 38, height: 38, flex: "0 0 38px", display: "grid", placeItems: "center", color: "#ff5a16", borderRight: "1px solid rgba(255,255,255,.2)", paddingRight: 10 },
  heroStatusTitle: { color: "#fff", fontSize: "clamp(9px,.75vw,12px)", fontWeight: 950, letterSpacing: 1.1, textShadow: "0 2px 5px #000" },
  heroStatusValue: { marginTop: 4, fontSize: "clamp(10px,.82vw,13px)", lineHeight: 1.25, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 2px 5px #000" },
  statusOk: { borderBottom: "3px solid #8fc8a0" },
  statusDanger: { borderBottom: "3px solid #ff5b46" },
  statusInfo: { borderBottom: "3px solid #ff9a54" },
  statusNeutral: { borderBottom: "3px solid #c8cdd1" },
  silver: { display: "inline-flex", gap: 7, alignItems: "center", justifyContent: "center", height: 38, padding: "0 13px", background: "linear-gradient(#fff,#d4d7da)", color: "#111", border: "1px solid #a7adb2", fontWeight: 900, cursor: "pointer", boxShadow: "inset 0 1px 0 #fff,0 4px 10px rgba(0,0,0,.15)" },
  darkButton: { height: 38, padding: "0 13px", background: "#252a2f", color: "#fff", border: "1px solid #555d65", fontWeight: 800, cursor: "pointer" },
  summary: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 16 },
  card: { border: "1px solid #c1c6ca", borderTop: "3px solid #ff4d00", background: "linear-gradient(180deg,#fff,#edf0f2)", padding: "13px 15px", boxShadow: "0 6px 16px rgba(20,24,28,.1)" },
  cardTitle: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#6f777e", marginBottom: 6 },
  section: { border: "1px solid #555c62", borderLeft: "4px solid #ff4d00", background: "linear-gradient(135deg,#34393e 0%,#292e33 100%)", padding: 16, marginBottom: 14, boxShadow: "0 8px 22px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.04)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 9 },
  compactStatsGrid: { display: "grid", gridTemplateColumns: "0.65fr 0.65fr 0.9fr 0.7fr 1.35fr", gap: 9, marginTop: 9 },
  compactRecordField: { minWidth: 0 },
  field: { display: "grid", gap: 4, padding: "9px 10px", background: "#f1f2f3", border: "1px solid #c8cdd1", minHeight: 54, color: "#111" },
  fieldWide: { gridColumn: "span 2", minHeight: 72 },
  fieldFull: { gridColumn: "1 / -1", minHeight: 72 },
  muted: { fontSize: 10, color: "#60676d", textTransform: "uppercase", letterSpacing: .5 },
  notice: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 12px", marginBottom: 12, border: "1px solid #c8cdd1", background: "#f1f2f3", color: "#111" },
  noticeText: { flex: "1 1 520px", color: "#4e555b", fontSize: 12, lineHeight: 1.45 },
  feedback: { marginBottom: 14, padding: "10px 12px", border: "1px solid #d28a59", background: "#fff2e9", color: "#7a3513", fontWeight: 750 },
  infoStatusGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 },
  infoStatusCard: { display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 12px", border: "1px solid #d7b77a", background: "#fff8e9", color: "#26221b" },
  talentInfoCard: { border: "1px solid #c8a14a", background: "linear-gradient(135deg,#fff8df,#f3ead0)" },
  infoStatusIcon: { width: 30, height: 30, display: "grid", placeItems: "center", flex: "0 0 30px", border: "1px solid #c8a14a", color: "#9a6811", fontWeight: 950 },
  infoStatusText: { marginTop: 4, color: "#5c5549", fontSize: 12, lineHeight: 1.4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "9px 10px", borderBottom: "2px solid #ff4d00", background: "#111", color: "#fff", whiteSpace: "nowrap" },
  td: { padding: "9px 10px", borderBottom: "1px solid #d3d6d9", verticalAlign: "top", background: "#fff", color: "#111" },
  tdDark: { background: "#30353a", color: "#f3f4f5" },
  tdLight: { background: "#3a4045", color: "#ffffff" },
  reviewActions: { display: "flex", gap: 6, flexWrap: "wrap" },
  approveButton: { display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 9px", background: "#d9f3dd", color: "#102b16", border: "1px solid #78aa80", fontWeight: 850, cursor: "pointer" },
  rejectButton: { display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 9px", background: "#ffd9d4", color: "#3a100b", border: "1px solid #bd756b", fontWeight: 850, cursor: "pointer" },
  closeButton: { display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 9px", background: "#e7e7e7", color: "#151515", border: "1px solid #999", fontWeight: 850, cursor: "pointer" },
  modalBackdrop: { position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.78)" },
  modal: { width: "min(620px,100%)", border: "1px solid #606871", borderTop: "3px solid #ff4d00", background: "linear-gradient(180deg,#f8f9fa,#e3e6e8)", color: "#17191c", boxShadow: "0 24px 70px rgba(0,0,0,.45)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid #c9cdd1" },
  modalTitle: { margin: 0, color: "#e84b08" },
  eyebrow: { fontSize: 10, fontWeight: 900, letterSpacing: 2.4, color: "#555" },
  iconButton: { width: 36, height: 36, display: "grid", placeItems: "center", background: "#292e33", color: "#fff", border: "1px solid #555d65", cursor: "pointer" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 18 },
  label: { display: "grid", gap: 6, color: "#555c62", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: .5 },
  input: { height: 40, padding: "0 10px", background: "#fff", color: "#17191c", border: "1px solid #aeb4b9", outline: "none", fontSize: 14 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 18px 18px" },
};
