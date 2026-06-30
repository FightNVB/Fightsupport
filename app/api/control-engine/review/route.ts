// app/api/control-engine/review/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type Decision = "approve" | "reject";

function nowIso() {
  return new Date().toISOString();
}

type NormalizedResultaat = "ok" | "info" | "actie" | "afgekeurd" | "dispensatie";

function normalizeResultaat(v: any): NormalizedResultaat {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "ok" || s === "goedgekeurd") return "ok";
  if (s === "info" || s === "let op" || s === "let_op") return "info";
  if (s === "dispensatie") return "dispensatie";
  if (s === "afkeur" || s === "afgekeurd" || s === "afkeuren") return "afgekeurd";
  return "actie";
}

function normalizeRole(v: any): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function isVerbodMelding(hay: string): boolean {
  // Startverbod en ieder ander "verbod" mag alleen door superadmin worden gereviewd.
  return hay.includes("verbod");
}

function normalizeVa(v: any): string | null {
  const digits = String(v ?? "").replace(/\D+/g, "").replace(/^0+/, "");
  return digits || null;
}

function cleanText(v: any): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function buildReviewNote(row: any, note: string | null): string | null {
  // Belangrijk voor audit: bij goedkeuren zonder losse notitie willen we
  // alsnog de oorspronkelijke melding/reden kunnen terugzien.
  return (
    cleanText(note) ??
    cleanText(row?.review_note) ??
    cleanText(row?.aantekeningen) ??
    cleanText(row?.boodschap) ??
    cleanText(row?.rule) ??
    cleanText(row?.rule_code) ??
    null
  );
}

function buildOriginalResultaat(row: any): string | null {
  return cleanText(row?.original_resultaat) ?? cleanText(row?.resultaat);
}

