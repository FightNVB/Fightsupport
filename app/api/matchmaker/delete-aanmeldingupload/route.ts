import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error(error?.message || "Niet ingelogd.");
  }

  return data.user;
}

async function requireMatchmakerAccess(matchmaking_id: string, user_id: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select("id, matchmaker_id, uploaded_by, huidige_eigenaar_user_id")
    .eq("id", matchmaking_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");

  const allowed =
    data.matchmaker_id === user_id ||
    data.uploaded_by === user_id ||
    data.huidige_eigenaar_user_id === user_id;

  if (!allowed) throw new Error("Geen toegang tot deze matchmaking.");
}

async function safeDelete(params: {
  table: string;
  matchmaking_id: string;
  column: string;
  value: string;
}) {
  const { table, matchmaking_id, column, value } = params;

  const { count, error } = await supabaseAdmin
    .from(table)
    .delete({ count: "exact" })
    .eq("matchmaking_id", matchmaking_id)
    .eq(column, value);

  if (error) {
    const code = String((error as any)?.code || "");
    const message = String(error.message || "");

    if (
      code === "42703" ||
      code === "PGRST204" ||
      code === "PGRST205" ||
      message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("Could not find")
    ) {
      console.warn(`${table}.${column} niet gevonden, overgeslagen.`);
      return 0;
    }

    throw new Error(`${table}: ${message}`);
  }

  return count ?? 0;
}

export async function DELETE(req: Request) {
  try {
    const user = await getUser(req);
    const body = await req.json().catch(() => ({}));

    const matchmaking_id = s(body.matchmaking_id);
    const upload_id = s(body.upload_id);

    if (!matchmaking_id) {
      return NextResponse.json(
        { ok: false, error: "matchmaking_id ontbreekt." },
        { status: 400 }
      );
    }

    if (!upload_id) {
      return NextResponse.json(
        { ok: false, error: "upload_id ontbreekt." },
        { status: 400 }
      );
    }

    await requireMatchmakerAccess(matchmaking_id, user.id);

    const deleted: Record<string, number> = {};

    deleted.aanmeldingen = await safeDelete({
      table: "aanmeldingen",
      matchmaking_id,
      column: "upload_batch_id",
      value: upload_id,
    });

    deleted.matchmaking_bouts_raw = await safeDelete({
      table: "matchmaking_bouts_raw",
      matchmaking_id,
      column: "upload_id",
      value: upload_id,
    });

    deleted.matchmaker_fighters_raw = await safeDelete({
      table: "matchmaker_fighters_raw",
      matchmaking_id,
      column: "upload_batch_id",
      value: upload_id,
    });

    deleted.matchmaker_fighter_context = await safeDelete({
      table: "matchmaker_fighter_context",
      matchmaking_id,
      column: "upload_batch_id",
      value: upload_id,
    });

    deleted.matchmaker_uitslagen_raw = await safeDelete({
      table: "matchmaker_uitslagen_raw",
      matchmaking_id,
      column: "upload_batch_id",
      value: upload_id,
    });

    const { count: uploadCount, error: uploadErr } = await supabaseAdmin
      .from("matchmaker_uploads")
      .delete({ count: "exact" })
      .eq("id", upload_id)
      .eq("matchmaking_id", matchmaking_id);

    if (uploadErr) {
      throw new Error(`matchmaker_uploads: ${uploadErr.message}`);
    }

    deleted.matchmaker_uploads = uploadCount ?? 0;

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      upload_id,
      deleted,
    });
  } catch (err: any) {
    console.error("delete-aanmeldingupload error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Upload verwijderen mislukt.",
      },
      { status: 500 }
    );
  }
}