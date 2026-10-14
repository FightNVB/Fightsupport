// Same two-phase workflow as /api/control-engine/sportscholen:
// prepare the complete list, then run 3 processes with 10 workers each.
// Invoked by the cron endpoint as a detached-from-request child process.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const prepare = path.join(here, "scraper_sportscholen_prepare.js");
const worker = path.join(here, "scraper_sportscholen.js");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
function run(script,args,extra={},label="sportscholen") {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{
      cwd:here,env:{...process.env,FP_MATCHMAKER_ID:"",FP_SESSION_MODE:"master",
      HEADLESS:process.env.HEADLESS??"true",PUPPETEER_HEADLESS:process.env.PUPPETEER_HEADLESS??process.env.HEADLESS??"true",...extra},
      stdio:["ignore","inherit","inherit"]
    });
    child.on("error",reject);
    child.on("close",(code,signal)=>code===0?resolve():reject(new Error(`${label} stopped: code=${code}, signal=${signal}`)));
  });
}
async function main(){
  console.log("[sportscholen-cron] fase 1/2: volledige sportscholenlijst voorbereiden");
  await run(prepare,["run"],{},"prepare");
  const keys=[];let from=0;
  while(true){
    const {data,error}=await db.from("sportscholen").select("sportschool_id").not("sportschool_id","is",null).order("sportschool_id",{ascending:true}).range(from,from+999);
    if(error)throw error;
    for(const item of data??[]){
      const key=String(item.sportschool_id??"").replace(/\D/g,"").replace(/^0+/,"");
      if(key)keys.push(key);
    }
    if((data??[]).length<1000)break;
    from+=1000;
  }
  const unique=[...new Set(keys)];
  if(!unique.length)throw new Error("Geen sportschool-keys gevonden");
  const chunks=[[],[],[]];unique.forEach((key,i)=>chunks[i%3].push(key));
  console.log("[sportscholen-cron] fase 2/2:",unique.length,"sportscholen in 3 processen x 10 workers");
  const results=await Promise.allSettled(chunks.filter(x=>x.length).map((chunk,i)=>run(worker,["run-all"],{
    FP_SPORTSCHOLEN_KEYS:chunk.join(","),FP_SPORTSCHOLEN_WORKERS:"10",WORKERS:"10",
    STAGGER_MS:process.env.FP_SPORTSCHOLEN_STAGGER_MS??process.env.STAGGER_MS??"2500",
    TAB_ATTEMPTS:process.env.TAB_ATTEMPTS??"3",
    SOFT_WAIT_MS:process.env.SOFT_WAIT_MS??"1500",
    BETWEEN_ATTEMPTS_MS:process.env.BETWEEN_ATTEMPTS_MS??"700",
    FP_SPORTSCHOLEN_WORKER_DRIFT_MAX_MS:process.env.FP_SPORTSCHOLEN_WORKER_DRIFT_MAX_MS??"250",
    FP_SPORTSCHOLEN_LOGIN_RETRIES:process.env.FP_SPORTSCHOLEN_LOGIN_RETRIES??"1",
    FP_SPORTSCHOLEN_TRANSIENT_RETRIES:process.env.FP_SPORTSCHOLEN_TRANSIENT_RETRIES??"1",
    FP_SPORTSCHOLEN_DOWNLOAD_START_TIMEOUT_MS:process.env.FP_SPORTSCHOLEN_DOWNLOAD_START_TIMEOUT_MS??"6000"
  },`worker-${i+1}`)));
  const failures=results.filter(x=>x.status==="rejected");
  if(failures.length)throw new Error(failures.map(x=>String(x.reason)).join("; "));
  console.log("[sportscholen-cron] alle processen afgerond");
}
main().catch(e=>{console.error("[sportscholen-cron] FOUT",e);process.exitCode=1;});
