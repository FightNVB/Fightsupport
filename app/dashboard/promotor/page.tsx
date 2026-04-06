"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarPlus2,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";

const ORANGE = "#ff4d00";
const BORDER = "#2a2f36";

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen px-4 py-6"
      style={{
        background: `
          radial-gradient(circle at 18% 0%, rgba(255,77,0,0.12) 0%, transparent 26%),
          radial-gradient(circle at 82% 18%, rgba(255,255,255,0.06) 0%, transparent 24%),
          linear-gradient(180deg, #0f1216 0%, #1b2027 45%, #0f1216 100%)
        `,
      }}
    >
      <div className="mx-auto max-w-[1400px] rounded-[34px] p-[7px]" style={{
        background: "linear-gradient(180deg,#f8f8f8 0%, #d7d7d7 18%, #8a8a8a 55%, #efefef 100%)",
        boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
      }}>
        <div className="overflow-hidden rounded-[28px] border-[3px] border-zinc-600/60 bg-[linear-gradient(180deg,rgba(32,37,45,0.98)_0%,rgba(20,24,30,0.98)_100%)]">
          {children}
        </div>
      </div>
    </main>
  );
}

function SilverButton({ label, onClick, icon }: { label: string; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-extrabold"
      style={{
        color: "#111",
        border: "1px solid rgba(120,120,120,0.95)",
        background:
          "linear-gradient(180deg,#ffffff 0%, #ececec 18%, #cfcfcf 40%, #f7f7f7 58%, #a9a9a9 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), inset 0 -2px 2px rgba(0,0,0,0.32), 0 8px 18px rgba(0,0,0,0.28)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function PortalCard({
  title,
  subtitle,
  buttonLabel,
  onClick,
  icon,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[24px] p-5"
      style={{
        background:
          "linear-gradient(180deg, rgba(245,247,250,0.98) 0%, rgba(229,233,238,0.98) 100%)",
        border: "2px solid rgba(95,105,118,0.55)",
        boxShadow:
          "0 16px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[12px]"
          style={{
            background:
              "linear-gradient(180deg, #ff6b22 0%, #ff4d00 55%, #b93200 100%)",
            color: "#fff",
          }}
        >
          {icon}
        </div>
        <div>
          <div className="text-lg font-extrabold text-black">{title}</div>
          <div className="text-sm text-slate-600">{subtitle}</div>
        </div>
      </div>

      <div
        className="mb-4 h-[4px] w-full rounded-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,77,0,0.95) 0%, rgba(255,77,0,0.18) 48%, rgba(0,0,0,0.08) 100%)",
        }}
      />

      <button
        type="button"
        onClick={onClick}
        className="rounded-[12px] px-5 py-2.5 text-sm font-extrabold text-white"
        style={{
          border: `2px solid ${BORDER}`,
          background:
            "linear-gradient(180deg,#ff7a2a 0%, #ff4d00 50%, #b83200 100%)",
          boxShadow:
            "0 12px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 18px rgba(0,0,0,0.18)",
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

export default function PromotorDashboardPage() {
  const router = useRouter();

  return (
    <Panel>
      <div
        className="px-6 py-5"
        style={{
          background:
            "linear-gradient(180deg, #3b4149 0%, #242a31 48%, #171b20 100%)",
          borderBottom: "3px solid rgba(255,77,0,0.5)",
        }}
      >
        <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
          <div>
            <div className="text-[28px] font-extrabold uppercase" style={{ color: ORANGE }}>
              Promotor portaal
            </div>
            <div className="mt-1 text-sm text-white/75">Evenementverzoeken en status</div>
            <div className="mt-3 flex gap-2">
              <SilverButton
                label="Terug"
                icon={<ArrowLeft size={16} strokeWidth={2.7} />}
                onClick={() => router.back()}
              />
              <SilverButton
                label="Dashboard"
                icon={<LayoutDashboard size={16} strokeWidth={2.7} />}
                onClick={() => router.push("/dashboard")}
              />
            </div>
          </div>

          <div className="justify-self-center">
            <img
              src="/branding/fightsupport/excel-logo.png"
              alt="FightSupport"
              loading="eager"
              style={{ width: 240, height: "auto", display: "block" }}
            />
          </div>

          <div className="justify-self-end text-right">
            <div className="text-sm font-extrabold tracking-[0.20em] text-white/90">FIGHTSUPPORT</div>
            <div className="text-xs text-white/70">Vechtsport ondersteuning</div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PortalCard
            title="Nieuw evenementverzoek"
            subtitle="Dien een nieuw verzoek in met datum, locatie, disciplines en voorkeur hoofdofficial"
            buttonLabel="Nieuwe aanvraag"
            onClick={() => router.push("/dashboard/promotor/evenement-aanvragen")}
            icon={<CalendarPlus2 size={22} strokeWidth={2.5} />}
          />

          <PortalCard
            title="Mijn aanvragen"
            subtitle="Bekijk alle eerder ingediende verzoeken en hun status"
            buttonLabel="Open overzicht"
            onClick={() => router.push("/dashboard/promotor/aanvragen")}
            icon={<ClipboardList size={22} strokeWidth={2.5} />}
          />
        </div>
      </div>
    </Panel>
  );
}
