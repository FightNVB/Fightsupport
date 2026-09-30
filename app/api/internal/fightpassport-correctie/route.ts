import {NextResponse} from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {runFightPassportNodeScript} from "@/lib/control-engine/runFightPassportNodeScript";
import {supabaseAdmin} from "@/app/api/_utils/authz";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function normalizeVa(value:unknown){
 const valueOnly=String(value??"").replace(/\D/g,"");
 return /^\d{3,6}$/.test(valueOnly)?valueOnly:null;
}

async function authorize(req:Request){
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!token)return null;
 const hash=crypto.createHash("sha256").update(token).digest("hex");
 const {data}=await supabaseAdmin.schema("nvb_platform").from("service_api_tokens")
  .select("id,permissions").eq("token_hash",hash).eq("active",true).maybeSingle();
 if(!data||!Array.isArray(data.permissions)||!data.permissions.includes("fightpassport:writer"))return null;
 await supabaseAdmin.schema("nvb_platform").from("service_api_tokens")
  .update({last_used_at:new Date().toISOString()}).eq("id",data.id);
 return data;
}

function emailWriter(){
 const root=process.cwd();
 const candidates=[
  path.join(root,"ControlEngine","scrapers","fp_email","scraper_fp_email_writer.js"),
  path.join(root,"scrapers","fp_email","scraper_fp_email_writer.js"),
 ];
 const file=candidates.find(x=>fs.existsSync(x));
 if(!file)throw new Error("Fightpassport e-mailwriter niet gevonden.");
 return file;
}

export async function POST(req:Request){
 try{
  if(!await authorize(req))return NextResponse.json({ok:false,error:"Geen toegang."},{status:403});
  const body=await req.json().catch(()=>({}));
  const type=String(body?.type||"").trim().toLowerCase();
  const va=normalizeVa(body?.va);
  if(!va)return NextResponse.json({ok:false,error:"Geldig VA-nummer ontbreekt."},{status:400});
  if(type!=="email")return NextResponse.json({ok:false,error:"Onbekend correctietype."},{status:400});

  console.log("[fightpassport-correctie] ontvangen",{type,va});
  const result=await runFightPassportNodeScript(emailWriter(),[va],{
   HEADLESS:process.env.HEADLESS??"false",
   PUPPETEER_HEADLESS:process.env.PUPPETEER_HEADLESS??process.env.HEADLESS??"false",
   TAB_ATTEMPTS:process.env.TAB_ATTEMPTS??"5",
   SOFT_WAIT_MS:process.env.SOFT_WAIT_MS??"200",
   BETWEEN_ATTEMPTS_MS:process.env.BETWEEN_ATTEMPTS_MS??"350",
  },"fp_email");
  console.log("[fightpassport-correctie] klaar",{type,va});
  return NextResponse.json({ok:true,type,va,...result});
 }catch(e:any){
  console.error("[fightpassport-correctie] fout",e);
  return NextResponse.json({ok:false,error:e?.message||"Fightpassport-correctie mislukt."},{status:500});
 }
}
