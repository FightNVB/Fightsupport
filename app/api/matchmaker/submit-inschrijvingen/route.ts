import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseExcelToFighters } from "./parse_inschrijvingen";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export const runtime = "nodejs";

function ct(req: Request) {
  return (req.headers.get("content-type") ?? "").toLowerCase();
}

function isForm(req: Request) {
  const c = ct(req);
  return (
    c.includes("multipart/form-data") ||
    c.includes("application/x-www-form-urlencoded")
  );
}

async function assertOwner(matchmaking_id: string, user_id: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmaker_matchmakings")
    .select("id, matchmaker_id")
    .eq("id", matchmaking_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");

  if (String(data.matchmaker_id ?? "") !== String(user_id)) {
    throw new Error("Geen rechten voor deze matchmaking.");
  }

  return true;
}

export async function POST(req: Request) {
  try {
    if (!isForm(req)) {
      return NextResponse.json(
        { error: "Gebruik multipart/form-data" },
        { status: 415 }
      );
    }

    const fd = await req.formData();

    const uploaded_by = String(fd.get("uploaded_by") ?? "").trim();
    const matchmaking_id = String(fd.get("matchmaking_id") ?? "").trim();
    const file = fd.get("file");

    if (!uploaded_by) {
      return NextResponse.json(
        { error: "uploaded_by ontbreekt" },
        { status: 400 }
      );
    }

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Excel bestand ontbreekt" },
        { status: 400 }
      );
    }

    await assertOwner(matchmaking_id, uploaded_by);

    const raw_filename = file.name || "inschrijvingen.xlsx";
    const filePath = `matchmaker_inschrijvingen/${matchmaking_id}/${Date.now()}_${raw_filename}`;

    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);

    const { error: upErr } = await supabaseAdmin.storage
      .from("uploads")
      .upload(filePath, buf, {
        contentType:
          (file as any).type ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (upErr) {
      throw new Error(`Upload mislukt: ${upErr.message}`);
    }

    const { data: up, error: upDbErr } = await supabaseAdmin
      .from("matchmaker_uploads")
      .insert({
        matchmaking_id,
        storage_path: filePath,
        bestand_naam: raw_filename,
        uploaded_by,
        status: "uploaded",
      })
      .select("id")
      .single();

    if (upDbErr) throw new Error(upDbErr.message);

    const uploadId = String(up.id);

    const fighters = await parseExcelToFighters(buf);

    if (!fighters.length) {
      return NextResponse.json(
        {
          error: "Geen vechters gevonden in dit bestand.",
          matchmaking_id,
          upload_id: uploadId,
        },
        { status: 400 }
      );
    }

    const rows = fighters.map((f) => ({
      matchmaking_id,
      upload_id: uploadId,
      row_nr: f.row_nr,

      discipline: f.discipline,
      klasse: f.klasse,
      geslacht: f.geslacht,

      voornaam: f.voornaam,
      achternaam: f.achternaam,
      email: f.email,
      telefoon: f.telefoon,

      gym: f.gym,
      va_nummer: f.va_nummer,

      geboortedatum: f.geboortedatum,
      gewicht: f.gewicht,

      win: f.win,
      loss: f.loss,
      draw: f.draw,
      demo: f.demo,

      opmerkingen: f.opmerkingen,
      raw: f.raw,
      uploaded_by,
    }));

    const { error: insErr } = await supabaseAdmin
      .from("matchmaker_inschrijvingen")
      .insert(rows);

    if (insErr) throw new Error(insErr.message);

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      upload_id: uploadId,
      inserted: rows.length,
    });
  } catch (err: any) {
    console.error("[matchmaker/submit-inschrijvingen] error", err);
    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}

/**
 * DELETE body:
 *  - { action: "delete_upload", upload_id: string, matchmaking_id: string, user_id: string }
 *  - { action: "delete_matchmaking", matchmaking_id: string, user_id: string }
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const action = String(body?.action ?? "").trim();

    if (!action) {
      return NextResponse.json(
        { error: "action ontbreekt" },
        { status: 400 }
      );
    }

    if (action === "delete_upload") {
      const upload_id = String(body?.upload_id ?? "").trim();
      const matchmaking_id = String(body?.matchmaking_id ?? "").trim();
      const user_id = String(body?.user_id ?? "").trim();

      if (!upload_id || !matchmaking_id || !user_id) {
        return NextResponse.json(
          { error: "upload_id, matchmaking_id en user_id zijn verplicht" },
          { status: 400 }
        );
      }

      await assertOwner(matchmaking_id, user_id);

      const { data: up, error: upErr } = await supabaseAdmin
        .from("matchmaker_uploads")
        .select("id, storage_path")
        .eq("id", upload_id)
        .eq("matchmaking_id", matchmaking_id)
        .maybeSingle();

      if (upErr) throw new Error(upErr.message);
      if (!up) throw new Error("Upload niet gevonden.");

      const { error: delFErr } = await supabaseAdmin
        .from("matchmaker_inschrijvingen")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("upload_id", upload_id);

      if (delFErr) throw new Error(delFErr.message);

      const { error: delUErr } = await supabaseAdmin
        .from("matchmaker_uploads")
        .delete()
        .eq("id", upload_id)
        .eq("matchmaking_id", matchmaking_id);

      if (delUErr) throw new Error(delUErr.message);

      if (up.storage_path) {
        const { error: rmErr } = await supabaseAdmin.storage
          .from("uploads")
          .remove([up.storage_path]);

        if (rmErr) {
          console.warn("storage remove warning:", rmErr.message);
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "delete_matchmaking") {
      const matchmaking_id = String(body?.matchmaking_id ?? "").trim();
      const user_id = String(body?.user_id ?? "").trim();

      if (!matchmaking_id || !user_id) {
        return NextResponse.json(
          { error: "matchmaking_id en user_id zijn verplicht" },
          { status: 400 }
        );
      }

      await assertOwner(matchmaking_id, user_id);

      const { data: ups, error: upsErr } = await supabaseAdmin
        .from("matchmaker_uploads")
        .select("id, storage_path")
        .eq("matchmaking_id", matchmaking_id);

      if (upsErr) throw new Error(upsErr.message);

      const { error: d1 } = await supabaseAdmin
        .from("matchmaker_inschrijvingen")
        .delete()
        .eq("matchmaking_id", matchmaking_id);

      if (d1) throw new Error(d1.message);

      const { error: d2 } = await supabaseAdmin
        .from("matchmaker_uploads")
        .delete()
        .eq("matchmaking_id", matchmaking_id);

      if (d2) throw new Error(d2.message);

      const { error: d3 } = await supabaseAdmin
        .from("matchmaker_matchmakings")
        .delete()
        .eq("id", matchmaking_id);

      if (d3) throw new Error(d3.message);

      const paths = (ups ?? [])
        .map((u: any) => u.storage_path)
        .filter(Boolean);

      if (paths.length) {
        const { error: rmErr } = await supabaseAdmin.storage
          .from("uploads")
          .remove(paths);

        if (rmErr) {
          console.warn("storage remove warning:", rmErr.message);
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: `Onbekende action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[matchmaker/submit-inschrijvingen][DELETE] error", err);
    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}