"use client";

import React, { useEffect, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ClipboardList,
  Scale,
  Users,
  Trophy,
  ArrowLeft,
} from "lucide-react";

type MenuAction = {
  label: string;
  subtitle: string;
  href?: string;
  external?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

const logoSrc = "/branding/fightsupport/excel-logo.png";
const NVB_ORANGE = "#ff4d00";

const pageBackground: CSSProperties = {
  minHeight: "100vh",
  color: "#fff",
  background: `
    radial-gradient(circle at 50% 0%, rgba(255,104,20,0.11) 0%, rgba(255,104,20,0.03) 10%, rgba(0,0,0,0) 22%),
    radial-gradient(circle at 50% 100%, rgba(255,104,20,0.09) 0%, rgba(255,104,20,0.02) 12%, rgba(0,0,0,0) 24%),
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
  padding: 8,
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
    0 12px 22px rgba(0,0,0,0.60),
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
    radial-gradient(circle at 14% 84%, rgba(255,110,0,0.09), transparent 16%),
    radial-gradient(circle at 86% 14%, rgba(255,255,255,0.05), transparent 14%),
    linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.012) 15%, rgba(0,0,0,0.16) 100%),
    linear-gradient(135deg, #1a1d22 0%, #070a0f 46%, #15181d 100%)
  `,
  boxShadow: `
    inset 0 2px 4px rgba(0,0,0,0.92),
    inset 0 -2px 6px rgba(255,255,255,0.05),
    inset 0 0 30px rgba(255,120,0,0.05)
  `,
};

export default function OfficialsDashboardPage() {
  const router = useRouter();
  const { user, roles, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    const roleList = roles ?? [];
    const allowed =
      roleList.includes("official") ||
      roleList.includes("hoofdofficial") ||
      roleList.includes("admin") ||
      roleList.includes("superadmin");

    if (!loading && user && !allowed) {
      router.replace("/dashboard");
    }
  }, [loading, roles, router, user]);

  if (loading) {
    return (
      <main style={pageBackground}>
        <CenteredMessage text="Bezig met laden..." />
      </main>
    );
  }

  if (!user) return null;

  const roleList = roles ?? [];
  const allowed =
    roleList.includes("official") ||
    roleList.includes("hoofdofficial") ||
    roleList.includes("admin") ||
    roleList.includes("superadmin");

  if (!allowed) return null;

  const actions: MenuAction[] = [
    {
      label: "Matchmaking overzicht",
      subtitle: "Controleoverzicht openen en partijen inhoudelijk valideren",
      href: "/dashboard/officials/controle",
      icon: ClipboardList as React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>,
    },
    {
      label: "Weegstation",
      subtitle: "Gewichten registreren, controles uitvoeren en weegstatussen verwerken",
      href: "/dashboard/officials/weegstation",
      icon: Scale as React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>,
    },
    {
      label: "Overtredingen",
      subtitle: "Overtredingen en incidenten melden, beheren en verwerken",
      href: "/dashboard/officials/overtreding-melden",
      icon: Users as React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>,
    },
    {
      label: "Uitslagen invoeren",
      subtitle: "Wedstrijdresultaten vastleggen, controleren en definitief afronden",
      href: "/dashboard/officials/uitslagen",
      icon: Trophy as React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>,
    },
  ];

  return (
    <main style={pageBackground}>
      <SharedStyles />
      <TopLogoBand />
      <TitleBand
        title="Official Portaal"
        subtitle="Controle, weegstation en uitslagen"
        actionLabel="Dashboard"
        actionIcon={<ArrowLeft size={15} strokeWidth={2.8} />}
        onAction={() => router.push("/dashboard")}
      />

      <div
        className="dashboard-main-wrap"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "22px 24px 14px",
        }}
      >
        <div
          className="dashboard-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          {actions.map((action) => (
            <PortalCard
              key={action.label}
              icon={<action.icon size={36} strokeWidth={2.55} />}
              title={action.label}
              subtitle={action.subtitle}
              buttonLabel="Openen"
              onClick={() => {
                if (action.href) router.push(action.href);
                if (action.external) window.open(action.external, "_blank", "noopener,noreferrer");
              }}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 9,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.30)",
          }}
        >
          © FIGHTSUPPORT
        </div>
      </div>
    </main>
  );
}

