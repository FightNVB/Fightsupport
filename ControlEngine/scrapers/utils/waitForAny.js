import { waitForAnySelector } from "./waitForAny.js";

export async function loginFightPassport(page, creds) {
  const USER = creds?.username ?? process.env.FP_USER;
  const PASS = creds?.password ?? process.env.FP_PASS;

  // selectors die kunnen aantonen dat je op login bent
  const loginSelectors = [
    "input.gebruikersnaam",
    "input[name='gebruikersnaam']",
    "input[type='text']",
  ];

  // selectors die kunnen aantonen dat je al ingelogd bent (pas aan op jouw FP UI)
  const loggedInSelectors = [
    "#menu",
    "a[href*='logout']",
    ".dashboard",
    "nav",
  ];

  async function ensureLoggedInOnce() {
    // 1) als al ingelogd: klaar
    try {
      const found = await waitForAnySelector(page, loggedInSelectors, { timeout: 5000 });
      if (found) return;
    } catch {}

    // 2) ga naar login pagina
    await page.goto("https://fightpassport.nl/", { waitUntil: "domcontentloaded", timeout: 90000 });

    // 3) wacht tot of login zichtbaar is, of al ingelogd
    let sel = null;
    try {
      sel = await waitForAnySelector(page, [...loginSelectors, ...loggedInSelectors], { timeout: 60000 });
    } catch (e) {
      throw e;
    }

    // 4) als je logged-in selector hebt: klaar
    if (loggedInSelectors.includes(sel)) return;

    // 5) anders invullen en submitten (pas selectors aan)
    await page.type("input.gebruikersnaam", USER, { delay: 30 });
    await page.type("input.wachtwoord", PASS, { delay: 30 });

    // submit knop (pas aan indien nodig)
    const btn = await page.$("input[type='submit'], button[type='submit'], button.login");
    if (btn) await btn.click();
    else await page.keyboard.press("Enter");

    // 6) wacht tot ingelogd
    await waitForAnySelector(page, loggedInSelectors, { timeout: 60000 });
  }

  // ✅ Retry wrapper (2 pogingen)
  try {
    await ensureLoggedInOnce();
  } catch (e1) {
    // 1e poging faalde: refresh + 2e poging
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
    } catch {}
    await ensureLoggedInOnce();
  }
}
