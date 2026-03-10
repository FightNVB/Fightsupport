// scrapers/utils/helpers.js
import fs from "fs";

// ---------------------------------------------------
// 📌 DEBUG FUNCTIES (toegevoegd voor login-analyse)
// ---------------------------------------------------

export async function debugScreenshot(page, name) {
  await page.screenshot({
    path: `debug_${name}.png`,
    fullPage: true,
  });
  console.log(`🖼 Screenshot opgeslagen: debug_${name}.png`);
}

export async function debugHTML(page, name) {
  const html = await page.content();
  fs.writeFileSync(`debug_${name}.html`, html);
  console.log(`📄 HTML dump opgeslagen: debug_${name}.html`);
}

// ---------------------------------------------------
// 📌 JOUW BESTAANDE RECORD FUNCTIES (blijven intact)
// ---------------------------------------------------

export function parseRecordToCounts(recordStr) {
  // verwachte vorm "10-2-1" of "10-2-1-0"
  if (!recordStr) return { W: 0, L: 0, D: 0, O: 0, total: 0 };
  const parts = recordStr.replace(/\s/g, '').split("-");
  const [W = "0", L = "0", D = "0", O = "0"] = parts;
  const total = Number(W) + Number(L) + Number(D) + Number(O);
  return { W: Number(W), L: Number(L), D: Number(D), O: Number(O), total };
}

export function calcErvaringVerschil(recA, recB) {
  const a = parseRecordToCounts(recA);
  const b = parseRecordToCounts(recB);
  return Math.abs(a.total - b.total);
}

// Safe number parser
export function safeNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
