import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildTrainerReviewData, gymKey, s } from "@/lib/trainerReview";

export const runtime="nodejs";
function isDopingInfoForOwnFighter(x:any, ownCorner:"rood"|"blauw"){
 const code=s(x?.code ?? x?.rule_code ?? x?.rule).toUpperCase();
 const boodschap=s(x?.boodschap).toLowerCase();
 const resultaat=s(x?.resultaat).toUpperCase();
 const isDoping=code.includes("DOPINGCERTIFICAAT") || boodschap.includes("dopingcertificaat");
 if(!isDoping || (resultaat && resultaat!=="INFO")) return false;

 const hoek=s(x?.hoek).toLowerCase();
 if(hoek){
  return hoek===ownCorner ||
   (ownCorner==="rood" && hoek==="red") ||
   (ownCorner==="blauw" && hoek==="blue");
 }

 // Robuuste fallback voor bestaande rows waarbij hoek niet gevuld is:
 // de huidige rulesEngine zet de vechterhoek ook in de rule_code.
 if(ownCorner==="rood") return /_(ROOD|RED)$/.test(code);
 return /_(BLAUW|BLUE)$/.test(code);
}

function belongsToOwnFighter(x:any, ownCorner:"rood"|"blauw", own:any){
 const hoek=s(x?.hoek).toLowerCase();
 if(hoek){
  return hoek===ownCorner ||
   (ownCorner==="rood" && hoek==="red") ||
   (ownCorner==="blauw" && hoek==="blue") ||
   hoek===s(own?.naam).toLowerCase() ||
   hoek===s(own?.vaNummer).toLowerCase();
 }
 return isDopingInfoForOwnFighter(x,ownCorner);
}

async function load(token:string){ const q=await supabaseAdmin.from("trainer_match_links").select("*").eq("token",token).eq("is_enabled",true).maybeSingle(); if(q.error)throw q.error; return q.data; }
export async function GET(_req:NextRequest,{params}:{params:Promise<{token:string}>}){
 try{ const {token}=await params; const link=await load(s(token)); if(!link)return NextResponse.json({error:"Deze trainerlink is niet beschikbaar"},{status:404});
  if(!link.opened_at) await supabaseAdmin.from("trainer_match_links").update({opened_at:new Date().toISOString()}).eq("id",link.id);
  const all=await buildTrainerReviewData(link.matchmaking_id); const gym=all.gyms.find(g=>g.key===link.sportschool_key); if(!gym)return NextResponse.json({error:"Sportschool niet meer gevonden in matchmaking"},{status:404});
  const rr=await supabaseAdmin.from("trainer_match_responses").select("*").eq("link_id",link.id); if(rr.error)throw rr.error;
  const responses=new Map((rr.data??[]).map((r:any)=>[s(r.bout_id),r]));
  // Privacy: a trainer may only see personal control information for the
  // fighter from the sportschool this token belongs to. The opponent remains
  // visible for matchmaking context, but their licence/startverbod/keurmerk
  // and personal control messages are stripped. Dispensations remain visible
  // because the trainer must explicitly consent to those for this bout.
  const bouts=gym.bouts.map((b:any)=>{
    const ownCorner = gymKey(b.red?.sportschool)===link.sportschool_key ? "rood" : "blauw";
    const own = ownCorner==="rood" ? b.red : b.blue;
    const opponent = ownCorner==="rood" ? b.blue : b.red;
    const ownMessages=(b.bijzonderheden??[]).filter((x:any)=>belongsToOwnFighter(x,ownCorner,own));
    const safeOpponent={...opponent,licentie:null,startverbod:null,keurmerk:null};
    const safeOwn={...own};
    const red=ownCorner==="rood"?safeOwn:safeOpponent;
    const blue=ownCorner==="blauw"?safeOwn:safeOpponent;
    const ownStartverbod=!!own?.startverbod?.actief || !!own?.schorsing?.actief || ownMessages.some((x:any)=>{const m=`${s(x.code)} ${s(x.boodschap)}`.toLowerCase();return m.includes("startverbod")||m.includes("schors");});
    const consentCorners=Array.isArray(b.dispensatieConsentCorners)?b.dispensatieConsentCorners:[];
    const dispensatieToestemmingVereist=consentCorners.includes(ownCorner);
    const consentCorner=consentCorners.length===1?consentCorners[0]:null;
    const consentFighter=consentCorner==="rood"?b.red:consentCorner==="blauw"?b.blue:null;
    return {
      ...b,
      red,
      blue,
      startverbod:ownStartverbod,
      bijzonderheden:ownMessages,
      dispensatieToestemmingVereist,
      dispensatieToestemmingVoor:consentFighter?.naam||null,
      response:responses.get(b.id)||null
    };
  });
  return NextResponse.json({ok:true,event:all.event,sportschool:{key:gym.key,naam:gym.naam,keurmerkOk:gym.keurmerkOk,keurmerkReden:gym.keurmerkReden},bouts},{headers:{"Cache-Control":"no-store"}});
 }catch(e:any){return NextResponse.json({error:s(e?.message)||"Trainerpagina laden mislukt"},{status:500});}
}

