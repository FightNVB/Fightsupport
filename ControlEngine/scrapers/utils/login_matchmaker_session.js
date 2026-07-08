// ControlEngine/scrapers/utils/login_matchmaker_session.js
//
// Matchmaker-eigen FightPassport sessies zijn uitgezet.
// Deze helper opent/koppelt nu de centrale/master FightPassport sessie.
// De unlockcode komt op het admin/master e-mailadres binnen en wordt via
// dezelfde fp_unlock_request.json / fp_session_state.json flow verwerkt.

import { loginFightPassport } from "./loginFightPassport.js";

try {
  const { browser, page } = await loginFightPassport();

  await page.close().catch(() => {});
  await browser.close().catch(() => {});

  console.log("✅ Centrale FightPassport master-sessie gekoppeld");
  process.exit(0);
} catch (e) {
  console.error(
    "❌ Centrale FightPassport master-sessie koppelen mislukt:",
    e?.stack ?? e?.message ?? String(e)
  );
  process.exit(1);
}
