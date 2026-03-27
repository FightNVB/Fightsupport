"use client";

import React, { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FileSpreadsheet,
  ShieldCheck,
  Upload,
  MapPin,
  UserRound,
  Building2,
  Download,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";

type Profile = {
  role?: string | null;
  bondteam?: string | null;
  full_name?: string | null;
};

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function isEmpty(v: unknown) {
  return norm(v).length === 0;
}

const BONDTEAMS = ["IRO", "NKF", "WPKL", "WMTA", "VON", "UMC", "MMAAN", "MON"];
const logoSrc = "/branding/fightsupport/excel-logo.png";
const NVB_ORANGE = "#ff4d00";

function isAdminRole(role: unknown) {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "admin" || r === "superadmin";
}

const pageBackground: CSSProperties = {
  minHeight: "100vh",
  color: "#fff",
  background: `
    radial-gradient(circle at 50% 0%, rgba(255,104,20,0.11) 0%, rgba(255,104,20,0.03) 10%, rgba(0,0,0,0) 22%),
    radial-gradient(circle at 50% 100%, rgba(255,104,20,0.08) 0%, rgba(255,104,20,0.02) 12%, rgba(0,0,0,0) 24%),
    radial-gradient(circle at 16% 20%, rgba(255,120,20,0.06) 0%, rgba(255,120,20,0) 16%),
    radial-gradient(circle at 84% 22%, rgba(255,120,20,0.06) 0%, rgba(255,120,20,0) 16%),
    linear-gradient(180deg, #030405 0%, #06080b 18%, #010203 100%)
  `,
};

const sectionRule = (top = false): CSSProperties => ({
  position: "relative",
  borderTop: top ? "1px solid rgba(255,255,255,0.05)" : undefined,
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.04),
    inset 0 -1px 0 rgba(0,0,0,0.82)
  `,
});

const steelFrameOuter: CSSProperties = {
  position: "relative",
  padding: 6,
  background: `
    linear-gradient(145deg,
      #ffffff 0%,
      #cfcfcf 6%,
      #6a6a6a 12%,
      #fafafa 19%,
      #8d8d8d 27%,
      #3f3f3f 36%,
      #ededed 47%,
      #9f9f9f 58%,
      #4b4b4b 69%,
      #ffffff 80%,
      #b8b8b8 90%,
      #f7f7f7 100%)
  `,
  border: "1px solid rgba(255,255,255,0.60)",
  boxShadow: `
    0 10px 20px rgba(0,0,0,0.56),
    inset 0 2px 1px rgba(255,255,255,0.96),
    inset 0 -2px 2px rgba(0,0,0,0.82),
    inset 2px 0 2px rgba(255,255,255,0.44),
    inset -2px 0 2px rgba(0,0,0,0.54)
  `,
};

const steelFrameMid: CSSProperties = {
  position: "relative",
  padding: 3,
  background: `
    linear-gradient(135deg,
      rgba(255,255,255,0.95) 0%,
      rgba(216,216,216,0.95) 14%,
      rgba(64,64,64,0.96) 28%,
      rgba(248,248,248,0.94) 48%,
      rgba(98,98,98,0.96) 68%,
      rgba(236,236,236,0.96) 100%)
  `,
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.78),
    inset 0 -1px 0 rgba(0,0,0,0.58)
  `,
};

const steelFrameChannel: CSSProperties = {
  position: "relative",
  padding: 4,
  background: `
    linear-gradient(180deg,
      #2a2a2a 0%,
      #080808 18%,
      #505050 34%,
      #0c0c0c 52%,
      #424242 72%,
      #090909 100%)
  `,
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.16),
    inset 0 -1px 0 rgba(0,0,0,0.84)
  `,
};

const steelFrameInner: CSSProperties = {
  position: "relative",
  padding: 2,
  background: `
    linear-gradient(135deg,
      #fbfbfb 0%,
      #d2d2d2 10%,
      #6f6f6f 22%,
      #f3f3f3 34%,
      #b4b4b4 46%,
      #545454 60%,
      #fafafa 78%,
      #b2b2b2 100%)
  `,
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.66),
    inset 0 -1px 0 rgba(0,0,0,0.50)
  `,
};

const darkPlate: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  border: "1px solid #080808",
  background: `
    radial-gradient(circle at 14% 84%, rgba(255,110,0,0.08), transparent 16%),
    radial-gradient(circle at 86% 14%, rgba(255,255,255,0.05), transparent 14%),
    linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 15%, rgba(0,0,0,0.16) 100%),
    linear-gradient(135deg, #1a1d22 0%, #070a0f 46%, #15181d 100%)
  `,
  boxShadow: `
    inset 0 2px 4px rgba(0,0,0,0.92),
    inset 0 -2px 6px rgba(255,255,255,0.05),
    inset 0 0 30px rgba(255,120,0,0.04)
  `,
};

function inputBaseClass() {
  return "w-full rounded-none border border-white/10 bg-[#0d1015] px-3 py-[7px] text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ff4d00]/60 focus:ring-2 focus:ring-[#ff4d00]/20";
}

function labelTextClass() {
  return "mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/88";
}

export default function UploadMatchmakingMatchmakerPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile>({});
  const isAdmin = useMemo(() => isAdminRole(profile.role), [profile.role]);

  const [file, setFile] = useState<File | null>(null);

  const [eventNaam, setEventNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [plaats, setPlaats] = useState("");
  const [bondteam, setBondteam] = useState("");

  const [matchmaker, setMatchmaker] = useState("");
  const [promotor, setPromotor] = useState("");

  const [busy, setBusy] = useState(false);
  const [melding, setMelding] = useState("");

  useEffect(() => {
    (async () => {
      if (!user?.id) {
        setProfile({});
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("role,bondteam,full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("profile load error:", error.message);
      }

      const profileData = (data ?? {}) as Profile;
      setProfile(profileData);

      const bt = norm(profileData.bondteam);
      if (bt) setBondteam((prev) => prev || bt);

      const fn = norm(profileData.full_name);
      if (fn) setMatchmaker((prev) => prev || fn);
    })();
  }, [user?.id]);

  async function onUpload() {
    setMelding("");

    if (!isAdmin) {
      setMelding("Je hebt geen rechten om deze upload uit te voeren.");
      return;
    }

    if (!file) {
      setMelding("Kies eerst een Excel-bestand.");
      return;
    }

    if (isEmpty(eventNaam) || isEmpty(datum) || isEmpty(bondteam) || isEmpty(matchmaker)) {
      setMelding("Vul evenement naam, datum, bondteam en matchmaker in.");
      return;
    }

    try {
      setBusy(true);
      setMelding("Uploaden...");

      const filePath = `matchmakings/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        setMelding("Upload naar storage mislukt.");
        return;
      }

      setMelding("Matchmaking verwerken...");

      const response = await authedFetch("/api/matchmaker/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: filePath,
          raw_filename: file.name,
          evenement_naam: norm(eventNaam),
          evenement_datum: norm(datum),
          locatie: norm(plaats) || null,
          bondteam: norm(bondteam),
          matchmaker: norm(matchmaker),
          promotor: norm(promotor) || null,
          hoofdofficial: null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMelding(data?.error ?? "Onbekende fout.");
        return;
      }

      const matchmakingId = norm(data?.matchmaking_id);
      if (!matchmakingId) {
        setMelding("Upload gelukt maar matchmaking_id ontbreekt in de response.");
        return;
      }

      setMelding("Upload gelukt. Doorsturen naar controle...");
      router.push("/dashboard/matchmaker/controle");
    } catch (e: any) {
      console.error(e);
      setMelding(e?.message ?? "Onbekende fout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={pageBackground}>
      <style jsx>{`
        @keyframes fsPulseGlow {
          0%,
          100% {
            opacity: 0.78;
            transform: scaleX(1) scaleY(1);
          }
          50% {
            opacity: 1;
            transform: scaleX(1.08) scaleY(1.12);
          }
        }

        .fs-hotspot {
          animation: fsPulseGlow 2.8s ease-in-out infinite;
          transform-origin: center center;
        }

        .fs-hotspot-2 {
          animation-delay: 0.7s;
        }

        .fs-metal-button {
          transition:
            transform 90ms ease,
            box-shadow 120ms ease,
            filter 120ms ease;
        }

        .fs-metal-button:hover {
          filter: brightness(1.02);
          box-shadow:
            inset 0 2px 1px rgba(255, 255, 255, 1),
            inset 0 -3px 2px rgba(0, 0, 0, 0.6),
            0 8px 18px rgba(0, 0, 0, 0.46),
            0 0 10px rgba(255, 77, 0, 0.08);
        }

        .fs-metal-button:active {
          transform: translateY(2px);
          box-shadow:
            inset 0 2px 2px rgba(0, 0, 0, 0.18),
            inset 0 -1px 1px rgba(255, 255, 255, 0.28),
            0 2px 6px rgba(0, 0, 0, 0.35);
        }

        .fs-upload-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          align-items: stretch;
        }

        .fs-upload-grid > * {
          height: 100%;
        }

        .fs-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 12px;
        }

        .fs-panel-fill {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 1120px) {
          .fs-upload-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .fs-form-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 860px) {
          .title-row {
            padding-top: 10px !important;
            padding-bottom: 10px !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .title-actions-wrap {
            position: static !important;
            justify-content: center !important;
            margin-bottom: 8px !important;
            transform: none !important;
          }

          .title-center {
            padding-top: 0 !important;
          }
        }
      `}</style>

      <TopLogoBand />

      <TitleBand
        title="Upload Matchmaking"
        subtitle="Excel upload en verwerking"
        email={user?.email ?? ""}
        actionLabel="Terug"
        actionIcon={<ArrowLeft size={15} strokeWidth={2.8} />}
        onAction={() => router.push("/dashboard/matchmaker")}
      />

      <div
        style={{
          maxWidth: 1380,
          margin: "0 auto",
          padding: "10px 14px 8px",
        }}
      >
        {!isAdmin && (
          <div style={{ marginBottom: 10 }}>
            <SteelFrame>
              <div
                style={{
                  ...darkPlate,
                  padding: "12px 14px",
                  color: "#ffd7d7",
                  fontWeight: 700,
                  borderColor: "rgba(255,77,77,0.18)",
                }}
              >
                Je hebt geen rechten om deze upload uit te voeren.
              </div>
            </SteelFrame>
          </div>
        )}

        <div className="fs-upload-grid">
          <SteelFrame>
            <div className="fs-panel-fill" style={{ ...darkPlate, padding: "12px 14px" }}>
              <OrangeHotspot left={18} bottom={10} width={50} />
              <OrangeHotspot right={34} top={12} width={30} small variant={2} />
              <CardChromeOverlay />

              <SectionHeader
                icon={<Upload size={22} strokeWidth={2.3} />}
                title="Upload gegevens"
                subtitle="Vul de evenementgegevens in en upload daarna direct het bestand."
              />

              <div className="fs-form-grid" style={{ marginTop: 12 }}>
                <InputBlock label="Evenement naam" required icon={<ShieldCheck size={14} />}>
                  <input
                    className={inputBaseClass()}
                    value={eventNaam}
                    onChange={(e) => setEventNaam(e.target.value)}
                    placeholder="Bijvoorbeeld: King of the Ring"
                  />
                </InputBlock>

                <InputBlock label="Datum" required icon={<CalendarDays size={14} />}>
                  <input
                    type="date"
                    className={inputBaseClass()}
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                  />
                </InputBlock>

                <InputBlock label="Bondteam" required icon={<Building2 size={14} />}>
                  <select
                    className={inputBaseClass()}
                    value={bondteam}
                    onChange={(e) => setBondteam(e.target.value)}
                  >
                    <option value="">— kies bondteam —</option>
                    {BONDTEAMS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </InputBlock>

                <InputBlock label="Matchmaker" required icon={<UserRound size={14} />}>
                  <input
                    className={inputBaseClass()}
                    value={matchmaker}
                    onChange={(e) => setMatchmaker(e.target.value)}
                    placeholder="Naam matchmaker"
                  />
                </InputBlock>

                <InputBlock label="Promotor" icon={<UserRound size={14} />}>
                  <input
                    className={inputBaseClass()}
                    value={promotor}
                    onChange={(e) => setPromotor(e.target.value)}
                    placeholder="Naam promotor"
                  />
                </InputBlock>

                <InputBlock label="Locatie" icon={<MapPin size={14} />}>
                  <input
                    className={inputBaseClass()}
                    value={plaats}
                    onChange={(e) => setPlaats(e.target.value)}
                    placeholder="Bijvoorbeeld: Amersfoort"
                  />
                </InputBlock>
              </div>

              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "inset 0 1px 0 rgba(0,0,0,0.45)",
                }}
              >
                <div className={labelTextClass()}>
                  Bestand <span style={{ color: "#ff6b35" }}>*</span>
                </div>

                <label
                  style={{
                    display: "block",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.18) 100%)",
                    padding: 10,
                    cursor: "pointer",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.35)",
                  }}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    style={{ display: "none" }}
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 50,
                        height: 44,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        border: "1px solid #7b2500",
                        background:
                          "linear-gradient(180deg, #ff4d00 0%, #e04400 50%, #8a2600 100%)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 12px rgba(255,77,0,0.14)",
                      }}
                    >
                      <Upload size={20} strokeWidth={2.3} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: "#f1f1f1",
                          textShadow: "0 3px 5px rgba(0,0,0,0.8)",
                        }}
                      >
                        Selecteer Excel bestand
                      </div>
                      <div style={{ marginTop: 3, fontSize: 11.5, color: "rgba(255,255,255,0.68)" }}>
                        Toegestaan: .xlsx en .xls
                      </div>
                    </div>
                  </div>
                </label>

                <div
                  style={{
                    marginTop: 6,
                    minHeight: 16,
                    fontSize: 12,
                    color: file ? "#ffffff" : "rgba(255,255,255,0.58)",
                  }}
                >
                  {file ? `Gekozen bestand: ${file.name}` : "Nog geen bestand geselecteerd."}
                </div>

                <div style={{ marginTop: 10 }}>
                  <SteelActionButton
                    label={busy ? "Bezig..." : "Upload naar controle"}
                    onClick={onUpload}
                    disabled={busy || !isAdmin}
                  />
                </div>
              </div>
            </div>
          </SteelFrame>

          <SteelFrame>
            <div className="fs-panel-fill" style={{ ...darkPlate, padding: "12px 14px" }}>
              <OrangeHotspot left={18} bottom={10} width={50} />
              <OrangeHotspot right={34} top={12} width={30} small variant={2} />
              <CardChromeOverlay />

              <SectionHeader
                icon={<FileSpreadsheet size={22} strokeWidth={2.2} />}
                title="Excel template"
                subtitle="Gebruik het juiste template voor een correcte upload naar FightSupport."
              />

              <div
                style={{
                  marginTop: 12,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.18) 100%)",
                    padding: "12px 12px 10px",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.35)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    Zo werkt het
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "#e2e2e2",
                    }}
                  >
                    <p>
                      Voor een correcte upload naar <strong style={{ color: "#fff" }}>FightSupport</strong> gebruik je altijd het officiële template.
                    </p>
                    <p style={{ marginTop: 10 }}>
                      Download eerst het template. Dit bestand komt automatisch in je downloadmap te staan.
                    </p>
                    <p style={{ marginTop: 10 }}>
                      Vul daarna jouw matchmakinggegevens in, sla het bestand op en upload het vervolgens in het vak hiernaast.
                    </p>
                    <p style={{ marginTop: 10 }}>
                      Zo weet je zeker dat de kolommen goed staan en dat de upload correct verwerkt kan worden.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(0,0,0,0.16) 100%)",
                    padding: "12px 12px 10px",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.35)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    Download template
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: "#d7d7d7",
                    }}
                  >
                    Gebruik deze knop om direct het juiste Excel template te downloaden.
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <Link href="/templates/fightsupport-upload.xlsx" target="_blank">
                      <button
                        type="button"
                        className="fs-metal-button"
                        style={{
                          width: "100%",
                          height: 40,
                          border: "1px solid #8f8f8f",
                          background: `
                            linear-gradient(180deg,
                              #ffffff 0%,
                              #eaeaea 12%,
                              #cfcfcf 25%,
                              #ffffff 40%,
                              #9a9a9a 70%,
                              #f0f0f0 100%)
                          `,
                          color: "#131313",
                          fontSize: 14,
                          fontWeight: 900,
                          boxShadow: `
                            inset 0 2px 1px rgba(255,255,255,1),
                            inset 0 -3px 2px rgba(0,0,0,0.6),
                            0 5px 12px rgba(0,0,0,0.38)
                          `,
                          cursor: "pointer",
                          textShadow: "0 1px 0 rgba(255,255,255,0.34)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <Download size={15} />
                        Download template
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </SteelFrame>
        </div>

        {melding && (
          <div style={{ marginTop: 10 }}>
            <SteelFrame>
              <div
                style={{
                  ...darkPlate,
                  padding: "11px 14px",
                  color: "#f3f3f3",
                  whiteSpace: "pre-wrap",
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                {melding}
              </div>
            </SteelFrame>
          </div>
        )}
      </div>
    </main>
  );
}

function TopLogoBand() {
  return (
    <div
      style={{
        ...sectionRule(true),
        position: "relative",
        display: "flex",
        justifyContent: "center",
        paddingTop: 0,
        paddingBottom: 0,
        background: `
          radial-gradient(circle at 50% 50%, rgba(255,115,20,0.10) 0%, rgba(255,115,20,0.03) 16%, rgba(0,0,0,0) 34%),
          linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)
        `,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(circle at 50% 96%, rgba(255,95,0,0.30), transparent 8%),
            radial-gradient(circle at 18% 26%, rgba(255,110,20,0.05), transparent 15%),
            radial-gradient(circle at 82% 24%, rgba(255,110,20,0.05), transparent 15%)
          `,
        }}
      />

      <div
        style={{
          position: "relative",
          width: 1080,
          height: 72,
          maxWidth: "96vw",
          filter:
            "drop-shadow(0 10px 18px rgba(0,0,0,0.70)) drop-shadow(0 0 16px rgba(255,95,0,0.12))",
          boxShadow: `
            inset 0 -10px 24px rgba(0,0,0,0.42),
            inset 0 5px 14px rgba(255,255,255,0.04)
          `,
        }}
      >
        <Image
          src={logoSrc}
          alt="FightSupport"
          fill
          priority
          className="object-contain"
          style={{ objectFit: "contain", transform: "scaleX(1.24)" }}
        />
      </div>
    </div>
  );
}

