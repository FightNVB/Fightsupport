"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* HERO */}
      <div className="absolute inset-0">
        <Image
          src="/branding/fightsupport/fightsupport.png"
          alt="FightSupport hero"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* OVERLAY */}
      <div className="pointer-events-none absolute inset-0 bg-black/10" />

      {/* BUTTON ONLY */}
      <div className="relative z-20 h-full">
        <button
          onClick={() => router.push("/login")}
          aria-label="Ga naar login"
          className="
            absolute
            left-1/2
            bottom-[8%]
            -translate-x-1/2

            min-w-[280px]
            px-12 py-4

            text-[18px] font-extrabold
            tracking-[0.32em]
            text-[#111111]

            border-[3px] border-[#2f2f2f]

            bg-[linear-gradient(180deg,#ffffff_0%,#f2f2f2_12%,#d9d9d9_28%,#a7a7a7_48%,#6f6f6f_72%,#dcdcdc_100%)]

            shadow-[
              inset_0_2px_0_rgba(255,255,255,0.95),
              inset_0_-3px_6px_rgba(0,0,0,0.45),
              inset_0_0_14px_rgba(255,255,255,0.35),
              0_12px_28px_rgba(0,0,0,0.75),
              0_0_22px_rgba(255,140,0,0.16)
            ]

            transition-all duration-200
            hover:brightness-105
            hover:scale-[1.02]
            hover:shadow-[
              inset_0_2px_0_rgba(255,255,255,1),
              inset_0_-4px_8px_rgba(0,0,0,0.55),
              inset_0_0_18px_rgba(255,255,255,0.45),
              0_16px_34px_rgba(0,0,0,0.85),
              0_0_28px_rgba(255,140,0,0.24)
            ]
            active:scale-95
          "
        >
          ENTER
        </button>
      </div>
    </main>
  );
}