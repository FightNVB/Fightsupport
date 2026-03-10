"use client";
import React from "react";

interface NvbDarkButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function NvbDarkButton({
  label,
  onClick,
  disabled = false,
  className = "",
}: NvbDarkButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full py-3 px-4 font-semibold text-gray-100 
        bg-[#ff4d00] hover:bg-[#ff6933] active:bg-[#e04000]
        transition-all duration-200 
        shadow-[0_0_15px_rgba(255,77,0,0.4)] hover:shadow-[0_0_25px_rgba(255,77,0,0.6)]
        disabled:opacity-50 disabled:cursor-not-allowed
        rounded-none ${className}`}
      style={{ textShadow: "0 0 6px rgba(0,0,0,0.4)" }}
    >
      {label}
    </button>
  );
}


