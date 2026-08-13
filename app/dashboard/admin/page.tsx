"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";
import {
  Activity,
  Archive,
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  Building2,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Cog,
  FileText,
  GitBranch,
  Home,
  Link2,
  Menu,
  MessageSquare,
  Scale,
  School,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

const logoSrc = "/branding/fightsupport/excel-logo.png";
const iconSrc = "/branding/fightsupport/icon.png";
const NVB_ORANGE = "#ff4d00";

type UserProfileRow = {
  role: string | null;
  bondteam: string | null;
};

type PortalLink = {
  title: string;
  description: string;
  href?: string;
  external?: string;
  icon: LucideIcon;
  rootAdminOnly?: boolean;
};

type PortalSection = {
  title: string;
  subtitle: string;
  items: PortalLink[];
};

function normalizeRole(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function normalizeBondteam(value: unknown): string {
  if (value === null || value === undefined) return "";
  const normalized = String(value).trim().toUpperCase();
  return normalized === "NULL" ? "" : normalized;
}

async function fetchUserProfile(): Promise<UserProfileRow | null> {
  const response = await authedFetch("/api/me/profile", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    console.error("user_profiles laden mislukt", response.status, message);
    return null;
  }

  return (await response.json()) as UserProfileRow;
}

const primaryModules: PortalLink[] = [
  {
    title: "FightPaspoort Beheer",
    description: "Beheer FightPaspoort, synchronisatie en controles.",
    href: "/dashboard/admin/fightpassport-beheer",
    icon: Building2,
    rootAdminOnly: true,
  },
  {
    title: "Controle",
    description: "Matchmaking, rapportages en controleoverzicht.",
    href: "/dashboard/admin/controle",
    icon: Scale,
  },
  {
    title: "Statistieken",
    description: "FightPassport-statistieken voor vechters, sportscholen, bondteams, officials en evenementen.",
    href: "/dashboard/admin/fightpassport-statistieken",
    icon: BarChart3,
    rootAdminOnly: true,
  },
  {
    title: "Uitslagen verwerken",
    description: "Uitslagen beheren en uploaden naar FightPassport.",
    href: "/dashboard/admin/uitslagen/ready-to-upload",
    icon: Trophy,
    rootAdminOnly: true,
  },
  {
    title: "Formulieren",
    description: "Open het NVB-formulierenportaal.",
    external: "https://nvbformulieren.nl",
    icon: FileText,
    rootAdminOnly: true,
  },
  {
    title: "Doping Autoriteit",
    description: "Vechters, mailingen en certificaten beheren.",
    href: "/dashboard/admin/doping",
    icon: ShieldCheck,
    rootAdminOnly: true,
  },
];

const portalSections: PortalSection[] = [
  {
    title: "Beheer",
    subtitle: "Accounts, sportscholen, planning en interne administratie",
    items: [
      {
        title: "Gebruikersbeheer",
        description: "Accounts aanvragen, gebruikers toevoegen en toegang beheren.",
        href: "/dashboard/admin/beheer/accounts-beheer",
        icon: Settings,
      },
      {
        title: "Agenda",
        description: "Evenementen en geplande activiteiten bekijken en beheren.",
        href: "/dashboard/admin/beheer/agenda",
        icon: CalendarDays,
      },
      {
        title: "Sportschoolmeldingen",
        description: "Wijzigingsverzoeken en meldingen van trainers verwerken.",
        href: "/dashboard/admin/beheer/sportschool-meldingen",
        icon: MessageSquare,
      },
      {
        title: "Talentstatus",
        description: "Talentstatusdossiers, vechters, partijen en rapportages beheren.",
        href: "/dashboard/admin/beheer/talentstatus",
        icon: Link2,
      },
      {
        title: "Contactpersonen",
        description: "Trainer-logins koppelen en Fightcrew-toegang klaarzetten.",
        href: "/dashboard/admin/beheer/sportscholen/contactpersonen",
        icon: UsersRound,
      },
      {
        title: "Sportschooldatabase",
        description: "Sportschoolnamen, aliassen en databasekoppelingen beheren.",
        href: "/dashboard/admin/beheer/sportscholen/aliases",
        icon: School,
      },
      {
        title: "Logboek / Audit",
        description: "Belangrijke acties, wijzigingen en systeemgebeurtenissen terugvinden.",
        href: "/dashboard/admin/audit",
        icon: Cog,
      },
    ],
  },
  {
    title: "Algemeen",
    subtitle: "Matchmakings, afmeldingen, archief, sancties en historie",
    items: [
      {
        title: "Matchmakingoverzicht",
        description: "Eigenaar, bondteam, stadium en status van matchmakings controleren.",
        href: "/dashboard/admin/algemeen/matchmakings",
        icon: GitBranch,
      },
      {
        title: "FightPassport evenementen",
        description: "Evenementen synchroniseren, beheren en bekijken.",
        href: "/dashboard/admin/evenementen",
        icon: CalendarDays,
      },
      {
        title: "Afmeldingen",
        description: "Afmeldingen van vechters bekijken en administratief verwerken.",
        href: "/dashboard/admin/algemeen/afmeldingen",
        icon: UserMinus,
      },
      {
        title: "Archief",
        description: "Afgeronde evenementen, partijen, rapporten en dossiers openen.",
        href: "/dashboard/admin/algemeen/archief",
        icon: Archive,
      },
      {
        title: "Sancties & waarschuwingen",
        description: "Overtredingen, sancties, waarschuwingen en minpunten beheren.",
        href: "/dashboard/admin/algemeen/overtredingen",
        icon: ShieldAlert,
      },
      {
        title: "Matchmaking-snapshots",
        description: "Opgeslagen versies terugzoeken en vergelijken.",
        href: "/dashboard/admin/algemeen/snapshots",
        icon: Camera,
      },
    ],
  },
];

const quickActions: PortalLink[] = [
  {
    title: "Gebruiker toevoegen",
    description: "",
    href: "/dashboard/admin/beheer/accounts-beheer",
    icon: UserPlus,
  },
  {
    title: "Evenementen",
    description: "",
    href: "/dashboard/admin/evenementen",
    icon: CalendarDays,
  },
  {
    title: "Sportschoolmelding",
    description: "",
    href: "/dashboard/admin/beheer/sportschool-meldingen",
    icon: MessageSquare,
  },
  {
    title: "Talentstatus",
    description: "",
    href: "/dashboard/admin/beheer/talentstatus",
    icon: Link2,
  },
  {
    title: "Archief openen",
    description: "",
    href: "/dashboard/admin/algemeen/archief",
    icon: Archive,
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadUserProfile() {
      if (loading) return;
      if (!user?.id) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileError(null);

      try {
        const data = await Promise.race([
          fetchUserProfile(),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error("Profiel laden duurde te lang.")), 12000),
          ),
        ]);

        if (!cancelled) {
          setProfile(data);
        }
      } catch (error) {
        console.error("Adminprofiel laden mislukt", error);
        if (!cancelled) {
          setProfile(null);
          setProfileError(
            error instanceof Error ? error.message : "Adminprofiel kon niet worden geladen.",
          );
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadUserProfile();
    return () => {
      cancelled = true;
    };
  }, [loading, user?.id]);

  const normalizedRole = normalizeRole(profile?.role);
  const normalizedBondteam = normalizeBondteam(profile?.bondteam);
  const isAdmin = normalizedRole === "admin";
  const isSuperadmin = normalizedRole === "superadmin";
  const isNvbOrNoBondteam = normalizedBondteam === "" || normalizedBondteam === "NVB";

  // Bestaande toegangscontrole behouden:
  // - superadmin mag altijd het admin-portaal openen;
  // - admin alleen als bondteam leeg of NVB is.
  const mayOpenAdminPortal = isSuperadmin || (isAdmin && isNvbOrNoBondteam);

  // Root-adminonderdelen blijven uitsluitend beschikbaar voor NVB/leeg.
  const mayOpenRootAdminTiles = (isAdmin || isSuperadmin) && isNvbOrNoBondteam;

  const visiblePrimaryModules = useMemo(
    () => primaryModules.filter((item) => !item.rootAdminOnly || mayOpenRootAdminTiles),
    [mayOpenRootAdminTiles],
  );

  if (loading || profileLoading) {
    return <CenteredMessage text="Bezig met laden..." />;
  }

  if (!user) return null;

  if (profileError) {
    return (
      <main className="fs-page fs-centered-page">
        <GlobalStyles />
        <div className="fs-access-card">
          <ShieldAlert size={42} />
          <h1>Profiel laden mislukt</h1>
          <p>{profileError}</p>
          <button
            type="button"
            className="fs-silver-button"
            onClick={() => window.location.reload()}
          >
            Opnieuw proberen
          </button>
        </div>
      </main>
    );
  }

  if (!mayOpenAdminPortal) {
    return (
      <main className="fs-page fs-centered-page">
        <GlobalStyles />
        <div className="fs-access-card">
          <ShieldAlert size={42} />
          <h1>Geen toegang</h1>
          <p>Dit admin-portaal is niet beschikbaar voor dit profiel.</p>
          <button type="button" className="fs-silver-button" onClick={() => router.push("/dashboard")}>
            <ArrowLeft size={16} /> Dashboard
          </button>
        </div>
      </main>
    );
  }

  function openItem(item: PortalLink) {
    if (item.href) router.push(item.href);
    if (item.external) window.open(item.external, "_blank", "noopener,noreferrer");
  }

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
        <Header
          onDashboard={() => router.push("/dashboard")}
          onSmartDashboard={() => router.push("/dashboard/admin/aandacht")}
        />

        <div className="fs-content">
          <section className="fs-section">
            <SectionHeading title="Snelle acties" />
            <div className="fs-quick-grid">
              {quickActions.map((item) => (
                <button key={item.title} type="button" className="fs-quick-action" onClick={() => openItem(item)}>
                  <item.icon size={20} strokeWidth={2.1} />
                  <span>{item.title}</span>
                  <ChevronRight size={17} className="fs-quick-chevron" />
                </button>
              ))}
            </div>
          </section>

          <section className="fs-section">
            <SectionHeading title="Hoofdmodules" subtitle="Beheer, controle en systeemfuncties" />
            <div className="fs-primary-grid">
              {visiblePrimaryModules.map((item) => (
                <ModuleCard key={item.title} item={item} compact onOpen={() => openItem(item)} />
              ))}
            </div>
          </section>

          {portalSections.map((section) => (
            <section key={section.title} className="fs-section">
              <SectionHeading title={section.title} subtitle={section.subtitle} />
              <div className="fs-card-grid">
                {section.items.map((item) => (
                  <ModuleCard key={item.title} item={item} onOpen={() => openItem(item)} />
                ))}
              </div>
            </section>
          ))}

          <footer className="fs-footer">© FIGHTSUPPORT · ADMIN PORTAAL</footer>
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
    { label: "Admin", href: "/dashboard/admin", icon: Home, active: true },
    { label: "Controle", href: "/dashboard/admin/controle", icon: Scale },
    { label: "Uitslagen", href: "/dashboard/admin/uitslagen/ready-to-upload", icon: Trophy },
    { label: "Statistieken", href: "/dashboard/admin/fightpassport-statistieken", icon: BarChart3 },
    { label: "Doping", href: "/dashboard/admin/doping", icon: ShieldCheck },
    { label: "Instellingen", href: "/dashboard/admin/beheer/accounts-beheer", icon: Cog },
  ];

  return (
    <aside className={`fs-sidebar${open ? " fs-sidebar-open" : ""}`}>
      <button type="button" className="fs-brand-mark" onClick={() => onNavigate("/dashboard/admin")} aria-label="FightSupport admin">
        <span className="fs-brand-icon-wrap">
          <Image src={iconSrc} alt="FightSupport" fill priority sizes="72px" style={{ objectFit: "contain" }} />
        </span>
      </button>

      <nav className="fs-sidebar-nav" aria-label="Admin navigatie">
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

function Header({
  onDashboard,
  onSmartDashboard,
}: {
  onDashboard: () => void;
  onSmartDashboard: () => void;
}) {
  return (
    <header className="fs-header">
      <div className="fs-header-metal" aria-hidden="true" />
      <div className="fs-logo-wrap">
        <Image src={logoSrc} alt="FightSupport" fill priority style={{ objectFit: "contain" }} />
      </div>

      <div className="fs-title-band">
        <button type="button" className="fs-dark-header-button fs-header-left" onClick={onSmartDashboard}>
          <BrainCircuit size={18} />
          <span>Slim dashboard</span>
        </button>

        <div className="fs-title-center">
          <h1>Admin Portaal</h1>
          <p>Beheer, controle en systeemfuncties</p>
        </div>

        <button type="button" className="fs-dark-header-button fs-header-right" onClick={onDashboard}>
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
      <div className="fs-status-icon"><Icon size={26} strokeWidth={2.05} /></div>
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
  compact = false,
}: {
  item: PortalLink;
  onOpen: () => void;
  compact?: boolean;
}) {
  const Icon = item.icon;

  return (
    <article className={`fs-module-card${compact ? " fs-module-card-compact" : ""}`}>
      <button type="button" className="fs-module-click" onClick={onOpen} aria-label={`${item.title} openen`}>
        <span className="fs-card-top-glow" aria-hidden="true" />
        <div className="fs-silver-icon">
          <Icon size={compact ? 25 : 27} strokeWidth={2.05} />
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
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --fs-orange: ${NVB_ORANGE};
        --fs-sidebar-width: 118px;
      }

      * { box-sizing: border-box; }

      html, body { margin: 0; background: #171a1e; }

      button, input, select, textarea { font: inherit; }

      .fs-page {
        min-height: 100vh;
        color: #f4f4f4;
        background:
          radial-gradient(circle at 52% 0%, rgba(214,220,228,.12), transparent 24%),
          radial-gradient(circle at 50% 100%, rgba(160,168,178,.08), transparent 32%),
          linear-gradient(180deg, #30353b 0%, #202429 48%, #292e34 100%);
      }

      .fs-shell { margin-left: var(--fs-sidebar-width); min-height: 100vh; }

      .fs-sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 40;
        width: var(--fs-sidebar-width);
        display: flex;
        flex-direction: column;
        border-right: 1px solid rgba(225,228,232,.34);
        background:
          linear-gradient(90deg, rgba(255,255,255,.025), transparent 35%),
          linear-gradient(180deg, #0b0e12, #030507 70%, #07090b);
        box-shadow: 10px 0 28px rgba(0,0,0,.48), inset -1px 0 rgba(255,255,255,.08), inset -3px 0 10px rgba(190,196,204,.05);
      }

      .fs-brand-mark {
        height: 122px;
        border: 0;
        border-bottom: 1px solid rgba(255,255,255,.13);
        background: transparent;
        color: #ff5a0a;
        cursor: pointer;
        display: grid;
        place-items: center;
      }

      .fs-brand-icon-wrap {
        position: relative;
        width: 76px;
        height: 76px;
        display: block;
        filter: drop-shadow(0 8px 14px rgba(0,0,0,.62)) drop-shadow(0 0 8px rgba(255,255,255,.08));
      }

      .fs-sidebar-nav { flex: 1; }

      .fs-nav-item {
        position: relative;
        width: 100%;
        min-height: 92px;
        border: 0;
        border-bottom: 1px solid rgba(255,255,255,.055);
        background: transparent;
        color: #ddd;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .2px;
        transition: background 160ms ease, color 160ms ease;
      }

      .fs-nav-item:hover { background: rgba(255,255,255,.045); color: #fff; }

      .fs-nav-active {
        color: var(--fs-orange);
        background: linear-gradient(90deg, rgba(255,77,0,.12), rgba(255,255,255,.025));
      }

      .fs-nav-active::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: var(--fs-orange);
        box-shadow: 0 0 14px rgba(255,77,0,.7);
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
        border: 1px solid rgba(255,255,255,.28);
        border-radius: 50%;
        background: #090b0e;
      }

      .fs-header {
        position: relative;
        border-bottom: 1px solid rgba(255,255,255,.11);
        background: #07090b;
        box-shadow: 0 14px 30px rgba(0,0,0,.42);
      }

      .fs-header-metal {
        position: absolute;
        inset: 0 0 auto;
        height: 128px;
        pointer-events: none;
        background:
          linear-gradient(118deg, transparent 0 7%, rgba(255,255,255,.16) 8%, rgba(255,255,255,.04) 20%, transparent 34%),
          linear-gradient(242deg, transparent 0 7%, rgba(255,255,255,.14) 8%, rgba(255,255,255,.035) 20%, transparent 34%),
          repeating-linear-gradient(103deg, rgba(255,255,255,.025) 0 1px, transparent 1px 5px),
          linear-gradient(180deg, #24282e 0%, #0b0d10 48%, #1a1e23 100%);
        border-bottom: 1px solid rgba(255,255,255,.12);
        box-shadow: inset 0 1px rgba(255,255,255,.08), inset 0 -16px 26px rgba(0,0,0,.5);
      }


      .fs-header-metal::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(132deg, transparent 0 20%, rgba(255,255,255,.10) 20.5%, transparent 21.5% 78%, rgba(255,255,255,.08) 78.5%, transparent 79.5%),
          radial-gradient(circle at 50% 22%, rgba(255,255,255,.16), transparent 18%);
        opacity: .7;
      }

      .fs-header-metal::after {
        content: "";
        position: absolute;
        left: 5%;
        right: 5%;
        bottom: 20px;
        height: 1px;
        background: linear-gradient(90deg, transparent, #ff5a00 15%, rgba(255,255,255,.8) 50%, #ff5a00 85%, transparent);
        box-shadow: 0 0 8px rgba(255,77,0,.8);
      }

      .fs-logo-wrap {
        position: relative;
        z-index: 2;
        width: min(980px, 78vw);
        height: 124px;
        margin: 0 auto;
        filter: drop-shadow(0 10px 15px rgba(0,0,0,.75)) drop-shadow(0 0 12px rgba(255,77,0,.18));
      }

      .fs-title-band {
        position: relative;
        z-index: 3;
        min-height: 82px;
        display: grid;
        place-items: center;
        padding: 10px 210px 12px;
        background:
          radial-gradient(circle at 50% 100%, rgba(255,77,0,.26), transparent 11%),
          linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.008)),
          linear-gradient(180deg,#14181e,#080b0f 55%,#12161b);
        border-top: 1px solid rgba(255,255,255,.04);
      }

      .fs-title-center { text-align: center; }
      .fs-title-center h1 {
        margin: 0;
        font-size: clamp(27px, 2.4vw, 38px);
        line-height: 1;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #e8e8e8;
        text-shadow: 0 1px rgba(255,255,255,.24), 0 5px 12px rgba(0,0,0,.88);
      }
      .fs-title-center p {
        margin: 8px 0 0;
        color: var(--fs-orange);
        text-transform: uppercase;
        letter-spacing: 3.2px;
        font-size: 10px;
        font-weight: 800;
      }

      .fs-dark-header-button {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        height: 44px;
        min-width: 184px;
        border: 1px solid rgba(205,205,205,.5);
        background: linear-gradient(180deg,#191d22,#080a0d 65%,#15181c);
        color: #f0f0f0;
        box-shadow: inset 0 1px rgba(255,255,255,.08), 0 5px 12px rgba(0,0,0,.38);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        text-transform: uppercase;
        font-size: 10px;
        font-weight: 900;
        transition: border-color 150ms ease, box-shadow 150ms ease, transform 120ms ease;
      }
      .fs-dark-header-button:hover { border-color: var(--fs-orange); box-shadow: 0 0 14px rgba(255,77,0,.15); }
      .fs-dark-header-button:active { transform: translateY(calc(-50% + 2px)); }
      .fs-header-left { left: 28px; }
      .fs-header-right { right: 28px; }

      .fs-content {
        width: min(1440px, calc(100% - 34px));
        margin: 0 auto;
        padding: 16px 0 18px;
      }

      .fs-status-strip {
        display: grid;
        grid-template-columns: repeat(5, minmax(0,1fr));
        border: 1px solid rgba(220,224,229,.48);
        border-left-color: rgba(226,230,235,.72);
        border-right-color: rgba(226,230,235,.72);
        background:
          linear-gradient(90deg, rgba(255,255,255,.07), transparent 16%, transparent 84%, rgba(255,255,255,.07)),
          linear-gradient(180deg,#454b52,#282d32 72%,#383e44);
        box-shadow: inset 0 1px rgba(255,255,255,.08), inset 0 -1px rgba(0,0,0,.8), 0 12px 28px rgba(0,0,0,.35);
      }

      .fs-status-item {
        min-width: 0;
        min-height: 58px;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 10px 14px;
        border-right: 1px solid rgba(255,255,255,.10);
      }
      .fs-status-item:last-child { border-right: 0; }

      .fs-status-icon {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        display: grid;
        place-items: center;
        color: #e6e6e6;
        border: 1px solid rgba(255,255,255,.23);
        clip-path: polygon(50% 0, 91% 22%, 91% 78%, 50% 100%, 9% 78%, 9% 22%);
        background: linear-gradient(145deg,#1b1f24,#07090c 72%,#1a1d22);
        box-shadow: inset 0 1px rgba(255,255,255,.10), 0 0 0 1px rgba(255,77,0,.16);
      }

      .fs-status-item strong { display: block; font-size: 22px; line-height: 1; color: #ededed; }
      .fs-status-item span { display: block; margin-top: 4px; font-size: 10px; text-transform: uppercase; font-weight: 900; }
      .fs-status-item small { display: block; margin-top: 3px; color: #bfc1c4; font-size: 10px; }

      .fs-section { margin-top: 16px; }
      .fs-section-heading { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 9px; padding-bottom: 7px; border-bottom: 1px solid rgba(214,219,225,.22); }
      .fs-section-heading h2 { margin: 0; color: #f2f3f5; text-transform: uppercase; font-size: 19px; letter-spacing: .6px; text-shadow: 0 1px rgba(255,255,255,.18); }
      .fs-section-heading span { color: var(--fs-orange); text-transform: uppercase; font-size: 10px; letter-spacing: 1.4px; font-weight: 800; }

      .fs-quick-grid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 12px; }
      .fs-quick-action {
        min-height: 44px;
        padding: 0 15px;
        border: 1px solid rgba(220,224,230,.42);
        background: linear-gradient(180deg,#252a31,#0d1014 70%,#1c2026);
        color: #eee;
        display: flex;
        align-items: center;
        gap: 11px;
        cursor: pointer;
        box-shadow: inset 0 1px rgba(255,255,255,.14), inset 0 -1px rgba(0,0,0,.72), 0 6px 12px rgba(0,0,0,.28);
        transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease;
      }
      .fs-quick-action:hover { border-color: var(--fs-orange); transform: translateY(-2px); box-shadow: 0 0 14px rgba(255,77,0,.10); }
      .fs-quick-action svg { color: #d9d9d9; }
      .fs-quick-action span { min-width: 0; font-size: 12px; font-weight: 750; }
      .fs-quick-chevron { margin-left: auto; color: var(--fs-orange) !important; }

      .fs-primary-grid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 8px; }
      .fs-card-grid { display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: 8px; }

      .fs-module-card {
        position: relative;
        min-width: 0;
        min-height: 126px;
        border: 1px solid rgba(226,230,235,.62);
        background:
          linear-gradient(120deg, rgba(255,255,255,.14), transparent 22%),
          linear-gradient(180deg,#59616a,#30363c 64%,#464d55);
        box-shadow: inset 0 1px rgba(255,255,255,.24), inset 0 -1px rgba(0,0,0,.85), inset 1px 0 rgba(255,255,255,.10), 0 10px 18px rgba(0,0,0,.34);
        transition: transform 170ms ease, border-color 170ms ease, box-shadow 170ms ease;
      }
      .fs-module-card::before,
      .fs-module-card::after {
        content: "";
        position: absolute;
        width: 18px;
        height: 18px;
        pointer-events: none;
      }
      .fs-module-card::before { left: -1px; top: -1px; border-left: 2px solid #d8dde3; border-top: 2px solid #d8dde3; }
      .fs-module-card::after { right: -1px; bottom: -1px; border-right: 2px solid #d8dde3; border-bottom: 2px solid #d8dde3; }
      .fs-module-card:hover { transform: translateY(-3px); border-color: rgba(255,90,10,.72); box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 0 16px rgba(255,77,0,.10), 0 15px 25px rgba(0,0,0,.48); }
      .fs-module-card-compact { min-height: 120px; }

      .fs-module-click {
        width: 100%;
        height: 100%;
        min-height: inherit;
        padding: 9px 9px 8px;
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
        left: 30%;
        right: 30%;
        height: 8px;
        background: radial-gradient(circle,rgba(240,243,247,.95),rgba(188,195,204,.30) 40%,transparent 75%);
        filter: blur(1.5px);
        opacity: .52;
      }

      .fs-silver-icon {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        margin-bottom: 5px;
        color: #e7e7e7;
        clip-path: polygon(50% 0, 89% 21%, 89% 79%, 50% 100%, 11% 79%, 11% 21%);
        border: 1px solid rgba(235,238,242,.42);
        background:
          linear-gradient(145deg, rgba(255,255,255,.34), transparent 30%),
          linear-gradient(160deg,#8d949d 0%,#3b4149 32%,#0c0f13 68%,#4d545d 100%);
        box-shadow: inset 0 1px rgba(255,255,255,.28), inset 0 -1px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.08), 0 0 10px rgba(255,77,0,.05);
        text-shadow: 0 2px 3px #000;
      }

      .fs-module-card h3 {
        margin: 0;
        min-height: 30px;
        display: grid;
        place-items: center;
        color: #ededed;
        font-size: 12px;
        line-height: 1.18;
        text-transform: uppercase;
        font-weight: 900;
      }

      .fs-module-card p {
        margin: 4px 0 6px;
        color: #f0f1f2;
        font-size: 8.5px;
        line-height: 1.28;
        flex: 1;
      }

      .fs-card-open {
        width: 100%;
        min-height: 30px;
        border: 1px solid rgba(220,224,230,.38);
        background: linear-gradient(180deg,#252a31,#090c10 68%,#1b2026);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: var(--fs-orange);
        text-transform: uppercase;
        font-size: 10px;
        font-weight: 900;
        transition: background 150ms ease, border-color 150ms ease;
      }
      .fs-module-card:hover .fs-card-open { border-color: rgba(255,77,0,.75); background: linear-gradient(180deg,#2b3037,#0d1014 68%,#20252b); }

      .fs-footer {
        margin-top: 20px;
        padding: 12px;
        text-align: center;
        border-top: 1px solid rgba(255,255,255,.11);
        color: rgba(255,255,255,.42);
        font-size: 9px;
        letter-spacing: 2px;
      }

      .fs-mobile-menu-button,
      .fs-mobile-overlay { display: none; }

      .fs-centered-page { display: grid; place-items: center; padding: 24px; }
      .fs-loading-card,
      .fs-access-card {
        border: 1px solid rgba(255,77,0,.65);
        background: linear-gradient(180deg,#171a1e,#07090b);
        box-shadow: 0 18px 36px rgba(0,0,0,.55);
        padding: 28px 34px;
        text-align: center;
      }
      .fs-access-card h1 { margin: 12px 0 4px; }
      .fs-access-card p { color: #c8c8c8; }
      .fs-silver-button {
        height: 40px;
        padding: 0 18px;
        border: 1px solid #aaa;
        background: linear-gradient(180deg,#fff,#cfcfcf 32%,#fafafa 50%,#9d9d9d 78%,#eee);
        color: #111;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      @media (max-width: 1320px) {
        .fs-card-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .fs-primary-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .fs-status-strip { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .fs-status-item:nth-child(3) { border-right: 0; }
        .fs-status-item:nth-child(n+4) { border-top: 1px solid rgba(255,255,255,.10); }
      }

      @media (max-width: 980px) {
        :root { --fs-sidebar-width: 92px; }
        .fs-title-band { padding-left: 170px; padding-right: 170px; }
        .fs-dark-header-button { min-width: 150px; }
        .fs-dark-header-button span { display: none; }
        .fs-quick-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
        .fs-primary-grid, .fs-card-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
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
          border: 1px solid rgba(255,77,0,.7);
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
        .fs-dark-header-button { top: 15px; transform: none; min-width: 0; width: 44px; padding: 0; }
        .fs-dark-header-button:active { transform: translateY(2px); }
        .fs-header-left { left: 64px; }
        .fs-header-right { right: 12px; }
        .fs-content { width: calc(100% - 20px); padding-top: 12px; }
        .fs-status-strip { grid-template-columns: 1fr; }
        .fs-status-item { border-right: 0; border-bottom: 1px solid rgba(255,255,255,.10); min-height: 82px; }
        .fs-status-item:nth-child(n+4) { border-top: 0; }
        .fs-status-item:last-child { border-bottom: 0; }
        .fs-quick-grid, .fs-primary-grid, .fs-card-grid { grid-template-columns: 1fr; }
        .fs-module-card, .fs-module-card-compact { min-height: 138px; }
      }
    ` }} />
  );
}
