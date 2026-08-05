import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const EDITABLE_FIELDS = [
  "stadium",
  "status",
  "huidige_eigenaar_type",
  "huidige_eigenaar_user_id",
  "huidige_eigenaar_bondteam",
  "bondteam",
  "is_actief",
  "locked_for_editing",
  "is_archived",
] as const;

function cleanText(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function uniq(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean).map(String))];
}

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  try {
    const sp = req.nextUrl.searchParams;
    const q = cleanText(sp.get("q")).toLowerCase();
    const stadium = cleanText(sp.get("stadium"));
    const eigenaar = cleanText(sp.get("eigenaar"));
    const archived = cleanText(sp.get("archived"));

    let query = supabase
      .from("matchmakings")
      .select("*")
      .order("created_at", { ascending: false });

    if (stadium && stadium !== "alles") query = query.eq("stadium", stadium);
    if (eigenaar && eigenaar !== "alles") query = query.eq("huidige_eigenaar_type", eigenaar);

    if (archived === "actief") query = query.eq("is_archived", false);
    if (archived === "archief") query = query.eq("is_archived", true);

    const { data: rows, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
    }

    const userIds = uniq(
      (rows || []).flatMap((m: any) => [
        m.matchmaker_id,
        m.huidige_eigenaar_user_id,
        m.sent_by,
        m.last_received_by,
        m.returned_by,
        m.last_updated_by,
        m.maker_user_id,
        m.uploaded_by,
        m.hoofdofficial_id,
      ])
    );

    let profilesById: Record<string, any> = {};

    if (userIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("id, full_name, email, role, active_role, bondteam")
        .in("id", userIds);

      if (profileError) {
        return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
      }

      profilesById = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
    }

    const items = (rows || [])
      .map((m: any) => {
        const enriched = {
          ...m,
          matchmaker_profiel: m.matchmaker_id ? profilesById[m.matchmaker_id] || null : null,
          eigenaar_profiel: m.huidige_eigenaar_user_id ? profilesById[m.huidige_eigenaar_user_id] || null : null,
          sent_by_profiel: m.sent_by ? profilesById[m.sent_by] || null : null,
          last_received_by_profiel: m.last_received_by ? profilesById[m.last_received_by] || null : null,
          last_updated_by_profiel: m.last_updated_by ? profilesById[m.last_updated_by] || null : null,
          maker_profiel: m.maker_user_id ? profilesById[m.maker_user_id] || null : null,
          hoofdofficial_profiel: m.hoofdofficial_id ? profilesById[m.hoofdofficial_id] || null : null,
        };

        return enriched;
      })
      .filter((m: any) => {
        if (!q) return true;

        const haystack = [
          m.id,
          m.naam,
          m.datum,
          m.locatie,
          m.stadium,
          m.status,
          m.final_status,
          m.huidige_eigenaar_type,
          m.huidige_eigenaar_bondteam,
          m.bondteam,
          m.matchmaker_profiel?.full_name,
          m.matchmaker_profiel?.email,
          m.eigenaar_profiel?.full_name,
          m.eigenaar_profiel?.email,
          m.maker_profiel?.full_name,
          m.maker_profiel?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await requireAdmin(req);
  try {
    const body = await req.json();
    const id = cleanText(body.id);

    if (!id) {
      return NextResponse.json({ ok: false, error: "Matchmaking id ontbreekt" }, { status: 400 });
    }

    const update: Record<string, any> = {};

    for (const key of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        update[key] = body[key] === "" ? null : body[key];
      }
    }

    update.last_updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("matchmakings")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}
