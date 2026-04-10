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

function s(v: unknown) {
  return String(v ?? "").trim();
}

async function getUserFromBearer(req: Request) {
  const auth =
    req.headers.get("authorization") ||
    req.headers.get("Authorization") ||
    "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    return { user: null as any, token: "", error: "Geen bearer token ontvangen." };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error) {
    return { user: null as any, token: "", error: error.message };
  }

  return { user, token, error: null as string | null };
}

async function assertOwner(matchmaking_id: string, user_id: string) {
  const mmId = s(matchmaking_id);
  const userId = s(user_id);

  if (!mmId) throw new Error("matchmaking_id ontbreekt.");
  if (!userId) throw new Error("user_id ontbreekt.");

  const { data: mmRow, error: mmErr } = await supabaseAdmin
    .from("matchmaker_matchmakings")
    .select("id, matchmaker_id, uploaded_by, created_by")
    .eq("id", mmId)
    .maybeSingle();

  if (mmErr) throw new Error(mmErr.message);

  if (mmRow) {
    const allowed = [
      s(mmRow.matchmaker_id),
      s(mmRow.uploaded_by),
      s(mmRow.created_by),
    ].filter(Boolean);

    if (allowed.includes(userId)) return true;
  }

  const { data: coreRow, error: coreErr } = await supabaseAdmin
    .from("matchmakings")
    .select("id, matchmaker_id, uploaded_by, created_by")
    .eq("id", mmId)
    .maybeSingle();

  if (coreErr) throw new Error(coreErr.message);

  if (coreRow) {
    const allowed = [
      s(coreRow.matchmaker_id),
      s(coreRow.uploaded_by),
      s(coreRow.created_by),
    ].filter(Boolean);

    if (allowed.includes(userId)) return true;
  }

  throw new Error("Geen rechten voor deze matchmaking.");
}

async function syncUploadedByOnParents(matchmaking_id: string, uploaded_by: string) {
  const mmId = s(matchmaking_id);
  const userId = s(uploaded_by);

  if (!mmId || !userId) return;

  const { error: e1 } = await supabaseAdmin
    .from("matchmaker_matchmakings")
    .update({ uploaded_by: userId })
    .eq("id", mmId)
    .or(`uploaded_by.is.null,uploaded_by.eq.""`);

  if (e1) {
    console.warn(
      "[submit-inschrijvingen] matchmaker_matchmakings uploaded_by sync warning:",
      e1.message
    );
  }

  const { error: e2 } = await supabaseAdmin
    .from("matchmakings")
    .update({ uploaded_by: userId })
    .eq("id", mmId)
    .or(`uploaded_by.is.null,uploaded_by.eq.""`);

  if (e2) {
    console.warn(
      "[submit-inschrijvingen] matchmakings uploaded_by sync warning:",
      e2.message
    );
  }
}

async function bestEffortDeleteEq(table: string, column: string, value: string) {
  try {
    const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
    if (error) {
      console.warn(`[submit-inschrijvingen] delete warning ${table}.${column}:`, error.message);
    }
  } catch (e: any) {
    console.warn(`[submit-inschrijvingen] delete exception ${table}.${column}:`, e?.message);
  }
}

async function startScraperAfterUpload(matchmaking_id: string, bearerToken: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  const url = `${baseUrl.replace(/\/$/, "")}/api/matchmaker/start`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        matchmaking_id,
        do_scrape: true,
        scrape_mode: "auto",
        reset_before_run: true,
      }),
      cache: "no-store",
    });

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return {
        ok: false,
        error: json?.error ?? `Scraper start mislukt (${resp.status})`,
        response: json,
      };
    }

    return {
      ok: true,
      response: json,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "Scraper start mislukt",
      response: null,
    };
  }
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

    const bearerUser = await getUserFromBearer(req);
    if (bearerUser.error || !bearerUser.user) {
      return NextResponse.json(
        { error: bearerUser.error ?? "Niet ingelogd." },
        { status: 401 }
      );
    }

    const uploaded_by_from_body = s(fd.get("uploaded_by"));
    const uploaded_by = s(bearerUser.user.id || uploaded_by_from_body);
    const matchmaking_id = s(fd.get("matchmaking_id"));
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
    await syncUploadedByOnParents(matchmaking_id, uploaded_by);

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

    const uploadId = s(up.id);

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

    const scraper = await startScraperAfterUpload(matchmaking_id, bearerUser.token);

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      upload_id: uploadId,
      inserted: rows.length,
      uploaded_by,
      scraper_started: scraper.ok,
      scraper_error: scraper.ok ? null : scraper.error,
      scraper_response: scraper.response,
      message: scraper.ok
        ? "Upload gelukt en scraper is automatisch gestart."
        : "Upload gelukt, maar scraper starten is mislukt.",
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
 *  - { action: "delete_upload", upload_id: string, matchmaking_id: string }
 *  - { action: "delete_matchmaking", matchmaking_id: string }
 */
export async function DELETE(req: Request) {
  try {
    const bearerUser = await getUserFromBearer(req);
    if (bearerUser.error || !bearerUser.user) {
      return NextResponse.json(
        { error: bearerUser.error ?? "Niet ingelogd." },
        { status: 401 }
      );
    }

    const user_id = s(bearerUser.user.id);

    const body = await req.json().catch(() => null);
    const action = s(body?.action);

    if (!action) {
      return NextResponse.json(
        { error: "action ontbreekt" },
        { status: 400 }
      );
    }

    if (action === "delete_upload") {
      const upload_id = s(body?.upload_id);
      const matchmaking_id = s(body?.matchmaking_id);

      if (!upload_id || !matchmaking_id) {
        return NextResponse.json(
          { error: "upload_id en matchmaking_id zijn verplicht" },
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
      const matchmaking_id = s(body?.matchmaking_id);

      if (!matchmaking_id) {
        return NextResponse.json(
          { error: "matchmaking_id is verplicht" },
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

      await bestEffortDeleteEq("matchmaker_fighters_raw", "matchmaking_id", matchmaking_id);
      await bestEffortDeleteEq("matchmaker_bouts_raw", "matchmaking_id", matchmaking_id);
      await bestEffortDeleteEq("matchmaker_controle_resultaten", "matchmaking_id", matchmaking_id);
      await bestEffortDeleteEq("dispensatie_hits", "matchmaking_id", matchmaking_id);
      await bestEffortDeleteEq("dispensatie_requests", "matchmaking_id", matchmaking_id);

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

      await bestEffortDeleteEq("matchmakings", "id", matchmaking_id);

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