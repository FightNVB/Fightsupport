"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      
      {/* Hero */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/branding/fightsupport/fightsupport.png"
          alt="FightSupport hero"
          fill
          priority
          sizes="100vw"
          className="
            object-contain
            object-[center_55%]
            scale-x-[1.00]
          "
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* LOGIN BUTTON (INTEGRATED METAL STYLE) */}
      <header className="relative z-20 flex justify-end p-5 md:p-8">
        <button
          onClick={() => router.push("/login")}
          className="
            px-7 py-2.5
            text-[12px] font-extrabold tracking-[0.22em]
            text-white

            border border-white/40

            bg-[linear-gradient(180deg,#ffffff_0%,#dcdcdc_10%,#9a9a9a_28%,#2e2e2e_65%,#0f0f0f_100%)]

            shadow-[
              inset_0_1px_0_rgba(255,255,255,0.9),
              inset_0_-2px_3px_rgba(0,0,0,0.85),
              inset_0_0_10px_rgba(255,255,255,0.15),
              0_0_20px_rgba(255,120,0,0.12),
              0_6px_18px_rgba(0,0,0,0.7)
            ]

            backdrop-blur-sm
            bg-opacity-80

            transition-all duration-200

            hover:brightness-110
            hover:shadow-[
              inset_0_1px_0_rgba(255,255,255,1),
              inset_0_-2px_4px_rgba(0,0,0,0.9),
              inset_0_0_14px_rgba(255,255,255,0.25),
              0_0_35px_rgba(255,120,0,0.25),
              0_10px_28px_rgba(0,0,0,0.8)
            ]

            active:scale-95
          "
        >
          LOGIN
        </button>
      </header>

      {/* FULL CLICKABLE AREA */}
      <button
        onClick={() => router.push("/login")}
        aria-label="Ga naar login"
        className="absolute inset-0 z-10"
      />
    </main>
  );
}