import core from "./historicalStartverbodCore.cjs";

const { historyFingerprint, mergeHistoryRecord, parseHistoricalRows, parseNlDate } = core;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readHeaderInfo(page) {
  try {
    return await page.evaluate(() => {
      const header = document.querySelector(".koptekst1");
      const text = String(header?.innerText || header?.textContent || "").trim();
      const match = text.match(/\((\d{3,6})\)\s*$/);
      return { gotVa: match?.[1] || null, koptekst1: text };
    });
  } catch {
    return { gotVa: null, koptekst1: "" };
  }
}

async function isLoginPage(page) {
  try {
    return await page.evaluate(() => {
      const isVisible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      const pincode =
        document.querySelector("input.pincode") ||
        document.querySelector("input.target_input.pincode") ||
        document.querySelector("input[class*='pincode']");
      if (pincode && isVisible(pincode)) return false;

      const login = document.querySelector("input.gebruikersnaam");
      if (login && isVisible(login)) return true;

      const href = String(location.href || "").toLowerCase();
      return href.includes("login") || href.includes("#login") || href.includes("aanmeld");
    });
  } catch {
    return false;
  }
}

function fighterUrl(va) {
  return `https://fightpassport.nl/#va_vechter/${va}`;
}

// Zelfde principe als Total: vlak vóór een tegelactie nogmaals afdwingen
// dat hash én zichtbare header exact bij het gevraagde VA-nummer horen.
async function forceExactFighterUrl(page, va, timeoutMs = 30000) {
  const requestedVa = String(va);
  const url = fighterUrl(requestedVa);
  const wantedHash = `#va_vechter/${requestedVa}`;
  const startedAt = Date.now();
  let lastForcedAt = 0;
  let hardReloads = 0;

  while (!page.isClosed() && Date.now() - startedAt < timeoutMs) {
    if (await isLoginPage(page)) throw new Error("LOGIN_PAGE");

    const info = await readHeaderInfo(page);
    const currentHash = await page.evaluate(() => location.hash).catch(() => "");

    if (
      String(info?.gotVa || "") === requestedVa &&
      String(currentHash || "") === wantedHash
    ) {
      await sleep(500);

      const confirm = await readHeaderInfo(page);
      const confirmHash = await page.evaluate(() => location.hash).catch(() => "");

      if (
        String(confirm?.gotVa || "") === requestedVa &&
        String(confirmHash || "") === wantedHash
      ) {
        return true;
      }
    }

    const now = Date.now();
    if (now - lastForcedAt >= 1200) {
      lastForcedAt = now;

      await page.evaluate((forcedUrl, forcedHash) => {
        if (location.hash !== forcedHash) location.hash = forcedHash;

        if (location.href !== forcedUrl) {
          history.replaceState(null, "", forcedUrl);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
      }, url, wantedHash).catch(() => {});

      await sleep(600);

      const afterForce = await readHeaderInfo(page);
      if (
        String(afterForce?.gotVa || "") !== requestedVa &&
        hardReloads < 3
      ) {
        hardReloads++;
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 25000,
        }).catch(() => {});
        await sleep(1200);
      }
    }

    await sleep(250);
  }

  console.log(`[historie] ❌ VA ${va} kon niet exact op fighter-url worden vastgezet`, {
    urlNow: page.url(),
    header: await readHeaderInfo(page).catch(() => null),
  });

  return false;
}


