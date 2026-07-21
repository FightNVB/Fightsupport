import { NextResponse } from "next/server";
import { requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

type Priority = "critical" | "urgent" | "attention" | "info";
type Bucket = "today" | "soon" | "later";

type Item = {
  id: string;
  title: string;
  detail: string;
  href: string;
  priority: Priority;
  bucket: Bucket;
  kind: string;
  reason: string;
  dueLabel?: string | null;
  eventDate?: string | null;
  createdAt?: string | null;
};

const s = (v: unknown) => String(v ?? "").trim();
const low = (v: unknown) => s(v).toLowerCase();
const DAY = 86_400_000;

const CLOSED = new Set([
  "afgerond", "goedgekeurd", "afgekeurd", "gesloten", "verwerkt", "gearchiveerd",
  "definitief", "uitslagen_definitief", "completed", "done", "cancelled", "geannuleerd",
]);

function active(v: unknown) {
  return !CLOSED.has(low(v));
}

async function rows(table: string, limit = 300) {
  const { data, error } = await supabaseAdmin.from(table).select("*").limit(limit);
  if (error) {
    console.warn(`[dashboard/attention] ${table}:`, error.message);
    return [] as any[];
  }
  return (data ?? []) as any[];
}

function eventName(r: any) {
  return s(r.naam || r.evenement_naam || r.event_naam || r.title || r.raw?.event?.naam || r.raw?.matchmaking?.naam) || "Onbenoemd dossier";
}

function parseDate(value: unknown): Date | null {
  const text = s(value);
  if (!text) return null;
  const date = new Date(text.length === 10 ? `${text}T12:00:00` : text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventDate(r: any): Date | null {
  return parseDate(
    r.datum ?? r.event_datum ?? r.evenement_datum ?? r.event_date ?? r.datum_event ??
    r.raw?.event?.datum ?? r.raw?.matchmaking?.datum,
  );
}

function createdDate(r: any): Date | null {
  return parseDate(r.submitted_to_admin_at ?? r.updated_at ?? r.last_updated_at ?? r.created_at);
}

function daysUntil(date: Date | null, now = new Date()) {
  if (!date) return null;
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((b - a) / DAY);
}

function ageDays(date: Date | null, now = new Date()) {
  if (!date) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY));
}

function isoDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function dueText(date: Date | null, now = new Date()) {
  const days = daysUntil(date, now);
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)} dag${Math.abs(days) === 1 ? "" : "en"} geleden`;
  if (days === 0) return "Vandaag";
  if (days === 1) return "Morgen";
  return `Over ${days} dagen`;
}

function ageText(days: number | null) {
  if (days === null || days < 1) return "Nieuw";
  return `Wacht ${days} dag${days === 1 ? "" : "en"}`;
}

function bucketFor(priority: Priority, days: number | null): Bucket {
  if (priority === "critical" || priority === "urgent") return "today";
  if (days !== null && days <= 7) return "soon";
  return priority === "attention" ? "soon" : "later";
}

function push(items: Item[], input: Omit<Item, "bucket"> & { bucket?: Bucket }) {
  items.push({ ...input, bucket: input.bucket ?? bucketFor(input.priority, daysUntil(parseDate(input.eventDate))) });
}

export async function GET(req: Request) {
  try {
    const auth = await requireUserWithRole(req, ["admin", "superadmin", "matchmaker", "official", "hoofdofficial"]);
    const role = auth.role;
    const items: Item[] = [];
    const now = new Date();

    if (role === "admin" || role === "superadmin") {
      const [matchmakings, dispensaties, afmeldingen, accounts, meldingen, cases, uitslagen, events] = await Promise.all([
        rows("matchmakings"), rows("dispensatie_requests"), rows("afmeldingen"), rows("account_requests", 150),
        rows("sportschool_vechter_meldingen"), rows("discipline_cases"), rows("uitslagen_runs"), rows("events"),
      ]);

      for (const r of dispensaties.filter((x) => active(x.status) && !x.decision)) {
        const age = ageDays(createdDate(r), now);
        const date = eventDate(r);
        const until = daysUntil(date, now);
        const priority: Priority = (age ?? 0) >= 3 || (until !== null && until <= 7) ? "critical" : "urgent";
        push(items, {
          id: `disp-${r.id}`, title: "Dispensatie vraagt een besluit", detail: eventName(r),
          href: `/dashboard/dispensatie/${r.id}`, priority, kind: "Dispensatie",
          reason: until !== null && until <= 7 ? `Evenement ${dueText(date, now)?.toLowerCase()}; besluit ontbreekt.` : `${ageText(age)} zonder besluit.`,
          dueLabel: dueText(date, now) || ageText(age), eventDate: isoDate(date), createdAt: r.created_at,
        });
      }

      for (const r of afmeldingen.filter((x) => ["nieuw", "open", "in_behandeling", "pending", "aangevraagd"].includes(low(x.status)))) {
        const age = ageDays(createdDate(r), now);
        const date = eventDate(r);
        push(items, {
          id: `afm-${r.id}`, title: "Afmelding nog niet beoordeeld", detail: eventName(r),
          href: `/dashboard/admin/algemeen/afmeldingen/${r.id}`, priority: (age ?? 0) >= 2 ? "critical" : "urgent", kind: "Afmelding",
          reason: `${ageText(age)} op beoordeling.`, dueLabel: dueText(date, now) || ageText(age), eventDate: isoDate(date), createdAt: r.created_at,
        });
      }

      for (const r of accounts.filter((x) => active(x.status))) {
        const age = ageDays(createdDate(r), now);
        push(items, {
          id: `acc-${r.id}`, title: "Nieuwe accountaanvraag", detail: s(r.email || r.naam || r.full_name) || "Nieuwe gebruiker",
          href: "/dashboard/admin/beheer/accounts-beheer", priority: (age ?? 0) >= 4 ? "urgent" : "attention", kind: "Account",
          reason: `${ageText(age)} op verwerking.`, dueLabel: ageText(age), createdAt: r.created_at,
        });
      }

      for (const r of meldingen.filter((x) => active(x.review_status || x.status))) {
        const age = ageDays(createdDate(r), now);
        push(items, {
          id: `meld-${r.id}`, title: "Sportschoolmelding vraagt beoordeling", detail: s(r.vechter_naam || r.naam || r.omschrijving) || "Nieuwe melding",
          href: "/dashboard/admin/beheer/sportschool-meldingen", priority: (age ?? 0) >= 2 ? "critical" : "urgent", kind: "Melding",
          reason: `${ageText(age)} zonder beoordeling.`, dueLabel: ageText(age), createdAt: r.created_at,
        });
      }

      for (const r of cases.filter((x) => active(x.status))) {
        const age = ageDays(createdDate(r), now);
        push(items, {
          id: `case-${r.id}`, title: "Openstaand overtredingsdossier", detail: s(r.titel || r.onderwerp || r.naam) || "Dossier vraagt opvolging",
          href: `/dashboard/admin/algemeen/overtredingen/${r.id}`, priority: (age ?? 0) >= 7 ? "urgent" : "attention", kind: "Overtreding",
          reason: `${ageText(age)} zonder afronding.`, dueLabel: ageText(age), createdAt: r.created_at,
        });
      }

      for (const r of matchmakings.filter((x) => !x.is_archived && ["ingediend_admin", "in_controle_admin", "definitieve_matchmaking_ingediend"].includes(low(x.status || x.stadium || x.final_status)))) {
        const status = low(r.status || r.stadium || r.final_status);
        const date = eventDate(r);
        const until = daysUntil(date, now);
        const age = ageDays(createdDate(r), now);
        const priority: Priority = (until !== null && until <= 5) || (age ?? 0) >= 3 ? "critical" : "urgent";
        push(items, {
          id: `mm-${r.id}`, title: status === "in_controle_admin" ? "Matchmakingcontrole afronden" : "Matchmaking wacht op controle", detail: eventName(r),
          href: `/dashboard/admin/controle/${r.id}`, priority, kind: "Matchmaking",
          reason: until !== null && until <= 7 ? `Evenement ${dueText(date, now)?.toLowerCase()} en controle is nog niet afgerond.` : `${ageText(age)} bij admin.`,
          dueLabel: dueText(date, now) || ageText(age), eventDate: isoDate(date), createdAt: r.submitted_to_admin_at || r.created_at,
        });
      }

      for (const r of uitslagen.filter((x) => ["definitief", "uitslagen_definitief", "ready_to_upload", "klaar_voor_upload"].includes(low(x.status)))) {
        const age = ageDays(createdDate(r), now);
        push(items, {
          id: `res-${r.id}`, title: "Uitslagen klaar voor verwerking", detail: eventName(r),
          href: "/dashboard/admin/uitslagen/ready-to-upload", priority: (age ?? 0) >= 2 ? "urgent" : "attention", kind: "Uitslagen",
          reason: `${ageText(age)} op definitieve verwerking.`, dueLabel: ageText(age), createdAt: r.updated_at || r.created_at,
        });
      }

      // Alleen toekomstige evenementen signaleren waarbij expliciet geen hoofdofficial bekend is.
      for (const r of events) {
        const date = eventDate(r);
        const until = daysUntil(date, now);
        if (until === null || until < 0 || until > 21 || !active(r.status)) continue;
        const hasHeadOfficial = Boolean(s(r.hoofdofficial_id || r.hoofdofficial || r.toegewezen_hoofdofficial_user_id));
        if (!hasHeadOfficial) {
          push(items, {
            id: `event-ho-${r.id}`, title: "Hoofdofficial lijkt nog niet gekoppeld", detail: eventName(r),
            href: "/dashboard/admin/beheer/agenda", priority: until <= 7 ? "critical" : "attention", kind: "Planning",
            reason: `Evenement ${dueText(date, now)?.toLowerCase()} en er is geen hoofdofficial vastgelegd.`,
            dueLabel: dueText(date, now), eventDate: isoDate(date), createdAt: r.created_at,
          });
        }
      }
    } else if (role === "matchmaker") {
      const matchmakings = await rows("matchmakings");
      for (const r of matchmakings.filter((x) => {
        const mine = [x.huidige_eigenaar_user_id, x.matchmaker_id, x.maker_user_id, x.uploaded_by].map(s).includes(auth.userId);
        const status = low(x.status || x.stadium || x.final_status);
        return mine && !x.is_archived && (status.includes("retour") || ["bouwen_matchmaking", "concept_matchmaking", "nieuw"].includes(status));
      })) {
        const status = low(r.status || r.stadium || r.final_status);
        const date = eventDate(r);
        const until = daysUntil(date, now);
        const returned = status.includes("retour");
        const priority: Priority = returned || (until !== null && until <= 7) ? "critical" : (until !== null && until <= 14 ? "urgent" : "attention");
        push(items, {
          id: `mm-${r.id}`, title: returned ? "NVB heeft deze matchmaking teruggestuurd" : "Matchmaking is nog niet ingediend", detail: eventName(r),
          href: `/dashboard/matchmaker/matchmaking/${r.id}`, priority, kind: "Matchmaking",
          reason: returned ? "Er is een correctie of aanvulling nodig voordat je verder kunt." : (until !== null ? `Evenement ${dueText(date, now)?.toLowerCase()}; matchmaking staat nog in concept.` : "Matchmaking staat nog in concept."),
          dueLabel: dueText(date, now), eventDate: isoDate(date), createdAt: r.last_updated_at || r.created_at,
        });
      }
    } else {
      const [matchmakings, requests] = await Promise.all([rows("matchmakings"), rows("event_requests")]);
      const bondteam = s(auth.bondteam).toUpperCase();

      for (const r of matchmakings.filter((x) => {
        const sameTeam = !bondteam || [x.huidige_eigenaar_bondteam, x.bondteam].map((v) => s(v).toUpperCase()).includes(bondteam);
        const status = low(x.status || x.stadium || x.final_status);
        return sameTeam && !x.is_archived && ["klaar_voor_weegstation", "in_weegstation", "weegstation_verwerkt", "definitieve_lineup", "klaar_voor_uitslagen", "uitslagen_in_bewerking"].includes(status);
      })) {
        const status = low(r.status || r.stadium || r.final_status);
        const date = eventDate(r);
        const until = daysUntil(date, now);
        const isWeighIn = ["klaar_voor_weegstation", "in_weegstation"].includes(status);
        const isResults = status.includes("uitslag");
        const priority: Priority = until !== null && until <= 1 ? "critical" : "urgent";
        push(items, {
          id: `off-${r.id}`,
          title: isWeighIn ? "Evenement vraagt actie in het weegstation" : isResults ? "Uitslagen moeten worden afgerond" : "Evenement wacht op vervolgstap",
          detail: eventName(r),
          href: isResults ? `/dashboard/officials/uitslagen/${r.id}` : `/dashboard/officials/weegstation/${r.id}`,
          priority, kind: "Evenement",
          reason: until !== null ? `${dueText(date, now)} · huidige fase: ${s(r.status || r.stadium || r.final_status).replaceAll("_", " ")}.` : `Huidige fase: ${s(r.status || r.stadium || r.final_status).replaceAll("_", " ")}.`,
          dueLabel: dueText(date, now), eventDate: isoDate(date), createdAt: r.last_updated_at || r.created_at,
        });
      }

      for (const r of requests.filter((x) => {
        const assigned = s(x.toegewezen_hoofdofficial_user_id || x.official_id || x.user_id);
        return assigned === auth.userId && active(x.status) && low(x.status) !== "geaccepteerd";
      })) {
        const date = eventDate(r);
        const until = daysUntil(date, now);
        push(items, {
          id: `req-${r.id}`, title: "Reageer op evenementaanvraag", detail: eventName(r), href: "/dashboard/officials",
          priority: until !== null && until <= 7 ? "critical" : "attention", kind: "Aanvraag",
          reason: until !== null ? `Evenement ${dueText(date, now)?.toLowerCase()}; jouw reactie ontbreekt nog.` : "Jouw reactie ontbreekt nog.",
          dueLabel: dueText(date, now), eventDate: isoDate(date), createdAt: r.created_at,
        });
      }
    }

    const rank: Record<Priority, number> = { critical: 0, urgent: 1, attention: 2, info: 3 };
    const bucketRank: Record<Bucket, number> = { today: 0, soon: 1, later: 2 };
    items.sort((a, b) =>
      bucketRank[a.bucket] - bucketRank[b.bucket] ||
      rank[a.priority] - rank[b.priority] ||
      (daysUntil(parseDate(a.eventDate), now) ?? 9999) - (daysUntil(parseDate(b.eventDate), now) ?? 9999) ||
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );

    const counts = {
      today: items.filter((x) => x.bucket === "today").length,
      soon: items.filter((x) => x.bucket === "soon").length,
      later: items.filter((x) => x.bucket === "later").length,
    };

    const top = items[0];
    const summary = top
      ? `Begin met: ${top.title.toLowerCase()}. Daarna staan er nog ${Math.max(0, items.length - 1)} ${items.length - 1 === 1 ? "actie" : "acties"} klaar.`
      : "Alles is bijgewerkt. Er staat nu niets op je actielijst.";

    return NextResponse.json({
      ok: true,
      role,
      total: items.length,
      critical: items.filter((x) => x.priority === "critical").length,
      urgent: items.filter((x) => x.priority === "urgent").length,
      attention: items.filter((x) => x.priority === "attention").length,
      counts,
      items: items.slice(0, 40),
      summary,
    });
  } catch (e: any) {
    const status = Number(e?.status) || 500;
    return NextResponse.json({ ok: false, error: e?.message || "Dashboard kon niet worden geladen." }, { status });
  }
}
