"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  FileCheck2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

export default function DopingFighterDetailPage() {
  const { va } = useParams<{ va: string }>();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [manualUploading, setManualUploading] = useState(false);
  const [fightPassportWriting, setFightPassportWriting] = useState(false);
  const [fightPassportConfirmed, setFightPassportConfirmed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    const response = await authedFetch(`/api/admin/doping/fighters/${va}`);
    const json = await response.json().catch(() => ({}));

    if (response.ok) {
      setData(json);
      setMsg("");
    } else {
      setMsg(json.error || "Laden mislukt.");
    }

    setLoading(false);
  }, [va]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, action: "approve" | "reject") {
    const reason =
      action === "reject" ? prompt("Reden afwijzing") || "" : "";

    const response = await authedFetch("/api/admin/doping/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        certificate_id: id,
        action,
        reason,
      }),
    });

    const json = await response.json().catch(() => ({}));

    setMsg(response.ok ? "Opgeslagen." : json.error || "Opslaan mislukt.");

    if (response.ok) {
      await load();
    }
  }

  async function addManualCertificate() {
    const vaNummer = String(fighter.va_nummer || va || "").replace(/\D/g, "");
    if (!vaNummer) {
      setMsg("Geen geldig VA-nummer gevonden.");
      return;
    }

    setManualUploading(true);
    setMsg("");

    try {
      const response = await authedFetch("/api/admin/doping/certificates/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ va_nummer: vaNummer }),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Certificaat toevoegen mislukt.");
      }

      await load();
      setMsg("Certificaat handmatig toegevoegd.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Certificaat toevoegen mislukt.");
    } finally {
      setManualUploading(false);
    }
  }

  async function writeFightPassport() {
    const vaNummer = String(fighter.va_nummer || va || "").replace(/\D/g, "");
    if (!vaNummer) {
      setMsg("Geen geldig VA-nummer gevonden.");
      return;
    }

    setFightPassportWriting(true);
    setMsg("FightPassport wordt bijgewerkt...");

    try {
      const response = await authedFetch("/api/admin/doping/fightpassport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ va_nummers: [vaNummer] }),
      });
      const json = await response.json().catch(() => ({}));
      const result = Array.isArray(json.results) ? json.results[0] : null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || json.error || "FightPassport schrijven mislukt.");
      }

      setFightPassportConfirmed(true);
      await load();
      setMsg(
        result.status === "already_present"
          ? "Dopingcertificaat stond al in FightPassport. Dossier is vernieuwd."
          : "Dopingcertificaat is in FightPassport gezet. Dossier is vernieuwd."
      );
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "FightPassport schrijven mislukt.");
    } finally {
      setFightPassportWriting(false);
    }
  }

  const fighter = data?.fighter ?? {};
  const workflow = data?.workflow ?? {};
  const certificates = Array.isArray(data?.certificates) ? data.certificates : [];
  const invitations = Array.isArray(data?.invitations) ? data.invitations : [];
  const results = Array.isArray(data?.results) ? data.results : [];

  const latestCertificate = useMemo(
    () =>
      [...certificates].sort(
        (a: any, b: any) =>
          new Date(b.uploaded_at || 0).getTime() -
          new Date(a.uploaded_at || 0).getTime()
      )[0] ?? null,
    [certificates]
  );

  if (!data) {
    return (
      <main style={s.page}>
        <div style={s.wrap}>
          <button
            style={s.silver}
            onClick={() => router.push("/dashboard/admin/doping")}
          >
            <ArrowLeft size={16} />
            Terug
          </button>
          <p>{loading ? "Dossier laden..." : msg || "Dossier kon niet worden geladen."}</p>
        </div>
      </main>
    );
  }

  const certificateReceived = certificates.length > 0;
  const latestCertificateStatus = String(latestCertificate?.status || "").toLowerCase();
  const certificateApproved =
    latestCertificateStatus === "goedgekeurd" ||
    String(workflow.certificate_status || "").toLowerCase() === "goedgekeurd";
  const certificateCardValue = certificateReceived
    ? certificateApproved
      ? "Goedgekeurd"
      : "Ontvangen"
    : workflow.certificate_status || "Niet ontvangen";
  const fightPassportProcessed =
    fightPassportConfirmed || isFightPassportProcessed(workflow);

  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <header style={s.hero}>
          <div style={s.heroGlow} />

          <div style={s.heroTop}>
            <button
              style={s.silver}
              onClick={() => router.push("/dashboard/admin/doping")}
            >
              <ArrowLeft size={16} />
              Dopingbeheer
            </button>

            <div style={s.logoWrap}>
              <img
                src="/branding/fightsupport/excel-logo.png"
                alt="FightSupport"
                style={s.logo}
              />
            </div>

            <button style={s.silver} onClick={load} disabled={loading}>
              <RefreshCw size={16} />
              {loading ? "Laden..." : "Vernieuwen"}
            </button>
          </div>

          <div style={s.heroBottom}>
            <div style={s.heroIdentity}>
              <div style={s.eyebrow}>DOPINGDOSSIER</div>
              <h1 style={s.title}>
                {fighter.naam || "Onbekende vechter"}
              </h1>

              <div style={s.identityStrip}>
                <span style={s.identityChip}>
                  <b>VA</b> {fighter.va_nummer}
                </span>
                <span style={s.identityChip}>
                  {fighter.discipline || fighter.nulmeting_discipline || "Discipline onbekend"}
                </span>
                <span style={s.identityChip}>
                  {fighter.klasse ||
                    fighter.berekende_klasse ||
                    fighter.nulmeting_klasse ||
                    "Klasse onbekend"}
                </span>
                <span style={s.identityChip}>
                  FightPassport {fightPassportProcessed ? "verwerkt" : "niet verwerkt"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {msg && <div style={s.message}>{msg}</div>}

        <div style={s.summary}>
          <Card
            title="Dopingstatus"
            value={workflow.workflow_status || "Niet uitgenodigd"}
            icon={<ShieldCheck size={20} />}
          />
          <Card
            title="Certificaat"
            value={certificateCardValue}
            good={certificateApproved}
            icon={<FileCheck2 size={20} />}
          />
          <Card
            title="FightPassport"
            value={fightPassportProcessed ? "Verwerkt" : "Niet verwerkt"}
            good={fightPassportProcessed}
            danger={!fightPassportProcessed}
            icon={<RefreshCw size={20} />}
          />
        </div>

        <Section title="Profiel & status">
          <Grid
            rows={[
              ["Naam", fighter.naam],
              ["VA-nummer", fighter.va_nummer],
              ["E-mail", fighter.email],
              ["Discipline", fighter.discipline || fighter.nulmeting_discipline],
              ["Klasse", fighter.klasse || fighter.berekende_klasse],
              ["Licentie", fighter.licentie_actief ? "Geldig" : "Niet geldig"],
              ["Startverbod", fighter.heeft_startverbod ? "Ja" : "Nee"],
              [
                "Nulmeting",
                `${fighter.nulmeting_discipline || "-"} · ${
                  fighter.nulmeting_klasse || "-"
                }`,
              ],
            ]}
          />
        </Section>

        <Section title="Dopingeducatie & FightPassport">
          <Grid
            rows={[
              ["Workflow", workflow.workflow_status || "Niet uitgenodigd"],
              ["Certificaatstatus", certificateCardValue],
              [
                "FightPassport-status",
                fightPassportProcessed
                  ? "Doping certificaat staat in het persoonlijke dossier"
                  : workflow.fightpassport_status || "Niet verwerkt",
              ],
              [
                "Laatste verwerking",
                formatDate(
                  workflow.fightpassport_processed_at ||
                    workflow.updated_at ||
                    workflow.last_updated_at
                ),
              ],
              [
                "Laatste certificaat",
                latestCertificate?.original_filename || "Nog geen certificaat",
                "wide",
              ],
              [
                "Opmerking",
                fightPassportProcessed
                  ? '“Doping certificaat behaald” is verwerkt in FightPassport.'
                  : "Nog niet bevestigd als verwerkt in FightPassport.",
                "full",
              ],
            ]}
          />
        </Section>

        <Section
          title={`Certificaten (${certificates.length})`}
          action={
            <div style={s.actions}>
              <button
                type="button"
                style={{ ...s.green, opacity: manualUploading ? 0.65 : 1 }}
                onClick={() => void addManualCertificate()}
                disabled={manualUploading || fightPassportWriting}
              >
                {manualUploading ? <RefreshCw size={16} /> : <Plus size={17} />}
                {manualUploading ? "Toevoegen..." : "Certificaat toevoegen"}
              </button>

              {certificates.length > 0 && (
                <button
                  type="button"
                  style={{ ...s.orange, opacity: fightPassportWriting ? 0.65 : 1 }}
                  onClick={() => void writeFightPassport()}
                  disabled={fightPassportWriting || manualUploading}
                >
                  <RefreshCw size={16} />
                  {fightPassportWriting ? "Bezig met schrijven..." : "Naar FightPassport"}
                </button>
              )}
            </div>
          }
        >
          {certificates.length ? (
            <div style={s.list}>
              {certificates.map((certificate: any) => (
                <div key={certificate.id} style={s.listRow}>
                  <div>
                    <b>{certificate.original_filename || "Certificaat"}</b>
                    <div style={s.rowMeta}>
                      {formatDate(certificate.uploaded_at)} ·{" "}
                      {certificate.status || "onbekend"}
                    </div>
                  </div>

                  <div style={s.actions}>
                    {certificate.signed_url && (
                      <a
                        href={certificate.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        style={s.silver}
                      >
                        Inzien
                      </a>
                    )}

                    <button
                      style={s.green}
                      onClick={() => review(certificate.id, "approve")}
                    >
                      <Check size={15} />
                      Goedkeuren
                    </button>

                    <button
                      style={s.red}
                      onClick={() => review(certificate.id, "reject")}
                    >
                      <X size={15} />
                      Afwijzen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Nog geen certificaat ontvangen." />
          )}
        </Section>

        <Section title={`Mailhistorie (${invitations.length})`}>
          {invitations.length ? (
            <Table
              headers={["Datum", "Soort", "Afleverstatus"]}
              rows={invitations.map((item: any) => [
                formatDate(item.created_at),
                item.invitation_type,
                item.delivery_status,
              ])}
            />
          ) : (
            <Empty text="Nog geen uitnodiging of herinnering verstuurd." icon={<Mail size={18} />} />
          )}
        </Section>

        <Section title={`Laatste uitslagen (${results.length})`}>
          <Table
            headers={[
              "Datum",
              "Evenement",
              "Discipline",
              "Klasse",
              "Tegenstander",
              "Uitslag",
            ]}
            rows={results.slice(0, 20).map((result: any) => [
              result.datum,
              result.evenement,
              result.discipline,
              result.klasse,
              result.tegenstander,
              result.uitslag,
            ])}
          />
        </Section>
      </div>
    </main>
  );
}

function isFightPassportProcessed(workflow: any) {
  if (workflow?.fightpassport_processed === true) return true;

  const status = String(workflow?.fightpassport_status || "")
    .trim()
    .toLowerCase();

  return [
    "written",
    "already_present",
    "verwerkt",
    "opgeslagen",
    "toegevoegd",
    "aanwezig",
    "success",
    "succes",
  ].some((value) => status.includes(value));
}

function Card({
  title,
  value,
  danger,
  good,
  icon,
}: {
  title: string;
  value: any;
  danger?: boolean;
  good?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div style={s.cardTitle}>{title}</div>
        <span style={s.cardIcon}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: good ? "#61d578" : danger ? "#ff654d" : "#eee",
        }}
      >
        {value ?? "-"}
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={s.section}>
      <div style={s.sectionHeader}>
        <h2 style={s.sectionTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Grid({ rows }: { rows: any[][] }) {
  return (
    <div style={s.grid}>
      {rows.map((row, index) => (
        <div
          key={`${row[0]}-${index}`}
          style={{
            ...s.field,
            ...(row[2] === "wide" ? s.fieldWide : {}),
            ...(row[2] === "full" ? s.fieldFull : {}),
          }}
        >
          <span style={s.muted}>{row[0]}</span>
          <b style={s.fieldValue}>{row[1] ?? "-"}</b>
        </div>
      ))}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: any[][] }) {
  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} style={s.th}>
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => {
            const light = rowIndex % 2 === 1;

            return (
              <tr key={rowIndex}>
                {row.map((value, columnIndex) => (
                  <td
                    key={columnIndex}
                    style={{
                      ...s.td,
                      ...(light ? s.tdLight : s.tdDark),
                    }}
                  >
                    {value ?? "-"}
                  </td>
                ))}
              </tr>
            );
          })}

          {!rows.length && (
            <tr>
              <td style={{ ...s.td, ...s.tdDark }} colSpan={headers.length}>
                Geen gegevens.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Empty({
  text,
  icon,
}: {
  text: string;
  icon?: React.ReactNode;
}) {
  return (
    <div style={s.empty}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function formatDate(value: any) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("nl-NL");
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% -10%,rgba(255,77,0,.16),transparent 34%),linear-gradient(180deg,#060708 0%,#0b0f13 48%,#050607 100%)",
    color: "white",
    padding: 20,
  },
  wrap: {
    maxWidth: 1460,
    margin: "0 auto",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    marginBottom: 16,
    border: "1px solid #4a5057",
    borderTop: "3px solid #ff4d00",
    background:
      "linear-gradient(145deg,#1b2026 0%,#0b0e12 55%,#15191e 100%)",
    boxShadow:
      "0 16px 34px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.05)",
  },
  heroGlow: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "radial-gradient(circle at 50% 10%,rgba(255,77,0,.14),transparent 24%)",
  },
  heroTop: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 14,
    padding: "10px 14px",
    borderBottom: "1px solid #353b42",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: 92,
    minWidth: 0,
  },
  logo: {
    height: 86,
    width: 760,
    maxWidth: "64vw",
    objectFit: "contain",
    filter:
      "drop-shadow(0 8px 14px rgba(0,0,0,.7)) drop-shadow(0 0 12px rgba(255,77,0,.12))",
  },
  heroBottom: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    padding: "18px 18px 20px",
  },
  heroIdentity: {
    display: "grid",
    justifyItems: "center",
    textAlign: "center",
    gap: 8,
    width: "100%",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 2.4,
    color: "#fff",
    marginBottom: 5,
  },
  title: {
    margin: 0,
    fontSize: 34,
    fontWeight: 950,
    letterSpacing: 0.3,
    color: "#ff6a2a",
    textAlign: "center",
    textShadow: "0 4px 12px #000",
  },
  identityStrip: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  identityChip: {
    padding: "6px 9px",
    border: "1px solid #6b3018",
    background: "#22120b",
    color: "#fff",
    fontSize: 12,
    fontWeight: 850,
  },
  message: {
    marginBottom: 14,
    padding: "10px 12px",
    border: "1px solid #7b3a20",
    background: "#25130d",
    color: "#ffb28e",
    fontWeight: 800,
  },
  silver: {
    display: "inline-flex",
    gap: 7,
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    padding: "0 13px",
    background: "linear-gradient(#fff,#c7c7c7)",
    color: "#111",
    border: "1px solid #aaa",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 #fff,0 4px 10px rgba(0,0,0,.28)",
    textDecoration: "none",
  },
  orange: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid #ff7138",
    background: "linear-gradient(#ff6a2a,#d83f00)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  green: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 38,
    padding: "0 12px",
    border: "1px solid #3ca759",
    background: "linear-gradient(#338d48,#216a34)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  red: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 38,
    padding: "0 12px",
    border: "1px solid #c84a4a",
    background: "linear-gradient(#a53b3b,#762222)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 12,
    marginBottom: 16,
  },
  card: {
    border: "1px solid #555d65",
    borderTop: "3px solid #ff4d00",
    background: "linear-gradient(180deg,#1c2228,#0d1115)",
    padding: "13px 15px",
    boxShadow:
      "0 8px 18px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.04)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#a6adb4",
  },
  cardIcon: {
    color: "#ff6a2a",
    display: "inline-flex",
  },
  section: {
    border: "1px solid #3f464d",
    borderLeft: "3px solid #ff4d00",
    background: "linear-gradient(180deg,#151a1f,#0a0d10)",
    padding: 16,
    marginBottom: 14,
    boxShadow: "0 10px 24px rgba(0,0,0,.24)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    color: "#ff7440",
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
    background: "#0d1115",
    border: "1px solid #30363d",
    minHeight: 54,
  },
  fieldWide: {
    gridColumn: "span 2",
    minHeight: 72,
  },
  fieldFull: {
    gridColumn: "1 / -1",
    minHeight: 72,
  },
  fieldValue: {
    wordBreak: "break-word",
    lineHeight: 1.35,
  },
  muted: {
    fontSize: 10,
    color: "#9199a2",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  list: {
    display: "grid",
    border: "1px solid #3c434a",
  },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px",
    borderBottom: "1px solid #30363d",
    background: "#0d1115",
  },
  rowMeta: {
    marginTop: 4,
    color: "#9aa1a8",
    fontSize: 12,
  },
  actions: {
    display: "flex",
    gap: 7,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  empty: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 56,
    padding: "12px",
    border: "1px solid #30363d",
    background: "#0d1115",
    color: "#a6adb4",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #444b52",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "9px 10px",
    borderBottom: "2px solid #ff4d00",
    background: "#20262c",
    color: "#f3f3f3",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "9px 10px",
    borderBottom: "1px solid #31373d",
    verticalAlign: "top",
  },
  tdDark: {
    background: "#11161a",
    color: "#f3f3f3",
  },
  tdLight: {
    background: "#ececec",
    color: "#111",
  },
};

