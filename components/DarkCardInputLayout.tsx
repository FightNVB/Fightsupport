"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";

export default function DarkCardInputLayout({
  title,
  children,
  backHref,
  backLabel,
}: {
  title: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#060708] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,77,0,0.10),transparent_32%),linear-gradient(180deg,#0a0b0d_0%,#050505_100%)]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-[30px] border border-[#3a3f46] bg-[linear-gradient(180deg,rgba(28,31,36,0.97)_0%,rgba(12,13,15,0.985)_100%)] shadow-[0_18px_70px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.03),0_0_40px_rgba(255,77,0,0.10)]">
          <div className="h-[8px] w-full bg-[linear-gradient(90deg,#6f757d_0%,#dfe3e8_16%,#8b929b_34%,#ff4d00_50%,#a6adb6_66%,#eef2f5_84%,#6e747b_100%)]" />

          <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-5 py-6 md:px-8 md:py-7">
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                {backHref ? (
                  <Link
                    href={backHref}
                    className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-[#ff4d00]/35 hover:bg-[#ff4d00]/10 hover:text-white"
                  >
                    {backLabel ?? "← Terug"}
                  </Link>
                ) : (
                  <div />
                )}
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="relative w-full max-w-[760px]">
                  <Image
                    src="/branding/fightsupport/logo-header.png"
                    alt="FightSupport"
                    width={1600}
                    height={400}
                    className="h-auto w-full object-contain drop-shadow-[0_8px_26px_rgba(0,0,0,0.55)]"
                    priority
                  />
                </div>

                <div className="mt-3">
                  <Image
                    src="/branding/fightsupport/excel-logo.png"
                    alt="Excel"
                    width={42}
                    height={42}
                    className="h-auto w-[42px] object-contain opacity-95"
                  />
                </div>

                <div className="mt-5 h-px w-full max-w-[820px] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.12)_18%,rgba(255,77,0,0.45)_50%,rgba(255,255,255,0.12)_82%,transparent_100%)]" />

                <h1 className="mt-5 text-center text-xl font-extrabold tracking-[0.08em] text-white md:text-2xl">
                  {title}
                </h1>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 md:px-8 md:py-8">
            <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.015)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}