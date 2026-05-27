// ControlEngine/scrapers/utils/login_matchmaker_session.js
import { loginFightPassport } from "./loginFightPassport.js";

const matchmakerId = process.env.FP_MATCHMAKER_ID || "";
const username = process.env.FP_LOGIN_USERNAME || "";
const password = process.env.FP_LOGIN_PASSWORD || "";

if (!matchmakerId) {
  console.error("❌ FP_MATCHMAKER_ID ontbreekt");
  process.exit(1);
}
if (!username || !password) {
  console.error("❌ FP_LOGIN_USERNAME of FP_LOGIN_PASSWORD ontbreekt");
  process.exit(1);
}

try {
  const { browser, page } = await loginFightPassport({ matchmakerId, username, password });
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
  console.log("✅ Matchmaker FightPassport sessie gekoppeld");
  process.exit(0);
} catch (e) {
  console.error("❌ Matchmaker FightPassport koppelen mislukt:", e?.stack ?? e?.message ?? String(e));
  process.exit(1);
}
