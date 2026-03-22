"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  AuthFooter,
  AuthInput,
  AuthMessage,
  AuthPrimaryButton,
  AuthShell,
} from "../_components/AuthShell";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "success">("success");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/reset`,
    });

    setBusy(false);

    if (error) {
      setTone("error");
      setMessage("Dit e-mailadres is niet bekend of de resetlink kon niet worden verstuurd.");
      return;
    }

    setTone("success");
    setMessage("Resetlink verstuurd naar je e-mail.");
  }

  return (
    <AuthShell
      title="Wachtwoord vergeten"
      subtitle="Resetlink voor je account"
      onBack={() => router.push("/login")}
      narrow
    >
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <AuthInput
          label="E-mailadres"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="naam@voorbeeld.nl"
          autoComplete="email"
          required
        />

        <AuthPrimaryButton
          type="submit"
          label={busy ? "Bezig met versturen..." : "Verstuur resetlink"}
          disabled={busy}
        />

        {message ? <AuthMessage message={message} tone={tone} /> : null}
      </form>
      <AuthFooter />
    </AuthShell>
  );
}
