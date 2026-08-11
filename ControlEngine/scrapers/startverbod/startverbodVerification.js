const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function closeAnyModal(page) {
  const selectors = [
    "button#sluit_inr_detail",
    "button.sluit_scherm.overview",
    "button.sluit_scherm",
    "img.sluit_modal",
    "button.ui-dialog-titlebar-close",
  ];

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        await sleep(120);
      }
    } catch {}
  }

  try {
    await page.keyboard.press("Escape");
    await sleep(80);
    await page.keyboard.press("Escape");
    await sleep(80);
  } catch {}
}

async function clickTile(page, va, title) {
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(80);

  return await page.evaluate((requestedVa, requestedTitle) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
    if (!tab) return false;

    const header = [...tab.querySelectorAll(".tileHeader.enabled, .tileHeader")].find(
      (element) =>
        String(element.innerText || element.textContent || "")
          .trim()
          .toUpperCase() === requestedTitle.toUpperCase()
    );

    const tile = header?.closest(".tile");
    if (!tile) return false;

    tile.scrollIntoView?.({ block: "center" });
    tile.click();
    return true;
  }, String(va), String(title));
}

/**
 * Zelfde bron als scraper_fp_total:
 * startverbod staat rechtstreeks in de profiel-/DETAILS-samenvatting.
 * De individuele STARTVERBODEN-tegel wordt hier bewust NIET geopend.
 */
async function readHeaderAndSummary(page, va, opts = {}) {
  const {
    timeoutMs = 15000,
    pollMs = 250,
    reopenDetails = true,
  } = opts;

  await page.waitForSelector(".koptekst1", { timeout: 12000 }).catch(() => null);

  const startedAt = Date.now();
  let last = null;
  let reopened = false;

  while (!page.isClosed() && Date.now() - startedAt < timeoutMs) {
    last = await page.evaluate((requestedVa) => {
      const k1 = document.querySelector(".koptekst1");
      const k2 = document.querySelector(".koptekst2");
      const title = String(k1?.innerText || "").trim();
      const info = String(k2?.innerText || "").trim();
      const match = title.match(/^(.+?)\s*\((\d{3,6})\)\s*$/);
      const gotVa = match?.[2] || null;

      if (!gotVa || String(gotVa) !== String(requestedVa)) return null;

      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      const detailTiles = [...(tab?.querySelectorAll('div[title="DETAILS"], .tile') || [])].filter((tile) => {
        const titleAttr = String(tile.getAttribute?.("title") || "").trim().toUpperCase();
        const header = String(tile.querySelector?.(".tileHeader")?.innerText || "").trim().toUpperCase();
        const text = String(tile.innerText || tile.textContent || "").trim().toUpperCase();
        return titleAttr === "DETAILS" || header === "DETAILS" || text.startsWith("DETAILS");
      });

      const detailsTile = detailTiles[0] || null;
      if (!detailsTile) {
        return {
          va_nummer: gotVa,
          naam: match?.[1]?.trim() || null,
          header_info: info,
          summary_text: "",
          heeft_startverbod: false,
          ready: false,
        };
      }

      const contentNodes = detailsTile.querySelectorAll(
        "ul.get_tile_content p, ul.get_tile_content li, ul.get_tile_content div, .get_tile_content p, .get_tile_content li, .get_tile_content div"
      );

      let text = [...contentNodes]
        .map((element) => element.innerText || element.textContent || "")
        .join("\n");

      if (!String(text || "").trim()) {
        text = detailsTile.innerText || detailsTile.textContent || "";
      }

      text = String(text || "")
        .replace(/\u00a0/g, " ")
        .replace(/\r/g, "\n")
        .trim();

      const ready =
        /licentie/i.test(text) ||
        /wedstrijden/i.test(text) ||
        /gewonnen/i.test(text) ||
        /fit\s*to\s*fight/i.test(text) ||
        /startverbod/i.test(text);

      return {
        va_nummer: gotVa,
        naam: match?.[1]?.trim() || null,
        header_info: info,
        summary_text: text,
        heeft_startverbod: /startverbod/i.test(text),
        ready,
      };
    }, String(va)).catch(() => null);

    if (last?.ready) {
      const { ready, ...summary } = last;
      return summary;
    }

    // Zelfde herstelprincipe als Total: DETAILS één keer opnieuw openen als
    // de profielsamenvatting na enkele seconden nog niet volledig geladen is.
    if (reopenDetails && !reopened && Date.now() - startedAt > 2500) {
      reopened = true;
      await closeAnyModal(page).catch(() => {});
      await clickTile(page, va, "DETAILS").catch(() => false);
    }

    await sleep(pollMs);
  }

  if (last) {
    const { ready, ...summary } = last;
    return summary;
  }

  return null;
}

export async function verifyStartverbodCandidate(page, fighter) {
  const va = String(fighter.va_nummer);
  const summary = await readHeaderAndSummary(page, va, {
    timeoutMs: Math.max(
      15000,
      Number(process.env.STARTVERBOD_PROFILE_TIMEOUT_MS || 20000)
    ),
    pollMs: 250,
    reopenDetails: true,
  });

  if (!summary) {
    return {
      verified: false,
      fighter,
      profileName: null,
      reason: "profielsamenvatting_niet_geladen",
    };
  }

  const correctVa = String(summary.va_nummer || "") === va;
  const hasStartverbod = summary.heeft_startverbod === true;

  console.log(`[startverbod] 🔎 VA ${va} profielstatus`, {
    naam: summary.naam,
    juiste_va: correctVa,
    startverbod: hasStartverbod,
  });

  return {
    verified: correctVa && hasStartverbod,
    fighter,
    profileName: summary.naam || fighter.naam || null,
    reason: !correctVa
      ? "verkeerde_va_geopend"
      : hasStartverbod
        ? null
        : "geen_startverbod_op_profiel",
    detail: null,
    summary,
  };
}
