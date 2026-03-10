"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ORANGE = "#ff4d00";
const BORDER = "#2b2b2b";

const PAGE_BG =
  "radial-gradient(900px 520px at 18% 0%, rgba(255,77,0,0.14), transparent 56%), radial-gradient(780px 520px at 82% 18%, rgba(255,255,255,0.80), transparent 62%), linear-gradient(180deg,#f6f6f6 0%, #e7e7e7 55%, #d4d4d4 100%)";

const FRAME_BG = "linear-gradient(180deg,#f8f8f8 0%, #d6d6d6 55%, #bdbdbd 100%)";
const INNER_BG = "linear-gradient(180deg,#111 0%, #0a0a0a 55%, #050505 100%)";

export default function SetPasswordPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        router.replace("/login");
        return;
      }
      setLoading(false);
    })();
  }, [router]);

  async function save() {
    setMsg("");

    if (pw1.length < 8) {
      setMsg("❌ Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    if (pw1 !== pw2) {
      setMsg("❌ Wachtwoorden komen niet overeen.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      setMsg("✔ Wachtwoord ingesteld. Je wordt doorgestuurd…");
      setTimeout(() => router.replace("/dashboard"), 800);
    } catch (e: any) {
      setMsg(`❌ ${String(e?.message ?? e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: PAGE_BG }}>
        <div className="text-black/70">Laden…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: PAGE_BG }}>
      <div className="w-full max-w-[520px]">
        <div
          className="rounded-[36px] p-[10px]"
          style={{
            background: FRAME_BG,
            boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="rounded-[28px] overflow-hidden"
            style={{
              border: `4px solid ${BORDER}`,
              background: "linear-gradient(180deg,#fbfbfb 0%, #f1f1f1 50%, #e7e7e7 100%)",
            }}
          >
            <div
              className="px-6 py-5 relative"
              style={{
                background: "linear-gradient(180deg,#3a3a3a 0%, #1f1f1f 55%, #141414 100%)",
                borderBottom: "3px solid rgba(255,77,0,0.35)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div style={{ color: ORANGE, letterSpacing: "0.14em", fontWeight: 800 }}>FIGHTSUPPORT</div>
                  <div className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
                    Wachtwoord instellen
                  </div>
                </div>

                <div
                  className="rounded-[18px] p-[6px]"
                  style={{
                    background: "linear-gradient(180deg,#fefefe,#cfcfcf)",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
                  }}
                >
                  <div className="rounded-[14px] p-[6px]" style={{ border: `3px solid ${BORDER}`, background: "linear-gradient(180deg,#111,#000)" }}>
                    <Image src="/branding/fightsupport/logo-dark.png" width={64} height={64} alt="FightSupport" priority />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-6" style={{ background: INNER_BG }}>
              <h2 className="text-2xl font-extrabold text-white">Nieuw wachtwoord</h2>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                Stel nu je wachtwoord in. Daarna kun je ook met e-mail + wachtwoord inloggen.
              </p>

              <div className="mt-5 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>
                    Wachtwoord (min. 8 tekens)
                  </label>
                  <input
                    type="password"
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    className="mt-1 w-full rounded-xl px-3 py-3"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "2px solid rgba(255,255,255,0.14)",
                      color: "#fff",
                      outline: "none",
                    }}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>
                    Herhaal wachtwoord
                  </label>
                  <input
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    className="mt-1 w-full rounded-xl px-3 py-3"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "2px solid rgba(255,255,255,0.14)",
                      color: "#fff",
                      outline: "none",
                    }}
                    placeholder="••••••••"
                  />
                </div>

                <button
                  disabled={busy}
                  onClick={save}
                  className="rounded-xl px-4 py-3 font-extrabold disabled:opacity-60"
                  style={{
                    background: ORANGE,
                    color: "#fff",
                    border: `3px solid ${BORDER}`,
                    boxShadow:
                      "0 10px 22px rgba(0,0,0,0.22), inset 0 0 0 2px rgba(255,255,255,0.20), inset 0 -10px 18px rgba(0,0,0,0.20)",
                  }}
                >
                  {busy ? "Opslaan…" : "Wachtwoord opslaan"}
                </button>

                <button
                  type="button"
                  onClick={() => router.replace("/dashboard")}
                  className="rounded-xl px-4 py-3 font-extrabold"
                  style={{
                    background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)",
                    color: "#000",
                    border: `3px solid ${BORDER}`,
                  }}
                >
                  Overslaan (naar dashboard)
                </button>

                {msg ? <div className="text-sm text-white/80">{msg}</div> : null}
              </div>

              <p className="mt-6 text-center text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                © {new Date().getFullYear()} FightSupport
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}