function SharedStyles() {
  return (
    <style jsx global>{`
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

      .fs-card-hover {
        transition: transform 180ms ease, filter 180ms ease, box-shadow 180ms ease;
      }

      .fs-card-hover:hover {
        transform: translateY(-2px);
        filter: drop-shadow(0 0 12px rgba(255, 77, 0, 0.08));
      }

      .fs-card-hover:hover .fs-card-glow {
        opacity: 1;
      }

      .fs-card-hover:hover .fs-card-outer {
        box-shadow:
          0 16px 28px rgba(0, 0, 0, 0.68),
          0 0 18px rgba(255, 77, 0, 0.08),
          inset 0 2px 1px rgba(255, 255, 255, 0.96),
          inset 0 -2px 2px rgba(0, 0, 0, 0.82),
          inset 2px 0 2px rgba(255, 255, 255, 0.44),
          inset -2px 0 2px rgba(0, 0, 0, 0.54);
      }

      .fs-hotspot {
        animation: fsPulseGlow 2.8s ease-in-out infinite;
        transform-origin: center center;
      }

      .fs-hotspot-2 {
        animation-delay: 0.7s;
      }

      .fs-hotspot-3 {
        animation-delay: 1.3s;
      }

      .fs-metal-button {
        transition: transform 90ms ease, box-shadow 120ms ease, filter 120ms ease;
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

      @media (max-height: 900px) and (min-width: 1080px) {
        .dashboard-main-wrap {
          padding-top: 18px !important;
          padding-bottom: 14px !important;
        }

        .dashboard-grid {
          gap: 18px !important;
        }
      }

      @media (max-width: 1180px) {
        .dashboard-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 760px) {
        .dashboard-main-wrap {
          padding-left: 12px !important;
          padding-right: 12px !important;
        }

        .dashboard-grid {
          grid-template-columns: 1fr !important;
          gap: 14px !important;
        }

        .fs-card-hover,
        .fs-card-outer {
          min-width: 0 !important;
          width: 100% !important;
        }
      }

      @media (max-width: 860px) {
        .title-row {
          padding-top: 12px !important;
          padding-bottom: 12px !important;
          padding-left: 14px !important;
          padding-right: 14px !important;
        }

        .title-actions-wrap {
          position: static !important;
          transform: none !important;
          justify-content: center !important;
          margin-bottom: 10px !important;
        }

        .title-center {
          padding-top: 0 !important;
        }
      }
    `}</style>
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
          width: 1160,
          height: 96,
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
          style={{
            objectFit: "contain",
            transform: "scaleX(1.34)",
          }}
        />
      </div>
    </div>
  );
}

function TitleBand({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
}: {
  title: string;
  subtitle: string;
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
          width: 160,
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
          padding: "11px 18px 10px",
          minHeight: 92,
        }}
      >
        <div
          className="title-actions-wrap"
          style={{
            position: "absolute",
            right: 18,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <HeaderSilverButton
            label={actionLabel}
            icon={actionIcon}
            onClick={onAction}
          />
        </div>

        <div
          className="title-center"
          style={{
            textAlign: "center",
            paddingTop: 0,
          }}
        >
          <div
            style={{
              fontSize: 28,
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
              marginTop: 7,
              fontSize: 9,
              letterSpacing: 2.5,
              color: NVB_ORANGE,
              textTransform: "uppercase",
              textShadow: "0 0 8px rgba(255,106,0,0.28)",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}

function SteelFrame({ children, hover = false }: { children: ReactNode; hover?: boolean }) {
  return (
    <div className={hover ? "fs-card-hover" : undefined}>
      <div style={steelFrameOuter} className={hover ? "fs-card-outer" : undefined}>
        <div
          className={hover ? "fs-card-glow" : undefined}
          style={{
            position: "absolute",
            inset: -2,
            opacity: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,77,0,0.10) 0%, rgba(255,77,0,0.04) 34%, rgba(255,77,0,0) 70%)",
            transition: "opacity 180ms ease",
            filter: "blur(8px)",
          }}
        />

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

        <div style={steelFrameMid}>
          <div style={steelFrameChannel}>
            <div style={steelFrameInner}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalCard({
  icon,
  title,
  subtitle,
  buttonLabel,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <SteelFrame hover>
      <div
        style={{
          ...darkPlate,
          minHeight: 154,
          padding: "14px 14px 12px",
        }}
      >
        <OrangeHotspot left={16} bottom={8} width={58} />
        <OrangeHotspot right={36} top={10} width={38} small variant={2} />
        <CardChromeOverlay />

        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <IconPlate>{icon}</IconPlate>

          <div style={{ minWidth: 0, flex: 1, paddingTop: 1 }}>
            <div
              style={{
                fontSize: 20,
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
                marginTop: 9,
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08), transparent)",
              }}
            />

            <div
              style={{
                marginTop: 9,
                fontSize: 12.5,
                color: "#d7d7d7",
                lineHeight: 1.2,
              }}
            >
              {subtitle}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, padding: "0 4px" }}>
          <SteelButton label={buttonLabel} onClick={onClick} />
        </div>
      </div>
    </SteelFrame>
  );
}

function IconPlate({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 92,
        height: 72,
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
      {children}
    </div>
  );
}

function SteelButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        fontSize: 16,
        fontWeight: 900,
        boxShadow: `
          inset 0 2px 1px rgba(255,255,255,1),
          inset 0 -3px 2px rgba(0,0,0,0.6),
          0 5px 12px rgba(0,0,0,0.38)
        `,
        cursor: "pointer",
        textShadow: "0 1px 0 rgba(255,255,255,0.34)",
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
        minWidth: 162,
        height: 42,
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
        fontSize: 15,
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
        padding: "0 18px",
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
        height: small ? 8 : 10,
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

function CenteredMessage({ text }: { text: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <SteelFrame>
        <div
          style={{
            ...darkPlate,
            padding: "24px 30px",
            fontSize: 18,
            fontWeight: 800,
            color: "#f1f1f1",
          }}
        >
          {text}
        </div>
      </SteelFrame>
    </div>
  );
}