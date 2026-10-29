// Alleen de centrale SPORTSCHOLEN-Excel ophalen en verwerken.
// Individuele organisatie- en VECHTERS-downloads zijn geen onderdeel van deze cron.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const prepare = path.join(here, "scraper_sportscholen_prepare.js");
const child = spawn(process.execPath, [prepare, "run"], {
  cwd: here,
  env: { ...process.env, FP_MATCHMAKER_ID: "", FP_SESSION_MODE: "master",
    HEADLESS: process.env.HEADLESS ?? "true",
    PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "true" },
  stdio: "inherit",
});
child.on("error", error => { console.error("[sportscholen-cron] Startfout", error); process.exitCode = 1; });
child.on("close", (code, signal) => {
  if (code !== 0) { console.error("[sportscholen-cron] Mislukt", {code,signal}); process.exitCode = code || 1; }
  else console.log("[sportscholen-cron] Sportscholen-Excel verwerkt; geen vechtersdownloads uitgevoerd.");
});
