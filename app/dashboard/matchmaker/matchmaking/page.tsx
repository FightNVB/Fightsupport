"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const NVB_ORANGE = "#ff4d00";

const BONDTEAM_OPTIONS = [
  "IRO",
  "MMAAN",
  "MON",
  "NKF",
  "UMC",
  "VON",
  "WMTA",
  "WPKL",
] as const;

type ViewTab = "alle" | "gemaakt" | "upload";

const silverBackplate: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
};

interface ControleRun {
  id: string;
  matchmaking_id: string;
  status: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
}

interface MatchmakingRow {
  id: string;
  naam: string | null;
  datum: string | null;
  locatie: string | null;
  promotor: string | null;
  bondteam: string | null;
  matchmaker_id: string | null;
  matchmaker_naam: string | null;
  status: string | null;
  stadium: string | null;
  huidige_eigenaar_type: string | null;
  huidige_eigenaar_user_id: string | null;
  huidige_eigenaar_bondteam: string | null;
  maker_type: string | null;
  maker_user_id: string | null;
  uploaded_by: string | null;
  bron_type: string | null;
  created_at: string | null;
  last_updated_at: string | null;
  laatste_run: ControleRun | null;
}

interface Profile {
  id: string;
  full_name?: string | null;
  bondteam?: string | null;
}

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("nl-NL");
}

function formatDateTime(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleString("nl-NL");
}

function getMonthKey(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  if (!monthKey) return "-";
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "concept").trim().toLowerCase();
}

function formatStatusLabel(status: string | null | undefined) {
  const s = normalizeStatus(status);
  if (s === "concept") return "Concept";
  if (s === "concept_matchmaking") return "Concept matchmaking";
  if (s === "nieuw") return "Nieuw";
  if (s === "niet gecontroleerd") return "Niet gecontroleerd";
  if (s === "ingediend_admin") return "Ingediend admin";
  if (s === "in_controle_admin") return "In controle";
  if (s === "retour_naar_eigenaar") return "Retour";
  if (s === "klaar_voor_weegstation") return "Klaar voor weegstation";
  if (s === "in_weegstation") return "In weegstation";
  if (s === "weegstation_verwerkt") return "Weegstation verwerkt";
  if (s === "definitieve_matchmaking_ingediend")
    return "Definitieve MM ingediend";
  if (s === "klaar_voor_uitslagen") return "Klaar voor uitslagen";
  if (s === "uitslagen_in_bewerking") return "Uitslagen in bewerking";
  if (s === "uitslagen_definitief") return "Uitslagen definitief";
  if (s === "gearchiveerd") return "Gearchiveerd";
  return status ?? "Concept";
}

function effectiveStatus(row: MatchmakingRow) {
  return (
    row.laatste_run?.status ??
    row.stadium ??
    row.status ??
    "concept_matchmaking"
  );
}

