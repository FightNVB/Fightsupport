// app/api/me/profile/route.ts
import { NextResponse } from "next/server";
import {
  requireUserFromAuthHeader,
  supabaseAdmin,
} from "@/lib/api/requireRole";

export const runtime = "nodejs";

function normalizeRole(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeBondteam(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "NULL" ? "" : normalized;
}

export async function GET(req: Request) {
  try {
    const { userId } = await requireUserFromAuthHeader(req);

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("role,bondteam")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("GET /api/me/profile user_profiles error:", error);
      return NextResponse.json(
        { error: "Profiel kon niet worden geladen." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Profiel niet gevonden." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      role: normalizeRole((data as any).role),
      bondteam: normalizeBondteam((data as any).bondteam),
    });
  } catch (err) {
    if (err instanceof NextResponse) throw err;

    console.error("GET /api/me/profile error:", err);
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
}
