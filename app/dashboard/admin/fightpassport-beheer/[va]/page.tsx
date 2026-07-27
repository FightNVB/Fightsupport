"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

export default function FighterDossierPage(){
 const {va}=useParams<{va:string}>(); const router=useRouter(); const [data,setData]=useState<any>(null); const [error,setError]=useState("");
 async function load(){const r=await authedFetch(`/api/admin/fightpassport-beheer/fighters/${va}`);const j=await r.json().catch(()=>({}));if(r.ok)setData(j);else setError(j.error||"Laden mislukt");}
 useEffect(()=>{load()},[va]); if(error)return <main style={s.page}><button style={s.silver} onClick={()=>router.back()}>Terug</button><p>{error}</p></main>; if(!data)return <main style={s.page}>Dossier laden...</main>;
 const f=data.fighter;
 const resultRows=Array.isArray(data.results)?data.results:[];
 const record=resultRows.reduce((acc:any,r:any)=>{
  const u=String(r?.uitslag||"").trim().toLowerCase();
  if(/win|winst|gewonnen|wint/.test(u))acc.w++;
  else if(/loss|verlies|verloren|verliest/.test(u))acc.v++;
  else if(/draw|onbeslist|gelijk/.test(u))acc.o++;
  return acc;
 },{w:0,v:0,o:0});
 return <main style={s.page}><div style={s.wrap}>
  <header style={s.hero}>
    <div style={s.heroGlow}/>
    <div style={s.heroTop}>
      <button style={s.silver} onClick={()=>router.push('/dashboard/admin/fightpassport-beheer')}><ArrowLeft size={16}/>Beheer</button>
      <div style={s.logoWrap}>
        <img src="/branding/fightsupport/excel-logo.png" alt="FightSupport" style={s.logo}/>
      </div>
      <button style={s.silver} onClick={load}><RefreshCw size={16}/>Hercheck</button>
    </div>
    <div style={s.heroBottom}>
      <div style={s.heroIdentity}>
        <div style={s.eyebrow}>VECHTERDOSSIER</div>
        <h1 style={s.title}>{f.naam||"Onbekende vechter"}</h1>
        <div style={s.identityStrip}>
          <span style={s.identityChip}><b>VA</b> {f.va_nummer}</span>
          <span style={s.identityChip}>{f.primary_discipline||f.nulmeting_discipline||"Discipline onbekend"}</span>
          <span style={s.identityChip}>{f.mma_level||f.berekende_klasse||f.nulmeting_klasse||"Klasse onbekend"}</span>
          <span style={s.identityChip}>Sync {fmt(f.last_scraped_at)}</span>
        </div>
      </div>
    </div>
  </header>
 <div style={s.summary}><Card title="Licentie" value={f.licentie_actief?"Geldig":"Geen geldige licentie"}/><Card title="Status" value={f.heeft_startverbod?"STARTVERBOD":"Fit to fight"} danger={f.heeft_startverbod}/><Card title="Wedstrijden" value={`${f.totaal_wedstrijden??data.results.length} totaal · ${f.gewonnen??"?"} gewonnen`}/></div>
 <Section title="Profiel & contact"><Grid rows={[["Naam",f.naam],["E-mail",f.email],["Geboortedatum",f.geboortedatum],["Geslacht",f.geslacht]]}/></Section>
 <Section title="Nulmeting & klasse"><Grid rows={[["Discipline",f.nulmeting_discipline],["Nulmeting klasse",f.nulmeting_klasse],["Berekende klasse",f.berekende_klasse],["MMA niveau",f.mma_level],["Leeftijd",calcAge(f.geboortedatum)],["Gewicht",f.nulmeting_gewicht],["Aantal wedstrijden",f.nulmeting_totaal],["W / V / O",`${record.w} / ${record.v} / ${record.o}`],["Opmerking",f.nulmeting_opmerking,"full"]]}/></Section>
 <Section title={`Sportscholen (${(data.sportscholen||data.gyms||[]).length})`}><Table headers={["Sportschool","Plaats","Land","Sportschool ID","Laatste synchronisatie"]} rows={(data.sportscholen||data.gyms||[]).map((r:any)=>[r.naam||r.organisatie_naam,r.plaats,r.land,r.sportschool_id||r.organisatie_id||"-",fmt(r.last_team_sync_at||r.last_seen_at)])}/></Section>
 <Section title={`Wedstrijdhistorie (${data.results.length})`}><Table headers={["Datum","Evenement","Discipline","Klasse","Tegenstander","Sportschool","Uitslag"]} rows={data.results.map((r:any)=>[r.datum,r.evenement,r.discipline,r.klasse,r.tegenstander,r.sportschool,r.uitslag])}/></Section>
 {Array.isArray(data.startbans)&&data.startbans.length>0&&<Section title={`Startverboden (${data.startbans.length})`}><Table headers={["Soort","Ingang","Einde","Actief","Reden","Evenement"]} rows={data.startbans.map((r:any)=>[r.soort,r.ingang,r.einde,r.actief?"Ja":"Nee",r.reden,r.evenement])}/></Section>}
 <Section title="Dopingeducatie"><Grid rows={[["Status",data.doping?.status||"Niet gestart"],["Uitgenodigd",fmt(data.doping?.invited_at)],["Certificaat",data.doping?.certificate_status||"Niet ontvangen"],["FightPaspoort verwerkt",data.doping?.fightpassport_processed?"Ja":"Nee"]]}/></Section>
 </div></main>
}
function Card({title,value,danger}:any){return <div style={s.card}><div style={s.cardTitle}>{title}</div><div style={{fontSize:18,fontWeight:900,color:danger?"#ff654d":"#eee"}}>{value}</div></div>}
function Section({title,children}:any){return <section style={s.section}><h2 style={{margin:"0 0 14px",color:"#ff7440"}}>{title}</h2>{children}</section>}
function Grid({rows}:any){return <div style={s.grid}>{rows.map((r:any,i:number)=><div key={i} style={{...s.field,...(r[2]==="wide"?s.fieldWide:{}),...(r[2]==="full"?s.fieldFull:{})}}><span style={s.muted}>{r[0]}</span><b style={{wordBreak:"break-word",lineHeight:1.35}}>{r[1]??"-"}</b></div>)}</div>}
function Table({headers,rows}:any){return <div style={{overflowX:"auto",border:"1px solid #444b52"}}><table style={s.table}><thead><tr>{headers.map((h:any)=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{rows.map((r:any,i:number)=>{const light=i%2===1;return <tr key={i}>{r.map((v:any,j:number)=><td key={j} style={{...s.td,...(light?s.tdLight:s.tdDark)}}>{v??"-"}</td>)}</tr>})}{!rows.length&&<tr><td style={{...s.td,...s.tdDark}} colSpan={headers.length}>Geen gegevens.</td></tr>}</tbody></table></div>}
function fmt(v:any){return v?new Date(v).toLocaleString("nl-NL"):"-"}
function calcAge(v:any){
 const birth=new Date(v);
 if(!v||Number.isNaN(birth.getTime()))return "-";
 const today=new Date();
 let age=today.getFullYear()-birth.getFullYear();
 const month=today.getMonth()-birth.getMonth();
 if(month<0||(month===0&&today.getDate()<birth.getDate()))age--;
 return age;
}
const s:any={
page:{minHeight:"100vh",background:"radial-gradient(circle at 50% -10%,rgba(255,77,0,.16),transparent 34%),linear-gradient(180deg,#060708 0%,#0b0f13 48%,#050607 100%)",color:"white",padding:20},
wrap:{maxWidth:1460,margin:"0 auto"},
hero:{position:"relative",overflow:"hidden",marginBottom:16,border:"1px solid #4a5057",borderTop:"3px solid #ff4d00",background:"linear-gradient(145deg,#1b2026 0%,#0b0e12 55%,#15191e 100%)",boxShadow:"0 16px 34px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.05)"},
heroGlow:{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 10%,rgba(255,77,0,.14),transparent 24%)"},
heroTop:{position:"relative",display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:14,padding:"10px 14px",borderBottom:"1px solid #353b42"},
logoWrap:{display:"flex",justifyContent:"center",alignItems:"center",height:92,minWidth:760},
logo:{height:86,width:760,maxWidth:"64vw",objectFit:"contain",filter:"drop-shadow(0 8px 14px rgba(0,0,0,.7)) drop-shadow(0 0 12px rgba(255,77,0,.12))"},
heroBottom:{position:"relative",display:"flex",justifyContent:"center",alignItems:"center",gap:20,padding:"18px 18px 20px"},
 heroIdentity:{display:"grid",justifyItems:"center",textAlign:"center",gap:8,width:"100%"},
eyebrow:{fontSize:10,fontWeight:900,letterSpacing:2.4,color:"#ffffff",marginBottom:5},
title:{margin:0,fontSize:34,fontWeight:950,letterSpacing:.3,color:"#ff6a2a",textAlign:"center",textShadow:"0 4px 12px #000"},
identityStrip:{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"},
identityChip:{padding:"6px 9px",border:"1px solid #6b3018",background:"#22120b",color:"#ffffff",fontSize:12,fontWeight:850},
silver:{display:"inline-flex",gap:7,alignItems:"center",justifyContent:"center",height:38,padding:"0 13px",background:"linear-gradient(#fff,#c7c7c7)",color:"#111",border:"1px solid #aaa",fontWeight:900,cursor:"pointer",boxShadow:"inset 0 1px 0 #fff,0 4px 10px rgba(0,0,0,.28)"},
orange:{color:"#ff6c2c",fontWeight:800},
summary:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,marginBottom:16},
card:{border:"1px solid #555d65",borderTop:"3px solid #ff4d00",background:"linear-gradient(180deg,#1c2228,#0d1115)",padding:"13px 15px",boxShadow:"0 8px 18px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.04)"},
cardTitle:{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:"#a6adb4",marginBottom:6},
section:{border:"1px solid #3f464d",borderLeft:"3px solid #ff4d00",background:"linear-gradient(180deg,#151a1f,#0a0d10)",padding:16,marginBottom:14,boxShadow:"0 10px 24px rgba(0,0,0,.24)"},
grid:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:9},
field:{display:"grid",gap:4,padding:"9px 10px",background:"#0d1115",border:"1px solid #30363d",minHeight:54},
fieldWide:{gridColumn:"span 2",minHeight:72},
 fieldFull:{gridColumn:"1 / -1",minHeight:72},
muted:{fontSize:10,color:"#9199a2",textTransform:"uppercase",letterSpacing:.5},
table:{width:"100%",borderCollapse:"collapse",fontSize:13},
th:{textAlign:"left",padding:"9px 10px",borderBottom:"2px solid #ff4d00",background:"#20262c",color:"#f3f3f3",whiteSpace:"nowrap"},
td:{padding:"9px 10px",borderBottom:"1px solid #31373d",verticalAlign:"top"},
tdDark:{background:"#11161a",color:"#f3f3f3"},
tdLight:{background:"#ececec",color:"#111"}
};
