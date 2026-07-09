"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

type AnyRow = Record<string, any>;

type ControleRun = {
  id: string;
  matchmaking_id: string;
  status: string;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
};

type ControleResultaatRow = {
  id: string;
  controle_run_id: string;
  partij_nr: number | null;
  rule: string;
  rule_code: string | null;
  resultaat: "ok" | "actie" | "dispensatie" | "afgekeurd" | string;
  boodschap: string | null;
  created_at: string | null;

  aantekeningen?: string | null;

  review_status?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  original_resultaat?: string | null;

  bout_id?: string | null;
  matchmaking_id?: string | null;
  run_id?: string | null;
  severity?: string | null;
  actie_status?: string | null;
  actie?: string | null;
  hoek?: string | null;
  review_note?: string | null;
  event_id?: string | null;
  bondteam?: string | null;
};

type UitslagRow = {
  datum: string | null;
  discipline: string | null;
  klasse: string | null;
  uitslag: string | null;
};

const inter = { className: "font-sans" };

const bebas = { className: "font-sans" };

const NVB_ORANGE = "#ff4d00";
const SHOW_HEADER_LOGO = false;

function fightSupportTitleText(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, #ffffff 0%, #f4f4f4 18%, #dcdcdc 38%, #bfbfbf 55%, #f8f8f8 75%, #9a9a9a 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
}

function metalText(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, #f7f7f7 0%, #d7d7d7 22%, #9f9f9f 52%, #f1f1f1 70%, #6f6f6f 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
}

function normalizeRuleToken(v: any): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\(|\)/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMinutesToClock(minutes: number | null): string | null {
  if (minutes == null || !Number.isFinite(minutes)) return null;
  const totalSeconds = Math.round(minutes * 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function leeftijdOpEventGetal(
  ctx: AnyRow | null | undefined,
  side: "rood" | "blauw",
): number | null {
  if (!ctx) return null;

  const direct = toInt(
    ctx?.[`${side}_leeftijd_event`] ??
      ctx?.[`${side}_leeftijd_op_event`] ??
      ctx?.[`${side}_age_event`] ??
      ctx?.[`${side}_age`],
  );
  if (direct != null) return direct;

  const eventDate = parseISODateOnly(ctx?.evenement_datum);
  const birthDate = parseISODateOnly(
    ctx?.[`${side}_geboortedatum_fp`] ??
      ctx?.[`${side}_geboortedatum_mm`] ??
      ctx?.[`${side}_geboortedatum`] ??
      ctx?.[`${side}_dob`],
  );

  if (!eventDate || !birthDate) return null;
  return calcAgeYearsOnDate(eventDate, birthDate);
}

function wedstrijddetailsFromCtx(ctx: AnyRow | null | undefined): {
  rondeTijd: string | null;
  format: string | null;
  rustTijd: string | null;
} {
  if (!ctx) return { rondeTijd: null, format: null, rustTijd: null };

  const discipline = normalizeRuleToken(ctx?.discipline ?? ctx?.discipline_mm);
  const klasse = normalizeRuleToken(ctx?.klasse_mm ?? ctx?.klasse);
  const isMma = discipline.includes("mma") || klasse.includes("mma");

  const roodLeeftijd = leeftijdOpEventGetal(ctx, "rood");
  const blauwLeeftijd = leeftijdOpEventGetal(ctx, "blauw");
  const knownAges = [roodLeeftijd, blauwLeeftijd].filter(
    (v): v is number => typeof v === "number",
  );
  const jongste = knownAges.length ? Math.min(...knownAges) : null;

  const isJeugdKlasse =
    klasse === "j" ||
    klasse === "j+" ||
    /\bj\b/.test(klasse) ||
    klasse.includes("jeugd") ||
    klasse.includes("16/17") ||
    klasse.includes("16 17") ||
    klasse.includes("jr") ||
    (jongste != null && jongste < 18);

  if (isMma) {
    if (jongste != null && jongste < 18) {
      if (jongste >= 16) {
        return {
          rondeTijd: formatMinutesToClock(2.5),
          format: "3 x 2:30",
          rustTijd: "1:00",
        };
      }
      if (jongste >= 14) {
        return {
          rondeTijd: formatMinutesToClock(2),
          format: "3 x 2:00",
          rustTijd: "1:00",
        };
      }
      if (jongste >= 12) {
        return {
          rondeTijd: formatMinutesToClock(1.5),
          format: "3 x 1:30",
          rustTijd: "1:00",
        };
      }
    }

    if (
      klasse === "p" ||
      klasse === "pro" ||
      klasse.includes(" mma pro") ||
      klasse.startsWith("pro ") ||
      klasse.endsWith(" pro") ||
      klasse.includes("profession")
    ) {
      return {
        rondeTijd: formatMinutesToClock(5),
        format: "3 x 5:00",
        rustTijd: null,
      };
    }

    return {
      rondeTijd: formatMinutesToClock(3),
      format: "3 x 3:00",
      rustTijd: null,
    };
  }

  if (isJeugdKlasse) {
    const rondeMin = jongste != null && jongste >= 16 ? 1.5 : 1;
    return {
      rondeTijd: formatMinutesToClock(rondeMin),
      format: `3 x ${formatMinutesToClock(rondeMin)}`,
      rustTijd: null,
    };
  }

  let rondeMin: number | null = null;

  if (
    klasse === "n" ||
    klasse.includes("nieuweling") ||
    klasse.includes("newcomer")
  ) {
    rondeMin = 1.5;
  } else if (klasse === "c") {
    rondeMin = 2;
  } else if (klasse === "b") {
    rondeMin = 2;
  } else if (
    klasse === "a" ||
    klasse.includes("a titel") ||
    klasse.includes("a title") ||
    klasse.includes("a k1")
  ) {
    rondeMin = 3;
  }

  return {
    rondeTijd: formatMinutesToClock(rondeMin),
    format: rondeMin != null ? `3 x ${formatMinutesToClock(rondeMin)}` : null,
    rustTijd: null,
  };
}

function metalFrameStyle(
  accent: "none" | "orange" | "red" | "blue" = "none",
): CSSProperties {
  const accentGlow =
    accent === "red"
      ? "radial-gradient(520px 260px at 0% 0%, rgba(220,38,38,0.22), transparent 62%)"
      : accent === "blue"
        ? "radial-gradient(520px 260px at 100% 0%, rgba(37,99,235,0.22), transparent 62%)"
        : accent === "orange"
          ? "radial-gradient(640px 320px at 50% 0%, rgba(255,77,0,0.20), transparent 62%)"
          : "radial-gradient(640px 320px at 50% 0%, rgba(255,255,255,0.06), transparent 62%)";

  const brushed =
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 4px)";

  const sheen =
    "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 48%, rgba(255,255,255,0.10) 70%, rgba(255,255,255,0) 100%)";

  return {
    border: "5px solid rgba(10,10,12,0.92)",
    borderRadius: 22,
    background: `${accentGlow}, ${sheen}, ${brushed}, linear-gradient(180deg, #3a3d44 0%, #1f2025 52%, #0a0b0e 100%)`,
    boxShadow:
      "0 26px 70px rgba(0,0,0,0.70)," +
      " inset 0 0 0 2px rgba(255,255,255,0.14)," +
      " inset 0 0 0 4px rgba(180,180,190,0.18)," +
      " inset 0 0 0 7px rgba(0,0,0,0.55)," +
      " inset 0 1px 0 rgba(255,255,255,0.22)," +
      " inset 0 -18px 24px rgba(0,0,0,0.65)",
  };
}

function plateHeaderStyle(): CSSProperties {
  return {
    border: "2px solid rgba(0,0,0,0.55)",
    borderRadius: 12,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, rgba(0,0,0,0.55) 100%), linear-gradient(180deg, #2a2d33 0%, #15161a 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.65), 0 10px 22px rgba(0,0,0,0.35)",
  };
}

function plateBodyStyle(): CSSProperties {
  return {
    border: "2px solid rgba(0,0,0,0.28)",
    borderRadius: 14,
    background:
      "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.12), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(229,232,236,0.98) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 16px 40px rgba(0,0,0,0.18)",
  };
}

function darkInsetStyle(): CSSProperties {
  return {
    border: "2px solid rgba(0,0,0,0.45)",
    borderRadius: 14,
    background:
      "radial-gradient(circle at 20% 0%, rgba(255,77,0,0.14), transparent 55%), linear-gradient(180deg, #1f2228 0%, #0f1014 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -14px 22px rgba(0,0,0,0.55), 0 16px 38px rgba(0,0,0,0.25)",
  };
}

function SilverButton({
  children,
  onClick,
  disabled,
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center px-4 py-2 rounded font-semibold transition ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-95"
      } ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(205,205,205,0.78) 45%, rgba(120,120,120,0.55) 100%)",
        color: "#111",
        border: "1px solid rgba(255,255,255,0.35)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </button>
  );
}

function Badge({
  text,
  tone,
  invert,
}: {
  text: string;
  tone: "ok" | "warn" | "disp" | "err" | "info" | "verbod";
  invert?: boolean;
}) {
  const cls =
    tone === "ok"
      ? invert
        ? "bg-green-700 text-white border-green-800"
        : "bg-green-50 text-green-800 border-green-300"
      : tone === "warn"
        ? invert
          ? "bg-yellow-500 text-black border-yellow-700"
          : "bg-yellow-50 text-yellow-900 border-yellow-300"
        : tone === "disp"
          ? invert
            ? "bg-orange-600 text-white border-orange-700"
            : "bg-orange-50 text-orange-900 border-orange-300"
          : tone === "info"
            ? invert
              ? "bg-blue-700 text-white border-blue-800"
              : "bg-blue-50 text-blue-900 border-blue-300"
            : tone === "verbod"
              ? invert
                ? "bg-purple-700 text-white border-purple-800"
                : "bg-purple-50 text-purple-900 border-purple-300"
              : invert
              ? "bg-red-700 text-white border-red-800"
              : "bg-red-50 text-red-900 border-red-300";

  return (
    <span
      className={
        "inline-flex items-center px-2.5 py-1 text-xs border rounded " + cls
      }
    >
      {text}
    </span>
  );
}

function useLogoFallback(candidates: string[]) {
  const [idx, setIdx] = useState(0);
  const src =
    candidates[idx] ?? candidates[0] ?? "/branding/fightsupport/logo-dark.png";
  const onError = () => setIdx((i) => Math.min(i + 1, candidates.length - 1));
  return { src, onError };
}

