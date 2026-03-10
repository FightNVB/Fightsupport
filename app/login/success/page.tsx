"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-black">
      <div
        className="p-8 text-center rounded-2xl animate-fade-in"
        style={{
          width: "420px",
          background: "#111",
          border: "1px solid var(--brand-orange)",
          boxShadow: "0 0 40px rgba(253,120,3,0.25)",
        }}
      >
        {/* LOGO */}
        <Image
          src="/branding/fightsupport/logo-dark.png"
          width={200}
          height={90}
          alt="FightSupport"
          className="mx-auto mb-4 drop-shadow-[0_0_20px_rgba(253,120,3,0.45)]"
        />

        {/* TITEL */}
        <h2 className="text-xl font-bold mb-2">Wachtwoord gewijzigd</h2>

        {/* TEKST */}
        <p className="text-gray-300 mb-6">
          ✔ Je nieuwe wachtwoord is succesvol ingesteld.
          <br />
          <span className="text-sm text-gray-500">
            Je wordt automatisch doorgestuurd…
          </span>
        </p>

        {/* KNOP */}
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="p-3 w-full font-semibold rounded bg-[var(--brand-orange)] text-white"
        >
          Terug naar inloggen
        </button>
      </div>
    </main>
  );
}
