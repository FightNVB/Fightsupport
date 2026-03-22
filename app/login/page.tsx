"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  AuthDualActions,
  AuthFooter,
  AuthInlineButton,
  AuthInput,
  AuthMessage,
  AuthPrimaryButton,
  AuthShell,
} from "./_components/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);

    if (loginError) {
      setError("Onjuiste inloggegevens.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <AuthShell title="Inloggen" subtitle="FightSupport toegang" narrow>
      <form onSubmit={handleLogin} style={{ display: "grid", gap: 14 }}>
        <AuthInput
          label="E-mailadres"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="naam@voorbeeld.nl"
          autoComplete="email"
          required
        />

        <div>
          <AuthInput
            label="Wachtwoord"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                background: "transparent",
                border: 0,
                color: "#ff4d00",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
            </button>
          </div>
        </div>

        <AuthPrimaryButton
          type="submit"
          label={busy ? "Bezig met inloggen..." : "Inloggen"}
          disabled={busy}
        />

        {error ? <AuthMessage message={error} tone="error" /> : null}
      </form>

      <div style={{ marginTop: 16 }}>
        <AuthDualActions>
          <AuthInlineButton
            label="Wachtwoord vergeten"
            onClick={() => router.push("/login/forgot")}
          />
          <AuthInlineButton
            label="Nieuw account"
            onClick={() => router.push("/login/register")}
          />
        </AuthDualActions>
      </div>

      <AuthFooter />
    </AuthShell>
  );
}
