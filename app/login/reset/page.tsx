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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "success">("error");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setTone("error");
      setMessage("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }

    if (password !== confirm) {
      setTone("error");
      setMessage("Wachtwoorden komen niet overeen.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setTone("error");
      setMessage("Fout bij instellen wachtwoord.");
      return;
    }

    setTone("success");
    setMessage("Wachtwoord opgeslagen. Je wordt doorgestuurd...");
    setTimeout(() => router.push("/login/success"), 700);
  }

  return (
    <AuthShell
      title="Nieuw wachtwoord"
      subtitle="Reset en beveilig je account"
      onBack={() => router.push("/login")}
      narrow
    >
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <AuthInput
          label="Nieuw wachtwoord"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
        <AuthInput
          label="Bevestig wachtwoord"
          type="password"
          value={confirm}
          onChange={setConfirm}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />

        <AuthPrimaryButton
          type="submit"
          label={busy ? "Bezig met opslaan..." : "Wachtwoord opslaan"}
          disabled={busy}
        />

        {message ? <AuthMessage message={message} tone={tone} /> : null}
      </form>
      <AuthFooter />
    </AuthShell>
  );
}
