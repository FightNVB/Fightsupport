// app/api/control-engine/reject-gala-duur/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function detectColumns(table: string) {
  const { data, error } = await supabaseAdmin.from(table).select("*").limit(1);
  if (error) throw error;
  const row = (data?.[0] ?? {}) as Record<string, any>;
  return new Set(Object.keys(row));
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();
    const controle_run_id = String(body?.controle_run_id ?? "").trim();

    if (!matchmaking_id || !controle_run_id) {
      return NextResponse.json(
        { error: "matchmaking_id en controle_run_id zijn verplicht" },
        { status: 400 }
      );
    }

    // ✅ Auth: official/hoofdofficial/admin/superadmin (matchmaker niet)
    const { userId, role } = await requireAnyRole(req, ["official","hoofdofficial","admin","superadmin"]);

    // ✅ Scope: official ziet alleen eigen bondteam, admin/superadmin overal
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // event_id is nice-to-have
    const { data: up } = await supabaseAdmin
      .from("matchmaking_uploads")
      .select("event_id")
      .eq("matchmaking_id", matchmaking_id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const event_id = (up as any)?.event_id ?? null;

    const cols = await detectColumns("controle_resultaten");
    const row: any = {
      matchmaking_id,
      controle_run_id,
      partij_nr: null,
      resultaat: "afkeur",
      rule: "Gala duur afgekeurd",
      rule_code: "GALA_DUUR_AFGEKEURD",
      boodschap: "Afkeuring geregistreerd (official/hoofdofficial/admin/superadmin).",
    };

    if (cols.has("event_id")) row.event_id = event_id;

    const { error } = await supabaseAdmin.from("controle_resultaten").insert(row);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("reject-gala-duur error:", e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
