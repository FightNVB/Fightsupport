"use client";

import React from "react";

type FightSupportButtonProps = {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  variant?: "primary" | "danger";
};

const NVB_ORANGE = "#ff4d00";

export default function FightSupportButton({
  title,
  subtitle,
  onClick,
  disabled = false,
  className = "",
  fullWidth = true,
  variant = "primary",
}: FightSupportButtonProps) {
  const isDanger = variant === "danger";

  const bg = isDanger
    ? "linear-gradient(180deg, rgba(118,14,14,0.96) 0%, rgba(62,8,8,0.96) 100%)"
    : `linear-gradient(180deg, rgba(255,77,0,0.98) 0%, rgba(230,58,0,0.98) 100%)`;

  const glow = isDanger
    ? "0 0 18px rgba(255,255,255,0.10), 0 0 26px rgba(140,14,14,0.25)"
    : `0 0 18px rgba(255,255,255,0.12), 0 0 28px rgba(255,77,0,0.18)`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        ${fullWidth ? "w-full" : "inline-flex"}
        relative
        flex items-center justify-between
        py-4 px-6
        text-left
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        rounded-none
        ${className}
      `}
      style={{
        background: bg,
        border: "1px solid rgba(235,235,235,0.26)",
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(255,255,255,0.10), ${glow}`,
        textShadow: "0 0 6px rgba(0,0,0,0.40)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.filter = "brightness(1.03)";
        el.style.transform = "translateY(-1px)";
        el.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.16), 0 0 0 1px rgba(255,255,255,0.14), 0 0 26px rgba(255,255,255,0.14), 0 0 34px rgba(255,77,0,0.22)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.filter = "brightness(1)";
        el.style.transform = "translateY(0px)";
        el.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 1px rgba(255,255,255,0.10), ${glow}`;
      }}
    >
      {/* inner silver edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[2px]"
        style={{
          border: "1px solid rgba(255,255,255,0.18)",
          opacity: 0.9,
        }}
      />

      <div className="flex flex-col">
        <div className="font-extrabold tracking-wide text-white text-[16px] leading-tight">
          {title}
        </div>
        {subtitle ? (
          <div className="text-[12px] mt-1 leading-snug" style={{ color: "rgba(255,255,255,0.78)" }}>
            {subtitle}
          </div>
        ) : null}
      </div>

      {/* chevron in silver “chip” */}
      <div
        className="h-10 w-10 flex items-center justify-center shrink-0 ml-4"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 0 14px rgba(255,255,255,0.10)",
        }}
        aria-hidden
      >
        <span
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #d6d6d6 45%, #9a9a9a 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ›
        </span>
      </div>
    </button>
  );
}