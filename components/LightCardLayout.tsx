"use client";

import Image from "next/image";
import { ReactNode } from "react";
import nvbLogo from "@/public/logo_fightsupport.png";

interface LightCardLayoutProps {
  title?: string;
  subtitle?: string;
  width?: number;
  children: ReactNode;
}

export default function LightCardLayout({
  title,
  subtitle,
  width = 550, // ⭐ DUIDELIJK BREDER
  children,
}: LightCardLayoutProps) {
  return (
    <main className="min-h-screen flex justify-center items-start bg-black text-white py-6 px-4">
      <div
        className="w-full bg-white text-black rounded-2xl p-5" // ⭐ MINDER PADDING
        style={{
          maxWidth: width,
          border: "2px solid #ff4d00",
          boxShadow:
            "0 0 35px rgba(255,77,0,0.55), inset 0 0 8px rgba(255,77,0,0.25)",
        }}
      >
        {/* Logo kleiner */}
        <div className="flex justify-center mb-3">
          <Image
            src={nvbLogo}
            alt="NVB logo"
            width={140}   // ⭐ KLEINER LOGO
            height={50}
            style={{ width: "auto", height: "auto" }}
            className="drop-shadow-[0_0_4px_rgba(255,77,0,0.8)]"
          />
        </div>

        {/* Titel dichter erop */}
        {title && (
          <h1 className="text-xl font-bold mb-1 text-center text-[#ff4d00]">
            {title}
          </h1>
        )}

        {subtitle && (
          <p className="text-center mb-4 text-sm text-gray-700 leading-tight">
            {subtitle}
          </p>
        )}

        {/* Content */}
        {children}
      </div>
    </main>
  );
}
