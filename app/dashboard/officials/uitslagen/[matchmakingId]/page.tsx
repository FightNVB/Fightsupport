"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = {
  id: string;
  partij_nr: number;
  discipline: string | null;
  klasse: string | null;

  rood_naam: string | null;
  rood_gym: string | null;
  rood_va: string | null;
  rood_gewicht: string | number | null;
  rood_minpunten: string | number | null;

  blauw_naam: string | null;
  blauw_gym: string | null;
  blauw_va: string | null;
  blauw_gewicht: string | number | null;
  blauw_minpunten: string | number | null;
};

type State = {
  winnaar_hoek: string;
  methode: string;
  opmerkingen: string;
  opgeslagen: boolean;
};

const WIN_METHODS = [
  "Wint op punten",
  "Wint op KO",
  "Wint op Technisch KO",
  "Wint d.m.v. medische interventie",
  "Wint d.m.v. opgave",
  "Wint d.m.v. submission",
  "Wint d.m.v. diskwalificatie",
  "Wint d.m.v. RSC",
];

function pick(...vals: any[]) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return null;
}

function toNumberLoose(v: any): number | null {
  if (v === null || v === undefined) return null;
  const raw = String(v).trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeMinpuntValue(v: any): number {
  const n = toNumberLoose(v);
  if (n === null || n <= 0) return 0;

  // In deze flow is ACTIE MINPUNT rood/blauw één strafpunt.
  // Door dubbele weegstation/controle_resultaten-koppeling kan dezelfde minpunt
  // als 2 opgeslagen zijn. Toon en verstuur hem daarom maar één keer.
  return 1;
}

function pickMinpunten(...vals: any[]) {
  const nums = vals
    .map((v) => normalizeMinpuntValue(v))
    .filter((v) => v > 0);

  return nums.length ? 1 : 0;
}

function fmt(v: any, suffix = "") {
  const s = String(v ?? "").trim();
  return s ? `${s}${suffix}` : "-";
}

function hasMinpunten(v: any) {
  return normalizeMinpuntValue(v) > 0;
}

function fmtMinpunten(v: any) {
  const n = normalizeMinpuntValue(v);
  return n > 0 ? `-${n}` : "0";
}

function mapDiscipline(v: string | null) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s.includes("kick")) return "Kickboksen/Kickboxing";
  if (s.includes("thai")) return "Thaiboksen/Muay Thai";
  if (s.includes("mma")) return "MMA/MMA";
  if (s === "boksen" || s === "boxing") return "Boksen/Boxing";
  return v || "-";
}

function mapKlasse(v: string | null) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "j+" || s.includes("talentstatus")) return "J+ Talentstatus";
  if (s.includes("jeugd") || s.includes("youth") || s === "j") return "Jeugd/Youth";
  if (s.includes("nieuw") || s.includes("newcomer") || s === "n") return "Nieuweling/Newcomer";
  if (s.includes("mma amateur")) return "MMA Amateur";
  if (s.includes("mma professional")) return "MMA Professional";
  if (s.includes("veteraan") || s.includes("veteran")) return "Veteraan/Veteran";
  if (s === "r" || s.includes("r-klasse") || s.includes("r-class")) return "R-Klasse/R-Class";
  if (s === "c" || s.includes("c-klasse") || s.includes("c-class")) return "C-Klasse/C-Class";
  if (s === "b" || s.includes("b-klasse") || s.includes("b-class")) return "B-Klasse/B-Class";
  if (s === "a" || s.includes("a-klasse") || s.includes("a-class")) return "A-Klasse/A-Class";
  return v || "-";
}

function methodsFor(type: string) {
  if (type === "rood" || type === "blauw") return WIN_METHODS;
  if (type === "onbeslist") return ["Onbeslist"];
  if (type === "no_contest") return ["No contest"];
  if (type === "demo") return ["Demo"];
  return [];
}

function statusLabel(type: string) {
  if (type === "rood") return "Roodhoek wint";
  if (type === "blauw") return "Blauwhoek wint";
  if (type === "onbeslist") return "Onbeslist";
  if (type === "no_contest") return "No contest";
  if (type === "demo") return "Demo";
  return "Kies winnaar";
}

function ResultOptionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-[40px] rounded-none border-2 px-4 text-xs font-black uppercase tracking-[2px] transition-all",
        active
          ? "border-[#ffb067] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_54%,#b93600_100%)] text-white"
          : "border-[#c9cbd0] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_46%,#8e9298_100%)] text-black hover:border-[#ffb067]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function CornerCard({
  corner,
  name,
  gym,
  va,
  weight,
  minpunten,
  selected,
  onSelect,
}: {
  corner: "rood" | "blauw";
  name: string | null;
  gym: string | null;
  va: string | null;
  weight: string | number | null;
  minpunten: string | number | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const isRed = corner === "rood";
  const activeMin = hasMinpunten(minpunten);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "group relative min-h-[205px] w-full overflow-hidden rounded-none border-[6px] p-5 text-left transition-all duration-200",
        "shadow-[inset_0_0_0_2px_#5f6872,0_8px_14px_rgba(0,0,0,0.48)]",
        selected
          ? "border-[#ffb067]"
          : "border-[#d9dde3] hover:border-[#ffb067]",
        isRed
          ? "bg-[linear-gradient(90deg,#ff3030_0%,#ff3030_10px,transparent_10px),linear-gradient(180deg,#171114_0%,#0c0d11_54%,#05070a_100%)]"
          : "bg-[linear-gradient(270deg,#2d75ff_0%,#2d75ff_10px,transparent_10px),linear-gradient(180deg,#111823_0%,#0c111a_54%,#05070a_100%)]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 border-[3px] border-black/45" />
      <div className={["absolute top-0 h-full w-[10px]", isRed ? "left-0 bg-red-500" : "right-0 bg-blue-500"].join(" ")} />

      {selected && (
        <div
          className={[
            "absolute top-4 border-2 border-[#ffcead] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_60%,#b93600_100%)] px-4 py-2 text-xs font-black uppercase tracking-[2px] text-white",
            isRed ? "right-4" : "left-4",
          ].join(" ")}
        >
          Winnaar
        </div>
      )}

      <div className={`relative mb-6 flex ${isRed ? "justify-start" : "justify-end"}`}>
        <span
          className={[
            "rounded-none border-2 px-4 py-[7px] text-[11px] font-black uppercase tracking-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
            isRed ? "border-red-300/80 bg-red-500/18 text-red-100" : "border-blue-300/80 bg-blue-500/18 text-blue-100",
          ].join(" ")}
        >
          {isRed ? "Roodhoek" : "Blauwhoek"}
        </span>
      </div>

      <div className={`relative pb-16 ${isRed ? "text-left" : "text-right"}`}>
        <div className="text-[32px] font-black uppercase leading-tight tracking-[1px] text-white [text-shadow:2px_2px_0_#ff4d00]">
          {name || "-"}
        </div>
        <div className={`mt-3 inline-block max-w-full border-l-4 border-[#ff4d00] bg-black/55 px-4 py-[7px] text-[16px] font-black uppercase tracking-[1px] text-[#ffb067] ${isRed ? "" : "border-l-0 border-r-4"}`}>
          {gym || "-"}
        </div>
      </div>

      <div className={`absolute bottom-4 flex flex-wrap gap-2 ${isRed ? "left-8 right-6 justify-start" : "left-6 right-8 justify-end"}`}>
        <span className="rounded-none border-2 border-[#d1d4da] bg-black px-3 py-[7px] text-[13px] font-black text-zinc-100">
          VA {fmt(va)}
        </span>
        <span className="rounded-none border-2 border-[#d1d4da] bg-black px-3 py-[7px] text-[13px] font-black text-zinc-100">
          Gewicht {fmt(weight, " kg")}
        </span>
        <span
          className={[
            "rounded-none border-2 px-4 py-2 text-sm font-black",
            activeMin ? "border-[#ff4d00] bg-black text-[#ffb067]" : "border-[#777c85] bg-black text-zinc-400",
          ].join(" ")}
        >
          Minpunten {fmtMinpunten(minpunten)}
        </span>
      </div>
    </button>
  );
}

