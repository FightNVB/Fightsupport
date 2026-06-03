import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ yocId: string }> };
type AnyRow = Record<string, any>;

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

function cleanText(v: unknown) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  return s || null;
}

function hasOwn(obj: AnyRow, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function firstProvided(body: AnyRow, keys: string[]) {
  for (const key of keys) {
    if (hasOwn(body, key)) return body[key];
  }
  return undefined;
}

function normalizeVa(v: unknown) {
  const digits = String(v ?? "").trim().replace(/\D/g, "").replace(/^0+/, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function toNumberOrNull(v: unknown) {
  const s = String(v ?? "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function cleanupOldContext(params: {
  supabase: ReturnType<typeof adminClient>;
  yocId: string;
  yocFighterId: string;
  vaValues: string[];
}) {
  const { supabase, yocId, yocFighterId, vaValues } = params;
  const vas = Array.from(new Set(vaValues.map(normalizeVa).filter(Boolean))) as string[];

  const { data: byFighter, error: byFighterErr } = await supabase
    .from("yoc_fighter_context")
    .select("id,fighter_raw_id,va_nummer,yoc_fighter_id")
    .eq("yoc_event_id", yocId)
    .eq("yoc_fighter_id", yocFighterId);
  if (byFighterErr) throw byFighterErr;

  let byVa: AnyRow[] = [];
  if (vas.length) {
    const { data, error } = await supabase
      .from("yoc_fighter_context")
      .select("id,fighter_raw_id,va_nummer,yoc_fighter_id")
      .eq("yoc_event_id", yocId)
      .in("va_nummer", vas);
    if (error) throw error;
    byVa = data || [];
  }

  const contexts = [...(byFighter || []), ...byVa];
  const contextIds = Array.from(new Set(contexts.map((r) => r.id).filter(Boolean)));
  const rawIds = Array.from(new Set(contexts.map((r) => r.fighter_raw_id).filter(Boolean)));

  if (rawIds.length) {
    await supabase.from("yoc_resultaten").delete().eq("yoc_event_id", yocId).in("fighter_raw_id", rawIds);
  }
  if (contextIds.length) {
    await supabase.from("yoc_fighter_context").delete().eq("yoc_event_id", yocId).in("id", contextIds);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { yocId } = await params;
  const supabase = adminClient();

  if (!yocId || yocId === "undefined") {
    return NextResponse.json({ ok: false, error: "Ongeldig YOC-id." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as AnyRow));
  const yocFighterId = String(body?.yoc_fighter_id ?? body?.id ?? "").trim();

  if (!yocFighterId) {
    return NextResponse.json({ ok: false, error: "Geen yoc_fighter_id meegegeven." }, { status: 400 });
  }

  const { data: oldFighter, error: oldErr } = await supabase
    .from("yoc_fighters")
    .select("*")
    .eq("id", yocFighterId)
    .eq("yoc_event_id", yocId)
    .maybeSingle();

  if (oldErr) return NextResponse.json({ ok: false, error: oldErr.message }, { status: 500 });
  if (!oldFighter) return NextResponse.json({ ok: false, error: "YOC-vechter niet gevonden." }, { status: 404 });

  const incomingVa = firstProvided(body, ["va_nummer", "va_nummer_mm", "va", "fighter_id"]);
  const va = normalizeVa(incomingVa ?? oldFighter?.va_nummer_mm ?? oldFighter?.va_nummer ?? oldFighter?.va ?? oldFighter?.fighter_id);
  if (!va) return NextResponse.json({ ok: false, error: "Geen geldig VA nummer." }, { status: 400 });

  const oldVa = normalizeVa(oldFighter?.va_nummer_mm ?? oldFighter?.va_nummer ?? oldFighter?.va ?? oldFighter?.fighter_id);
  const patch: AnyRow = { updated_at: new Date().toISOString() };

  // Alleen velden aanpassen die de page echt meestuurt. Geen bestaande waarden per ongeluk naar null zetten.
  patch.va_nummer_mm = va;
  patch.va_nummer = va;
  patch.va = va;
  patch.fighter_id = va;

  const textFields: Array<[string, string[]]> = [
    ["naam_mm", ["naam", "naam_mm"]],
    ["sportschool_mm", ["sportschool", "sportschool_mm", "gym"]],
    ["geslacht_mm", ["geslacht", "geslacht_mm"]],
    ["emailadres", ["emailadres", "email"]],
    ["telefoonnummer", ["telefoonnummer", "telefoon"]],
    ["naam_trainer", ["naam_trainer", "trainer"]],
  ];

  for (const [column, keys] of textFields) {
    const value = firstProvided(body, keys);
    if (value !== undefined) patch[column] = cleanText(value);
  }

  const gewichtValue = firstProvided(body, ["gewicht", "gewicht_mm", "kg"]);
  if (gewichtValue !== undefined) {
    patch.gewicht_mm = toNumberOrNull(gewichtValue);
    patch.gewicht = toNumberOrNull(gewichtValue);
  }

  const { data: updated, error: updateErr } = await supabase
    .from("yoc_fighters")
    .update(patch)
    .eq("id", yocFighterId)
    .eq("yoc_event_id", yocId)
    .select("*")
    .single();

  if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });

  try {
    await cleanupOldContext({ supabase, yocId, yocFighterId, vaValues: [oldVa || "", va] });
    if (oldVa && oldVa !== va) {
      await supabase.from("yoc_fighters_raw").delete().eq("yoc_event_id", yocId).eq("va_nummer", oldVa);
    }

    await supabase.from("yoc_events").update({ updated_at: new Date().toISOString() }).eq("id", yocId);

    return NextResponse.json({
      ok: true,
      yoc_event_id: yocId,
      yoc_fighter_id: yocFighterId,
      old_va_nummer: oldVa,
      va_nummer: va,
      changed_va: oldVa !== va,
      fighter: updated,
      needs_rescrape: true,
      message: "Correctie opgeslagen. Herscrape deze vechter om FightPassport-data opnieuw op te halen.",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