async function openList(page, va) {
  // Zelfde VA-zekerheid als Total, vlak vóór de tegelactie.
  const exactVaLoaded = await forceExactFighterUrl(
    page,
    va,
    Math.max(15000, Number(process.env.HISTORY_VA_VERIFY_TIMEOUT_MS || 30000))
  );

  if (!exactVaLoaded) {
    return { ok: false, reason: "va_not_verified" };
  }

  const tileTimeoutMs = Math.max(
    10000,
    Number(process.env.HISTORY_TILE_TIMEOUT_MS || 20000)
  );

  const startedAt = Date.now();

  while (!page.isClosed() && Date.now() - startedAt < tileTimeoutMs) {
    // Pak exact de enabled STARTVERBODEN-header binnen de juiste VA-tab.
    const headerHandle = await page.evaluateHandle((requestedVa) => {
      const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
      if (!tab) return null;

      return [...tab.querySelectorAll(".tileHeader.enabled")].find(
        (element) =>
          String(element.innerText || element.textContent || "")
            .trim()
            .toUpperCase() === "STARTVERBODEN"
      ) || null;
    }, String(va));

    const header = headerHandle.asElement();

    if (!header) {
      await headerHandle.dispose().catch(() => {});
      await sleep(250);
      continue;
    }

    await page.evaluate((element) => {
      element.scrollIntoView?.({ block: "center", inline: "center" });
    }, header).catch(() => {});

    await sleep(150);

    console.log(`[historie] 🖱️ VA ${va}: Puppeteer click op enabled STARTVERBODEN-header`);

    // ElementHandle.click gebruikt Puppeteer's echte input-events,
    // maar zonder handmatig x/y of bringToFront.
    await header.click({ delay: 100 }).catch(() => null);
    await headerHandle.dispose().catch(() => {});

    const modalOpened = await page.waitForFunction(() => {
      return [...document.querySelectorAll(".dialog_header .koptekst1")]
        .some((element) =>
          String(element.textContent || "")
            .trim()
            .includes("Startverboden lijst")
        );
    }, { timeout: 6000 }).then(() => true).catch(() => false);

    if (!modalOpened) {
      // Eén fallback naar de klikmethode die eerder aantoonbaar de modal opende.
      console.warn(`[historie] ↪️ VA ${va}: header-click opende modal niet; fallback tile.click()`);

      await page.evaluate((requestedVa) => {
        const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
        const h = [...(tab?.querySelectorAll(".tileHeader.enabled") ?? [])].find(
          (element) =>
            String(element.innerText || element.textContent || "")
              .trim()
              .toUpperCase() === "STARTVERBODEN"
        );

        const tile = h?.closest(".tile");
        if (!tile) return false;

        tile.scrollIntoView?.({ block: "center", inline: "center" });
        tile.click();
        return true;
      }, String(va)).catch(() => false);

      await page.waitForFunction(() => {
        return [...document.querySelectorAll(".dialog_header .koptekst1")]
          .some((element) =>
            String(element.textContent || "")
              .trim()
              .includes("Startverboden lijst")
          );
      }, { timeout: 9000 }).catch(() => null);
    }

    const headerInfo = await page.evaluate(() => {
      const clean = (value) =>
        String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

      const visibleHeaders = [...document.querySelectorAll(".dialog_header")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        });

      const dialogHeader = visibleHeaders.find((element) =>
        clean(element.querySelector(".koptekst1")?.textContent)
          .includes("Startverboden lijst")
      );

      return {
        title: clean(dialogHeader?.querySelector(".koptekst1")?.textContent),
        name: clean(dialogHeader?.querySelector(".koptekst2")?.textContent),
      };
    }).catch(() => ({ title: "", name: "" }));

    if (headerInfo.title.includes("Startverboden lijst")) {
      return { ok: true, header: headerInfo };
    }

    await closeOverview(page).catch(() => {});
    await sleep(500);
  }

  return { ok: false, reason: "dialog_not_confirmed" };
}

async function closeOverview(page) {
  const closed = await page.evaluate(() => {
    const selectors = [
      "button.sluit_scherm.overview.hover.general_image",
      "button.sluit_scherm.overview",
      "button.sluit_scherm",
      "img.sluit_modal",
      "button.ui-dialog-titlebar-close",
    ];
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
        return true;
      }
    }
    return false;
  }).catch(() => false);

  if (!closed) await page.keyboard.press("Escape").catch(() => {});
  await sleep(200);
}