async function syncBoutConfirmationStatus(matchmakingId:string,bout:any){
 const boutId=s(bout?.id); const partijNr=Number(bout?.partijNr)||null;
 if(!boutId)return "Concept";
 const linksRes=await supabaseAdmin.from("trainer_match_links").select("id,sportschool_key,is_enabled").eq("matchmaking_id",matchmakingId).eq("is_enabled",true);
 if(linksRes.error)throw linksRes.error;
 const redKey=gymKey(bout?.red?.sportschool), blueKey=gymKey(bout?.blue?.sportschool);
 const requiredKeys=Array.from(new Set([redKey,blueKey].filter(Boolean)));
 const relevantLinks=(linksRes.data??[]).filter((l:any)=>requiredKeys.includes(s(l.sportschool_key)));
 const linkIds=relevantLinks.map((l:any)=>l.id).filter(Boolean);
 let responses:any[]=[];
 if(linkIds.length){
  const rr=await supabaseAdmin.from("trainer_match_responses").select("link_id,status").eq("matchmaking_id",matchmakingId).eq("bout_id",boutId).in("link_id",linkIds);
  if(rr.error)throw rr.error; responses=rr.data??[];
 }
 const agreedKeys=new Set<string>();
 for(const l of relevantLinks){
  if(responses.some((r:any)=>s(r.link_id)===s(l.id)&&s(r.status).toLowerCase()==="akkoord")) agreedKeys.add(s(l.sportschool_key));
 }
 const bothAgreed=requiredKeys.length>0&&requiredKeys.every(k=>agreedKeys.has(k));
 const nextStatus=bothAgreed?"Match":"Concept";
 let q=supabaseAdmin.from("matchmaking_bouts_raw").update({status:nextStatus,laatste_bewerking_op:new Date().toISOString()}).eq("matchmaking_id",matchmakingId).eq("id",boutId);
 const upd=await q.select("id,status").maybeSingle();
 if(upd.error){
  // Sommige oudere schema's hebben geen laatste_bewerking_op; status zelf is leidend.
  const fallback=await supabaseAdmin.from("matchmaking_bouts_raw").update({status:nextStatus}).eq("matchmaking_id",matchmakingId).eq("id",boutId);
  if(fallback.error)throw fallback.error;
 }
 // controle_bout_context is controledata en niet de bron voor Concept/Match.
 // De bevestigingsstatus hoort daarom bewust alleen op matchmaking_bouts_raw.
 return nextStatus;
}

export async function POST(req:NextRequest,{params}:{params:Promise<{token:string}>}){
 try{ const {token}=await params; const link=await load(s(token)); if(!link)return NextResponse.json({error:"Deze trainerlink is niet beschikbaar"},{status:404}); const body=await req.json().catch(()=>({})); const boutId=s(body.boutId), status=s(body.status).toLowerCase(), opmerking=s(body.opmerking); if(!boutId||!["akkoord","afgewezen","bespreken"].includes(status))return NextResponse.json({error:"Ongeldige reactie"},{status:400});
  const all=await buildTrainerReviewData(link.matchmaking_id); const gym=all.gyms.find(g=>g.key===link.sportschool_key); const bout=gym?.bouts.find((b:any)=>b.id===boutId); if(!bout)return NextResponse.json({error:"Partij hoort niet bij deze sportschool"},{status:403});
  const ownCorner = gymKey(bout.red?.sportschool)===link.sportschool_key ? "rood" : "blauw";
  const own = ownCorner==="rood" ? bout.red : bout.blue;
  const ownMessages=(bout.bijzonderheden??[]).filter((x:any)=>belongsToOwnFighter(x,ownCorner,own));
  const ownStartverbod=!!own?.startverbod?.actief || !!own?.schorsing?.actief || ownMessages.some((x:any)=>{const m=`${s(x.code)} ${s(x.boodschap)}`.toLowerCase();return m.includes("startverbod")||m.includes("schors");});
  if(ownStartverbod && status==="akkoord")return NextResponse.json({error:"Jouw vechter heeft een actief startverbod; deze partij kan niet akkoord worden gegeven"},{status:400});
  if(status==="afgewezen" && !opmerking)return NextResponse.json({error:"Vul bij afwijzen een reden in"},{status:400});
  if(status==="bespreken" && !opmerking)return NextResponse.json({error:"Vul in wat u wilt bespreken"},{status:400});
  const needsDisp=Array.isArray(bout.dispensaties)&&bout.dispensaties.length>0;
  const consentCorners=Array.isArray(bout.dispensatieConsentCorners)?bout.dispensatieConsentCorners:[];
  const needsOwnConsent=needsDisp&&consentCorners.includes(ownCorner);
  const consent=body.dispensatieToestemming===true;
  if(status==="akkoord" && needsOwnConsent && !consent)return NextResponse.json({error:"Voor jouw vechter is nadrukkelijke toestemming voor deze dispensatie verplicht"},{status:400});
  const payload={link_id:link.id,matchmaking_id:link.matchmaking_id,bout_id:boutId,partij_nr:bout.partijNr,status,opmerking:opmerking||null,dispensatie_toestemming:status==="akkoord"&&needsOwnConsent?consent:false,dispensatie_redenen:needsDisp?bout.dispensaties:[],responded_at:new Date().toISOString()};
  const up=await supabaseAdmin.from("trainer_match_responses").upsert(payload,{onConflict:"link_id,bout_id"}).select("*").single(); if(up.error)throw up.error;
  const boutStatus=await syncBoutConfirmationStatus(link.matchmaking_id,bout);
  return NextResponse.json({ok:true,response:up.data,boutStatus});
 }catch(e:any){return NextResponse.json({error:s(e?.message)||"Reactie opslaan mislukt"},{status:500});}
}
