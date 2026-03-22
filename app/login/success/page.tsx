"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AuthFooter,
  AuthMessage,
  AuthPrimaryButton,
  AuthShell,
} from "../_components/AuthShell";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <AuthShell title="Wachtwoord gewijzigd" subtitle="Je account is bijgewerkt" onBack={() => router.push("/login")} narrow>
      <AuthMessage
        message="Je nieuwe wachtwoord is succesvol ingesteld. Je wordt automatisch doorgestuurd naar het inlogscherm."
        tone="success"
      />
      <div style={{ marginTop: 14 }}>
        <AuthPrimaryButton label="Terug naar inloggen" onClick={() => router.push("/login")} />
      </div>
      <AuthFooter />
    </AuthShell>
  );
}
