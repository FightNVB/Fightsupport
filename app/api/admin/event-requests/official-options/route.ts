import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    await requireUserWithRole(req, ["admin", "superadmin"]);

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id, roles(name)");

    if (roleError) throw roleError;

    const officialUserIds = new Set<string>();
    for (const row of roleRows ?? []) {
      const roleName = String((row as any)?.roles?.name ?? "").toLowerCase();
      if (roleName === "hoofdofficial" || roleName === "official") {
        const userId = String((row as any)?.user_id ?? "").trim();
        if (userId) officialUserIds.add(userId);
      }
    }

    const ids = Array.from(officialUserIds);
    if (!ids.length) return NextResponse.json({ rows: [] });

    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, display_name, naam, name, username")
      .in("user_id", ids);

    if (profileError) throw profileError;

    const rows = ids.map((id) => {
      const p = (profiles ?? []).find((x: any) => x.user_id === id);
      const name =
        p?.full_name ||
        p?.display_name ||
        p?.naam ||
        p?.name ||
        p?.username ||
        id;

      return { id, name };
    });

    rows.sort((a, b) => a.name.localeCompare(b.name, "nl"));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Laden mislukt" }, { status: 500 });
  }
}
