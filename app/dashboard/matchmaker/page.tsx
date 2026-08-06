"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  Menu,
  Scale,
  ShieldAlert,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

const logoSrc = "/branding/fightsupport/excel-logo.png";
const iconSrc = "/branding/fightsupport/icon.png";
const NVB_ORANGE = "#ff4d00";

type MenuAction = {
  title: string;
  description: string;
  href?: string;
  external?: string;
  icon: LucideIcon;
};

function normalizeRole(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export default function MatchmakerDashboardPage() {
  const router = useRouter();
  const { user, roles, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const normalizedRoles = useMemo(
    () => (roles ?? []).map(normalizeRole).filter(Boolean),
    [roles],
  );

  const isMatchmaker = normalizedRoles.includes("matchmaker");
  const isAdmin = normalizedRoles.includes("admin");
  const isSuperadmin = normalizedRoles.includes("superadmin");
  const mayOpenMatchmakerPortal = isMatchmaker || isAdmin || isSuperadmin;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!mayOpenMatchmakerPortal) {
      router.replace("/dashboard");
    }
  }, [loading, mayOpenMatchmakerPortal, router, user]);

  const actions: MenuAction[] = [
    {
      title: "Matchmaking",
      description: "Nieuwe matchmaking bouwen, bestaande matchmakings openen en inschrijvingen verwerken.",
      href: "/dashboard/matchmaker/matchmaking",
      icon: ClipboardList,
    },
    {
      title: "FightPassport",
      description: "Open FightPassport voor controles, vechtersgegevens en wedstrijdhistorie.",
      external: "https://fightpassport.nl/",
      icon: Users,
    },
    {
      title: "Overtredingen melden",
      description: "Overtredingen, incidenten en bijzonderheden aan de bond doorgeven.",
      href: "/dashboard/matchmaker/overtreding-melden",
      icon: Trophy,
    },
    {
      title: "Dispensatie aanvragen",
      description: "Open het dispensatieformulier voor een partij die aanvullende toestemming vereist.",
      external: "https://form.jotform.com/252374582262055",
      icon: FileText,
    },
    {
      title: "Licentie verlengen",
      description: "Vraag verlenging van de matchmakerlicentie aan.",
      external: "https://form.jotform.com/253623147570355",
      icon: Award,
    },
    {
      title: "Belgische clubs",
      description: "Controleer Belgische clubs, sportscholen en keurmerken.",
      external: "https://www.bkbmo.be/clubs-in-belgie",
      icon: Scale,
    },
  ];

  function openItem(item: MenuAction) {
    if (item.href) router.push(item.href);
    if (item.external) window.open(item.external, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return <CenteredMessage text="Bezig met laden..." />;
  }

  if (!user || !mayOpenMatchmakerPortal) return null;

  return (
    <main className="fs-page">
      <GlobalStyles />

      <button
        type="button"
        className="fs-mobile-menu-button"
        onClick={() => setMobileNavOpen((value) => !value)}
        aria-label="Navigatie openen"
      >
        {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <Sidebar
        open={mobileNavOpen}
        onNavigate={(href) => {
          setMobileNavOpen(false);
          router.push(href);
        }}
      />

      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Navigatie sluiten"
          className="fs-mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="fs-shell">
        <Header onDashboard={() => router.push("/dashboard")} />

        <div className="fs-content">
          <section className="fs-status-strip" aria-label="Matchmakerportaal overzicht">
            <StatusItem icon={ClipboardList} value="1" label="Matchmaking" sublabel="Bouwen en beheren" />
            <StatusItem icon={Users} value="6" label="Onderdelen" sublabel="Direct bereikbaar" />
            <StatusItem icon={CalendarDays} value="Live" label="Werkportaal" sublabel="Matchmakerfuncties" />
            <StatusItem
              icon={ShieldAlert}
              value={isSuperadmin ? "Super" : isAdmin ? "Admin" : "Match"}
              label="Toegang"
              sublabel={isMatchmaker ? "Matchmaker" : "Beheer"}
            />
          </section>

          <section className="fs-section">
            <SectionHeading
              title="Matchmaker"
              subtitle="Matchmakings, controles, formulieren en externe bronnen"
            />

            <div className="fs-card-grid">
              {actions.map((item) => (
                <ModuleCard key={item.title} item={item} onOpen={() => openItem(item)} />
              ))}
            </div>
          </section>

          <footer className="fs-footer">© FIGHTSUPPORT · MATCHMAKER PORTAAL</footer>
        </div>
      </div>
    </main>
  );
}

function Sidebar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate: (href: string) => void;
}) {
  const items: Array<{ label: string; href: string; icon: LucideIcon; active?: boolean }> = [
    { label: "Matchmaker", href: "/dashboard/matchmaker", icon: Home, active: true },
    { label: "Matchmaking", href: "/dashboard/matchmaker/matchmaking", icon: ClipboardList },
    { label: "Overtredingen", href: "/dashboard/matchmaker/overtreding-melden", icon: Trophy },
  ];

  return (
    <aside className={`fs-sidebar${open ? " fs-sidebar-open" : ""}`}>
      <button
        type="button"
        className="fs-brand-mark"
        onClick={() => onNavigate("/dashboard/matchmaker")}
        aria-label="FightSupport matchmaker"
      >
        <span className="fs-brand-icon-wrap">
          <Image
            src={iconSrc}
            alt="FightSupport"
            fill
            priority
            sizes="72px"
            style={{ objectFit: "contain" }}
          />
        </span>
      </button>

      <nav className="fs-sidebar-nav" aria-label="Matchmaker navigatie">
        {items.map((item) => (
          <button
            type="button"
            key={item.label}
            className={`fs-nav-item${item.active ? " fs-nav-active" : ""}`}
            onClick={() => onNavigate(item.href)}
          >
            <item.icon size={25} strokeWidth={2.1} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="fs-sidebar-bottom">
        <ChevronDown size={19} />
      </div>
    </aside>
  );
}

function Header({ onDashboard }: { onDashboard: () => void }) {
  return (
    <header className="fs-header">
      <div className="fs-header-metal" aria-hidden="true" />

      <div className="fs-logo-wrap">
        <Image src={logoSrc} alt="FightSupport" fill priority style={{ objectFit: "contain" }} />
      </div>

      <div className="fs-title-band">
        <div className="fs-title-center">
          <h1>Matchmaker Portaal</h1>
          <p>Inschrijvingen, matchmakings en controle</p>
        </div>

        <button type="button" className="fs-dark-header-button" onClick={onDashboard}>
          <ArrowLeft size={18} />
          <span>Terug naar dashboard</span>
        </button>
      </div>
    </header>
  );
}

function StatusItem({
  icon: Icon,
  value,
  label,
  sublabel,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="fs-status-item">
      <div className="fs-status-icon">
        <Icon size={25} strokeWidth={2.05} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{sublabel}</small>
      </div>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="fs-section-heading">
      <h2>{title}</h2>
      {subtitle ? <span>{subtitle}</span> : null}
    </div>
  );
}

function ModuleCard({
  item,
  onOpen,
}: {
  item: MenuAction;
  onOpen: () => void;
}) {
  const Icon = item.icon;

  return (
    <article className="fs-module-card">
      <button type="button" className="fs-module-click" onClick={onOpen}>
        <span className="fs-card-top-glow" aria-hidden="true" />
        <div className="fs-silver-icon">
          <Icon size={27} strokeWidth={2.05} />
        </div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <span className="fs-card-open">
          Openen <ChevronRight size={16} />
        </span>
      </button>
    </article>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <main className="fs-page fs-centered-page">
      <GlobalStyles />
      <div className="fs-loading-card">{text}</div>
    </main>
  );
}

function GlobalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        :root {
          --fs-orange: ${NVB_ORANGE};
          --fs-sidebar-width: 118px;
          --fs-silver: #d9dde2;
          --fs-silver-dark: #7d848d;
        }

        * { box-sizing: border-box; }
        html, body { margin: 0; background: #020304; }
        button { font: inherit; }

        .fs-page {
          min-height: 100vh;
          color: #f4f4f4;
          background:
            radial-gradient(circle at 50% 0%, rgba(210,216,224,.10), transparent 25%),
            radial-gradient(circle at 52% 100%, rgba(255,77,0,.045), transparent 28%),
            linear-gradient(180deg, #07090b 0%, #020304 54%, #07090b 100%);
        }

        .fs-shell {
          margin-left: var(--fs-sidebar-width);
          min-height: 100vh;
        }

        .fs-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 40;
          width: var(--fs-sidebar-width);
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(225,228,232,.52);
          background:
            linear-gradient(90deg, rgba(255,255,255,.05), transparent 36%),
            linear-gradient(180deg, #11151a, #040608 70%, #0d1014);
          box-shadow:
            10px 0 28px rgba(0,0,0,.52),
            inset -1px 0 rgba(255,255,255,.16),
            inset -4px 0 14px rgba(190,196,204,.08);
        }

        .fs-brand-mark {
          height: 122px;
          border: 0;
          border-bottom: 1px solid rgba(255,255,255,.18);
          background: transparent;
          cursor: pointer;
          display: grid;
          place-items: center;
        }

        .fs-brand-icon-wrap {
          position: relative;
          width: 76px;
          height: 76px;
          display: block;
          filter:
            drop-shadow(0 8px 14px rgba(0,0,0,.62))
            drop-shadow(0 0 9px rgba(220,225,232,.16));
        }

        .fs-sidebar-nav { flex: 1; }

        .fs-nav-item {
          position: relative;
          width: 100%;
          min-height: 92px;
          border: 0;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: transparent;
          color: #d7dade;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .fs-nav-item:hover {
          color: #fff;
          background: linear-gradient(90deg, rgba(255,255,255,.07), transparent);
        }

        .fs-nav-active {
          color: var(--fs-orange);
          background:
            linear-gradient(90deg, rgba(255,77,0,.11), rgba(255,255,255,.04));
        }

        .fs-nav-active::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--fs-orange);
          box-shadow: 0 0 14px rgba(255,77,0,.68);
        }

        .fs-sidebar-bottom {
          height: 76px;
          display: grid;
          place-items: center;
          color: #ddd;
        }

        .fs-sidebar-bottom svg {
          width: 38px;
          height: 38px;
          padding: 9px;
          border: 1px solid rgba(225,228,232,.44);
          border-radius: 50%;
          background: linear-gradient(180deg, #171b20, #080a0d);
        }

        .fs-header {
          position: relative;
          border-bottom: 1px solid rgba(225,228,232,.22);
          background: #07090b;
          box-shadow: 0 14px 30px rgba(0,0,0,.42);
        }

        .fs-header-metal {
          position: absolute;
          inset: 0 0 auto;
          height: 128px;
          pointer-events: none;
          background:
            linear-gradient(118deg, transparent 0 7%, rgba(255,255,255,.22) 8%, rgba(255,255,255,.06) 20%, transparent 34%),
            linear-gradient(242deg, transparent 0 7%, rgba(255,255,255,.18) 8%, rgba(255,255,255,.05) 20%, transparent 34%),
            repeating-linear-gradient(103deg, rgba(255,255,255,.035) 0 1px, transparent 1px 5px),
            linear-gradient(180deg, #333941 0%, #101318 48%, #252a31 100%);
          border-bottom: 1px solid rgba(255,255,255,.20);
          box-shadow:
            inset 0 1px rgba(255,255,255,.14),
            inset 0 -16px 26px rgba(0,0,0,.52);
        }

        .fs-header-metal::after {
          content: "";
          position: absolute;
          left: 5%;
          right: 5%;
          bottom: 20px;
          height: 1px;
          background:
            linear-gradient(90deg, transparent, #aeb4bc 16%, #f7f8fa 50%, #aeb4bc 84%, transparent);
          box-shadow:
            0 0 8px rgba(220,225,232,.42),
            0 0 12px rgba(255,77,0,.20);
        }

        .fs-logo-wrap {
          position: relative;
          z-index: 2;
          width: min(980px, 78vw);
          height: 124px;
          margin: 0 auto;
          filter:
            drop-shadow(0 10px 15px rgba(0,0,0,.75))
            drop-shadow(0 0 12px rgba(220,225,232,.12));
        }

        .fs-title-band {
          position: relative;
          z-index: 3;
          min-height: 82px;
          display: grid;
          place-items: center;
          padding: 10px 230px 12px;
          background:
            radial-gradient(circle at 50% 100%, rgba(255,77,0,.20), transparent 12%),
            linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.015)),
            linear-gradient(180deg, #20252c, #0b0e12 55%, #1b2026);
          border-top: 1px solid rgba(255,255,255,.08);
          border-bottom: 1px solid rgba(220,225,232,.16);
        }

        .fs-title-center { text-align: center; }

        .fs-title-center h1 {
          margin: 0;
          font-size: clamp(27px, 2.4vw, 38px);
          line-height: 1;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #f1f2f4;
          text-shadow:
            0 1px rgba(255,255,255,.30),
            0 5px 12px rgba(0,0,0,.88);
        }

        .fs-title-center p {
          margin: 8px 0 0;
          color: var(--fs-orange);
          text-transform: uppercase;
          letter-spacing: 3.2px;
          font-size: 10px;
          font-weight: 850;
        }

        .fs-dark-header-button {
          position: absolute;
          right: 28px;
          top: 50%;
          transform: translateY(-50%);
          height: 44px;
          min-width: 190px;
          border: 1px solid rgba(220,225,232,.70);
          background:
            linear-gradient(180deg, #242a31, #090b0e 66%, #1b2026);
          color: #f2f3f4;
          box-shadow:
            inset 0 1px rgba(255,255,255,.13),
            0 5px 12px rgba(0,0,0,.40);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 900;
        }

        .fs-dark-header-button:hover {
          border-color: var(--fs-orange);
          box-shadow:
            0 0 14px rgba(255,77,0,.14),
            inset 0 1px rgba(255,255,255,.18);
        }

        .fs-content {
          width: min(1440px, calc(100% - 34px));
          margin: 0 auto;
          padding: 24px 0 22px;
        }

        .fs-status-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border: 1px solid rgba(220,224,229,.62);
          background:
            linear-gradient(120deg, rgba(255,255,255,.075), transparent 18%),
            linear-gradient(180deg, #20252b, #090b0e 70%, #171b20);
          box-shadow:
            inset 0 1px rgba(255,255,255,.14),
            inset 0 -1px rgba(0,0,0,.82),
            0 12px 28px rgba(0,0,0,.36);
        }

        .fs-status-item {
          min-height: 72px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 14px;
          border-right: 1px solid rgba(225,228,232,.18);
        }

        .fs-status-item:last-child { border-right: 0; }

        .fs-status-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: grid;
          place-items: center;
          color: #f0f1f2;
          border: 1px solid rgba(235,238,242,.50);
          clip-path: polygon(50% 0, 91% 22%, 91% 78%, 50% 100%, 9% 78%, 9% 22%);
          background:
            linear-gradient(145deg, rgba(255,255,255,.16), transparent 32%),
            linear-gradient(160deg, #606872, #242a31 35%, #090b0e 70%, #3b424b);
          box-shadow:
            inset 0 1px rgba(255,255,255,.24),
            0 0 0 1px rgba(255,255,255,.08);
        }

        .fs-status-item strong {
          display: block;
          font-size: 22px;
          line-height: 1;
          color: #f1f2f3;
        }

        .fs-status-item span {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 900;
        }

        .fs-status-item small {
          display: block;
          margin-top: 3px;
          color: #c8cbd0;
          font-size: 10px;
        }

        .fs-section { margin-top: 18px; }

        .fs-section-heading {
          display: flex;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(220,225,232,.28);
        }

        .fs-section-heading h2 {
          margin: 0;
          color: #eef0f2;
          text-transform: uppercase;
          font-size: 20px;
          letter-spacing: .7px;
        }

        .fs-section-heading span {
          color: var(--fs-orange);
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 850;
        }

        .fs-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .fs-module-card {
          position: relative;
          min-width: 0;
          min-height: 186px;
          border: 1px solid rgba(225,228,232,.62);
          background:
            linear-gradient(120deg, rgba(255,255,255,.09), transparent 20%),
            linear-gradient(180deg, #20242a, #090b0e 66%, #171b20);
          box-shadow:
            inset 0 1px rgba(255,255,255,.18),
            inset 0 -1px rgba(0,0,0,.86),
            inset 1px 0 rgba(255,255,255,.06),
            0 10px 20px rgba(0,0,0,.38);
          transition:
            transform 170ms ease,
            border-color 170ms ease,
            box-shadow 170ms ease;
        }

        .fs-module-card::before,
        .fs-module-card::after {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          pointer-events: none;
        }

        .fs-module-card::before {
          left: -1px;
          top: -1px;
          border-left: 2px solid #eef0f2;
          border-top: 2px solid #eef0f2;
          filter: drop-shadow(0 0 4px rgba(220,225,232,.28));
        }

        .fs-module-card::after {
          right: -1px;
          bottom: -1px;
          border-right: 2px solid #8f969f;
          border-bottom: 2px solid #8f969f;
        }

        .fs-module-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255,77,0,.72);
          box-shadow:
            0 0 16px rgba(255,77,0,.10),
            0 15px 25px rgba(0,0,0,.48),
            inset 0 1px rgba(255,255,255,.22);
        }

        .fs-module-click {
          width: 100%;
          min-height: inherit;
          padding: 14px 14px 12px;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .fs-card-top-glow {
          position: absolute;
          top: -3px;
          left: 27%;
          right: 27%;
          height: 8px;
          background:
            radial-gradient(circle, rgba(244,246,248,.95), rgba(184,190,198,.30) 42%, transparent 76%);
          filter: blur(1.5px);
          opacity: .48;
        }

        .fs-silver-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          margin-bottom: 9px;
          color: #f5f6f7;
          clip-path: polygon(50% 0, 89% 21%, 89% 79%, 50% 100%, 11% 79%, 11% 21%);
          border: 1px solid rgba(240,243,246,.62);
          background:
            linear-gradient(145deg, rgba(255,255,255,.28), transparent 29%),
            linear-gradient(160deg, #7c858f 0%, #30363d 33%, #0a0c0f 68%, #4a515a 100%);
          box-shadow:
            inset 0 1px rgba(255,255,255,.38),
            inset 0 -1px rgba(0,0,0,.66),
            0 0 0 1px rgba(255,255,255,.10),
            0 0 12px rgba(220,225,232,.12);
          text-shadow: 0 2px 3px #000;
        }

        .fs-module-card h3 {
          margin: 0;
          min-height: 28px;
          display: grid;
          place-items: center;
          color: #f1f2f3;
          font-size: 14px;
          line-height: 1.15;
          text-transform: uppercase;
          font-weight: 900;
        }

        .fs-module-card p {
          margin: 7px 0 10px;
          color: #cdd0d4;
          font-size: 10px;
          line-height: 1.45;
          flex: 1;
        }

        .fs-card-open {
          width: 100%;
          min-height: 32px;
          border: 1px solid rgba(225,228,232,.36);
          background:
            linear-gradient(180deg, #22272d, #080a0d 68%, #171b20);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: var(--fs-orange);
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 900;
          transition: border-color 150ms ease, background 150ms ease;
        }

        .fs-module-card:hover .fs-card-open {
          border-color: rgba(255,77,0,.78);
          background:
            linear-gradient(180deg, #272d34, #0c0f13 68%, #1c2127);
        }

        .fs-footer {
          margin-top: 20px;
          padding: 12px;
          text-align: center;
          border-top: 1px solid rgba(225,228,232,.18);
          color: rgba(255,255,255,.42);
          font-size: 9px;
          letter-spacing: 2px;
        }

        .fs-mobile-menu-button,
        .fs-mobile-overlay { display: none; }

        .fs-centered-page {
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .fs-loading-card {
          border: 1px solid rgba(225,228,232,.68);
          background:
            linear-gradient(120deg, rgba(255,255,255,.08), transparent 25%),
            linear-gradient(180deg, #20252b, #080a0d);
          box-shadow: 0 18px 36px rgba(0,0,0,.55);
          padding: 28px 34px;
          text-align: center;
          font-weight: 800;
        }

        @media (max-width: 1080px) {
          .fs-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .fs-title-band { padding-left: 180px; padding-right: 180px; }
          .fs-dark-header-button { min-width: 155px; }
          .fs-dark-header-button span { display: none; }
        }

        @media (max-width: 720px) {
          :root { --fs-sidebar-width: 0px; }

          .fs-shell { margin-left: 0; }

          .fs-sidebar {
            width: 112px;
            transform: translateX(-102%);
            transition: transform 180ms ease;
          }

          .fs-sidebar-open { transform: translateX(0); }

          .fs-mobile-menu-button {
            display: grid;
            place-items: center;
            position: fixed;
            z-index: 60;
            left: 12px;
            top: 12px;
            width: 42px;
            height: 42px;
            border: 1px solid rgba(225,228,232,.65);
            background: #0b0d10;
            color: #fff;
            cursor: pointer;
          }

          .fs-mobile-overlay {
            display: block;
            position: fixed;
            z-index: 30;
            inset: 0;
            border: 0;
            background: rgba(0,0,0,.68);
          }

          .fs-logo-wrap { width: 92vw; height: 82px; }
          .fs-header-metal { height: 84px; }
          .fs-title-band { padding: 72px 12px 16px; }

          .fs-dark-header-button {
            top: 15px;
            right: 12px;
            transform: none;
            min-width: 0;
            width: 44px;
            padding: 0;
          }

          .fs-content { width: calc(100% - 20px); padding-top: 12px; }
          .fs-status-strip { grid-template-columns: 1fr; }
          .fs-status-item { border-right: 0; border-bottom: 1px solid rgba(255,255,255,.10); }
          .fs-status-item:last-child { border-bottom: 0; }
          .fs-card-grid { grid-template-columns: 1fr; }
          .fs-module-card { min-height: 178px; }
        }
      `,
      }}
    />
  );
}
