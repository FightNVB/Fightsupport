import core from "./historicalStartverbodCore.cjs";

const { historyFingerprint, mergeHistoryRecord, parseHistoricalRows } = core;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openList(page, va) {
  const clicked = await page.evaluate((requestedVa) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
    const header = [...(tab?.querySelectorAll(".tileHeader.enabled") ?? [])].find(
      (element) => String(element.textContent || "").trim().toUpperCase() === "STARTVERBODEN"
    );
    const tile = header?.closest(".tile");
    if (!tile) return false;
    tile.click();
    return true;
  }, String(va));
  if (!clicked) return { ok: false, reason: "tile_missing" };
  await page.waitForFunction(() => String(
    document.querySelector(".dialog_header .koptekst1")?.textContent || ""
  ).trim().includes("Startverboden lijst"), { timeout: 15000 }).catch(() => null);
  const header = await page.evaluate(() => ({
    title: String(document.querySelector(".dialog_header .koptekst1")?.textContent || "").trim(),
    name: String(document.querySelector(".dialog_header .koptekst2")?.textContent || "").trim(),
  }));
  return header.title.includes("Startverboden lijst")
    ? { ok: true, header }
    : { ok: false, reason: "dialog_not_confirmed" };
}

async function closeOverview(page) {
  const closed = await page.evaluate(() => {
    const button = document.querySelector("button.sluit_scherm.overview.hover.general_image");
    if (!button) return false;
    button.click();
    return true;
  }).catch(() => false);
  if (!closed) await page.keyboard.press("Escape").catch(() => {});
  await sleep(150);
}

async function listRows(page) {
  const raw = await page.evaluate(() => [...document.querySelectorAll("tr.flexlist_row")].map((row) => ({
    filler: row.classList.contains("filler"),
    columns: [...row.querySelectorAll("td.row_element")].map((cell) => String(cell.textContent || "").trim()),
  })));
  return parseHistoricalRows(raw);
}

async function openStableRow(page, wanted) {
  return page.evaluate((target) => {
    const clean = (value) => String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const rows = [...document.querySelectorAll("tr.flexlist_row:not(.filler)")];
    const row = rows.find((element) => {
      const c = [...element.querySelectorAll("td.row_element")].map((cell) => clean(cell.textContent));
      return c[0] === target.soort && c[1] === target.ingangRaw && c[2] === target.eindeRaw &&
        c[3] === (target.door || "") && c[4] === (target.reden || "") &&
        c[5] === (target.evenement || "") && c[6] === target.eventdatumRaw;
    });
    if (!row) return false;
    row.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window }));
    return true;
  }, {
    ...wanted,
    ingangRaw: wanted.ingang.split("-").reverse().join("-"),
    eindeRaw: wanted.einde ? wanted.einde.split("-").reverse().join("-") : "",
    eventdatumRaw: wanted.eventdatum ? wanted.eventdatum.split("-").reverse().join("-") : "",
  });
}

async function readDetails(page) {
  await page.waitForSelector(".dddiscstartblokkade", { timeout: 10000 }).catch(() => null);
  return page.evaluate(() => {
    const value = (selector) => String(document.querySelector(selector)?.value || "").trim() || null;
    const select = document.querySelector("select.dvomsdiscblokkade");
    return {
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
  const first = await openList(page, va);
  if (!first.ok) return { status: "skipped", reason: first.reason, records: [] };
  const rows = await listRows(page);
  await closeOverview(page);
  const records = [];

  for (const base of rows) {
    const reopened = await openList(page, va);
    if (!reopened.ok) throw new Error("Startverbodenlijst kon niet opnieuw worden geopend.");
    const found = await openStableRow(page, base);
    if (!found) throw new Error(`Historische regel niet teruggevonden: ${base.soort} ${base.ingang}`);
    const details = await readDetails(page);
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(150);
    await closeOverview(page);
    const merged = mergeHistoryRecord(base, details);
    records.push({
      ...merged,
      va_nummer: String(va),
      naam_fp: first.header.name,
      fingerprint: historyFingerprint(va, base),
      source: "fightpassport",
    });
  }
  return { status: "success", naam_fp: first.header.name, records };
}