function MetalPanel({
  children,
  className = "",
  accent = "none",
}: {
  children: ReactNode;
  className?: string;
  accent?: "none" | "orange" | "red" | "blue";
}) {
  return (
    <div className={`relative ${className}`} style={metalFrameStyle(accent)}>
      <div
        className="pointer-events-none absolute inset-[8px] rounded-[16px]"
        style={{
          border: "2px solid rgba(255,255,255,0.12)",
          boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.55)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function PlateHeader({
  title,
  right,
  dot,
}: {
  title: ReactNode;
  right?: ReactNode;
  dot?: "red" | "blue" | "orange" | "none";
}) {
  const dotCls =
    dot === "red"
      ? "bg-red-500"
      : dot === "blue"
        ? "bg-blue-500"
        : dot === "orange"
          ? "bg-[var(--brand-orange)]"
          : "bg-white/25";

  return (
    <div className="relative px-4 py-3" style={plateHeaderStyle()}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-3.5 w-3.5 rounded-sm ${dotCls} shadow-[0_0_0_1px_rgba(0,0,0,0.45)]`}
          />
          <div className="text-sm font-extrabold tracking-widest text-white">
            {title}
          </div>
        </div>
        {right ? <div className="text-sm text-white/70">{right}</div> : null}
      </div>

      <div
        className="mt-2 h-[3px] w-full rounded-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,77,0,0.0) 0%, rgba(255,77,0,0.85) 22%, rgba(255,77,0,0.85) 78%, rgba(255,77,0,0.0) 100%)",
        }}
      />
    </div>
  );
}

function BruteHeaderA({
  evenementNaam,
  evenementDatum,
  discipline,
  klasseMM,
  partijNrStr,
  matchmakingId,
  runStatus,
  navPrev,
  navNext,
  onPrev,
  onNext,
  onBack,
  onBackToMatchmaking,
}: {
  evenementNaam: string | null;
  evenementDatum: string | null;
  discipline: string | null;
  klasseMM: string | null;
  partijNrStr: string;
  matchmakingId: string | string[] | undefined;
  runStatus: string | null | undefined;
  navPrev?: number | null;
  navNext?: number | null;
  onPrev?: () => void;
  onNext?: () => void;
  onBack?: () => void;
  onBackToMatchmaking?: () => void;
}) {
  const logo = useLogoFallback([
    "/branding/fightsupport/logo-dark.png",
    "/branding/fightsupport/logo-dark.webp",
    "/branding/fightsupport/logo-dark.jpg",
    "/logo_fightsupport.png",
    "/logo_fightsupport.webp",
    "/logo_fightsupport.jpg",
  ]);

  return (
    <MetalPanel className="p-0 overflow-hidden" accent="orange">
      <div
        className="relative p-4 md:p-5 overflow-hidden"
        style={{
          background: `
            radial-gradient(900px 320px at 50% -40px, rgba(255,77,0,0.18), transparent 62%),
            radial-gradient(520px 240px at 14% 12%, rgba(255,255,255,0.12), transparent 62%),
            radial-gradient(520px 240px at 86% 18%, rgba(255,255,255,0.10), transparent 62%),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, rgba(255,255,255,0.04) 1px, rgba(255,255,255,0.04) 6px),
            repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, rgba(0,0,0,0.00) 1px, rgba(0,0,0,0.00) 10px),
            linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 55%, #17171a 100%)
          `,
          borderBottom: "3px solid rgba(255,77,0,0.55)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -10px 24px rgba(0,0,0,0.55)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0.22,
            backgroundImage:
              "radial-gradient(900px 260px at 50% 0%, rgba(255,255,255,0.06), transparent 60%)," +
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, rgba(255,255,255,0.00) 1px, rgba(255,255,255,0.00) 9px)," +
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, rgba(0,0,0,0.00) 1px, rgba(0,0,0,0.00) 13px)",
            mixBlendMode: "overlay",
          }}
        />

        <div
          className="pointer-events-none absolute inset-3 rounded-[18px]"
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.55)",
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
          <div className="order-2 md:order-1">
            <div className="text-[11px] tracking-widest text-white/60 font-semibold">
              EVENT
            </div>
            <div
              className="mt-1 text-lg md:text-xl font-extrabold"
              style={{ color: NVB_ORANGE }}
            >
              {evenementNaam ?? "-"}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-white/80">
              <div>
                <span className="text-white/60">Datum:</span>{" "}
                <span className="font-semibold" style={metalText()}>
                  {evenementDatum ?? "-"}
                </span>
              </div>
              <div>
                <span className="text-white/60">Discipline:</span>{" "}
                <span className="text-white font-semibold">
                  {discipline ?? "-"}
                </span>
              </div>
              <div>
                <span className="text-white/60">Klasse (MM):</span>{" "}
                <span className="text-white font-semibold">
                  {klasseMM ?? "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2 flex justify-center items-center">
            <div className="text-center">
              <div
                className={`${bebas.className} text-[48px] md:text-[60px] leading-none tracking-[0.22em]`}
                style={{
                  ...fightSupportTitleText(),
                  filter:
                    "drop-shadow(0 18px 28px rgba(0,0,0,0.75)) drop-shadow(0 0 14px rgba(255,255,255,0.35))",
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.30)," +
                    "0 2px 0 rgba(0,0,0,0.72)," +
                    "0 3px 0 rgba(0,0,0,0.78)," +
                    "0 8px 16px rgba(0,0,0,0.62)," +
                    "0 16px 30px rgba(0,0,0,0.70)," +
                    "0 0 18px rgba(255,255,255,0.45)",
                }}
              >
                FIGHTSUPPORT
              </div>

              {SHOW_HEADER_LOGO ? (
                <div className="mt-2 flex justify-center">
                  <div
                    className="relative flex items-center justify-center"
                    style={{ width: 92, height: 92 }}
                  >
                    <div
                      className="absolute inset-0 rounded-[18px]"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 35%, rgba(0,0,0,0.55) 100%)," +
                          " linear-gradient(135deg, #8f949d 0%, #3a3d44 38%, #121318 100%)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -12px 22px rgba(0,0,0,0.55), 0 12px 26px rgba(0,0,0,0.55)",
                      }}
                    />
                    <div
                      className="absolute inset-[6px] rounded-[14px]"
                      style={{
                        border: "1px solid rgba(0,0,0,0.55)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                        background:
                          "radial-gradient(circle at 50% 18%, rgba(255,77,0,0.18), transparent 60%), linear-gradient(180deg, rgba(20,20,22,0.92), rgba(8,8,10,0.98))",
                      }}
                    />
                    {(["tl", "tr", "bl", "br"] as const).map((p) => (
                      <div
                        key={p}
                        className="pointer-events-none absolute"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background:
                            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.60), rgba(120,120,120,0.22) 45%, rgba(0,0,0,0.60) 100%)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 6px rgba(0,0,0,0.45)",
                          left: p.endsWith("l") ? 8 : "auto",
                          right: p.endsWith("r") ? 8 : "auto",
                          top: p.startsWith("t") ? 8 : "auto",
                          bottom: p.startsWith("b") ? 8 : "auto",
                        }}
                      />
                    ))}
                    <div className="relative z-10">
                      <Image
                        src={
                          typeof logo === "string"
                            ? logo
                            : ((logo as any)?.src ??
                              "/branding/fightsupport/logo-dark.png")
                        }
                        alt="FightSupport"
                        width={66}
                        height={66}
                        priority
                        className="drop-shadow-[0_14px_18px_rgba(0,0,0,0.65)]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3" />
              )}

              <div className="mt-2 text-[11px] tracking-[0.35em] text-white/60 font-semibold">
                CONTROLE DASHBOARD
              </div>
            </div>
          </div>

          <div className="order-3 md:text-right">
            <div className="text-[11px] tracking-widest text-white/60 font-semibold">
              CONTROLE
            </div>
            <div className="mt-1 text-xl md:text-2xl font-extrabold text-white">
              Partij {partijNrStr}
            </div>

            <div className="mt-2 flex md:justify-end gap-2 flex-wrap">
              <Badge
                text={`RUN: ${(runStatus ?? "-").toUpperCase()}`}
                tone={
                  runStatus === "klaar" ? "ok" : runStatus ? "warn" : "info"
                }
              />
            </div>

            <div className="mt-2 text-xs text-white/60 break-all">
              Matchmaking ID:{" "}
              <span className="text-white/70">
                {String(matchmakingId ?? "-")}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap md:justify-end gap-2">
              <button
                onClick={() => onBack?.()}
                className="px-3 py-2 rounded font-semibold text-white transition active:scale-95"
                style={{
                  background:
                    "linear-gradient(180deg, #ff6200 0%, #cc3d00 100%)",
                  border: "1px solid rgba(0,0,0,0.6)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 14px rgba(0,0,0,0.5)",
                }}
                title="Terug"
              >
                ←
              </button>
              <button
                onClick={() => onBackToMatchmaking?.()}
                className="px-3 py-2 rounded font-semibold text-white transition active:scale-95"
                style={{
                  background:
                    "linear-gradient(180deg, #ff6200 0%, #cc3d00 100%)",
                  border: "1px solid rgba(0,0,0,0.6)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 14px rgba(0,0,0,0.5)",
                }}
                title="Terug naar matchmaking"
              >
                Matchmaking
              </button>
              <SilverButton
                disabled={!navPrev}
                onClick={onPrev}
                title="Vorige partij"
                className="px-3 py-2"
              >
                ←
              </SilverButton>
              <SilverButton
                disabled={!navNext}
                onClick={onNext}
                title="Volgende partij"
                className="px-3 py-2"
              >
                →
              </SilverButton>
            </div>
          </div>
        </div>
      </div>
    </MetalPanel>
  );
}

function FighterMetalCard({
  side,
  naam,
  gym,
  va,
  lic,
  sv,
  dob,
  leeftijdEvent,
  geslacht,
  klasseMM,
  nulKlasse,
  nulTotaal,
  nulOpmerking,
  resultBadges = [],
  onEdit,
}: {
  side: "rood" | "blauw";
  naam: string;
  gym: string;
  va: string;
  lic: string | null | undefined;
  sv: string | null | undefined;
  dob: any;
  leeftijdEvent: string;
  geslacht: string;
  klasseMM: string;
  nulKlasse: string;
  nulTotaal: any;
  nulOpmerking: string;
  resultBadges?: any[];
  onEdit: () => void;
}) {
  const isR = side === "rood";
  const accent = isR ? "red" : "blue";
  const dot = isR ? "bg-red-500" : "bg-blue-500";
  const label = isR ? "ROOD" : "BLAUW";

  return (
    <MetalPanel className="p-0 overflow-hidden" accent={accent}>
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: `radial-gradient(circle at 18% 10%, ${
            isR ? "rgba(220,38,38,0.22)" : "rgba(37,99,235,0.22)"
          }, transparent 55%), linear-gradient(180deg, #2f3239 0%, #1a1c20 100%)`,
          borderBottomColor: "rgba(0,0,0,0.35)",
          borderLeft: `7px solid ${
            isR ? "rgba(220,38,38,0.95)" : "rgba(37,99,235,0.95)"
          }`,
        }}
      >
        <div className="flex items-center gap-2">
          <span className={`h-3.5 w-3.5 rounded-sm ${dot}`} />
          <div className="text-sm font-extrabold tracking-widest text-white">
            {label}
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`${label} vechter bewerken`}
          className="relative z-[9999] inline-flex shrink-0 items-center justify-center rounded-md border px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-lg"
          style={{
            borderColor: "rgba(0,0,0,0.55)",
            background: "linear-gradient(180deg, #ffffff 0%, #d4d4d8 55%, #a1a1aa 100%)",
            color: "#111827",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.85), 0 8px 18px rgba(0,0,0,0.45)",
          }}
        >
          ✎ Bewerken
        </button>
      </div>

      <div
        className="p-4"
        style={{
          color: "rgba(244,244,245,0.96)",
          background:
            "linear-gradient(180deg, rgba(24,24,27,0.92) 0%, rgba(10,10,12,0.96) 100%)",
        }}
      >
        <div
          className="text-3xl font-black leading-tight"
          style={{ color: NVB_ORANGE }}
        >
          {naam || "-"}
        </div>
        <div className="text-white/70">{gym || "-"}</div>
        <div className="mt-2 text-sm text-white/75">
          FP/VA: <span className="text-white font-semibold">{va || "-"}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Licentie:</span>
            <Badge
              text={(lic ?? "Onbekend").toUpperCase()}
              tone={lic === "ja" ? "ok" : lic === "nee" ? "err" : "warn"}
              invert
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Startverbod:</span>
            <Badge
              text={(sv ?? "Onbekend").toUpperCase()}
              tone={sv === "nee" ? "ok" : sv === "ja" ? "err" : "warn"}
              invert
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-white/75">
          <div>
            Geboortedatum:{" "}
            <span className="text-white">{fmtDateOnlyNL(dob)}</span>
          </div>
          <div>
            Leeftijd (event):{" "}
            <span className="text-white">{leeftijdEvent}</span>
          </div>
          <div>
            Geslacht: <span className="text-white">{geslacht || "-"}</span>
          </div>
          <div>
            Klasse: <span className="text-white">{klasseMM || "-"}</span>
          </div>
        </div>

        <div
          className="mt-4 rounded-xl border p-3"
          style={{
            border: "2px solid rgba(63,63,70,0.28)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.35) 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -8px 16px rgba(0,0,0,0.55)",
          }}
        >
          <div className="text-xs text-white/60 mb-1">Extra / nulmeting</div>
          <div className="text-sm text-white/75">
            Klasse (nulmeting):{" "}
            <span className="text-white">{nulKlasse || "-"}</span>
            <span className="text-white/40"> • </span>
            Totaal (nulmeting):{" "}
            <span className="text-white">{nulTotaal ?? "-"}</span>
          </div>
          <div className="mt-1 text-sm text-white/85 whitespace-pre-wrap">
            {nulOpmerking ? nulOpmerking : "-"}
          </div>
        </div>
      </div>
    </MetalPanel>
  );
}

function parseISODateOnly(d?: any): Date | null {
  if (!d) return null;
  const s = String(d).trim();
  const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return isNaN(dt.getTime()) ? null : dt;
}

function dateOnlyUTC(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function addMonthsUTC(date: Date, add: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const day = date.getUTCDate();

  const ty = y + Math.floor((m + add) / 12);
  const tm = (((m + add) % 12) + 12) % 12;

  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const dd = Math.min(day, last);

  return new Date(Date.UTC(ty, tm, dd));
}

function diffMonthsDaysAbs(a: Date, b: Date): { months: number; days: number } {
  const A = dateOnlyUTC(a);
  const B = dateOnlyUTC(b);

  let start = A;
  let end = B;
  if (start.getTime() > end.getTime()) {
    start = B;
    end = A;
  }

  let months = 0;
  let cursor = start;

  while (true) {
    const next = addMonthsUTC(cursor, 1);
    if (next.getTime() <= end.getTime()) {
      months += 1;
      cursor = next;
      continue;
    }
    break;
  }

  const MS_DAY = 24 * 60 * 60 * 1000;
  const days = Math.round((end.getTime() - cursor.getTime()) / MS_DAY);

  return { months, days };
}

function fmtMonthsDays(months: number, days: number): string {
  const m = Number.isFinite(months) ? months : 0;
  const d = Number.isFinite(days) ? days : 0;

  if (m > 0 && d > 0) return `${m} maanden ${d} dagen`;
  if (m > 0) return `${m} maanden`;
  return `${d} dagen`;
}

function fmtDateOnlyNL(d?: any) {
  if (!d) return "-";
  const dt = parseISODateOnly(d);
  if (!dt) return String(d);
  return dt.toLocaleDateString("nl-NL");
}

function calcAgeYearsOnDate(eventDate: Date, birthDate: Date): number | null {
  let years = eventDate.getFullYear() - birthDate.getFullYear();
  const m = eventDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && eventDate.getDate() < birthDate.getDate()))
    years -= 1;
  if (years < 0 || !Number.isFinite(years)) return null;
  return years;
}

