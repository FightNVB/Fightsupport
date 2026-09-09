const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function fighterUrl(va) {
  return `https://fightpassport.nl/#va_vechter/${va}`;
}

export async function readFighterHeader(page) {
  try {
    return await page.evaluate(() => {
      const text = String(document.querySelector(".koptekst1")?.innerText || "").trim();
      const match = text.match(/\((\d{3,6})\)$/);
      return { gotVa: match?.[1] ?? null, koptekst1: text };
    });
  } catch {
    return { gotVa: null, koptekst1: "" };
  }
}

export async function isFightPassportLoginPage(page) {
  try {
    return await page.evaluate(() => {
      const visible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" &&
          style.opacity !== "0" && rect.width > 0 && rect.height > 0;
      };
      const unlock = document.querySelector(
        "input.pincode, input.target_input.pincode, input[class*='pincode']"
      );
      if (visible(unlock)) return false;
      if (visible(document.querySelector("input.gebruikersnaam"))) return true;
      return /login|#login|aanmeld/i.test(String(location.href || ""));
    });
  } catch {
    return false;
  }
}

export async function hardCloseFightPassportPage(page) {
  if (!page) return;
  try {
    const client = await page.target().createCDPSession();
    await client.send("Page.stopLoading").catch(() => {});
    await client.detach().catch(() => {});
  } catch {}
  await page.close({ runBeforeUnload: true }).catch(() => {});
}

export async function forceExactFighterUrl(page, va, timeoutMs = 30000) {
  const requestedVa = String(va);
  const url = fighterUrl(va);
  const wantedHash = `#va_vechter/${requestedVa}`;
  const startedAt = Date.now();
  let lastForcedAt = 0;
  let hardReloads = 0;

  while (Date.now() - startedAt < timeoutMs) {
    if (await isFightPassportLoginPage(page)) throw new Error("LOGIN_PAGE");
    const info = await readFighterHeader(page);
    const hash = await page.evaluate(() => location.hash).catch(() => "");
    if (String(info.gotVa || "") === requestedVa && hash === wantedHash) {
      await sleep(500);
      const confirm = await readFighterHeader(page);
      const confirmHash = await page.evaluate(() => location.hash).catch(() => "");
      if (String(confirm.gotVa || "") === requestedVa && confirmHash === wantedHash) return true;
    }

    if (Date.now() - lastForcedAt >= 1200) {
      lastForcedAt = Date.now();
      await page.evaluate((forcedUrl, forcedHash) => {
        if (location.hash !== forcedHash) location.hash = forcedHash;
        if (location.href !== forcedUrl) {
          history.replaceState(null, "", forcedUrl);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
      }, url, wantedHash).catch(() => {});
      await sleep(600);
      const afterForce = await readFighterHeader(page);
      if (String(afterForce.gotVa || "") !== requestedVa && hardReloads < 3) {
        hardReloads++;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
        await sleep(1200);
      }
    }
    await sleep(250);
  }
  return false;
}

export async function openFighterPageVerified(browser, context, cookies, va, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 4;
  const softWaitMs = opts.softWaitMs ?? 1500;
  const betweenAttemptsMs = opts.betweenAttemptsMs ?? 1200;
  const requestedVa = String(va);
  const verifyWindowMs = Math.max(15000, softWaitMs * 8);
  const freshRetryOnLogin =
    opts.freshRetryOnLogin === true ||
    !!String(process.env.FP_ADMIN_MATCHMAKING_ID || "").trim();
  const onLoginPage = typeof opts.onLoginPage === "function" ? opts.onLoginPage : null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const page = context ? await context.newPage() : await browser.newPage();
    await page.setCacheEnabled(false);
    if (Array.isArray(cookies) && cookies.length) await page.setCookie(...cookies).catch(() => {});
    await page.goto(fighterUrl(va), { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});

    let forced = false;
    try {
      forced = await forceExactFighterUrl(page, va, 30000);
    } catch (error) {
      if (error?.message === "LOGIN_PAGE") {
        await hardCloseFightPassportPage(page).catch(() => {});
        if (freshRetryOnLogin) {
          console.log(`[fighter-nav] 🔐 VA ${requestedVa}: loginpagina direct gesloten; verse harde VA-tab poging ${attempt}/${maxAttempts}`);
          await onLoginPage?.({ va: requestedVa, attempt }).catch(() => {});
          if (attempt < maxAttempts) {
            await sleep(50);
            continue;
          }
        }
        throw error;
      }
      forced = false;
    }
    if (!forced) {
      await hardCloseFightPassportPage(page);
      await sleep(betweenAttemptsMs);
      continue;
    }

    await sleep(softWaitMs);
    const startedAt = Date.now();
    let retryFresh = false;
    while (Date.now() - startedAt < verifyWindowMs) {
      if (await isFightPassportLoginPage(page)) {
        await hardCloseFightPassportPage(page);
        if (freshRetryOnLogin) {
          console.log(`[fighter-nav] 🔐 VA ${requestedVa}: loginpagina tijdens verificatie direct gesloten; verse harde VA-tab`);
          await onLoginPage?.({ va: requestedVa, attempt }).catch(() => {});
          retryFresh = true;
          break;
        }
        throw new Error("LOGIN_PAGE");
      }
      const info = await readFighterHeader(page);
      if (String(info.gotVa || "") === requestedVa) {
        await sleep(500);
        const confirm = await readFighterHeader(page);
        if (String(confirm.gotVa || "") === requestedVa) return page;
      }
      await sleep(250);
    }

    if (retryFresh) {
      if (attempt < maxAttempts) {
        await sleep(50);
        continue;
      }
      throw new Error("LOGIN_PAGE");
    }

    await hardCloseFightPassportPage(page);
    await sleep(betweenAttemptsMs);
  }
  return null;
}
