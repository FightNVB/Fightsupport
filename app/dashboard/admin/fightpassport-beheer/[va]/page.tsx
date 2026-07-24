"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";


function getResultKind(v?: string | null): "win" | "loss" | "draw" | "other" {
  const x = String(v ?? "").trim().toLowerCase();

  if (x.includes("onbeslist") || x.includes("draw") || x.includes("gelijk")) return "draw";
  if (x.includes("verlies") || x.includes("verliest") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("winst") || x.includes("wint") || x.includes("gewonnen") || x === "win" || x === "w") return "win";

  return "other";
}

function normalizeClassToken(v?: string | null) {
  const x = String(v ?? "").trim().toLowerCase();
  if (!x) return "";

  if (x.includes("jeugd") || x.includes("youth") || /^j(\b|\s|\/|-)/i.test(x) || x === "j") return "j";
  if (x.includes("recreant") || /^r(\b|\s|\/|-)/i.test(x) || x === "r") return "r";
  if (x.includes("nieuweling") || /^n(\b|\s|\/|-)/i.test(x) || x === "n") return "n";
  if (x.includes("c-klasse") || x.includes("c klasse") || /^c(\b|\s|\/|-)/i.test(x) || x === "c") return "c";
  if (x.includes("b-klasse") || x.includes("b klasse") || /^b(\b|\s|\/|-)/i.test(x) || x === "b") return "b";
  if (x.includes("a-klasse") || x.includes("a klasse") || x.includes("elite") || /^a(\b|\s|\/|-)/i.test(x) || x === "a") return "a";

  return x.replace(/[^a-z0-9+]/g, "");
}

function classRank(token?: string | null) {
  const t = normalizeClassToken(token);
  const order: Record<string, number> = { j: 1, r: 2, n: 3, c: 4, b: 5, a: 6 };
  return order[t] ?? 0;
}

function highestRecordClass(rows: any[]) {
  let best = "";
  let bestRank = 0;

  for (const row of rows) {
    const token = normalizeClassToken(row?.klasse);
    const rank = classRank(token);
    if (rank > bestRank) {
      best = token;
      bestRank = rank;
    }
  }

  return best;
}

function recordStatsFromUitslagen(rows: any[]) {
  const hoogsteKlasse = highestRecordClass(rows);

  return rows.reduce(
    (acc, row) => {
      const kind = getResultKind(row?.uitslag);
      const rowKlasse = normalizeClassToken(row?.klasse);

      if (!hoogsteKlasse || rowKlasse !== hoogsteKlasse || kind === "other") {
        acc.other += 1;
        return acc;
      }

      if (kind === "win") acc.w += 1;
      else if (kind === "loss") acc.l += 1;
      else if (kind === "draw") acc.d += 1;
      else acc.other += 1;

      return acc;
    },
    { w: 0, l: 0, d: 0, other: 0 },
  );
}