function normalizeBondteam(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function Small({
  children,
  origin = "left center",
}: {
  children: ReactNode;
  origin?: string;
}) {
  return (
    <div style={{ transform: "scale(0.85)", transformOrigin: origin }}>
      {children}
    </div>
  );
}

function isOwnMatchmaking(row: MatchmakingRow, userId: string) {
  return (
    row.matchmaker_id === userId ||
    row.maker_user_id === userId ||
    row.uploaded_by === userId ||
    row.huidige_eigenaar_user_id === userId
  );
}

function getMatchmakingType(row: MatchmakingRow): "gemaakt" | "upload" {
  const bron = norm(row.bron_type).toLowerCase();

  if (
    bron === "matchmaker_upload" ||
    bron === "admin_upload" ||
    bron === "upload" ||
    bron.includes("upload")
  ) {
    return "upload";
  }

  if (row.uploaded_by && !row.maker_user_id) return "upload";

  return "gemaakt";
}

function formatTypeLabel(row: MatchmakingRow) {
  return getMatchmakingType(row) === "upload" ? "Upload MM" : "Gemaakt in app";
}

export default function MatchmakingOverzichtPage() {
  const router = useRouter();

  const [rows, setRows] = useState<MatchmakingRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [naam, setNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [locatie, setLocatie] = useState("");
  const [promotor, setPromotor] = useState("");
  const [bondteam, setBondteam] = useState("");

  const [uploadNaam, setUploadNaam] = useState("");
  const [uploadDatum, setUploadDatum] = useState("");
  const [uploadLocatie, setUploadLocatie] = useState("");
  const [uploadPromotor, setUploadPromotor] = useState("");
  const [uploadBondteam, setUploadBondteam] = useState("");

  const [viewTab, setViewTab] = useState<ViewTab>("alle");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  function resetCreateForm(profileData?: Profile | null) {
    setNaam("");
    setDatum("");
    setLocatie("");
    setPromotor("");
    setBondteam(normalizeBondteam(profileData?.bondteam ?? ""));
    setCreateMsg("");
  }

  function resetUploadForm(profileData?: Profile | null) {
    setUploadNaam("");
    setUploadDatum("");
    setUploadLocatie("");
    setUploadPromotor("");
    setUploadBondteam(normalizeBondteam(profileData?.bondteam ?? ""));
    setUploadFile(null);
    setUploadMsg("");
    setControlLoading(false);
  }

  async function load() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Fout bij ophalen gebruiker:", userError);
      setRows([]);
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, full_name, bondteam")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) console.error("Fout bij laden profiel:", profileError);

    const normalizedProfile: Profile = {
      id: user.id,
      full_name: profileData?.full_name ?? "",
      bondteam: normalizeBondteam(profileData?.bondteam ?? ""),
    };

    setProfile(normalizedProfile);

    const res = await authedFetch("/api/matchmaker/matchmakings-overzicht", {
      method: "GET",
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.ok) {
      console.error("Fout bij laden matchmakings:", res.status, payload);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((payload.rows ?? []) as MatchmakingRow[]);
    setLoading(false);
  }

  async function createMatchmaking() {
    try {
      setCreateMsg("");

      if (!naam.trim()) return setCreateMsg("⚠️ Naam is verplicht.");
      if (!datum.trim()) return setCreateMsg("⚠️ Datum is verplicht.");
      if (!bondteam.trim()) return setCreateMsg("⚠️ Bondteam is verplicht.");

      setCreating(true);

      const res = await authedFetch("/api/matchmaker/create-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          datum,
          locatie: locatie.trim() || null,
          promotor: promotor.trim() || null,
          bondteam: normalizeBondteam(bondteam),
          matchmaker_naam: profile?.full_name?.trim() || null,
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("create-matchmaking failed:", res.status, payload);
        setCreateMsg(
          payload?.error || "❌ Nieuwe matchmaking aanmaken mislukt.",
        );
        return;
      }

      setShowCreate(false);
      resetCreateForm(profile);
      await load();

      const matchmakingId = norm(payload?.matchmaking_id);
      router.push(
        matchmakingId
          ? `/dashboard/matchmaker/matchmaking`
          : "/dashboard/matchmaker/matchmaking",
      );
    } catch (e) {
      console.error(e);
      setCreateMsg("❌ Onverwachte fout bij aanmaken.");
    } finally {
      setCreating(false);
    }
  }

  async function uploadCompleteMatchmaking() {
    try {
      setUploadMsg("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user)
        return setUploadMsg("❌ Gebruiker niet gevonden.");
      if (!uploadNaam.trim()) return setUploadMsg("⚠️ Naam is verplicht.");
      if (!uploadDatum.trim()) return setUploadMsg("⚠️ Datum is verplicht.");
      if (!uploadBondteam.trim())
        return setUploadMsg("⚠️ Bondteam is verplicht.");
      if (!uploadFile) return setUploadMsg("⚠️ Kies eerst een Excel-bestand.");

      setUploading(true);
      setControlLoading(true);
      setUploadMsg("Bestand uploaden...");

      const filePath = `matchmakings/${user.id}/${Date.now()}_${uploadFile.name}`;

      const { error: storageError } = await supabase.storage
        .from("uploads")
        .upload(filePath, uploadFile, { upsert: true });

      if (storageError) {
        console.error(storageError);
        setUploadMsg(`❌ Upload naar storage mislukt: ${storageError.message}`);
        return;
      }

      setUploadMsg("Complete matchmaking verwerken...");

      const res = await authedFetch(
        "/api/matchmaker/submit_matchmaking/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_path: filePath,
            raw_filename: uploadFile.name,
            evenement_naam: norm(uploadNaam),
            evenement_datum: norm(uploadDatum),
            locatie: norm(uploadLocatie) || null,
            bondteam: normalizeBondteam(uploadBondteam),
            matchmaker: profile?.full_name?.trim() || null,
            promotor: norm(uploadPromotor) || null,
            hoofdofficial: null,
            force_new: true,
            bron_type: "matchmaker_upload",
          }),
        },
      );
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("submit_matchmaking/start failed:", res.status, payload);
        setUploadMsg(
          payload?.error || "❌ Upload complete matchmaking mislukt.",
        );
        return;
      }

      const matchmakingId = norm(payload?.matchmaking_id);
      if (!matchmakingId) {
        setUploadMsg("❌ Upload gelukt, maar matchmaking_id ontbreekt.");
        return;
      }

      setShowUpload(false);
      resetUploadForm(profile);
      await load();

      router.push(`/dashboard/matchmaker/matchmaking/${matchmakingId}`);
    } catch (e) {
      console.error(e);
      setUploadMsg("❌ Onverwachte fout bij upload.");
    } finally {
      setUploading(false);
      setControlLoading(false);
    }
  }

  async function deleteMM(matchmakingId: string) {
    const ok = window.confirm(
      "Weet je zeker dat je deze matchmaking wilt verwijderen?\n\nDit kan niet ongedaan gemaakt worden.",
    );
    if (!ok) return;

    try {
      setBusyId(matchmakingId);

      const res = await authedFetch("/api/matchmaker/delete-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Delete failed:", res.status, t);
        alert("Verwijderen mislukt.");
        return;
      }

      await load();
    } finally {
      setBusyId(null);
    }
  }

  const ownRows = useMemo(() => {
    if (!profile?.id) return [];
    return rows.filter((r) => isOwnMatchmaking(r, profile.id));
  }, [rows, profile?.id]);

  const tabCounts = useMemo(() => {
    const upload = ownRows.filter(
      (r) => getMatchmakingType(r) === "upload",
    ).length;
    const gemaakt = ownRows.filter(
      (r) => getMatchmakingType(r) === "gemaakt",
    ).length;

    return {
      alle: ownRows.length,
      gemaakt,
      upload,
    };
  }, [ownRows]);

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set(ownRows.map((r) => getMonthKey(r.datum)).filter(Boolean)),
    ).sort((a, b) => b.localeCompare(a));
  }, [ownRows]);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(ownRows.map((r) => normalizeStatus(effectiveStatus(r)))),
    ).sort((a, b) => a.localeCompare(b, "nl"));
  }, [ownRows]);

  const filteredRows = useMemo(() => {
    const nameNeedle = filterName.trim().toLowerCase();

    return ownRows.filter((r) => {
      const rowType = getMatchmakingType(r);
      const rowMonth = getMonthKey(r.datum);
      const rowStatus = normalizeStatus(effectiveStatus(r));
      const rowNaam = (r.naam ?? "").trim().toLowerCase();
      const rowLocatie = (r.locatie ?? "").trim().toLowerCase();
      const rowPromotor = (r.promotor ?? "").trim().toLowerCase();

      if (viewTab !== "alle" && rowType !== viewTab) return false;
      if (filterMonth && rowMonth !== filterMonth) return false;
      if (filterStatus && rowStatus !== filterStatus) return false;

      if (
        nameNeedle &&
        !rowNaam.includes(nameNeedle) &&
        !rowLocatie.includes(nameNeedle) &&
        !rowPromotor.includes(nameNeedle)
      ) {
        return false;
      }

      return true;
    });
  }, [ownRows, viewTab, filterMonth, filterName, filterStatus]);

  const hasActiveFilters = !!filterMonth || !!filterName || !!filterStatus;

  function resetFilters() {
    setFilterMonth("");
    setFilterName("");
    setFilterStatus("");
  }

  return (
    <>
      {controlLoading && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div
            className="w-full max-w-[460px] rounded-[30px] border p-7 shadow-2xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,20,22,0.98) 0%, rgba(8,8,8,0.98) 100%)",
              borderColor: "rgba(255,77,0,0.95)",
              boxShadow:
                "0 0 70px rgba(255,77,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex justify-center">
              <img
                src="/branding/fightsupport/logo-dark.png"
                alt="FightSupport"
                className="h-[86px] object-contain"
              />
            </div>

            <div className="mt-6 text-center">
              <h2
                className="text-[28px] font-black uppercase tracking-[0.08em]"
                style={{
                  color: "#ffffff",
                  textShadow: "0 0 18px rgba(255,77,0,0.45)",
                }}
              >
                Matchmaking verwerken
              </h2>

              <p className="mt-4 text-sm leading-6 text-zinc-300">
                FightSupport bouwt de matchmaking op en voert alle controles
                uit.
              </p>
            </div>

            <div className="mt-9 flex justify-center">
              <div
                className="h-[72px] w-[72px] animate-spin rounded-full border-[6px]"
                style={{
                  borderColor: "rgba(255,255,255,0.10)",
                  borderTopColor: NVB_ORANGE,
                }}
              />
            </div>

            <div className="mt-9 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-[7px] animate-pulse rounded-full"
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(90deg, #ff4d00 0%, #ff8a3d 100%)",
                }}
              />
            </div>

            <div className="mt-5 text-center text-xs uppercase tracking-[0.18em] text-zinc-500">
              Even geduld...
            </div>
          </div>
        </div>
      )}

      <main
        className="min-h-screen px-4 py-6"
        style={{ background: "#eef0f3" }}
      >
        <div className="mx-auto w-full max-w-[1500px]">
          <div
            className="rounded-[32px] p-[6px]"
            style={{
              background:
                "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.7), 0 22px 70px rgba(0,0,0,0.9)",
            }}
          >
            <div
              className="relative overflow-hidden rounded-[28px]"
              style={{
                background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
                border: "3px solid rgba(63,63,70,0.35)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              <div
                className="px-6 py-5"
                style={{
                  background:
                    "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                  borderBottom: `3px solid rgba(255,77,0,0.55)`,
                }}
              >
                <div className="flex flex-col gap-5">
                  <div className="grid w-full grid-cols-1 items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
                    <div className="text-left md:pl-2">
                      <div
                        className="font-extrabold uppercase"
                        style={{
                          fontSize: 20,
                          letterSpacing: "0.04em",
                          color: NVB_ORANGE,
                          textShadow: "0 6px 18px rgba(0,0,0,0.45)",
                        }}
                      >
                        Mijn matchmakings
                      </div>
                      <div className="mt-1 text-xs text-white/85">
                        Maak een matchmaking of upload een complete matchmaking.
                      </div>
                      <div className="mt-1 text-[11px] text-white/70">
                        Ingelogd als: {profile?.full_name || "-"}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <img
                        src="/branding/fightsupport/excel-logo.png"
                        alt="FightSupport"
                        style={{
                          width: "min(100%, 380px)",
                          height: "auto",
                          display: "block",
                        }}
                      />
                    </div>

                    <div className="hidden md:block" />
                  </div>

                  <div className="flex w-full flex-wrap items-center justify-center gap-4">
                    <Small origin="center center">
                      <NvbLightButton
                        label="← Terug naar menu"
                        onClick={() => router.push("/dashboard/matchmaker")}
                      />
                    </Small>

                    <Small origin="center center">
                      <NvbDarkButton
                        label={
                          showCreate
                            ? "Nieuwe matchmaking sluiten"
                            : "Nieuwe matchmaking maken"
                        }
                        onClick={() => {
                          if (!showCreate) resetCreateForm(profile);
                          setShowCreate((prev) => !prev);
                          if (showUpload) setShowUpload(false);
                        }}
                      />
                    </Small>

                    <Small origin="center center">
                      <NvbDarkButton
                        label={
                          showUpload
                            ? "Complete upload sluiten"
                            : "Complete matchmaking uploaden"
                        }
                        onClick={() => {
                          if (!showUpload) resetUploadForm(profile);
                          setShowUpload((prev) => !prev);
                          if (showCreate) setShowCreate(false);
                        }}
                      />
                    </Small>
                  </div>
                </div>
              </div>

              <div className="px-4 py-6 md:px-6">
                <div
                  className="rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5"
                  style={silverBackplate}
                >
                  <div className="px-2 py-2 md:px-3">
                    {showCreate && (
                      <div className="mb-5 rounded-[24px] border p-4 md:p-5">
                        <div className="mb-3">
                          <div className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-700">
                            Nieuwe matchmaking maken
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            Maak een lege matchmaking aan. Daarna kun je
                            aanmeldingen toevoegen of beheren.
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-5">
                          <input
                            type="date"
                            value={datum}
                            onChange={(e) => setDatum(e.target.value)}
                            className="orange-input h-10 w-full"
                          />
                          <input
                            value={naam}
                            onChange={(e) => setNaam(e.target.value)}
                            placeholder="Evenement naam *"
                            className="orange-input h-10 w-full"
                          />
                          <input
                            value={locatie}
                            onChange={(e) => setLocatie(e.target.value)}
                            placeholder="Locatie"
                            className="orange-input h-10 w-full"
                          />
                          <input
                            value={promotor}
                            onChange={(e) => setPromotor(e.target.value)}
                            placeholder="Promotor"
                            className="orange-input h-10 w-full"
                          />
                          <select
                            value={bondteam}
                            onChange={(e) => setBondteam(e.target.value)}
                            className="orange-input h-10 w-full"
                          >
                            <option value="">Kies bondteam *</option>
                            {BONDTEAM_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            onClick={createMatchmaking}
                            disabled={creating}
                            className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-4 py-2 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                          >
                            {creating ? "Bezig…" : "Matchmaking maken"}
                          </button>

                          <button
                            onClick={() => setShowCreate(false)}
                            disabled={creating}
                            className="rounded border border-zinc-300 bg-[#2f2f33] px-4 py-2 text-sm text-white hover:bg-white hover:text-black disabled:opacity-60"
                          >
                            Annuleren
                          </button>

                          {createMsg ? (
                            <span className="text-xs text-[var(--brand-orange)]">
                              {createMsg}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {showUpload && (
                      <div className="mb-5 rounded-[24px] border p-4 md:p-5">
                        <div className="mb-3">
                          <div className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-700">
                            Complete matchmaking uploaden
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            Deze upload gebruikt{" "}
                            <b>/api/submit_matchmaking/start</b>.
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-5">
                          <input
                            type="date"
                            value={uploadDatum}
                            onChange={(e) => setUploadDatum(e.target.value)}
                            className="orange-input h-10 w-full"
                          />
                          <input
                            value={uploadNaam}
                            onChange={(e) => setUploadNaam(e.target.value)}
                            placeholder="Evenement naam *"
                            className="orange-input h-10 w-full"
                          />
                          <input
                            value={uploadLocatie}
                            onChange={(e) => setUploadLocatie(e.target.value)}
                            placeholder="Locatie"
                            className="orange-input h-10 w-full"
                          />
                          <input
                            value={uploadPromotor}
                            onChange={(e) => setUploadPromotor(e.target.value)}
                            placeholder="Promotor"
                            className="orange-input h-10 w-full"
                          />
                          <select
                            value={uploadBondteam}
                            onChange={(e) => setUploadBondteam(e.target.value)}
                            className="orange-input h-10 w-full"
                          >
                            <option value="">Kies bondteam *</option>
                            {BONDTEAM_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) =>
                              setUploadFile(e.target.files?.[0] ?? null)
                            }
                            className="orange-input h-10 w-full pt-2"
                          />
                          <a
                            href="/templates/fightsupport_upload.xlsx"
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-10 items-center rounded border border-zinc-300 bg-[#2f2f33] px-4 text-sm text-white hover:bg-white hover:text-black"
                          >
                            Download template
                          </a>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            onClick={uploadCompleteMatchmaking}
                            disabled={uploading}
                            className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-4 py-2 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                          >
                            {uploading
                              ? "Bezig…"
                              : "Complete matchmaking uploaden"}
                          </button>

                          <button
                            onClick={() => setShowUpload(false)}
                            disabled={uploading}
                            className="rounded border border-zinc-300 bg-[#2f2f33] px-4 py-2 text-sm text-white hover:bg-white hover:text-black disabled:opacity-60"
                          >
                            Annuleren
                          </button>

                          {uploadFile ? (
                            <span className="text-xs text-zinc-600">
                              Bestand: {uploadFile.name}
                            </span>
                          ) : null}
                          {uploadMsg ? (
                            <span className="text-xs text-[var(--brand-orange)]">
                              {uploadMsg}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {!loading && (
                      <div className="mb-5 rounded-[24px] border p-4 md:p-4">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          {[
                            ["alle", `Alle (${tabCounts.alle})`],
                            [
                              "gemaakt",
                              `Gemaakt in app (${tabCounts.gemaakt})`,
                            ],
                            [
                              "upload",
                              `Upload matchmaking (${tabCounts.upload})`,
                            ],
                          ].map(([key, label]) => {
                            const active = viewTab === key;

                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setViewTab(key as ViewTab)}
                                className="rounded-xl border px-4 py-2 text-sm font-semibold transition"
                                style={{
                                  borderColor: active
                                    ? "rgba(255,77,0,0.9)"
                                    : "rgba(63,63,70,0.25)",
                                  background: active ? NVB_ORANGE : "#2f2f33",
                                  color: active ? "#111" : "#fff",
                                  boxShadow: active
                                    ? "0 8px 20px rgba(255,77,0,0.22)"
                                    : "none",
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setFiltersOpen((prev) => !prev)}
                          className="mb-3 flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl px-2 py-1 text-left hover:bg-white/45"
                        >
                          <div>
                            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-zinc-700">
                              Filters <span>{filtersOpen ? "▴" : "▾"}</span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {hasActiveFilters
                                ? "Filters actief"
                                : "Klik om filters te openen"}
                            </div>
                          </div>
                          <div className="text-sm text-zinc-600">
                            {filteredRows.length} van {ownRows.length} zichtbaar
                          </div>
                        </button>

                        {filtersOpen && (
                          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[180px_minmax(180px,1fr)_180px_180px]">
                            <select
                              value={filterMonth}
                              onChange={(e) => setFilterMonth(e.target.value)}
                              className="h-10 w-full rounded-xl border px-3 text-sm"
                            >
                              <option value="">Alle maanden</option>
                              {monthOptions.map((monthKey) => (
                                <option key={monthKey} value={monthKey}>
                                  {formatMonthLabel(monthKey)}
                                </option>
                              ))}
                            </select>

                            <input
                              value={filterName}
                              onChange={(e) => setFilterName(e.target.value)}
                              placeholder="Zoek naam, locatie of promotor"
                              className="h-10 w-full rounded-xl border px-3 text-sm"
                            />

                            <select
                              value={filterStatus}
                              onChange={(e) => setFilterStatus(e.target.value)}
                              className="h-10 w-full rounded-xl border px-3 text-sm"
                            >
                              <option value="">Alle statussen</option>
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {formatStatusLabel(status)}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={resetFilters}
                              disabled={!hasActiveFilters}
                              className="h-10 w-full rounded-xl border bg-[#2f2f33] px-3 text-sm text-white hover:bg-white hover:text-black disabled:opacity-50"
                            >
                              Filters wissen
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {loading ? (
                      <p className="mt-6 text-center text-gray-500">Laden…</p>
                    ) : (
                      <div className="mt-5 overflow-hidden rounded-2xl border-2">
                        <div
                          className="h-[3px]"
                          style={{ background: "rgba(255,77,0,0.75)" }}
                        />

                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse">
                            <thead
                              style={{
                                background:
                                  "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
                                color: "#fff",
                              }}
                            >
                              <tr>
                                <th className="px-4 py-3 text-left">Datum</th>
                                <th className="px-4 py-3 text-left">Naam</th>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-left">Locatie</th>
                                <th className="px-4 py-3 text-left">
                                  Promotor
                                </th>
                                <th className="px-4 py-3 text-left">
                                  Bondteam
                                </th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">
                                  Laatste run
                                </th>
                                <th className="px-4 py-3 text-left">
                                  Aangemaakt
                                </th>
                                <th className="px-4 py-3 text-left">Acties</th>
                              </tr>
                            </thead>

                            <tbody>
                              {filteredRows.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={10}
                                    className="bg-white px-4 py-8 text-center text-sm text-zinc-600"
                                  >
                                    Geen eigen matchmakings gevonden.
                                  </td>
                                </tr>
                              ) : (
                                filteredRows.map((r, i) => {
                                  const zebra = i % 2 === 0;
                                  const rowBusy = busyId === r.id;
                                  const rowType = getMatchmakingType(r);

                                  return (
                                    <tr
                                      key={r.id}
                                      style={{
                                        backgroundColor: zebra
                                          ? "#ffffff"
                                          : "#0d0d0d",
                                        color: zebra ? "#000" : "#fff",
                                      }}
                                    >
                                      <td className="px-4 py-3">
                                        {formatDate(r.datum)}
                                      </td>
                                      <td className="px-4 py-3 font-semibold">
                                        {r.naam ?? "-"}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span
                                          className="inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]"
                                          style={{
                                            borderColor:
                                              rowType === "upload"
                                                ? "rgba(255,77,0,0.75)"
                                                : "rgba(113,113,122,0.45)",
                                            background:
                                              rowType === "upload"
                                                ? "rgba(255,77,0,0.16)"
                                                : "rgba(113,113,122,0.14)",
                                            color: zebra ? "#111" : "#fff",
                                          }}
                                        >
                                          {formatTypeLabel(r)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        {r.locatie ?? "-"}
                                      </td>
                                      <td className="px-4 py-3">
                                        {r.promotor ?? "-"}
                                      </td>
                                      <td className="px-4 py-3">
                                        {r.bondteam ?? "-"}
                                      </td>
                                      <td className="px-4 py-3 italic">
                                        {formatStatusLabel(
                                          r.stadium ?? r.status,
                                        )}
                                      </td>
                                      <td className="px-4 py-3 italic">
                                        {formatStatusLabel(effectiveStatus(r))}
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        {formatDateTime(r.created_at)}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              router.push(
                                                `/dashboard/matchmaker/matchmaking/${r.id}`,
                                              )
                                            }
                                            className="rounded border border-zinc-300 bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-white hover:text-black"
                                          >
                                            Matchmaking
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              router.push(
                                                `/dashboard/matchmaker/matchmaking/${r.id}/aanmeldingen`,
                                              )
                                            }
                                            className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black"
                                          >
                                            Aanmeldingen
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              router.push(
                                                `/dashboard/matchmaker/matchmaking/${r.id}/match`,
                                              )
                                            }
                                            className="rounded border border-zinc-300 bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-white hover:text-black"
                                          >
                                            Gecontroleerde vechters
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => deleteMM(r.id)}
                                            disabled={rowBusy}
                                            className="rounded border border-red-600 bg-[#2f2f33] px-3 py-1 text-sm text-red-200 hover:bg-red-600 hover:text-white disabled:opacity-60"
                                          >
                                            {rowBusy ? "Bezig…" : "Verwijderen"}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <p className="mt-7 text-center text-xs text-zinc-500">
                      © FightSupport
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style jsx global>{`
            :root {
              --brand-orange: ${NVB_ORANGE};
            }

            .orange-input {
              background: rgba(255, 255, 255, 0.9);
              border: 1px solid rgba(255, 77, 0, 0.35);
              border-radius: 10px;
              padding: 0 10px;
              outline: none;
              color: #111;
            }

            .orange-input:focus {
              border-color: rgba(255, 77, 0, 0.75);
              box-shadow: 0 0 0 3px rgba(255, 77, 0, 0.18);
            }
          `}</style>
        </div>
      </main>
    </>
  );
}