function ageYearsAtEvent(ctx: AnyRow, side: "rood" | "blauw"): string {
  const event = parseISODateOnly(ctx?.evenement_datum);
  const birth = parseISODateOnly(
    ctx?.[`${side}_geboortedatum_fp`] ?? ctx?.[`${side}_geboortedatum_mm`],
  );
  if (!event || !birth) return "-";
  const years = calcAgeYearsOnDate(event, birth);
  return years == null ? "-" : `${years} jaar`;
}

function toInt(v: any): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toNumKg(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/,/g, ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseJaNee(v: any): "ja" | "nee" | null {
  if (v === true) return "ja";
  if (v === false) return "nee";
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (["ja", "yes", "true", "1"].includes(s)) return "ja";
  if (["nee", "no", "false", "0"].includes(s)) return "nee";
  return null;
}

function normResultaat(v: any): string {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (
    s === "afkeur" ||
    s === "afgekeur" ||
    s === "afgekeurd" ||
    s === "afkeuren"
  )
    return "afgekeurd";
  if (s === "actie" || s === "waarschuwing") return "actie";
  if (s === "dispensatie" || s === "disp") return "dispensatie";
  if (s === "ok" || s === "goedgekeurd") return "ok";
  return s;
}

function asUuid(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "[object Object]") return null;
  return s;
}

function isApprovedOverride(row: ControleResultaatRow): boolean {
  return (
    String(row?.review_status ?? "")
      .trim()
      .toLowerCase() === "goedgekeurd" || normResultaat(row?.resultaat) === "ok"
  );
}

function displayResultaat(row: ControleResultaatRow): {
  label: string;
  tone: "ok" | "warn" | "disp" | "err" | "info" | "verbod";
} {
  if (isApprovedOverride(row)) {
    return { label: "OK", tone: "ok" };
  }

  const code = String(row.rule_code ?? "").toUpperCase();
  const msg = String(row.boodschap ?? "").toLowerCase();

  if (
    msg.includes("geen data") ||
    msg.includes("no data") ||
    msg.includes("missing")
  ) {
    return { label: "GEEN DATA", tone: "info" };
  }

  if (code.startsWith("STARTVERBOD_")) {
    return { label: "STARTVERBOD", tone: "verbod" };
  }

  // Belgische keurmerkcontrole is altijd informatief en nooit afkeur.
  if (code.startsWith("KEURMERK_BE_")) {
    return { label: "ACTIE", tone: "info" };
  }

  if (code.startsWith("LICENTIE_") || code.startsWith("KEURMERK_")) {
    return { label: "AFKEUR", tone: "err" };
  }

  const r = normResultaat(row.resultaat);
  if (r === "verbod" || r.includes("verbod")) {
    return { label: "VERBOD", tone: "verbod" };
  }
  if (r === "afgekeurd") return { label: "AFKEUR", tone: "err" };
  if (r === "dispensatie") return { label: "DISPENSATIE", tone: "disp" };
  if (r === "actie") return { label: "ACTIE", tone: "warn" };
  if (r === "ok") return { label: "OK", tone: "ok" };
  return { label: String(r).toUpperCase(), tone: "info" };
}

function canReviewResultaatForRoles(
  row: ControleResultaatRow,
  roleNames: string[],
): boolean {
  const res = normResultaat(row?.resultaat);
  if (!res || res === "ok") return false;

  const roles = (roleNames ?? []).map((r) => String(r).trim().toLowerCase());
  const isSuperadmin = roles.includes("superadmin");
  const isMatchmaker = roles.includes("matchmaker");
  const isAdminRole =
    roles.includes("admin") || roles.includes("hoofdofficial");
  const isDispensatieAdmin = roles.includes("dispensatie_admin");

  if (isSuperadmin) return true;
  if (isDispensatieAdmin) return res === "dispensatie";
  if (isAdminRole) return res === "actie" || res === "afgekeurd";
  if (isMatchmaker) return res === "actie";
  return false;
}

function rowMatchesSide(
  row: ControleResultaatRow,
  side: "rood" | "blauw",
): boolean {
  const sideToken = side.toLowerCase();
  const otherToken = side === "rood" ? "blauw" : "rood";

  const fields = [
    row?.hoek,
    row?.rule_code,
    row?.rule,
    row?.boodschap,
    row?.review_note,
  ]
    .map((v) => String(v ?? "").toLowerCase())
    .filter(Boolean);

  if (
    fields.some((v) => v.includes(sideToken)) &&
    !fields.some((v) => v.includes(otherToken))
  ) {
    return true;
  }

  if (
    String(row?.hoek ?? "")
      .trim()
      .toLowerCase() === sideToken
  ) {
    return true;
  }

  return false;
}

