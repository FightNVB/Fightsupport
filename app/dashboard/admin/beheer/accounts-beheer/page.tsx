"use client";

import Image from "next/image";
import React, {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Trash2,
  Save,
  Mail,
  ClipboardList,
} from "lucide-react";

type AccountRequest = {
  id: string;
  name?: string | null;
  email?: string | null;
  requested_role?: string | null;
  team?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type UserProfile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  bondteam?: string | null;
  created_at?: string | null;
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

function prettyDate(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL");
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function normalizeRole(value?: string | null) {
  const v = String(value ?? "").trim().toLowerCase();
  switch (v) {
    case "matchmaker":
      return "Matchmaker";
    case "official":
      return "Official";
    case "hoofdofficial":
      return "Hoofdofficial";
    case "admin":
      return "Admin";
    case "promotor":
      return "Promotor";
    case "sportschool":
      return "Sportschool";
    case "superadmin":
      return "Superadmin";
    default:
      return value || "Matchmaker";
  }
}

function SharedStyles() {
  return (
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

      .fs-card-hover {
        transition:
          transform 180ms ease,
          filter 180ms ease,
          box-shadow 180ms ease;
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
        transition:
          transform 90ms ease,
          box-shadow 120ms ease,
          filter 120ms ease,
          opacity 120ms ease;
      }

      .fs-metal-button:hover:not(:disabled) {
        filter: brightness(1.02);
        box-shadow:
          inset 0 2px 1px rgba(255, 255, 255, 1),
          inset 0 -3px 2px rgba(0, 0, 0, 0.6),
          0 8px 18px rgba(0, 0, 0, 0.46),
          0 0 10px rgba(255, 77, 0, 0.08);
      }

      .fs-metal-button:active:not(:disabled) {
        transform: translateY(2px);
        box-shadow:
          inset 0 2px 2px rgba(0, 0, 0, 0.18),
          inset 0 -1px 1px rgba(255, 255, 255, 0.28),
          0 2px 6px rgba(0, 0, 0, 0.35);
      }

      .fs-metal-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .fs-field {
        width: 100%;
        height: 42px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background:
          linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.015) 16%,
            rgba(0, 0, 0, 0.18) 100%
          ),
          linear-gradient(135deg, #11161c 0%, #080b10 50%, #12171d 100%);
        color: #f2f2f2;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          inset 0 2px 6px rgba(0, 0, 0, 0.7);
        outline: none;
      }

      .fs-field::placeholder {
        color: rgba(255, 255, 255, 0.42);
      }

      .fs-field:focus {
        border-color: rgba(255, 77, 0, 0.6);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          inset 0 2px 6px rgba(0, 0, 0, 0.7),
          0 0 0 1px rgba(255, 77, 0, 0.2),
          0 0 12px rgba(255, 77, 0, 0.12);
      }

      .fs-list-scroll::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      .fs-list-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #bfbfbf, #737373);
        border-radius: 999px;
      }

      .fs-list-scroll::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.04);
      }

      @media (max-width: 1180px) {
        .accounts-main-grid {
          grid-template-columns: 1fr !important;
        }
      }

      @media (max-width: 980px) {
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

      @media (max-width: 860px) {
        .top-summary-grid {
          grid-template-columns: 1fr !important;
        }

        .filter-row {
          grid-template-columns: 1fr !important;
        }

        .request-row,
        .user-row {
          grid-template-columns: 1fr !important;
        }

        .title-row {
          padding-top: 12px !important;
          padding-bottom: 12px !important;
          padding-left: 14px !important;
          padding-right: 14px !important;
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

function SteelFrame({
  children,
  hover = false,
}: {
  children: ReactNode;
  hover?: boolean;
}) {
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
    variant === 2
      ? "fs-hotspot fs-hotspot-2"
      : variant === 3
      ? "fs-hotspot fs-hotspot-3"
      : "fs-hotspot";

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

function SteelButton({
  label,
  onClick,
  disabled,
  orange = false,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  orange?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="fs-metal-button"
      style={{
        width: "100%",
        height: 40,
        border: orange ? "1px solid #7b2500" : "1px solid #8f8f8f",
        background: orange
          ? `
            linear-gradient(180deg,
              #ff7a36 0%,
              #ff5a10 16%,
              #df4700 40%,
              #9f2c00 76%,
              #ff7b38 100%)
          `
          : `
            linear-gradient(180deg,
              #ffffff 0%,
              #eaeaea 12%,
              #cfcfcf 25%,
              #ffffff 40%,
              #9a9a9a 70%,
              #f0f0f0 100%)
          `,
        color: orange ? "#fff" : "#131313",
        fontSize: 15,
        fontWeight: 900,
        boxShadow: orange
          ? `
            inset 0 1px 0 rgba(255,255,255,0.25),
            inset 0 -3px 2px rgba(0,0,0,0.45),
            0 5px 12px rgba(0,0,0,0.38)
          `
          : `
            inset 0 2px 1px rgba(255,255,255,1),
            inset 0 -3px 2px rgba(0,0,0,0.6),
            0 5px 12px rgba(0,0,0,0.38)
          `,
        cursor: disabled ? "not-allowed" : "pointer",
        textShadow: orange
          ? "0 1px 0 rgba(0,0,0,0.30)"
          : "0 1px 0 rgba(255,255,255,0.34)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 14px",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionTitle({
  icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "92px 1fr",
        gap: 14,
        alignItems: "start",
      }}
    >
      <div
        style={{
          width: 92,
          height: 72,
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
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 2.2,
            textTransform: "uppercase",
            color: NVB_ORANGE,
            textShadow: "0 0 8px rgba(255,106,0,0.20)",
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 30,
            fontWeight: 900,
            lineHeight: 1,
            color: "#f1f1f1",
            textShadow: "0 3px 5px rgba(0,0,0,0.8)",
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#d7d7d7",
              lineHeight: 1.35,
              maxWidth: 680,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <SteelFrame>
      <div style={{ ...darkPlate, padding: "14px 16px" }}>
        <OrangeHotspot right={14} top={10} width={30} small variant={2} />
        <CardChromeOverlay />
        <div
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 1.9,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.60)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 24,
            fontWeight: 900,
            color: "#fff",
            textShadow: "0 3px 5px rgba(0,0,0,0.7)",
          }}
        >
          {value}
        </div>
      </div>
    </SteelFrame>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: 8,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 1.8,
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.72)",
      }}
    >
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="fs-field"
      style={{
        padding: "0 14px",
        borderRadius: 0,
        fontSize: 14,
      }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="fs-field"
      style={{
        padding: "0 14px",
        borderRadius: 0,
        fontSize: 14,
      }}
    >
      {options.map((o) => (
        <option
          key={o}
          value={o}
          style={{ background: "#10151b", color: "#f2f2f2" }}
        >
          {o}
        </option>
      ))}
    </select>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
        color: "rgba(255,255,255,0.72)",
        padding: "18px 16px",
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}

function StatusMessage({ text }: { text: string }) {
  return (
    <SteelFrame>
      <div style={{ ...darkPlate, padding: "14px 16px" }}>
        <OrangeHotspot left={12} bottom={8} width={40} variant={3} />
        <CardChromeOverlay />
        <div
          style={{
            color: "#f2f2f2",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {text}
        </div>
      </div>
    </SteelFrame>
  );
}

function RequestCard({
  request,
  busy,
  onApprove,
  onReject,
}: {
  request: AccountRequest;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <SteelFrame hover>
      <div style={{ ...darkPlate, padding: "14px 14px 12px" }}>
        <OrangeHotspot left={16} bottom={8} width={58} />
        <OrangeHotspot right={36} top={10} width={38} small variant={2} />
        <CardChromeOverlay />

        <div
          className="request-row"
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr auto",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.05,
                color: "#f1f1f1",
                textShadow: "0 3px 5px rgba(0,0,0,0.8)",
              }}
            >
              {request.name || "Onbekende naam"}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                color: "#d7d7d7",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Mail size={14} />
              {request.email || "Geen e-mail"}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: 0.5,
              }}
            >
              Aangevraagd: {prettyDate(request.created_at)}
            </div>
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#d7d7d7",
              lineHeight: 1.45,
            }}
          >
            <div>
              <span style={{ color: "#fff", fontWeight: 800 }}>Rol:</span>{" "}
              {request.requested_role || "-"}
            </div>
            <div style={{ marginTop: 3 }}>
              <span style={{ color: "#fff", fontWeight: 800 }}>Team:</span>{" "}
              {request.team || "-"}
            </div>
            {request.notes ? (
              <div style={{ marginTop: 8 }}>
                <span style={{ color: "#fff", fontWeight: 800 }}>Notities:</span>{" "}
                {request.notes}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              minWidth: 220,
            }}
          >
            <SteelButton
              disabled={busy}
              onClick={onApprove}
              label="Goedkeuren + uitnodigen"
              orange
              icon={<ShieldCheck size={16} />}
            />
            <SteelButton
              disabled={busy}
              onClick={onReject}
              label="Afkeuren"
              icon={<Trash2 size={16} />}
            />
          </div>
        </div>
      </div>
    </SteelFrame>
  );
}

