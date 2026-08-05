"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BrainCircuit, Bug, CheckCircle2, Database, Play, RefreshCw, RotateCcw, Search, ShieldCheck, StopCircle, Trash2, Users } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Fighter = any;
type Run = any;
type SyncItem = any;
type Tab = "fighters" | "sync" | "ai" | "errors";

export default function FightPaspoortBeheerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("fighters");
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [totalFighters, setTotalFighters] = useState(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [items, setItems] = useState<SyncItem[]>([]);
  const [teamErrors, setTeamErrors] = useState<any[]>([]);
  const [startverbodErrors, setStartverbodErrors] = useState<any[]>([]);
  const [missingVa, setMissingVa] = useState<any[]>([]);
  const [missingStats, setMissingStats] = useState<any>({});
  const [missingStatus, setMissingStatus] = useState("all");
  const [aiView, setAiView] = useState<"open" | "archive">("open");
  const [missingQuery, setMissingQuery] = useState("");
  const [missingBusy, setMissingBusy] = useState("");
  const [selectedMissingVa, setSelectedMissingVa] = useState<string[]>([]);
  const [bulkMissingBusy, setBulkMissingBusy] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string>("");
  const [q, setQ] = useState("");
  const [licentie, setLicentie] = useState("all");
  const [startverbod, setStartverbod] = useState("all");
  const [discipline, setDiscipline] = useState("all");
  const [klasse, setKlasse] = useState("all");
  const [startVa, setStartVa] = useState("775");
  const [endVa, setEndVa] = useState("784");
  const [message, setMessage] = useState("");
  const [busyTotal, setBusyTotal] = useState(false);
  const [busyTeam, setBusyTeam] = useState(false);
  const [busyStartverbod, setBusyStartverbod] = useState(false);
  const [busyRetryTeam, setBusyRetryTeam] = useState(false);
  const [busyRetryRun, setBusyRetryRun] = useState(false);
  const [busyDeleteTotal, setBusyDeleteTotal] = useState(false);
  const [busyDeleteTeam, setBusyDeleteTeam] = useState(false);
  const [stoppingRunId, setStoppingRunId] = useState<string>("");
  const [resumingRunId, setResumingRunId] = useState<string>("");
  const [deletingRunId, setDeletingRunId] = useState<string>("");
  const [sortKey, setSortKey] = useState<string>("va_nummer");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 75;
  const runsRequestBusyRef = useRef(false);

  const loadFighters = useCallback(async () => {
    const sp = new URLSearchParams({
      q,
      licentie,
      startverbod,
      discipline,
      klasse,
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sortKey,
      sortDir,
    });
    const res = await authedFetch(`/api/admin/fightpassport-beheer/fighters?${sp}`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setFighters(json.fighters ?? []);
      setTotalFighters(Number(json.total ?? 0));
    } else {
      setMessage(json.error || "Laden mislukt");
    }
  }, [q, licentie, startverbod, discipline, klasse, page, sortKey, sortDir]);

  const loadRuns = useCallback(async () => {
    // Voorkom overlappende polling-requests. Die kunnen tijdens HMR,
    // navigatie of een trage databaseverbinding onnodige fetchfouten geven.
    if (runsRequestBusyRef.current) return;
    runsRequestBusyRef.current = true;

    try {
      const res = await authedFetch("/api/admin/fightpassport-sync/runs");
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || `Runs laden mislukt (${res.status}).`);
      }

      const nextRuns = Array.isArray(json.runs) ? json.runs : [];
      setRuns(nextRuns);

      // Bewaar de laatst geldige lijst als visuele fallback. Hierdoor
      // verdwijnen de runs niet bij een tijdelijke browser-/netwerkfout.
      try {
        window.sessionStorage.setItem(
          "fightpassport-sync-runs-cache",
          JSON.stringify(nextRuns)
        );
      } catch {
        // Opslag kan uitgeschakeld zijn; dat mag de pagina niet breken.
      }
    } catch (error) {
      console.warn("[fightpassport-beheer] Runs tijdelijk niet geladen:", error);

      setRuns((currentRuns) => {
        if (currentRuns.length > 0) return currentRuns;

        try {
          const cached = window.sessionStorage.getItem(
            "fightpassport-sync-runs-cache"
          );
          const parsed = cached ? JSON.parse(cached) : [];
          return Array.isArray(parsed) ? parsed : currentRuns;
        } catch {
          return currentRuns;
        }
      });
    } finally {
      runsRequestBusyRef.current = false;
    }
  }, []);

  const loadItems = useCallback(async (runId: string) => {
    if (!runId) return setItems([]);
    const res = await authedFetch(`/api/admin/fightpassport-beheer/runs/${runId}/items`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) setItems(json.items ?? []);
  }, []);


  const loadMissingVa = useCallback(async () => {
    const sp = new URLSearchParams({ status: missingStatus, q: missingQuery });
    const res = await authedFetch(`/api/admin/fightpassport-beheer/missing-va?${sp}`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setMissingVa(json.items ?? []);
      setMissingStats(json.stats ?? {});
      setSelectedMissingVa([]);
    } else {
      setMessage(json.error || "AI Controle laden mislukt.");
    }
  }, [missingStatus, missingQuery, aiView]);

  async function updateMissingVa(vaNumber: string, action: string) {
    const labels: Record<string,string> = {
      confirm_deleted: "definitief als verwijderd bevestigen",
      retry: "in de retry-wachtrij zetten",
      restore: "terugzetten naar beoordeling",
      resolve: "als opgelost markeren",
    };
    if (action === "confirm_deleted" && !window.confirm(`VA ${vaNumber} ${labels[action]}? Alleen bevestigde nummers worden voortaan overgeslagen.`)) return;
    setMissingBusy(`${vaNumber}:${action}`);
    setMessage("");
    const res = await authedFetch("/api/admin/fightpassport-beheer/missing-va", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ va_number: vaNumber, action }),
    });
    const json = await res.json().catch(() => ({}));
    setMissingBusy("");
    setMessage(res.ok ? (json.message || `VA ${vaNumber}: ${labels[action]}.`) : json.error || "Actie mislukt.");
    if (res.ok) {
      await loadMissingVa();

    }
  }

  async function bulkUpdateMissingVa(action: "confirm_deleted" | "retry" | "resolve") {
    const vaNumbers = selectedMissingVa;
    if (!vaNumbers.length) {
      setMessage("Selecteer eerst één of meer VA-nummers.");
      return;
    }

    const labels = {
      confirm_deleted: "als verwijderd markeren",
      retry: "naar retry zetten",
      resolve: "als opgelost markeren",
    } as const;

    if (!window.confirm(`${vaNumbers.length} geselecteerde VA-nummer${vaNumbers.length === 1 ? "" : "s"} ${labels[action]}?`)) return;

    setBulkMissingBusy(true);
    setMessage("");
    const res = await authedFetch("/api/admin/fightpassport-beheer/missing-va", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ va_numbers: vaNumbers, action }),
    });
    const json = await res.json().catch(() => ({}));
    setBulkMissingBusy(false);
    setMessage(res.ok ? (json.message || `${vaNumbers.length} VA-nummers bijgewerkt.`) : json.error || "Bulkactie mislukt.");
    if (res.ok) await loadMissingVa();
  }

  function toggleMissingSelection(vaNumber: string) {
    setSelectedMissingVa((current) =>
      current.includes(vaNumber)
        ? current.filter((value) => value !== vaNumber)
        : [...current, vaNumber]
    );
  }

  async function startRetryRun() {
    const queued = Number(missingStats.retry_requested ?? 0);
    if (queued <= 0) {
      setMessage("Er staan geen VA-nummers in de retry-wachtrij.");
      return;
    }

    if (!window.confirm(`${queued} VA-nummer${queued === 1 ? "" : "s"} achter elkaar opnieuw controleren?`)) return;

    setBusyRetryRun(true);
    setMessage("");

    const res = await authedFetch("/api/admin/fightpassport-beheer/missing-va", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start_retry_run" }),
    });
    const json = await res.json().catch(() => ({}));

    setBusyRetryRun(false);
    setMessage(
      res.ok
        ? (json.message || `Retry-run gestart voor ${queued} VA-nummer${queued === 1 ? "" : "s"}.`)
        : json.error || "Retry-run starten mislukt."
    );

    if (res.ok) {
      await loadMissingVa();
      setTimeout(loadRuns, 1200);
    }
  }


  const loadTeamErrors = useCallback(async (runId: string) => {
    if (!runId) return setTeamErrors([]);

    const res = await authedFetch(
      `/api/admin/fightpassport-sync/team-errors?run_id=${encodeURIComponent(runId)}`
    );
    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      setTeamErrors(json.errors ?? []);
    } else {
      setTeamErrors([]);
      setMessage(json.error || "Sportschoolfouten laden mislukt.");
    }
  }, []);


  const loadStartverbodErrors = useCallback(async () => {
    const res = await authedFetch("/api/admin/fightpassport-sync/startverbod-errors?open=true");
    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      setStartverbodErrors(json.errors ?? []);
    } else {
      setStartverbodErrors([]);
      setMessage(json.error || "Startverbod-koppelfouten laden mislukt.");
    }
  }, []);

  useEffect(() => {
    if (tab === "fighters") loadFighters();
    if (tab === "ai") loadMissingVa();
    if (tab === "errors") loadStartverbodErrors();
  }, [tab, loadFighters, loadMissingVa, loadStartverbodErrors]);

  useEffect(() => {
    void loadRuns();

    const refreshRuns = () => {
      if (document.visibilityState === "visible") {
        void loadRuns();
      }
    };

    const t = window.setInterval(refreshRuns, 5000);
    document.addEventListener("visibilitychange", refreshRuns);

    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", refreshRuns);
    };
  }, [loadRuns]);

  const allErrors = useMemo(
    () =>
      items.filter((x) => {
        const status = String(x?.status ?? "").toLowerCase();
        return (
          ["error", "fout", "failed", "mislukt"].includes(status) ||
          !!x?.error_message ||
          !!x?.error_step
        );
      }),
    [items]
  );
  const selectedRunData = useMemo(
    () => runs.find((r: any) => String(r.id) === String(selectedRun)) ?? null,
    [runs, selectedRun]
  );
  const selectedRunIsTeam = String(selectedRunData?.run_type ?? "").toLowerCase() === "team";

  const totalPages = Math.max(1, Math.ceil(totalFighters / PAGE_SIZE));

  function toggleSort(key: string) {
    setPage(1);
    if (sortKey === key) {
      setSortDir((dir) => dir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const isRetryRun = useCallback((run: any) => {
    return (
      run?.meta?.is_retry === true ||
      String(run?.meta?.run_kind ?? "").toLowerCase() === "retry" ||
      Array.isArray(run?.meta?.explicit_va_list)
    );
  }, []);

  const runTotalCount = useCallback((run: any) => {
    if (Array.isArray(run?.meta?.explicit_va_list)) {
      return run.meta.explicit_va_list.length;
    }
    return Math.max(0, Number(run?.end_va ?? 0) - Number(run?.start_va ?? 0) + 1);
  }, []);

  const activeTotalRuns = useMemo(() => {
    return runs.filter((run: any) => {
      const status = String(run?.status ?? "").toLowerCase();
      const runType = String(run?.run_type ?? "").toLowerCase();
      return runType === "full" && !isRetryRun(run) && status === "running";
    });
  }, [runs, isRetryRun]);

  const activeTotalRun = activeTotalRuns[0] ?? null;
  const activeTotalBatch = useMemo(() => {
    if (!activeTotalRuns.length) return null;
    const first = activeTotalRuns[0];
    const batchId = String(first?.meta?.batch_id ?? "");
    const grouped = batchId
      ? activeTotalRuns.filter((run: any) => String(run?.meta?.batch_id ?? "") === batchId)
      : [first];
    return {
      batchId: batchId || null,
      runs: grouped,
      startVa: Math.min(...grouped.map((run: any) => Number(run?.meta?.batch_start_va ?? run?.start_va ?? 0))),
      endVa: Math.max(...grouped.map((run: any) => Number(run?.meta?.batch_end_va ?? run?.end_va ?? 0))),
      processed: grouped.reduce((sum: number, run: any) => sum + Number(run?.processed_count ?? 0), 0),
      total: grouped.reduce((sum: number, run: any) => sum + runTotalCount(run), 0),
      startedAt: grouped.map((run: any) => run?.started_at).filter(Boolean).sort()[0] ?? null,
      workers: grouped.reduce((sum: number, run: any) => sum + Number(run?.meta?.workers_per_process ?? run?.meta?.workers ?? 0), 0),
    };
  }, [activeTotalRuns, runTotalCount]);

  const activeRetryRun = useMemo(() => {
    return runs.find((run: any) => {
      const status = String(run?.status ?? "").toLowerCase();
      const runType = String(run?.run_type ?? "").toLowerCase();
      return (
        runType === "full" &&
        isRetryRun(run) &&
        status === "running"
      );
    }) ?? null;
  }, [runs, isRetryRun]);

  const activeTeamRun = useMemo(() => {
    return runs.find((run: any) => {
      const status = String(run?.status ?? "").toLowerCase();
      const runType = String(run?.run_type ?? "").toLowerCase();
      return runType === "team" && status === "running";
    }) ?? null;
  }, [runs]);

  async function startTotalRobot() {
    if (activeTotalRun) {
      setMessage("Er draait al een Total AutoCheck-batch. Stop die eerst voordat je een nieuwe start.");
      return;
    }

    setBusyTotal(true); setMessage("");
    const res = await authedFetch("/api/admin/fightpassport-sync/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_va: Number(startVa),
        end_va: Number(endVa),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyTotal(false);
    setMessage(
      res.ok
        ? (json.message || `Total AutoCheck gestart als 1 proces met 20 workers voor VA ${startVa} t/m ${endVa}.`)
        : json.error || "Total AutoCheck starten mislukt."
    );
    setTimeout(loadRuns, 1200);
  }

  async function startTeamRobot() {
    if (activeTeamRun) {
      setMessage("Er draait al een sportscholensynchronisatie.");
      return;
    }

    setBusyTeam(true); setMessage("");
    const res = await authedFetch("/api/admin/fightpassport-sync/start-team", {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));
    setBusyTeam(false);
    setMessage(
      res.ok
        ? "Sportscholensynchronisatie gestart."
        : json.error || "Sportscholensynchronisatie starten mislukt."
    );
    setTimeout(loadRuns, 1200);
  }


  async function startStartverbodRobot() {
    setBusyStartverbod(true);
    setMessage("");

    const res = await authedFetch("/api/admin/fightpassport-sync/start-startverbod", {
      method: "POST",
    });

    const json = await res.json().catch(() => ({}));
    setBusyStartverbod(false);

    setMessage(
      res.ok
        ? (json.message || "Startverboden Sync gestart.")
        : json.error || "Startverboden Sync starten mislukt."
    );
  }


  async function retryTeamErrors(errorCount: number) {
    if (activeTeamRun) {
      setMessage("Er draait al een sportscholensynchronisatie.");
      return;
    }

    if (!window.confirm(`Alle ${errorCount} mislukte sportscholen opnieuw verwerken?`)) return;

    setBusyRetryTeam(true);
    setMessage("");

    const res = await authedFetch("/api/admin/fightpassport-sync/retry-team-errors", {
      method: "POST",
    });
    const json = await res.json().catch(() => ({}));

    setBusyRetryTeam(false);
    setMessage(
      res.ok
        ? "Herkansing van mislukte sportscholen gestart."
        : json.error || "Herkansing starten mislukt."
    );

    setTimeout(loadRuns, 1200);
  }


  async function stopRun(runId: string) {
    if (!window.confirm("Weet je zeker dat je deze actieve Total AutoCheck-run wilt stoppen?")) return;

    setStoppingRunId(runId);
    setMessage("");

    const res = await authedFetch("/api/admin/fightpassport-sync/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId }),
    });

    const json = await res.json().catch(() => ({}));
    setStoppingRunId("");

    setMessage(
      res.ok
        ? (json.message || "Run gestopt.")
        : json.error || "Run stoppen mislukt."
    );

    await loadRuns();
  }


  async function resumeRun(runId: string) {
    if (activeTotalRun) {
      setMessage("Er draait al een Total AutoCheck-run. Stop die eerst voordat je een gepauzeerde run hervat.");
      return;
    }

    if (!window.confirm("Deze gepauzeerde Total AutoCheck-run hervatten en alleen de nog niet verwerkte VA-nummers afmaken?")) return;

    setResumingRunId(runId);
    setMessage("");

    const res = await authedFetch("/api/admin/fightpassport-sync/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId }),
    });

    const json = await res.json().catch(() => ({}));
    setResumingRunId("");

    setMessage(
      res.ok
        ? (json.message || "Run hervat.")
        : json.error || "Run hervatten mislukt."
    );

    await loadRuns();
    if (res.ok) setTimeout(loadRuns, 1200);
  }


  async function stopTeamRun(runId: string) {
    if (!window.confirm("Weet je zeker dat je de actieve Sportscholen Sync wilt stoppen?")) return;

    setStoppingRunId(runId);
    setMessage("");

    const res = await authedFetch("/api/admin/fightpassport-sync/stop-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId }),
    });

    const json = await res.json().catch(() => ({}));
    setStoppingRunId("");

    setMessage(
      res.ok
        ? (json.message || "Sportscholen Sync gestopt.")
        : json.error || "Sportscholen Sync stoppen mislukt."
    );

    await loadRuns();
  }


  async function openRunDetails(run: Run) {
    const isTeam = String(run?.run_type ?? "").toLowerCase() === "team";
    setSelectedRun(run.id);

    if (isTeam) {
      setItems([]);
      await loadTeamErrors(run.id);
    } else {
      setTeamErrors([]);
      await loadItems(run.id);
    }
  }


  async function deleteSyncRun(runId: string) {
    if (!window.confirm("Deze synchronisatieregel verwijderen?")) return;
    setDeletingRunId(runId);
    setMessage("");
    const res = await authedFetch(`/api/admin/fightpassport-sync/runs?run_id=${encodeURIComponent(runId)}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    setDeletingRunId("");
    setMessage(res.ok ? "Synchronisatieregel verwijderd." : json.error || "Synchronisatieregel verwijderen mislukt.");
    if (res.ok) {
      if (String(selectedRun) === String(runId)) {
        setSelectedRun("");
        setItems([]);
        setTeamErrors([]);
      }
      await loadRuns();
    }
  }

  async function deleteTotalData() {
    if (!window.confirm("Alle data van de Total AutoCheck verwijderen? Dit verwijdert de centrale FightPaspoort scraperdata.")) return;
    setBusyDeleteTotal(true); setMessage("");
    const res = await authedFetch("/api/admin/fightpassport-sync/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "total" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyDeleteTotal(false);
    setMessage(res.ok ? "Total scraperdata verwijderd." : json.error || "Verwijderen mislukt.");
    if (res.ok) { setFighters([]); setRuns([]); setItems([]); setTeamErrors([]); setSelectedRun(""); await Promise.all([loadFighters(), loadRuns()]); }
  }

  async function deleteTeamData() {
    if (!window.confirm("Alle sportschool-VA koppelingen verwijderen? De centrale vechterdetails en uitslagen blijven behouden.")) return;
    setBusyDeleteTeam(true); setMessage("");
    const res = await authedFetch("/api/admin/fightpassport-sync/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "team" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyDeleteTeam(false);
    setMessage(res.ok ? "Sportschool scraperdata verwijderd." : json.error || "Verwijderen mislukt.");
  }

  const visibleMissingVa = useMemo(() => {
    const openStatuses = new Set(["pending_review", "retry_requested"]);
    const archiveStatuses = new Set(["confirmed_deleted", "resolved"]);
    return missingVa.filter((item:any) =>
      aiView === "open"
        ? openStatuses.has(String(item.status))
        : archiveStatuses.has(String(item.status))
    );
  }, [missingVa, aiView]);

  const visibleMissingNumbers = useMemo(
    () => visibleMissingVa.map((item:any) => String(item.va_number)),
    [visibleMissingVa]
  );
  const allVisibleMissingSelected = visibleMissingNumbers.length > 0 && visibleMissingNumbers.every((va) => selectedMissingVa.includes(va));

  function toggleAllVisibleMissing() {
    setSelectedMissingVa((current) => {
      if (allVisibleMissingSelected) {
        return current.filter((va) => !visibleMissingNumbers.includes(va));
      }
      return Array.from(new Set([...current, ...visibleMissingNumbers]));
    });
  }

  return <main style={styles.page}><div style={styles.wrap}>
    <header style={styles.header}><div><h1 style={{margin:0}}>FightPaspoort Beheer</h1><p style={styles.sub}>Slim vechterdossier, centrale database en synchronisatie</p></div><button style={styles.silver} onClick={() => router.push("/dashboard/admin")}><ArrowLeft size={16}/>Terug</button></header>

    <div style={styles.tabs}>
      <TabButton active={tab==="fighters"} onClick={()=>setTab("fighters")} icon={<Users size={16}/>} label="Vechters" />
      <TabButton active={tab==="sync"} onClick={()=>setTab("sync")} icon={<Database size={16}/>} label="Synchronisaties" />
      <TabButton active={tab==="ai"} onClick={()=>setTab("ai")} icon={<BrainCircuit size={16}/>} label="AI Controle" />
      <TabButton active={tab==="errors"} onClick={()=>setTab("errors")} icon={<Bug size={16}/>} label="Fouten" />
    </div>

    {tab === "fighters" && <>
      <section style={styles.panel}><div style={styles.filters}>
        <label style={styles.label}>Zoeken<div style={{position:"relative"}}><Search size={15} style={{position:"absolute",left:10,top:12,color:"#888"}}/><input style={{...styles.input,paddingLeft:34}} value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="Naam of VA-nummer"/></div></label>
        <Select label="Licentie" value={licentie} set={(v:any)=>{setLicentie(v);setPage(1)}} options={[["all","Alle"],["yes","Geldig"],["no","Geen"]]}/>
        <Select label="Startverbod" value={startverbod} set={(v:any)=>{setStartverbod(v);setPage(1)}} options={[["all","Alle"],["yes","Ja"],["no","Nee"]]}/>
        <Select label="Discipline" value={discipline} set={(v:any)=>{setDiscipline(v);setPage(1)}} options={[["all","Alle"],["kbtb","KB/TB"],["mma","MMA"]]}/>
        <Select label="Klasse" value={klasse} set={(v:any)=>{setKlasse(v);setPage(1)}} options={[["all","Alle"],["J","J"],["R","R"],["N","N"],["C","C"],["B","B"],["A","A"],["AMATEUR","MMA Amateur"],["PRO","MMA Pro"]]}/>
        <button style={styles.silver} onClick={loadFighters}><RefreshCw size={15}/>Verversen</button>
      </div></section>
      <section style={{...styles.panel,marginTop:16}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
          <b>{totalFighters} vechters gevonden · pagina {page} van {totalPages}</b>
          <span style={{color:"#999",fontSize:12}}>Klik op een vechter voor het volledige dossier</span>
        </div>
        <Table><thead><tr>
          <SortableTh label="VA" sortKey="va_nummer" activeKey={sortKey} dir={sortDir} onSort={toggleSort}/>
          <SortableTh label="Naam" sortKey="naam" activeKey={sortKey} dir={sortDir} onSort={toggleSort}/>
          <SortableTh label="Discipline" sortKey="discipline" activeKey={sortKey} dir={sortDir} onSort={toggleSort}/>
          <SortableTh label="Klasse" sortKey="klasse" activeKey={sortKey} dir={sortDir} onSort={toggleSort}/>
          <SortableTh label="Licentie" sortKey="licentie" activeKey={sortKey} dir={sortDir} onSort={toggleSort}/>
          <SortableTh label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort}/>
          <SortableTh label="E-mailadres" sortKey="email" activeKey={sortKey} dir={sortDir} onSort={toggleSort}/>
        </tr></thead><tbody>{fighters.map(f=><tr key={f.va_nummer} onClick={()=>router.push(`/dashboard/admin/fightpassport-beheer/${f.va_nummer}`)} style={{cursor:"pointer"}}><Td>{f.va_nummer}</Td><Td><b>{f.naam||"Onbekend"}</b></Td><Td>{f.primary_discipline||f.nulmeting_discipline||"-"}</Td><Td><ClassBadge text={f.mma_level||f.berekende_klasse||f.nulmeting_klasse||"-"}/></Td><Td><span title={f.licentie_actief?"Geldige licentie":"Geen geldige licentie"} style={{fontSize:18}}>{f.licentie_actief?"✅":"⛔"}</span></Td><Td>{f.heeft_startverbod?<span style={{color:"#ff654d"}}>⛔ Startverbod</span>:<span style={{color:"#70dc8a"}}>✓ Fit to fight</span>}</Td><Td>{f.email||"Geen e-mail"}</Td></tr>)}</tbody></Table>
        <div style={styles.pagination}>
          <button style={styles.silver} disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Vorige</button>
          <span style={{color:"#bbb",fontSize:13}}>
            {totalFighters ? `${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE, totalFighters)} van ${totalFighters}` : "0 vechters"}
          </span>
          <button style={styles.silver} disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Verder</button>
        </div>
      </section>
    </>}

    {tab === "sync" && <>
      {activeTotalBatch&&<section style={styles.activeRunBanner}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span style={styles.activeRunBadge}>● TOTAL AUTOCHECK ACTIEF</span>
            <b>VA {activeTotalBatch.startVa}–{activeTotalBatch.endVa}</b>
            <span>1 proces · {activeTotalBatch.workers || 20} workers</span>
            <span>{activeTotalBatch.processed}/{activeTotalBatch.total} verwerkt</span>
            <span>Gestart {fmt(activeTotalBatch.startedAt)}</span>
            <span>Loopt {formatDuration(activeTotalBatch.startedAt)}</span>
          </div>
          <button
            style={styles.stop}
            disabled={stoppingRunId===activeTotalRun?.id}
            onClick={()=>activeTotalRun&&stopRun(activeTotalRun.id)}
          >
            <StopCircle size={15}/>{stoppingRunId===activeTotalRun?.id?"Stoppen...":"Stop proces"}
          </button>
        </div>
        <div style={{border:"1px solid #81401f",background:"#160b06",padding:"9px 11px",fontSize:12,marginTop:12}}>
          <b>VA {activeTotalRun?.start_va}–{activeTotalRun?.end_va}</b>
          <span> · {activeTotalRun?.processed_count ?? 0}/{activeTotalRun ? runTotalCount(activeTotalRun) : 0}</span>
          <span> · laatste {activeTotalRun?.last_processed_va ?? "—"}</span>
        </div>
      </section>}
      {activeRetryRun&&<section style={styles.retryRunBanner}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span style={styles.retryRunBadge}>● RETRY-RUN ACTIEF</span>
            <b>{runTotalCount(activeRetryRun)} VA-nummers</b>
            <span>{activeRetryRun.processed_count ?? 0}/{runTotalCount(activeRetryRun)} verwerkt</span>
            <span>Laatste VA {activeRetryRun.last_processed_va ?? "—"}</span>
            <span>Gestart {fmt(activeRetryRun.started_at)}</span>
            <span>Loopt {formatDuration(activeRetryRun.started_at)}</span>
          </div>
          <button
            style={styles.stop}
            disabled={stoppingRunId===activeRetryRun.id}
            onClick={()=>stopRun(activeRetryRun.id)}
          >
            <StopCircle size={15}/>{stoppingRunId===activeRetryRun.id?"Stoppen...":"Stop retry-run"}
          </button>
        </div>
      </section>}
      {activeTeamRun&&<section style={styles.teamRunBanner}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span style={styles.teamRunBadge}>● SPORTSCHOLEN SYNC ACTIEF</span>
            <b>{activeTeamRun.processed_count ?? 0}/{activeTeamRun.meta?.total_schools ?? activeTeamRun.end_va ?? 0} verwerkt</b>
            <span>Geslaagd {activeTeamRun.meta?.succeeded ?? activeTeamRun.found_count ?? 0}</span>
            <span>Fouten {activeTeamRun.meta?.failed ?? activeTeamRun.error_count ?? 0}</span>
            <span>Vechterkoppelingen {activeTeamRun.meta?.fighter_links ?? activeTeamRun.licensed_count ?? 0}</span>
            <span>Gestart {fmt(activeTeamRun.started_at)}</span>
            <span>Loopt {formatDuration(activeTeamRun.started_at)}</span>
          </div>
          <button
            style={styles.stop}
            disabled={stoppingRunId===activeTeamRun.id}
            onClick={()=>stopTeamRun(activeTeamRun.id)}
          >
            <StopCircle size={15}/>{stoppingRunId===activeTeamRun.id?"Stoppen...":"Stop run"}
          </button>
        </div>
      </section>}
      <section style={styles.panel}>
        <h2 style={{marginTop:0}}>Nieuwe synchronisatie</h2>
        <p style={{color:"#bbb"}}>De Total AutoCheck verwerkt de volledige VA-range in 1 proces met 20 workers. Sportscholen Sync en Startverboden Sync zijn losse processen en kunnen afzonderlijk worden gestart.</p>
        <div style={styles.filters}>
          <label style={styles.label}>Start VA<input style={styles.input} value={startVa} onChange={e=>setStartVa(e.target.value)}/></label>
          <label style={styles.label}>Eind VA<input style={styles.input} value={endVa} onChange={e=>setEndVa(e.target.value)}/></label>
          <button style={styles.orange} disabled={busyTotal||!!activeTotalRun} onClick={startTotalRobot}>
            <Play size={16}/>{busyTotal?"Total start...":activeTotalRun?"Total draait...":"Start Total AutoCheck · 1 × 20"}
          </button>
          <button style={styles.silver} disabled={busyTeam||!!activeTeamRun} onClick={startTeamRobot}>
            <Users size={16}/>{busyTeam||activeTeamRun?"Sportscholen draaien...":"Start Sportscholen Sync"}
          </button>
          <button style={styles.silver} disabled={busyStartverbod} onClick={startStartverbodRobot}>
            <ShieldCheck size={16}/>{busyStartverbod?"Startverboden starten...":"Start Startverboden Sync"}
          </button>
          <button style={styles.danger} disabled={busyDeleteTotal} onClick={deleteTotalData}>
            <Trash2 size={16}/>{busyDeleteTotal?"Verwijderen...":"Verwijder Total data"}
          </button>
          <button style={styles.danger} disabled={busyDeleteTeam} onClick={deleteTeamData}>
            <Trash2 size={16}/>{busyDeleteTeam?"Verwijderen...":"Verwijder Team data"}
          </button>
        </div>
        {message&&<p style={{color:"#ff8a52"}}>{message}</p>}
      </section>
      <section style={{...styles.panel,marginTop:16}}><h2 style={{marginTop:0}}>Synchronisaties</h2><Table><thead><tr><Th>Gestart</Th><Th>Klaar</Th><Th>Duur</Th><Th>Range</Th><Th>Laatste VA</Th><Th>Verwerkt</Th><Th>Gevonden</Th><Th>Fouten</Th><Th>Status</Th><Th></Th></tr></thead><tbody>{runs.map(r=>{
        const finishedAt = r.finished_at ?? r.completed_at ?? r.ended_at ?? null;
        const status = String(r.status ?? "").toLowerCase();
        const runType = String(r.run_type ?? "").toLowerCase();
        const isDone = ["completed","failed","cancelled","canceled"].includes(status);
        const isPaused = status === "paused";
        const isRunning = status === "running";
        const isTeam = runType === "team";
        const isStartverbod = runType === "startverbod";
        const isFull = runType === "full";
        const isRetry = isFull && isRetryRun(r);
        const totalTeamSchools = r.meta?.total_schools ?? r.end_va ?? 0;
        const totalRunItems = isStartverbod ? Number(r.meta?.excel_rijen ?? r.processed_count ?? 0) : runTotalCount(r);
        return <tr key={r.id}>
          <Td>{fmt(r.started_at)}</Td>
          <Td>{finishedAt ? fmt(finishedAt) : isDone ? "-" : "Nog bezig"}</Td>
          <Td>{formatDuration(r.started_at, finishedAt, status==="paused" ? r.meta?.last_stopped_at : undefined)}</Td>
          <Td>{isTeam ? `${totalTeamSchools} sportscholen` : isStartverbod ? `${r.meta?.excel_rijen ?? r.processed_count ?? 0} Excel-rijen` : isRetry ? `${totalRunItems} retry-VA's` : `${r.start_va}–${r.end_va}`}</Td>
          <Td>{isTeam || isStartverbod ? "—" : (r.last_processed_va ?? "—")}</Td>
          <Td>{isStartverbod ? (r.processed_count ?? 0) : `${r.processed_count ?? 0}/${isTeam ? totalTeamSchools : totalRunItems}`}</Td>
          <Td>{isTeam ? (r.meta?.succeeded ?? r.found_count ?? 0) : isStartverbod ? (r.meta?.gekoppeld ?? r.found_count ?? 0) : r.found_count}</Td>
          <Td>{r.error_count}</Td>
          <Td>{isTeam ? `team · ${r.status}` : isStartverbod ? `startverbod · ${r.status}` : isRetry ? `retry · ${r.status}` : r.status}</Td>
          <Td>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {isFull&&isRunning&&<button
                style={styles.stop}
                disabled={stoppingRunId===r.id}
                onClick={()=>stopRun(r.id)}
              >
                <StopCircle size={14}/>{stoppingRunId===r.id?"Stoppen...":"Pauzeer run"}
              </button>}
              {isFull&&isPaused&&<button
                style={styles.mini}
                disabled={resumingRunId===r.id||!!activeTotalRun}
                onClick={()=>resumeRun(r.id)}
                title={activeTotalRun ? "Er draait al een Total AutoCheck-run" : "Ga verder met alleen de nog niet verwerkte VA-nummers"}
              >
                <Play size={14}/>{resumingRunId===r.id?"Hervatten...":"Hervat run"}
              </button>}
              {isTeam&&isRunning&&<button
                style={styles.stop}
                disabled={stoppingRunId===r.id}
                onClick={()=>stopTeamRun(r.id)}
              >
                <StopCircle size={14}/>{stoppingRunId===r.id?"Stoppen...":"Stop run"}
              </button>}
              {isTeam&&isDone&&Number(r.error_count||0)>0&&<button
                style={styles.mini}
                disabled={busyRetryTeam||!!activeTeamRun}
                onClick={()=>retryTeamErrors(Number(r.error_count||0))}
              >
                <RefreshCw size={14}/>{busyRetryTeam?"Starten...":`${r.error_count} fouten`}
              </button>}
              {!isStartverbod&&<button style={styles.mini} onClick={()=>openRunDetails(r)}>Details</button>}
              <button
                style={styles.dangerMini}
                disabled={deletingRunId===r.id}
                onClick={()=>deleteSyncRun(r.id)}
                title={deletingRunId===r.id ? "Verwijderen..." : "Synchronisatieregel verwijderen"}
                aria-label="Synchronisatieregel verwijderen"
              >
                <Trash2 size={14}/>
              </button>
            </div>
          </Td>
        </tr>
      })}</tbody></Table>
      {selectedRun&&selectedRunData&&<div style={{marginTop:18}}>
        <h3>{selectedRunIsTeam ? "Sportscholen Sync-details" : "Total AutoCheck-details"}</h3>
        {selectedRunIsTeam ? (
          <Table>
            <thead><tr><Th>Status</Th><Th>Sportscholen</Th><Th>Verwerkt</Th><Th>Geslaagd</Th><Th>Fouten</Th><Th>Vechterkoppelingen</Th><Th>Gestart</Th><Th>Klaar</Th><Th>Duur</Th></tr></thead>
            <tbody><tr>
              <Td>{selectedRunData.status ?? "-"}</Td>
              <Td>{selectedRunData.meta?.total_schools ?? selectedRunData.end_va ?? 0}</Td>
              <Td>{selectedRunData.processed_count ?? 0}</Td>
              <Td>{selectedRunData.meta?.succeeded ?? selectedRunData.found_count ?? 0}</Td>
              <Td>{selectedRunData.meta?.failed ?? selectedRunData.error_count ?? 0}</Td>
              <Td>{selectedRunData.meta?.fighter_links ?? selectedRunData.licensed_count ?? 0}</Td>
              <Td>{fmt(selectedRunData.started_at)}</Td>
              <Td>{fmt(selectedRunData.finished_at ?? selectedRunData.completed_at ?? selectedRunData.ended_at)}</Td>
              <Td>{formatDuration(selectedRunData.started_at, selectedRunData.finished_at ?? selectedRunData.completed_at ?? selectedRunData.ended_at, selectedRunData.status==="paused" ? selectedRunData.meta?.last_stopped_at : undefined)}</Td>
            </tr></tbody>
          </Table>
        ) : (
          <Table><thead><tr><Th>VA</Th><Th>Status</Th><Th>Naam</Th><Th>Licentie</Th><Th>Uitslagen</Th><Th>Gyms</Th><Th>Startverboden</Th><Th>Fout</Th></tr></thead><tbody>{items.map(i=><tr key={i.id}><Td>{i.profiel_gevonden?<button style={styles.link} onClick={()=>router.push(`/dashboard/admin/fightpassport-beheer/${i.va_nummer}`)}>{i.va_nummer}</button>:i.va_nummer}</Td><Td>{i.status}</Td><Td>{i.naam||"-"}</Td><Td>{i.licentie_actief===true?"Ja":i.licentie_actief===false?"Nee":"-"}</Td><Td>{i.results_count}</Td><Td>{i.gyms_count}</Td><Td>{i.startbans_count}</Td><Td style={{color:"#ff7d69"}}>{i.error_message||""}</Td></tr>)}</tbody></Table>
        )}
      </div>}</section>
    </>}


    {tab === "ai" && <>
      <section style={styles.aiIntro}>
        <div>
          <h2 style={{margin:"0 0 6px"}}>AI Controle · ontbrekende VA-nummers</h2>
          <p style={{margin:0,color:"#c8cdd2"}}>Open toont alleen VA-nummers waar nog actie op nodig is. Bevestigd verwijderde en opgeloste VA-nummers worden automatisch naar het archief verplaatst.</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
          <button
            style={styles.orange}
            disabled={busyRetryRun || Number(missingStats.retry_requested ?? 0) <= 0}
            onClick={startRetryRun}
          >
            <Play size={15}/>{busyRetryRun ? "Retry-run starten..." : `Start retry-run (${missingStats.retry_requested ?? 0})`}
          </button>
          <button style={styles.silver} onClick={loadMissingVa}><RefreshCw size={15}/>Verversen</button>
        </div>
      </section>

      <div style={styles.aiSubTabs}>
        <button
          style={{...styles.aiSubTab,...(aiView==="open"?styles.aiSubTabActive:{})}}
          onClick={()=>{setAiView("open");setMissingStatus("all")}}
        >
          Open ({(missingStats.pending_review ?? 0) + (missingStats.retry_requested ?? 0)})
        </button>
        <button
          style={{...styles.aiSubTab,...(aiView==="archive"?styles.aiSubTabActive:{})}}
          onClick={()=>{setAiView("archive");setMissingStatus("all")}}
        >
          Archief ({(missingStats.confirmed_deleted ?? 0) + (missingStats.resolved ?? 0)})
        </button>
      </div>

      <section style={styles.statGrid}>
        <StatCard label="Te beoordelen" value={missingStats.pending_review ?? 0} hint="Handmatige controle nodig" />
        <StatCard label="Opnieuw proberen" value={missingStats.retry_requested ?? 0} hint="Klaar voor de retry-run" />
        <StatCard label="Bevestigd verwijderd" value={missingStats.confirmed_deleted ?? 0} hint="Veilig overgeslagen" />
        <StatCard label="Opgelost" value={missingStats.resolved ?? 0} hint="Later weer gevonden" />
        <StatCard label="Aandacht nodig" value={missingStats.attention ?? 0} hint="Openstaande acties" />
      </section>

      <section style={{...styles.panel,marginTop:16}}>
        <div style={styles.filters}>
          <label style={styles.label}>VA zoeken<input style={styles.input} value={missingQuery} onChange={e=>setMissingQuery(e.target.value.replace(/\D/g,""))} placeholder="Bijv. 875"/></label>
          <Select
            label="Status"
            value={missingStatus}
            set={setMissingStatus}
            options={aiView === "open"
              ? [["all","Alle open"],["pending_review","Te beoordelen"],["retry_requested","Opnieuw proberen"]]
              : [["all","Alles in archief"],["confirmed_deleted","Bevestigd verwijderd"],["resolved","Opgelost"]]}
          />
          <button style={styles.orange} onClick={loadMissingVa}><Search size={15}/>Toepassen</button>
        </div>
      </section>

      <section style={{...styles.panel,marginTop:16}}>
        <div style={styles.bulkBar}>
          <label style={styles.bulkSelectLabel}>
            <input type="checkbox" checked={allVisibleMissingSelected} onChange={toggleAllVisibleMissing} disabled={!visibleMissingNumbers.length || bulkMissingBusy}/>
                      </label>
          <b>{selectedMissingVa.length} geselecteerd</b>
          {aiView === "open" && <>
            <button style={styles.dangerMini} disabled={!selectedMissingVa.length || bulkMissingBusy || !!missingBusy} onClick={()=>bulkUpdateMissingVa("confirm_deleted")}><Trash2 size={14}/>{bulkMissingBusy?"Bezig...":"Delete"}</button>
            <button style={styles.mini} disabled={!selectedMissingVa.length || bulkMissingBusy || !!missingBusy} onClick={()=>bulkUpdateMissingVa("retry")}><RotateCcw size={14}/>Retry</button>
            <button style={styles.mini} disabled={!selectedMissingVa.length || bulkMissingBusy || !!missingBusy} onClick={()=>bulkUpdateMissingVa("resolve")}><CheckCircle2 size={14}/>Klaar</button>
          </>}
          {!!selectedMissingVa.length && <button style={styles.link} disabled={bulkMissingBusy} onClick={()=>setSelectedMissingVa([])}>Selectie wissen</button>}
        </div>
        <Table><thead><tr><Th><input aria-label="Hele pagina selecteren" type="checkbox" checked={allVisibleMissingSelected} onChange={toggleAllVisibleMissing} disabled={!visibleMissingNumbers.length || bulkMissingBusy}/></Th><Th>Prioriteit</Th><Th>VA</Th><Th>Status</Th><Th>Advies</Th><Th>Keer niet gevonden</Th><Th>Eerste keer</Th><Th>Laatste keer</Th><Th>Bron</Th><Th>Acties</Th></tr></thead>
        <tbody>{visibleMissingVa.map((item:any)=>{
          const advice = missingAdvice(item);
          const vaNumber = String(item.va_number);
          return <tr key={item.id}>
            <Td><input aria-label={`VA ${vaNumber} selecteren`} type="checkbox" checked={selectedMissingVa.includes(vaNumber)} disabled={bulkMissingBusy} onChange={()=>toggleMissingSelection(vaNumber)}/></Td>
            <Td><span style={priorityStyle(advice.priority)}>{advice.priority}</span></Td>
            <Td><b>{item.va_number}</b></Td>
            <Td>{missingStatusLabel(item.status)}</Td>
            <Td><b>{advice.text}</b>{item.last_error_message&&<><br/><small>{item.last_error_message}</small></>}</Td>
            <Td>{item.not_found_count ?? 0}</Td><Td>{fmt(item.first_seen_at)}</Td><Td>{fmt(item.last_seen_at)}</Td><Td>{item.last_source ?? "-"}</Td>
            <Td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {aiView==="open"&&item.status!=="confirmed_deleted"&&<button style={styles.dangerMini} disabled={!!missingBusy || bulkMissingBusy} onClick={()=>updateMissingVa(item.va_number,"confirm_deleted")}><ShieldCheck size={13}/>Verwijderd</button>}
              {aiView==="open"&&item.status!=="retry_requested"&&item.status!=="resolved"&&<button style={styles.mini} disabled={!!missingBusy || bulkMissingBusy} onClick={()=>updateMissingVa(item.va_number,"retry")}><RotateCcw size={13}/>Retry</button>}
              {item.status==="confirmed_deleted"&&<button style={styles.mini} disabled={!!missingBusy || bulkMissingBusy} onClick={()=>updateMissingVa(item.va_number,"restore")}><RotateCcw size={13}/>Herstellen</button>}
              {aiView==="open"&&item.status!=="resolved"&&<button style={styles.mini} disabled={!!missingBusy || bulkMissingBusy} onClick={()=>updateMissingVa(item.va_number,"resolve")}><CheckCircle2 size={13}/>Opgelost</button>}
            </div></Td>
          </tr>})}
          {!visibleMissingVa.length&&<tr><Td colSpan={10}>Geen VA-nummers voor dit filter.</Td></tr>}
        </tbody></Table>
      </section>
    </>}

    {tab === "errors" && <>
      <section style={styles.panel}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div>
            <h2 style={{margin:"0 0 5px"}}>Startverbod-koppelfouten ({startverbodErrors.length})</h2>
            <p style={{margin:0,color:"#aaa"}}>Namen uit het dashboardrapport die niet veilig aan precies één VA-nummer konden worden gekoppeld.</p>
          </div>
          <button style={styles.silver} onClick={loadStartverbodErrors}><RefreshCw size={15}/>Verversen</button>
        </div>
        <div style={{marginTop:14}}>
          <Table>
            <thead><tr><Th>Bronnaam</Th><Th>Soort</Th><Th>Ingang</Th><Th>Einde</Th><Th>Probleem</Th><Th>Mogelijke VA's</Th><Th>Mogelijke namen</Th><Th>Run</Th></tr></thead>
            <tbody>
              {startverbodErrors.map((i:any)=><tr key={i.id}>
                <Td><b>{i.naam_bron||"-"}</b></Td>
                <Td>{i.soort||"-"}</Td>
                <Td>{fmtDate(i.ingang)}</Td>
                <Td>{i.einde?fmtDate(i.einde):"Geen einddatum"}</Td>
                <Td style={{color:"#ff7d69"}}>{i.fout_type==="duplicate"?"Meerdere vechters met deze naam":"Niet gevonden"}</Td>
                <Td>{Array.isArray(i.mogelijke_va_nummers)&&i.mogelijke_va_nummers.length?i.mogelijke_va_nummers.join(", "):"-"}</Td>
                <Td>{Array.isArray(i.mogelijke_namen)&&i.mogelijke_namen.length?i.mogelijke_namen.join(" | "):"-"}</Td>
                <Td>{i.run_id?String(i.run_id).slice(0,8):"-"}</Td>
              </tr>)}
              {!startverbodErrors.length&&<tr><Td colSpan={8}>Geen open startverbod-koppelfouten.</Td></tr>}
            </tbody>
          </Table>
        </div>
      </section>

      <section style={{...styles.panel,marginTop:16}}>
        <h2 style={{marginTop:0}}>{selectedRunIsTeam ? "Sportscholen Sync-fouten" : "Total AutoCheck-fouten"}</h2>
        {!selectedRunData ? (
          <p style={{color:"#aaa"}}>Selecteer bij Synchronisaties een Total- of Sportscholen-run via Details om die fouten te bekijken.</p>
        ) : selectedRunIsTeam ? (
          <Table>
            <thead><tr><Th>Sportschool ID</Th><Th>Sportschool</Th><Th>Plaats</Th><Th>Status</Th><Th>Foutmelding</Th></tr></thead>
            <tbody>
              {teamErrors.map((i:any)=><tr key={i.id ?? `${i.sync_run_id}-${i.sportschool_id}`}>
                <Td>{i.sportschool_id}</Td>
                <Td>{i.sportschool_naam||"-"}</Td>
                <Td>{i.plaats||"-"}</Td>
                <Td>{i.status||"-"}</Td>
                <Td style={{color:"#ff7d69"}}>{i.error_message||"Onbekende fout"}</Td>
              </tr>)}
              {!teamErrors.length&&<tr><Td colSpan={5}>Geen sportschoolfouten gevonden.</Td></tr>}
            </tbody>
          </Table>
        ) : (
          <Table>
            <thead><tr><Th>VA</Th><Th>Stap</Th><Th>Foutmelding</Th><Th>Tijd</Th></tr></thead>
            <tbody>
              {allErrors.map(i=><tr key={i.id}><Td>{i.va_nummer}</Td><Td>{i.error_step||"-"}</Td><Td style={{color:"#ff7d69"}}>{i.error_message||"Onbekende fout"}</Td><Td>{fmt(i.finished_at)}</Td></tr>)}
              {!allErrors.length&&<tr><Td colSpan={4}>Geen fouten geladen.</Td></tr>}
            </tbody>
          </Table>
        )}
      </section>
    </>}
  </div></main>;
}


