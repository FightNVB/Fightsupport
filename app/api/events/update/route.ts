import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "id ontbreekt" }, { status: 400 });

    // allowlist patches
    const patch: Record<string, any> = {};
    for (const k of ["promotor", "matchmaker", "hoofdofficial", "status", "locatie", "bondteam"]) {
      if (k in body) patch[k] = body[k];
    }

    const { error } = await supabase.from("events").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Onbekende fout" }, { status: 500 });
  }
}
