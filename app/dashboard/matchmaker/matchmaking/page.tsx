"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type ViewTab = "zelf" | "uploads" | "retour";

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
  submitted_to_admin_at?: string | null;
  entered_control_at?: string | null;
  sent_to_officials_at?: string | null;
  final_status?: string | null;

  upload_id?: string | null;
  upload_raw_filename?: string | null;
  controle_status?: string | null;
  upload_flow_status?: string | null;
  nvb_controle_ingestuurd?: boolean | null;
  nvb_controle_ingestuurd_op?: string | null;
  upload_uploaded_at?: string | null;

  laatste_run: ControleRun | null;
}

interface Profile {
  id: string;
  full_name?: string | null;
  bondteam?: string | null;
}

type MatchmakingDbRow = Omit<MatchmakingRow, "laatste_run">;

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
  if (s === "retour_naar_matchmaker") return "Retour naar matchmaker";
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

function formatControleStatusLabel(row: MatchmakingRow) {
  if (row.nvb_controle_ingestuurd) return "🟠 Ingestuurd naar NVB/admin";

  const controleStatus = normalizeStatus(row.controle_status);
  const flowStatus = normalizeStatus(row.upload_flow_status);
  const runStatus = normalizeStatus(row.laatste_run?.status);

  const s = controleStatus !== "concept" ? controleStatus : flowStatus !== "concept" ? flowStatus : runStatus;

  if (!s || s === "concept" || s === "nog_niet" || s === "niet_gestart") {
    return "⚪ Nog niet gecontroleerd";
  }

  if (s === "running" || s === "bezig" || s === "in_progress") {
    return "🔵 Controle draait";
  }

  if (s === "klaar" || s === "done" || s === "completed" || s === "ok") {
    return "🟢 Controle gereed";
  }

  if (s === "unlock_required" || s === "fp_unlock_required") {
    return "🟠 Wacht op admin (unlock vereist)";
  }

  if (s === "admin_required" || s === "wacht_op_admin_unlock") {
    return "🟠 Wacht op admin";
  }

  if (s === "failed" || s === "mislukt" || s === "error") {
    return "🔴 Controle mislukt";
  }

  return row.controle_status ?? row.upload_flow_status ?? row.laatste_run?.status ?? "Nog niet gecontroleerd";
}

function getControleStatusTitle(row: MatchmakingRow) {
  if (row.nvb_controle_ingestuurd) {
    return "Deze matchmaking is naar NVB/admin gestuurd.";
  }

  const s = normalizeStatus(row.controle_status);
  if (s === "unlock_required" || s === "fp_unlock_required") {
    return "FightPassport vroeg om een unlock-code. De matchmaking moet door admin gecontroleerd worden.";
  }

  if (s === "nog_niet" || !row.controle_status) {
    return "Deze upload is opgeslagen, maar de autocheck is nog niet gestart.";
  }

  return row.controle_status ?? "Controle status";
}

function effectiveStatus(row: MatchmakingRow) {
  const status = normalizeStatus(row.status);
  const stadium = normalizeStatus(row.stadium);
  const runStatus = normalizeStatus(row.laatste_run?.status);

  if (status.includes("retour")) return row.status ?? "retour_naar_matchmaker";
  if (stadium.includes("retour"))
    return row.stadium ?? "retour_naar_matchmaker";
  if (runStatus.includes("retour"))
    return row.laatste_run?.status ?? "retour_naar_matchmaker";

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


function ActionSquare({
  title,
  children,
  onClick,
  disabled,
  color,
  borderColor,
}: {
  title: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color: string;
  borderColor?: string;
}) {
  const style: CSSProperties = {
    width: 34,
    height: 34,
    minWidth: 34,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: color,
    color: "#fff",
    border: `1px solid ${borderColor ?? "rgba(255,255,255,0.22)"}`,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 14px rgba(0,0,0,0.22)",
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}

function ActionFileSquare({
  title,
  children,
  disabled = false,
  color,
  onFile,
}: {
  title: string;
  children: ReactNode;
  disabled?: boolean;
  color: string;
  onFile: (file: File | null) => void;
}) {
  const style: CSSProperties = {
    width: 34,
    height: 34,
    minWidth: 34,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: color,
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.22)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 14px rgba(0,0,0,0.22)",
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };

  return (
    <label title={title} aria-label={title} style={style}>
      {children}
      <input
        type="file"
        accept=".xlsx,.xls"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onFile(file);
          e.currentTarget.value = "";
        }}
        className="hidden"
      />
    </label>
  );
}

