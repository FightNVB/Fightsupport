import { NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

function clean(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function getBaseUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

async function findAuthUserByEmail(email: string) {
  const wanted = email.trim().toLowerCase();
  let page = 1;

  while (page <= 100) {
    const result = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (result.error) throw result.error;

    const found = result.data.users.find(
      (user) => String(user.email ?? "").trim().toLowerCase() === wanted,
    );

    if (found) {
      const metadata = (found.user_metadata ?? {}) as Record<string, unknown>;
      return {
        id: found.id,
        email: String(found.email ?? email),
        name:
          String(metadata.full_name ?? metadata.name ?? "").trim() || null,
        invited: false,
      };
    }

    if (result.data.users.length < 1000) break;
    page += 1;
  }

  return null;
}

async function findExistingUserByEmail(email: string) {
  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, full_name")
    .ilike("email", email)
    .maybeSingle();

  if (profile.error) throw profile.error;

  if ((profile.data as any)?.id) {
    return {
      id: String((profile.data as any).id),
      email: String((profile.data as any).email ?? email),
      name: String((profile.data as any).full_name ?? "").trim() || null,
      invited: false,
    };
  }

  const ownUsers = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, naam")
    .ilike("email", email)
    .maybeSingle();

  if (ownUsers.error) throw ownUsers.error;

  if ((ownUsers.data as any)?.id) {
    return {
      id: String((ownUsers.data as any).id),
      email: String((ownUsers.data as any).email ?? email),
      name:
        String(
          (ownUsers.data as any).full_name ??
            (ownUsers.data as any).naam ??
            "",
        ).trim() || null,
      invited: false,
    };
  }

  // Een bestaand Supabase Auth-account hoeft niet altijd al in
  // user_profiles of users te staan. Zoek daarom ook rechtstreeks in Auth.
  return findAuthUserByEmail(email);
}

async function upsertProfile(userId: string, email: string, naam: string | null) {
  const profileFull = { id: userId, email, full_name: naam, naam, role: "trainer", updated_at: new Date().toISOString() };
  const profileMin = { id: userId, email, full_name: naam, role: "trainer" };
  const profileRes = await supabaseAdmin.from("user_profiles").upsert(profileFull, { onConflict: "id" });
  if (profileRes.error) {
    await supabaseAdmin.from("user_profiles").upsert(profileMin, { onConflict: "id" });
  }

  const usersFull = { id: userId, email, full_name: naam, naam, role: "trainer" };
  const usersMin = { id: userId, email, full_name: naam };
  const usersRes = await supabaseAdmin.from("users").upsert(usersFull, { onConflict: "id" });
  if (usersRes.error) {
    await supabaseAdmin.from("users").upsert(usersMin, { onConflict: "id" });
  }

  const roles = await supabaseAdmin.from("roles").select("id, name").eq("name", "trainer").maybeSingle();
  const roleId = (roles.data as any)?.id;
  if (roleId) {
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role_id: roleId }, { onConflict: "user_id,role_id" });
  }
}

export async function GET(req: Request) {
  await requireAdmin(req);
  try {
    const url = new URL(req.url);
    const q = clean(url.searchParams.get("q"));
    const sportschoolId = clean(url.searchParams.get("sportschool_id"));

    let query = supabaseAdmin
      .from("sportschool_contactpersonen")
      .select("id, sportschool_id, user_id, naam, email, rol, actief, created_at, sportscholen:sportscholen!sportschool_contactpersonen_sportschool_id_fkey(naam, plaats)")
      .order("created_at", { ascending: false })
      .limit(300);

    if (sportschoolId) query = query.eq("sportschool_id", sportschoolId);

    const { data, error } = await query;
    if (error) {
      let fallbackQuery = supabaseAdmin
        .from("sportschool_contactpersonen")
        .select("id, sportschool_id, user_id, naam, email, rol, actief, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (sportschoolId) fallbackQuery = fallbackQuery.eq("sportschool_id", sportschoolId);
      const fallback = await fallbackQuery;
      if (fallback.error) throw fallback.error;
      const rows = fallback.data ?? [];
      const ids = Array.from(new Set(rows.map((r: any) => String(r.sportschool_id)).filter(Boolean)));
      const scholen = ids.length
        ? await supabaseAdmin.from("sportscholen").select("sportschool_id, naam, plaats").in("sportschool_id", ids)
        : { data: [] as any[] };
      const map = new Map((scholen.data ?? []).map((s: any) => [String(s.sportschool_id), s]));
      const filtered = q
        ? rows.filter((r: any) => `${r.naam ?? ""} ${r.email ?? ""} ${map.get(String(r.sportschool_id))?.naam ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        : rows;
      return NextResponse.json({ rows: filtered.map((r: any) => ({ ...r, sportschool: map.get(String(r.sportschool_id)) ?? null })) });
    }

    const rows = (data ?? []).map((r: any) => ({ ...r, sportschool: Array.isArray(r.sportscholen) ? r.sportscholen[0] : r.sportscholen }));
    const filtered = q ? rows.filter((r: any) => `${r.naam ?? ""} ${r.email ?? ""} ${r.sportschool?.naam ?? ""}`.toLowerCase().includes(q.toLowerCase())) : rows;
    return NextResponse.json({ rows: filtered });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await requireAdmin(req);
  try {
    const body = await req.json().catch(() => ({}));
    const sportschool_id = clean(body.sportschool_id);
    const email = clean(body.email)?.toLowerCase() ?? null;
    const naam = clean(body.naam);

    if (!sportschool_id) return NextResponse.json({ error: "sportschool_id ontbreekt" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email is verplicht. De trainer krijgt hiermee zijn inlog-uitnodiging." }, { status: 400 });

    const school = await supabaseAdmin.from("sportscholen").select("sportschool_id, naam").eq("sportschool_id", sportschool_id).maybeSingle();
    if (school.error) throw school.error;
    if (!school.data) return NextResponse.json({ error: "Sportschool niet gevonden." }, { status: 404 });

    let authUser = await findExistingUserByEmail(email);
    let invited = false;

    if (!authUser) {
      const redirectTo = `${getBaseUrl(req)}/login/set`;
      const invite = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          full_name: naam,
          role: "trainer",
          sportschool_id,
          sportschool_naam: (school.data as any)?.naam ?? null,
        },
      });

      if (invite.error || !invite.data?.user?.id) {
        return NextResponse.json({ error: invite.error?.message ?? "Gebruiker uitnodigen mislukt." }, { status: 400 });
      }

      authUser = { id: invite.data.user.id, email, name: naam, invited: true };
      invited = true;
    }

    await upsertProfile(authUser.id, email, naam ?? authUser.name ?? null);

    const payload = {
      sportschool_id,
      user_id: authUser.id,
      naam: naam ?? authUser.name,
      email,
      rol: "trainer",
      actief: body.actief === false ? false : true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("sportschool_contactpersonen")
      .upsert(payload, { onConflict: "sportschool_id,user_id" })
      .select("*")
      .single();
    if (error) throw error;

    // Geen scraperjob meer aanmaken. De Fightcrew en vechterinformatie
    // worden door de fightcrew GET-route rechtstreeks uit de database gelezen.
    return NextResponse.json({ row: data, invited });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