async function rawListState(page) {
  return page.evaluate(() => {
    const clean = (value) =>
      String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const isVisible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const dialogHeader = [...document.querySelectorAll(".dialog_header")]
      .filter(isVisible)
      .find((header) =>
        clean(header.querySelector(".koptekst1")?.textContent)
          .includes("Startverboden lijst")
      );

    if (!dialogHeader) {
      return {
        title: "",
        rows: [],
        headers: [],
        relevantCount: 0,
        visible: false,
        tablePresent: false,
        realRowCount: 0,
        fillerRowCount: 0,
        onlyFillers: false,
      };
    }

    const dialog =
      dialogHeader.closest(".ui-dialog, .outer, .modal, [role='dialog']") ||
      dialogHeader.parentElement?.parentElement ||
      document;

    // In SYS42 kan de tabelbody buiten het directe dialog-element staan.
    // Daarom eerst lokaal zoeken en daarna expliciet globaal naar de zichtbare body.
    const localBody = dialog.querySelector("#overview_table_body");
    const globalBodies = [...document.querySelectorAll("#overview_table_body")];
    const body =
      (localBody && isVisible(localBody) ? localBody : null) ||
      globalBodies.find(isVisible) ||
      localBody ||
      globalBodies[0] ||
      null;

    const allRows = body
      ? [...body.querySelectorAll("tr.flexlist_row")]
      : [];

    const fillerRows = allRows.filter((row) =>
      row.classList.contains("filler")
    );

    // Dit is de beslissende regel:
    // ALLES zonder .filler is een echte datarij.
    const realRows = allRows.filter((row) =>
      !row.classList.contains("filler")
    );

    const rows = realRows.map((row, index) => {
      const cells = [...row.querySelectorAll("td")];
      const columns = cells.map((cell) => clean(cell.textContent));
      return {
        index,
        firstCell: columns[0] || "",
        columns,
        className: String(row.className || ""),
      };
    });

    const headerTable =
      dialog.querySelector("#overview_table_header") ||
      [...document.querySelectorAll("#overview_table_header")].find(isVisible);

    const headers = headerTable
      ? [...headerTable.querySelectorAll("td")]
          .map((el) => clean(el.textContent))
          .filter(Boolean)
      : [];

    return {
      title: clean(dialogHeader.querySelector(".koptekst1")?.textContent),
      rows,
      headers,
      relevantCount: rows.length,
      visible: true,
      tablePresent: Boolean(body),
      realRowCount: realRows.length,
      fillerRowCount: fillerRows.length,
      onlyFillers: Boolean(
        body &&
        allRows.length > 0 &&
        realRows.length === 0 &&
        fillerRows.length === allRows.length
      ),
      realRowPreview: realRows.slice(0, 5).map((row) =>
        clean(row.textContent).slice(0, 300)
      ),
    };
  });
}

async function waitForListRows(
  page,
  va,
  timeoutMs = 120000,
  { allowEmpty = false } = {}
) {
  const effectiveTimeout = Math.max(15000, Number(timeoutMs || 0));
  const startedAt = Date.now();
  let last = null;
  let lastLogAt = 0;
  let fillerOnlySince = null;

  // Een SYS42-lijst die alleen filler-rijen bevat is doorgaans al klaar.
  // We bevestigen dit kort en triggeren één keer opnieuw om een trage tabel niet
  // ten onrechte als leeg te markeren. Hiermee daalt de normale lege VA van
  // ~37s wachten naar grofweg 6-8s, terwijl echte rijen onmiddellijk winnen.
  const fillerRetryMs = Math.max(
    1500,
    Number(process.env.HISTORY_FILLER_RETRY_MS || 2500)
  );

  const fillerEmptyMs = Math.max(
    2500,
    Number(process.env.HISTORY_FILLER_EMPTY_MS || 4000)
  );

  while (!page.isClosed() && Date.now() - startedAt < effectiveTimeout) {
    last = await rawListState(page).catch(() => null);

    if (last?.visible && Number(last?.realRowCount || 0) > 0) {
      console.log(
        `[historie] ✅ VA ${va} Startverboden-lijst GEVULD na ${Math.round((Date.now() - startedAt)/1000)}s: ${last.realRowCount} echte regel(s)`,
        { preview: last.realRowPreview ?? [] }
      );
      return { ok: true, state: last, loadState: "loaded_rows" };
    }

    if (last?.visible && last?.onlyFillers === true) {
      if (fillerOnlySince === null) fillerOnlySince = Date.now();
      const fillerMs = Date.now() - fillerOnlySince;

      // Eerste poging: fillers zijn nog geen lege tabel.
      // Na een korte stabiele filler-periode triggeren we STARTVERBODEN één keer opnieuw.
      if (!allowEmpty && fillerMs >= fillerRetryMs) {
        console.warn(
          `[historie] ♻️ VA ${va}: ${Math.round(fillerMs/1000)}s alleen filler-rijen; STARTVERBODEN opnieuw triggeren`
        );
        return { ok: false, state: last, loadState: "filler_retry" };
      }

      // Alleen na de tweede volledige tegeltrigger mag stabiel filler-only
      // als werkelijk leeg gelden.
      if (allowEmpty && fillerMs >= fillerEmptyMs) {
        console.log(
          `[historie] ℹ️ VA ${va} Startverboden-lijst LEEG: ${Math.round(fillerMs/1000)}s uitsluitend ${last.fillerRowCount} filler-rij(en)`
        );
        return { ok: true, state: last, loadState: "loaded_empty" };
      }
    } else {
      fillerOnlySince = null;
    }

    if (Date.now() - lastLogAt >= 2000) {
      lastLogAt = Date.now();
      console.log(`[historie] ⏳ VA ${va} tabelstatus`, {
        seconden: Math.round((Date.now() - startedAt) / 1000),
        tabel_aanwezig: last?.tablePresent ?? false,
        echte_rijen: last?.realRowCount ?? 0,
        filler_rijen: last?.fillerRowCount ?? 0,
        alleen_fillers: last?.onlyFillers ?? false,
        preview: last?.realRowPreview ?? [],
        tweede_poging: allowEmpty,
      });
    }

    await sleep(300);
  }

  return { ok: false, state: last, loadState: "timeout" };
}

