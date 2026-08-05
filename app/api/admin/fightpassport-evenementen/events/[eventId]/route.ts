import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "superadmin"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireRole(req, ALLOWED_ROLES);

    const { eventId } = await params;
    const id = Number(eventId);
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: "Ongeldig eventnummer." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("fightpassport_events")
      .select("*")
      .eq("event_id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Evenement niet gevonden." }, { status: 404 });

    const { data: officials, error: officialsError } = await supabaseAdmin
      .from("fightpassport_event_officials")
      .select("id,event_id,functie,naam,volgorde,last_seen_at")
      .eq("event_id", id)
      .order("volgorde", { ascending: true });

    if (officialsError) throw officialsError;

    return NextResponse.json({ event: { ...data, officials: officials ?? [] } });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("[fightpassport-evenementen/event] laden mislukt:", err);
    return NextResponse.json(
      { error: err?.message || "Evenement kon niet worden geladen." },
      { status: 500 },
    );
  }
}
