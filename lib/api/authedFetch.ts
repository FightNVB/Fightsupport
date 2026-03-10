"use client";

import { supabase } from "@/lib/supabaseClient";

/**
 * Client-side fetch helper that automatically adds:
 * Authorization: Bearer <access_token>
 *
 * ✅ No cookies / SSR needed.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token ?? null;

  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
