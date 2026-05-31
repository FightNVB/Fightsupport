// ControlEngine/scrapers/utils/login_matchmaker_session.js
import { loginFightPassport } from "./loginFightPassportMatchmaker.js";

const matchmakerId = process.env.FP_MATCHMAKER_ID || "";
const username = process.env.FP_LOGIN_USERNAME || "";
const password = process.env.FP_LOGIN_PASSWORD || "";
const unlockCode = process.env.FP_LOGIN_UNLOCK_CODE || "";
const trustDevice = process.env.FP_TRUST_DEVICE !== "false";
const unlockOnly = process.env.FP_UNLOCK_ONLY === "true";

if (!matchmakerId) {
  console.error("❌ FP_MATCHMAKER_ID ontbreekt");
  process.exit(1);
}

try {
  const { browser, page } = await loginFightPassport({
    matchmakerId,
    username,
    password,
    unlockCode,
    trustDevice,
    unlockOnly,
  });

  await page.close().catch(() => {});
  await browser.close().catch(() => {});

  console.log("✅ Matchmaker FightPassport sessie gekoppeld");
  process.exit(0);
} catch (e) {
  console.error(
    "❌ Matchmaker FightPassport koppelen mislukt:",
    e?.stack ?? e?.message ?? String(e)
  );
  process.exit(1);
}
