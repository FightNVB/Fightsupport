"use client";

import Link from "next/link";
import React from "react";

export default function DarkCardInputLayout({
  title,
  subtitle,
  children,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#000] py-6">
      <div
        className="
          bg-[#0c0c0c]
          border border-[#1a1a1a]
          rounded-xl
          shadow-[0_0_25px_#ff4d0099]
          w-full
          max-w-lg
          px-6
          py-6
          flex
          flex-col
          items-center
        "
      >
        {/* LOGO – iets kleiner en compact */}
        <div className="mb-3">
          <img
            src="/logo_fightsupport.png"   
            alt="Fightsupport"
            className="w-32 drop-shadow-[0_0_4px_rgba(255,77,0,0.4)] select-none"
          />
        </div>

        {/* TITEL */}
        <h1 className="text-2xl font-bold text-white text-center mb-1">
          {title}
        </h1>

        {/* SUBTITLE */}
        {subtitle && (
          <p className="text-xs text-[#ff4d00] text-center mb-4">
            {subtitle}
          </p>
        )}

        {/* ✅ OPTIONELE TERUG-LINK */}
        {backHref ? (
          <Link
            href={backHref}
            className="mb-4 text-xs text-gray-400 hover:text-gray-200 transition select-none self-start"
          >
            {backLabel ?? "← Terug"}
          </Link>
        ) : null}

        {/* CONTENT */}
        <div className="w-full space-y-3">{children}</div>
      </div>
    </div>
  );
}
 