async function openLoadedList(page, va) {
  // Eerste keer zoals een echte gebruiker klikken.
  // Alleen fillers? Dan één automatische "refresh":
  // modal sluiten -> VA opnieuw verifiëren -> tegel opnieuw echt aanklikken.
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt === 2) {
      console.log(`[historie] 🔄 VA ${va}: tweede volledige STARTVERBODEN-openpoging`);
    }

    const opened = await openList(page, va);

    if (!opened.ok) {
      if (attempt === 1) {
        await closeOverview(page).catch(() => {});
        await forceExactFighterUrl(page, va, 15000).catch(() => false);
        await sleep(750);
        continue;
      }
      return opened;
    }

    const waited = await waitForListRows(
      page,
      va,
      Math.max(15000, Number(process.env.HISTORY_LIST_TIMEOUT_MS || 45000)),
      { allowEmpty: attempt === 2 }
    );

    if (waited.ok) {
      return {
        ok: true,
        header: opened.header,
        state: waited.state,
        loadState: waited.loadState,
      };
    }

    if (attempt === 1) {
      console.log(`[historie] 🔄 VA ${va}: modal sluiten en STARTVERBODEN opnieuw openen`);
      await closeOverview(page).catch(() => {});
      await sleep(500);

      const exactAgain = await forceExactFighterUrl(page, va, 20000)
        .catch(() => false);

      if (!exactAgain) {
        return {
          ok: false,
          reason: "va_not_verified_before_retry",
          header: opened.header,
          state: waited.state,
        };
      }

      await sleep(750);
      continue;
    }

    return {
      ok: false,
      reason:
        waited.loadState === "timeout"
          ? "rows_not_loaded"
          : waited.loadState || "rows_not_loaded",
      header: opened.header,
      state: waited.state,
    };
  }

  return { ok: false, reason: "rows_not_loaded" };
}

function parseStateRows(state) {
  return parseHistoricalRows(state?.rows ?? []);
}