function StatCard({label,value,hint}:any){return <div style={styles.statCard}><span style={{color:"#ff8c58",fontSize:12,fontWeight:900,textTransform:"uppercase"}}>{label}</span><strong style={{fontSize:30}}>{value}</strong><small style={{color:"#aeb5bc"}}>{hint}</small></div>}
function missingStatusLabel(status:any){const labels:any={pending_review:"Te beoordelen",retry_requested:"Opnieuw proberen",confirmed_deleted:"Bevestigd verwijderd",resolved:"Opgelost"};return labels[String(status)]||status||"-"}
function missingAdvice(item:any){
  if(item.status==="retry_requested") return {priority:"HOOG",text:"Staat in de retry-wachtrij"};
  if(item.status==="confirmed_deleted") return {priority:"LAAG",text:"Geen actie; wordt veilig overgeslagen"};
  if(item.status==="resolved") return {priority:"LAAG",text:"Profiel is weer gevonden"};
  if(Number(item.not_found_count||0)>=3) return {priority:"HOOG",text:"Direct handmatig controleren"};
  return {priority:"MIDDEN",text:"Openstaand controlepunt"};
}
function priorityStyle(priority:string){const p:any={HOOG:{background:"#621f16",border:"#c94a3a",color:"#ffd1c8"},MIDDEN:{background:"#4a350b",border:"#b98822",color:"#ffe09a"},LAAG:{background:"#17351f",border:"#3d8d53",color:"#aaf0bd"}};const c=p[priority]||p.MIDDEN;return {display:"inline-flex",padding:"4px 7px",fontSize:11,fontWeight:1000,border:`1px solid ${c.border}`,background:c.background,color:c.color}}

