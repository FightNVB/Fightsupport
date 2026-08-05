"use client";

import React, { useEffect, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Archive,
  CalendarDays,
  Camera,
  ChevronRight,
  Cog,
  GitBranch,
  Link2,
  MessageSquare,
  School,
  Settings,
  ShieldAlert,
  UserMinus,
  UsersRound,
} from "lucide-react";

const logoSrc = "/branding/fightsupport/excel-logo.png";
const NVB_ORANGE = "#ff4d00";

const pageBackground: CSSProperties = {
  minHeight: "100vh",
  color: "#fff",
  background: `
    radial-gradient(circle at 50% 0%, rgba(255,104,20,0.10) 0%, rgba(255,104,20,0.03) 12%, rgba(0,0,0,0) 25%),
    linear-gradient(180deg, #030405 0%, #06080b 18%, #010203 100%)
  `,
};

const sectionRule: CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.05)",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.82)",
};

type ListItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
};

type ListSection = {
  title: string;
  description: string;
  items: ListItem[];
};

const sections: ListSection[] = [
  {
    title: "Beheer",
    description: "Accounts, sportscholen, planning en interne administratie.",
    items: [
      { title: "Gebruikersbeheer", description: "Accounts aanvragen, gebruikers toevoegen en toegang beheren.", href: "/dashboard/admin/beheer/accounts-beheer", icon: Settings },
      { title: "Agenda", description: "Evenementen en geplande activiteiten bekijken en beheren.", href: "/dashboard/admin/beheer/agenda", icon: CalendarDays },
      { title: "Sportschoolmeldingen", description: "Wijzigingsverzoeken en meldingen van trainers verwerken.", href: "/dashboard/admin/beheer/sportschool-meldingen", icon: MessageSquare },
      { title: "Talentstatus", description: "Talentstatusdossiers, vechters, partijen en rapportages beheren.", href: "/dashboard/admin/beheer/talentstatus", icon: Link2 },
      { title: "Contactpersonen", description: "Trainer-logins koppelen en Fightcrew-toegang klaarzetten.", href: "/dashboard/admin/beheer/sportscholen/contactpersonen", icon: UsersRound },
      { title: "Sportschooldatabase", description: "Sportschoolnamen, aliassen en databasekoppelingen beheren.", href: "/dashboard/admin/beheer/sportscholen/aliases", icon: School },
      { title: "Logboek / Audit", description: "Belangrijke acties, wijzigingen en systeemgebeurtenissen terugvinden.", href: "/dashboard/admin/audit", icon: Cog },
    ],
  },
  {
    title: "Algemeen",
    description: "Matchmakings, afmeldingen, archief, sancties en historische gegevens.",
    items: [
      { title: "Matchmakingoverzicht", description: "Eigenaar, bondteam, stadium en status van matchmakings controleren.", href: "/dashboard/admin/algemeen/matchmakings", icon: GitBranch },
      { title: "FightPassport evenementen", description: "Evenementen uit FightPassport synchroniseren, beheren en bekijken.", href: "/dashboard/admin/evenementen", icon: CalendarDays },
      { title: "Afmeldingen", description: "Afmeldingen van vechters bekijken en administratief verwerken.", href: "/dashboard/admin/algemeen/afmeldingen", icon: UserMinus },
      { title: "Archief", description: "Afgeronde evenementen, partijen, rapporten en dossiers openen.", href: "/dashboard/admin/algemeen/archief", icon: Archive },
      { title: "Sancties & waarschuwingen", description: "Overtredingen, sancties, waarschuwingen en minpunten beheren.", href: "/dashboard/admin/algemeen/overtredingen", icon: ShieldAlert },
      { title: "Matchmaking-snapshots", description: "Opgeslagen versies van matchmakings terugzoeken en vergelijken.", href: "/dashboard/admin/algemeen/snapshots", icon: Camera },
    ],
  },
];

