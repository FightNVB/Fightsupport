"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { completePasswordRecoveryFromUrl } from "@/lib/auth/completePasswordRecovery";
import { AuthFooter, AuthInput, AuthMessage, AuthPrimaryButton, AuthShell } from "@/app/login/_components/AuthShell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "success" | "info">("info");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session?.user) setReady(true);
    });

    void completePasswordRecoveryFromUrl(new URL(window.location.href))
      .then((session) => {
        if (!active) return;
        if (session?.user) setReady(true);
        else {
          setTone("error");
          setMessage("De resetlink is ongeldig of verlopen. Vraag een nieuwe resetlink aan.");
        }
      })
      .catch(() => {
        if (active) {
          setTone("error");
          setMessage("De resetlink is ongeldig of verlopen. Vraag een nieuwe resetlink aan.");
        }
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
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
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setTone("error");
      setMessage("Wachtwoord kon niet worden ingesteld. Vraag zo nodig een nieuwe resetlink aan.");
      return;
    }

    setTone("success");
    setMessage("Wachtwoord opgeslagen. Je wordt doorgestuurd...");
    window.setTimeout(() => router.replace("/login/success"), 700);
  }

  return (
    <AuthShell title="Nieuw wachtwoord" subtitle="Reset en beveilig je account" onBack={() => router.push("/login")} narrow>
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <AuthInput label="Nieuw wachtwoord" type="password" value={password} onChange={setPassword} placeholder="Vul een nieuw wachtwoord in" autoComplete="new-password" required />
        <AuthInput label="Bevestig wachtwoord" type="password" value={confirm} onChange={setConfirm} placeholder="Herhaal het nieuwe wachtwoord" autoComplete="new-password" required />
        <AuthPrimaryButton type="submit" label={busy ? "Bezig met opslaan..." : ready ? "Wachtwoord opslaan" : "Resetlink controleren..."} disabled={busy || !ready} />
        {message ? <AuthMessage message={message} tone={tone} /> : null}
      </form>
      <AuthFooter />
    </AuthShell>
  );
}