function buildSideResultBadges(
  rows: ControleResultaatRow[],
  side: "rood" | "blauw",
): Array<{
  key: string;
  text: string;
  tone: "ok" | "warn" | "disp" | "err" | "info" | "verbod";
}> {
  const out: Array<{
    key: string;
    text: string;
    tone: "ok" | "warn" | "disp" | "err" | "info" | "verbod";
  }> = [];
  const seen = new Set<string>();

  for (const row of rows ?? []) {
    if (!rowMatchesSide(row, side)) continue;
    const disp = displayResultaat(row);
    if (!disp?.label || disp.label === "OK") continue;
    const key = `${disp.label}__${disp.tone}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, text: disp.label, tone: disp.tone });
  }

  return out;
}

function displayBoodschap(row: ControleResultaatRow): string {
  if (isApprovedOverride(row)) return "OK";
  return String(row?.boodschap ?? "-") || "-";
}

function UitslagenTable({
  rows,
  pageSize = 6,
}: {
  rows: UitslagRow[];
  pageSize?: number;
}) {
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    setLimit(pageSize);
  }, [pageSize, rows]);

  const shown = rows.slice(0, limit);
  const hasMore = shown.length < rows.length;
  const padCount = Math.max(0, pageSize - shown.length);

  return (
    <div className="overflow-auto rounded-md border-2 border-zinc-300 bg-white">
      <table className="w-full text-sm border-collapse table-fixed">
        <thead
          className="bg-zinc-800 text-white border-b-4"
          style={{ borderColor: NVB_ORANGE }}
        >
          <tr>
            <th className="text-left px-3 py-2 w-32 border-r border-zinc-700">
              Datum
            </th>
            <th className="text-left px-3 py-2 w-48 border-r border-zinc-700">
              Discipline
            </th>
            <th className="text-left px-3 py-2 w-16 border-r border-zinc-700">
              Klasse
            </th>
            <th className="text-left px-3 py-2">Uitslag</th>
          </tr>
        </thead>

        <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(odd)]:text-zinc-900 [&>tr:nth-child(even)]:bg-zinc-700 [&>tr:nth-child(even)]:text-white">
          {shown.length === 0 ? (
            <>
              <tr>
                <td className="px-3 py-2" colSpan={4}>
                  Geen uitslagen gevonden.
                </td>
              </tr>
              {Array.from({ length: Math.max(0, pageSize - 1) }).map(
                (_, idx) => (
                  <tr key={`empty-${idx}`}>
                    <td className="px-3 py-2 w-32">&nbsp;</td>
                    <td className="px-3 py-2 w-48">&nbsp;</td>
                    <td className="px-3 py-2 w-16">&nbsp;</td>
                    <td className="px-3 py-2">&nbsp;</td>
                  </tr>
                ),
              )}
            </>
          ) : (
            <>
              {shown.map((r, idx) => (
                <tr key={`${r.datum ?? "d"}-${idx}`}>
                  <td className="px-3 py-2 w-32 whitespace-nowrap opacity-80">
                    {r.datum ?? "-"}
                  </td>
                  <td className="px-3 py-2 w-48 font-semibold truncate">
                    {r.discipline ?? "-"}
                  </td>
                  <td className="px-3 py-2 w-16 text-center font-bold">
                    {r.klasse ?? "-"}
                  </td>
                  <td className="px-3 py-2">{r.uitslag ?? "-"}</td>
                </tr>
              ))}
              {padCount > 0
                ? Array.from({ length: padCount }).map((_, i) => (
                    <tr key={`pad-${i}`}>
                      <td className="px-3 py-2 w-32">&nbsp;</td>
                      <td className="px-3 py-2 w-48">&nbsp;</td>
                      <td className="px-3 py-2 w-16">&nbsp;</td>
                      <td className="px-3 py-2">&nbsp;</td>
                    </tr>
                  ))
                : null}
            </>
          )}
        </tbody>
      </table>

      {rows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 p-3 border-t border-zinc-300">
          <div className="text-xs text-zinc-600">
            {shown.length} / {rows.length}
          </div>
          {hasMore ? (
            <button
              type="button"
              onClick={() => setLimit((n) => n + pageSize)}
              className="px-3 py-2 rounded bg-[var(--brand-orange)] text-black text-xs font-extrabold hover:opacity-90"
            >
              Verder
            </button>
          ) : (
            <span className="text-xs text-zinc-500">Einde</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function PartijDetailPage() {
  const [allPartijNrs, setAllPartijNrs] = useState<number[]>([]);
  const noteDraftRef = useRef<Record<string, string>>({});

  const params = useParams();
  const router = useRouter();
  const matchmakingId = params?.matchmakingId as string;
  const partijNrStr = params?.partijNr as string;

  const partijNr = useMemo(() => {
    const n = Number(partijNrStr);
    return Number.isFinite(n) ? n : null;
  }, [partijNrStr]);

  const nav = useMemo(() => {
    if (!partijNr || allPartijNrs.length === 0) {
      return { prev: null as number | null, next: null as number | null };
    }

    const idx = allPartijNrs.indexOf(partijNr);
    if (idx === -1) {
      return { prev: null as number | null, next: null as number | null };
    }

    return {
      prev: idx > 0 ? allPartijNrs[idx - 1] : null,
      next: idx < allPartijNrs.length - 1 ? allPartijNrs[idx + 1] : null,
    };
  }, [partijNr, allPartijNrs]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

  const [run, setRun] = useState<ControleRun | null>(null);
  const [evenementNaam, setEvenementNaam] = useState<string | null>(null);
  const [evenementDatum, setEvenementDatum] = useState<string | null>(null);

  const [ctx, setCtx] = useState<AnyRow | null>(null);
  const [regels, setRegels] = useState<ControleResultaatRow[]>([]);

  const [uitslagenRood, setUitslagenRood] = useState<UitslagRow[]>([]);
  const [uitslagenBlauw, setUitslagenBlauw] = useState<UitslagRow[]>([]);

  const [approving, setApproving] = useState(false);
  const [rescraping, setRescraping] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [sendingDisp, setSendingDisp] = useState(false);
  const [dispSent, setDispSent] = useState(false);

  const [roleNames, setRoleNames] = useState<string[]>([]);
  const isSuperadmin = useMemo(
    () => roleNames.map((r) => r.toLowerCase()).includes("superadmin"),
    [roleNames],
  );
  const isAdmin = useMemo(() => {
    const lower = roleNames.map((r) => r.toLowerCase());
    return lower.includes("admin") || lower.includes("superadmin");
  }, [roleNames]);

  const isMatchmaker = useMemo(() => {
    const lower = roleNames.map((r) => r.toLowerCase());
    return lower.includes("matchmaker");
  }, [roleNames]);

  const [editOpen, setEditOpen] = useState<null | "rood" | "blauw">(null);
  const [editVa, setEditVa] = useState("");
  const [editNaam, setEditNaam] = useState("");
  const [editGym, setEditGym] = useState("");
  const [editBoutDiscipline, setEditBoutDiscipline] = useState("");
  const [editBoutKlasse, setEditBoutKlasse] = useState("");
  const [editGewicht, setEditGewicht] = useState("");
  const [editGeslacht, setEditGeslacht] = useState("");
  const [editMaxGewicht, setEditMaxGewicht] = useState("");
  const editDraftRef = useRef<{
    va: string;
    naam: string;
    gym: string;
    discipline: string;
    klasse: string;
    gewicht: string;
    geslacht: string;
    max_gewicht: string;
  }>({
    va: "",
    naam: "",
    gym: "",
    discipline: "",
    klasse: "",
    gewicht: "",
    geslacht: "",
    max_gewicht: "",
  });
  const [editMountKey, setEditMountKey] = useState(0);
  const [editSaving, setEditSaving] = useState(false);
  const vaGewijzigd = false;

  // handmatige melding
  const [customOpen, setCustomOpen] = useState(false);
  const [customSaving, setCustomSaving] = useState(false);
  const [customMountKey, setCustomMountKey] = useState(0);
  const customDraftRef = useRef<{
    rule: string;
    resultaat: "actie" | "afgekeurd" | "dispensatie" | "ok";
    boodschap: string;
    aantekeningen: string;
  }>({
    rule: "Handmatige melding",
    resultaat: "actie",
    boodschap: "",
    aantekeningen: "",
  });

  function openEdit(side: "rood" | "blauw") {
    if (!ctx) return;

    const va = String(ctx?.[`${side}_va_mm`] ?? "").trim();
    const naam = String(
      ctx?.[`${side}_naam_mm`] ?? ctx?.[`${side}_naam_fp`] ?? "",
    ).trim();
    const gym = String(ctx?.[`${side}_gym_mm`] ?? "").trim();
    const gewicht = String(
      ctx?.[`${side}_gewicht_mm`] ??
        ctx?.[`${side}_gewicht`] ??
        ctx?.[`gewicht_${side}_mm`] ??
        "",
    ).trim();

    setEditVa(va);
    setEditNaam(naam);
    setEditGym(gym);
    setEditGewicht(gewicht);

    const d = String(ctx?.discipline ?? ctx?.discipline_mm ?? "").trim();
    const k = String(ctx?.klasse_mm ?? ctx?.klasse ?? "").trim();
    const g = String(
      ctx?.geslacht ??
        ctx?.[`${side}_geslacht_mm`] ??
        ctx?.[`${side}_geslacht`] ??
        "",
    ).trim();
    const maxG = String(
      ctx?.max_gewicht ??
        ctx?.max_gewicht_mm ??
        ctx?.gewicht_max_mm ??
        ctx?.matchmaking_bouts_raw_max_gewicht ??
        "",
    ).trim();
    setEditBoutDiscipline(d);
    setEditBoutKlasse(k);
    setEditGeslacht(g);
    setEditMaxGewicht(maxG);

    editDraftRef.current = {
      va,
      naam,
      gym,
      discipline: d,
      klasse: k,
      gewicht,
      geslacht: g,
      max_gewicht: maxG,
    };
    setEditMountKey((x) => x + 1);
    setEditOpen(side);
  }

  function closeEdit() {
    setEditBoutDiscipline("");
    setEditBoutKlasse("");
    setEditGewicht("");
    setEditGeslacht("");
    setEditMaxGewicht("");
    editDraftRef.current = {
      va: "",
      naam: "",
      gym: "",
      discipline: "",
      klasse: "",
      gewicht: "",
      geslacht: "",
      max_gewicht: "",
    };
    setEditOpen(null);
  }

  function openCustomMelding() {
    customDraftRef.current = {
      rule: "Handmatige melding",
      resultaat: "actie",
      boodschap: "",
      aantekeningen: "",
    };
    setCustomMountKey((x) => x + 1);
    setCustomOpen(true);
  }

  function closeCustomMelding() {
    customDraftRef.current = {
      rule: "Handmatige melding",
      resultaat: "actie",
      boodschap: "",
      aantekeningen: "",
    };
    setCustomOpen(false);
  }

  function severityFromResultaat(
    resultaat: "actie" | "afgekeurd" | "dispensatie" | "ok",
  ) {
    if (resultaat === "afgekeurd") return "error";
    if (resultaat === "dispensatie") return "warning";
    if (resultaat === "actie") return "warning";
    return "info";
  }

  async function loadMyRoles() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id ?? null;
    if (!uid) {
      setRoleNames([]);
      return { uid: null as string | null, roles: [] as string[] };
    }

    const names: string[] = [];

    // Nieuwe accounts staan soms alleen in user_profiles.role / active_role
    // en hebben nog geen rij in user_roles. Dan moet de matchmaker nog steeds
    // de bewerkknop krijgen.
    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("role, active_role")
      .eq("id", uid)
      .maybeSingle();

    if (profileErr) {
      console.error("Fout bij laden user_profiles:", profileErr);
    }

    for (const value of [profile?.role, profile?.active_role]) {
      const name = String(value ?? "").trim();
      if (name && !names.some((x) => x.toLowerCase() === name.toLowerCase())) {
        names.push(name);
      }
    }

    const { data: ur, error: urErr } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", uid);
    if (urErr) {
      console.error("Fout bij laden user_roles:", urErr);
    }

    const roleIds = (ur ?? [])
      .map((x: any) => x.role_id)
      .filter(Boolean) as string[];

    if (roleIds.length > 0) {
      const { data: rr, error: rrErr } = await supabase
        .from("roles")
        .select("id, name")
        .in("id", roleIds);
      if (rrErr) {
        console.error("Fout bij laden roles:", rrErr);
      } else {
        for (const r of rr ?? []) {
          const name = String((r as any)?.name ?? "").trim();
          if (
            name &&
            !names.some((x) => x.toLowerCase() === name.toLowerCase())
          ) {
            names.push(name);
          }
        }
      }
    }

    setRoleNames(names);
    return { uid, roles: names };
  }

  function canApproveRule(r: ControleResultaatRow) {
    const reviewStatus = String(r?.review_status ?? "")
      .trim()
      .toLowerCase();

    if (isApprovedOverride(r)) return false;
    if (reviewStatus === "goedgekeurd" || reviewStatus === "approved") {
      return false;
    }

    const display = displayResultaat(r);
    const label = String(display.label ?? "").trim().toUpperCase();

    // Matchmaker-partijpagina: alleen ACTIE en INFO mogen knoppen tonen.
    // AFKEUR, VERBOD/STARTVERBOD, DISPENSATIE en OK tonen nooit reviewknoppen.
    return label === "ACTIE" || label === "INFO";
  }

  async function saveAantekeningen(resultaatId: string, text: string) {
    if (!resultaatId) return;
    setError(null);

    try {
      const { error: updErr } = await supabase
        .from("controle_resultaten")
        .update({ aantekeningen: text })
        .eq("id", resultaatId);
      if (updErr) throw updErr;

      setRegels((prev) =>
        prev.map((r) =>
          r.id === resultaatId ? { ...r, aantekeningen: text } : r,
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  function getNoteFor(resultaatId: string) {
    if (!resultaatId) return "";
    const draft = noteDraftRef.current[resultaatId];
    if (draft != null) return String(draft);
    const row = regels.find((r) => r.id === resultaatId);
    return String(row?.aantekeningen ?? "");
  }

  function primeNoteDrafts(rows: ControleResultaatRow[]) {
    const cur = noteDraftRef.current;
    for (const r of rows ?? []) {
      if (!r?.id) continue;
      if (cur[r.id] == null) cur[r.id] = String(r?.aantekeningen ?? "");
    }
  }

  function dedupeControleResultatenRows(rows: ControleResultaatRow[]) {
    const map = new Map<string, ControleResultaatRow>();

    for (const row of rows ?? []) {
      const id = String(row?.id ?? "").trim();
      const fallback = [
        row?.controle_run_id,
        row?.run_id,
        row?.matchmaking_id,
        row?.bout_id,
        row?.partij_nr,
        row?.hoek,
        row?.rule_code,
        row?.rule,
        row?.boodschap,
        row?.created_at,
      ]
        .map((v) =>
          String(v ?? "")
            .trim()
            .toLowerCase(),
        )
        .join("|");

      const key = id || fallback;
      if (!key || map.has(key)) continue;
      map.set(key, row);
    }

    return Array.from(map.values()).sort((a, b) => {
      const ta = new Date(String(a?.created_at ?? "")).getTime();
      const tb = new Date(String(b?.created_at ?? "")).getTime();
      if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb)
        return ta - tb;
      return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
    });
  }

  async function fetchRegelsVoorPartij(opts: {
    runId: string;
    partijNr: number;
    ctxRow?: AnyRow | null;
  }): Promise<ControleResultaatRow[]> {
    const { runId, partijNr, ctxRow } = opts;
    const boutId = asUuid(ctxRow?.bout_id);
    const mmId = String(matchmakingId ?? "").trim();

    const queries = [
      supabase
        .from("controle_resultaten")
        .select("*")
        .eq("controle_run_id", runId)
        .eq("partij_nr", partijNr),
      supabase
        .from("controle_resultaten")
        .select("*")
        .eq("run_id", runId)
        .eq("partij_nr", partijNr),
    ];

    // Weegstation-meldingen staan ook in controle_resultaten, maar kunnen
    // vanuit een andere flow met alleen matchmaking_id/partij_nr of bout_id zijn opgeslagen.
    // Daarom halen we die bewust mee, zonder de rest van deze goed werkende pagina te veranderen.
    if (mmId) {
      queries.push(
        supabase
          .from("controle_resultaten")
          .select("*")
          .eq("matchmaking_id", mmId)
          .eq("partij_nr", partijNr),
      );
    }

    if (mmId && boutId) {
      queries.push(
        supabase
          .from("controle_resultaten")
          .select("*")
          .eq("matchmaking_id", mmId)
          .eq("bout_id", boutId),
      );
    }

    const results = await Promise.all(queries);
    const allRows: ControleResultaatRow[] = [];

    for (const res of results) {
      if (res.error) throw res.error;
      allRows.push(...((res.data ?? []) as unknown as ControleResultaatRow[]));
    }

    return dedupeControleResultatenRows(allRows);
  }

  async function reloadRegels() {
    if (!run?.id || !partijNr) return;
    const rows = await fetchRegelsVoorPartij({
      runId: run.id,
      partijNr,
      ctxRow: ctx,
    });
    setRegels(rows);
    primeNoteDrafts(rows);
  }

  async function createHandmatigeMelding() {
    if (!run?.id || !partijNr || !matchmakingId) return;

    const ruleTitle =
      String(customDraftRef.current.rule ?? "").trim() || "Handmatige melding";
    const customResultaat = customDraftRef.current.resultaat;
    const boodschap = String(customDraftRef.current.boodschap ?? "").trim();
    const aantekeningen = String(
      customDraftRef.current.aantekeningen ?? "",
    ).trim();

    if (!boodschap) {
      setError("Vul eerst je handmatige melding in.");
      return;
    }

    setCustomSaving(true);
    setError(null);
    setMsg("");

    try {
      const boutId = asUuid(ctx?.bout_id);

      const payload: Record<string, any> = {
        controle_run_id: run.id,
        run_id: run.id,
        matchmaking_id: String(matchmakingId),
        partij_nr: partijNr,
        bout_id: boutId,
        rule: ruleTitle,
        rule_code: "HANDMATIGE_MELDING",
        resultaat: customResultaat,
        original_resultaat: customResultaat.toUpperCase(),
        boodschap,
        aantekeningen: aantekeningen || null,
        severity: severityFromResultaat(customResultaat),
        review_status: "open",
        hoek: null,
      };

      const { error: insErr } = await supabase
        .from("controle_resultaten")
        .insert(payload);

      if (insErr) throw insErr;

      closeCustomMelding();
      await reloadRegels();
      setMsg("✅ Handmatige melding toegevoegd.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setCustomSaving(false);
    }
  }

  async function approveSingle(resultaatId: string) {
    if (!resultaatId) return;
    if (!run?.id || !partijNr) return;

    setApproving(true);
    setError(null);

    try {
      const row = regels.find((r) => r.id === resultaatId);
      if (row && !canApproveRule(row)) {
        throw new Error(
          "Deze melding staat al op OK of heeft geen goed te keuren resultaat.",
        );
      }

      const reason = String(getNoteFor(resultaatId) ?? "").trim();

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token ?? null;
      if (!token) throw new Error("Niet ingelogd (geen access token).");

      const rApi = await authedFetch("/api/control-engine/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          controle_resultaat_id: resultaatId,
          decision: "approve",
          note: reason,
        }),
      });

      const jApi = await rApi.json().catch(() => ({}));
      if (!rApi.ok) throw new Error(jApi?.error ?? "Goedkeuren mislukt");

      await reloadRegels();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setApproving(false);
    }
  }

  async function rejectSingle(resultaatId: string) {
    if (!resultaatId) return;
    if (!run?.id || !partijNr) return;

    setApproving(true);
    setError(null);

    try {
      const row = regels.find((r) => r.id === resultaatId);
      if (row && !canApproveRule(row)) {
        throw new Error(
          "Deze melding staat al op OK of heeft geen af te keuren resultaat.",
        );
      }

      const reason = String(getNoteFor(resultaatId) ?? "").trim();
      if (!reason) {
        throw new Error(
          "Vul eerst een reden in bij Aantekeningen (verplicht bij afkeuren).",
        );
      }

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token ?? null;
      if (!token) throw new Error("Niet ingelogd (geen access token).");

      const rApi = await authedFetch("/api/control-engine/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          controle_resultaat_id: resultaatId,
          decision: "reject",
          note: reason,
        }),
      });

      const jApi = await rApi.json().catch(() => ({}));
      if (!rApi.ok) throw new Error(jApi?.error ?? "Afkeuren mislukt");

      await reloadRegels();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setApproving(false);
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setMsg("");

      try {
        if (!matchmakingId || !partijNr) {
          setError("Onjuiste parameters (matchmakingId/partijNr).");
          return;
        }

        try {
          const { data: ups, error: upErr } = await supabase
            .from("matchmaking_uploads")
            .select("evenement_naam, evenement_datum, event_id")
            .eq("matchmaking_id", matchmakingId)
            .order("uploaded_at", { ascending: false })
            .limit(1);

          if (upErr) throw upErr;

          const up = (ups ?? [])?.[0] as any;
          let naam = String(up?.evenement_naam ?? "").trim() || null;
          let datum = String(up?.evenement_datum ?? "").trim() || null;
          const eventId = String(up?.event_id ?? "").trim() || null;

          if (eventId && (!naam || !datum)) {
            const { data: ev, error: evErr } = await supabase
              .from("events")
              .select("naam, datum")
              .eq("id", eventId)
              .maybeSingle();
            if (evErr) throw evErr;
            if (!naam) naam = String((ev as any)?.naam ?? "").trim() || null;
            if (!datum) datum = String((ev as any)?.datum ?? "").trim() || null;
          }

          setEvenementNaam(naam);
          setEvenementDatum(datum);
        } catch {
          setEvenementNaam(null);
          setEvenementDatum(null);
        }

        await loadMyRoles();

        const { data: runs, error: runErr } = await supabase
          .from("controle_runs")
          .select(
            "id, matchmaking_id, status, gestart_op, afgerond_op, run_type",
          )
          .eq("matchmaking_id", matchmakingId)
          .order("gestart_op", { ascending: false })
          .limit(1);

        if (runErr) throw runErr;

        const latestRun = (runs?.[0] ?? null) as ControleRun | null;
        setRun(latestRun);

        if (!latestRun?.id) {
          setCtx(null);
          setRegels([]);
          setUitslagenRood([]);
          setUitslagenBlauw([]);
          setAllPartijNrs([]);
          setDispSent(false);
          return;
        }

        const { data: pnRows, error: pnErr } = await supabase
          .from("controle_bout_context")
          .select("partij_nr")
          .eq("controle_run_id", latestRun.id)
          .order("partij_nr", { ascending: true });

        if (pnErr) throw pnErr;

        const pnList = Array.from(
          new Set(
            (pnRows ?? [])
              .map((r: any) => Number(r.partij_nr))
              .filter((n: number) => Number.isFinite(n) && n > 0),
          ),
        ).sort((a, b) => a - b);

        setAllPartijNrs(pnList);

        const { data: ctxRows, error: ctxErr } = await supabase
          .from("controle_bout_context")
          .select("*")
          .eq("controle_run_id", latestRun.id)
          .eq("partij_nr", partijNr)
          .limit(1);

        if (ctxErr) throw ctxErr;

        const row = (ctxRows?.[0] ?? null) as AnyRow | null;
        setCtx(row);

        const boutIdForDisp = String((row as any)?.bout_id ?? "").trim();
        let dispReqQuery = supabase
          .from("dispensatie_requests")
          .select("id")
          .eq("matchmaking_id", matchmakingId)
          .eq("partij_nr", partijNr)
          .limit(1);

        if (boutIdForDisp) {
          dispReqQuery = dispReqQuery.eq("bout_id", boutIdForDisp);
        }

        const { data: dispReqRows, error: dispReqErr } = await dispReqQuery;
        if (dispReqErr) throw dispReqErr;
        setDispSent((dispReqRows ?? []).length > 0);

        {
          const rows = await fetchRegelsVoorPartij({
            runId: latestRun.id,
            partijNr,
            ctxRow: row,
          });
          setRegels(rows);
          primeNoteDrafts(rows);
        }

        const vaR = row?.rood_va_mm ? String(row.rood_va_mm).trim() : null;
        const vaB = row?.blauw_va_mm ? String(row.blauw_va_mm).trim() : null;
        const partijNrNum = Number(row?.partij_nr ?? partijNr ?? null);

        if (!partijNrNum) {
          setUitslagenRood([]);
          setUitslagenBlauw([]);
        } else {
          const [roodRes, blauwRes] = await Promise.all([
            vaR
              ? supabase
                  .from("controle_uitslagen")
                  .select("datum, discipline, klasse, uitslag")
                  .eq("matchmaking_id", matchmakingId)
                  .eq("controle_run_id", latestRun.id)
                  .eq("partij_nr", partijNrNum)
                  .eq("hoek", "rood")
                  .eq("va_nummer", vaR)
                  .order("datum", { ascending: false })
              : Promise.resolve({ data: [], error: null } as any),

            vaB
              ? supabase
                  .from("controle_uitslagen")
                  .select("datum, discipline, klasse, uitslag")
                  .eq("matchmaking_id", matchmakingId)
                  .eq("controle_run_id", latestRun.id)
                  .eq("partij_nr", partijNrNum)
                  .eq("hoek", "blauw")
                  .eq("va_nummer", vaB)
                  .order("datum", { ascending: false })
              : Promise.resolve({ data: [], error: null } as any),
          ]);

          if (roodRes?.error) throw roodRes.error;
          if (blauwRes?.error) throw blauwRes.error;

          setUitslagenRood((roodRes?.data ?? []) as UitslagRow[]);
          setUitslagenBlauw((blauwRes?.data ?? []) as UitslagRow[]);
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [matchmakingId, partijNr]);

  const header = useMemo(() => {
    const evDatum = ctx?.evenement_datum ?? evenementDatum ?? null;
    const evNaam = ctx?.evenement_naam ?? evenementNaam ?? null;
    const roodNaam = ctx?.rood_naam_fp ?? ctx?.rood_naam_mm ?? "-";
    const blauwNaam = ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm ?? "-";
    const roodGym = ctx?.rood_gym_mm ?? "-";
    const blauwGym = ctx?.blauw_gym_mm ?? "-";
    const discipline = ctx?.discipline ?? "-";
    const klasseMM = ctx?.klasse_mm ?? "-";

    const roodDob =
      ctx?.rood_geboortedatum_fp ?? ctx?.rood_geboortedatum_mm ?? null;
    const blauwDob =
      ctx?.blauw_geboortedatum_fp ?? ctx?.blauw_geboortedatum_mm ?? null;

    const roodLic = parseJaNee(ctx?.rood_licentie);
    const blauwLic = parseJaNee(ctx?.blauw_licentie);
    const roodSv = parseJaNee(ctx?.rood_heeft_startverbod);
    const blauwSv = parseJaNee(ctx?.blauw_heeft_startverbod);

    return {
      evDatum,
      evNaam,
      discipline,
      klasseMM,
      roodNaam,
      blauwNaam,
      roodGym,
      blauwGym,
      roodDob,
      blauwDob,
      roodLic,
      blauwLic,
      roodSv,
      blauwSv,
    };
  }, [ctx, evenementDatum, evenementNaam]);

  const verschillen = useMemo(() => {
    if (!ctx) return null;

    const countDemo = (rows: UitslagRow[]) =>
      (rows ?? []).reduce((acc, r) => {
        const s = String(r?.uitslag ?? "").toLowerCase();
        return acc + (s.includes("demo") || s.includes("demonstr") ? 1 : 0);
      }, 0);

    const eventDate = parseISODateOnly(ctx?.evenement_datum);
    const rBirth = parseISODateOnly(
      ctx?.rood_geboortedatum_fp ?? ctx?.rood_geboortedatum_mm,
    );
    const bBirth = parseISODateOnly(
      ctx?.blauw_geboortedatum_fp ?? ctx?.blauw_geboortedatum_mm,
    );

    const leeftijdDiff =
      eventDate && rBirth && bBirth ? diffMonthsDaysAbs(rBirth, bBirth) : null;

    const leeftijdVerschilTekst = leeftijdDiff
      ? fmtMonthsDays(leeftijdDiff.months, leeftijdDiff.days)
      : null;

    const roodPartijen = toInt(ctx?.rood_totaal_wedstrijden_scrape);
    const blauwPartijen = toInt(ctx?.blauw_totaal_wedstrijden_scrape);

    const roodDemo = toInt(ctx?.rood_demo_totaal) ?? countDemo(uitslagenRood);
    const blauwDemo =
      toInt(ctx?.blauw_demo_totaal) ?? countDemo(uitslagenBlauw);

    const roodEffectief =
      roodPartijen != null
        ? roodPartijen - (roodDemo ?? 0) + Math.floor((roodDemo ?? 0) / 3)
        : null;
    const blauwEffectief =
      blauwPartijen != null
        ? blauwPartijen - (blauwDemo ?? 0) + Math.floor((blauwDemo ?? 0) / 3)
        : null;

    const partijenVerschil =
      roodEffectief != null && blauwEffectief != null
        ? Math.abs(roodEffectief - blauwEffectief)
        : null;

    return {
      leeftijdVerschilTekst,
      roodLeeftijd: ageYearsAtEvent(ctx, "rood"),
      blauwLeeftijd: ageYearsAtEvent(ctx, "blauw"),
      roodPartijen,
      blauwPartijen,
      roodDemo,
      blauwDemo,
      partijenVerschil,
      roodNulmetingTotaal: toInt(
        ctx?.rood_totaal_nulmeting_totaal ?? ctx?.rood_nulmeting_totaal,
      ),
      blauwNulmetingTotaal: toInt(
        ctx?.blauw_totaal_nulmeting_totaal ?? ctx?.blauw_nulmeting_totaal,
      ),
    };
  }, [ctx, uitslagenRood, uitslagenBlauw]);

  const gewichtInfo = useMemo(() => {
    if (!ctx) return null;

    const norm = (v: any) =>
      String(v ?? "")
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/\(|\)/g, "")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const rKg = toNumKg(
      ctx?.rood_gewicht_mm ?? ctx?.rood_gewicht ?? ctx?.gewicht_rood_mm,
    );
    const bKg = toNumKg(
      ctx?.blauw_gewicht_mm ?? ctx?.blauw_gewicht ?? ctx?.gewicht_blauw_mm,
    );
    const explicitMaxKg = toNumKg(
      ctx?.max_gewicht ??
        ctx?.max_gewicht_mm ??
        ctx?.gewicht_max_mm ??
        ctx?.matchmaking_bouts_raw_max_gewicht,
    );

    const discipline = norm(ctx?.discipline ?? ctx?.discipline_mm);
    const klasse = norm(ctx?.klasse_mm ?? ctx?.klasse);
    const isMma = discipline.includes("mma") || klasse.includes("mma");

    const roodLeeftijd = leeftijdOpEventGetal(ctx, "rood");
    const blauwLeeftijd = leeftijdOpEventGetal(ctx, "blauw");
    const knownAges = [roodLeeftijd, blauwLeeftijd].filter(
      (v): v is number => typeof v === "number",
    );
    const jongste = knownAges.length ? Math.min(...knownAges) : null;

    const isJeugd =
      klasse === "j" ||
      klasse === "j+" ||
      /\bj\b/.test(klasse) ||
      klasse.includes("jeugd") ||
      klasse.includes("16/17") ||
      klasse.includes("16 17") ||
      klasse.includes("jr") ||
      (jongste != null && jongste < 18);

    const MMA_CLASSES = [
      { name: "Strawweight", min: 0, max: 52.2 },
      { name: "Flyweight", min: 52.2000001, max: 56.7 },
      { name: "Bantamweight", min: 56.7000001, max: 61.2 },
      { name: "Featherweight", min: 61.2000001, max: 65.8 },
      { name: "Lightweight", min: 65.8000001, max: 70.3 },
      { name: "Welterweight", min: 70.3000001, max: 77.1 },
      { name: "Middleweight", min: 77.1000001, max: 83.9 },
      { name: "Light Heavyweight", min: 83.9000001, max: 93.0 },
      { name: "Heavyweight", min: 93.0000001, max: 120.2 },
      { name: "Super Heavyweight", min: 120.2000001, max: null as any },
    ];

    const KB_CLASSES = [
      { name: "Junior Flyweight", min: 46.69, max: 48.99 },
      { name: "Flyweight", min: 49.0, max: 50.8 },
      { name: "Junior Bantamweight", min: 50.81, max: 52.16 },
      { name: "Bantamweight", min: 52.17, max: 53.52 },
      { name: "Junior Featherweight", min: 53.53, max: 55.34 },
      { name: "Featherweight", min: 55.35, max: 57.15 },
      { name: "Junior Lightweight", min: 57.16, max: 58.97 },
      { name: "Lightweight", min: 58.98, max: 61.23 },
      { name: "Super Lightweight", min: 61.24, max: 63.5 },
      { name: "Welterweight", min: 63.51, max: 66.68 },
      { name: "Junior Middleweight", min: 66.69, max: 69.85 },
      { name: "Middleweight", min: 69.86, max: 72.57 },
      { name: "Super Middleweight", min: 72.58, max: 76.2 },
      { name: "Light Heavyweight", min: 76.21, max: 79.38 },
      { name: "Super LightHeavyweight", min: 79.39, max: 82.55 },
      { name: "Cruiserweight", min: 82.56, max: 86.18 },
      { name: "Heavyweight", min: 86.19, max: 95.0 },
      { name: "SuperHeavyweight", min: 95.0000001, max: null as any },
    ];

    const classes = isMma ? MMA_CLASSES : KB_CLASSES;

    const findClass = (kg: number | null) => {
      if (kg == null) return null;
      const hit = classes.find((c) =>
        c.max == null ? kg >= c.min : kg >= c.min && kg <= c.max,
      );
      return hit ?? null;
    };

    const diffKg = rKg != null && bKg != null ? Math.abs(rKg - bKg) : null;
    const zwaarsteKg =
      rKg != null && bKg != null ? Math.max(rKg, bKg) : (rKg ?? bKg ?? null);
    const lichtsteKg =
      rKg != null && bKg != null ? Math.min(rKg, bKg) : (rKg ?? bKg ?? null);

    let inferredMaxKg: number | null = null;
    let inferredKlasseNaam: string | null = null;

    if (explicitMaxKg != null) {
      inferredMaxKg = explicitMaxKg;
      inferredKlasseNaam = findClass(explicitMaxKg)?.name ?? null;
    } else if (isMma) {
      const targetClass = findClass(zwaarsteKg);
      inferredMaxKg = targetClass?.max ?? zwaarsteKg ?? null;
      inferredKlasseNaam = targetClass?.name ?? null;
    } else if (lichtsteKg != null || zwaarsteKg != null) {
      const marge = isJeugd ? 2 : 3;
      const kandidaatMax =
        lichtsteKg != null && zwaarsteKg != null
          ? Math.min(zwaarsteKg, lichtsteKg + marge)
          : (zwaarsteKg ?? lichtsteKg ?? null);

      inferredMaxKg = kandidaatMax;
      inferredKlasseNaam = isJeugd
        ? `Jeugd (${marge} kg verschil)`
        : `Volwassen (${marge} kg verschil)`;
    }

    return {
      rKg,
      bKg,
      maxGewichtKg: inferredMaxKg,
      klasseMaxKg: inferredMaxKg,
      klasseNaam: inferredKlasseNaam,
      rKlasse: findClass(rKg)?.name ?? null,
      bKlasse: findClass(bKg)?.name ?? null,
      diffKg,
      isMma,
    };
  }, [ctx]);

  const keurmerkInfo = useMemo(() => {
    if (!ctx) return null;

    const roodOk =
      ctx?.keurmerk_rood ??
      (String(ctx?.heeft_keurmerk_rood ?? "")
        .trim()
        .toLowerCase() === "ja"
        ? true
        : String(ctx?.heeft_keurmerk_rood ?? "")
              .trim()
              .toLowerCase() === "nee"
          ? false
          : null);

    const blauwOk =
      ctx?.keurmerk_blauw ??
      (String(ctx?.heeft_keurmerk_blauw ?? "")
        .trim()
        .toLowerCase() === "ja"
        ? true
        : String(ctx?.heeft_keurmerk_blauw ?? "")
              .trim()
              .toLowerCase() === "nee"
          ? false
          : null);

    return {
      rood: {
        ok: roodOk,
        reason:
          ctx?.keurmerk_reden_rood ??
          ctx?.keurmerk_redenen_rood ??
          ctx?.heeft_keurmerk_rood ??
          null,
      },
      blauw: {
        ok: blauwOk,
        reason:
          ctx?.keurmerk_reden_blauw ??
          ctx?.keurmerk_redenen_blauw ??
          ctx?.heeft_keurmerk_blauw ??
          null,
      },
    };
  }, [ctx]);

  const sideBadges = useMemo(() => {
    return {
      rood: buildSideResultBadges(regels, "rood"),
      blauw: buildSideResultBadges(regels, "blauw"),
    };
  }, [regels]);

  function buildRecordFromUitslagen(rows: UitslagRow[], preferredKlasse?: any) {
    const norm = (s: any) =>
      String(s ?? "")
        .trim()
        .toLowerCase();
    const isAllowedDiscipline = (d: any) => {
      const s = norm(d);
      return (
        s.includes("kb") ||
        s.includes("kick") ||
        s.includes("mt") ||
        s.includes("muay") ||
        s.includes("thai") ||
        s.includes("mma")
      );
    };
    const isBoxing = (d: any) => {
      const s = norm(d);
      return s.includes("bok") || s.includes("boxing");
    };
    const parseDate = (d: any): number => {
      const dt = parseISODateOnly(d);
      return dt ? dt.getTime() : 0;
    };

    const sorted = [...(rows ?? [])].sort(
      (a, b) => parseDate(b.datum) - parseDate(a.datum),
    );
    const prefNorm = norm(preferredKlasse);
    const activeKlasse = prefNorm
      ? preferredKlasse
      : (sorted.find((r) => norm(r.klasse))?.klasse ?? null);

    let wins = 0;
    let loss = 0;
    let draw = 0;
    let drawRaw = 0;
    let noContest = 0;
    let demoTotal = 0;
    let historieCount = 0;

    const classifyResult = (
      u: any,
    ): "win" | "loss" | "draw" | "demo" | "nc" | "unknown" => {
      const s = norm(u);
      if (!s) return "unknown";
      if (s.includes("demo") || s.includes("demonstr")) return "demo";
      if (
        s.includes("draw") ||
        s.includes("gelijk") ||
        s.includes("onbeslist") ||
        s === "d"
      )
        return "draw";
      if (s.includes("win") || s.includes("winst") || s === "w") return "win";
      if (s.includes("loss") || s.includes("verlies") || s === "l")
        return "loss";
      if (
        s.includes("no contest") ||
        s.includes("n/c") ||
        s === "nc" ||
        s.includes("contest")
      )
        return "nc";
      return "unknown";
    };

    for (const r of sorted) {
      const k = norm(r.klasse);
      const d = norm(r.discipline);

      const inActiveKlasse = activeKlasse
        ? !k
          ? true
          : norm(activeKlasse) === k
        : true;

      const boxing = isBoxing(d);
      const allowed = isAllowedDiscipline(d) && !boxing;
      const resType = classifyResult(r.uitslag);

      if (resType === "demo") {
        demoTotal += 1;
        if (!inActiveKlasse) historieCount += 1;
        continue;
      }

      if (!inActiveKlasse) {
        if (k) historieCount += 1;
        continue;
      }

      if (!allowed) {
        historieCount += 1;
        continue;
      }

      if (resType === "win") wins += 1;
      else if (resType === "loss") loss += 1;
      else if (resType === "nc") noContest += 1;
      else if (resType === "draw") {
        draw += 1;
        drawRaw += 1;
      } else {
        historieCount += 1;
      }
    }

    const demoAsDraw = Math.floor(demoTotal / 3);
    const drawWithDemo = draw + demoAsDraw;

    return {
      activeKlasse: activeKlasse ? String(activeKlasse) : null,
      wins,
      loss,
      draw: drawWithDemo,
      demoTotal,
      historieCount,
      demoAsDraw,
      drawRaw,
      noContest,
      winPct: (() => {
        const denom = wins + loss + drawRaw;
        return denom > 0 ? Math.round((wins / denom) * 1000) / 10 : null;
      })(),
    };
  }

  const recordRood = useMemo(
    () =>
      buildRecordFromUitslagen(
        uitslagenRood,
        ctx?.klasse_mm ?? ctx?.klasse ?? null,
      ),
    [uitslagenRood, ctx?.klasse_mm, ctx?.klasse],
  );
  const recordBlauw = useMemo(
    () =>
      buildRecordFromUitslagen(
        uitslagenBlauw,
        ctx?.klasse_mm ?? ctx?.klasse ?? null,
      ),
    [uitslagenBlauw, ctx?.klasse_mm, ctx?.klasse],
  );

  async function sendToDispensatie() {
    try {
      setError(null);
      setMsg("");
      setSendingDisp(true);

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token ?? null;
      if (!token) throw new Error("Niet ingelogd.");

      const bout_id = asUuid((ctx as any)?.bout_id);
      if (!bout_id) {
        throw new Error(
          "bout_id ontbreekt/ongeldig in context (controle_bout_context).",
        );
      }

      const partij = Number(partijNr);

      const prio = (x: any) =>
        normResultaat(x?.resultaat) === "afgekeurd"
          ? 4
          : normResultaat(x?.resultaat) === "dispensatie"
            ? 3
            : normResultaat(x?.resultaat) === "actie"
              ? 2
              : normResultaat(x?.resultaat) === "ok"
                ? 1
                : 0;

      const best = [...(regels ?? [])]
        .filter((r: any) => Number(r.partij_nr) === partij)
        .sort((a: any, b: any) => prio(b) - prio(a))[0];

      if (!best?.rule_code) {
        throw new Error(
          "Geen controle-melding gevonden om als reden mee te sturen.",
        );
      }

      const r = await authedFetch("/api/dispensatie/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchmaking_id: asUuid(matchmakingId),
          partij_nr: partij,
          bout_id,
          rule_code: best.rule_code,
          boodschap: best.boodschap ?? null,
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? "Naar dispensatie sturen mislukt");

      setDispSent(true);
      setMsg("✅ Naar dispensatie gestuurd.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSendingDisp(false);
    }
  }

  async function rescrapeBout() {
    try {
      setError(null);
      setRescraping(true);
      setShowLoader(true);

      const r = await authedFetch("/api/control-engine/bout-rescrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: String(matchmakingId),
          partij_nr: partijNr,
          controle_run_id: run?.id ?? null,
        }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? "Automatische check mislukt");

      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRescraping(false);
      setShowLoader(false);
    }
  }

  async function saveEditOnly() {
    if (!editOpen) return;
    if (!matchmakingId || !partijNr) return;

    setEditSaving(true);
    setError(null);
    setMsg("");

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token ?? null;
      if (!token) throw new Error("Niet ingelogd.");

      const payload: any = {
        matchmaking_id: String(matchmakingId),
        partij_nr: partijNr,
        controle_run_id: run?.id ?? null,
        va_gewijzigd: false,
      };

      const d = String(
        editDraftRef.current.discipline ?? editBoutDiscipline ?? "",
      ).trim();
      const k = String(
        editDraftRef.current.klasse ?? editBoutKlasse ?? "",
      ).trim();
      const va = String(editDraftRef.current.va ?? editVa ?? "");
      const naam = String(editDraftRef.current.naam ?? editNaam ?? "");
      const gym = String(editDraftRef.current.gym ?? editGym ?? "");
      const gewicht = String(editDraftRef.current.gewicht ?? editGewicht ?? "");
      const geslacht = String(
        editDraftRef.current.geslacht ?? editGeslacht ?? "",
      );
      const maxGewicht = String(
        editDraftRef.current.max_gewicht ?? editMaxGewicht ?? "",
      );

      if (d) payload.new_discipline = d;
      if (k) payload.new_klasse_mm = k;
      payload.new_geslacht = geslacht;
      payload.new_max_gewicht = maxGewicht;

      if (editOpen === "rood") {
        payload.new_va_rood = va;
        payload.new_rood_naam = naam;
        payload.new_rood_gym = gym;
        payload.new_rood_gewicht = gewicht;
      } else {
        payload.new_va_blauw = va;
        payload.new_blauw_naam = naam;
        payload.new_blauw_gym = gym;
        payload.new_blauw_gewicht = gewicht;
      }

      const r1 = await authedFetch("/api/control-engine/correct-bout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok)
        throw new Error(j1?.error ?? "Opslaan mislukt (correct-bout)");

      setMsg("✅ Opgeslagen.");
      closeEdit();
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setEditSaving(false);
    }
  }

  async function saveAndRescrapeFromModal() {
    if (!editOpen) return;
    if (!matchmakingId || !partijNr) return;

    setEditSaving(true);
    setError(null);
    setMsg("");

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token ?? null;
      if (!token) throw new Error("Niet ingelogd.");

      const payload: any = {
        matchmaking_id: String(matchmakingId),
        partij_nr: partijNr,
        controle_run_id: run?.id ?? null,
        va_gewijzigd: false,
      };

      const d = String(
        editDraftRef.current.discipline ?? editBoutDiscipline ?? "",
      ).trim();
      const k = String(
        editDraftRef.current.klasse ?? editBoutKlasse ?? "",
      ).trim();
      const va = String(editDraftRef.current.va ?? editVa ?? "");
      const naam = String(editDraftRef.current.naam ?? editNaam ?? "");
      const gym = String(editDraftRef.current.gym ?? editGym ?? "");
      const gewicht = String(editDraftRef.current.gewicht ?? editGewicht ?? "");
      const geslacht = String(
        editDraftRef.current.geslacht ?? editGeslacht ?? "",
      );
      const maxGewicht = String(
        editDraftRef.current.max_gewicht ?? editMaxGewicht ?? "",
      );

      if (d) payload.new_discipline = d;
      if (k) payload.new_klasse_mm = k;
      payload.new_geslacht = geslacht;
      payload.new_max_gewicht = maxGewicht;

      if (editOpen === "rood") {
        payload.new_va_rood = va;
        payload.new_rood_naam = naam;
        payload.new_rood_gym = gym;
        payload.new_rood_gewicht = gewicht;
      } else {
        payload.new_va_blauw = va;
        payload.new_blauw_naam = naam;
        payload.new_blauw_gym = gym;
        payload.new_blauw_gewicht = gewicht;
      }

      const r1 = await authedFetch("/api/control-engine/correct-bout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok)
        throw new Error(j1?.error ?? "Opslaan mislukt (admin-correct-bout)");

      const va_rood =
        editOpen === "rood"
          ? String(va ?? "").trim()
          : String(ctx?.rood_va_mm ?? "").trim();
      const va_blauw =
        editOpen === "blauw"
          ? String(va ?? "").trim()
          : String(ctx?.blauw_va_mm ?? "").trim();

      const r2 = await authedFetch("/api/control-engine/bout-rescrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: String(matchmakingId),
          partij_nr: partijNr,
          controle_run_id: run?.id ?? null,
          va_rood: va_rood || null,
          va_blauw: va_blauw || null,
        }),
      });

      const j2 = await r2.json().catch(() => ({}));
      if (!r2.ok) throw new Error(j2?.error ?? "Automatische check mislukt");

      setMsg("✅ Opgeslagen + Automatische check gestart.");
      closeEdit();
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setEditSaving(false);
    }
  }

  const Shell = ({ children }: { children: any }) => (
    <div
      className={`${inter.className} min-h-screen bg-zinc-100 text-zinc-900`}
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 py-6 space-y-4">
        <div className="fs-shell">{children}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="text-zinc-600">Laden…</div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="space-y-2">
          <div className="text-red-700">{error}</div>
          {msg ? <div className="text-green-700">{msg}</div> : null}
        </div>
      </Shell>
    );
  }

  if (!ctx) {
    return (
      <Shell>
        <div className="text-zinc-600">Geen context gevonden.</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-4">
        <BruteHeaderA
          evenementNaam={header.evNaam ?? evenementNaam ?? null}
          evenementDatum={header.evDatum ?? evenementDatum ?? null}
          discipline={header.discipline ?? null}
          klasseMM={header.klasseMM ?? null}
          partijNrStr={partijNrStr}
          matchmakingId={matchmakingId}
          runStatus={run?.status ?? null}
          onBack={() => router.back()}
          onBackToMatchmaking={() =>
            router.push(`/dashboard/matchmaker/matchmaking/${encodeURIComponent(String(matchmakingId))}`)
          }
          navPrev={nav.prev ?? null}
          navNext={nav.next ?? null}
          onPrev={() =>
            nav.prev &&
            router.push(
              `/dashboard/matchmaker/matchmaking/${encodeURIComponent(String(matchmakingId))}/partij/${encodeURIComponent(String(nav.prev))}`,
            )
          }
          onNext={() =>
            nav.next &&
            router.push(
              `/dashboard/matchmaker/matchmaking/${encodeURIComponent(String(matchmakingId))}/partij/${encodeURIComponent(String(nav.next))}`,
            )
          }
        />

        <div
          className="rounded-3xl border-2 border-zinc-500/60 p-4 md:p-5 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50"
          style={{
            background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%),
                          radial-gradient(circle at 20% 0%, rgba(255,77,0,0.10), transparent 40%),
                          radial-gradient(circle at 80% 20%, rgba(0,120,255,0.08), transparent 42%),
                          repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.03) 2px, rgba(0,0,0,0.04) 4px),
                          linear-gradient(180deg, #f0f0f2 0%, #dadade 52%, #c9c9cf 100%)`,
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_1fr] gap-4 items-start">
            <div className="order-1">
              <FighterMetalCard
                side="rood"
                naam={header.roodNaam}
                gym={header.roodGym}
                va={String(ctx?.rood_va_mm ?? "-")}
                lic={header.roodLic}
                sv={header.roodSv}
                dob={header.roodDob}
                leeftijdEvent={ageYearsAtEvent(ctx, "rood")}
                geslacht={String(ctx?.rood_geslacht ?? "-")}
                klasseMM={String(header.klasseMM ?? "-")}
                nulKlasse={String(ctx?.rood_nulmeting_klasse ?? "-")}
                nulTotaal={verschillen?.roodNulmetingTotaal ?? "-"}
                nulOpmerking={String(ctx?.rood_nulmeting_opmerking ?? "")}
                onEdit={() => openEdit("rood")}
              />
            </div>

            <div className="order-2 flex flex-col items-center justify-start gap-3 pt-2 lg:pt-6">
              <div
                className="relative flex items-center justify-center"
                style={{ width: 236, height: 236 }}
              >
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 25%, rgba(255,255,255,0.45), rgba(255,255,255,0.10) 35%, rgba(0,0,0,0.78) 72%, rgba(0,0,0,0.93) 100%)," +
                      "radial-gradient(circle at 18% 22%, rgba(255,255,255,0.10) 0%, transparent 22%)," +
                      "radial-gradient(circle at 70% 18%, rgba(0,0,0,0.16) 0%, transparent 26%)," +
                      "radial-gradient(circle at 32% 72%, rgba(0,0,0,0.14) 0%, transparent 24%)," +
                      "radial-gradient(circle at 78% 78%, rgba(255,255,255,0.08) 0%, transparent 24%)," +
                      "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.02) 2px, rgba(0,0,0,0.02) 5px, rgba(0,0,0,0.00) 10px)," +
                      "linear-gradient(180deg, #d2d2d2 0%, #7a7a7a 45%, #2a2a2a 100%)",
                    border: "6px solid rgba(220,220,220,0.55)",
                    boxShadow:
                      "inset 0 3px 10px rgba(255,255,255,0.25), inset 0 -10px 18px rgba(0,0,0,0.65), 0 22px 45px rgba(0,0,0,0.55)",
                  }}
                />
                <div
                  className="absolute inset-[24px] rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 40% 30%, rgba(255,255,255,0.18), rgba(0,0,0,0.85) 70%, rgba(0,0,0,0.98) 100%)",
                    border: "2px solid rgba(255,255,255,0.14)",
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.70)",
                  }}
                />

                <div
                  className="absolute inset-[28px] rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 22%, rgba(255,255,255,0.22), rgba(255,255,255,0.02) 55%, rgba(0,0,0,0.35) 100%)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow:
                      "inset 0 10px 18px rgba(255,255,255,0.08), inset 0 -18px 22px rgba(0,0,0,0.55)",
                  }}
                />

                <div
                  className="relative z-10"
                  style={{
                    width: 222,
                    height: 222,
                    transform: "scale(1.22)",
                    filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.55))",
                  }}
                >
                  <Image
                    src="/branding/fightsupport/vs-shield.png"
                    alt="VS"
                    width={220}
                    height={220}
                    priority
                    style={{
                      objectFit: "contain",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </div>
              </div>

              <div
                className="w-full max-w-[280px] overflow-hidden"
                style={plateBodyStyle()}
              >
                <PlateHeader title="WEDSTRIJDDETAILS" dot="orange" />
                <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div className="text-zinc-600">Ronde tijd</div>
                  <div className="text-zinc-900 font-semibold text-right">
                    {(() => {
                      const details = wedstrijddetailsFromCtx(ctx as any);
                      const fallback = String(
                        (ctx as any)?.ronde_tijd ??
                          (ctx as any)?.rondetijd ??
                          "",
                      ).trim();
                      return details.rondeTijd ?? (fallback || "-");
                    })()}
                  </div>

                  <div className="text-zinc-600">Discipline</div>
                  <div className="text-zinc-900 font-semibold text-right">
                    {header.discipline ?? "-"}
                  </div>

                  <div className="text-zinc-600">Klasse</div>
                  <div className="text-zinc-900 font-semibold text-right">
                    {String(header.klasseMM ?? "-")}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-3">
              <FighterMetalCard
                side="blauw"
                naam={header.blauwNaam}
                gym={header.blauwGym}
                va={String(ctx?.blauw_va_mm ?? "-")}
                lic={header.blauwLic}
                sv={header.blauwSv}
                dob={header.blauwDob}
                leeftijdEvent={ageYearsAtEvent(ctx, "blauw")}
                geslacht={String(ctx?.blauw_geslacht ?? "-")}
                klasseMM={String(header.klasseMM ?? "-")}
                nulKlasse={String(ctx?.blauw_nulmeting_klasse ?? "-")}
                nulTotaal={verschillen?.blauwNulmetingTotaal ?? "-"}
                nulOpmerking={String(ctx?.blauw_nulmeting_opmerking ?? "")}
                onEdit={() => openEdit("blauw")}
              />
            </div>
          </div>

          <div className="rounded-2xl p-4 mt-4" style={plateBodyStyle()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ ...plateBodyStyle(), padding: 0 }}
                >
                  <PlateHeader
                    title="ROOD — UITSLAGEN"
                    dot="red"
                    right={`${uitslagenRood.length} regels`}
                  />
                  <div className="p-3">
                    <UitslagenTable rows={uitslagenRood} pageSize={6} />
                    {recordRood?.demoAsDraw ? (
                      <div className="mt-2 text-xs text-zinc-600">
                        Demo-omrekening: {recordRood.demoTotal} demo’s ⇒ +
                        {recordRood.demoAsDraw} draw (per 3 demo’s).
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  className="rounded-xl overflow-hidden"
                  style={{ ...plateBodyStyle(), padding: 0 }}
                >
                  <PlateHeader
                    title="ROOD — KEURMERK"
                    dot="red"
                    right={
                      <Badge
                        text={
                          keurmerkInfo?.rood.ok === true
                            ? "Geldig"
                            : keurmerkInfo?.rood.ok === false
                              ? "Ongeldig"
                              : "Geen data"
                        }
                        tone={
                          keurmerkInfo?.rood.ok === true
                            ? "ok"
                            : keurmerkInfo?.rood.ok === false
                              ? "err"
                              : "warn"
                        }
                        invert
                      />
                    }
                  />
                  <div className="p-3 bg-white text-zinc-900 whitespace-pre-wrap">
                    {keurmerkInfo?.rood.reason ?? "-"}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ ...plateBodyStyle(), padding: 0 }}
                >
                  <PlateHeader
                    title="BLAUW — UITSLAGEN"
                    dot="blue"
                    right={`${uitslagenBlauw.length} regels`}
                  />

                  <div className="p-3">
                    <UitslagenTable rows={uitslagenBlauw} pageSize={6} />
                    {recordBlauw?.demoAsDraw ? (
                      <div className="mt-2 text-xs text-zinc-600">
                        Demo-omrekening: {recordBlauw.demoTotal} demo’s ⇒ +
                        {recordBlauw.demoAsDraw} draw (per 3 demo’s).
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  className="rounded-xl overflow-hidden"
                  style={{ ...plateBodyStyle(), padding: 0 }}
                >
                  <PlateHeader
                    title="BLAUW — KEURMERK"
                    dot="blue"
                    right={
                      <Badge
                        text={
                          keurmerkInfo?.blauw.ok === true
                            ? "Geldig"
                            : keurmerkInfo?.blauw.ok === false
                              ? "Ongeldig"
                              : "Geen data"
                        }
                        tone={
                          keurmerkInfo?.blauw.ok === true
                            ? "ok"
                            : keurmerkInfo?.blauw.ok === false
                              ? "err"
                              : "warn"
                        }
                        invert
                      />
                    }
                  />
                  <div className="p-3 bg-white text-zinc-900 whitespace-pre-wrap">
                    {keurmerkInfo?.blauw.reason ?? "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4 mt-4" style={plateBodyStyle()}>
            <PlateHeader
              title="VERSCHILLEN — ROOD vs BLAUW"
              dot="orange"
              right={<Badge text="Context" tone="info" invert />}
            />

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl p-3" style={darkInsetStyle()}>
                <div className="text-xs tracking-widest text-white/70 font-extrabold">
                  LEEFTIJD
                </div>
                <div className="mt-2 text-white/90">
                  Verschil:{" "}
                  <span className="text-white font-extrabold">
                    {verschillen?.leeftijdVerschilTekst != null
                      ? verschillen.leeftijdVerschilTekst
                      : "-"}
                  </span>
                </div>
                <div className="mt-1 text-white/60 text-xs">
                  (Rood: {verschillen?.roodLeeftijd ?? "-"} • Blauw:{" "}
                  {verschillen?.blauwLeeftijd ?? "-"})
                </div>
              </div>

              <div className="rounded-xl p-3" style={darkInsetStyle()}>
                <div className="text-xs tracking-widest text-white/70 font-extrabold">
                  PARTIJEN
                </div>
                <div className="mt-2 text-white/90">
                  Rood:{" "}
                  <span className="text-white font-extrabold">
                    {verschillen?.roodPartijen ?? "-"}
                  </span>{" "}
                  • Blauw:{" "}
                  <span className="text-white font-extrabold">
                    {verschillen?.blauwPartijen ?? "-"}
                  </span>
                </div>
                <div className="mt-1 text-white/90">
                  Verschil:{" "}
                  <span className="text-white font-extrabold">
                    {verschillen?.partijenVerschil ?? "-"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-white/65">
                  Demo: Rood {verschillen?.roodDemo ?? 0} • Blauw{" "}
                  {verschillen?.blauwDemo ?? 0}
                </div>
                <div className="mt-1 text-xs text-white/65">
                  Winst%: Rood{" "}
                  <span className="text-white">
                    {recordRood?.winPct != null ? `${recordRood.winPct}%` : "-"}
                  </span>{" "}
                  • Blauw{" "}
                  <span className="text-white">
                    {recordBlauw?.winPct != null
                      ? `${recordBlauw.winPct}%`
                      : "-"}
                  </span>
                  <span className="text-white/45">
                    {" "}
                    (demo &amp; no contest niet mee)
                  </span>
                </div>
                <div className="mt-1 text-xs text-white/45">
                  (Fightpaspoort totaal, demo’s 3=1 voor verschil.)
                </div>
              </div>

              <div className="rounded-xl p-3" style={darkInsetStyle()}>
                <div className="text-xs tracking-widest text-white/70 font-extrabold">
                  GEWICHT
                </div>
                <div className="mt-2 space-y-1 text-white/85">
                  <div>
                    Gewicht Rood (MM):{" "}
                    <span className="text-white font-extrabold">
                      {gewichtInfo?.rKg != null
                        ? `${gewichtInfo.rKg.toFixed(1)} kg`
                        : "-"}
                    </span>
                    {gewichtInfo?.rKlasse ? (
                      <span className="text-white/60">
                        {" "}
                        — {gewichtInfo.rKlasse}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    Gewicht Blauw (MM):{" "}
                    <span className="text-white font-extrabold">
                      {gewichtInfo?.bKg != null
                        ? `${gewichtInfo.bKg.toFixed(1)} kg`
                        : "-"}
                    </span>
                    {gewichtInfo?.bKlasse ? (
                      <span className="text-white/60">
                        {" "}
                        — {gewichtInfo.bKlasse}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    Max gewicht:{" "}
                    <span className="text-white font-extrabold">
                      {gewichtInfo?.klasseMaxKg != null
                        ? `${gewichtInfo.klasseMaxKg.toFixed(1)} kg`
                        : "-"}
                    </span>
                    {gewichtInfo?.klasseNaam ? (
                      <span className="text-white/60">
                        {" "}
                        — {gewichtInfo.klasseNaam}
                        {gewichtInfo?.isMma ? " (MMA)" : ""}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    Verschil:{" "}
                    <span className="text-white font-extrabold">
                      {gewichtInfo?.diffKg != null
                        ? `${gewichtInfo.diffKg.toFixed(1)} kg`
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl overflow-hidden mt-4"
            style={{ ...plateBodyStyle(), padding: 0 }}
          >
            <div className="p-3">
              <PlateHeader
                title="MELDINGEN — RULES"
                dot="orange"
                right={
                  <div className="flex items-center gap-2">
                    <span>{regels.length} meldingen</span>
                    <button
                      type="button"
                      onClick={openCustomMelding}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[var(--brand-orange)] text-black font-black hover:opacity-90"
                      title="Handmatige melding toevoegen"
                    >
                      +
                    </button>
                  </div>
                }
              />
            </div>

            <div className="p-4 pt-2">
              {regels.length === 0 ? (
                <div className="text-sm text-zinc-700">Geen meldingen.</div>
              ) : (
                <div className="overflow-auto rounded-md border-2 border-zinc-300 bg-white">
                  <table className="w-full text-sm border-collapse">
                    <thead
                      className="bg-zinc-800 text-white border-b-4"
                      style={{ borderColor: NVB_ORANGE }}
                    >
                      <tr>
                        <th className="text-left px-3 py-2 w-40">Resultaat</th>
                        <th className="text-left px-3 py-2 w-64">Regel</th>
                        <th className="text-left px-3 py-2">Reden</th>
                        <th className="text-left px-3 py-2 w-72">
                          Aantekeningen
                        </th>
                        <th className="text-left px-3 py-2 w-40">Actie</th>
                      </tr>
                    </thead>

                    <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(odd)]:text-zinc-900 [&>tr:nth-child(even)]:bg-zinc-700 [&>tr:nth-child(even)]:text-white">
                      {regels.map((r) => {
                        const disp = displayResultaat(r);
                        const canApprove = canApproveRule(r);

                        return (
                          <tr key={r.id}>
                            <td className="px-3 py-2 align-top">
                              <div className="flex flex-col gap-1">
                                <Badge
                                  text={disp.label}
                                  tone={disp.tone}
                                  invert
                                />
                                {!isApprovedOverride(r) &&
                                r.original_resultaat &&
                                String(r.original_resultaat).toLowerCase() !==
                                  String(r.resultaat ?? "").toLowerCase() ? (
                                  <span className="text-[10px] opacity-70">
                                    Origineel:{" "}
                                    {String(r.original_resultaat).toUpperCase()}
                                  </span>
                                ) : null}
                                {r.review_status ? (
                                  <span className="text-[10px] opacity-70">
                                    Review: {String(r.review_status)}
                                  </span>
                                ) : null}
                                {r.reviewed_by || r.reviewed_at ? (
                                  <span className="text-[10px] opacity-70">
                                    {r.reviewed_by
                                      ? `door ${r.reviewed_by}`
                                      : ""}
                                    {r.reviewed_at
                                      ? ` • ${fmtDateOnlyNL(r.reviewed_at)}`
                                      : ""}
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-top font-mono text-xs">
                              {r.rule_code ?? r.rule ?? "-"}
                            </td>

                            <td className="px-3 py-2 align-top">
                              {displayBoodschap(r)}
                            </td>

                            <td className="px-3 py-2 align-top">
                              <textarea
                                defaultValue={
                                  (noteDraftRef.current[r.id] ??
                                    r.aantekeningen ??
                                    "") as any
                                }
                                onChange={(e) => {
                                  noteDraftRef.current[r.id] = e.target.value;
                                }}
                                onBlur={(e) => {
                                  const v = e.target.value;
                                  noteDraftRef.current[r.id] = v;
                                  saveAantekeningen(r.id, v);
                                }}
                                placeholder="Noteer reden van goedkeuren / besluit…"
                                spellCheck={false}
                                className="w-full min-h-[54px] px-2 py-2 rounded border border-zinc-400 bg-zinc-50 text-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                              />
                            </td>

                            <td className="px-3 py-2 align-top">
                              {canApprove ? (
                                <div className="flex flex-col gap-2">
                                  <button
                                    type="button"
                                    onClick={() => approveSingle(r.id)}
                                    disabled={approving}
                                    className="px-3 py-1 text-xs rounded bg-[var(--brand-orange)] text-black font-semibold hover:opacity-90 disabled:opacity-50"
                                  >
                                    Goedkeuren
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => rejectSingle(r.id)}
                                    disabled={approving}
                                    className="px-3 py-1 text-xs rounded font-semibold hover:opacity-90 disabled:opacity-50 bg-[#2a2a2e] text-white"
                                  >
                                    Afkeuren
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {dispSent ? (
                <div className="mt-4 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-950">
                  Deze partij is al naar dispensatie gestuurd.
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={rescrapeBout}
                  disabled={rescraping}
                  className="inline-flex items-center px-4 py-2 rounded bg-[var(--brand-orange)] text-black font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {rescraping
                    ? "Fightpaspoort check…"
                    : "Controleer Fightpaspoort"}
                </button>

                <button
                  type="button"
                  onClick={sendToDispensatie}
                  disabled={sendingDisp}
                  className={`inline-flex items-center px-4 py-2 rounded font-semibold transition ${
                    sendingDisp
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:opacity-90"
                  } ${dispSent ? "bg-green-700 text-white" : "bg-[#2a2a2e] text-white"}`}
                >
                  {sendingDisp
                    ? "Bezig… (versturen)"
                    : dispSent
                      ? "Verstuurd ✓"
                      : "Stuur naar dispensatie"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {editOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div
              key={editMountKey}
              className="w-full max-w-lg rounded-xl border-2 border-zinc-400 bg-white p-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-zinc-900">
                  Bewerk persoon — {editOpen === "rood" ? "Rood" : "Blauw"}
                </div>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="text-zinc-700 hover:text-zinc-900 px-2 py-1"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-xs text-zinc-600 mb-1">VA nummer</div>
                  <input
                    defaultValue={editDraftRef.current.va}
                    onChange={(e) => {
                      editDraftRef.current.va = e.target.value;
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="bijv. 12345"
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">Naam</div>
                  <input
                    defaultValue={editDraftRef.current.naam}
                    onChange={(e) => {
                      editDraftRef.current.naam = e.target.value;
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Bijv. Voornaam Achternaam"
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">Sportschool</div>
                  <input
                    defaultValue={editDraftRef.current.gym}
                    onChange={(e) => {
                      editDraftRef.current.gym = e.target.value;
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Bijv. Team XYZ"
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">
                    Gewicht vechter
                  </div>
                  <input
                    defaultValue={editDraftRef.current.gewicht}
                    onChange={(e) => {
                      editDraftRef.current.gewicht = e.target.value;
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Bijv. 41"
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">
                    Discipline (partij)
                  </div>
                  <input
                    defaultValue={editDraftRef.current.discipline}
                    onChange={(e) => {
                      editDraftRef.current.discipline = e.target.value;
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Bijv. THAIBOKSEN/MUAY THAI"
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">
                    Klasse (partij)
                  </div>
                  <input
                    defaultValue={editDraftRef.current.klasse}
                    onChange={(e) => {
                      editDraftRef.current.klasse = e.target.value;
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Bijv. JEUGD/YOUTH, N, C, B…"
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">
                    Geslacht (partij)
                  </div>
                  <input
                    defaultValue={editDraftRef.current.geslacht}
                    onChange={(e) => {
                      editDraftRef.current.geslacht = e.target.value;
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Bijv. Man, Vrouw of Gemengd"
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">
                    Max gewicht partij
                  </div>
                  <input
                    defaultValue={editDraftRef.current.max_gewicht}
                    onChange={(e) => {
                      editDraftRef.current.max_gewicht = e.target.value;
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Bijv. 41"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={editSaving}
                    className="px-4 py-2 rounded bg-[#2a2a2e] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    Annuleren
                  </button>

                  <button
                    type="button"
                    onClick={saveEditOnly}
                    disabled={editSaving}
                    className="px-4 py-2 rounded bg-[#2a2a2e] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {editSaving ? "Opslaan…" : "Opslaan"}
                  </button>

                  <button
                    type="button"
                    onClick={saveAndRescrapeFromModal}
                    disabled={editSaving}
                    className="px-4 py-2 rounded bg-[#2a2a2e] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                    title="Opslaan en autocheck"
                  >
                    {editSaving ? "Bezig…" : "Opslaan + Autocheck"}
                  </button>
                </div>

                <div className="text-xs text-zinc-600">
                  Tip: “Opslaan” wijzigt alleen Matchmaking-data. “Opslaan +
                  Autocheck” haalt daarna data Fightpaspoort opnieuw op.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showLoader ? (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-5 text-center shadow-2xl">
              <div className="mb-2 text-lg font-bold text-white">
                Fightpaspoort wordt gecontroleerd...
              </div>
              <div className="mb-4 text-sm text-white/60">
                Even wachten, data wordt opgehaald.
              </div>
              <div className="flex justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--brand-orange)] border-t-transparent" />
              </div>
            </div>
          </div>
        ) : null}

        {customOpen ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
            <div
              key={customMountKey}
              className="w-full max-w-xl rounded-xl border-2 border-zinc-400 bg-white p-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-zinc-900">
                  Handmatige melding toevoegen
                </div>
                <button
                  type="button"
                  onClick={closeCustomMelding}
                  className="text-zinc-700 hover:text-zinc-900 px-2 py-1"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-xs text-zinc-600 mb-1">
                    Titel / regel
                  </div>
                  <input
                    defaultValue={customDraftRef.current.rule}
                    onChange={(e) => {
                      customDraftRef.current.rule = e.target.value;
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Bijv. Opmerking official"
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">Resultaat</div>
                  <select
                    defaultValue={customDraftRef.current.resultaat}
                    onChange={(e) => {
                      customDraftRef.current.resultaat = e.target.value as
                        "actie" | "afgekeurd" | "dispensatie" | "ok";
                    }}
                    className="w-full px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                  >
                    <option value="actie">ACTIE</option>
                    <option value="afgekeurd">AFKEUR</option>
                    <option value="dispensatie">DISPENSATIE</option>
                    <option value="ok">OK</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">
                    Melding / boodschap
                  </div>
                  <textarea
                    defaultValue={customDraftRef.current.boodschap}
                    onChange={(e) => {
                      customDraftRef.current.boodschap = e.target.value;
                    }}
                    className="w-full min-h-[110px] px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Typ hier je eigen melding die mee moet in rapport en export..."
                  />
                </div>

                <div>
                  <div className="text-xs text-zinc-600 mb-1">
                    Aantekeningen
                  </div>
                  <textarea
                    defaultValue={customDraftRef.current.aantekeningen}
                    onChange={(e) => {
                      customDraftRef.current.aantekeningen = e.target.value;
                    }}
                    className="w-full min-h-[80px] px-3 py-2 rounded bg-zinc-50 border border-zinc-400 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/40"
                    placeholder="Optioneel..."
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={closeCustomMelding}
                    disabled={customSaving}
                    className="px-4 py-2 rounded bg-[#2a2a2e] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    Annuleren
                  </button>

                  <button
                    type="button"
                    onClick={createHandmatigeMelding}
                    disabled={customSaving}
                    className="px-4 py-2 rounded bg-[var(--brand-orange)] text-black font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {customSaving ? "Opslaan…" : "Melding toevoegen"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