function TitleBand({
  title,
  subtitle,
  email,
  actionLabel,
  actionIcon,
  onAction,
}: {
  title: string;
  subtitle: string;
  email: string;
  actionLabel: string;
  actionIcon?: ReactNode;
  onAction: () => void | Promise<void>;
}) {
  return (
    <div
      style={{
        ...sectionRule(),
        position: "relative",
        background: `
          linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 10%, rgba(0,0,0,0.04) 100%),
          linear-gradient(180deg, #171b21 0%, #0a0d12 50%, #161a20 100%)
        `,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.06),
          inset 0 -1px 0 rgba(255,255,255,0.03),
          0 8px 14px rgba(0,0,0,0.34)
        `,
      }}
    >
      <div
        className="fs-hotspot"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: -4,
          width: 140,
          height: 8,
          background:
            "radial-gradient(circle, rgba(255,98,0,1) 0%, rgba(255,98,0,0.55) 34%, rgba(255,98,0,0) 72%)",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="title-row"
        style={{
          position: "relative",
          maxWidth: 1400,
          margin: "0 auto",
          padding: "8px 16px",
          minHeight: 70,
        }}
      >
        <div
          className="title-actions-wrap"
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <HeaderSilverButton label={actionLabel} icon={actionIcon} onClick={onAction} />
        </div>

        <div className="title-center" style={{ textAlign: "center", paddingTop: 0 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 1,
              lineHeight: 1,
              color: "#ececec",
              textTransform: "uppercase",
              textShadow:
                "0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(0,0,0,0.82)",
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 8,
              letterSpacing: 2.3,
              color: NVB_ORANGE,
              textTransform: "uppercase",
              textShadow: "0 0 8px rgba(255,106,0,0.28)",
            }}
          >
            {subtitle}
          </div>

          <div style={{ marginTop: 5, fontSize: 10.5, color: "rgba(255,255,255,0.68)" }}>
            Ingelogd als <span style={{ color: "#ffffff", fontWeight: 700 }}>{email}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SteelFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: "100%" }}>
      <div style={{ ...steelFrameOuter, height: "100%" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `
              linear-gradient(120deg, rgba(255,255,255,0.46) 0%, rgba(255,255,255,0.10) 12%, transparent 23%),
              linear-gradient(300deg, rgba(255,255,255,0.20) 0%, transparent 22%),
              linear-gradient(180deg, rgba(0,0,0,0.26), transparent 40%)
            `,
            mixBlendMode: "screen",
          }}
        />
        <div style={{ ...steelFrameMid, height: "100%" }}>
          <div style={{ ...steelFrameChannel, height: "100%" }}>
            <div style={{ ...steelFrameInner, height: "100%" }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div
        style={{
          width: 64,
          height: 54,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          border: "1px solid #7b2500",
          background: "linear-gradient(180deg, #ff4d00 0%, #e04400 50%, #8a2600 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 12px rgba(255,77,0,0.14)",
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0, flex: 1, paddingTop: 1 }}>
        <div
          style={{
            fontSize: 19,
            fontWeight: 900,
            lineHeight: 1,
            color: "#f1f1f1",
            textShadow: "0 3px 5px rgba(0,0,0,0.8)",
          }}
        >
          {title}
        </div>

        <div
          style={{
            width: "100%",
            height: 1,
            marginTop: 7,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08), transparent)",
          }}
        />

        <div style={{ marginTop: 7, fontSize: 11.5, color: "#d7d7d7", lineHeight: 1.25 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function InputBlock({
  label,
  required = false,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <div className={labelTextClass()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon ? <span style={{ color: NVB_ORANGE }}>{icon}</span> : null}
        <span>
          {label} {required ? <span style={{ color: "#ff6b35" }}>*</span> : null}
        </span>
      </div>
      {children}
    </label>
  );
}

function SteelActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fs-metal-button"
      style={{
        width: "100%",
        height: 36,
        border: "1px solid #8f8f8f",
        background: `
          linear-gradient(180deg,
            #ffffff 0%,
            #eaeaea 12%,
            #cfcfcf 25%,
            #ffffff 40%,
            #9a9a9a 70%,
            #f0f0f0 100%)
        `,
        color: "#131313",
        fontSize: 14,
        fontWeight: 900,
        boxShadow: `
          inset 0 2px 1px rgba(255,255,255,1),
          inset 0 -3px 2px rgba(0,0,0,0.6),
          0 5px 12px rgba(0,0,0,0.38)
        `,
        cursor: disabled ? "not-allowed" : "pointer",
        textShadow: "0 1px 0 rgba(255,255,255,0.34)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function HeaderSilverButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fs-metal-button"
      style={{
        minWidth: 138,
        height: 36,
        border: "1px solid rgba(185,185,185,0.95)",
        background: `
          linear-gradient(180deg,
            #ffffff 0%,
            #f3f3f3 10%,
            #d7d7d7 24%,
            #fcfcfc 42%,
            #bcbcbc 72%,
            #efefef 100%)
        `,
        color: "#121212",
        fontSize: 14,
        fontWeight: 900,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,1),
          inset 0 -2px 2px rgba(0,0,0,0.40),
          0 4px 10px rgba(0,0,0,0.28)
        `,
        cursor: "pointer",
        textShadow: "0 1px 0 rgba(255,255,255,0.55)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 16px",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function OrangeHotspot({
  left,
  right,
  top,
  bottom,
  width,
  small = false,
  variant = 1,
}: {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  width: number;
  small?: boolean;
  variant?: 1 | 2 | 3;
}) {
  const extraClass =
    variant === 2 ? "fs-hotspot fs-hotspot-2" : variant === 3 ? "fs-hotspot fs-hotspot-3" : "fs-hotspot";

  return (
    <div
      className={extraClass}
      style={{
        position: "absolute",
        left,
        right,
        top,
        bottom,
        width,
        height: small ? 7 : 9,
        background:
          "radial-gradient(circle, rgba(255,98,0,1) 0%, rgba(255,98,0,0.55) 34%, rgba(255,98,0,0) 72%)",
        filter: "blur(1.5px)",
        pointerEvents: "none",
      }}
    />
  );
}

function CardChromeOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `
          linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.015) 15%, transparent 26%),
          linear-gradient(315deg, rgba(255,255,255,0.03) 0%, transparent 22%)
        `,
      }}
    />
  );
}
