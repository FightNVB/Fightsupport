import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";
import { openFighterPageVerified, readFighterHeader, hardCloseFightPassportPage } from "../utils/fightPassportFighterNavigation.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const normalizeVa = (v) => { const x=String(v??"").trim().replace(/\D/g,""); return /^\d{3,5}$/.test(x)?x:null; };

async function getMijnNvbEmail(va) {
  const { data: fighter, error: fe } = await supabase.schema("nvb_platform").from("fighters").select("person_id").eq("va_number", Number(va)).maybeSingle();
  if (fe) throw new Error(`Mijn NVB fighter ophalen mislukt: ${fe.message}`);
  if (!fighter?.person_id) throw new Error(`Geen Mijn NVB-vechter voor VA ${va}`);
  const { data: person, error: pe } = await supabase.schema("nvb_platform").from("persons").select("email").eq("id", fighter.person_id).maybeSingle();
  if (pe) throw new Error(`Mijn NVB profiel ophalen mislukt: ${pe.message}`);
  const email=String(person?.email||"").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Geen geldig Mijn NVB e-mailadres voor VA ${va}`);
  return email;
}

async function openDetails(page, va) {
  const ok=await page.evaluate((requestedVa)=>{
    const tab=document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
    const head=[...(tab?.querySelectorAll(".tileHeader.enabled")||[])].find(h=>String(h.innerText||"").trim().toUpperCase()==="DETAILS");
    const tile=head?.closest(".tile"); if(!tile)return false; tile.scrollIntoView?.({block:"center"}); tile.click(); return true;
  },va).catch(()=>false);
  if(!ok)throw new Error(`DETAILS niet gevonden voor VA ${va}`);
  await wait(1200);
}

async function findEmailField(page) {
  for (const frame of page.frames()) {
    const state=await frame.evaluate(()=>{
      const visible=(el)=>{if(!el)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"};
      const list=[...document.querySelectorAll("input.dv2factemail")]; const el=list.find(visible)||list[0]||null;
      return el?{value:String(el.value||"").trim(),disabled:!!el.disabled,readOnly:!!el.readOnly}:null;
    }).catch(()=>null);
    if(state)return {frame,state};
  }
  return null;
}

async function enableEditing(page, va, timeoutMs=20000) {
  const started=Date.now();
  while(Date.now()-started<timeoutMs){
    let found=await findEmailField(page);
    if(found&&!found.state.disabled&&!found.state.readOnly)return true;
    for(const frame of page.frames()){
      const sw=await frame.$("div.receiver.switch_on").catch(()=>null); if(!sw)continue;
      await sw.click({delay:120}); await wait(800);
      found=await findEmailField(page);
      if(found&&!found.state.disabled&&!found.state.readOnly)return true;
    }
    await wait(250);
  }
  throw new Error(`Bewerkmodus niet actief voor VA ${va}`);
}

async function writeEmail(page, va, email) {
  const found=await findEmailField(page); if(!found)throw new Error(`input.dv2factemail niet gevonden voor VA ${va}`);
  const before=found.state.value;
  if(before.toLowerCase()===email.toLowerCase())return {changed:false,before};
  const after=await found.frame.evaluate((next)=>{
    const visible=(el)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"};
    const list=[...document.querySelectorAll("input.dv2factemail")]; const el=list.find(visible)||list[0]||null;
    if(!el||el.disabled||el.readOnly)return null;
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set; setter?setter.call(el,next):(el.value=next);
    el.dispatchEvent(new Event("input",{bubbles:true})); el.dispatchEvent(new Event("change",{bubbles:true})); el.dispatchEvent(new Event("blur",{bubbles:true}));
    return String(el.value||"").trim();
  },email);
  if(String(after||"").toLowerCase()!==email.toLowerCase())throw new Error(`E-mailadres kon niet worden ingevuld voor VA ${va}`);
  return {changed:true,before};
}

async function save(page, va, timeoutMs=20000) {
  const started=Date.now();
  while(Date.now()-started<timeoutMs){
    for(const frame of page.frames()){
      const sw=await frame.$("div.receiver.switch_off").catch(()=>null); if(!sw)continue;
      await sw.click({delay:120}); await wait(1000); return true;
    }
    await wait(250);
  }
  throw new Error(`Opslagswitch niet gevonden voor VA ${va}`);
}

async function closeDetails(page) {
  await page.evaluate(()=>{const list=[...document.querySelectorAll("button#sluit_inr_detail")];const b=list.find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0})||list[0];b?.click()}).catch(()=>{});
  await wait(500);
}

async function runOne(browser, masterPage, cookiesRef, refreshMaster, va) {
  const email=await getMijnNvbEmail(va);
  const page=await openFighterPageVerified(browser,null,cookiesRef.value,va,{
    maxAttempts:Number(process.env.TAB_ATTEMPTS??"5"), softWaitMs:Math.min(200,Math.max(0,Number(process.env.SOFT_WAIT_MS??"200"))), betweenAttemptsMs:Number(process.env.BETWEEN_ATTEMPTS_MS??"350"),
    workerLabel:`[email-writer VA ${va}]`
  });
  if(!page)throw new Error(`Fightpassport-vechter VA ${va} kon niet worden geopend`);
  try {
    const header=await readFighterHeader(page);
    if(String(header?.gotVa||"")!==String(va))throw new Error(`VA mismatch requested=${va} got=${header?.gotVa||""}`);
    await openDetails(page,va);
    let found=await findEmailField(page); if(!found)throw new Error(`input.dv2factemail niet gevonden voor VA ${va}`);
    if(found.state.value.toLowerCase()===email.toLowerCase())return {va,ok:true,status:"already_current"};
    await enableEditing(page,va); const change=await writeEmail(page,va,email); await save(page,va);
    await closeDetails(page); await openDetails(page,va); found=await findEmailField(page);
    if(!found||found.state.value.toLowerCase()!==email.toLowerCase())throw new Error(`Verificatie na opslaan mislukt voor VA ${va}`);
    return {va,ok:true,status:"written",previous_email:change.before};
  } finally { await hardCloseFightPassportPage(page).catch(()=>{}); }
}

const vaList=process.argv.slice(2).map(normalizeVa).filter(Boolean);
if(!vaList.length){console.error("Geen geldige VA-nummers meegegeven.");process.exit(1);}
let browser,masterPage;
try {
  // Exact dezelfde start als fp_total/admin: schone master-login, daarna cookies uit die masterbrowser.
  ({ browser, page: masterPage } = await loginFightPassport({
    freshSession: true,
    saveCookiesToDisk: false,
  }));
  let cookies = [];
  try {
    cookies = await masterPage.cookies();
  } catch {}
  const cookiesRef = { value: cookies };

  console.log("[email-writer] ✅ Schone master-sessie gestart; zelfde start als fp_total/admin");
  let refreshPromise=null;
  async function refreshMaster(reason=""){
    if(refreshPromise){try{await refreshPromise}catch{}return cookiesRef.value;}
    refreshPromise=(async()=>{
      console.log(`[email-writer] master ensureLoggedIn(force) ${reason}`);
      await ensureLoggedIn(masterPage,{force:true,saveCookiesToDisk:false,useStoredCookies:false});
      cookiesRef.value=await masterPage.cookies().catch(()=>cookiesRef.value); return cookiesRef.value;
    })();
    try{return await refreshPromise;}finally{refreshPromise=null;}
  }
  const results=[];
  for(const va of vaList){try{results.push(await runOne(browser,masterPage,cookiesRef,refreshMaster,va));}catch(e){const error=e?.message??String(e);console.error(`[email-writer] VA ${va}: ${error}`);results.push({va,ok:false,status:"failed",error});}}
  console.log(`EMAIL_WRITER_RESULT=${JSON.stringify({results})}`);
  process.exitCode=results.some(x=>!x.ok)?2:0;
} catch(e) { console.error("FP email writer hard failed:",e?.stack??e); process.exitCode=1; }
finally { try{await masterPage?.close();}catch{} try{await browser?.close();}catch{} }
