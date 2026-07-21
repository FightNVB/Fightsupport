"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

export default function DopingFighterDetailPage(){
  const { va } = useParams<{va:string}>(); const router=useRouter(); const [data,setData]=useState<any>(null); const [msg,setMsg]=useState("");
  async function load(){ const r=await authedFetch(`/api/admin/doping/fighters/${va}`); const j=await r.json(); if(r.ok)setData(j); else setMsg(j.error||"Laden mislukt"); }
  useEffect(()=>{load()},[va]);
  async function review(id:string,action:"approve"|"reject"){ const reason=action==="reject"?(prompt("Reden afwijzing")||""):""; const r=await authedFetch("/api/admin/doping/review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({certificate_id:id,action,reason})}); const j=await r.json().catch(()=>({})); setMsg(r.ok?"Opgeslagen":j.error||"Mislukt"); if(r.ok)load(); }
  if(!data)return <main style={page}><button style={silver} onClick={()=>router.push("/dashboard/admin/doping")}><ArrowLeft size={15}/>Terug</button><p>{msg||"Laden..."}</p></main>;
  const f=data.fighter;
  return <main style={page}><div style={{maxWidth:1250,margin:"0 auto"}}><header style={header}><div><h1 style={{margin:0}}>{f.naam} <small style={{color:"#888"}}>VA {f.va_nummer}</small></h1><p style={sub}>{f.discipline||"-"} · {f.klasse||"-"}</p></div><button style={silver} onClick={()=>router.push("/dashboard/admin/doping")}><ArrowLeft size={15}/>Terug</button></header>
  {msg&&<div style={{color:"#ff9a67",marginBottom:10}}>{msg}</div>}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><section style={panel}><h2>Vechter</h2><Info k="E-mail" v={f.email}/><Info k="Licentie" v={f.licentie_actief?"Ja":"Nee"}/><Info k="Startverbod" v={f.heeft_startverbod?"Ja":"Nee"}/><Info k="Nulmeting" v={`${f.nulmeting_discipline||"-"} · ${f.nulmeting_klasse||"-"}`}/><Info k="Berekende klasse" v={f.berekende_klasse||f.klasse}/></section><section style={panel}><h2>Workflow</h2><Info k="Status" v={data.workflow?.workflow_status||"niet_uitgenodigd"}/><Info k="Certificaat" v={data.workflow?.certificate_status||"niet ontvangen"}/><Info k="Fightpassport" v={data.workflow?.fightpassport_status||"niet verwerkt"}/></section></div>
  <section style={{...panel,marginTop:14}}><h2>Certificaten</h2>{data.certificates.map((c:any)=><div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,borderTop:"1px solid #333",padding:"10px 0"}}><div><b>{c.original_filename}</b><br/><small>{new Date(c.uploaded_at).toLocaleString("nl-NL")} · {c.status}</small></div><div style={{display:"flex",gap:7}}>{c.signed_url&&<a href={c.signed_url} target="_blank" style={silver as any}>Inzien</a>}<button style={green} onClick={()=>review(c.id,"approve")}><Check size={15}/>Goedkeuren</button><button style={red} onClick={()=>review(c.id,"reject")}><X size={15}/>Afwijzen</button></div></div>)}{!data.certificates.length&&<p>Nog geen certificaat ontvangen.</p>}</section>
  <section style={{...panel,marginTop:14}}><h2>Mailhistorie</h2>{data.invitations.map((x:any)=><div key={x.id}>{new Date(x.created_at).toLocaleString("nl-NL")} · {x.invitation_type} · {x.delivery_status}</div>)}</section>
  <section style={{...panel,marginTop:14}}><h2>Laatste uitslagen</h2><div style={{overflowX:"auto"}}><table style={{width:"100%",fontSize:12}}><tbody>{data.results.slice(0,20).map((r:any)=><tr key={r.id}><td>{r.datum||"-"}</td><td>{r.discipline||"-"}</td><td>{r.klasse||"-"}</td><td>{r.tegenstander||"-"}</td><td>{r.uitslag||"-"}</td></tr>)}</tbody></table></div></section>
  </div></main>;
}
function Info({k,v}:{k:string,v:any}){return <div style={{display:"grid",gridTemplateColumns:"150px 1fr",padding:"7px 0",borderTop:"1px solid #2d3136"}}><b>{k}</b><span>{v??"-"}</span></div>}
const page:React.CSSProperties={minHeight:"100vh",background:"linear-gradient(180deg,#050607,#0c1015)",color:"white",padding:22}; const header:React.CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16}; const sub:React.CSSProperties={color:"#ff4d00",margin:"5px 0 0"}; const panel:React.CSSProperties={background:"#101419",border:"1px solid #41464d",padding:16}; const silver:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:6,padding:"9px 13px",border:"1px solid #aaa",background:"linear-gradient(#fff,#bbb)",color:"#111",fontWeight:900,cursor:"pointer",textDecoration:"none"}; const green:React.CSSProperties={...silver,background:"#287d3c",color:"white",borderColor:"#3ca759"}; const red:React.CSSProperties={...silver,background:"#8e2929",color:"white",borderColor:"#c84a4a"};
