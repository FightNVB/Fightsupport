"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function submit(e: any) {
    e.preventDefault();

    if (password !== confirm) {
      setError("Wachtwoorden komen niet overeen.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Fout bij instellen wachtwoord.");
      return;
    }

    router.push("/login/success");
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

        <h2 className="text-xl font-bold mb-4">Nieuw wachtwoord</h2>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="password"
            className="p-3 rounded bg-[#1a1a1a] border border-[#333] text-white"
            placeholder="Nieuw wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            className="p-3 rounded bg-[#1a1a1a] border border-[#333] text-white"
            placeholder="Bevestig wachtwoord"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button
            type="submit"
            className="p-3 font-semibold rounded bg-[var(--brand-orange)] text-white"
          >
            Wachtwoord opslaan
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}
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
