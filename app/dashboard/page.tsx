"use client";

import React, { useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import NvbDarkButton from "@/components/NvbDarkButton";
import NvbLightButton from "@/components/NvbLightButton";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["500", "600", "700"] });

const NVB_ORANGE = "#ff4d00";

function metalText(): React.CSSProperties {
  return {
    background: "linear-gradient(180deg, #ffffff 0%, #d6d6d6 45%, #9a9a9a 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, roles, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const separator = useMemo(
    () =>
      ({
        height: "1px",
        background: "linear-gradient(to right, transparent, rgba(220,220,220,0.25), transparent)",
      }) as React.CSSProperties,
    []
  );

  const canAdmin = (roles ?? []).includes("admin") || (roles ?? []).includes("superadmin");
  const canOfficial =
    (roles ?? []).includes("official") ||
    (roles ?? []).includes("hoofdofficial") ||
    canAdmin;
  const canDispensatie = (roles ?? []).includes("dispensatie_admin") || canAdmin;
  const canMatchmaker = (roles ?? []).includes("matchmaker") || canAdmin;

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen px-4" style={{ background: "#000" }}>
        <div className="text-white/80">Bezig met laden…</div>
      </main>
    );
  }

  if (!user) return null;

  const actions = [
    canAdmin ? { label: "Admin Portaal", href: "/dashboard/admin" } : null,
    canOfficial ? { label: "Official Portaal", href: "/dashboard/officials" } : null,
    canDispensatie ? { label: "Dispensatie Portaal", href: "/dashboard/dispensatie" } : null,
    canMatchmaker ? { label: "Matchmaker Portaal", href: "/dashboard/matchmaker" } : null,
    { label: "Reglementen & Documenten", href: "/dashboard/informatie" },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <main className="flex items-center justify-center min-h-screen px-4 py-6" style={{ background: "#000" }}>
      <div className="relative w-full max-w-[560px]">
        <div className="pointer-events-none absolute -inset-12 rounded-[48px]" style={{ boxShadow: "0 0 80px rgba(255,77,0,0.14)" }} />

        <div className="relative rounded-[42px] p-[10px]">
          <div
            className="absolute inset-0 rounded-[42px]"
            style={{
              background: "linear-gradient(180deg, #d0d0d0 0%, #8f8f8f 50%, #2a2a2a 100%)",
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.35),
                0 0 0 2px rgba(120,120,120,0.20),
                0 30px 80px rgba(0,0,0,0.70)
              `,
            }}
          />

          <div
            className="relative rounded-[34px] p-[2px]"
            style={{
              background:
                "linear-gradient(135deg, rgba(230,230,230,0.85) 0%, rgba(180,180,180,0.40) 22%, rgba(255,77,0,0.55) 65%, rgba(255,77,0,0.95) 100%)",
            }}
          >
            <div
              className="rounded-[32px] px-6 py-6"
              style={{
                background: "linear-gradient(180deg, rgba(10,10,10,0.98), rgba(5,5,5,0.98))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="mb-6 rounded-xl text-center"
                style={{
                  padding: "14px 16px",
                  background: "linear-gradient(180deg, rgba(255,77,0,0.28), rgba(0,0,0,0))",
                  border: "1px solid rgba(255,77,0,0.30)",
                }}
              >
                <div
                  className={inter.className}
                  style={{
                    ...metalText(),
                    fontSize: 34,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  DASHBOARD
                </div>
              </div>

              <div className="flex flex-col items-center mb-6">
                <Image src="/branding/fightsupport/logo-dark.png" width={150} height={80} alt="FightSupport" priority />

                <div
                  className={`${inter.className} mt-2`}
                  style={{
                    color: NVB_ORANGE,
                    letterSpacing: "0.12em",
                    fontSize: 18,
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  FIGHTSUPPORT
                </div>

                <div className="flex gap-2 mt-3 flex-wrap justify-center">
                  <span className="px-3 py-1 rounded-full text-xs border border-white/20 text-white/80">Ingelogd</span>
                  <span className="px-3 py-1 rounded-full text-xs border border-orange-500/40 text-white/90">{user.email}</span>
                </div>
              </div>

              <div className="my-4" style={separator} />

              <div className="flex flex-col gap-3">
                {actions.map((a) => (
                  <NvbDarkButton key={a.href} label={a.label} onClick={() => router.push(a.href)} />
                ))}
              </div>

              <div className="my-4" style={separator} />

              <NvbLightButton
                label="Uitloggen"
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                }}
              />

              <p className="mt-4 text-xs text-center text-white/50">© FightSupport</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
