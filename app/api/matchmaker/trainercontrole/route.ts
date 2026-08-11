import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUserFromAuthHeader } from "@/lib/api/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildTrainerReviewData, gymKey, s } from "@/lib/trainerReview";

export const runtime = "nodejs";
function token(){ return randomBytes(32).toString("hex"); }
async function auth(req:NextRequest){ const u=await requireUserFromAuthHeader(req); const r=s(u.role).toLowerCase(); if(!r.includes("matchmaker")&&!r.includes("admin")&&!r.includes("superadmin"))throw new Error("FORBIDDEN"); return u; }
function statusCode(e:any){ return s(e?.message)==="FORBIDDEN"?403:s(e?.message)==="UNAUTHORIZED"?401:500; }

export async function GET(req:NextRequest){
 try{
  await auth(req); const matchmakingId=s(req.nextUrl.searchParams.get("matchmakingId")); if(!matchmakingId)return NextResponse.json({error:"matchmakingId ontbreekt"},{status:400});
  const data=await buildTrainerReviewData(matchmakingId);
  const {data:links,error}=await supabaseAdmin.from("trainer_match_links").select("*").eq("matchmaking_id",matchmakingId); if(error)throw error;
  const linkIds=(links??[]).map((x:any)=>x.id); let responses:any[]=[];
  if(linkIds.length){ const rr=await supabaseAdmin.from("trainer_match_responses").select("*").in("link_id",linkIds); if(rr.error)throw rr.error; responses=rr.data??[]; }
  const gyms=data.gyms.map(g=>{ const link=(links??[]).find((l:any)=>l.sportschool_key===g.key); const own=link?responses.filter((r:any)=>r.link_id===link.id):[]; const counts={open:0,akkoord:0,afgewezen:0,bespreken:0}; for(const b of g.bouts){ const r=own.find((x:any)=>x.bout_id===b.id); if(!r)counts.open++; else if(r.status==="akkoord")counts.akkoord++; else if(r.status==="afgewezen")counts.afgewezen++; else if(r.status==="bespreken")counts.bespreken++; }
   return {...g,link:link?{id:link.id,token:link.token,isEnabled:link.is_enabled,openedAt:link.opened_at,createdAt:link.created_at}:null,counts}; });
  return NextResponse.json({ok:true,event:data.event,gyms});
 }catch(e:any){return NextResponse.json({error:s(e?.message)||"Trainercontrole laden mislukt"},{status:statusCode(e)});}
}

export async function POST(req:NextRequest){
 try{
  const user=await auth(req); const body=await req.json().catch(()=>({})); const matchmakingId=s(body.matchmakingId), sportschool=s(body.sportschool); if(!matchmakingId||!sportschool)return NextResponse.json({error:"matchmakingId en sportschool zijn verplicht"},{status:400});
  const data=await buildTrainerReviewData(matchmakingId); const key=gymKey(sportschool); const gym=data.gyms.find(g=>g.key===key); if(!gym)return NextResponse.json({error:"Sportschool komt niet voor in deze matchmaking"},{status:404});
  const {data:existing,error:findError}=await supabaseAdmin.from("trainer_match_links").select("*").eq("matchmaking_id",matchmakingId).eq("sportschool_key",key).maybeSingle(); if(findError)throw findError;
  if(existing){ if(existing.is_enabled===false){ const up=await supabaseAdmin.from("trainer_match_links").update({is_enabled:true,sportschool_naam:gym.naam,updated_at:new Date().toISOString()}).eq("id",existing.id).select("*").single(); if(up.error)throw up.error; return NextResponse.json({ok:true,link:up.data}); } return NextResponse.json({ok:true,link:existing}); }
  const ins=await supabaseAdmin.from("trainer_match_links").insert({matchmaking_id:matchmakingId,sportschool_key:key,sportschool_naam:gym.naam,token:token(),is_enabled:true,created_by:user.userId}).select("*").single(); if(ins.error)throw ins.error;
  return NextResponse.json({ok:true,link:ins.data});
 }catch(e:any){return NextResponse.json({error:s(e?.message)||"Trainerlink maken mislukt"},{status:statusCode(e)});}
}

export async function PATCH(req:NextRequest){
 try{ await auth(req); const body=await req.json().catch(()=>({})); const id=s(body.id); if(!id)return NextResponse.json({error:"id ontbreekt"},{status:400}); const patch:any={updated_at:new Date().toISOString()}; if(typeof body.isEnabled==="boolean")patch.is_enabled=body.isEnabled; if(body.rotate===true)patch.token=token(); const up=await supabaseAdmin.from("trainer_match_links").update(patch).eq("id",id).select("*").single(); if(up.error)throw up.error; return NextResponse.json({ok:true,link:up.data}); }
 catch(e:any){return NextResponse.json({error:s(e?.message)||"Trainerlink wijzigen mislukt"},{status:statusCode(e)});}
}
