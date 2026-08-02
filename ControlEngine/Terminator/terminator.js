/**
 * ===========================================================
 * TERMINATOR LAUNCHER
 * ===========================================================
 * "I'll be back."
 *
 * Node/ControlEngine-kant van de centrale refresh-engine.
 * De inhoudelijke rebuild blijft bewust in de bestaande
 * Next.js/TypeScript-engine, zodat fighter- en boutlogica niet
 * dubbel wordt onderhouden.
 * ===========================================================
 */

function clean(value) {
  return String(value ?? "").trim();
}

function resolveBaseUrl(explicitBaseUrl) {
  return clean(
    explicitBaseUrl ||
      process.env.FIGHTSUPPORT_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL,
  ).replace(/\/$/, "");
}

function resolveToken(explicitToken) {
  return clean(
    explicitToken ||
      process.env.TERMINATOR_INTERNAL_TOKEN ||
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function terminateSyncRun({ syncRunId, baseUrl, token } = {}) {
  const runId = clean(syncRunId);
  if (!runId) throw new Error("syncRunId ontbreekt voor Terminator.");

  const resolvedBaseUrl = resolveBaseUrl(baseUrl);
  const resolvedToken = resolveToken(token);

  if (!resolvedBaseUrl) {
    throw new Error(
      "Terminator URL ontbreekt. Start de scraper via FightSupport of zet FIGHTSUPPORT_INTERNAL_URL.",
    );
  }
  if (!resolvedToken) {
    throw new Error(
      "Terminator interne sleutel ontbreekt. Start de scraper via FightSupport of zorg dat SUPABASE_SERVICE_ROLE_KEY beschikbaar is.",
    );
  }

  console.log(`[TERMINATOR] Target acquired: sync run ${runId}`);

  const response = await fetch(`${resolvedBaseUrl}/api/admin/terminator/run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${resolvedToken}`,
      "x-terminator-source": "control-engine",
    },
    body: JSON.stringify({ sync_run_id: runId }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Terminator HTTP ${response.status}`);
  }

  console.log(
    `[TERMINATOR] Mission complete: ${payload.fighter_contexts || 0} fighter contexts en ${payload.bouts || 0} wedstrijden rebuilt. I'll be back.`,
  );

  return payload;
}
