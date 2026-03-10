
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return new Response(JSON.stringify({ ok:false, error: error.message }), { status: 401, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok:true, user: data.user }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok:false, error: "Server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
