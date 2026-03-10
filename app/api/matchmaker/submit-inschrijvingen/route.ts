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
  return c.includes("multipart/form-data") || c.includes("application/x-www-form-urlencoded");
}

async function assertOwner(matchmaker_matchmaking_id: number, user_id: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmaker_matchmakings")
    .select("id, created_by")
    .eq("id", matchmaker_matchmaking_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");
  if (String(data.created_by) !== String(user_id)) throw new Error("Geen rechten om dit te verwijderen.");

  return true;
}

export async function POST(req: Request) {
  try {
    if (!isForm(req)) {
      return NextResponse.json({ error: "Gebruik multipart/form-data" }, { status: 415 });
    }

    const fd = await req.formData();

    const uploaded_by = String(fd.get("uploaded_by") ?? "").trim() || null;
    const naam = String(fd.get("evenement_naam") ?? "").trim();
    const datum = String(fd.get("evenement_datum") ?? "").trim();
    const bondteam = String(fd.get("bondteam") ?? "").trim();
    const matchmaker_naam = String(fd.get("matchmaker") ?? "").trim() || null;

    const matchmaking_id_raw = String(fd.get("matchmaker_matchmaking_id") ?? "").trim();
    const file = fd.get("file");

    if (!uploaded_by) return NextResponse.json({ error: "uploaded_by ontbreekt" }, { status: 400 });
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Excel bestand ontbreekt" }, { status: 400 });
    }

    // Create or reuse a matchmaker draft matchmaking
    let mmId: number | null = null;

    if (matchmaking_id_raw) {
      const n = Number(matchmaking_id_raw);
      if (!Number.isFinite(n)) {
        return NextResponse.json({ error: "Ongeldig matchmaker_matchmaking_id" }, { status: 400 });
      }
      mmId = n;
      await assertOwner(mmId, uploaded_by);
    } else {
      if (!naam || !datum || !bondteam) {
        return NextResponse.json({ error: "Vul evenement naam, datum en bondteam in." }, { status: 400 });
      }

      const { data: mm, error: mmErr } = await supabaseAdmin
        .from("matchmaker_matchmakings")
        .insert({
          evenement_naam: naam,
          evenement_datum: datum,
          bondteam,
          matchmaker: matchmaker_naam,
          created_by: uploaded_by,
          status: "draft",
        })
        .select("id")
        .single();

      if (mmErr) throw new Error(mmErr.message);
      mmId = mm.id as number;
    }

    // Upload to storage (keep original filename)
    const raw_filename = file.name || "inschrijvingen.xlsx";
    const filePath = `matchmaker_inschrijvingen/${mmId}/${Date.now()}_${raw_filename}`;

    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);

    const { error: upErr } = await supabaseAdmin.storage.from("uploads").upload(filePath, buf, {
      contentType:
        (file as any).type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: true,
    });
    if (upErr) throw new Error(`Upload mislukt: ${upErr.message}`);

    // Create upload row
    const { data: up, error: upDbErr } = await supabaseAdmin
      .from("matchmaker_uploads")
      .insert({
        matchmaker_matchmaking_id: mmId,
        file_path: filePath,
        raw_filename,
        uploaded_by,
      })
      .select("id")
      .single();

    if (upDbErr) throw new Error(upDbErr.message);
    const uploadId = up.id as number;

    // Parse fighters
    const fighters = await parseExcelToFighters(buf);
    if (fighters.length === 0) {
      return NextResponse.json(
        { error: "Geen vechters gevonden in dit bestand.", matchmaker_matchmaking_id: mmId, upload_id: uploadId },
        { status: 400 }
      );
    }

    // Insert fighters (append mode)
    const rows = fighters.map((f) => ({
      matchmaker_matchmaking_id: mmId,
      upload_id: uploadId,
      row_nr: f.row_nr,

      discipline: f.discipline,
      klasse: f.klasse,
      geslacht: f.geslacht, // ✅ extra veld

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

    // ✅ Upload/inschrijvingen horen in matchmaker_inschrijvingen (input-laag)
    const { error: insErr } = await supabaseAdmin.from("matchmaker_inschrijvingen").insert(rows);
    if (insErr) throw new Error(insErr.message);

    return NextResponse.json({
      ok: true,
      matchmaker_matchmaking_id: mmId,
      upload_id: uploadId,
      inserted: rows.length,
    });
  } catch (err: any) {
    console.error("[matchmaker/submit-inschrijvingen] error", err);
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}

/**
 * DELETE body:
 *  - { action: "delete_upload", upload_id: number, matchmaker_matchmaking_id: number, user_id: string }
 *  - { action: "delete_matchmaking", matchmaker_matchmaking_id: number, user_id: string }
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const action = String(body?.action ?? "").trim();

    if (!action) return NextResponse.json({ error: "action ontbreekt" }, { status: 400 });

    if (action === "delete_upload") {
      const upload_id = Number(body?.upload_id);
      const mmId = Number(body?.matchmaker_matchmaking_id);
      const user_id = String(body?.user_id ?? "").trim();

      if (!Number.isFinite(upload_id) || !Number.isFinite(mmId) || !user_id) {
        return NextResponse.json({ error: "upload_id, matchmaker_matchmaking_id, user_id zijn verplicht" }, { status: 400 });
      }

      await assertOwner(mmId, user_id);

      const { data: up, error: upErr } = await supabaseAdmin
        .from("matchmaker_uploads")
        .select("id, file_path")
        .eq("id", upload_id)
        .eq("matchmaker_matchmaking_id", mmId)
        .maybeSingle();

      if (upErr) throw new Error(upErr.message);
      if (!up) throw new Error("Upload niet gevonden.");

      // verwijder fighters van deze upload
      const { error: delFErr } = await supabaseAdmin
        .from("matchmaker_inschrijvingen")
        .delete()
        .eq("matchmaker_matchmaking_id", mmId)
        .eq("upload_id", upload_id);
      if (delFErr) throw new Error(delFErr.message);

      // verwijder upload row
      const { error: delUErr } = await supabaseAdmin
        .from("matchmaker_uploads")
        .delete()
        .eq("id", upload_id)
        .eq("matchmaker_matchmaking_id", mmId);
      if (delUErr) throw new Error(delUErr.message);

      // verwijder storage file
      if (up.file_path) {
        const { error: rmErr } = await supabaseAdmin.storage.from("uploads").remove([up.file_path]);
        if (rmErr) console.warn("storage remove warning:", rmErr.message);
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "delete_matchmaking") {
      const mmId = Number(body?.matchmaker_matchmaking_id);
      const user_id = String(body?.user_id ?? "").trim();

      if (!Number.isFinite(mmId) || !user_id) {
        return NextResponse.json({ error: "matchmaker_matchmaking_id, user_id zijn verplicht" }, { status: 400 });
      }

      await assertOwner(mmId, user_id);

      // haal uploads (voor storage cleanup)
      const { data: ups, error: upsErr } = await supabaseAdmin
        .from("matchmaker_uploads")
        .select("id, file_path")
        .eq("matchmaker_matchmaking_id", mmId);

      if (upsErr) throw new Error(upsErr.message);

      // delete fighters
      const { error: d1 } = await supabaseAdmin
        .from("matchmaker_inschrijvingen")
        .delete()
        .eq("matchmaker_matchmaking_id", mmId);
      if (d1) throw new Error(d1.message);

      // delete uploads rows
      const { error: d2 } = await supabaseAdmin
        .from("matchmaker_uploads")
        .delete()
        .eq("matchmaker_matchmaking_id", mmId);
      if (d2) throw new Error(d2.message);

      // delete matchmaking row
      const { error: d3 } = await supabaseAdmin
        .from("matchmaker_matchmakings")
        .delete()
        .eq("id", mmId);
      if (d3) throw new Error(d3.message);

      // storage cleanup
      const paths = (ups ?? []).map((u: any) => u.file_path).filter(Boolean);
      if (paths.length) {
        const { error: rmErr } = await supabaseAdmin.storage.from("uploads").remove(paths);
        if (rmErr) console.warn("storage remove warning:", rmErr.message);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: `Onbekende action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("[matchmaker/submit-inschrijvingen][DELETE] error", err);
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}