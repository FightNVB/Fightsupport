"use client";

interface NvbLightButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function NvbLightButton({
  label,
  onClick,
  disabled = false,
  className = "",
}: NvbLightButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full py-3 px-4 font-semibold text-white
        bg-[#ff4d00] hover:bg-[#ff6933] active:bg-[#e04000]
        rounded-none
        transition-all duration-200

        shadow-[0_0_8px_rgba(255,77,0,0.35)] 
        hover:shadow-[0_0_12px_rgba(255,77,0,0.45)]
        active:shadow-[0_0_6px_rgba(255,77,0,0.25)]

        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        textShadow: "0 0 3px rgba(0,0,0,0.25)",
      }}
    >
      {label}
    </button>
  );
}
