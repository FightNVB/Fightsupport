// === Supabase Edge Function: Entry point ===
// Dient als “dispatcher” of placeholder zodat Deno niet breekt.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(() => {
  return new Response(
    JSON.stringify({
      message: "✅ Supabase Edge Functions actief",
      available: [
        "/functions/v1/fp_update",
        "/functions/v1/submit_matchmaking",
        "/functions/v1/fp_login",
      ],
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  );
});
