// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

declare global {
  // voorkomt meerdere GoTrueClient instances tijdens Next.js hot reload
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__supabaseClient ??
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__supabaseClient = supabase;
}