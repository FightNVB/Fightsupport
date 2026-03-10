"use client";

import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-h-screen text-white"
      style={{
        background: `
          radial-gradient(900px 650px at 50% 10%, rgba(255,77,0,0.14), transparent 55%),
          radial-gradient(900px 650px at 50% 95%, rgba(255,255,255,0.06), transparent 55%),
          linear-gradient(180deg, #050505 0%, #0a0a0a 50%, #050505 100%)
        `,
      }}
    >
      {/* Subtiele rails links/rechts (zilver) */}
      <div className="min-h-screen relative">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[1px]"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(210,210,210,0.18), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[1px]"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(210,210,210,0.18), transparent)",
          }}
        />

        {children}
      </div>
    </main>
  );
}