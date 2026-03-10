"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: any) {
    e.preventDefault();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset`,
    });

    if (error) {
      setMessage("❌ Dit e-mailadres is niet bekend.");
      return;
    }

    setMessage("✔ Resetlink verstuurd naar je e-mail.");
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-black">
      <div
        className="p-8 text-center rounded-2xl"
        style={{
          width: "420px",
          background: "#111",
          border: "1px solid var(--brand-orange)",
          boxShadow: "0 0 40px rgba(253,120,3,0.25)",
        }}
      >
        <Image
          src="/branding/fightsupport/logo-dark.png"
          width={200}
          height={90}
          alt="FightSupport"
          className="mx-auto mb-4"
        />

        <h2 className="text-xl font-bold mb-4">Wachtwoord vergeten</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            className="p-3 rounded bg-[#1a1a1a] border border-[#333] text-white"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            className="p-3 font-semibold rounded bg-[var(--brand-orange)] text-white"
          >
            Verstuur resetlink
          </button>

          {message && (
            <p className="text-sm text-[var(--brand-orange)] mt-1">{message}</p>
          )}
        </form>

        <button
          onClick={() => router.push("/login")}
          className="mt-6 px-3 py-2 text-sm border border-[#555] text-white rounded 
                     hover:border-[var(--brand-orange)] hover:text-[var(--brand-orange)] transition-all duration-200"
        >
          Terug naar inloggen
        </button>
      </div>
    </main>
  );
}
