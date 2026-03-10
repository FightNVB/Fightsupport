// supabase/functions/submit_matchmaking/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  try {
    const body = await req.json();

    const {
      file_path,
      raw_filename,
      evenement_naam,
      evenement_datum,
      locatie,
      promotor,
      hoofdofficial,
      uploaded_by,
    } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1️⃣ Row aanmaken in matchmaking_uploads
    const { data: uploadRow, error: insertError } = await supabase
      .from("matchmaking_uploads")
      .insert({
        evenement_naam,
        evenement_datum,
        locatie,
        bestandsnaam: file_path,
        raw_filename,
        uploaded_by,

        // 🔥 Deze waren eerder vergeten!!
        promotor,
        hoofdofficial,

        // matchmaking_id vullen met eigen id → later update
      })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      return new Response(JSON.stringify({ error: insertError }), {
        status: 400,
      });
    }

    const uploadId = uploadRow.id;

    // 2️⃣ matchmaking_id vullen met eigen id
    await supabase
      .from("matchmaking_uploads")
      .update({ matchmaking_id: uploadId })
      .eq("id", uploadId);

    // 3️⃣ parser starten (indien aanwezig)
    // Comment uit als je parser al hebt
    /*
    const { error: parseError } = await supabase.functions.invoke("parse_mm", {
      body: { upload_id: uploadId, file_path },
    });

    if (parseError) {
      console.error(parseError);
    }
    */

    return new Response(
      JSON.stringify({
        success: true,
        upload_id: uploadId,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
