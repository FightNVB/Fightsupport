"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileCheck2, Mail, RefreshCw, Search } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Fighter = {
  va_nummer: string; naam: string | null; email: string | null; discipline: string | null; klasse: string | null;
  licentie_actief: boolean | null; heeft_startverbod: boolean | null; mandatory_now: boolean;
  workflow_status: string; certificate_status: string; fightpassport_status: string; last_invited_at: string | null;
};

const allClasses = ["ALL", "J", "R", "N", "C", "B", "A", "AMATEUR", "PRO"];

export default function DopingAdminPage() {
  const router = useRouter();
  const [discipline, setDiscipline] = useState("ALL");
  const [klasse, setKlasse] = useState("ALL");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [totalFighters, setTotalFighters] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const PAGE_SIZE = 75;
  const [summary, setSummary] = useState<any>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);

    const p = new URLSearchParams({
      discipline,
      klasse,
      status,
      q: q.trim(),
      page: String(pageNumber),
      pageSize: String(PAGE_SIZE),
    });

    try {
      const res = await authedFetch(`/api/admin/doping/fighters?${p}`);
      const json = await res.json().catch(() => ({}));

      // Een ouder, langzamer request mag een nieuwer resultaat niet overschrijven.
      if (currentRequest !== requestId.current) return;

      if (res.ok) {
        setFighters(json.fighters ?? []);
        setTotalFighters(Number(json.total ?? 0));
        setSummary(json.summary ?? {});
        setMsg("");
      } else {
        setMsg(json.error || "Laden mislukt.");
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [discipline, klasse, status, q, pageNumber]);

  // Filters laden direct; typen in zoeken wacht kort zodat niet iedere toets een API-call start.
  useEffect(() => {
    const delay = q.trim() ? 400 : 80;
    const timer = setTimeout(load, delay);
    return () => clearTimeout(timer);
  }, [load, q]);

  const selectedRows = useMemo(() => fighters.filter((f) => selected.has(f.va_nummer)), [fighters, selected]);
  const totalPages = Math.max(1, Math.ceil(totalFighters / PAGE_SIZE));


  async function writeSelectedToFightPassport() {
    if (!selectedRows.length) {
      setMsg("Selecteer eerst minimaal één vechter.");
      return;
    }

    if (!confirm(`Bij ${selectedRows.length} geselecteerde vechter(s) de opmerking \"Doping certificaat behaald\" in de nulmeting zetten?`)) return;

    setBusy(true);
    setMsg("FightPassport wordt bijgewerkt...");

    const res = await authedFetch("/api/admin/doping/fightpassport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ va_nummers: selectedRows.map((row) => row.va_nummer) }),
    });

    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setMsg(json.error || "Schrijven naar FightPassport mislukt.");
      return;
    }

    const success = Number(json.written ?? 0) + Number(json.already_present ?? 0);
    setMsg(`✅ FightPassport succesvol verwerkt: ${success} van ${selectedRows.length}. Nieuw toegevoegd: ${json.written ?? 0}, al aanwezig: ${json.already_present ?? 0}, mislukt: ${json.failed ?? 0}.`);
    setSelected(new Set());
    load();
  }
  async function mailSelected(reminder = false) {
    const rows = selectedRows;
    if (!rows.length) {
      setMsg("Selecteer eerst minimaal één vechter.");
      return;
    }
    if (!confirm(`${reminder ? "Herinnering" : "Uitnodiging"} versturen naar ${rows.length} geselecteerde vechter(s) met e-mailadres?`)) return;
    setBusy(true); setMsg("");
    const res = await authedFetch("/api/admin/doping/mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ va_nummers: rows.map((r) => r.va_nummer), reminder }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? `Verstuurd: ${json.sent}. Overgeslagen: ${json.skipped}. Mislukt: ${json.failed}.` : json.error || "Mailing mislukt.");
    load();
  }

  function toggle(va: string) { setSelected((prev) => { const n = new Set(prev); n.has(va) ? n.delete(va) : n.add(va); return n; }); }
  function toggleAll() { setSelected((prev) => prev.size === fighters.length ? new Set() : new Set(fighters.map((f) => f.va_nummer))); }

  return <main style={page}><div style={{ maxWidth: 1450, margin: "0 auto" }}>
    <header style={header}><div><h1 style={{ margin: 0 }}>Doping Autoriteit</h1><p style={sub}>Selectie, mailing, certificaten en Fightpassport-verwerking</p></div><div style={{ display: "flex", gap: 8 }}><button style={silver} onClick={() => router.push("/dashboard/admin/fightpassport-sync")}><RefreshCw size={15}/> FP Sync</button><button style={silver} onClick={() => router.push("/dashboard/admin")}><ArrowLeft size={15}/> Terug</button></div></header>

    <div style={stats}>{[["Totaal",summary.totaal],["Verplicht nu",summary.verplicht_nu],["Niet gemaild",summary.niet_gemaild],["Gemaild",summary.gemaild],["Ontvangen",summary.ontvangen],["Goedgekeurd",summary.goedgekeurd],["FightPassport",summary.fightpassport_verwerkt]].map(([a,b])=><div style={stat} key={String(a)}><b style={{fontSize:24}}>{b ?? 0}</b><span>{a}</span></div>)}</div>

    <section style={panel}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={discipline} onChange={(e)=>{setDiscipline(e.target.value); setKlasse("ALL"); setPageNumber(1)}} style={input}><option value="ALL">Alle disciplines</option><option value="KB/TB">KB/TB</option><option value="MMA">MMA</option></select>
        <select value={klasse} onChange={(e)=>{setKlasse(e.target.value); setPageNumber(1)}} style={input}>{allClasses.filter(k => discipline === "MMA" ? ["ALL","AMATEUR","PRO"].includes(k) : discipline === "KB/TB" ? !["AMATEUR","PRO"].includes(k) : true).map(k=><option key={k} value={k}>{k === "ALL" ? "Alle klassen" : k}</option>)}</select>
        <select value={status} onChange={(e)=>{setStatus(e.target.value); setPageNumber(1)}} style={input}><option value="all">Alle statussen</option><option value="verplicht">Verplicht nu</option><option value="niet_uitgenodigd">Niet gemaild</option><option value="uitgenodigd">Uitgenodigd</option><option value="herinnerd">Herinnerd</option><option value="certificaat_ontvangen">Certificaat ontvangen</option><option value="goedgekeurd">Goedgekeurd</option><option value="afgekeurd">Afgekeurd</option><option value="fightpassport_verwerkt">FightPassport verwerkt</option></select>
        <label style={{ ...input, display: "flex", alignItems: "center", gap: 7, minWidth: 240 }}><Search size={15}/><input value={q} onChange={(e)=>{setQ(e.target.value); setPageNumber(1)}} placeholder="Zoek naam, VA of e-mail" style={{ background:"transparent", border:0, outline:0, color:"white", width:"100%" }}/></label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}><button style={orange} disabled={busy || selected.size === 0} onClick={()=>mailSelected(false)}><Mail size={15}/> Uitnodiging ({selected.size})</button><button style={silver} disabled={busy || selected.size === 0} onClick={()=>mailSelected(true)}>Herinnering ({selected.size})</button><button style={petrol} disabled={busy || selected.size === 0} onClick={writeSelectedToFightPassport}><FileCheck2 size={15}/> In dossier ({selected.size})</button></div>
      </div>
      {loading && <div style={{ marginTop: 12, color: "#b8c0c8" }}>Gegevens laden...</div>}
      {msg && <div style={{ marginTop: 12, color: "#ff9a67" }}>{msg}</div>}
    </section>

    <section style={{ ...panel, marginTop: 16 }}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
        <b>{totalFighters} vechters gevonden · pagina {pageNumber} van {totalPages}</b>
        <span style={{color:"#999",fontSize:12}}>Selecteren geldt voor de 75 zichtbare vechters op deze pagina</span>
      </div>
      <div style={{overflowX:"auto"}}><table style={table}><thead><tr><th><input type="checkbox" checked={fighters.length>0 && selected.size===fighters.length} onChange={toggleAll}/></th><th>VA</th><th>Naam</th><th>Discipline</th><th>Klasse</th><th>Licentie</th><th>Startverbod</th><th>Mail</th><th>Certificaat</th><th>Fightpassport</th><th></th></tr></thead><tbody>
        {fighters.map((f,i)=><tr key={f.va_nummer} style={{background:i%2?"#11151a":"#0b0e12"}}><td><input type="checkbox" checked={selected.has(f.va_nummer)} onChange={()=>toggle(f.va_nummer)}/></td><td>{f.va_nummer}</td><td><b>{f.naam || "-"}</b><br/><small>{f.email || "geen e-mail"}</small></td><td>{f.discipline || "-"}</td><td><b>{f.klasse || "-"}</b>{f.mandatory_now && <div style={{color:"#ff6b28",fontSize:10}}>VERPLICHT NU</div>}</td><td>{f.licentie_actief ? "Ja" : "Nee"}</td><td>{f.heeft_startverbod ? "Ja" : "Nee"}</td><td>{statusLabel(f.workflow_status)}</td><td>{statusLabel(f.certificate_status)}</td><td>{statusLabel(f.fightpassport_status)}</td><td><button style={mini} onClick={()=>router.push(`/dashboard/admin/doping/${f.va_nummer}`)}>Open</button></td></tr>)}
        {!loading && !fighters.length && <tr><td colSpan={11}>Geen vechters gevonden.</td></tr>}
        {loading && !fighters.length && <tr><td colSpan={11}>Vechters laden...</td></tr>}
      </tbody></table></div>
      <div style={pagination}>
        <button style={silver} disabled={pageNumber<=1} onClick={()=>{setSelected(new Set());setPageNumber(p=>Math.max(1,p-1))}}>Vorige</button>
        <span style={{color:"#bbb",fontSize:13}}>
          {totalFighters ? `${(pageNumber-1)*PAGE_SIZE+1}–${Math.min(pageNumber*PAGE_SIZE,totalFighters)} van ${totalFighters}` : "0 vechters"}
        </span>
        <button style={silver} disabled={pageNumber>=totalPages} onClick={()=>{setSelected(new Set());setPageNumber(p=>Math.min(totalPages,p+1))}}>Verder</button>
      </div>
    </section>
  </div></main>;
}