const ACTION_COLORS = {
  matchmaking: "linear-gradient(180deg, #238a3b 0%, #146126 100%)",
  controle: "linear-gradient(180deg, #2f75d6 0%, #174a91 100%)",
  admin: "linear-gradient(180deg, #8b4ab8 0%, #5b2a7d 100%)",
  herupload: "linear-gradient(180deg, #ff8a1f 0%, #d94700 100%)",
  verwijderen: "linear-gradient(180deg, #c53636 0%, #7a1717 100%)",
  aanmeldingen: "linear-gradient(180deg, #8b4ab8 0%, #5b2a7d 100%)",
  matchen: "linear-gradient(180deg, #2f75d6 0%, #174a91 100%)",
};

function ActionLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-700/30 bg-[#242428] px-3 py-2 text-xs font-semibold text-white shadow-inner">
      <span className="mr-1 text-zinc-300">Legenda acties:</span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded-sm bg-[#238a3b]" /> Matchmaking / upload
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded-sm bg-[#2f75d6]" /> Start controle / matchen
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded-sm bg-[#8b4ab8]" /> Aanmeldingen / naar admin
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded-sm bg-[#ff8a1f]" /> Herupload
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded-sm bg-[#c53636]" /> Verwijderen
      </span>
    </div>
  );
}

function isOwnMatchmaking(row: MatchmakingRow, userId: string) {
  const id = norm(userId);

  return (
    norm(row.huidige_eigenaar_user_id) === id ||
    norm(row.matchmaker_id) === id ||
    norm(row.maker_user_id) === id ||
    norm(row.uploaded_by) === id
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
  if (isRetourVanNvb(row)) return "Retour NVB";
  if (isAangebodenAanNvb(row)) return "Aangeboden aan NVB";
  return getMatchmakingType(row) === "upload"
    ? "Upload controle"
    : "Gemaakt in app";
}

function isRetourVanNvb(row: MatchmakingRow) {
  const status = normalizeStatus(row.status);
  const stadium = normalizeStatus(row.stadium);
  const runStatus = normalizeStatus(row.laatste_run?.status);
  const ownerType = norm(row.huidige_eigenaar_type).toLowerCase();

  return (
    status === "retour_naar_matchmaker" ||
    status === "retour_naar_eigenaar" ||
    status.includes("retour") ||
    stadium === "retour_naar_matchmaker" ||
    stadium === "retour_naar_eigenaar" ||
    stadium.includes("retour") ||
    runStatus.includes("retour") ||
    (ownerType === "matchmaker" && status.includes("retour"))
  );
}

function isAangebodenAanNvb(row: MatchmakingRow) {
  if (isRetourVanNvb(row)) return false;

  const status = normalizeStatus(row.status);
  const stadium = normalizeStatus(row.stadium);
  const finalStatus = normalizeStatus(row.final_status);
  const runStatus = normalizeStatus(row.laatste_run?.status);
  const ownerType = norm(row.huidige_eigenaar_type).toLowerCase();

  return (
    status === "ingediend_admin" ||
    status === "in_controle_admin" ||
    status === "definitieve_matchmaking_ingediend" ||
    stadium === "ingediend_admin" ||
    stadium === "in_controle_admin" ||
    stadium === "definitieve_matchmaking_ingediend" ||
    finalStatus === "ingediend_admin" ||
    finalStatus === "in_controle_admin" ||
    finalStatus === "definitieve_matchmaking_ingediend" ||
    runStatus === "ingediend_admin" ||
    runStatus === "in_controle_admin" ||
    runStatus === "definitieve_matchmaking_ingediend" ||
    ownerType === "admin" ||
    ownerType === "nvb" ||
    ownerType === "bondteam"
  );
}

function isVisibleForMatchmakerOverview(row: MatchmakingRow, userId: string) {
  if (!isOwnMatchmaking(row, userId)) return false;

  // Als een matchmaking naar admin/NVB is gestuurd, verdwijnt hij uit dit overzicht
  // tot admin hem retour zet. Zo kan de matchmaker hem niet meer aanpassen.
  if (isAangebodenAanNvb(row) && !isRetourVanNvb(row)) return false;

  return true;
}

function getTabType(row: MatchmakingRow): ViewTab {
  if (isRetourVanNvb(row)) return "retour";
  if (getMatchmakingType(row) === "upload") return "uploads";
  return "zelf";
}

function getLogDate(row: MatchmakingRow) {
  if (isAangebodenAanNvb(row)) {
    return (
      row.submitted_to_admin_at ??
      row.entered_control_at ??
      row.sent_to_officials_at ??
      row.last_updated_at ??
      row.laatste_run?.gestart_op ??
      row.laatste_run?.afgerond_op ??
      row.created_at ??
      null
    );
  }

  return row.created_at ?? row.last_updated_at ?? null;
}

function toMatchmakingRow(row: MatchmakingDbRow): MatchmakingRow {
  return {
    ...row,
    laatste_run: null,
  };
}

function mergeRows(apiRows: MatchmakingRow[], ownDbRows: MatchmakingDbRow[]) {
  const map = new Map<string, MatchmakingRow>();

  for (const row of apiRows) {
    if (row?.id) map.set(row.id, row);
  }

  for (const row of ownDbRows) {
    if (!row?.id) continue;
    if (!map.has(row.id)) map.set(row.id, toMatchmakingRow(row));
  }

  return Array.from(map.values()).sort((a, b) => {
    const ad = new Date(a.datum ?? a.created_at ?? 0).getTime();
    const bd = new Date(b.datum ?? b.created_at ?? 0).getTime();
    return bd - ad;
  });
}

export default function MatchmakingOverzichtPage() {
  return (
    <Suspense fallback={<div>Matchmakings laden...</div>}>
      <MatchmakingPageContent />
    </Suspense>
  );
}

function MatchmakingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<MatchmakingRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reuploadingId, setReuploadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const [viewTab, setViewTab] = useState<ViewTab>("zelf");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const sentToNvb =
      searchParams.get("sentToNvb") === "1" ||
      searchParams.get("naarNvb") === "1" ||
      searchParams.get("submitted") === "1";

    if (!sentToNvb) return;

    setSuccessMsg(
      "✅ Matchmaking is succesvol verwerkt. Je ziet de status bij Controle status.",
    );
    setViewTab("zelf");

    const timer = window.setTimeout(() => setSuccessMsg(""), 9000);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

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
      id: profileData?.id ?? user.id,
      full_name: profileData?.full_name ?? "",
      bondteam: normalizeBondteam(profileData?.bondteam ?? ""),
    };

    setProfile(normalizedProfile);

    const profileUserId = normalizedProfile.id;

    const directOwnQuery = supabase
      .from("matchmakings")
      .select(
        [
          "id",
          "naam",
          "datum",
          "locatie",
          "promotor",
          "bondteam",
          "matchmaker_id",
          "matchmaker_naam",
          "status",
          "stadium",
          "huidige_eigenaar_type",
          "huidige_eigenaar_user_id",
          "huidige_eigenaar_bondteam",
          "maker_type",
          "maker_user_id",
          "uploaded_by",
          "bron_type",
          "created_at",
          "last_updated_at",
          "submitted_to_admin_at",
          "entered_control_at",
          "sent_to_officials_at",
          "final_status",
        ].join(","),
      )
      .eq("is_archived", false)
      .or(
        [
          `huidige_eigenaar_user_id.eq.${profileUserId}`,
          `matchmaker_id.eq.${profileUserId}`,
          `maker_user_id.eq.${profileUserId}`,
          `uploaded_by.eq.${profileUserId}`,
        ].join(","),
      )
      .order("datum", { ascending: false });

    const [apiResult, directResult] = await Promise.allSettled([
      authedFetch("/api/matchmaker/matchmakings-overzicht", { method: "GET" }),
      directOwnQuery,
    ]);

    let apiRows: MatchmakingRow[] = [];

    if (apiResult.status === "fulfilled") {
      const payload = await apiResult.value.json().catch(() => null);

      if (!apiResult.value.ok || !payload?.ok) {
        console.error(
          "Fout bij laden matchmakings via API:",
          apiResult.value.status,
          payload,
        );
      } else {
        apiRows = (payload.rows ?? []) as MatchmakingRow[];
      }
    } else {
      console.error("Fout bij laden matchmakings via API:", apiResult.reason);
    }

    let ownDbRows: MatchmakingDbRow[] = [];

    if (directResult.status === "fulfilled") {
      if (directResult.value.error) {
        console.error(
          "Fout bij directe eigen matchmakings fallback:",
          directResult.value.error,
        );
      } else {
        ownDbRows = (directResult.value.data ?? []) as unknown as MatchmakingDbRow[];
      }
    } else {
      console.error(
        "Fout bij directe eigen matchmakings fallback:",
        directResult.reason,
      );
    }

    setRows(mergeRows(apiRows, ownDbRows));
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

      setUploadMsg("Complete matchmaking uploaden...");

      const res = await authedFetch("/api/matchmaker/submit-matchmaking", {
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
          start_control: false,
        }),
      });
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
      setSuccessMsg(
        "✅ Upload is gelukt. Controleer de upload en gebruik daarna Start controle of Stuur naar admin.",
      );
      setViewTab("uploads");
      await load();
    } catch (e) {
      console.error(e);
      setUploadMsg("❌ Onverwachte fout bij upload.");
    } finally {
      setUploading(false);
    }
  }

  async function startControle(row: MatchmakingRow) {
    const ok = window.confirm(
      "Start controle voor deze upload?\n\nAls FightPassport om een unlock-code vraagt, wordt de matchmaking automatisch naar admin gestuurd.",
    );
    if (!ok) return;

    try {
      setBusyId(row.id);
      setSuccessMsg("");

      const res = await authedFetch("/api/control-engine/matchmaker/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: row.id,
          do_scrape: true,
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || payload?.ok === false) {
        if (payload?.code === "FP_UNLOCK_REQUIRED" || payload?.unlock_required) {
          setSuccessMsg(
            "⚠️ FightPassport vraagt om een unlock-code. De matchmaking is automatisch doorgestuurd naar admin.",
          );
          await load();
          return;
        }

        console.error("start controle failed:", res.status, payload);
        alert(payload?.error || "Start controle mislukt.");
        return;
      }

      setSuccessMsg("✅ Controle is gestart/uitgevoerd. Bekijk de resultaten in de matchmaking.");
      setViewTab("uploads");
      await load();
    } catch (e) {
      console.error(e);
      alert("Onverwachte fout bij start controle.");
    } finally {
      setBusyId(null);
    }
  }

  async function stuurNaarAdmin(row: MatchmakingRow) {
    const ok = window.confirm(
      "Weet je zeker dat je deze matchmaking naar admin wilt sturen?\n\nDaarna verdwijnt hij uit je upload-overzicht tot admin hem retour zet.",
    );
    if (!ok) return;

    try {
      setBusyId(row.id);
      setSuccessMsg("");

      const res = await authedFetch("/api/matchmaker/send-to-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: row.id }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || payload?.ok === false) {
        console.error("send-to-admin failed:", res.status, payload);
        alert(payload?.error || "Stuur naar admin mislukt.");
        return;
      }

      setSuccessMsg("✅ Matchmaking is doorgestuurd naar admin.");
      setViewTab("uploads");
      await load();
    } catch (e) {
      console.error(e);
      alert("Onverwachte fout bij sturen naar admin.");
    } finally {
      setBusyId(null);
    }
  }

  async function reuploadMM(row: MatchmakingRow, file: File | null) {
    if (!file) return;

    try {
      setReuploadingId(row.id);
      setSuccessMsg("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Gebruiker niet gevonden.");
        return;
      }

      const filePath = `matchmakings/${user.id}/herupload/${row.id}/${Date.now()}_${file.name}`;

      const { error: storageError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, { upsert: true });

      if (storageError) {
        console.error(storageError);
        alert(`Herupload naar storage mislukt: ${storageError.message}`);
        return;
      }

      const res = await authedFetch("/api/matchmaker/submit-matchmaking/herupload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: row.id,
          file_path: filePath,
          raw_filename: file.name,
          evenement_naam: row.naam,
          evenement_datum: row.datum,
          locatie: row.locatie,
          bondteam: row.bondteam,
          promotor: row.promotor,
          matchmaker: profile?.full_name?.trim() || null,
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || payload?.ok === false) {
        console.error("herupload failed:", res.status, payload);
        alert(payload?.error || "Herupload matchmaking mislukt.");
        return;
      }

      setSuccessMsg("✅ Herupload is gelukt. De upload is bijgewerkt.");
      setViewTab("uploads");
      await load();
    } catch (e) {
      console.error(e);
      alert("Onverwachte fout bij herupload.");
    } finally {
      setReuploadingId(null);
    }
  }

  async function deleteMM(matchmakingId: string) {
    const ok = window.confirm(
      "Weet je zeker dat je deze matchmaking wilt verwijderen?\n\nAlle uploads, partijen, controles en resultaten worden verwijderd. Dit kan niet ongedaan gemaakt worden.",
    );
    if (!ok) return;

    try {
      setBusyId(matchmakingId);
      setSuccessMsg("");

      const res = await authedFetch("/api/control-engine/delete-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok || payload?.ok === false) {
        console.error("Delete failed:", res.status, payload);
        alert(payload?.error || "Verwijderen mislukt.");
        return;
      }

      setSuccessMsg("✅ Matchmaking verwijderd.");
      await load();
    } catch (e) {
      console.error(e);
      alert("Onverwachte fout bij verwijderen.");
    } finally {
      setBusyId(null);
    }
  }

  const ownRows = useMemo(() => {
    if (!profile?.id) return [];
    return rows.filter((r) => isVisibleForMatchmakerOverview(r, profile.id));
  }, [rows, profile?.id]);

  const tabCounts = useMemo(() => {
    return {
      zelf: ownRows.filter((r) => getTabType(r) === "zelf").length,
      uploads: ownRows.filter((r) => getTabType(r) === "uploads").length,
      retour: ownRows.filter((r) => getTabType(r) === "retour").length,
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
      const rowType = getTabType(r);
      const rowMonth = getMonthKey(r.datum);
      const rowStatus = normalizeStatus(effectiveStatus(r));
      const rowNaam = (r.naam ?? "").trim().toLowerCase();
      const rowLocatie = (r.locatie ?? "").trim().toLowerCase();
      const rowPromotor = (r.promotor ?? "").trim().toLowerCase();

      if (rowType !== viewTab) return false;
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

  function mmBasePath(matchmakingId: string) {
    return `/dashboard/matchmaker/matchmaking/${encodeURIComponent(matchmakingId)}`;
  }

  function goToMatchmaking(matchmakingId: string) {
    router.push(mmBasePath(matchmakingId));
  }

  function goToAanmeldingen(matchmakingId: string) {
    router.push(`${mmBasePath(matchmakingId)}/aanmeldingen`);
  }

  function goToMatchen(matchmakingId: string) {
    router.push(`${mmBasePath(matchmakingId)}/match`);
  }

  return (
    <>
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
                        Bekijk je eigen matchmakings en retouren van NVB.
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
                    {successMsg ? (
                      <div
                        className="mb-5 rounded-[22px] border px-4 py-3 text-sm font-semibold"
                        style={{
                          background: "rgba(20, 120, 60, 0.10)",
                          borderColor: "rgba(20, 120, 60, 0.35)",
                          color: "#14532d",
                        }}
                      >
                        {successMsg}
                      </div>
                    ) : null}

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
                            Na uploaden blijft de matchmaking eerst bij jou. Je kunt hem controleren, heruploaden, Start controle draaien of daarna naar admin sturen.
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
                            href="/templates/fightsupport-upload.xlsx"
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
                            ["zelf", `Zelf gemaakte MM (${tabCounts.zelf})`],
                            ["uploads", `Uploads (${tabCounts.uploads})`],
                            ["retour", `Retour van NVB (${tabCounts.retour})`],
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
                            {filteredRows.length} zichtbaar
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
                      <>
                        <ActionLegend />
                        <div className="mt-3 overflow-hidden rounded-2xl border-2">
                        <div
                          className="h-[3px]"
                          style={{ background: "rgba(255,77,0,0.75)" }}
                        />

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead
                              style={{
                                background:
                                  "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
                                color: "#fff",
                              }}
                            >
                              <tr>
                                <th className="px-2 py-2 text-left">Datum</th>
                                <th className="px-2 py-2 text-left">Evenement</th>
                                <th className="px-2 py-2 text-left">Type</th>
                                <th className="px-2 py-2 text-left">Bond</th>
                                <th className="px-2 py-2 text-left">Status</th>
                                <th className="px-2 py-2 text-left">Controle</th>
                                <th className="px-2 py-2 text-left">Run</th>
                                <th className="px-2 py-2 text-left">Datum</th>
                                <th className="px-2 py-2 text-left">Acties</th>
                              </tr>
                            </thead>

                            <tbody>
                              {filteredRows.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={9}
                                    className="bg-white px-4 py-8 text-center text-sm text-zinc-600"
                                  >
                                    Geen matchmakings gevonden binnen deze tab.
                                  </td>
                                </tr>
                              ) : (
                                filteredRows.map((r, i) => {
                                  const zebra = i % 2 === 0;
                                  const rowBusy = busyId === r.id;
                                  const rowType = getTabType(r);
                                  const mmType = getMatchmakingType(r);

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
                                      <td className="px-2 py-2">
                                        {formatDate(r.datum)}
                                      </td>
                                      <td className="px-2 py-2 font-semibold max-w-[180px] truncate" title={r.naam ?? "-"}>
                                        {r.naam ?? "-"}
                                      </td>
                                      <td className="px-2 py-2">
                                        <span
                                          className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em]"
                                          style={{
                                            borderColor:
                                              mmType === "upload"
                                                ? "rgba(255,77,0,0.75)"
                                                : "rgba(113,113,122,0.45)",
                                            background:
                                              mmType === "upload"
                                                ? "rgba(255,77,0,0.16)"
                                                : "rgba(113,113,122,0.14)",
                                            color: zebra ? "#111" : "#fff",
                                          }}
                                        >
                                          {formatTypeLabel(r)}
                                        </span>
                                      </td>
                                      <td className="px-2 py-2">
                                        {r.bondteam ?? "-"}
                                      </td>
                                      <td className="px-2 py-2 italic">
                                        {formatStatusLabel(
                                          r.stadium ?? r.status,
                                        )}
                                      </td>
                                      <td className="px-2 py-2 text-sm font-semibold" title={getControleStatusTitle(r)}>
                                        {formatControleStatusLabel(r)}
                                      </td>
                                      <td className="px-2 py-2 italic">
                                        {formatStatusLabel(effectiveStatus(r))}
                                      </td>
                                      <td className="px-2 py-2 text-sm">
                                        {formatDateTime(getLogDate(r))}
                                      </td>
                                      <td className="px-2 py-2">
                                        {rowType === "uploads" || rowType === "retour" ? (
                                          <div className="flex flex-nowrap items-center gap-2">
                                            <ActionSquare
                                              title="Matchmaking / upload openen"
                                              onClick={() => goToMatchmaking(r.id)}
                                              color={ACTION_COLORS.matchmaking}
                                            >
                                              M
                                            </ActionSquare>

                                            <ActionSquare
                                              title={busyId === r.id ? "Controle bezig" : "Start controle"}
                                              onClick={() => startControle(r)}
                                              disabled={busyId === r.id}
                                              color={ACTION_COLORS.controle}
                                            >
                                              {busyId === r.id ? "…" : "▶"}
                                            </ActionSquare>

                                            <ActionSquare
                                              title="Stuur naar admin"
                                              onClick={() => stuurNaarAdmin(r)}
                                              disabled={busyId === r.id}
                                              color={ACTION_COLORS.admin}
                                            >
                                              ⇧
                                            </ActionSquare>

                                            <ActionFileSquare
                                              title={reuploadingId === r.id ? "Herupload bezig" : "Herupload MM"}
                                              disabled={reuploadingId === r.id}
                                              color={ACTION_COLORS.herupload}
                                              onFile={(file) => void reuploadMM(r, file)}
                                            >
                                              {reuploadingId === r.id ? "…" : "⬆"}
                                            </ActionFileSquare>

                                            <ActionSquare
                                              title={rowBusy ? "Verwijderen bezig" : "Verwijderen"}
                                              onClick={() => deleteMM(r.id)}
                                              disabled={rowBusy}
                                              color={ACTION_COLORS.verwijderen}
                                            >
                                              {rowBusy ? "…" : "🗑"}
                                            </ActionSquare>
                                          </div>
                                        ) : isAangebodenAanNvb(r) ? (
                                          <span
                                            className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em]"
                                            style={{
                                              borderColor:
                                                "rgba(255,77,0,0.65)",
                                              background: "rgba(255,77,0,0.14)",
                                              color: zebra ? "#111" : "#fff",
                                            }}
                                          >
                                            Ter controle bij NVB
                                          </span>
                                        ) : (
                                          <div className="flex flex-nowrap items-center gap-2">
                                            <ActionSquare
                                              title="Matchmaking"
                                              onClick={() => goToMatchmaking(r.id)}
                                              color={ACTION_COLORS.matchmaking}
                                            >
                                              M
                                            </ActionSquare>

                                            <ActionSquare
                                              title="Aanmeldingen"
                                              onClick={() => goToAanmeldingen(r.id)}
                                              color={ACTION_COLORS.aanmeldingen}
                                            >
                                              A
                                            </ActionSquare>

                                            <ActionSquare
                                              title="Matchen"
                                              onClick={() => goToMatchen(r.id)}
                                              color={ACTION_COLORS.matchen}
                                            >
                                              ⚔
                                            </ActionSquare>

                                            <ActionSquare
                                              title={rowBusy ? "Verwijderen bezig" : "Verwijderen"}
                                              onClick={() => deleteMM(r.id)}
                                              disabled={rowBusy}
                                              color={ACTION_COLORS.verwijderen}
                                            >
                                              {rowBusy ? "…" : "🗑"}
                                            </ActionSquare>
                                          </div>
                                        )}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        </div>
                      </>
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
