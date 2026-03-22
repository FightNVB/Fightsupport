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

      {/* Login knop */}
      <header className="relative z-20 flex justify-end p-5 md:p-8">
        <button
          onClick={() => router.push("/login")}
          className="
            px-6 py-2.5
            text-sm font-extrabold tracking-[0.18em]
            text-white
            bg-gradient-to-b
            from-[#f5f5f5]
            via-[#cfcfcf]
            to-[#8a8a8a]
            border border-[#d6d6d6]
            shadow-[0_0_20px_rgba(255,255,255,0.25),inset_0_2px_6px_rgba(255,255,255,0.4)]
            hover:scale-105
            hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]
            active:scale-95
            transition duration-200
          "
        >
          LOGIN
        </button>
      </header>

      <button
        onClick={() => router.push("/login")}
        aria-label="Ga naar login"
        className="absolute inset-0 z-10"
      />
    </main>
  );
}