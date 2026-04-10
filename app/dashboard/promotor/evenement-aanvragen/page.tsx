"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  CalendarDays,
  MapPin,
  Shield,
  Swords,
  Building2,
  Save,
} from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

const ORANGE = "#ff4d00";
const BORDER = "#2a2f36";

const BONDTEAMS = ["IRO", "NKF", "WPKL", "WMTA", "VON", "UMC", "MMAAN", "MON"] as const;
const DISCIPLINES = ["MMA", "KB", "MT", "K1", "BOKSEN"] as const;

type Bondteam = (typeof BONDTEAMS)[number];
type Discipline = (typeof DISCIPLINES)[number];

type OfficialOption = {
  id: string;
  name: string;
};

type OfficialOptionsResponse = {
  rows?: OfficialOption[];
  error?: string;
};

type CreateResponse = {
  ok?: boolean;
  error?: string;
};

const PAGE_BG: CSSProperties = {
  minHeight: "100vh",
  background: `
    radial-gradient(circle at 18% 0%, rgba(255,77,0,0.12) 0%, transparent 26%),
    radial-gradient(circle at 82% 18%, rgba(255,255,255,0.06) 0%, transparent 24%),
    linear-gradient(180deg, #0f1216 0%, #1b2027 45%, #0f1216 100%)
  `,
  color: "#fff",
};

const SHELL_OUTER: CSSProperties = {
  background:
    "linear-gradient(180deg,#f8f8f8 0%, #d7d7d7 18%, #8a8a8a 55%, #efefef 100%)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
};

const SHELL_INNER: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(32,37,45,0.98) 0%, rgba(20,24,30,0.98) 100%)",
  border: "3px solid rgba(95,105,118,0.55)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const LIGHT_PANEL: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(245,247,250,0.98) 0%, rgba(229,233,238,0.98) 100%)",
  border: "2px solid rgba(95,105,118,0.55)",
  boxShadow:
    "0 16px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <main style={PAGE_BG} className="px-4 py-6">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="rounded-[34px] p-[7px]" style={SHELL_OUTER}>
          <div className="overflow-hidden rounded-[28px]" style={SHELL_INNER}>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

function SilverButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
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

function OrangeButton({
  label,
  onClick,
  icon,
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[12px] px-6 py-3 text-sm font-extrabold disabled:opacity-60"
      style={{
        color: "#fff",
        border: `2px solid ${BORDER}`,
        background:
          "linear-gradient(180deg,#ff7a2a 0%, #ff4d00 50%, #b83200 100%)",
        boxShadow:
          "0 14px 28px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 18px rgba(0,0,0,0.18)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Header({
  onBack,
  onDashboard,
}: {
  onBack: () => void;
  onDashboard: () => void;
}) {
  return (
    <div
      className="relative px-6 py-5"
      style={{
        background:
          "linear-gradient(180deg, #3b4149 0%, #242a31 48%, #171b20 100%)",
        borderBottom: "3px solid rgba(255,77,0,0.5)",
      }}
    >
      <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
        <div>
          <div
            className="text-[28px] font-extrabold uppercase"
            style={{ color: ORANGE }}
          >
            Evenementverzoek
          </div>
          <div className="mt-1 text-sm text-white/75">
            Promotor aanvraagformulier
          </div>
          <div className="mt-3 flex gap-2">
            <SilverButton
              label="Terug"
              icon={<ArrowLeft size={16} strokeWidth={2.7} />}
              onClick={onBack}
            />
            <SilverButton
              label="Dashboard"
              icon={<LayoutDashboard size={16} strokeWidth={2.7} />}
              onClick={onDashboard}
            />
          </div>
        </div>

        <div className="justify-self-center">
          <Image
            src="/branding/fightsupport/excel-logo.png"
            alt="FightSupport"
            width={240}
            height={80}
            priority
            style={{ width: 240, height: "auto", display: "block" }}
          />
        </div>

        <div className="justify-self-end text-right">
          <div className="text-sm font-extrabold tracking-[0.20em] text-white/90">
            FIGHTSUPPORT
          </div>
          <div className="text-xs text-white/70">
            Vechtsport ondersteuning
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] p-5" style={LIGHT_PANEL}>
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
          {subtitle ? (
            <div className="text-sm text-slate-600">{subtitle}</div>
          ) : null}
        </div>
      </div>
      <div
        className="mb-4 h-[4px] w-full rounded-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,77,0,0.95) 0%, rgba(255,77,0,0.18) 48%, rgba(0,0,0,0.08) 100%)",
        }}
      />
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.10em] text-slate-700">
        {label}
      </div>
      {children}
    </div>
  );
}

