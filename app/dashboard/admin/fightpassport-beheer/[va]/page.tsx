"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, RefreshCw, ShieldCheck, Trophy, Users } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

export default function FighterDossierPage(){
 const {va}=useParams<{va:string}>();
 const router=useRouter();
 const [data,setData]=useState<any>(null);
 const [error,setError]=useState("");
 const [hercheckBusy,setHercheckBusy]=useState(false);
 const [hercheckMessage,setHercheckMessage]=useState("");
 async function load(){
  const r=await authedFetch(`/api/admin/fightpassport-beheer/fighters/${va}`,{cache:"no-store"});
  const j=await r.json().catch(()=>({}));
  if(r.ok){setData(j);setError("");return j;}
  setError(j.error||"Laden mislukt");
  return null;
 }

 async function startHercheck(){
  if(hercheckBusy)return;

  setHercheckBusy(true);
  setHercheckMessage("");
  setError("");

  const r=await authedFetch(
   `/api/admin/fightpassport-beheer/fighters/${va}/rescrape`,
   {method:"POST"}
  );
  const j=await r.json().catch(()=>({}));

  if(!r.ok){
   setHercheckBusy(false);
   setHercheckMessage(j.error||"Hercheck starten mislukt.");
   return;
  }

  const previousScrapedAt=String(data?.fighter?.last_scraped_at||"");
  setHercheckMessage(j.message||`Herscrape voor VA ${va} is gestart.`);

  // De scraper draait op de achtergrond. Blijf het dossier controleren totdat
  // last_scraped_at verandert, zodat de pagina zichzelf direct na afronding vernieuwt.
  for(let attempt=1;attempt<=180;attempt++){
   await new Promise((resolve)=>window.setTimeout(resolve,3000));
   const latest=await load();
   const latestScrapedAt=String(latest?.fighter?.last_scraped_at||"");
   if(latestScrapedAt&&latestScrapedAt!==previousScrapedAt){
    router.refresh();
    setHercheckBusy(false);
    setHercheckMessage("Hercheck afgerond. Het dossier en gekoppelde contexten zijn vernieuwd.");
    return;
   }
   setHercheckMessage(`Hercheck loopt... controle ${attempt}/180`);
  }

  setHercheckBusy(false);
  setHercheckMessage("De hercheck draait mogelijk nog. Gebruik Hercheck opnieuw om de actuele stand op te halen.");
 }
 useEffect(()=>{load()},[va]); if(error)return <main style={s.page}><button style={s.silver} onClick={()=>router.back()}>Terug</button><p>{error}</p></main>; if(!data)return <main style={s.page}>Dossier laden...</main>;
 const f=data.fighter;
 const resultRows=Array.isArray(data.results)?data.results:[];
 const startverbodRows=Array.isArray(data.startverbod)?data.startverbod:[];
 const record=resultRows.reduce((acc:any,r:any)=>{
  const u=String(r?.uitslag||"").trim().toLowerCase();
  if(/win|winst|gewonnen|wint/.test(u))acc.w++;
  else if(/loss|verlies|verloren|verliest/.test(u))acc.v++;
  else if(/draw|onbeslist|gelijk/.test(u))acc.o++;
  return acc;
 },{w:0,v:0,o:0});
 const talentstatus=talentstatusFromFighter(f);
 return <main style={s.page} className="fighter-dossier-page">
  <style>{`
    .fighter-mobile-summary { display:none; }
    .fighter-white-field { background:#f1f2f3 !important; color:#111 !important; border-color:#c8cdd1 !important; }
    .fighter-white-field .fighter-field-label { color:#60676d !important; }
    .fighter-data-table thead th { background:#111 !important; color:#fff !important; border-bottom:2px solid #ff4d00 !important; }
    .fighter-data-table tbody td { background:#fff !important; color:#111 !important; border-bottom:1px solid #d3d6d9 !important; }
    .fighter-data-table tbody tr:nth-child(even) td { background:#f3f0ed !important; }
    .fighter-data-table tbody tr:hover td { background:#ffe1d2 !important; }
    @media (min-width:761px) and (max-width:1100px){
      .fighter-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}
      .fighter-dossier-hero{min-height:560px !important;}
    }
    @media (max-width:760px){
      .fighter-dossier-page{padding:0 !important;background:linear-gradient(180deg,#202428 0%,#2b3035 50%,#1b1e21 100%) !important;}
      .fighter-dossier-wrap{width:100% !important;max-width:100% !important;}
      .fighter-dossier-hero{min-height:0 !important;max-height:none !important;aspect-ratio:auto !important;margin-bottom:0 !important;border-left:0 !important;border-right:0 !important;}
      .fighter-dossier-hero-image{position:relative !important;inset:auto !important;width:100% !important;height:auto !important;display:block !important;object-fit:contain !important;}
      .fighter-desktop-overlay{display:none !important;}
      .fighter-dossier-toolbar{top:8px !important;right:8px !important;left:8px !important;justify-content:space-between !important;gap:8px !important;}
      .fighter-dossier-toolbar button{height:34px !important;padding:0 10px !important;font-size:12px !important;background:rgba(10,12,14,.84) !important;}
      .fighter-mobile-summary{display:block !important;margin:0 10px 12px !important;padding:14px !important;background:linear-gradient(145deg,#33383d,#262b2f) !important;border:1px solid #555d64 !important;border-top:3px solid #ff4d00 !important;}
      .fighter-mobile-name{margin:0 !important;color:#fff !important;font-size:26px !important;line-height:1 !important;font-weight:950 !important;text-transform:uppercase !important;}
      .fighter-mobile-gym{margin-top:7px !important;color:#ff6a2a !important;font-size:12px !important;font-weight:900 !important;letter-spacing:.8px !important;text-transform:uppercase !important;}
      .fighter-mobile-identity{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:8px !important;margin-top:14px !important;}
      .fighter-mobile-identity>div,.fighter-mobile-status{min-width:0 !important;padding:10px !important;background:#3a4045 !important;border:1px solid #596168 !important;}
      .fighter-mobile-label{display:block !important;color:#aeb6bd !important;font-size:9px !important;font-weight:850 !important;letter-spacing:.8px !important;text-transform:uppercase !important;margin-bottom:4px !important;}
      .fighter-mobile-value{display:block !important;color:#fff !important;font-size:13px !important;font-weight:900 !important;word-break:break-word !important;}
      .fighter-mobile-status-grid{display:grid !important;grid-template-columns:1fr !important;gap:8px !important;margin-top:8px !important;}
      .fighter-mobile-status{display:grid !important;grid-template-columns:32px minmax(0,1fr) !important;align-items:center !important;gap:10px !important;}
      .fighter-mobile-status-icon{color:#ff5a16 !important;display:grid !important;place-items:center !important;}
      .fighter-dossier-page section{margin-left:10px !important;margin-right:10px !important;padding:12px !important;}
      .fighter-grid{grid-template-columns:1fr !important;}
      .fighter-dossier-page table{min-width:760px !important;font-size:12px !important;}
      .fighter-dossier-page th,.fighter-dossier-page td{padding:8px !important;}
      .fighter-feedback{margin-left:10px !important;margin-right:10px !important;}
    }
  `}</style>
  <div style={s.wrap} className="fighter-dossier-wrap">
   <header style={s.hero} className="fighter-dossier-hero">
    <img src="/branding/fightsupport/fighter-hero.png" alt="" aria-hidden="true" style={s.heroImage} className="fighter-dossier-hero-image"/>
    <div style={s.heroShade}/>
    <div style={s.heroToolbar} className="fighter-dossier-toolbar">
      <button style={s.glassButton} onClick={()=>router.push('/dashboard/admin/fightpassport-beheer')}><ArrowLeft size={16}/>Beheer</button>
      <button style={s.glassButton} disabled={hercheckBusy} onClick={startHercheck}><RefreshCw size={16}/>{hercheckBusy?"Hercheck loopt...":"Hercheck"}</button>
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
      <HeroStatus title={talentstatus.jeugd?"TALENTSTATUS":"DOPINGCERTIFICAAT"} value={talentstatus.jeugd?(talentstatus.actief?"Talentstatus verdiend":"Niet gevonden"):(data.doping?.certificate_status||data.doping?.status||"Geen certificaatstatus")} tone={talentstatus.actief?"ok":"info"}/>
      <HeroStatus title="LAATSTE UPDATE" value={fmt(f.last_scraped_at||f.updated_at)} tone="neutral"/>
    </div>
   </header>

   <div className="fighter-mobile-summary">
    <h1 className="fighter-mobile-name">{f.naam||"Onbekende vechter"}</h1>
    <div className="fighter-mobile-gym">{(data.sportscholen||data.gyms||[])[0]?.naam||(data.sportscholen||data.gyms||[])[0]?.organisatie_naam||""}</div>
    <div className="fighter-mobile-identity">
      <div><span className="fighter-mobile-label">VA-nummer</span><span className="fighter-mobile-value">{f.va_nummer||"-"}</span></div>
      <div><span className="fighter-mobile-label">Discipline</span><span className="fighter-mobile-value">{f.primary_discipline||f.nulmeting_discipline||"-"}</span></div>
      <div><span className="fighter-mobile-label">Klasse</span><span className="fighter-mobile-value">{f.mma_level||f.berekende_klasse||f.nulmeting_klasse||"-"}</span></div>
      <div><span className="fighter-mobile-label">Geslacht</span><span className="fighter-mobile-value">{f.geslacht||"-"}</span></div>
    </div>
    <div className="fighter-mobile-status-grid">
      <MobileStatus icon={<CalendarDays size={21}/>} title={f.heeft_startverbod?"Startverbod":"Fit to fight"} value={f.heeft_startverbod?"Actief startverbod":"Geen actief startverbod"}/>
      <MobileStatus icon={<ShieldCheck size={21}/>} title="Licentie" value={f.licentie_actief?"Geldig":"Geen geldige licentie"}/>
      <MobileStatus icon={talentstatus.jeugd?<Trophy size={21}/>:<Users size={21}/>} title={talentstatus.jeugd?"Talentstatus":"Dopingcertificaat"} value={talentstatus.jeugd?(talentstatus.actief?"Talentstatus verdiend":"Niet gevonden"):(data.doping?.certificate_status||data.doping?.status||"Geen certificaatstatus")}/>
      <MobileStatus icon={<RefreshCw size={21}/>} title="Laatste update" value={fmt(f.last_scraped_at||f.updated_at)}/>
    </div>
   </div>

   {hercheckMessage&&<div style={s.feedback} className="fighter-feedback">{hercheckMessage}</div>}
   <Section title="Profiel & contact"><Grid rows={[["Naam",f.naam],["E-mail",f.email],["Geboortedatum",fmtDate(f.geboortedatum)],["Geslacht",f.geslacht]]}/></Section>
   <Section title="Nulmeting & klasse"><Grid rows={[["Discipline",f.nulmeting_discipline],["Nulmeting klasse",f.nulmeting_klasse],["Berekende klasse",f.berekende_klasse],["MMA niveau",f.mma_level],["Leeftijd",calcAge(f.geboortedatum)],["Gewicht",f.nulmeting_gewicht],["Aantal wedstrijden toegevoegd",f.nulmeting_totaal],["W / V / O",`${record.w} / ${record.v} / ${record.o}`],["Opmerking",f.nulmeting_opmerking,"full"]]}/></Section>
   <Section title={`Sportscholen (${(data.sportscholen||data.gyms||[]).length})`}><Table headers={["Sportschool","Plaats","Land","Sportschool ID","Laatste synchronisatie"]} rows={(data.sportscholen||data.gyms||[]).map((r:any)=>[r.naam||r.organisatie_naam,r.plaats,r.land,r.sportschool_id||r.organisatie_id||"-",fmt(r.last_team_sync_at||r.last_seen_at)])}/></Section>
   <Section title={`Wedstrijdhistorie (${data.results.length})`}><Table headers={["Datum","Evenement","Discipline","Klasse","Tegenstander","Sportschool","Uitslag"]} rows={data.results.map((r:any)=>[r.datum,r.evenement,r.discipline,r.klasse,r.tegenstander,r.sportschool,r.uitslag])}/></Section>
   <Section title={`Startverboden (${startverbodRows.length})`}><Table headers={["Status","Soort","Ingang","Einde","In actuele rapportage","Laatste waarneming"]} rows={startverbodRows.slice().sort((a:any,b:any)=>{const activeDiff=Number(Boolean(b.is_actueel))-Number(Boolean(a.is_actueel));if(activeDiff!==0)return activeDiff;return String(b.ingang||"").localeCompare(String(a.ingang||""));}).map((r:any)=>[startverbodStatus(r),r.soort,fmtDate(r.ingang),r.einde?fmtDate(r.einde):"Geen einddatum",r.is_actueel?"Ja":"Nee",fmt(r.laatst_gezien_op)])}/></Section>
   <Section title="Dopingeducatie"><Grid rows={[["Status",data.doping?.status||"Niet gestart"],["Uitgenodigd",fmt(data.doping?.invited_at)],["Certificaat",data.doping?.certificate_status||"Niet ontvangen"],["FightPaspoort verwerkt",data.doping?.fightpassport_processed?"Ja":"Nee"]]}/></Section>
  </div>
 </main>
}
function HeroStatus({title,value,tone="neutral"}:any){const color=tone==="danger"?"#ff6b57":tone==="ok"?"#a8e0b5":tone==="info"?"#ffd0ad":"#f1f3f5";return <div style={s.heroStatusCard}><div style={{minWidth:0}}><div style={s.heroStatusTitle}>{title}</div><div style={{...s.heroStatusValue,color}}>{value||"-"}</div></div></div>}
function MobileStatus({icon,title,value}:any){return <div className="fighter-mobile-status"><div className="fighter-mobile-status-icon">{icon}</div><div><span className="fighter-mobile-label">{title}</span><span className="fighter-mobile-value">{value||"-"}</span></div></div>}
function Section({title,children}:any){return <section style={s.section}><h2 style={{margin:"0 0 14px",color:"#ff7440"}}>{title}</h2>{children}</section>}
function Grid({rows}:any){return <div style={s.grid} className="fighter-grid">{rows.map((r:any,i:number)=><div key={i} className="fighter-white-field" style={{...s.field,...(r[2]==="wide"?s.fieldWide:{}),...(r[2]==="full"?s.fieldFull:{})}}><span className="fighter-field-label" style={s.muted}>{r[0]}</span><b style={{wordBreak:"break-word",lineHeight:1.35}}>{r[1]??"-"}</b></div>)}</div>}
function Table({headers,rows}:any){return <div style={{overflowX:"auto",border:"1px solid #c8cdd1"}}><table style={s.table} className="fighter-data-table"><thead><tr>{headers.map((h:any)=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{rows.map((r:any,i:number)=><tr key={i}>{r.map((v:any,j:number)=><td key={j} style={s.td}>{v??"-"}</td>)}</tr>)}{!rows.length&&<tr><td style={s.td} colSpan={headers.length}>Geen gegevens.</td></tr>}</tbody></table></div>}
function fmt(v:any){return v?new Date(v).toLocaleString("nl-NL"):"-"}
function fmtDate(v:any){
 const d=v?new Date(v):null;
 return d&&!Number.isNaN(d.getTime())?d.toLocaleDateString("nl-NL"):"-";
}
function startverbodStatus(r:any){
 if(!r?.is_actueel)return "Historie";
 if(!r?.einde)return "Actueel · geen einddatum";
 const end=new Date(`${String(r.einde).slice(0,10)}T23:59:59`);
 return !Number.isNaN(end.getTime())&&end>=new Date()?"Actueel":"Verlopen";
}
function calcAge(v:any){
 const birth=new Date(v);
 if(!v||Number.isNaN(birth.getTime()))return "-";
 const today=new Date();
 let age=today.getFullYear()-birth.getFullYear();
 const month=today.getMonth()-birth.getMonth();
 if(month<0||(month===0&&today.getDate()<birth.getDate()))age--;
 return age;
}

function talentstatusFromFighter(f: any) {
  const text = String(f?.nulmeting_opmerking ?? "").replace(/\u00a0/g, " ").trim();
  const hasTalent = /\btalent\s*status\b|\btalentstatus\b/i.test(text);
  const klasse = String(f?.nulmeting_klasse ?? f?.berekende_klasse ?? "").trim().toUpperCase();
  const birth = f?.geboortedatum ? new Date(f.geboortedatum) : null;
  let leeftijd: number | null = null;

  if (birth && !Number.isNaN(birth.getTime())) {
    const today = new Date();
    leeftijd = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) leeftijd--;
  }

  const jeugd = klasse === "J" || klasse === "J+" || (leeftijd !== null && leeftijd < 18);
  return { jeugd, actief: jeugd && hasTalent };
}

const s:any={
page:{minHeight:"100vh",background:"linear-gradient(180deg,#24282c 0%,#30353a 45%,#1d2023 100%)",color:"#f3f4f5",padding:18},
wrap:{maxWidth:1560,margin:"0 auto"},
hero:{position:"relative",overflow:"hidden",aspectRatio:"16 / 10",minHeight:650,maxHeight:940,marginBottom:18,border:"1px solid #9da3a8",background:"#111",boxShadow:"0 18px 42px rgba(20,24,28,.24),0 2px 8px rgba(0,0,0,.18)"},
heroImage:{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"},
heroShade:{position:"absolute",inset:0,pointerEvents:"none",background:"linear-gradient(180deg,rgba(0,0,0,.08),transparent 28%,transparent 72%,rgba(0,0,0,.18))"},
heroToolbar:{position:"absolute",zIndex:4,top:18,right:20,display:"flex",gap:9},
glassButton:{display:"inline-flex",gap:7,alignItems:"center",justifyContent:"center",height:38,padding:"0 13px",color:"#fff",background:"rgba(10,12,14,.72)",border:"1px solid rgba(255,255,255,.42)",backdropFilter:"blur(8px)",fontWeight:900,cursor:"pointer",boxShadow:"0 5px 16px rgba(0,0,0,.3)"},
fighterNameBlock:{position:"absolute",zIndex:3,left:"4.2%",top:"31%",width:"41%",textShadow:"0 4px 14px #000"},
fighterName:{color:"#fff",fontSize:"clamp(30px,3.25vw,58px)",lineHeight:.98,fontWeight:950,letterSpacing:.3,textTransform:"uppercase"},
fighterGym:{marginTop:10,color:"#ff641f",fontSize:"clamp(13px,1.15vw,20px)",fontWeight:900,letterSpacing:1.4,textTransform:"uppercase"},
heroIdentityValues:{position:"absolute",zIndex:3,left:"6.8%",bottom:"27.2%",width:"45.5%",display:"grid",gridTemplateColumns:"1.08fr 1.28fr .9fr .95fr",gap:10,color:"#fff",fontSize:"clamp(11px,.92vw,16px)",fontWeight:900,textTransform:"uppercase",textShadow:"0 2px 7px #000"},
heroStatusGrid:{position:"absolute",zIndex:3,left:"3.35%",right:"5.2%",bottom:"9.6%",height:"13.8%",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"1.35%"},
heroStatusCard:{minWidth:0,display:"flex",alignItems:"center",padding:"10px 12px 10px 76px",background:"transparent",border:"none",boxShadow:"none"},
heroStatusTitle:{color:"#fff",fontSize:"clamp(9px,.75vw,12px)",fontWeight:950,letterSpacing:1.1,textShadow:"0 2px 5px #000"},
heroStatusValue:{marginTop:4,fontSize:"clamp(10px,.82vw,13px)",lineHeight:1.25,fontWeight:850,overflow:"hidden",textOverflow:"ellipsis",textShadow:"0 2px 5px #000"},
silver:{display:"inline-flex",gap:7,alignItems:"center",justifyContent:"center",height:38,padding:"0 13px",background:"linear-gradient(#fff,#d4d7da)",color:"#111",border:"1px solid #a7adb2",fontWeight:900,cursor:"pointer"},
section:{border:"1px solid #555c62",borderLeft:"4px solid #ff4d00",background:"linear-gradient(135deg,#34393e 0%,#292e33 100%)",padding:16,marginBottom:14,boxShadow:"0 8px 22px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.04)"},
grid:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:9},
field:{display:"grid",gap:4,padding:"9px 10px",background:"#f1f2f3",border:"1px solid #c8cdd1",minHeight:54,color:"#111"},
fieldWide:{gridColumn:"span 2",minHeight:72},fieldFull:{gridColumn:"1 / -1",minHeight:72},
muted:{fontSize:10,color:"#60676d",textTransform:"uppercase",letterSpacing:.5},
feedback:{marginBottom:14,padding:"10px 12px",border:"1px solid #d28a59",background:"#fff2e9",color:"#7a3513",fontWeight:750},
table:{width:"100%",borderCollapse:"collapse",fontSize:13},
th:{textAlign:"left",padding:"9px 10px",borderBottom:"2px solid #ff4d00",background:"#111",color:"#fff",whiteSpace:"nowrap"},
td:{padding:"9px 10px",borderBottom:"1px solid #d3d6d9",verticalAlign:"top",background:"#fff",color:"#111"}
};
