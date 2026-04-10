import { requireAdmin } from "@/app/api/_utils/authz";
// app/api/control-engine/review/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type Decision = "approve" | "reject";

/**
 * ✅ Enige bron van waarheid:
 * user_roles → roles.name
 */
async function getUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select(`
      role_id,
      roles:roles ( name )
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getUserRole] error", error);
    return null;
  }

  const roleName = (data?.roles as any)?.name;
  return roleName ? String(roleName).toLowerCase() : null;
}

export async function POST(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json();

    const controle_resultaat_id = String(
      body?.controle_resultaat_id ?? body?.result_id ?? ""
    ).trim();

    const decision = String(body?.decision ?? "")
      .trim()
      .toLowerCase() as Decision;

    const note = String(body?.note ?? "").trim();

    if (!controle_resultaat_id) {
      return NextResponse.json(
        { error: "controle_resultaat_id ontbreekt" },
        { status: 400 }
      );
    }

    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json(
        { error: "decision moet 'approve' of 'reject' zijn" },
        { status: 400 }
      );
    }

    // ✅ Auth
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json(
        { error: "Geen Bearer token" },
        { status: 401 }
      );
    }

    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.getUser(token);

    if (userErr || !userData?.user?.id) {
      return NextResponse.json(
        { error: "Ongeldige gebruiker" },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // ✅ ROLE CHECK — JOUW ECHTE MODEL
    const role = await getUserRole(userId);

    const allowed = role === "admin" || role === "superadmin";
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Geen rechten (alleen admin/superadmin)",
          debug_role: role,
        },
        { status: 403 }
      );
    }

    // ✅ Huidige resultaat ophalen
    const { data: current, error: curErr } = await supabaseAdmin
      .from("controle_resultaten")
      .select(
        "id, resultaat, original_resultaat, actie_status, aantekeningen"
      )
      .eq("id", controle_resultaat_id)
      .maybeSingle();

    if (curErr) throw curErr;
    if (!current?.id) {
      return NextResponse.json(
        { error: "controle_resultaat niet gevonden" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const original_resultaat =
      current.original_resultaat ?? current.resultaat ?? null;

    let newResultaat: string | null = current.resultaat ?? null;
    let actie_status: string | null = current.actie_status ?? null;

    if (decision === "approve") {
      newResultaat = "ok";
      actie_status = "goedgekeurd";
    } else {
      newResultaat = "afgekeurd";
      actie_status = "afgekeurd";
    }

    const patch: any = {
      resultaat: newResultaat,
      actie_status,
      review_status: decision === "approve" ? "goedgekeurd" : "afgekeurd",
      review_note: note.length ? note : null,
      reviewed_by: userId,
      reviewed_at: now,
      original_resultaat,
      aantekeningen:
        (current.aantekeningen
          ? String(current.aantekeningen) + "\n"
          : "") +
        `[${now}] ${decision.toUpperCase()} door ${role}${
          note ? ` — ${note}` : ""
        }`,
    };

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("controle_resultaten")
      .update(patch)
      .eq("id", controle_resultaat_id)
      .select("*")
      .maybeSingle();

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, row: updated });
  } catch (e: any) {
    console.error("review route error:", e);
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