function statusLabel(value: string | null | undefined) {
  const status = String(value ?? "").trim().toLowerCase();
  const labels: Record<string, string> = {
    niet_uitgenodigd: "Niet gemaild",
    uitgenodigd: "Uitgenodigd",
    herinnerd: "Herinnerd",
    niet_ontvangen: "Niet ontvangen",
    ontvangen: "Ontvangen",
    goedgekeurd: "Goedgekeurd",
    afgekeurd: "Afgekeurd",
    niet_verwerkt: "Niet verwerkt",
    verwerkt: "Verwerkt",
  };
  return labels[status] ?? value ?? "-";
}

const page:React.CSSProperties={minHeight:"100vh",background:"linear-gradient(180deg,#050607,#0c1015)",color:"#fff",padding:20};
const header:React.CSSProperties={display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",marginBottom:16};
const sub:React.CSSProperties={margin:"6px 0 0",color:"#ff4d00",fontSize:11,letterSpacing:1.5,textTransform:"uppercase"};
const panel:React.CSSProperties={border:"1px solid #41464d",background:"linear-gradient(180deg,#171b20,#0b0e12)",padding:14,boxShadow:"0 12px 26px #0008"};
const stats:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginBottom:14};
const stat:React.CSSProperties={...panel,padding:12,display:"grid",gap:3};
const input:React.CSSProperties={height:38,padding:"0 10px",border:"1px solid #555",background:"#080a0d",color:"white"};
const silver:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:6,height:38,padding:"0 13px",border:"1px solid #aaa",background:"linear-gradient(#fff,#bbb)",color:"#111",fontWeight:900,cursor:"pointer"};
const orange:React.CSSProperties={...silver,background:"linear-gradient(#ff6a20,#d83e00)",color:"white",borderColor:"#ff7b3b"};
const mini:React.CSSProperties={...silver,height:30,padding:"0 10px",fontSize:12};
const table:React.CSSProperties={width:"100%",borderCollapse:"collapse",fontSize:12.5};
const pagination:React.CSSProperties={display:"flex",justifyContent:"center",alignItems:"center",gap:12,marginTop:16,flexWrap:"wrap"};

const petrol:React.CSSProperties={...silver,background:"linear-gradient(#1a7f83,#0b5055)",color:"white",borderColor:"#2f9ca1"};

