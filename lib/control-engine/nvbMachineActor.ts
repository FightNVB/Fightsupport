import 'server-only';
import {AsyncLocalStorage} from 'node:async_hooks';
import {requireUserWithRole} from '@/app/api/_utils/authz';
type Actor={userId:string;role:'admin'|'matchmaker';action:'admin'|'matchmaker'|'matchmaker-refresh'};
const context=new AsyncLocalStorage<Actor>();
export function withMachineActor<T>(actor:Actor,work:()=>T){return context.run(actor,work);}
export async function controlActor(req:Request,action:Actor['action']){const actor=context.getStore();if(actor){if(actor.action!==action)throw Error('Machineactie komt niet overeen.');return actor;}return requireUserWithRole(req);}

export function machineActor(){return context.getStore();}
