"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  AuthFooter,
  AuthInput,
  AuthMessage,
  AuthPrimaryButton,
  AuthSelect,
  AuthShell,
  AuthTextarea,
} from "../_components/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [team, setTeam] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "success">("success");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase.from("account_requests").insert({
      name,
      email,
      requested_role: role,
      team,
      notes,
    });

    setBusy(false);

    if (error) {
      setTone("error");
      setMessage("Fout bij versturen aanvraag.");
      return;
    }

    setTone("success");
    setMessage("Aanvraag verstuurd. Het bondsteam neemt contact op als extra informatie nodig is.");
    setName("");
    setEmail("");
    setRole("");
    setNotes("");
    setTeam("");
  }

  return (
    <AuthShell
      title="Nieuw account"
      subtitle="Aanvraag voor FightSupport toegang"
      onBack={() => router.push("/login")}
    >
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <AuthInput label="Naam" value={name} onChange={setName} placeholder="Volledige naam" required />
        <AuthInput
          label="E-mailadres"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="naam@voorbeeld.nl"
          autoComplete="email"
          required
        />

        <AuthSelect label="Gewenste rol" value={role} onChange={setRole} required>
          <option value="">Kies rol…</option>
          <option value="matchmaker">Matchmaker</option>
          <option value="promotor">Promotor</option>
          <option value="sportschool">Sportschool</option>
          <option value="official">Official</option>
        </AuthSelect>

        {role === "official" ? (
          <AuthInput
            label="Bondteam"
            value={team}
            onChange={setTeam}
            placeholder="Bijvoorbeeld Team A"
          />
        ) : null}

        <AuthTextarea
          label="Opmerkingen"
          value={notes}
          onChange={setNotes}
          placeholder="Extra toelichting of context voor je aanvraag…"
        />

        <AuthPrimaryButton
          type="submit"
          label={busy ? "Bezig met versturen..." : "Verstuur aanvraag"}
          disabled={busy}
        />

        {message ? <AuthMessage message={message} tone={tone} /> : null}
      </form>
      <AuthFooter />
    </AuthShell>
  );
}
