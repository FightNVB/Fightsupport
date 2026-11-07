import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {verifyCommand,type ControlAction} from './nvbMachineProtocol';
import {withMachineActor} from './nvbMachineActor';
export async function receiveControl(req:Request,action:ControlAction,start:(req:Request)=>Promise<Response>){
 const response=(status:number,error:string)=>Response.json({ok:false,error},{status,headers:{'Cache-Control':'no-store'}});
 // This endpoint has no cookie or user-bearer fallback.
 if(req.headers.has('authorization')||req.headers.has('cookie'))return response(401,'Machine-identiteit vereist.');
 if(!req.body)return response(400,'Machineaanvraag ontbreekt.');
 const input=req.body.getReader(),parts:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await input.read();if(done)break;size+=value.byteLength;if(size>2048){await input.cancel();return response(413,'Machineaanvraag te groot.');}parts.push(value);}
 const text=Buffer.concat(parts).toString('utf8');
 let command:any;try{command=JSON.parse(text);}catch{return response(400,'Ongeldige aanvraag.');}
 if(!verifyCommand(command,action,req.headers.get('x-nvb-control-signature')||'',process.env.NVB_CONTROL_MACHINE_SECRET||''))return response(401,'Ongeldige machineaanvraag.');
 const url=process.env.NVB_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NVB_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return response(503,'Machineautorisatie niet beschikbaar.');
 if(key===process.env.NVB_CONTROL_MACHINE_SECRET)return response(503,'Afzonderlijke machinecredential vereist.');
 const db=createClient(url,key,{auth:{persistSession:false}}),platform=db.schema('nvb_platform');
 try{
  const {data:account,error:accountError}=await platform.from('accounts').select('id').eq('auth_user_id',command.actor_id).eq('status','active').maybeSingle();
  if(accountError)throw accountError;if(!account)return response(403,'Geen actief account.');
  const {data:grants,error:roleError}=await platform.from('account_roles').select('roles(key)').eq('account_id',account.id).eq('active',true).is('revoked_at',null);
  if(roleError)throw roleError;const roles=(grants||[]).map((g:any)=>g.roles?.key);
  const {data:mm,error:mmError}=await db.from('matchmakings').select('id,matchmaker_id,submitted_to_admin_at,huidige_eigenaar_type').eq('id',command.matchmaking_id).maybeSingle();
  if(mmError)throw mmError;
  const allowed=mm&&(action==='admin'?(mm.submitted_to_admin_at||String(mm.huidige_eigenaar_type||'').toLowerCase()==='admin')&&roles.some(r=>['controle','nvb_admin','superadmin'].includes(r)):roles.includes('matchmaker')&&mm.matchmaker_id===command.actor_id);
  if(!allowed)return response(403,'Geen bevoegdheid voor deze matchmaking en actie.');
  const ledger=platform.from('control_machine_requests');
  const {error:claimError}=await ledger.insert({id:command.request_id,action,matchmaking_id:command.matchmaking_id,actor_id:command.actor_id,status:'running'});
  if(claimError){
   if(claimError.code!=='23505')throw claimError;
   const {data:old,error:oldError}=await platform.from('control_machine_requests').select('action,matchmaking_id,actor_id,status,http_status,result').eq('id',command.request_id).maybeSingle();
   if(oldError)throw oldError;
   if(old&&action==='matchmaker-refresh'&&old.action===action&&old.matchmaking_id===command.matchmaking_id&&old.actor_id===command.actor_id&&old.status!=='running')return response(409,'Deze refresh is verwerkt. Herlaad de matchmaking.');
   if(old&&old.action===action&&old.matchmaking_id===command.matchmaking_id&&old.actor_id===command.actor_id&&old.status!=='running')return Response.json(old.result,{status:old.http_status,headers:{'Cache-Control':'no-store'}});
   return response(409,'Deze controle is al gestart. Volg de bestaande voortgang.');
  }
  let result:any,status=502;
  try{
   const original=new Request(req.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({matchmaking_id:command.matchmaking_id,...(action==='matchmaker-refresh'?{progress_stream:true}:{})})});
   const r=await withMachineActor({userId:command.actor_id,role:action==='admin'?'admin':'matchmaker',action},()=>start(original));
   if(action==='matchmaker-refresh'&&r.ok&&r.body){
    const reader=r.body.getReader();let failed=false,disconnected=false,buffer='';const decoder=new TextDecoder();
    const stream=new ReadableStream({cancel(){disconnected=true;},async start(controller){try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let nl;while((nl=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,nl);buffer=buffer.slice(nl+1);try{if(JSON.parse(line).type==='error')failed=true;}catch{failed=true;}}if(!disconnected){try{controller.enqueue(value);}catch{disconnected=true;}}}if(!disconnected)controller.close();}catch{failed=true;if(!disconnected)controller.error(Error('Voortgang onderbroken.'));}finally{await platform.from('control_machine_requests').update({status:failed?'failed':'completed',http_status:failed?502:200,result:{ok:!failed},finished_at:new Date().toISOString()}).eq('id',command.request_id).eq('status','running');}}});
    return new Response(stream,{status:r.status,headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'}});
   }
   status=r.status;result=await r.json().catch(()=>({ok:false,error:'Controle gaf geen geldig antwoord.'}));
  }catch{result={ok:false,error:'Controle kon niet worden afgerond. Raadpleeg de runstatus.'};}
  const {error:saveError}=await platform.from('control_machine_requests').update({status:status<400?'completed':'failed',http_status:status,result,finished_at:new Date().toISOString()}).eq('id',command.request_id).eq('status','running');
  if(saveError)return response(503,'Controleresultaat niet bevestigd. Volg de bestaande voortgang.');
  return Response.json(result,{status,headers:{'Cache-Control':'no-store'}});
 }catch{return response(503,'Machineautorisatie of aanvraagregistratie niet beschikbaar.');}
}