function UserCard({
  user,
  busy,
  onNameChange,
  onRoleChange,
  onTeamChange,
  onSave,
  onDelete,
}: {
  user: UserProfile;
  busy: boolean;
  onNameChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onTeamChange: (v: string) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <SteelFrame hover>
      <div style={{ ...darkPlate, padding: "14px 14px 12px" }}>
        <OrangeHotspot left={16} bottom={8} width={58} />
        <OrangeHotspot right={36} top={10} width={38} small variant={2} />
        <CardChromeOverlay />

        <div
          className="user-row"
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.95fr 0.95fr auto",
            gap: 14,
            alignItems: "end",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              E-mail
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                wordBreak: "break-word",
              }}
            >
              {user.email || "-"}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: "rgba(255,255,255,0.50)",
              }}
            >
              Aangemaakt: {prettyDate(user.created_at)}
            </div>
          </div>

          <div>
            <FieldLabel>Naam</FieldLabel>
            <Input
              value={user.full_name ?? ""}
              onChange={onNameChange}
              placeholder="Naam"
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <div>
              <FieldLabel>Rol</FieldLabel>
              <Select
                value={normalizeRole(user.role)}
                onChange={onRoleChange}
                options={[
                  "Matchmaker",
                  "Official",
                  "Hoofdofficial",
                  "Admin",
                  "Promotor",
                  "Sportschool",
                  "Superadmin",
                ]}
              />
            </div>

            <div>
              <FieldLabel>Bond / team</FieldLabel>
              <Input
                value={user.bondteam ?? ""}
                onChange={onTeamChange}
                placeholder="Team"
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              minWidth: 180,
            }}
          >
            <SteelButton
              disabled={busy}
              onClick={onSave}
              label="Opslaan"
              orange
              icon={<Save size={16} />}
            />
            <SteelButton
              disabled={busy}
              onClick={onDelete}
              label="Verwijderen"
              icon={<Trash2 size={16} />}
            />
          </div>
        </div>
      </div>
    </SteelFrame>
  );
}

