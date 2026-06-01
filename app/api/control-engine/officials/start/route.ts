import { NextResponse } from "next/server";
import { buildControleBoutContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";
import {
  createControleRun,
  isActiveRunConflict,
  finishControleRunFailed,
  finishControleRunSuccess,
  loadMatchmakingBouts,
  collectUniqueVANummers,
  runFpBundleScraper,
  loadControleContextForRun,
  countControleResultaten,
  getScrapeSettings,
  dlog,
} from "@/lib/control/startControleRun";

export const runtime = "nodejs";

const SCRAPER_FILE = "scraper_fp_officials.js";
const LOG_PREFIX = "fp_bundle_official";

function isAllowedRole(role: string | null | undefined) {
  return (
    role === "official" ||
    role === "hoofdofficial" ||
    role === "superadmin"
  );
}

export async function POST(req: Request) {
  let controle_run_id: string | null = null;
  let matchmaking_id: string | null = null;

  try {
    const body = await req.json();
    matchmaking_id = (body?.matchmaking_id as string | undefined) ?? null;

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    const do_scrape = body?.do_scrape !== false;
    const settings = getScrapeSettings(body);

    const { userId, role } = await requireUserWithRole(req);

    if (!isAllowedRole(role)) {
      return NextResponse.json(
        { error: "Geen toegang tot official start route" },
        { status: 403 }
      );
    }

    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    try {
      const run = await createControleRun({
        matchmaking_id,
        gestart_door_user_id: userId ?? null,
        gestart_door_rol: role ?? null,
        run_type: "control-engine",
      });

      controle_run_id = run.id;
    } catch (err: any) {
      if (isActiveRunConflict(err)) {
        return NextResponse.json(
          {
            error: "Er draait al een actieve controle voor deze matchmaking.",
            matchmaking_id,
          },
          { status: 409 }
        );
      }
      throw err;
    }

    const bouts = await loadMatchmakingBouts(matchmaking_id);
    const va_nummers = collectUniqueVANummers(bouts);

    console.log("[control-engine/official/start] run", {
      matchmaking_id,
      controle_run_id,
      do_scrape,
      bouts: bouts.length,
      va_count: va_nummers.length,
      scraper: SCRAPER_FILE,
      role,
      userId,
      ...settings,
    });

    dlog("[control-engine/official/start] va_sample", va_nummers.slice(0, 12));

    if (do_scrape && va_nummers.length > 0) {
      console.log("[control-engine/official/start] ▶ fp_bundle start", {
        va_count: va_nummers.length,
        scraper: SCRAPER_FILE,
      });

      try {
        const res = await runFpBundleScraper({
          scraperFile: SCRAPER_FILE,
          matchmaking_id,
          controle_run_id,
          va_nummers,
          settings,
          logPrefix: LOG_PREFIX,
        });

        console.log("[control-engine/official/start] ✅ fp_bundle klaar", {
          ms: res.ms,
          va_count: va_nummers.length,
          scraper: SCRAPER_FILE,
        });
      } catch (e: any) {
        console.log(
          "[control-engine/official/start] ❌ fp_bundle failed (continuing)",
          {
            error: e?.message ?? String(e),
            scraper: SCRAPER_FILE,
          }
        );
      }
    } else {
      console.log("[control-engine/official/start] scrape skipped", {
        do_scrape,
        va_count: va_nummers.length,
        scraper: SCRAPER_FILE,
      });
    }

    console.log("[control-engine/official/start] ▶ buildControleBoutContext...");
    await buildControleBoutContext(matchmaking_id, controle_run_id);
    console.log("[control-engine/official/start] ✅ buildControleBoutContext klaar");

    console.log("[control-engine/official/start] ▶ enrichControleBoutContext...");
    await enrichControleBoutContext(matchmaking_id, controle_run_id);
    console.log("[control-engine/official/start] ✅ enrichControleBoutContext klaar");

    console.log("[control-engine/official/start] ▶ load ctxRows for rulesEngine...");
    const { rawCtxRows, ctxRowsCurrentRun, ctxRows } =
      await loadControleContextForRun({
        matchmaking_id,
        controle_run_id,
        allowFallbackToLatestMatchmakingRows: true,
      });

    console.log("[control-engine/official/start] ✅ ctxRows loaded", {
      matchmaking_rows: rawCtxRows.length,
      current_run_rows: ctxRowsCurrentRun.length,
      rows_used_for_rules: ctxRows.length,
    });

    if (bouts.length > 0 && ctxRows.length === 0) {
      throw new Error(
        `Geen controle_bout_context rows gevonden voor matchmaking ${matchmaking_id} na build/enrich. Bouts=${bouts.length}.`
      );
    }

    console.log("[control-engine/official/start] ▶ rulesEngine...");
    const hits = await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows: ctxRows as any[],
    });

    console.log("[control-engine/official/start] ✅ rulesEngine klaar", {
      hits: Array.isArray(hits) ? hits.length : 0,
    });

    console.log(
      "[control-engine/official/start] ℹ️ saveControleResultaten gebeurt in rulesEngine zelf"
    );

    if (Array.isArray(hits) && hits[0]) {
      dlog("[control-engine/official/start] hit_sample", hits[0]);
    }

    const resultaten_count = await countControleResultaten(controle_run_id);

    console.log("[control-engine/official/start] controle_resultaten count", {
      count: resultaten_count,
    });

    await finishControleRunSuccess(controle_run_id);

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      controle_run_id,
      do_scrape,
      bouts: bouts.length,
      va_count: va_nummers.length,
      ctx_rows_used: ctxRows.length,
      hits: Array.isArray(hits) ? hits.length : 0,
      resultaten_count,
      scraper: SCRAPER_FILE,
      role,
      ...settings,
    });
  } catch (err: any) {
    console.error("❌ ControlEngine official fout:", err);

    if (controle_run_id) {
      await finishControleRunFailed(controle_run_id, err);
    }

    return NextResponse.json(
      {
        error: err?.message ?? "Onbekende fout",
        controle_run_id,
        matchmaking_id,
      },
      { status: 500 }
    );
  }
}
