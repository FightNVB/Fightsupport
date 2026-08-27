"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";

export default function FighterDossierPage(){
 const params=useParams<{matchmakingId?:string;fighterId?:string}>();
 const fighterId=String(params?.fighterId??"").trim();
 const matchmakingId=String(params?.matchmakingId??"").trim();
 const router=useRouter();
 const [data,setData]=useState<any>(null);
 const [eventDate,setEventDate]=useState<string|null>(null);
 const [meldingen,setMeldingen]=useState<any[]>([]);
 const [savingReviewId,setSavingReviewId]=useState<string|number|null>(null);
 const [error,setError]=useState("");
 async function load(){
  if(!matchmakingId||!fighterId){setError("Matchmaking of vechter ontbreekt.");return;}

  const resolvedVa=String(fighterId).replace(/\D/g,"");
  if(!resolvedVa){setError("Geen geldig VA-nummer ontvangen.");return;}

  const {data:meldingRows,error:meldingError}=await supabase
   .from("matchmaker_fighter_resultaten")
   .select("id,controle_run_id,inschrijving_id,fighter_id,va_nummer,rule,rule_code,resultaat,severity,boodschap,review_status")
   .eq("matchmaking_id",matchmakingId)
   .eq("va_nummer",resolvedVa)
   .order("created_at",{ascending:true});
  if(meldingError){
   console.warn("Meldingen laden mislukt",meldingError.message);
   setMeldingen([]);
  }else{
   setMeldingen(dedupeRules(meldingRows??[]));
  }

  const r=await authedFetch(`/api/admin/fightpassport-beheer/fighters/${resolvedVa}`);
  const j=await r.json().catch(()=>({}));
  if(!r.ok){setError(j.error||"Laden mislukt");return;}
  setData(j);

  const {data:matchRows}=await supabase
   .from("matchmakings")
   .select("datum")
   .eq("id",matchmakingId)
   .limit(1);
  setEventDate(matchRows?.[0]?.datum??null);
 }
 useEffect(()=>{load()},[fighterId,matchmakingId]); if(error)return <main style={s.page}><button style={s.silver} onClick={()=>router.push(`/dashboard/admin/controle/${matchmakingId}`)}>Terug</button><p>{error}</p></main>; if(!data)return <main style={s.page}>Dossier laden...</main>;
 async function reviewMelding(melding:any,decision:"approve"|"reject"){
  let note:string|null=null;
  if(decision==="reject"){
   note=window.prompt("Waarom keur je deze melding af?")?.trim()||null;
   if(!note)return;
  }
  setSavingReviewId(melding.id??`${melding.rule_code||melding.rule}-${decision}`);
  try{
   const res=await authedFetch("/api/control-engine/review",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
     controle_resultaat_id:melding.id,
     decision,
     note,
     matchmaking_id:matchmakingId,
     controle_run_id:melding.controle_run_id||undefined,
     va_nummer:data?.fighter?.va_nummer||undefined,
     fighter_id:melding.fighter_id||undefined,
     rule_code:melding.rule_code||undefined,
     rule:melding.rule||undefined
    })
   });
   const json=await res.json().catch(()=>null);
   if(!res.ok)throw new Error(json?.error||`Review mislukt (${res.status})`);
   await load();
  }catch(err:any){
   alert(err?.message||"Review mislukt.");
  }finally{
   setSavingReviewId(null);
  }
 }
 const f=data.fighter;
 const resultRows=Array.isArray(data.results)?data.results:[];
 const record=resultRows.reduce((acc:any,r:any)=>{
  const u=String(r?.uitslag||"").trim().toLowerCase();
  if(/win|winst|gewonnen|wint/.test(u))acc.w++;
  else if(/loss|verlies|verloren|verliest/.test(u))acc.v++;
  else if(/draw|onbeslist|gelijk/.test(u))acc.o++;
  return acc;
 },{w:0,v:0,o:0});
 return <main style={s.page} className="fighter-dossier-page"><div style={s.wrap}>
  <style>{`
   .fighter-data-table thead th{background:#111!important;color:#fff!important;border-bottom:2px solid #ff4d00!important}
   .fighter-data-table tbody td{background:#fff!important;color:#111!important;border-bottom:1px solid #d3d6d9!important}
   .fighter-data-table tbody tr:nth-child(even) td{background:#f3f0ed!important}
   @media(max-width:760px){.fighter-dossier-page{padding:0!important}.fighter-dossier-hero{min-height:0!important;aspect-ratio:auto!important}.fighter-dossier-hero-image{position:relative!important;width:100%!important;height:auto!important;object-fit:contain!important}.fighter-desktop-overlay{display:none!important}.fighter-mobile-summary{display:block!important}.fighter-grid{grid-template-columns:1fr!important}}
  `}</style>
  <header style={s.hero} className="fighter-dossier-hero">
   <img src="/branding/fightsupport/fighter-hero.png" alt="" aria-hidden="true" style={s.heroImage} className="fighter-dossier-hero-image"/>
   <div style={s.heroShade}/>
   <div style={s.heroToolbar}>
    <button style={s.glassButton} onClick={()=>router.push(`/dashboard/admin/controle/${matchmakingId}`)}><ArrowLeft size={16}/>Terug</button>
    <button style={s.glassButton} onClick={load}><RefreshCw size={16}/>Hercheck</button>
   </div>
   <div style={s.fighterNameBlock} className="fighter-desktop-overlay">
    <div style={s.fighterName}>{f.naam||"Onbekende vechter"}</div>
    <div style={s.fighterGym}>{(data.sportscholen||data.gyms||[])[0]?.naam||(data.sportscholen||data.gyms||[])[0]?.organisatie_naam||""}</div>
   </div>
   <div style={s.heroIdentityValues} className="fighter-desktop-overlay">
    <div>{f.va_nummer||"-"}</div><div>{f.primary_discipline||f.nulmeting_discipline||"-"}</div><div>{f.mma_level||f.berekende_klasse||f.nulmeting_klasse||"-"}</div><div>{f.geslacht||"-"}</div>
   </div>
   <div style={s.heroStatusGrid} className="fighter-desktop-overlay">
    <HeroStatus title={f.heeft_startverbod?"STARTVERBOD":"FIT TO FIGHT"} value={f.heeft_startverbod?"Actief startverbod":"Geen actief startverbod"} tone={f.heeft_startverbod?"danger":"ok"}/>
    <HeroStatus title="LICENTIE" value={f.licentie_actief?"Geldig":"Geen geldige licentie"} tone={f.licentie_actief?"ok":"danger"}/>
    <HeroStatus title="WEDSTRIJDEN" value={`${f.totaal_wedstrijden??data.results.length} totaal · ${record.w}-${record.v}-${record.o}`} tone="info"/>
    <HeroStatus title="EVENTDATUM" value={eventDate?new Date(eventDate).toLocaleDateString("nl-NL"):"-"} tone="neutral"/>
   </div>
  </header>
  <div className="fighter-mobile-summary" style={s.mobileSummary}>
   <h1 style={s.mobileName}>{f.naam||"Onbekende vechter"}</h1>
   <div style={s.mobileGym}>{(data.sportscholen||data.gyms||[])[0]?.naam||(data.sportscholen||data.gyms||[])[0]?.organisatie_naam||""}</div>
   <div style={s.mobileGrid}><MobileField label="VA-nummer" value={f.va_nummer||"-"}/><MobileField label="Discipline" value={f.primary_discipline||f.nulmeting_discipline||"-"}/><MobileField label="Klasse" value={f.mma_level||f.berekende_klasse||f.nulmeting_klasse||"-"}/><MobileField label="Geslacht" value={f.geslacht||"-"}/></div>
  </div>
 <Section title="Profiel & contact"><Grid rows={[["Naam",f.naam],["E-mail",f.email],["Geboortedatum",f.geboortedatum],["Geslacht",f.geslacht]]}/></Section>
 <Section title="Nulmeting & klasse"><Grid rows={[["Discipline",f.nulmeting_discipline],["Nulmeting klasse",f.nulmeting_klasse],["Berekende klasse",f.berekende_klasse],["MMA niveau",f.mma_level],["Leeftijd",calcAge(f.geboortedatum,eventDate)],["Gewicht",f.nulmeting_gewicht],["Aantal wedstrijden toegevoegd",f.nulmeting_totaal],["W / V / O",`${record.w} / ${record.v} / ${record.o}`],["Opmerking",f.nulmeting_opmerking,"full"]]}/></Section>
 <Section title={`Sportscholen (${(data.sportscholen||data.gyms||[]).length})`}><Table headers={["Sportschool","Plaats","Land","Sportschool ID","Laatste synchronisatie"]} rows={(data.sportscholen||data.gyms||[]).map((r:any)=>[r.naam||r.organisatie_naam,r.plaats,r.land,r.sportschool_id||r.organisatie_id||"-",fmt(r.last_team_sync_at||r.last_seen_at)])}/></Section>
 <Section title={`Wedstrijdhistorie (${data.results.length})`}><Table headers={["Datum","Evenement","Discipline","Klasse","Tegenstander","Sportschool","Uitslag"]} rows={data.results.map((r:any)=>[r.datum,r.evenement,r.discipline,r.klasse,r.tegenstander,r.sportschool,r.uitslag])}/></Section>
 <Section title={`Meldingen (${meldingen.length})`}>
  <div style={s.noticeList}>
   {meldingen.length?meldingen.map((m:any,i:number)=>{
    const level=mapResultLevel(m.severity,m.resultaat);
    return <div key={m.id??i} style={{...s.notice,...noticeStyle(level)}}>
     <div style={s.noticeIcon}>{level==="ok"?<CheckCircle2 size={20}/>:<AlertTriangle size={20}/>}</div>
     <div style={s.noticeBody}>
      <div style={s.noticeTitle}>{m.rule||m.rule_code||"Melding"}</div>
      <div style={s.noticeMessage}>{m.boodschap||"Geen toelichting."}</div>
      <div style={s.noticeMeta}>{m.resultaat||"-"}{m.review_status?` · review: ${m.review_status}`:""}</div>
      <div style={s.noticeActions}>
       <button type="button" style={s.approve} onClick={()=>reviewMelding(m,"approve")} disabled={savingReviewId===m.id||String(m.review_status??"").toLowerCase()==="goedgekeurd"}>
        {savingReviewId===m.id?"Bezig...":"Goedkeuren"}
       </button>
       <button type="button" style={s.reject} onClick={()=>reviewMelding(m,"reject")} disabled={savingReviewId===m.id}>Afkeuren</button>
      </div>
     </div>
    </div>
   }):<div style={{...s.notice,...noticeStyle("ok")}}>
    <div style={s.noticeIcon}><CheckCircle2 size={20}/></div>
    <div style={s.noticeBody}><div style={s.noticeTitle}>Geen meldingen gevonden.</div></div>
   </div>}
  </div>
 </Section>
 {Array.isArray(data.startbans)&&data.startbans.length>0&&<Section title={`Startverboden (${data.startbans.length})`}><Table headers={["Soort","Ingang","Einde","Actief","Reden","Evenement"]} rows={data.startbans.map((r:any)=>[r.soort,r.ingang,r.einde,r.actief?"Ja":"Nee",r.reden,r.evenement])}/></Section>}
 </div></main>
}
function HeroStatus({title,value,tone="neutral"}:any){const color=tone==="danger"?"#ff6b57":tone==="ok"?"#a8e0b5":tone==="info"?"#ffd0ad":"#f1f3f5";return <div style={s.heroStatusCard}><div><div style={s.heroStatusTitle}>{title}</div><div style={{...s.heroStatusValue,color}}>{value||"-"}</div></div></div>}
function MobileField({label,value}:any){return <div style={s.mobileField}><span style={s.mobileLabel}>{label}</span><b>{value||"-"}</b></div>}
function mapResultLevel(severity:any,resultaat:any){
 const sev=String(severity??"").trim().toLowerCase();
 const res=String(resultaat??"").trim().toLowerCase();
 if(sev==="error"||res.includes("verbod")||res.includes("afkeur"))return "error";
 if(sev==="warning"||res.includes("dispensatie")||res.includes("actie")||res.includes("let"))return "warn";
 if(sev==="info"||res.includes("info"))return "info";
 return "ok";
}
function dedupeRules(rows:any[]){
 const seen=new Set<string>();
 return rows.filter((row:any)=>{
  const key=[row.rule,row.rule_code,row.resultaat,row.boodschap].map((x:any)=>String(x??"").trim().toLowerCase()).join("|");
  if(seen.has(key))return false;
  seen.add(key);
  return true;
 });
}
function noticeStyle(level:string){
 if(level==="error")return {borderColor:"#b84a42",background:"#25100f",color:"#ffd2ce"};
 if(level==="warn")return {borderColor:"#b65b2d",background:"#25170f",color:"#ffd7c2"};
 if(level==="info")return {borderColor:"#526d86",background:"#101820",color:"#d5e9ff"};
 return {borderColor:"#437353",background:"#102016",color:"#d8ffe3"};
}
function Card({title,value,danger}:any){return <div style={s.card}><div style={s.cardTitle}>{title}</div><div style={{fontSize:18,fontWeight:900,color:danger?"#ff654d":"#eee"}}>{value}</div></div>}
function Section({title,children}:any){return <section style={s.section}><h2 style={{margin:"0 0 14px",color:"#ff7440"}}>{title}</h2>{children}</section>}
function Grid({rows}:any){return <div style={s.grid} className="fighter-grid">{rows.map((r:any,i:number)=><div key={i} style={{...s.field,...(r[2]==="wide"?s.fieldWide:{}),...(r[2]==="full"?s.fieldFull:{})}}><span style={s.muted}>{r[0]}</span><b style={{wordBreak:"break-word",lineHeight:1.35}}>{r[1]??"-"}</b></div>)}</div>}
function Table({headers,rows}:any){return <div style={{overflowX:"auto",border:"1px solid #444b52"}}><table style={s.table} className="fighter-data-table"><thead><tr>{headers.map((h:any)=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{rows.map((r:any,i:number)=>{const light=i%2===1;return <tr key={i}>{r.map((v:any,j:number)=><td key={j} style={{...s.td,...(light?s.tdLight:s.tdDark)}}>{v??"-"}</td>)}</tr>})}{!rows.length&&<tr><td style={{...s.td,...s.tdDark}} colSpan={headers.length}>Geen gegevens.</td></tr>}</tbody></table></div>}
function fmt(v:any){return v?new Date(v).toLocaleString("nl-NL"):"-"}
function calcAge(v:any,at:any){
 const birth=new Date(v);
 const event=new Date(at);
 if(!v||!at||Number.isNaN(birth.getTime())||Number.isNaN(event.getTime()))return "-";
 let age=event.getFullYear()-birth.getFullYear();
 const month=event.getMonth()-birth.getMonth();
 if(month<0||(month===0&&event.getDate()<birth.getDate()))age--;
 return age;
}
const s:any={
page:{minHeight:"100vh",background:"linear-gradient(180deg,#24282c 0%,#30353a 45%,#1d2023 100%)",color:"#f3f4f5",padding:18},
wrap:{maxWidth:1560,margin:"0 auto"},
hero:{position:"relative",overflow:"hidden",aspectRatio:"16 / 10",minHeight:650,maxHeight:940,marginBottom:18,border:"1px solid #9da3a8",background:"#111",boxShadow:"0 18px 42px rgba(20,24,28,.24),0 2px 8px rgba(0,0,0,.18)"},
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
noticeList:{display:"grid",gap:9},
notice:{display:"flex",alignItems:"flex-start",gap:10,border:"1px solid",borderLeftWidth:3,padding:"11px 12px",boxShadow:"0 7px 16px rgba(0,0,0,.22)"},
noticeIcon:{display:"flex",flex:"0 0 auto",paddingTop:1},
noticeBody:{minWidth:0,flex:1},
noticeTitle:{fontSize:12,fontWeight:950,textTransform:"uppercase",letterSpacing:.7},
noticeMessage:{marginTop:5,fontSize:13,fontWeight:650,lineHeight:1.4},
noticeMeta:{marginTop:7,fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:.5,opacity:.78},
noticeActions:{display:"flex",flexWrap:"wrap",gap:8,marginTop:10},
approve:{height:32,padding:"0 11px",border:"1px solid #59a66f",background:"linear-gradient(#267b43,#124725)",color:"#fff",fontSize:11,fontWeight:900,cursor:"pointer"},
reject:{height:32,padding:"0 11px",border:"1px solid #c25a54",background:"linear-gradient(#a72620,#57120f)",color:"#fff",fontSize:11,fontWeight:900,cursor:"pointer"},
table:{width:"100%",borderCollapse:"collapse",fontSize:13},
th:{textAlign:"left",padding:"9px 10px",borderBottom:"2px solid #ff4d00",background:"#20262c",color:"#f3f3f3",whiteSpace:"nowrap"},
td:{padding:"9px 10px",borderBottom:"1px solid #31373d",verticalAlign:"top"},
tdDark:{background:"#11161a",color:"#f3f3f3"},
tdLight:{background:"#ececec",color:"#111"},
heroImage:{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"},
heroShade:{position:"absolute",inset:0,pointerEvents:"none",background:"linear-gradient(180deg,rgba(0,0,0,.08),transparent 28%,transparent 72%,rgba(0,0,0,.18))"},
heroToolbar:{position:"absolute",zIndex:4,top:18,right:20,display:"flex",gap:9},
glassButton:{display:"inline-flex",gap:7,alignItems:"center",justifyContent:"center",height:38,padding:"0 13px",color:"#fff",background:"rgba(10,12,14,.72)",border:"1px solid rgba(255,255,255,.42)",backdropFilter:"blur(8px)",fontWeight:900,cursor:"pointer",boxShadow:"0 5px 16px rgba(0,0,0,.3)"},
fighterNameBlock:{position:"absolute",zIndex:3,left:"4.2%",top:"31%",width:"41%",textShadow:"0 4px 14px #000"},fighterName:{color:"#fff",fontSize:"clamp(30px,3.25vw,58px)",lineHeight:.98,fontWeight:950,letterSpacing:.3,textTransform:"uppercase"},fighterGym:{marginTop:10,color:"#ff641f",fontSize:"clamp(13px,1.15vw,20px)",fontWeight:900,letterSpacing:1.4,textTransform:"uppercase"},
heroIdentityValues:{position:"absolute",zIndex:3,left:"6.8%",bottom:"27.2%",width:"45.5%",display:"grid",gridTemplateColumns:"1.08fr 1.28fr .9fr .95fr",gap:10,color:"#fff",fontSize:"clamp(11px,.92vw,16px)",fontWeight:900,textTransform:"uppercase",textShadow:"0 2px 7px #000"},
heroStatusGrid:{position:"absolute",zIndex:3,left:"3.35%",right:"5.2%",bottom:"9.6%",height:"13.8%",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"1.35%"},heroStatusCard:{minWidth:0,display:"flex",alignItems:"center",padding:"10px 12px 10px 76px"},heroStatusTitle:{color:"#fff",fontSize:"clamp(9px,.75vw,12px)",fontWeight:950,letterSpacing:1.1,textShadow:"0 2px 5px #000"},heroStatusValue:{marginTop:4,fontSize:"clamp(10px,.82vw,13px)",lineHeight:1.25,fontWeight:850,textShadow:"0 2px 5px #000"},
mobileSummary:{display:"none",margin:"0 10px 12px",padding:14,background:"linear-gradient(145deg,#33383d,#262b2f)",border:"1px solid #555d64",borderTop:"3px solid #ff4d00"},mobileName:{margin:0,fontSize:26,textTransform:"uppercase"},mobileGym:{marginTop:7,color:"#ff6a2a",fontWeight:900,textTransform:"uppercase"},mobileGrid:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:14},mobileField:{padding:10,background:"#3a4045",border:"1px solid #596168"},mobileLabel:{display:"block",color:"#aeb6bd",fontSize:9,fontWeight:850,textTransform:"uppercase",marginBottom:4},
};