export default function AdministratiePortalPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) return <main style={pageBackground}><CenteredMessage>Bezig met laden...</CenteredMessage></main>;
  if (!user) return null;

  return (
    <main style={pageBackground}>
      <style jsx>{`
        .admin-list-row { transition: background 150ms ease, transform 120ms ease, border-color 150ms ease; }
        .admin-list-row:hover { background: rgba(255,255,255,0.075) !important; border-color: rgba(255,77,0,0.55) !important; transform: translateX(3px); }
        .metal-button { transition: transform 90ms ease, filter 120ms ease; }
        .metal-button:hover { filter: brightness(1.04); }
        .metal-button:active { transform: translateY(2px); }
        @media (max-width: 720px) {
          .title-row { display: flex !important; flex-direction: column !important; gap: 10px !important; }
          .header-action { position: static !important; transform: none !important; align-self: center; }
          .content-wrap { padding-left: 10px !important; padding-right: 10px !important; }
          .list-row-inner { padding: 11px 10px !important; }
          .list-description { font-size: 12px !important; }
        }
      `}</style>

      <TopLogoBand />
      <TitleBand onBack={() => router.push("/dashboard/admin")} />

      <div className="content-wrap" style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 16px 32px" }}>
        <div style={{ marginBottom: 16, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.12)", background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))", boxShadow: "0 10px 24px rgba(0,0,0,0.38)" }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Administratie</div>
          <div style={{ marginTop: 5, color: "#cfcfcf", lineHeight: 1.45, fontSize: 13 }}>
            Hier staan de onderdelen uit het oude <strong>Beheer</strong> en <strong>Algemeen</strong> bij elkaar. Kies direct de taak die je wilt uitvoeren; iedere regel opent de bestaande beheerpagina.
          </div>
        </div>

        {sections.map((section) => (
          <section key={section.title} style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, textTransform: "uppercase", letterSpacing: 0.8 }}>{section.title}</h2>
              <span style={{ color: NVB_ORANGE, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" }}>{section.description}</span>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "rgba(5,7,10,0.82)", boxShadow: "0 12px 26px rgba(0,0,0,0.42)" }}>
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    type="button"
                    className="admin-list-row"
                    onClick={() => router.push(item.href)}
                    style={{
                      width: "100%",
                      border: 0,
                      borderBottom: index < section.items.length - 1 ? "1px solid rgba(255,255,255,0.09)" : 0,
                      background: index % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.045)",
                      color: "#fff",
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div className="list-row-inner" style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) 28px", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                      <div style={{ width: 38, height: 38, display: "grid", placeItems: "center", background: "linear-gradient(180deg,#ff4d00,#a52e00)", border: "1px solid #7b2500", boxShadow: "inset 0 1px 0 rgba(255,255,255,.22)" }}>
                        <Icon size={20} strokeWidth={2.4} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 900 }}>{item.title}</div>
                        <div className="list-description" style={{ marginTop: 3, fontSize: 12.5, lineHeight: 1.35, color: "#cfcfcf" }}>{item.description}</div>
                      </div>
                      <ChevronRight size={20} color={NVB_ORANGE} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function TopLogoBand() {
  return (
    <div style={{ ...sectionRule, display: "flex", justifyContent: "center", background: "radial-gradient(circle at 50% 50%, rgba(255,115,20,0.10) 0%, rgba(255,115,20,0.03) 16%, transparent 34%)" }}>
      <div style={{ position: "relative", width: 1080, height: 58, maxWidth: "96vw", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.70))" }}>
        <Image src={logoSrc} alt="FightSupport" fill priority style={{ objectFit: "contain", transform: "scaleX(1.22)" }} />
      </div>
    </div>
  );
}

function TitleBand({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ ...sectionRule, position: "relative", background: "linear-gradient(180deg,#171b21 0%,#0a0d12 50%,#161a20 100%)" }}>
      <div className="title-row" style={{ position: "relative", maxWidth: 1400, minHeight: 74, margin: "0 auto", padding: "12px 16px", display: "grid", placeItems: "center" }}>
        <div className="header-action" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
          <MetalButton onClick={onBack}><ArrowLeft size={15} strokeWidth={2.8} /> Admin menu</MetalButton>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 25, fontWeight: 950, letterSpacing: 1, textTransform: "uppercase" }}>Administratie</div>
          <div style={{ marginTop: 5, fontSize: 9, letterSpacing: 2.4, color: NVB_ORANGE, textTransform: "uppercase" }}>Beheer en algemeen slim samengebracht</div>
        </div>
      </div>
    </div>
  );
}

function MetalButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="metal-button" style={{ minWidth: 138, height: 34, border: "1px solid #999", background: "linear-gradient(180deg,#fff,#d7d7d7 30%,#fff 48%,#aaa 76%,#eee)", color: "#111", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "inset 0 1px 0 #fff, inset 0 -2px 2px rgba(0,0,0,.45), 0 4px 10px rgba(0,0,0,.3)" }}>
      {children}
    </button>
  );
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontWeight: 800 }}>{children}</div>;
}
