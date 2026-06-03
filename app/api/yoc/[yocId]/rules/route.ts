import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildYocResults } from '@/lib/yoc/yocRules';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ yocId: string }> }) {
  const { yocId } = await params;
  const supabase = adminClient();

  try {
    const { data: run, error: runErr } = await supabase
      .from('yoc_runs')
      .insert({ yoc_event_id: yocId, run_type: 'rules', status: 'running' })
      .select('*')
      .single();
    if (runErr) throw runErr;

    await supabase.from('yoc_resultaten').delete().eq('yoc_event_id', yocId);

    const { data: contexts, error } = await supabase
      .from('yoc_fighter_context')
      .select('*')
      .eq('yoc_event_id', yocId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const results = (contexts || []).flatMap((ctx: any) =>
      buildYocResults({
        fighter_raw_id: ctx.fighter_raw_id,
        va_nummer: ctx.va_nummer,
        naam_mm: ctx.naam_mm,
        naam_fp: ctx.naam_fp,
        geslacht_mm: ctx.geslacht_mm,
        geslacht_fp: ctx.geslacht_fp,
        licentie: ctx.licentie,
        heeft_startverbod: ctx.heeft_startverbod,
        sportschool_mm: ctx.sportschool_mm,
        keurmerk_ok: ctx.keurmerk_ok,
        keurmerk_reden: ctx.keurmerk_reden,
      }).map((r) => ({ ...r, yoc_event_id: yocId, yoc_run_id: run.id }))
    );

    if (results.length) {
      const { error: insertErr } = await supabase.from('yoc_resultaten').insert(results);
      if (insertErr) throw insertErr;
    }

    await supabase.from('yoc_runs').update({ status: 'klaar', afgerond_op: new Date().toISOString() }).eq('id', run.id);
    await supabase.from('yoc_events').update({ status: 'checked', updated_at: new Date().toISOString() }).eq('id', yocId);

    return NextResponse.json({ ok: true, total_results: results.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
