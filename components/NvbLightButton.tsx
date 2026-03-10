"use client";
import React from "react";

type NvbLightButtonProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
};

export default function NvbLightButton({
  label,
  onClick,
  disabled = false,
  className = "",
  fullWidth = true,
}: NvbLightButtonProps) {
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
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        rounded-none
        ${className}
      `}
      style={{
        // zilver / geborsteld
        background: `
          linear-gradient(180deg,
            rgba(250,250,250,0.95) 0%,
            rgba(220,220,220,0.92) 38%,
            rgba(180,180,180,0.92) 70%,
            rgba(205,205,205,0.92) 100%
          )
        `,
        border: "1px solid rgba(20,20,20,0.38)", // donkere rand voor contrast
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.70),
          inset 0 -1px 0 rgba(0,0,0,0.18),
          0 0 0 1px rgba(255,255,255,0.18),
          0 10px 24px rgba(0,0,0,0.35)
        `,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "translateY(-1px)";
        el.style.filter = "brightness(1.02)";
        el.style.boxShadow = `
          inset 0 1px 0 rgba(255,255,255,0.78),
          inset 0 -1px 0 rgba(0,0,0,0.18),
          0 0 0 1px rgba(255,255,255,0.22),
          0 14px 30px rgba(0,0,0,0.38)
        `;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = "translateY(0px)";
        el.style.filter = "brightness(1)";
        el.style.boxShadow = `
          inset 0 1px 0 rgba(255,255,255,0.70),
          inset 0 -1px 0 rgba(0,0,0,0.18),
          0 0 0 1px rgba(255,255,255,0.18),
          0 10px 24px rgba(0,0,0,0.35)
        `;
      }}
    >
      {/* inner bevel line */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[2px]"
        style={{
          border: "1px solid rgba(255,255,255,0.45)",
          opacity: 0.9,
        }}
      />

      {/* brushed sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.20) 45%, rgba(255,255,255,0.06) 65%, rgba(255,255,255,0.00) 100%)",
          opacity: 0.35,
        }}
      />

      <span
        className="relative z-10 font-semibold tracking-wide"
        style={{
          // bijna zwart maar grijs-tint (zoals jij wil)
          color: "rgba(24,24,24,0.92)",
          textShadow: "0 1px 0 rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </span>
    </button>
  );
}