async function resolveControleResultaatRow(body: any) {
  const controle_resultaat_id = cleanText(body?.controle_resultaat_id ?? body?.id);

  if (controle_resultaat_id) {
    const { data, error } = await supabase
      .from("controle_resultaten")
      .select("*")
      .eq("id", controle_resultaat_id)
      .single();

    if (error || !data) return { row: null, error: "Controle-regel niet gevonden" };
    return { row: data, error: null };
  }

  const matchmaking_id = cleanText(body?.matchmaking_id);
  const controle_run_id = cleanText(body?.controle_run_id);
  const toernooi_code = cleanText(body?.toernooi_code ?? body?.toernooiCode)?.toUpperCase() ?? null;
  const va = normalizeVa(body?.toernooi_va_nummer ?? body?.va_nummer ?? body?.fighter_id ?? body?.fighterId ?? body?.va);
  const rule_code = cleanText(body?.rule_code);
  const rule = cleanText(body?.rule);
  const boodschap = cleanText(body?.boodschap);

  if (!matchmaking_id) {
    return { row: null, error: "controle_resultaat_id of matchmaking_id ontbreekt" };
  }

  if (!toernooi_code || !va) {
    return {
      row: null,
      error: "controle_resultaat_id ontbreekt. Gebruik anders matchmaking_id + toernooi_code + va_nummer.",
    };
  }

  let q = supabase
    .from("controle_resultaten")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("toernooi_code", toernooi_code)
    .eq("toernooi_va_nummer", va)
    .order("created_at", { ascending: false })
    .limit(2);

  if (controle_run_id) q = q.eq("controle_run_id", controle_run_id);
  if (rule_code) q = q.eq("rule_code", rule_code);
  if (rule) q = q.eq("rule", rule);
  if (boodschap) q = q.eq("boodschap", boodschap);

  const { data, error } = await q;
  if (error) throw error;

  if (!data?.length) {
    return { row: null, error: "Controle-regel niet gevonden op toernooi_code + VA" };
  }

  if (data.length > 1 && !rule_code && !rule && !boodschap) {
    return {
      row: null,
      error: "Meerdere meldingen gevonden. Stuur controle_resultaat_id of rule_code mee.",
    };
  }

  return { row: data[0], error: null };
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);

    const body = await req.json().catch(() => ({}));
    const decision = String(body?.decision ?? "").trim() as Decision;
    const note = String(body?.note ?? "").trim() || null;

    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json({ error: "Ongeldige decision (gebruik approve/reject)" }, { status: 400 });
    }

    const resolved = await resolveControleResultaatRow(body);
    if (resolved.error || !resolved.row) {
      return NextResponse.json({ error: resolved.error || "Controle-regel niet gevonden" }, { status: 404 });
    }

    const row: any = resolved.row;
    const huidig = normalizeResultaat(row.resultaat);

    const code = String(row?.rule_code ?? "").toLowerCase();
    const ruleName = String(row?.rule ?? "").toLowerCase();
    const msg = String(row?.boodschap ?? "").toLowerCase();
    const hay = `${code} ${ruleName} ${msg}`;

    const roleKey = normalizeRole(role);
    const isSuperadmin = roleKey === "superadmin";
    const isAdmin = roleKey === "admin";
    const isMatchmaker = roleKey === "matchmaker";
    const isOfficial = roleKey === "official" || roleKey === "officials";
    const isHoofdofficial =
      roleKey === "hoofdofficial" ||
      roleKey === "headofficial" ||
      roleKey === "hoofd official".replace(/\s+/g, "");

    const isVerbod = isVerbodMelding(hay);

    if (huidig === "ok") {
      return NextResponse.json({ error: "Deze melding is al OK/goedgekeurd." }, { status: 400 });
    }

    // VERBOD: alleen superadmin mag goed- of afkeuren.
    if (isVerbod && !isSuperadmin) {
      return NextResponse.json(
        { error: "Alleen superadmin mag een verbod goed- of afkeuren." },
        { status: 403 }
      );
    }

    // DISPENSATIE: normaal via dispensatie-module,
    // maar superadmin mag direct goed/afkeuren vanuit de controle-detailpagina.
    if (huidig === "dispensatie" && !isSuperadmin) {
      return NextResponse.json(
        { error: "Dispensatie kan niet via review API (gebruik dispensatie-module)." },
        { status: 400 }
      );
    }

    if (decision === "reject" && !note) {
      return NextResponse.json({ error: "Aantekeningen verplicht bij afkeuren." }, { status: 400 });
    }

    const reviewed_at = nowIso();

    const mmId = String(row?.matchmaking_id ?? body?.matchmaking_id ?? "").trim();
    if (mmId) {
      await assertCanAccessMatchmaking({ matchmaking_id: mmId, userId, role });
    } else if (!(isAdmin || isHoofdofficial || isSuperadmin)) {
      return NextResponse.json({ error: "Geen rechten" }, { status: 403 });
    }

    const isInfoOfActie = huidig === "info" || huidig === "actie";
    const isAfkeur = huidig === "afgekeurd";

    // Matchmaker + official: alleen INFO/ACTIE goedkeuren. Niet afkeuren.
    if (isMatchmaker || isOfficial) {
      if (decision !== "approve") {
        return NextResponse.json(
          { error: "Matchmakers en officials kunnen alleen INFO/ACTIE goedkeuren." },
          { status: 403 }
        );
      }

      if (!isInfoOfActie) {
        return NextResponse.json(
          { error: "Matchmakers en officials mogen alleen INFO/ACTIE meldingen goedkeuren." },
          { status: 403 }
        );
      }
    }

    // Hoofdofficial + admin: INFO/ACTIE/AFKEUR goed- of afkeuren.
    // Superadmin: alles, inclusief dispensatie en verbod.
    if (isHoofdofficial || isAdmin) {
      if (!(isInfoOfActie || isAfkeur)) {
        return NextResponse.json(
          { error: "Hoofdofficial en admin mogen alleen INFO, ACTIE en AFKEUR goed- of afkeuren." },
          { status: 403 }
        );
      }
    }

    if (!(isMatchmaker || isOfficial || isHoofdofficial || isAdmin || isSuperadmin)) {
      return NextResponse.json({ error: "Geen rechten voor review." }, { status: 403 });
    }

    const reviewNote = buildReviewNote(row, note);
    const originalResultaat = buildOriginalResultaat(row);

    if (decision === "approve") {
      const update = {
        resultaat: "ok",
        review_status: "goedgekeurd",
        reviewed_by: userId,
        reviewed_at,
        original_resultaat: originalResultaat,
        // review_note + aantekeningen bewaren de reden in de audit-trigger,
        // ook als resultaat daarna naar OK gaat.
        review_note: reviewNote,
        aantekeningen: reviewNote,
      };

      const { error: updErr } = await supabase
        .from("controle_resultaten")
        .update(update)
        .eq("id", row.id);

      if (updErr) throw updErr;

      return NextResponse.json({ ok: true, row: { ...row, ...update } });
    }

    const update = {
      resultaat: "afgekeurd",
      review_status: "afgekeurd",
      reviewed_by: userId,
      reviewed_at,
      original_resultaat: originalResultaat,
      // Bij afkeuren is note verplicht, maar fallback voorkomt lege auditregels.
      review_note: reviewNote,
      aantekeningen: reviewNote,
    };

    const { error: updErr } = await supabase
      .from("controle_resultaten")
      .update(update)
      .eq("id", row.id);

    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, row: { ...row, ...update } });
  } catch (e: any) {
    console.error("[review API]", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
