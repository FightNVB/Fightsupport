"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, RefreshCw, Search } from "lucide-react";
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
  const [summary, setSummary] = useState<any>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const p = new URLSearchParams({ discipline, klasse, status, q });
    const res = await authedFetch(`/api/admin/doping/fighters?${p}`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) { setFighters(json.fighters ?? []); setSummary(json.summary ?? {}); }
    else setMsg(json.error || "Laden mislukt.");
  }, [discipline, klasse, status, q]);

  useEffect(() => { const t = setTimeout(load, 180); return () => clearTimeout(t); }, [load]);

  const selectedRows = useMemo(() => fighters.filter((f) => selected.has(f.va_nummer)), [fighters, selected]);

  async function mailSelected(reminder = false) {
    const rows = selectedRows.length ? selectedRows : fighters;
    if (!rows.length) return;
    if (!confirm(`${reminder ? "Herinnering" : "Uitnodiging"} versturen naar ${rows.length} geselecteerde/zichtbare vechters met e-mailadres?`)) return;
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

    <div style={stats}>{[["Totaal",summary.totaal],["Verplicht nu",summary.verplicht_nu],["Niet gemaild",summary.niet_gemaild],["Gemaild",summary.gemaild],["Ontvangen",summary.ontvangen],["Goedgekeurd",summary.goedgekeurd]].map(([a,b])=><div style={stat} key={String(a)}><b style={{fontSize:24}}>{b ?? 0}</b><span>{a}</span></div>)}</div>

    <section style={panel}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={discipline} onChange={(e)=>{setDiscipline(e.target.value); setKlasse("ALL")}} style={input}><option value="ALL">Alle disciplines</option><option value="KB/TB">KB/TB</option><option value="MMA">MMA</option></select>
        <select value={klasse} onChange={(e)=>setKlasse(e.target.value)} style={input}>{allClasses.filter(k => discipline === "MMA" ? ["ALL","AMATEUR","PRO"].includes(k) : discipline === "KB/TB" ? !["AMATEUR","PRO"].includes(k) : true).map(k=><option key={k} value={k}>{k === "ALL" ? "Alle klassen" : k}</option>)}</select>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={input}><option value="all">Alle statussen</option><option value="niet_uitgenodigd">Niet gemaild</option><option value="uitgenodigd">Uitgenodigd</option><option value="herinnerd">Herinnerd</option><option value="certificaat_ontvangen">Certificaat ontvangen</option><option value="goedgekeurd">Goedgekeurd</option><option value="afgekeurd">Afgekeurd</option></select>
        <label style={{ ...input, display: "flex", alignItems: "center", gap: 7, minWidth: 240 }}><Search size={15}/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Zoek naam, VA of e-mail" style={{ background:"transparent", border:0, outline:0, color:"white", width:"100%" }}/></label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}><button style={orange} disabled={busy} onClick={()=>mailSelected(false)}><Mail size={15}/> Uitnodiging ({selected.size || fighters.length})</button><button style={silver} disabled={busy} onClick={()=>mailSelected(true)}>Herinnering</button></div>
      </div>
      {msg && <div style={{ marginTop: 12, color: "#ff9a67" }}>{msg}</div>}
    </section>

    <section style={{ ...panel, marginTop: 16, padding: 0, overflow: "hidden" }}><div style={{overflowX:"auto"}}><table style={table}><thead><tr><th><input type="checkbox" checked={fighters.length>0 && selected.size===fighters.length} onChange={toggleAll}/></th><th>VA</th><th>Naam</th><th>Discipline</th><th>Klasse</th><th>Licentie</th><th>Startverbod</th><th>Mail</th><th>Certificaat</th><th>Fightpassport</th><th></th></tr></thead><tbody>
      {fighters.map((f,i)=><tr key={f.va_nummer} style={{background:i%2?"#11151a":"#0b0e12"}}><td><input type="checkbox" checked={selected.has(f.va_nummer)} onChange={()=>toggle(f.va_nummer)}/></td><td>{f.va_nummer}</td><td><b>{f.naam || "-"}</b><br/><small>{f.email || "geen e-mail"}</small></td><td>{f.discipline || "-"}</td><td><b>{f.klasse || "-"}</b>{f.mandatory_now && <div style={{color:"#ff6b28",fontSize:10}}>VERPLICHT NU</div>}</td><td>{f.licentie_actief ? "Ja" : "Nee"}</td><td>{f.heeft_startverbod ? "Ja" : "Nee"}</td><td>{f.workflow_status}</td><td>{f.certificate_status}</td><td>{f.fightpassport_status}</td><td><button style={mini} onClick={()=>router.push(`/dashboard/admin/doping/${f.va_nummer}`)}>Open</button></td></tr>)}
      {!fighters.length && <tr><td colSpan={11}>Geen vechters gevonden.</td></tr>}
    </tbody></table></div></section>
  </div></main>;
}

const page:React.CSSProperties={minHeight:"100vh",background:"linear-gradient(180deg,#050607,#0c1015)",color:"#fff",padding:20};
const header:React.CSSProperties={display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",marginBottom:16};
const sub:React.CSSProperties={margin:"6px 0 0",color:"#ff4d00",fontSize:11,letterSpacing:1.5,textTransform:"uppercase"};
const panel:React.CSSProperties={border:"1px solid #41464d",background:"linear-gradient(180deg,#171b20,#0b0e12)",padding:14,boxShadow:"0 12px 26px #0008"};
const stats:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",gap:10,marginBottom:14};
const stat:React.CSSProperties={...panel,padding:12,display:"grid",gap:3};
const input:React.CSSProperties={height:38,padding:"0 10px",border:"1px solid #555",background:"#080a0d",color:"white"};
const silver:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:6,height:38,padding:"0 13px",border:"1px solid #aaa",background:"linear-gradient(#fff,#bbb)",color:"#111",fontWeight:900,cursor:"pointer"};
const orange:React.CSSProperties={...silver,background:"linear-gradient(#ff6a20,#d83e00)",color:"white",borderColor:"#ff7b3b"};
const mini:React.CSSProperties={...silver,height:30,padding:"0 10px",fontSize:12};
const table:React.CSSProperties={width:"100%",borderCollapse:"collapse",fontSize:12.5};
