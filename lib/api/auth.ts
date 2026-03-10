// lib/api/auth.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type AuthUser = {
  userId: string;
  role: string;
};

export async function requireUserFromAuthHeader(req: NextRequest): Promise<AuthUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error("UNAUTHORIZED");
  }

  const user = data.user;

  const role =
    (user.app_metadata as any)?.role ??
    (user.user_metadata as any)?.role ??
    null;

  if (!role) {
    throw new Error("NO_ROLE");
  }

  return {
    userId: user.id,
    role: String(role),
  };
}