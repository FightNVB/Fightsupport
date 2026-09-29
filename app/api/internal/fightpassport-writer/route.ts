import {NextResponse} from "next/server";
import fs from "fs";
import path from "path";
import {runFightPassportNodeScript} from "@/lib/control-engine/runFightPassportNodeScript";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function va(v:unknown){const d=String(v??"").replace(/\D/g,"");return /^\d{3,6}$/.test(d)?d:null}
function writer(){const rel=["ControlEngine","scrapers","fp_email","scraper_fp_email_writer.js"],root=process.cwd(),c=[path.join(root,...rel),path.join(root,"ControlEngine",...rel),path.join(root,...rel.slice(1))],f=c.find(x=>fs.existsSync(x));if(!f)throw new Error("Fightpassport e-mailwriter niet gevonden.");return f}
export async function POST(req:Request){
 try{
  const secret=process.env.FIGHTSUPPORT_WRITER_SECRET||"",given=req.headers.get("x-nvb-writer-secret")||"";
  if(!secret||given!==secret)return NextResponse.json({error:"Geen toegang."},{status:401});
  const b=await req.json().catch(()=>({})),n=va(b?.va);
  if(b?.action!=="email"||!n)return NextResponse.json({error:"Geldig VA-nummer ontbreekt."},{status:400});
  const result=await runFightPassportNodeScript(writer(),[n],{HEADLESS:process.env.HEADLESS??"false",PUPPETEER_HEADLESS:process.env.PUPPETEER_HEADLESS??process.env.HEADLESS??"false",TAB_ATTEMPTS:process.env.TAB_ATTEMPTS??"5",SOFT_WAIT_MS:process.env.SOFT_WAIT_MS??"200",BETWEEN_ATTEMPTS_MS:process.env.BETWEEN_ATTEMPTS_MS??"350"},"fp_email");
  return NextResponse.json({ok:true,action:"email",va:n,...result});
 }catch(e:any){console.error("[internal/fightpassport-writer]",e);return NextResponse.json({error:e?.message||"Fightpassport writer mislukt"},{status:500})}
}