export default function FighterDossierPage(){
 const {va}=useParams<{va:string}>(); const router=useRouter(); const [data,setData]=useState<any>(null); const [error,setError]=useState(""); const [rescraping,setRescraping]=useState(false); const [message,setMessage]=useState("");
 async function load(){const r=await authedFetch(`/api/admin/fightpassport-beheer/fighters/${va}`);const j=await r.json().catch(()=>({}));if(r.ok){setData(j);setError("");return j;}setError(j.error||"Laden mislukt");return null;}
 async function rescrape(){
   if(rescraping)return;
   setRescraping(true);
   setMessage("");
   const previousSync=data?.fighter?.last_scraped_at||null;
   const r=await authedFetch(`/api/admin/fightpassport-beheer/fighters/${va}/rescrape`,{method:"POST"});
   const j=await r.json().catch(()=>({}));
   if(!r.ok){setRescraping(false);setMessage(j.error||"Hercontrole starten mislukt.");return;}
   setMessage(j.message||`Hercontrole voor VA ${va} gestart.`);
   const startedAt=Date.now();
   while(Date.now()-startedAt<10*60*1000){
     await new Promise(resolve=>setTimeout(resolve,3000));
     const fresh=await load();
     const nextSync=fresh?.fighter?.last_scraped_at||null;
     if(nextSync&&nextSync!==previousSync){
       setMessage("Hercontrole afgerond. Dossier is bijgewerkt.");
       setRescraping(false);
       return;
     }
   }
   await load();
   setMessage("Hercontrole draait mogelijk nog. Het dossier is opnieuw geladen.");
   setRescraping(false);
 }
 useEffect(()=>{load()},[va]); if(error)return <main style={s.page}><button style={s.silver} onClick={()=>router.back()}>Terug</button><p>{error}</p></main>; if(!data)return <main style={s.page}>Dossier laden...</main>;
 const f=data.fighter;
 const results=Array.isArray(data.results)?data.results:[];
 const recordStats=recordStatsFromUitslagen(results);
 const record=`${recordStats.w}-${recordStats.l}-${recordStats.d}${recordStats.other>0?` (${recordStats.other} overige)`:""}`;
 return <main style={s.page}><div style={s.wrap}>
  <header style={s.hero}>
    <div style={s.heroGlow}/>
    <div style={s.heroTop}>
      <button style={s.silver} onClick={()=>router.push('/dashboard/admin/fightpassport-beheer')}><ArrowLeft size={16}/>FightPaspoort Beheer</button>
      <div style={s.logoWrap}>
        <img src="/branding/fightsupport/excel-logo.png" alt="FightSupport" style={s.logo}/>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end"}}><button style={s.silver} disabled={rescraping} onClick={rescrape}><Play size={16}/>{rescraping?"Hercontrole bezig...":"Hercontrole"}</button></div>
    </div>
    <div style={s.heroBottom}>
      <div style={s.heroIdentity}>
        <div style={s.eyebrow}>VECHTERDOSSIER</div>
        <div style={s.titleRow}>
          <h1 style={s.title}>{f.naam||"Onbekende vechter"}</h1>
          {f.heeft_startverbod&&<span style={s.banSign} title="Actief startverbod"><span style={s.banBar}/></span>}
        </div>
        <div style={s.identityStrip}>
          <span style={s.identityChip}><b>VA</b> {f.va_nummer}</span>
          <span style={s.identityChip}>{f.primary_discipline||f.nulmeting_discipline||"Discipline onbekend"}</span>
          <span style={s.identityChip}>{f.mma_level||f.berekende_klasse||f.nulmeting_klasse||"Klasse onbekend"}</span>
          <span style={s.identityChip}><b>Laatste sync</b> {fmt(f.last_scraped_at)}</span>
        </div>
      </div>
    </div>
  </header>
 {message&&<div style={{marginBottom:14,padding:"10px 12px",border:"1px solid #6b747d",background:"#11161a",color:"#e9edf0",fontWeight:800}}>{message}</div>}
 <div style={s.summary}><Card title="Licentie" value={f.licentie_actief?"Geldig":"Geen geldige licentie"}/><Card title="Status" value={f.heeft_startverbod?"STARTVERBOD":"Fit to fight"} danger={f.heeft_startverbod}/><Card title="Wedstrijden" value={`${f.totaal_wedstrijden??data.results.length} totaal · ${f.gewonnen??"?"} gewonnen`}/><Card title="Doping" value={data.doping?.status||"Geen status"}/></div>
 <Section title="Profiel & contact"><Grid rows={[["Naam",f.naam],["E-mail",f.email],["Geboortedatum",formatBirthDate(f.geboortedatum)],["Geslacht",f.geslacht]]}/></Section>
 <Section title="Nulmeting & klasse"><Grid rows={[["Discipline",f.nulmeting_discipline],["Nulmeting klasse",f.nulmeting_klasse],["Berekende klasse",f.berekende_klasse],["MMA niveau",f.mma_level],["Gewicht",f.nulmeting_gewicht],["Aantal wedstrijden",f.nulmeting_totaal],["Record hoogste klasse",record],["Leeftijd",calculateAge(f.geboortedatum)],["Opmerking",f.nulmeting_opmerking,"full"]]}/></Section>
 <Section title={`Wedstrijdhistorie (${data.results.length})`}><Table headers={["Datum","Evenement","Discipline","Klasse","Tegenstander","Sportschool","Uitslag"]} rows={data.results.map((r:any)=>[r.datum,r.evenement,r.discipline,r.klasse,r.tegenstander,r.sportschool,r.uitslag])}/></Section>
  <Section title={`Sportscholen (${(data.sportscholen||[]).length})`}><Table headers={["Sportschool","Plaats","Land","Keurmerk","Keurmerk geldig tot"]} rows={(data.sportscholen||[]).map((r:any)=>{
    const land=String(r.land||"").trim().toLowerCase();
    const nederlands=land==="nederland"||land==="netherlands"||land==="the netherlands";
    const einde=r.keurmerk_einde?new Date(r.keurmerk_einde):null;
    const geldig=!!einde&&!Number.isNaN(einde.getTime())&&einde.getTime()>=new Date().setHours(0,0,0,0);
    return [
      r.naam||r.organisatie_naam,
      r.plaats,
      r.land,
      nederlands?(geldig?"Ja":"Nee"):"Niet vereist",
      nederlands&&einde?einde.toLocaleDateString("nl-NL"):"-"
    ];
  })}/></Section>
 {Array.isArray(data.startbans)&&data.startbans.length>0&&<Section title={`Startverboden (${data.startbans.length})`}><Table headers={["Soort","Ingang","Einde","Actief","Reden","Evenement"]} rows={data.startbans.map((r:any)=>[r.soort,r.ingang,r.einde,r.actief?"Ja":"Nee",r.reden,r.evenement])}/></Section>}
 <Section title="Dopingeducatie"><Grid rows={[["Status",data.doping?.status||"Niet gestart"],["Uitgenodigd",fmt(data.doping?.invited_at)],["Certificaat",data.doping?.certificate_status||"Niet ontvangen"],["FightPaspoort verwerkt",data.doping?.fightpassport_processed?"Ja":"Nee"]]}/></Section>
 </div></main>
}
function Card({title,value,danger}:any){return <div style={s.card}><div style={s.cardTitle}>{title}</div><div style={{fontSize:18,fontWeight:900,color:danger?"#ff654d":"#eee"}}>{value}</div></div>}
function Section({title,children}:any){return <section style={s.section}><h2 style={{margin:"0 0 14px",color:"#ff7440"}}>{title}</h2>{children}</section>}
function Grid({rows}:any){return <div style={s.grid}>{rows.map((r:any,i:number)=><div key={i} style={{...s.field,...(r[2]==="wide"?s.fieldWide:{}),...(r[2]==="full"?s.fieldFull:{})}}><span style={s.muted}>{r[0]}</span><b style={{wordBreak:"break-word",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{r[1]??"-"}</b></div>)}</div>}
function Table({headers,rows}:any){return <div style={{overflowX:"auto",border:"1px solid #444b52"}}><table style={s.table}><thead><tr>{headers.map((h:any)=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{rows.map((r:any,i:number)=>{const light=i%2===1;return <tr key={i}>{r.map((v:any,j:number)=><td key={j} style={{...s.td,...(light?s.tdLight:s.tdDark)}}>{v??"-"}</td>)}</tr>})}{!rows.length&&<tr><td style={{...s.td,...s.tdDark}} colSpan={headers.length}>Geen gegevens.</td></tr>}</tbody></table></div>}
function formatBirthDate(v:any){
 if(!v)return "-";
 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
 return m?`${m[3]}-${m[2]}-${m[1]}`:String(v);
}
function calculateAge(v:any){
 if(!v)return "-";
 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(!m)return "-";
 const birth=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
 const now=new Date();
 let age=now.getFullYear()-birth.getFullYear();
 if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;
 return `${age} jaar`;
}
function fmt(v:any){return v?new Date(v).toLocaleString("nl-NL"):"-"}
const s:any={
page:{minHeight:"100vh",background:"radial-gradient(circle at 50% -10%,rgba(255,77,0,.16),transparent 34%),linear-gradient(180deg,#060708 0%,#0b0f13 48%,#050607 100%)",color:"white",padding:20},
wrap:{maxWidth:1460,margin:"0 auto"},
hero:{position:"relative",overflow:"hidden",marginBottom:16,border:"2px solid #aeb4ba",borderTop:"4px solid #dfe3e6",background:"linear-gradient(145deg,#23282d 0%,#0b0e12 48%,#171b20 100%)",boxShadow:"0 0 0 1px #4a5057,0 16px 34px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.16)"},
heroGlow:{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 0%,rgba(255,255,255,.10),transparent 24%),radial-gradient(circle at 50% 65%,rgba(255,77,0,.07),transparent 30%)"},
heroTop:{position:"relative",display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:14,padding:"10px 14px",borderBottom:"1px solid #727980",background:"linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.01))"},
logoWrap:{display:"flex",justifyContent:"center",alignItems:"center",height:68,minWidth:360},
logo:{height:64,width:"auto",maxWidth:520,objectFit:"contain",filter:"drop-shadow(0 8px 14px rgba(0,0,0,.7)) drop-shadow(0 0 12px rgba(255,77,0,.12))"},
heroBottom:{position:"relative",display:"flex",justifyContent:"center",alignItems:"center",gap:20,padding:"18px 18px 20px"},
 heroIdentity:{display:"grid",justifyItems:"center",textAlign:"center",gap:8,width:"100%"},
 titleRow:{display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap"},
 banSign:{position:"relative",display:"inline-flex",width:34,height:34,borderRadius:"50%",background:"#d71920",border:"3px solid #fff",boxShadow:"0 0 0 2px #8b0f13,0 4px 10px rgba(0,0,0,.45)"},
 banBar:{position:"absolute",left:5,right:5,top:"50%",height:6,marginTop:-3,background:"#fff",borderRadius:3},
eyebrow:{fontSize:10,fontWeight:900,letterSpacing:2.4,color:"#c7cdd2",marginBottom:5,textShadow:"0 1px 0 #000"},
title:{margin:0,fontFamily:"Bebas Neue, Impact, Arial Narrow, sans-serif",fontSize:46,fontWeight:900,letterSpacing:1.2,color:"#ff6a2a",textAlign:"center",lineHeight:1,textShadow:"0 4px 12px #000"},
identityStrip:{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"},
identityChip:{padding:"6px 10px",border:"1px solid #7e868d",background:"linear-gradient(180deg,#2a2f34,#111519)",color:"#e8ebed",fontSize:12,fontWeight:850,boxShadow:"inset 0 1px 0 rgba(255,255,255,.10)"},
silver:{display:"inline-flex",gap:7,alignItems:"center",justifyContent:"center",height:38,padding:"0 13px",background:"linear-gradient(#fff,#c7c7c7)",color:"#111",border:"1px solid #aaa",fontWeight:900,cursor:"pointer",boxShadow:"inset 0 1px 0 #fff,0 4px 10px rgba(0,0,0,.28)"},
orange:{color:"#ff6c2c",fontWeight:800},
summary:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12,marginBottom:16},
card:{border:"1px solid #747b82",borderTop:"3px solid #cfd4d8",background:"linear-gradient(180deg,#20262b,#0d1115)",padding:"13px 15px",boxShadow:"0 8px 18px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.10)"},
cardTitle:{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:"#a6adb4",marginBottom:6},
section:{border:"1px solid #565e65",borderLeft:"3px solid #aeb4ba",background:"linear-gradient(180deg,#151a1f,#0a0d10)",padding:16,marginBottom:14,boxShadow:"0 10px 24px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.04)"},
grid:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:9},
field:{display:"grid",gap:4,padding:"9px 10px",background:"#0d1115",border:"1px solid #30363d",minHeight:54},
fieldWide:{gridColumn:"span 2",minHeight:72},
 fieldFull:{gridColumn:"1 / -1",minHeight:130,alignContent:"start"},
muted:{fontSize:10,color:"#9199a2",textTransform:"uppercase",letterSpacing:.5},
table:{width:"100%",borderCollapse:"collapse",fontSize:13},
th:{textAlign:"left",padding:"9px 10px",borderBottom:"2px solid #bfc5ca",background:"linear-gradient(180deg,#2a3036,#1c2227)",color:"#f3f3f3",whiteSpace:"nowrap"},
td:{padding:"9px 10px",borderBottom:"1px solid #31373d",verticalAlign:"top"},
tdDark:{background:"#11161a",color:"#f3f3f3"},
tdLight:{background:"#ececec",color:"#111"}
};
