"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [team, setTeam] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: any) {
    e.preventDefault();

    const { error } = await supabase.from("account_requests").insert({
      name,
      email,
      requested_role: role,
      team,
      notes,
    });

    if (error) {
      setMessage("❌ Fout bij versturen aanvraag.");
      return;
    }

    setMessage("✔ Aanvraag verstuurd.");
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

        <h2 className="text-xl font-bold mb-4">Nieuw account aanvragen</h2>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="text"
            className="p-3 rounded bg-[#1a1a1a] border border-[#333] text-white"
            placeholder="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            className="p-3 rounded bg-[#1a1a1a] border border-[#333] text-white"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <select
            className="p-3 rounded bg-[#1a1a1a] border border-[#333] text-white"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="">Kies rol…</option>
            <option value="matchmaker">Matchmaker</option>
            <option value="promotor">Promotor</option>
            <option value="sportschool">Sportschool</option>
            <option value="official">Official</option>
          </select>

          {role === "official" && (
            <input
              type="text"
              className="p-3 rounded bg-[#1a1a1a] border border-[#333] text-white"
              placeholder="Team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          )}

          <textarea
            className="p-3 rounded bg-[#1a1a1a] border border-[#333] text-white"
            rows={4}
            placeholder="Opmerkingen (optioneel)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button
            type="submit"
            className="p-3 font-semibold rounded bg-[var(--brand-orange)] text-white"
          >
            Verstuur aanvraag
          </button>

          {message && <p className="text-sm text-[var(--brand-orange)]">{message}</p>}
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
