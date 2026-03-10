import { NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

function isUuid(v: any): boolean {
  const s = String(v ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAdmin(req);

    const body = await req.json().catch(() => ({}));

    if (!isUuid(body?.resultaatId)) {
      return NextResponse.json({ error: "Ongeldige id in request." }, { status: 400 });
    }

    const { resultaatId, reason } = body ?? {};
    const reden = String(reason ?? "").trim();
    if (!reden) return NextResponse.json({ error: "Reden is verplicht." }, { status: 400 });

    // haal huidige rij op
    const { data: row, error: rErr } = await supabaseAdmin
      .from("controle_resultaten")
      .select("id, resultaat")
      .eq("id", resultaatId)
      .limit(1)
      .maybeSingle();

    if (rErr) throw rErr;
    if (!row?.id) return NextResponse.json({ error: "Resultaat niet gevonden." }, { status: 404 });

    const res = String((row as any)?.resultaat ?? "").toLowerCase();
    if (res === "dispensatie") {
      return NextResponse.json(
        { error: "Dispensatie kan niet hier. Gebruik dispensatie-module." },
        { status: 400 }
      );
    }
    if (res !== "actie" && res !== "afkeur" && res !== "afgekeurd") {
      return NextResponse.json({ error: "Alleen ACTIE of AFKEUR kan worden goedgekeurd." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // ✅ zowel ACTIE als AFKEUR worden OK na goedkeuren
    const { error: updErr } = await supabaseAdmin
      .from("controle_resultaten")
      .update({
        aantekeningen: reden,
        review_status: "goedgekeurd",
        reviewed_by: userId,
        reviewed_at: nowIso,
        original_resultaat: res,
        resultaat: "ok",
      })
      .eq("id", resultaatId);

    if (updErr) throw updErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
