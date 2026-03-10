"use client";

import React from "react";

export default function VsBadge() {
  return (
    <div className="relative flex items-center justify-center">
      {/* outer metal ring */}
      <div
        className="
          relative w-[180px] h-[180px] rounded-full
          bg-gradient-to-b from-[#6a6a6a] via-[#3e3e3e] to-[#1b1b1b]
          shadow-[0_20px_40px_rgba(0,0,0,0.8)]
          border border-[#9a9a9a]
          flex items-center justify-center
        "
      >
        {/* inner plate */}
        <div
          className="
            absolute inset-5 rounded-full
            bg-gradient-to-b from-[#1c1c1c] to-[#000000]
            shadow-inner
          "
        />

        {/* subtle orange line */}
        <div className="absolute inset-x-10 h-[2px] bg-[#ff4d00] blur-[1px] opacity-70" />

        {/* VS text */}
        <span
          className="relative text-[58px] font-extrabold tracking-widest"
          style={{
            background:
              "linear-gradient(180deg,#ffffff 0%,#d8d8d8 40%,#9a9a9a 70%,#4d4d4d 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow:
              "0 2px 0 #ffffff33, 0 8px 20px rgba(0,0,0,0.9)",
          }}
        >
          VS
        </span>
      </div>
    </div>
  );
}