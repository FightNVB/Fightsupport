import {NextResponse} from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {spawn} from "child_process";
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
 const {data,error}=await supabaseAdmin.schema("nvb_platform").from("service_api_tokens")
  .select("id,permissions").eq("token_hash",hash).eq("active",true).maybeSingle();
 if(error){console.error("[fightpassport-correctie] service-token databasefout",error.message);throw new Error("Service-token kon niet worden gecontroleerd.");}
 if(!data){console.error("[fightpassport-correctie] service-token niet gevonden");return null;}
 if(!Array.isArray(data.permissions)||!data.permissions.includes("fightpassport:writer")){console.error("[fightpassport-correctie] writer-permissie ontbreekt");return null;}
 await supabaseAdmin.schema("nvb_platform").from("service_api_tokens")
  .update({last_used_at:new Date().toISOString()}).eq("id",data.id);
 return data;
}

function runNodeScript(scriptPath:string,args:string[],envExtra?:Record<string,string>,logPrefix?:string):Promise<{stdout:string;stderr:string;ms:number}>{
 return new Promise((resolve,reject)=>{
  const t0=Date.now();
  const proc=spawn("node",[scriptPath,...args],{stdio:["ignore","pipe","pipe"],shell:false,cwd:path.dirname(scriptPath),windowsHide:true,env:{...process.env,...envExtra}});
  let stdout=""; let stderr="";
  proc.stdout.on("data",(d)=>{const s=d.toString();stdout+=s;process.stdout.write(logPrefix?`[${logPrefix}] ${s}`:s);});
  proc.stderr.on("data",(d)=>{const s=d.toString();stderr+=s;process.stderr.write(logPrefix?`[${logPrefix}] ${s}`:s);});
  proc.on("error",(err)=>{const ms=Date.now()-t0;reject(new Error(`Robot spawn error: ${err?.message??err}\\n(ms=${ms})\\n\\nSTDERR:\\n${stderr}\\n\\nSTDOUT:\\n${stdout}`));});
  proc.on("close",(code)=>{const ms=Date.now()-t0;if(code===0)resolve({stdout,stderr,ms});else reject(new Error(`Robot failed: ${scriptPath} (exit code ${code})\\n(ms=${ms})\\n\\nSTDERR:\\n${stderr}\\n\\nSTDOUT:\\n${stdout}`));});
 });
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
  const result=await runNodeScript(emailWriter(),[va],{
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
