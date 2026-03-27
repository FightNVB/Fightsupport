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
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Building2,
  Tags,
  MapPin,
  Globe,
  ChevronDown,
} from "lucide-react";

const NVB_ORANGE = "#ff4d00";
const PAGE_SIZE = 50;
const logoSrc = "/branding/fightsupport/excel-logo.png";

type Sportschool = {
  sportschool_id: number;
  naam: string | null;
  plaats: string | null;
  land: string | null;
};

type AliasRow = {
  id: string;
  alias_text: string;
  sportschool_id: number;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};

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

      .fs-table {
        width: 100%;
        border-collapse: collapse;
      }

      .fs-table thead th {
        text-align: left;
        padding: 12px 14px;
        font-size: 11px;
        letter-spacing: 1.6px;
        text-transform: uppercase;
        font-weight: 900;
        color: #ffffff;
        background:
          linear-gradient(180deg, #ff5f16 0%, #df4700 44%, #8f2a00 100%);
        border-bottom: 1px solid rgba(0, 0, 0, 0.45);
      }

      .fs-table tbody td {
        padding: 12px 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        color: #e6e6e6;
        vertical-align: top;
      }

      .fs-table tbody tr:nth-child(odd) {
        background: rgba(255, 255, 255, 0.02);
      }

      .fs-table tbody tr:nth-child(even) {
        background: rgba(255, 255, 255, 0.04);
      }

      .fs-table tbody tr:hover {
        background: rgba(255, 77, 0, 0.08);
      }

      .fs-table-row-active {
        background: linear-gradient(
          90deg,
          rgba(255, 77, 0, 0.24) 0%,
          rgba(255, 77, 0, 0.08) 100%
        ) !important;
      }

      @media (max-width: 1180px) {
        .aliases-main-grid {
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
        .stats-grid {
          grid-template-columns: 1fr !important;
        }

        .sports-search-row {
          grid-template-columns: 1fr !important;
        }

        .alias-tools-grid {
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
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

function SelectedSportschoolCard({
  selected,
}: {
  selected: Sportschool;
}) {
  return (
    <SteelFrame hover>
      <div style={{ ...darkPlate, padding: "14px 14px 12px" }}>
        <OrangeHotspot left={16} bottom={8} width={58} />
        <OrangeHotspot right={36} top={10} width={38} small variant={2} />
        <CardChromeOverlay />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "72px 1fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          <div
            style={{
              width: 72,
              height: 62,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              border: "1px solid #7b2500",
              background:
                "linear-gradient(180deg, #ff4d00 0%, #e04400 50%, #8a2600 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.30)",
            }}
          >
            <Building2 size={28} strokeWidth={2.2} />
          </div>

          <div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.05,
                color: "#f1f1f1",
                textShadow: "0 3px 5px rgba(0,0,0,0.8)",
              }}
            >
              {selected.naam ?? "—"}
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                fontSize: 13,
                color: "#d7d7d7",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <MapPin size={14} />
                {selected.plaats ?? "—"}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Globe size={14} />
                {selected.land ?? "—"}
              </span>
              <span>#{selected.sportschool_id}</span>
            </div>
          </div>
        </div>
      </div>
    </SteelFrame>
  );
}

function AliasRowCard({
  alias,
  onDelete,
}: {
  alias: AliasRow;
  onDelete: () => void;
}) {
  return (
    <SteelFrame hover>
      <div style={{ ...darkPlate, padding: "12px 14px" }}>
        <OrangeHotspot left={16} bottom={8} width={58} />
        <OrangeHotspot right={36} top={10} width={38} small variant={2} />
        <CardChromeOverlay />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 180px",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.1,
              }}
            >
              {alias.alias_text}
            </div>
          </div>

          <SteelButton
            label="Verwijderen"
            onClick={onDelete}
            icon={<Trash2 size={16} />}
          />
        </div>
      </div>
    </SteelFrame>
  );
}

