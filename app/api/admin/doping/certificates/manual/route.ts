import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeVa(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,5}$/.test(digits) ? digits : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const vaNummer = normalizeVa(body?.va_nummer);

    if (!vaNummer) {
      return NextResponse.json(
        { error: "Geen geldig VA-nummer ontvangen." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase-configuratie ontbreekt op de server." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Ongeldige sessie." }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date().toISOString();
    const storagePath = `manual/${vaNummer}/${randomUUID()}`;

    const { data, error } = await admin
      .from("doping_certificates")
      .insert({
        va_nummer: vaNummer,
        invitation_id: null,
        storage_path: storagePath,
        original_filename: "Handmatig geregistreerd",
        mime_type: null,
        size_bytes: null,
        status: "goedgekeurd",
        uploaded_at: now,
        reviewed_at: now,
        reviewed_by: user.id,
        rejection_reason: null,
        created_at: now,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[doping/certificates/manual] insert fout:", error);
      return NextResponse.json(
        { error: error.message || "Certificaat registreren mislukt." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, certificate: data });
  } catch (error) {
    console.error("[doping/certificates/manual] fout:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Certificaat registreren mislukt." },
      { status: 500 }
    );
  }
}
