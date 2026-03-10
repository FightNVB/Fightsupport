"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("Onjuiste inloggegevens.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main
      className="flex items-center justify-center min-h-screen"
      style={{ background: "#000" }}
    >
      <div
        className="p-8 text-center rounded-2xl"
        style={{
          width: "420px",
          background: "#111",
          border: "1px solid #ff4d00",
          boxShadow: "0 0 30px rgba(255,77,0,0.2)",
        }}
      >
        <Image
          src="/logo_fightsupport.png"
          width={150}
          height={100}
          alt="NVB"
          className="mx-auto mb-4"
        />

        <h2 className="mb-4 text-xl font-bold">Inloggen</h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            className="p-3 rounded bg-[#1a1a1a] border border-[#333] text-white"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="p-3 w-full rounded bg-[#1a1a1a] border border-[#333] text-white"
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute text-sm -translate-y-1/2 right-3 top-1/2"
              style={{ color: "#ff4d00" }}
            >
              {showPassword ? "Verberg" : "Toon"}
            </button>
          </div>

          <button
            type="submit"
            className="p-3 font-semibold rounded"
            style={{
              background: "#ff4d00",
              color: "#fff",
              marginTop: "10px",
            }}
          >
            Inloggen
          </button>

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </form>

        {/* ✔ DEZE 2 KNOPPEN NAAST ELKAAR */}
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => router.push("/login/forgot")}
            className="px-3 py-2 text-sm border border-[#555] text-white rounded"
          >
            Wachtwoord vergeten
          </button>

          <button
            onClick={() => router.push("/login/register")}
            className="px-3 py-2 text-sm border border-[#555] text-white rounded"
          >
            Nieuw account
          </button>
        </div>
      </div>
    </main>
  );
}
