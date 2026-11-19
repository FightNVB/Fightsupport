import {receiveControl} from '@/lib/control-engine/nvbMachineReceiver';
import {POST as start} from '@/app/api/control-engine/officials/live-check/route';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:Request){return receiveControl(req,'official-final',start);}
