import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseYocExcel } from '@/lib/yoc/parseYocExcel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function missingColumnName(error: any): string | null {
  const msg = String(error?.message ?? '');
  return (
    msg.match(/Could not find the ['"]([^'"]+)['"] column/i)?.[1] ||
    msg.match(/'([^']+)' column of/i)?.[1] ||
    msg.match(/column "([^"]+)"/i)?.[1] ||
    null
  );
}

async function safeInsertRows(supabase: any, table: string, rows: Record<string, any>[]) {
  let body = rows.map((r) => ({ ...r }));
  const dropped: string[] = [];

  for (let attempt = 0; attempt < 40; attempt++) {
    const { data, error } = await supabase.from(table).insert(body).select('*');
    if (!error) return { data: data ?? [], error: null, dropped };

    const col = missingColumnName(error);
    if ((error.code === 'PGRST204' || error.code === '42703' || col) && col) {
      body = body.map((row) => {
        if (!(col in row)) return row;
        const next = { ...row };
        delete next[col];
        return next;
      });
      dropped.push(col);
      continue;
    }

    return { data: [], error, dropped };
  }

  return {
    data: [],
    error: new Error(`${table}: te veel ontbrekende kolommen in schema cache.`),
    dropped,
  };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const eventName = String(form.get('event_name') || 'YOC');
    const eventDate = String(form.get('event_datum') || '').trim();
    const locatie = String(form.get('locatie') || '');

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Geen bestand ontvangen.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fighters = parseYocExcel(buffer);
    const supabase = adminClient();

    const { data: event, error: eventErr } = await supabase
      .from('yoc_events')
      .insert({ naam: eventName, event_datum: eventDate || null, locatie: locatie || null, status: 'uploaded' })
      .select('*')
      .single();

    if (eventErr) throw eventErr;

    const { data: upload, error: uploadErr } = await supabase
      .from('yoc_uploads')
      .insert({ yoc_event_id: event.id, raw_filename: file.name, total_rows: fighters.length })
      .select('*')
      .single();

    if (uploadErr) throw uploadErr;

    const rows = fighters.map((f: any) => ({
      ...f,
      yoc_event_id: event.id,
      upload_id: upload.id,
      event_name: f.event_name ?? eventName,
      event_datum: (f.event_datum ?? eventDate) || null,
      locatie: (f.locatie ?? locatie) || null,
    }));

    const rowsSave = await safeInsertRows(supabase, 'yoc_fighters', rows);
    if (rowsSave.error) throw rowsSave.error;

    return NextResponse.json({
      ok: true,
      yoc_event_id: event.id,
      upload_id: upload.id,
      total: fighters.length,
      inserted: rowsSave.data?.length ?? fighters.length,
      dropped_columns: rowsSave.dropped,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
