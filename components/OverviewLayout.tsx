"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import NvbLightButton from "@/components/NvbLightButton";

const cinzel = { className: "font-sans" };

const NVB_ORANGE = "#ff4d00";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  maxWidth?: string; // default 1200px
  rightActions?: ReactNode;
  children: ReactNode;
};

export default function OverviewLayout({
  title,
  subtitle,
  backHref = "/dashboard",
  backLabel = "Terug naar dashboard",
  maxWidth = "1200px",
  rightActions,
  children,
}: Props) {
  const router = useRouter();

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full" style={{ maxWidth }}>
        {/* Topbar: compact, geen grote blokken */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Klein icon-only, geen grote card */}
            <Image
              src="/branding/fightsupport/logo-dark.png"
              width={28}
              height={28}
              alt="FightSupport"
              priority
              className="opacity-95"
            />

            <div className="leading-tight">
              <div
                className={cinzel.className}
                style={{
                  color: NVB_ORANGE,
                  letterSpacing: "0.10em",
                  fontSize: 12,
                }}
              >
                FIGHTSUPPORT
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(235,235,235,0.70)",
                }}
              >
                Vechtsport ondersteuning
              </div>
            </div>
          </div>

          {/* Actions rechts: compact + lightbutton */}
          <div className="flex items-center gap-2">
            {rightActions ? <div className="flex items-center gap-2">{rightActions}</div> : null}
            <div className="scale-[0.92] origin-right">
              <NvbLightButton label={backLabel} onClick={() => router.push(backHref)} />
            </div>
          </div>
        </div>

        {/* Titel direct eronder (minder top padding) */}
        <div className="mt-4">
          <div className="text-4xl font-extrabold" style={{ color: NVB_ORANGE }}>
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm" style={{ color: "rgba(235,235,235,0.75)" }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Subtle divider */}
        <div
          className="mt-4"
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(220,220,220,0.18), transparent)",
          }}
        />

        <div className="mt-4">{children}</div>
      </div>
    </main>
  );
}