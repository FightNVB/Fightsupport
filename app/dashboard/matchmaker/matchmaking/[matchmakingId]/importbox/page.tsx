"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail, MessageSquareText, Search, Upload, AlertTriangle } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = Record<string, any>;
const s = (v: unknown) => String(v ?? "").trim();

export default function UniversalImportboxPage() {
  const params = useParams<{ matchmakingId: string }>();
  const matchmakingId = s(params?.matchmakingId);
  const [sourceType, setSourceType] = useState("email");
  const [senderName, setSenderName] = useState("");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function preview() {
    if (!text.trim()) return setMessage("Plak eerst de e-mail of het WhatsApp-bericht.");
    setBusy(true); setMessage("");
    try {
      const res = await authedFetch("/api/matchmaker/universal-import/preview", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ source_type:sourceType, sender_name:senderName, text }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analyseren mislukt.");
      setRows((json.rows ?? []).map((r:Row)=>({ ...r, include:r.import_ready })));
      setMessage(`${json.rows?.length ?? 0} mogelijke vechters herkend. Controleer discipline, klasse en maxgewicht.`);
    } catch(e:any) { setMessage(e.message); } finally { setBusy(false); }
  }

  function patch(index:number, key:string, value:any) { setRows((current)=>current.map((r,i)=>i===index?{...r,[key]:value}:r)); }

  async function commit() {
    const selected = rows.filter((r)=>r.include).map((r)=>({
      ...r,
      va_nummer:r.fighter?.va_nummer || r.source_va,
      discipline:r.selected_discipline,
      klasse:r.selected_class,
      max_weight:r.selected_max_weight,
    }));
    if (!selected.length) return setMessage("Selecteer minimaal één complete aanmelding.");
    setBusy(true); setMessage("");
    try {
      const res=await authedFetch("/api/matchmaker/universal-import/commit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({matchmaking_id:matchmakingId,source_type:sourceType,sender_name:senderName,source_text:text,rows:selected})});
      const json=await res.json(); if(!res.ok) throw new Error(json.error||"Importeren mislukt.");
      setMessage(`${json.inserted} aanmeldingen toegevoegd. ${json.skipped?.length ?? 0} overgeslagen.`);
      setRows([]); setText("");
    } catch(e:any){setMessage(e.message);} finally{setBusy(false);}
  }

  return <main style={styles.page}>
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div><div style={styles.eyebrow}>MATCHMAKER</div><h1 style={styles.title}>Universele aanmeldingen-inbox</h1><p style={styles.sub}>Plak e-mail of WhatsApp. Trainer bepaalt gewicht en sportschool; jij bepaalt discipline, klasse en maxgewicht; de overige vechtergegevens komen uit FightPassport.</p></div>
        <Link href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/aanmeldingen`} style={styles.silver}><ArrowLeft size={16}/>Terug</Link>
      </header>

      {message && <div style={styles.message}>{message}</div>}
      <section style={styles.panel}>
        <div style={styles.grid3}>
          <label style={styles.label}>Bron<select style={styles.input} value={sourceType} onChange={(e)=>setSourceType(e.target.value)}><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option><option value="tekst">Losse tekst</option></select></label>
          <label style={styles.label}>Afzender / sportschool<input style={styles.input} value={senderName} onChange={(e)=>setSenderName(e.target.value)} placeholder="bijv. Gym Haarlem"/></label>
          <div style={styles.truth}><b>Waarheidshiërarchie</b><span>Trainer: gewicht + sportschool</span><span>Matchmaker: discipline + klasse + maxgewicht</span><span>Database: overige gegevens</span></div>
        </div>
        <label style={styles.label}>{sourceType === "whatsapp" ? <MessageSquareText size={15}/> : <Mail size={15}/>} Bericht<textarea style={styles.textarea} value={text} onChange={(e)=>setText(e.target.value)} placeholder="Plak hier het complete bericht..."/></label>
        <button style={styles.orange} onClick={preview} disabled={busy}><Search size={16}/>{busy?"Bezig...":"Bericht analyseren"}</button>
      </section>

      {rows.length>0 && <section style={styles.panel}>
        <div style={styles.sectionHead}><div><h2 style={styles.h2}>Controle vóór import</h2><p style={styles.sub}>Foute trainerinformatie wordt alleen als bron bewaard en overschrijft de database niet.</p></div><button style={styles.orange} onClick={commit} disabled={busy}><Upload size={16}/>Geselecteerde toevoegen</button></div>
        <div style={styles.rows}>{rows.map((r,index)=><article key={r.temp_id||index} style={{...styles.row,opacity:r.include?1:.65}}>
          <div style={styles.rowTop}><label style={styles.check}><input type="checkbox" checked={!!r.include} disabled={!r.matched} onChange={(e)=>patch(index,"include",e.target.checked)}/>{r.matched?<CheckCircle2 size={17}/>:<AlertTriangle size={17}/>}<b>{r.fighter?.naam || r.source_name || "Onbekende vechter"}</b><span>VA {r.fighter?.va_nummer || r.source_va || "ontbreekt"}</span></label></div>
          <div style={styles.compare}>
            <div><small>BRON VAN TRAINER</small><p>Naam: {r.source_name||"-"}</p><p>Gewicht: <b>{r.trainer_weight_text||r.trainer_weight||"-"}</b></p><p>Sportschool: <b>{r.trainer_school||"-"}</b></p><p>Klasse opgegeven: {r.source_class||"-"}</p><p>Record opgegeven: {r.source_record||"-"}</p></div>
            <div><small>DATABASEWAARHEID</small><p>Naam: <b>{r.fighter?.naam||"Niet gekoppeld"}</b></p><p>Geboortedatum: {r.fighter?.geboortedatum||"-"}</p><p>Geslacht: {r.fighter?.geslacht||"-"}</p><p>Berekende klasse: {r.fighter?.berekende_klasse||r.fighter?.nulmeting_klasse||"-"}</p><p>Wedstrijden: {r.fighter?.totaal_wedstrijden??"-"}</p></div>
            <div><small>MATCHMAKER BESLIST</small><label style={styles.label}>Discipline<input style={styles.input} value={r.selected_discipline||""} onChange={(e)=>patch(index,"selected_discipline",e.target.value)}/></label><label style={styles.label}>Klasse<input style={styles.input} value={r.selected_class||""} onChange={(e)=>patch(index,"selected_class",e.target.value)}/></label><label style={styles.label}>Maxgewicht<input style={styles.input} inputMode="decimal" value={r.selected_max_weight??""} onChange={(e)=>patch(index,"selected_max_weight",e.target.value)}/></label></div>
          </div>
          {r.warnings?.length>0 && <div style={styles.warning}>{r.warnings.map((w:string)=><span key={w}>⚠ {w}</span>)}</div>}
        </article>)}</div>
      </section>}
    </div>
  </main>;
}

const styles:Record<string,React.CSSProperties>={
 page:{minHeight:"100vh",background:"linear-gradient(180deg,#050608,#111319)",color:"#fff",padding:24,fontFamily:"Inter,Arial,sans-serif"},wrap:{maxWidth:1450,margin:"0 auto"},header:{display:"flex",justifyContent:"space-between",gap:24,alignItems:"flex-start",borderBottom:"1px solid #ffffff18",paddingBottom:18,marginBottom:18},eyebrow:{fontSize:11,letterSpacing:".18em",color:"#ff4d00",fontWeight:800},title:{margin:"4px 0 6px",fontSize:30},sub:{margin:0,color:"#ffffffa8",fontSize:13,lineHeight:1.5},panel:{background:"#0d1015",border:"1px solid #ffffff16",padding:18,marginBottom:18,boxShadow:"0 15px 40px #0008"},grid3:{display:"grid",gridTemplateColumns:"1fr 1fr 1.3fr",gap:14,marginBottom:14},label:{display:"flex",flexDirection:"column",gap:6,fontSize:11,fontWeight:800,letterSpacing:".08em",textTransform:"uppercase"},input:{background:"#080a0e",border:"1px solid #ffffff20",color:"white",padding:"10px 11px",fontSize:14},textarea:{minHeight:240,resize:"vertical",background:"#080a0e",border:"1px solid #ffffff20",color:"white",padding:12,fontSize:14,lineHeight:1.45},truth:{display:"flex",flexDirection:"column",gap:4,background:"#171a20",borderLeft:"3px solid #ff4d00",padding:12,fontSize:12,color:"#ffffffc9"},orange:{display:"inline-flex",alignItems:"center",gap:8,background:"#ff4d00",color:"white",border:0,padding:"10px 14px",fontWeight:900,cursor:"pointer"},silver:{display:"inline-flex",alignItems:"center",gap:7,background:"linear-gradient(#eee,#999)",color:"#111",textDecoration:"none",padding:"9px 12px",fontWeight:800},message:{padding:12,background:"#171a20",border:"1px solid #ff4d0066",marginBottom:14},sectionHead:{display:"flex",justifyContent:"space-between",gap:18,alignItems:"center",marginBottom:14},h2:{margin:0,fontSize:20},rows:{display:"grid",gap:12},row:{border:"1px solid #ffffff18",background:"#080a0e",padding:14},rowTop:{display:"flex",justifyContent:"space-between",marginBottom:12},check:{display:"flex",alignItems:"center",gap:8,fontSize:14},compare:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14},warning:{display:"flex",flexDirection:"column",gap:4,marginTop:12,padding:10,background:"#ffb00012",border:"1px solid #ffb00055",fontSize:12,color:"#ffd27a"}
};
