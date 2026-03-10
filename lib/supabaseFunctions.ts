// lib/supabaseFunctions.ts
"use client";

import { supabase } from "./supabaseClient";

export async function submitMatchmaking(
  matchmakingId: string,
  userId: string
) {
  const { data, error } = await supabase.functions.invoke(
    "submit_matchmaking-ts",
    {
      body: {
        matchmaking_id: matchmakingId,
        user_id: userId,
      },
    }
  );

  if (error) {
    console.error("submitMatchmaking error:", error);
    throw error;
  }

  return data;
}

// voorbeeld voor anderen, kun je later invullen
export async function fetchFightpassportData() {
  const { data, error } = await supabase.functions.invoke(
    "fetch_fightpassport_data-ts",
    {
      body: {}, // of parameters als je die nodig hebt
    }
  );

  if (error) {
    console.error("fetchFightpassportData error:", error);
    throw error;
  }

  return data;
}
