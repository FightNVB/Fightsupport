import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
export type ControlAction='admin'|'matchmaker'|'matchmaker-refresh';
export type ControlCommand={version:1;action:ControlAction;matchmaking_id:string;actor_id:string;request_id:string;issued_at:number};
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function commandText(c:ControlCommand){return [c.version,c.action,c.matchmaking_id,c.actor_id,c.request_id,c.issued_at].join('\n');}
export function validCommand(c:any,action:ControlAction,now=Date.now()):c is ControlCommand{return !!c&&Object.keys(c).sort().join(',')==='action,actor_id,issued_at,matchmaking_id,request_id,version'&&c.version===1&&c.action===action&&typeof c.matchmaking_id==='string'&&uuid.test(c.matchmaking_id)&&typeof c.actor_id==='string'&&uuid.test(c.actor_id)&&typeof c.request_id==='string'&&uuid.test(c.request_id)&&Number.isSafeInteger(c.issued_at)&&Math.abs(now-c.issued_at)<=60000;}
export function signCommand(c:ControlCommand,key:string){if(key.length<32)throw Error('Machineconfiguratie ontbreekt.');return createHmac('sha256',key).update(commandText(c)).digest('hex');}
export function verifyCommand(c:any,action:ControlAction,signature:string,key:string,now=Date.now()):c is ControlCommand{if(key.length<32||!validCommand(c,action,now)||! /^[a-f0-9]{64}$/.test(signature))return false;return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(signCommand(c,key),'hex'));}
