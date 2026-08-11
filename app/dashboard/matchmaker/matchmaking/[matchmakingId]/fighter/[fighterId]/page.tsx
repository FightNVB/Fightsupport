"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Pencil, RefreshCw, Save, X, XCircle } from "lucide-react";
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

  useEffect(() => {
    void load();
  }, [fighterId, matchmakingId]);

  async function refreshScoped() {
    if (!aanmelding?.id || !matchmakingId) {
      setNotice("Geen aanmelding gevonden om te vernieuwen.");
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      const response = await authedFetch("/api/matchmaker/fighter-context/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          aanmelding_id: aanmelding.id,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Vernieuwen mislukt.");
      await load();
      router.refresh();
      setNotice("Deze vechter en de bijbehorende regels zijn opnieuw opgebouwd en opnieuw geladen.");
    } catch (e: any) {
      setNotice(e?.message || "Vernieuwen mislukt.");
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
      <main style={s.page}>
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

  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <header style={s.hero}>
          <div style={s.heroGlow} />
          <div style={s.heroTop}>
            <button style={s.silver} onClick={() => router.push(`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`)}>
              <ArrowLeft size={16} /> Terug
            </button>
            <div style={s.logoWrap}>
              <img src="/branding/fightsupport/excel-logo.png" alt="FightSupport" style={s.logo} />
            </div>
            <div style={s.heroActions}>
              <button style={s.silver} disabled={busy || !aanmelding?.id} onClick={refreshScoped}>
                <RefreshCw size={16} /> {busy ? "Bezig..." : "Vernieuwen"}
              </button>
            </div>
          </div>
          <div style={s.heroBottom}>
            <div style={s.heroIdentity}>
              <div style={s.eyebrow}>VECHTERDOSSIER</div>
              <h1 style={s.title}>{f.naam || "Onbekende vechter"}</h1>
              <div style={s.identityStrip}>
                <span style={s.identityChip}><b>VA</b> {f.va_nummer}</span>
                <span style={s.identityChip}>{f.primary_discipline || f.nulmeting_discipline || "Discipline onbekend"}</span>
                <span style={s.identityChip}>{f.mma_level || f.berekende_klasse || f.nulmeting_klasse || "Klasse onbekend"}</span>
                <span style={s.identityChip}>DB bijgewerkt {fmt(f.updated_at ?? f.last_scraped_at)}</span>
              </div>
            </div>
          </div>
        </header>

        {notice && <div style={s.feedback}>{notice}</div>}

        <div style={s.summary}>
          <Card title="Licentie" value={f.licentie_actief ? "Geldig" : "Geen geldige licentie"} />
          <Card title="Status" value={f.heeft_startverbod ? "STARTVERBOD" : "Fit to fight"} danger={f.heeft_startverbod} />
          <Card
            title="Record"
            value={`${record.klasse ?? "-"} ${record.w}-${record.v}-${record.o} (${record.overige})`}
          />
        </div>

        <Section title="Profiel & contact">
          <Grid rows={[["Naam", f.naam], ["E-mail", f.email], ["Geboortedatum", fmtDateOnly(f.geboortedatum)], ["Geslacht", f.geslacht]]} />
        </Section>

        <Section title="Nulmeting & klasse">
          <Grid rows={[
            ["Discipline", f.nulmeting_discipline], ["Nulmeting klasse", f.nulmeting_klasse],
            ["Berekende klasse", f.berekende_klasse], ["MMA niveau", f.mma_level],
          ]} />
          <div style={s.compactStatsGrid}>
            <CompactField title="Leeftijd" value={calcAge(f.geboortedatum, eventDate)} />
            <CompactField title="Gewicht" value={f.nulmeting_gewicht} />
            <CompactField title="Totaal partijen" value={f.totaal_wedstrijden ?? resultRows.length} />
            <CompactField title="Winst op KO" value={f.kos ?? 0} />
            <CompactField title="Record" value={`${record.klasse ?? "-"} ${record.w}-${record.v}-${record.o} (${record.overige})`} wide />
          </div>
          {f.nulmeting_opmerking && (
            <div style={{ ...s.field, ...s.fieldFull, marginTop: 9 }}>
              <span style={s.muted}>Opmerking</span>
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
            <div style={s.formGrid}>
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

function Card({ title, value, danger }: any) { return <div style={s.card}><div style={s.cardTitle}>{title}</div><div style={{ fontSize: 18, fontWeight: 900, color: danger ? "#ff654d" : "#eee" }}>{value}</div></div>; }
function Section({ title, children }: any) { return <section style={s.section}><h2 style={{ margin: "0 0 14px", color: "#ff7440" }}>{title}</h2>{children}</section>; }
function Grid({ rows }: any) { return <div style={s.grid}>{rows.map((row: any, index: number) => <div key={index} style={{ ...s.field, ...(row[2] === "wide" ? s.fieldWide : {}), ...(row[2] === "full" ? s.fieldFull : {}) }}><span style={s.muted}>{row[0]}</span><b style={{ wordBreak: "break-word", lineHeight: 1.35 }}>{row[1] ?? "-"}</b></div>)}</div>; }
function CompactField({ title, value, wide = false }: any) { return <div style={{ ...s.field, ...(wide ? s.compactRecordField : {}) }}><span style={s.muted}>{title}</span><b style={{ wordBreak: "break-word", lineHeight: 1.35 }}>{value ?? "-"}</b></div>; }
function Table({ headers, rows }: any) { return <div style={{ overflowX: "auto", border: "1px solid #444b52" }}><table style={s.table}><thead><tr>{headers.map((header: any) => <th key={header} style={s.th}>{header}</th>)}</tr></thead><tbody>{rows.map((row: any, index: number) => { const light = index % 2 === 1; return <tr key={index}>{row.map((value: any, cellIndex: number) => <td key={cellIndex} style={{ ...s.td, ...(light ? s.tdLight : s.tdDark) }}>{value ?? "-"}</td>)}</tr>; })}{!rows.length && <tr><td style={{ ...s.td, ...s.tdDark }} colSpan={headers.length}>Geen gegevens.</td></tr>}</tbody></table></div>; }

function ReviewTable({ rows, busyId, onReview }: any) {
  const headers = ["Datum", "Soort", "Melding", "Status", "Evenement", "Beoordeling"];
  return (
    <div style={{ overflowX: "auto", border: "1px solid #444b52" }}>
      <table style={s.table}>
        <thead><tr>{headers.map((header) => <th key={header} style={s.th}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row: any, index: number) => {
            const light = index % 2 === 1;
            const isRule = row?.bron_melding === "fighter_rules" && !!row?.id;
            const reviewed = !!row?.review_status;
            const status = row?.review_status
              ? `${row.review_status} (${row.resultaat ?? row.status ?? "-"})`
              : row?.resultaat ?? row?.status ?? (row?.actief === true ? "Actief" : row?.actief === false ? "Afgesloten" : "-");
            const id = String(row?.id ?? index);
            return (
              <tr key={id}>
                <td style={{ ...s.td, ...(light ? s.tdLight : s.tdDark) }}>{fmt(row?.datum ?? row?.created_at ?? row?.meldingsdatum)}</td>
                <td style={{ ...s.td, ...(light ? s.tdLight : s.tdDark) }}>{row?.soort ?? row?.type ?? row?.categorie ?? "Melding"}</td>
                <td style={{ ...s.td, ...(light ? s.tdLight : s.tdDark) }}>{row?.melding ?? row?.omschrijving ?? row?.reden ?? row?.notitie ?? row?.description ?? "-"}</td>
                <td style={{ ...s.td, ...(light ? s.tdLight : s.tdDark) }}>{status}</td>
                <td style={{ ...s.td, ...(light ? s.tdLight : s.tdDark) }}>{row?.evenement ?? row?.event_naam ?? row?.event ?? "-"}</td>
                <td style={{ ...s.td, ...(light ? s.tdLight : s.tdDark), minWidth: 260 }}>
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
          {!rows.length && <tr><td style={{ ...s.td, ...s.tdDark }} colSpan={headers.length}>Geen gegevens.</td></tr>}
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
  page: { minHeight: "100vh", background: "radial-gradient(circle at 50% -10%,rgba(255,77,0,.16),transparent 34%),linear-gradient(180deg,#060708 0%,#0b0f13 48%,#050607 100%)", color: "white", padding: 20 },
  wrap: { maxWidth: 1460, margin: "0 auto" },
  hero: { position: "relative", overflow: "hidden", marginBottom: 16, border: "1px solid #4a5057", borderTop: "3px solid #ff4d00", background: "linear-gradient(145deg,#1b2026 0%,#0b0e12 55%,#15191e 100%)", boxShadow: "0 16px 34px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.05)" },
  heroGlow: { position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 10%,rgba(255,77,0,.14),transparent 24%)" },
  heroTop: { position: "relative", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 14, padding: "10px 14px", borderBottom: "1px solid #353b42" },
  heroActions: { display: "flex", justifyContent: "flex-end" },
  logoWrap: { display: "flex", justifyContent: "center", alignItems: "center", height: 92, minWidth: 760 },
  logo: { height: 86, width: 760, maxWidth: "64vw", objectFit: "contain", filter: "drop-shadow(0 8px 14px rgba(0,0,0,.7)) drop-shadow(0 0 12px rgba(255,77,0,.12))" },
  heroBottom: { position: "relative", display: "flex", justifyContent: "center", alignItems: "center", gap: 20, padding: "18px 18px 20px" },
  heroIdentity: { display: "grid", justifyItems: "center", textAlign: "center", gap: 8, width: "100%" },
  eyebrow: { fontSize: 10, fontWeight: 900, letterSpacing: 2.4, color: "#fff", marginBottom: 5 },
  title: { margin: 0, fontSize: 34, fontWeight: 950, letterSpacing: .3, color: "#ff6a2a", textAlign: "center", textShadow: "0 4px 12px #000" },
  identityStrip: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  identityChip: { padding: "6px 9px", border: "1px solid #6b3018", background: "#22120b", color: "#fff", fontSize: 12, fontWeight: 850 },
  silver: { display: "inline-flex", gap: 7, alignItems: "center", justifyContent: "center", height: 38, padding: "0 13px", background: "linear-gradient(#fff,#c7c7c7)", color: "#111", border: "1px solid #aaa", fontWeight: 900, cursor: "pointer", boxShadow: "inset 0 1px 0 #fff,0 4px 10px rgba(0,0,0,.28)" },
  darkButton: { height: 38, padding: "0 13px", background: "#161b20", color: "#fff", border: "1px solid #555d65", fontWeight: 800, cursor: "pointer" },
  summary: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, marginBottom: 16 },
  card: { border: "1px solid #555d65", borderTop: "3px solid #ff4d00", background: "linear-gradient(180deg,#1c2228,#0d1115)", padding: "13px 15px", boxShadow: "0 8px 18px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.04)" },
  cardTitle: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#a6adb4", marginBottom: 6 },
  section: { border: "1px solid #3f464d", borderLeft: "3px solid #ff4d00", background: "linear-gradient(180deg,#151a1f,#0a0d10)", padding: 16, marginBottom: 14, boxShadow: "0 10px 24px rgba(0,0,0,.24)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 9 },
  compactStatsGrid: { display: "grid", gridTemplateColumns: "0.65fr 0.65fr 0.9fr 0.7fr 1.35fr", gap: 9, marginTop: 9 },
  compactRecordField: { minWidth: 0 },
  field: { display: "grid", gap: 4, padding: "9px 10px", background: "#0d1115", border: "1px solid #30363d", minHeight: 54 },
  fieldWide: { gridColumn: "span 2", minHeight: 72 },
  fieldFull: { gridColumn: "1 / -1", minHeight: 72 },
  muted: { fontSize: 10, color: "#9199a2", textTransform: "uppercase", letterSpacing: .5 },
  notice: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 12px", marginBottom: 12, border: "1px solid #5c6268", background: "#10151a" },
  noticeText: { flex: "1 1 520px", color: "#c9ced3", fontSize: 12, lineHeight: 1.45 },
  feedback: { marginBottom: 14, padding: "10px 12px", border: "1px solid #80502e", background: "#21150d", color: "#ffd2b8", fontWeight: 750 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "9px 10px", borderBottom: "2px solid #ff4d00", background: "#20262c", color: "#f3f3f3", whiteSpace: "nowrap" },
  td: { padding: "9px 10px", borderBottom: "1px solid #31373d", verticalAlign: "top" },
  tdDark: { background: "#11161a", color: "#f3f3f3" },
  tdLight: { background: "#ececec", color: "#111" },
  reviewActions: { display: "flex", gap: 6, flexWrap: "wrap" },
  approveButton: { display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 9px", background: "#d9f3dd", color: "#102b16", border: "1px solid #78aa80", fontWeight: 850, cursor: "pointer" },
  rejectButton: { display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 9px", background: "#ffd9d4", color: "#3a100b", border: "1px solid #bd756b", fontWeight: 850, cursor: "pointer" },
  closeButton: { display: "inline-flex", alignItems: "center", gap: 5, height: 32, padding: "0 9px", background: "#e7e7e7", color: "#151515", border: "1px solid #999", fontWeight: 850, cursor: "pointer" },
  modalBackdrop: { position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.78)" },
  modal: { width: "min(620px,100%)", border: "1px solid #606871", borderTop: "3px solid #ff4d00", background: "linear-gradient(180deg,#1b2026,#0b0e12)", boxShadow: "0 24px 70px rgba(0,0,0,.7)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid #353b42" },
  modalTitle: { margin: 0, color: "#ff6a2a" },
  iconButton: { width: 36, height: 36, display: "grid", placeItems: "center", background: "#101419", color: "#fff", border: "1px solid #555d65", cursor: "pointer" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 18 },
  label: { display: "grid", gap: 6, color: "#bcc3ca", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: .5 },
  input: { height: 40, padding: "0 10px", background: "#080b0e", color: "#fff", border: "1px solid #555d65", outline: "none", fontSize: 14 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 18px 18px" },
};