export default function SportschoolAliasesPage() {
  const router = useRouter();
  const { user, roles, loading } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("superadmin");

  const [err, setErr] = useState<string | null>(null);

  const [sportschoolQuery, setSportschoolQuery] = useState("");
  const [sportscholen, setSportscholen] = useState<Sportschool[]>([]);
  const [sportsLoading, setSportsLoading] = useState(false);
  const [sportsPage, setSportsPage] = useState(0);
  const [sportsHasMore, setSportsHasMore] = useState(true);
  const [sportsCount, setSportsCount] = useState<number | null>(null);

  const [selected, setSelected] = useState<Sportschool | null>(null);

  const [aliases, setAliases] = useState<AliasRow[]>([]);
  const [aliasesLoading, setAliasesLoading] = useState(false);
  const [aliasFilter, setAliasFilter] = useState("");

  const [newAlias, setNewAlias] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/dashboard");
    }
  }, [loading, user, isAdmin, router]);

  async function loadSportscholenPage(reset: boolean) {
    try {
      setErr(null);
      setSportsLoading(true);

      const q = sportschoolQuery.trim();
      const page = reset ? 0 : sportsPage;

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("sportscholen")
        .select("sportschool_id, naam, plaats, land", { count: "exact" })
        .order("naam", { ascending: true })
        .range(from, to);

      if (q) {
        const like = `%${q}%`;
        query = query.or(`naam.ilike.${like},plaats.ilike.${like},land.ilike.${like}`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const rows = (data ?? []) as Sportschool[];

      if (reset) {
        setSportscholen(rows);
        setSportsPage(1);
      } else {
        setSportscholen((prev) => [...prev, ...rows]);
        setSportsPage((prev) => prev + 1);
      }

      setSportsCount(typeof count === "number" ? count : null);

      const loaded = (reset ? 0 : page * PAGE_SIZE) + rows.length;
      const total = typeof count === "number" ? count : loaded;
      setSportsHasMore(loaded < total);
    } catch (e: any) {
      setErr(e?.message ?? "sportscholen_load_failed");
    } finally {
      setSportsLoading(false);
    }
  }

  async function loadAliases(sportschool_id: number) {
    try {
      setErr(null);
      setAliasesLoading(true);

      const { data, error } = await supabase
        .from("sportschool_aliases")
        .select("id, alias_text, sportschool_id, note, created_at, updated_at")
        .eq("sportschool_id", sportschool_id)
        .order("alias_text", { ascending: true });

      if (error) throw error;
      setAliases((data ?? []) as AliasRow[]);
    } catch (e: any) {
      setErr(e?.message ?? "aliases_load_failed");
    } finally {
      setAliasesLoading(false);
    }
  }

  async function addAlias() {
    try {
      setErr(null);
      if (!selected) throw new Error("Kies eerst een sportschool.");
      const alias = newAlias.trim();
      if (!alias) throw new Error("Vul een alias in.");

      const { error } = await supabase.from("sportschool_aliases").insert({
        alias_text: alias,
        sportschool_id: selected.sportschool_id,
        note: null,
      });

      if (error) {
        const msg = String((error as any).message ?? "");
        if (
          msg.toLowerCase().includes("duplicate") ||
          msg.toLowerCase().includes("unique")
        ) {
          throw new Error("Deze alias bestaat al (case-insensitive).");
        }
        throw error;
      }

      setNewAlias("");
      await loadAliases(selected.sportschool_id);
    } catch (e: any) {
      setErr(e?.message ?? "save_failed");
    }
  }

  async function removeAlias(row: AliasRow) {
    try {
      setErr(null);
      if (!selected) return;
      const ok = confirm(`Alias verwijderen?\n\n${row.alias_text}`);
      if (!ok) return;

      const { error } = await supabase
        .from("sportschool_aliases")
        .delete()
        .eq("id", row.id);
      if (error) throw error;

      await loadAliases(selected.sportschool_id);
    } catch (e: any) {
      setErr(e?.message ?? "delete_failed");
    }
  }

  useEffect(() => {
    if (!loading && user && isAdmin) {
      setSelected(null);
      setAliases([]);
      setSportsPage(0);
      setSportsHasMore(true);
      setSportsCount(null);
      loadSportscholenPage(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isAdmin]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const t = setTimeout(() => {
      setSportsPage(0);
      setSportsHasMore(true);
      setSportsCount(null);
      loadSportscholenPage(true);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportschoolQuery]);

  const filteredAliases = useMemo(() => {
    const q = aliasFilter.trim().toLowerCase();
    if (!q) return aliases;
    return aliases.filter((a) =>
      (a.alias_text ?? "").toLowerCase().includes(q)
    );
  }, [aliases, aliasFilter]);

  if (!user || !isAdmin) return null;

  return (
    <main style={pageBackground}>
      <SharedStyles />
      <TopLogoBand />
      <TitleBand
        title="Sportschool Aliassen"
        subtitle="Stabiele matching voor scraper en controle"
        actionLabel="Dashboard"
        actionIcon={<ArrowLeft size={15} strokeWidth={2.8} />}
        onAction={() => router.push("/dashboard/admin")}
      />

      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding: "22px 24px 18px",
        }}
      >
        <div
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 18,
            marginBottom: 20,
          }}
        >
          <InfoTile label="Sportscholen geladen" value={sportscholen.length} />
          <InfoTile label="Totaal gevonden" value={sportsCount ?? "-"} />
          <InfoTile label="Geselecteerde school" value={selected ? 1 : 0} />
          <InfoTile label="Aliassen zichtbaar" value={filteredAliases.length} />
        </div>

        {err ? (
          <div style={{ marginBottom: 18 }}>
            <StatusMessage text={err} />
          </div>
        ) : null}

        <div
          className="aliases-main-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.02fr 1fr",
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
                icon={<Building2 size={36} strokeWidth={2.55} />}
                eyebrow="Stap 1"
                title="Zoek sportschool"
                subtitle="Zoek op naam, plaats of land en kies links de juiste sportschool om aliassen te beheren."
              />

              <div
                className="sports-search-row"
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 180px",
                  gap: 12,
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
                      value={sportschoolQuery}
                      onChange={(e) => setSportschoolQuery(e.target.value)}
                      placeholder="Zoek op naam / plaats / land"
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
                  label="Zoek"
                  onClick={() => loadSportscholenPage(true)}
                  orange
                  icon={<Search size={16} />}
                />
              </div>

              <div
                style={{
                  marginTop: 12,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.58)",
                }}
              >
                {sportsCount != null ? `${sportsCount} totaal gevonden` : "Zoekresultaten"}
              </div>

              <div style={{ marginTop: 14 }}>
                <SteelFrame>
                  <div style={{ ...darkPlate, padding: 0 }}>
                    <CardChromeOverlay />
                    <div className="fs-list-scroll" style={{ maxHeight: 560, overflow: "auto" }}>
                      <table className="fs-table">
                        <thead>
                          <tr>
                            <th>Sportschool</th>
                            <th>Plaats</th>
                            <th>Land</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sportscholen.length === 0 ? (
                            <tr>
                              <td colSpan={3}>
                                <EmptyState text="Geen sportscholen gevonden." />
                              </td>
                            </tr>
                          ) : (
                            sportscholen.map((s) => {
                              const active =
                                selected?.sportschool_id === s.sportschool_id;

                              return (
                                <tr
                                  key={s.sportschool_id}
                                  className={active ? "fs-table-row-active" : undefined}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setSelected(s);
                                    setAliasFilter("");
                                    loadAliases(s.sportschool_id);
                                  }}
                                >
                                  <td>
                                    <div
                                      style={{
                                        fontWeight: 900,
                                        fontSize: 15,
                                        color: "#fff",
                                      }}
                                    >
                                      {s.naam ?? "—"}
                                    </div>
                                    <div
                                      style={{
                                        marginTop: 4,
                                        fontSize: 11,
                                        color: "rgba(255,255,255,0.55)",
                                      }}
                                    >
                                      #{s.sportschool_id}
                                    </div>
                                  </td>
                                  <td>{s.plaats ?? "—"}</td>
                                  <td>{s.land ?? "—"}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </SteelFrame>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: "1fr 200px",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.68)",
                  }}
                >
                  {sportsLoading ? "Laden..." : sportsHasMore ? "Meer resultaten beschikbaar." : "Alle resultaten geladen."}
                </div>

                <SteelButton
                  label="Meer laden"
                  onClick={() => loadSportscholenPage(false)}
                  disabled={!sportsHasMore || sportsLoading}
                  icon={<ChevronDown size={16} />}
                />
              </div>
            </div>
          </SteelFrame>

          <SteelFrame>
            <div style={{ ...darkPlate, padding: "16px 16px 14px" }}>
              <OrangeHotspot left={16} bottom={8} width={58} />
              <OrangeHotspot right={36} top={10} width={38} small variant={2} />
              <CardChromeOverlay />

              <SectionTitle
                icon={<Tags size={36} strokeWidth={2.55} />}
                eyebrow="Stap 2"
                title="Aliassen"
                subtitle="Voeg alternatieve schrijfwijzen toe zodat imports, scraper en matching dezelfde sportschool blijven herkennen."
              />

              {!selected ? (
                <div style={{ marginTop: 18 }}>
                  <EmptyState text="Kies links eerst een sportschool om aliassen te bekijken of toe te voegen." />
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 18 }}>
                    <SelectedSportschoolCard selected={selected} />
                  </div>

                  <div
                    className="alias-tools-grid"
                    style={{
                      marginTop: 16,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <FieldLabel>Filter alias</FieldLabel>
                      <Input
                        value={aliasFilter}
                        onChange={setAliasFilter}
                        placeholder="Zoek in aliassen"
                      />
                    </div>

                    <div>
                      <FieldLabel>Nieuwe alias</FieldLabel>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 110px",
                          gap: 10,
                        }}
                      >
                        <Input
                          value={newAlias}
                          onChange={setNewAlias}
                          placeholder="Bijv. Team Suboxer"
                        />
                        <SteelButton
                          label="Toevoegen"
                          onClick={addAlias}
                          orange
                          icon={<Plus size={16} />}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="fs-list-scroll"
                    style={{
                      marginTop: 16,
                      display: "grid",
                      gap: 12,
                      maxHeight: 560,
                      overflow: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {aliasesLoading ? (
                      <EmptyState text="Aliassen laden..." />
                    ) : filteredAliases.length === 0 ? (
                      <EmptyState text="Geen aliassen gevonden." />
                    ) : (
                      filteredAliases.map((a) => (
                        <AliasRowCard
                          key={a.id}
                          alias={a}
                          onDelete={() => removeAlias(a)}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
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