export default function OfficialsUitslagenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();

  const matchmakingId = String(params?.matchmakingId ?? "");

  const [rows, setRows] = useState<Row[]>([]);
  const [states, setStates] = useState<Record<string, State>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const allowed = useMemo(
    () =>
      (roles ?? []).some((r) =>
        ["official", "hoofdofficial", "admin", "superadmin"].includes(String(r).toLowerCase())
      ),
    [roles]
  );

  const current = rows[currentIndex] ?? null;
  const currentState = current ? states[current.id] : null;
  const savedCount = Object.values(states).filter((s) => s.opgeslagen).length;
  const progress = rows.length > 0 ? Math.round((savedCount / rows.length) * 100) : 0;
  const methods = methodsFor(currentState?.winnaar_hoek ?? "");
  const canSave = !!current && !!currentState?.winnaar_hoek && !!currentState?.methode && busyId !== current.id;
  const canSendToAdmin = rows.length > 0 && savedCount === rows.length && !sendBusy;

  async function load() {
    setLoading(true);

    try {
      setSendMsg(null);

      const [{ data: bouts }, { data: resultRows }] = await Promise.all([
        supabase
          .from("uitslagen_bouts")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .order("partij_nr", { ascending: true }),
        supabase
          .from("uitslagen_resultaten")
          .select("uitslagen_bout_id, winnaar_hoek, methode, opmerkingen, uitslag_status, klasse")
          .eq("matchmaking_id", matchmakingId),
      ]);

      const resultByBoutId = new Map(
        (resultRows ?? []).map((r: any) => [String(r.uitslagen_bout_id), r])
      );

      const nextRows = (bouts ?? []).map((b: any) => ({
        id: String(b.id),
        partij_nr: Number(b.partij_nr),
        discipline: b.discipline,
        klasse: pick(b.klasse, b.bout_klasse, b.partij_klasse, b.klasse_rood, b.klasse_blauw, (resultByBoutId.get(String(b.id)) as any)?.klasse),

        rood_naam: b.rood_naam,
        rood_gym: b.rood_gym,
        rood_va: pick(b.rood_va, b.rood_va_nummer),
        rood_gewicht: pick(
          b.rood_gewicht_gewogen,
          b.rood_gewogen_gewicht,
          b.rood_weeggewicht,
          b.rood_gewicht,
          b.rood_gewicht_opgegeven,
          b.rood_doorgegeven_gewicht
        ),
        rood_minpunten: pickMinpunten(
          b.rood_minpunten,
          b.rood_min_punten,
          b.rood_strafpunten,
          b.rood_puntenaftrek,
          b.gewicht_strafpunt_rood,
          b.rood_gewicht_strafpunt
        ),

        blauw_naam: b.blauw_naam,
        blauw_gym: b.blauw_gym,
        blauw_va: pick(b.blauw_va, b.blauw_va_nummer),
        blauw_gewicht: pick(
          b.blauw_gewicht_gewogen,
          b.blauw_gewogen_gewicht,
          b.blauw_weeggewicht,
          b.blauw_gewicht,
          b.blauw_gewicht_opgegeven,
          b.blauw_doorgegeven_gewicht
        ),
        blauw_minpunten: pickMinpunten(
          b.blauw_minpunten,
          b.blauw_min_punten,
          b.blauw_strafpunten,
          b.blauw_puntenaftrek,
          b.gewicht_strafpunt_blauw,
          b.blauw_gewicht_strafpunt
        ),
      }));

      setRows(nextRows);

      const nextState: Record<string, State> = {};
      nextRows.forEach((r) => {
        const saved: any = resultByBoutId.get(r.id);
        nextState[r.id] = {
          winnaar_hoek: String(saved?.winnaar_hoek ?? ""),
          methode: String(saved?.methode ?? ""),
          opmerkingen: String(saved?.opmerkingen ?? ""),
          opgeslagen: !!saved && String(saved?.uitslag_status ?? "") !== "concept",
        };
      });

      setStates(nextState);
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void router.replace("/login");
    if (!allowed) return void router.replace("/dashboard");
    void load();
  }, [authLoading, user, allowed, router, matchmakingId]);

  function setRowState(id: string, patch: Partial<State>) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch, opgeslagen: patch.opgeslagen ?? false } }));
  }

  function chooseWinner(type: "rood" | "blauw") {
    if (!current) return;
    setRowState(current.id, { winnaar_hoek: type, methode: "" });
  }

  function chooseSpecial(type: "onbeslist" | "demo" | "no_contest", methode: string) {
    if (!current) return;
    setRowState(current.id, { winnaar_hoek: type, methode });
  }

  function goNext() {
    setCurrentIndex((i) => Math.min(rows.length - 1, i + 1));
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }


  async function sendToAdmin() {
    if (!canSendToAdmin) return;

    setSendBusy(true);
    setSendMsg(null);

    try {
      const res = await authedFetch("/api/officials/uitslagen/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Naar admin sturen mislukt.");
      }

      setSendMsg("Uitslagen zijn naar admin gestuurd en staan klaar voor Excel export.");
      router.replace("/dashboard/officials");
    } catch (e: any) {
      setSendMsg(e?.message ?? "Naar admin sturen mislukt.");
    } finally {
      setSendBusy(false);
    }
  }

  async function saveCurrent() {
    if (!current || !currentState?.winnaar_hoek || !currentState?.methode) return;

    setBusyId(current.id);

    try {
      await authedFetch("/api/officials/uitslagen/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uitslagen_bout_id: current.id,
          matchmaking_id: matchmakingId,
          partij_nr: current.partij_nr,
          winnaar_hoek: currentState.winnaar_hoek,
          methode: currentState.methode,
          opmerkingen: currentState.opmerkingen,
          klasse: current.klasse,
          bout_klasse: current.klasse,
          partij_klasse: current.klasse,
          rood_minpunten: normalizeMinpuntValue(current.rood_minpunten),
          blauw_minpunten: normalizeMinpuntValue(current.blauw_minpunten),
          uitslag_status: "definitief",
        }),
      });

      setRowState(current.id, { opgeslagen: true });

      if (currentIndex < rows.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#303a45_0%,#222b35_45%,#141b23_100%)] text-white">
      <div className="mx-auto max-w-[1880px] px-5 py-3">
        <header className="mb-3 rounded-none border-[5px] border-[#d9dde3] bg-[linear-gradient(180deg,#39424c_0%,#252e38_46%,#151c24_100%)] px-5 py-2 shadow-[inset_0_0_0_2px_#6f7781,0_8px_14px_rgba(0,0,0,0.42)]">
          <div className="grid grid-cols-[160px_1fr_210px] items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/officials/uitslagen")}
              className="h-[38px] rounded-none border-2 border-[#f7f7f7] bg-[linear-gradient(180deg,#ffffff_0%,#d6d6d6_44%,#8b8f96_100%)] px-4 text-xs font-black uppercase tracking-[2px] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:border-[#ffb067]"
            >
              ← Overzicht
            </button>

            <div className="flex min-h-[78px] items-center justify-center">
              <Image
                src="/branding/fightsupport/excel-logo.png"
                alt="FightSupport"
                width={1500}
                height={260}
                loading="eager"
                priority
                className="h-[74px] w-auto object-contain"
              />
            </div>

            <div className="text-right">
              <div className="text-[25px] font-black uppercase tracking-[5px] text-[#ff4d00]">
                Uitslagen
              </div>
              <div className="mt-1 text-xs font-black uppercase tracking-[2px] text-zinc-300">Result Control</div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-none border-[4px] border-[#bfc2c8] bg-[linear-gradient(180deg,#303640_0%,#0d1117_100%)] p-10 text-center font-black uppercase tracking-[3px] text-zinc-200">
            Laden...
          </div>
        ) : !current ? (
          <div className="rounded-none border-[4px] border-[#bfc2c8] bg-[linear-gradient(180deg,#303640_0%,#0d1117_100%)] p-10 text-center font-black uppercase tracking-[3px] text-zinc-200">
            Geen partijen gevonden.
          </div>
        ) : (
          <>
            <section className="rounded-none border-[6px] border-[#d9dde3] bg-[linear-gradient(180deg,#343e49_0%,#26313b_40%,#18212a_100%)] p-4 shadow-[inset_0_0_0_2px_#626b75,0_10px_18px_rgba(0,0,0,0.48)]">
              <div className="mb-4 flex items-center justify-between border-b-2 border-[#ffffff22] bg-[#1c242d] px-4 py-3 shadow-[inset_0_-2px_0_rgba(255,77,0,0.35)]">
                <div className="flex items-center gap-5">
                  <div className="flex h-[50px] min-w-[50px] items-center justify-center rounded-none border-2 border-[#ffb067] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_56%,#b93600_100%)] text-[23px] font-black text-white">
                    {current.partij_nr}
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-none border-2 border-[#d8dbe0] bg-[linear-gradient(180deg,#ffffff_0%,#d1d3d7_44%,#8e9298_100%)] px-3 py-[6px] text-xs font-black uppercase tracking-[2px] text-black">
                        {mapDiscipline(current.discipline)}
                      </span>
                      <span className="rounded-none border-2 border-[#ffb067] bg-black/35 px-3 py-[6px] text-xs font-black uppercase tracking-[2px] text-[#ffb067]">
                        {mapKlasse(current.klasse)}
                      </span>
                    </div>

                    <div className="mt-2 text-[16px] font-black uppercase tracking-[3px] text-white">
                      Klik winnaar aan en kies methode
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-none border-2 border-[#c3c6cc] bg-black/38 px-5 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    <div className="text-[11px] font-black uppercase tracking-[2px] text-zinc-400">Uitslag</div>
                    <div className="text-sm font-black uppercase tracking-[2px] text-[#ffb067]">
                      {statusLabel(currentState?.winnaar_hoek ?? "")}
                    </div>
                  </div>

                  {currentState?.opgeslagen && (
                    <div className="flex items-center gap-2 rounded-none border-2 border-emerald-400/80 bg-emerald-500/15 px-5 py-3 text-xs font-black uppercase tracking-[2px] text-emerald-100">
                      <CheckCircle2 className="h-5 w-5" />
                      Opgeslagen
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_170px_1fr] items-stretch gap-5">
                <CornerCard
                  corner="rood"
                  name={current.rood_naam}
                  gym={current.rood_gym}
                  va={current.rood_va}
                  weight={current.rood_gewicht}
                  minpunten={current.rood_minpunten}
                  selected={currentState?.winnaar_hoek === "rood"}
                  onSelect={() => chooseWinner("rood")}
                />

                <div className="flex items-center justify-center">
                  <Image
                    src="/branding/fightsupport/vs-shield.png"
                    alt="VS"
                    width={205}
                    height={205}
                    priority
                    className="object-contain"
                  />
                </div>

                <CornerCard
                  corner="blauw"
                  name={current.blauw_naam}
                  gym={current.blauw_gym}
                  va={current.blauw_va}
                  weight={current.blauw_gewicht}
                  minpunten={current.blauw_minpunten}
                  selected={currentState?.winnaar_hoek === "blauw"}
                  onSelect={() => chooseWinner("blauw")}
                />
              </div>

              <div className="mt-4 rounded-none border-[5px] border-[#d1d5dc] bg-[linear-gradient(180deg,#28313b_0%,#18212a_100%)] p-3 shadow-[inset_0_0_0_2px_#5d6670,0_8px_14px_rgba(0,0,0,0.40)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#ffffff22] pb-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[3px] text-[#ffb067]">Hoofdofficial invoer</div>
                    <div className="text-[12px] font-semibold text-zinc-300">Geen rondes of jurypunten. Alleen einduitslag en methode.</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ResultOptionButton
                      active={currentState?.winnaar_hoek === "onbeslist"}
                      label="Onbeslist"
                      onClick={() => chooseSpecial("onbeslist", "Onbeslist")}
                    />
                    <ResultOptionButton
                      active={currentState?.winnaar_hoek === "demo"}
                      label="Demo"
                      onClick={() => chooseSpecial("demo", "Demo")}
                    />
                    <ResultOptionButton
                      active={currentState?.winnaar_hoek === "no_contest"}
                      label="No contest"
                      onClick={() => chooseSpecial("no_contest", "No contest")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[1.15fr_1fr_auto_auto] gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[2px] text-zinc-300">Methode</label>
                    <select
                      value={currentState?.methode ?? ""}
                      onChange={(e) => setRowState(current.id, { methode: e.target.value })}
                      disabled={methods.length === 0 || ["onbeslist", "demo", "no_contest"].includes(currentState?.winnaar_hoek ?? "")}
                      className="h-[42px] w-full rounded-none border-2 border-[#c3c6cc] bg-black px-4 text-sm font-bold text-white outline-none focus:border-[#ffb067] disabled:opacity-60"
                    >
                      <option value="">Selecteer methode</option>
                      {methods.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[2px] text-zinc-300">Opmerking</label>
                    <input
                      value={currentState?.opmerkingen ?? ""}
                      onChange={(e) => setRowState(current.id, { opmerkingen: e.target.value })}
                      placeholder="Opmerking official..."
                      className="h-[42px] w-full rounded-none border-2 border-[#c3c6cc] bg-black px-4 text-sm font-bold text-white outline-none focus:border-[#ffb067]"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={goPrev}
                      disabled={currentIndex <= 0}
                      className="inline-flex h-[42px] items-center gap-2 rounded-none border-2 border-[#c3c6cc] bg-black/40 px-5 text-xs font-black uppercase tracking-[2px] text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Vorige
                    </button>
                  </div>

                  <div className="flex items-end gap-3">
                    <button
                      onClick={saveCurrent}
                      disabled={!canSave}
                      className="inline-flex h-[42px] items-center justify-center rounded-none border-2 border-[#ffb18b] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_55%,#b93600_100%)] px-7 text-xs font-black uppercase tracking-[2px] text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      {busyId === current.id ? "Opslaan..." : "Opslaan"}
                    </button>

                    <button
                      onClick={goNext}
                      disabled={currentIndex >= rows.length - 1}
                      className="inline-flex h-[42px] items-center gap-2 rounded-none border-2 border-[#c3c6cc] bg-black/40 px-5 text-xs font-black uppercase tracking-[2px] text-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      Volgende
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-5 rounded-none border-[6px] border-[#d1d5dc] bg-[linear-gradient(180deg,#28313b_0%,#18212a_100%)] p-4 shadow-[inset_0_0_0_2px_#5d6670,0_10px_18px_rgba(0,0,0,0.45)]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-black uppercase tracking-[3px] text-zinc-300">
                  Partij {currentIndex + 1} van {rows.length} · Origineel partijnummer {current.partij_nr}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-black uppercase tracking-[2px] text-[#ffb067]">
                    {savedCount}/{rows.length} opgeslagen · {progress}%
                  </div>

                  <button
                    type="button"
                    onClick={sendToAdmin}
                    disabled={!canSendToAdmin}
                    className="inline-flex h-[42px] items-center justify-center rounded-none border-2 border-[#ffb18b] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_55%,#b93600_100%)] px-6 text-xs font-black uppercase tracking-[2px] text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {sendBusy ? "Versturen..." : "Naar admin sturen"}
                  </button>
                </div>
              </div>

              {sendMsg ? (
                <div className="mb-3 rounded-none border-2 border-[#ffb067] bg-black/45 px-4 py-3 text-sm font-black text-[#ffb067]">
                  {sendMsg}
                </div>
              ) : null}

              <div className="h-4 overflow-hidden rounded-none border-2 border-[#c3c6cc] bg-black shadow-[inset_0_1px_4px_rgba(0,0,0,0.8)]">
                <div
                  className="h-full rounded-none bg-[linear-gradient(90deg,#ffffff_0%,#c8c8c8_42%,#ff4d00_100%)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-3 flex max-h-[84px] flex-wrap gap-2 overflow-y-auto pr-1">
                {rows.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setCurrentIndex(i)}
                    title={`Origineel partijnummer ${r.partij_nr}`}
                    className={[
                      "h-9 min-w-9 rounded-none border-2 px-3 text-sm font-black transition",
                      i === currentIndex
                        ? "border-[#ffb067] bg-[#ff4d00] text-white"
                        : states[r.id]?.opgeslagen
                          ? "border-emerald-400/80 bg-emerald-500/15 text-emerald-100"
                          : "border-[#9ca0a8] bg-black/35 text-zinc-300 hover:border-[#ffb067]",
                    ].join(" ")}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