function inputStyle(): CSSProperties {
  return {
    width: "100%",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
    border: "2px solid rgba(43,49,56,0.90)",
    color: "#000",
    outline: "none",
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Onbekende fout";
}

export default function PromotorEventRequestPage() {
  const router = useRouter();

  const [naam, setNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [locatie, setLocatie] = useState("");
  const [bondteam, setBondteam] = useState<Bondteam | "">("");
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [opmerkingPromotor, setOpmerkingPromotor] = useState("");
  const [voorkeurHoofdofficialUserId, setVoorkeurHoofdofficialUserId] =
    useState("");
  const [officials, setOfficials] = useState<OfficialOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return !!naam.trim() && !!datum && !!bondteam && disciplines.length > 0;
  }, [naam, datum, bondteam, disciplines]);

  useEffect(() => {
    let active = true;

    async function loadOfficials() {
      try {
        const res = await authedFetch(
          "/api/admin/event-requests/official-options",
          { method: "GET" }
        );

        let json: OfficialOptionsResponse = {};
        try {
          json = (await res.json()) as OfficialOptionsResponse;
        } catch {
          json = {};
        }

        if (!active) return;

        if (res.ok) {
          setOfficials(Array.isArray(json?.rows) ? json.rows : []);
        } else {
          setOfficials([]);
        }
      } catch {
        if (!active) return;
        setOfficials([]);
      }
    }

    void loadOfficials();

    return () => {
      active = false;
    };
  }, []);

  function toggleDiscipline(d: Discipline) {
    setDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  async function onSubmit() {
    setErr(null);
    if (!canSave) return;

    setSaving(true);
    try {
      const res = await authedFetch("/api/promotor/event-requests/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          datum,
          locatie: locatie.trim() || null,
          bondteam: bondteam || null,
          disciplines,
          voorkeur_hoofdofficial_user_id:
            voorkeurHoofdofficialUserId || null,
          opmerking_promotor: opmerkingPromotor.trim() || null,
        }),
      });

      let j: CreateResponse = {};
      try {
        j = (await res.json()) as CreateResponse;
      } catch {
        j = {};
      }

      if (!res.ok) {
        throw new Error(j?.error || "Opslaan mislukt");
      }

      router.push("/dashboard/promotor/aanvragen");
    } catch (error: unknown) {
      setErr(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <Header
        onBack={() => router.back()}
        onDashboard={() => router.push("/dashboard/promotor")}
      />

      <div className="px-4 py-6 md:px-6">
        <div
          className="rounded-[24px] p-5 md:p-6"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(239,242,246,0.98) 100%)",
            border: "2px solid rgba(95,105,118,0.40)",
            boxShadow:
              "0 18px 36px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.88)",
          }}
        >
          <div className="text-center">
            <h1
              className="text-4xl font-extrabold md:text-5xl"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #ff7a1a 0%, #ff4d00 45%, #c92c00 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Nieuw evenementverzoek
            </h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Datum, locatie, disciplines en voorkeur hoofdofficial
            </p>
          </div>

          {err ? (
            <div
              className="mt-5 rounded-[18px] border px-4 py-3 text-sm font-semibold"
              style={{
                background: "rgba(220,38,38,0.10)",
                color: "#991b1b",
                borderColor: "rgba(220,38,38,0.28)",
              }}
            >
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard
              title="Basisgegevens"
              subtitle="Naam, datum en locatie"
              icon={<CalendarDays size={22} strokeWidth={2.4} />}
            >
              <div className="space-y-4">
                <Field label="Naam *">
                  <input
                    style={inputStyle()}
                    value={naam}
                    onChange={(e) => setNaam(e.target.value)}
                  />
                </Field>

                <Field label="Datum *">
                  <input
                    type="date"
                    style={inputStyle()}
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                  />
                </Field>

                <Field label="Locatie / plaats">
                  <div className="relative">
                    <MapPin
                      size={16}
                      strokeWidth={2.5}
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#53606f",
                      }}
                    />
                    <input
                      style={{ ...inputStyle(), paddingLeft: 36 }}
                      value={locatie}
                      onChange={(e) => setLocatie(e.target.value)}
                    />
                  </div>
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              title="Bondteam en disciplines"
              subtitle="Kies bondteam en een of meer disciplines"
              icon={<Shield size={22} strokeWidth={2.4} />}
            >
              <div className="space-y-4">
                <Field label="Bondteam *">
                  <select
                    style={inputStyle()}
                    value={bondteam}
                    onChange={(e) =>
                      setBondteam((e.target.value as Bondteam) || "")
                    }
                  >
                    <option value="">— kies —</option>
                    {BONDTEAMS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>

                <div>
                  <div className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.10em] text-slate-700">
                    Disciplines *
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DISCIPLINES.map((d) => {
                      const active = disciplines.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDiscipline(d)}
                          className="rounded-[12px] px-3 py-2 text-sm font-extrabold"
                          style={{
                            background: active
                              ? "linear-gradient(180deg,#ff7a2a 0%, #ff4d00 55%, #c93b00 100%)"
                              : "linear-gradient(180deg,#f7f7f7 0%, #e4e7eb 100%)",
                            color: active ? "#fff" : "#111",
                            border: `2px solid ${BORDER}`,
                          }}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Swords size={14} strokeWidth={2.7} />
                            {d}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="mt-4">
            <SectionCard
              title="Voorkeur official en toelichting"
              subtitle="Admin kan deze official overnemen of vervangen"
              icon={<Building2 size={22} strokeWidth={2.4} />}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Voorkeur hoofdofficial">
                  <select
                    style={inputStyle()}
                    value={voorkeurHoofdofficialUserId}
                    onChange={(e) =>
                      setVoorkeurHoofdofficialUserId(e.target.value)
                    }
                  >
                    <option value="">— geen voorkeur —</option>
                    {officials.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Opmerking promotor">
                  <textarea
                    style={{
                      ...inputStyle(),
                      minHeight: 108,
                      resize: "vertical",
                    }}
                    value={opmerkingPromotor}
                    onChange={(e) => setOpmerkingPromotor(e.target.value)}
                  />
                </Field>
              </div>
            </SectionCard>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <SilverButton
              label="Annuleren"
              icon={<ArrowLeft size={16} strokeWidth={2.7} />}
              onClick={() => router.back()}
            />
            <OrangeButton
              disabled={!canSave || saving}
              onClick={onSubmit}
              icon={<Save size={16} strokeWidth={2.7} />}
              label={saving ? "Opslaan…" : "Verzoek indienen"}
            />
          </div>
        </div>
      </div>
    </Shell>
  );
}