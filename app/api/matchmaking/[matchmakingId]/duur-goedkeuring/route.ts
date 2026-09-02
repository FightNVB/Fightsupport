// app/api/matchmaking/[matchmakingId]/duur-goedkeuring/route.ts

import { NextResponse } from "next/server";
import {
  assertCanAccessMatchmaking,
  requireAnyRole,
  supabaseAdmin,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const READ_ROLES = [
  "matchmaker",
  "official",
  "hoofdofficial",
  "admin",
  "superadmin",
] as const;

const APPROVE_ROLES = ["hoofdofficial"] as const;
// requireAnyRole laat superadmin altijd door, ook als die niet expliciet
// in bovenstaande lijst staat.

function isUuid(v: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim(),
  );
}

function asMinutes(v: unknown): number | null {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  // De huidige galaduur rekent met halve minuten; 1 decimaal is ruim voldoende
  // en voorkomt float-afwijkingen bij geldigheid van een goedkeuring.
  return Math.round(n * 10) / 10;
}

function asAllowedHours(v: unknown): 7 | 8 | 9 | null {
  const n = Number(v);
  return n === 7 || n === 8 || n === 9 ? n : null;
}

function amsterdamTodayYmd(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function ymdToUtcDayNumber(value: string): number | null {
  const m = String(value ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  const ms = Date.UTC(year, month - 1, day);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : null;
}

function determineMarginMinutes(eventDateRaw: unknown): 15 | 30 {
  const eventDay = ymdToUtcDayNumber(String(eventDateRaw ?? ""));
  const todayDay = ymdToUtcDayNumber(amsterdamTodayYmd());

  if (eventDay == null || todayDay == null) {
    // Bij een onbruikbare datum de strengste marge toepassen.
    return 15;
  }

  // Tot en met twee kalenderdagen vóór het gala: +30 minuten.
  // Vanaf de kalenderdag vóór het gala: +15 minuten.
  return todayDay >= eventDay - 1 ? 15 : 30;
}

function sameMinutes(a: unknown, b: unknown): boolean {
  const aa = asMinutes(a);
  const bb = asMinutes(b);
  return aa != null && bb != null && aa === bb;
}

async function getMatchmaking(matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select("id, naam, datum, aantal_uren")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw error;
  return data as
    | {
        id: string;
        naam: string | null;
        datum: string | null;
        aantal_uren: number | null;
      }
    | null;
}

function responseFromThrown(err: unknown) {
  if (err instanceof Response) return err;
  return null;
}

/**
 * GET
 *
 * /api/matchmaking/:matchmakingId/duur-goedkeuring
 * /api/matchmaking/:matchmakingId/duur-goedkeuring?berekende_minuten=434.5
 *
 * Iedereen die deze matchmaking mag zien, mag de duur-goedkeuringsstatus lezen.
 * De matchmaker gebruikt dit alleen om "goedgekeurd" / "goedkeuring nodig" te tonen.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ matchmakingId: string }> },
) {
  try {
    const { matchmakingId } = await params;

    if (!isUuid(matchmakingId)) {
      return NextResponse.json(
        { ok: false, error: "Ongeldig matchmakingId." },
        { status: 400 },
      );
    }

    const auth = await requireAnyRole(req, [...READ_ROLES]);

    await assertCanAccessMatchmaking({
      matchmaking_id: matchmakingId,
      userId: auth.userId,
      role: auth.role,
    });

    const mm = await getMatchmaking(matchmakingId);
    if (!mm) {
      return NextResponse.json(
        { ok: false, error: "Matchmaking niet gevonden." },
        { status: 404 },
      );
    }

    const aantalUren = asAllowedHours(mm.aantal_uren);
    const margeMinuten = determineMarginMinutes(mm.datum);
    const toegestaneMinuten =
      aantalUren != null ? aantalUren * 60 + margeMinuten : null;

    const url = new URL(req.url);
    const huidigeBerekendeMinuten = asMinutes(
      url.searchParams.get("berekende_minuten"),
    );

    const { data: approvals, error: approvalErr } = await supabaseAdmin
      .from("matchmaking_duur_goedkeuringen")
      .select(
        "id, matchmaking_id, aantal_uren, berekende_minuten, marge_minuten, status, approved_by, approved_by_role, approved_at, approval_note, revoked_by, revoked_by_role, revoked_at, revoke_note",
      )
      .eq("matchmaking_id", matchmakingId)
      .order("approved_at", { ascending: false })
      .limit(25);

    if (approvalErr) throw approvalErr;

    const latestApproved =
      (approvals ?? []).find((row: any) => row?.status === "approved") ?? null;

    const approvalValid =
      !!latestApproved &&
      (
        (aantalUren == null && latestApproved.aantal_uren == null) ||
        (aantalUren != null && Number(latestApproved.aantal_uren) === aantalUren)
      ) &&
      huidigeBerekendeMinuten != null &&
      sameMinutes(
        latestApproved.berekende_minuten,
        huidigeBerekendeMinuten,
      );

    const overschrijdingMinuten =
      aantalUren != null && huidigeBerekendeMinuten != null
        ? Math.round(
            (huidigeBerekendeMinuten - aantalUren * 60) * 10,
          ) / 10
        : null;

    const overAbsoluteMax =
      huidigeBerekendeMinuten != null && huidigeBerekendeMinuten > 570;

    const goedkeuringNodig =
      huidigeBerekendeMinuten != null &&
      (
        overAbsoluteMax ||
        (toegestaneMinuten != null && huidigeBerekendeMinuten > toegestaneMinuten)
      );

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      naam: mm.naam,
      datum: mm.datum,
      aantal_uren: aantalUren,
      berekende_minuten: huidigeBerekendeMinuten,
      marge_minuten: margeMinuten,
      toegestane_minuten: toegestaneMinuten,
      overschrijding_minuten: overschrijdingMinuten,
      goedkeuring_nodig: goedkeuringNodig,
      goedkeuring_geldig: approvalValid,
      can_approve:
        auth.role === "superadmin" || auth.role === "hoofdofficial",
      latest_approval: latestApproved,
    });
  } catch (err: any) {
    const thrownResponse = responseFromThrown(err);
    if (thrownResponse) return thrownResponse;

    console.error("[duur-goedkeuring][GET]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Goedkeuringsstatus ophalen mislukt.",
      },
      { status: 500 },
    );
  }
}

/**
 * POST
 *
 * Alleen hoofdofficial of superadmin.
 *
 * Approve:
 * {
 *   "action": "approve",
 *   "berekende_minuten": 434.5,
 *   "note": "Akkoord."
 * }
 *
 * Revoke:
 * {
 *   "action": "revoke",
 *   "approval_id": "uuid",
 *   "note": "Matchmaking gewijzigd."
 * }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ matchmakingId: string }> },
) {
  try {
    const { matchmakingId } = await params;

    if (!isUuid(matchmakingId)) {
      return NextResponse.json(
        { ok: false, error: "Ongeldig matchmakingId." },
        { status: 400 },
      );
    }

    const auth = await requireAnyRole(req, [...APPROVE_ROLES]);

    await assertCanAccessMatchmaking({
      matchmaking_id: matchmakingId,
      userId: auth.userId,
      role: auth.role,
    });

    if (auth.role !== "superadmin" && auth.role !== "hoofdofficial") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Alleen een superadmin of hoofdofficial mag de galaduur goedkeuren.",
        },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").trim().toLowerCase();
    const note = String(body?.note ?? "").trim() || null;

    if (action !== "approve" && action !== "revoke") {
      return NextResponse.json(
        { ok: false, error: 'action moet "approve" of "revoke" zijn.' },
        { status: 400 },
      );
    }

    const mm = await getMatchmaking(matchmakingId);
    if (!mm) {
      return NextResponse.json(
        { ok: false, error: "Matchmaking niet gevonden." },
        { status: 404 },
      );
    }

    const aantalUren = asAllowedHours(mm.aantal_uren);
    const margeMinuten = determineMarginMinutes(mm.datum);
    const toegestaneMinuten =
      aantalUren != null ? aantalUren * 60 + margeMinuten : null;
    const nowIso = new Date().toISOString();

    if (action === "approve") {
      const berekendeMinuten = asMinutes(body?.berekende_minuten);

      if (berekendeMinuten == null) {
        return NextResponse.json(
          {
            ok: false,
            error: "berekende_minuten ontbreekt of is ongeldig.",
          },
          { status: 400 },
        );
      }

      const overAbsoluteMax = berekendeMinuten > 570;
      const overIngesteldeMarge =
        toegestaneMinuten != null && berekendeMinuten > toegestaneMinuten;
      const goedkeuringNodig = overAbsoluteMax || overIngesteldeMarge;

      if (!goedkeuringNodig) {
        return NextResponse.json(
          {
            ok: false,
            error:
              aantalUren == null
                ? "Deze galaduur is niet langer dan 9,5 uur en hoeft daarom niet te worden goedgekeurd."
                : "Deze galaduur valt binnen de toegestane marge en hoeft niet te worden goedgekeurd.",
            aantal_uren: aantalUren,
            marge_minuten: margeMinuten,
            toegestane_minuten: toegestaneMinuten,
            berekende_minuten: berekendeMinuten,
          },
          { status: 422 },
        );
      }

      // Eerdere nog-actieve goedkeuringen intrekken voordat een nieuwe exacte
      // berekende duur wordt goedgekeurd. Zo is er nooit meer dan één actieve.
      const { error: revokeOldErr } = await supabaseAdmin
        .from("matchmaking_duur_goedkeuringen")
        .update({
          status: "revoked",
          revoked_by: auth.userId,
          revoked_by_role: auth.role,
          revoked_at: nowIso,
          revoke_note: "Automatisch vervangen door een nieuwe duurgoedkeuring.",
        })
        .eq("matchmaking_id", matchmakingId)
        .eq("status", "approved");

      if (revokeOldErr) throw revokeOldErr;

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("matchmaking_duur_goedkeuringen")
        .insert({
          matchmaking_id: matchmakingId,
          aantal_uren: aantalUren,
          berekende_minuten: berekendeMinuten,
          marge_minuten: margeMinuten,
          status: "approved",
          approved_by: auth.userId,
          approved_by_role: auth.role,
          approved_at: nowIso,
          approval_note: note,
        })
        .select(
          "id, matchmaking_id, aantal_uren, berekende_minuten, marge_minuten, status, approved_by, approved_by_role, approved_at, approval_note",
        )
        .single();

      if (insertErr) throw insertErr;

      return NextResponse.json({
        ok: true,
        action: "approve",
        message: "Galaduur is goedgekeurd.",
        approval: inserted,
      });
    }

    // revoke
    const approvalId = String(body?.approval_id ?? "").trim();

    let q = supabaseAdmin
      .from("matchmaking_duur_goedkeuringen")
      .select("id, status")
      .eq("matchmaking_id", matchmakingId)
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(1);

    if (approvalId) {
      if (!isUuid(approvalId)) {
        return NextResponse.json(
          { ok: false, error: "Ongeldig approval_id." },
          { status: 400 },
        );
      }
      q = q.eq("id", approvalId);
    }

    const { data: currentRows, error: currentErr } = await q;
    if (currentErr) throw currentErr;

    const current = currentRows?.[0] ?? null;
    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Geen actieve duurgoedkeuring gevonden." },
        { status: 404 },
      );
    }

    const { data: revoked, error: revokeErr } = await supabaseAdmin
      .from("matchmaking_duur_goedkeuringen")
      .update({
        status: "revoked",
        revoked_by: auth.userId,
        revoked_by_role: auth.role,
        revoked_at: nowIso,
        revoke_note: note,
      })
      .eq("id", current.id)
      .eq("matchmaking_id", matchmakingId)
      .select(
        "id, matchmaking_id, aantal_uren, berekende_minuten, marge_minuten, status, approved_by, approved_by_role, approved_at, approval_note, revoked_by, revoked_by_role, revoked_at, revoke_note",
      )
      .single();

    if (revokeErr) throw revokeErr;

    return NextResponse.json({
      ok: true,
      action: "revoke",
      message: "Goedkeuring van de galaduur is ingetrokken.",
      approval: revoked,
    });
  } catch (err: any) {
    const thrownResponse = responseFromThrown(err);
    if (thrownResponse) return thrownResponse;

    console.error("[duur-goedkeuring][POST]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Duurgoedkeuring verwerken mislukt.",
      },
      { status: 500 },
    );
  }
}