export default function AccountsBeheerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"requests" | "users">("requests");
  const [filter, setFilter] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Matchmaker");
  const [newBondteam, setNewBondteam] = useState("");

  async function authedFetch(url: string, init?: RequestInit) {
    const token = await getAccessToken();
    if (!token) throw new Error("Geen sessie token (niet ingelogd?)");

    return fetch(url, {
      ...(init ?? {}),
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  }

  async function loadAll() {
    setToast("");

    const [rReq, rUsers] = await Promise.all([
      authedFetch("/api/admin/account-requests", { method: "GET" }),
      authedFetch("/api/admin/users", { method: "GET" }),
    ]);

    const jReq = await rReq.json().catch(() => ({}));
    const jUsers = await rUsers.json().catch(() => ({}));

    if (!rReq.ok) throw new Error(jReq.error || "Fout bij laden requests");
    if (!rUsers.ok) throw new Error(jUsers.error || "Fout bij laden users");

    setRequests(jReq.rows || []);
    setUsers(
      (jUsers.users || []).map((u: UserProfile) => ({
        ...u,
        role: normalizeRole(u.role),
      }))
    );
  }

  useEffect(() => {
    loadAll().catch((e) => setToast(String(e?.message ?? e)));
  }, []);

  const filteredRequests = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) =>
      `${r.name ?? ""} ${r.email ?? ""} ${r.requested_role ?? ""} ${r.team ?? ""} ${r.notes ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [requests, filter]);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.full_name ?? ""} ${u.email ?? ""} ${u.role ?? ""} ${u.bondteam ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [users, filter]);

  async function actOnRequest(id: string, action: "approve" | "reject") {
    setBusy(true);
    setToast("");
    try {
      const res = await authedFetch(`/api/admin/account-requests/${id}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Actie mislukt");

      setToast(
        action === "approve"
          ? "✔ Request goedgekeurd en uitnodiging verzonden."
          : "✔ Request afgekeurd."
      );
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function saveUser(u: UserProfile) {
    setBusy(true);
    setToast("");
    try {
      const res = await authedFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id: u.id,
          full_name: u.full_name ?? null,
          role: u.role ?? null,
          bondteam: u.bondteam ?? null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Opslaan mislukt");

      setToast("✔ Gebruiker bijgewerkt.");
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string) {
    const yes = window.confirm(
      "Gebruiker verwijderen? (dit verwijdert ook de Supabase Auth user)"
    );
    if (!yes) return;

    setBusy(true);
    setToast("");
    try {
      const res = await authedFetch("/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Verwijderen mislukt");

      setToast("✔ Gebruiker verwijderd.");
      await loadAll();
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function createUserInvite() {
    setBusy(true);
    setToast("");

    try {
      const email = newEmail.trim().toLowerCase();
      const full_name = newName.trim();
      const role = newRole.trim();
      const bondteam = newBondteam.trim();

      if (!email) throw new Error("Email is verplicht");
      if (!role) throw new Error("Rol is verplicht");

      const res = await authedFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          full_name,
          role,
          bondteam: bondteam || null,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Uitnodigen mislukt");

      setToast("✔ Uitnodiging verzonden.");
      setNewEmail("");
      setNewName("");
      setNewRole("Matchmaker");
      setNewBondteam("");
      await loadAll();
      setTab("users");
    } catch (e: any) {
      setToast(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={pageBackground}>
      <SharedStyles />
      <TopLogoBand />
      <TitleBand
        title="Accounts Beheer"
        subtitle="Gebruikers, aanvragen en uitnodigingen"
        actionLabel="Dashboard"
        actionIcon={<ArrowLeft size={15} strokeWidth={2.8} />}
        onAction={() => router.push("/dashboard")}
      />

      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding: "22px 24px 18px",
        }}
      >
        <div
          className="top-summary-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 18,
            marginBottom: 20,
          }}
        >
          <InfoTile label="Open requests" value={requests.length} />
          <InfoTile label="Gebruikers" value={users.length} />
          <InfoTile label="Actieve tab" value={tab === "requests" ? "Requests" : "Gebruikers"} />
          <InfoTile label="Filter resultaten" value={tab === "requests" ? filteredRequests.length : filteredUsers.length} />
        </div>

        <div
          className="accounts-main-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "420px minmax(0, 1fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <SteelFrame>
            <div style={{ ...darkPlate, padding: "16px 16px 14px" }}>
              <OrangeHotspot left={16} bottom={8} width={58} />
              <OrangeHotspot right={36} top={10} width={38} small variant={2} />
              <CardChromeOverlay />

              <SectionTitle
                icon={<UserPlus size={36} strokeWidth={2.55} />}
                eyebrow="Admin"
                title="Gebruiker uitnodigen"
                subtitle="Maak handmatig een gebruiker aan en verstuur direct een uitnodiging per e-mail."
              />

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div>
                  <FieldLabel>Volledige naam</FieldLabel>
                  <Input
                    value={newName}
                    onChange={setNewName}
                    placeholder="Naam gebruiker"
                  />
                </div>

                <div>
                  <FieldLabel>E-mailadres</FieldLabel>
                  <Input
                    value={newEmail}
                    onChange={setNewEmail}
                    placeholder="naam@voorbeeld.nl"
                    type="email"
                  />
                </div>

                <div>
                  <FieldLabel>Rol</FieldLabel>
                  <Select
                    value={newRole}
                    onChange={setNewRole}
                    options={[
                      "Matchmaker",
                      "Official",
                      "Hoofdofficial",
                      "Admin",
                      "Promotor",
                      "Sportschool",
                      "Superadmin",
                    ]}
                  />
                </div>

                <div>
                  <FieldLabel>Bond / team</FieldLabel>
                  <Input
                    value={newBondteam}
                    onChange={setNewBondteam}
                    placeholder="Optioneel"
                  />
                </div>

                <div style={{ paddingTop: 4 }}>
                  <SteelButton
                    disabled={busy}
                    onClick={createUserInvite}
                    label={busy ? "Bezig..." : "Gebruiker uitnodigen"}
                    orange
                    icon={<Mail size={16} />}
                  />
                </div>
              </div>
            </div>
          </SteelFrame>

          <SteelFrame>
            <div style={{ ...darkPlate, padding: "16px 16px 14px" }}>
              <OrangeHotspot left={16} bottom={8} width={58} />
              <OrangeHotspot right={36} top={10} width={38} small variant={2} />
              <CardChromeOverlay />

              <SectionTitle
                icon={
                  tab === "requests" ? (
                    <ClipboardList size={36} strokeWidth={2.55} />
                  ) : (
                    <Users size={36} strokeWidth={2.55} />
                  )
                }
                eyebrow="Overzicht"
                title={tab === "requests" ? "Open account requests" : "Bestaande gebruikers"}
                subtitle="Beoordeel aanvragen, zoek snel op naam of e-mail en werk gebruikers direct bij."
              />

              <div
                className="filter-row"
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 220px 220px",
                  gap: 14,
                  alignItems: "end",
                }}
              >
                <div>
                  <FieldLabel>Zoeken</FieldLabel>
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "rgba(255,255,255,0.55)",
                        pointerEvents: "none",
                      }}
                    >
                      <Search size={16} />
                    </div>
                    <input
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Naam, e-mail, rol of team"
                      className="fs-field"
                      style={{
                        width: "100%",
                        height: 42,
                        paddingLeft: 38,
                        paddingRight: 14,
                        borderRadius: 0,
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>

                <SteelButton
                  label="Account requests"
                  onClick={() => setTab("requests")}
                  orange={tab === "requests"}
                  icon={<ClipboardList size={16} />}
                />

                <SteelButton
                  label="Gebruikers"
                  onClick={() => setTab("users")}
                  orange={tab === "users"}
                  icon={<Users size={16} />}
                />
              </div>

              {toast ? (
                <div style={{ marginTop: 16 }}>
                  <StatusMessage text={toast} />
                </div>
              ) : null}

              <div
                className="fs-list-scroll"
                style={{
                  marginTop: 16,
                  display: "grid",
                  gap: 14,
                  maxHeight: "calc(100vh - 370px)",
                  overflow: "auto",
                  paddingRight: 4,
                }}
              >
                {tab === "requests" ? (
                  filteredRequests.length === 0 ? (
                    <EmptyState text="Geen open requests gevonden." />
                  ) : (
                    filteredRequests.map((r) => (
                      <RequestCard
                        key={r.id}
                        request={r}
                        busy={busy}
                        onApprove={() => actOnRequest(r.id, "approve")}
                        onReject={() => actOnRequest(r.id, "reject")}
                      />
                    ))
                  )
                ) : filteredUsers.length === 0 ? (
                  <EmptyState text="Geen gebruikers gevonden." />
                ) : (
                  filteredUsers.map((u) => (
                    <UserCard
                      key={u.id}
                      user={u}
                      busy={busy}
                      onNameChange={(v) =>
                        setUsers((prev) =>
                          prev.map((x) =>
                            x.id === u.id ? { ...x, full_name: v } : x
                          )
                        )
                      }
                      onRoleChange={(v) =>
                        setUsers((prev) =>
                          prev.map((x) =>
                            x.id === u.id ? { ...x, role: v } : x
                          )
                        )
                      }
                      onTeamChange={(v) =>
                        setUsers((prev) =>
                          prev.map((x) =>
                            x.id === u.id ? { ...x, bondteam: v } : x
                          )
                        )
                      }
                      onSave={() => saveUser(u)}
                      onDelete={() => deleteUser(u.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </SteelFrame>
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