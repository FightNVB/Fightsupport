import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

const NVB_ORANGE = "#ff4d00";
const SILVER = "rgba(201,205,211,0.32)";

interface TableCardLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  width?: string;
  maxWidth?: string;
}

export default function TableCardLayout({
  title,
  subtitle,
  children,
  backHref,
  backLabel = "Terug",
  width = "100%",
  maxWidth = "1700px",
}: TableCardLayoutProps) {
  return (
    <main className="min-h-screen bg-black text-white py-6 sm:py-10">
      <div className="mx-auto px-3 sm:px-6" style={{ width, maxWidth }}>
        {/* Outer shell */}
        <div
          className="rounded-[28px] overflow-hidden"
          style={{
            border: `1px solid ${SILVER}`,
            boxShadow: `0 0 26px rgba(0,0,0,0.6), 0 0 22px rgba(255,77,0,0.12)`,
            background:
              "radial-gradient(1200px 480px at 50% 0%, rgba(255,77,0,0.10) 0%, rgba(0,0,0,0.92) 55%), #000",
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              height: 3,
              background: `linear-gradient(90deg,
                rgba(201,205,211,0) 0%,
                rgba(201,205,211,0.55) 20%,
                ${NVB_ORANGE} 50%,
                rgba(201,205,211,0.55) 80%,
                rgba(201,205,211,0) 100%)`,
            }}
          />

          {/* Header */}
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <div
                  className="rounded-2xl px-3 py-2"
                  style={{
                    border: `1px solid ${SILVER}`,
                    background:
                      "linear-gradient(180deg, rgba(201,205,211,0.10) 0%, rgba(0,0,0,0.25) 100%)",
                  }}
                >
                  <Image
                    src="/logo_fightsupport.png"  
                    alt="Fightsupport"
                    width={420}
                    height={150}
                    priority
                    className="h-auto w-[240px] sm:w-[320px] md:w-[400px] drop-shadow-[0_10px_26px_rgba(0,0,0,0.70)]"
                  />
                </div>

                <div className="hidden md:block">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
                  {subtitle ? (
                    <p className="mt-1 text-sm text-white/70">{subtitle}</p>
                  ) : null}
                </div>
              </div>

              {backHref ? (
                <Link
                  href={backHref}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold"
                  style={{
                    background: NVB_ORANGE,
                    color: "#000",
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.35) inset, 0 10px 24px rgba(0,0,0,0.35)",
                  }}
                >
                  <span className="text-black/80">←</span>
                  <span>{backLabel}</span>
                </Link>
              ) : null}
            </div>

            {/* Mobile title/subtitle */}
            <div className="md:hidden mt-4">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
            </div>
 
            {/* Divider */}
            <div 
              className="mt-5"
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, rgba(201,205,211,0) 0%, rgba(201,205,211,0.40) 18%, rgba(201,205,211,0.18) 50%, rgba(201,205,211,0.40) 82%, rgba(201,205,211,0) 100%)",
              }}
            />
          </div>

          {/* Content */}
          <div className="px-5 sm:px-7 pb-6 sm:pb-8">{children}</div>
        </div>
      </div>
    </main>
  );
} 