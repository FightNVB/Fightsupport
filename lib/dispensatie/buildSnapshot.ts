export type DispensatieSnapshot = {
  evenement_naam: string | null;
  evenement_datum: string | null;
  matchmaking: any | null;
  bout: any | null;
  context: any | null;
  captured_at: string;
};

function text(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function buildDispensatieSnapshot(
  supabaseAdmin: any,
  matchmakingId: string,
  partijNr: number | null,
): Promise<DispensatieSnapshot> {
  let matchmaking: any = null;
  let evenement_naam: string | null = null;
  let evenement_datum: string | null = null;

  const { data: mm, error: mmErr } = await supabaseAdmin
    .from("matchmakings")
    .select("id,naam,datum,event_id,status")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (!mmErr && mm) {
    matchmaking = mm;
    evenement_naam = text(mm.naam);
    evenement_datum = text(mm.datum);

    const eventId = text(mm.event_id);
    if (eventId && (!evenement_naam || !evenement_datum)) {
      const { data: ev } = await supabaseAdmin
        .from("events")
        .select("id,naam,datum")
        .eq("id", eventId)
        .maybeSingle();
      if (!evenement_naam) evenement_naam = text(ev?.naam);
      if (!evenement_datum) evenement_datum = text(ev?.datum);
    }
  }

  // Oudere uploads blijven een fallback voor historische dossiers.
  if (!evenement_naam || !evenement_datum) {
    const { data: uploads } = await supabaseAdmin
      .from("matchmaking_uploads")
      .select("evenement_naam,evenement_datum,uploaded_at")
      .eq("matchmaking_id", matchmakingId)
      .order("uploaded_at", { ascending: false })
      .limit(1);

    const up = uploads?.[0] ?? null;
    if (!evenement_naam) evenement_naam = text(up?.evenement_naam);
    if (!evenement_datum) evenement_datum = text(up?.evenement_datum);
  }

  let bout: any = null;
  let context: any = null;

  if (partijNr != null) {
    const [{ data: boutRows }, { data: ctxRows }] = await Promise.all([
      supabaseAdmin
        .from("matchmaking_bouts_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("partij_nr", partijNr)
        .limit(1),
      supabaseAdmin
        .from("controle_bout_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("partij_nr", partijNr)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    bout = boutRows?.[0] ?? null;
    context = ctxRows?.[0] ?? null;
  }

  return {
    evenement_naam,
    evenement_datum,
    matchmaking,
    bout,
    context,
    captured_at: new Date().toISOString(),
  };
}
