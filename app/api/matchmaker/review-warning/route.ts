import { NextResponse } from "next/server";
import { requireUserWithRole, assertCanAccessMatchmaking } from "@/app/api/_utils/authz";
import { supabaseAdmin } from "@/lib/matchmaker/access";

export const runtime = "nodejs";

function asId(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req, [
      "matchmaker",
      "admin",
      "superadmin",
    ]);

    const body = await req.json().catch(() => ({}));

    const matchmaking_id = asId(body?.matchmaking_id);
    const result_id = asId(body?.result_id);
    const source = String(body?.source ?? "fighter").trim().toLowerCase();
    const action = String(body?.action ?? "").trim().toLowerCase();

    if (!matchmaking_id) {
      return NextResponse.json({ ok: false, error: "matchmaking_id ontbreekt" }, { status: 400 });
    }
    if (!result_id) {
      return NextResponse.json({ ok: false, error: "result_id ontbreekt" }, { status: 400 });
    }
    if (!["fighter", "bout"].includes(source)) {
      return NextResponse.json({ ok: false, error: "source moet fighter of bout zijn" }, { status: 400 });
    }
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ ok: false, error: "action moet approve of reject zijn" }, { status: 400 });
    }

    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const table =
      source === "bout"
        ? "controle_resultaten"
        : "controle_resultaten";

    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("matchmaking_id", matchmaking_id)
      .eq("id", result_id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message ?? "Melding verwijderen mislukt" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      result_id,
      source,
      action,
      message:
        action === "approve"
          ? "Melding goedgekeurd en uit de lijst gehaald."
          : "Melding afgekeurd en uit de lijst gehaald.",
    });
  } catch (e: any) {
    console.error("review-warning error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}
