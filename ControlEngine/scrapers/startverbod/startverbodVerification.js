import matcher from "./startverbodMatcher.cjs";

const { detailsMatchExcel } = matcher;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openStartverbodenList(page, va) {
  const clicked = await page.evaluate((requestedVa) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${requestedVa}`);
    const header = [...(tab?.querySelectorAll(".tileHeader.enabled") ?? [])].find(
      (element) => String(element.textContent || "").trim().toUpperCase() === "STARTVERBODEN"
    );
    const tile = header?.closest(".tile");
    if (!tile) return false;
    tile.scrollIntoView?.({ block: "center" });
    tile.click();
    return true;
  }, String(va));
  if (!clicked) return { ok: false, reason: "startverboden_tile_missing" };

  await page.waitForFunction(() => {
    const heading = String(document.querySelector(".dialog_header .koptekst1")?.textContent || "").trim();
    return heading.includes("Startverboden lijst");
  }, { timeout: 15000 }).catch(() => null);

  const header = await page.evaluate(() => ({
    title: String(document.querySelector(".dialog_header .koptekst1")?.textContent || "").trim(),
    fighterName: String(document.querySelector(".dialog_header .koptekst2")?.textContent || "").trim(),
  }));
  if (!header.title.includes("Startverboden lijst")) {
    return { ok: false, reason: "startverboden_dialog_not_confirmed", header };
  }
  return { ok: true, header };
}

async function closeDialog(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await sleep(200);
}

async function readDetail(page, soort) {
  await page.waitForSelector("input.dddiscstartblokkade", { timeout: 10000 }).catch(() => null);
  return page.evaluate((detailType) => {
    const value = (selector) => String(document.querySelector(selector)?.value || "").trim() || null;
    const reasonSelect = document.querySelector("select.dvomsdiscblokkade");
    const selectedReason = reasonSelect?.selectedOptions?.[0]?.textContent;
    return {
      soort: detailType,
      ingang: value("input.dddiscstartblokkade"),
      einde: value("input.dddisceindblokkade"),
      reden: String(selectedReason || "").trim() || null,
      opmerkingen: value("textarea.dvdiscblokkadeopm"),
      aangemaakt_op: value("input.ddaangemaakt"),
      aangemaakt_door: value("input.dvaanmakerfriendlyname"),
      gewijzigd_op: value("input.ddmutatie"),
      gewijzigd_door: value("input.dvmuteerderfriendlyname"),
    };
  }, soort);
}

export async function verifyStartverbodCandidate(page, fighter, excelRow) {
  const firstList = await openStartverbodenList(page, fighter.va_nummer);
  if (!firstList.ok) return { verified: false, fighter, reason: firstList.reason };

  const rowCount = await page.evaluate(() => [...document.querySelectorAll("div")].filter((element) => {
    const style = String(element.getAttribute("style") || "").replace(/\s/g, "").toLowerCase();
    const type = String(element.textContent || "").trim();
    return style.includes("width:110px") && ["Startverbod", "Schorsing"].includes(type);
  }).length);
  const profileName = firstList.header.fighterName;
  await closeDialog(page);

  if (!rowCount) return { verified: false, fighter, profileName, reason: "startverbod_row_missing" };

  const details = [];
  for (let index = 0; index < rowCount; index++) {
    const list = await openStartverbodenList(page, fighter.va_nummer);
    if (!list.ok) break;
    const openedType = await page.evaluate((rowIndex) => {
      const rows = [...document.querySelectorAll("div")].filter((element) => {
        const style = String(element.getAttribute("style") || "").replace(/\s/g, "").toLowerCase();
        const type = String(element.textContent || "").trim();
        return style.includes("width:110px") && ["Startverbod", "Schorsing"].includes(type);
      });
      const target = rows[rowIndex]?.closest(".regel, .row, tr") ?? rows[rowIndex]?.parentElement;
      if (!target) return false;
      target.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window }));
      return String(rows[rowIndex]?.textContent || "").trim();
    }, index);
    if (!openedType) {
      await closeDialog(page);
      continue;
    }
    const detail = await readDetail(page, openedType);
    details.push(detail);
    await closeDialog(page);
    if (detailsMatchExcel(excelRow, profileName, detail)) {
      return { verified: true, fighter, profileName, detail, detailsChecked: details.length };
    }
  }

  return { verified: false, fighter, profileName, details, reason: "no_matching_startverbod" };
}
