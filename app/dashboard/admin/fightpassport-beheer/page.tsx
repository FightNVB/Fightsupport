"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bug, Database, Play, RefreshCw, Search, StopCircle, Trash2, Users } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Fighter = any;
type Run = any;
type SyncItem = any;
type Tab = "fighters" | "sync" | "errors";

export default function FightPaspoortBeheerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("fighters");
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [totalFighters, setTotalFighters] = useState(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [items, setItems] = useState<SyncItem[]>([]);
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
  const [busyDeleteTotal, setBusyDeleteTotal] = useState(false);
  const [busyDeleteTeam, setBusyDeleteTeam] = useState(false);
  const [stoppingRunId, setStoppingRunId] = useState<string>("");
  const [sortKey, setSortKey] = useState<string>("va_nummer");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 75;

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
    const res = await authedFetch("/api/admin/fightpassport-sync/runs");
    const json = await res.json().catch(() => ({}));
    if (res.ok) setRuns(json.runs ?? []);
  }, []);

  const loadItems = useCallback(async (runId: string) => {
    if (!runId) return setItems([]);
    const res = await authedFetch(`/api/admin/fightpassport-beheer/runs/${runId}/items`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) setItems(json.items ?? []);
  }, []);

  useEffect(() => {
    if (tab === "fighters") loadFighters();
  }, [tab, loadFighters]);

  useEffect(() => {
    loadRuns();
    const t = setInterval(() => {
      loadRuns();
    }, 5000);
    return () => clearInterval(t);
  }, [loadRuns]);
  useEffect(() => { if (selectedRun) loadItems(selectedRun); }, [selectedRun, loadItems]);

  const allErrors = useMemo(() => items.filter((x) => x.status === "error"), [items]);

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

  const activeTotalRun = useMemo(() => {
    return runs.find((run: any) => {
      const status = String(run?.status ?? "").toLowerCase();
      const runType = String(run?.run_type ?? "").toLowerCase();
      return runType === "full" && !["completed", "failed", "cancelled", "canceled"].includes(status);
    }) ?? null;
  }, [runs]);

  const activeTeamRun = useMemo(() => {
    return runs.find((run: any) => {
      const status = String(run?.status ?? "").toLowerCase();
      const runType = String(run?.run_type ?? "").toLowerCase();
      return runType === "team" && status === "running";
    }) ?? null;
  }, [runs]);

  async function startTotalRobot() {
    if (activeTotalRun) {
      const startAnyway = window.confirm(
        "Er loopt al een Total AutoCheck-run. Weet je zeker dat je een tweede run wilt starten?\n\nKies Annuleren om de bestaande run alleen door te laten lopen."
      );
      if (!startAnyway) return;
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
        ? `Total AutoCheck gestart voor VA ${startVa} t/m ${endVa}.`
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
        ? (json.message || "Sportscholensynchronisatie gestart.")
        : json.error || "Sportscholensynchronisatie starten mislukt."
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
        ? "Run gestopt."
        : json.error || "Run stoppen mislukt."
    );

    await loadRuns();
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
    if (res.ok) { setFighters([]); setRuns([]); setItems([]); setSelectedRun(""); await Promise.all([loadFighters(), loadRuns()]); }
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

  return <main style={styles.page}><div style={styles.wrap}>
    <header style={styles.header}><div><h1 style={{margin:0}}>FightPaspoort Beheer</h1><p style={styles.sub}>Slim vechterdossier, centrale database en synchronisatie</p></div><button style={styles.silver} onClick={() => router.push("/dashboard/admin")}><ArrowLeft size={16}/>Terug</button></header>

    <div style={styles.tabs}>
      <TabButton active={tab==="fighters"} onClick={()=>setTab("fighters")} icon={<Users size={16}/>} label="Vechters" />
      <TabButton active={tab==="sync"} onClick={()=>setTab("sync")} icon={<Database size={16}/>} label="Synchronisaties" />
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
      {activeTotalRun&&<section style={styles.activeRunBanner}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span style={styles.activeRunBadge}>● TOTAL AUTOCHECK ACTIEF</span>
            <b>VA {activeTotalRun.start_va}–{activeTotalRun.end_va}</b>
            <span>
              {activeTotalRun.processed_count ?? 0}/{Math.max(0,(activeTotalRun.end_va ?? 0)-(activeTotalRun.start_va ?? 0)+1)} verwerkt
            </span>
            <span>Laatste VA {activeTotalRun.last_processed_va ?? "—"}</span>
            <span>Gestart {fmt(activeTotalRun.started_at)}</span>
            <span>Loopt {formatDuration(activeTotalRun.started_at)}</span>
          </div>
          <button
            style={styles.stop}
            disabled={stoppingRunId===activeTotalRun.id}
            onClick={()=>stopRun(activeTotalRun.id)}
          >
            <StopCircle size={15}/>{stoppingRunId===activeTotalRun.id?"Stoppen...":"Stop run"}
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
        <p style={{color:"#bbb"}}>De Total AutoCheck en Sportscholen Sync zijn losse processen. Je kunt beide tegelijk laten draaien.</p>
        <div style={styles.filters}>
          <label style={styles.label}>Start VA<input style={styles.input} value={startVa} onChange={e=>setStartVa(e.target.value)}/></label>
          <label style={styles.label}>Eind VA<input style={styles.input} value={endVa} onChange={e=>setEndVa(e.target.value)}/></label>
          <button style={styles.orange} disabled={busyTotal} onClick={startTotalRobot}>
            <Play size={16}/>{busyTotal?"Total draait...":"Start Total AutoCheck"}
          </button>
          <button style={styles.silver} disabled={busyTeam||!!activeTeamRun} onClick={startTeamRobot}>
            <Users size={16}/>{busyTeam||activeTeamRun?"Sportscholen draaien...":"Start Sportscholen Sync"}
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
      <section style={{...styles.panel,marginTop:16}}><h2 style={{marginTop:0}}>Synchronisaties</h2><Table><thead><tr><Th>Gestart</Th><Th>Klaar</Th><Th>Duur</Th><Th>Range</Th><Th>Laatste VA</Th><Th>Verwerkt</Th><Th>Gevonden</Th><Th>Licentie</Th><Th>Fouten</Th><Th>Status</Th><Th></Th></tr></thead><tbody>{runs.map(r=>{
        const finishedAt = r.finished_at ?? r.completed_at ?? r.ended_at ?? null;
        const isDone = ["completed","failed","cancelled","canceled"].includes(String(r.status ?? "").toLowerCase());
        const isTeam = String(r.run_type ?? "").toLowerCase() === "team";
        const totalTeamSchools = r.meta?.total_schools ?? r.end_va ?? 0;
        return <tr key={r.id}>
          <Td>{fmt(r.started_at)}</Td>
          <Td>{finishedAt ? fmt(finishedAt) : isDone ? "-" : "Nog bezig"}</Td>
          <Td>{formatDuration(r.started_at, finishedAt)}</Td>
          <Td>{isTeam ? `${totalTeamSchools} sportscholen` : `${r.start_va}–${r.end_va}`}</Td>
          <Td>{isTeam ? "—" : (r.last_processed_va ?? "—")}</Td>
          <Td>{r.processed_count ?? 0}/{isTeam ? totalTeamSchools : (r.end_va-r.start_va+1)}</Td>
          <Td>{isTeam ? (r.meta?.succeeded ?? r.found_count ?? 0) : r.found_count}</Td>
          <Td>{isTeam ? (r.meta?.fighter_links ?? r.licensed_count ?? 0) : r.licensed_count}</Td>
          <Td>{r.error_count}</Td>
          <Td>{isTeam ? `team · ${r.status}` : r.status}</Td>
          <Td>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {!isTeam&&!isDone&&<button
                style={styles.stop}
                disabled={stoppingRunId===r.id}
                onClick={()=>stopRun(r.id)}
              >
                <StopCircle size={14}/>{stoppingRunId===r.id?"Stoppen...":"Stop run"}
              </button>}
              {isTeam&&!isDone&&<button
                style={styles.stop}
                disabled={stoppingRunId===r.id}
                onClick={()=>stopTeamRun(r.id)}
              >
                <StopCircle size={14}/>{stoppingRunId===r.id?"Stoppen...":"Stop run"}
              </button>}
              {!isTeam&&<button style={styles.mini} onClick={()=>{setSelectedRun(r.id);loadItems(r.id)}}>Details</button>}
            </div>
          </Td>
        </tr>
      })}</tbody></Table>
      {selectedRun&&<div style={{marginTop:18}}><h3>Run-details</h3><Table><thead><tr><Th>VA</Th><Th>Status</Th><Th>Naam</Th><Th>Licentie</Th><Th>Uitslagen</Th><Th>Gyms</Th><Th>Startverboden</Th><Th>Fout</Th></tr></thead><tbody>{items.map(i=><tr key={i.id}><Td>{i.profiel_gevonden?<button style={styles.link} onClick={()=>router.push(`/dashboard/admin/fightpassport-beheer/${i.va_nummer}`)}>{i.va_nummer}</button>:i.va_nummer}</Td><Td>{i.status}</Td><Td>{i.naam||"-"}</Td><Td>{i.licentie_actief===true?"Ja":i.licentie_actief===false?"Nee":"-"}</Td><Td>{i.results_count}</Td><Td>{i.gyms_count}</Td><Td>{i.startbans_count}</Td><Td style={{color:"#ff7d69"}}>{i.error_message||""}</Td></tr>)}</tbody></Table></div>}</section>
    </>}

    {tab === "errors" && <section style={styles.panel}><h2 style={{marginTop:0}}>AutoCheck-fouten</h2><p style={{color:"#aaa"}}>Selecteer eerst bij Synchronisaties een run om de bijbehorende fouten te bekijken.</p><Table><thead><tr><Th>VA</Th><Th>Stap</Th><Th>Foutmelding</Th><Th>Tijd</Th></tr></thead><tbody>{allErrors.map(i=><tr key={i.id}><Td>{i.va_nummer}</Td><Td>{i.error_step||"-"}</Td><Td style={{color:"#ff7d69"}}>{i.error_message||"Onbekende fout"}</Td><Td>{fmt(i.finished_at)}</Td></tr>)}{!allErrors.length&&<tr><Td colSpan={4}>Geen fouten geladen.</Td></tr>}</tbody></Table></section>}
  </div></main>;
}

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