function TabButton({active,onClick,icon,label}:any){return <button onClick={onClick} style={{...styles.tab,...(active?styles.tabActive:{})}}>{icon}{label}</button>}
function Select({label,value,set,options}:any){return <label style={styles.label}>{label}<select style={styles.input} value={value} onChange={e=>set(e.target.value)}>{options.map((o:any)=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>}
function Table({children}:any){return <div className="fp-table-wrap" style={{overflowX:"auto"}}><style jsx>{`
      .fp-table-wrap :global(tbody tr:nth-child(odd) td){background:#12171c;color:#f0f0f0}
      .fp-table-wrap :global(tbody tr:nth-child(even) td){background:#1a2026;color:#f0f0f0}
      .fp-table-wrap :global(tbody tr:hover td){background:#242c34}
      .fp-table-wrap :global(tbody small){color:#aeb5bc}
    `}</style><table style={styles.table}>{children}</table></div>}
function SortableTh({label,sortKey,activeKey,dir,onSort}:any){
  const active=activeKey===sortKey;
  return <th style={{...styles.th,cursor:"pointer",userSelect:"none"}} onClick={()=>onSort(sortKey)} title={`Sorteren op ${label}`}>
    <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
      {label}<span style={{fontSize:11,opacity:active?1:.35}}>{active?(dir==="asc"?"▲":"▼"):"↕"}</span>
    </span>
  </th>
}
function Th({children}:any){return <th style={styles.th}>{children}</th>}
function Td({children,...rest}:any){return <td style={styles.td} {...rest}>{children}</td>}
function ClassBadge({text}:any){
  const raw=String(text||"-").trim();
  const key=raw.toUpperCase();
  const palette:any={
    J:{background:"#10243a",border:"#2f78b7",color:"#7fc4ff"},
    R:{background:"#35250b",border:"#b77b16",color:"#ffc45c"},
    N:{background:"#32130d",border:"#b53c24",color:"#ff8b70"},
    C:{background:"#132d20",border:"#2d8c58",color:"#78d9a0"},
    B:{background:"#2a1738",border:"#824db0",color:"#c99af0"},
    A:{background:"#382d0d",border:"#c5a22d",color:"#ffe070"},
    AMATEUR:{background:"#102d31",border:"#268d96",color:"#74dce5"},
    "MMA AMATEUR":{background:"#102d31",border:"#268d96",color:"#74dce5"},
    PRO:{background:"#301126",border:"#a52c78",color:"#f27fc1"},
    "MMA PRO":{background:"#301126",border:"#a52c78",color:"#f27fc1"},
    "-":{background:"#20252b",border:"#59616a",color:"#aeb5bc"}
  };
  const c=palette[key]||palette["-"];
  return <span style={{display:"inline-flex",minWidth:36,justifyContent:"center",padding:"5px 9px",border:`1px solid ${c.border}`,background:c.background,color:c.color,fontWeight:900}}>{raw}</span>
}
function fmt(v:any){return v?new Date(v).toLocaleString("nl-NL"):"-"}
function fmtDate(v:any){
  if(!v)return "-";
  const d=new Date(`${String(v).slice(0,10)}T12:00:00`);
  return Number.isNaN(d.getTime())?"-":d.toLocaleDateString("nl-NL");
}

function formatDuration(start:any,end?:any,pauseAt?:any){
  if(!start)return "-";
  const startMs=new Date(start).getTime();
  const endMs=end
    ? new Date(end).getTime()
    : pauseAt
      ? new Date(pauseAt).getTime()
      : Date.now();
  if(Number.isNaN(startMs)||Number.isNaN(endMs)||endMs<startMs)return "-";
  const totalSeconds=Math.floor((endMs-startMs)/1000);
  const days=Math.floor(totalSeconds/86400);
  const hours=Math.floor((totalSeconds%86400)/3600);
  const minutes=Math.floor((totalSeconds%3600)/60);
  const seconds=totalSeconds%60;
  if(days>0)return `${days}d ${hours}u ${minutes}m`;
  if(hours>0)return `${hours}u ${minutes}m ${seconds}s`;
  if(minutes>0)return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
const styles:any={bulkBar:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12,padding:"10px 12px",border:"1px solid #4b535c",background:"#0d1217"},bulkSelectLabel:{display:"inline-flex",alignItems:"center",gap:8,fontWeight:900,cursor:"pointer"},aiSubTabs:{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"},aiSubTab:{height:38,padding:"0 16px",border:"1px solid #4b535c",background:"#11161c",color:"#d7dce1",fontWeight:900,cursor:"pointer"},aiSubTabActive:{border:"1px solid #ff7438",background:"linear-gradient(#ff6320,#c93b00)",color:"#fff"},aiIntro:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,border:"1px solid #ff7438",background:"linear-gradient(135deg,#261108,#111820)",padding:18,boxShadow:"0 12px 30px #0008"},statGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginTop:16},statCard:{display:"grid",gap:6,border:"1px solid #48515b",background:"linear-gradient(180deg,#1b2229,#0c1014)",padding:16},page:{minHeight:"100vh",background:"linear-gradient(180deg,#050607,#0c1015)",color:"#fff",padding:24},wrap:{maxWidth:1380,margin:"0 auto"},header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:16},sub:{margin:"6px 0 0",color:"#ff4d00",textTransform:"uppercase",fontSize:11,letterSpacing:1.5},tabs:{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"},tab:{display:"inline-flex",alignItems:"center",gap:8,height:42,padding:"0 18px",background:"#11161c",color:"#ddd",border:"1px solid #444",fontWeight:900,cursor:"pointer"},tabActive:{background:"linear-gradient(#ff6320,#c93b00)",border:"1px solid #ff7438",color:"white"},panel:{border:"1px solid #40464e",background:"linear-gradient(180deg,#171b20,#0c0f13)",padding:18,boxShadow:"0 12px 30px #0008"},activeRunBanner:{border:"1px solid #ff7b3b",background:"linear-gradient(180deg,#3a1707,#1a0b05)",padding:16,marginBottom:16,boxShadow:"0 0 0 1px #ff4d0033,0 12px 30px #0008"},activeRunBadge:{display:"inline-flex",alignItems:"center",padding:"7px 10px",border:"1px solid #ff7b3b",background:"#ff4d00",color:"#fff",fontSize:12,fontWeight:1000,letterSpacing:.5},retryRunBanner:{border:"1px solid #a56fd6",background:"linear-gradient(180deg,#24132f,#120b18)",padding:16,marginBottom:16,boxShadow:"0 0 0 1px #8b4db833,0 12px 30px #0008"},retryRunBadge:{display:"inline-flex",alignItems:"center",padding:"7px 10px",border:"1px solid #c18cec",background:"#7a3fa3",color:"#fff",fontSize:12,fontWeight:1000,letterSpacing:.5},teamRunBanner:{border:"1px solid #3b9fb7",background:"linear-gradient(180deg,#08252d,#07161b)",padding:16,marginBottom:16,boxShadow:"0 0 0 1px #2a9db733,0 12px 30px #0008"},teamRunBadge:{display:"inline-flex",alignItems:"center",padding:"7px 10px",border:"1px solid #55bed6",background:"#167f98",color:"#fff",fontSize:12,fontWeight:1000,letterSpacing:.5},filters:{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap"},label:{display:"grid",gap:6,fontSize:12,color:"#ccc",minWidth:140},input:{height:40,padding:"0 11px",border:"1px solid #5b626b",background:"#080a0d",color:"white"},silver:{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,height:40,padding:"0 15px",border:"1px solid #aaa",background:"linear-gradient(#fff,#bbb)",color:"#111",fontWeight:900,cursor:"pointer"},danger:{display:"inline-flex",alignItems:"center",gap:7,height:40,padding:"0 16px",border:"1px solid #c94a4a",background:"linear-gradient(#6d2020,#3b1010)",color:"white",fontWeight:900,cursor:"pointer"},
orange:{display:"inline-flex",alignItems:"center",gap:7,height:40,padding:"0 16px",border:"1px solid #ff7b3b",background:"linear-gradient(#ff6a20,#d83e00)",color:"white",fontWeight:900,cursor:"pointer"},table:{width:"100%",borderCollapse:"collapse",fontSize:13},th:{textAlign:"left",padding:"10px 9px",borderBottom:"1px solid #555",color:"#ff8c58",whiteSpace:"nowrap"},td:{padding:"10px 9px",borderBottom:"1px solid #2d3238",verticalAlign:"top",color:"#f0f0f0"},mini:{background:"#e8e8e8",border:"1px solid #999",color:"#111",fontWeight:800,padding:"6px 10px",cursor:"pointer"},dangerMini:{display:"inline-flex",alignItems:"center",gap:5,background:"#4a1717",border:"1px solid #a94444",color:"#fff",fontWeight:800,padding:"6px 10px",cursor:"pointer"},stop:{display:"inline-flex",alignItems:"center",gap:5,background:"#6d2020",border:"1px solid #c94a4a",color:"#fff",fontWeight:900,padding:"6px 10px",cursor:"pointer"},link:{background:"none",border:0,color:"#ff8852",fontWeight:900,cursor:"pointer",padding:0},pagination:{display:"flex",justifyContent:"center",alignItems:"center",gap:12,marginTop:16,flexWrap:"wrap"}};
