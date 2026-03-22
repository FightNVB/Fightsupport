"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  AuthFooter,
  AuthInput,
  AuthMessage,
  AuthPrimaryButton,
  AuthShell,
} from "../_components/AuthShell";

export default function SetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [tone, setTone] = useState<"error" | "success" | "info">("info");
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setMsg("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session?.user) {
        setLoading(false);
        return;
      }

      redirectTimerRef.current = window.setTimeout(() => {
        if (!mounted) return;
        setLoading(false);
        setTone("error");
        setMsg("Je sessie is niet gevonden. Open de uitnodigingslink opnieuw of log eerst in.");
      }, 1800);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        if (redirectTimerRef.current) {
          window.clearTimeout(redirectTimerRef.current);
          redirectTimerRef.current = null;
        }
        setMsg("");
        setLoading(false);
      }
    });

    bootstrap();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  async function save() {
    setMsg("");

    if (pw1.length < 8) {
      setTone("error");
      setMsg("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }

    if (pw1 !== pw2) {
      setTone("error");
      setMsg("Wachtwoorden komen niet overeen.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      setTone("success");
      setMsg("Wachtwoord ingesteld. Je wordt doorgestuurd...");
      window.setTimeout(() => router.replace("/dashboard"), 900);
    } catch (e: any) {
      setTone("error");
      setMsg(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AuthShell title="Wachtwoord instellen" subtitle="FightSupport account activeren" onBack={() => router.replace("/login")} narrow>
        <AuthMessage message="Laden..." tone="info" />
        <AuthFooter />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Wachtwoord instellen"
      subtitle="Activeer je FightSupport account"
      onBack={() => router.replace("/login")}
      narrow
    >
      <div style={{ display: "grid", gap: 14 }}>
        <AuthInput
          label="Wachtwoord"
          type="password"
          value={pw1}
          onChange={setPw1}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <AuthInput
          label="Herhaal wachtwoord"
          type="password"
          value={pw2}
          onChange={setPw2}
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <AuthPrimaryButton
          label={busy ? "Bezig met opslaan..." : "Wachtwoord opslaan"}
          onClick={save}
          disabled={busy}
        />

        {msg ? <AuthMessage message={msg} tone={tone} /> : null}
      </div>
      <AuthFooter />
    </AuthShell>
  );
}