function formatDuration(start:any,end?:any){
  if(!start)return "-";
  const startMs=new Date(start).getTime();
  const endMs=end?new Date(end).getTime():Date.now();
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
const styles:any={page:{minHeight:"100vh",background:"linear-gradient(180deg,#050607,#0c1015)",color:"#fff",padding:24},wrap:{maxWidth:1380,margin:"0 auto"},header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:16},sub:{margin:"6px 0 0",color:"#ff4d00",textTransform:"uppercase",fontSize:11,letterSpacing:1.5},tabs:{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"},tab:{display:"inline-flex",alignItems:"center",gap:8,height:42,padding:"0 18px",background:"#11161c",color:"#ddd",border:"1px solid #444",fontWeight:900,cursor:"pointer"},tabActive:{background:"linear-gradient(#ff6320,#c93b00)",border:"1px solid #ff7438",color:"white"},panel:{border:"1px solid #40464e",background:"linear-gradient(180deg,#171b20,#0c0f13)",padding:18,boxShadow:"0 12px 30px #0008"},activeRunBanner:{border:"1px solid #ff7b3b",background:"linear-gradient(180deg,#3a1707,#1a0b05)",padding:16,marginBottom:16,boxShadow:"0 0 0 1px #ff4d0033,0 12px 30px #0008"},activeRunBadge:{display:"inline-flex",alignItems:"center",padding:"7px 10px",border:"1px solid #ff7b3b",background:"#ff4d00",color:"#fff",fontSize:12,fontWeight:1000,letterSpacing:.5},teamRunBanner:{border:"1px solid #3b9fb7",background:"linear-gradient(180deg,#08252d,#07161b)",padding:16,marginBottom:16,boxShadow:"0 0 0 1px #2a9db733,0 12px 30px #0008"},teamRunBadge:{display:"inline-flex",alignItems:"center",padding:"7px 10px",border:"1px solid #55bed6",background:"#167f98",color:"#fff",fontSize:12,fontWeight:1000,letterSpacing:.5},filters:{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap"},label:{display:"grid",gap:6,fontSize:12,color:"#ccc",minWidth:140},input:{height:40,padding:"0 11px",border:"1px solid #5b626b",background:"#080a0d",color:"white"},silver:{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,height:40,padding:"0 15px",border:"1px solid #aaa",background:"linear-gradient(#fff,#bbb)",color:"#111",fontWeight:900,cursor:"pointer"},danger:{display:"inline-flex",alignItems:"center",gap:7,height:40,padding:"0 16px",border:"1px solid #c94a4a",background:"linear-gradient(#6d2020,#3b1010)",color:"white",fontWeight:900,cursor:"pointer"},
orange:{display:"inline-flex",alignItems:"center",gap:7,height:40,padding:"0 16px",border:"1px solid #ff7b3b",background:"linear-gradient(#ff6a20,#d83e00)",color:"white",fontWeight:900,cursor:"pointer"},table:{width:"100%",borderCollapse:"collapse",fontSize:13},th:{textAlign:"left",padding:"10px 9px",borderBottom:"1px solid #555",color:"#ff8c58",whiteSpace:"nowrap"},td:{padding:"10px 9px",borderBottom:"1px solid #2d3238",verticalAlign:"top",color:"#f0f0f0"},mini:{background:"#e8e8e8",border:"1px solid #999",color:"#111",fontWeight:800,padding:"6px 10px",cursor:"pointer"},stop:{display:"inline-flex",alignItems:"center",gap:5,background:"#6d2020",border:"1px solid #c94a4a",color:"#fff",fontWeight:900,padding:"6px 10px",cursor:"pointer"},link:{background:"none",border:0,color:"#ff8852",fontWeight:900,cursor:"pointer",padding:0},pagination:{display:"flex",justifyContent:"center",alignItems:"center",gap:12,marginTop:16,flexWrap:"wrap"}};
