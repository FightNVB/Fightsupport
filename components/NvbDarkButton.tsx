"use client";
import React from "react";

interface NvbDarkButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export default function NvbDarkButton({
  label,
  onClick,
  disabled = false,
  className = "",
  fullWidth = true,
}: NvbDarkButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        ${fullWidth ? "w-full" : "inline-flex"}
        relative
        flex items-center justify-center
        py-4 px-6
        font-semibold tracking-wide text-white
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        rounded-none
        ${className}
      `}
      style={{
        /* NVB-oranje vlak */
        background:
          "linear-gradient(180deg, rgba(255,77,0,1) 0%, rgba(235,60,0,1) 100%)",

        /* ZILVEREN RAND (duidelijk, strak) */
        border: "1px solid rgba(245,245,245,0.95)",

        /* Subtiele diepte, GEEN glow */
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.20),
  inset 0 -1px 0 rgba(0,0,0,0.25),
  0 0 0 1px rgba(255,255,255,0.35)
        `,

        textShadow: "0 1px 2px rgba(0,0,0,0.45)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.filter = "brightness(1.02)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.filter = "brightness(1)";
        el.style.transform = "translateY(0px)";
      }}
      onMouseDown={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "translateY(0px)";
        el.style.filter = "brightness(0.98)";
      }}
    >
      {/* INNER ZILVEREN LIJN (schild-gevoel, strak) */}
   <span
  aria-hidden
  className="pointer-events-none absolute inset-[2px]"
  style={{
    border: "1px solid rgba(235,235,235,0.55)",
  }}
/>
      <span className="relative z-10">{label}</span>
    </button>
  );
}