async function openColumnARow(page, rowIndex, va) {
  const timeoutMs = Math.max(
    30000,
    Number(process.env.HISTORY_DETAIL_OPEN_TIMEOUT_MS || 120000)
  );

  const startedAt = Date.now();
  let lastLogAt = 0;

  while (!page.isClosed() && Date.now() - startedAt < timeoutMs) {
    const target = await page.evaluateHandle((wantedIndex) => {
      const bodies = [...document.querySelectorAll("#overview_table_body")];
      const visibleBody = bodies.find((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      }) || bodies[0];

      if (!visibleBody) return null;

      // Exact hetzelfde onderscheid als bij leeg/gevuld:
      // iedere flexlist_row zonder filler is een echte regel.
      const realRows = [...visibleBody.querySelectorAll("tr.flexlist_row")]
        .filter((row) => !row.classList.contains("filler"));

      return realRows[wantedIndex] || null;
    }, rowIndex);

    const row = target.asElement();

    if (row) {
      const label = await page.evaluate((element) => {
        const firstCell = element.querySelector("td:first-child");
        return String(firstCell?.textContent || element.textContent || "")
          .replace(/\u00a0/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }, row).catch(() => "");

      const box = await row.boundingBox().catch(() => null);

      if (box && box.width > 0 && box.height > 0) {
        const x = box.x + Math.min(box.width / 2, 140);
        const y = box.y + box.height / 2;

        console.log(
          `[historie] 🖱️ VA ${va}: één klik op regel ${rowIndex + 1} (${label})`
        );

        // ÉÉN gewone klik op de echte regel.
        await page.mouse.click(x, y, {
          clickCount: 1,
          button: "left",
        });

        const opened = await page.waitForFunction(() => {
          const detailField = document.querySelector(
            "input.dddiscstartblokkade, .dddiscstartblokkade"
          );

          const detailHeaders = [...document.querySelectorAll(
            ".dialog_header .koptekst2"
          )].map((element) =>
            String(element.textContent || "").trim()
          );

          return Boolean(detailField) ||
            detailHeaders.some(
              (value) => value === "Startverbod" || value === "Schorsing"
            );
        }, { timeout: 15000 }).then(() => true).catch(() => false);

        if (opened) {
          await target.dispose().catch(() => {});
          return label;
        }
      }
    }

    await target.dispose().catch(() => {});

    if (Date.now() - lastLogAt >= 3000) {
      lastLogAt = Date.now();
      console.log(
        `[historie] ⏳ VA ${va}: regel ${rowIndex + 1} nog niet geopend na één klik`
      );
    }

    await sleep(500);
  }

  throw new Error(
    `Historische regel ${rowIndex + 1} van VA ${va} opende niet binnen de timeout.`
  );
}


async function closeDetailOnly(page) {
  // Alleen detail sluiten; de reeds geladen Startverboden-lijst blijft staan.
  await page.keyboard.press("Escape").catch(() => {});

  await page.waitForFunction(() => {
    const detail = document.querySelector("input.dddiscstartblokkade, .dddiscstartblokkade");
    const overviewTitle = String(
      document.querySelector(".dialog_header .koptekst1")?.textContent || ""
    ).trim();

    return !detail && overviewTitle.includes("Startverboden lijst");
  }, { timeout: 10000 }).catch(() => null);

  await sleep(150);
}

async function readDetails(page) {
  const ready = await page.waitForFunction(() => {
    const start = document.querySelector("input.dddiscstartblokkade, .dddiscstartblokkade");
    const reason = document.querySelector("select.dvomsdiscblokkade");
    return Boolean(start || reason);
  }, { timeout: 120000 }).then(() => true).catch(() => false);

  if (!ready) {
    throw new Error("Historisch Startverbod/Schorsing-detailscherm niet geladen na dubbelklik");
  }

  return page.evaluate(() => {
    const value = (selector) =>
      String(document.querySelector(selector)?.value || "").trim() || null;

    const text = (selector) =>
      String(document.querySelector(selector)?.textContent || "").trim() || null;

    const select = document.querySelector("select.dvomsdiscblokkade");

    const detailType =
      [...document.querySelectorAll(".dialog_header .koptekst2")]
        .map((el) => String(el.textContent || "").trim())
        .find((value) => value === "Startverbod" || value === "Schorsing") ||
      null;

    return {
      soort: detailType,
      ingang: value("input.dddiscstartblokkade"),
      einde: value("input.dddisceindblokkade"),
      reden: String(select?.selectedOptions?.[0]?.textContent || "").trim() || null,
      opmerkingen: value("textarea.dvdiscblokkadeopm"),
      aangemaakt_op: value("input.ddaangemaakt"),
      aangemaakt_door: value("input.dvaanmakerfriendlyname"),
      gewijzigd_op: value("input.ddmutatie"),
      gewijzigd_door: value("input.dvmuteerderfriendlyname"),
    };
  });
}

export async function scrapeHistoricalStartverbodPage(page, va) {
  // Eén keer openen, één keer wachten, daarna dezelfde geladen tabel behouden.
  const first = await openLoadedList(page, va);

  if (!first.ok) {
    if (first.reason === "tile_missing") {
      return { status: "skipped", reason: "tile_missing", records: [] };
    }

    throw Object.assign(
      new Error(`Startverbodenlijst voor VA ${va} kon niet betrouwbaar worden geladen.`),
      { step: "startverboden_list", type: first.reason || "rows_not_loaded" }
    );
  }

  const naamFp = first.header?.name ?? null;

  if (first.loadState === "loaded_empty") {
    await closeOverview(page).catch(() => {});
    return {
      status: "success",
      naam_fp: naamFp,
      records: [],
      reason: "empty_history",
    };
  }

  const records = [];

  // BELANGRIJK:
  // Niet eerst parseHistoricalRows() over de hele tabel laten bepalen welke regels
  // Puppeteer überhaupt aanklikt. Die parser filtert regels weg als de datum niet
  // parseerbaar is. Daardoor kan een geldige Schorsing verdwijnen vóór de klik.
  //
  // We bewaren daarom de ORIGINELE index van iedere echte Startverbod/Schorsing-regel
  // en klikken die altijd. Pas ná het openen combineren we overzicht + details.
  const rawRows = (first.state?.rows ?? []).map((row, originalIndex) => ({
    originalIndex,
    filler: false,
    columns: Array.isArray(row?.columns) ? row.columns : [],
  }));

  const rowsToOpen = rawRows.filter((row) => {
    const soort = String(row.columns?.[0] || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return soort === "Startverbod" || soort === "Schorsing";
  });

  console.log(
    `[historie] 📋 VA ${va}: ${rowsToOpen.length} historische regel(s) openen`,
    {
      soorten: rowsToOpen.map((row) =>
        String(row.columns?.[0] || "").replace(/\s+/g, " ").trim()
      ),
    }
  );

  for (let pos = 0; pos < rowsToOpen.length; pos++) {
    const raw = rowsToOpen[pos];
    const originalIndex = raw.originalIndex;

    // Probeer de normale parser voor de overzichtsdata. Als die deze regel afwijst
    // (bijv. afwijkende/onvolledige datum), openen we hem alsnog en vullen we hem
    // verder vanuit het detailscherm.
    const parsedBase = parseHistoricalRows([
      { filler: false, columns: raw.columns },
    ])[0] || null;

    const columns = raw.columns.map((value) =>
      String(value ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );

    const fallbackBase = {
      soort: columns[0] || null,
      ingang: parseNlDate(columns[1]) || null,
      einde: parseNlDate(columns[2]) || null,
      door: columns[3] || null,
      reden: columns[4] || null,
      evenement: columns[5] || null,
      eventdatum: parseNlDate(columns[6]) || null,
    };

    const base = parsedBase || fallbackBase;

    // Klik exact de oorspronkelijke tabelregel. Zo slaan we een Schorsing niet over
    // wanneer een eerdere regel door de parser anders wordt geïnterpreteerd.
    const openedLabel = await openColumnARow(page, originalIndex, va);

    if (!openedLabel) {
      console.log(
        `[historie] ℹ️ VA ${va} regel ${originalIndex + 1}: niets meer te openen`
      );
      continue;
    }

    console.log(
      `[historie] 🔎 VA ${va} regel ${pos + 1}/${rowsToOpen.length}: ${openedLabel}`
    );

    let details = null;
    try {
      details = await readDetails(page);
    } finally {
      await closeDetailOnly(page);
    }

    if (!details) {
      throw Object.assign(
        new Error(
          `Historisch detail voor regel ${originalIndex + 1} kon niet worden gelezen.`
        ),
        { step: "startverboden_detail", type: "detail_missing" }
      );
    }

    // Detailscherm is leidend voor het echte type en de datums.
    // Dus ook als de overzichtsparser een Schorsing niet goed begreep, wordt hij
    // hier alsnog correct als Schorsing opgeslagen.
    const merged = {
      ...mergeHistoryRecord(base, details),
      soort: details.soort || base.soort || null,
      ingang: parseNlDate(details.ingang) || base.ingang || null,
      einde: parseNlDate(details.einde) || base.einde || null,
    };

    if (!merged.soort || !["Startverbod", "Schorsing"].includes(merged.soort)) {
      console.warn(
        `[historie] ⚠️ VA ${va} regel ${originalIndex + 1}: onbekend detailtype`,
        { overzicht: base.soort, detail: details.soort }
      );
      continue;
    }

    if (!merged.ingang) {
      console.warn(
        `[historie] ⚠️ VA ${va} ${merged.soort}: geen geldige ingangsdatum; regel niet opgeslagen`
      );
      continue;
    }

    records.push({
      ...merged,
      va_nummer: String(va),
      naam_fp: naamFp,
      fingerprint: historyFingerprint(va, merged),
      source: "fightpassport",
    });

    console.log(
      `[historie] ✅ VA ${va}: ${merged.soort} toegevoegd`,
      { ingang: merged.ingang, einde: merged.einde }
    );
  }

  await closeOverview(page).catch(() => {});

  return {
    status: "success",
    naam_fp: naamFp,
    records,
  };
}
